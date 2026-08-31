<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no">
<title>Finanzas</title>
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Finanzas">
<meta name="theme-color" content="#EDE9DC">
<style>
  :root{
    --paper:#EDE9DC; --paper-alt:#E2DCC8; --card:#F7F4EA;
    --ink:#20291F; --ink-muted:#65705F; --line:#D3CBAE;
    --income:#2F6F4E; --income-bg:#E1EBDF;
    --expense:#B5482B; --expense-bg:#F3E1D5;
  }
  *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
  html,body{margin:0;padding:0;background:var(--paper);color:var(--ink);
    font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;
    -webkit-font-smoothing:antialiased; overscroll-behavior:none;}
  #root{max-width:480px;margin:0 auto;min-height:100vh;position:relative;display:flex;flex-direction:column;}
  #view{flex:1;overflow-y:auto;padding:1.25rem 1rem 6.5rem;}
  h1,h2,h3,p{margin:0;}
  button{font-family:inherit;border:none;background:none;cursor:pointer;color:inherit;}
  input{font-family:inherit;}
  .icon{width:1em;height:1em;display:inline-block;vertical-align:middle;}
  .icon svg{width:100%;height:100%;}

  .banner{margin-bottom:.75rem;font-size:.75rem;border-radius:12px;padding:.55rem .75rem;}
  .banner--warn{background:var(--expense-bg);color:var(--expense);}

  .section-title{font-size:15px;font-weight:600;margin-bottom:10px;}
  .empty-hint{font-size:12.5px;color:var(--ink-muted);padding:.4rem 0;}

  .balance-label{color:var(--ink-muted);font-size:13px;}
  .balance-amount{font-family:Georgia,"Times New Roman",serif;font-size:36px;font-weight:700;letter-spacing:-.01em;}
  .balance-month{color:var(--ink-muted);font-size:12px;text-transform:capitalize;}

  .stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:18px 0;}
  .stat-card{border-radius:16px;padding:14px;}
  .stat-card .label{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;}
  .stat-card .amount{font-size:19px;font-weight:700;margin-top:4px;}

  .card{border-radius:16px;padding:14px;background:var(--card);border:1px solid var(--line);margin-bottom:14px;}

  .chart-wrap{width:100%;height:140px;}

  .cat-row{margin-bottom:10px;}
  .cat-row .top{display:flex;justify-content:space-between;font-size:12.5px;}
  .cat-row .top .val{font-weight:600;}
  .bar-track{height:8px;border-radius:999px;background:var(--paper-alt);margin-top:4px;overflow:hidden;}
  .bar-fill{height:100%;border-radius:999px;}

  .search-box{display:flex;align-items:center;gap:8px;border-radius:12px;padding:10px 12px;background:var(--card);border:1px solid var(--line);margin-bottom:10px;}
  .search-box input{flex:1;border:none;background:transparent;outline:none;font-size:13.5px;color:var(--ink);}
  .search-box .icon{color:var(--ink-muted);width:15px;height:15px;}

  .filter-row{display:flex;gap:8px;margin-bottom:12px;}
  .chip{padding:7px 13px;border-radius:999px;font-size:12.5px;font-weight:600;background:var(--card);color:var(--ink-muted);border:1px solid var(--line);}
  .chip.selected{background:var(--ink);color:var(--paper);border-color:var(--ink);}

  .tx-item, .cat-item{width:100%;display:flex;align-items:center;gap:12px;border-radius:16px;padding:12px;background:var(--card);border:1px solid var(--line);text-align:left;margin-bottom:8px;}
  .tx-item:active, .cat-item:active{transform:scale(.98);}
  .avatar{width:38px;height:38px;border-radius:999px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:18px;}
  .tx-main{flex:1;min-width:0;}
  .tx-title{font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .tx-sub{font-size:11.5px;color:var(--ink-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .tx-amount{font-size:14px;font-weight:700;flex-shrink:0;}
  .tx-amount.income{color:var(--income);}
  .tx-amount.expense{color:var(--expense);}
  .empty-state{text-align:center;padding:3rem 0;color:var(--ink-muted);font-size:13px;}

  .new-cat-btn{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;border-radius:16px;padding:13px;background:var(--ink);color:var(--paper);font-size:13.5px;font-weight:600;margin-bottom:18px;}
  .cat-item .cat-name{font-size:13.5px;font-weight:600;}
  .cat-item .cat-budget{font-size:11px;color:var(--ink-muted);}
  .cat-item .cat-total{font-size:12.5px;font-weight:600;color:var(--ink-muted);margin-right:4px;}

  .settings-list{border-radius:16px;padding:4px;background:var(--card);border:1px solid var(--line);}
  .settings-row{width:100%;display:flex;justify-content:space-between;align-items:center;padding:11px 12px;border-radius:12px;font-size:13.5px;}
  .settings-row.active{background:var(--paper-alt);}
  .data-box{border-radius:16px;padding:14px;background:var(--card);border:1px solid var(--line);font-size:13px;}
  .data-box .row{display:flex;justify-content:space-between;padding:2px 0;}
  .data-box .row .muted{color:var(--ink-muted);}
  .note{font-size:11.5px;color:var(--ink-muted);margin-top:8px;line-height:1.5;}
  .danger-btn{width:100%;border-radius:16px;padding:12px;font-size:13.5px;font-weight:600;background:var(--expense-bg);color:var(--expense);margin-top:8px;}
  .secondary-btn{width:100%;border-radius:16px;padding:12px;font-size:13.5px;font-weight:600;background:var(--card);border:1px solid var(--line);margin-top:8px;}

  .fab{position:absolute;right:16px;bottom:88px;width:56px;height:56px;border-radius:999px;background:var(--ink);color:var(--paper);display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(0,0,0,.18);}
  .fab:active{transform:scale(.95);}
  .fab .icon{width:26px;height:26px;}

  .tabbar{position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:space-around;align-items:center;
    background:var(--paper-alt);border-top:1px solid var(--line);
    padding-top:.55rem;padding-bottom:max(.85rem, env(safe-area-inset-bottom));}
  .tab-btn{display:flex;flex-direction:column;align-items:center;gap:3px;min-width:64px;color:var(--ink-muted);}
  .tab-btn.active{color:var(--ink);}
  .tab-btn .icon{width:22px;height:22px;}
  .tab-btn span{font-size:11px;}
  .tab-btn.active span{font-weight:600;}

  .overlay{position:fixed;inset:0;z-index:40;display:flex;align-items:flex-end;justify-content:center;background:rgba(32,41,31,.4);}
  .overlay-center{align-items:center;padding:1.5rem;}
  .sheet{width:100%;max-width:480px;background:var(--paper);border-radius:24px 24px 0 0;padding:1.25rem;max-height:88vh;overflow-y:auto;
    padding-bottom:max(1.5rem, env(safe-area-inset-bottom));}
  .sheet-handle{width:36px;height:4px;border-radius:999px;background:var(--line);margin:0 auto 12px;}
  .sheet-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;}
  .sheet-head h3{font-size:16px;font-weight:700;}
  .sheet-head button .icon{width:20px;height:20px;color:var(--ink-muted);}

  .field{margin-bottom:16px;}
  .field-label{font-size:11.5px;font-weight:600;color:var(--ink-muted);margin-bottom:5px;text-transform:uppercase;letter-spacing:.03em;}
  .field input, .field select{width:100%;padding:10px 12px;border-radius:12px;border:1px solid var(--line);background:var(--card);font-size:15px;color:var(--ink);outline:none;}

  .type-toggle{display:flex;border-radius:12px;padding:4px;background:var(--card);border:1px solid var(--line);margin-bottom:16px;}
  .type-toggle button{flex:1;padding:9px;border-radius:9px;font-size:13.5px;font-weight:600;color:var(--ink-muted);}
  .type-toggle button.active-expense{background:var(--expense);color:#fff;}
  .type-toggle button.active-income{background:var(--income);color:#fff;}
  .type-toggle button.active-neutral{background:var(--ink);color:var(--paper);}

  .chip-wrap{display:flex;flex-wrap:wrap;gap:8px;}
  .pick-chip{display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:999px;font-size:12.5px;background:var(--card);border:1px solid var(--line);color:var(--ink);}
  .pick-chip.selected{color:#fff;}
  .pick-chip .em{font-size:14px;}

  .swatch{width:30px;height:30px;border-radius:999px;border:2px solid transparent;}
  .swatch.selected{border-color:var(--ink);}
  .emoji-btn{width:38px;height:38px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:18px;background:var(--card);border:1px solid var(--line);}
  .emoji-btn.selected{border-color:var(--ink);background:var(--paper-alt);}

  .sheet-actions{display:flex;gap:8px;padding-top:4px;}
  .save-btn{flex:1;border-radius:12px;padding:13px;font-weight:600;font-size:14.5px;background:var(--ink);color:var(--paper);}
  .save-btn[disabled]{background:var(--line);}
  .del-btn{border-radius:12px;padding:13px 16px;background:var(--expense-bg);color:var(--expense);}

  .confirm-box{width:100%;max-width:320px;background:var(--paper);border-radius:20px;padding:20px;}
  .confirm-box p{font-size:13.5px;line-height:1.5;}
  .confirm-actions{display:flex;gap:8px;margin-top:16px;}
  .confirm-actions button{flex:1;border-radius:12px;padding:11px;font-size:13.5px;}
  .confirm-cancel{background:var(--card);border:1px solid var(--line);}
  .confirm-ok{background:var(--expense);color:#fff;font-weight:600;}
</style>
</head>
<body>
<div id="root">
  <div id="view"></div>
  <div id="fab-slot"></div>
  <div class="tabbar" id="tabbar"></div>
</div>
<div id="overlays"></div>

<script>
/* ---------------- Datos y almacenamiento ---------------- */
const STORAGE_KEY = 'finanzas_app_v1';

const SWATCHES = ['#2F6F4E','#B5482B','#B08A2E','#3D7A63','#8A5A3B','#9C4A4A','#7A5C8A','#4B6B8A','#5C8F6B','#6B6558'];
const ICON_KEYS = ['food','transport','home','zap','heart','fun','shopping','briefcase','dollarSign','more'];
const ICON_EMOJI = {food:'🍔',transport:'🚗',home:'🏠',zap:'💡',heart:'❤️',fun:'🎬',shopping:'🛍️',briefcase:'💼',dollarSign:'💵',more:'⚪️'};

const DEFAULT_CATEGORIES = [
  {id:'inc-sales',name:'Ventas',type:'income',color:'#2F6F4E',icon:'dollarSign'},
  {id:'inc-salary',name:'Salario',type:'income',color:'#3D7A63',icon:'briefcase'},
  {id:'inc-other',name:'Otros ingresos',type:'income',color:'#5C8F6B',icon:'more'},
  {id:'exp-food',name:'Comida',type:'expense',color:'#B5482B',icon:'food',budget:null},
  {id:'exp-transport',name:'Transporte',type:'expense',color:'#B08A2E',icon:'transport',budget:null},
  {id:'exp-home',name:'Hogar',type:'expense',color:'#8A5A3B',icon:'home',budget:null},
  {id:'exp-services',name:'Servicios',type:'expense',color:'#4B6B8A',icon:'zap',budget:null},
  {id:'exp-health',name:'Salud',type:'expense',color:'#9C4A4A',icon:'heart',budget:null},
  {id:'exp-fun',name:'Entretenimiento',type:'expense',color:'#7A5C8A',icon:'fun',budget:null},
  {id:'exp-shopping',name:'Compras',type:'expense',color:'#B08040',icon:'shopping',budget:null},
  {id:'exp-other',name:'Otros gastos',type:'expense',color:'#6B6558',icon:'more',budget:null},
];

const CURRENCIES = {
  COP:{locale:'es-CO',label:'Peso colombiano (COP)'},
  USD:{locale:'en-US',label:'Dólar (USD)'},
  MXN:{locale:'es-MX',label:'Peso mexicano (MXN)'},
  EUR:{locale:'es-ES',label:'Euro (EUR)'},
};

let storageOk = true;
try {
  localStorage.setItem('__test__','1');
  localStorage.removeItem('__test__');
} catch(e) { storageOk = false; }

function loadDB(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        transactions: parsed.transactions || [],
        categories: (parsed.categories && parsed.categories.length) ? parsed.categories : DEFAULT_CATEGORIES.slice(),
        settings: parsed.settings || {currency:'COP'},
      };
    }
  } catch(e){}
  return {transactions:[], categories: DEFAULT_CATEGORIES.slice(), settings:{currency:'COP'}};
}
function saveDB(){
  if (!storageOk) return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(DB)); } catch(e){ storageOk = false; render(); }
}

let DB = loadDB();
let UI = {tab:'dashboard', txFilter:'all', search:''};
let sheet = null;      // {kind:'tx'|'cat', mode:'new'|'edit', ...campos}
let confirmState = null; // {message, onConfirm}

/* ---------------- Utilidades ---------------- */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,8);
const todayStr = () => new Date().toISOString().slice(0,10);
const monthKeyOf = (d) => d.slice(0,7);
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function fmtMoney(amount){
  const cur = DB.settings.currency || 'COP';
  const cfg = CURRENCIES[cur] || CURRENCIES.COP;
  try { return new Intl.NumberFormat(cfg.locale, {style:'currency', currency:cur, maximumFractionDigits:0}).format(amount); }
  catch(e){ return amount.toFixed(0) + ' ' + cur; }
}
function monthLabelStr(date){
  return new Intl.DateTimeFormat('es-CO', {month:'long', year:'numeric'}).format(date);
}

