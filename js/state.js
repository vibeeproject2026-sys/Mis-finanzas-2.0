export const STORAGE_KEY = 'finanzas_app_v2';

export const SWATCHES = ['#06B6D4','#F43F5E','#F59E0B','#34D399','#0EA5E9','#38BDF8','#3B82F6','#A855F7','#EAB308','#64748B'];

export const ICON_KEYS = [
  'food',
  'transport',
  'home',
  'zap',
  'heart',
  'fun',
  'shopping',
  'briefcase',
  'dollarSign',
  'more'
];

export const ICON_EMOJI = {
  food:'🍔',
  transport:'🚗',
  home:'🏠',
  zap:'💡',
  heart:'❤',
  fun:'🎬',
  shopping:'🛍',
  briefcase:'💼',
  dollarSign:'💵',
  more:'⭐'
};

export const DEFAULT_CATEGORIES = [
  {id:'inc-salary',name:'Salario',type:'income',color:'#34D399',icon:'briefcase',primary:true},
  {id:'inc-sales',name:'Ventas',type:'income',color:'#0EA5E9',icon:'dollarSign',primary:false},
  {id:'inc-other',name:'Otros ingresos',type:'income',color:'#3B82F6',icon:'more',primary:false},
  {id:'exp-food',name:'Comida',type:'expense',color:'#F43F5E',icon:'food',budget:null,isFixed:false},
  {id:'exp-transport',name:'Transporte',type:'expense',color:'#F59E0B',icon:'transport',budget:null,isFixed:false},
  {id:'exp-home',name:'Hogar',type:'expense',color:'#A855F7',icon:'home',budget:null,isFixed:true},
  {id:'exp-services',name:'Servicios',type:'expense',color:'#3B82F6',icon:'zap',budget:null,isFixed:true},
  {id:'exp-health',name:'Salud',type:'expense',color:'#38BDF8',icon:'heart',budget:null,isFixed:false},
  {id:'exp-fun',name:'Entretenimiento',type:'expense',color:'#A855F7',icon:'fun',budget:null,isFixed:false},
  {id:'exp-shopping',name:'Compras',type:'expense',color:'#EAB308',icon:'shopping',budget:null,isFixed:false},
  {id:'exp-other',name:'Otros gastos',type:'expense',color:'#64748B',icon:'more',budget:null,isFixed:false},
];

export const CURRENCIES = {
  COP:{locale:'es-CO',label:'Peso colombiano (COP)'},
  USD:{locale:'en-US',label:'Dólar (USD)'},
  MXN:{locale:'es-MX',label:'Peso mexicano (MXN)'},
  EUR:{locale:'es-ES',label:'Euro (EUR)'},
};

export let storageOk = true;

try {
  localStorage.setItem('__test__','1');
  localStorage.removeItem('__test__');
} catch(e) {
  storageOk = false;
}

function normalizeMoneyField(m) {
  if (!m || typeof m !== 'object') return null;
  return { rawValue: String(m.rawValue ?? ''), value: Number(m.value) || 0 };
}

function normalizeMoneyList(list) {
  return (Array.isArray(list) ? list : []).map(m => ({
    ...(m && m.name != null ? { name: String(m.name) } : {}),
    rawValue: String(m?.rawValue ?? ''),
    value: Number(m?.value) || 0,
    ...(m && m.percentage != null ? { percentage: Number(m.percentage) || 0 } : {})
  }));
}

function normalizeInvoiceMeta(inv) {
  const subtotal = normalizeMoneyField(inv.subtotal);
  const discounts = normalizeMoneyList(inv.discounts);
  const tax = normalizeMoneyField(inv.tax);
  const retentions = normalizeMoneyList(inv.retentions);
  const additionalCharges = normalizeMoneyList(inv.additionalCharges);
  const detectedTotal = normalizeMoneyField(inv.detectedTotal);
  const netPayable = normalizeMoneyField(inv.netPayable);

  return {
    subtotal,
    discounts,
    tax,
    retentions,
    additionalCharges,
    detectedTotal,
    netPayable,
    hasAiMetadata: !!(
      inv.hasAiMetadata ||
      subtotal || tax || detectedTotal || netPayable ||
      discounts.length || retentions.length || additionalCharges.length
    )
  };
}

export function todayStr(){
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function loadDB(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw) {
      const parsed = JSON.parse(raw);

      const txs = (parsed.transactions || []).map(t => ({
        ...t,
        amount: Number(t.amount) || 0,
        date: (t.date && typeof t.date === 'string')
          ? t.date
          : todayStr()
      }));

      const credits = (parsed.credits || []).map(c => ({
        ...c,
        total: Number(c.total) || 0,
        payments: (c.payments || []).map(p => ({
          ...p,
          amount: Number(p.amount) || 0
        }))
      }));

      const invoices = (parsed.invoices || []).map(inv => ({
        ...inv,
        total: Number(inv.total) || 0,
        items: (inv.items || []).map(it => ({
          ...it,
          price: Number(it.price) || 0
        })),
        ...normalizeInvoiceMeta(inv)
      }));

      return {
        transactions: txs,
        categories: (parsed.categories && parsed.categories.length)
          ? parsed.categories
          : DEFAULT_CATEGORIES.slice(),
        credits,
        invoices,
        settings: parsed.settings || {currency:'COP'},
      };
    }
  } catch(e) {
    console.error('Error al cargar los datos locales:', e);
  }

  return {
    transactions:[],
    categories:DEFAULT_CATEGORIES.slice(),
    credits:[],
    invoices:[],
    settings:{currency:'COP'}
  };
}

export let DB = loadDB();

export function saveDB(){
  if (!storageOk) return false;

  try {
    const clean = {
      transactions: DB.transactions.map(t => ({
        ...t,
        amount: Number(t.amount) || 0
      })),

      categories: DB.categories,

      credits: (DB.credits || []).map(c => ({
        ...c,
        total: Number(c.total) || 0,
        payments: (c.payments || []).map(p => ({
          ...p,
          amount: Number(p.amount) || 0
        }))
      })),

      invoices: (DB.invoices || []).map(inv => ({
        ...inv,
        total: Number(inv.total) || 0,
        items: (inv.items || []).map(it => ({
          ...it,
          price: Number(it.price) || 0
        })),
        ...normalizeInvoiceMeta(inv)
      })),

      settings: DB.settings
    };

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(clean)
    );

    return true;

  } catch(e) {
    storageOk = false;
    console.error('Error al guardar los datos locales:', e);
    return false;
  }
}
