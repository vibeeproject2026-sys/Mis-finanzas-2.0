window.onerror = function(msg, url, line) {
  document.body.innerHTML =
    '<div style="padding:40px;color:#ff4444;background:#111;height:100vh;text-align:center;">' +
    '<h2>⚠️ Error de Código</h2>' +
    '<p>' + msg + '</p>' +
    '<p>Línea: ' + line + '</p>' +
    '</div>';
};

import {
  DB,
  saveDB as saveDBRaw,
  todayStr,
  DEFAULT_CATEGORIES
} from './state.js';

import {
  renderDashboard,
  renderDashboardHero,
  renderGenericHero,
  energySignatureSVG,
  renderTransactions,
  renderInvoices,
  renderCredits,
  renderCategories,
  renderSettings,
  renderFabMenu,
  renderQuickSheet,
  renderTxSheet,
  renderCatSheet,
  renderCreditSheet,
  renderPaymentSheet,
  renderInvoiceSheet,
  renderConfirmDialog,
  renderScanningOverlay,
  filteredTx,
  renderTxRow,
  renderInvoiceItemsHTML,
  renderTxCatChips,
  formatThousandInput,
  parseFormattedNumber,
  categoryIcon,
  esc,
  icon
} from './ui.js';

import * as API from './api.js';

import {
  parseInterestRate,
  computeDeterministicInvoiceTotal,
  catById
} from './domain.js';

/* ==========================================================
   ESTADO DE LA INTERFAZ
   ========================================================== */

function loadStoredBalanceHidden() {

  try {

    return localStorage.getItem(
      'finanzas_balance_visible'
    ) === 'false';

  } catch(e) {

    return false;
  }
}

let UI = {
  tab:'dashboard',
  txFilter:'all',
  creditFilter:'against',
  invoiceFilter:'all',
  search:'',
  openInvoiceId:null,
  openCreditId:null,
  fabMenuOpen:false,
  balanceHidden: loadStoredBalanceHidden()
};

let sheet = null;
let confirmState = null;
let scanningOverlay = null;
let momCarouselInterval = null;
let syncPending = false;
let cloudRefreshInFlight = false;
let cloudPullError = false;
let cloudSyncEverSucceeded = false;
let lastCloudRefreshAt = 0;

// Evita que un render disparado por una actualización asíncrona de nube
// (refreshCloudData tras focus/visibilitychange/pageshow/sync) reconstruya
// #view.innerHTML mientras el usuario está desplazándose: en Chromium/
// Windows, recomponer de golpe todas las tarjetas con backdrop-filter
// durante un scroll activo puede dejar una zona sin pintar momentáneamente.
// Los renders iniciados directamente por una acción de la usuaria (guardar,
// navegar de tab, etc.) NO pasan por aquí y siguen siendo inmediatos.
let isViewScrolling = false;
let viewScrollIdleTimer = null;
let pendingCloudRender = false;
const VIEW_SCROLL_IDLE_MS = 150;

function requestCloudRender(){
  if (isViewScrolling) {
    pendingCloudRender = true;
    return;
  }
  renderAppContent();
}

function attachViewScrollIdleTracking(){
  const viewEl = document.getElementById('view');
  if (!viewEl) return;

  viewEl.addEventListener(
    'scroll',
    () => {
      isViewScrolling = true;

      if (viewScrollIdleTimer) {
        clearTimeout(viewScrollIdleTimer);
      }

      viewScrollIdleTimer = setTimeout(
        () => {
          isViewScrolling = false;
          viewScrollIdleTimer = null;

          if (pendingCloudRender) {
            pendingCloudRender = false;
            renderAppContent();
          }
        },
        VIEW_SCROLL_IDLE_MS
      );
    },
    { passive: true }
  );
}

// updated_at de la fila remota tal como la conoció este dispositivo en su
// última lectura/escritura exitosa. safeSync() lo manda como condición de
// concurrencia optimista (ver syncWithSupabase en api.js) para que un
// dispositivo con datos desactualizados no pueda pisar en la nube una
// versión más nueva escrita por otro dispositivo.
let lastKnownCloudUpdatedAt = null;

// Mensaje pendiente para la pantalla de login, consumido una sola vez
// (lo llena handleEmailConfirmationReturn() al volver del enlace de
// confirmación de email; attachAuthEvents() lo muestra y lo limpia).
let pendingAuthNotice = null;

// Estado de la pantalla de autenticación (mientras no hay sesión):
// 'login' | 'signup' | 'signup-pending' | 'email-confirmed'.
// emailJustConfirmed lo activa handleEmailConfirmationReturn() cuando el
// callback (sin tocar su lógica) valida un token real — antes de esto,
// render() entraba directo a la app; ahora primero muestra la pantalla de
// "¡Correo confirmado!" con un botón explícito, sin cambiar en nada cómo
// se valida/guarda la sesión.
let authScreenMode = 'login';
let emailJustConfirmed = false;

// El botón mostrar/ocultar contraseña se delega UNA sola vez en document
// (en vez de volver a hacer querySelectorAll+addEventListener en cada
// llamada a attachAuthEvents()) para que nunca queden listeners duplicados
// acumulados entre renders — la causa de que el toggle pareciera "no
// funcionar" (cada click alternaba el campo dos veces y se anulaba).
let authTogglePassBound = false;

const CLOUD_REFRESH_COOLDOWN_MS = 30000;
const CLOUD_REFRESH_ERROR_BANNER_MS = 6000;

// Fuente de verdad única del saludo: un nombre que el usuario configura
// explícitamente en Ajustes. Nunca se deriva de email/username/user_id.
function getWelcomeName() {

  try {

    return localStorage.getItem(
      'welcome_name'
    ) || '';

  } catch(e) {

    return '';
  }
}

const uid = () =>
  Date.now().toString(36) +
  Math.random()
    .toString(36)
    .slice(2,8);

/* ==========================================================
   METADATOS DE FACTURA ESCANEADA (IA)
   ========================================================== */

function normalizeInvoiceMeta(source) {
  const s = source || {};
  const discounts = Array.isArray(s.discounts) ? s.discounts : [];
  const retentions = Array.isArray(s.retentions) ? s.retentions : [];
  const additionalCharges = Array.isArray(s.additionalCharges) ? s.additionalCharges : [];
  const subtotal = s.subtotal || null;
  const tax = s.tax || null;
  const detectedTotal = s.detectedTotal || null;
  const netPayable = s.netPayable || null;

  return {
    subtotal,
    discounts,
    tax,
    retentions,
    additionalCharges,
    detectedTotal,
    netPayable,
    hasAiMetadata: !!(
      subtotal || tax || detectedTotal || netPayable ||
      discounts.length || retentions.length || additionalCharges.length
    )
  };
}

/* ==========================================================
   RECONCILIACIÓN ROBUSTA DE PAGOS DE CRÉDITOS A TRANSACTIONS
   ========================================================== */

function reconcileCreditTransactions() {
  if (!DB.transactions) {
    DB.transactions = [];
  }
  if (!DB.credits) {
    DB.credits = [];
  }

  // Mapa de pagos actuales de créditos: key = `${creditId}_${paymentId}` -> payment object
  const activePaymentsMap = new Map();
  DB.credits.forEach(c => {
    if (Array.isArray(c.payments)) {
      c.payments.forEach(p => {
        if (p && p.id) {
          activePaymentsMap.set(`${c.id}_${p.id}`, {
            creditId: c.id,
            paymentId: p.id,
            amount: Number(p.amount) || 0,
            date: p.date || todayStr(),
            note: p.note || '',
            txType: c.type === 'favor' ? 'income' : 'expense'
          });
        }
      });
    }
  });

  // Filtrar transacciones existentes que NO sean de tipo credit-payment o mantener las válidas
  const nonCreditTxs = DB.transactions.filter(t => t.source !== 'credit-payment');
  const existingCreditTxs = DB.transactions.filter(t => t.source === 'credit-payment');

  const existingCreditTxsMap = new Map();
  existingCreditTxs.forEach(t => {
    if (t.creditId && t.paymentId) {
      existingCreditTxsMap.set(`${t.creditId}_${t.paymentId}`, t);
    }
  });

  const reconciledCreditTxs = [];

  activePaymentsMap.forEach((payInfo, key) => {
    const existingTx = existingCreditTxsMap.get(key);
    if (existingTx) {
      reconciledCreditTxs.push({
        ...existingTx,
        amount: payInfo.amount,
        date: payInfo.date,
        type: payInfo.txType,
        categoryId: '',
        source: 'credit-payment',
        creditId: payInfo.creditId,
        paymentId: payInfo.paymentId
      });
    } else {
      reconciledCreditTxs.push({
        id: uid(),
        type: payInfo.txType,
        amount: payInfo.amount,
        categoryId: '',
        date: payInfo.date,
        note: payInfo.note ? `Pago a créditos: ${payInfo.note}` : 'Pago a créditos',
        source: 'credit-payment',
        creditId: payInfo.creditId,
        paymentId: payInfo.paymentId
      });
    }
  });

  DB.transactions = [...nonCreditTxs, ...reconciledCreditTxs];
}

/* ==========================================================
   AVISOS DISCRETOS (banner flotante no bloqueante)
   ========================================================== */

const floatingBannerTimers =
  new Map();

function showFloatingBanner(id, message, offsetPx, autoDismissMs) {

  let el =
    document.getElementById(
      id
    );

  if (
    !el
  ){

    el =
      document.createElement(
        'div'
      );

    el.id =
      id;

    el.className =
      'banner banner--warn floating-banner';

    el.style.position =
      'fixed';

    el.style.left =
      '16px';

    el.style.right =
      '16px';

    el.style.zIndex =
      '95';

    document.body.appendChild(
      el
    );
  }

  // La base coincide con la del dock (.tabbar: bottom:max(24px, safe-area) + height:72px)
  // para que el banner quede anclado justo respecto al dock real en cualquier dispositivo,
  // en vez de sumar el safe-area por separado (eso lo dejaba demasiado arriba en iPhones
  // con home indicator, donde el dock usa max() y no una suma).
  el.style.bottom =
    `calc(max(24px, env(safe-area-inset-bottom)) + 72px + ${offsetPx}px)`;

  el.textContent =
    message;

  const existingTimer =
    floatingBannerTimers.get(
      id
    );

  if (
    existingTimer
  ){

    clearTimeout(
      existingTimer
    );

    floatingBannerTimers.delete(
      id
    );
  }

  if (
    autoDismissMs
  ){

    floatingBannerTimers.set(
      id,
      setTimeout(
        () => {

          hideFloatingBanner(
            id
          );
        },
        autoDismissMs
      )
    );
  }

  return el;
}

function hideFloatingBanner(id) {

  const existingTimer =
    floatingBannerTimers.get(
      id
    );

  if (
    existingTimer
  ){

    clearTimeout(
      existingTimer
    );

    floatingBannerTimers.delete(
      id
    );
  }

  const el =
    document.getElementById(
      id
    );

  if (
    el
  ){

    el.remove();
  }
}

/* ==========================================================
   GUARDADO LOCAL (con aviso centralizado si falla)
   ========================================================== */

function saveDB() {

  const ok =
    saveDBRaw();

  if (
    ok
  ){

    hideFloatingBanner(
      'save-error-banner'
    );

  } else {

    showFloatingBanner(
      'save-error-banner',
      'No se pudo guardar el cambio en este dispositivo (almacenamiento lleno o no disponible).',
      58
    );
  }

  return ok;
}

/* ==========================================================
   SINCRONIZACIÓN
   ========================================================== */

// Estado REAL del indicador de nube del header: se calcula a partir de
// las mismas señales que ya usa la app (nunca se inventa un estado).
//   'offline'  -> sin sesión válida o sin red (navigator.onLine === false)
//   'syncing'  -> refreshCloudData() tiene una petición en curso
//   'error'    -> el último push (safeSync) o pull (refreshCloudData) falló
//   'ok'       -> hubo al menos un push/pull exitoso y no hay error activo
//   'unknown'  -> autenticado y en línea, pero aún no se confirma ningún
//                 sync exitoso en esta sesión (se muestra igual que 'offline')
function getCloudSyncStatus() {

  let token = null;
  let userId = null;

  try {

    token =
      localStorage.getItem(
        'supabase_token'
      );

    userId =
      localStorage.getItem(
        'supabase_user_id'
      );

  } catch(e) {}

  if (
    !token ||
    !userId
  ){
    return 'offline';
  }

  if (
    typeof navigator !== 'undefined' &&
    navigator.onLine === false
  ){
    return 'offline';
  }

  if (
    cloudRefreshInFlight
  ){
    return 'syncing';
  }

  if (
    syncPending ||
    cloudPullError
  ){
    return 'error';
  }

  return (
    cloudSyncEverSucceeded
      ? 'ok'
      : 'unknown'
  );
}