/* ---------------- Iconos SVG ---------------- */
const ICONS = {
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></svg>',
  pencil:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20l4-1 11-11-3-3L5 16l-1 4z"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="4 12 9 17 20 6"/></svg>',
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="6"/><line x1="16" y1="16" x2="21" y2="21"/></svg>',
  alert:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3 2 20h20L12 3z"/><line x1="12" y1="9" x2="12" y2="14"/><circle cx="12" cy="17" r="0.8" fill="currentColor" stroke="none"/></svg>',
  arrowUp:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 16V8M8 12l4-4 4 4"/></svg>',
  arrowDown:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12l4 4 4-4"/></svg>',
  wallet:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="17" cy="14" r="1.3" fill="currentColor" stroke="none"/></svg>',
  list:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="8" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="8" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.2" fill="currentColor" stroke="none"/></svg>',
  tag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3h6a2 2 0 0 1 2 2v6a2 2 0 0 1-.6 1.4l-8 8a2 2 0 0 1-2.8 0l-6-6a2 2 0 0 1 0-2.8l8-8A2 2 0 0 1 12 3z"/><circle cx="15.5" cy="8.5" r="1.3" fill="currentColor" stroke="none"/></svg>',
  gear:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>',
};
const icon = (name, cls) => '<span class="icon ' + (cls||'') + '">' + ICONS[name] + '</span>';

