// Llamadas al proveedor de IA para Zen. Reutiliza las MISMAS variables de
// entorno que api/scan-invoice.js (GEMINI_API_KEY/MODEL, GROQ_API_KEY/MODEL)
// pero es un módulo independiente: Zen no importa ni depende del código del
// scanner de facturas, y viceversa. Los timeouts/reintentos son mucho más
// cortos que en el scanner porque aquí hay una persona esperando la
// respuesta en un chat, no un proceso en segundo plano.

const PROVIDER_TIMEOUT_MS = 12_000;
const MAX_RETRIES = 1;
const BACKOFF_MS = 900;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

function transient(status) {
  return status === 429 || status === 503;
}

export function parseJsonLoose(text) {
  const cleaned = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch (_) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try { return JSON.parse(cleaned.slice(start, end + 1)); } catch (_) { return null; }
  }
}

async function callGeminiText(apiKey, model, prompt, { json = false } = {}) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: json ? 0 : 0.4, responseMimeType: json ? 'application/json' : 'text/plain' }
  };

  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetchWithTimeout(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (response.ok) {
        const text = (data?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
        return text;
      }
      if (!transient(response.status)) throw Object.assign(new Error('Gemini permanent error'), { retryable: false });
      lastError = Object.assign(new Error('Gemini temporarily unavailable'), { retryable: true });
    } catch (error) {
      lastError = error;
      if (error.retryable === false) throw error;
    }
    if (attempt < MAX_RETRIES) await sleep(BACKOFF_MS);
  }
  throw lastError || Object.assign(new Error('Gemini unavailable'), { retryable: true });
}

async function callGroqText(apiKey, model, prompt, { json = false } = {}) {
  const response = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature: json ? 0 : 0.4,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error('Groq unavailable');
  return data?.choices?.[0]?.message?.content || '';
}

// Intenta Gemini y cae a Groq, igual que el scanner — pero sin los reintentos
// largos (esto es un chat interactivo). Devuelve texto plano; si json=true
// el llamador debe parsearlo con parseJsonLoose (puede devolver null).
export async function askAI({ geminiApiKey, geminiModel, groqApiKey, groqModel }, prompt, { json = false } = {}) {
  try {
    if (geminiApiKey && geminiModel) {
      return await callGeminiText(geminiApiKey, geminiModel, prompt, { json });
    }
  } catch (error) {
    if (error.retryable === false || !groqApiKey) throw error;
  }
  if (groqApiKey && groqModel) {
    return await callGroqText(groqApiKey, groqModel, prompt, { json });
  }
  throw new Error('Ningún proveedor de IA disponible.');
}
