import {
  DB,
  SWATCHES,
  ICON_KEYS,
  ICON_EMOJI,
  DEFAULT_CATEGORIES,
  CURRENCIES,
  todayStr,
  saveDB
} from './state.js';

/* ==========================================================
   UTILIDADES
   ========================================================== */

export function esc(value){
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function fmtMoney(value){
  const amount = Number(value) || 0;
  const currency = DB.settings?.currency || 'COP';

  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    }).format(amount);
  } catch(e){
    return '$ ' + Math.round(amount).toLocaleString('es-CO');
  }
}

export function formatThousandInput(value){
  if (value === '' || value === null || value === undefined) return '';
  const n = Number(String(value).replace(/[^\d-]/g, ''));
  if (!Number.isFinite(n)) return '';
  return Math.round(n).toLocaleString('es-CO');
}

export function parseFormattedNumber(value){
  if (typeof value === 'number') return value;
  const raw = String(value ?? '').replace(/[^\d-]/g, '');
  return raw ? Number(raw) : 0;
}

export function monthKey(date){
  if (!date) return '';
  return String(date).substring(0, 7);
}

export function monthLabelStr(date){
  return new Intl.DateTimeFormat('es-CO', {
    month: 'long',
    year: 'numeric'
  }).format(date || new Date());
}

export function icon(name){
  const icons = {
    plus:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
      '<path d="M12 5v14M5 12h14"/>' +
      '</svg>',

    camera:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
      '<path d="M4 7h3l2-2h6l2 2h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"/>' +
      '<circle cx="12" cy="13" r="3"/>' +
      '</svg>',

    receipt:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
      '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z"/>' +
      '<path d="M9 8h6M9 12h6M9 16h4"/>' +
      '</svg>',

    gear:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
      '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>' +
      '<path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.41 1.41-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-2v-.09a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.41-1.41.06-.06A1.7 1.7 0 0 0 9.4 15a1.7 1.7 0 0 0-1.56-1.03H7v-2h.84A1.7 1.7 0 0 0 9.4 10a1.7 1.7 0 0 0-.34-1.88L9 8.06l1.41-1.41.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 13.38 5.5V5h2v.5a1.7 1.7 0 0 0 1.03 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.41 1.41-.06.06A1.7 1.7 0 0 0 19.4 10a1.7 1.7 0 0 0 1.56 1.03H21v2h-.04A1.7 1.7 0 0 0 19.4 15z"/>' +
      '</svg>',

    close:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
      '<path d="M6 6l12 12M18 6L6 18"/>' +
      '</svg>',

    trash:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
      '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3"/>' +
      '</svg>',

    edit:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
      '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>' +
      '<path d="M13.5 6.5l4 4"/>' +
      '</svg>',

    arrow:
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">' +
      '<path d="M9 18l6-6-6-6"/>' +
      '</svg>'
  };

  return icons[name] || icons.plus;
}

export function catById(id){
  return (DB.categories || []).find(c => c.id === id) || null;
}

export function isCreditPaymentTransaction(t){
  return !!(
    t &&
    t.type === 'expense' &&
    (
      t.source === 'credit-payment' ||
      t.sourceType === 'credit-payment'
    )
  );
}

export function currentMonthTx(){
  const key = monthKey(todayStr());
  return (DB.transactions || []).filter(t => monthKey(t.date) === key);
}

export function computeTotals(){
  let income = 0;
  let expense = 0;

  (DB.transactions || []).forEach(t => {
    const amount = Number(t.amount) || 0;

    if (t.type === 'income') {
      income += amount;
    } else if (t.type === 'expense') {
      expense += amount;
    }
  });

  return {
    income,
    expense,
    balance: income - expense
  };
}

export function computeMonthStats(){
  const tx = currentMonthTx();

  let income = 0;
  let expense = 0;

  tx.forEach(t => {
    const amount = Number(t.amount) || 0;

    if (t.type === 'income') {
      income += amount;
    } else if (t.type === 'expense') {
      expense += amount;
    }
  });

  const netSavings = income - expense;
  const savingsRate = income > 0
    ? Math.round((netSavings / income) * 100)
    : 0;

  return {
    income,
    expense,
    netSavings,
    savingsRate
  };
}

/* ==========================================================
   COMPARATIVA MES A MES
   ========================================================== */

export function computeMonthOverMonthMetrics(){
  const now = new Date();

  const currentMonthKey =
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const previousDate =
    new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const prevMonthKey =
    `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, '0')}`;

  let currentExpense = 0;
  let currentIncome = 0;
  let prevExpense = 0;
  let prevIncome = 0;

  const currentCatMap = {};
  const prevCatMap = {};

  (DB.transactions || []).forEach(t => {
    const amount = Number(t.amount) || 0;
    const mKey = monthKey(t.date);

    if (mKey === currentMonthKey) {
      if (t.type === 'expense') {
        currentExpense += amount;

        if (!isCreditPaymentTransaction(t)) {
          currentCatMap[t.categoryId] =
            (currentCatMap[t.categoryId] || 0) + amount;
        }
      } else if (t.type === 'income') {
        currentIncome += amount;
      }
    }

    if (mKey === prevMonthKey) {
      if (t.type === 'expense') {
        prevExpense += amount;

        if (!isCreditPaymentTransaction(t)) {
          prevCatMap[t.categoryId] =
            (prevCatMap[t.categoryId] || 0) + amount;
        }
      } else if (t.type === 'income') {
        prevIncome += amount;
      }
    }
  });

  const currentSavings = currentIncome - currentExpense;
  const prevSavings = prevIncome - prevExpense;

  const expChangePct =
    prevExpense > 0
      ? Math.round(((currentExpense - prevExpense) / prevExpense) * 100)
      : (currentExpense > 0 ? 100 : 0);

  const incChangePct =
    prevIncome > 0
      ? Math.round(((currentIncome - prevIncome) / prevIncome) * 100)
      : (currentIncome > 0 ? 100 : 0);

  let highestGrowthCat = null;
  let maxDiff = -Infinity;

  Object.keys(currentCatMap).forEach(catId => {
    const diff =
      currentCatMap[catId] - (prevCatMap[catId] || 0);

    if (
      diff > maxDiff &&
      diff > 0
    ){
      maxDiff = diff;
      highestGrowthCat = catById(catId);
    }
  });

  const savingsRate =
    currentIncome > 0
      ? Math.max(
          0,
          Math.round((currentSavings / currentIncome) * 100)
        )
      : 0;

  return {
    expChangePct,
    currentExpense,
    prevExpense,
    incChangePct,
    currentIncome,
    prevIncome,
    currentSavings,
    prevSavings,
    savingsRate,
    highestGrowthCat,
    maxDiff
  };
}

/* ==========================================================
   CATEGORÍAS
   ========================================================== */

export function computeCategoryTotals(){
  const map = {};

  currentMonthTx().forEach(t => {
    if (
      t.type === 'expense' &&
      !isCreditPaymentTransaction(t)
    ){
      map[t.categoryId] =
        (map[t.categoryId] || 0) +
        (Number(t.amount) || 0);
    }
  });

  return Object.entries(map)
    .map(([id, total]) => ({
      id,
      total,
      cat: catById(id)
    }))
    .filter(r => r.cat)
    .sort((a, b) => b.total - a.total);
}

