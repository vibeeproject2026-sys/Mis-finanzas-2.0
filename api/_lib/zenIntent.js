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

/* ==========================================================
   SINÓNIMOS NATURALES DE CATEGORÍA (Hallazgo 5)
   Cada grupo son palabras que un usuario real usa para el MISMO concepto.
   Nunca se inventa una categoría: un grupo solo "cuenta" cuando alguna de
   sus palabras coincide con el NOMBRE REAL de una categoría que el usuario
   ya tiene creada (comparación normalizada, ver candidateCategoriesFromSynonyms).
   Mantenible: agregar un sinónimo nuevo es agregar una palabra a un grupo,
   no una regex aislada nueva.
   ========================================================== */
const CATEGORY_SYNONYM_GROUPS = [
  ['comida', 'alimentos', 'alimento', 'alimentacion', 'mercado', 'supermercado'],
  ['diversion', 'ocio', 'entretenimiento', 'entretencion'],
  ['transporte', 'movilidad', 'gasolina', 'combustible', 'pasajes'],
  ['hogar', 'arriendo', 'vivienda', 'casa'],
  ['salud', 'medico', 'medicina', 'eps', 'doctor'],
  ['compras', 'ropa'],
  ['servicios', 'luz', 'agua', 'internet', 'telefono']
];

// Categorías reales candidatas a las que un sinónimo mencionado podría
// referirse — nunca inventa una categoría, solo mapea palabras naturales a
// categorías que YA existen en `categories`.
function candidateCategoriesFromSynonyms(normText, categories) {
  const matches = new Set();
  CATEGORY_SYNONYM_GROUPS.forEach(group => {
    const mentioned = group.some(word => new RegExp('\\b' + word + '\\b').test(normText));
    if (!mentioned) return;
    (categories || []).forEach(c => {
      if (!c || !c.name) return;
      const name = normalizeText(c.name);
      if (group.some(word => name === word || name.includes(word) || word.includes(name))) {
        matches.add(c.id);
      }
    });
  });
  return [...matches];
}

// best = nombre exacto (ya existente, máxima prioridad: si el usuario
// escribió el nombre real de su categoría, gana sobre cualquier sinónimo).
// Si no hay coincidencia exacta, se intenta por sinónimo (Hallazgo 5). Si el
// sinónimo apunta a MÁS de una categoría real, no se adivina — se marca
// como ambigua para que detectMetric() pida aclaración en vez de inventar.
export function findMentionedCategory(normText, categories) {
  let best = null;
  (categories || []).forEach(c => {
    if (!c || !c.name) return;
    const name = normalizeText(c.name);
    if (name.length >= 3 && normText.includes(name)) {
      if (!best || name.length > best.name.length) best = { id: c.id, name };
    }
  });
  if (best) return { categoryId: best.id, ambiguousNames: null };

  const synonymMatches = candidateCategoriesFromSynonyms(normText, categories);
  if (synonymMatches.length === 1) return { categoryId: synonymMatches[0], ambiguousNames: null };
  if (synonymMatches.length > 1) {
    const names = synonymMatches.map(id => (categories.find(c => c.id === id) || {}).name).filter(Boolean);
    return { categoryId: null, ambiguousNames: names };
  }
  return { categoryId: null, ambiguousNames: null };
}

// Para "compara alimentación y entretenimiento": encuentra TODAS las
// categorías mencionadas (no solo la más larga) para poder distinguir una
// comparación categoría-vs-categoría de una consulta sobre una sola. Usa
// nombre exacto Y sinónimos (Hallazgo 5) — así "comida o transporte, cuál
// pesa más" reconoce ambas categorías reales.
export function findAllMentionedCategories(normText, categories) {
  const found = [];
  (categories || []).forEach(c => {
    if (!c || !c.name) return;
    const name = normalizeText(c.name);
    if (name.length >= 3 && normText.includes(name) && !found.includes(c.id)) {
      found.push(c.id);
    }
  });
  CATEGORY_SYNONYM_GROUPS.forEach(group => {
    const mentioned = group.some(word => new RegExp('\\b' + word + '\\b').test(normText));
    if (!mentioned) return;
    (categories || []).forEach(c => {
      if (!c || !c.name || found.includes(c.id)) return;
      const name = normalizeText(c.name);
      if (group.some(word => name === word || name.includes(word) || word.includes(name))) {
        found.push(c.id);
      }
    });
  });
  return found;
}

