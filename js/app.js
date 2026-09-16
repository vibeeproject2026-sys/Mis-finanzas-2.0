window.onerror = function(msg, url, line) {
  document.body.innerHTML = '<div style="padding:40px; color:#ff4444; background:#111; height:100vh; text-align:center;"><h2>⚠️ Error de Código</h2><p>' + msg + '</p><p>Línea: ' + line + '</p></div>';
};

import { DB, saveDB, todayStr, DEFAULT_CATEGORIES } from './state.js';
import { 
  renderDashboard, renderTransactions, renderInvoices, renderCredits, 
  renderCategories, renderSettings, renderFabMenu, renderQuickSheet, 
  renderTxSheet, renderCatSheet, renderCreditSheet, renderPaymentSheet, 
  renderInvoiceSheet, renderConfirmDialog, renderScanningOverlay, 
  filteredTx, renderTxCatChips, formatThousandInput, parseFormattedNumber 
} from './ui.js';
import * as API from './api.js';

let UI = {tab:'dashboard', txFilter:'all', creditFilter:'against', search:'', openInvoiceId:null};
let sheet = null;
let confirmState = null;
let scanningOverlay = null;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,8);

const safeSync = () => {
  try {
    if (API.syncWithSupabase) API.syncWithSupabase(localStorage.getItem('supabase_token'), localStorage.getItem('supabase_user_id'));
  } catch(e) {}
};