/* ==========================================================
   RITMO DE GASTO
   ========================================================== */

export function computeBurnMetrics(){
  const today = new Date();

  const daysInMonth =
    new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    ).getDate();

  const currentDay = today.getDate();

  const daysRemaining =
    Math.max(
      1,
      daysInMonth - currentDay + 1
    );

  const monthPctPassed =
    Math.round(
      (currentDay / daysInMonth) * 100
    );

  const totals = computeTotals();
  const monthStats = computeMonthStats();

  const availableFunds =
    totals.balance > 0
      ? totals.balance
      : Math.max(
          0,
          monthStats.income - monthStats.expense
        );

  const dailyAvailable =
    Math.max(0, availableFunds) /
    daysRemaining;

  const fixedCatIds =
    DB.categories
      .filter(c =>
        c.isFixed ||
        c.icon === 'home' ||
        c.icon === 'zap' ||
        (c.name || '')
          .toLowerCase()
          .includes('arriendo') ||
        (c.name || '')
          .toLowerCase()
          .includes('servicio')
      )
      .map(c => c.id);

  const isDailyExpense = t =>
    t &&
    t.type === 'expense' &&
    !isCreditPaymentTransaction(t) &&
    !fixedCatIds.includes(t.categoryId) &&
    !!t.date;

  const periodNumber =
    currentDay <= 10
      ? 0
      : (
          currentDay <= 20
            ? 1
            : 2
        );

  const periodStartDay =
    periodNumber === 0
      ? 1
      : (
          periodNumber === 1
            ? 11
            : 21
        );

  const periodEndDay =
    periodNumber === 0
      ? 10
      : (
          periodNumber === 1
            ? 20
            : daysInMonth
        );

  const currentPeriodDays =
    currentDay - periodStartDay + 1;

  const periodExpenses = [0, 0, 0];

  DB.transactions.forEach(t => {
    if (!isDailyExpense(t)) return;

    const tDate =
      new Date(t.date + 'T00:00:00');

    if (
      Number.isNaN(tDate.getTime()) ||
      tDate.getFullYear() !== today.getFullYear() ||
      tDate.getMonth() !== today.getMonth()
    ){
      return;
    }

    const day = tDate.getDate();

    if (day > currentDay) return;

    const p =
      day <= 10
        ? 0
        : (
            day <= 20
              ? 1
              : 2
          );

    periodExpenses[p] +=
      Number(t.amount) || 0;
  });

  const currentPeriodExpense =
    periodExpenses[periodNumber];

  let avgDailyBurn =
    currentPeriodExpense > 0
      ? currentPeriodExpense / currentPeriodDays
      : 0;

  if (avgDailyBurn <= 0){
    for (
      let p = periodNumber - 1;
      p >= 0;
      p--
    ){
      if (periodExpenses[p] > 0){
        avgDailyBurn =
          periodExpenses[p] / 10;
        break;
      }
    }
  }

  const runwayDays =
    (
      avgDailyBurn > 0 &&
      totals.balance > 0
    )
      ? Math.floor(
          totals.balance /
          avgDailyBurn
        )
      : 0;

  return {
    daysRemaining,
    daysInMonth,
    currentDay,
    monthPctPassed,
    dailyAvailable,
    avgDailyBurn,
    currentPeriodExpense,
    currentPeriodDays,
    periodNumber,
    periodStartDay,
    periodEndDay,
    periodExpenses,
    runwayDays
  };
}

/* ==========================================================
   PRESUPUESTOS
   ========================================================== */

export function computeBudgetRows(){
  const totals = computeCategoryTotals();
  const burn = computeBurnMetrics();

  return DB.categories
    .filter(c =>
      c.type === 'expense' &&
      c.budget
    )
    .map(c => {
      const spent =
        (
          totals.find(r => r.id === c.id) || {}
        ).total || 0;

      const spentPct =
        Math.min(
          100,
          Math.round(
            (spent / c.budget) * 100
          )
        );

      const over =
        spent > c.budget;

      const isPacingFast =
        !over &&
        (
          spentPct >
          burn.monthPctPassed + 10
        );

      return {
        cat: c,
        spent,
        pct: spentPct,
        over,
        isPacingFast
      };
    });
}

/* ==========================================================
   PAGOS A CRÉDITOS
   ========================================================== */

export function computeCreditsPaidThisMonth(){
  const now = new Date();

  const currentMonthKey =
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return (DB.credits || [])
    .filter(c => c.type === 'against')
    .reduce((sum, c) => {
      const monthlyPaid =
        (c.payments || [])
          .filter(p =>
            p.date &&
            typeof p.date === 'string' &&
            p.date.substring(0, 7) === currentMonthKey
          )
          .reduce(
            (s, p) =>
              s + (Number(p.amount) || 0),
            0
          );

      return sum + monthlyPaid;
    }, 0);
}

/* ==========================================================
   GRÁFICO CIRCULAR
   ========================================================== */