export function detectComparison(normText) {
  return /compar|\bvs\b|versus|frente a|respecto a|mas que|menos que/.test(normText);
}

// Heurística de seguimiento conversacional: mensajes cortos que dependen
// del contexto de la respuesta anterior ("y el mes pasado", "y en
// transporte", "qué porcentaje representa").
export function isFollowUp(normText) {
  return normText.length <= 60 && /^(y\b|entonces|pero|y eso|y ese)/.test(normText.trim());
}

export function detectMentionsInvoices(normText) {
  return /factura/.test(normText);
}

// Hallazgo 3: referencias deliberadamente vagas ("eso", "esa cosa", "lo de
// X", "lo que te dije") que NO deben resolverse como si fueran una pregunta
// general — deben aclararse o resolverse con el contexto de la conversación,
// nunca convertirse silenciosamente en "el total general".
const VAGUE_REFERENCE = /\b(eso|ese|esa|esos|esas)\b|\bahi\b|\blo de\b|\blo que (te )?dije\b/;

export function detectMetric(normText, categories) {
  const invoiceContext = detectMentionsInvoices(normText);
  const { categoryId, ambiguousNames } = findMentionedCategory(normText, categories);
  const threshold = detectThreshold(normText);
  const compare = detectComparison(normText);
  const vagueReference = VAGUE_REFERENCE.test(normText);

  let type = 'unclear';

  if (/promedio/.test(normText)) type = 'average';
  // Ronda 3, punto 1: "qué porcentaje/qué tanto representa(n)" + una
  // categoría real ya resuelta -> porcentaje de ESA categoría sobre el
  // gasto total (no el monto). Se evalúa temprano porque "que porcentaje de
  // mis GASTOS..." contiene "gast" y, sin esto, caería en total_expense.
  else if (/(que porcentaje|que tanto representan?|cuanto representan?)/.test(normText) && categoryId) type = 'category_percentage';
  else if (threshold != null) type = 'large_expenses';
  else if (/(inusual|raro|atipico)/.test(normText)) type = 'unusual';
  // Hallazgo 4: "categoría de mayor gasto" / "en qué categoría gasto más" /
  // "dónde gasto más" van SIEMPRE a by_category (categoría agregada) — se
  // evalúan ANTES que 'top' (movimiento individual), porque "mayor gasto"
  // (que sí pertenece a 'top') es una subcadena de "categoría de mayor
  // gasto" y antes ganaba por orden aunque la pregunta fuera de categoría.
  else if (/(distribucion|como se distribu|en que estoy gastando|en que se me esta yendo|en que se me va la plata|donde estoy gastando|donde gasto|en que categoria gasto|que categoria|categoria de mayor gasto|categoria con mayor gasto)/.test(normText)) type = 'by_category';
  // 'top' = movimiento/compra individual más alto (no una categoría).
  // Ronda 3, punto 4: "mas car[ao]" cubre tanto "más cara" (factura/compra)
  // como "más caro" (gasto) — mismo patrón, ambos géneros.
  else if (/(mas alta|mas cara|mas car[ao]|mas grande|mayor gasto|gasto mas alto|compra mas (car[ao]|reciente|grande))/.test(normText)) type = 'top';
  // Hallazgo 6: familia "más bajo/menor/más pequeño" ampliada de forma
  // mantenible (misma regla, más sinónimos en el mismo grupo).
  else if (/(mas baj[ao]|menor gasto|mas barat[ao]|mas pequen[oa]|gasto menor)/.test(normText)) type = 'bottom';
  else if (/cuant[oa]s\b/.test(normText)) type = 'count'; // plural "cuántos/cuántas" = conteo; "cuánto" (singular) es monto, no conteo.
  // Hallazgo 3: la referencia vaga se resuelve ANTES que los patrones
  // "blandos" de abajo (summary/balance/insights/total_expense) — así "¿Qué
  // pasó con ESE gasto?" (vaga) no cae en el mismo patrón "que paso con..."
  // pensado para "¿Qué pasó con MIS GASTOS?" (general, sí es summary). Va
  // DESPUÉS de los patrones estructurales de arriba (average/threshold/
  // unusual/by_category/top/bottom/count) porque esos son frases lo
  // bastante específicas como para ganar aunque contengan un "eso/ese" de
  // paso; nunca inventa categoría ni período — solo evita que la referencia
  // vaga caiga en el total general por defecto.
  else if (vagueReference && !categoryId) type = 'ambiguous_reference';
  // Zen 2.0: "resumen financiero" tiene su propia tarjeta determinista
  // (Sección 10) — se resuelve ANTES que 'balance'/'total_expense' para que
  // "cómo voy"/"cómo estoy" no se confundan con un simple total de gasto.
  // Ampliado (Regla "mes explícito"): "qué tal estuvo/cómo estuvo/qué pasó
  // en <mes>" también pide un resumen del período — así "¿Qué tal estuvo
  // agosto?" se resuelve por cálculo determinista (con el período que ya
  // resuelve resolvePeriod) en vez de dejar que la IA diga "no tengo datos".
  else if (/(como estoy|como voy|como estan mis finanzas|que tal (me fue|estuvo|estuve)|como estuvo|que paso (en|con|ultimamente)|resumen)/.test(normText)) type = 'summary';
  // "balance"/"disponible" también se resuelve antes que 'ingres'/'gast' para
  // que "¿cuánto tengo disponible?" no caiga en total_income/total_expense.
  // Hallazgo 6: "cuánta plata/dinero tengo" (variantes de género/palabra).
  // "cuanto me queda" (presente = tengo disponible AHORA) es DISTINTO de
  // "cuanto me quedo" (pasado = lo que sobró DE UN período, ver 'savings'
  // más abajo) — normalizeText no cambia "queda"/"quedo", así que no chocan.
  else if (/(disponible|cuant[oa] (plata|dinero) tengo|cuanto me queda|como esta mi balance|\bbalance\b)/.test(normText)) type = 'balance';
  // Ronda 3, punto 2 (Ahorro): Zentra ya define "ahorro" en js/domain.js
  // (computeMonthStats().netSavings = ingresos - gastos del mes) — Zen
  // reutiliza EXACTAMENTE esa misma fórmula (el tipo 'balance' ya la
  // calcula para cualquier período), solo que bajo un tipo separado
  // ('savings') para que, a diferencia de 'balance', NUNCA se promueva a
  // "balance disponible" histórico cuando no hay período explícito — el
  // ahorro es siempre del período (por defecto "este mes"), nunca del
  // acumulado histórico. Point 3 (ingresos vs. gastos) usa la misma fórmula
  // por la misma razón: es una pregunta de flujo del período, no de saldo.
  else if (/(ahorr|cuanto me quedo|cuanto me sobro|que me quedo|que me sobro)/.test(normText)) type = 'savings';
  else if (/(ingres|recib[a-z]*)/.test(normText) && /gast/.test(normText)) type = 'savings';
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

  // vagueReference se expone además de usarse arriba: permite que zen-chat.js
  // herede el período de la conversación anterior incluso cuando el tipo de
  // métrica YA se resolvió directamente (ej. "¿qué fue lo más caro ESE MES?"
  // -> type='top' de una vez, sin pasar por 'ambiguous_reference'), en vez de
  // limitarse a los casos 'unclear'/'ambiguous_reference'.
  return { type, categoryId, ambiguousCategoryNames: ambiguousNames, threshold, compare, vagueReference };
}
