const SUPABASE_URL = 'https://blsdheekuagurefhzelf.supabase.co';

// CONSERVAR AQUÍ TU SUPABASE ANON KEY ACTUAL.
// No utilizar service_role ni sb_secret en frontend.
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsc2RoZWVrdWd1cmVmaHplbGYiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc4OTUxODY2NSwiZXhwIjoyMTA1MDk0NjY1fQ.IwNQo4a_UgI4qVDEtUqA-N1JT7mK9znzq7bQLPIAam0';


function isSupabaseConfigured() {
  return Boolean(
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    SUPABASE_ANON_KEY !== 'PEGA_AQUI_TU_ANON_KEY'
  );
}


function decodeJwtPayload(token) {
  try {
    if (!token || typeof token !== 'string') {
      return null;
    }

    const parts = token.split('.');

    if (parts.length !== 3) {
      return null;
    }

    const base64Url = parts[1];

    const base64 = base64Url
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '='
    );

    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map(
          char =>
            '%' +
            ('00' + char.charCodeAt(0).toString(16)).slice(-2)
        )
        .join('')
    );

    return JSON.parse(json);

  } catch (error) {

    console.error(
      'No fue posible interpretar el token de Supabase:',
      error
    );

    return null;
  }
}


function tokenMatchesUser(token, userId) {
  if (!token || !userId) {
    return false;
  }

  const claims = decodeJwtPayload(token);

  if (!claims || !claims.sub) {
    return false;
  }

  return String(claims.sub) === String(userId);
}


function getSupabaseHeaders(token = null) {
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json'
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}


async function readErrorDetail(response) {
  try {
    const errorData = await response.json();

    return (
      errorData?.message ||
      errorData?.hint ||
      errorData?.details ||
      errorData?.error_description ||
      errorData?.msg ||
      ''
    );

  } catch (_) {

    return '';
  }
}


export async function signUpUser(email, password) {

  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase no está configurado.'
    );
  }

  if (!email || !password) {
    throw new Error(
      'Correo y contraseña son obligatorios.'
    );
  }

  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/signup`,
    {
      method: 'POST',

      headers: getSupabaseHeaders(),

      body: JSON.stringify({
        email,
        password
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {

    throw new Error(
      data.msg ||
      data.error_description ||
      data.message ||
      'Error al registrar usuario'
    );
  }

  return data;
}


export async function signInUser(email, password) {

  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase no está configurado.'
    );
  }

  if (!email || !password) {
    throw new Error(
      'Correo y contraseña son obligatorios.'
    );
  }

  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',

      headers: getSupabaseHeaders(),

      body: JSON.stringify({
        email,
        password
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {

    throw new Error(
      data.error_description ||
      data.msg ||
      data.message ||
      'Correo o contraseña incorrectos'
    );
  }

  if (!data?.access_token || !data?.user?.id) {
    throw new Error(
      'Supabase no devolvió una sesión válida.'
    );
  }

  return data;
}


export async function syncWithSupabase(
  token,
  userId,
  payload
) {

  if (
    !isSupabaseConfigured() ||
    !token ||
    !userId ||
    !payload
  ) {
    return {
      ok: false,
      skipped: true
    };
  }

  /*
   * El userId debe corresponder al usuario autenticado
   * contenido en el token.
   *
   * Esta comprobación NO sustituye RLS.
   * RLS debe seguir validando auth.uid() en Supabase.
   */
  if (!tokenMatchesUser(token, userId)) {

    console.error(
      'La identidad del token no coincide con userId.'
    );

    return {
      ok: false,
      error: new Error(
        'La sesión de Supabase no coincide con el usuario actual.'
      )
    };
  }

  try {

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/user_data`,
      {
        method: 'POST',

        headers: {
          ...getSupabaseHeaders(token),
          'Prefer': 'resolution=merge-duplicates,return=minimal'
        },

        body: JSON.stringify({
          id: userId,
          payload,
          updated_at: new Date().toISOString()
        })
      }
    );

    if (!response.ok) {

      const detail = await readErrorDetail(
        response
      );

      throw new Error(
        `Supabase rechazó la sincronización (${response.status})` +
        (detail ? `: ${detail}` : '')
      );
    }

    return {
      ok: true
    };

  } catch (error) {

    console.error(
      'Error al sincronizar con la nube:',
      error
    );

    return {
      ok: false,
      error
    };
  }
}


export async function fetchUserData(
  token,
  userId
) {

  if (
    !isSupabaseConfigured() ||
    !token ||
    !userId
  ) {
    return null;
  }

  /*
   * Comprobación preventiva de identidad.
   * La protección definitiva debe estar en las políticas RLS.
   */
  if (!tokenMatchesUser(token, userId)) {

    console.error(
      'La identidad del token no coincide con userId.'
    );

    return null;
  }

  try {

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/user_data?id=eq.${encodeURIComponent(userId)}`,
      {
        method: 'GET',

        headers: getSupabaseHeaders(token)
      }
    );

    if (!response.ok) {

      const detail = await readErrorDetail(
        response
      );

      throw new Error(
        `Supabase rechazó la descarga (${response.status})` +
        (detail ? `: ${detail}` : '')
      );
    }

    const data = await response.json();

    if (
      Array.isArray(data) &&
      data.length > 0 &&
      data[0]?.payload
    ) {
      return data[0].payload;
    }

    return null;

  } catch (error) {

    console.error(
      'Error al descargar datos:',
      error
    );

    return null;
  }
}


export async function scanInvoiceViaProxy(
  base64Data,
  mimeType
) {

  const PROXY_ENDPOINT = '/api/scan-invoice';

  if (!base64Data) {
    throw new Error(
      'No se recibió la imagen de la factura.'
    );
  }

  try {

    const response = await fetch(
      PROXY_ENDPOINT,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType: mimeType
        })
      }
    );

    if (!response.ok) {

      let detail = '';

      try {

        const errorData =
          await response.json();

        detail =
          errorData?.message ||
          errorData?.error ||
          '';

      } catch (_) {}

      throw new Error(
        'Error en el servidor proxy de IA.' +
        (detail ? ` ${detail}` : '')
      );
    }

    const data = await response.json();

    return Array.isArray(data.items)
      ? data.items
      : [];

  } catch (error) {

    console.error(
      'Error procesando factura:',
      error
    );

    throw new Error(
      'No se pudo procesar la factura con el servidor seguro.'
    );
  }
}
