const SUPABASE_URL = 'https://blsdheekuagurefhzelf.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_C5ZO4zf0WDXcXVgkP0Jx1w_y8tJmmJJ';

// URL oficial de producción — usada como redirect_to explícito en el
// signup para que el enlace de confirmación de email no dependa
// únicamente del Site URL configurado en el dashboard de Supabase.
const SITE_URL = 'https://mis-finanzas-2-0.vercel.app/';

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

// profile = { fullName, username, phone }. Se envía como `data`, que
// GoTrue guarda directamente en auth.users.raw_user_meta_data — decisión
// definitiva de esta fase: NO existe public.profiles ni ninguna tabla ni
// trigger propios. Supabase Auth sigue siendo el único responsable del
// email y la autenticación; nunca se guarda password/confirmación de
// password en la metadata. Limitación conocida y aceptada: username no
// tiene una restricción UNIQUE real a nivel de base de datos todavía.
export async function signUpUser(email, password, profile = {}) {
  // redirect_to va como query param del endpoint REST de GoTrue (no en el
  // body): es el destino al que Supabase redirige DESPUÉS de validar el
  // enlace de /auth/v1/verify del correo de confirmación. Sin esto, el
  // destino dependía únicamente del Site URL configurado en el dashboard.
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup?redirect_to=${encodeURIComponent(SITE_URL)}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      email,
      password,
      data: {
        full_name: profile.fullName || '',
        username: profile.username || '',
        phone: profile.phone || ''
      }
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.msg || data?.error_description || data?.message || 'Error al registrar usuario');
  return data;
}

// Valida un access_token consultando al propio Supabase Auth (no se
// asume confirmado solo porque venga en la URL — sección 6). Se usa desde
// el callback de confirmación de email para confirmar que el token que
// llegó en el redirect es real antes de guardarlo como sesión.
export async function getUserFromAccessToken(accessToken) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: headers(accessToken)
  });
  const data = await response.json();
  if (!response.ok || !data?.id) {
    throw new Error(data?.msg || data?.error_description || 'No se pudo validar la sesión.');
  }
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

// expectedUpdatedAt = updated_at de la fila remota tal como la vio este
// dispositivo en su última lectura exitosa (fetchUserData/syncWithSupabase
// anteriores). Antes se hacía un upsert ciego (resolution=merge-duplicates):
// cualquier dispositivo, sin importar qué tan desactualizado estuviera su
// DB local, podía pisar en la nube una versión más nueva escrita por otro
// dispositivo. Ahora, si ya conocemos un updated_at remoto, el push se
// condiciona a que esa fila SIGA teniendo ese updated_at (concurrencia
// optimista vía filtro PostgREST): si otro dispositivo ya sincronizó
// primero, el filtro no matchea ninguna fila y devolvemos conflict:true
// en vez de sobrescribir a ciegas. Si expectedUpdatedAt es null (primera
// sincronización conocida por este dispositivo), se usa INSERT con
// resolution=ignore-duplicates: si la fila ya existe remotamente, el
// insert se ignora (0 filas) y también se reporta como conflicto, en vez
// de asumir que no hay nada que proteger.
export async function syncWithSupabase(token, userId, payload, expectedUpdatedAt = null) {
  if (!token || !userId || !payload || !tokenMatchesUser(token, userId)) return { ok: false, skipped: true };
  try {
    const nowIso = new Date().toISOString();

    const doSync = t => (
      expectedUpdatedAt
        ? fetch(`${SUPABASE_URL}/rest/v1/user_data?id=eq.${encodeURIComponent(userId)}&updated_at=eq.${encodeURIComponent(expectedUpdatedAt)}`, {
            method: 'PATCH',
            headers: { ...headers(t), Prefer: 'return=representation' },
            body: JSON.stringify({ payload, updated_at: nowIso })
          })
        : fetch(`${SUPABASE_URL}/rest/v1/user_data`, {
            method: 'POST',
            headers: { ...headers(t), Prefer: 'resolution=ignore-duplicates,return=representation' },
            body: JSON.stringify({ id: userId, payload, updated_at: nowIso })
          })
    );

    let response = await doSync(token);

    if (response.status === 401) {
      const refreshResult = await refreshAuthSession();
      if (!refreshResult.ok) {
        return { ok: false, error: refreshResult.error || new Error('No se pudo renovar la sesión.') };
      }
      response = await doSync(refreshResult.data.accessToken);
    }

    if (!response.ok) throw new Error(`Supabase rechazó la sincronización (${response.status})`);

    const rows = await response.json().catch(() => []);
    if (Array.isArray(rows) && rows.length === 0) {
      // 0 filas afectadas: la fila remota cambió (o ya existía) desde la
      // última vez que este dispositivo la leyó. No se sobrescribe.
      return { ok: false, conflict: true };
    }

    return { ok: true, updatedAt: rows?.[0]?.updated_at || nowIso };
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
    return { ok: true, data: data?.[0]?.payload || null, updatedAt: data?.[0]?.updated_at || null };
  } catch (error) {
    console.error('Error al descargar datos:', error);
    return { ok: false, error };
  }
}

// Zen (Fase 5A, asistente financiero de solo lectura). Igual que
// scanInvoiceViaProxy, el token vive en localStorage y viaja como Bearer;
// el backend (api/zen-chat.js) es quien valida la sesión y decide a qué
// datos puede acceder — el frontend nunca envía un user_id propio.
export async function sendZenMessage(message, history, context, clientToday) {
  const token = localStorage.getItem('supabase_token');
  if (!token) throw new Error('Debes iniciar sesión para hablar con Zen.');
  const response = await fetch('/api/zen-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ message, history, context, clientToday })
  });
  let data = {};
  try { data = await response.json(); } catch (_) {}
  if (!response.ok) throw new Error(data?.message || 'Zen no pudo responder en este momento.');
  return data || {};
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