function refreshCloudStatusIndicator() {

  const el =
    document.getElementById(
      'cloud-status-dot'
    );

  if (
    !el
  ){
    return;
  }

  const status =
    getCloudSyncStatus();

  el.className =
    'cloud-status-dot cloud-status-dot--' +
    status;

  el.setAttribute(
    'aria-label',
    {
      offline:'Sin conexión con la nube',
      syncing:'Sincronizando con la nube',
      error:'Error de sincronización',
      ok:'Sincronizado con la nube',
      unknown:'Estado de sincronización aún no disponible'
    }[status] ||
    ''
  );
}

function updateSyncBanner(pending) {

  syncPending =
    pending;

  if (
    !pending
  ){

    cloudSyncEverSucceeded =
      true;
  }

  if (
    pending
  ){

    // autoDismissMs (reutilizando CLOUD_REFRESH_ERROR_BANNER_MS, ya usado
    // para el banner de error de refresco de nube): antes se omitía este
    // argumento, así que showFloatingBanner() nunca programaba su propio
    // timer de auto-ocultado (esa lógica ya existe ahí, ver más arriba en
    // este archivo) y el banner quedaba flotando sobre la interfaz de
    // forma indefinida, tapando controles como "Ver detalle del crédito"
    // o el botón + mientras la sincronización siguiera fallando. Si una
    // sincronización vuelve a fallar después de que el banner se oculte,
    // updateSyncBanner(true) se vuelve a llamar (sin cambios en esa
    // lógica) y el banner reaparece con su propio temporizador nuevo.
    showFloatingBanner(
      'sync-status-banner',
      'Cambios guardados localmente. Pendiente de sincronizar con la nube.',
      104,
      CLOUD_REFRESH_ERROR_BANNER_MS
    );

  } else {

    hideFloatingBanner(
      'sync-status-banner'
    );
  }

  refreshCloudStatusIndicator();
}

/* ==========================================================
   REFRESH DE DATOS REMOTOS (login inicial + reanudar la app)
   ========================================================== */

function refreshCloudData() {

  let token = null;
  let userId = null;

  try {

    token =
      localStorage.getItem(
        'supabase_token'
      );

    userId =
      localStorage.getItem(
        'supabase_user_id'
      );

  } catch(e) {}

  if (
    !token ||
    !userId
  ){
    return;
  }

  if (
    !API.fetchUserData
  ){
    return;
  }

  if (
    cloudRefreshInFlight
  ){
    return;
  }

  if (
    sheet
  ){
    // Hay una edición abierta: no interrumpirla trayendo datos remotos ahora.
    // Se reintentará en el próximo visibilitychange/pageshow/focus.
    return;
  }

  // El cooldown existe para no golpear la nube en cada visibilitychange/
  // focus/pageshow del MISMO usuario. Pero si local_db_owner_id (a quién
  // pertenecen los datos que hay ahora mismo en el DB local — ver el gate
  // de render() más arriba en este archivo) es de OTRA cuenta, esperar el
  // cooldown dejaría el gate "Sincronizando tu cuenta…" bloqueado hasta
  // por 30s: el primer pull de una cuenta recién autenticada nunca debe
  // esperar el cooldown de la cuenta anterior.
  let isAccountSwitch = false;

  try {

    const localOwnerId =
      localStorage.getItem(
        'local_db_owner_id'
      );

    isAccountSwitch =
      !!localOwnerId &&
      localOwnerId !== userId;

  } catch(e) {}

  if (
    !isAccountSwitch &&
    Date.now() - lastCloudRefreshAt <
    CLOUD_REFRESH_COOLDOWN_MS
  ){
    return;
  }

  cloudRefreshInFlight =
    true;

  lastCloudRefreshAt =
    Date.now();

  refreshCloudStatusIndicator();

  API.fetchUserData(
    token,
    userId
  )
  .then(
    result => {

      if (
        !result ||
        result.ok !== true
      ){

        console.error(
          'Error al actualizar datos desde la nube:',
          result && result.error
        );

        cloudPullError =
          true;

        refreshCloudStatusIndicator();

        showFloatingBanner(
          'cloud-refresh-error-banner',
          'No se pudieron actualizar los datos desde la nube. Se muestran los datos guardados en este dispositivo.',
          12,
          CLOUD_REFRESH_ERROR_BANNER_MS
        );

        return;
      }

      cloudPullError =
        false;

      cloudSyncEverSucceeded =
        true;

      refreshCloudStatusIndicator();

      hideFloatingBanner(
        'cloud-refresh-error-banner'
      );

      // Se registra ANTES de aplicar cloudDB (y aunque no exista fila
      // remota todavía) porque es simplemente lo último que este
      // dispositivo confirmó del estado remoto; safeSync() lo usa para no
      // pisar a ciegas una versión más nueva escrita por otro dispositivo.
      lastKnownCloudUpdatedAt =
        result.updatedAt || null;

      // local_db_owner_id identifica de quién son los datos que hay ahora
      // mismo en el DB local/localStorage. logout NO borra ese DB (ver el
      // handler de logout: es intencional, para no destruir historial
      // financiero sin confirmar antes que la nube tenga la última
      // versión). Si esta cuenta es DISTINTA a la dueña del DB local, el
      // gate de render() (más arriba en este archivo) evita pintar por un
      // instante los datos financieros de la cuenta anterior mientras
      // llega esta respuesta.
      //
      // CRÍTICO: local_db_owner_id NUNCA debe pasar a userId hasta que DB
      // ya esté en un estado seguro para userId (con sus propios datos, o
      // vacío/default si todavía no tiene fila remota). Si se liberase el
      // owner antes, el gate de render() dejaría de bloquear mientras DB
      // sigue conteniendo los datos financieros de la cuenta anterior —
      // ese fue exactamente el incidente de fuga de datos entre cuentas.
      let previousOwnerId = null;
      try {
        previousOwnerId =
          localStorage.getItem('local_db_owner_id');
      } catch(e) {}

      const isAccountSwitchPull =
        !!previousOwnerId &&
        previousOwnerId !== userId;

      const cloudDB =
        result.data;

      if (
        sheet
      ){
        // Se abrió una edición mientras llegaba la respuesta: no pisarla,
        // ni tocar el owner (el gate, si estaba activo, sigue activo).
        return;
      }

      // Campo por campo: en un cambio de cuenta, un campo remoto ausente o
      // con formato inesperado NUNCA conserva el valor de la cuenta
      // anterior — se reemplaza por su vacío/default. Para el MISMO
      // usuario (refresh normal, sin cambio de cuenta) se conserva el
      // comportamiento previo: un campo ausente/mal formado simplemente no
      // se toca.
      const cloudTransactions =
        Array.isArray(cloudDB && cloudDB.transactions)
          ? cloudDB.transactions
          : null;

      const cloudCategories =
        Array.isArray(cloudDB && cloudDB.categories)
          ? cloudDB.categories
          : null;

      const cloudCredits =
        Array.isArray(cloudDB && cloudDB.credits)
          ? cloudDB.credits
          : null;

      const cloudInvoices =
        Array.isArray(cloudDB && cloudDB.invoices)
          ? cloudDB.invoices
          : null;

      const cloudSettings =
        (cloudDB && cloudDB.settings && typeof cloudDB.settings === 'object')
          ? cloudDB.settings
          : null;

      if (cloudTransactions) {
        DB.transactions = cloudTransactions;
      } else if (isAccountSwitchPull) {
        DB.transactions = [];
      }

      if (cloudCategories) {
        DB.categories = cloudCategories;
      } else if (isAccountSwitchPull) {
        DB.categories = DEFAULT_CATEGORIES.slice();
      }

      if (cloudCredits) {
        DB.credits = cloudCredits;
      } else if (isAccountSwitchPull) {
        DB.credits = [];
      }

      if (cloudInvoices) {
        DB.invoices = cloudInvoices;
      } else if (isAccountSwitchPull) {
        DB.invoices = [];
      }

      if (cloudSettings) {
        DB.settings = { ...DB.settings, ...cloudSettings };
      } else if (isAccountSwitchPull) {
        DB.settings = { currency: 'COP' };
      }

      // Solo ahora, con DB ya en un estado seguro para userId (datos
      // propios o vacío/default), se libera el owner y por tanto el gate.
      try {
        localStorage.setItem('local_db_owner_id', userId);
      } catch(e) {}

      reconcileCreditTransactions();
      saveDB();

      if (
        isAccountSwitchPull
      ){
        render();
      } else {
        requestCloudRender();
      }
    }
  )
  .catch(
    err => {

      console.error(
        'Error al actualizar datos desde la nube:',
        err
      );

      cloudPullError =
        true;

      showFloatingBanner(
        'cloud-refresh-error-banner',
        'No se pudieron actualizar los datos desde la nube. Se muestran los datos guardados en este dispositivo.',
        12,
        CLOUD_REFRESH_ERROR_BANNER_MS
      );
    }
  )
  .finally(
    () => {

      cloudRefreshInFlight =
        false;

      refreshCloudStatusIndicator();
    }
  );
}

const safeSync = () => {

  try {

    const token =
      localStorage.getItem(
        'supabase_token'
      );

    const userId =
      localStorage.getItem(
        'supabase_user_id'
      );

    if (
      API.syncWithSupabase &&
      token &&
      userId
    ){

      return API.syncWithSupabase(
        token,
        userId,
        DB,
        lastKnownCloudUpdatedAt
      ).then(
        result => {

          if (
            result &&
            result.conflict === true
          ){

            // Otro dispositivo ya sincronizó una versión más nueva: NO se
            // sobrescribe a ciegas. Se trae esa versión más reciente (se
            // vuelve a intentar el push, ya con el updated_at correcto, en
            // el próximo cambio local vía saveDB()+safeSync()).
            updateSyncBanner(true);

            refreshCloudData();

          } else if (
            result &&
            result.ok === false &&
            !result.skipped
          ){

            updateSyncBanner(true);

          } else if (
            result &&
            result.ok === true
          ){

            lastKnownCloudUpdatedAt =
              result.updatedAt || lastKnownCloudUpdatedAt;

            updateSyncBanner(false);
          }

          return result;
        }
      );
    }

  } catch(e) {

    console.error(
      'Error preparando sincronización:',
      e
    );
  }

  return Promise.resolve({
    ok:false,
    skipped:true
  });
};

/* ==========================================================
   PANTALLA DE AUTENTICACIÓN — helpers de render
   Liquid Glass premium (mismo lenguaje visual del resto de la app):
   fondo oscuro, transparencias, cyan/blue/violet/wine, neon controlado.
   ========================================================== */

// Decoración muy sutil de fondo (nodos + línea financiera abstracta),
// puramente visual, sin datos reales, sin clicks.
function authDecorSVG(){
  return (
    '<svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
    '<defs><linearGradient id="authLineGrad" x1="0" y1="1" x2="1" y2="0">' +
    '<stop offset="0%" stop-color="#00D1FF"/>' +
    '<stop offset="50%" stop-color="#2060FF"/>' +
    '<stop offset="100%" stop-color="#8B5CF6"/>' +
    '</linearGradient></defs>' +
    '<polyline points="10,470 80,390 130,420 190,300 250,335 330,170" fill="none" stroke="url(#authLineGrad)" stroke-width="2" opacity="0.5"/>' +
    '<circle cx="80" cy="390" r="3" fill="#00D1FF" opacity="0.7"/>' +
    '<circle cx="190" cy="300" r="3" fill="#2060FF" opacity="0.7"/>' +
    '<circle cx="330" cy="170" r="4" fill="#8B5CF6" opacity="0.8"/>' +
    '<circle cx="55" cy="95" r="2" fill="#10F5A0" opacity="0.5"/>' +
    '<circle cx="345" cy="430" r="2" fill="#00D1FF" opacity="0.4"/>' +
    '<circle cx="270" cy="70" r="2" fill="#8B5CF6" opacity="0.4"/>' +
    '</svg>'
  );
}

function authField(id, type, label, placeholder, iconName){
  const isPassword = type === 'password';
  return (
    '<div class="auth-field">' +
    '<div class="auth-field-label">' + label + '</div>' +
    '<div class="auth-input-wrap' + (isPassword ? ' has-toggle' : '') + '">' +
    icon(iconName) +
    '<input id="' + id + '" type="' + type + '" placeholder="' + placeholder + '" autocomplete="off">' +
    (isPassword
      ? '<button type="button" class="auth-toggle-pass" data-target="' + id + '" aria-label="Mostrar contraseña">' + icon('eye') + '</button>'
      : ''
    ) +
    '</div>' +
    '</div>'
  );
}

