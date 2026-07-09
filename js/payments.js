import { CONFIG } from './config.js';
import { $, $$, toast, state, formatDateTime } from './utils.js';

export function initPayments() {
  $$('.btn-subscribe').forEach(btn => {
    btn.addEventListener('click', () => {
      const plan = btn.dataset.plan;
      handlePayment(plan);
    });
  });

  document.addEventListener('section:change', (e) => {
    if (e.detail.section === 'payments') {
      loadPurchases();
      loadTransactions();
    }
  });
}

function handlePayment(plan) {
  const plans = {
    quarterly: { name: 'Accesso Calcoli (3 mesi)', price: '€15' },
    consultation: { name: 'Consulenza Vocale (18 min)', price: '€45' },
    credits: { name: 'Pacchetto 10 Crediti', price: '€10' }
  };
  const p = plans[plan];
  toast(`Reindirizzamento al pagamento per: ${p.name} - ${p.price}`, 'info');
  // Placeholder: window.location.href = `${CONFIG.API_BASE}/api/checkout?plan=${plan}`;
}

async function loadPurchases() {
  if (!state.user) return;
  const sb = await (await import('./config.js')).getSupabase();

  try {
    const { data: purchases } = await sb
      .from(CONFIG.TABLES.CONSULT_PURCHASES)
      .select('*')
      .eq('user_id', state.user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    const list = $('#purchases-list');
    if (!purchases || purchases.length === 0) {
      list.innerHTML = '<p class="text-muted">Nessun acquisto.</p>';
      return;
    }

    list.innerHTML = '';
    purchases.forEach(p => {
      const div = document.createElement('div');
      div.style.cssText = 'display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--navy-lighter);';
      div.innerHTML = `
        <span style="color:var(--text);">${p.package_type || p.package_id} <span style="color:var(--text-dim);font-size:0.8rem;">(${p.status})</span></span>
        <span style="color:var(--gold);font-weight:600;">€${p.price}</span>
      `;
      list.appendChild(div);
    });
  } catch (err) {
    console.error('Purchases load error:', err);
  }
}

async function loadTransactions() {
  if (!state.user) return;
  const sb = await (await import('./config.js')).getSupabase();

  try {
    const { data: txs } = await sb
      .from(CONFIG.TABLES.CREDIT_TRANSACTIONS)
      .select('*')
      .eq('user_id', state.user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    const list = $('#transactions-list');
    if (!txs || txs.length === 0) {
      list.innerHTML = '<p class="text-muted">Nessuna transazione.</p>';
      return;
    }

    list.innerHTML = '';
    txs.forEach(t => {
      const div = document.createElement('div');
      div.style.cssText = 'display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--navy-lighter);';
      const sign = t.amount >= 0 ? '+' : '';
      const color = t.amount >= 0 ? 'var(--success)' : 'var(--text)';
      div.innerHTML = `
        <span style="color:var(--text);">${t.description || t.transaction_type} <span style="color:var(--text-dim);font-size:0.8rem;">${formatDateTime(t.created_at)}</span></span>
        <span style="color:${color};font-weight:600;">${sign}${t.amount} 💎</span>
      `;
      list.appendChild(div);
    });
  } catch (err) {
    console.error('Transactions load error:', err);
  }
}
