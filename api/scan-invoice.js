const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BASE64_CHARS = 7_000_000;
const MAX_GEMINI_RETRIES = 3;
const GEMINI_BACKOFF_MS = [2000, 4000, 8000];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isTransientGeminiError(status, data) {
  if (status === 503 || status === 429) return true;

  const message = JSON.stringify(data || '').toLowerCase();
  return message.includes('unavailable') ||
    message.includes('resource exhausted') ||
    message.includes('temporarily') ||
    message.includes('high demand');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', process.env.APP_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Método no permitido.' });

  const { GEMINI_API_KEY, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, GEMINI_MODEL } = process.env;
  if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !GEMINI_MODEL) {
    return res.status(500).json({ message: 'El servicio de IA no está configurado.' });
  }

  const token = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ message: 'Sesión no válida.' });
  try {
    const session = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}` }
    });
    if (!session.ok) return res.status(401).json({ message: 'La sesión ha expirado.' });
  } catch (error) {
    console.error('Error validando sesión:', error);
    return res.status(401).json({ message: 'No se pudo validar la sesión.' });
  }

  const { imageBase64, mimeType } = req.body || {};
  if (typeof imageBase64 !== 'string' || !imageBase64 || imageBase64.length > MAX_BASE64_CHARS || !ALLOWED_MIME_TYPES.has(mimeType)) {
    return res.status(400).json({ message: 'Imagen inválida o demasiado grande.' });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const requestBody = {
    contents: [{ parts: [
      { text: 'Analiza esta factura. Devuelve SOLO JSON válido con la forma {"items":[{"name":"string","price":number}]}. Extrae solo productos o conceptos comprados. No incluyas impuestos, descuentos, subtotales ni total general. Omite líneas cuyo precio no puedas leer.' },
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
      response = await fetch(endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      data = await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error(`Gemini timeout en intento ${attempt + 1}`);
      } else {
        console.error(`Error de red con Gemini en intento ${attempt + 1}:`, error.message);
      }
      clearTimeout(timeout);
      if (attempt < MAX_GEMINI_RETRIES) {
        await sleep(GEMINI_BACKOFF_MS[attempt]);
        continue;
      }
      return res.status(504).json({ message: 'El servicio de IA está temporalmente ocupado. Intenta nuevamente en unos segundos.' });
    } finally {
      clearTimeout(timeout);
    }

    if (response.ok) break;

    console.error(`Gemini error HTTP ${response.status}, intento ${attempt + 1}/${MAX_GEMINI_RETRIES + 1}`);
    if (!isTransientGeminiError(response.status, data) || attempt >= MAX_GEMINI_RETRIES) {
      if (isTransientGeminiError(response.status, data)) {
        return res.status(503).json({ message: 'El servicio de IA está temporalmente ocupado. Intenta nuevamente en unos segundos.' });
      }
      return res.status(502).json({ message: 'Gemini no pudo analizar la factura.' });
    }

    await sleep(GEMINI_BACKOFF_MS[attempt]);
  }

  try {
    const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    let parsed;
    try { parsed = JSON.parse(cleaned); } catch (_) {
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start < 0 || end <= start) throw new Error('Respuesta JSON inválida');
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    }
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    return res.status(200).json({ items: items.map((item) => ({
      name: String(item?.name || '').trim().slice(0, 120),
      price: Number(item?.price) || 0
    })).filter((item) => item.name && item.price > 0).slice(0, 100) });
  } catch (error) {
    console.error('Error interpretando respuesta de Gemini:', error.message);
    return res.status(502).json({ message: 'No se pudo interpretar la factura.' });
  }
}