function renderAuthShell(bodyHtml){
  return (
    '<div class="auth-shell">' +
    '<div class="auth-shell-bg">' + authDecorSVG() + '</div>' +
    '<div class="auth-brand">' +
    '<div class="auth-brand-mark">' + energySignatureSVG() + '</div>' +
    '<div class="auth-brand-name">Mis Finanzas</div>' +
    '<div class="auth-brand-tagline">Tu dinero, más claro.<br>Tu vida, más tranquila.</div>' +
    '</div>' +
    '<div class="card auth-card">' + bodyHtml + '</div>' +
    '</div>'
  );
}

function renderLoginBody(){
  return (
    '<div class="auth-card-title">Iniciar sesión</div>' +
    '<div class="auth-card-subtitle">Gestión financiera en la nube</div>' +
    authField('auth-email', 'email', 'Correo electrónico', 'usuario@correo.com', 'mail') +
    authField('auth-password', 'password', 'Contraseña', '••••••••', 'lock') +
    '<div id="auth-notice" class="auth-notice-box"></div>' +
    '<div id="auth-error" class="auth-error-box"></div>' +
    '<button class="save-btn" id="btn-login" style="width:100%;margin-bottom:14px;">Ingresar</button>' +
    '<div class="auth-divider"></div>' +
    '<div class="auth-bottom-row">' +
    '<span>¿No tienes una cuenta?</span>' +
    '<button class="auth-link-btn" id="btn-go-signup">Crear mi cuenta</button>' +
    '</div>'
  );
}

function renderSignupBody(){
  return (
    '<div class="auth-card-title">Crea tu cuenta</div>' +
    '<div class="auth-card-subtitle">Empieza a tener una visión más clara de tu dinero.</div>' +
    authField('signup-name', 'text', 'Nombre', 'Tu nombre completo', 'user') +
    authField('signup-username', 'text', 'Usuario', 'usuario123', 'at-sign') +
    authField('signup-email', 'email', 'Correo electrónico', 'usuario@correo.com', 'mail') +
    authField('signup-phone', 'tel', 'Teléfono', '3001234567', 'phone') +
    authField('signup-password', 'password', 'Contraseña', '••••••••', 'lock') +
    authField('signup-password2', 'password', 'Confirmar contraseña', '••••••••', 'lock') +
    '<div id="auth-error" class="auth-error-box"></div>' +
    '<button class="save-btn" id="btn-do-signup" style="width:100%;margin-bottom:14px;margin-top:2px;">Crear mi cuenta</button>' +
    '<div class="auth-divider"></div>' +
    '<div class="auth-bottom-row">' +
    '<span>¿Ya tienes una cuenta?</span>' +
    '<button class="auth-link-btn" id="btn-go-login">Iniciar sesión</button>' +
    '</div>'
  );
}

function renderPendingConfirmationBody(){
  return (
    '<div class="auth-icon-badge is-pending">' + icon('mail-check') + '</div>' +
    '<div class="auth-card-title">¡Ya casi estás dentro!</div>' +
    '<div class="auth-card-subtitle">' +
    'Enviamos un enlace de confirmación a tu correo electrónico.<br>' +
    'Confirma tu correo para activar tu cuenta.<br>' +
    'Si no lo ves, revisa también la carpeta de spam.' +
    '</div>' +
    '<button class="auth-link-btn" id="btn-go-login" style="margin-top:4px;">Volver al inicio de sesión</button>'
  );
}

function renderEmailConfirmedBody(){
  return (
    '<div class="auth-icon-badge is-success">' + icon('check-circle') + '</div>' +
    '<div class="auth-card-title">¡Correo confirmado!</div>' +
    '<div class="auth-card-subtitle">Tu cuenta está activa. Ya puedes ingresar a Mis Finanzas.</div>' +
    '<button class="save-btn" id="btn-enter-app" style="width:100%;">Iniciar sesión</button>'
  );
}

/* ==========================================================
   RENDER PRINCIPAL
   ========================================================== */

export function render(){

  try {

    let token = null;
    let userId = null;

    try {

      token =
        localStorage.getItem(
          'supabase_token'
        );

      userId =
        localStorage.getItem(
          'supabase_user_id'
        );

    } catch(e) {

      console.warn(
        'Modo privado estricto'
      );
    }

    const viewEl =
      document.getElementById(
        'view'
      );

    const tabbarEl =
      document.getElementById(
        'tabbar'
      );

    // La pantalla "¡Correo confirmado!" tiene prioridad incluso cuando ya
    // hay un token válido guardado (handleEmailConfirmationReturn() lo
    // guarda ANTES de que se llegue aquí) — de lo contrario esta rama
    // nunca se alcanzaría, porque !token||!userId ya sería falso y
    // render() entraría directo a la app sin mostrar el mensaje.
    if (
      emailJustConfirmed ||
      !token ||
      !userId
    ){

      if (
        viewEl
      ){

        const bodyHtml =
          emailJustConfirmed
            ? renderEmailConfirmedBody()
            : authScreenMode === 'signup'
              ? renderSignupBody()
              : authScreenMode === 'signup-pending'
                ? renderPendingConfirmationBody()
                : renderLoginBody();

        viewEl.innerHTML =
          renderAuthShell(
            bodyHtml
          );
      }

      if (
        tabbarEl
      ){
        tabbarEl.innerHTML = '';
      }

      setTimeout(
        attachAuthEvents,
        50
      );

      return;
    }

    if (
      !window.hasLoadedCloudData
    ){

      window.hasLoadedCloudData =
        true;

      refreshCloudData();
    }

    // Si el DB local pertenece a OTRA cuenta (logout no lo borra — ver el
    // handler de logout), no se pinta contenido financiero ajeno mientras
    // el refreshCloudData() de arriba trae los datos reales de ESTA
    // cuenta. No se toca el DB local ni se navega a otra pantalla: solo
    // se espera, con un loader mínimo, a que llegue el pull (refreshCloudData
    // llama a render() de nuevo al terminar — ver más arriba en este archivo).
    let localDbOwnerId = null;

    try {

      localDbOwnerId =
        localStorage.getItem(
          'local_db_owner_id'
        );

    } catch(e) {}

    if (
      localDbOwnerId &&
      localDbOwnerId !== userId
    ){

      if (
        viewEl
      ){

        viewEl.innerHTML =
          '<div class="auth-shell"><div class="card auth-card" style="text-align:center;padding:40px 24px;">Sincronizando tu cuenta…</div></div>';
      }

      if (
        tabbarEl
      ){
        tabbarEl.innerHTML = '';
      }

      return;
    }

    reconcileCreditTransactions();
    renderAppContent();

  } catch(err) {

    document.body.innerHTML =
      '<div style="padding:40px;color:#ff4444;background:#111;height:100vh;">' +
      '<h2>Error visual</h2>' +
      '<p>' +
      err.message +
      '</p></div>';
  }
}

/* ==========================================================
   CALLBACK DE CONFIRMACIÓN DE EMAIL
   ========================================================== */

// Se ejecuta una vez al cargar la app, ANTES del primer render(). GoTrue
// (REST API, sin PKCE porque signUpUser() nunca envía code_challenge)
// redirige tras /auth/v1/verify con los tokens en el FRAGMENTO de la URL:
// #access_token=...&refresh_token=...&expires_in=...&type=signup
// — o con #error=...&error_description=... si el enlace ya expiró o fue
// usado antes. No se asume nada de esto sin validarlo: el access_token se
// confirma consultando /auth/v1/user (getUserFromAccessToken) antes de
// guardarlo como sesión real (Sección 6). No duplica refreshAuthSession()
// ni crea un sistema de sesión paralelo: usa las mismas claves de
// localStorage que ya usan login/signup/refresh en toda la app.
async function handleEmailConfirmationReturn(){

  const hash =
    window.location.hash || '';

  if (
    hash.length < 2
  ){
    return;
  }

  const params =
    new URLSearchParams(
      hash.slice(1)
    );

  const accessToken =
    params.get(
      'access_token'
    );

  const refreshToken =
    params.get(
      'refresh_token'
    );

  const hasAuthParams =
    !!(
      accessToken ||
      params.get('error') ||
      params.get('error_description')
    );

  if (
    !hasAuthParams
  ){
    return;
  }

  // Sección 7: limpiar la URL de inmediato (antes de cualquier validación
  // de red) para no dejar tokens ni detalles de error visibles en la
  // barra de direcciones, sin recargar la página.
  try {

    window.history.replaceState(
      null,
      '',
      window.location.pathname +
      window.location.search
    );

  } catch(e) {}

  if (
    !accessToken
  ){

    pendingAuthNotice =
      'El enlace de confirmación no es válido o ya expiró. ' +
      'Crea la cuenta nuevamente o inicia sesión si ya la confirmaste antes.';

    return;
  }

  try {

    const user =
      await API.getUserFromAccessToken(
        accessToken
      );

    localStorage.setItem(
      'supabase_token',
      accessToken
    );

    if (
      refreshToken
    ){

      localStorage.setItem(
        'supabase_refresh_token',
        refreshToken
      );
    }

    localStorage.setItem(
      'supabase_user_id',
      user.id
    );

    window.hasLoadedCloudData =
      false;

    // Solo cambia qué se MUESTRA después de validar (pantalla de "correo
    // confirmado" con botón, en vez de entrar directo) — la validación y
    // el guardado de sesión de arriba son exactamente los mismos de antes.
    emailJustConfirmed =
      true;

  } catch(err) {

    // El enlace sí trajo tokens (Supabase ya validó el correo en
    // /auth/v1/verify antes de redirigir), pero no pudimos confirmar la
    // sesión contra /auth/v1/user (token vencido, red, etc.). No se
    // guarda nada sin validar — se pide iniciar sesión normalmente.
    pendingAuthNotice =
      'Tu correo quedó confirmado. Inicia sesión con tu contraseña para continuar.';
  }
}

/* ==========================================================
   AUTENTICACIÓN
   ========================================================== */

