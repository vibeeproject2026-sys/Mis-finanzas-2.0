const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BASE64_CHARS = 7_000_000;
const MAX_GEMINI_RETRIES = 4;
const GEMINI_BACKOFF_MS = [2000, 4000, 8000, 14000];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isTransientGeminiError(status, data) {
  if (status === 503 || status === 429) return true;
  const message = JSON.stringify(data || '').toLowerCase();
  return ['unavailable', 'resource exhausted', 'temporarily', 'high demand'].some((term) => message.includes(term));
}

function normalizeNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = String(value ?? '').trim().replace(/[^\d,.-]/g, '');
  if (!raw) return 0;
  const lastComma = raw.lastIndexOf(',');
  const lastDot = raw.lastIndexOf('.');
  let normalized = raw;
  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = Math.max(lastComma, lastDot);
    normalized = raw.slice(0, decimal).replace(/[.,]/g, '') + '.' + raw.slice(decimal + 1).replace(/[.,]/g, '');
  } else if (lastComma >= 0) {
    const decimals = raw.length - lastComma - 1;
    normalized = decimals === 1 || decimals === 2 ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/,/g, '');
  } else if (lastDot >= 0) {
    const decimals = raw.length - lastDot - 1;
    normalized = decimals === 1 || decimals === 2 ? raw.replace(/,/g, '') : raw.replace(/\./g, '');
  }
  const result = Number(normalized);
  return Number.isFinite(result) ? result : 0;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', process.env.APP_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Método no permitido.' });

  const { GEMINI_API_KEY, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, GEMINI_MODEL } = process.env;
  if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !GEMINI_MODEL) return res.status(500).json({ message: 'El servicio de IA no está configurado.' });

  const token = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ message: 'Sesión no válida.' });
  try {
    const session = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}` } });
    if (!session.ok) return res.status(401).json({ message: 'La sesión ha expirado.' });
  } catch (error) {
    console.error('Error validando sesión:', error.message);
    return res.status(401).json({ message: 'No se pudo validar la sesión.' });
  }

  const { imageBase64, mimeType } = req.body || {};
  if (typeof imageBase64 !== 'string' || !imageBase64 || imageBase64.length > MAX_BASE64_CHARS || !ALLOWED_MIME_TYPES.has(mimeType)) return res.status(400).json({ message: 'Imagen inválida o demasiado grande.' });

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const requestBody = {
    contents: [{ parts: [
      { text: 'Analiza esta factura y devuelve SOLO JSON válido. Usa esta forma: {"items":[{"name":"string","rawValue":"string","price":number}],"subtotal":{"rawValue":"string","value":number},"discounts":[{"name":"string","rawValue":"string","value":number,"percentage":number|null}],"tax":{"rawValue":"string","value":number},"total":{"rawValue":"string","value":number},"netPayable":{"rawValue":"string","value":number}}. Identifica explícitamente subtotal, cada descuento, IVA/impuestos, total y valor neto a pagar. discount debe ser 0 si no existe. No confundas descuentos con impuestos, retenciones, cargos o propinas. Conserva rawValue exactamente como aparece cuando sea posible. Interpreta correctamente formatos 8765,23; 8.765,23; 8,765.23; 8,765 y 8.765. No inventes datos: usa null o 0 cuando no puedas determinar un valor.' },
      { inline_data: { mime_type: mimeType, data: imageBase64 } }
    ] }],
    generationConfig: { temperature: 0, responseMimeType: 'application/json' }
  };

  let response;
  let data;
  for (let attempt = 0; attempt <= MAX_GEMINI_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);
    try {
      response = await fetch(endpoint, { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
      data = await response.json();
    } catch (error) {
      console.error(`Gemini network error, attempt ${attempt + 1}:`, error.message);
      if (attempt < MAX_GEMINI_RETRIES) { await sleep(GEMINI_BACKOFF_MS[attempt]); continue; }
      return res.status(504).json({ message: '⚠️ El servicio de IA está temporalmente ocupado. Intenta nuevamente en unos segundos.' });
    } finally { clearTimeout(timeout); }

    if (response.ok) break;
    console.error(`Gemini HTTP ${response.status}, attempt ${attempt + 1}/${MAX_GEMINI_RETRIES + 1}`);
    const retryable = isTransientGeminiError(response.status, data);
    if (!retryable || attempt >= MAX_GEMINI_RETRIES) return res.status(retryable ? 503 : 502).json({ message: retryable ? '⚠️ El servicio de IA está temporalmente ocupado. Intenta nuevamente en unos segundos.' : 'Gemini no pudo analizar la factura.' });
    await sleep(GEMINI_BACKOFF_MS[attempt]);
  }

  try {
    const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    let parsed;
    try { parsed = JSON.parse(cleaned); } catch (_) {
      const start = cleaned.indexOf('{'); const end = cleaned.lastIndexOf('}');
      if (start < 0 || end <= start) throw new Error('Respuesta JSON inválida');
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    }
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    return res.status(200).json({
      ...parsed,
      discounts: Array.isArray(parsed.discounts) ? parsed.discounts.map((d) => ({ ...d, value: normalizeNumber(d.value), percentage: d.percentage == null ? null : normalizeNumber(d.percentage) })) : [],
      items: items.map((item) => ({ ...item, name: String(item?.name || '').trim().slice(0, 120), price: normalizeNumber(item?.price) })).filter((item) => item.name && item.price > 0).slice(0, 100)
    });
  } catch (error) {
    console.error('Error interpretando respuesta de Gemini:', error.message);
    return res.status(502).json({ message: 'No se pudo interpretar la factura.' });
  }
}