export function expensePieSVG(
  catTotals,
  monthExpense,
  monthIncome,
  creditsPaid = 0,
  uncategorizedExpense = 0
){
  const totalExpense =
    Math.max(
      0,
      Number(monthExpense) || 0
    );

  const income =
    Math.max(
      0,
      Number(monthIncome) || 0
    );

  const credits =
    Math.max(
      0,
      Number(creditsPaid) || 0
    );

  const uncategorized =
    Math.max(
      0,
      Number(uncategorizedExpense) || 0
    );

  if (totalExpense <= 0) return '';

  const r = 44;
  const stroke = 16;

  const circumference =
    2 * Math.PI * r;

  const gap = 2.4;

  /*
   * Paleta de categorías.
   *
   * El vino tinto queda reservado exclusivamente
   * para "Pago a créditos".
   */
  const palette = [
    '#38BDF8',
    '#A78BFA',
    '#F59E0B',
    '#34D399',
    '#FB7185',
    '#F97316',
    '#22D3EE',
    '#C084FC',
    '#84CC16',
    '#E879F9',
    '#2DD4BF',
    '#FACC15'
  ];

  const CREDIT_COLOR = '#7A1F3D';
  const UNCATEGORIZED_COLOR = '#8B85A3';
  const TRACK_COLOR = '#172033';

  const used =
    new Set([
      CREDIT_COLOR,
      UNCATEGORIZED_COLOR,
      TRACK_COLOR
    ].map(c => c.toUpperCase()));

  const colorMap = new Map();

  let paletteIndex = 0;

  catTotals.forEach(r => {
    const original =
      String(
        r.cat?.color || ''
      ).trim();

    const normalized =
      original.toUpperCase();

    if (
      original &&
      !used.has(normalized)
    ){
      colorMap.set(
        r.id,
        original
      );

      used.add(normalized);

      return;
    }

    let selected = null;

    for (
      let i = 0;
      i < palette.length;
      i++
    ){
      const candidate =
        palette[
          paletteIndex %
          palette.length
        ];

      paletteIndex++;

      if (
        !used.has(
          candidate.toUpperCase()
        )
      ){
        selected = candidate;
        break;
      }
    }

    selected =
      selected ||
      palette[
        (paletteIndex++) %
        palette.length
      ];

    colorMap.set(
      r.id,
      selected
    );

    used.add(
      selected.toUpperCase()
    );
  });

  const slices = [];

  catTotals.forEach(r => {
    const value =
      Math.max(
        0,
        Number(r.total) || 0
      );

    if (value > 0){
      slices.push({
        value,
        color:
          colorMap.get(r.id) ||
          '#38BDF8'
      });
    }
  });

  /*
   * "Sin categoría" sí hace parte de las salidas.
   */
  if (uncategorized > 0){
    slices.push({
      value: uncategorized,
      color: UNCATEGORIZED_COLOR
    });
  }

  /*
   * "Pago a créditos" sí hace parte de las salidas,
   * pero utiliza vino tinto para distinguirlo claramente.
   */
  if (credits > 0){
    slices.push({
      value: credits,
      color: CREDIT_COLOR
    });
  }

  /*
   * IMPORTANTE:
   * El anillo representa exclusivamente las salidas.
   *
   * "Disponible" NO se agrega como segmento gris.
   * La parte disponible queda como espacio vacío.
   */
  const ringTotal =
    slices.reduce(
      (sum, slice) =>
        sum + slice.value,
      0
    ) || totalExpense;

  const gapTotal =
    Math.min(
      gap * slices.length,
      circumference * 0.16
    );

  const usable =
    Math.max(
      0,
      circumference - gapTotal
    );

  let offset = 0;

  let svg =
    '<svg viewBox="0 0 120 120" aria-label="Distribución de gastos, pagos a créditos y disponible">';

  /*
   * Track oscuro:
   * funciona como el "vacío" del gráfico.
   */
  svg +=
    '<circle cx="60" cy="60" r="44" fill="none" stroke="' +
    TRACK_COLOR +
    '" stroke-width="' +
    stroke +
    '"/>';

  slices.forEach(slice => {
    const ratio =
      slice.value / ringTotal;

    const rawLength =
      ratio * usable;

    const segmentGap =
      slices.length > 1
        ? Math.min(
            gap,
            rawLength * 0.18
          )
        : 0;

    const dash =
      Math.max(
        0,
        rawLength - segmentGap
      );

    if (dash > 0.4){
      svg +=
        '<circle cx="60" cy="60" r="44" fill="none" stroke="' +
        slice.color +
        '" stroke-width="' +
        stroke +
        '" stroke-dasharray="' +
        dash.toFixed(2) +
        ' ' +
        (
          circumference - dash
        ).toFixed(2) +
        '" stroke-dashoffset="' +
        (-offset).toFixed(2) +
        '" transform="rotate(-90 60 60)" stroke-linecap="butt"/>';
    }

    offset += rawLength;
  });

  svg += '</svg>';

  return svg;
}

