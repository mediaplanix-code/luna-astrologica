// ============================================================
// APP.JS v14.1 — Fix parentesi, rimosso duplicato activateWelcomeGift
// ============================================================

import { loadNatalChart, updateNatalChartUI } from './natal.js';
import { CONFIG } from './config.js';
import { $, hideAlerts } from './utils.js';
import {
 renderHeader, renderNav, renderHomePage, renderHoroscopePage,
 renderAuthModal, renderCompatModal,
 renderPersonalizedPage, renderVoicePage, showPage as uiShowPage
} from './ui.js';
import {
 initAuth, handleRegister, handleLogin, handleLogout,
 loadUserData, getCurrentUser, getCurrentProfile, getCredits,
 updateCredits, geocodeProfileIfNeeded
} from './auth.js';
import { switchHoroTab } from './horoscope.js';
import {
 openCompatModal, closeCompatModal, handleCompatSubmit,
 showCompat, openProfileEdit, toggleAccordion
} from './profile.js';
import { loadTransits } from './transits.js';
import {
 renderPaymentsPage,
 startStripeCheckout,
 getSubscriptionStatus,
 hasFullAccess,
 updatePaymentsUI,
 shouldBlurPersonalized,
 hasActiveConsultPackage,
 getConsultPackageStatus,
 addConsultPackage,
 useConsultPackage
} from './payments.js';
import {
 startVoiceSession as startRealVoiceSession,
 endSession as endRealVoiceSession,
 getStatus as getVoiceSessionStatus
} from './voice.js';

let state = {
 currentPage: "home",
 lastPage: "home",
 voiceCategory: null,
 consultCategory: null
};

let cachedNatalChart = null;
let isLoadingChart = false;

const NATAL_CHART_KEY = 'luna_natal_chart';
const NATAL_CHART_TIMESTAMP_KEY = 'luna_natal_chart_ts';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

function saveNatalChartToStorage(chartData) {
 if (!chartData) return;
 try {
 localStorage.setItem(NATAL_CHART_KEY, JSON.stringify(chartData));
 localStorage.setItem(NATAL_CHART_TIMESTAMP_KEY, Date.now().toString());
 } catch (err) {
 console.warn('Errore salvataggio chart:', err);
 }
}

function loadNatalChartFromStorage() {
 try {
 const saved = localStorage.getItem(NATAL_CHART_KEY);
 const timestamp = localStorage.getItem(NATAL_CHART_TIMESTAMP_KEY);
 if (!saved || !timestamp) return null;
 const age = Date.now() - parseInt(timestamp);
 if (age > CACHE_DURATION_MS) {
 localStorage.removeItem(NATAL_CHART_KEY);
 localStorage.removeItem(NATAL_CHART_TIMESTAMP_KEY);
 return null;
 }
 return JSON.parse(saved);
 } catch (err) {
 return null;
 }
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", async () => {
 renderAuthModal();
 renderCompatModal();
 renderHomePage();
 renderVoicePage();

 const urlParams = new URLSearchParams(window.location.search);
 const isVerified = urlParams.get("verified");
 if (isVerified === "true") {
 window.history.replaceState({}, document.title, window.location.pathname);
 }

 const paymentStatus = urlParams.get("payment");
 if (paymentStatus === "success") {
 alert("Pagamento completato con successo!");
 window.history.replaceState({}, document.title, window.location.pathname);
 } else if (paymentStatus === "cancel") {
 alert("Pagamento annullato.");
 window.history.replaceState({}, document.title, window.location.pathname);
 }

 await initAuth(onAuthStateChange);

 let user = getCurrentUser();
 let profile = getCurrentProfile();

 let attempts = 0;
 while (user && !profile && attempts < 5) {
 console.log('Profilo latente, tentativo ' + (attempts + 1) + '/5...');
 await new Promise(r => setTimeout(r, 400));
 await loadUserData();
 user = getCurrentUser();
 profile = getCurrentProfile();
 attempts++;
 }

 if (user && profile && profile.id) {
 if (!cachedNatalChart) cachedNatalChart = loadNatalChartFromStorage();

 const page = document.getElementById('page-personalized');
 if (!page || page.innerHTML.trim() === '') {
 renderPersonalizedPage(profile, user, cachedNatalChart);
 console.log('DOM personalized costruito');
 } else if (cachedNatalChart) {
 updateNatalChartUI(cachedNatalChart);
 console.log('DOM personalized aggiornato da cache');
 }

 const creditsValue = getCredits() || profile.credits || 0;
 console.log('Crediti inizializzati:', creditsValue);

 updateUI({
 isLoggedIn: true,
 user: user,
 profile: profile,
 credits: creditsValue
 });

 showPage("personalized");
 setTimeout(() => ensureGeocodingAndChart(profile), 600);
 console.log("Sessione attiva — personalized caricata");
 } else {
 updateUI({ isLoggedIn: false, user: null, profile: null, credits: 0 });
 showPage("home");
 console.log("Nessuna sessione — home caricata");
 }
});

