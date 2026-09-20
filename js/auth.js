import { signInUser, signUpUser, syncWithSupabase } from './api.js';

export function renderAuthScreen(onSuccess) {
  return `
    <div style="position:fixed;inset:0;background:var(--bg);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1.5rem;">
      <div class="card" style="width:100%;max-width:400px;padding:32px 24px;text-align:center;">
        <div style="font-size:36px;margin-bottom:12px;">🔐</div>
        <h2 style="font-size:22px;font-weight:800;color:#fff;margin-bottom:6px;">Zentra</h2>
        <p style="font-size:13px;color:var(--ink-muted);margin-bottom:24px;">Inicia sesión para sincronizar tus finanzas en la nube</p>
        
        <div class="field" style="text-align:left;">
          <div class="field-label">Correo electrónico</div>
          <input id="auth-email" type="email" placeholder="tucorreo@email.com" style="width:100%;">
        </div>

        <div class="field" style="text-align:left;margin-top:14px;">
          <div class="field-label">Contraseña</div>
          <input id="auth-password" type="password" placeholder="••••••••" style="width:100%;">
        </div>

        <div id="auth-error" style="color:var(--expense);font-size:12px;margin:12px 0;min-height:16px;"></div>

        <button class="save-btn" id="btn-login" style="width:100%;margin-top:8px;">Iniciar Sesión</button>
        <button class="secondary-btn" id="btn-signup" style="width:100%;margin-top:10px;">Crear Cuenta Nueva</button>
      </div>
    </div>
  `;
}

export function attachAuthListeners(onSuccess) {
  const emailInput = document.getElementById('auth-email');
  const passInput = document.getElementById('auth-password');
  const errorDiv = document.getElementById('auth-error');

  const getCredentials = () => ({
    email: emailInput ? emailInput.value.trim() : '',
    password: passInput ? passInput.value.trim() : ''
  });

  document.getElementById('btn-login')?.addEventListener('click', async () => {
    const { email, password } = getCredentials();
    if (!email || !password) { errorDiv.textContent = 'Completa todos los campos.'; return; }
    errorDiv.textContent = 'Iniciando sesión...';
    try {
      const data = await signInUser(email, password);
      localStorage.setItem('supabase_token', data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('supabase_refresh_token', data.refresh_token);
      }
      localStorage.setItem('supabase_user_id', data.user.id);
      onSuccess();
    } catch (err) {
      errorDiv.textContent = err.message;
    }
  });

  document.getElementById('btn-signup')?.addEventListener('click', async () => {
    const { email, password } = getCredentials();
    if (!email || !password) { errorDiv.textContent = 'Completa todos los campos.'; return; }
    errorDiv.textContent = 'Registrando cuenta...';
    try {
      const data = await signUpUser(email, password);
      if (data.access_token) {
        localStorage.setItem('supabase_token', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('supabase_refresh_token', data.refresh_token);
        }
        localStorage.setItem('supabase_user_id', data.user.id);
        onSuccess();
      } else {
        errorDiv.textContent = '¡Cuenta creada! Revisa tu correo o inicia sesión.';
      }
    } catch (err) {
      errorDiv.textContent = err.message;
    }
  });
}
