import {
  DB,
  CURRENCIES,
  SWATCHES,
  ICON_KEYS,
  ICON_EMOJI
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
  computeCreditsSummary
} from './domain.js';

/* ==========================================================
   SOPORTE DE ICONOS SVG
   ========================================================== */

export function icon(name){
  const svgs = {
    'wallet': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 10v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V10"/><path d="M16 14h.01"/></svg>',
    'list': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
    'plus': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>',
    'credit': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5zm0 6h18"/></svg>',
    'tag': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01"/></svg>',
    'search': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>',
    'pencil': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>',
    'check': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>',
    'close': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    'trash': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>',
    'alert': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M12 9v2M12 15h.01M22.61 16.53L13.73 3.15a2 2 0 0 0-3.46 0L1.39 16.53a2 2 0 0 0 1.73 3h17.76a2 2 0 0 0 1.73-3z"/></svg>',
    'gear': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1 z"/></svg>',
    'camera': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
    'receipt': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 14h-4M16 10H8M8 14h2"/></svg>'
  };

  return `<span class="icon" style="stroke-linecap:round;stroke-linejoin:round">${svgs[name] || ''}</span>`;
}

export const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    c => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    }[c])
  );

export function formatThousandInput(val){
  const digits = String(val).replace(/\D/g, '');
  if (!digits) return '';
  return new Intl.NumberFormat('es-CO').format(digits);
}

export function parseFormattedNumber(val){
  if (!val) return '';
  return String(val).replace(/\D/g, '');
}

