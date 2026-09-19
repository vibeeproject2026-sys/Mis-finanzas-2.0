import {
  DB,
  CURRENCIES,
  SWATCHES,
  ICON_KEYS,
  todayStr
} from './state.js';

import {
  catById,
  computeTotals,
  computeMonthStats,
  computeMonthOverMonthMetrics,
  computeCategoryTotals,
  computeBurnMetrics,
  computeBudgetRows,
  computeCreditsPaidThisMonth,
  computeCreditsSummary,
  computeCreditPlan,
  computeCreditPaymentBreakdown,
  parseInterestRate,
  computeInvoiceMathCheck,
  computeDeterministicInvoiceTotal
} from './domain.js';

/* ==========================================================
   SOPORTE DE ICONOS SVG
   ========================================================== */

export function icon(name){

  const svgs = {

    wallet:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 10v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V10"/><path d="M16 14h.01"/></svg>',

    list:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',

    plus:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>',

    credit:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5zm0 6h18"/></svg>',

    tag:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01"/></svg>',

    search:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>',

    pencil:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>',

    check:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>',

    close:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>',

    trash:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>',

    alert:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M12 9v2M12 15h.01M22.61 16.53L13.73 3.15a2 2 0 0 0-3.46 0L1.39 16.53a2 2 0 0 0 1.73 3h17.76a2 2 0 0 0 1.73-3z"/></svg>',

    gear:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0-.33-1.82V9a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1 z"/></svg>',

    camera:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',

    receipt:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 14h-4M16 10H8M8 14h2"/></svg>',

    eye:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>',

    'eye-off':
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 4.22-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a20.3 20.3 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>',

    // ---- Iconografía de categorías (Sección 10/12, FASE 1B.5) ----
    // Mismas claves que ICON_KEYS/ICON_EMOJI (state.js): no se toca el
    // modelo de datos, solo se traduce cada clave a un trazo vectorial.
    food:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M3 2v7c0 1.1.9 2 2 2h1a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>',

    transport:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>',

    home:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',

    zap:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/></svg>',

    heart:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',

    fun:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.2"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>',

    shopping:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',

    briefcase:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',

    dollarSign:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',

    more:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>',

    chart:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>',

    clock:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',

    cloud:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.3-2A5 5 0 0 0 6.5 19h11Z"/></svg>',

    // ---- Iconos de títulos de sección (Sección 3, FASE 1B.7) ----
    pie:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>',

    target:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',

    // ---- Iconos del formulario de registro ----
    user:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',

    'at-sign':
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-5.5 8.28"/></svg>',

    mail:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',

    phone:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',

    lock:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
  };

  return `<span class="icon" style="stroke-linecap:round;stroke-linejoin:round">${svgs[name] || ''}</span>`;
}

// Traduce una clave de icono de categoría (ICON_KEYS/state.js, sin tocar
// el modelo de datos) a su icono vectorial. Fallback seguro a 'more' si la
// categoría no tiene un icono reconocido (nunca queda sin icono visible).
export function categoryIcon(key){
  return icon(ICON_KEYS.includes(key) ? key : 'more');
}

// Título de sección unificado (Sección 2/3, FASE 1B.7): un único punto que
// arma icono + texto para que TODOS los títulos de sección compartan
// exactamente el mismo tamaño/peso/tracking/alineación (regla en CSS,
// .section-title) y el mismo tratamiento de icono, en vez de repetir
// markup ligeramente distinto en cada pantalla.
function sectionTitle(iconKey, text, extraStyle){
  return (
    '<div class="section-title"' +
    (extraStyle ? ' style="' + extraStyle + '"' : '') +
    '>' + icon(iconKey) + '<span>' + esc(text) + '</span></div>'
  );
}