/* ---------------- Cálculos derivados ---------------- */
function catById(id){ return DB.categories.find(c => c.id === id); }

function computeTotals(){
  let income=0, expense=0;
  DB.transactions.forEach(t => { if (t.type==='income') income+=t.amount; else expense+=t.amount; });
  return {income, expense, balance: income-expense};
}
function currentMonthTx(){
  const mk = new Date().toISOString().slice(0,7);
  return DB.transactions.filter(t => monthKeyOf(t.date) === mk);
}
function computeMonthStats(){
  let income=0, expense=0;
  currentMonthTx().forEach(t => { if (t.type==='income') income+=t.amount; else expense+=t.amount; });
  return {income, expense};
}
function computeCategoryTotals(){
  const map = {};
  currentMonthTx().forEach(t => { if (t.type==='expense') map[t.categoryId] = (map[t.categoryId]||0) + t.amount; });
  return Object.entries(map).map(([id,total]) => ({id, total, cat: catById(id)}))
    .filter(r => r.cat).sort((a,b) => b.total - a.total);
}
function computeBalanceSeries(){
  const sorted = DB.transactions.slice().sort((a,b) => a.date.localeCompare(b.date));
  const byDate = {};
  sorted.forEach(t => { const delta = t.type==='income'? t.amount : -t.amount; byDate[t.date] = (byDate[t.date]||0)+delta; });
  const dates = Object.keys(byDate).sort();
  let running = 0;
  const pts = dates.map(d => { running += byDate[d]; return {date:d, balance:running}; });
  return pts.slice(-30);
}
function computeBudgetRows(){
  const totals = computeCategoryTotals();
  return DB.categories.filter(c => c.type==='expense' && c.budget).map(c => {
    const spent = (totals.find(r => r.id===c.id) || {}).total || 0;
    return {cat:c, spent, pct: Math.min(100, Math.round((spent / c.budget) * 100)), over: spent > c.budget};
  });
}
function filteredTx(){
  return DB.transactions
    .filter(t => UI.txFilter==='all' ? true : t.type===UI.txFilter)
    .filter(t => {
      if (!UI.search.trim()) return true;
      const s = UI.search.toLowerCase();
      const cat = catById(t.categoryId);
      return (t.note||'').toLowerCase().includes(s) || (cat && cat.name.toLowerCase().includes(s));
    })
    .sort((a,b) => (b.date+b.id).localeCompare(a.date+a.id));
}