export function fmtMoney(amount){
  const cur = DB.settings.currency || 'COP';
  const cfg = CURRENCIES[cur] || CURRENCIES.COP;
  const n = Number(amount) || 0;

  try {
    return new Intl.NumberFormat(
      cfg.locale,
      {
        style:'currency',
        currency:cur,
        maximumFractionDigits:0
      }
    ).format(n);
  } catch(e){
    return n.toFixed(0) + ' ' + cur;
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
   GRÁFICO CIRCULAR (PIE CHART SVG)
   ========================================================== */

export function expensePieSVG(
  catTotals,
  monthExpense,
  monthIncome,
  creditsPending
){
  creditsPending = Number(creditsPending) || 0;

  if (!catTotals.length && creditsPending <= 0) return '';

  const cx = 60;
  const cy = 60;
  const r = 44;
  const stroke = 16;
  const circumference = 2 * Math.PI * r;
  const gap = 3.2;
  const usable = Math.max(0, circumference - gap);

  const base =
    (monthIncome > 0)
      ? monthIncome
      : (monthExpense + creditsPending);

  const remainingPct =
    (monthIncome > 0)
      ? Math.max(
          0,
          (monthIncome - monthExpense - creditsPending) / monthIncome
        )
      : 0;

  let offset = 0;
  let slices = [];

  catTotals.forEach(rw => {
    const pct = Math.max(0, rw.total / base);

    if (pct <= 0) return;

    const rawDash = pct * usable;
    const dash = Math.max(0, rawDash - gap * 0.15);

    slices.push({
      color: rw.cat.color,
      dash,
      offset
    });

    offset += rawDash + (gap * 0.35);
  });

  if (creditsPending > 0 && base > 0) {
    const pct = Math.max(0, creditsPending / base);
    const rawDash = pct * usable;
    const dash = Math.max(0, rawDash - gap * 0.15);

    slices.push({
      color: '#F43F5E',
      dash,
      offset
    });

    offset += rawDash + (gap * 0.35);
  }

  if (remainingPct > 0.005) {
    const rawDash = remainingPct * usable;
    const dash = Math.max(0, rawDash - gap * 0.1);

    slices.push({
      color: '#1E293B',
      dash,
      offset
    });
  }

  let svg =
    '<svg viewBox="0 0 120 120" aria-label="Gastos e ingresos">';

  svg +=
    '<circle cx="' + cx +
    '" cy="' + cy +
    '" r="' + r +
    '" fill="none" stroke="#0F172A" stroke-width="' +
    stroke + '"/>';

  slices.forEach(s => {
    if (s.dash > 0.5) {
      svg +=
        '<circle cx="' + cx +
        '" cy="' + cy +
        '" r="' + r +
        '" fill="none" stroke="' + s.color +
        '" stroke-width="' + stroke +
        '" stroke-dasharray="' +
        s.dash.toFixed(2) + ' ' +
        (circumference - s.dash).toFixed(2) +
        '" stroke-dashoffset="' +
        (-s.offset).toFixed(2) +
        '" transform="rotate(-90 60 60)" stroke-linecap="butt" />';
    }
  });

  svg += '</svg>';

  return svg;
}


/* ==========================================================
   RENDERIZADO DE VISTAS PRINCIPALES
   ========================================================== */

export function renderDashboard(){
  const totals = computeTotals();
  const month = computeMonthStats();
  const catTotals = computeCategoryTotals();
  const burn = computeBurnMetrics();
  const budgets = computeBudgetRows();
  const mom = computeMonthOverMonthMetrics();

  const balColor =
    totals.balance >= 0
      ? 'var(--income)'
      : 'var(--expense)';

  const expenseCats =
    DB.categories.filter(c => c.type === 'expense');

  let html = '';

  html += '<div class="balance-card">';
  html += '<div class="balance-label">Balance disponible</div>';
  html += '<div class="balance-amount" style="color:' +
    balColor + '">' +
    fmtMoney(totals.balance) +
    '</div>';

  html += '<div class="balance-month">' +
    esc(monthLabelStr(new Date())) +
    '</div>';

  html += '<div class="balance-metrics">';

  html +=
    '<div class="b-metric">' +
      '<span class="lbl">Ingresos del mes</span>' +
      '<span class="val inc">+' +
      fmtMoney(month.income) +
      '</span>' +
    '</div>';

  html +=
    '<div class="b-metric">' +
      '<span class="lbl">Gastos del mes</span>' +
      '<span class="val exp">−' +
      fmtMoney(month.expense) +
      '</span>' +
    '</div>';

  html +=
    '<div class="b-metric">' +
      '<span class="lbl">Ahorro neto este mes</span>' +
      '<span class="val ' +
      (month.netSavings >= 0 ? 'inc' : 'exp') +
      '">' +
      (month.netSavings >= 0 ? '+' : '') +
      fmtMoney(month.netSavings) +
      '</span>' +
    '</div>';

  html +=
    '<div class="b-metric">' +
      '<span class="lbl">Tasa de ahorro</span>' +
      '<span class="val sav">' +
      month.savingsRate +
      '%</span>' +
    '</div>';

  html += '</div></div>';


  html += '<div class="card">';
  html += '<div class="section-title">Ritmo de Gasto Diario</div>';

  html += '<div class="burn-card">';

  html +=
    '<div class="burn-info">' +
      '<span class="burn-lbl">Disponible sugerido por día</span>' +
      '<span class="burn-val" style="color:var(--pink)">' +
      fmtMoney(burn.dailyAvailable) +
      ' / día</span>' +
    '</div>';

  const statusClass =
    burn.dailyAvailable > burn.avgDailyBurn
      ? 'ok'
      : (burn.dailyAvailable > 0 ? 'warn' : 'alert');

  const statusText =
    burn.dailyAvailable > burn.avgDailyBurn
      ? 'En ritmo'
      : (burn.dailyAvailable > 0 ? 'Ajustar' : 'Sin saldo');

  html +=
    '<span class="burn-status ' +
    statusClass + '">' +
    statusText +
    '</span>';

  html += '</div>';

  html +=
    '<div class="runway-card">' +
      '<div class="runway-icon">⏳</div>' +
      '<div class="runway-main">';

  html +=
    '<div class="runway-lbl">Ritmo de gasto · período ' +
    burn.periodStartDay +
    '–' +
    burn.periodEndDay +
    '</div>';

  if (burn.currentPeriodDays < 10) {

    html +=
      '<div class="runway-val">Ritmo actual <span>' +
      fmtMoney(burn.avgDailyBurn) +
      ' / día</span></div>';

    html +=
      '<div style="font-size:11px;opacity:.82;margin-top:4px">' +
      'Acumulado ' +
      fmtMoney(burn.currentPeriodExpense) +
      ' en ' +
      burn.currentPeriodDays +
      ' días</div>';

  } else {

    html +=
      '<div class="runway-val">Promedio <span>' +
      fmtMoney(burn.currentPeriodExpense) +
      ' / 10 días</span></div>';
  }

  html +=
    '<div style="margin-top:9px;padding-top:8px;border-top:1px solid rgba(56,189,248,.15)">';

  html +=
    '<div style="font-size:10px;opacity:.72;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">' +
    'Evolución del mes</div>';

  html +=
    '<div style="display:flex;justify-content:space-between;font-size:10.5px;margin-top:3px">' +
      '<span>1–10</span>' +
      '<b>' + fmtMoney(burn.periodExpenses[0]) + '</b>' +
    '</div>';

  html +=
    '<div style="display:flex;justify-content:space-between;font-size:10.5px;margin-top:3px;opacity:.82">' +
      '<span>11–20</span>' +
      '<b>' + fmtMoney(burn.periodExpenses[1]) + '</b>' +
    '</div>';

  html +=
    '<div style="display:flex;justify-content:space-between;font-size:10.5px;margin-top:3px;opacity:.68">' +
      '<span>21–' + burn.daysInMonth + '</span>' +
      '<b>' + fmtMoney(burn.periodExpenses[2]) + '</b>' +
    '</div>';

  html += '</div>';

  if (burn.runwayDays > 0) {
    html +=
      '<div style="font-size:10.5px;color:var(--ink-muted);margin-top:7px">' +
      'Con tu saldo actual cubres aprox. <b>' +
      burn.runwayDays +
      ' días</b> a este ritmo.</div>';
  }

  html += '</div></div></div>';


  if (expenseCats.length){

    html +=
      '<div class="section-title" style="margin-top:20px">' +
      'Registrar gasto rápido</div>';

    html +=
      '<div class="quick-grid">' +
      expenseCats.map(c =>
        '<button class="quick-btn" data-action="quick-cat" data-id="' +
        c.id +
        '">' +
          '<span class="em">' +
          (ICON_EMOJI[c.icon] || '⭐') +
          '</span>' +
          '<span class="nm">' +
          esc(c.name) +
          '</span>' +
        '</button>'
      ).join('') +
      '</div>';
  }


  const creditsPaid = computeCreditsPaidThisMonth();

  html +=
    '<div class="card">' +
      '<div class="section-title">Gastos por categoría (este mes)</div>';

  if ((catTotals.length && month.expense > 0) || creditsPaid > 0){

    const spentPct =
      month.income > 0
        ? Math.min(
            100,
            Math.round(
              ((month.expense + creditsPaid) /
              month.income) * 100
            )
          )
        : 100;

    const remainingPct =
      month.income > 0
        ? Math.max(0, 100 - spentPct)
        : 0;

    html += '<div class="pie-layout">';

    html +=
      '<div class="pie-chart">' +
      expensePieSVG(
        catTotals,
        month.expense,
        month.income,
        creditsPaid
      ) +
      '<div class="pie-center"><strong>' +
      spentPct +
      '%</strong><span>del ingreso</span></div></div>';

    html += '<div class="pie-legend">';

    catTotals.forEach(r => {

      const pctOfExpenses =
        (r.total / month.expense) * 100;

      html +=
        '<div class="pie-legend-row">' +
          '<span class="pie-dot" style="background:' +
          r.cat.color + '"></span>' +
          '<span class="pie-name">' +
          esc(r.cat.name) +
          '</span>' +
          '<span class="pie-pct">' +
          (pctOfExpenses < 0.1
            ? '<0.1'
            : pctOfExpenses.toFixed(1)) +
          '%</span>' +
        '</div>';
    });

    if (creditsPaid > 0){

      const creditsBase =
        month.income > 0
          ? month.income
          : (month.expense + creditsPaid);

      const pctOfCredits =
        creditsBase > 0
          ? (creditsPaid / creditsBase) * 100
          : 0;

      html +=
        '<div class="pie-legend-row">' +
          '<span class="pie-dot" style="background:#F43F5E"></span>' +
          '<span class="pie-name">Abonado a créditos</span>' +
          '<span class="pie-pct">' +
          (pctOfCredits < 0.1
            ? '<0.1'
            : pctOfCredits.toFixed(1)) +
          '%</span>' +
        '</div>';
    }

    if (month.income > 0 && remainingPct > 0){

      html +=
        '<div class="pie-legend-row">' +
          '<span class="pie-dot" style="background:#1E293B"></span>' +
          '<span class="pie-name">Disponible</span>' +
          '<span class="pie-pct">' +
          remainingPct +
          '%</span>' +
        '</div>';
    }

    html += '</div></div>';

  } else {

    html +=
      '<div class="empty-hint">' +
      'Aún no hay gastos registrados este mes.' +
      '</div>';
  }

  html += '</div>';


  html +=
    '<div class="mom-card">' +
      '<div class="mom-header">' +
        '<span class="mom-title">📊 Comparativa Mes a Mes</span>' +
        '<div class="mom-dots">';

  for (let i = 0; i < 5; i++) {
    html +=
      '<span class="mom-dot' +
      (i === 0 ? ' active' : '') +
      '"></span>';
  }

  html += '</div></div>';

  html +=
    '<div class="mom-carousel">' +
      '<div class="mom-track" id="mom-track">';

  const expUp = mom.expChangePct > 0;

  html +=
    '<div class="mom-slide">' +
      '<div class="mom-slide-grid">' +
        '<div class="mom-box">' +
          '<div class="lbl">Gastos este mes</div>' +
          '<div class="val" style="color:var(--expense)">' +
          fmtMoney(mom.currentExpense) +
          '</div>' +
        '</div>' +

        '<div class="mom-box">' +
          '<div class="lbl">Gastos mes pasado</div>' +
          '<div class="val">' +
          fmtMoney(mom.prevExpense) +
          '</div>' +
          '<div class="delta ' +
          (
            expUp
              ? 'up'
              : (mom.expChangePct < 0 ? 'down' : 'neutral')
          ) +
          '">' +
          (
            expUp
              ? '▲ +'
              : '▼ '
          ) +
          Math.abs(mom.expChangePct) +
          '%</div>' +
        '</div>' +
      '</div>' +
    '</div>';


  const incUp = mom.incChangePct > 0;

  html +=
    '<div class="mom-slide">' +
      '<div class="mom-slide-grid">' +

        '<div class="mom-box">' +
          '<div class="lbl">Ingresos este mes</div>' +
          '<div class="val" style="color:var(--income)">' +
          fmtMoney(mom.currentIncome) +
          '</div>' +
        '</div>' +

        '<div class="mom-box">' +
          '<div class="lbl">Ingresos mes pasado</div>' +
          '<div class="val">' +
          fmtMoney(mom.prevIncome) +
          '</div>' +
          '<div class="delta ' +
          (
            incUp
              ? 'down'
              : (mom.incChangePct < 0 ? 'up' : 'neutral')
          ) +
          '">' +
          (
            incUp
              ? '▲ +'
              : '▼ '
          ) +
          Math.abs(mom.incChangePct) +
          '%</div>' +
        '</div>' +

      '</div>' +
    '</div>';


  html +=
    '<div class="mom-slide">' +
      '<div class="mom-slide-grid">' +

        '<div class="mom-box">' +
          '<div class="lbl">Ahorro este mes</div>' +
          '<div class="val" style="color:' +
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
          fmtMoney(mom.currentSavings) +
          '</div>' +
        '</div>' +

        '<div class="mom-box">' +
          '<div class="lbl">Ahorro mes pasado</div>' +
          '<div class="val" style="color:' +
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
          fmtMoney(mom.prevSavings) +
          '</div>' +
        '</div>' +

      '</div>' +
    '</div>';


  html +=
    '<div class="mom-slide">' +
      '<div class="mom-single">' +
        '<div class="lbl">Tasa de ahorro actual</div>' +
        '<div class="val" style="color:var(--pink)">' +
        mom.savingsRate +
        '%</div>' +
        '<div class="sub">Porcentaje guardado este mes</div>' +
      '</div>' +
    '</div>';


  if (mom.highestGrowthCat){

    html +=
      '<div class="mom-slide">' +
        '<div class="mom-single">' +
          '<div class="lbl">Mayor aumento de gasto</div>' +
          '<div class="val" style="color:var(--expense)">' +
          esc(mom.highestGrowthCat.name) +
          '</div>' +
          '<div class="sub">Subió ' +
          fmtMoney(mom.maxDiff) +
          ' vs mes anterior</div>' +
        '</div>' +
      '</div>';

  } else {

    html +=
      '<div class="mom-slide">' +
        '<div class="mom-single">' +
          '<div class="lbl">Categorías</div>' +
          '<div class="val" style="color:var(--income)">Estables</div>' +
          '<div class="sub">Sin aumentos significativos</div>' +
        '</div>' +
      '</div>';
  }

  html += '</div></div>';


  if (mom.highestGrowthCat){

    html +=
      '<div class="mom-insight">' +
        '<span>💡</span>' +
        '<div><b>Atención en ' +
        esc(mom.highestGrowthCat.name) +
        ':</b> Tu gasto subió ' +
        fmtMoney(mom.maxDiff) +
        ' respecto al mes anterior.</div>' +
      '</div>';

  } else {

    html +=
      '<div class="mom-insight">' +
        '<span>✨</span>' +
        '<div><b>¡Buen control!</b> Patrones de consumo estables.</div>' +
      '</div>';
  }

  html += '</div>';


  if (budgets.length){

    html +=
      '<div class="card" style="margin-top:16px">' +
        '<div class="section-title">Presupuestos</div>';

    budgets.forEach(b => {

      let barColor = b.cat.color;

      if (b.over) {
        barColor = 'var(--expense)';
      } else if (b.isPacingFast) {
        barColor = 'var(--amber)';
      }

      html +=
        '<div class="cat-row">' +
          '<div class="top">' +
            '<span>' +
            (
              b.over
                ? icon('alert') + ' '
                : ''
            ) +
            esc(b.cat.name) +
            '</span>' +

            '<span style="color:' +
            (
              b.over
                ? 'var(--expense)'
                : 'var(--ink-muted)'
            ) +
            '">' +
            fmtMoney(b.spent) +
            ' / ' +
            fmtMoney(b.cat.budget) +
            '</span>' +
          '</div>' +

          '<div class="bar-track">' +
            '<div class="bar-fill" style="width:' +
            b.pct +
            '%;background:' +
            barColor +
            '"></div>' +
          '</div>' +

        '</div>';
    });

    html += '</div>';
  }

  return html;
}


export function renderTxRow(t){
  const cat = catById(t.categoryId);
  const emoji = cat
    ? (ICON_EMOJI[cat.icon] || '⭐')
    : '⭐';

  const bg =
    (cat ? cat.color : '#8B85A3') + '22';

  return (
    '<button class="tx-item" data-action="edit-tx" data-id="' +
    t.id +
    '">' +

      '<div class="avatar" style="background:' +
      bg +
      '">' +
      emoji +
      '</div>' +

      '<div class="tx-main">' +
        '<div class="tx-title">' +
        esc(cat ? cat.name : 'Sin categoría') +
        '</div>' +

        '<div class="tx-sub">' +
        esc(t.date) +
        (
          t.note
            ? ' · ' + esc(t.note)
            : ''
        ) +
        '</div>' +
      '</div>' +

      '<div class="tx-amount ' +
      t.type +
      '">' +
      (
        t.type === 'income'
          ? '+'
          : '−'
      ) +
      fmtMoney(t.amount) +
      '</div>' +

    '</button>'
  );
}


export function filteredTx(search, txFilter){
  return DB.transactions
    .filter(t =>
      txFilter === 'all'
        ? true
        : t.type === txFilter
    )
    .filter(t => {

      if (!search.trim()) return true;

      const s = search.toLowerCase();
      const cat = catById(t.categoryId);

      return (
        (t.note || '')
          .toLowerCase()
          .includes(s)
        ||
        (
          cat &&
          cat.name
            .toLowerCase()
            .includes(s)
        )
      );
    })
    .sort(
      (a,b) =>
        (b.date + b.id)
          .localeCompare(a.date + a.id)
    );
}


export function renderTransactions(search, txFilter){

  const list = filteredTx(search, txFilter);

  let html = '';

  html +=
    '<div class="search-box">' +
      icon('search') +
      '<input id="search-input" placeholder="Buscar por nota o categoría" value="' +
      esc(search) +
      '">' +
    '</div>';

  html += '<div class="filter-row">';

  [
    ['all','Todos'],
    ['income','Ingresos'],
    ['expense','Gastos']
  ].forEach(([val,label]) => {

    html +=
      '<button class="chip ' +
      (txFilter === val ? 'selected' : '') +
      '" data-action="set-filter" data-filter="' +
      val +
      '">' +
      label +
      '</button>';
  });

  html += '</div>';

  html +=
    '<div id="tx-list">' +
    (
      list.length
        ? list.map(renderTxRow).join('')
        : '<div class="empty-state">No hay movimientos registrados.</div>'
    ) +
    '</div>';

  return html;
}


export function renderInvoices(openInvoiceId){

  let html = '';

  html +=
    '<div class="section-title">Facturas Escaneadas</div>';

  const list =
    (DB.invoices || [])
      .slice()
      .sort(
        (a,b) =>
          (b.date + b.id)
            .localeCompare(a.date + a.id)
      );

  if (!list.length){

    return (
      html +
      '<div class="empty-state">' +
      'Aún no has escaneado ninguna factura.<br>' +
      'Usa el botón central (+) para escanear una.' +
      '</div>'
    );
  }

  list.forEach(inv => {

    const isOpen =
      openInvoiceId === inv.id;

    html +=
      '<div class="credit-card">' +
        '<div class="credit-head">' +

          '<div>' +
            '<div class="credit-title">' +
            esc(inv.title) +
            '</div>' +

            '<div class="credit-sub">' +
            esc(inv.date) +
            ' · ' +
            inv.items.length +
            ' ítem(s)' +
            '</div>' +
          '</div>' +

          '<button data-action="edit-invoice" data-id="' +
          inv.id +
          '">' +
          icon('pencil') +
          '</button>' +

        '</div>';

    html +=
      '<div class="credit-values">' +
        '<span>Total:</span>' +
        '<span class="credit-pending against">' +
        fmtMoney(inv.total) +
        '</span>' +
      '</div>';

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

    if (isOpen){

      html +=
        '<div style="margin-top:10px;">';

      inv.items.forEach(it => {

        html +=
          '<div class="invoice-item-row">' +
            '<span class="iname">' +
            esc(it.name) +
            '</span>' +

            '<span class="iprice">' +
            fmtMoney(it.price) +
            '</span>' +
          '</div>';
      });

      html += '</div>';
    }

    html +=
      '<div style="margin-top:10px;">';

    if (inv.registered){

      const cat =
        catById(inv.categoryId);

      html +=
        '<span class="registered-badge">' +
        icon('check') +
        ' Registrada' +
        (
          cat
            ? ' en ' + esc(cat.name)
            : ''
        ) +
        '</span>';

    } else {

      html +=
        '<button class="add-pay-btn" data-action="register-invoice" data-id="' +
        inv.id +
        '">' +
        'Elegir categoría y registrar' +
        '</button>';
    }

    html += '</div></div>';
  });

  return html;
}


export function renderCredits(creditFilter){

  let html = '';

  const summary =
    computeCreditsSummary();

  if (
    summary.againstCount > 0 ||
    summary.favorCount > 0
  ){

    html +=
      '<div class="balance-card">';

    if (summary.againstCount > 0){

      html +=
        '<div class="balance-label">Total que debo</div>';

      html +=
        '<div class="balance-amount" style="color:var(--expense)">' +
        fmtMoney(summary.againstPending) +
        '</div>';

      html +=
        '<div class="balance-month">de ' +
        fmtMoney(summary.againstTotal) +
        ' en ' +
        summary.againstCount +
        ' crédito(s)</div>';

      html +=
        '<div class="bar-track" style="margin-top:10px;">' +
          '<div class="bar-fill" style="width:' +
          summary.againstProgressPct +
          '%;background:var(--income)"></div>' +
        '</div>';
    }

    if (summary.favorCount > 0){

      html +=
        '<div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(56,189,248,0.2)">' +

          '<div class="balance-label">Total que me deben</div>' +

          '<div class="balance-amount" style="font-size:26px;color:var(--income)">' +
          fmtMoney(summary.favorPending) +
          '</div>' +

          '<div class="balance-month">de ' +
          fmtMoney(summary.favorTotal) +
          ' en ' +
          summary.favorCount +
          ' cobro(s)</div>' +

        '</div>';
    }

    html += '</div>';
  }


  html +=
    '<div class="filter-row" style="margin-bottom:14px;">';

  [
    ['against','En contra (Deudas)'],
    ['favor','A favor (Cobros)']
  ].forEach(([val,label]) => {

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
  });

  html += '</div>';


  const list =
    (DB.credits || [])
      .filter(c => c.type === creditFilter);

  if (!list.length){

    return (
      html +
      '<div class="empty-state">' +
      'No hay créditos registrados.' +
      '</div>'
    );
  }


  list.forEach(c => {

    const totalPaid =
      (c.payments || [])
        .reduce(
          (sum,p) =>
            sum + (Number(p.amount) || 0),
          0
        );

    const pending =
      Math.max(
        0,
        Number(c.total) - totalPaid
      );

    const pct =
      c.total > 0
        ? Math.min(
            100,
            Math.round(
              (totalPaid / c.total) * 100
            )
          )
        : 0;

    const isAgainst =
      c.type === 'against';

    html +=
      '<div class="credit-card">';

    html +=
      '<div class="credit-head">' +

        '<div>' +
          '<div class="credit-title">' +
          esc(c.title) +
          '</div>' +

          '<div class="credit-sub">Total: ' +
          fmtMoney(c.total) +
          '</div>' +
        '</div>' +

        '<button data-action="edit-credit" data-id="' +
        c.id +
        '">' +
        icon('pencil') +
        '</button>' +

      '</div>';

    html +=
      '<div class="credit-values">' +
        '<span>Falta por ' +
        (
          isAgainst
            ? 'pagar'
            : 'cobrar'
        ) +
        ':</span>' +

        '<span class="credit-pending ' +
        (
          isAgainst
            ? 'against'
            : 'favor'
        ) +
        '">' +
        fmtMoney(pending) +
        '</span>' +
      '</div>';

    html +=
      '<div class="bar-track" style="margin-bottom:12px;">' +
        '<div class="bar-fill" style="width:' +
        pct +
        '%;background:' +
        (
          isAgainst
            ? 'var(--expense)'
            : 'var(--income)'
        ) +
        '"></div>' +
      '</div>';


    if (c.payments && c.payments.length){

      html +=
        '<div style="margin-top:8px;">' +
          '<span style="font-size:11px;font-weight:700;color:var(--ink-muted);">' +
          'HISTORIAL:</span>';

      c.payments.forEach(p => {

        html +=
          '<div class="payment-item">' +

            '<span>' +
            esc(p.date) +
            (
              p.note
                ? ' - ' + esc(p.note)
                : ''
            ) +
            '</span>' +

            '<span><b>+' +
            fmtMoney(p.amount) +
            '</b> ' +

            '<button style="margin-left:6px" data-action="edit-payment" data-cid="' +
            c.id +
            '" data-pid="' +
            p.id +
            '">' +
            icon('pencil') +
            '</button>' +

            '</span>' +

          '</div>';
      });

      html += '</div>';
    }


    html +=
      '<button class="add-pay-btn" data-action="new-payment" data-id="' +
      c.id +
      '">+ Agregar aporte</button>' +

      '</div>';
  });

  return html;
}


export function renderCategories(){

  const totals =
    computeCategoryTotals();

  const totalsById =
    Object.fromEntries(
      totals.map(r => [r.id, r.total])
    );

  const income =
    DB.categories.filter(
      c => c.type === 'income'
    );

  const expense =
    DB.categories.filter(
      c => c.type === 'expense'
    );


  const row = (c) => {

    const emoji =
      ICON_EMOJI[c.icon] || '⭐';

    return (
      '<button class="cat-item" data-action="edit-cat" data-id="' +
      c.id +
      '">' +

        '<div class="avatar" style="background:' +
        c.color +
        '22">' +
        emoji +
        '</div>' +

        '<div class="tx-main">' +

          '<div class="cat-name">' +
          esc(c.name) +

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
            c.type === 'expense' && c.budget
              ? '<div class="cat-budget">Presupuesto: ' +
                fmtMoney(c.budget) +
                '</div>'
              : ''
          ) +

        '</div>' +

        (
          c.type === 'expense' &&
          totalsById[c.id]
            ? '<div class="cat-total">' +
              fmtMoney(totalsById[c.id]) +
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
    income.map(row).join('') +

    '<div class="section-title" style="margin-top:20px">Gastos</div>' +
    expense.map(row).join('')
  );
}


export function renderSettings(){

  let html =
    '<div class="section-title">Moneda</div>' +
    '<div class="settings-list">';

  Object.entries(CURRENCIES).forEach(
    ([code,cfg]) => {

      const active =
        DB.settings.currency === code;

      html +=
        '<button class="settings-row ' +
        (active ? 'active' : '') +
        '" data-action="set-currency" data-code="' +
        code +
        '">' +

        '<span>' +
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

  html += '</div>';


  html +=
    '<div class="section-title" style="margin-top:20px">Configuración de API IA (Producción)</div>';

  html +=
    '<div class="data-box">' +
      '<div class="field-label">Clave de API de Gemini</div>' +

      '<input id="gemini-key-input" type="text" placeholder="Pega aquí tu API key" value="' +
      esc(DB.settings.geminiApiKey || '') +
      '">' +

      '<div style="font-size:11px;color:var(--ink-muted);margin-top:8px;">' +
      'Clave segura para procesamiento en nube.' +
      '</div>' +

    '</div>';


  html +=
    '<div class="section-title" style="margin-top:20px">Tus datos</div>';

  html +=
    '<div class="data-box">' +

      '<div class="row">' +
        '<span class="muted">Movimientos</span>' +
        '<span>' +
        DB.transactions.length +
        '</span>' +
      '</div>' +

      '<div class="row">' +
        '<span class="muted">Categorías</span>' +
        '<span>' +
        DB.categories.length +
        '</span>' +
      '</div>' +

      '<div class="row">' +
        '<span class="muted">Créditos</span>' +
        '<span>' +
        (DB.credits || []).length +
        '</span>' +
      '</div>' +

      '<div class="row">' +
        '<span class="muted">Facturas</span>' +
        '<span>' +
        (DB.invoices || []).length +
        '</span>' +
      '</div>' +

    '</div>';


  html +=
    '<button class="secondary-btn" data-action="export-backup" style="margin-top:20px">' +
    'Exportar copia de seguridad</button>';

  html +=
    '<button class="secondary-btn" data-action="import-backup">' +
    'Importar copia de seguridad</button>';

  html +=
    '<input type="file" id="import-file" accept="application/json" style="display:none">';

  html +=
    '<button class="danger-btn" data-action="reset-data">' +
    'Borrar todos los datos</button>';

  return html;
}


export function renderFabMenu() {

  return (
    '<div class="fab-menu-backdrop" id="fab-backdrop">' +

      '<div class="fab-menu-sheet">' +

        '<button class="fab-menu-item" data-action="fab-new-tx">' +
          '<div class="icon-box">' +
          icon('plus') +
          '</div>' +
          '<span>Registrar movimiento</span>' +
        '</button>' +

        '<button class="fab-menu-item" data-action="fab-scan-invoice">' +
          '<div class="icon-box">' +
          icon('camera') +
          '</div>' +
          '<span>Escanear factura con IA</span>' +
        '</button>' +

        '<button class="fab-menu-item" data-action="fab-invoices">' +
          '<div class="icon-box">' +
          icon('receipt') +
          '</div>' +
          '<span>Ver facturas escaneadas</span>' +
        '</button>' +

        '<button class="fab-menu-item" data-action="fab-settings">' +
          '<div class="icon-box">' +
          icon('gear') +
          '</div>' +
          '<span>Ajustes y Moneda</span>' +
        '</button>' +

      '</div>' +

    '</div>'
  );
}


/* ==========================================================
   RENDERIZADO DE HOJAS Y MODALES (SHEETS)
   ========================================================== */

export function renderQuickSheet(sheet){

  const cat =
    catById(sheet.categoryId);

  const emoji =
    cat
      ? (ICON_EMOJI[cat.icon] || '⭐')
      : '⭐';

  const valid =
    Number(sheet.amount) > 0;

  return (
    '<div class="overlay">' +
      '<div class="sheet">' +

        '<div class="sheet-handle"></div>' +

        '<div class="sheet-head">' +
          '<h3>Registrar gasto</h3>' +
          '<button data-action="close-sheet">' +
          icon('close') +
          '</button>' +
        '</div>' +

        '<div class="quick-header">' +
          '<div class="avatar">' +
          emoji +
          '</div>' +

          '<div class="qname">' +
          esc(cat ? cat.name : '') +
          '</div>' +
        '</div>' +

        '<div class="field">' +
          '<input id="q-amount" class="amount-input" type="text" inputmode="numeric" placeholder="$ 0" value="' +
          esc(formatThousandInput(sheet.amount)) +
          '">' +
        '</div>' +

        (
          sheet.showNote
            ? '<div class="field">' +
              '<div class="field-label">Nota</div>' +
              '<input id="q-note" value="' +
              esc(sheet.note) +
              '">' +
              '</div>'

            : '<button class="link-btn" data-action="show-note">' +
              '+ Agregar nota</button>'
        ) +

        (
          sheet.showDate
            ? '<div class="field">' +
              '<div class="field-label">Fecha</div>' +
              '<input id="q-date" type="date" value="' +
              esc(sheet.date) +
              '">' +
              '</div>'

            : '<button class="link-btn" data-action="show-date">' +
              'Cambiar fecha</button>'
        ) +

        '<div class="sheet-actions" style="margin-top:14px">' +
          '<button class="save-btn" id="quick-save-btn" data-action="save-quick" ' +
          (valid ? '' : 'disabled') +
          '>Guardar gasto</button>' +
        '</div>' +

      '</div>' +
    '</div>'
  );
}


export function renderTxCatChips(cats, selectedId){

  if (!cats.length) {
    return '<div class="empty-hint">Crea primero una categoría.</div>';
  }

  return cats.map(c => {

    const sel =
      selectedId === c.id;

    return (
      '<button class="pick-chip ' +
      (sel ? 'selected' : '') +
      '" style="' +
      (
        sel
          ? 'border-color:var(--violet);background:rgba(6,182,212,0.2);'
          : ''
      ) +
      '" data-action="pick-tx-cat" data-id="' +
      c.id +
      '">' +

        '<span class="chip-icon" style="background:' +
        c.color +
        '25">' +
        (ICON_EMOJI[c.icon] || '⭐') +
        '</span>' +

        '<span class="chip-label">' +
        esc(c.name) +
        '</span>' +

      '</button>'
    );
  }).join('');
}


export function renderTxSheet(sheet){

  const cats =
    DB.categories.filter(
      c => c.type === sheet.type
    );

  const chips =
    renderTxCatChips(
      cats,
      sheet.categoryId
    );

  const valid =
    Number(sheet.amount) > 0 &&
    sheet.categoryId;

  return (
    '<div class="overlay">' +
      '<div class="sheet">' +

        '<div class="sheet-handle"></div>' +

        '<div class="sheet-head">' +
          '<h3>' +
          (
            sheet.mode === 'edit'
              ? 'Editar movimiento'
              : 'Nuevo movimiento'
          ) +
          '</h3>' +

          '<button data-action="close-sheet">' +
          icon('close') +
          '</button>' +
        '</div>' +

        '<div class="type-toggle">' +

          '<button class="' +
          (
            sheet.type === 'expense'
              ? 'active-expense'
              : ''
          ) +
          '" data-action="tx-type" data-type="expense">' +
          'Gasto</button>' +

          '<button class="' +
          (
            sheet.type === 'income'
              ? 'active-income'
              : ''
          ) +
          '" data-action="tx-type" data-type="income">' +
          'Ingreso</button>' +

        '</div>' +

        '<div class="field">' +
          '<div class="field-label">Monto</div>' +
          '<input id="f-amount" type="text" inputmode="numeric" placeholder="0" value="' +
          esc(formatThousandInput(sheet.amount)) +
          '">' +
        '</div>' +

        '<div class="field">' +
          '<div class="field-label">Categoría</div>' +
          '<div class="chip-wrap" id="chipList">' +
          chips +
          '</div>' +
        '</div>' +

        '<div class="field">' +
          '<div class="field-label">Fecha</div>' +
          '<input id="f-date" type="date" value="' +
          esc(sheet.date) +
          '">' +
        '</div>' +

        '<div class="field">' +
          '<div class="field-label">Nota</div>' +
          '<input id="f-note" value="' +
          esc(sheet.note) +
          '">' +
        '</div>' +

        '<div class="sheet-actions">' +

          (
            sheet.mode === 'edit'
              ? '<button class="del-btn" data-action="delete-tx">' +
                icon('trash') +
                '</button>'
              : ''
          ) +

          '<button class="save-btn" id="tx-save-btn" data-action="save-tx" ' +
          (valid ? '' : 'disabled') +
          '>Guardar</button>' +

        '</div>' +

      '</div>' +
    '</div>'
  );
}


export function renderCatSheet(sheet){

  const swatches =
    SWATCHES
      .map(sw =>
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
      .map(k =>
        '<button class="emoji-btn ' +
        (
          sheet.icon === k
            ? 'selected'
            : ''
        ) +
        '" data-action="pick-icon" data-icon="' +
        k +
        '">' +
        ICON_EMOJI[k] +
        '</button>'
      )
      .join('');

  const valid =
    sheet.name.trim().length > 0;

  return (
    '<div class="overlay">' +
      '<div class="sheet">' +

        '<div class="sheet-handle"></div>' +

        '<div class="sheet-head">' +
          '<h3>' +
          (
            sheet.mode === 'edit'
              ? 'Editar categoría'
              : 'Nueva categoría'
          ) +
          '</h3>' +

          '<button data-action="close-sheet">' +
          icon('close') +
          '</button>' +
        '</div>' +

        '<div class="field">' +
          '<div class="field-label">Nombre</div>' +
          '<input id="f-name" value="' +
          esc(sheet.name) +
          '">' +
        '</div>' +

        '<div class="field">' +
          '<div class="field-label">Tipo</div>' +

          '<div class="type-toggle">' +

            '<button class="' +
            (
              sheet.type === 'expense'
                ? 'active-neutral'
                : ''
            ) +
            '" data-action="cat-type" data-type="expense">' +
            'Gasto</button>' +

            '<button class="' +
            (
              sheet.type === 'income'
                ? 'active-neutral'
                : ''
            ) +
            '" data-action="cat-type" data-type="income">' +
            'Ingreso</button>' +

          '</div>' +
        '</div>' +

        '<div class="field">' +
          '<div class="field-label">Color</div>' +
          '<div class="chip-wrap" id="swatchList">' +
          swatches +
          '</div>' +
        '</div>' +

        '<div class="field">' +
          '<div class="field-label">Ícono</div>' +
          '<div class="chip-wrap" id="iconList">' +
          icons +
          '</div>' +
        '</div>' +

        '<div id="primaryField" style="display:' +
        (
          sheet.type === 'income'
            ? 'block'
            : 'none'
        ) +
        '">' +

          '<div class="toggle-row" data-action="toggle-primary">' +

            '<div>' +
              '<div class="tlabel">Ingreso principal</div>' +
            '</div>' +

            '<div class="switch ' +
            (
              sheet.primary
                ? 'on'
                : ''
            ) +
            '" id="primarySwitch">' +
              '<div class="knob"></div>' +
            '</div>' +

          '</div>' +

        '</div>' +

        '<div id="fixedField" style="display:' +
        (
          sheet.type === 'expense'
            ? 'block'
            : 'none'
        ) +
        '">' +

          '<div class="toggle-row" data-action="toggle-fixed">' +

            '<div>' +
              '<div class="tlabel">Gasto fijo</div>' +
            '</div>' +

            '<div class="switch ' +
            (
              sheet.isFixed
                ? 'on-violet'
                : ''
            ) +
            '" id="fixedSwitch">' +
              '<div class="knob"></div>' +
            '</div>' +

          '</div>' +

        '</div>' +

        '<div class="field" id="budgetField" style="display:' +
        (
          sheet.type === 'expense'
            ? 'block'
            : 'none'
        ) +
        '">' +

          '<div class="field-label">Presupuesto mensual</div>' +

          '<input id="f-budget" type="text" inputmode="numeric" value="' +
          esc(formatThousandInput(sheet.budget)) +
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
          (valid ? '' : 'disabled') +
          '>Guardar</button>' +

        '</div>' +

      '</div>' +
    '</div>'
  );
}


export function renderCreditSheet(sheet){

  const valid =
    sheet.title.trim().length > 0 &&
    Number(sheet.total) > 0;

  return (
    '<div class="overlay">' +
      '<div class="sheet">' +

        '<div class="sheet-handle"></div>' +

        '<div class="sheet-head">' +
          '<h3>' +
          (
            sheet.mode === 'edit'
              ? 'Editar crédito'
              : 'Nuevo crédito'
          ) +
          '</h3>' +

          '<button data-action="close-sheet">' +
          icon('close') +
          '</button>' +
        '</div>' +

        '<div class="type-toggle">' +

          '<button class="' +
          (
            sheet.type === 'against'
              ? 'active-expense'
              : ''
          ) +
          '" data-action="credit-type" data-type="against">' +
          'Deuda</button>' +

          '<button class="' +
          (
            sheet.type === 'favor'
              ? 'active-income'
              : ''
          ) +
          '" data-action="credit-type" data-type="favor">' +
          'Cobro</button>' +

        '</div>' +

        '<div class="field">' +
          '<div class="field-label">Concepto / Persona</div>' +
          '<input id="c-title" value="' +
          esc(sheet.title) +
          '">' +
        '</div>' +

        '<div class="field">' +
          '<div class="field-label">Valor total</div>' +
          '<input id="c-total" type="text" inputmode="numeric" value="' +
          esc(formatThousandInput(sheet.total)) +
          '">' +
        '</div>' +

        '<div class="sheet-actions">' +

          (
            sheet.mode === 'edit'
              ? '<button class="del-btn" data-action="delete-credit">' +
                icon('trash') +
                '</button>'
              : ''
          ) +

          '<button class="save-btn" id="credit-save-btn" data-action="save-credit" ' +
          (valid ? '' : 'disabled') +
          '>Guardar</button>' +

        '</div>' +

      '</div>' +
    '</div>'
  );
}


export function renderPaymentSheet(sheet){

  const valid =
    Number(sheet.amount) > 0;

  return (
    '<div class="overlay">' +
      '<div class="sheet">' +

        '<div class="sheet-handle"></div>' +

        '<div class="sheet-head">' +
          '<h3>Registrar aporte</h3>' +

          '<button data-action="close-sheet">' +
          icon('close') +
          '</button>' +
        '</div>' +

        '<div class="field">' +
          '<div class="field-label">Monto</div>' +
          '<input id="p-amount" type="text" inputmode="numeric" value="' +
          esc(formatThousandInput(sheet.amount)) +
          '">' +
        '</div>' +

        '<div class="field">' +
          '<div class="field-label">Fecha</div>' +
          '<input id="p-date" type="date" value="' +
          esc(sheet.date) +
          '">' +
        '</div>' +

        '<div class="field">' +
          '<div class="field-label">Nota</div>' +
          '<input id="p-note" value="' +
          esc(sheet.note) +
          '">' +
        '</div>' +

        '<div class="sheet-actions">' +

          '<button class="save-btn" id="pay-save-btn" data-action="save-payment" ' +
          (valid ? '' : 'disabled') +
          '>Guardar aporte</button>' +

        '</div>' +

      '</div>' +
    '</div>'
  );
}


export function renderInvoiceItemsHTML(sheet){

  return sheet.items
    .map((it, idx) => (

      '<div class="item-edit-row">' +

        '<input class="item-name" data-idx="' +
        idx +
        '" data-field="name" placeholder="Ítem" value="' +
        esc(it.name) +
        '">' +

        '<input class="item-price" data-idx="' +
        idx +
        '" data-field="price" type="text" inputmode="numeric" placeholder="0" value="' +
        esc(formatThousandInput(it.price)) +
        '">' +

        '<button class="item-remove-btn" data-action="remove-invoice-item" data-idx="' +
        idx +
        '">' +
        icon('trash') +
        '</button>' +

      '</div>'

    ))
    .join('');
}


export function renderInvoiceSheet(sheet){

  const total =
    sheet.items.reduce(
      (s,it) =>
        s + (Number(it.price) || 0),
      0
    );

  const valid =
    sheet.items.some(
      it =>
        it.name.trim() &&
        Number(it.price) > 0
    );

  let html =
    '<div class="overlay">' +
      '<div class="sheet">' +

        '<div class="sheet-handle"></div>';

  html +=
    '<div class="sheet-head">' +
      '<h3>Revisar Factura Escaneada</h3>' +
      '<button data-action="close-sheet">' +
      icon('close') +
      '</button>' +
    '</div>';

  html +=
    '<div class="field">' +
      '<div class="field-label">Título</div>' +
      '<input id="inv-title" value="' +
      esc(sheet.title) +
      '">' +
    '</div>';

  html +=
    '<div class="field">' +
      '<div class="field-label">Fecha</div>' +
      '<input id="inv-date" type="date" value="' +
      esc(sheet.date) +
      '">' +
    '</div>';

  html +=
    '<div class="field-label" style="margin-bottom:8px;">' +
    'Ítems detectados</div>';

  html +=
    '<div id="inv-items-list">' +
    renderInvoiceItemsHTML(sheet) +
    '</div>';

  html +=
    '<button class="link-btn" data-action="add-invoice-item">' +
    '+ Agregar ítem</button>';

  html +=
    '<div class="mom-single" style="margin-top:14px;">' +
      '<div class="lbl">Total factura</div>' +
      '<div class="val" style="color:var(--pink)" id="inv-total-val">' +
      fmtMoney(total) +
      '</div>' +
    '</div>';

  html +=
    '<div class="sheet-actions" style="margin-top:14px;">';

  if (sheet.mode === 'edit') {
    html +=
      '<button class="del-btn" data-action="delete-invoice">' +
      icon('trash') +
      '</button>';
  }

  html +=
    '<button class="save-btn" id="invoice-save-btn" data-action="save-invoice" ' +
    (valid ? '' : 'disabled') +
    '>Guardar factura</button>';

  html +=
    '</div>' +
    '</div>' +
    '</div>';

  return html;
}


export function renderConfirmDialog(confirmState){

  return (
    '<div class="overlay overlay-center">' +
      '<div class="confirm-box">' +

        '<p>' +
        esc(confirmState.message) +
        '</p>' +

        '<div class="confirm-actions">' +

          '<button class="confirm-cancel" data-action="cancel-confirm">' +
          'Cancelar</button>' +

          '<button class="confirm-ok" data-action="confirm-ok">' +
          'Confirmar</button>' +

        '</div>' +

      '</div>' +
    '</div>'
  );
}


export function renderScanningOverlay(scanningOverlay){

  return (
    '<div class="overlay overlay-center">' +
      '<div class="confirm-box" style="text-align:center;">' +

        '<div class="spinner" style="margin:0 auto 14px;"></div>' +

        '<p>' +
        esc(scanningOverlay.message) +
        '</p>' +

      '</div>' +
    '</div>'
  );
}