export function render(){
  try {
    let token = null;
    let userId = null;
    try {
      token = localStorage.getItem('supabase_token');
      userId = localStorage.getItem('supabase_user_id');
    } catch(e) { console.warn("Modo privado estricto"); }

    const viewEl = document.getElementById('view');
    const tabbarEl = document.getElementById('tabbar');
    const fabSlotEl = document.getElementById('fab-slot');

    if (!token || !userId) {
      if (viewEl) {
        viewEl.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:center;padding:40px 16px;min-height:75vh;">
            <div class="card" style="width:100%;max-width:380px;padding:32px 24px;text-align:center;">
              <div style="font-size:36px;margin-bottom:12px;">☁️</div>
              <h2 style="font-size:22px;font-weight:800;color:#fff;margin-bottom:6px;">Terminal Cloud</h2>
              <p style="font-size:13px;color:var(--ink-muted);margin-bottom:24px;">Gestión financiera en la nube</p>
              
              <div class="field" style="text-align:left;margin-bottom:14px;">
                <div class="field-label">Correo electrónico</div>
                <input id="auth-email" type="email" placeholder="usuario@correo.com" style="width:100%;padding:12px;border-radius:12px;background:var(--bg);border:1px solid var(--border);color:#fff;font-size:14px;outline:none;">
              </div>

              <div class="field" style="text-align:left;margin-bottom:16px;">
                <div class="field-label">Contraseña</div>
                <input id="auth-password" type="password" placeholder="••••••••" style="width:100%;padding:12px;border-radius:12px;background:var(--bg);border:1px solid var(--border);color:#fff;font-size:14px;outline:none;">
              </div>

              <div id="auth-error" style="color:var(--expense);font-size:13px;margin-bottom:14px;min-height:16px;"></div>

              <button class="save-btn" id="btn-login" style="width:100%;margin-bottom:10px;padding:14px;border-radius:12px;background:var(--accent);color:#fff;font-weight:700;border:none;cursor:pointer;">Iniciar Sesión</button>
              <button class="secondary-btn" id="btn-signup" style="width:100%;padding:14px;border-radius:12px;background:transparent;border:1px solid var(--border);color:#fff;font-weight:600;cursor:pointer;">Crear Cuenta Nueva</button>
            </div>
          </div>
        `;
      }
      if (tabbarEl) tabbarEl.innerHTML = '';
      if (fabSlotEl) fabSlotEl.innerHTML = '';
      setTimeout(attachAuthEvents, 50);
      return;
    }

    if (!window.hasLoadedCloudData) {
      window.hasLoadedCloudData = true;
      if (API.fetchUserData) {
        API.fetchUserData(token, userId).then(cloudDB => {
          if (cloudDB) {
            Object.assign(DB, cloudDB);
            saveDB();
            renderAppContent();
          }
        });
      }
    }
    
    renderAppContent();
  } catch (err) {
    document.body.innerHTML = '<div style="padding:40px; color:#ff4444; background:#111; height:100vh;"><h2>Error visual</h2><p>' + err.message + '</p></div>';
  }
}

function attachAuthEvents(){
  const emailInput = document.getElementById('auth-email');
  const passInput = document.getElementById('auth-password');
  const errorDiv = document.getElementById('auth-error');

  const getCreds = () => ({
    email: emailInput ? emailInput.value.trim() : '',
    password: passInput ? passInput.value.trim() : ''
  });

  document.getElementById('btn-login')?.addEventListener('click', async () => {
    const { email, password } = getCreds();
    if (!email || !password) { if (errorDiv) errorDiv.textContent = 'Completa todos los campos.'; return; }
    if (errorDiv) errorDiv.textContent = 'Iniciando sesión...';
    try {
      if (!API.signInUser) throw new Error("Faltan funciones de API.");
      const data = await API.signInUser(email, password);
      localStorage.setItem('supabase_token', data.access_token);
      localStorage.setItem('supabase_user_id', data.user.id);
      window.hasLoadedCloudData = false;
      render();
    } catch (err) {
      if (errorDiv) errorDiv.textContent = err.message;
    }
  });

  document.getElementById('btn-signup')?.addEventListener('click', async () => {
    const { email, password } = getCreds();
    if (!email || !password) { if (errorDiv) errorDiv.textContent = 'Completa todos los campos.'; return; }
    if (errorDiv) errorDiv.textContent = 'Registrando cuenta...';
    try {
      if (!API.signUpUser) throw new Error("Faltan funciones de API.");
      const data = await API.signUpUser(email, password);
      if (data.access_token) {
        localStorage.setItem('supabase_token', data.access_token);
        localStorage.setItem('supabase_user_id', data.user.id);
        window.hasLoadedCloudData = false;
        render();
      } else {
        if (errorDiv) errorDiv.textContent = '¡Cuenta creada con éxito! Inicia sesión ahora.';
      }
    } catch (err) {
      if (errorDiv) errorDiv.textContent = err.message;
    }
  });
}

function renderAppContent(){
  const viewEl = document.getElementById('view');
  if (viewEl) {
    let tabContent = '';
    if (UI.tab === 'dashboard') tabContent = renderDashboard();
    else if (UI.tab === 'transactions') tabContent = renderTransactions();
    else if (UI.tab === 'invoices') tabContent = renderInvoices();
    else if (UI.tab === 'credits') tabContent = renderCredits();
    else if (UI.tab === 'categories') tabContent = renderCategories();
    else tabContent = renderSettings() + '<div style="padding:16px 0;"><button class="save-btn" data-action="logout" style="width:100%;padding:14px;border-radius:12px;background:var(--expense);color:#fff;font-weight:800;border:none;cursor:pointer;">Cerrar Sesión</button></div>';

    viewEl.innerHTML =
      '<div class="hero"><div class="hero-content">' +
      '<div class="hero-badge"><span class="hero-dot"></span><span>Terminal Cloud Active</span></div>' +
      '<div class="hero-main"><div><h1>Mis Finanzas</h1><p>Control y analítica en tiempo real</p></div><div class="hero-avatar">⚡</div></div>' +
      '</div></div>' + tabContent;
  
    // Unificar título de Ajustes limpiamente
    if (UI.tab === 'settings') {
      setTimeout(() => {
        document.querySelectorAll('h1, h2, h3, .section-title, span, div').forEach(el => {
          if (el.textContent && el.textContent.trim().toLowerCase().includes('ajustes y moneda')) {
            el.textContent = 'Ajustes';
          }
        });
      }, 5);
    }
  }

  // Botón flotante dinámico según la pestaña activa
  const fabSlotEl = document.getElementById('fab-slot');
  if (fabSlotEl) {
    if (UI.tab === 'dashboard' || UI.tab === 'transactions') {
      fabSlotEl.innerHTML = '<button class="fab" data-action="new-tx"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:24px;height:24px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>';
    } else if (UI.tab === 'credits') {
      fabSlotEl.innerHTML = '<button class="fab" data-action="new-credit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:24px;height:24px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>';
    } else if (UI.tab === 'invoices') {
      fabSlotEl.innerHTML = '<button class="fab" data-action="scan-invoice"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:24px;height:24px;"><path d="M4 8h3l2-2h6l2 2h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="14" r="3.5"/></svg></button>';
    } else {
      fabSlotEl.innerHTML = '';
    }
  }

  // Barra de navegación original de 5 elementos: Resumen, Movimientos, +, Créditos y Categorías
  const tabbarHTML = [
    ['dashboard','wallet','Resumen'],
    ['transactions','list','Movimientos'],
    ['center','plus',''],
    ['credits','credit','Créditos'],
    ['categories','tag','Categorías'],
  ].map(([id,ic,label]) => {
    if(id==='center'){
      return '<div class="center-fab-container"><button class="tab-btn" data-action="new-tx" style="background:none;border:none;display:flex;flex-direction:column;align-items:center;color:var(--violet);"><span class="icon" style="width:26px;height:26px;background:var(--violet);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span><span style="font-size:10px;font-weight:700;margin-top:2px;">Nuevo</span></button></div>';
    }
    return '<button class="tab-btn ' + (UI.tab===id?'active':'') + '" data-action="set-tab" data-tab="' + id + '">' +
      '<span class="icon" style="stroke-linecap:round;stroke-linejoin:round">' + getIconSvg(ic) + '</span><span>' + label + '</span></button>';
  }).join('');

  const tabbarEl = document.getElementById('tabbar');
  if (tabbarEl) tabbarEl.innerHTML = tabbarHTML;
  if (UI.tab==='transactions') attachSearchListener();
  renderOverlays();
}

function getIconSvg(name){
  const svgs = {
    'wallet': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="17" cy="14" r="1.3" fill="currentColor" stroke="none"/></svg>',
    'list': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"><line x1="8" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="8" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.2" fill="currentColor" stroke="none"/></svg>',
    'credit': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
    'tag': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"><path d="M12 3h6a2 2 0 0 1 2 2v6a2 2 0 0 1-.6 1.4l-8 8a2 2 0 0 1-2.8 0l-6-6a2 2 0 0 1 0-2.8l8-8A2 2 0 0 1 12 3z"/><circle cx="15.5" cy="8.5" r="1.3" fill="currentColor" stroke="none"/></svg>'
  };
  return svgs[name] || '';
}

function renderOverlays(){
  const el = document.getElementById('overlays');
  if (!el) return;
  let html = '';
  if (sheet && sheet.kind === 'tx') html += renderTxSheet(sheet);
  if (sheet && sheet.kind === 'quick') html += renderQuickSheet(sheet);
  if (sheet && sheet.kind === 'cat') html += renderCatSheet(sheet);
  if (sheet && sheet.kind === 'credit') html += renderCreditSheet(sheet);
  if (sheet && sheet.kind === 'payment') html += renderPaymentSheet(sheet);
  if (sheet && sheet.kind === 'invoice') html += renderInvoiceSheet(sheet);
  if (confirmState) html += renderConfirmDialog(confirmState);
  if (scanningOverlay) html += renderScanningOverlay(scanningOverlay);
  
  el.innerHTML = html;
  if (sheet) attachSheetFieldSync();
  
  const saveBtn = document.querySelector('button[data-action="save-tx"], button[data-action="save-quick"], button[data-action="save-credit"], button[data-action="save-payment"]');
  if (saveBtn && sheet) {
    if (sheet.kind === 'credit') {
      if (sheet.title && sheet.title.trim().length > 0 && Number(sheet.total) > 0) {
        saveBtn.removeAttribute('disabled');
        saveBtn.style.opacity = '1';
        saveBtn.style.cursor = 'pointer';
      } else {
        saveBtn.setAttribute('disabled', 'true');
        saveBtn.style.opacity = '0.5';
      }
    } else {
      const amt = Number(sheet.amount);
      if (amt > 0) {
        saveBtn.removeAttribute('disabled');
        saveBtn.style.opacity = '1';
        saveBtn.style.cursor = 'pointer';
      }
    }
  }
}

function refreshTxList(){ 
  const list = filteredTx(UI.search, UI.txFilter);
  const container = document.getElementById('tx-list');
  if (container) container.innerHTML = list.length ? list.map(t => renderTxRowHelper(t)).join('') : '<div class="empty-state">No hay movimientos registrados.</div>';
}

function renderTxRowHelper(t){
  const cat = DB.categories.find(c => c.id === t.categoryId);
  const emoji = cat ? ({"food":"🍔","transport":"🚗","home":"🏠","zap":"💡","heart":"❤","fun":"🎬","shopping":"🛍","briefcase":"💼","dollarSign":"💵","more":"⭐"}[cat.icon] || '⭐') : '⭐';
  const bg = (cat ? cat.color : '#8B85A3') + '22';
  return '<button class="tx-item" data-action="edit-tx" data-id="' + t.id + '">' +
    '<div class="avatar" style="background:' + bg + '">' + emoji + '</div>' +
    '<div class="tx-main"><div class="tx-title">' + (cat ? cat.name : 'Sin categoría') + '</div><div class="tx-sub">' + t.date + (t.note ? ' · ' + t.note : '') + '</div></div>' +
    '<div class="tx-amount ' + t.type + '">' + (t.type==='income'?'+':'−') + new Intl.NumberFormat('es-CO', {style:'currency', currency:DB.settings.currency||'COP', maximumFractionDigits:0}).format(t.amount) + '</div></button>';
}

function attachSearchListener(){
  const input = document.getElementById('search-input');
  if (input) input.addEventListener('input', (e) => { UI.search = e.target.value; refreshTxList(); });
}

document.addEventListener('click',(e)=>{
  const t = e.target.closest('[data-action]');
  if(!t) return;
  const action = t.dataset.action;

  if(action==='set-tab'){ UI.tab = t.dataset.tab; renderAppContent(); return; }
  if(action==='set-filter'){ UI.txFilter = t.dataset.filter; refreshTxList(); return; }
  if(action==='set-credit-filter'){ UI.creditFilter = t.dataset.filter; renderAppContent(); return; }

  if(action==='logout'){
    confirmState={message:'¿Seguro que quieres cerrar sesión?', onConfirm:()=>{
      localStorage.removeItem('supabase_token');
      localStorage.removeItem('supabase_user_id');
      window.hasLoadedCloudData = false;
      Object.assign(DB, {transactions:[], categories:DEFAULT_CATEGORIES.slice(), credits:[], invoices:[], settings:{currency:'COP'}});
      saveDB(); 
      UI.tab = 'dashboard';
      confirmState = null; 
      render(); 
    }};
    renderOverlays(); return;
  }

  if(action==='new-tx'){ 
    sheet = {kind:'tx', mode:'new', id:null, type:'expense', categoryId:(DB.categories.find(c=>c.type==='expense')||{}).id||'', amount:'', date:todayStr(), note:''}; 
    renderOverlays(); 
    return; 
  }

  if(action==='edit-tx'){
    const tx = DB.transactions.find(x => x.id === t.dataset.id);
    if(tx){ sheet = {kind:'tx', mode:'edit', id:tx.id, type:tx.type, categoryId:tx.categoryId, amount:String(tx.amount), date:tx.date, note:tx.note||''}; renderOverlays(); }
    return;
  }
  if(action==='quick-cat'){
    sheet = {kind:'quick', categoryId:t.dataset.id, amount:'', note:'', date:todayStr(), showNote:false, showDate:false};
    renderOverlays(); return;
  }
  if(action==='show-note'){ if(!sheet) return; sheet.showNote=true; renderOverlays(); return; }
  if(action==='show-date'){ if(!sheet) return; sheet.showDate=true; renderOverlays(); return; }
  if(action==='save-quick'){
    if(!sheet) return;
    const amt = Number(sheet.amount);
    if(amt > 0){ 
      DB.transactions.push({id:uid(), type:'expense', amount:amt, categoryId:sheet.categoryId, date:todayStr(), note:(sheet.note||'').trim()}); 
      saveDB(); 
      safeSync();
      sheet=null; renderAppContent(); 
    }
    return;
  }
  if(action==='tx-type'){
    if(!sheet) return;
    sheet.type = t.dataset.type;
    sheet.categoryId = (DB.categories.find(c=>c.type===sheet.type)||{}).id || '';
    renderOverlays(); return;
  }
  if(action==='pick-tx-cat'){
    if(!sheet) return;
    sheet.categoryId = t.dataset.id;
    const chipContainer = document.getElementById('chipList');
    if(chipContainer) chipContainer.innerHTML = renderTxCatChips(DB.categories.filter(c => c.type === sheet.type), sheet.categoryId);
    return;
  }
  if(action==='save-tx'){
    if(!sheet) return;
    const amt = Number(sheet.amount);
    const catId = sheet.categoryId || (DB.categories.find(c=>c.type===sheet.type)||{}).id || '';
    if(amt > 0){
      const tx = {id:sheet.id||uid(), type:sheet.type, amount:amt, categoryId:catId, date:sheet.date||todayStr(), note:(sheet.note||'').trim()};
      const exists = DB.transactions.some(x => x.id === tx.id);
      DB.transactions = exists ? DB.transactions.map(x => x.id===tx.id?tx:x) : DB.transactions.concat([tx]);
      saveDB(); 
      safeSync();
      sheet=null; renderAppContent();
    }
    return;
  }
  if(action==='delete-tx'){ if(!sheet) return; confirmState={message:'¿Eliminar este movimiento?', onConfirm:()=>{ DB.transactions=DB.transactions.filter(x=>x.id!==sheet.id); saveDB(); safeSync(); sheet=null; confirmState=null; renderAppContent(); }}; renderOverlays(); return; }

  if(action==='new-cat'){ sheet={kind:'cat',mode:'new',id:null,name:'',type:'expense',color:'#06B6D4',icon:'food',budget:'',primary:false,isFixed:false}; renderOverlays(); return; }
  if(action==='edit-cat'){
    const c = DB.categories.find(x=>x.id===t.dataset.id);
    if(c){ sheet={kind:'cat',mode:'edit',id:c.id,name:c.name,type:c.type,color:c.color,icon:c.icon,budget:c.budget?String(c.budget):'',primary:!!c.primary,isFixed:!!c.isFixed}; renderOverlays(); }
    return;
  }
  if(action==='cat-type'){
    if(!sheet) return;
    sheet.type = t.dataset.type;
    document.getElementById('budgetField').style.display = sheet.type==='expense'?'block':'none';
    document.getElementById('primaryField').style.display = sheet.type==='income'?'block':'none';
    document.getElementById('fixedField').style.display = sheet.type==='expense'?'block':'none';
    return;
  }
  if(action==='toggle-primary'){ if(!sheet) return; sheet.primary=!sheet.primary; document.getElementById('primarySwitch').classList.toggle('on',sheet.primary); return; }
  if(action==='toggle-fixed'){ if(!sheet) return; sheet.isFixed=!sheet.isFixed; document.getElementById('fixedSwitch').classList.toggle('on-violet',sheet.isFixed); return; }
  if(action==='pick-color'){ if(!sheet) return; sheet.color=t.dataset.color; document.querySelectorAll('#swatchList .swatch').forEach(s=>s.classList.toggle('selected',s.dataset.color===sheet.color)); return; }
  if(action==='pick-icon'){ if(!sheet) return; sheet.icon=t.dataset.icon; document.querySelectorAll('#iconList .emoji-btn').forEach(b=>b.classList.toggle('selected',b.dataset.icon===sheet.icon)); return; }
  if(action==='save-cat'){
    if(!sheet) return;
    if(sheet.name.trim()){
      const cat={id:sheet.id||uid(), name:sheet.name.trim(), type:sheet.type, color:sheet.color, icon:sheet.icon, budget:sheet.type==='expense'&&sheet.budget?Number(sheet.budget):null, primary:sheet.type==='income'?!!sheet.primary:false, isFixed:sheet.type==='expense'?!!sheet.isFixed:false};
      const exists=DB.categories.some(x=>x.id===cat.id);
      DB.categories = exists ? DB.categories.map(x=>x.id===cat.id?cat:x) : DB.categories.concat([cat]);
      saveDB(); 
      safeSync();
      sheet=null; renderAppContent();
    }
    return;
  }
  if(action==='delete-cat'){ if(!sheet) return; confirmState={message:'¿Eliminar categoría?', onConfirm:()=>{ DB.categories=DB.categories.filter(x=>x.id!==sheet.id); saveDB(); safeSync(); sheet=null; confirmState=null; renderAppContent(); }}; renderOverlays(); return; }

  // ----------------- CRÉDITOS -----------------
  if(action==='new-credit'){ 
    sheet = {kind:'credit', mode:'new', id:null, title:'', type:UI.creditFilter||'against', total:''}; 
    renderOverlays(); 
    return; 
  }
  if(action==='edit-credit'){ 
    const c = DB.credits.find(x=>x.id===t.dataset.id); 
    if(c){ sheet = {kind:'credit', mode:'edit', id:c.id, title:c.title, type:c.type, total:String(c.total)}; renderOverlays(); } 
    return; 
  }
  if(action==='credit-type'){ 
    if(!sheet) return; 
    sheet.type = t.dataset.type; 
    renderOverlays(); 
    return; 
  }
  if(action==='save-credit'){
    if(!sheet) return;
    const tot = Number(sheet.total);
    if(sheet.title.trim() && tot > 0){
      if(!DB.credits) DB.credits=[];
      const credit = {
        id: sheet.id || uid(),
        title: sheet.title.trim(),
        type: sheet.type,
        total: tot,
        payments: sheet.id ? ((DB.credits.find(x=>x.id===sheet.id)||{}).payments||[]) : []
      };
      const exists = DB.credits.some(x=>x.id===credit.id);
      DB.credits = exists ? DB.credits.map(x=>x.id===credit.id?credit:x) : DB.credits.concat([credit]);
      saveDB(); 
      safeSync();
      sheet = null; 
      renderAppContent();
    }
    return;
  }
  if(action==='delete-credit'){ 
    if(!sheet) return; 
    confirmState = {message:'¿Eliminar crédito?', onConfirm:()=>{ DB.credits=DB.credits.filter(x=>x.id!==sheet.id); saveDB(); safeSync(); sheet=null; confirmState=null; renderAppContent(); }}; 
    renderOverlays(); 
    return; 
  }

  if(action==='new-payment'){ sheet={kind:'payment', mode:'new', creditId:t.dataset.id, paymentId:null, amount:'', date:todayStr(), note:''}; renderOverlays(); return; }
  if(action==='edit-payment'){
    const c=DB.credits.find(x=>x.id===t.dataset.cid); const p=(c?.payments||[]).find(x=>x.id===t.dataset.pid);
    if(p){ sheet={kind:'payment', mode:'edit', creditId:t.dataset.cid, paymentId:p.id, amount:String(p.amount), date:p.date, note:p.note||''}; renderOverlays(); }
    return;
  }
  if(action==='save-payment'){
    if(!sheet) return;
    const amt=Number(sheet.amount);
    if(amt>0){
      const pay={id:sheet.paymentId||uid(), amount:amt, date:sheet.date||todayStr(), note:(sheet.note||'').trim()};
      DB.credits = DB.credits.map(c=>{
        if(c.id===sheet.creditId){
          let pays=c.payments||[];
          const exists=pays.some(x=>x.id===pay.id);
          pays=exists?pays.map(x=>x.id===pay.id?pay:x):pays.concat([pay]);
          return {...c, payments:pays};
        }
        return c;
      });
      saveDB(); 
      safeSync();
      sheet=null; renderAppContent();
    }
    return;
  }

  if(action==='scan-invoice'){ document.getElementById('invoice-camera-input')?.click(); return; }
  if(action==='toggle-invoice'){ UI.openInvoiceId = (UI.openInvoiceId===t.dataset.id)?null:t.dataset.id; renderAppContent(); return; }
  if(action==='edit-invoice'){
    const inv = DB.invoices.find(x=>x.id===t.dataset.id);
    if(inv){ sheet={kind:'invoice', mode:'edit', id:inv.id, title:inv.title, date:inv.date, items:inv.items.map(it=>({...it, price:String(it.price)})), registered:!!inv.registered}; renderOverlays(); }
    return;
  }
  if(action==='register-invoice'){
    const inv = DB.invoices.find(x=>x.id===t.dataset.id);
    if(inv){ sheet={kind:'tx', mode:'new', id:null, type:'expense', categoryId:(DB.categories.find(c=>c.type==='expense')||{}).id||'', amount:String(inv.total), date:inv.date||todayStr(), note:inv.title||'', sourceInvoiceId:inv.id}; renderOverlays(); }
    return;
  }
  if(action==='add-invoice-item'){ if(!sheet) return; sheet.items.push({id:uid(), name:'', price:''}); document.getElementById('inv-items-list').innerHTML=renderInvoiceItemsHTML(sheet); return; }
  if(action==='remove-invoice-item'){ if(!sheet) return; sheet.items.splice(Number(t.dataset.idx),1); if(!sheet.items.length) sheet.items.push({id:uid(), name:'', price:''}); document.getElementById('inv-items-list').innerHTML=renderInvoiceItemsHTML(sheet); return; }
  if(action==='save-invoice'){
    if(!sheet) return;
    const items = sheet.items.filter(it=>it.name.trim()&&Number(it.price)>0).map(it=>({id:it.id||uid(), name:it.name.trim().slice(0,60), price:Number(it.price)}));
    if(items.length){
      const total = items.reduce((s,it)=>s+it.price,0);
      const invoice={id:sheet.id||uid(), title:(sheet.title||'').trim()||('Factura '+todayStr()), date:todayStr(), items, total, registered:!!sheet.registered};
      if(!DB.invoices) DB.invoices=[];
      const exists=DB.invoices.some(x=>x.id===invoice.id);
      DB.invoices=exists?DB.invoices.map(x=>x.id===invoice.id?invoice:x):DB.invoices.concat([invoice]);
      saveDB(); 
      safeSync();
      sheet=null; renderAppContent();
    }
    return;
  }
  if(action==='delete-invoice'){ if(!sheet) return; confirmState={message:'¿Eliminar factura?', onConfirm:()=>{ DB.invoices=DB.invoices.filter(x=>x.id!==sheet.id); saveDB(); safeSync(); sheet=null; confirmState=null; renderAppContent(); }}; renderOverlays(); return; }

  if(action==='close-sheet'){ sheet=null; renderOverlays(); return; }
  if(action==='cancel-confirm'){ confirmState=null; renderOverlays(); return; }
  if(action==='confirm-ok'){ 
    if(!confirmState) return; 
    const fn=confirmState.onConfirm; 
    confirmState=null; 
    renderOverlays(); 
    fn(); 
    return; 
  }

  if(action==='set-currency'){ DB.settings.currency=t.dataset.code; saveDB(); safeSync(); renderAppContent(); return; }
});

function attachSheetFieldSync(){
  if (!sheet) return;
  if (sheet.kind === 'tx' || sheet.kind === 'quick'){
    const prefix = sheet.kind === 'tx' ? 'f' : 'q';
    const a = document.getElementById(prefix + '-amount'), d = document.getElementById(prefix + '-date'), n = document.getElementById(prefix + '-note');
    if (a) a.addEventListener('input', (e) => { sheet.amount = parseFormattedNumber(e.target.value); e.target.value = formatThousandInput(sheet.amount); });
    if (d) d.addEventListener('input', () => { sheet.date = d.value; });
    if (n) n.addEventListener('input', () => { sheet.note = n.value; });
  } else if (sheet.kind === 'cat'){
    const nm = document.getElementById('f-name'), b = document.getElementById('f-budget');
    if (nm) nm.addEventListener('input', () => { sheet.name = nm.value; });
    if (b) b.addEventListener('input', (e) => { sheet.budget = parseFormattedNumber(e.target.value); e.target.value = formatThousandInput(sheet.budget); });
  } else if (sheet.kind === 'credit'){
    const title = document.getElementById('c-title'), tot = document.getElementById('c-total');
    if (title) title.addEventListener('input', () => { sheet.title = title.value; });
    if (tot) tot.addEventListener('input', (e) => { 
      sheet.total = parseFormattedNumber(e.target.value); 
      e.target.value = formatThousandInput(sheet.total); 
      
      const saveBtn = document.querySelector('button[data-action="save-credit"]');
      if (saveBtn) {
        if (sheet.title && sheet.title.trim().length > 0 && Number(sheet.total) > 0) {
          saveBtn.removeAttribute('disabled');
          saveBtn.style.opacity = '1';
          saveBtn.style.cursor = 'pointer';
        } else {
          saveBtn.setAttribute('disabled', 'true');
          saveBtn.style.opacity = '0.5';
        }
      }
    });
  } else if (sheet.kind === 'payment'){
    const a = document.getElementById('p-amount'), d = document.getElementById('p-date'), n = document.getElementById('p-note');
    if (a) a.addEventListener('input', (e) => { sheet.amount = parseFormattedNumber(e.target.value); e.target.value = formatThousandInput(sheet.amount); });
    if (d) d.addEventListener('input', () => { sheet.date = d.value; });
    if (n) n.addEventListener('input', () => { sheet.note = n.value; });
  } else if (sheet.kind === 'invoice'){
    const ti = document.getElementById('inv-title'), da = document.getElementById('inv-date');
    if (ti) ti.addEventListener('input', () => { sheet.title = ti.value; });
    if (da) da.addEventListener('input', () => { sheet.date = da.value; });
    const list = document.getElementById('inv-items-list');
    if (list) list.addEventListener('input', (e) => {
      const idx = e.target.dataset.idx, field = e.target.dataset.field;
      if (idx === undefined || !field) return;
      if (field === 'price'){
        sheet.items[idx].price = parseFormattedNumber(e.target.value);
        e.target.value = formatThousandInput(sheet.items[idx].price);
      } else { sheet.items[idx][field] = e.target.value; }
      const totalVal = sheet.items.reduce((s,it)=>s+(Number(it.price)||0),0);
      const totalEl = document.getElementById('inv-total-val');
      if (totalEl) totalEl.textContent = new Intl.NumberFormat('es-CO', {style:'currency', currency:DB.settings.currency||'COP', maximumFractionDigits:0}).format(totalVal);
    });
  }
}

render();