/* ---------------- Gráfico de tendencia (SVG dibujado a mano) ---------------- */
function trendSVG(points){
  if (points.length < 2) return '<div class="empty-hint">Registra movimientos para ver la evolución de tu balance.</div>';
  const w = 300, h = 120, pad = 8;
  const vals = points.map(p => p.balance);
  const min = Math.min(...vals, 0), max = Math.max(...vals, 0);
  const range = (max - min) || 1;
  const stepX = (w - pad*2) / (points.length - 1);
  const coords = points.map((p,i) => {
    const x = pad + i*stepX;
    const y = pad + (h - pad*2) * (1 - (p.balance - min)/range);
    return [x,y];
  });
  const last = vals[vals.length-1];
  const color = last >= 0 ? 'var(--income)' : 'var(--expense)';
  const linePath = coords.map((c,i) => (i===0?'M':'L') + c[0].toFixed(1) + ',' + c[1].toFixed(1)).join(' ');
  const areaPath = linePath + ' L' + coords[coords.length-1][0].toFixed(1) + ',' + (h-pad) + ' L' + coords[0][0].toFixed(1) + ',' + (h-pad) + ' Z';
  return '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:100%;overflow:visible">' +
    '<path d="' + areaPath + '" fill="' + color + '" opacity="0.14"/>' +
    '<path d="' + linePath + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
    '</svg>';
}

/* ---------------- Render principal ---------------- */
function render(){
  document.getElementById('view').innerHTML =
    (!storageOk ? '<div class="banner banner--warn">' + icon('alert') + ' Tu navegador no permite guardar datos localmente (revisa si estás en modo privado). Los cambios no se conservarán al cerrar.</div>' : '') +
    (UI.tab==='dashboard' ? renderDashboard() :
     UI.tab==='transactions' ? renderTransactions() :
     UI.tab==='categories' ? renderCategories() :
     renderSettings());

  document.getElementById('fab-slot').innerHTML =
    (UI.tab==='dashboard' || UI.tab==='transactions')
      ? '<button class="fab" data-action="new-tx">' + icon('plus') + '</button>'
      : '';

  document.getElementById('tabbar').innerHTML = [
    ['dashboard','wallet','Resumen'],
    ['transactions','list','Movimientos'],
    ['categories','tag','Categorías'],
    ['settings','gear','Ajustes'],
  ].map(([id,ic,label]) =>
    '<button class="tab-btn ' + (UI.tab===id?'active':'') + '" data-action="set-tab" data-tab="' + id + '">' +
      icon(ic) + '<span>' + label + '</span></button>'
  ).join('');

  if (UI.tab==='transactions') attachSearchListener();
  renderOverlays();
}

