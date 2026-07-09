import { CONFIG } from './config.js';
import { $, $$, toast } from './utils.js';

export function initPayments() {
  $$('.btn-subscribe').forEach(btn => {
    btn.addEventListener('click', () => {
      const plan = btn.dataset.plan;
      handlePayment(plan);
    });
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
}
