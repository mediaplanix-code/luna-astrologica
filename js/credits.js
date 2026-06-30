// ============================================================
// js/credits.js — Pagina acquisto crediti
// Predisposta per Stripe, funziona in modalità test
// ============================================================

import { CONFIG } from './config.js';
import { getCurrentUser, getCredits, updateCredits } from './auth.js';

const CREDIT_PACKAGES = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 20,
    price: 4.99,
    currency: 'EUR',
    description: 'Per iniziare il tuo viaggio con Luna',
    popular: false,
    icon: '🌙'
  },
  {
    id: 'popular',
    name: 'Esploratore',
    credits: 50,
    price: 9.99,
    currency: 'EUR',
    description: 'Il preferito dagli utenti',
    popular: true,
    icon: '⭐'
  },
  {
    id: 'premium',
    name: 'Maestro',
    credits: 120,
    price: 19.99,
    currency: 'EUR',
    description: 'Per chi vuole tutto da Luna',
    popular: false,
    icon: '🔮'
  },
  {
    id: 'unlimited',
    name: 'Illuminato',
    credits: 300,
    price: 39.99,
    currency: 'EUR',
    description: 'Accesso completo senza limiti',
    popular: false,
    icon: '✨'
  }
];

// ===== RENDER PAGINA CREDITI =====
export function renderCreditsPage() {
  const page = document.getElementById('page-credits');
  if (!page) return;

  const user = getCurrentUser();
  const currentCredits = getCredits();

  let html = `
    <div class="credits-page">
      <div class="credits-header">
        <h1>💎 Crediti Luna</h1>
        <p class="credits-subtitle">Ogni credito è una conversazione con l'universo</p>

        <div class="credits-balance">
          <span class="credits-balance-icon">💎</span>
          <span class="credits-balance-amount">${currentCredits}</span>
          <span class="credits-balance-label">crediti disponibili</span>
        </div>
      </div>

      <div class="credits-packages">
        <h2>Scegli il tuo pacchetto</h2>
        <div class="packages-grid">
  `;

  CREDIT_PACKAGES.forEach(pkg => {
    const pricePerCredit = (pkg.price / pkg.credits).toFixed(2);
    html += `
      <div class="package-card ${pkg.popular ? 'popular' : ''}" data-package="${pkg.id}">
        ${pkg.popular ? '<div class="popular-badge">⭐ Più scelto</div>' : ''}
        <div class="package-icon">${pkg.icon}</div>
        <h3 class="package-name">${pkg.name}</h3>
        <div class="package-credits">
          <span class="credits-number">${pkg.credits}</span>
          <span class="credits-label">crediti</span>
        </div>
        <p class="package-description">${pkg.description}</p>
        <div class="package-price">
          <span class="price-amount">€${pkg.price}</span>
          <span class="price-per">€${pricePerCredit}/credito</span>
        </div>
        <button class="btn-buy" onclick="window.app.buyCredits('${pkg.id}')">
          Acquista ora
        </button>
      </div>
    `;
  });

  html += `
        </div>
      </div>

      <div class="credits-info">
        <h3>🌙 Come funzionano i crediti?</h3>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-icon">💬</div>
            <h4>Chat con Luna</h4>
            <p>1 credito = 1 messaggio</p>
          </div>
          <div class="info-item">
            <div class="info-icon">🎙️</div>
            <h4>Voce AI</h4>
            <p>2 crediti = 1 risposta vocale</p>
          </div>
          <div class="info-item">
            <div class="info-icon">📊</div>
            <h4>Report Completo</h4>
            <p>5 crediti = dossier approfondito</p>
          </div>
          <div class="info-item">
            <div class="info-icon">🎁</div>
            <h4>Bonus Giornalieri</h4>
            <p>1 credito gratis al giorno</p>
          </div>
        </div>
      </div>

      <div class="credits-faq">
        <h3>Domande frequenti</h3>
        <div class="faq-item">
          <h4>I crediti scadono?</h4>
          <p>No, i crediti non hanno scadenza. Li usi quando vuoi.</p>
        </div>
        <div class="faq-item">
          <h4>Posso regalare i crediti?</h4>
          <p>Funzionalità in arrivo nelle prossime settimane.</p>
        </div>
        <div class="faq-item">
          <h4>Rimborsi?</h4>
          <p>Offriamo rimborso entro 14 giorni se non hai usato i crediti.</p>
        </div>
      </div>
    </div>
  `;

  page.innerHTML = html;
}

// ===== ACQUISTA CREDITI =====
export async function buyCredits(packageId) {
  const user = getCurrentUser();
  if (!user) {
    if (window.app) window.app.openAuthModal();
    return;
  }

  const pkg = CREDIT_PACKAGES.find(p => p.id === packageId);
  if (!pkg) return;

  // Modalità test: aggiungi crediti gratuitamente
  if (!CONFIG.FEATURES.STRIPE_PAYMENTS) {
    console.log('💳 Modalità test: aggiunti', pkg.credits, 'crediti');
    await updateCredits(pkg.credits);

    // Mostra conferma
    showPurchaseConfirmation(pkg, true);
    return;
  }

  // Produzione: chiama Stripe Checkout
  try {
    const response = await fetch(`${CONFIG.WORKER_URL}/api/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        packageId: pkg.id,
        credits: pkg.credits,
        amount: pkg.price,
        currency: pkg.currency
      })
    });

    const { sessionId, url } = await response.json();

    if (url) {
      window.location.href = url;
    } else if (sessionId && window.Stripe) {
      const stripe = Stripe(CONFIG.STRIPE_PUBLISHABLE_KEY);
      await stripe.redirectToCheckout({ sessionId });
    }
  } catch (err) {
    console.error('Errore checkout:', err);
    alert('Errore nel caricamento del pagamento. Riprova.');
  }
}

// ===== MOSTRA CONFERMA ACQUISTO =====
function showPurchaseConfirmation(pkg, isTest) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay active';
  modal.id = 'purchaseModal';
  modal.innerHTML = `
    <div class="modal-content purchase-modal">
      <div class="purchase-success">
        <div class="success-icon">${isTest ? '🧪' : '🎉'}</div>
        <h2>${isTest ? 'Modalità Test' : 'Acquisto Completato!'}</h2>
        <p>Hai ricevuto <strong>${pkg.credits} crediti</strong> nel tuo account!</p>
        <div class="purchase-details">
          <div class="detail-row">
            <span>Pacchetto:</span>
            <strong>${pkg.name}</strong>
          </div>
          <div class="detail-row">
            <span>Crediti:</span>
            <strong>${pkg.credits}</strong>
          </div>
          ${!isTest ? `
          <div class="detail-row">
            <span>Totale:</span>
            <strong>€${pkg.price}</strong>
          </div>
          ` : ''}
        </div>
        <button class="btn-primary" onclick="document.getElementById('purchaseModal').remove()">
          Inizia a usare i crediti
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

// ===== AGGIORNA BILANCIO UI =====
export function updateCreditsDisplay() {
  const balanceEl = document.querySelector('.credits-balance-amount');
  if (balanceEl) {
    balanceEl.textContent = getCredits();
  }
}