// ===== AUTH STATE =====
function onAuthStateChange(authState) {
 updateUI(authState);
 updatePaymentsUI();

 if (authState.isLoggedIn && authState.profile && authState.profile.id && state.currentPage !== 'personalized') {
 if (!cachedNatalChart) cachedNatalChart = loadNatalChartFromStorage();
 const page = document.getElementById('page-personalized');
 if (!page || page.innerHTML.trim() === '') {
 renderPersonalizedPage(authState.profile, authState.user, cachedNatalChart);
 }
 showPage("personalized");
 setTimeout(() => ensureGeocodingAndChart(authState.profile), 600);
 }
}

// ===== GEO + CHART =====
async function ensureGeocodingAndChart(profile) {
 if (isLoadingChart) {
 console.log('Calcolo tema gia in corso, skip');
 return;
 }
 if (!profile) {
 console.warn('ensureGeocodingAndChart: profilo non fornito');
 return;
 }

 isLoadingChart = true;
 try {
 if (!profile.birth_latitude && profile.birth_city && profile.birth_country) {
 console.log('Geocoding necessario per:', profile.birth_city);
 const geoOk = await geocodeProfileIfNeeded();
 if (!geoOk) {
 console.warn('Geocoding fallito');
 return;
 }
 console.log('Geocoding completato');
 profile = getCurrentProfile() || profile;
 }

 console.log('Avvio calcolo tema natale...');
 const chart = await loadNatalChart();
 if (chart) {
 cachedNatalChart = chart;
 saveNatalChartToStorage(chart);
 console.log('Tema natale calcolato e salvato');
 } else {
 console.warn('Tema natale non calcolato');
 }

 console.log('Avvio caricamento transiti...');
 await loadTransits();
 } catch (err) {
 console.error('Errore ensureGeocodingAndChart:', err);
 } finally {
 isLoadingChart = false;
 }
}

// ===== UI =====
function updateUI(authState) {
 const isLoggedIn = authState && authState.isLoggedIn || false;
 const profile = authState && authState.profile || null;
 const user = authState && authState.user || null;

 renderHeader(isLoggedIn, profile || user || null);
 renderNav(state.currentPage);
}

function showPage(pageId) {
 if (pageId !== "voice") state.lastPage = pageId;
 state.currentPage = pageId;
 uiShowPage(pageId, state.lastPage);
 renderNav(pageId);

 const user = getCurrentUser();
 const profile = getCurrentProfile();

 updateUI({
 isLoggedIn: !!user,
 user: user,
 profile: profile,
 credits: getCredits()
 });

 if (pageId === "personalized") {
 if (cachedNatalChart) {
 updateNatalChartUI(cachedNatalChart);
 console.log('Dati natal ridisegnati su personalized');
 } else if (profile) {
 console.log('Dati natal mancanti, avvio caricamento...');
 setTimeout(() => ensureGeocodingAndChart(profile), 100);
 }
 applyPersonalizedBlur();
 }

 if (pageId === "payments") {
 renderPaymentsPage();
 updatePaymentsUI();
 }
}

