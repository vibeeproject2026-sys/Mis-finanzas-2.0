import {
  DB,
  CURRENCIES,
  SWATCHES,
  ICON_KEYS,
  ICON_EMOJI,
  todayStr
} from './state.js';

import {
  computeCreditsSummary
} from './domain.js';

/* ==========================================================
   SOPORTE DE ICONOS SVG
   ========================================================== */

export function icon(name){
  const svgs = {
    'wallet':
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 10v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V10"/><path d="M16 14h.01"/></svg>',

    'list':
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',

    'plus':
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>',

    'credit':
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5zm0 6h18"/></svg>',

    'tag':
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01"/></svg>',

    'search':
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>',

    'pencil':
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>',

    'check':
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>',

    'close':
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>',

    'trash':
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>',

    'alert':
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M12 9v2M12 15h.01M22.61 16.53L13.73 3.15a2 2 0 0 0-3.46 0L1.39 16.53a2 2 0 0 0 1.73 3h17.76a2 2 0 0 0 1.73-3z"/></svg>',

    'gear':
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0-.33-1.82V9a1.65 1.65 0 0 0 1.51-1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1 z"/></svg>',

    'camera':
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',

    'receipt':
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 14h-4M16 10H8M8 14h2"/></svg>'
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
  const digits =
    String(val).replace(/\D/g, '');

  if (!digits) return '';

  return new Intl.NumberFormat(
    'es-CO'
  ).format(digits);
}

export function parseFormattedNumber(val){
  if (!val) return '';

  return String(val).replace(
    /\D/g,
    ''
  );
}

export function fmtMoney(amount){
  const cur =
    DB.settings.currency || 'COP';

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

export function catById(id){
  return DB.categories.find(
    c => c.id === id
  );
}

export function getPrimaryIncomeCat(){
  return DB.categories.find(
    c =>
      c.type === 'income' &&
      c.primary
  ) || null;
}

/* ==========================================================
   CÁLCULOS Y ESTADÍSTICAS
   ========================================================== */

export function computeTotals(){
  let income = 0;
  let expense = 0;

  DB.transactions.forEach(t => {
    const amt =
      Number(t.amount) || 0;

    if (t.type === 'income'){
      income += amt;
    } else {
      expense += amt;
    }
  });

  return {
    income,
    expense,
    balance: income - expense
  };
}

export function currentMonthTx(){
  const now = new Date();

  const localMonthKey =
    `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, '0')}`;

  return DB.transactions.filter(
    t =>
      t.date &&
      typeof t.date === 'string' &&
      t.date.substring(0, 7) ===
        localMonthKey
  );
}

export function computeMonthStats(){
  const primary =
    getPrimaryIncomeCat();

  let primaryIncome = 0;
  let secondaryIncome = 0;
  let expense = 0;

  currentMonthTx().forEach(t => {
    const amt =
      Number(t.amount) || 0;

    if (t.type === 'income'){
      if (
        primary &&
        t.categoryId === primary.id
      ){
        primaryIncome += amt;
      } else {
        secondaryIncome += amt;
      }
    } else {
      expense += amt;
    }
  });

  const income =
    primaryIncome +
    secondaryIncome;

  const netSavings =
    income -
    expense;

  const savingsRate =
    income > 0
      ? Math.max(
          0,
          Math.round(
            (
              netSavings /
              income
            ) * 100
          )
        )
      : 0;

  return {
    primaryIncome,
    secondaryIncome,
    expense,
    income,
    netSavings,
    savingsRate
  };
}

export function computeMonthOverMonthMetrics(){
  const now = new Date();

  const curY =
    now.getFullYear();

  const curM =
    now.getMonth();

  const prevMDate =
    new Date(
      curY,
      curM - 1,
      1
    );

  const prevMonthKey =
    `${prevMDate.getFullYear()}-${String(
      prevMDate.getMonth() + 1
    ).padStart(2, '0')}`;

  const currentMonthKey =
    `${curY}-${String(
      curM + 1
    ).padStart(2, '0')}`;

  let currentExpense = 0;
  let prevExpense = 0;
  let currentIncome = 0;
  let prevIncome = 0;

  const currentCatMap = {};
  const prevCatMap = {};

  DB.transactions.forEach(t => {
    if (!t.date) return;

    const mKey =
      t.date.substring(0, 7);

    const amt =
      Number(t.amount) || 0;

    if (
      mKey === currentMonthKey
    ){

      if (
        t.type === 'expense'
      ){

        currentExpense += amt;

        currentCatMap[
          t.categoryId
        ] =
          (
            currentCatMap[
              t.categoryId
            ] || 0
          ) + amt;

      } else {

        currentIncome += amt;
      }

    } else if (
      mKey === prevMonthKey
    ){

      if (
        t.type === 'expense'
      ){

        prevExpense += amt;

        prevCatMap[
          t.categoryId
        ] =
          (
            prevCatMap[
              t.categoryId
            ] || 0
          ) + amt;

      } else {

        prevIncome += amt;
      }
    }
  });

  const currentSavings =
    currentIncome -
    currentExpense;

  const prevSavings =
    prevIncome -
    prevExpense;

  const expChangePct =
    prevExpense > 0
      ? Math.round(
          (
            (
              currentExpense -
              prevExpense
            ) /
            prevExpense
          ) * 100
        )
      : (
          currentExpense > 0
            ? 100
            : 0
        );

  const incChangePct =
    prevIncome > 0
      ? Math.round(
          (
            (
              currentIncome -
              prevIncome
            ) /
            prevIncome
          ) * 100
        )
      : (
          currentIncome > 0
            ? 100
            : 0
        );

  let highestGrowthCat = null;
  let maxDiff = -Infinity;

  Object.keys(
    currentCatMap
  ).forEach(catId => {

    const diff =
      currentCatMap[catId] -
      (
        prevCatMap[catId] || 0
      );

    if (
      diff > maxDiff &&
      diff > 0
    ){

      maxDiff = diff;

      highestGrowthCat =
        catById(catId);
    }
  });

  const savingsRate =
    currentIncome > 0
      ? Math.max(
          0,
          Math.round(
            (
              currentSavings /
              currentIncome
            ) * 100
          )
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

export function computeCategoryTotals(){
  const map = {};

  currentMonthTx()
    .forEach(t => {

      if (
        t.type === 'expense'
      ){

        map[t.categoryId] =
          (
            map[t.categoryId] ||
            0
          ) +
          (
            Number(t.amount) ||
            0
          );
      }
    });

  return Object.entries(map)
    .map(
      ([id,total]) => ({
        id,
        total,
        cat:catById(id)
      })
    )
    .filter(
      r => r.cat
    )
    .sort(
      (a,b) =>
        b.total -
        a.total
    );
}

export function computeBurnMetrics(){
  const today =
    new Date();

  const daysInMonth =
    new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    ).getDate();

  const currentDay =
    today.getDate();

  const daysRemaining =
    Math.max(
      1,
      daysInMonth -
      currentDay +
      1
    );

  const monthPctPassed =
    Math.round(
      (
        currentDay /
        daysInMonth
      ) * 100
    );

  const totals =
    computeTotals();

  const monthStats =
    computeMonthStats();

  const availableFunds =
    totals.balance > 0
      ? totals.balance
      : Math.max(
          0,
          monthStats.income -
          monthStats.expense
        );

  const dailyAvailable =
    Math.max(
      0,
      availableFunds
    ) /
    daysRemaining;

  const fixedCatIds =
    DB.categories
      .filter(
        c =>
          c.isFixed ||
          c.icon === 'home' ||
          c.icon === 'zap' ||
          (
            c.name || ''
          )
            .toLowerCase()
            .includes('arriendo') ||
          (
            c.name || ''
          )
            .toLowerCase()
            .includes('servicio')
      )
      .map(
        c => c.id
      );

  const isDailyExpense =
    t =>
      t &&
      t.type === 'expense' &&
      !fixedCatIds.includes(
        t.categoryId
      ) &&
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
    currentDay -
    periodStartDay +
    1;

  const periodExpenses =
    [0,0,0];

  DB.transactions.forEach(t => {

    if (
      !isDailyExpense(t)
    ){
      return;
    }

    const tDate =
      new Date(
        t.date +
        'T00:00:00'
      );

    if (
      Number.isNaN(
        tDate.getTime()
      ) ||
      tDate.getFullYear() !==
        today.getFullYear() ||
      tDate.getMonth() !==
        today.getMonth()
    ){
      return;
    }

    const day =
      tDate.getDate();

    if (
      day > currentDay
    ){
      return;
    }

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
    periodExpenses[
      periodNumber
    ];

  let avgDailyBurn =
    currentPeriodExpense > 0
      ? currentPeriodExpense /
        currentPeriodDays
      : 0;

  if (
    avgDailyBurn <= 0
  ){

    for (
      let p =
        periodNumber - 1;
      p >= 0;
      p--
    ){

      if (
        periodExpenses[p] > 0
      ){

        avgDailyBurn =
          periodExpenses[p] /
          10;

        break;
      }
    }
  }

  const runwayDays =
    avgDailyBurn > 0 &&
    totals.balance > 0
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

export function computeBudgetRows(){
  const totals =
    computeCategoryTotals();

  const burn =
    computeBurnMetrics();

  return DB.categories
    .filter(
      c =>
        c.type === 'expense' &&
        c.budget
    )
    .map(c => {

      const spent =
        (
          totals.find(
            r => r.id === c.id
          ) || {}
        ).total || 0;

      const spentPct =
        Math.min(
          100,
          Math.round(
            (
              spent /
              c.budget
            ) * 100
          )
        );

      const over =
        spent > c.budget;

      const isPacingFast =
        !over &&
        spentPct >
          burn.monthPctPassed +
          10;

      return {
        cat:c,
        spent,
        pct:spentPct,
        over,
        isPacingFast
      };
    });
}

export function computeCreditsPaidThisMonth(){
  const now =
    new Date();

  const currentMonthKey =
    `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, '0')}`;

  return (
    DB.credits || []
  )
    .filter(
      c =>
        c.type === 'against'
    )
    .reduce(
      (sum,c) => {

        const monthlyPaid =
          (
            c.payments || []
          )
            .filter(
              p =>
                p.date &&
                typeof p.date === 'string' &&
                p.date.substring(0,7) ===
                  currentMonthKey
            )
            .reduce(
              (s,p) =>
                s +
                (
                  Number(p.amount) ||
                  0
                ),
              0
            );

        return (
          sum +
          monthlyPaid
        );
      },
      0
    );
}

/* ==========================================================
   GRÁFICA CIRCULAR
   ========================================================== */

export function expensePieSVG(
  catTotals,
  monthExpense,
  monthIncome,
  creditsPaid,
  uncategorizedExpense = 0
){

  const expense =
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

  const totalOutflow =
    expense +
    credits;

  if (
    totalOutflow <= 0
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

  const gap = 2.8;

  /*
   * El ingreso mensual representa el 100%.
   *
   * Ejemplo:
   *
   * Ingreso       $5.000.000
   * Gastos        $1.500.000
   * Créditos        $500.000
   *
   * Salidas       $2.000.000
   *
   * Gastado = 40%
   * Disponible = 60%
   */

  const denominator =
    income > 0
      ? income
      : totalOutflow;

  const spentRatio =
    Math.min(
      1,
      totalOutflow /
      denominator
    );

  const remainingRatio =
    Math.max(
      0,
      1 -
      spentRatio
    );

  /*
   * Colores de respaldo.
   *
   * Se utilizan únicamente cuando una categoría:
   *
   * 1. No tiene color.
   * 2. Tiene un color repetido con otra categoría.
   *
   * Si la categoría tiene un color propio y único,
   * ese color se conserva.
   */

  const categoryPalette = [
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

  const usedCategoryColors =
    new Set();

  let paletteIndex = 0;

  const normalizeColor =
    color =>
      String(
        color || ''
      )
        .trim()
        .toUpperCase();

  const getCategoryColor =
    cat => {

      const original =
        String(
          cat?.color || ''
        ).trim();

      const normalized =
        normalizeColor(
          original
        );

      /*
       * Conservamos el color original
       * cuando todavía no ha sido utilizado.
       */

      if (
        original &&
        !usedCategoryColors.has(
          normalized
        )
      ){

        usedCategoryColors.add(
          normalized
        );

        return original;
      }

      /*
       * Si el color estaba repetido,
       * buscamos otro color de la paleta.
       */

      let attempts = 0;

      while (
        attempts <
        categoryPalette.length
      ){

        const candidate =
          categoryPalette[
            paletteIndex %
            categoryPalette.length
          ];

        paletteIndex++;
        attempts++;

        if (
          !usedCategoryColors.has(
            normalizeColor(
              candidate
            )
          )
        ){

          usedCategoryColors.add(
            normalizeColor(
              candidate
            )
          );

          return candidate;
        }
      }

      /*
       * Último respaldo.
       */

      const fallback =
        categoryPalette[
          paletteIndex %
          categoryPalette.length
        ];

      paletteIndex++;

      return fallback;
    };

  /*
   * Construimos primero todas las salidas.
   *
   * Así garantizamos que:
   *
   * categorías +
   * sin categoría +
   * créditos
   *
   * sea exactamente igual a:
   *
   * gastos + créditos.
   */

  const rawSlices = [];

  catTotals.forEach(
    rw => {

      const value =
        Math.max(
          0,
          Number(rw.total) || 0
        );

      if (
        value <= 0
      ){
        return;
      }

      rawSlices.push({
        label:
          rw.cat?.name ||
          'Categoría',

        value,

        color:
          getCategoryColor(
            rw.cat
          )
      });
    }
  );

  /*
   * Gastos que existen en movimientos
   * pero cuyo categoryId ya no existe.
   */

  if (
    uncategorized > 0
  ){

    rawSlices.push({
      label:'Sin categoría',
      value:uncategorized,
      color:'#8B85A3'
    });
  }

  /*
   * Los abonos a créditos son una salida
   * de dinero independiente.
   */

  if (
    credits > 0
  ){

    rawSlices.push({
      label:'Abonado a créditos',
      value:credits,
      color:'#F43F5E'
    });
  }

  /*
   * Cantidad de separaciones visuales.
   */

  const gapCount =
    rawSlices.length +
    (
      remainingRatio > 0.005
        ? 1
        : 0
    );

  const totalGap =
    gapCount > 1
      ? Math.min(
          gap * gapCount,
          circumference * 0.22
        )
      : 0;

  const usable =
    Math.max(
      0,
      circumference -
      totalGap
    );

  const slices = [];

  let offset = 0;

  rawSlices.forEach(
    slice => {

      const ratio =
        denominator > 0
          ? Math.max(
              0,
              slice.value /
              denominator
            )
          : 0;

      if (
        ratio <= 0
      ){
        return;
      }

      /*
       * Evitamos que el dibujo supere
       * el 100% del círculo.
       */

      const availableRatio =
        Math.max(
          0,
          spentRatio -
          (
            offset /
            Math.max(
              usable,
              1
            )
          )
        );

      const safeRatio =
        Math.min(
          ratio,
          availableRatio
        );

      if (
        safeRatio <= 0
      ){
        return;
      }

      const rawDash =
        safeRatio *
        usable;

      const dash =
        Math.max(
          0,
          rawDash -
          (
            totalGap > 0
              ? gap * 0.55
              : 0
          )
        );

      if (
        dash <= 0
      ){
        return;
      }

      slices.push({
        color:slice.color,
        dash,
        offset
      });

      offset +=
        rawDash;
    }
  );

  /*
   * Segmento de dinero disponible.
   */

  if (
    remainingRatio > 0.005 &&
    usable > 0
  ){

    const rawDash =
      remainingRatio *
      usable;

    const dash =
      Math.max(
        0,
        rawDash -
        (
          totalGap > 0
            ? gap * 0.55
            : 0
        )
      );

    if (
      dash > 0
    ){

      slices.push({
        color:'#1E293B',
        dash,
        offset
      });
    }
  }

  let svg =
    '<svg viewBox="0 0 120 120" aria-label="Gastos respecto al ingreso">';

  /*
   * Base del círculo.
   */

  svg +=
    '<circle cx="' +
    cx +
    '" cy="' +
    cy +
    '" r="' +
    r +
    '" fill="none" stroke="#0F172A" stroke-width="' +
    stroke +
    '"/>';

  /*
   * Segmentos.
   */

  slices.forEach(
    s => {

      if (
        s.dash > 0.5
      ){

        svg +=
          '<circle cx="' +
          cx +
          '" cy="' +
          cy +
          '" r="' +
          r +
          '" fill="none" stroke="' +
          s.color +
          '" stroke-width="' +
          stroke +
          '" stroke-dasharray="' +
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
          '" transform="rotate(-90 60 60)" stroke-linecap="butt" />';
      }
    }
  );

  svg +=
    '</svg>';

  return svg;
}

/* ==========================================================
   DASHBOARD
   ========================================================== */

export function renderDashboard(){

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

  const balColor =
    totals.balance >= 0
      ? 'var(--income)'
      : 'var(--expense)';

  const expenseCats =
    DB.categories.filter(
      c =>
        c.type === 'expense'
    );

  let html = '';

  /* ----------------------------------------------------------
     BALANCE
     ---------------------------------------------------------- */

  html +=
    '<div class="balance-card">';

  html +=
    '<div class="balance-label">Balance disponible</div>';

  html +=
    '<div class="balance-amount" style="color:' +
    balColor +
    '">' +
    fmtMoney(
      totals.balance
    ) +
    '</div>';

  html +=
    '<div class="balance-month">' +
    esc(
      monthLabelStr(
        new Date()
      )
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

  /* ----------------------------------------------------------
     RITMO DE GASTO
     ---------------------------------------------------------- */

  html +=
    '<div class="card">';

  html +=
    '<div class="section-title">Ritmo de Gasto Diario</div>';

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
    '<div class="runway-card"><div class="runway-icon">⏳</div><div class="runway-main">';

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

  /* ----------------------------------------------------------
     GASTO RÁPIDO
     ---------------------------------------------------------- */

  if (
    expenseCats.length
  ){

    html +=
      '<div class="section-title" style="margin-top:20px">Registrar gasto rápido</div>';

    html +=
      '<div class="quick-grid">' +
      expenseCats
        .map(
          c =>
            '<button class="quick-btn" data-action="quick-cat" data-id="' +
            c.id +
            '"><span class="em">' +
            (
              ICON_EMOJI[
                c.icon
              ] ||
              '⭐'
            ) +
            '</span><span class="nm">' +
            esc(c.name) +
            '</span></button>'
        )
        .join('') +
      '</div>';
  }

  /* ----------------------------------------------------------
     GRÁFICA
     ---------------------------------------------------------- */

  const creditsPaid =
    computeCreditsPaidThisMonth();

  /*
   * Gastos que sí tienen categoría existente.
   */

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

  /*
   * Gastos cuyo categoryId ya no existe.
   */

  const uncategorizedExpense =
    Math.max(
      0,
      (
        Number(
          month.expense
        ) || 0
      ) -
      categorizedExpense
    );

  /*
   * Todas las salidas que afectan
   * el porcentaje del ingreso.
   */

  const totalOutflow =
    (
      Number(
        month.expense
      ) || 0
    ) +
    (
      Number(
        creditsPaid
      ) || 0
    );

  html +=
    '<div class="card"><div class="section-title">Gastos por categoría (este mes)</div>';

  if (
    totalOutflow > 0
  ){

    /*
     * El porcentaje central representa:
     *
     * (Gastos + abonos a créditos)
     * --------------------------------
     *          Ingreso
     *
     * limitado a 100%.
     */

    const spentPct =
      month.income > 0
        ? Math.min(
            100,
            Math.round(
              (
                totalOutflow /
                month.income
              ) *
              100
            )
          )
        : 0;

    const remainingPct =
      month.income > 0
        ? Math.max(
            0,
            100 -
            spentPct
          )
        : 0;

    html +=
      '<div class="pie-layout">';

    html +=
      '<div class="pie-chart">' +
      expensePieSVG(
        catTotals,
        month.expense,
        month.income,
        creditsPaid,
        uncategorizedExpense
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
          ? 'del ingreso'
          : 'sin ingreso'
      ) +
      '</span></div></div>';

    html +=
      '<div class="pie-legend">';

    /*
     * CATEGORÍAS
     *
     * Cada una muestra exactamente:
     *
     * gasto categoría / ingreso total
     */

    catTotals.forEach(
      r => {

        const pctOfIncome =
          month.income > 0
            ? (
                r.total /
                month.income
              ) *
              100
            : 0;

        const categoryColor =
          r.cat?.color ||
          '#8B85A3';

        html +=
          '<div class="pie-legend-row">' +
          '<span class="pie-dot" style="background:' +
          categoryColor +
          '"></span>' +
          '<span class="pie-name">' +
          esc(
            r.cat.name
          ) +
          '</span>' +
          '<span class="pie-pct">' +
          (
            month.income > 0
              ? (
                  pctOfIncome < 0.1
                    ? '<0.1'
                    : pctOfIncome.toFixed(1)
                )
              : '—'
          ) +
          '%</span>' +
          '</div>';
      }
    );

    /*
     * SIN CATEGORÍA
     */

    if (
      uncategorizedExpense > 0
    ){

      const pct =
        month.income > 0
          ? (
              uncategorizedExpense /
              month.income
            ) *
            100
          : 0;

      html +=
        '<div class="pie-legend-row">' +
        '<span class="pie-dot" style="background:#8B85A3"></span>' +
        '<span class="pie-name">Sin categoría</span>' +
        '<span class="pie-pct">' +
        (
          month.income > 0
            ? (
                pct < 0.1
                  ? '<0.1'
                  : pct.toFixed(1)
              )
            : '—'
        ) +
        '%</span>' +
        '</div>';
    }

    /*
     * ABONOS A CRÉDITOS
     */

    if (
      creditsPaid > 0
    ){

      const pctOfCredits =
        month.income > 0
          ? (
              creditsPaid /
              month.income
            ) *
            100
          : 0;

      html +=
        '<div class="pie-legend-row">' +
        '<span class="pie-dot" style="background:#F43F5E"></span>' +
        '<span class="pie-name">Abonado a créditos</span>' +
        '<span class="pie-pct">' +
        (
          month.income > 0
            ? (
                pctOfCredits < 0.1
                  ? '<0.1'
                  : pctOfCredits.toFixed(1)
              )
            : '—'
        ) +
        '%</span>' +
        '</div>';
    }

    /*
     * DISPONIBLE
     */

    if (
      month.income > 0 &&
      remainingPct > 0
    ){

      html +=
        '<div class="pie-legend-row">' +
        '<span class="pie-dot" style="background:#1E293B"></span>' +
        '<span class="pie-name">Disponible</span>' +
        '<span class="pie-pct">' +
        remainingPct +
        '%</span>' +
        '</div>';
    }

    html +=
      '</div></div>';

  } else {

    html +=
      '<div class="empty-hint">Aún no hay gastos registrados este mes.</div>';
  }

  html +=
    '</div>';

  /* ----------------------------------------------------------
     COMPARATIVA MES A MES
     ---------------------------------------------------------- */

  html +=
    '<div class="mom-card"><div class="mom-header"><span class="mom-title">📊 Comparativa Mes a Mes</span><div class="mom-dots">';

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
    mom.expChangePct > 0;

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
    mom.incChangePct > 0;

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
      '<div class="mom-insight"><span>💡</span><div><b>Atención en ' +
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
      '<div class="mom-insight"><span>✨</span><div><b>¡Buen control!</b> Patrones de consumo estables.</div></div>';
  }

  html +=
    '</div>';

  /* ----------------------------------------------------------
     PRESUPUESTOS
     ---------------------------------------------------------- */

  if (
    budgets.length
  ){

    html +=
      '<div class="card" style="margin-top:16px"><div class="section-title">Presupuestos</div>';

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

  return html;
}

/* ==========================================================
   MOVIMIENTOS
   ========================================================== */

export function renderTxRow(t){

  const cat =
    catById(
      t.categoryId
    );

  const emoji =
    cat
      ? (
          ICON_EMOJI[
            cat.icon
          ] ||
          '⭐'
        )
      : '⭐';

  const bg =
    (
      cat
        ? cat.color
        : '#8B85A3'
    ) +
    '22';

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
    esc(
      cat
        ? cat.name
        : 'Sin categoría'
    ) +
    '</div>' +

    '<div class="tx-sub">' +
    esc(
      t.date
    ) +
    (
      t.note
        ? ' · ' +
          esc(t.note)
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
    fmtMoney(
      t.amount
    ) +
    '</div>' +

    '</button>'
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

        return (
          (
            t.note || ''
          )
            .toLowerCase()
            .includes(s)
        ) ||
        (
          cat &&
          cat.name
            .toLowerCase()
            .includes(s)
        );
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

  let html = '';

  html +=
    '<div class="search-box">' +
    icon('search') +
    '<input id="search-input" placeholder="Buscar por nota o categoría" value="' +
    esc(search) +
    '"></div>';

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
    '<div id="tx-list">' +
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
  openInvoiceId
){

  let html = '';

  html +=
    '<div class="section-title">Facturas Escaneadas</div>';

  const list =
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

  if (
    !list.length
  ){

    return (
      html +
      '<div class="empty-state">Aún no has escaneado ninguna factura.<br>Usa el botón central (+) para escanear una.</div>'
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
  creditFilter
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

      html +=
        '<div style="font-size:11px;color:var(--ink-muted);margin-top:4px;">Has pagado el ' +
        summary.againstProgressPct +
        '% del total de tus deudas</div>';
    }

    if (
      summary.favorCount > 0
    ){

      html +=
        '<div style="margin-top:' +
        (
          summary.againstCount > 0
            ? '16px'
            : '0'
        ) +
        ';padding-top:' +
        (
          summary.againstCount > 0
            ? '14px'
            : '0'
        ) +
        ';border-top:' +
        (
          summary.againstCount > 0
            ? '1px solid var(--line)'
            : 'none'
        ) +
        ';">';

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
        ' cobro(s)</div>';

      html +=
        '</div>';
    }

    if (
      summary.againstCount > 0
    ){

      const changeUp =
        summary.paymentChangePct >
        0;

      const changeDown =
        summary.paymentChangePct <
        0;

      const arrow =
        changeUp
          ? '▲'
          : (
              changeDown
                ? '▼'
                : '—'
            );

      const deltaColor =
        changeUp
          ? 'var(--income)'
          : (
              changeDown
                ? 'var(--amber)'
                : 'var(--ink-muted)'
            );

      html +=
        '<div class="balance-metrics">';

      html +=
        '<div class="b-metric"><span class="lbl">Abonado este mes</span><span class="val inc">' +
        fmtMoney(
          summary.againstPaidThisMonth
        ) +
        '</span></div>';

      html +=
        '<div class="b-metric"><span class="lbl">Abonado mes pasado</span><span class="val">' +
        fmtMoney(
          summary.againstPaidPrevMonth
        ) +
        '</span></div>';

      html +=
        '<div class="b-metric"><span class="lbl">Variación en abonos</span><span class="val" style="color:' +
        deltaColor +
        '">' +
        arrow +
        ' ' +
        Math.abs(
          summary.paymentChangePct
        ) +
        '%</span></div>';

      html +=
        '<div class="b-metric"><span class="lbl">Créditos activos (deudas)</span><span class="val sav">' +
        summary.againstCount +
        '</span></div>';

      html +=
        '</div>';
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
    c => {

      const totalPaid =
        (
          c.payments || []
        )
          .reduce(
            (sum,p) =>
              sum +
              (
                Number(
                  p.amount
                ) || 0
              ),
            0
          );

      const pending =
        Math.max(
          0,
          Number(c.total) -
          totalPaid
        );

      const pct =
        c.total > 0
          ? Math.min(
              100,
              Math.round(
                (
                  totalPaid /
                  c.total
                ) *
                100
              )
            )
          : 0;

      const isAgainst =
        c.type ===
        'against';

      html +=
        '<div class="credit-card">';

      html +=
        '<div class="credit-head"><div><div class="credit-title">' +
        esc(
          c.title
        ) +
        '</div><div class="credit-sub">Total: ' +
        fmtMoney(
          c.total
        ) +
        '</div></div><button data-action="edit-credit" data-id="' +
        c.id +
        '">' +
        icon('pencil') +
        '</button></div>';

      html +=
        '<div class="credit-values"><span>Falta por ' +
        (
          isAgainst
            ? 'pagar'
            : 'cobrar'
        ) +
        ':</span><span class="credit-pending ' +
        (
          isAgainst
            ? 'against'
            : 'favor'
        ) +
        '">' +
        fmtMoney(
          pending
        ) +
        '</span></div>';

      html +=
        '<div class="bar-track" style="margin-bottom:12px;"><div class="bar-fill" style="width:' +
        pct +
        '%;background:' +
        (
          isAgainst
            ? 'var(--expense)'
            : 'var(--income)'
        ) +
        '"></div></div>';

      if (
        c.payments &&
        c.payments.length
      ){

        html +=
          '<div style="margin-top:8px;"><span style="font-size:11px;font-weight:700;color:var(--ink-muted);">HISTORIAL:</span>';

        c.payments.forEach(
          p => {

            html +=
              '<div class="payment-item"><span>' +
              esc(
                p.date
              ) +
              (
                p.note
                  ? ' - ' +
                    esc(
                      p.note
                    )
                  : ''
              ) +
              '</span><span><b>+' +
              fmtMoney(
                p.amount
              ) +
              '</b> <button style="margin-left:6px" data-action="edit-payment" data-cid="' +
              c.id +
              '" data-pid="' +
              p.id +
              '">' +
              icon('pencil') +
              '</button></span></div>';
          }
        );

        html +=
          '</div>';
      }

      html +=
        '<button class="add-pay-btn" data-action="new-payment" data-id="' +
        c.id +
        '">+ Agregar aporte</button></div>';
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
        c.type === 'income'
    );

  const expense =
    DB.categories.filter(
      c =>
        c.type === 'expense'
    );

  const row =
    c => {

      const emoji =
        ICON_EMOJI[
          c.icon
        ] ||
        '⭐';

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
          c.type === 'expense' &&
          c.budget
            ? '<div class="cat-budget">Presupuesto: ' +
              fmtMoney(
                c.budget
              ) +
              '</div>'
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

    income
      .map(row)
      .join('') +

    '<div class="section-title" style="margin-top:20px">Gastos</div>' +

    expense
      .map(row)
      .join('')
  );
}

/* ==========================================================
   AJUSTES
   ========================================================== */

export function renderSettings(){

  let html =
    '<div class="section-title">Moneda</div><div class="settings-list">';

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
    '<div class="section-title" style="margin-top:20px">Configuración de API IA (Producción)</div>';

  html +=
    '<div class="data-box"><div class="field-label">Clave de API de Gemini</div>';

  html +=
    '<input id="gemini-key-input" type="text" placeholder="Pega aquí tu API key" value="' +
    esc(
      DB.settings.geminiApiKey ||
      ''
    ) +
    '">';

  html +=
    '<div style="font-size:11px;color:var(--ink-muted);margin-top:8px;">Clave segura para procesamiento en nube.</div></div>';

  html +=
    '<div class="section-title" style="margin-top:20px">Tus datos</div>';

  html +=
    '<div class="data-box"><div class="row"><span class="muted">Movimientos</span><span>' +
    DB.transactions.length +
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
    cat
      ? (
          ICON_EMOJI[
            cat.icon
          ] ||
          '⭐'
        )
      : '⭐';

  const valid =
    Number(
      sheet.amount
    ) > 0;

  return (
    '<div class="overlay"><div class="sheet"><div class="sheet-handle"></div>' +

    '<div class="sheet-head"><h3>Registrar gasto</h3><button data-action="close-sheet">' +
    icon('close') +
    '</button></div>' +

    '<div class="quick-header"><div class="avatar">' +
    emoji +
    '</div><div class="qname">' +
    esc(
      cat
        ? cat.name
        : ''
    ) +
    '</div></div>' +

    '<div class="field"><input id="q-amount" class="amount-input" type="text" inputmode="numeric" placeholder="$ 0" value="' +
    esc(
      formatThousandInput(
        sheet.amount
      )
    ) +
    '"></div>' +

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
   CHIPS DE CATEGORÍAS
   ========================================================== */

export function renderTxCatChips(
  cats,
  selectedId
){

  if (
    !cats.length
  ){

    return (
      '<div class="empty-hint">Crea primero una categoría.</div>'
    );
  }

  return cats.map(
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
            ? 'border-color:var(--violet);background:rgba(6,182,212,0.2);'
            : ''
        ) +
        '" data-action="pick-tx-cat" data-id="' +
        c.id +
        '">' +

        '<span class="chip-icon" style="background:' +
        c.color +
        '25">' +

        (
          ICON_EMOJI[
            c.icon
          ] ||
          '⭐'
        ) +

        '</span><span class="chip-label">' +

        esc(
          c.name
        ) +

        '</span></button>'
      );
    }
  ).join('');
}

/* ==========================================================
   HOJA DE MOVIMIENTO
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
    '>Guardar</button></div>' +

    '</div></div>'
  );
}

/* ==========================================================
   HOJA DE CATEGORÍA
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
          ICON_EMOJI[k] +
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

    '<div class="toggle-row" data-action="toggle-primary">' +

    '<div><div class="tlabel">Ingreso principal</div></div>' +

    '<div class="switch ' +
    (
      sheet.primary
        ? 'on'
        : ''
    ) +
    '" id="primarySwitch"><div class="knob"></div></div>' +

    '</div></div>' +

    '<div id="fixedField" style="display:' +
    (
      sheet.type === 'expense'
        ? 'block'
        : 'none'
    ) +
    '">' +

    '<div class="toggle-row" data-action="toggle-fixed">' +

    '<div><div class="tlabel">Gasto fijo</div></div>' +

    '<div class="switch ' +
    (
      sheet.isFixed
        ? 'on-violet'
        : ''
    ) +
    '" id="fixedSwitch"><div class="knob"></div></div>' +

    '</div></div>' +

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
    '>Guardar</button></div>' +

    '</div></div>'
  );
}

/* ==========================================================
   HOJA DE CRÉDITO
   ========================================================== */

export function renderCreditSheet(
  sheet
){

  const valid =
    sheet.title.trim().length >
      0 &&
    Number(
      sheet.total
    ) > 0;

  return (
    '<div class="overlay"><div class="sheet"><div class="sheet-handle"></div>' +

    '<div class="sheet-head"><h3>' +
    (
      sheet.mode === 'edit'
        ? 'Editar crédito'
        : 'Nuevo crédito'
    ) +
    '</h3><button data-action="close-sheet">' +
    icon('close') +
    '</button></div>' +

    '<div class="type-toggle"><button class="' +
    (
      sheet.type === 'against'
        ? 'active-expense'
        : ''
    ) +
    '" data-action="credit-type" data-type="against">Deuda</button>' +

    '<button class="' +
    (
      sheet.type === 'favor'
        ? 'active-income'
        : ''
    ) +
    '" data-action="credit-type" data-type="favor">Cobro</button></div>' +

    '<div class="field"><div class="field-label">Concepto / Persona</div><input id="c-title" value="' +
    esc(
      sheet.title
    ) +
    '"></div>' +

    '<div class="field"><div class="field-label">Valor total</div><input id="c-total" type="text" inputmode="numeric" value="' +
    esc(
      formatThousandInput(
        sheet.total
      )
    ) +
    '"></div>' +

    '<div class="sheet-actions">' +

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
    '>Guardar</button></div>' +

    '</div></div>'
  );
}

/* ==========================================================
   HOJA DE APORTE
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

    '<div class="field"><div class="field-label">Monto</div><input id="p-amount" type="text" inputmode="numeric" value="' +
    esc(
      formatThousandInput(
        sheet.amount
      )
    ) +
    '"></div>' +

    '<div class="field"><div class="field-label">Fecha</div><input id="p-date" type="date" value="' +
    esc(
      sheet.date
    ) +
    '"></div>' +

    '<div class="field"><div class="field-label">Nota</div><input id="p-note" value="' +
    esc(
      sheet.note
    ) +
    '"></div>' +

    '<div class="sheet-actions">' +

    (
      sheet.mode === 'edit'
        ? '<button class="del-btn" data-action="delete-payment">' +
          icon('trash') +
          '</button>'
        : ''
    ) +

    '<button class="save-btn" id="pay-save-btn" data-action="save-payment" ' +
    (
      valid
        ? ''
        : 'disabled'
    ) +
    '>Guardar aporte</button></div>' +

    '</div></div>'
  );
}

/* ==========================================================
   ITEMS DE FACTURA
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

        '<div class="item-edit-row">' +

        '<input class="item-name" data-idx="' +
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
            it.price
          )
        ) +
        '">' +

        '<button class="item-remove-btn" data-action="remove-invoice-item" data-idx="' +
        idx +
        '">' +
        icon('trash') +
        '</button>' +

        '</div>'
      )
    )
    .join('');
}

/* ==========================================================
   HOJA DE FACTURA
   ========================================================== */

export function renderInvoiceSheet(
  sheet
){

  const total =
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

/* ==========================================================
   CONFIRMACIÓN
   ========================================================== */

export function renderConfirmDialog(
  confirmState
){

  return (
    '<div class="overlay overlay-center"><div class="confirm-box"><p>' +
    esc(
      confirmState.message
    ) +
    '</p>' +

    '<div class="confirm-actions">' +

    '<button class="confirm-cancel" data-action="cancel-confirm">Cancelar</button>' +

    '<button class="confirm-ok" data-action="confirm-ok">Confirmar</button>' +

    '</div></div></div>'
  );
}

/* ==========================================================
   OVERLAY DE ESCANEO
   ========================================================== */

export function renderScanningOverlay(
  scanningOverlay
){

  return (
    '<div class="overlay overlay-center"><div class="confirm-box" style="text-align:center;">' +

    '<div class="spinner" style="margin:0 auto 14px;"></div>' +

    '<p>' +
    esc(
      scanningOverlay.message
    ) +
    '</p>' +

    '</div></div>'
  );
}