function attachAuthEvents(){

  // Pantalla "¡Correo confirmado!": un solo botón, entra a la app con la
  // sesión que handleEmailConfirmationReturn() ya validó y guardó.
  const btnEnterApp =
    document.getElementById(
      'btn-enter-app'
    );

  if (
    btnEnterApp
  ){

    btnEnterApp.addEventListener(
      'click',
      () => {

        emailJustConfirmed =
          false;

        render();
      }
    );

    return;
  }

  // Navegación entre pantallas (login ⇄ signup ⇄ pending-confirmation).
  document
    .getElementById(
      'btn-go-signup'
    )
    ?.addEventListener(
      'click',
      () => {

        authScreenMode =
          'signup';

        render();
      }
    );

  document
    .getElementById(
      'btn-go-login'
    )
    ?.addEventListener(
      'click',
      () => {

        authScreenMode =
          'login';

        render();
      }
    );

  // Mostrar/ocultar contraseña: puramente visual, no toca validación ni
  // auth. Delegado UNA sola vez en document (guardado con
  // authTogglePassBound) en vez de volver a enlazar botones concretos en
  // cada render, así nunca se acumulan listeners duplicados.
  if (
    !authTogglePassBound
  ){

    authTogglePassBound =
      true;

    document.addEventListener(
      'click',
      (e) => {

        const btn =
          e.target.closest(
            '.auth-toggle-pass'
          );

        if (
          !btn
        ) return;

        const targetId =
          btn.dataset.target;

        const input =
          document.getElementById(
            targetId
          );

        if (
          !input
        ) return;

        const showing =
          input.type === 'text';

        // El navegador mueve el foco al botón en 'mousedown' (antes de
        // que este 'click' se dispare), así que devolvérselo al input es
        // el comportamiento correcto siempre, no solo cuando
        // document.activeElement todavía apunta al input en este punto
        // (para entonces ya nunca lo hace). selectionStart/End se leen
        // ANTES de cambiar el tipo porque se preservan aunque el input
        // no tenga el foco en este instante.
        const selStart =
          input.selectionStart;

        const selEnd =
          input.selectionEnd;

        input.type =
          showing ? 'password' : 'text';

        btn.innerHTML =
          icon(
            showing ? 'eye' : 'eye-off'
          );

        input.focus();

        try {

          input.setSelectionRange(
            selStart,
            selEnd
          );

        } catch (_) {}
      }
    );
  }

  const errorDiv =
    document.getElementById(
      'auth-error'
    );

  const noticeDiv =
    document.getElementById(
      'auth-notice'
    );

  // Se consume una sola vez: si el usuario vuelve a esta pantalla más
  // tarde (por ejemplo tras un logout), no debe reaparecer un aviso viejo.
  if (
    noticeDiv &&
    pendingAuthNotice
  ){

    noticeDiv.textContent =
      pendingAuthNotice;

    pendingAuthNotice =
      null;
  }

  /* ---- LOGIN ---- */

  document
    .getElementById(
      'btn-login'
    )
    ?.addEventListener(
      'click',
      async () => {

        const emailInput =
          document.getElementById(
            'auth-email'
          );

        const passInput =
          document.getElementById(
            'auth-password'
          );

        const email =
          emailInput
            ? emailInput.value.trim()
            : '';

        const password =
          passInput
            ? passInput.value.trim()
            : '';

        if (
          !email ||
          !password
        ){

          if (
            errorDiv
          ){

            errorDiv.textContent =
              'Completa todos los campos.';
          }

          return;
        }

        if (
          errorDiv
        ){

          errorDiv.textContent =
            'Iniciando sesión...';
        }

        try {

          if (
            !API.signInUser
          ){

            throw new Error(
              'Faltan funciones de API.'
            );
          }

          const data =
            await API.signInUser(
              email,
              password
            );

          localStorage.setItem(
            'supabase_token',
            data.access_token
          );

          localStorage.setItem(
            'supabase_user_id',
            data.user.id
          );

          if (
            data.refresh_token
          ){

            localStorage.setItem(
              'supabase_refresh_token',
              data.refresh_token
            );
          }

          window.hasLoadedCloudData =
            false;

          render();

        } catch(err) {

          if (
            errorDiv
          ){

            errorDiv.textContent =
              err.message;
          }
        }
      }
    );

  /* ---- SIGNUP (Sección 1: formulario completo con validaciones) ---- */

  document
    .getElementById(
      'btn-do-signup'
    )
    ?.addEventListener(
      'click',
      async () => {

        const val =
          id => {

            const el =
              document.getElementById(
                id
              );

            return el
              ? el.value.trim()
              : '';
          };

        const fullName =
          val('signup-name');

        // Usuario: sin espacios y normalizado a minúsculas (Sección 1).
        const username =
          val('signup-username')
            .replace(/\s+/g, '')
            .toLowerCase();

        const email =
          val('signup-email');

        const phone =
          val('signup-phone');

        const password =
          document.getElementById('signup-password')?.value || '';

        const password2 =
          document.getElementById('signup-password2')?.value || '';

        const emailPattern =
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        const setError =
          msg => {

            if (
              errorDiv
            ){

              errorDiv.textContent =
                msg;
            }
          };

        if (!fullName) { setError('Ingresa tu nombre.'); return; }
        if (!username) { setError('Ingresa un nombre de usuario.'); return; }
        if (!email || !emailPattern.test(email)) { setError('Ingresa un correo electrónico válido.'); return; }
        if (!phone) { setError('Ingresa tu teléfono.'); return; }
        if (!password) { setError('Ingresa una contraseña.'); return; }
        if (!password2) { setError('Confirma tu contraseña.'); return; }
        if (password !== password2) { setError('Las contraseñas no coinciden.'); return; }

        // Decisión de esta fase: no se usa public.profiles ni ninguna
        // tabla propia, por lo tanto no hay verificación previa de
        // disponibilidad de username contra la base de datos — es una
        // limitación conocida (username sin UNIQUE real todavía), no
        // algo a resolver aquí. full_name/username/phone viajan como
        // metadata del signup (ver signUpUser) y Supabase los guarda en
        // auth.users.raw_user_meta_data.
        setError('Creando tu cuenta...');

        try {

          if (
            !API.signUpUser
          ){

            throw new Error(
              'Faltan funciones de API.'
            );
          }

          const data =
            await API.signUpUser(
              email,
              password,
              { fullName, username, phone }
            );

          if (
            data.access_token
          ){

            localStorage.setItem(
              'supabase_token',
              data.access_token
            );

            localStorage.setItem(
              'supabase_user_id',
              data.user.id
            );

            if (
              data.refresh_token
            ){

              localStorage.setItem(
                'supabase_refresh_token',
                data.refresh_token
              );
            }

            window.hasLoadedCloudData =
              false;

            render();

          } else {

            // Sección 3: con Confirm Email activo, Supabase no devuelve
            // sesión todavía — se muestra la pantalla dedicada de "revisa
            // tu correo", nunca se sugiere que ya puede iniciar sesión.
            authScreenMode =
              'signup-pending';

            render();
          }

        } catch(err) {

          setError(
            err.message
          );
        }
      }
    );
}

/* ==========================================================
   CONTENIDO Y CARRUSEL MES A MES
   ========================================================== */

function clearMomCarouselAutoAdvance(){
  if (momCarouselInterval) {
    clearInterval(momCarouselInterval);
    momCarouselInterval = null;
  }
}

function attachMomCarousel(){
  clearMomCarouselAutoAdvance();

  const track = document.getElementById('mom-track');
  const dots = document.querySelectorAll('.mom-dot');
  if (!track || !dots.length) return;

  let currentIndex = 0;
  const totalSlides = dots.length;

  const updateCarousel = (index) => {
    currentIndex = (index + totalSlides) % totalSlides;
    track.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentIndex);
    });
  };

  const startAutoAdvance = () => {
    clearMomCarouselAutoAdvance();
    momCarouselInterval = setInterval(
      () => updateCarousel(currentIndex + 1),
      5000
    );
  };

  let startX = 0;
  let currentX = 0;
  let isDragging = false;
  let startTime = 0;

  track.addEventListener('pointerdown', (e) => {
    clearMomCarouselAutoAdvance();
    startX = e.clientX;
    currentX = startX;
    isDragging = true;
    startTime = Date.now();
    track.style.transition = 'none';
    track.setPointerCapture(e.pointerId);
  });

  track.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    currentX = e.clientX;
  });

  track.addEventListener('pointerup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    track.releasePointerCapture(e.pointerId);

    const diff = startX - currentX;
    const elapsed = Date.now() - startTime;

    // Si el gesto fue rápido o superó los 45px de distancia, cambiamos de slide
    if (Math.abs(diff) > 45 || (Math.abs(diff) > 20 && elapsed < 250)) {
      if (diff > 0) {
        updateCarousel(currentIndex + 1);
      } else {
        updateCarousel(currentIndex - 1);
      }
    } else {
      updateCarousel(currentIndex); // Regresa a la posición actual
    }

    startAutoAdvance();
  });

  track.addEventListener('pointercancel', () => {
    if (isDragging) {
      isDragging = false;
      updateCarousel(currentIndex);
      startAutoAdvance();
    }
  });

  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      updateCarousel(index);
      startAutoAdvance();
    });
  });

  startAutoAdvance();
}


function renderAppContent(){

  clearMomCarouselAutoAdvance();

  const viewEl =
    document.getElementById(
      'view'
    );

  if (
    viewEl
  ){

    try {

      viewEl.innerHTML =
        (
          UI.tab === 'dashboard'
            ? renderDashboardHero(
                getWelcomeName(),
                getCloudSyncStatus()
              )
            : renderGenericHero(
                UI.tab,
                getCloudSyncStatus()
              )
        ) +

        (
          UI.tab === 'dashboard'
            ? renderDashboard(
                UI.balanceHidden
              )

            : UI.tab === 'transactions'
              ? renderTransactions(
                  UI.search,
                  UI.txFilter
                )

              : UI.tab === 'invoices'
                ? renderInvoices(
                    UI.openInvoiceId,
                    UI.invoiceFilter
                  )

                : UI.tab === 'credits'
                  ? renderCredits(
                      UI.creditFilter,
                      UI.openCreditId
                    )

                  : UI.tab === 'categories'
                    ? renderCategories()

                    : (
                        renderSettings(
                          getWelcomeName()
                        ) +
                        '<div style="padding:16px 0;"><button class="save-btn" data-action="logout" style="width:100%;padding:14px;border-radius:12px;background:var(--expense);color:#fff;font-weight:800;border:none;cursor:pointer;">Cerrar Sesión</button></div>'
                      )
        );

      if (
        UI.tab === 'dashboard'
      ){
        setTimeout(attachMomCarousel, 50);
      }

      if (
        UI.tab === 'settings'
      ){

        setTimeout(
          () => {

            const headers =
              document.querySelectorAll(
                'h2,h3,.section-title'
              );

            headers.forEach(
              h => {

                if (
                  h.textContent.includes(
                    'Moneda'
                  ) ||
                  h.textContent.includes(
                    'Configuración'
                  )
                ){

                  h.textContent =
                    'Ajustes';
                }
              }
            );

            attachWelcomeNameListener();
          },
          10
        );
      }

    } catch(err) {

      console.error(
        'Error renderizando la aplicación:',
        err
      );

      viewEl.innerHTML =
        '<div class="empty-state" style="padding:48px 20px;"><b>No se pudo cargar la vista.</b><br><span style="font-size:12px;">' +
        (
          err?.message ||
          'Error inesperado'
        ) +
        '</span></div>';
    }
  }

  const tabbarHTML =
    [
      [
        'dashboard',
        'wallet',
        'Inicio'
      ],
      [
        'transactions',
        'list',
        'Movimientos'
      ],
      [
        'center',
        'plus',
        ''
      ],
      [
        'credits',
        'credit',
        'Créditos'
      ],
      [
        'invoices',
        'receipt',
        'Facturas'
      ]
    ]
    .map(
      (
        [
          id,
          ic,
          label
        ]
      ) => {

        if (
          id === 'center'
        ){

          return (
            '<div class="center-fab-container"><button class="fab-center" data-action="toggle-fab-menu"><span class="icon" style="stroke-linecap:round;stroke-linejoin:round"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg></span></button></div>'
          );
        }

        return (
          '<button class="tab-btn ' +
          (
            UI.tab === id
              ? 'active'
              : ''
          ) +
          '" data-action="set-tab" data-tab="' +
          id +
          '">' +

          '<span class="icon" style="stroke-linecap:round;stroke-linejoin:round">' +
          getIconSvg(
            ic
          ) +
          '</span>' +

          '<span>' +
          label +
          '</span>' +

          '</button>'
        );
      }
    )
    .join('');

  const tabbarEl =
    document.getElementById(
      'tabbar'
    );

  if (
    tabbarEl
  ){

    tabbarEl.innerHTML =
      tabbarHTML;
  }

  if (
    UI.tab === 'transactions'
  ){

    attachSearchListener();
  }

  renderOverlays();
}

/* ==========================================================
   ICONOS DEL TABBAR
   ========================================================== */

function getIconSvg(name){

  const svgs = {

    // Iconos trasladados de figma_mis_finanzas/src/components/NavDock.tsx
    wallet:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="2" fill="currentColor" opacity="0.9"/><rect x="13" y="3" width="8" height="8" rx="2" fill="currentColor" opacity="0.5"/><rect x="3" y="13" width="8" height="8" rx="2" fill="currentColor" opacity="0.5"/><rect x="13" y="13" width="8" height="8" rx="2" fill="currentColor" opacity="0.3"/></svg>',

    list:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"><path d="M7 10l5-5 5 5" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 14l-5 5-5-5" stroke-linecap="round" stroke-linejoin="round"/></svg>',

    credit:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/><path d="M6 15h4" stroke-linecap="round"/></svg>',

    tag:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 3v9l6 3" stroke-linecap="round"/></svg>',

    receipt:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke-linejoin="round"/><path d="M14 2v6h6M8 13h8M8 17h5" stroke-linecap="round"/></svg>'
  };

  return (
    svgs[name] ||
    ''
  );
}

/* ==========================================================
   OVERLAYS
   ========================================================== */

function renderOverlays(){

  const el =
    document.getElementById(
      'overlays'
    );

  if (
    !el
  ){
    return;
  }

  let html = '';

  if (
    UI.fabMenuOpen
  ){

    html +=
      renderFabMenu();
  }

  if (
    sheet &&
    sheet.kind === 'tx'
  ){

    html +=
      renderTxSheet(
        sheet
      );
  }

  if (
    sheet &&
    sheet.kind === 'quick'
  ){

    html +=
      renderQuickSheet(
        sheet
      );
  }

  if (
    sheet &&
    sheet.kind === 'cat'
  ){

    html +=
      renderCatSheet(
        sheet
      );
  }

  if (
    sheet &&
    sheet.kind === 'credit'
  ){

    html +=
      renderCreditSheet(
        sheet
      );
  }

  if (
    sheet &&
    sheet.kind === 'payment'
  ){

    html +=
      renderPaymentSheet(
        sheet
      );
  }

  if (
    sheet &&
    sheet.kind === 'invoice'
  ){

    html +=
      renderInvoiceSheet(
        sheet
      );
  }

  if (
    confirmState
  ){

    html +=
      renderConfirmDialog(
        confirmState
      );
  }

  if (
    scanningOverlay
  ){

    html +=
      renderScanningOverlay(
        scanningOverlay
      );
  }

  el.innerHTML =
    html;

  if (
    sheet
  ){

    attachSheetFieldSync();
  }

  const saveBtn =
    document.querySelector(
      'button[data-action="save-tx"],button[data-action="save-quick"]'
    );

  if (
    saveBtn &&
    sheet
  ){

    const amt =
      Number(
        sheet.amount
      );

    if (
      amt > 0
    ){

      saveBtn.removeAttribute(
        'disabled'
      );

      saveBtn.style.opacity =
        '1';

      saveBtn.style.cursor =
        'pointer';
    }
  }
}

