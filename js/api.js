const SUPABASE_URL = 'https://blsdheekuagurefhzelf.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_C5ZO4zf0WDXcXVgkP0Jx1w_y8tJmmJJ';

function headers(token = null) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

function tokenMatchesUser(token, userId) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return String(payload.sub) === String(userId);
  } catch (_) {
    return false;
  }
}

export async function signUpUser(email, password) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST', headers: headers(), body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.msg || data?.error_description || data?.message || 'Error al registrar usuario');
  return data;
}

export async function signInUser(email, password) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: headers(), body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (!response.ok || !data?.access_token || !data?.user?.id) {
    throw new Error(data?.error_description || data?.msg || data?.message || 'Correo o contraseña incorrectos');
  }
  return data;
}

/* ==========================================================
   RENOVACIÓN DE SESIÓN (refresh_token)
   ========================================================== */

let authRefreshInFlight = null;

async function performTokenRefresh() {
  let refreshToken = null;
  try { refreshToken = localStorage.getItem('supabase_refresh_token'); } catch (_) {}

  if (!refreshToken) {
    return { ok: false, error: new Error('No hay refresh_token disponible para renovar la sesión.') };
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    const data = await response.json();

    if (!response.ok || !data?.access_token || !data?.refresh_token || !data?.user?.id) {
      return { ok: false, error: new Error(data?.error_description || data?.msg || `No se pudo renovar la sesión (${response.status}).`) };
    }

    try {
      localStorage.setItem('supabase_token', data.access_token);
      localStorage.setItem('supabase_refresh_token', data.refresh_token);
      localStorage.setItem('supabase_user_id', data.user.id);
    } catch (_) {}

    return { ok: true, data: { accessToken: data.access_token, refreshToken: data.refresh_token, userId: data.user.id } };
  } catch (error) {
    return { ok: false, error };
  }
}

// Central: si ya hay una renovación en curso, todos los llamadores esperan la MISMA
// promesa en vez de disparar refresh_token requests en paralelo.
export function refreshAuthSession() {
  if (!authRefreshInFlight) {
    authRefreshInFlight = performTokenRefresh().finally(() => {
      authRefreshInFlight = null;
    });
  }
  return authRefreshInFlight;
}

export async function syncWithSupabase(token, userId, payload) {
  if (!token || !userId || !payload || !tokenMatchesUser(token, userId)) return { ok: false, skipped: true };
  try {
    const doSync = t => fetch(`${SUPABASE_URL}/rest/v1/user_data`, {
      method: 'POST',
      headers: { ...headers(t), Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ id: userId, payload, updated_at: new Date().toISOString() })
    });

    let response = await doSync(token);

    if (response.status === 401) {
      const refreshResult = await refreshAuthSession();
      if (!refreshResult.ok) {
        return { ok: false, error: refreshResult.error || new Error('No se pudo renovar la sesión.') };
      }
      response = await doSync(refreshResult.data.accessToken);
    }

    if (!response.ok) throw new Error(`Supabase rechazó la sincronización (${response.status})`);
    return { ok: true };
  } catch (error) {
    console.error('Error al sincronizar:', error);
    return { ok: false, error };
  }
}

export async function fetchUserData(token, userId) {
  if (!token || !userId || !tokenMatchesUser(token, userId)) {
    return { ok: false, error: new Error('Sesión inválida o no coincide con el usuario.') };
  }
  try {
    const doFetch = t => fetch(`${SUPABASE_URL}/rest/v1/user_data?id=eq.${encodeURIComponent(userId)}`, { headers: headers(t) });

    let response = await doFetch(token);

    if (response.status === 401) {
      const refreshResult = await refreshAuthSession();
      if (!refreshResult.ok) {
        return { ok: false, error: refreshResult.error || new Error('No se pudo renovar la sesión.') };
      }
      response = await doFetch(refreshResult.data.accessToken);
    }

    if (!response.ok) {
      return { ok: false, error: new Error(`Supabase respondió ${response.status} al leer los datos.`) };
    }
    const data = await response.json();
    return { ok: true, data: data?.[0]?.payload || null };
  } catch (error) {
    console.error('Error al descargar datos:', error);
    return { ok: false, error };
  }
}

export async function scanInvoiceViaProxy(base64Data, mimeType) {
  const token = localStorage.getItem('supabase_token');
  if (!base64Data || !token) throw new Error('Debes iniciar sesión para escanear facturas.');
  const response = await fetch('/api/scan-invoice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ imageBase64: base64Data, mimeType })
  });
  let data = {};
  try { data = await response.json(); } catch (_) {}
  if (!response.ok) throw new Error(data?.message || 'No se pudo procesar la factura.');
  return data || {};
}
