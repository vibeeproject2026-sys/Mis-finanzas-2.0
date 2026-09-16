import { DB, saveDB } from './state.js';

/* ==========================================================
   CONFIGURACIÓN DE SUPABASE (LISTO PARA PEGAR AL FINAL)
   ========================================================== */
const SUPABASE_URL = '';      // <--- Aquí pegarás tu URL de Supabase al final
const SUPABASE_ANON_KEY = ''; // <--- Aquí pegarás tu Anon Key de Supabase al final

export async function syncWithSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.log('Supabase no está configurado aún. Usando almacenamiento local.');
    return;
  }

  try {
    // Ejemplo de estructura preparada para cuando activemos Supabase
    /*
    const response = await fetch(`${SUPABASE_URL}/rest/v1/user_data?select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    const data = await response.json();
    if (data && data.length) {
      // Sincronizar con DB local...
    }
    */
  } catch (error) {
    console.error('Error al sincronizar con Supabase:', error);
  }
}

/* ==========================================================
   PRODUCCIÓN: PROXY SEGURO DE GEMINI (EVITA EXPONER LA API KEY)
   ========================================================== */
export async function scanInvoiceViaProxy(base64Data, mimeType) {
  // Cuando despliegues tu backend proxy, cambiarás esta URL por la de tu servidor en Vercel/Render
  const PROXY_ENDPOINT = '/api/scan-invoice'; 

  try {
    const response = await fetch(PROXY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64Data, mimeType: mimeType })
    });

    if (!response.ok) throw new Error('Error en el servidor proxy de IA.');
    
    const data = await response.json();
    return Array.isArray(data.items) ? data.items : [];
  } catch (error) {
    console.error('Falla en escaneo por proxy:', error);
    throw new Error('No se pudo procesar la factura con el servidor seguro.');
  }
}
