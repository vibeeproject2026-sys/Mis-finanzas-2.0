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
  parseFormattedNumber
} from './ui.js';

import * as API from './api.js';

import {
  parseInterestRate,
  computeDeterministicInvoiceTotal
} from './domain.js';

/* ==========================================================
   ESTADO DE LA INTERFAZ
   ========================================================== */

let UI = {
  tab:'dashboard',
  txFilter:'all',
  creditFilter:'against',
  search:'',
  openInvoiceId:null,
  openCreditId:null,
  fabMenuOpen:false
};

let sheet = null;
let confirmState = null;
let scanningOverlay = null;
let momCarouselInterval = null;
let syncPending = false;
let cloudRefreshInFlight = false;
let lastCloudRefreshAt = 0;

const CLOUD_REFRESH_COOLDOWN_MS = 30000;
const CLOUD_REFRESH_ERROR_BANNER_MS = 6000;

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
      'banner banner--warn';

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

  el.style.bottom =
    `calc(24px + env(safe-area-inset-bottom) + ${offsetPx}px)`;

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
      130
    );
  }

  return ok;
}

/* ==========================================================
   SINCRONIZACIÓN
   ========================================================== */

function updateSyncBanner(pending) {

  syncPending =
    pending;

  if (
    pending
  ){

    showFloatingBanner(
      'sync-status-banner',
      'Cambios guardados localmente. Pendiente de sincronizar con la nube.',
      84
    );

  } else {

    hideFloatingBanner(
      'sync-status-banner'
    );
  }
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

  if (
    Date.now() - lastCloudRefreshAt <
    CLOUD_REFRESH_COOLDOWN_MS
  ){
    return;
  }

  cloudRefreshInFlight =
    true;

  lastCloudRefreshAt =
    Date.now();

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

        showFloatingBanner(
          'cloud-refresh-error-banner',
          'No se pudieron actualizar los datos desde la nube. Se muestran los datos guardados en este dispositivo.',
          176,
          CLOUD_REFRESH_ERROR_BANNER_MS
        );

        return;
      }

      hideFloatingBanner(
        'cloud-refresh-error-banner'
      );

      const cloudDB =
        result.data;

      if (
        !cloudDB ||
        typeof cloudDB !== 'object'
      ){
        // No existe (todavía) una fila remota: no se borra el DB local.
        return;
      }

      if (
        sheet
      ){
        // Se abrió una edición mientras llegaba la respuesta: no pisarla.
        return;
      }

      if (
        Array.isArray(
          cloudDB.transactions
        )
      ){

        DB.transactions =
          cloudDB.transactions;
      }

      if (
        Array.isArray(
          cloudDB.categories
        )
      ){

        DB.categories =
          cloudDB.categories;
      }

      if (
        Array.isArray(
          cloudDB.credits
        )
      ){

        DB.credits =
          cloudDB.credits;
      }

      if (
        Array.isArray(
          cloudDB.invoices
        )
      ){

        DB.invoices =
          cloudDB.invoices;
      }

      if (
        cloudDB.settings &&
        typeof cloudDB.settings === 'object'
      ){

        DB.settings = {
          ...DB.settings,
          ...cloudDB.settings
        };
      }

      reconcileCreditTransactions();
      saveDB();

      renderAppContent();
    }
  )
  .catch(
    err => {

      console.error(
        'Error al actualizar datos desde la nube:',
        err
      );

      showFloatingBanner(
        'cloud-refresh-error-banner',
        'No se pudieron actualizar los datos desde la nube. Se muestran los datos guardados en este dispositivo.',
        176,
        CLOUD_REFRESH_ERROR_BANNER_MS
      );
    }
  )
  .finally(
    () => {

      cloudRefreshInFlight =
        false;
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
        DB
      ).then(
        result => {

          if (
            result &&
            result.ok === false &&
            !result.skipped
          ){

            updateSyncBanner(true);

          } else if (
            result &&
            result.ok === true
          ){

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

    if (
      !token ||
      !userId
    ){

      if (
        viewEl
      ){

        viewEl.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:center;padding:40px 16px;min-height:75vh;">
            <div class="card" style="width:100%;max-width:380px;padding:32px 24px;text-align:center;">

              <div style="font-size:36px;margin-bottom:12px;">☁️</div>

              <h2 style="font-size:22px;font-weight:800;color:#fff;margin-bottom:6px;">
                Terminal Cloud
              </h2>

              <p style="font-size:13px;color:var(--ink-muted);margin-bottom:24px;">
                Gestión financiera en la nube
              </p>

              <div class="field" style="text-align:left;margin-bottom:14px;">
                <div class="field-label">
                  Correo electrónico
                </div>

                <input
                  id="auth-email"
                  type="email"
                  placeholder="usuario@correo.com"
                  style="width:100%;padding:12px;border-radius:12px;background:var(--bg);border:1px solid var(--border);color:#fff;font-size:14px;outline:none;"
                >
              </div>

              <div class="field" style="text-align:left;margin-bottom:16px;">
                <div class="field-label">
                  Contraseña
                </div>

                <input
                  id="auth-password"
                  type="password"
                  placeholder="••••••••"
                  style="width:100%;padding:12px;border-radius:12px;background:var(--bg);border:1px solid var(--border);color:#fff;font-size:14px;outline:none;"
                >
              </div>

              <div
                id="auth-error"
                style="color:var(--expense);font-size:13px;margin-bottom:14px;min-height:16px;"
              ></div>

              <button
                class="save-btn"
                id="btn-login"
                style="width:100%;margin-bottom:10px;padding:14px;border-radius:12px;background:var(--accent);color:#fff;font-weight:700;border:none;cursor:pointer;"
              >
                Iniciar Sesión
              </button>

              <button
                class="secondary-btn"
                id="btn-signup"
                style="width:100%;padding:14px;border-radius:12px;background:transparent;border:1px solid var(--border);color:#fff;font-weight:600;cursor:pointer;"
              >
                Crear Cuenta Nueva
              </button>

            </div>
          </div>
        `;
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
   AUTENTICACIÓN
   ========================================================== */

function attachAuthEvents(){

  const emailInput =
    document.getElementById(
      'auth-email'
    );

  const passInput =
    document.getElementById(
      'auth-password'
    );

  const errorDiv =
    document.getElementById(
      'auth-error'
    );

  const getCreds =
    () => ({
      email:
        emailInput
          ? emailInput.value.trim()
          : '',

      password:
        passInput
          ? passInput.value.trim()
          : ''
    });

  document
    .getElementById(
      'btn-login'
    )
    ?.addEventListener(
      'click',
      async () => {

        const {
          email,
          password
        } =
          getCreds();

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

  document
    .getElementById(
      'btn-signup'
    )
    ?.addEventListener(
      'click',
      async () => {

        const {
          email,
          password
        } =
          getCreds();

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
            'Registrando cuenta...';
        }

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
              password
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

            if (
              errorDiv
            ){

              errorDiv.textContent =
                '¡Cuenta creada con éxito! Inicia sesión ahora.';
            }
          }

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
        '<div class="hero"><div class="hero-content">' +
        '<div class="hero-badge"><span class="hero-dot"></span><span>Terminal Cloud Active</span></div>' +
        '<div class="hero-main"><div><h1>Mis Finanzas</h1><p>Control y analítica en tiempo real</p></div><div class="hero-avatar">⚡</div></div>' +
        '</div></div>' +

        (
          UI.tab === 'dashboard'
            ? renderDashboard()

            : UI.tab === 'transactions'
              ? renderTransactions(
                  UI.search,
                  UI.txFilter
                )

              : UI.tab === 'invoices'
                ? renderInvoices(
                    UI.openInvoiceId
                  )

                : UI.tab === 'credits'
                  ? renderCredits(
                      UI.creditFilter,
                      UI.openCreditId
                    )

                  : UI.tab === 'categories'
                    ? renderCategories()

                    : (
                        renderSettings() +
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
        'Resumen'
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
        'categories',
        'tag',
        'Categorías'
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

    wallet:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 10v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V10"/><path d="M16 14h.01"/></svg>',

    list:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',

    credit:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5zm0 6h18"/></svg>',

    tag:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01"/></svg>'
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

            window.hasLoadedCloudData =
              false;

            Object.assign(
              DB,
              {
                transactions:[],
                categories:
                  DEFAULT_CATEGORIES.slice(),
                credits:[],
                invoices:[],
                settings:{
                  currency:'COP'
                }
              }
            );

            saveDB();

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
      'set-filter'
    ){

      UI.txFilter =
        t.dataset.filter;

      refreshTxList();

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
            'fab-invoices'
          ){

            closeFabMenu(
              () => {

                UI.tab =
                  'invoices';

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

    if (
      nm
    ){

      nm.addEventListener(
        'input',
        () => {

          sheet.name =
            nm.value;
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

function compressImage(
  file,
  maxWidth = 800,
  quality = 0.7
){

  return new Promise(
    (resolve, reject) => {

      const reader =
        new FileReader();

      reader.readAsDataURL(
        file
      );

      reader.onerror =
        () => {

          reject(
            new Error(
              'No se pudo leer la imagen.'
            )
          );
        };

      reader.onload =
        event => {

          const img =
            new Image();

          img.onerror =
            () => {

              reject(
                new Error(
                  'No se pudo procesar la imagen.'
                )
              );
            };

          img.src =
            event.target.result;

          img.onload =
            () => {

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
        };
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

      scanningOverlay = {
        message:
          'Optimizando y analizando factura con IA...'
      };

      renderOverlays();

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

          try {

            const result =
              API.scanInvoiceViaProxy
                ? await API.scanInvoiceViaProxy(
                    base64,
                    mimeType
                  )
                : {};

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

/* ==========================================================
   INICIO
   ========================================================== */

render();
