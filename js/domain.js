import { DB } from './state.js';

export function catById(id){
  return DB.categories.find(c => c.id === id);
}

export function getPrimaryIncomeCat(){
  return DB.categories.find(c => c.type === 'income' && c.primary) || null;
}

/* ==========================================================
   CÁLCULOS Y ESTADÍSTICAS
   ========================================================== */

export function computeTotals(){
  let income = 0;
  let expense = 0;

  DB.transactions.forEach(t => {
    const amt = Number(t.amount) || 0;

    if (t.type === 'income') {
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
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return DB.transactions.filter(
    t =>
      t.date &&
      typeof t.date === 'string' &&
      t.date.substring(0, 7) === localMonthKey
  );
}

export function computeMonthStats(){
  const primary = getPrimaryIncomeCat();

  let primaryIncome = 0;
  let secondaryIncome = 0;
  let expense = 0;

  currentMonthTx().forEach(t => {
    const amt = Number(t.amount) || 0;

    if (t.type === 'income') {
      if (primary && t.categoryId === primary.id) {
        primaryIncome += amt;
      } else {
        secondaryIncome += amt;
      }
    } else {
      expense += amt;
    }
  });

  const income = primaryIncome + secondaryIncome;
  const netSavings = income - expense;

  const savingsRate =
    income > 0
      ? Math.max(0, Math.round((netSavings / income) * 100))
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

  const curY = now.getFullYear();
  const curM = now.getMonth();

  const prevMDate = new Date(curY, curM - 1, 1);

  const prevMonthKey =
    `${prevMDate.getFullYear()}-${String(prevMDate.getMonth() + 1).padStart(2, '0')}`;

  const currentMonthKey =
    `${curY}-${String(curM + 1).padStart(2, '0')}`;

  let currentExpense = 0;
  let prevExpense = 0;
  let currentIncome = 0;
  let prevIncome = 0;

  const currentCatMap = {};
  const prevCatMap = {};

  DB.transactions.forEach(t => {
    if (!t.date) return;

    const mKey = t.date.substring(0, 7);
    const amt = Number(t.amount) || 0;

    if (mKey === currentMonthKey) {
      if (t.type === 'expense') {
        currentExpense += amt;

        currentCatMap[t.categoryId] =
          (currentCatMap[t.categoryId] || 0) + amt;
      } else {
        currentIncome += amt;
      }

    } else if (mKey === prevMonthKey) {

      if (t.type === 'expense') {
        prevExpense += amt;

        prevCatMap[t.categoryId] =
          (prevCatMap[t.categoryId] || 0) + amt;
      } else {
        prevIncome += amt;
      }
    }
  });

  const currentSavings =
    currentIncome - currentExpense;

  const prevSavings =
    prevIncome - prevExpense;

  const expChangePct =
    prevExpense > 0
      ? Math.round(
          (
            (currentExpense - prevExpense) /
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
            (currentIncome - prevIncome) /
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

  Object.keys(currentCatMap).forEach(catId => {

    const diff =
      currentCatMap[catId] -
      (prevCatMap[catId] || 0);

    if (
      diff > maxDiff &&
      diff > 0
    ) {
      maxDiff = diff;
      highestGrowthCat = catById(catId);
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

  currentMonthTx().forEach(t => {

    if (t.type === 'expense') {

      map[t.categoryId] =
        (map[t.categoryId] || 0) +
        (Number(t.amount) || 0);
    }
  });

  return Object.entries(map)
    .map(
      ([id, total]) => ({
        id,
        total,
        cat: catById(id)
      })
    )
    .filter(
      r => r.cat
    )
    .sort(
      (a, b) =>
        b.total - a.total
    );
}

/* ==========================================================
   RITMO DE GASTO DIARIO
   ========================================================== */

export function computeBurnMetrics(){

  const today = new Date();

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

  /*
   * IMPORTANTE:
   *
   * Los pagos de créditos viven en:
   *
   * DB.credits[].payments
   *
   * y no son gastos diarios.
   *
   * Además protegemos el cálculo por si en el futuro
   * algún módulo guarda un pago como transacción técnica.
   */

  const isDailyExpense =
    t =>
      t &&
      t.type === 'expense' &&
      !fixedCatIds.includes(
        t.categoryId
      ) &&
      !!t.date &&
      !t.isCreditPayment &&
      !t.creditPayment &&
      !t.creditId;

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
    [0, 0, 0];

  DB.transactions.forEach(t => {

    if (
      !isDailyExpense(t)
    ) {
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
    ) {
      return;
    }

    const day =
      tDate.getDate();

    if (
      day > currentDay
    ) {
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
  ) {

    for (
      let p =
        periodNumber - 1;
      p >= 0;
      p--
    ) {

      if (
        periodExpenses[p] > 0
      ) {

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
            r =>
              r.id === c.id
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
        cat: c,
        spent,
        pct: spentPct,
        over,
        isPacingFast
      };
    });
}

/* ==========================================================
   MOTOR FINANCIERO DE CRÉDITOS
   ========================================================== */

/*
 * Normaliza créditos antiguos y nuevos.
 *
 * Los créditos existentes de versiones anteriores no necesitan
 * ser recreados: simplemente se interpretan como créditos
 * sin intereses.
 */

export function normalizeCredit(credit){

  const c =
    credit || {};

  const interestRate =
    Math.max(
      0,
      Number(
        c.interestRate
      ) || 0
    );

  const termMonths =
    Math.max(
      0,
      Math.floor(
        Number(
          c.termMonths
        ) || 0
      )
    );

  const interestEnabled =
    Boolean(
      c.interestEnabled
    ) ||
    interestRate > 0;

  const interestPeriod =
    c.interestPeriod === 'annual'
      ? 'annual'
      : 'monthly';

  return {
    ...c,

    total:
      Math.max(
        0,
        Number(
          c.total
        ) || 0
      ),

    interestEnabled,

    interestRate,

    interestPeriod,

    termMonths,

    startDate:
      c.startDate ||
      c.date ||
      '',

    amortization:
      c.amortization ||
      'french',

    payments:
      Array.isArray(
        c.payments
      )
        ? c.payments.map(
            p => ({
              ...p,
              amount:
                Math.max(
                  0,
                  Number(
                    p.amount
                  ) || 0
                )
            })
          )
        : []
  };
}

/*
 * Calcula:
 *
 * - Capital
 * - Tasa
 * - Cuota estimada
 * - Intereses estimados
 * - Total estimado
 * - Capital pagado
 * - Intereses pagados
 * - Capital pendiente
 * - Saldo total
 * - Avance
 */

export function computeCreditPlan(
  credit
){

  const c =
    normalizeCredit(
      credit
    );

  const principal =
    c.total;

  const rate =
    c.interestRate;

  const termMonths =
    c.termMonths;

  const monthlyRate =
    c.interestEnabled
      ? (
          c.interestPeriod === 'annual'
            ? rate / 100 / 12
            : rate / 100
        )
      : 0;

  let monthlyPayment =
    0;

  let scheduledTotal =
    principal;

  let estimatedInterest =
    0;

  /*
   * Sistema francés:
   *
   * cuota =
   * P * [r(1+r)^n] / [(1+r)^n - 1]
   */

  if (
    principal > 0 &&
    termMonths > 0 &&
    monthlyRate > 0
  ){

    const factor =
      Math.pow(
        1 + monthlyRate,
        termMonths
      );

    monthlyPayment =
      principal *
      (
        monthlyRate *
        factor
      ) /
      (
        factor - 1
      );

    scheduledTotal =
      monthlyPayment *
      termMonths;

    estimatedInterest =
      Math.max(
        0,
        scheduledTotal -
        principal
      );

  } else if (
    principal > 0 &&
    termMonths > 0
  ){

    monthlyPayment =
      principal /
      termMonths;

    scheduledTotal =
      principal;

    estimatedInterest =
      0;
  }

  const breakdown =
    computeCreditPaymentBreakdown(
      c,
      monthlyRate
    );

  const paidTotal =
    breakdown.reduce(
      (
        sum,
        p
      ) =>
        sum +
        p.amount,
      0
    );

  const paidInterest =
    breakdown.reduce(
      (
        sum,
        p
      ) =>
        sum +
        p.interestPaid,
      0
    );

  const paidPrincipal =
    breakdown.reduce(
      (
        sum,
        p
      ) =>
        sum +
        p.principalPaid,
      0
    );

  const remainingPrincipal =
    Math.max(
      0,
      principal -
      paidPrincipal
    );

  const pendingTotal =
    Math.max(
      0,
      scheduledTotal -
      paidTotal
    );

  const progressPct =
    scheduledTotal > 0
      ? Math.min(
          100,
          Math.round(
            (
              paidTotal /
              scheduledTotal
            ) * 100
          )
        )
      : 0;

  return {
    principal,

    interestEnabled:
      c.interestEnabled &&
      rate > 0,

    interestRate:
      rate,

    interestPeriod:
      c.interestPeriod,

    termMonths,

    monthlyRate,

    monthlyPayment,

    scheduledTotal,

    estimatedInterest,

    paidTotal,

    paidInterest,

    paidPrincipal,

    remainingPrincipal,

    pendingTotal,

    progressPct,

    paymentCount:
      c.payments.length,

    breakdown
  };
}

/*
 * Distribución de cada aporte.
 *
 * El cálculo aplica primero el interés del período y después
 * amortiza capital.
 *
 * Esto permite mostrar de forma transparente:
 *
 * Aporte $500.000
 * Interés $100.000
 * Capital $400.000
 */

export function computeCreditPaymentBreakdown(
  credit,
  monthlyRateOverride = null
){

  const c =
    normalizeCredit(
      credit
    );

  const monthlyRate =
    monthlyRateOverride === null

      ? (
          c.interestEnabled
            ? (
                c.interestPeriod === 'annual'
                  ? c.interestRate / 100 / 12
                  : c.interestRate / 100
              )
            : 0
        )

      : Math.max(
          0,
          Number(
            monthlyRateOverride
          ) || 0
        );

  let principalBalance =
    c.total;

  const sorted =
    c.payments
      .map(
        (
          p,
          index
        ) => ({
          ...p,
          __index:index
        })
      )
      .sort(
        (
          a,
          b
        ) => {

          const da =
            a.date || '';

          const db =
            b.date || '';

          return (
            da +
            String(
              a.__index
            )
          ).localeCompare(
            db +
            String(
              b.__index
            )
          );
        }
      );

  return sorted.map(
    (
      p,
      index
    ) => {

      const amount =
        Math.max(
          0,
          Number(
            p.amount
          ) || 0
        );

      let interestDue =
        0;

      if (
        monthlyRate > 0 &&
        principalBalance > 0
      ){

        interestDue =
          principalBalance *
          monthlyRate;
      }

      const interestPaid =
        Math.min(
          amount,
          interestDue
        );

      const principalPaid =
        Math.min(
          Math.max(
            0,
            principalBalance
          ),
          Math.max(
            0,
            amount -
            interestPaid
          )
        );

      const excess =
        Math.max(
          0,
          amount -
          interestPaid -
          principalPaid
        );

      principalBalance =
        Math.max(
          0,
          principalBalance -
          principalPaid
        );

      return {
        ...p,

        sequence:
          index + 1,

        amount,

        interestDue,

        interestPaid,

        principalPaid,

        excess,

        remainingPrincipal:
          principalBalance
      };
    }
  );
}

/* ==========================================================
   PAGOS DE CRÉDITOS DEL MES
   ========================================================== */

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
        c.type ===
        'against'
    )
    .reduce(
      (
        sum,
        c
      ) => {

        const monthlyPaid =
          (
            c.payments || []
          )
            .filter(
              p =>
                p.date &&
                typeof p.date === 'string' &&
                p.date.substring(0, 7) ===
                  currentMonthKey
            )
            .reduce(
              (
                s,
                p
              ) =>
                s +
                (
                  Number(
                    p.amount
                  ) || 0
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
   RESUMEN DE CRÉDITOS
   ========================================================== */

export function computeCreditsSummary(){

  const now =
    new Date();

  const currentMonthKey =
    `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, '0')}`;

  const prevDate =
    new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );

  const prevMonthKey =
    `${prevDate.getFullYear()}-${String(
      prevDate.getMonth() + 1
    ).padStart(2, '0')}`;

  let againstTotal = 0;
  let againstPaidTotal = 0;
  let againstPaidThisMonth = 0;
  let againstPaidPrevMonth = 0;
  let againstCount = 0;

  let favorTotal = 0;
  let favorPaidTotal = 0;
  let favorPaidThisMonth = 0;
  let favorPaidPrevMonth = 0;
  let favorCount = 0;

  (
    DB.credits || []
  ).forEach(
    raw => {

      const c =
        normalizeCredit(
          raw
        );

      const plan =
        computeCreditPlan(
          c
        );

      const paidTotal =
        plan.paidTotal;

      const paidThisMonth =
        c.payments
          .filter(
            p =>
              p.date &&
              typeof p.date === 'string' &&
              p.date.substring(0, 7) ===
                currentMonthKey
          )
          .reduce(
            (
              s,
              p
            ) =>
              s +
              (
                Number(
                  p.amount
                ) || 0
              ),
            0
          );

      const paidPrevMonth =
        c.payments
          .filter(
            p =>
              p.date &&
              typeof p.date === 'string' &&
              p.date.substring(0, 7) ===
                prevMonthKey
          )
          .reduce(
            (
              s,
              p
            ) =>
              s +
              (
                Number(
                  p.amount
                ) || 0
              ),
            0
          );

      if (
        c.type ===
        'against'
      ){

        againstTotal +=
          plan.scheduledTotal;

        againstPaidTotal +=
          paidTotal;

        againstPaidThisMonth +=
          paidThisMonth;

        againstPaidPrevMonth +=
          paidPrevMonth;

        againstCount +=
          1;

      } else if (
        c.type ===
        'favor'
      ){

        favorTotal +=
          plan.scheduledTotal;

        favorPaidTotal +=
          paidTotal;

        favorPaidThisMonth +=
          paidThisMonth;

        favorPaidPrevMonth +=
          paidPrevMonth;

        favorCount +=
          1;
      }
    }
  );

  const againstPending =
    Math.max(
      0,
      againstTotal -
      againstPaidTotal
    );

  const favorPending =
    Math.max(
      0,
      favorTotal -
      favorPaidTotal
    );

  const againstProgressPct =
    againstTotal > 0
      ? Math.min(
          100,
          Math.round(
            (
              againstPaidTotal /
              againstTotal
            ) * 100
          )
        )
      : 0;

  const favorProgressPct =
    favorTotal > 0
      ? Math.min(
          100,
          Math.round(
            (
              favorPaidTotal /
              favorTotal
            ) * 100
          )
        )
      : 0;

  let paymentChangePct =
    0;

  if (
    againstPaidPrevMonth > 0
  ){

    paymentChangePct =
      Math.round(
        (
          (
            againstPaidThisMonth -
            againstPaidPrevMonth
          ) /
          againstPaidPrevMonth
        ) * 100
      );

  } else if (
    againstPaidThisMonth > 0
  ){

    paymentChangePct =
      100;
  }

  return {
    againstTotal,
    againstPaidTotal,
    againstPending,
    againstProgressPct,
    againstCount,
    againstPaidThisMonth,
    againstPaidPrevMonth,
    paymentChangePct,

    favorTotal,
    favorPaidTotal,
    favorPending,
    favorProgressPct,
    favorCount,
    favorPaidThisMonth,
    favorPaidPrevMonth
  };
}