/* ==========================================================
   MOVIMIENTOS
   ========================================================== */

function refreshTxList(){

  const list =
    filteredTx(
      UI.search,
      UI.txFilter
    );

  const container =
    document.getElementById(
      'tx-list'
    );

  if (
    container
  ){

    container.innerHTML =
      list.length
        ? list
            .map(
              renderTxRow
            )
            .join('')
        : '<div class="empty-state">No hay movimientos registrados.</div>';
  }
}

function attachSearchListener(){

  const input =
    document.getElementById(
      'search-input'
    );

  if (
    input
  ){

    input.addEventListener(
      'input',
      e => {

        UI.search =
          e.target.value;

        refreshTxList();
      }
    );
  }
}

function attachWelcomeNameListener(){

  const input =
    document.getElementById(
      'welcome-name-input'
    );

  if (
    input
  ){

    input.addEventListener(
      'input',
      e => {

        try {

          localStorage.setItem(
            'welcome_name',
            e.target.value.trim().slice(0, 40)
          );

        } catch(err) {}
      }
    );
  }
}

/* ==========================================================
   FAB
   ========================================================== */

function closeFabMenu(
  callback
){

  const backdrop =
    document.getElementById(
      'fab-backdrop'
    );

  if (
    backdrop
  ){

    backdrop.classList.add(
      'closing'
    );

    setTimeout(
      () => {

        UI.fabMenuOpen =
          false;

        renderAppContent();

        if (
          callback
        ){
          callback();
        }

      },
      350
    );

  } else {

    UI.fabMenuOpen =
      false;

    renderAppContent();

    if (
      callback
    ){
      callback();
    }
  }
}

/* ==========================================================
   EVENTOS
   ========================================================== */

