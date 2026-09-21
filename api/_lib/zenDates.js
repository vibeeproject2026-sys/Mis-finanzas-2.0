// Utilidades de fecha para Zen. Todo se maneja como strings 'YYYY-MM-DD'
// (mismo formato que usa todayStr() en el frontend) y aritmética en UTC
// para evitar desfaces de un día por timezone del servidor. La fecha de
// referencia ("hoy") SIEMPRE llega desde fuera (clientToday validado en
// zen-chat.js) — este módulo nunca decide qué día es "hoy".

const MONTHS = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10,
  noviembre: 11, diciembre: 12
};

const MONTH_NAMES = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function pad2(n) { return String(n).padStart(2, '0'); }

export function normalizeText(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

export function isValidDateStr(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(toUTC(s).getTime());
}

function toUTC(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function fmt(y, m, d) {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

export function addDays(dateStr, delta) {
  const d = toUTC(dateStr);
  d.setUTCDate(d.getUTCDate() + delta);
  return fmt(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function daysBetween(startStr, endStr) {
  return Math.round((toUTC(endStr) - toUTC(startStr)) / 86400000) + 1;
}

export function dayOfWeekMonday1(dateStr) {
  const dow = toUTC(dateStr).getUTCDay(); // 0=domingo
  return dow === 0 ? 7 : dow;
}

export function startOfWeek(dateStr) {
  return addDays(dateStr, -(dayOfWeekMonday1(dateStr) - 1));
}

export function endOfWeek(dateStr) {
  return addDays(startOfWeek(dateStr), 6);
}

export function daysInMonth(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function monthRange(y, m) {
  return { start: fmt(y, m, 1), end: fmt(y, m, daysInMonth(y, m)) };
}

export function yearRange(y) {
  return { start: fmt(y, 1, 1), end: fmt(y, 12, 31) };
}

export function quarterRange(y, q) {
  const startMonth = (q - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  return { start: fmt(y, startMonth, 1), end: fmt(y, endMonth, daysInMonth(y, endMonth)) };
}

export function getYMD(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { y, m, d };
}

function monthLabel(m, y, withYear) {
  return MONTH_NAMES[m] + (withYear ? ` de ${y}` : '');
}

/* ==========================================================
   PARSEO DE UNA FECHA SUELTA (para rangos "desde X hasta Y")
   ========================================================== */

function parseFlexibleDate(token, defaultYear, defaultMonth) {
  const t = normalizeText(token).replace(/^el\s+/, '').trim();

  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return fmt(Number(m[1]), Number(m[2]), Number(m[3]));

  m = t.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    const y = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : defaultYear;
    return fmt(y, mo, d);
  }

  m = t.match(/^(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?$/);
  if (m && MONTHS[m[2]]) {
    const y = m[3] ? Number(m[3]) : defaultYear;
    return fmt(y, MONTHS[m[2]], Number(m[1]));
  }

  m = t.match(/^(\d{1,2})$/);
  if (m && defaultMonth) {
    return fmt(defaultYear, defaultMonth, Number(m[1]));
  }

  return null;
}

/* ==========================================================
   RESOLUCIÓN DE PERÍODO A PARTIR DE TEXTO LIBRE
   ========================================================== */

// dataYears: función opcional (month:number) => array de años que SÍ tienen
// datos (transacciones o facturas) en ese mes — permite desambiguar "en
// septiembre" sin preguntar cuando solo hay datos en un año candidato.
export function resolvePeriod(normText, todayStr, dataYears) {
  const today = getYMD(todayStr);

  // 1) Rango explícito "desde/entre A (y/hasta) B" — se revisa primero para
  //    no dejar que un match parcial (p.ej. un nombre de mes suelto) se
  //    coma parte del rango.
  let m = normText.match(/entre\s+el\s+(\d{1,2})\s+y\s+el\s+(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?/);
  if (m) {
    const mo = MONTHS[m[3]];
    if (mo) {
      const y = m[4] ? Number(m[4]) : today.y;
      const start = fmt(y, mo, Number(m[1]));
      const end = fmt(y, mo, Number(m[2]));
      if (isValidDateStr(start) && isValidDateStr(end) && start <= end) {
        return { ok: true, start, end, kind: 'range', label: `del ${m[1]} al ${m[2]} de ${monthLabel(mo, y, !!m[4])}`, partial: false };
      }
    }
  }

  // "desde enero hasta marzo" — ambos extremos son solo nombres de mes (sin
  // día): se toma el mes completo en cada extremo, no un día suelto.
  m = normText.match(/desde\s+([a-z]+)\s+hasta\s+([a-z]+)(?:\s+de\s+(\d{4}))?/);
  if (m && MONTHS[m[1]] && MONTHS[m[2]]) {
    const y = m[3] ? Number(m[3]) : today.y;
    const start = monthRange(y, MONTHS[m[1]]).start;
    const end = monthRange(y, MONTHS[m[2]]).end;
    if (start <= end) {
      return { ok: true, start, end, kind: 'range', label: `de ${monthLabel(MONTHS[m[1]], y, false)} a ${monthLabel(MONTHS[m[2]], y, !!m[3])}`, partial: end > todayStr };
    }
  }

  m = normText.match(/(?:desde|entre)\s+(.+?)\s+(?:hasta|y)\s+(.+?)(?:\.|$)/);
  if (m) {
    const a = parseFlexibleDate(m[1], today.y);
    const b = a ? parseFlexibleDate(m[2], getYMD(a).y, getYMD(a).m) : null;
    if (a && b && isValidDateStr(a) && isValidDateStr(b)) {
      const start = a <= b ? a : b;
      const end = a <= b ? b : a;
      return { ok: true, start, end, kind: 'range', label: `del ${start} al ${end}`, partial: false };
    }
  }

  // 2) Expresiones relativas simples
  if (/\bhoy\b/.test(normText)) {
    return { ok: true, start: todayStr, end: todayStr, kind: 'day', label: 'hoy', partial: false };
  }
  if (/\bantier\b|\banteayer\b/.test(normText)) {
    const d = addDays(todayStr, -2);
    return { ok: true, start: d, end: d, kind: 'day', label: 'anteayer', partial: false };
  }
  if (/\bayer\b/.test(normText)) {
    const d = addDays(todayStr, -1);
    return { ok: true, start: d, end: d, kind: 'day', label: 'ayer', partial: false };
  }

  m = normText.match(/ultimos?\s+(\d{1,3})\s+dias/);
  if (m) {
    const n = Math.max(1, Number(m[1]));
    return { ok: true, start: addDays(todayStr, -(n - 1)), end: todayStr, kind: 'range', label: `los últimos ${n} días`, partial: false };
  }

  if (/semana pasada/.test(normText)) {
    const prevAnchor = addDays(todayStr, -7);
    return { ok: true, start: startOfWeek(prevAnchor), end: endOfWeek(prevAnchor), kind: 'week', label: 'la semana pasada', partial: false };
  }
  if (/esta semana/.test(normText)) {
    return { ok: true, start: startOfWeek(todayStr), end: todayStr, kind: 'week', label: 'esta semana', partial: true };
  }

  if (/mes pasado/.test(normText)) {
    const pm = today.m === 1 ? 12 : today.m - 1;
    const py = today.m === 1 ? today.y - 1 : today.y;
    const r = monthRange(py, pm);
    return { ok: true, start: r.start, end: r.end, kind: 'month', label: `${monthLabel(pm, py, false)} de ${py}`, partial: false };
  }
  if (/este mes/.test(normText)) {
    return { ok: true, start: fmt(today.y, today.m, 1), end: todayStr, kind: 'month', label: 'este mes', partial: true };
  }

  if (/a[ñn]o pasado/.test(normText)) {
    const r = yearRange(today.y - 1);
    return { ok: true, start: r.start, end: r.end, kind: 'year', label: `${today.y - 1}`, partial: false };
  }
  if (/este a[ñn]o/.test(normText)) {
    return { ok: true, start: fmt(today.y, 1, 1), end: todayStr, kind: 'year', label: 'este año', partial: true };
  }

  // 3) Trimestres
  m = normText.match(/(primer|segundo|tercer|cuarto)\s+trimestre(?:\s+de\s+(\d{4}))?/);
  if (m) {
    const qMap = { primer: 1, segundo: 2, tercer: 3, cuarto: 4 };
    const q = qMap[m[1]];
    const y = m[2] ? Number(m[2]) : today.y;
    const r = quarterRange(y, q);
    return { ok: true, start: r.start, end: r.end, kind: 'quarter', label: `el ${m[1]} trimestre de ${y}`, partial: r.end > todayStr };
  }

  // 4) Mes explícito con año
  m = normText.match(/([a-z]+)\s+de\s+(\d{4})/);
  if (m && MONTHS[m[1]]) {
    const mo = MONTHS[m[1]];
    const y = Number(m[2]);
    const r = monthRange(y, mo);
    return { ok: true, start: r.start, end: r.end, kind: 'month', label: `${monthLabel(mo, y, true)}`, partial: y === today.y && mo === today.m };
  }

  // 5) Mes explícito SIN año -> posible ambigüedad
  for (const name of Object.keys(MONTHS)) {
    const re = new RegExp('\\b' + name + '\\b');
    if (re.test(normText)) {
      const mo = MONTHS[name];
      const candidates = [today.y, today.y - 1];
      const withData = typeof dataYears === 'function' ? candidates.filter(y => dataYears(mo, y)) : [];

      let chosenYear = null;
      if (withData.length === 1) {
        chosenYear = withData[0];
      } else if (withData.length === 0) {
        chosenYear = mo <= today.m ? today.y : today.y - 1;
      } else {
        return {
          ok: false,
          needsClarification: true,
          question: `¿Te refieres a ${monthLabel(mo, withData[1], true)} o a ${monthLabel(mo, withData[0], true)}?`
        };
      }

      const r = monthRange(chosenYear, mo);
      return { ok: true, start: r.start, end: r.end, kind: 'month', label: `${monthLabel(mo, chosenYear, true)}`, partial: chosenYear === today.y && mo === today.m };
    }
  }

  return { ok: false, none: true };
}

/* ==========================================================
   PERÍODO COMPARABLE ANTERIOR (respeta parciales)
   ========================================================== */

export function comparablePreviousPeriod(period, todayStr) {
  const { start, end, kind, partial } = period;

  if (kind === 'month') {
    const s = getYMD(start);
    const pm = s.m === 1 ? 12 : s.m - 1;
    const py = s.m === 1 ? s.y - 1 : s.y;
    if (partial) {
      const e = getYMD(end);
      const lastDay = Math.min(e.d, daysInMonth(py, pm));
      return { start: fmt(py, pm, 1), end: fmt(py, pm, lastDay), label: `${monthLabel(pm, py, true)} (hasta el ${lastDay})` };
    }
    const r = monthRange(py, pm);
    return { start: r.start, end: r.end, label: monthLabel(pm, py, true) };
  }

  if (kind === 'year') {
    const s = getYMD(start);
    const py = s.y - 1;
    if (partial) {
      const e = getYMD(end);
      return { start: fmt(py, 1, 1), end: fmt(py, e.m, Math.min(e.d, daysInMonth(py, e.m))), label: `${py} (período comparable)` };
    }
    return { start: fmt(py, 1, 1), end: fmt(py, 12, 31), label: String(py) };
  }

  if (kind === 'quarter') {
    const s = getYMD(start);
    const curQ = Math.floor((s.m - 1) / 3) + 1;
    const pq = curQ === 1 ? 4 : curQ - 1;
    const py = curQ === 1 ? s.y - 1 : s.y;
    const r = quarterRange(py, pq);
    return { start: r.start, end: r.end, label: `el trimestre anterior (${py})` };
  }

  // day / week / range / custom: se desplaza el mismo número de días hacia atrás.
  const len = daysBetween(start, end);
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(len - 1));
  return { start: prevStart, end: prevEnd, label: `del ${prevStart} al ${prevEnd}` };
}
