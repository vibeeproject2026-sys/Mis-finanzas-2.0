// Zen — UI del asistente financiero (Fase 5A, solo lectura).
// Módulo separado de ui.js (que ya es muy grande) para mantener a Zen como
// una pieza autocontenida, siguiendo el mismo lenguaje visual del resto de
// Zentra (mismas clases .overlay/.sheet, mismos tokens de css/variables.css).

import { DB } from './state.js';
import { icon, esc, fmtMoney } from './ui.js';
import { computeMonthStats } from './domain.js';

const ZEN_SEND_SVG = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7Z"/></svg>';

/* ==========================================================
   SALUDO INICIAL CON CONTEXTO FINANCIERO (Sección 11, Zen 2.0)
   100% determinista y client-side: reutiliza computeMonthStats(), la MISMA
   función que ya usa el Dashboard (js/ui.js) para "Ingresos/Gastos del mes"
   y "Ahorro neto este mes" — no se define un cálculo nuevo, y no requiere
   ninguna llamada a Zen ni a IA (Sección 11: "no hacer llamadas costosas de
   IA solo para generar el saludo").
   ========================================================== */

function buildZenGreeting() {
  if (!(DB.transactions || []).length) {
    return 'Hola 👋<br>Todavía no tienes suficientes datos registrados para generar un resumen financiero.';
  }

  const month = computeMonthStats();

  return (
    'Hola 👋<br><br>' +
    'Este mes llevas:<br>' +
    'Ingresos: ' + fmtMoney(month.income) + '<br>' +
    'Gastos: ' + fmtMoney(month.expense) + '<br>' +
    'Balance: ' + fmtMoney(month.netSavings) + '<br><br>' +
    '¿Qué quieres analizar?'
  );
}

/* ==========================================================
   SUGERENCIAS INICIALES (se adaptan a los datos disponibles)
   ========================================================== */

export function buildZenSuggestions() {
  const hasTx = (DB.transactions || []).length > 0;
  const hasInvoices = (DB.invoices || []).length > 0;

  if (!hasTx && !hasInvoices) {
    return ['¿Qué puedes hacer por mí?', '¿Cómo funciona Zen?'];
  }

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const hasPrevMonthData = (DB.transactions || []).some(t => (t.date || '').startsWith(prevMonthKey));
  const hasThisMonthData = (DB.transactions || []).some(t => (t.date || '').startsWith(monthKey));

  const suggestions = [];
  if (hasThisMonthData) suggestions.push('¿Cuánto gasté este mes?');
  if (hasTx) suggestions.push('¿En qué estoy gastando más?');
  if (hasPrevMonthData) suggestions.push('Compara mis gastos con el mes pasado.');
  if (hasTx) suggestions.push('¿Cuál fue mi gasto más alto?');
  if (hasThisMonthData) suggestions.push('Muéstrame cómo se distribuyeron mis gastos.');
  if (hasInvoices) suggestions.push('¿Cuál fue mi factura más alta?');

  return suggestions.slice(0, 5);
}

/* ==========================================================
   OVERLAY PRINCIPAL DEL CHAT
   ========================================================== */

export function renderZenSheet(zenState) {
  const messages = zenState.messages || [];
  const showSuggestions = messages.length === 0 && !zenState.loading;

  return (
    '<div class="overlay zen-overlay" id="zen-overlay">' +
    '<div class="sheet zen-sheet">' +
    '<div class="sheet-handle"></div>' +

    '<div class="sheet-head">' +
    '<h3><span class="zen-title-spark">✦</span> Zen</h3>' +
    '<button data-action="close-zen">' + icon('close') + '</button>' +
    '</div>' +

    '<div class="zen-readonly-note">Zen solo consulta y analiza tu información. No crea, edita ni elimina nada.</div>' +

    '<div class="zen-messages" id="zen-messages">' +

    (
      messages.length === 0
        ? (
            '<div class="zen-bubble zen-bubble--assistant">' +
            buildZenGreeting() +
            '</div>'
          )
        : ''
    ) +

    messages.map(renderZenMessage).join('') +

    (
      zenState.loading
        ? '<div class="zen-bubble zen-bubble--assistant zen-bubble--loading"><span></span><span></span><span></span></div>'
        : ''
    ) +

    '</div>' +

    (
      showSuggestions
        ? (
            '<div class="zen-suggestions">' +
            (zenState.suggestions || []).map(
              q => '<button class="zen-suggestion-chip" data-action="zen-suggestion" data-question="' + esc(q) + '">' + esc(q) + '</button>'
            ).join('') +
            '</div>'
          )
        : ''
    ) +

    '<div class="zen-input-row">' +
    '<input id="zen-input" type="text" placeholder="Pregúntale algo a Zen..." autocomplete="off" ' + (zenState.loading ? 'disabled' : '') + '>' +
    '<button class="zen-send-btn" data-action="send-zen-message" ' + (zenState.loading ? 'disabled' : '') + '>' + ZEN_SEND_SVG + '</button>' +
    '</div>' +

    '</div></div>'
  );
}

function renderZenMessage(msg) {
  const bubble = (
    '<div class="zen-bubble zen-bubble--' + (msg.role === 'user' ? 'user' : 'assistant') + '">' +
    esc(msg.content).replace(/\n/g, '<br>') +
    '</div>'
  );
  const viz = msg.role === 'assistant' && msg.viz ? renderZenViz(msg.viz) : '';
  return bubble + viz;
}

/* ==========================================================
   VISUALIZACIONES SIMPLES (barras / tabla) A PARTIR DE DATOS
   YA CALCULADOS POR EL BACKEND — nunca inventadas por la IA.
   ========================================================== */

function renderZenViz(viz) {
  if (!viz || !viz.type) return '';

  if (viz.type === 'bars' && Array.isArray(viz.items) && viz.items.length) {
    const max = Math.max(...viz.items.map(i => Number(i.value) || 0), 1);
    return (
      '<div class="zen-viz zen-viz--bars">' +
      (viz.title ? '<div class="zen-viz-title">' + esc(viz.title) + '</div>' : '') +
      viz.items.map(i => {
        const widthPct = Math.max(2, Math.round(((Number(i.value) || 0) / max) * 100));
        return (
          '<div class="zen-bar-row">' +
          '<div class="zen-bar-label">' + esc(i.label) + '</div>' +
          '<div class="zen-bar-track"><div class="zen-bar-fill" style="width:' + widthPct + '%"></div></div>' +
          '<div class="zen-bar-value">' + fmtMoney(i.value) + (i.pct != null ? ' · ' + i.pct + '%' : '') + '</div>' +
          '</div>'
        );
      }).join('') +
      '</div>'
    );
  }

  if (viz.type === 'table' && Array.isArray(viz.rows) && viz.rows.length) {
    return (
      '<div class="zen-viz zen-viz--table">' +
      (viz.title ? '<div class="zen-viz-title">' + esc(viz.title) + '</div>' : '') +
      '<table class="zen-table"><thead><tr>' +
      (viz.columns || []).map(c => '<th>' + esc(c) + '</th>').join('') +
      '</tr></thead><tbody>' +
      viz.rows.map(row => '<tr>' + row.map((cell, idx) => '<td>' + (idx === row.length - 1 ? fmtMoney(cell) : esc(String(cell))) + '</td>').join('') + '</tr>').join('') +
      '</tbody></table>' +
      '</div>'
    );
  }

  return '';
}