document.addEventListener(
  'click',
  e => {

    if (
      e.target.id ===
      'fab-backdrop'
    ){

      closeFabMenu();

      return;
    }

    const t =
      e.target.closest(
        '[data-action]'
      );

    if (
      !t
    ){
      return;
    }

    const action =
      t.dataset.action;

    /* ======================================================
       LOGOUT
       ====================================================== */

    if (
      action ===
      'logout'
    ){

      confirmState = {
        message:
          '¿Seguro que quieres cerrar sesión?',

        onConfirm:
          () => {

            localStorage.removeItem(
              'supabase_token'
            );

            localStorage.removeItem(
              'supabase_user_id'
            );

            localStorage.removeItem(
              'supabase_refresh_token'
            );

            localStorage.removeItem(
              'supabase_user_name'
            );

            window.hasLoadedCloudData =
              false;

            authScreenMode =
              'login';

            emailJustConfirmed =
              false;

            // NO borrar DB local aquí (antes hacía Object.assign(DB,
            // {transactions:[], categories:DEFAULT_CATEGORIES.slice(),...})
            // + saveDB()): eso destruía de forma inmediata e irreversible
            // todo el historial financiero del dispositivo en CADA cierre
            // de sesión, incluso sin confirmar antes que la nube tuviera
            // la última versión. refreshCloudData() ya reemplaza
            // DB.transactions/categories/credits/invoices por completo con
            // los datos reales de la cuenta que inicie sesión después
            // (ver más abajo en este archivo), así que no hace falta vaciar
            // nada aquí para evitar mezclar datos entre cuentas.
            UI.tab =
              'dashboard';

            confirmState =
              null;

            render();
          }
      };

      renderOverlays();

      return;
    }

    /* ======================================================
       TABS
       ====================================================== */

    if (
      action ===
      'set-tab'
    ){

      UI.tab =
        t.dataset.tab;

      UI.fabMenuOpen =
        false;

      renderAppContent();

      return;
    }

    if (
      action ===
      'toggle-balance-visibility'
    ){

      UI.balanceHidden =
        !UI.balanceHidden;

      try {

        localStorage.setItem(
          'finanzas_balance_visible',
          UI.balanceHidden
            ? 'false'
            : 'true'
        );

      } catch(e) {}

      renderAppContent();

      return;
    }

    if (
      action ===
      'set-filter'
    ){

      UI.txFilter =
        t.dataset.filter;

      // Se re-renderiza toda la pestaña (no solo #tx-list) para que el
      // chip activo (Todos/Ingresos/Egresos) quede sincronizado visualmente
      // con UI.txFilter, que es el mismo estado real que ya controla el
      // filtrado. Antes solo se refrescaba la lista y el chip seleccionado
      // nunca cambiaba de estilo.
      renderAppContent();

      return;
    }

    if (
      action ===
      'set-credit-filter'
    ){

      UI.creditFilter =
        t.dataset.filter;

      UI.openCreditId =
        null;

      renderAppContent();

      return;
    }

    if (
      action ===
      'set-invoice-filter'
    ){

      UI.invoiceFilter =
        t.dataset.filter;

      renderAppContent();

      return;
    }

    if (
      action ===
      'toggle-credit-detail'
    ){

      UI.openCreditId =
        UI.openCreditId ===
        t.dataset.id
          ? null
          : t.dataset.id;

      renderAppContent();

      return;
    }

    /* ======================================================
       FAB
       ====================================================== */

    if (
      action ===
      'toggle-fab-menu'
    ){

      if (
        UI.fabMenuOpen
      ){

        closeFabMenu();

      } else {

        t.classList.add(
          'pulse-light'
        );

        setTimeout(
          () => {

            t.classList.remove(
              'pulse-light'
            );

            UI.fabMenuOpen =
              true;

            renderAppContent();

          },
          400
        );
      }

      return;
    }

    if (
      action.startsWith(
        'fab-'
      )
    ){

      t.classList.add(
        'selected-pulse'
      );

      setTimeout(
        () => {

          if (
            action ===
            'fab-new-tx'
          ){

            closeFabMenu(
              () => {

                sheet = {
                  kind:'tx',
                  mode:'new',
                  id:null,
                  type:'expense',
                  categoryId:
                    (
                      DB.categories.find(
                        c =>
                          c.type ===
                          'expense'
                      ) || {}
                    ).id || '',
                  amount:'',
                  date:todayStr(),
                  note:''
                };

                renderOverlays();
              }
            );

          } else if (
            action ===
            'fab-new-credit'
          ){

            closeFabMenu(
              () => {

                sheet = {
                  kind:'credit',
                  mode:'new',
                  id:null,
                  title:'',
                  type:
                    UI.creditFilter ||
                    'against',
                  total:'',
                  hasInterest:false,
                  interestRate:'',
                  interestPeriod:'monthly',
                  termMonths:'',
                  startDate:todayStr()
                };

                renderOverlays();
              }
            );

          } else if (
            action ===
            'fab-scan-invoice'
          ){

            closeFabMenu(
              () => {

                document
                  .getElementById(
                    'global-camera-input'
                  )
                  .click();
              }
            );

          } else if (
            action ===
            'fab-categories'
          ){

            closeFabMenu(
              () => {

                UI.tab =
                  'categories';

                renderAppContent();
              }
            );

          } else if (
            action ===
            'fab-settings'
          ){

            closeFabMenu(
              () => {

                UI.tab =
                  'settings';

                renderAppContent();
              }
            );
          }

        },
        220
      );

      return;
    }

    /* ======================================================
       MOVIMIENTOS
       ====================================================== */

    if (
      action ===
      'edit-tx'
    ){

      const tx =
        DB.transactions.find(
          x =>
            x.id ===
            t.dataset.id
        );

      if (
        tx
      ){
        if (tx.source === 'credit-payment' && tx.creditId && tx.paymentId) {
          const c = DB.credits.find(x => x.id === tx.creditId);
          const p = (c?.payments || []).find(x => x.id === tx.paymentId);
          if (p) {
            sheet = {
              kind:'payment',
              mode:'edit',
              creditId: tx.creditId,
              paymentId: p.id,
              amount: String(p.amount),
              date: p.date,
              note: p.note || ''
            };
            renderOverlays();
            return;
          }
        }

        sheet = {
          kind:'tx',
          mode:'edit',
          id:tx.id,
          type:tx.type,
          categoryId:
            tx.categoryId,
          amount:
            String(
              tx.amount
            ),
          date:
            tx.date,
          note:
            tx.note || ''
        };

        renderOverlays();
      }

      return;
    }

    if (
      action ===
      'quick-cat'
    ){

      sheet = {
        kind:'quick',
        categoryId:
          t.dataset.id,
        amount:'',
        note:'',
        date:todayStr(),
        showNote:false,
        showDate:false
      };

      renderOverlays();

      return;
    }

    if (
      action ===
      'show-note'
    ){

      if (!sheet) return;

      sheet.showNote =
        true;

      renderOverlays();

      return;
    }

    if (
      action ===
      'show-date'
    ){

      if (!sheet) return;

      sheet.showDate =
        true;

      renderOverlays();

      return;
    }

    if (
      action ===
      'save-quick'
    ){

      if (!sheet) return;

      const amt =
        Number(
          sheet.amount
        );

      if (
        amt > 0
      ){

        DB.transactions.push({
          id:uid(),
          type:'expense',
          amount:amt,
          categoryId:
            sheet.categoryId,
          date:
            todayStr(),
          note:
            (
              sheet.note ||
              ''
            ).trim()
        });

        reconcileCreditTransactions();
        saveDB();
        safeSync();

        sheet =
          null;

        renderAppContent();
      }

      return;
    }

    if (
      action ===
      'tx-type'
    ){

      if (!sheet) return;

      sheet.type =
        t.dataset.type;

      sheet.categoryId =
        (
          DB.categories.find(
            c =>
              c.type ===
              sheet.type
          ) || {}
        ).id || '';

      renderOverlays();

      return;
    }

    if (
      action ===
      'pick-tx-cat'
    ){

      if (!sheet) return;

      sheet.categoryId =
        t.dataset.id;

      const chipContainer =
        document.getElementById(
          'chipList'
        );

      if (
        chipContainer
      ){

        chipContainer.innerHTML =
          renderTxCatChips(
            DB.categories.filter(
              c =>
                c.type ===
                sheet.type
            ),
            sheet.categoryId
          );
      }

      return;
    }

    if (
      action ===
      'pick-quick-cat'
    ){

      if (!sheet) return;

      sheet.categoryId =
        t.dataset.id;

      const quickChipContainer =
        document.getElementById(
          'quickChipList'
        );

      if (
        quickChipContainer
      ){

        quickChipContainer.innerHTML =
          renderTxCatChips(
            DB.categories.filter(
              c =>
                c.type === 'expense'
            ),
            sheet.categoryId,
            'pick-quick-cat'
          );
      }

      const quickHeaderBox =
        document.getElementById(
          'quick-header-box'
        );

      if (
        quickHeaderBox
      ){

        const newCat =
          catById(
            sheet.categoryId
          );

        quickHeaderBox.innerHTML =
          '<div class="avatar" style="background:' +
          (newCat ? newCat.color + '22' : 'rgba(255,255,255,0.06)') +
          ';color:' +
          (newCat ? newCat.color : 'var(--ink-muted)') +
          '">' +
          categoryIcon(newCat ? newCat.icon : null) +
          '</div><div class="qname">' +
          esc(newCat ? newCat.name : 'Elige una categoría') +
          '</div>';
      }

      return;
    }

    if (
      action ===
      'save-tx'
    ){

      if (!sheet) return;

      const amt =
        Math.round(
          Number(
            sheet.amount
          )
        );

      const catId =
        sheet.categoryId ||
        (
          DB.categories.find(
            c =>
              c.type ===
              sheet.type
          ) || {}
        ).id ||
        '';

      if (
        amt > 0
      ){

        const existingTx =
          DB.transactions.find(
            x =>
              x.id ===
              sheet.id
          );

        const sourceInvoiceId =
          sheet.sourceInvoiceId ||
          (existingTx && existingTx.sourceInvoiceId) ||
          null;

        const tx = {
          id:
            sheet.id ||
            uid(),

          type:
            sheet.type,

          amount:
            amt,

          categoryId:
            catId,

          date:
            sheet.date ||
            todayStr(),

          note:
            (
              sheet.note ||
              ''
            ).trim(),

          ...(
            sourceInvoiceId
              ? { sourceInvoiceId }
              : {}
          )
        };

        const exists =
          !!existingTx;

        DB.transactions =
          exists
            ? DB.transactions.map(
                x =>
                  x.id === tx.id
                    ? tx
                    : x
              )
            : DB.transactions.concat(
                [tx]
              );

        if (
          sheet.sourceInvoiceId &&
          DB.invoices
        ){

          DB.invoices =
            DB.invoices.map(
              inv =>
                inv.id === sheet.sourceInvoiceId
                  ? {
                      ...inv,
                      registered: true,
                      categoryId: catId
                    }
                  : inv
            );
        }

        reconcileCreditTransactions();
        saveDB();
        safeSync();

        sheet =
          null;

        renderAppContent();
      }

      return;
    }

    if (
      action ===
      'delete-tx'
    ){

      if (!sheet) return;

      const txToDelete = DB.transactions.find(x => x.id === sheet.id);

      if (txToDelete && txToDelete.source === 'credit-payment' && txToDelete.creditId && txToDelete.paymentId) {
        confirmState = {
          message: '¿Eliminar este pago de crédito?',
          onConfirm: () => {
            DB.credits = DB.credits.map(c => {
              if (c.id === txToDelete.creditId) {
                return {
                  ...c,
                  payments: (c.payments || []).filter(p => p.id !== txToDelete.paymentId)
                };
              }
              return c;
            });
            DB.transactions = DB.transactions.filter(x => x.id !== sheet.id);
            reconcileCreditTransactions();
            saveDB();
            safeSync();
            sheet = null;
            confirmState = null;
            renderAppContent();
          }
        };
        renderOverlays();
        return;
      }

      confirmState = {
        message:
          '¿Eliminar este movimiento?',

        onConfirm:
          () => {

            DB.transactions =
              DB.transactions.filter(
                x =>
                  x.id !==
                  sheet.id
              );

            if (
              txToDelete &&
              txToDelete.sourceInvoiceId &&
              DB.invoices
            ){

              DB.invoices =
                DB.invoices.map(
                  inv =>
                    inv.id === txToDelete.sourceInvoiceId
                      ? {
                          ...inv,
                          registered: false,
                          categoryId: ''
                        }
                      : inv
                );
            }

            reconcileCreditTransactions();
            saveDB();
            safeSync();

            sheet =
              null;

            confirmState =
              null;

            renderAppContent();
          }
      };

      renderOverlays();

      return;
    }

    /* ======================================================
       CATEGORÍAS
       ====================================================== */

    if (
      action ===
      'new-cat'
    ){

      sheet = {
        kind:'cat',
        mode:'new',
        id:null,
        name:'',
        type:'expense',
        color:'#06B6D4',
        icon:'food',
        budget:'',
        primary:false,
        isFixed:false
      };

      renderOverlays();

      return;
    }

    if (
      action ===
      'edit-cat'
    ){

      const c =
        DB.categories.find(
          x =>
            x.id ===
            t.dataset.id
        );

      if (
        c
      ){

        sheet = {
          kind:'cat',
          mode:'edit',
          id:c.id,
          name:c.name,
          type:c.type,
          color:c.color,
          icon:c.icon,
          budget:
            c.budget
              ? String(
                  c.budget
                )
              : '',
          primary:
            !!c.primary,
          isFixed:
            !!c.isFixed
        };

        renderOverlays();
      }

      return;
    }

    if (
      action ===
      'cat-type'
    ){

      if (!sheet) return;

      sheet.type =
        t.dataset.type;

      document.getElementById(
        'budgetField'
      ).style.display =
        sheet.type === 'expense'
          ? 'block'
          : 'none';

      document.getElementById(
        'primaryField'
      ).style.display =
        sheet.type === 'income'
          ? 'block'
          : 'none';

      document.getElementById(
        'fixedField'
      ).style.display =
        sheet.type === 'expense'
          ? 'block'
          : 'none';

      return;
    }

    if (
      action ===
      'toggle-primary'
    ){

      if (!sheet) return;

      sheet.primary =
        !sheet.primary;

      document
        .getElementById(
          'primarySwitch'
        )
        .classList.toggle(
          'on',
          sheet.primary
        );

      return;
    }

    if (
      action ===
      'toggle-fixed'
    ){

      if (!sheet) return;

      sheet.isFixed =
        !sheet.isFixed;

      document
        .getElementById(
          'fixedSwitch'
        )
        .classList.toggle(
          'on-violet',
          sheet.isFixed
        );

      return;
    }

    if (
      action ===
      'pick-color'
    ){

      if (!sheet) return;

      sheet.color =
        t.dataset.color;

      document
        .querySelectorAll(
          '#swatchList .swatch'
        )
        .forEach(
          s =>
            s.classList.toggle(
              'selected',
              s.dataset.color ===
                sheet.color
            )
        );

      return;
    }

    if (
      action ===
      'pick-icon'
    ){

      if (!sheet) return;

      sheet.icon =
        t.dataset.icon;

      document
        .querySelectorAll(
          '#iconList .emoji-btn'
        )
        .forEach(
          b =>
            b.classList.toggle(
              'selected',
              b.dataset.icon ===
                sheet.icon
            )
        );

      return;
    }

    if (
      action ===
      'save-cat'
    ){

      if (!sheet) return;

      if (
        sheet.name.trim()
      ){

        const cat = {
          id:
            sheet.id ||
            uid(),

          name:
            sheet.name.trim(),

          type:
            sheet.type,

          color:
            sheet.color,

          icon:
            sheet.icon,

          budget:
            sheet.type === 'expense' &&
            sheet.budget
              ? Number(
                  sheet.budget
                )
              : null,

          primary:
            sheet.type === 'income'
              ? !!sheet.primary
              : false,

          isFixed:
            sheet.type === 'expense'
              ? !!sheet.isFixed
              : false
        };

        const exists =
          DB.categories.some(
            x =>
              x.id ===
              cat.id
          );

        DB.categories =
          exists
            ? DB.categories.map(
                x =>
                  x.id === cat.id
                    ? cat
                    : x
              )
            : DB.categories.concat(
                [cat]
              );

        reconcileCreditTransactions();
        saveDB();
        safeSync();

        sheet =
          null;

        renderAppContent();
      }

      return;
    }

    if (
      action ===
      'delete-cat'
    ){

      if (!sheet) return;

      confirmState = {
        message:
          '¿Eliminar categoría?',

        onConfirm:
          () => {

            // Antes de borrar la categoría, reasignar sus movimientos a
            // "Otros gastos"/"Otros ingresos" (si esa categoría de respaldo
            // sigue existiendo) para que no queden con un categoryId
            // huérfano: un movimiento huérfano seguía sumando en "Gastos
            // del mes"/Balance (correcto), pero desaparecía por completo
            // de "Gastos por categoría" (computeCategoryTotals descarta
            // los que no resuelven a una categoría real), mostrando un
            // % gastado y un Disponible incorrectos en el Dashboard.
            const fallbackId =
              sheet.type === 'income'
                ? 'inc-other'
                : 'exp-other';

            const fallbackExists =
              fallbackId !== sheet.id &&
              DB.categories.some(
                c => c.id === fallbackId
              );

            if (
              fallbackExists
            ){

              DB.transactions.forEach(
                t => {

                  if (
                    t.categoryId ===
                    sheet.id
                  ){

                    t.categoryId =
                      fallbackId;
                  }
                }
              );
            }

            DB.categories =
              DB.categories.filter(
                x =>
                  x.id !==
                  sheet.id
              );

            reconcileCreditTransactions();
            saveDB();
            safeSync();

            sheet =
              null;

            confirmState =
              null;

            renderAppContent();
          }
      };

      renderOverlays();

      return;
    }

    /* ======================================================
       CRÉDITOS
       ====================================================== */

    if (
      action ===
      'new-credit'
    ){

      sheet = {
        kind:'credit',
        mode:'new',
        id:null,
        title:'',
        type:
          UI.creditFilter ||
          'against',
        total:'',
        hasInterest:false,
        interestRate:'',
        interestPeriod:'monthly',
        termMonths:'',
        startDate:todayStr()
      };

      renderOverlays();

      return;
    }

    if (
      action ===
      'edit-credit'
    ){

      const c =
        DB.credits.find(
          x =>
            x.id ===
            t.dataset.id
        );

      if (
        c
      ){

        sheet = {
          kind:'credit',
          mode:'edit',
          id:c.id,
          title:
            c.title ||
            '',
          type:
            c.type ||
            'against',
          total:
            String(
              c.total ||
              ''
            ),

          hasInterest:
            Boolean(
              c.interestEnabled
            ) ||
            parseInterestRate(
              c.interestRate
            ) > 0,

          interestRate:
            String(
              c.interestRate ||
              ''
            ),

          interestPeriod:
            c.interestPeriod ===
            'annual'
              ? 'annual'
              : 'monthly',

          termMonths:
            String(
              c.termMonths ||
              ''
            ),

          startDate:
            c.startDate ||
            c.date ||
            todayStr()
        };

        renderOverlays();
      }

      return;
    }

    if (
      action ===
      'credit-type'
    ){

      if (!sheet) return;

      sheet.type =
        t.dataset.type;

      renderOverlays();

      return;
    }

    if (
      action ===
      'toggle-credit-interest'
    ){

      if (!sheet) return;

      sheet.hasInterest =
        !sheet.hasInterest;

      renderOverlays();

      return;
    }

    if (
      action ===
      'save-credit'
    ){

      if (!sheet) return;

      const tot =
        Number(
          sheet.total
        );

      const rate =
        parseInterestRate(
          sheet.interestRate
        );

      const term =
        Math.max(
          0,
          Math.floor(
            Number(
              sheet.termMonths
            ) || 0
          )
        );

      const hasInterest =
        !!sheet.hasInterest &&
        rate > 0 &&
        term > 0;

      if (
        sheet.title.trim() &&
        tot > 0 &&
        (
          !sheet.hasInterest ||
          (
            rate > 0 &&
            term > 0
          )
        )
      ){

        if (
          !DB.credits
        ){

          DB.credits = [];
        }

        const previous =
          sheet.id
            ? (
                DB.credits.find(
                  x =>
                    x.id ===
                    sheet.id
                ) ||
                {}
              )
            : {};

        const credit = {

          ...previous,

          id:
            sheet.id ||
            uid(),

          title:
            sheet.title.trim(),

          type:
            sheet.type,

          total:
            tot,

          interestEnabled:
            hasInterest,

          interestRate:
            hasInterest
              ? rate
              : 0,

          interestPeriod:
            sheet.interestPeriod ===
            'annual'
              ? 'annual'
              : 'monthly',

          termMonths:
            hasInterest
              ? term
              : 0,

          startDate:
            sheet.startDate ||
            todayStr(),

          amortization:
            'french',

          payments:
            previous.payments ||
            []
        };

        const exists =
          DB.credits.some(
            x =>
              x.id ===
              credit.id
          );

        DB.credits =
          exists
            ? DB.credits.map(
                x =>
                  x.id ===
                  credit.id
                    ? credit
                    : x
              )
            : DB.credits.concat(
                [credit]
              );

        reconcileCreditTransactions();
        saveDB();
        safeSync();

        sheet =
          null;

        renderAppContent();
      }

      return;
    }

    if (
      action ===
      'delete-credit'
    ){

      if (!sheet) return;

      confirmState = {
        message:
          '¿Eliminar crédito?',

        onConfirm:
          () => {

            DB.credits =
              DB.credits.filter(
                x =>
                  x.id !==
                  sheet.id
              );

            reconcileCreditTransactions();
            saveDB();
            safeSync();

            sheet =
              null;

            confirmState =
              null;

            renderAppContent();
          }
      };

      renderOverlays();

      return;
    }

    /* ======================================================
       APORTES
       ====================================================== */

    if (
      action ===
      'new-payment'
    ){

      sheet = {
        kind:'payment',
        mode:'new',
        creditId:
          t.dataset.id,
        paymentId:null,
        amount:'',
        date:todayStr(),
        note:''
      };

      renderOverlays();

      return;
    }

    if (
      action ===
      'edit-payment'
    ){

      const c =
        DB.credits.find(
          x =>
            x.id ===
            t.dataset.cid
        );

      const p =
        (
          c?.payments ||
          []
        ).find(
          x =>
            x.id ===
            t.dataset.pid
        );

      if (
        p
      ){

        sheet = {
          kind:'payment',
          mode:'edit',
          creditId:
            t.dataset.cid,
          paymentId:
            p.id,
          amount:
            String(
              p.amount
            ),
          date:
            p.date,
          note:
            p.note ||
            ''
        };

        renderOverlays();
      }

      return;
    }

    if (
      action ===
      'save-payment'
    ){

      if (!sheet) return;

      const amt =
        Number(
          sheet.amount
        );

      if (
        amt > 0
      ){

        const pay = {
          id:
            sheet.paymentId ||
            uid(),

          amount:
            amt,

          date:
            sheet.date ||
            todayStr(),

          note:
            (
              sheet.note ||
              ''
            ).trim()
        };

        DB.credits =
          DB.credits.map(
            c => {

              if (
                c.id ===
                sheet.creditId
              ){

                let pays =
                  c.payments ||
                  [];

                const exists =
                  pays.some(
                    x =>
                      x.id ===
                      pay.id
                  );

                pays =
                  exists
                    ? pays.map(
                        x =>
                          x.id ===
                          pay.id
                            ? pay
                            : x
                      )
                    : pays.concat(
                        [pay]
                      );

                return {
                  ...c,
                  payments:pays
                };
              }

              return c;
            }
          );

        reconcileCreditTransactions();
        saveDB();
        safeSync();

        sheet =
          null;

        renderAppContent();
      }

      return;
    }

    if (
      action ===
      'delete-payment'
    ){

      if (!sheet) return;

      confirmState = {
        message:
          '¿Eliminar aporte?',

        onConfirm:
          () => {

            DB.credits =
              DB.credits.map(
                c =>
                  c.id ===
                  sheet.creditId

                    ? {
                        ...c,
                        payments:
                          (
                            c.payments ||
                            []
                          ).filter(
                            p =>
                              p.id !==
                              sheet.paymentId
                          )
                      }

                    : c
              );

            reconcileCreditTransactions();
            saveDB();
            safeSync();

            sheet =
              null;

            confirmState =
              null;

            renderAppContent();
          }
      };

      renderOverlays();

      return;
    }

    /* ======================================================
       FACTURAS
       ====================================================== */

    if (
      action ===
      'toggle-invoice'
    ){

      UI.openInvoiceId =
        UI.openInvoiceId ===
        t.dataset.id
          ? null
          : t.dataset.id;

      renderAppContent();

      return;
    }

    if (
      action ===
      'edit-invoice'
    ){

      const inv =
        DB.invoices.find(
          x =>
            x.id ===
            t.dataset.id
        );

      if (
        inv
      ){

        sheet = {
          kind:'invoice',
          mode:'edit',
          id:inv.id,
          title:
            inv.title,
          date:
            inv.date,
          items:
            inv.items.map(
              it => ({
                ...it,
                price:
                  String(
                    it.price
                  )
              })
            ),
          registered:
            !!inv.registered,
          ...normalizeInvoiceMeta(inv)
        };

        renderOverlays();
      }

      return;
    }

    if (
      action ===
      'register-invoice'
    ){

      const inv =
        DB.invoices.find(
          x =>
            x.id ===
            t.dataset.id
        );

      if (
        inv
      ){

        sheet = {
          kind:'tx',
          mode:'new',
          id:null,
          type:'expense',
          categoryId:
            (
              DB.categories.find(
                c =>
                  c.type ===
                  'expense'
              ) || {}
            ).id ||
            '',
          amount:
            String(
              Math.round(
                inv.total
              )
            ),
          date:
            inv.date ||
            todayStr(),
          note:
            inv.title ||
            '',
          sourceInvoiceId:
            inv.id
        };

        renderOverlays();
      }

      return;
    }

    if (
      action ===
      'add-invoice-item'
    ){

      if (!sheet) return;

      sheet.items.push({
        id:uid(),
        name:'',
        price:''
      });

      document.getElementById(
        'inv-items-list'
      ).innerHTML =
        renderInvoiceItemsHTML(
          sheet
        );

      return;
    }

    if (
      action ===
      'remove-invoice-item'
    ){

      if (!sheet) return;

      sheet.items.splice(
        Number(
          t.dataset.idx
        ),
        1
      );

      if (
        !sheet.items.length
      ){

        sheet.items.push({
          id:uid(),
          name:'',
          price:''
        });
      }

      document.getElementById(
        'inv-items-list'
      ).innerHTML =
        renderInvoiceItemsHTML(
          sheet
        );

      return;
    }

    if (
      action ===
      'save-invoice'
    ){

      if (!sheet) return;

      const items =
        sheet.items
          .filter(
            it =>
              it.name.trim() &&
              Number(
                it.price
              ) > 0
          )
          .map(
            it => ({
              id:
                it.id ||
                uid(),
              name:
                it.name
                  .trim()
                  .slice(
                    0,
                    60
                  ),
              price:
                Math.round(
                  Number(
                    it.price
                  ) || 0
                )
            })
          );

      if (
        items.length
      ){

        const itemsTotal =
          items.reduce(
            (
              s,
              it
            ) =>
              s +
              it.price,
            0
          );

        // El total de la factura es el detectado por la IA (neto a pagar, o
        // total si no hay neto) cuando exista; si la factura no muestra un
        // total visible, se calcula determinísticamente desde subtotal/
        // descuentos/impuestos/cargos/retenciones; solo se cae a la suma de
        // ítems si tampoco hay subtotal (factura manual/sin IA).
        const total =
          sheet.netPayable?.value ??
          sheet.detectedTotal?.value ??
          computeDeterministicInvoiceTotal(sheet) ??
          itemsTotal;

        const invoice = {
          id:
            sheet.id ||
            uid(),

          title:
            (
              sheet.title ||
              ''
            ).trim() ||
            (
              'Factura ' +
              todayStr()
            ),

          date:
            sheet.date ||
            todayStr(),

          items,

          total,

          registered:
            !!sheet.registered,

          ...normalizeInvoiceMeta(sheet)
        };

        if (
          !DB.invoices
        ){

          DB.invoices =
            [];
        }

        const exists =
          DB.invoices.some(
            x =>
              x.id ===
              invoice.id
          );

        DB.invoices =
          exists
            ? DB.invoices.map(
                x =>
                  x.id ===
                  invoice.id
                    ? invoice
                    : x
              )
            : DB.invoices.concat(
                [invoice]
              );

        reconcileCreditTransactions();
        saveDB();
        safeSync();

        sheet =
          null;

        UI.tab =
          'invoices';

        renderAppContent();
      }

      return;
    }

    if (
      action ===
      'delete-invoice'
    ){

      if (!sheet) return;

      confirmState = {
        message:
          '¿Eliminar factura?',

        onConfirm:
          () => {

            // Si la factura ya fue registrada como gasto (register-invoice
            // crea un movimiento con sourceInvoiceId), borrar la factura
            // debe borrar también ese movimiento — si no, queda un gasto
            // huérfano y el balance nunca refleja la eliminación (el
            // registro de la factura desaparece pero el dinero sigue
            // "gastado" indefinidamente). Simétrico con delete-tx, que ya
            // revierte invoice.registered cuando se borra el movimiento.
            DB.transactions =
              DB.transactions.filter(
                x =>
                  x.sourceInvoiceId !==
                  sheet.id
              );

            DB.invoices =
              DB.invoices.filter(
                x =>
                  x.id !==
                  sheet.id
              );

            reconcileCreditTransactions();
            saveDB();
            safeSync();

            sheet =
              null;

            confirmState =
              null;

            renderAppContent();
          }
      };

      renderOverlays();

      return;
    }

    /* ======================================================
       CERRAR
       ====================================================== */

    if (
      action ===
      'close-sheet'
    ){

      sheet =
        null;

      renderOverlays();

      return;
    }

    if (
      action ===
      'cancel-confirm'
    ){

      confirmState =
        null;

      renderOverlays();

      return;
    }

    if (
      action ===
      'confirm-ok'
    ){

      if (
        !confirmState
      ){
        return;
      }

      const fn =
        confirmState.onConfirm;

      confirmState =
        null;

      renderOverlays();

      fn();

      return;
    }

    /* ======================================================
       MONEDA
       ====================================================== */

    if (
      action ===
      'set-currency'
    ){

      DB.settings.currency =
        t.dataset.code;

      reconcileCreditTransactions();
      saveDB();
      safeSync();

      renderAppContent();

      return;
    }
  }
);