export const esc =
  s =>
    String(s).replace(
      /[&<>"']/g,
      c =>
        ({
          '&':'&amp;',
          '<':'&lt;',
          '>':'&gt;',
          '"':'&quot;',
          "'":'&#39;'
        }[c])
    );

export function formatThousandInput(val){

  const digits =
    String(val)
      .replace(
        /\D/g,
        ''
      );

  if (!digits) return '';

  return new Intl.NumberFormat(
    'es-CO'
  ).format(
    digits
  );
}

export function parseFormattedNumber(val){

  if (!val) return '';

  return String(val)
    .replace(
      /\D/g,
      ''
    );
}

export function fmtMoney(amount){

  const cur =
    DB.settings.currency ||
    'COP';

  const cfg =
    CURRENCIES[cur] ||
    CURRENCIES.COP;

  const n =
    Number(amount) || 0;

  try {

    return new Intl.NumberFormat(
      cfg.locale,
      {
        style:'currency',
        currency:cur,
        maximumFractionDigits:0
      }
    ).format(n);

  } catch(e) {

    return n.toFixed(0) +
      ' ' +
      cur;
  }
}

export function monthLabelStr(date){

  return new Intl.DateTimeFormat(
    'es-CO',
    {
      month:'long',
      year:'numeric'
    }
  ).format(date);
}

/* ==========================================================
   HEADER DINÁMICO DEL DASHBOARD (saludo/frase/fecha según la hora)
   ========================================================== */

const DASH_HERO_BY_BUCKET = {
  morning: {
    scene:'morning',
    greeting:'Buenos días',
    quote:'Cada decisión de hoy construye la tranquilidad de mañana.'
  },
  afternoon: {
    scene:'afternoon',
    greeting:'Buenas tardes',
    quote:'Vas avanzando. Mantén el control de lo que construyes.'
  },
  night: {
    scene:'night',
    greeting:'Buenas noches',
    quote:'Lo que cuidas hoy se convierte en libertad mañana.'
  }
};

function dashHeroBucket(hour){

  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'night';
}

// Ilustraciones SVG trasladadas de figma_mis_finanzas/src/screens/Dashboard.tsx
// (SceneIllustration). Puramente decorativas, sin datos reales.
function dashHeroSceneSVG(scene){

  if (scene === 'morning') {
    return (
      '<svg class="hero-scene-svg" viewBox="0 0 430 180" preserveAspectRatio="xMidYMax slice">' +
      '<defs><radialGradient id="sun-dawn" cx="50%" cy="85%" r="40%">' +
      '<stop offset="0%" stop-color="#ffd166" stop-opacity="0.9"/>' +
      '<stop offset="40%" stop-color="#ff8c42" stop-opacity="0.5"/>' +
      '<stop offset="100%" stop-color="transparent"/>' +
      '</radialGradient></defs>' +
      '<ellipse cx="215" cy="155" rx="80" ry="80" fill="url(#sun-dawn)"/>' +
      '<path d="M0 180 L60 80 L120 140 L180 60 L240 120 L300 40 L370 100 L430 70 L430 180 Z" fill="rgba(20,10,45,0.85)"/>' +
      '<path d="M0 180 L80 110 L150 155 L220 90 L290 140 L360 100 L430 120 L430 180 Z" fill="rgba(13,8,30,0.9)"/>' +
      '<line x1="0" y1="152" x2="430" y2="152" stroke="rgba(255,170,64,0.15)" stroke-width="1"/>' +
      '<line x1="0" y1="156" x2="430" y2="156" stroke="rgba(255,140,66,0.1)" stroke-width="2"/>' +
      '</svg>'
    );
  }

  if (scene === 'afternoon') {
    const windowLights = [30, 50, 115, 135, 175, 220, 275, 295, 345, 395]
      .map((x, i) => '<rect x="' + (x + 4) + '" y="' + (60 + (i % 3) * 14) + '" width="5" height="4" fill="rgba(0,209,255,0.5)" rx="1"/>')
      .join('');

    return (
      '<svg class="hero-scene-svg" viewBox="0 0 430 200" preserveAspectRatio="xMidYMax slice">' +
      '<g fill="rgba(10,18,40,0.9)">' +
      '<rect x="20" y="80" width="40" height="120"/><rect x="25" y="60" width="12" height="20"/>' +
      '<rect x="70" y="100" width="30" height="100"/>' +
      '<rect x="110" y="50" width="50" height="150"/><rect x="125" y="30" width="8" height="20"/>' +
      '<rect x="170" y="70" width="35" height="130"/>' +
      '<rect x="215" y="90" width="45" height="110"/>' +
      '<rect x="270" y="40" width="60" height="160"/><rect x="290" y="20" width="10" height="22"/>' +
      '<rect x="340" y="75" width="40" height="125"/>' +
      '<rect x="390" y="60" width="50" height="140"/>' +
      '</g>' +
      windowLights +
      '<rect x="0" y="175" width="430" height="25" fill="rgba(20,50,100,0.3)"/>' +
      '</svg>'
    );
  }

  const stars = [
    [30, 20], [80, 35], [140, 15], [200, 25], [260, 10], [320, 30], [380, 18],
    [50, 55], [160, 40], [310, 50], [400, 45], [100, 70], [250, 65]
  ]
    .map(([x, y], i) => '<circle cx="' + x + '" cy="' + y + '" r="' + (i % 3 === 0 ? 1.8 : 1.2) + '" fill="rgba(255,255,255,0.9)"/>')
    .join('');

  const neonWindows = [[100, 75, '#00d1ff'], [165, 95, '#8b5cf6'], [270, 65, '#00d1ff'], [340, 90, '#8b5cf6']]
    .map(([x, y, c]) => '<rect x="' + x + '" y="' + y + '" width="6" height="4" fill="' + c + '" opacity="0.9" rx="1"/>')
    .join('');

  // Luna más protagonista (Sección 1/2, FASE 1B.5): halo suave + disco claro
  // + un círculo oscuro superpuesto para dar el recorte de media luna, en
  // vez del disco casi negro que apenas se distinguía del cielo.
  const moon =
    '<circle cx="322" cy="44" r="30" fill="rgba(190,215,255,0.14)"/>' +
    '<circle cx="322" cy="44" r="19" fill="rgba(215,228,255,0.3)"/>' +
    '<circle cx="321" cy="43" r="15" fill="#EEF1FA"/>' +
    '<circle cx="327" cy="39" r="13" fill="#0a0f1e"/>';

  return (
    '<svg class="hero-scene-svg" viewBox="0 0 430 200" preserveAspectRatio="xMidYMax slice">' +
    stars +
    moon +
    '<g fill="rgba(10,15,30,0.92)">' +
    '<rect x="0" y="100" width="45" height="100"/><rect x="5" y="80" width="14" height="22"/>' +
    '<rect x="55" y="110" width="30" height="90"/>' +
    '<rect x="95" y="60" width="55" height="140"/><rect x="112" y="40" width="9" height="22"/>' +
    '<rect x="160" y="85" width="38" height="115"/>' +
    '<rect x="208" y="100" width="42" height="100"/>' +
    '<rect x="260" y="50" width="65" height="150"/><rect x="278" y="30" width="12" height="22"/>' +
    '<rect x="335" y="80" width="44" height="120"/>' +
    '<rect x="388" y="70" width="50" height="130"/>' +
    '</g>' +
    neonWindows +
    '<rect x="0" y="180" width="430" height="20" fill="rgba(10,15,30,0.4)"/>' +
    '</svg>'
  );
}

// Línea de fluctuación financiera ascendente — NIVEL 3 (neon protagonista),
// Sección 5/6/7, FASE 1B.7. Compartida por TODO el hero (Dashboard y el
// resto de pantallas la llaman desde la misma función, sin duplicar SVG).
//
// La "estela" reportada venía de combinar preserveAspectRatio="none" (que
// ESTIRA el viewBox de forma no uniforme para llenar un contenedor con
// Energy mark de Mis Finanzas (Sección 7, FASE actual): reemplaza la línea
// ascendente oscilante por una marca propia — un rayo geométrico (misma
// silueta que icon('zap'), a mayor escala) relleno con degradado
// cyan→blue→violet, con un pequeño nodo verde en la punta (continuidad
// con la identidad anterior) y un glow CEÑIDO (blur pequeño, sin halo
// grande). preserveAspectRatio="xMaxYMid meet" evita cualquier
// distorsión del glow (mismo fix aplicado antes al elemento anterior).
// La respiración de luz es CSS (.energy-mark-pulse, ver main.css),
// respeta prefers-reduced-motion.
function dashHeroEnergyMarkSVG(){

  const bolt =
    '76.6,21.4 44.6,59.8 73.4,59.8 70.2,85.4 102.2,47 73.4,47';

  return (
    '<svg class="hero-energy-mark" viewBox="0 0 120 170" preserveAspectRatio="xMaxYMid meet" aria-hidden="true">' +
    '<defs>' +
    '<linearGradient id="energyMarkGrad" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="#00D1FF"/>' +
    '<stop offset="55%" stop-color="#2060FF"/>' +
    '<stop offset="100%" stop-color="#8B5CF6"/>' +
    '</linearGradient>' +
    '<filter id="energyMarkGlow" x="-40%" y="-40%" width="180%" height="180%">' +
    '<feGaussianBlur stdDeviation="2" result="blur"/>' +
    '<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>' +
    '</filter>' +
    '</defs>' +
    '<g class="energy-mark-pulse">' +
    '<polygon points="' + bolt + '" fill="url(#energyMarkGrad)" filter="url(#energyMarkGlow)" opacity="0.92"/>' +
    '<circle cx="70.2" cy="88.5" r="3.6" fill="#10F5A0"/>' +
    '</g>' +
    '</svg>'
  );
}

const DASH_HERO_SCENE_BG = {
  morning: 'linear-gradient(to bottom, #1a0a2e 0%, #3d1a6e 25%, #ff6b35 55%, #ffaa40 75%, #ffd166 100%)',
  afternoon: 'linear-gradient(to bottom, #0a1628 0%, #1a3a6e 30%, #2060b0 60%, #1a2a50 100%)',
  night: 'linear-gradient(to bottom, #020408 0%, #0d0820 30%, #130a30 60%, #06090f 100%)'
};

export function renderDashboardHero(userName, cloudStatus){

  const now = new Date();

  const bucket =
    DASH_HERO_BY_BUCKET[
      dashHeroBucket(now.getHours())
    ];

  // Sección 10, FASE 1B.6: el nombre lleva un pequeño acento neon propio,
  // integrado en la misma jerarquía del saludo (no un texto aparte).
  const greeting =
    bucket.greeting +
    (
      userName
        ? ', <span class="hero-name-accent">' + esc(userName) + '</span>'
        : ''
    );

  const dateLabel =
    new Intl.DateTimeFormat(
      'es-CO',
      { weekday:'long', day:'numeric', month:'long' }
    ).format(now);

  const dateCapitalized =
    dateLabel.charAt(0).toUpperCase() +
    dateLabel.slice(1);

  return (
    '<div class="hero hero-dynamic hero-scene--' + bucket.scene + '">' +
    dashHeroSceneSVG(bucket.scene) +
    dashHeroEnergyMarkSVG() +
    '<div class="hero-scene-overlay"></div>' +
    '<div class="hero-content">' +

    '<div class="hero-top-row" style="justify-content:flex-start;">' +
    '<div class="cloud-status-badge" aria-label="Estado de sincronización">' +
    '<span class="cloud-status-dot cloud-status-dot--' + (cloudStatus || 'unknown') + '" id="cloud-status-dot"></span>' +
    '<span class="cloud-status-icon">☁</span>' +
    '</div>' +
    '</div>' +

    '<h1 class="hero-greeting">' + greeting + '</h1>' +
    '<p class="hero-quote"><span class="hero-quote-accent"></span>' + esc(bucket.quote) + '</p>' +
    '<div class="hero-date">' + esc(dateCapitalized) + '</div>' +

    '</div></div>'
  );
}

// Título/subtítulo por pestaña para el header-escena de las pantallas que
// no son Dashboard (Sección 8/9, FASE 1B.4): mismo lenguaje visual (luna,
// estrellas, skyline, gradiente por momento del día) que el Dashboard, sin
// inventar datos — solo texto de encabezado ya existente por pantalla.
const TAB_HERO_META = {
  transactions: { title: 'Movimientos', subtitle: 'Tu historia financiera, en un solo lugar.' },
  categories: { title: 'Categorías', subtitle: 'Organiza cada gasto a tu manera.' },
  credits: { title: 'Créditos', subtitle: 'Deudas y cobros bajo control.' },
  invoices: { title: 'Facturas', subtitle: 'Registra y controla tus comprobantes.' },
  settings: { title: 'Ajustes', subtitle: 'Personaliza tu experiencia.' }
};

export function renderGenericHero(tab, cloudStatus){

  const now = new Date();

  const bucket =
    DASH_HERO_BY_BUCKET[
      dashHeroBucket(now.getHours())
    ];

  const meta =
    TAB_HERO_META[tab] ||
    { title: 'Mis Finanzas', subtitle: 'Control y analítica en tiempo real' };

  return (
    '<div class="hero hero-dynamic hero-scene--' + bucket.scene + '">' +
    dashHeroSceneSVG(bucket.scene) +
    dashHeroEnergyMarkSVG() +
    '<div class="hero-scene-overlay"></div>' +
    '<div class="hero-content">' +

    '<div class="hero-top-row" style="justify-content:flex-start;">' +
    '<div class="cloud-status-badge" aria-label="Estado de sincronización">' +
    '<span class="cloud-status-dot cloud-status-dot--' + (cloudStatus || 'unknown') + '" id="cloud-status-dot"></span>' +
    '<span class="cloud-status-icon">☁</span>' +
    '</div>' +
    '</div>' +

    '<h1 class="hero-greeting">' + esc(meta.title) + '</h1>' +
    '<p class="hero-quote"><span class="hero-quote-accent"></span>' + esc(meta.subtitle) + '</p>' +

    '</div></div>'
  );
}

/* ==========================================================
   DASHBOARD
   ========================================================== */

export function renderDashboard(balanceHidden){

  const totals =
    computeTotals();

  const month =
    computeMonthStats();

  const catTotals =
    computeCategoryTotals();

  const burn =
    computeBurnMetrics();

  const budgets =
    computeBudgetRows();

  const mom =
    computeMonthOverMonthMetrics();

  let html = '';

  const balColor =
    totals.balance >= 0
      ? 'var(--income)'
      : 'var(--expense)';

  html +=
    '<div class="balance-card">';

  html +=
    '<div class="balance-top-row">' +
    '<div class="balance-label">Balance disponible</div>' +
    '<button class="balance-eye-btn" data-action="toggle-balance-visibility" aria-label="' +
    (
      balanceHidden
        ? 'Mostrar saldo'
        : 'Ocultar saldo'
    ) +
    '">' +
    icon(
      balanceHidden
        ? 'eye-off'
        : 'eye'
    ) +
    '</button>' +
    '</div>';

  html +=
    '<div class="balance-amount" style="color:' +
    balColor +
    '">' +
    (
      balanceHidden
        ? '••••••••'
        : fmtMoney(
            totals.balance
          )
    ) +
    '</div>';

  html +=
    '<div class="balance-month">' +
    monthLabelStr(
      new Date()
    ) +
    '</div>';

  html +=
    '<div class="balance-metrics">';

  html +=
    '<div class="b-metric"><span class="lbl">Ingresos del mes</span><span class="val inc">+' +
    fmtMoney(
      month.income
    ) +
    '</span></div>';

  html +=
    '<div class="b-metric"><span class="lbl">Gastos del mes</span><span class="val exp">−' +
    fmtMoney(
      month.expense
    ) +
    '</span></div>';

  html +=
    '<div class="b-metric"><span class="lbl">Ahorro neto este mes</span><span class="val ' +
    (
      month.netSavings >= 0
        ? 'inc'
        : 'exp'
    ) +
    '">' +
    (
      month.netSavings >= 0
        ? '+'
        : ''
    ) +
    fmtMoney(
      month.netSavings
    ) +
    '</span></div>';

  html +=
    '<div class="b-metric"><span class="lbl">Tasa de ahorro</span><span class="val sav">' +
    month.savingsRate +
    '%</span></div>';

  html +=
    '</div></div>';

  /* ========================================================
     RITMO DE GASTO
     ======================================================== */

  html +=
    '<div class="card">';

  html +=
    sectionTitle('clock', 'Ritmo de Gasto Diario');

  html +=
    '<div class="burn-card">';

  html +=
    '<div class="burn-info"><span class="burn-lbl">Disponible sugerido por día</span><span class="burn-val" style="color:var(--pink)">' +
    fmtMoney(
      burn.dailyAvailable
    ) +
    ' / día</span></div>';

  const statusClass =
    burn.dailyAvailable >
    burn.avgDailyBurn
      ? 'ok'
      : (
          burn.dailyAvailable > 0
            ? 'warn'
            : 'alert'
        );

  const statusText =
    burn.dailyAvailable >
    burn.avgDailyBurn
      ? 'En ritmo'
      : (
          burn.dailyAvailable > 0
            ? 'Ajustar'
            : 'Sin saldo'
        );

  html +=
    '<span class="burn-status ' +
    statusClass +
    '">' +
    statusText +
    '</span>';

  html +=
    '</div>';

  html +=
    '<div class="runway-card"><div class="runway-icon">' + icon('clock') + '</div><div class="runway-main">';

  html +=
    '<div class="runway-lbl">Ritmo de gasto · período ' +
    burn.periodStartDay +
    '–' +
    burn.periodEndDay +
    '</div>';

  if (
    burn.currentPeriodDays <
    10
  ){

    html +=
      '<div class="runway-val">Ritmo actual <span>' +
      fmtMoney(
        burn.avgDailyBurn
      ) +
      ' / día</span></div>';

    html +=
      '<div style="font-size:11px;opacity:.82;margin-top:4px">Acumulado ' +
      fmtMoney(
        burn.currentPeriodExpense
      ) +
      ' en ' +
      burn.currentPeriodDays +
      ' días</div>';

  } else {

    html +=
      '<div class="runway-val">Promedio <span>' +
      fmtMoney(
        burn.currentPeriodExpense
      ) +
      ' / 10 días</span></div>';
  }

  html +=
    '<div style="margin-top:9px;padding-top:8px;border-top:1px solid rgba(56,189,248,.15)">';

  html +=
    '<div style="font-size:10px;opacity:.72;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Evolución del mes</div>';

  html +=
    '<div style="display:flex;justify-content:space-between;font-size:10.5px;margin-top:3px"><span>1–10</span><b>' +
    fmtMoney(
      burn.periodExpenses[0]
    ) +
    '</b></div>';

  html +=
    '<div style="display:flex;justify-content:space-between;font-size:10.5px;margin-top:3px;opacity:.82"><span>11–20</span><b>' +
    fmtMoney(
      burn.periodExpenses[1]
    ) +
    '</b></div>';

  html +=
    '<div style="display:flex;justify-content:space-between;font-size:10.5px;margin-top:3px;opacity:.68"><span>21–' +
    burn.daysInMonth +
    '</span><b>' +
    fmtMoney(
      burn.periodExpenses[2]
    ) +
    '</b></div>';

  html +=
    '</div>';

  if (
    burn.runwayDays > 0
  ){

    html +=
      '<div style="font-size:10.5px;color:var(--ink-muted);margin-top:7px">Con tu saldo actual cubres aprox. <b>' +
      burn.runwayDays +
      ' días</b> a este ritmo.</div>';
  }

  html +=
    '</div></div></div>';

  /* ========================================================
     GASTO RÁPIDO
     ======================================================== */

  const expenseCats =
    DB.categories.filter(
      c =>
        c.type ===
        'expense'
    );

  if (
    expenseCats.length
  ){

    html +=
      sectionTitle('plus', 'Registrar gasto rápido', 'margin-top:20px');

    html +=
      '<div class="quick-grid">' +
      expenseCats
        .map(
          c =>
            '<button class="quick-btn" data-action="quick-cat" data-id="' +
            c.id +
            '"><span class="em" style="background:' +
            c.color +
            '22;color:' +
            c.color +
            '">' +
            categoryIcon(
              c.icon
            ) +
            '</span><span class="nm">' +
            esc(
              c.name
            ) +
            '</span></button>'
        )
        .join('') +
      '</div>';
  }

  /* ========================================================
     GRÁFICA DE GASTOS
     ======================================================== */

  const creditsPaid =
    computeCreditsPaidThisMonth();

  html +=
    '<div class="card">' + sectionTitle('pie', 'Gastos por categoría (este mes)');

  const totalOutflow =
    Math.max(
      0,
      (
        Number(
          month.expense
        ) || 0
      )
    );

  if (
    totalOutflow > 0 || creditsPaid > 0
  ){

    const categorizedExpense =
      catTotals.reduce(
        (
          sum,
          r
        ) =>
          sum +
          (
            Number(
              r.total
            ) || 0
          ),
        0
      );

    const outflowIncludingCredits =
      categorizedExpense +
      creditsPaid;

    const spentPct =
      month.income > 0
        ? Math.round(
            (
              outflowIncludingCredits /
              month.income
            ) * 100
          )
        : 0;

    const remainingPct =
      month.income > 0
        ? Math.max(
            0,
            Math.round(
              (
                Math.max(
                  0,
                  month.income -
                  outflowIncludingCredits
                ) /
                month.income
              ) * 100
            )
          )
        : 0;

    // Paleta neon (Sección 3/8, FASE 1B.6): usada tanto para el anillo del
    // donut como para los puntos de la leyenda (mismo colorMap), colores
    // vivos/eléctricos en vez de tonos pastel. Se agregan 3 tonos extra al
    // final para categorías adicionales sin repetir antes de agotar todo.
    const palette = [
      '#00D1FF',
      '#8B5CF6',
      '#FF7A00',
      '#10F5A0',
      '#FF2D8D',
      '#2060FF',
      '#B6FF00',
      '#FF1744',
      '#22D3EE',
      '#C084FC',
      '#FACC15'
    ];

    const reserved =
      new Set([
        '#EF4444',
        '#8B85A3',
        '#334155',
        '#9B1239'
      ]);

    const colorMap =
      new Map();

    let colorIndex =
      0;

    catTotals.forEach(
      r => {

        const original =
          String(
            r.cat?.color ||
            ''
          ).trim();

        const normalized =
          original.toUpperCase();

        if (
          original &&
          !reserved.has(
            normalized
          )
        ){

          colorMap.set(
            r.id,
            original
          );

          reserved.add(
            normalized
          );

          return;
        }

        let selected =
          null;

        for (
          let i = 0;
          i < palette.length;
          i++
        ){

          const candidate =
            palette[
              colorIndex++ %
              palette.length
            ];

          if (
            !reserved.has(
              candidate.toUpperCase()
            )
          ){

            selected =
              candidate;

            break;
          }
        }

        selected =
          selected ||
          palette[
            colorIndex++ %
            palette.length
          ];

        colorMap.set(
          r.id,
          selected
        );

        reserved.add(
          selected.toUpperCase()
        );
      }
    );

    const chartCats =
      catTotals.map(
        r => ({
          ...r,
          cat:{
            ...r.cat,
            color:
              colorMap.get(
                r.id
              ) ||
              r.cat.color
          }
        })
      );

    html +=
      '<div class="pie-layout">';

    html +=
      '<div class="pie-chart">' +
      expensePieSVG(
        chartCats,
        month.expense,
        month.income,
        creditsPaid
      ) +
      '<div class="pie-center"><strong>' +
      (
        month.income > 0
          ? spentPct + '%'
          : '—'
      ) +
      '</strong><span>' +
      (
        month.income > 0
          ? (
              spentPct > 100
                ? 'del ingreso · excedido'
                : 'del ingreso'
            )
          : 'sin ingreso'
      ) +
      '</span></div></div>';

    html +=
      '<div class="pie-legend">';

    catTotals.forEach(
      r => {

        const pct =
          (month.income > 0 ? month.income : totalOutflow) > 0
            ? (
                r.total /
                (month.income > 0 ? month.income : totalOutflow)
              ) * 100
            : 0;

        html +=
          '<div class="pie-legend-row">' +
          '<span class="pie-dot" style="background:' +
          colorMap.get(r.id) +
          '"></span>' +
          '<span class="pie-name">' +
          esc(
            r.cat.name
          ) +
          '</span>' +
          '<span class="pie-pct">' +
          (
            pct < 0.1
              ? '<0.1'
              : pct.toFixed(1)
          ) +
          '%</span></div>';
      }
    );

    if (
      creditsPaid > 0
    ){

      const pct =
        (
          creditsPaid /
          (month.income > 0 ? month.income : totalOutflow)
        ) * 100;

      html +=
        '<div class="pie-legend-row">' +
        '<span class="pie-dot" style="background:#9B1239"></span>' +
        '<span class="pie-name">Pago a créditos</span>' +
        '<span class="pie-pct">' +
        (
          pct < 0.1
            ? '<0.1'
            : pct.toFixed(1)
        ) +
        '%</span></div>';
    }

    if (
      month.income > 0
    ){

      html +=
        '<div class="pie-legend-row">' +
        '<span class="pie-dot" style="background:#94A3B8"></span>' +
        '<span class="pie-name">Disponible</span>' +
        '<span class="pie-pct">' +
        remainingPct +
        '%</span></div>';
    }

    if (
      month.income > 0 &&
      spentPct > 100
    ){

      html +=
        '<div class="pie-legend-row">' +
        '<span class="pie-dot" style="background:#EF4444"></span>' +
        '<span class="pie-name">Exceso sobre ingreso</span>' +
        '<span class="pie-pct">+' +
        (
          spentPct -
          100
        ) +
        '%</span></div>';
    }

    html +=
      '</div></div>';

  } else {

    html +=
      '<div class="empty-hint">Aún no hay gastos registrados este mes.</div>';
  }

  html +=
    '</div>';

  /* ========================================================
     COMPARATIVA MES A MES
     ======================================================== */

  html +=
    '<div class="mom-card"><div class="mom-header"><span class="mom-title">' + icon('chart') + '<span>Comparativa Mes a Mes</span></span><div class="mom-dots">';

  for (
    let i = 0;
    i < 5;
    i++
  ){

    html +=
      '<span class="mom-dot' +
      (
        i === 0
          ? ' active'
          : ''
      ) +
      '"></span>';
  }

  html +=
    '</div></div>';

  html +=
    '<div class="mom-carousel"><div class="mom-track" id="mom-track">';

  const expUp =
    mom.expChangePct >
    0;

  html +=
    '<div class="mom-slide"><div class="mom-slide-grid"><div class="mom-box"><div class="lbl">Gastos este mes</div><div class="val" style="color:var(--expense)">' +
    fmtMoney(
      mom.currentExpense
    ) +
    '</div></div><div class="mom-box"><div class="lbl">Gastos mes pasado</div><div class="val">' +
    fmtMoney(
      mom.prevExpense
    ) +
    '</div><div class="delta ' +
    (
      expUp
        ? 'up'
        : (
            mom.expChangePct < 0
              ? 'down'
              : 'neutral'
          )
    ) +
    '">' +
    (
      expUp
        ? '▲ +'
        : '▼ '
    ) +
    Math.abs(
      mom.expChangePct
    ) +
    '%</div></div></div></div>';

  const incUp =
    mom.incChangePct >
    0;

  html +=
    '<div class="mom-slide"><div class="mom-slide-grid"><div class="mom-box"><div class="lbl">Ingresos este mes</div><div class="val" style="color:var(--income)">' +
    fmtMoney(
      mom.currentIncome
    ) +
    '</div></div><div class="mom-box"><div class="lbl">Ingresos mes pasado</div><div class="val">' +
    fmtMoney(
      mom.prevIncome
    ) +
    '</div><div class="delta ' +
    (
      incUp
        ? 'down'
        : (
            mom.incChangePct < 0
              ? 'up'
              : 'neutral'
          )
    ) +
    '">' +
    (
      incUp
        ? '▲ +'
        : '▼ '
    ) +
    Math.abs(
      mom.incChangePct
    ) +
    '%</div></div></div></div>';

  html +=
    '<div class="mom-slide"><div class="mom-slide-grid"><div class="mom-box"><div class="lbl">Ahorro este mes</div><div class="val" style="color:' +
    (
      mom.currentSavings >= 0
        ? 'var(--income)'
        : 'var(--expense)'
    ) +
    '">' +
    (
      mom.currentSavings >= 0
        ? '+'
        : ''
    ) +
    fmtMoney(
      mom.currentSavings
    ) +
    '</div></div><div class="mom-box"><div class="lbl">Ahorro mes pasado</div><div class="val" style="color:' +
    (
      mom.prevSavings >= 0
        ? 'var(--income)'
        : 'var(--expense)'
    ) +
    '">' +
    (
      mom.prevSavings >= 0
        ? '+'
        : ''
    ) +
    fmtMoney(
      mom.prevSavings
    ) +
    '</div></div></div></div>';

  html +=
    '<div class="mom-slide"><div class="mom-single"><div class="lbl">Tasa de ahorro actual</div><div class="val" style="color:var(--pink)">' +
    mom.savingsRate +
    '%</div><div class="sub">Porcentaje guardado este mes</div></div></div>';

  if (
    mom.highestGrowthCat
  ){

    html +=
      '<div class="mom-slide"><div class="mom-single"><div class="lbl">Mayor aumento de gasto</div><div class="val" style="color:var(--expense)">' +
      esc(
        mom.highestGrowthCat.name
      ) +
      '</div><div class="sub">Subió ' +
      fmtMoney(
        mom.maxDiff
      ) +
      ' vs mes anterior</div></div></div>';

  } else {

    html +=
      '<div class="mom-slide"><div class="mom-single"><div class="lbl">Categorías</div><div class="val" style="color:var(--income)">Estables</div><div class="sub">Sin aumentos significativos</div></div></div>';
  }

  html +=
    '</div></div>';

  if (
    mom.highestGrowthCat
  ){

    html +=
      '<div class="mom-insight">' + icon('alert') + '<div><b>Atención en ' +
      esc(
        mom.highestGrowthCat.name
      ) +
      ':</b> Tu gasto subió ' +
      fmtMoney(
        mom.maxDiff
      ) +
      ' respecto al mes anterior.</div></div>';

  } else {

    html +=
      '<div class="mom-insight"><span style="color:var(--income)">' + icon('check') + '</span><div><b>¡Buen control!</b> Patrones de consumo estables.</div></div>';
  }

  html +=
    '</div>';

  if (
    budgets.length
  ){

    html +=
      '<div class="card" style="margin-top:16px">' + sectionTitle('target', 'Presupuestos');

    budgets.forEach(
      b => {

        let barColor =
          b.cat.color;

        if (
          b.over
        ){

          barColor =
            'var(--expense)';

        } else if (
          b.isPacingFast
        ){

          barColor =
            'var(--amber)';
        }

        html +=
          '<div class="cat-row"><div class="top"><span>' +
          (
            b.over
              ? icon('alert') +
                ' '
              : ''
          ) +
          esc(
            b.cat.name
          ) +
          '</span><span style="color:' +
          (
            b.over
              ? 'var(--expense)'
              : 'var(--ink-muted)'
          ) +
          '">' +
          fmtMoney(
            b.spent
          ) +
          ' / ' +
          fmtMoney(
            b.cat.budget
          ) +
          '</span></div><div class="bar-track"><div class="bar-fill" style="width:' +
          b.pct +
          '%;background:' +
          barColor +
          '"></div></div></div>';
      }
    );

    html +=
      '</div>';
  }

  /* ========================================================
     MOVIMIENTOS RECIENTES
     ======================================================== */

  const recentTx =
    DB.transactions
      .slice()
      .sort(
        (a, b) =>
          (b.date + b.id).localeCompare(a.date + a.id)
      )
      .slice(0, 4);

  html +=
    '<div style="margin-top:16px;padding:0 24px 0 0;display:flex;align-items:center;justify-content:space-between;">' +
    sectionTitle('receipt', 'Movimientos recientes', 'margin-bottom:0;') +
    '<button data-action="set-tab" data-tab="transactions" style="color:var(--neon-cyan);font-size:12px;font-weight:600;">Ver todos →</button>' +
    '</div>';

  html +=
    '<div class="list-container" style="margin-top:12px;">' +
    (
      recentTx.length
        ? recentTx.map(renderTxRow).join('')
        : '<div class="empty-state">Aún no hay movimientos.</div>'
    ) +
    '</div>';

  return html;
}

/* ==========================================================
   GRÁFICA CIRCULAR
   ========================================================== */

// Sección 8, FASE 1B.6: SIN blend entre categorías. Cada segmento usa un
// único color sólido (el mismo que colorMap le asigna en renderDashboard,
// por lo tanto el mismo que ve la leyenda), con gap visible entre
// segmentos y un glow muy sutil y compartido (no un gradiente que mezcle
// un color con el del vecino — eso confundía la lectura, ver FASE 1B.5).

export function expensePieSVG(
  catTotals,
  monthExpense,
  monthIncome,
  creditsPaid = 0
){

  const expense =
    Math.max(
      0,
      Number(
        monthExpense
      ) || 0
    );

  const income =
    Math.max(
      0,
      Number(
        monthIncome
      ) || 0
    );

  const credits =
    Math.max(
      0,
      Number(
        creditsPaid
      ) || 0
    );

  const ringBase =
    income > 0 ? income : (expense + credits);

  if (
    ringBase <= 0
  ){
    return '';
  }

  const cx = 60;
  const cy = 60;
  const r = 44;
  const stroke = 16;

  const circumference =
    2 *
    Math.PI *
    r;

  const gap =
    2.8;

  const slices = [];

  let offset = 0;

  const addSlice =
    (
      value,
      label,
      color
    ) => {

      const numericValue =
        Math.max(
          0,
          Number(value) || 0
        );

      if (
        numericValue <= 0 ||
        ringBase <= 0
      ){
        return;
      }

      const ratio =
        numericValue /
        ringBase;

      const rawDash =
        ratio *
        (
          circumference -
          gap
        );

      const dash =
        Math.max(
          0,
          rawDash -
          (
            ratio > 0.02
              ? gap
              : gap * 0.25
          )
        );

      if (
        dash > 0.5
      ){

        slices.push({
          dash,
          offset,
          label,
          color: color || '#8899B4'
        });
      }

      offset +=
        rawDash;
    };

  catTotals.forEach(
    rw => {

      addSlice(
        rw.total,
        rw.cat?.name ||
        'Categoría',
        rw.cat?.color
      );
    }
  );

  if (
    credits > 0
  ){

    addSlice(
      credits,
      'Pago a créditos',
      '#9B1239'
    );
  }

  let svg =
    '<svg viewBox="0 0 120 120" aria-label="Gastos respecto al ingreso">';

  // Glow único y compartido (no por segmento): desenfoque pequeño del
  // propio trazo de cada círculo, así cada color se ve limpio y sólido,
  // con solo un resplandor muy sutil alrededor.
  svg +=
    '<defs><filter id="pieSegGlow" x="-30%" y="-30%" width="160%" height="160%">' +
    '<feGaussianBlur stdDeviation="1.1" result="blur"/>' +
    '<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>' +
    '</filter></defs>';

  svg +=
    '<circle cx="60" cy="60" r="44" fill="none" stroke="#0F172A" stroke-width="16"/>';

  slices.forEach(
    s => {

      svg +=
        '<circle cx="60" cy="60" r="44" fill="none" stroke="' + s.color + '" stroke-width="16" filter="url(#pieSegGlow)" stroke-dasharray="' +
        s.dash.toFixed(2) +
        ' ' +
        (
          circumference -
          s.dash
        ).toFixed(2) +
        '" stroke-dashoffset="' +
        (
          -s.offset
        ).toFixed(2) +
        '" transform="rotate(-90 60 60)" />';
    }
  );

  svg +=
    '</svg>';

  return svg;
}

/* ==========================================================
   MOVIMIENTOS
   ========================================================== */

export function renderTxRow(t){

  const isCreditPayment = t.source === 'credit-payment';
  const cat = isCreditPayment ? null : catById(t.categoryId);

  const iconColor = isCreditPayment ? '#9B1239' : (cat ? cat.color : '#8B85A3');
  const iconHtml = isCreditPayment ? icon('credit') : categoryIcon(cat ? cat.icon : null);
  const bg = isCreditPayment ? '#9B123922' : ((cat ? cat.color : '#8B85A3') + '22');
  const titleText = isCreditPayment ? 'Pago a créditos' : (cat ? cat.name : 'Sin categoría');

  return (
    '<button class="tx-item" data-action="edit-tx" data-id="' +
    t.id +
    '">' +

    '<div class="avatar" style="background:' +
    bg +
    ';color:' +
    iconColor +
    '">' +
    iconHtml +
    '</div>' +

    '<div class="tx-main"><div class="tx-title">' +
    esc(titleText) +
    '</div><div class="tx-sub">' +
    esc(
      t.date
    ) +
    (
      t.note
        ? ' · ' +
          esc(
            t.note
          )
        : ''
    ) +
    '</div></div>' +

    '<div class="tx-amount ' +
    t.type +
    '">' +
    (
      t.type === 'income'
        ? '+'
        : '−'
    ) +
    fmtMoney(
      t.amount
    ) +
    '</div></button>'
  );
}

export function filteredTx(
  search,
  txFilter
){

  return DB.transactions
    .filter(
      t =>
        txFilter === 'all'
          ? true
          : t.type === txFilter
    )
    .filter(
      t => {

        if (
          !search.trim()
        ){
          return true;
        }

        const s =
          search.toLowerCase();

        const cat =
          catById(
            t.categoryId
          );

        const isCreditPayment = t.source === 'credit-payment';
        const titleText = isCreditPayment ? 'pago a créditos' : (cat ? cat.name.toLowerCase() : 'sin categoría');

        return (
          (
            t.note ||
            ''
          )
            .toLowerCase()
            .includes(s)
        ) ||
        titleText.includes(s);
      }
    )
    .sort(
      (a,b) =>
        (
          b.date +
          b.id
        ).localeCompare(
          a.date +
          a.id
        )
    );
}

export function renderTransactions(
  search,
  txFilter
){

  const list =
    filteredTx(
      search,
      txFilter
    );

  const month =
    computeMonthStats();

  let html = '';

  html +=
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">' +
    '<div class="glass-stat" style="background:var(--income-bg);border-color:rgba(16,185,129,0.2);">' +
    '<div class="glass-stat-lbl" style="color:var(--income)">Ingresos</div>' +
    '<div class="glass-stat-val" style="color:var(--income)">' + fmtMoney(month.income) + '</div>' +
    '</div>' +
    '<div class="glass-stat" style="background:var(--expense-bg);border-color:rgba(225,29,72,0.2);">' +
    '<div class="glass-stat-lbl" style="color:var(--expense)">Gastos</div>' +
    '<div class="glass-stat-val" style="color:var(--expense)">' + fmtMoney(month.expense) + '</div>' +
    '</div>' +
    '</div>';

  html +=
    '<div class="search-box">' +
    icon('search') +
    '<input id="search-input" placeholder="Buscar por nota o categoría" value="' +
    esc(
      search
    ) +
    '">' +
    '</div>';

  html +=
    '<div class="filter-row">';

  [
    ['all','Todos'],
    ['income','Ingresos'],
    ['expense','Gastos']
  ].forEach(
    ([val,label]) => {

      html +=
        '<button class="chip ' +
        (
          txFilter === val
            ? 'selected'
            : ''
        ) +
        '" data-action="set-filter" data-filter="' +
        val +
        '">' +
        label +
        '</button>';
    }
  );

  html +=
    '</div>';

  html +=
    '<div id="tx-list" class="list-container">' +
    (
      list.length
        ? list
            .map(
              renderTxRow
            )
            .join('')
        : '<div class="empty-state">No hay movimientos registrados.</div>'
    ) +
    '</div>';

  return html;
}

/* ==========================================================
   FACTURAS
   ========================================================== */

export function renderInvoices(
  openInvoiceId,
  invoiceFilter = 'all'
){

  let html = '';

  html +=
    '<div class="section-title">Facturas Escaneadas</div>';

  const all =
    (
      DB.invoices || []
    )
      .slice()
      .sort(
        (a,b) =>
          (
            b.date +
            b.id
          ).localeCompare(
            a.date +
            a.id
          )
      );

  const pendingTotal =
    all
      .filter(inv => !inv.registered)
      .reduce((s, inv) => s + (Number(inv.total) || 0), 0);

  const registeredTotal =
    all
      .filter(inv => inv.registered)
      .reduce((s, inv) => s + (Number(inv.total) || 0), 0);

  if (
    all.length
  ){

    html +=
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">' +
      '<div class="glass-stat" style="background:var(--expense-bg);border-color:rgba(225,29,72,0.2);">' +
      '<div class="glass-stat-lbl" style="color:var(--expense)">Pendiente</div>' +
      '<div class="glass-stat-val" style="color:var(--expense)">' + fmtMoney(pendingTotal) + '</div>' +
      '</div>' +
      '<div class="glass-stat" style="background:var(--income-bg);border-color:rgba(16,185,129,0.2);">' +
      '<div class="glass-stat-lbl" style="color:var(--income)">Registrado</div>' +
      '<div class="glass-stat-val" style="color:var(--income)">' + fmtMoney(registeredTotal) + '</div>' +
      '</div>' +
      '</div>';

    html +=
      '<div class="filter-row" style="margin-bottom:14px;">' +
      [
        ['all', 'Todas'],
        ['pending', 'Pendientes'],
        ['registered', 'Registradas']
      ].map(
        ([val, label]) =>
          '<button class="chip ' +
          (invoiceFilter === val ? 'selected' : '') +
          '" data-action="set-invoice-filter" data-filter="' + val + '">' +
          label +
          '</button>'
      ).join('') +
      '</div>';
  }

  const list =
    all.filter(
      inv =>
        invoiceFilter === 'all' ||
        (invoiceFilter === 'pending' ? !inv.registered : !!inv.registered)
    );

  if (
    !all.length
  ){

    return (
      html +
      '<div class="empty-state">Aún no has escaneado ninguna factura.<br>Usa el botón central (+) para escanear una.</div>'
    );
  }

  if (
    !list.length
  ){

    return (
      html +
      '<div class="empty-state">No hay facturas en este filtro.</div>'
    );
  }

  list.forEach(
    inv => {

      const isOpen =
        openInvoiceId ===
        inv.id;

      html +=
        '<div class="credit-card"><div class="credit-head"><div><div class="credit-title">' +
        esc(
          inv.title
        ) +
        '</div><div class="credit-sub">' +
        esc(
          inv.date
        ) +
        ' · ' +
        inv.items.length +
        ' ítem(s)</div></div><button data-action="edit-invoice" data-id="' +
        inv.id +
        '">' +
        icon('pencil') +
        '</button></div>';

      html +=
        '<div class="credit-values"><span>Total:</span><span class="credit-pending against">' +
        fmtMoney(
          inv.total
        ) +
        '</span></div>';

      html +=
        '<button class="add-pay-btn" data-action="toggle-invoice" data-id="' +
        inv.id +
        '">' +
        (
          isOpen
            ? 'Ocultar ítems'
            : 'Ver ítems'
        ) +
        '</button>';

      if (
        isOpen
      ){

        html +=
          '<div style="margin-top:10px;">';

        inv.items.forEach(
          it => {

            html +=
              '<div class="invoice-item-row"><span class="iname">' +
              esc(
                it.name
              ) +
              '</span><span class="iprice">' +
              fmtMoney(
                it.price
              ) +
              '</span></div>';
          }
        );

        html +=
          renderInvoiceMetaSummaryHTML(
            inv
          );

        html +=
          '</div>';
      }

      html +=
        '<div style="margin-top:10px;">';

      if (
        inv.registered
      ){

        const cat =
          catById(
            inv.categoryId
          );

        html +=
          '<span class="registered-badge">' +
          icon('check') +
          ' Registrada' +
          (
            cat
              ? ' en ' +
                esc(
                  cat.name
                )
              : ''
          ) +
          '</span>';

      } else {

        html +=
          '<button class="add-pay-btn" data-action="register-invoice" data-id="' +
          inv.id +
          '">Elegir categoría y registrar</button>';
      }

      html +=
        '</div></div>';
    }
  );

  return html;
}

/* ==========================================================
   CRÉDITOS
   ========================================================== */

export function renderCredits(
  creditFilter,
  openCreditId = null
){

  let html = '';

  const summary =
    computeCreditsSummary();

  if (
    summary.againstCount > 0 ||
    summary.favorCount > 0
  ){

    html +=
      '<div class="balance-card">';

    if (
      summary.againstCount > 0
    ){

      html +=
        '<div class="balance-label">Total que debo</div>';

      html +=
        '<div class="balance-amount" style="color:var(--expense)">' +
        fmtMoney(
          summary.againstPending
        ) +
        '</div>';

      html +=
        '<div class="balance-month">de ' +
        fmtMoney(
          summary.againstTotal
        ) +
        ' en ' +
        summary.againstCount +
        ' crédito(s)</div>';

      html +=
        '<div class="bar-track" style="margin-top:10px;"><div class="bar-fill" style="width:' +
        summary.againstProgressPct +
        '%;background:var(--income)"></div></div>';
    }

    if (
      summary.favorCount > 0
    ){

      html +=
        '<div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(56,189,248,0.2)">';

      html +=
        '<div class="balance-label">Total que me deben</div>';

      html +=
        '<div class="balance-amount" style="font-size:26px;color:var(--income)">' +
        fmtMoney(
          summary.favorPending
        ) +
        '</div>';

      html +=
        '<div class="balance-month">de ' +
        fmtMoney(
          summary.favorTotal
        ) +
        ' en ' +
        summary.favorCount +
        ' cobro(s)</div></div>';
    }

    html +=
      '</div>';
  }

  html +=
    '<div class="filter-row" style="margin-bottom:14px;">';

  [
    [
      'against',
      'En contra (Deudas)'
    ],
    [
      'favor',
      'A favor (Cobros)'
    ]
  ].forEach(
    ([val,label]) => {

      html +=
        '<button class="chip ' +
        (
          creditFilter === val
            ? 'selected'
            : ''
        ) +
        '" data-action="set-credit-filter" data-filter="' +
        val +
        '">' +
        label +
        '</button>';
    }
  );

  html +=
    '</div>';

  const list =
    (
      DB.credits || []
    )
      .filter(
        c =>
          c.type ===
          creditFilter
      );

  if (
    !list.length
  ){

    return (
      html +
      '<div class="empty-state">No hay créditos registrados.</div>'
    );
  }

  list.forEach(
    raw => {

      const c = {
        ...raw,
        payments:
          Array.isArray(
            raw.payments
          )
            ? raw.payments
            : []
      };

      const plan =
        computeCreditPlan(
          c
        );

      const isAgainst =
        c.type ===
        'against';

      const isOpen =
        openCreditId ===
        c.id;

      const progressColor =
        isAgainst
          ? 'var(--expense)'
          : 'var(--income)';

      const rateText =
        plan.interestEnabled
          ? (
              plan.interestRate.toLocaleString(
                'es-CO',
                {
                  maximumFractionDigits:2
                }
              ) +
              '% ' +
              (
                plan.interestPeriod === 'annual'
                  ? 'anual'
                  : 'mensual'
              )
            )
          : 'Sin intereses';

      html +=
        '<div class="credit-card" style="overflow:hidden;">';

      html +=
        '<div class="credit-head">' +

        '<div style="display:flex;align-items:center;gap:10px;min-width:0;">' +
        '<div class="credit-icon" style="background:' +
        (
          isAgainst
            ? 'var(--expense-bg)'
            : 'var(--income-bg)'
        ) +
        ';color:' +
        progressColor +
        '">' +
        icon('credit') +
        '</div>' +
        '<div style="min-width:0"><div class="credit-title">' +
        esc(
          c.title
        ) +
        '</div><div class="credit-sub">Capital ' +
        fmtMoney(
          plan.principal
        ) +
        '</div></div>' +
        '</div>' +

        '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">' +
        '<span class="credit-type-badge ' +
        (
          isAgainst
            ? 'against'
            : 'favor'
        ) +
        '">' +
        (
          isAgainst
            ? 'Deuda'
            : 'Cobro'
        ) +
        '</span>' +
        '<button data-action="edit-credit" data-id="' +
        c.id +
        '">' +
        icon('pencil') +
        '</button>' +
        '</div>' +

        '</div>';

      /*
       * Resumen visual de tres cifras.
       */

      html +=
        '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:14px;">';

      html +=
        '<div style="padding:10px 9px;border:1px solid rgba(148,163,184,.14);border-radius:14px;background:rgba(15,23,42,.38);"><div style="font-size:9px;color:var(--ink-muted);font-weight:800;text-transform:uppercase;letter-spacing:.08em">Total por pagar</div><div style="font-size:14px;font-weight:800;margin-top:4px">' +
        fmtMoney(
          plan.pendingTotal
        ) +
        '</div></div>';

      html +=
        '<div style="padding:10px 9px;border:1px solid rgba(148,163,184,.14);border-radius:14px;background:rgba(15,23,42,.38);"><div style="font-size:9px;color:var(--ink-muted);font-weight:800;text-transform:uppercase;letter-spacing:.08em">Interés total</div><div style="font-size:14px;font-weight:800;margin-top:4px">' +
        (
          plan.interestEnabled
            ? fmtMoney(
                plan.estimatedInterest
              )
            : '—'
        ) +
        '</div></div>';

      html +=
        '<div style="padding:10px 9px;border:1px solid rgba(148,163,184,.14);border-radius:14px;background:rgba(15,23,42,.38);"><div style="font-size:9px;color:var(--ink-muted);font-weight:800;text-transform:uppercase;letter-spacing:.08em">Avance</div><div style="font-size:14px;font-weight:800;margin-top:4px;color:' +
        progressColor +
        '">' +
        plan.progressPct +
        '%</div></div>';

      html +=
        '</div>';

      html +=
        '<div class="credit-values" style="margin-top:14px"><span>Total pactado</span><span class="credit-pending ' +
        (
          isAgainst
            ? 'against'
            : 'favor'
        ) +
        '">' +
        fmtMoney(
          plan.scheduledTotal
        ) +
        '</span></div>';

      html +=
        '<div class="bar-track" style="margin-bottom:12px"><div class="bar-fill" style="width:' +
        plan.progressPct +
        '%;background:' +
        progressColor +
        '"></div></div>';

      /*
       * Condiciones del crédito.
       */

      if (
        plan.interestEnabled
      ){

        html +=
          '<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;padding:10px 12px;border-radius:14px;background:linear-gradient(135deg,rgba(167,139,250,.08),rgba(56,189,248,.06));border:1px solid rgba(167,139,250,.14);margin-bottom:10px;">';

        html +=
          '<div><div style="font-size:10px;color:var(--ink-muted);font-weight:800;text-transform:uppercase;letter-spacing:.08em">Condiciones</div><div style="font-size:12px;font-weight:700;margin-top:3px">' +
          rateText +
          (
            plan.termMonths
              ? ' · ' +
                plan.termMonths +
                ' meses'
              : ''
          ) +
          '</div></div>';

        html +=
          '<div style="text-align:right"><div style="font-size:9px;color:var(--ink-muted);font-weight:800;text-transform:uppercase">Cuota estimada</div><div style="font-size:15px;font-weight:900;color:var(--pink);margin-top:2px">' +
          (
            plan.monthlyPayment > 0
              ? fmtMoney(
                  plan.monthlyPayment
                )
              : '—'
          ) +
          '</div></div>';

        html +=
          '</div>';
      }

      html +=
        '<button class="add-pay-btn" data-action="toggle-credit-detail" data-id="' +
        c.id +
        '" style="margin-top:2px">' +
        (
          isOpen
            ? 'Ocultar detalle'
            : 'Ver detalle del crédito'
        ) +
        '</button>';

      /*
       * DETALLE EXPANDIBLE
       */

      if (
        isOpen
      ){

        html +=
          '<div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(148,163,184,.12);">';

        html +=
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">';

        html +=
          '<div style="padding:10px 12px;border-radius:13px;background:rgba(15,23,42,.42)"><div style="font-size:9px;color:var(--ink-muted);text-transform:uppercase;font-weight:800;letter-spacing:.07em">Capital pagado</div><div style="font-size:14px;font-weight:800;margin-top:3px">' +
          fmtMoney(
            plan.paidPrincipal
          ) +
          '</div></div>';

        html +=
          '<div style="padding:10px 12px;border-radius:13px;background:rgba(15,23,42,.42)"><div style="font-size:9px;color:var(--ink-muted);text-transform:uppercase;font-weight:800;letter-spacing:.07em">Interés pagado</div><div style="font-size:14px;font-weight:800;margin-top:3px">' +
          fmtMoney(
            plan.paidInterest
          ) +
          '</div></div>';

        html +=
          '</div>';

        html +=
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">';

        html +=
          '<div style="padding:10px 12px;border-radius:13px;background:rgba(15,23,42,.42)"><div style="font-size:9px;color:var(--ink-muted);text-transform:uppercase;font-weight:800;letter-spacing:.07em">Capital pendiente</div><div style="font-size:14px;font-weight:800;margin-top:3px">' +
          fmtMoney(
            plan.remainingPrincipal
          ) +
          '</div></div>';

        html +=
          '<div style="padding:10px 12px;border-radius:13px;background:rgba(15,23,42,.42)"><div style="font-size:9px;color:var(--ink-muted);text-transform:uppercase;font-weight:800;letter-spacing:.07em">Interés pendiente</div><div style="font-size:14px;font-weight:800;margin-top:3px">' +
          fmtMoney(
            plan.pendingInterest
          ) +
          '</div></div>';

        html +=
          '</div>';

        html +=
          '<div style="margin-top:8px;padding:10px 12px;border-radius:13px;background:rgba(15,23,42,.42);display:flex;justify-content:space-between;align-items:center"><div style="font-size:9px;color:var(--ink-muted);text-transform:uppercase;font-weight:800;letter-spacing:.07em">Aportes realizados</div><div style="font-size:14px;font-weight:800">' +
          plan.paymentCount +
          '</div></div>';

        if (
          plan.interestEnabled &&
          plan.termMonths > 0
        ){

          html +=
            '<div style="margin-top:12px;padding:11px 12px;border-radius:13px;border:1px solid rgba(56,189,248,.12);background:rgba(56,189,248,.04);font-size:10.5px;color:var(--ink-muted);line-height:1.45">Cálculo de referencia con cuota fija y amortización francesa. Los aportes reales registrados prevalecen sobre la proyección.</div>';
        }

        if (
          c.payments.length
        ){

          const details =
            computeCreditPaymentBreakdown(
              c
            );

          html +=
            '<div style="margin-top:14px"><div style="font-size:10px;font-weight:800;color:var(--ink-muted);letter-spacing:.08em;text-transform:uppercase;margin-bottom:7px">Historial de aportes</div>';

          details.forEach(
            p => {

              html +=
                '<div class="payment-item" style="align-items:flex-start;gap:8px"><div style="min-width:0"><div style="font-weight:700">' +
                esc(
                  p.date ||
                  ''
                ) +
                '</div><div style="font-size:10px;color:var(--ink-muted);margin-top:2px">' +
                (
                  p.note
                    ? esc(
                        p.note
                      ) +
                      ' · '
                    : ''
                ) +
                'Capital ' +
                fmtMoney(
                  p.principalPaid
                ) +
                (
                  plan.interestEnabled
                    ? ' · Interés ' +
                      fmtMoney(
                        p.interestPaid
                      )
                    : ''
                ) +
                '</div></div><div style="display:flex;align-items:center;gap:4px"><b>+' +
                fmtMoney(
                  p.amount
                ) +
                '</b><button style="margin-left:4px" data-action="edit-payment" data-cid="' +
                c.id +
                '" data-pid="' +
                p.id +
                '">' +
                icon('pencil') +
                '</button></div></div>';
            }
          );

          html +=
            '</div>';
        }

        html +=
          '</div>';
      }

      html +=
        '<button class="add-pay-btn" data-action="new-payment" data-id="' +
        c.id +
        '">+ Agregar aporte</button>';

      html +=
        '</div>';
    }
  );

  return html;
}

/* ==========================================================
   CATEGORÍAS
   ========================================================== */

export function renderCategories(){

  const totals =
    computeCategoryTotals();

  const totalsById =
    Object.fromEntries(
      totals.map(
        r => [
          r.id,
          r.total
        ]
      )
    );

  const income =
    DB.categories.filter(
      c =>
        c.type ===
        'income'
    );

  const expense =
    DB.categories.filter(
      c =>
        c.type ===
        'expense'
    );

  const row =
    c => {

      const emoji =
        categoryIcon(
          c.icon
        );

      const hasBudget =
        c.type === 'expense' &&
        !!c.budget;

      const spent =
        totalsById[c.id] ||
        0;

      const pct =
        hasBudget
          ? Math.min(
              100,
              Math.round(
                (spent / c.budget) * 100
              )
            )
          : 0;

      return (
        '<button class="cat-item" data-action="edit-cat" data-id="' +
        c.id +
        '">' +

        '<div class="avatar" style="background:' +
        c.color +
        '22;color:' +
        c.color +
        '">' +
        emoji +
        '</div>' +

        '<div class="tx-main"><div class="cat-name">' +
        esc(
          c.name
        ) +
        (
          c.primary
            ? '<span class="star-badge">Principal</span>'
            : ''
        ) +
        (
          c.isFixed
            ? '<span class="fixed-badge">Fijo</span>'
            : ''
        ) +
        '</div>' +

        (
          hasBudget
            ? '<div class="bar-track" style="margin:8px 0 4px;"><div class="bar-fill" style="width:' +
              pct +
              '%;background:' +
              c.color +
              '"></div></div>' +
              '<div class="cat-budget-row"><span>' +
              pct +
              '% usado</span><span>de ' +
              fmtMoney(
                c.budget
              ) +
              '</span></div>'
            : ''
        ) +
        '</div>' +

        (
          c.type === 'expense' &&
          totalsById[c.id]
            ? '<div class="cat-total">' +
              fmtMoney(
                totalsById[c.id]
              ) +
              '</div>'
            : ''
        ) +

        icon('pencil') +

        '</button>'
      );
    };

  return (
    '<button class="new-cat-btn" data-action="new-cat">' +
    icon('plus') +
    ' Nueva categoría</button>' +

    '<div class="section-title">Ingresos</div>' +

    '<div class="list-container">' +
    (
      income.length
        ? income.map(row).join('')
        : '<div class="empty-state">Sin categorías de ingreso.</div>'
    ) +
    '</div>' +

    '<div class="section-title" style="margin-top:20px">Gastos</div>' +

    '<div class="list-container">' +
    (
      expense.length
        ? expense.map(row).join('')
        : '<div class="empty-state">Sin categorías de gasto.</div>'
    ) +
    '</div>'
  );
}

/* ==========================================================
   AJUSTES
   ========================================================== */

export function renderSettings(welcomeName){

  let html =
    '<div class="section-title">Nombre de bienvenida</div>';

  html +=
    '<div class="data-box">' +
    '<div class="field-label" style="margin-bottom:2px;">El nombre que quieres ver en tu saludo</div>' +
    '<input id="welcome-name-input" type="text" placeholder="Ej. Ana" maxlength="40" value="' +
    esc(
      welcomeName ||
      ''
    ) +
    '" style="margin-top:10px;width:100%;padding:12px 14px;border-radius:12px;border:1px solid var(--border-glass);background:rgba(255,255,255,0.04);color:var(--ink);font-size:15px;outline:none;">' +
    '</div>';

  html +=
    '<div class="section-title" style="margin-top:20px">Moneda</div><div class="settings-list">';

  Object.entries(
    CURRENCIES
  ).forEach(
    ([code,cfg]) => {

      const active =
        DB.settings.currency ===
        code;

      html +=
        '<button class="settings-row ' +
        (
          active
            ? 'active'
            : ''
        ) +
        '" data-action="set-currency" data-code="' +
        code +
        '"><span>' +
        cfg.label +
        '</span>' +
        (
          active
            ? icon('check')
            : ''
        ) +
        '</button>';
    }
  );

  html +=
    '</div>';

  html +=
    '<div class="section-title" style="margin-top:20px">Tus datos</div>';

  html +=
    '<div class="data-box"><div class="row"><span class="muted">Movimientos</span><span>' +
    DB.transactions.filter(t => t.source !== 'credit-payment').length +
    '</span></div>' +

    '<div class="row"><span class="muted">Categorías</span><span>' +
    DB.categories.length +
    '</span></div>' +

    '<div class="row"><span class="muted">Créditos</span><span>' +
    (
      DB.credits ||
      []
    ).length +
    '</span></div>' +

    '<div class="row"><span class="muted">Facturas</span><span>' +
    (
      DB.invoices ||
      []
    ).length +
    '</span></div></div>';

  html +=
    '<button class="secondary-btn" data-action="export-backup" style="margin-top:20px">Exportar copia de seguridad</button>';

  html +=
    '<button class="secondary-btn" data-action="import-backup">Importar copia de seguridad</button>';

  html +=
    '<input type="file" id="import-file" accept="application/json" style="display:none">';

  html +=
    '<button class="danger-btn" data-action="reset-data">Borrar todos los datos</button>';

  return html;
}

/* ==========================================================
   MENÚ FAB
   ========================================================== */

const FAB_MENU_ACTIONS = [
  {
    action: 'fab-new-tx',
    ic: 'plus',
    label: 'Nuevo movimiento',
    desc: 'Registrar ingreso o gasto',
    color: 'var(--neon-cyan)',
    bg: 'rgba(0,209,255,0.15)'
  },
  {
    action: 'fab-new-credit',
    ic: 'credit',
    label: 'Nuevo crédito',
    desc: 'Agregar deuda o cobro',
    color: 'var(--neon-violet)',
    bg: 'rgba(139,92,246,0.15)'
  },
  {
    action: 'fab-scan-invoice',
    ic: 'camera',
    label: 'Escanear factura',
    desc: 'Analizar con IA',
    color: 'var(--neon-green)',
    bg: 'rgba(16,185,129,0.15)'
  },
  {
    action: 'fab-categories',
    ic: 'tag',
    label: 'Categorías',
    desc: 'Ver y organizar',
    color: 'var(--neon-blue)',
    bg: 'rgba(32,96,255,0.15)'
  },
  {
    action: 'fab-settings',
    ic: 'gear',
    label: 'Ajustes',
    desc: 'Moneda y cuenta',
    color: 'var(--ink-muted)',
    bg: 'rgba(255,255,255,0.06)'
  }
];

// Layout trasladado de figma_mis_finanzas/src/components/PlusMenu.tsx
// (bottom sheet + grid de tarjetas). Las 5 acciones reales de Mis Finanzas
// se conservan intactas; solo cambia la presentación.
export function renderFabMenu(){

  return (
    '<div class="fab-menu-backdrop" id="fab-backdrop">' +

    '<div class="fab-menu-sheet">' +

    '<div class="fab-menu-handle"></div>' +
    '<p class="fab-menu-title">Agregar</p>' +

    '<div class="fab-menu-grid">' +
    FAB_MENU_ACTIONS.map(
      a =>
        '<button class="fab-menu-item" data-action="' + a.action + '">' +
        '<div class="icon-box" style="background:' + a.bg + ';color:' + a.color + '">' +
        icon(a.ic) +
        '</div>' +
        '<span class="fab-menu-item-label">' + a.label + '</span>' +
        '<span class="fab-menu-item-desc">' + a.desc + '</span>' +
        '</button>'
    ).join('') +
    '</div>' +

    '</div></div>'
  );
}

/* ==========================================================
   HOJA DE GASTO RÁPIDO
   ========================================================== */

export function renderQuickSheet(
  sheet
){

  const cat =
    catById(
      sheet.categoryId
    );

  const emoji =
    categoryIcon(
      cat ? cat.icon : null
    );

  const expenseCats =
    DB.categories.filter(
      c =>
        c.type === 'expense'
    );

  const valid =
    Number(
      sheet.amount
    ) > 0;

  return (
    '<div class="overlay"><div class="sheet"><div class="sheet-handle"></div>' +

    '<div class="sheet-head"><h3>Registrar gasto</h3><button data-action="close-sheet">' +
    icon('close') +
    '</button></div>' +

    '<div class="quick-header" id="quick-header-box"><div class="avatar" style="background:' +
    (cat ? cat.color + '22' : 'rgba(255,255,255,0.06)') +
    ';color:' +
    (cat ? cat.color : 'var(--ink-muted)') +
    '">' +
    emoji +
    '</div><div class="qname">' +
    esc(
      cat
        ? cat.name
        : 'Elige una categoría'
    ) +
    '</div></div>' +

    '<div class="field"><input id="q-amount" class="amount-input" type="text" inputmode="numeric" placeholder="$ 0" value="' +
    esc(
      formatThousandInput(
        sheet.amount
      )
    ) +
    '"></div>' +

    '<div class="field"><div class="field-label">Categoría</div><div class="chip-wrap" id="quickChipList">' +
    renderTxCatChips(
      expenseCats,
      sheet.categoryId,
      'pick-quick-cat'
    ) +
    '</div></div>' +

    (
      sheet.showNote
        ? '<div class="field"><div class="field-label">Nota</div><input id="q-note" value="' +
          esc(
            sheet.note
          ) +
          '"></div>'
        : '<button class="link-btn" data-action="show-note">+ Agregar nota</button>'
    ) +

    (
      sheet.showDate
        ? '<div class="field"><div class="field-label">Fecha</div><input id="q-date" type="date" value="' +
          esc(
            sheet.date
          ) +
          '"></div>'
        : '<button class="link-btn" data-action="show-date">Cambiar fecha</button>'
    ) +

    '<div class="sheet-actions" style="margin-top:14px"><button class="save-btn" id="quick-save-btn" data-action="save-quick" ' +
    (
      valid
        ? ''
        : 'disabled'
    ) +
    '>Guardar gasto</button></div>' +

    '</div></div>'
  );
}

/* ==========================================================
   CHIPS
   ========================================================== */

export function renderTxCatChips(
  cats,
  selectedId,
  actionName = 'pick-tx-cat'
){

  if (
    !cats.length
  ){

    return (
      '<div class="empty-hint">Crea primero una categoría.</div>'
    );
  }

  return cats
    .map(
      c => {

        const sel =
          selectedId ===
          c.id;

        return (
          '<button class="pick-chip ' +
          (
            sel
              ? 'selected'
              : ''
          ) +
          '" style="' +
          (
            sel
              ? 'border-color:var(--neon-cyan);background:rgba(0,209,255,0.12);'
              : ''
          ) +
          '" data-action="' +
          actionName +
          '" data-id="' +
          c.id +
          '">' +

          '<span class="chip-icon" style="background:' +
          (
            sel
              ? 'rgba(0,209,255,0.2)'
              : c.color + '25'
          ) +
          ';color:' +
          (
            sel
              ? 'var(--neon-cyan)'
              : c.color
          ) +
          (
            sel
              ? ';box-shadow:0 0 0 1px var(--neon-cyan) inset, 0 0 6px rgba(0,209,255,0.35);'
              : ''
          ) +
          '">' +

          categoryIcon(
            c.icon
          ) +

          '</span><span class="chip-label" style="' +
          (
            sel
              ? 'color:var(--neon-cyan);font-weight:700;'
              : ''
          ) +
          '">' +

          esc(
            c.name
          ) +

          '</span>' +
          (
            sel
              ? '<span class="pick-chip-check">' + icon('check') + '</span>'
              : ''
          ) +
          '</button>'
        );
      }
    )
    .join('');
}

/* ==========================================================
   MOVIMIENTO
   ========================================================== */

export function renderTxSheet(
  sheet
){

  const cats =
    DB.categories.filter(
      c =>
        c.type ===
        sheet.type
    );

  const chips =
    renderTxCatChips(
      cats,
      sheet.categoryId
    );

  const valid =
    Number(
      sheet.amount
    ) > 0 &&
    sheet.categoryId;

  return (
    '<div class="overlay"><div class="sheet"><div class="sheet-handle"></div>' +

    '<div class="sheet-head"><h3>' +
    (
      sheet.mode === 'edit'
        ? 'Editar movimiento'
        : 'Nuevo movimiento'
    ) +
    '</h3><button data-action="close-sheet">' +
    icon('close') +
    '</button></div>' +

    '<div class="type-toggle"><button class="' +
    (
      sheet.type === 'expense'
        ? 'active-expense'
        : ''
    ) +
    '" data-action="tx-type" data-type="expense">Gasto</button>' +

    '<button class="' +
    (
      sheet.type === 'income'
        ? 'active-income'
        : ''
    ) +
    '" data-action="tx-type" data-type="income">Ingreso</button></div>' +

    '<div class="field"><div class="field-label">Monto</div><input id="f-amount" type="text" inputmode="numeric" placeholder="0" value="' +
    esc(
      formatThousandInput(
        sheet.amount
      )
    ) +
    '"></div>' +

    '<div class="field"><div class="field-label">Categoría</div><div class="chip-wrap" id="chipList">' +
    chips +
    '</div></div>' +

    '<div class="field"><div class="field-label">Fecha</div><input id="f-date" type="date" value="' +
    esc(
      sheet.date
    ) +
    '"></div>' +

    '<div class="field"><div class="field-label">Nota</div><input id="f-note" value="' +
    esc(
      sheet.note
    ) +
    '"></div>' +

    '<div class="sheet-actions">' +

    (
      sheet.mode === 'edit'
        ? '<button class="del-btn" data-action="delete-tx">' +
          icon('trash') +
          '</button>'
        : ''
    ) +

    '<button class="save-btn" id="tx-save-btn" data-action="save-tx" ' +
    (
      valid
        ? ''
        : 'disabled'
    ) +
    '>Guardar</button></div></div></div>'
  );
}

/* ==========================================================
   CATEGORÍA
   ========================================================== */

export function renderCatSheet(
  sheet
){

  const swatches =
    SWATCHES
      .map(
        sw =>
          '<button class="swatch ' +
          (
            sheet.color === sw
              ? 'selected'
              : ''
          ) +
          '" style="background:' +
          sw +
          '" data-action="pick-color" data-color="' +
          sw +
          '"></button>'
      )
      .join('');

  const icons =
    ICON_KEYS
      .map(
        k =>
          '<button class="emoji-btn ' +
          (
            sheet.icon === k
              ? 'selected'
              : ''
          ) +
          '" data-action="pick-icon" data-icon="' +
          k +
          '">' +
          categoryIcon(k) +
          '</button>'
      )
      .join('');

  const valid =
    sheet.name.trim().length >
    0;

  return (
    '<div class="overlay"><div class="sheet"><div class="sheet-handle"></div>' +

    '<div class="sheet-head"><h3>' +
    (
      sheet.mode === 'edit'
        ? 'Editar categoría'
        : 'Nueva categoría'
    ) +
    '</h3><button data-action="close-sheet">' +
    icon('close') +
    '</button></div>' +

    '<div class="field"><div class="field-label">Nombre</div><input id="f-name" value="' +
    esc(
      sheet.name
    ) +
    '"></div>' +

    '<div class="field"><div class="field-label">Tipo</div><div class="type-toggle"><button class="' +
    (
      sheet.type === 'expense'
        ? 'active-neutral'
        : ''
    ) +
    '" data-action="cat-type" data-type="expense">Gasto</button>' +

    '<button class="' +
    (
      sheet.type === 'income'
        ? 'active-neutral'
        : ''
    ) +
    '" data-action="cat-type" data-type="income">Ingreso</button></div></div>' +

    '<div class="field"><div class="field-label">Color</div><div class="chip-wrap" id="swatchList">' +
    swatches +
    '</div></div>' +

    '<div class="field"><div class="field-label">Ícono</div><div class="chip-wrap" id="iconList">' +
    icons +
    '</div></div>' +

    '<div id="primaryField" style="display:' +
    (
      sheet.type === 'income'
        ? 'block'
        : 'none'
    ) +
    '">' +

    '<div class="toggle-row" data-action="toggle-primary"><div><div class="tlabel">Ingreso principal</div></div><div class="switch ' +
    (
      sheet.primary
        ? 'on'
        : ''
    ) +
    '" id="primarySwitch"><div class="knob"></div></div></div></div>' +

    '<div id="fixedField" style="display:' +
    (
      sheet.type === 'expense'
        ? 'block'
        : 'none'
    ) +
    '">' +

    '<div class="toggle-row" data-action="toggle-fixed"><div><div class="tlabel">Gasto fijo</div></div><div class="switch ' +
    (
      sheet.isFixed
        ? 'on-violet'
        : ''
    ) +
    '" id="fixedSwitch"><div class="knob"></div></div></div></div>' +

    '<div class="field" id="budgetField" style="display:' +
    (
      sheet.type === 'expense'
        ? 'block'
        : 'none'
    ) +
    '">' +

    '<div class="field-label">Presupuesto mensual</div>' +

    '<input id="f-budget" type="text" inputmode="numeric" value="' +
    esc(
      formatThousandInput(
        sheet.budget
      )
    ) +
    '">' +

    '</div>' +

    '<div class="sheet-actions">' +

    (
      sheet.mode === 'edit'
        ? '<button class="del-btn" data-action="delete-cat">' +
          icon('trash') +
          '</button>'
        : ''
    ) +

    '<button class="save-btn" id="cat-save-btn" data-action="save-cat" ' +
    (
      valid
        ? ''
        : 'disabled'
    ) +
    '>Guardar</button></div></div></div>'
  );
}

/* ==========================================================
   CRÉDITO
   ========================================================== */

export function renderCreditSheet(
  sheet
){

  const valid =
    sheet.title.trim().length > 0 &&
    Number(sheet.total) > 0 &&
    (
      !sheet.hasInterest ||
      (
      parseInterestRate(sheet.interestRate) > 0 &&
        Number(sheet.termMonths) > 0
      )
    );

  const previewCredit = {
    total:
      Number(
        sheet.total
      ) || 0,

    interestEnabled:
      !!sheet.hasInterest,

    interestRate:
        parseInterestRate(
          sheet.interestRate
        ),

    interestPeriod:
      sheet.interestPeriod ||
      'monthly',

    termMonths:
      Number(
        sheet.termMonths
      ) || 0,

    payments:[]
  };

  const preview =
    computeCreditPlan(
      previewCredit
    );

  let html =
    '<div class="overlay"><div class="sheet"><div class="sheet-handle"></div>';

  html +=
    '<div class="sheet-head"><h3>' +
    (
      sheet.mode === 'edit'
        ? 'Editar crédito'
        : 'Nuevo crédito'
    ) +
    '</h3><button data-action="close-sheet">' +
    icon('close') +
    '</button></div>';

  html +=
    '<div class="type-toggle"><button class="' +
    (
      sheet.type === 'against'
        ? 'active-expense'
        : ''
    ) +
    '" data-action="credit-type" data-type="against">Deuda</button><button class="' +
    (
      sheet.type === 'favor'
        ? 'active-income'
        : ''
    ) +
    '" data-action="credit-type" data-type="favor">Cobro</button></div>';

  html +=
    '<div class="field"><div class="field-label">Concepto / Persona</div><input id="c-title" value="' +
    esc(
      sheet.title
    ) +
    '"></div>';

  html +=
    '<div class="field"><div class="field-label">Capital inicial</div><input id="c-total" type="text" inputmode="numeric" placeholder="0" value="' +
    esc(
      formatThousandInput(
        sheet.total
      )
    ) +
    '"></div>';

  /*
   * Activación de intereses.
   */

  html +=
    '<div class="toggle-row" data-action="toggle-credit-interest" style="margin-top:4px"><div><div class="tlabel">¿Tiene intereses?</div><div style="font-size:10.5px;color:var(--ink-muted);margin-top:2px">Activa el cálculo financiero del crédito</div></div><div class="switch ' +
    (
      sheet.hasInterest
        ? 'on-violet'
        : ''
    ) +
    '" id="creditInterestSwitch"><div class="knob"></div></div></div>';

  /*
   * Condiciones.
   */

  html +=
    '<div id="creditInterestFields" style="display:' +
    (
      sheet.hasInterest
        ? 'block'
        : 'none'
    ) +
    ';margin-top:10px">';

  html +=
    '<div style="padding:13px;border-radius:16px;border:1px solid rgba(167,139,250,.18);background:linear-gradient(135deg,rgba(167,139,250,.07),rgba(56,189,248,.04));">';

  html +=
    '<div style="font-size:10px;color:var(--ink-muted);font-weight:800;text-transform:uppercase;letter-spacing:.08em;margin-bottom:9px">Condiciones del crédito</div>';

  html +=
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:9px">';

  html +=
    '<div class="field" style="margin:0"><div class="field-label">Tasa</div><input id="c-interest-rate" type="text" inputmode="decimal" min="0" max="100" step="0.01" placeholder="0,5" value="' +
    esc(
      sheet.interestRate
    ) +
    '"></div>';

  html +=
    '<div class="field" style="margin:0"><div class="field-label">Periodicidad</div><select id="c-interest-period" style="width:100%;padding:12px;border-radius:12px;background:var(--bg);border:1px solid var(--border);color:var(--ink);font-size:14px"><option value="monthly" ' +
    (
      sheet.interestPeriod === 'monthly'
        ? 'selected'
        : ''
    ) +
    '>Mensual</option><option value="annual" ' +
    (
      sheet.interestPeriod === 'annual'
        ? 'selected'
        : ''
    ) +
    '>Anual</option></select></div>';

  html +=
    '</div>';

  html +=
    '<div class="field" style="margin-top:9px"><div class="field-label">Plazo</div><input id="c-term" type="number" inputmode="numeric" min="1" max="600" step="1" placeholder="12" value="' +
    esc(
      sheet.termMonths ||
      ''
    ) +
    '"></div>';

  html +=
    '<div class="field" style="margin-top:9px"><div class="field-label">Fecha de inicio</div><input id="c-start-date" type="date" value="' +
    esc(
      sheet.startDate ||
      todayStr()
    ) +
    '"></div>';

  html +=
    '</div></div>';

  /*
   * Preview.
   */

  html +=
    '<div id="credit-preview" style="margin-top:12px;padding:13px;border-radius:16px;background:rgba(15,23,42,.52);border:1px solid rgba(56,189,248,.12);display:' +
    (
      sheet.hasInterest
        ? 'block'
        : 'none'
    ) +
    '">';

  html +=
    '<div style="font-size:10px;color:var(--ink-muted);font-weight:800;text-transform:uppercase;letter-spacing:.08em">Resumen estimado</div>';

  html +=
    '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:9px">';

  html +=
    '<div><div style="font-size:9px;color:var(--ink-muted)">Intereses</div><div id="c-preview-interest" style="font-size:13px;font-weight:800;margin-top:2px">' +
    fmtMoney(
      preview.estimatedInterest
    ) +
    '</div></div>';

  html +=
    '<div><div style="font-size:9px;color:var(--ink-muted)">Total</div><div id="c-preview-total" style="font-size:13px;font-weight:800;margin-top:2px">' +
    fmtMoney(
      preview.scheduledTotal
    ) +
    '</div></div>';

  html +=
    '<div><div style="font-size:9px;color:var(--ink-muted)">Cuota</div><div id="c-preview-payment" style="font-size:13px;font-weight:900;color:var(--pink);margin-top:2px">' +
    (
      preview.monthlyPayment > 0
        ? fmtMoney(
            preview.monthlyPayment
          )
        : '—'
    ) +
    '</div></div>';

  html +=
    '</div></div>';

  html +=
    '<div style="font-size:10px;color:var(--ink-muted);line-height:1.4;margin-top:10px">La tasa se usa para una proyección con cuota fija. Los aportes que registres después se contabilizan como pagos reales.</div>';

  html +=
    '<div class="sheet-actions" style="margin-top:12px">' +

    (
      sheet.mode === 'edit'
        ? '<button class="del-btn" data-action="delete-credit">' +
          icon('trash') +
          '</button>'
        : ''
    ) +

    '<button class="save-btn" id="credit-save-btn" data-action="save-credit" ' +
    (
      valid
        ? ''
        : 'disabled'
    ) +
    '>Guardar</button></div></div></div>';

  return html;
}

/* ==========================================================
   APORTE
   ========================================================== */

export function renderPaymentSheet(
  sheet
){

  const valid =
    Number(
      sheet.amount
    ) > 0;

  return (
    '<div class="overlay"><div class="sheet"><div class="sheet-handle"></div>' +

    '<div class="sheet-head"><h3>' +
    (
      sheet.mode === 'edit'
        ? 'Editar aporte'
        : 'Registrar aporte'
    ) +
    '</h3><button data-action="close-sheet">' +
    icon('close') +
    '</button></div>' +

    '<div style="padding:10px 12px;border-radius:14px;background:rgba(56,189,248,.05);border:1px solid rgba(56,189,248,.10);margin-bottom:12px;font-size:10.5px;color:var(--ink-muted);line-height:1.45">El sistema distribuirá el aporte entre <b>intereses y capital</b> cuando el crédito tenga una tasa configurada.</div>' +

    '<div class="field"><div class="field-label">Monto del aporte</div><input id="p-amount" type="text" inputmode="numeric" placeholder="0" value="' +
    esc(
      formatThousandInput(
        sheet.amount
      )
    ) +
    '"></div>' +

    '<div class="field"><div class="field-label">Fecha del aporte</div><input id="p-date" type="date" value="' +
    esc(
      sheet.date
    ) +
    '"></div>' +

    '<div class="field"><div class="field-label">Nota (opcional)</div><input id="p-note" value="' +
    esc(
      sheet.note
    ) +
    '"></div>' +

    '<div class="sheet-actions">' +
    (
      sheet.mode === 'edit'
        ? '<button class="del-btn" data-action="delete-payment">' + icon('trash') + '</button>'
        : ''
    ) +
    '<button class="save-btn" id="pay-save-btn" data-action="save-payment" ' +
    (
      valid
        ? ''
        : 'disabled'
    ) +
    '>Guardar aporte</button></div></div></div>'
  );
}

/* ==========================================================
   FACTURA
   ========================================================== */

export function renderInvoiceItemsHTML(
  sheet
){

  return sheet.items
    .map(
      (
        it,
        idx
      ) => (

        '<div class="item-edit-row"><input class="item-name" data-idx="' +
        idx +
        '" data-field="name" placeholder="Ítem" value="' +
        esc(
          it.name
        ) +
        '">' +

        '<input class="item-price" data-idx="' +
        idx +
        '" data-field="price" type="text" inputmode="numeric" placeholder="0" value="' +
        esc(
          formatThousandInput(
            it.price === '' || it.price === null || it.price === undefined
              ? it.price
              : Math.round(Number(it.price) || 0)
          )
        ) +
        '">' +

        '<button class="item-remove-btn" data-action="remove-invoice-item" data-idx="' +
        idx +
        '">' +
        icon('trash') +
        '</button></div>'
      )
    )
    .join('');
}

function invoiceMetaRowHTML(label, money, sign){
  if (!money) return '';

  const prefix = sign === '-' ? '−' : (sign === '+' ? '+' : '');

  // Se usa el valor absoluto: el signo mostrado lo controla únicamente `prefix`, para no
  // duplicar el "-" cuando el monto ya venga guardado en negativo (evita "--$"). No se toca
  // el valor almacenado, solo cómo se compone el texto en pantalla.
  // rawValue se conserva en el objeto (trazabilidad/futuras validaciones); solo se deja de mostrar en pantalla.
  return (
    '<div class="credit-values invoice-meta-row"><span>' + esc(label) + '</span>' +
    '<span>' + prefix + fmtMoney(Math.abs(money.value)) + '</span></div>'
  );
}

export function renderInvoiceMetaSummaryHTML(invoiceLike){
  if (!invoiceLike || !invoiceLike.hasAiMetadata) return '';

  let html = '<div class="invoice-meta-summary">';

  html += '<div class="field-label" style="margin-top:14px;">Resumen detectado por IA</div>';

  html += invoiceMetaRowHTML('Subtotal', invoiceLike.subtotal);

  (invoiceLike.discounts || []).forEach(d => {
    html += invoiceMetaRowHTML('Descuento' + (d.name ? ': ' + d.name : ''), d, '-');
  });

  html += invoiceMetaRowHTML('IVA / Impuesto', invoiceLike.tax, '+');

  (invoiceLike.retentions || []).forEach(r => {
    html += invoiceMetaRowHTML('Retención' + (r.name ? ': ' + r.name : ''), r, '-');
  });

  (invoiceLike.additionalCharges || []).forEach(c => {
    html += invoiceMetaRowHTML('Cargo adicional' + (c.name ? ': ' + c.name : ''), c, '+');
  });

  html += invoiceMetaRowHTML('Total detectado por IA', invoiceLike.detectedTotal);
  html += invoiceMetaRowHTML('Total neto a pagar', invoiceLike.netPayable);

  const check = computeInvoiceMathCheck(invoiceLike);

  if (check && !check.isConsistent) {
    html += '<div class="banner banner--warn">Los valores detectados no cuadran matemáticamente con el total. Se conservan los valores originales detectados por la IA.</div>';
  }

  html += '</div>';

  return html;
}

export function renderInvoiceSheet(
  sheet
){

  const itemsTotal =
    sheet.items.reduce(
      (
        s,
        it
      ) =>
        s +
        Math.round(
          Number(
            it.price
          ) || 0
        ),
      0
    );

  // Debe coincidir con el criterio usado al guardar (save-invoice en app.js):
  // preferir el neto/total detectado por la IA; si no hay total visible,
  // calcularlo determinísticamente; solo caer a la suma de ítems si tampoco
  // hay subtotal.
  const total =
    sheet.netPayable?.value ??
    sheet.detectedTotal?.value ??
    computeDeterministicInvoiceTotal(sheet) ??
    itemsTotal;

  const valid =
    sheet.items.some(
      it =>
        it.name.trim() &&
        Number(
          it.price
        ) > 0
    );

  let html =
    '<div class="overlay"><div class="sheet"><div class="sheet-handle"></div>';

  html +=
    '<div class="sheet-head"><h3>Revisar Factura Escaneada</h3><button data-action="close-sheet">' +
    icon('close') +
    '</button></div>';

  html +=
    '<div class="field"><div class="field-label">Título</div><input id="inv-title" value="' +
    esc(
      sheet.title
    ) +
    '"></div>';

  html +=
    '<div class="field"><div class="field-label">Fecha</div><input id="inv-date" type="date" value="' +
    esc(
      sheet.date
    ) +
    '"></div>';

  html +=
    '<div class="field-label" style="margin-bottom:8px;">Ítems detectados</div>';

  html +=
    '<div id="inv-items-list">' +
    renderInvoiceItemsHTML(
      sheet
    ) +
    '</div>';

  html +=
    '<button class="link-btn" data-action="add-invoice-item">+ Agregar ítem</button>';

  html +=
    renderInvoiceMetaSummaryHTML(
      sheet
    );

  html +=
    '<div class="mom-single" style="margin-top:14px;"><div class="lbl">Total factura</div><div class="val" style="color:var(--pink)" id="inv-total-val">' +
    fmtMoney(
      total
    ) +
    '</div></div>';

  html +=
    '<div class="sheet-actions" style="margin-top:14px;">';

  if (
    sheet.mode === 'edit'
  ){

    html +=
      '<button class="del-btn" data-action="delete-invoice">' +
      icon('trash') +
      '</button>';
  }

  html +=
    '<button class="save-btn" id="invoice-save-btn" data-action="save-invoice" ' +
    (
      valid
        ? ''
        : 'disabled'
    ) +
    '>Guardar factura</button>';

  html +=
    '</div></div></div>';

  return html;
}

export function renderConfirmDialog(
  confirmState
){

  return (
    '<div class="overlay overlay-center"><div class="confirm-box"><p>' +
    esc(
      confirmState.message
    ) +
    '</p>' +

    '<div class="confirm-actions"><button class="confirm-cancel" data-action="cancel-confirm">Cancelar</button><button class="confirm-ok" data-action="confirm-ok">Confirmar</button></div></div></div>'
  );
}

export function renderScanningOverlay(
  scanningOverlay
){

  return (
    '<div class="overlay overlay-center"><div class="confirm-box" style="text-align:center;"><div class="spinner" style="margin:0 auto 14px;"></div><p>' +
    esc(
      scanningOverlay.message
    ) +
    '</p></div></div>'
  );
}
