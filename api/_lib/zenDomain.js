// Cálculos deterministas de Zen. Funciones puras sobre los mismos arrays
// que ya existen en el payload de user_data (transactions/categories/
// invoices) — NO se inventa ningún campo que no exista ya en esos datos.
// Reimplementa (no reutiliza) las agregaciones de js/domain.js porque ese
// módulo depende del singleton DB de state.js atado a localStorage, que no
// existe en este runtime serverless (ver informe de auditoría).

export function inRange(dateStr, start, end) {
  return typeof dateStr === 'string' && dateStr >= start && dateStr <= end;
}

export function filterTx(transactions, { start, end, type, categoryId } = {}) {
  return (transactions || []).filter(t => {
    if (!t || !t.date) return false;
    if (start && end && !inRange(t.date, start, end)) return false;
    if (type && t.type !== type) return false;
    if (categoryId && t.categoryId !== categoryId) return false;
    return true;
  });
}

export function sumAmount(list) {
  return (list || []).reduce((s, t) => s + (Number(t.amount) || 0), 0);
}

export function avgAmount(list) {
  return list && list.length ? sumAmount(list) / list.length : 0;
}

export function maxTxItem(list) {
  if (!list || !list.length) return null;
  return list.reduce((best, t) => ((Number(t.amount) || 0) > (Number(best.amount) || 0) ? t : best), list[0]);
}

export function minTxItem(list) {
  if (!list || !list.length) return null;
  return list.reduce((best, t) => ((Number(t.amount) || 0) < (Number(best.amount) || 0) ? t : best), list[0]);
}

export function topNByAmount(list, n) {
  return [...(list || [])].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0)).slice(0, n);
}

// Criterio de Zen (distinto, a propósito, del pie-chart del Dashboard en
// js/ui.js, que divide entre el ingreso del mes): `pct` es SIEMPRE
// gasto de la categoría / gasto TOTAL de `list` (la misma lista ya
// filtrada por período que le pasa el llamador) × 100, redondeado a 1
// decimal — nunca a entero. Ej.: total 1.000.000, categoría 333.333 -> 33.3.
export function groupByCategory(list, categories) {
  const map = new Map();
  (list || []).forEach(t => {
    const key = t.categoryId || '(sin categoría)';
    const cur = map.get(key) || { categoryId: t.categoryId || null, total: 0, count: 0 };
    cur.total += Number(t.amount) || 0;
    cur.count += 1;
    map.set(key, cur);
  });
  const total = [...map.values()].reduce((s, r) => s + r.total, 0);
  return [...map.values()]
    .map(r => {
      const cat = (categories || []).find(c => c.id === r.categoryId);
      return {
        categoryId: r.categoryId,
        name: cat ? cat.name : 'Sin categoría',
        total: r.total,
        count: r.count,
        pct: total > 0 ? Math.round((r.total / total) * 1000) / 10 : 0
      };
    })
    .sort((a, b) => b.total - a.total);
}

// ÚNICA definición de "balance disponible" en Zentra: réplica exacta de
// computeTotals() en js/domain.js (usada por el Dashboard, etiqueta "Balance
// disponible") — suma de TODOS los movimientos, sin filtrar por fecha. No se
// pudo importar domain.js directamente porque depende del singleton DB de
// state.js (localStorage), que no existe en este runtime serverless.
export function computeAvailableBalance(transactions) {
  let income = 0;
  let expense = 0;
  (transactions || []).forEach(t => {
    const amt = Number(t.amount) || 0;
    if (t.type === 'income') income += amt;
    else expense += amt;
  });
  return { income, expense, balance: income - expense };
}

export function findCategoryByName(categories, normalizedName) {
  return (categories || []).find(c => c && c.name && c.name.toLowerCase() === normalizedName.toLowerCase()) || null;
}

export function percentOf(part, whole) {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;
}

// Criterio de Zen: variación entre dos períodos con 1 decimal de precisión
// (nunca entero), a propósito distinto del redondeo a entero que usa
// js/domain.js para el Dashboard — son dos superficies separadas y no hace
// falta que coincidan en precisión. Ej.: 18.4, no 18.
export function diffPct(cur, prev) {
  if (prev > 0) return Math.round(((cur - prev) / prev) * 1000) / 10;
  return cur > 0 ? 100 : 0;
}

export function unusualItems(list, { factor = 1.5, minCount = 5 } = {}) {
  if (!list || list.length < minCount) return [];
  const amounts = list.map(t => Number(t.amount) || 0);
  const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length;
  const variance = amounts.reduce((s, a) => s + (a - mean) * (a - mean), 0) / amounts.length;
  const std = Math.sqrt(variance);
  if (std <= 0) return [];
  return list.filter(t => (Number(t.amount) || 0) > mean + factor * std);
}

/* ==========================================================
   FACTURAS
   ========================================================== */

export function invoiceAmount(inv) {
  return Number(inv?.total) || 0;
}

export function filterInvoices(invoices, { start, end } = {}) {
  return (invoices || []).filter(inv => {
    if (!inv || !inv.date) return false;
    if (start && end && !inRange(inv.date, start, end)) return false;
    return true;
  });
}

export function sumInvoices(list) {
  return (list || []).reduce((s, inv) => s + invoiceAmount(inv), 0);
}

export function maxInvoice(list) {
  if (!list || !list.length) return null;
  return list.reduce((best, inv) => (invoiceAmount(inv) > invoiceAmount(best) ? inv : best), list[0]);
}

export function groupInvoicesByTitle(list) {
  const map = new Map();
  (list || []).forEach(inv => {
    const key = (inv.title || 'Sin nombre').trim().toLowerCase();
    const cur = map.get(key) || { title: inv.title || 'Sin nombre', total: 0, count: 0 };
    cur.total += invoiceAmount(inv);
    cur.count += 1;
    map.set(key, cur);
  });
  return [...map.values()].sort((a, b) => b.total - a.total);
}