function renderDashboard(){
  const totals = computeTotals();
  const month = computeMonthStats();
  const catTotals = computeCategoryTotals();
  const series = computeBalanceSeries();
  const budgets = computeBudgetRows();
  const balColor = totals.balance >= 0 ? 'var(--income)' : 'var(--expense)';

  let html = '';
  html += '<div class="balance-label">Balance total</div>';
  html += '<div class="balance-amount" style="color:' + balColor + '">' + fmtMoney(totals.balance) + '</div>';
  html += '<div class="balance-month">' + esc(monthLabelStr(new Date())) + '</div>';

  html += '<div class="stat-grid">';
  html += '<div class="stat-card" style="background:var(--income-bg)"><div class="label" style="color:var(--income)">' + icon('arrowUp') + ' Ingresos del mes</div><div class="amount" style="color:var(--income)">' + fmtMoney(month.income) + '</div></div>';
  html += '<div class="stat-card" style="background:var(--expense-bg)"><div class="label" style="color:var(--expense)">' + icon('arrowDown') + ' Gastos del mes</div><div class="amount" style="color:var(--expense)">' + fmtMoney(month.expense) + '</div></div>';
  html += '</div>';

  html += '<div class="card"><div class="section-title">Balance en el tiempo</div><div class="chart-wrap">' + trendSVG(series) + '</div></div>';

  html += '<div class="card"><div class="section-title">Gastos por categoría (este mes)</div>';
  if (catTotals.length){
    const max = catTotals[0].total;
    catTotals.forEach(r => {
      const pct = Math.max(6, Math.round((r.total/max)*100));
      html += '<div class="cat-row"><div class="top"><span>' + esc(r.cat.name) + '</span><span class="val">' + fmtMoney(r.total) + '</span></div>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:' + r.cat.color + '"></div></div></div>';
    });
  } else {
    html += '<div class="empty-hint">Aún no hay gastos registrados este mes.</div>';
  }
  html += '</div>';

  if (budgets.length){
    html += '<div class="card"><div class="section-title">Presupuestos</div>';
    budgets.forEach(b => {
      html += '<div class="cat-row"><div class="top"><span>' + (b.over? icon('alert') + ' ' : '') + esc(b.cat.name) + '</span>' +
        '<span style="color:' + (b.over?'var(--expense)':'var(--ink-muted)') + '">' + fmtMoney(b.spent) + ' / ' + fmtMoney(b.cat.budget) + '</span></div>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + b.pct + '%;background:' + (b.over?'var(--expense)':b.cat.color) + '"></div></div></div>';
    });
    html += '</div>';
  }
  return html;
}

function renderTxRow(t){
  const cat = catById(t.categoryId);
  const emoji = cat ? (ICON_EMOJI[cat.icon] || '⚪️') : '⚪️';
  const bg = (cat ? cat.color : '#65705F') + '22';
  return '<button class="tx-item" data-action="edit-tx" data-id="' + t.id + '">' +
    '<div class="avatar" style="background:' + bg + '">' + emoji + '</div>' +
    '<div class="tx-main"><div class="tx-title">' + esc(cat ? cat.name : 'Sin categoría') + '</div>' +
    '<div class="tx-sub">' + esc(t.date) + (t.note ? ' · ' + esc(t.note) : '') + '</div></div>' +
    '<div class="tx-amount ' + t.type + '">' + (t.type==='income'?'+':'−') + fmtMoney(t.amount) + '</div>' +
    '</button>';
}

function renderTxListHTML(){
  const list = filteredTx();
  if (!list.length) return '<div class="empty-state">No hay movimientos que mostrar.</div>';
  return list.map(renderTxRow).join('');
}

function renderTransactions(){
  let html = '';
  html += '<div class="search-box">' + icon('search') + '<input id="search-input" placeholder="Buscar por nota o categoría" value="' + esc(UI.search) + '"></div>';
  html += '<div class="filter-row">';
  [['all','Todos'],['income','Ingresos'],['expense','Gastos']].forEach(([val,label]) => {
    html += '<button class="chip ' + (UI.txFilter===val?'selected':'') + '" data-action="set-filter" data-filter="' + val + '">' + label + '</button>';
  });
  html += '</div>';
  html += '<div id="tx-list">' + renderTxListHTML() + '</div>';
  return html;
}
function refreshTxList(){ document.getElementById('tx-list').innerHTML = renderTxListHTML(); }
function attachSearchListener(){
  const input = document.getElementById('search-input');
  if (!input) return;
  input.addEventListener('input', (e) => { UI.search = e.target.value; refreshTxList(); });
}

function renderCategories(){
  const totals = computeCategoryTotals();
  const totalsById = Object.fromEntries(totals.map(r => [r.id, r.total]));
  const income = DB.categories.filter(c => c.type==='income');
  const expense = DB.categories.filter(c => c.type==='expense');

  const row = (c) => {
    const emoji = ICON_EMOJI[c.icon] || '⚪️';
    return '<button class="cat-item" data-action="edit-cat" data-id="' + c.id + '">' +
      '<div class="avatar" style="background:' + c.color + '22">' + emoji + '</div>' +
      '<div class="tx-main"><div class="cat-name">' + esc(c.name) + '</div>' +
      (c.type==='expense' && c.budget ? '<div class="cat-budget">Presupuesto: ' + fmtMoney(c.budget) + '</div>' : '') + '</div>' +
      (c.type==='expense' && totalsById[c.id] ? '<div class="cat-total">' + fmtMoney(totalsById[c.id]) + '</div>' : '') +
      icon('pencil') +
      '</button>';
  };

  return '<button class="new-cat-btn" data-action="new-cat">' + icon('plus') + ' Nueva categoría</button>' +
    '<div class="section-title">Ingresos</div>' + income.map(row).join('') +
    '<div class="section-title" style="margin-top:18px">Gastos</div>' + expense.map(row).join('');
}