/* ==========================================================
   SINCRONIZACIÓN DE CAMPOS
   ========================================================== */

function attachSheetFieldSync(){

  if (!sheet) return;

  /* ========================================================
     MOVIMIENTO / GASTO RÁPIDO
     ======================================================== */

  if (
    sheet.kind === 'tx' ||
    sheet.kind === 'quick'
  ){

    const prefix =
      sheet.kind === 'tx'
        ? 'f'
        : 'q';

    const a =
      document.getElementById(
        prefix +
        '-amount'
      );

    const d =
      document.getElementById(
        prefix +
        '-date'
      );

    const n =
      document.getElementById(
        prefix +
        '-note'
      );

    if (
      a
    ){

      a.addEventListener(
        'input',
        e => {

          sheet.amount =
            parseFormattedNumber(
              e.target.value
            );

          e.target.value =
            formatThousandInput(
              sheet.amount
            );

          const saveBtn =
            document.querySelector(
              'button[data-action="save-tx"],button[data-action="save-quick"]'
            );

          if (
            saveBtn
          ){

            if (
              Number(
                sheet.amount
              ) > 0
            ){

              saveBtn.removeAttribute(
                'disabled'
              );

              saveBtn.style.opacity =
                '1';

              saveBtn.style.cursor =
                'pointer';

            } else {

              saveBtn.setAttribute(
                'disabled',
                'true'
              );

              saveBtn.style.opacity =
                '0.5';
            }
          }
        }
      );
    }

    if (
      d
    ){

      d.addEventListener(
        'input',
        () => {

          sheet.date =
            d.value;
        }
      );
    }

    if (
      n
    ){

      n.addEventListener(
        'input',
        () => {

          sheet.note =
            n.value;
        }
      );
    }

  /* ========================================================
     CATEGORÍA
     ======================================================== */

  } else if (
    sheet.kind ===
    'cat'
  ){

    const nm =
      document.getElementById(
        'f-name'
      );

    const b =
      document.getElementById(
        'f-budget'
      );

    const catSaveBtn =
      document.getElementById(
        'cat-save-btn'
      );

    if (
      nm
    ){

      nm.addEventListener(
        'input',
        () => {

          sheet.name =
            nm.value;

          // A diferencia de tx/quick/credit/payment, este campo no
          // recalculaba el estado del botón Guardar tras el render
          // inicial: al crear una categoría nueva (nombre vacío al
          // abrir), el botón nacía disabled y se quedaba así para
          // siempre sin importar lo que se escribiera — era imposible
          // crear una categoría nueva desde la UI.
          if (
            catSaveBtn
          ){

            catSaveBtn.disabled =
              !sheet.name.trim().length;
          }
        }
      );
    }

    if (
      b
    ){

      b.addEventListener(
        'input',
        e => {

          sheet.budget =
            parseFormattedNumber(
              e.target.value
            );

          e.target.value =
            formatThousandInput(
              sheet.budget
            );
        }
      );
    }

  /* ========================================================
     CRÉDITO
     ======================================================== */

  } else if (
    sheet.kind ===
    'credit'
  ){

    const title =
      document.getElementById(
        'c-title'
      );

    const tot =
      document.getElementById(
        'c-total'
      );

    const rate =
      document.getElementById(
        'c-interest-rate'
      );

    const period =
      document.getElementById(
        'c-interest-period'
      );

    const term =
      document.getElementById(
        'c-term'
      );

    const startDate =
      document.getElementById(
        'c-start-date'
      );

    /*
     * Preview en tiempo real.
     */

    const updateCreditPreview =
      () => {

        const principal =
          Number(
            sheet.total
          ) || 0;

        const interestEnabled =
          !!sheet.hasInterest;

        const interestRate =
          parseInterestRate(
            sheet.interestRate
          );

        const interestPeriod =
          sheet.interestPeriod ||
          'monthly';

        const termMonths =
          Number(
            sheet.termMonths
          ) || 0;

        const monthlyRate =
          interestEnabled
            ? (
                interestPeriod === 'annual'
                  ? interestRate /
                    100 /
                    12
                  : interestRate /
                    100
              )
            : 0;

        let installment =
          0;

        let total =
          principal;

        let interest =
          0;

        if (
          principal > 0 &&
          termMonths > 0
        ){

          if (
            monthlyRate > 0
          ){

            const factor =
              Math.pow(
                1 +
                monthlyRate,
                termMonths
              );

            installment =
              principal *
              (
                monthlyRate *
                factor
              ) /
              (
                factor -
                1
              );

            total =
              installment *
              termMonths;

            interest =
              Math.max(
                0,
                total -
                principal
              );

          } else {

            installment =
              principal /
              termMonths;
          }
        }

        const iEl =
          document.getElementById(
            'c-preview-interest'
          );

        const tEl =
          document.getElementById(
            'c-preview-total'
          );

        const pEl =
          document.getElementById(
            'c-preview-payment'
          );

        const saveBtn =
          document.getElementById(
            'credit-save-btn'
          );

        if (
          iEl
        ){

          iEl.textContent =
            fmtMoneyLocal(
              interest
            );
        }

        if (
          tEl
        ){

          tEl.textContent =
            fmtMoneyLocal(
              total
            );
        }

        if (
          pEl
        ){

          pEl.textContent =
            installment > 0
              ? fmtMoneyLocal(
                  installment
                )
              : '—';
        }

        if (
          saveBtn
        ){

          const ok =
            String(
              sheet.title ||
              ''
            ).trim().length > 0 &&
            principal > 0 &&
            (
              !sheet.hasInterest ||
              (
                parseInterestRate(
                  sheet.interestRate
                ) > 0 &&
                Number(
                  sheet.termMonths
                ) > 0
              )
            );

          saveBtn.disabled =
            !ok;

          saveBtn.style.opacity =
            ok
              ? '1'
              : '0.5';
        }
      };

    if (
      title
    ){

      title.addEventListener(
        'input',
        () => {

          sheet.title =
            title.value;

          updateCreditPreview();
        }
      );
    }

    if (
      tot
    ){

      tot.addEventListener(
        'input',
        e => {

          sheet.total =
            parseFormattedNumber(
              e.target.value
            );

          e.target.value =
            formatThousandInput(
              sheet.total
            );

          updateCreditPreview();
        }
      );
    }

    if (
      rate
    ){

      rate.addEventListener(
        'input',
        e => {

          sheet.interestRate =
            e.target.value;

          updateCreditPreview();
        }
      );
    }

    if (
      period
    ){

      period.addEventListener(
        'change',
        () => {

          sheet.interestPeriod =
            period.value ===
            'annual'
              ? 'annual'
              : 'monthly';

          updateCreditPreview();
        }
      );
    }

    if (
      term
    ){

      term.addEventListener(
        'input',
        () => {

          sheet.termMonths =
            Math.min(
              600,
              Math.max(
                0,
                Math.floor(
                  Number(
                    term.value
                  ) || 0
                )
              )
            );

          term.value =
            sheet.termMonths ||
            '';

          updateCreditPreview();
        }
      );
    }

    if (
      startDate
    ){

      startDate.addEventListener(
        'input',
        () => {

          sheet.startDate =
            startDate.value;
        }
      );
    }

    updateCreditPreview();

  /* ========================================================
     APORTE
     ======================================================== */

  } else if (
    sheet.kind ===
    'payment'
  ){

    const a =
      document.getElementById(
        'p-amount'
      );

    const d =
      document.getElementById(
        'p-date'
      );

    const n =
      document.getElementById(
        'p-note'
      );

    const saveBtn =
      document.getElementById(
        'pay-save-btn'
      );

    if (
      a
    ){

      a.addEventListener(
        'input',
        e => {

          sheet.amount =
            parseFormattedNumber(
              e.target.value
            );

          e.target.value =
            formatThousandInput(
              sheet.amount
            );

          if (
            saveBtn
          ){

            const valid =
              Number(
                sheet.amount
              ) > 0;

            saveBtn.disabled =
              !valid;

            saveBtn.style.opacity =
              valid
                ? '1'
                : '0.5';
          }
        }
      );
    }

    if (
      d
    ){

      d.addEventListener(
        'input',
        () => {

          sheet.date =
            d.value;
        }
      );
    }

    if (
      n
    ){

      n.addEventListener(
        'input',
        () => {

          sheet.note =
            n.value;
        }
      );
    }

  /* ========================================================
     FACTURA
     ======================================================== */

  } else if (
    sheet.kind ===
    'invoice'
  ){

    const ti =
      document.getElementById(
        'inv-title'
      );

    const da =
      document.getElementById(
        'inv-date'
      );

    if (
      ti
    ){

      ti.addEventListener(
        'input',
        () => {

          sheet.title =
            ti.value;
        }
      );
    }

    if (
      da
    ){

      da.addEventListener(
        'input',
        () => {

          sheet.date =
            da.value;
        }
      );
    }

    const list =
      document.getElementById(
        'inv-items-list'
      );

    if (
      list
    ){

      list.addEventListener(
        'input',
        e => {

          const idx =
            e.target.dataset.idx;

          const field =
            e.target.dataset.field;

          if (
            idx === undefined ||
            !field
          ){
            return;
          }

          if (
            field === 'price'
          ){

            sheet.items[idx].price =
              parseFormattedNumber(
                e.target.value
              );

            e.target.value =
              formatThousandInput(
                sheet.items[idx].price
              );

          } else {

            sheet.items[idx][field] =
              e.target.value;
          }

          const totalVal =
            sheet.items.reduce(
              (
                s,
                it
              ) =>
                s +
                (
                  Number(
                    it.price
                  ) || 0
                ),
              0
            );

          const totalEl =
            document.getElementById(
              'inv-total-val'
            );

          if (
            totalEl
          ){

            totalEl.textContent =
              fmtMoneyLocal(
                totalVal
              );
          }
        }
      );
    }
  }
}