// ===== OFFUSCAMENTO COMPLETO TEMA NATALE =====
function applyPersonalizedBlur() {
 if (!CONFIG.FEATURES.BLUR_UNSUBSCRIBED) return;

 const status = getSubscriptionStatus();
 const giftStatus = getWelcomeGiftStatus();
 const hasAccess = status.active || giftStatus.active || hasActiveConsultPackage();

 const blurSelectors = [
 '#acc-wheel',
 '#acc-planets',
 '#acc-houses',
 '#acc-aspects',
 '#acc-transits',
 '#acc-dossier',
 '.personal-astro-line',
 '.compat-row',
 '.planet-grid'
 ];

 blurSelectors.forEach(selector => {
 const elements = document.querySelectorAll(selector);
 elements.forEach(el => {
 if (!el) return;

 if (!hasAccess) {
 el.classList.add('blur-section');
 el.style.filter = 'blur(8px)';
 el.style.userSelect = 'none';
 el.style.pointerEvents = 'none';
 el.style.opacity = '0.4';
 el.style.position = 'relative';

 let overlay = el.querySelector('.blur-overlay');
 if (!overlay) {
 overlay = document.createElement('div');
 overlay.className = 'blur-overlay';
 const daysLeft = giftStatus.daysLeft || CONFIG.WELCOME_GIFT_DAYS;
 overlay.innerHTML = '<div style="text-align:center; padding:1.5rem;">' +
 '<div style="font-size:2.5rem; margin-bottom:0.5rem;">🎁</div>' +
 '<div style="font-size:1rem; font-weight:700; color:var(--gold); margin-bottom:0.5rem;">Regalo per te!</div>' +
 '<div style="font-size:0.875rem; color:var(--text); margin-bottom:1rem; line-height:1.5;">' +
 'Sblocca il tuo tema natale completo<br>' +
 '<strong style="color:var(--gold);">3 mesi gratis</strong> (valore 15 euro)' +
 '</div>' +
 '<button class="btn-gold" onclick="window.app.activateWelcomeGift()" style="padding:0.625rem 1.5rem; font-size:0.875rem; width:auto; display:inline-block;">' +
 '✨ Attiva ora' +
 '</button>' +
 '<div style="font-size:0.75rem; color:var(--text-dim); margin-top:0.75rem;">' +
 'Scade tra ' + daysLeft + ' giorni. Rinnovo gratis con consulenze 50+ euro' +
 '</div>' +
 '</div>';
 el.appendChild(overlay);
 }
 overlay.style.display = 'flex';
 overlay.style.alignItems = 'center';
 overlay.style.justifyContent = 'center';
 } else {
 el.classList.remove('blur-section');
 el.style.filter = '';
 el.style.userSelect = '';
 el.style.pointerEvents = '';
 el.style.opacity = '';
 const overlay = el.querySelector('.blur-overlay');
 if (overlay) overlay.style.display = 'none';
 }
 });
 });
}

// ===== STATO REGALO BENVENUTO =====
function getWelcomeGiftStatus() {
 const giftData = localStorage.getItem('luna_welcome_gift');
 if (!giftData) {
 const now = Date.now();
 const expires = now + (CONFIG.WELCOME_GIFT_DAYS * 24 * 60 * 60 * 1000);
 const gift = { activated: false, createdAt: now, expiresAt: expires };
 localStorage.setItem('luna_welcome_gift', JSON.stringify(gift));
 return { active: false, daysLeft: CONFIG.WELCOME_GIFT_DAYS, activated: false };
 }

 const gift = JSON.parse(giftData);
 const now = Date.now();
 const daysLeft = Math.max(0, Math.ceil((gift.expiresAt - now) / (24 * 60 * 60 * 1000)));

 return {
 active: gift.activated && now < gift.expiresAt,
 daysLeft: daysLeft,
 activated: gift.activated,
 expiresAt: gift.expiresAt
 };
}