function renderSettings(){
  let html = '<div class="section-title">Moneda</div><div class="settings-list">';
  Object.entries(CURRENCIES).forEach(([code,cfg]) => {
    const active = DB.settings.currency === code;
    html += '<button class="settings-row ' + (active?'active':'') + '" data-action="set-currency" data-code="' + code + '">' +
      '<span>' + cfg.label + '</span>' + (active ? icon('check') : '') + '</button>';
  });
  html += '</div>';

  html += '<div class="section-title" style="margin-top:18px">Tus datos</div>';
  html += '<div class="data-box"><div class="row"><span class="muted">Movimientos guardados</span><span>' + DB.transactions.length + '</span></div>' +
    '<div class="row"><span class="muted">Categorías</span><span>' + DB.categories.length + '</span></div></div>';
  html += '<div class="note">Tus datos se guardan solo en este dispositivo y este navegador — no se envían a ningún servidor ni a Claude. Si cambias de teléfono o borras los datos de Safari, se pierden, así que te recomendamos exportar una copia de seguridad de vez en cuando.</div>';

  html += '<div class="section-title" style="margin-top:18px">Copia de seguridad</div>';
  html += '<button class="secondary-btn" data-action="export-backup">Exportar copia de seguridad</button>';
  html += '<button class="secondary-btn" data-action="import-backup">Importar copia de seguridad</button>';
  html += '<input type="file" id="import-file" accept="application/json" style="display:none">';

  html += '<button class="danger-btn" data-action="reset-data" style="margin-top:18px">Borrar todos los datos</button>';
  return html;
}

/* ---------------- Overlays: hojas y confirmación ---------------- */
function renderOverlays(){
  const el = document.getElementById('overlays');
  let html = '';
  if (sheet && sheet.kind === 'tx') html += renderTxSheet();
  if (sheet && sheet.kind === 'cat') html += renderCatSheet();
  if (confirmState) html += renderConfirmDialog();
  el.innerHTML = html;
  if (sheet) attachSheetFieldSync();
}

function renderTxSheet(){
  const cats = DB.categories.filter(c => c.type === sheet.type);
  const chips = cats.map(c => {
    const emoji = ICON_EMOJI[c.icon] || '⚪️';
    const sel = sheet.categoryId === c.id;
    return '<button class="pick-chip ' + (sel?'selected':'') + '" style="' + (sel? 'background:'+c.color+';border-color:'+c.color : '') + '" data-action="pick-tx-cat" data-id="' + c.id + '"><span class="em">' + emoji + '</span>' + esc(c.name) + '</button>';
  }).join('') || '<div class="empty-hint">Crea primero una categoría de este tipo.</div>';

  const valid = Number(sheet.amount) > 0 && sheet.categoryId;

  return '<div class="overlay" data-action="close-sheet-bg">' +
    '<div class="sheet" onclick="event.stopPropagation()">' +
    '<div class="sheet-handle"></div>' +
    '<div class="sheet-head"><h3>' + (sheet.mode==='edit'?'Editar movimiento':'Nuevo movimiento') + '</h3><button data-action="close-sheet">' + icon('close') + '</button></div>' +
    '<div class="type-toggle">' +
      '<button class="' + (sheet.type==='expense'?'active-expense':'') + '" data-action="tx-type" data-type="expense">Gasto</button>' +
      '<button class="' + (sheet.type==='income'?'active-income':'') + '" data-action="tx-type" data-type="income">Ingreso</button>' +
    '</div>' +
    '<div class="field"><div class="field-label">Monto</div><input id="f-amount" type="number" inputmode="decimal" placeholder="0" value="' + esc(sheet.amount) + '"></div>' +
    '<div class="field"><div class="field-label">Categoría</div><div class="chip-wrap" id="chipList">' + chips + '</div></div>' +
    '<div class="field"><div class="field-label">Fecha</div><input id="f-date" type="date" value="' + esc(sheet.date) + '"></div>' +
    '<div class="field"><div class="field-label">Nota (opcional)</div><input id="f-note" placeholder="Ej. mercado de la semana" value="' + esc(sheet.note) + '"></div>' +
    '<div class="sheet-actions">' +
      (sheet.mode==='edit' ? '<button class="del-btn" data-action="delete-tx">' + icon('trash') + '</button>' : '') +
      '<button class="save-btn" id="tx-save-btn" data-action="save-tx" ' + (valid?'':'disabled') + '>Guardar</button>' +
    '</div></div></div>';
}

