import { DB } from './state.js';

const SUPABASE_URL = 'https://tblsdheekuagurefhzelf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsc2RoZWVrdWFndXJlZmh6ZWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1MTg2NjUsImV4cCI6MjEwNTA5NDY2NX0.IwNQo4a_UgI4qVDEtUqA-N1JT7mK9znzq7bQLPIAam0'; // <--- Pega tu Anon Key aquí

export async function signUpUser(email, password) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'PEGA_AQUI_TU_ANON_KEY') throw new Error('Supabase no está configurado.');
  
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  if (!response.ok) throw new Error(data.msg || data.error_description || 'Error al registrar usuario');
  return data;
}

export async function signInUser(email, password) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'PEGA_AQUI_TU_ANON_KEY') throw new Error('Supabase no está configurado.');
  
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || 'Correo o contraseña incorrectos');
  return data;
}

export async function syncWithSupabase(token, userId) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'PEGA_AQUI_TU_ANON_KEY' || !token || !userId) return;
  
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/user_data`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({ id: userId, payload: DB, updated_at: new Date().toISOString() })
    });
  } catch (error) {
    console.error('Error al sincronizar con la nube:', error);
  }
}

export async function scanInvoiceViaProxy(base64Data, mimeType) {
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
