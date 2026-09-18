const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BASE64_CHARS = 7_000_000;
const MAX_GEMINI_RETRIES = 4;
const GEMINI_BACKOFF_MS = [2000, 4000, 8000, 14000];
const PROVIDER_TIMEOUT_MS = 25_000;
const BUSY_MESSAGE = '⚠️ El servicio de IA está temporalmente ocupado. Intenta nuevamente en unos segundos.';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = String(value ?? '').trim().replace(/[^\d,.-]/g, '');
  if (!raw) return 0;
  const comma = raw.lastIndexOf(',');
  const dot = raw.lastIndexOf('.');
  let normalized = raw;
  if (comma >= 0 && dot >= 0) {
    const decimal = Math.max(comma, dot);
    normalized = `${raw.slice(0, decimal).replace(/[.,]/g, '')}.${raw.slice(decimal + 1).replace(/[.,]/g, '')}`;
  } else if (comma >= 0) {
    normalized = raw.length - comma - 1 <= 2 ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/,/g, '');
  } else if (dot >= 0) {
    normalized = raw.length - dot - 1 <= 2 ? raw.replace(/,/g, '') : raw.replace(/\./g, '');
  }
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function money(value) {
  if (value == null || value === '') return null;
  const objectValue = value && typeof value === 'object' ? value : null;
  const rawValue = String(objectValue?.rawValue ?? objectValue?.value ?? value);
  return { rawValue, value: normalizeNumber(objectValue?.value ?? value) };
}

function normalizeResult(input) {
  const result = input && typeof input === 'object' ? input : {};
  const items = Array.isArray(result.items) ? result.items : [];
  const discounts = Array.isArray(result.discounts) ? result.discounts : [];
  return {
    items: items.map((item) => ({
      name: String(item?.name || '').trim().slice(0, 120),
      rawValue: String(item?.rawValue ?? item?.price ?? ''),
      price: normalizeNumber(item?.price?.value ?? item?.price)
    })).filter((item) => item.name && item.price > 0).slice(0, 100),
    ...(result.subtotal ? { subtotal: money(result.subtotal) } : {}),
    discounts: discounts.filter((item) => item && (item.value != null || item.rawValue)).map((item) => ({
      name: String(item.name || 'Descuento').trim().slice(0, 120),
      rawValue: String(item.rawValue ?? item.value ?? ''),
      value: normalizeNumber(item.value),
      percentage: item.percentage == null ? null : normalizeNumber(item.percentage)
    })),
    ...(result.tax ? { tax: money(result.tax) } : {}),
    ...(Array.isArray(result.retentions) && result.retentions.length ? { retentions: result.retentions.map(money) } : {}),
    ...(Array.isArray(result.additionalCharges) && result.additionalCharges.length ? { additionalCharges: result.additionalCharges.map(money) } : {}),
    ...(result.total ? { total: money(result.total) } : {}),
    ...(result.netPayable ? { netPayable: money(result.netPayable) } : {})
  };
}