function activateWelcomeGift() {
 const giftData = localStorage.getItem('luna_welcome_gift');
 if (!giftData) return;

 const gift = JSON.parse(giftData);
 gift.activated = true;
 localStorage.setItem('luna_welcome_gift', JSON.stringify(gift));

 console.log('Regalo benvenuto attivato!');
 applyPersonalizedBlur();

 alert('Regalo attivato! Hai 3 mesi di accesso completo al tuo tema natale. Rinnova gratis acquistando consulenze per 50+ euro nel corso dei 3 mesi.');
}

function goHome() {
 showPage("home");
}

function requireAuthOrModal() {
 const user = getCurrentUser();
 if (user) {
 const profile = getCurrentProfile();
 const page = document.getElementById('page-personalized');
 if (!page || page.innerHTML.trim() === '') {
 renderPersonalizedPage(profile, user, cachedNatalChart);
 }
 showPage("personalized");
 } else {
 openAuthModal();
 setTimeout(() => {
 switchAuthTab('register');
 const loginForm = $("loginForm");
 const regForm = $("registerForm");
 if (loginForm) loginForm.classList.add("hidden");
 if (regForm) regForm.classList.remove("hidden");
 const title = $("authModalTitle");
 if (title) title.textContent = "Registrati";
 }, 50);
 }
}

// ===== CONSULTO / VOCE =====
function handleConsultRequest(category) {
 const user = getCurrentUser();
 if (!user) {
 openAuthModal();
 setTimeout(() => {
 switchAuthTab('register');
 const loginForm = $("loginForm");
 const regForm = $("registerForm");
 if (loginForm) loginForm.classList.add("hidden");
 if (regForm) regForm.classList.remove("hidden");
 const title = $("authModalTitle");
 if (title) title.textContent = "Registrati";
 }, 50);
 return;
 }

 const status = getSubscriptionStatus();
 const giftStatus = getWelcomeGiftStatus();
 const hasConsult = hasActiveConsultPackage();

 const hasAccess = status.active || (giftStatus.active && giftStatus.activated) || hasConsult;

 if (hasAccess) {
 startVoiceSession(category);
 } else {
 state.consultCategory = category;
 openConsultModal(category);
 }
}

function openConsultModal(category) {
 const modal = document.getElementById("consultModal");
 if (!modal) return;

 const catLabel = {
 amore: 'Amore', lavoro: 'Lavoro', carriera: 'Carriera',
 denaro: 'Denaro', salute: 'Salute', famiglia: 'Famiglia',
 amici: 'Amici', viaggi: 'Viaggi', partner: 'Partner', generale: 'Generale'
 }[category] || 'Generale';

 modal.innerHTML = '<div class="modal-content" style="max-width:420px;">' +
 '<div class="modal-header" style="border-bottom:1px solid var(--border); padding:1.25rem; display:flex; justify-content:space-between; align-items:center;">' +
 '<h3 style="margin:0; font-size:1.125rem; color:var(--gold);">✨ Consulenza con Luna</h3>' +
 '<button class="close-btn" onclick="window.app.closeConsultModal()" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:var(--text-dim);">×</button>' +
 '</div>' +
 '<div style="padding:1.5rem; text-align:center;">' +
 '<div style="font-size:3rem; margin-bottom:1rem;">🌙</div>' +
 '<h4 style="margin:0 0 0.75rem 0; color:var(--text);">Parla con le tue stelle</h4>' +
 '<p style="color:var(--text-dim); font-size:0.875rem; line-height:1.6; margin-bottom:1.5rem;">' +
 'Una consulenza astrologica vocale personalizzata di 18 minuti con Luna.<br>' +
 'Basata sul tuo tema natale reale e i transiti attuali.' +
 '</p>' +
 '<div style="background:var(--bg-elevated); border-radius:0.75rem; padding:1rem; margin-bottom:1.5rem; text-align:left;">' +
 '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">' +
 '<span style="color:var(--text-dim); font-size:0.875rem;">Pacchetto consulenza</span>' +
 '<span style="color:var(--gold); font-weight:700; font-size:1.125rem;">45 euro</span>' +
 '</div>' +
 '<div style="font-size:0.75rem; color:var(--text-dim);">' +
 '• Sessione vocale 18 minuti<br>' +
 '• Interpretazione basata su tema natale<br>' +
 '• Categoria: ' + catLabel +
 '</div>' +
 '</div>' +
 '<button class="btn-gold" onclick="window.app.startStripeCheckout(&#39;consult&#39;)" style="width:100%; padding:0.875rem; margin-bottom:0.75rem;">' +
 '💳 Acquista ora 45 euro' +
 '</button>' +
 '<button class="btn-secondary" onclick="window.app.closeConsultModal()" style="width:100%; padding:0.75rem; background:transparent; border:1px solid var(--border); color:var(--text-dim);">' +
 'Annulla' +
 '</button>' +
 '</div>' +
 '</div>';

 modal.classList.add("active");
 document.body.style.overflow = "hidden";
}

