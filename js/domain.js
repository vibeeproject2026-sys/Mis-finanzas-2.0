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

    if (diff > maxDiff && diff > 0) {
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
    .map(([id, total]) => ({
      id,
      total,
      cat: catById(id)
    }))
    .filter(r => r.cat)
    .sort((a, b) => b.total - a.total);
}

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
    Math.max(1, daysInMonth - currentDay + 1);

  const monthPctPassed =
    Math.round((currentDay / daysInMonth) * 100);

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
    Math.max(0, availableFunds) / daysRemaining;

  const fixedCatIds =
    DB.categories
      .filter(
        c =>
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
    !fixedCatIds.includes(t.categoryId) &&
    !!t.date;

  const periodNumber =
    currentDay <= 10
      ? 0
      : (currentDay <= 20 ? 1 : 2);

  const periodStartDay =
    periodNumber === 0
      ? 1
      : (periodNumber === 1 ? 11 : 21);

  const periodEndDay =
    periodNumber === 0
      ? 10
      : (periodNumber === 1 ? 20 : daysInMonth);

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
    ) {
      return;
    }

    const day = tDate.getDate();

    if (day > currentDay) return;

    const p =
      day <= 10
        ? 0
        : (day <= 20 ? 1 : 2);

    periodExpenses[p] +=
      Number(t.amount) || 0;
  });

  const currentPeriodExpense =
    periodExpenses[periodNumber];

  let avgDailyBurn =
    currentPeriodExpense > 0
      ? currentPeriodExpense / currentPeriodDays
      : 0;

  if (avgDailyBurn <= 0) {
    for (
      let p = periodNumber - 1;
      p >= 0;
      p--
    ) {
      if (periodExpenses[p] > 0) {
        avgDailyBurn =
          periodExpenses[p] / 10;
        break;
      }
    }
  }

  const runwayDays =
    avgDailyBurn > 0 &&
    totals.balance > 0
      ? Math.floor(
          totals.balance / avgDailyBurn
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
  const totals = computeCategoryTotals();
  const burn = computeBurnMetrics();

  return DB.categories
    .filter(
      c =>
        c.type === 'expense' &&
        c.budget
    )
    .map(c => {
      const spent =
        (totals.find(r => r.id === c.id) || {})
          .total || 0;

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
        spentPct >
          burn.monthPctPassed + 10;

      return {
        cat: c,
        spent,
        pct: spentPct,
        over,
        isPacingFast
      };
    });
}

export function computeCreditsPaidThisMonth(){
  const now = new Date();

  const currentMonthKey =
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return (DB.credits || [])
    .filter(c => c.type === 'against')
    .reduce((sum, c) => {
      const monthlyPaid =
        (c.payments || [])
          .filter(
            p =>
              p.date &&
              typeof p.date === 'string' &&
              p.date.substring(0, 7) ===
                currentMonthKey
          )
          .reduce(
            (s, p) =>
              s + (Number(p.amount) || 0),
            0
          );

      return sum + monthlyPaid;
    }, 0);
}

export function computeCreditsSummary(){
  let againstTotal = 0;
  let againstPaidTotal = 0;
  let againstCount = 0;

  let favorTotal = 0;
  let favorPaidTotal = 0;
  let favorCount = 0;

  (DB.credits || []).forEach(c => {
    const total =
      Number(c.total) || 0;

    const paidTotal =
      (c.payments || [])
        .reduce(
          (s, p) =>
            s + (Number(p.amount) || 0),
          0
        );

    if (c.type === 'against') {
      againstTotal += total;
      againstPaidTotal += paidTotal;
      againstCount += 1;
    } else if (c.type === 'favor') {
      favorTotal += total;
      favorPaidTotal += paidTotal;
      favorCount += 1;
    }
  });

  return {
    againstTotal,
    againstPaidTotal,
    againstPending:
      Math.max(
        0,
        againstTotal - againstPaidTotal
      ),
    againstProgressPct:
      againstTotal > 0
        ? Math.min(
            100,
            Math.round(
              (againstPaidTotal /
                againstTotal) *
                100
            )
          )
        : 0,
    againstCount,

    favorTotal,
    favorPaidTotal,
    favorPending:
      Math.max(
        0,
        favorTotal - favorPaidTotal
      ),
    favorProgressPct:
      favorTotal > 0
        ? Math.min(
            100,
            Math.round(
              (favorPaidTotal /
                favorTotal) *
                100
            )
          )
        : 0,
    favorCount
  };
}
