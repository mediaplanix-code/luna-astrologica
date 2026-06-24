// ============================================================
// PAYMENTS.JS v2.0 — Aggiunto hasActiveConsultPackage, getConsultPackageStatus
// Rinnovo gratis con consulenze €50+, logica regalo 3 mesi
// ============================================================

import { CONFIG } from './config.js';
import { getCurrentUser, getCurrentProfile } from './auth.js';

const STORAGE_KEY = 'luna_payments';

function getPaymentsData() {
 try {
 const data = localStorage.getItem(STORAGE_KEY);
 return data ? JSON.parse(data) : {
 subscription: { active: false, startedAt: null, expiresAt: null },
 consultPackages: [], // { id, category, purchasedAt, used, expiresAt }
 transactions: [],
 totalSpent: 0,
 periodSpent: 0,
 periodStart: null
 };
 } catch (e) {
 return {
 subscription: { active: false, startedAt: null, expiresAt: null },
 consultPackages: [],
 transactions: [],
 totalSpent: 0,
 periodSpent: 0,
 periodStart: null
 };
 }
}

function savePaymentsData(data) {
 localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ===== STATO ABBONAMENTO =====
export function getSubscriptionStatus() {
 const data = getPaymentsData();
 const now = Date.now();

 // Verifica regalo benvenuto
 const giftData = localStorage.getItem('luna_welcome_gift');
 let giftActive = false;
 let giftDaysLeft = 0;
 if (giftData) {
 const gift = JSON.parse(giftData);
 if (gift.activated && now < gift.expiresAt) {
 giftActive = true;
 giftDaysLeft = Math.max(0, Math.ceil((gift.expiresAt - now) / (24 * 60 * 60 * 1000)));
 }
 }

 // Verifica abbonamento pagato
 const sub = data.subscription;
 const subActive = sub.active && sub.expiresAt && now < sub.expiresAt;
 const subDaysLeft = subActive ? Math.max(0, Math.ceil((sub.expiresAt - now) / (24 * 60 * 60 * 1000))) : 0;

 // Periodo di spesa per rinnovo
 const periodStart = data.periodStart || (sub.startedAt || now);
 const periodEnd = periodStart + (90 * 24 * 60 * 60 * 1000); // 3 mesi
 const periodSpent = data.periodSpent || 0;
 const spendingNeeded = Math.max(0, CONFIG.PRICING.SPENDING_THRESHOLD - periodSpent);
 const spendingProgress = Math.min(100, (periodSpent / CONFIG.PRICING.SPENDING_THRESHOLD) * 100);
 const canRenewFree = periodSpent >= CONFIG.PRICING.SPENDING_THRESHOLD;

 // Priorità: regalo > abbonamento
 const active = giftActive || subActive;
 const daysLeft = giftActive ? giftDaysLeft : subDaysLeft;
 const expiresAt = giftActive ? JSON.parse(giftData).expiresAt : sub.expiresAt;

 return {
 active,
 giftActive,
 subActive,
 daysLeft,
 expiresAt,
 periodSpent,
 spendingNeeded,
 spendingProgress,
 canRenewFree,
 periodStart,
 periodEnd
 };
}

export function hasFullAccess() {
 const status = getSubscriptionStatus();
 return status.active || hasActiveConsultPackage();
}

export function shouldBlurPersonalized() {
 if (!CONFIG.FEATURES.BLUR_UNSUBSCRIBED) return false;
 return !hasFullAccess();
}

// ===== PACCHETTI CONSULTO =====
export function hasActiveConsultPackage() {
 const data = getPaymentsData();
 const now = Date.now();
 return data.consultPackages.some(p => !p.used && p.expiresAt > now);
}

export function getConsultPackageStatus() {
 const data = getPaymentsData();
 const now = Date.now();
 const active = data.consultPackages.filter(p => !p.used && p.expiresAt > now);
 return {
 hasPackage: active.length > 0,
 packages: active,
 count: active.length
 };
}

export function addConsultPackage(category) {
 const data = getPaymentsData();
 const now = Date.now();
 const packageId = 'consult_' + now + '_' + Math.random().toString(36).substr(2, 9);

 data.consultPackages.push({
 id: packageId,
 category: category || 'generale',
 purchasedAt: now,
 used: false,
 expiresAt: now + (30 * 24 * 60 * 60 * 1000) // 30 giorni validità
 });

 // Aggiungi transazione
 data.transactions.push({
 id: packageId,
 type: 'consult',
 description: 'Consulenza astrologica vocale' + (category ? ' — ' + category : ''),
 amount: CONFIG.PRICING.CONSULT_PACKAGE,
 date: now,
 status: 'completed'
 });

 // Aggiorna spesa periodo
 data.periodSpent = (data.periodSpent || 0) + CONFIG.PRICING.CONSULT_PACKAGE;
 if (!data.periodStart) data.periodStart = now;

 savePaymentsData(data);
 return packageId;
}

export function useConsultPackage(packageId) {
 const data = getPaymentsData();
 const pkg = data.consultPackages.find(p => p.id === packageId);
 if (pkg && !pkg.used) {
 pkg.used = true;
 pkg.usedAt = Date.now();
 savePaymentsData(data);
 return true;
 }
 return false;
}

// ===== GESTIONE SPESA E RINNOVO =====
export function recordSpent(amount, description) {
 const data = getPaymentsData();
 const now = Date.now();

 // Inizializza periodo se necessario
 if (!data.periodStart) data.periodStart = now;

 // Verifica se periodo è scaduto (3 mesi)
 const periodEnd = data.periodStart + (90 * 24 * 60 * 60 * 1000);
 if (now > periodEnd) {
 // Nuovo periodo
 data.periodStart = now;
 data.periodSpent = 0;
 }

 data.periodSpent = (data.periodSpent || 0) + amount;
 data.totalSpent = (data.totalSpent || 0) + amount;

 data.transactions.push({
 id: 'tx_' + now + '_' + Math.random().toString(36).substr(2, 9),
 type: 'spending',
 description: description || 'Acquisto servizio',
 amount: amount,
 date: now,
 status: 'completed'
 });

 savePaymentsData(data);

 // Verifica rinnovo gratuito
 checkAndApplyFreeRenewal();
}

function checkAndApplyFreeRenewal() {
 const data = getPaymentsData();
 const status = getSubscriptionStatus();

 if (status.canRenewFree && status.subActive) {
 // Rinnova abbonamento gratis
 const now = Date.now();
 data.subscription.expiresAt = now + (90 * 24 * 60 * 60 * 1000);
 data.periodStart = now;
 data.periodSpent = 0;

 data.transactions.push({
 id: 'renewal_' + now,
 type: 'renewal',
 description: 'Rinnovo gratuito trimestre — spesa €' + CONFIG.PRICING.SPENDING_THRESHOLD + '+',
 amount: 0,
 date: now,
 status: 'completed'
 });

 savePaymentsData(data);
 console.log('🎉 Rinnovo gratuito applicato!');
 }
}

// ===== WELCOME GIFT =====
export function activateWelcomeGift() {
 const giftData = localStorage.getItem('luna_welcome_gift');
 if (!giftData) {
 const now = Date.now();
 const expires = now + (CONFIG.WELCOME_GIFT_DAYS * 24 * 60 * 60 * 1000);
 const gift = { activated: true, createdAt: now, expiresAt: expires };
 localStorage.setItem('luna_welcome_gift', JSON.stringify(gift));
 } else {
 const gift = JSON.parse(giftData);
 gift.activated = true;
 localStorage.setItem('luna_welcome_gift', JSON.stringify(gift));
 }

 // Registra transazione gratuita
 const data = getPaymentsData();
 data.transactions.push({
 id: 'welcome_gift_' + Date.now(),
 type: 'gift',
 description: 'Regalo benvenuto — 3 mesi accesso completo (valore €' + CONFIG.PRICING.SUBSCRIPTION + ')',
 amount: 0,
 date: Date.now(),
 status: 'completed'
 });
 savePaymentsData(data);
}

export function shouldShowWelcomeGift() {
 const giftData = localStorage.getItem('luna_welcome_gift');
 if (!giftData) return true;
 const gift = JSON.parse(giftData);
 return !gift.activated;
}

// ===== PAGAMENTI UI =====
export function renderPaymentsPage() {
 const page = document.getElementById('page-payments');
 if (!page) return;

 const status = getSubscriptionStatus();
 const data = getPaymentsData();

 const subSection = status.active ? `
 <div style="background:var(--bg-elevated); border-radius:0.75rem; padding:1.25rem; margin-bottom:1.5rem; border-left:3px solid var(--gold);">
 <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:0.75rem;">
 <span style="font-size:1.5rem;">✨</span>
 <div>
 <div style="font-weight:700; color:var(--gold);">Abbonamento Attivo</div>
 <div style="font-size:0.875rem; color:var(--text-dim);">⏳ Scade il ${new Date(status.expiresAt).toLocaleDateString('it-IT')} (${status.daysLeft} giorni rimasti)</div>
 </div>
 </div>
 ${status.canRenewFree ? `
 <div style="background:rgba(34,197,94,0.1); border-radius:0.5rem; padding:0.75rem; margin-top:0.75rem;">
 <div style="color:#22c55e; font-size:0.875rem; font-weight:600;">✅ Rinnovo gratuito garantito!</div>
 <div style="font-size:0.75rem; color:var(--text-dim); margin-top:0.25rem;">Hai speso €${status.periodSpent} in questo periodo — il prossimo trimestre è gratis</div>
 </div>
 ` : `
 <div style="margin-top:0.75rem;">
 <div style="display:flex; justify-content:space-between; font-size:0.875rem; margin-bottom:0.5rem;">
 <span style="color:var(--text-dim);">Spesa nel periodo</span>
 <span style="color:var(--text);">€${status.periodSpent} / €${CONFIG.PRICING.SPENDING_THRESHOLD}</span>
 </div>
 <div style="background:var(--bg); border-radius:0.5rem; height:0.5rem; overflow:hidden;">
 <div style="background:linear-gradient(90deg, var(--gold), #f59e0b); height:100%; width:${status.spendingProgress}%; border-radius:0.5rem; transition:width 0.5s;"></div>
 </div>
 <div style="font-size:0.75rem; color:var(--text-dim); margin-top:0.5rem;">
 ${status.spendingProgress >= 100 ? '🎉 Complimenti! Il prossimo trimestre è gratuito' : `Mancano €${status.spendingNeeded} per il rinnovo gratuito`}
 </div>
 </div>
 `}
 </div>
 ` : `
 <div style="background:var(--bg-elevated); border-radius:0.75rem; padding:1.25rem; margin-bottom:1.5rem; text-align:center;">
 <div style="font-size:2.5rem; margin-bottom:0.75rem;">🌙</div>
 <h3 style="margin:0 0 0.5rem 0; color:var(--gold);">Abbonamento Completo</h3>
 <div style="font-size:1.5rem; font-weight:800; color:var(--text); margin-bottom:0.5rem;">€${CONFIG.PRICING.SUBSCRIPTION} <span style="font-size:0.875rem; font-weight:400; color:var(--text-dim);">/ trimestre</span></div>
 <div style="font-size:0.875rem; color:var(--text-dim); margin-bottom:1rem; line-height:1.5;">
 Accesso completo al tema natale, transiti, affinità<br>
 Rinnovo <strong style="color:var(--gold);">gratis</strong> con consulenze €${CONFIG.PRICING.SPENDING_THRESHOLD}+
 </div>
 <button class="btn-gold" onclick="window.app.startStripeCheckout('subscription')" style="width:100%; padding:0.875rem;">
 💳 Attiva Abbonamento €${CONFIG.PRICING.SUBSCRIPTION}
 </button>
 </div>
 `;

 const packagesSection = `
 <div style="margin-bottom:1.5rem;">
 <h4 style="margin:0 0 1rem 0; color:var(--text); font-size:1rem;">🎯 Consulenze Vocali</h4>
 <div style="background:var(--bg-elevated); border-radius:0.75rem; padding:1.25rem; display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
 <div>
 <div style="font-weight:700; color:var(--text);">Consulzione Astrologica Vocale</div>
 <div style="font-size:0.875rem; color:var(--text-dim); margin-top:0.25rem;">18 minuti • Tema natale + transiti • Categoria a scelta</div>
 </div>
 <div style="text-align:right;">
 <div style="font-size:1.25rem; font-weight:800; color:var(--gold);">€${CONFIG.PRICING.CONSULT_PACKAGE}</div>
 <button class="btn-gold" onclick="window.app.startStripeCheckout('consult')" style="padding:0.5rem 1rem; font-size:0.875rem; margin-top:0.5rem;">Acquista</button>
 </div>
 </div>
 </div>
 `;

 const historySection = data.transactions.length > 0 ? `
 <div>
 <h4 style="margin:0 0 1rem 0; color:var(--text); font-size:1rem;">📜 Storico Transazioni</h4>
 ${data.transactions.slice(-10).reverse().map(t => `
 <div style="display:flex; justify-content:space-between; align-items:center; padding:0.75rem; background:var(--bg-elevated); border-radius:0.5rem; margin-bottom:0.5rem;">
 <div>
 <div style="font-size:0.875rem; color:var(--text);">${t.description}</div>
 <div style="font-size:0.75rem; color:var(--text-dim);">${new Date(t.date).toLocaleDateString('it-IT')}</div>
 </div>
 <div style="font-weight:700; color:${t.amount === 0 ? '#22c55e' : 'var(--text)'};">${t.amount === 0 ? 'GRATIS' : '-€' + t.amount}</div>
 </div>
 `).join('')}
 </div>
 ` : '';

 page.innerHTML = `
 <div style="padding:1.5rem; max-width:600px; margin:0 auto;">
 <h2 style="margin:0 0 1.5rem 0; color:var(--gold); font-size:1.5rem; text-align:center;">💳 Pagamenti & Abbonamento</h2>
 ${subSection}
 ${packagesSection}
 ${historySection}
 </div>
 `;
}

export function updatePaymentsUI() {
 // Aggiorna eventuali elementi UI legati ai pagamenti
 const cartBtn = document.getElementById('cartBtn');
 if (cartBtn) {
 const status = getSubscriptionStatus();
 const hasConsult = hasActiveConsultPackage();
 if (status.active || hasConsult) {
 cartBtn.style.display = 'none';
 } else {
 cartBtn.style.display = 'flex';
 }
 }
}

export function startStripeCheckout(type) {
 if (!CONFIG.FEATURES.STRIPE_PAYMENTS) {
 // Modalità test: simula acquisto
 if (type === 'subscription') {
 const data = getPaymentsData();
 const now = Date.now();
 data.subscription = {
 active: true,
 startedAt: now,
 expiresAt: now + (90 * 24 * 60 * 60 * 1000)
 };
 data.periodStart = now;
 data.periodSpent = 0;
 data.transactions.push({
 id: 'sub_' + now,
 type: 'subscription',
 description: 'Abbonamento trimestre',
 amount: CONFIG.PRICING.SUBSCRIPTION,
 date: now,
 status: 'completed'
 });
 savePaymentsData(data);
 alert('✅ Abbonamento attivato in modalità test!\n\nScadenza: ' + new Date(data.subscription.expiresAt).toLocaleDateString('it-IT'));
 } else if (type === 'consult') {
 const category = window.app?.state?.consultCategory || 'generale';
 addConsultPackage(category);
 alert('✅ Consulenza acquistata in modalità test!\n\nVai su "Parla con le tue stelle" per iniziare la sessione.');
 }
 window.app.showPage('personalized');
 return;
 }

 // Produzione: redirect Stripe
 alert('💳 Redirect a Stripe Checkout...\n(In produzione: integrazione Stripe reale)');
}