/* ==========================================================
   DASHBOARD
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
    DB.categories.filter(
      c => c.type === 'expense'
    );

  let html = '';

  /* --------------------------------------------------------
     BALANCE
     -------------------------------------------------------- */

  html += '<div class="balance-card">';

  html +=
    '<div class="balance-label">Balance disponible</div>';

  html +=
    '<div class="balance-amount" style="color:' +
    balColor +
    '">' +
    fmtMoney(totals.balance) +
    '</div>';

  html +=
    '<div class="balance-month">' +
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
        fmtMoney(month.netSavings) +
      '</span>' +
    '</div>';

  html +=
    '<div class="b-metric">' +
      '<span class="lbl">Tasa de ahorro</span>' +
      '<span class="val sav">' +
        month.savingsRate +
        '%' +
      '</span>' +
    '</div>';

  html += '</div></div>';

  /* --------------------------------------------------------
     RITMO DE GASTO DIARIO
     -------------------------------------------------------- */

  html += '<div class="card">';

  html +=
    '<div class="section-title">Ritmo de Gasto Diario</div>';

  html += '<div class="burn-card">';

  html +=
    '<div class="burn-info">' +
      '<span class="burn-lbl">Disponible sugerido por día</span>' +
      '<span class="burn-val" style="color:var(--pink)">' +
        fmtMoney(burn.dailyAvailable) +
      '</span>' +
    '</div>';

  html +=
    '<div class="burn-info">' +
      '<span class="burn-lbl">Gasto diario actual</span>' +
      '<span class="burn-val">' +
        fmtMoney(burn.avgDailyBurn) +
      '</span>' +
    '</div>';

  html +=
    '<div class="burn-progress">' +
      '<div class="burn-bar">' +
        '<div class="burn-fill" style="width:' +
          Math.min(
            100,
            burn.dailyAvailable > 0
              ? (
                  burn.avgDailyBurn /
                  burn.dailyAvailable
                ) * 100
              : 0
          ) +
          '%"></div>' +
      '</div>' +
    '</div>';

  html +=
    '<div class="burn-footer">' +
      '<span>Día ' +
        burn.currentDay +
        ' de ' +
        burn.daysInMonth +
      '</span>' +
      '<span>' +
        burn.runwayDays +
        ' días de margen</span>' +
    '</div>';

  html += '</div></div>';

  /* --------------------------------------------------------
     DISTRIBUCIÓN DE GASTOS
     -------------------------------------------------------- */

  html += '<div class="card">';

  html +=
    '<div class="section-title">Distribución de gastos</div>';

  if (month.expense > 0){

    const creditsPaid =
      computeCreditsPaidThisMonth();

    const categorizedExpense =
      catTotals.reduce(
        (sum, r) =>
          sum + (Number(r.total) || 0),
        0
      );

    const uncategorizedExpense =
      Math.max(
        0,
        month.expense -
        categorizedExpense -
        creditsPaid
      );

    /*
     * Porcentaje utilizado:
     * salidas / ingresos.
     */
    const spentPct =
      month.income > 0
        ? Math.max(
            0,
            (month.expense /
              month.income) *
            100
          )
        : 0;

    /*
     * Porcentaje disponible:
     * ingreso restante después de todas las salidas.
     *
     * Nunca negativo.
     */
    const availablePct =
      month.income > 0
        ? Math.max(
            0,
            (
              (
                month.income -
                month.expense
              ) /
              month.income
            ) * 100
          )
        : 0;

    /*
     * Se crea un mapa de colores para evitar que
     * una categoría normal tenga el mismo color
     * que Pago a créditos.
     */
    const palette = [
      '#38BDF8',
      '#A78BFA',
      '#F59E0B',
      '#34D399',
      '#FB7185',
      '#F97316',
      '#22D3EE',
      '#C084FC',
      '#84CC16',
      '#E879F9',
      '#2DD4BF',
      '#FACC15'
    ];

    const CREDIT_COLOR = '#7A1F3D';
    const UNCATEGORIZED_COLOR = '#8B85A3';
    const TRACK_COLOR = '#172033';

    const reserved = new Set([
      CREDIT_COLOR.toUpperCase(),
      UNCATEGORIZED_COLOR.toUpperCase(),
      TRACK_COLOR.toUpperCase()
    ]);

    const colorMap = new Map();
    let colorIndex = 0;

    catTotals.forEach(r => {
      const original =
        String(
          r.cat?.color || ''
        ).trim();

      const normalized =
        original.toUpperCase();

      if (
        original &&
        !reserved.has(normalized)
      ){
        colorMap.set(
          r.id,
          original
        );

        reserved.add(normalized);

        return;
      }

      let selected = null;

      for (
        let i = 0;
        i < palette.length;
        i++
      ){
        const candidate =
          palette[
            colorIndex %
            palette.length
          ];

        colorIndex++;

        if (
          !reserved.has(
            candidate.toUpperCase()
          )
        ){
          selected = candidate;
          break;
        }
      }

      selected =
        selected ||
        palette[
          colorIndex %
          palette.length
        ];

      colorMap.set(
        r.id,
        selected
      );

      reserved.add(
        selected.toUpperCase()
      );
    });

    const chartCats =
      catTotals.map(r => ({
        ...r,
        cat: {
          ...r.cat,
          color:
            colorMap.get(r.id) ||
            r.cat.color
        }
      }));

    html += '<div class="pie-layout">';

    html +=
      '<div class="pie-chart">' +
        expensePieSVG(
          chartCats,
          month.expense,
          month.income,
          creditsPaid,
          uncategorizedExpense
        ) +
        '<div class="pie-center">' +
          '<strong>' +
            (
              month.income > 0
                ? spentPct.toFixed(0) + '%'
                : '—'
            ) +
          '</strong>' +
          '<span>' +
            (
              month.income > 0
                ? 'del ingreso utilizado'
                : 'sin ingreso'
            ) +
          '</span>' +
        '</div>' +
      '</div>';

    html += '<div class="pie-legend">';

    const expenseBase =
      Number(month.expense) || 0;

    /* Categorías normales */

    catTotals.forEach(r => {

      const pct =
        expenseBase > 0
          ? (
              Number(r.total) /
              expenseBase
            ) * 100
          : 0;

      html +=
        '<div class="pie-legend-row">' +
          '<span class="pie-dot" style="background:' +
            colorMap.get(r.id) +
          '"></span>' +
          '<span class="pie-name">' +
            esc(r.cat.name) +
          '</span>' +
          '<span class="pie-pct">' +
            (
              pct < 0.1
                ? '<0.1'
                : pct.toFixed(1)
            ) +
            '%' +
          '</span>' +
        '</div>';
    });

    /* Sin categoría */

    if (uncategorizedExpense > 0){

      const pct =
        (
          uncategorizedExpense /
          expenseBase
        ) * 100;

      html +=
        '<div class="pie-legend-row">' +
          '<span class="pie-dot" style="background:' +
            UNCATEGORIZED_COLOR +
          '"></span>' +
          '<span class="pie-name">Sin categoría</span>' +
          '<span class="pie-pct">' +
            (
              pct < 0.1
                ? '<0.1'
                : pct.toFixed(1)
            ) +
            '%' +
          '</span>' +
        '</div>';
    }

    /* Pago a créditos */

    if (creditsPaid > 0){

      const pct =
        expenseBase > 0
          ? (
              creditsPaid /
              expenseBase
            ) * 100
          : 0;

      html +=
        '<div class="pie-legend-row">' +
          '<span class="pie-dot" style="background:' +
            CREDIT_COLOR +
          '"></span>' +
          '<span class="pie-name">Pago a créditos</span>' +
          '<span class="pie-pct">' +
            (
              pct < 0.1
                ? '<0.1'
                : pct.toFixed(1)
            ) +
            '%' +
          '</span>' +
        '</div>';
    }

    /*
     * DISPONIBLE
     *
     * Se muestra SIEMPRE en la leyenda cuando hay ingreso.
     *
     * IMPORTANTE:
     * NO se agrega al SVG.
     * Por eso la parte disponible queda vacía
     * en lugar de aparecer como una porción gris.
     */
    html +=
      '<div class="pie-legend-row">' +
        '<span class="pie-dot" style="background:#9CA3AF"></span>' +
        '<span class="pie-name" style="color:#9CA3AF">Disponible</span>' +
        '<span class="pie-pct" style="color:#9CA3AF">' +
          (
            month.income > 0
              ? (
                  availablePct < 0.1
                    ? '0'
                    : availablePct.toFixed(1)
                )
              : '—'
          ) +
          '%' +
        '</span>' +
      '</div>';

    html += '</div></div>';

  } else {

    html +=
      '<div class="empty-hint">' +
        'Aún no hay gastos registrados este mes. Usa los botones de arriba o el + para agregar.' +
      '</div>';
  }

  html += '</div>';

  /* --------------------------------------------------------
     COMPARATIVA MES A MES
     -------------------------------------------------------- */

  html +=
    '<div class="mom-card">' +
      '<div class="mom-header">' +
        '<span class="mom-title">📊 Comparativa Mes a Mes</span>' +
        '<div class="mom-dots">';

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
        '</div>' +
      '</div>';

  html +=
    '<div class="mom-grid">' +
      '<div class="mom-item">' +
        '<span class="mom-label">Gastos</span>' +
        '<strong>' +
          fmtMoney(mom.currentExpense) +
        '</strong>' +
        '<small>' +
          (
            mom.expChangePct >= 0
              ? '↑ '
              : '↓ '
          ) +
          Math.abs(mom.expChangePct) +
          '% vs mes anterior' +
        '</small>' +
      '</div>' +

      '<div class="mom-item">' +
        '<span class="mom-label">Ingresos</span>' +
        '<strong>' +
          fmtMoney(mom.currentIncome) +
        '</strong>' +
        '<small>' +
          (
            mom.incChangePct >= 0
              ? '↑ '
              : '↓ '
          ) +
          Math.abs(mom.incChangePct) +
          '% vs mes anterior' +
        '</small>' +
      '</div>' +

      '<div class="mom-item">' +
        '<span class="mom-label">Ahorro</span>' +
        '<strong>' +
          fmtMoney(mom.currentSavings) +
        '</strong>' +
        '<small>' +
          mom.savingsRate +
          '% del ingreso' +
        '</small>' +
      '</div>' +

      '<div class="mom-item">' +
        '<span class="mom-label">Tendencia</span>' +
        '<strong>' +
          (
            mom.expChangePct > 10
              ? '↑'
              : (
                  mom.expChangePct < -10
                    ? '↓'
                    : '→'
                )
          ) +
        '</strong>' +
        '<small>' +
          (
            mom.expChangePct > 10
              ? 'Mayor gasto'
              : (
                  mom.expChangePct < -10
                    ? 'Menor gasto'
                    : 'Estable'
                )
          ) +
        '</small>' +
      '</div>' +
    '</div>';

  html += '</div>';

  /* --------------------------------------------------------
     INSIGHT
     -------------------------------------------------------- */

  if (mom.highestGrowthCat){

    html +=
      '<div class="mom-insight">' +
        '<span>💡</span>' +
        '<div>' +
          '<b>Atención en ' +
            esc(mom.highestGrowthCat.name) +
          ':</b> Tu gasto subió ' +
          fmtMoney(mom.maxDiff) +
          ' respecto al mes anterior.' +
        '</div>' +
      '</div>';

  } else {

    html +=
      '<div class="mom-insight">' +
        '<span>✨</span>' +
        '<div>' +
          '<b>¡Buen control!</b> Patrones de consumo estables.' +
        '</div>' +
      '</div>';
  }

  /* --------------------------------------------------------
     PRESUPUESTOS
     -------------------------------------------------------- */

  if (budgets.length){

    html +=
      '<div class="card" style="margin-top:16px">' +
        '<div class="section-title">Presupuestos</div>';

    budgets.forEach(b => {

      let barColor =
        b.cat.color;

      if (b.over){
        barColor =
          'var(--expense)';
      } else if (b.isPacingFast){
        barColor =
          'var(--amber)';
      }

      html +=
        '<div class="budget-row">' +
          '<div class="budget-head">' +
            '<span>' +
              esc(b.cat.name) +
            '</span>' +
            '<span>' +
              fmtMoney(b.spent) +
              ' / ' +
              fmtMoney(b.cat.budget) +
            '</span>' +
          '</div>' +

          '<div class="budget-track">' +
            '<div class="budget-fill" style="width:' +
              b.pct +
              '%;background:' +
              barColor +
            '"></div>' +
          '</div>' +

          '<div class="budget-foot">' +
            '<span>' +
              b.pct +
              '%' +
            '</span>' +
            '<span>' +
              (
                b.over
                  ? 'Excedido'
                  : (
                      b.isPacingFast
                        ? 'Ritmo alto'
                        : 'En control'
                    )
              ) +
            '</span>' +
          '</div>' +
        '</div>';
    });

    html += '</div>';
  }

  return html;
}

