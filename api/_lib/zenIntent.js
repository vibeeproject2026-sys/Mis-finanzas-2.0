// Interpretación determinista de la intención del usuario (sin IA). Si esto
// no logra resolver un tipo de métrica claro, zen-chat.js recurre a un
// único llamado a IA (solo para interpretar, nunca para calcular).

import { normalizeText } from './zenDates.js';

const WRITE_VERBS = /\b(crea|crear|agrega|agregar|anad[ei]|elimina|eliminar|borra|borrar|edita|editar|modifica|modificar|cambia|cambiar|actualiza|actualizar|registra|registrar|quita|quitar)\b/;
const WRITE_NOUNS = /\b(movimiento|gasto|ingreso|transaccion|categoria|factura|credito|pago)\b/;

// Detecta intención de escritura ANTES de tocar IA: es una capa extra de
// seguridad (la instrucción de solo-lectura ya va en el prompt del modelo),
// no la única barrera — el endpoint nunca ejecuta ninguna escritura pase lo
// que pase aquí.
export function looksLikeWriteRequest(normText) {
  return WRITE_VERBS.test(normText) && WRITE_NOUNS.test(normText);
}

export function detectThreshold(normText) {
  const m = normText.match(/(?:mayor(?:es)?|super(?:ior|iores)?|arriba|mas)\s+(?:de|a)?\s*\$?\s*([\d.,]+)/);
  if (!m) return null;
  const raw = m[1].replace(/\./g, '').replace(',', '.');
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function findMentionedCategory(normText, categories) {
  let best = null;
  (categories || []).forEach(c => {
    if (!c || !c.name) return;
    const name = normalizeText(c.name);
    if (name.length >= 3 && normText.includes(name)) {
      if (!best || name.length > best.name.length) best = { id: c.id, name };
    }
  });
  return best ? best.id : null;
}

// Para "compara alimentación y entretenimiento": encuentra TODAS las
// categorías mencionadas (no solo la más larga) para poder distinguir una
// comparación categoría-vs-categoría de una consulta sobre una sola.
export function findAllMentionedCategories(normText, categories) {
  const found = [];
  (categories || []).forEach(c => {
    if (!c || !c.name) return;
    const name = normalizeText(c.name);
    if (name.length >= 3 && normText.includes(name) && !found.includes(c.id)) {
      found.push(c.id);
    }
  });
  return found;
}

export function detectComparison(normText) {
  return /compar|\bvs\b|versus|frente a|respecto a|mas que|menos que/.test(normText);
}

// Heurística de seguimiento conversacional: mensajes cortos que dependen
// del contexto de la respuesta anterior ("¿y el mes pasado?", "¿y en
// transporte?", "¿qué porcentaje representa?").
export function isFollowUp(normText) {
  return normText.length <= 60 && /^(y\b|¿y\b|entonces|pero|y eso|y ese)/.test(normText.trim());
}

export function detectMentionsInvoices(normText) {
  return /factura/.test(normText);
}

export function detectMetric(normText, categories) {
  const invoiceContext = detectMentionsInvoices(normText);
  const categoryId = findMentionedCategory(normText, categories);
  const threshold = detectThreshold(normText);
  const compare = detectComparison(normText);

  let type = 'unclear';

  if (/promedio/.test(normText)) type = 'average';
  else if (threshold != null) type = 'large_expenses';
  else if (/(inusual|raro|atipico)/.test(normText)) type = 'unusual';
  else if (/(mas alta|mas cara|mas grande|mayor gasto|gasto mas alto|compra mas (cara|reciente|grande))/.test(normText)) type = 'top';
  else if (/(mas baj[ao]|menor gasto|mas barat[ao])/.test(normText)) type = 'bottom';
  else if (/cuant[oa]s\b/.test(normText)) type = 'count'; // plural "cuántos/cuántas" = conteo; "cuánto" (singular) es monto, no conteo.
  else if (/(distribucion|como se distribu|en que estoy gastando|en que se me esta yendo|donde estoy gastando|donde gasto|que categoria|categoria de mayor gasto|categoria con mayor gasto)/.test(normText)) type = 'by_category';
  // Zen 2.0: "resumen financiero" tiene su propia tarjeta determinista
  // (Sección 10) — se resuelve ANTES que 'balance'/'total_expense' para que
  // "cómo voy"/"cómo estoy" no se confundan con un simple total de gasto.
  else if (/(como estoy|como voy|como estan mis finanzas|resumen)/.test(normText)) type = 'summary';
  // "balance"/"disponible" también se resuelve antes que 'ingres'/'gast' para
  // que "¿cuánto tengo disponible?" no caiga en total_income/total_expense.
  else if (/(disponible|cuanto tengo|cuanto me queda|como esta mi balance|ahorr|\bbalance\b)/.test(normText)) type = 'balance';
  // "¿Cuánto ingresé y cuánto gasté?" (Sección 2) pide AMBAS cifras a la
  // vez: eso es exactamente lo que ya calcula/responde el tipo 'balance'
  // (income + expense + neto), no solo una de las dos por separado.
  else if (/ingres/.test(normText) && /gast/.test(normText)) type = 'balance';
  else if (/ingres/.test(normText)) type = 'total_income';
  // Preguntas analíticas reales (Sección 6): "analiza", "qué patrones", "por
  // qué fue diferente" — se redactan con 1 llamada de IA (ver ANALYSIS PATH).
  else if (/(insight|analiz|patron|tendencia|cambios? (importantes|relevantes)|por que.*(diferente|paso|cambio))/.test(normText)) type = 'insights';
  else if (/(gast|cuanto llevo)/.test(normText)) type = 'total_expense';
  else if (categoryId) type = 'total_expense';

  if (invoiceContext) {
    const map = { total_expense: 'invoices_total', count: 'invoices_count', top: 'invoices_max', bottom: 'invoices_min' };
    if (map[type]) type = map[type];
    else if (type === 'unclear') type = 'invoices_total';
  }

  return { type, categoryId, threshold, compare };
}