function parseModelJson(text) {
  const cleaned = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch (_) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('Respuesta JSON inválida');
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

function invoicePrompt() {
  return 'Analiza esta factura y devuelve SOLO JSON válido. Usa items [{name,rawValue,price}], subtotal {rawValue,value}, discounts [{name,rawValue,value,percentage}], tax {rawValue,value}, retentions [{name,rawValue,value}], additionalCharges [{name,rawValue,value}], total {rawValue,value} y netPayable {rawValue,value}. Incluye solo campos realmente detectados; discounts debe ser [] si no hay descuentos. Conserva rawValue como aparece. Normaliza números: 8765,23=8765.23; 8.765,23=8765.23; 8,765.23=8765.23; 8,765 y 8.765 son miles. Distingue descuentos, IVA, retenciones, cargos y propinas. No inventes valores.';
}

function transient(status, data) {
  if (status === 429 || status === 503) return true;
  const text = JSON.stringify(data || '').toLowerCase();
  return ['unavailable', 'resource exhausted', 'temporarily', 'high demand', 'timeout'].some((term) => text.includes(term));
}

function retryAfterMs(response) {
  const seconds = Number(response.headers.get('retry-after'));
  return Number.isFinite(seconds) && seconds >= 0 ? Math.min(seconds * 1000, 16000) : null;
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

async function analyzeWithGemini(apiKey, model, imageBase64, mimeType) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = { contents: [{ parts: [{ text: invoicePrompt() }, { inline_data: { mime_type: mimeType, data: imageBase64 } }] }], generationConfig: { temperature: 0, responseMimeType: 'application/json' } };
  let lastError;
  for (let attempt = 0; attempt <= MAX_GEMINI_RETRIES; attempt += 1) {
    try {
      const response = await fetchWithTimeout(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (response.ok) return normalizeResult(parseModelJson(data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('')));
      console.error(`Gemini HTTP ${response.status}, attempt ${attempt + 1}/${MAX_GEMINI_RETRIES + 1}`);
      if (!transient(response.status, data)) {
        const error = new Error('Gemini permanent error');
        error.retryable = false;
        throw error;
      }
      lastError = new Error('Gemini temporarily unavailable');
      lastError.retryable = true;
      if (attempt < MAX_GEMINI_RETRIES) await sleep(retryAfterMs(response) ?? GEMINI_BACKOFF_MS[attempt]);
    } catch (error) {
      lastError = error;
      if (error.retryable === false) throw error;
      if (attempt >= MAX_GEMINI_RETRIES) break;
      console.error(`Gemini temporary failure, attempt ${attempt + 1}/${MAX_GEMINI_RETRIES + 1}`);
      await sleep(GEMINI_BACKOFF_MS[attempt]);
    }
  }
  const exhausted = lastError || new Error('Gemini temporarily unavailable');
  exhausted.retryable = true;
  throw exhausted;
}

async function analyzeWithOpenAI(apiKey, model, imageBase64, mimeType) {
  const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, temperature: 0, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: [{ type: 'text', text: invoicePrompt() }, { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } }] }] })
  });
  const data = await response.json();
  if (!response.ok) throw new Error('OpenAI unavailable');
  return normalizeResult(parseModelJson(data?.choices?.[0]?.message?.content));
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', process.env.APP_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Método no permitido.' });

  const { GEMINI_API_KEY, GEMINI_MODEL, OPENAI_API_KEY, OPENAI_MODEL, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = process.env;
  if (!GEMINI_API_KEY || !GEMINI_MODEL || !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return res.status(500).json({ message: 'El servicio de IA no está configurado.' });
  const token = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ message: 'Sesión no válida.' });
  try {
    const session = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}` } });
    if (!session.ok) return res.status(401).json({ message: 'La sesión ha expirado.' });
  } catch (_) { return res.status(401).json({ message: 'No se pudo validar la sesión.' }); }

  const { imageBase64, mimeType } = req.body || {};
  if (typeof imageBase64 !== 'string' || !imageBase64 || imageBase64.length > MAX_BASE64_CHARS || !ALLOWED_MIME_TYPES.has(mimeType)) return res.status(400).json({ message: 'Imagen inválida o demasiado grande.' });

  try {
    try {
      return res.status(200).json(await analyzeWithGemini(GEMINI_API_KEY, GEMINI_MODEL, imageBase64, mimeType));
    } catch (geminiError) {
      console.error('Gemini failed:', geminiError.message);
      if (geminiError.retryable !== true || !OPENAI_API_KEY || !OPENAI_MODEL) return res.status(geminiError.retryable ? 503 : 502).json({ message: geminiError.retryable ? BUSY_MESSAGE : 'Gemini no pudo analizar la factura.' });
      try { return res.status(200).json(await analyzeWithOpenAI(OPENAI_API_KEY, OPENAI_MODEL, imageBase64, mimeType)); }
      catch (_) { return res.status(503).json({ message: '⚠️ No pudimos analizar la factura en este momento. Intenta nuevamente en unos segundos.' }); }
    }
  } catch (error) {
    console.error('Invoice analysis failed:', error.message);
    return res.status(502).json({ message: 'No se pudo procesar la factura en este momento.' });
  }
}