/* ==========================================================
   MOVIMIENTOS
   ========================================================== */

export function filteredTx(search = '', filter = 'all'){
  let tx =
    Array.isArray(DB.transactions)
      ? [...DB.transactions]
      : [];

  if (filter === 'income'){
    tx =
      tx.filter(
        t => t.type === 'income'
      );
  }

  if (filter === 'expense'){
    tx =
      tx.filter(
        t => t.type === 'expense'
      );
  }

  const q =
    String(search || '')
      .trim()
      .toLowerCase();

  if (q){
    tx =
      tx.filter(t => {
        const cat =
          catById(t.categoryId);

        const title =
          isCreditPaymentTransaction(t)
            ? 'Pago a créditos'
            : (
                cat
                  ? cat.name
                  : ''
              );

        return (
          String(t.note || '')
            .toLowerCase()
            .includes(q) ||
          title
            .toLowerCase()
            .includes(q) ||
          String(t.amount || '')
            .includes(q)
        );
      });
  }

  return tx.sort(
    (a, b) =>
      String(b.date || '')
        .localeCompare(
          String(a.date || '')
        )
  );
}

export function renderTxRow(t){
  const isIncome =
    t.type === 'income';

  const isCreditPayment =
    isCreditPaymentTransaction(t);

  const cat =
    catById(t.categoryId);

  const title =
    isCreditPayment
      ? 'Pago a créditos'
      : (
          cat
            ? cat.name
            : 'Sin categoría'
        );

  const emoji =
    isCreditPayment
      ? '💳'
      : (
          cat
            ? (
                ICON_EMOJI[cat.icon] ||
                '⭐'
              )
            : '⭐'
        );

  const color =
    isCreditPayment
      ? '#7A1F3D'
      : (
          isIncome
            ? 'var(--income)'
            : (
                cat?.color ||
                'var(--expense)'
              )
        );

  const note =
    isCreditPayment
      ? String(
          t.note || ''
        ).replace(
          /^Pago a créditos\s*·\s*/,
          ''
        )
      : (
          t.note || ''
        );

  return `
    <div class="tx-row">
      <div class="tx-avatar" style="background:${color}20">
        ${emoji}
      </div>

      <div class="tx-main">
        <div class="tx-title">
          ${esc(title)}
        </div>

        ${
          note
            ? `<div class="tx-note">${esc(note)}</div>`
            : ''
        }

        <div class="tx-date">
          ${esc(t.date || '')}
        </div>
      </div>

      <div class="tx-right">
        <div class="tx-amount" style="color:${color}">
          ${
            isIncome
              ? '+'
              : '−'
          }${fmtMoney(t.amount)}
        </div>

        <button
          class="tx-edit"
          data-action="${
            isCreditPayment
              ? 'edit-credit-payment'
              : 'edit-tx'
          }"
          data-id="${esc(t.id)}"
          ${
            isCreditPayment
              ? `data-cid="${esc(t.sourceCreditId || '')}" data-pid="${esc(t.sourcePaymentId || '')}"`
              : ''
          }
        >
          ${icon('edit')}
        </button>
      </div>
    </div>
  `;
}

export function renderTransactions(
  search = '',
  filter = 'all'
){
  const tx =
    filteredTx(
      search,
      filter
    );

  let html = '';

  html +=
    '<div class="page-header">' +
      '<div>' +
        '<h2>Movimientos</h2>' +
        '<p>Tu actividad financiera</p>' +
      '</div>' +
    '</div>';

  html +=
    '<div class="search-box">' +
      '<span>⌕</span>' +
      '<input id="tx-search" value="' +
        esc(search) +
        '" placeholder="Buscar movimiento...">' +
    '</div>';

  html +=
    '<div class="filter-tabs">' +
      '<button class="' +
        (
          filter === 'all'
            ? 'active'
            : ''
        ) +
        '" data-action="tx-filter" data-filter="all">Todos</button>' +

      '<button class="' +
        (
          filter === 'income'
            ? 'active'
            : ''
        ) +
        '" data-action="tx-filter" data-filter="income">Ingresos</button>' +

      '<button class="' +
        (
          filter === 'expense'
            ? 'active'
            : ''
        ) +
        '" data-action="tx-filter" data-filter="expense">Gastos</button>' +
    '</div>';

  html +=
    '<div class="card tx-list-card">';

  if (!tx.length){

    html +=
      '<div class="empty-state">' +
        '<div class="empty-icon">📊</div>' +
        '<h3>Sin movimientos</h3>' +
        '<p>No hay movimientos que coincidan con tu búsqueda.</p>' +
      '</div>';

  } else {

    tx.forEach(t => {
      html += renderTxRow(t);
    });
  }

  html += '</div>';

  return html;
}

/* ==========================================================
   FACTURAS
   ========================================================== */

export function renderInvoices(
  openInvoiceId = null
){
  const invoices =
    Array.isArray(DB.invoices)
      ? DB.invoices
      : [];

  let html = '';

  html +=
    '<div class="page-header">' +
      '<div>' +
        '<h2>Facturas</h2>' +
        '<p>Facturas escaneadas con IA</p>' +
      '</div>' +
    '</div>';

  if (!invoices.length){

    html +=
      '<div class="card empty-state">' +
        '<div class="empty-icon">🧾</div>' +
        '<h3>Aún no tienes facturas</h3>' +
        '<p>Usa el botón + para escanear una factura con IA.</p>' +
      '</div>';

    return html;
  }

  html += '<div class="invoice-list">';

  invoices.forEach(inv => {

    const total =
      (inv.items || [])
        .reduce(
          (sum, item) =>
            sum +
            (Number(item.price) || 0),
          0
        );

    html +=
      '<div class="card invoice-card">' +
        '<div class="invoice-head">' +
          '<div>' +
            '<h3>' +
              esc(
                inv.title ||
                'Factura'
              ) +
            '</h3>' +
            '<span>' +
              esc(inv.date || '') +
            '</span>' +
          '</div>' +

          '<strong>' +
            fmtMoney(total) +
          '</strong>' +
        '</div>' +

        '<button class="secondary-btn" data-action="open-invoice" data-id="' +
          esc(inv.id) +
          '">' +
          (
            openInvoiceId === inv.id
              ? 'Ocultar detalle'
              : 'Ver detalle'
          ) +
        '</button>';

    if (openInvoiceId === inv.id){

      html +=
        '<div class="invoice-items">';

      (inv.items || [])
        .forEach(item => {

          html +=
            '<div class="invoice-item">' +
              '<span>' +
                esc(item.name || 'Producto') +
              '</span>' +
              '<strong>' +
                fmtMoney(item.price) +
              '</strong>' +
            '</div>';
        });

      html += '</div>';
    }

    html += '</div>';
  });

  html += '</div>';

  return html;
}

