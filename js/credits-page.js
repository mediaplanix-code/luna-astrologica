// ============================================================
// CREDITS PAGE — Luna Astrologica
// Gestione pacchetti acquisto, Stripe predisposto
// ============================================================

import { CONFIG } from './config.js';
import { getCurrentUser, getCurrentProfile } from './auth.js';

// ===== CONFIGURAZIONE PACCHETTI =====
const PACKAGES = {
  unlock: {
    id: 'unlock',
    name: 'Sblocco Personalizzazione',
    price: 3000, // centesimi
    priceDisplay: '€30',
    type: 'unlock',
    description: 'Tema natale, transiti, sinastria, eventi'
  },
  'chat-10': {
    id: 'chat-10',
    name: 'Chat Libera',
    price: 2500,
    priceDisplay: '€25',
    type: 'chat',
    minutes: 10,
    description: 'Consulto libero in chat con Luna'
  },
  'voice-10': {
    id: 'voice-10',
    name: 'Consulto Voce 10min',
    price: 3500,
    priceDisplay: '€35',
    type: 'voice',
    minutes: 10,
    description: 'Consulto a voce con Luna, 1 tema'
  },
  'voice-20': {
    id: 'voice-20',
    name: 'Consulto Voce 20min',
    price: 5500,
    priceDisplay: '€55',
    type: 'voice',
    minutes: 20,
    description: 'Consulto a voce con Luna, 2 temi'
  },
  'voice-30': {
    id: 'voice-30',
    name: 'Consulto Voce 30min',
    price: 7000,
    priceDisplay: '€70',
    type: 'voice',
    minutes: 30,
    description: 'Consulto a voce con Luna, analisi completa'
  }
};

// ===== INIZIALIZZAZIONE =====
export function initCreditsPage() {
  const page = document.getElementById('page-credits');
  if (!page) return;

  // Aggiungi listener ai pulsanti acquisto
  page.querySelectorAll('.btn-buy').forEach(btn => {
    btn.addEventListener('click', handleBuyClick);
  });
}

// ===== HANDLER ACQUISTO =====
async function handleBuyClick(e) {
  const btn = e.currentTarget;
  const packageId = btn.dataset.package;
  const pkg = PACKAGES[packageId];

  if (!pkg) {
    console.error('Pacchetto non trovato:', packageId);
    return;
  }

  const user = getCurrentUser();
  if (!user) {
    // Reindirizza a login
    if (window.app) window.app.openAuthModal();
    return;
  }

  // TODO: Stripe integration
  // Per ora: simula acquisto
  console.log('🛒 Avvio acquisto:', pkg);

  // Mostra modal Stripe (predisposto)
  showStripeModal(pkg);
}

// ===== MODAL STRIPE (PREDISPOSTO) =====
function showStripeModal(pkg) {
  // Crea modal dinamicamente
  const modalId = 'stripeModal';
  let modal = document.getElementById(modalId);

  if (!modal) {
    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal-overlay stripe-modal';
    modal.innerHTML = `
      <div class="modal">
        <button class="modal-close" onclick="closeStripeModal()">&times;</button>
        <div class="modal-content">
          <h2>💳 ${pkg.name}</h2>
          <p>${pkg.description}</p>
          <div class="stripe-placeholder">
            <div class="stripe-placeholder-text">
              🔧 Integrazione Stripe in arrivo<br><br>
              Pacchetto: <strong>${pkg.name}</strong><br>
              Prezzo: <strong>${pkg.priceDisplay}</strong><br>
              Tipo: <strong>${pkg.type}</strong>
              ${pkg.minutes ? `<br>Durata: <strong>${pkg.minutes} min</strong>` : ''}
            </div>
          </div>
          <button class="btn-gold" onclick="closeStripeModal()">Chiudi</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  } else {
    // Aggiorna contenuto
    modal.querySelector('h2').textContent = `💳 ${pkg.name}`;
    modal.querySelector('p').textContent = pkg.description;
    const placeholder = modal.querySelector('.stripe-placeholder-text');
    placeholder.innerHTML = `
      🔧 Integrazione Stripe in arrivo<br><br>
      Pacchetto: <strong>${pkg.name}</strong><br>
      Prezzo: <strong>${pkg.priceDisplay}</strong><br>
      Tipo: <strong>${pkg.type}</strong>
      ${pkg.minutes ? `<br>Durata: <strong>${pkg.minutes} min</strong>` : ''}
    `;
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// ===== CHIUDI MODAL STRIPE =====
window.closeStripeModal = function() {
  const modal = document.getElementById('stripeModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
};

// ===== VERIFICA SBLUTTO PERSONALIZZAZIONE =====
export async function checkPersonalizationUnlock(profile) {
  if (!profile) return false;

  // Verifica se ha pagato i 30€ e se è ancora valido
  const { data: unlock, error } = await supabase
    .from('personalization_unlocks')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !unlock) return false;

  const now = new Date();
  const unlockDate = new Date(unlock.created_at);
  const expiryDate = new Date(unlockDate);
  expiryDate.setMonth(expiryDate.getMonth() + 2);

  // Se scaduto, verifica se ha speso >=€50 nell'ultimo mese
  if (now > expiryDate) {
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const { data: spending } = await supabase
      .from('consult_purchases')
      .select('price')
      .eq('user_id', profile.id)
      .gte('created_at', monthAgo.toISOString());

    const totalSpent = spending?.reduce((sum, p) => sum + (p.price || 0), 0) || 0;

    if (totalSpent >= 5000) { // 5000 centesimi = €50
      // Rinnova sblocco per altri 2 mesi
      await supabase.from('personalization_unlocks').insert({
        user_id: profile.id,
        created_at: now.toISOString(),
        auto_renewed: true
      });
      return true;
    }

    return false;
  }

  return true;
}

// ===== RENDER PAGINA CREDITI (se necessario) =====
export function renderCreditsPage() {
  // La pagina è già in index.html, questa funzione inizializza solo i listener
  initCreditsPage();
}
