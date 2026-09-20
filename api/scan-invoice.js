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

// La IA a veces devuelve un `value` numérico ya truncado/mal calculado (p.ej. {rawValue:"18.990", value:1899}).
// El texto de `rawValue` es el dato fiable (viene directo del OCR); `value` es una interpretación del
// modelo y solo se usa como respaldo cuando no hay `rawValue`. Punto único de esa decisión para que
// Gemini y Groq (y cualquier proveedor futuro) queden normalizados de forma idéntica.
function resolveAmount(rawValue, fallbackValue) {
  const hasRaw = rawValue != null && String(rawValue).trim() !== '';
  return normalizeNumber(hasRaw ? rawValue : fallbackValue);
}

function money(value) {
  if (value == null || value === '') return null;
  const objectValue = value && typeof value === 'object' ? value : null;
  const rawValue = String(objectValue?.rawValue ?? objectValue?.value ?? value);
  return { rawValue, value: resolveAmount(objectValue?.rawValue, objectValue?.value ?? value) };
}

function namedMoneyList(list, fallbackName) {
  return (Array.isArray(list) ? list : [])
    .filter((item) => item && (item.value != null || item.rawValue))
    .map((item) => ({
      name: String(item.name || fallbackName).trim().slice(0, 120),
      rawValue: String(item.rawValue ?? item.value ?? ''),
      value: resolveAmount(item.rawValue, item.value)
    }));
}

function normalizeResult(input) {
  const result = input && typeof input === 'object' ? input : {};
  const items = Array.isArray(result.items) ? result.items : [];
  const discounts = Array.isArray(result.discounts) ? result.discounts : [];
  const retentions = namedMoneyList(result.retentions, 'Retención');
  const additionalCharges = namedMoneyList(result.additionalCharges, 'Cargo adicional');
  return {
    items: items.map((item) => {
      // El total de la línea (Valor Total) es la única fuente válida de price; quantity/unitPrice
      // se piden aparte solo para que el modelo no los concatene con el total. Se acepta `lineTotal`
      // o `total` como nombres alternativos por si el modelo no usa exactamente `price`, sin romper
      // el contrato existente (`price` sigue funcionando igual que antes).
      const lineTotalSource = item?.lineTotal ?? item?.total ?? item?.price;
      const lineTotalValue = lineTotalSource && typeof lineTotalSource === 'object' ? lineTotalSource.value : lineTotalSource;
      return {
        name: String(item?.name || '').trim().slice(0, 120),
        rawValue: String(item?.rawValue ?? lineTotalValue ?? ''),
        price: resolveAmount(item?.rawValue, lineTotalValue)
      };
    }).filter((item) => item.name && item.price > 0).slice(0, 100),
    ...(result.subtotal ? { subtotal: money(result.subtotal) } : {}),
    discounts: discounts.filter((item) => item && (item.value != null || item.rawValue)).map((item) => ({
      name: String(item.name || 'Descuento').trim().slice(0, 120),
      rawValue: String(item.rawValue ?? item.value ?? ''),
      value: resolveAmount(item.rawValue, item.value),
      // percentage no trae un rawValue textual propio en el esquema (es un número simple, p.ej. 19); no aplica la preferencia rawValue-primero.
      percentage: item.percentage == null ? null : normalizeNumber(item.percentage)
    })),
    ...(result.tax ? { tax: money(result.tax) } : {}),
    ...(retentions.length ? { retentions } : {}),
    ...(additionalCharges.length ? { additionalCharges } : {}),
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
  return 'Analiza esta factura y devuelve SOLO JSON válido. Usa items [{name,quantity,unitPrice,rawValue,price}], subtotal {rawValue,value}, discounts [{name,rawValue,value,percentage}], tax {rawValue,value}, retentions [{name,rawValue,value}], additionalCharges [{name,rawValue,value}], total {rawValue,value} y netPayable {rawValue,value}. Si la factura tiene columnas de Cantidad, Valor Unitario y Valor Total, usa quantity para la cantidad, unitPrice para el valor unitario, y rawValue/price EXCLUSIVAMENTE para el Valor Total de esa línea (ya multiplicado por la cantidad); nunca uses el valor unitario como price cuando exista un valor total impreso, y nunca concatenes cantidad y valor unitario en un solo número. Incluye solo campos realmente detectados; discounts debe ser [] si no hay descuentos. Si el total o el neto a pagar no aparecen impresos en la factura, omite esos campos por completo; nunca los calcules, estimes ni inventes tú mismo. Conserva rawValue como aparece. Normaliza números: 8765,23=8765.23; 8.765,23=8765.23; 8,765.23=8765.23; 8,765 y 8.765 son miles. Distingue descuentos, IVA, retenciones, cargos y propinas. No inventes valores.';
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

async function analyzeWithGroq(apiKey, model, imageBase64, mimeType) {
  const response = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, temperature: 0, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: [{ type: 'text', text: invoicePrompt() }, { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } }] }] })
  });
  const data = await response.json();
  if (!response.ok) throw new Error('Groq unavailable');
  return normalizeResult(parseModelJson(data?.choices?.[0]?.message?.content));
}

// Preparado para reactivar como fallback adicional más adelante; no forma parte del flujo activo hoy.
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
  // Fallback fijo al dominio de producción (nunca '*'): este endpoint recibe
  // el Authorization: Bearer del usuario, así que un CORS abierto a
  // cualquier origen ampliaría innecesariamente qué sitios pueden invocarlo
  // desde el navegador si APP_ORIGIN faltara en algún entorno.
  res.setHeader('Access-Control-Allow-Origin', process.env.APP_ORIGIN || 'https://mis-finanzas-2-0.vercel.app');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Método no permitido.' });

  const { GEMINI_API_KEY, GEMINI_MODEL, GROQ_API_KEY, GROQ_MODEL, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = process.env;
  if (!GEMINI_API_KEY || !GEMINI_MODEL || !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return res.status(500).json({ message: 'El servicio de IA no está configurado.' });
  const groqModel = GROQ_MODEL || 'qwen/qwen3.8-27b';
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
      if (geminiError.retryable !== true || !GROQ_API_KEY) return res.status(geminiError.retryable ? 503 : 502).json({ message: geminiError.retryable ? BUSY_MESSAGE : 'Gemini no pudo analizar la factura.' });
      try { return res.status(200).json(await analyzeWithGroq(GROQ_API_KEY, groqModel, imageBase64, mimeType)); }
      catch (groqError) {
        console.error('Groq failed:', groqError.message);
        return res.status(503).json({ message: '⚠️ No pudimos analizar la factura en este momento. Intenta nuevamente en unos segundos.' });
      }
    }
  } catch (error) {
    console.error('Invoice analysis failed:', error.message);
    return res.status(502).json({ message: 'No se pudo procesar la factura en este momento.' });
  }
}