export function renderInvoiceItemsHTML(
  items = []
){
  return items.map((item, idx) => `
    <div class="invoice-edit-item">
      <input
        data-idx="${idx}"
        data-field="name"
        value="${esc(item.name || '')}"
        placeholder="Producto"
      >

      <input
        data-idx="${idx}"
        data-field="price"
        inputmode="numeric"
        value="${esc(formatThousandInput(item.price))}"
        placeholder="0"
      >
    </div>
  `).join('');
}

/* ==========================================================
   CRÉDITOS
   ========================================================== */

export function computeCreditPaymentBreakdown(
  credit
){
  const total =
    Number(credit?.total) || 0;

  const paid =
    (credit?.payments || [])
      .reduce(
        (sum, p) =>
          sum +
          (Number(p.amount) || 0),
        0
      );

  const pending =
    Math.max(
      0,
      total - paid
    );

  const pct =
    total > 0
      ? Math.min(
          100,
          Math.round(
            (paid / total) * 100
          )
        )
      : 0;

  return {
    total,
    paid,
    pending,
    pct
  };
}

export function renderCredits(
  filter = 'against'
){
  const credits =
    (DB.credits || [])
      .filter(c =>
        c.type === filter
      );

  let html = '';

  html +=
    '<div class="page-header">' +
      '<div>' +
        '<h2>Créditos</h2>' +
        '<p>Control de tus compromisos financieros</p>' +
      '</div>' +
    '</div>';

  html +=
    '<div class="type-toggle credit-toggle">' +
      '<button class="' +
        (
          filter === 'against'
            ? 'active-expense'
            : ''
        ) +
        '" data-action="credit-filter" data-filter="against">' +
        'Mis créditos' +
      '</button>' +

      '<button class="' +
        (
          filter === 'favor'
            ? 'active-income'
            : ''
        ) +
        '" data-action="credit-filter" data-filter="favor">' +
        'Me deben' +
      '</button>' +
    '</div>';

  if (!credits.length){

    html +=
      '<div class="card empty-state">' +
        '<div class="empty-icon">💳</div>' +
        '<h3>No hay créditos registrados</h3>' +
        '<p>Agrega un crédito para comenzar a hacer seguimiento.</p>' +
      '</div>';

    return html;
  }

  html += '<div class="credit-list">';

  credits.forEach(c => {

    const info =
      computeCreditPaymentBreakdown(c);

    html +=
      '<div class="card credit-card">' +

        '<div class="credit-head">' +
          '<div>' +
            '<h3>' +
              esc(c.title || 'Crédito') +
            '</h3>' +
            '<span>' +
              (
                c.type === 'against'
                  ? 'Debo'
                  : 'Me deben'
              ) +
            '</span>' +
          '</div>' +

          '<button class="icon-btn" data-action="edit-credit" data-id="' +
            esc(c.id) +
          '">' +
            icon('edit') +
          '</button>' +
        '</div>' +

        '<div class="credit-amounts">' +
          '<div>' +
            '<span>Total</span>' +
            '<strong>' +
              fmtMoney(info.total) +
            '</strong>' +
          '</div>' +

          '<div>' +
            '<span>Pagado</span>' +
            '<strong>' +
              fmtMoney(info.paid) +
            '</strong>' +
          '</div>' +

          '<div>' +
            '<span>Pendiente</span>' +
            '<strong>' +
              fmtMoney(info.pending) +
            '</strong>' +
          '</div>' +
        '</div>' +

        '<div class="credit-progress">' +
          '<div class="credit-progress-head">' +
            '<span>Avance</span>' +
            '<span>' +
              info.pct +
              '%' +
            '</span>' +
          '</div>' +

          '<div class="credit-progress-track">' +
            '<div class="credit-progress-fill" style="width:' +
              info.pct +
              '%"></div>' +
          '</div>' +
        '</div>' +

        '<div class="credit-actions">' +
          '<button class="save-btn" data-action="new-payment" data-id="' +
            esc(c.id) +
          '">' +
            'Registrar pago' +
          '</button>' +

          '<button class="secondary-btn" data-action="edit-credit" data-id="' +
            esc(c.id) +
          '">' +
            'Ver / editar' +
          '</button>' +
        '</div>';

    if ((c.payments || []).length){

      html +=
        '<div class="payment-history">' +
          '<div class="payment-history-title">Pagos registrados</div>';

      (c.payments || [])
        .slice()
        .sort(
          (a, b) =>
            String(b.date || '')
              .localeCompare(
                String(a.date || '')
              )
        )
        .forEach(p => {

          html +=
            '<div class="payment-row">' +
              '<div>' +
                '<strong>' +
                  fmtMoney(p.amount) +
                '</strong>' +
                '<span>' +
                  esc(p.date || '') +
                '</span>' +
                (
                  p.note
                    ? '<small>' +
                        esc(p.note) +
                      '</small>'
                    : ''
                ) +
              '</div>' +

              '<button class="icon-btn" data-action="edit-payment" data-cid="' +
                esc(c.id) +
                '" data-pid="' +
                esc(p.id) +
                '">' +
                icon('edit') +
              '</button>' +
            '</div>';
        });

      html += '</div>';
    }

    html += '</div>';
  });

  html += '</div>';

  return html;
}

/* ==========================================================
   CATEGORÍAS
   ========================================================== */

export function renderCategories(){
  let html = '';

  html +=
    '<div class="page-header">' +
      '<div>' +
        '<h2>Categorías</h2>' +
        '<p>Personaliza la forma en que organizas tus gastos</p>' +
      '</div>' +
    '</div>';

  html +=
    '<div class="card">' +
      '<div class="section-title">Categorías de gasto</div>';

  DB.categories
    .filter(c => c.type === 'expense')
    .forEach(c => {

      html +=
        '<div class="category-row">' +
          '<div class="category-left">' +
            '<span class="category-color" style="background:' +
              c.color +
            '">' +
              (
                ICON_EMOJI[c.icon] ||
                '⭐'
              ) +
            '</span>' +

            '<div>' +
              '<strong>' +
                esc(c.name) +
              '</strong>' +
              (
                c.budget
                  ? '<small>Presupuesto: ' +
                      fmtMoney(c.budget) +
                    '</small>'
                  : ''
              ) +
            '</div>' +
          '</div>' +

          '<button class="icon-btn" data-action="edit-category" data-id="' +
            esc(c.id) +
          '">' +
            icon('edit') +
          '</button>' +
        '</div>';
    });

  html +=
    '<button class="save-btn" data-action="new-category" style="width:100%;margin-top:16px">' +
      '+ Nueva categoría' +
    '</button>';

  html += '</div>';

  return html;
}

/* ==========================================================
   AJUSTES
   ========================================================== */