function closeConsultModal() {
 const modal = document.getElementById("consultModal");
 if (modal) {
 modal.classList.remove("active");
 document.body.style.overflow = "";
 }
}

// ===== SPAZIO VOCE =====
async function startVoiceSession(category) {
 const user = getCurrentUser();
 if (!user) {
 openAuthModal();
 setTimeout(() => {
 switchAuthTab('register');
 const loginForm = $("loginForm");
 const regForm = $("registerForm");
 if (loginForm) loginForm.classList.add("hidden");
 if (regForm) regForm.classList.remove("hidden");
 const title = $("authModalTitle");
 if (title) title.textContent = "Registrati";
 }, 50);
 return;
 }

 state.voiceCategory = category;
 showPage("voice");

 const started = await startRealVoiceSession(category);
 if (!started) {
 const statusEl = document.getElementById('voiceStatus');
 if (statusEl) {
 statusEl.textContent = 'Errore caricamento voce';
 statusEl.style.color = '#ef4444';
 }
 }
}

function goBackFromVoice() {
 endRealVoiceSession();
 showPage(state.lastPage || "home");
}

function toggleVoiceListening() {
 console.log('toggleVoiceListening — gestito da ElevenLabs widget');
}

function openAuthModal() {
 const modal = $("authModal");
 if (modal) {
 modal.classList.add("active");
 document.body.style.overflow = "hidden";
 }
}

function closeAuthModal() {
 const modal = $("authModal");
 if (modal) {
 modal.classList.remove("active");
 }
 document.body.style.overflow = "";
 hideAlerts();
}

function switchAuthTab(tab) {
 const loginTab = $("tab-login");
 const regTab = $("tab-register");
 const loginForm = $("loginForm");
 const regForm = $("registerForm");

 if (loginTab) loginTab.classList.toggle("active", tab === "login");
 if (regTab) regTab.classList.toggle("active", tab === "register");
 if (loginForm) loginForm.classList.toggle("hidden", tab !== "login");
 if (regForm) regForm.classList.toggle("hidden", tab !== "register");

 const title = $("authModalTitle");
 if (title) title.textContent = tab === "login" ? "Accedi" : "Registrati";

 hideAlerts();
}

function handleShowHoroscopePage(signName) {
 renderHoroscopePage(signName);
 showPage("horoscope");
}

function showPaymentsPage() {
 const page = document.getElementById('page-payments');
 if (!page || page.innerHTML.trim() === '') {
 renderPaymentsPage();
 }
 showPage("payments");
}

function toggleLang() {
 const dropdown = $("langDropdown");
 if (dropdown) dropdown.classList.toggle("open");
}

function setLang(lang) {
 const flags = { it: "🇮🇹", en: "🇬🇧", fr: "🇫🇷", de: "🇩🇪", es: "🇪🇸" };
 const flagEl = $("currentFlag");
 if (flagEl) flagEl.textContent = flags[lang] || "🇮🇹";

 document.querySelectorAll(".lang-option").forEach(o => {
 o.classList.toggle("active", o.dataset.lang === lang);
 });

 const dropdown = $("langDropdown");
 if (dropdown) dropdown.classList.remove("open");
}