function renderCatSheet(){
  const swatches = SWATCHES.map(sw =>
    '<button class="swatch ' + (sheet.color===sw?'selected':'') + '" style="background:' + sw + '" data-action="pick-color" data-color="' + sw + '"></button>'
  ).join('');
  const icons = ICON_KEYS.map(k =>
    '<button class="emoji-btn ' + (sheet.icon===k?'selected':'') + '" data-action="pick-icon" data-icon="' + k + '">' + ICON_EMOJI[k] + '</button>'
  ).join('');
  const valid = sheet.name.trim().length > 0;

  return '<div class="overlay" data-action="close-sheet-bg">' +
    '<div class="sheet" onclick="event.stopPropagation()">' +
    '<div class="sheet-handle"></div>' +
    '<div class="sheet-head"><h3>' + (sheet.mode==='edit'?'Editar categoría':'Nueva categoría') + '</h3><button data-action="close-sheet">' + icon('close') + '</button></div>' +
    '<div class="field"><div class="field-label">Nombre</div><input id="f-name" placeholder="Ej. Suscripciones" value="' + esc(sheet.name) + '"></div>' +
    '<div class="field"><div class="field-label">Tipo</div><div class="type-toggle">' +
      '<button class="' + (sheet.type==='expense'?'active-neutral':'') + '" data-action="cat-type" data-type="expense">Gasto</button>' +
      '<button class="' + (sheet.type==='income'?'active-neutral':'') + '" data-action="cat-type" data-type="income">Ingreso</button>' +
    '</div></div>' +
    '<div class="field"><div class="field-label">Color</div><div class="chip-wrap" id="swatchList">' + swatches + '</div></div>' +
    '<div class="field"><div class="field-label">Ícono</div><div class="chip-wrap" id="iconList">' + icons + '</div></div>' +
    '<div class="field" id="budgetField" style="display:' + (sheet.type==='expense'?'block':'none') + '">' +
      '<div class="field-label">Presupuesto mensual (opcional)</div><input id="f-budget" type="number" inputmode="decimal" placeholder="Sin límite" value="' + esc(sheet.budget) + '"></div>' +
    '<div class="sheet-actions">' +
      (sheet.mode==='edit' ? '<button class="del-btn" data-action="delete-cat">' + icon('trash') + '</button>' : '') +
      '<button class="save-btn" id="cat-save-btn" data-action="save-cat" ' + (valid?'':'disabled') + '>Guardar</button>' +
    '</div></div></div>';
}

function renderConfirmDialog(){
  return '<div class="overlay overlay-center" data-action="cancel-confirm">' +
    '<div class="confirm-box" onclick="event.stopPropagation()">' +
    '<p>' + esc(confirmState.message) + '</p>' +
    '<div class="confirm-actions">' +
      '<button class="confirm-cancel" data-action="cancel-confirm">Cancelar</button>' +
      '<button class="confirm-ok" data-action="confirm-ok">Confirmar</button>' +
    '</div></div></div>';
}

/* Mantiene sincronizados los campos de texto libres sin perder el foco */
function attachSheetFieldSync(){
  if (sheet.kind === 'tx'){
    const a = document.getElementById('f-amount'), d = document.getElementById('f-date'), n = document.getElementById('f-note');
    if (a) a.addEventListener('input', () => { sheet.amount = a.value; refreshSaveState(); });
    if (d) d.addEventListener('input', () => { sheet.date = d.value; });
    if (n) n.addEventListener('input', () => { sheet.note = n.value; });
  } else if (sheet.kind === 'cat'){
    const nm = document.getElementById('f-name'), b = document.getElementById('f-budget');
    if (nm) nm.addEventListener('input', () => { sheet.name = nm.value; refreshSaveState(); });
    if (b) b.addEventListener('input', () => { sheet.budget = b.value; });
  }
}
function refreshSaveState(){
  if (sheet.kind === 'tx'){
    const valid = Number(sheet.amount) > 0 && sheet.categoryId;
    const btn = document.getElementById('tx-save-btn');
    if (btn) btn.disabled = !valid;
  } else {
    const valid = sheet.name.trim().length > 0;
    const btn = document.getElementById('cat-save-btn');
    if (btn) btn.disabled = !valid;
  }
}

/* ---------------- Acciones ---------------- */
function openNewTx(){
  const firstExpense = DB.categories.find(c => c.type==='expense');
  sheet = {kind:'tx', mode:'new', id:null, type:'expense', categoryId: firstExpense?firstExpense.id:'', amount:'', date:todayStr(), note:''};
  renderOverlays();
}
function openEditTx(id){
  const t = DB.transactions.find(x => x.id===id);
  if (!t) return;
  sheet = {kind:'tx', mode:'edit', id:t.id, type:t.type, categoryId:t.categoryId, amount:String(t.amount), date:t.date, note:t.note||''};
  renderOverlays();
}
function saveTxSheet(){
  const amount = Number(sheet.amount);
  if (!(amount > 0) || !sheet.categoryId) return;
  const tx = {id: sheet.id || uid(), type: sheet.type, amount, categoryId: sheet.categoryId, date: sheet.date || todayStr(), note: (sheet.note||'').trim()};
  const exists = DB.transactions.some(t => t.id === tx.id);
  DB.transactions = exists ? DB.transactions.map(t => t.id===tx.id?tx:t) : DB.transactions.concat([tx]);
  saveDB();
  sheet = null;
  render();
}
function deleteTx(id){
  DB.transactions = DB.transactions.filter(t => t.id !== id);
  saveDB();
  sheet = null;
  confirmState = null;
  render();
}

function openNewCat(){
  sheet = {kind:'cat', mode:'new', id:null, name:'', type:'expense', color:SWATCHES[0], icon:ICON_KEYS[0], budget:''};
  renderOverlays();
}
function openEditCat(id){
  const c = catById(id);
  if (!c) return;
  sheet = {kind:'cat', mode:'edit', id:c.id, name:c.name, type:c.type, color:c.color, icon:c.icon, budget: c.budget?String(c.budget):''};
  renderOverlays();
}
function saveCatSheet(){
  if (!sheet.name.trim()) return;
  const cat = {
    id: sheet.id || uid(), name: sheet.name.trim(), type: sheet.type, color: sheet.color, icon: sheet.icon,
    budget: sheet.type==='expense' && sheet.budget ? Number(sheet.budget) : null,
  };
  const exists = DB.categories.some(c => c.id === cat.id);
  DB.categories = exists ? DB.categories.map(c => c.id===cat.id?cat:c) : DB.categories.concat([cat]);
  saveDB();
  sheet = null;
  render();
}
function deleteCat(id){
  DB.categories = DB.categories.filter(c => c.id !== id);
  saveDB();
  sheet = null;
  confirmState = null;
  render();
}