export function renderSettings(){
  const currency =
    DB.settings?.currency ||
    'COP';

  let html = '';

  html +=
    '<div class="page-header">' +
      '<div>' +
        '<h2>Ajustes</h2>' +
        '<p>Configura tu experiencia financiera</p>' +
      '</div>' +
    '</div>';

  html +=
    '<div class="card">' +
      '<div class="section-title">Moneda</div>' +

      '<div class="field">' +
        '<div class="field-label">Moneda principal</div>' +
        '<select id="settings-currency">';

  CURRENCIES.forEach(c => {

    html +=
      '<option value="' +
        esc(c.code) +
        '"' +
        (
          c.code === currency
            ? ' selected'
            : ''
        ) +
      '>' +
        esc(c.label) +
      '</option>';
  });

  html +=
        '</select>' +
      '</div>' +

      '<button class="save-btn" data-action="save-settings" style="width:100%">' +
        'Guardar ajustes' +
      '</button>' +
    '</div>';

  html +=
    '<div class="card" style="margin-top:16px">' +
      '<div class="section-title">Datos</div>' +

      '<button class="secondary-btn" data-action="export-backup" style="margin-top:20px">' +
        'Exportar copia de seguridad' +
      '</button>' +

      '<button class="secondary-btn" data-action="import-backup">' +
        'Importar copia de seguridad' +
      '</button>' +

      '<input type="file" id="import-file" accept="application/json" style="display:none">' +

      '<button class="danger-btn" data-action="reset-data">' +
        'Borrar todos los datos' +
      '</button>' +
    '</div>';

  return html;
}

/* ==========================================================
   MENÚ DEL BOTÓN +
   ========================================================== */

export function renderFabMenu(){
  return (
    '<div class="fab-menu-backdrop" id="fab-backdrop">' +
      '<div class="fab-menu-sheet">' +

        '<button class="fab-menu-item" data-action="fab-new-tx">' +
          '<div class="icon-box">' +
            icon('plus') +
          '</div>' +
          '<span>Registrar movimiento</span>' +
        '</button>' +

        '<button class="fab-menu-item" data-action="fab-new-credit">' +
          '<div class="icon-box">' +
            icon('credit') +
          '</div>' +
          '<span>Agregar nuevo crédito</span>' +
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
   HOJA: GASTO RÁPIDO
   ========================================================== */

export function renderQuickSheet(sheet){
  const cat =
    catById(sheet.categoryId);

  const emoji =
    cat
      ? (
          ICON_EMOJI[cat.icon] ||
          '⭐'
        )
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
            esc(
              cat
                ? cat.name
                : ''
            ) +
          '</div>' +
        '</div>' +

        '<div class="field">' +
          '<input id="q-amount" class="amount-input" type="text" inputmode="numeric" placeholder="$ 0" value="' +
            esc(
              formatThousandInput(
                sheet.amount
              )
            ) +
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
            : '<button class="link-btn" data-action="show-note">+ Agregar nota</button>'
        ) +

        (
          sheet.showDate
            ? '<div class="field">' +
                '<div class="field-label">Fecha</div>' +
                '<input id="q-date" type="date" value="' +
                  esc(sheet.date) +
                '">' +
              '</div>'
            : '<button class="link-btn" data-action="show-date">Cambiar fecha</button>'
        ) +

        '<div class="sheet-actions" style="margin-top:14px">' +
          '<button class="save-btn" id="quick-save-btn" data-action="save-quick" ' +
            (
              valid
                ? ''
                : 'disabled'
            ) +
          '>' +
            'Guardar gasto' +
          '</button>' +
        '</div>' +

      '</div>' +
    '</div>'
  );
}

/* ==========================================================
   CHIPS DE CATEGORÍAS
   ========================================================== */

export function renderTxCatChips(
  cats,
  selectedId
){
  if (!cats.length){
    return (
      '<div class="empty-hint">' +
        'Crea primero una categoría.' +
      '</div>'
    );
  }

  return cats.map(c => {

    const sel =
      selectedId === c.id;

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
            ? 'border-color:var(--violet);background:rgba(6,182,212,0.2);'
            : ''
        ) +
        '" data-action="pick-tx-cat" data-id="' +
        esc(c.id) +
      '">' +

        '<span class="chip-icon" style="background:' +
          c.color +
          '25">' +
          (
            ICON_EMOJI[c.icon] ||
            '⭐'
          ) +
        '</span>' +

        '<span class="chip-label">' +
          esc(c.name) +
        '</span>' +

      '</button>'
    );
  }).join('');
}

/* ==========================================================
   HOJA: MOVIMIENTO
   ========================================================== */

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
            'Gasto' +
          '</button>' +

          '<button class="' +
            (
              sheet.type === 'income'
                ? 'active-income'
                : ''
            ) +
            '" data-action="tx-type" data-type="income">' +
            'Ingreso' +
          '</button>' +

        '</div>' +

        '<div class="field">' +
          '<div class="field-label">Monto</div>' +
          '<input id="f-amount" type="text" inputmode="numeric" placeholder="0" value="' +
            esc(
              formatThousandInput(
                sheet.amount
              )
            ) +
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
            esc(sheet.date || todayStr()) +
          '">' +
        '</div>' +

        '<div class="field">' +
          '<div class="field-label">Nota</div>' +
          '<input id="f-note" value="' +
            esc(sheet.note || '') +
          '" placeholder="Opcional">' +
        '</div>' +

        '<div class="sheet-actions">' +
          '<button class="save-btn" data-action="save-tx" ' +
            (
              valid
                ? ''
                : 'disabled'
            ) +
          '>' +
            'Guardar' +
          '</button>' +

          (
            sheet.mode === 'edit'
              ? '<button class="danger-btn" data-action="delete-tx" data-id="' +
                  esc(sheet.id) +
                '">Eliminar</button>'
              : ''
          ) +

        '</div>' +

      '</div>' +
    '</div>'
  );
}

/* ==========================================================
   HOJA: CATEGORÍA
   ========================================================== */

export function renderCatSheet(sheet){
  const valid =
    String(sheet.name || '').trim();

  let html =
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
          '<input id="cat-name" value="' +
            esc(sheet.name || '') +
          '" placeholder="Ej. Alimentación">' +
        '</div>' +

        '<div class="field">' +
          '<div class="field-label">Color</div>' +
          '<div class="swatch-grid">';

  SWATCHES.forEach(color => {

    html +=
      '<button class="swatch ' +
        (
          sheet.color === color
            ? 'selected'
            : ''
        ) +
        '" style="background:' +
        color +
        '" data-action="pick-cat-color" data-color="' +
        color +
      '"></button>';
  });

  html +=
        '</div>' +
      '</div>' +

      '<div class="field">' +
        '<div class="field-label">Icono</div>' +
        '<div class="icon-grid">';

  ICON_KEYS.forEach(k => {

    html +=
      '<button class="icon-pick ' +
        (
          sheet.icon === k
            ? 'selected'
            : ''
        ) +
        '" data-action="pick-cat-icon" data-icon="' +
        esc(k) +
      '">' +
        (
          ICON_EMOJI[k] ||
          '⭐'
        ) +
      '</button>';
  });

  html +=
        '</div>' +
      '</div>' +

      '<div class="field">' +
        '<div class="field-label">Presupuesto mensual</div>' +
        '<input id="cat-budget" type="text" inputmode="numeric" value="' +
          esc(
            formatThousandInput(
              sheet.budget || ''
            )
          ) +
          '" placeholder="Opcional">' +
      '</div>' +

      '<div class="sheet-actions">' +
        '<button class="save-btn" data-action="save-category" ' +
          (
            valid
              ? ''
              : 'disabled'
          ) +
        '>' +
          'Guardar' +
        '</button>' +

        (
          sheet.mode === 'edit'
            ? '<button class="danger-btn" data-action="delete-category" data-id="' +
                esc(sheet.id) +
              '">Eliminar</button>'
            : ''
        ) +

      '</div>' +

      '</div>' +
    '</div>';

  return html;
}