document.addEventListener("click", (e) => {
 if (!e.target.closest(".lang-dropdown")) {
 const dropdown = $("langDropdown");
 if (dropdown) dropdown.classList.remove("open");
 }
});

// ===== LOGOUT =====
async function handleLogoutClick() {
 console.log('Logout richiesto...');

 try {
 endRealVoiceSession();
 await handleLogout();

 cachedNatalChart = null;
 isLoadingChart = false;
 state.currentPage = "home";
 state.lastPage = "home";

 const personalized = document.getElementById('page-personalized');
 if (personalized) personalized.innerHTML = '';

 const payments = document.getElementById('page-payments');
 if (payments) payments.innerHTML = '';

 renderHomePage();
 showPage("home");

 console.log('Logout completato con successo');
 } catch (err) {
 console.error('Errore durante logout:', err);
 }
}

// ===== WINDOW.APP =====
window.app = {
 showPage: showPage,
 goHome: goHome,
 requireAuthOrModal: requireAuthOrModal,
 openAuthModal: openAuthModal,
 closeAuthModal: closeAuthModal,
 switchAuthTab: switchAuthTab,
 handleRegister: handleRegister,
 handleLogin: handleLogin,
 handleLogout: handleLogoutClick,
 showHoroscopePage: handleShowHoroscopePage,
 switchHoroTab: switchHoroTab,
 openProfileEdit: openProfileEdit,
 showCompat: showCompat,
 openCompatModal: openCompatModal,
 closeCompatModal: closeCompatModal,
 handleCompatSubmit: handleCompatSubmit,
 toggleAccordion: toggleAccordion,
 showPaymentsPage: showPaymentsPage,
 toggleLang: toggleLang,
 setLang: setLang,
 switchPersonalHoroTab: function(tab) {
 const tabs = ["day", "week", "month", "year"];
 tabs.forEach(t => {
 const tabBtn = document.getElementById("ph-tab-" + t);
 const textEl = document.getElementById("ph-text-" + t);
 if (tabBtn) tabBtn.classList.toggle("active", t === tab);
 if (textEl) textEl.classList.toggle("hidden", t !== tab);
 });
 },
 handleConsultRequest: handleConsultRequest,
 openConsultModal: openConsultModal,
 closeConsultModal: closeConsultModal,
 startVoiceSession: startVoiceSession,
 endVoiceSession: function() {
 endRealVoiceSession();
 showPage(state.lastPage || "home");
 },
 goBackFromVoice: goBackFromVoice,
 toggleVoiceListening: toggleVoiceListening,
 startVoiceRecording: function() {
 alert('Registrazione avanzata in preparazione. Usa il microfono del browser per parlare con Luna.');
 },
 activateWelcomeGift: activateWelcomeGift,
 getWelcomeGiftStatus: getWelcomeGiftStatus,
 startStripeCheckout: startStripeCheckout,
 getCurrentProfile: getCurrentProfile,
 getCurrentUser: getCurrentUser,
 loadNatalChart: loadNatalChart,
 geocodeProfileIfNeeded: geocodeProfileIfNeeded,
 openLunaFromCompat: function(category) {
 window.app.closeCompatModal();
 window.app.handleConsultRequest(category);
 },
 resetCompatForm: function() {
 var form = document.getElementById("compatForm");
 if (form) form.reset();
 var resultDiv = document.getElementById("compatResult");
 if (resultDiv) {
 resultDiv.style.display = "none";
 resultDiv.innerHTML = "";
 }
 },
 _resetState: function() {
 cachedNatalChart = null;
 isLoadingChart = false;
 state.currentPage = "home";
 state.lastPage = "home";
 const page = document.getElementById('page-personalized');
 if (page) page.innerHTML = '';
 const payPage = document.getElementById('page-payments');
 if (payPage) payPage.innerHTML = '';
 console.log('Stato app resettato');
 }
};