function exportBackup(){
  const blob = new Blob([JSON.stringify(DB, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'finanzas-backup-' + todayStr() + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function importBackupFile(file){
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed || !Array.isArray(parsed.transactions) || !Array.isArray(parsed.categories)) throw new Error('formato inválido');
      DB = {transactions: parsed.transactions, categories: parsed.categories, settings: parsed.settings || {currency:'COP'}};
      saveDB();
      render();
    } catch(err){
      alert('El archivo no tiene un formato válido de copia de seguridad.');
    }
  };
  reader.readAsText(file);
}

/* ---------------- Delegación de eventos ---------------- */
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-action]');
  if (!t) return;
  const action = t.dataset.action;

  if (action === 'set-tab'){ UI.tab = t.dataset.tab; render(); return; }
  if (action === 'set-filter'){ UI.txFilter = t.dataset.filter; refreshTxList(); return; }

  if (action === 'new-tx'){ openNewTx(); return; }
  if (action === 'edit-tx'){ openEditTx(t.dataset.id); return; }
  if (action === 'tx-type'){
    sheet.type = t.dataset.type;
    const firstOfType = DB.categories.find(c => c.type === sheet.type);
    sheet.categoryId = firstOfType ? firstOfType.id : '';
    renderOverlays();
    return;
  }
  if (action === 'pick-tx-cat'){
    sheet.categoryId = t.dataset.id;
    document.getElementById('chipList').innerHTML =
      DB.categories.filter(c => c.type===sheet.type).map(c => {
        const emoji = ICON_EMOJI[c.icon] || '⚪️';
        const sel = sheet.categoryId === c.id;
        return '<button class="pick-chip ' + (sel?'selected':'') + '" style="' + (sel? 'background:'+c.color+';border-color:'+c.color : '') + '" data-action="pick-tx-cat" data-id="' + c.id + '"><span class="em">' + emoji + '</span>' + esc(c.name) + '</button>';
      }).join('');
    refreshSaveState();
    return;
  }
  if (action === 'save-tx'){ saveTxSheet(); return; }
  if (action === 'delete-tx'){ confirmState = {message:'Eliminar este movimiento.', onConfirm: () => deleteTx(sheet.id)}; renderOverlays(); return; }

  if (action === 'new-cat'){ openNewCat(); return; }
  if (action === 'edit-cat'){ openEditCat(t.dataset.id); return; }
  if (action === 'cat-type'){
    sheet.type = t.dataset.type;
    document.getElementById('budgetField').style.display = sheet.type==='expense' ? 'block' : 'none';
    document.querySelectorAll('.type-toggle button[data-action="cat-type"]').forEach(b => b.classList.toggle('active-neutral', b.dataset.type===sheet.type));
    return;
  }
  if (action === 'pick-color'){
    sheet.color = t.dataset.color;
    document.querySelectorAll('#swatchList .swatch').forEach(s => s.classList.toggle('selected', s.dataset.color===sheet.color));
    return;
  }
  if (action === 'pick-icon'){
    sheet.icon = t.dataset.icon;
    document.querySelectorAll('#iconList .emoji-btn').forEach(b => b.classList.toggle('selected', b.dataset.icon===sheet.icon));
    return;
  }
  if (action === 'save-cat'){ saveCatSheet(); return; }
  if (action === 'delete-cat'){ confirmState = {message:'Eliminar esta categoría. Los movimientos ya registrados con ella quedarán sin categoría asignada.', onConfirm: () => deleteCat(sheet.id)}; renderOverlays(); return; }

  if (action === 'close-sheet' || action === 'close-sheet-bg'){ sheet = null; renderOverlays(); return; }
  if (action === 'cancel-confirm'){ confirmState = null; renderOverlays(); return; }
  if (action === 'confirm-ok'){ const fn = confirmState.onConfirm; confirmState = null; fn(); return; }

  if (action === 'set-currency'){ DB.settings.currency = t.dataset.code; saveDB(); render(); return; }
  if (action === 'export-backup'){ exportBackup(); return; }
  if (action === 'import-backup'){ document.getElementById('import-file').click(); return; }
  if (action === 'reset-data'){
    confirmState = {message:'Esto borrará todos tus movimientos y restaurará las categorías por defecto. Esta acción no se puede deshacer.', onConfirm: () => {
      DB = {transactions:[], categories:DEFAULT_CATEGORIES.slice(), settings:{currency:DB.settings.currency}};
      saveDB(); confirmState = null; render();
    }};
    renderOverlays();
    return;
  }
});

document.addEventListener('change', (e) => {
  if (e.target.id === 'import-file' && e.target.files[0]) importBackupFile(e.target.files[0]);
});

render();
</script>
</body>
</html>