/* ==========================================================
   HOJA: CRÉDITO
   ========================================================== */

export function renderCreditSheet(sheet){
  const valid =
    String(sheet.title || '').trim() &&
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

        '<div class="field">' +
          '<div class="field-label">Concepto</div>' +
          '<input id="credit-title" value="' +
            esc(sheet.title || '') +
            '" placeholder="Ej. Crédito vehículo">' +
        '</div>' +

        '<div class="field">' +
          '<div class="field-label">Tipo</div>' +

          '<div class="type-toggle">' +

            '<button class="' +
              (
                sheet.type === 'against'
                  ? 'active-expense'
                  : ''
              ) +
              '" data-action="credit-type" data-type="against">' +
              'Debo' +
            '</button>' +

            '<button class="' +
              (
                sheet.type === 'favor'
                  ? 'active-income'
                  : ''
              ) +
              '" data-action="credit-type" data-type="favor">' +
              'Me deben' +
            '</button>' +

          '</div>' +
        '</div>' +

        '<div class="field">' +
          '<div class="field-label">Valor total</div>' +
          '<input id="credit-total" type="text" inputmode="numeric" value="' +
            esc(
              formatThousandInput(
                sheet.total
              )
            ) +
            '" placeholder="0">' +
        '</div>' +

        '<div class="sheet-actions">' +

          '<button class="save-btn" data-action="save-credit" ' +
            (
              valid
                ? ''
                : 'disabled'
            ) +
          '>' +
            'Guardar crédito' +
          '</button>' +

          (
            sheet.mode === 'edit'
              ? '<button class="danger-btn" data-action="delete-credit" data-id="' +
                  esc(sheet.id) +
                '">Eliminar crédito</button>'
              : ''
          ) +

        '</div>' +

      '</div>' +
    '</div>'
  );
}

/* ==========================================================
   HOJA: PAGO DE CRÉDITO
   ========================================================== */

export function renderPaymentSheet(sheet){
  const valid =
    Number(sheet.amount) > 0 &&
    sheet.date;

  return (
    '<div class="overlay">' +
      '<div class="sheet">' +
        '<div class="sheet-handle"></div>' +

        '<div class="sheet-head">' +
          '<h3>' +
            (
              sheet.mode === 'edit'
                ? 'Editar pago'
                : 'Registrar pago'
            ) +
          '</h3>' +

          '<button data-action="close-sheet">' +
            icon('close') +
          '</button>' +
        '</div>' +

        '<div class="field">' +
          '<div class="field-label">Monto del pago</div>' +
          '<input id="p-amount" type="text" inputmode="numeric" value="' +
            esc(
              formatThousandInput(
                sheet.amount
              )
            ) +
            '" placeholder="0">' +
        '</div>' +

        '<div class="field">' +
          '<div class="field-label">Fecha</div>' +
          '<input id="p-date" type="date" value="' +
            esc(
              sheet.date ||
              todayStr()
            ) +
          '">' +
        '</div>' +

        '<div class="field">' +
          '<div class="field-label">Nota</div>' +
          '<input id="p-note" value="' +
            esc(sheet.note || '') +
            '" placeholder="Opcional">' +
        '</div>' +

        '<div class="sheet-actions">' +

          '<button class="save-btn" data-action="save-payment" ' +
            (
              valid
                ? ''
                : 'disabled'
            ) +
          '>' +
            'Guardar pago' +
          '</button>' +

          (
            sheet.mode === 'edit'
              ? '<button class="danger-btn" data-action="delete-payment" data-cid="' +
                  esc(sheet.creditId) +
                  '" data-pid="' +
                  esc(sheet.id) +
                '">Eliminar pago</button>'
              : ''
          ) +

        '</div>' +

      '</div>' +
    '</div>'
  );
}

/* ==========================================================
   HOJA: FACTURA
   ========================================================== */

export function renderInvoiceSheet(sheet){
  const total =
    (sheet.items || [])
      .reduce(
        (sum, item) =>
          sum +
          (Number(item.price) || 0),
        0
      );

  return (
    '<div class="overlay">' +
      '<div class="sheet">' +
        '<div class="sheet-handle"></div>' +

        '<div class="sheet-head">' +
          '<h3>Factura escaneada</h3>' +

          '<button data-action="close-sheet">' +
            icon('close') +
          '</button>' +
        '</div>' +

        '<div class="field">' +
          '<div class="field-label">Título</div>' +
          '<input id="inv-title" value="' +
            esc(sheet.title || '') +
          '">' +
        '</div>' +

        '<div class="field">' +
          '<div class="field-label">Fecha</div>' +
          '<input id="inv-date" type="date" value="' +
            esc(sheet.date || todayStr()) +
          '">' +
        '</div>' +

        '<div class="field">' +
          '<div class="field-label">Productos</div>' +
          '<div id="inv-items-list">' +
            renderInvoiceItemsHTML(
              sheet.items || []
            ) +
          '</div>' +
        '</div>' +

        '<div class="invoice-total">' +
          '<span>Total</span>' +
          '<strong id="inv-total-val">' +
            fmtMoney(total) +
          '</strong>' +
        '</div>' +

        '<div class="sheet-actions">' +
          '<button class="save-btn" data-action="save-invoice">' +
            'Guardar factura' +
          '</button>' +
        '</div>' +

      '</div>' +
    '</div>'
  );
}

/* ==========================================================
   CONFIRMACIÓN
   ========================================================== */

export function renderConfirmDialog(state){
  if (!state) return '';

  return (
    '<div class="overlay confirm-overlay">' +
      '<div class="confirm-dialog">' +

        '<h3>' +
          esc(
            state.title ||
            'Confirmar acción'
          ) +
        '</h3>' +

        '<p>' +
          esc(
            state.message ||
            '¿Deseas continuar?'
          ) +
        '</p>' +

        '<div class="confirm-actions">' +
          '<button class="secondary-btn" data-action="close-confirm">' +
            'Cancelar' +
          '</button>' +

          '<button class="danger-btn" data-action="confirm-action">' +
            'Confirmar' +
          '</button>' +
        '</div>' +

      '</div>' +
    '</div>'
  );
}

/* ==========================================================
   OVERLAY DE ESCANEO
   ========================================================== */

export function renderScanningOverlay(
  state
){
  if (!state) return '';

  return (
    '<div class="overlay scanning-overlay">' +
      '<div class="scan-card">' +
        '<div class="scan-spinner"></div>' +
        '<h3>Analizando factura</h3>' +
        '<p>' +
          esc(
            state.message ||
            'Procesando...'
          ) +
        '</p>' +
      '</div>' +
    '</div>'
  );
}