/* ==========================================================
   FORMATO LOCAL PARA PREVIEWS
   ========================================================== */

function fmtMoneyLocal(
  amount
){

  const cur =
    DB.settings.currency ||
    'COP';

  const locales = {
    COP:'es-CO',
    USD:'en-US',
    MXN:'es-MX',
    EUR:'es-ES'
  };

  const locale =
    locales[cur] ||
    'es-CO';

  try {

    return new Intl.NumberFormat(
      locale,
      {
        style:'currency',
        currency:cur,
        maximumFractionDigits:0
      }
    ).format(
      Number(amount) || 0
    );

  } catch(e) {

    return (
      Number(amount) ||
      0
    ).toFixed(0) +
    ' ' +
    cur;
  }
}

/* ==========================================================
   COMPRESIÓN DE IMAGEN
   ========================================================== */

// FASE 1B.8: antes se leía el archivo con FileReader.readAsDataURL (que
// codifica TODO el archivo original, a veces varios MB de una foto de
// cámara, a base64 solo para volver a decodificarlo al asignarlo a
// img.src) y luego se re-codificaba una SEGUNDA vez a base64 vía
// canvas.toDataURL. Ese primer paso por base64 era una conversión
// innecesaria: nunca se usa el string del archivo original, solo los
// píxeles ya reducidos. Se reemplaza por URL.createObjectURL(file), que
// referencia los bytes del archivo directamente sin codificarlos, y
// alimenta exactamente el mismo <img> (misma decodificación de imagen,
// mismo manejo de orientación EXIF que antes — no cambia qué llega al
// analizador, solo cómo se lee el archivo original).
function compressImage(
  file,
  maxWidth = 800,
  quality = 0.7
){

  return new Promise(
    (resolve, reject) => {

      const objectUrl =
        URL.createObjectURL(
          file
        );

      const cleanup =
        () => {

          URL.revokeObjectURL(
            objectUrl
          );
        };

      const img =
        new Image();

      img.onerror =
        () => {

          cleanup();

          reject(
            new Error(
              'No se pudo procesar la imagen.'
            )
          );
        };

      img.onload =
        () => {

          cleanup();

          const canvas =
            document.createElement(
              'canvas'
            );

          let width =
            img.width;

          let height =
            img.height;

          if (
            width >
            maxWidth
          ){

            height =
              Math.round(
                (
                  height *
                  maxWidth
                ) /
                width
              );

            width =
              maxWidth;
          }

          canvas.width =
            width;

          canvas.height =
            height;

          const ctx =
            canvas.getContext(
              '2d'
            );

          ctx.drawImage(
            img,
            0,
            0,
            width,
            height
          );

          const dataUrl =
            canvas.toDataURL(
              'image/jpeg',
              quality
            );

          const match =
            dataUrl.match(
              /^data:([^;]+);base64,(.*)$/
            );

          resolve({
            mimeType:
              match[1],
            base64:
              match[2]
          });
        };

      img.src =
        objectUrl;
    }
  );
}

/* ==========================================================
   ESCÁNER DE FACTURAS
   ========================================================== */

function showScanError(err) {

  scanningOverlay =
    null;

  renderOverlays();

  alert(
    (err && err.message) ||
    'Error al procesar la factura.'
  );
}

document.addEventListener(
  'change',
  e => {

    if (
      e.target.id ===
      'global-camera-input' &&
      e.target.files[0]
    ){

      const file =
        e.target.files[0];

      // Sección 6, FASE 1B.8: mensaje honesto en dos fases reales (no un
      // porcentaje inventado) — refleja exactamente lo que ocurre: primero
      // se prepara la imagen en el teléfono, después se espera la
      // respuesta del análisis (la fase que realmente toma más tiempo).
      scanningOverlay = {
        message:
          'Optimizando imagen...'
      };

      renderOverlays();

      // Medición ligera (Sección 5, FASE 1B.8): sin UI ni lógica nueva,
      // solo marcas de tiempo en consola para poder confirmar en un
      // dispositivo real cuánto corresponde a preparar la imagen en el
      // teléfono vs. a la respuesta del proxy/modelo (red + IA, fuera del
      // control de esta app). Déjalo activo; no afecta el flujo.
      const scanTimingStart =
        performance.now();

      compressImage(
        file,
        800,
        0.7
      )
      .then(
        async ({
          base64,
          mimeType
        }) => {

          const scanTimingImageReady =
            performance.now();

          console.log(
            '[scan-invoice] preparación de imagen: ' +
            (
              scanTimingImageReady -
              scanTimingStart
            ).toFixed(0) +
            'ms'
          );

          scanningOverlay = {
            message:
              'Analizando factura con IA...'
          };

          renderOverlays();

          try {

            const result =
              API.scanInvoiceViaProxy
                ? await API.scanInvoiceViaProxy(
                    base64,
                    mimeType
                  )
                : {};

            const scanTimingResponse =
              performance.now();

            console.log(
              '[scan-invoice] proxy + modelo (red, fuera del control local): ' +
              (
                scanTimingResponse -
                scanTimingImageReady
              ).toFixed(0) +
              'ms — total: ' +
              (
                scanTimingResponse -
                scanTimingStart
              ).toFixed(0) +
              'ms'
            );

            const scannedItems =
              Array.isArray(result.items)
                ? result.items.map(
                    it => ({
                      id:uid(),
                      name:String(it?.name || ''),
                      price:String(it?.price ?? '')
                    })
                  )
                : [];

            const meta =
              normalizeInvoiceMeta({
                ...result,
                detectedTotal:
                  result.total ||
                  null
              });

            scanningOverlay =
              null;

            sheet = {
              kind:'invoice',
              mode:'new',
              id:null,
              title:
                'Factura ' +
                todayStr(),
              date:
                todayStr(),
              items:
                scannedItems.length
                  ? scannedItems
                  : [
                      {
                        id:uid(),
                        name:'',
                        price:''
                      }
                    ],
              registered:false,
              ...meta
            };

            renderOverlays();

          } catch(err) {

            showScanError(
              err
            );
          }
        }
      )
      .catch(
        err => {

          showScanError(
            err
          );
        }
      );
    }
  }
);

/* ==========================================================
   REFRESCAR AL VOLVER A LA APP (visibilitychange / pageshow / focus)
   ========================================================== */

document.addEventListener(
  'visibilitychange',
  () => {

    if (
      document.visibilityState === 'visible'
    ){

      refreshCloudData();
    }
  }
);

window.addEventListener(
  'pageshow',
  () => {

    refreshCloudData();
  }
);

window.addEventListener(
  'focus',
  () => {

    refreshCloudData();
  }
);

// El indicador de nube del header también debe reflejar cambios reales
// de conectividad reportados por el propio navegador (API estándar, no
// es una segunda lógica de sincronización).
window.addEventListener(
  'online',
  refreshCloudStatusIndicator
);

window.addEventListener(
  'offline',
  refreshCloudStatusIndicator
);

/* ==========================================================
   INICIO
   ========================================================== */

// Se espera el posible callback de confirmación de email ANTES del
// primer render(): si trae una sesión válida, render() ya la encuentra en
// localStorage y entra directo a la app (sin pantalla intermedia). Si
// handleEmailConfirmationReturn() fallara por cualquier motivo no
// previsto, el catch garantiza que la app arranque igual.
(async () => {

  try {

    await handleEmailConfirmationReturn();

  } catch(e) {

    console.error(
      'Error procesando confirmación de email:',
      e
    );
  }

  attachViewScrollIdleTracking();

  render();
})();
