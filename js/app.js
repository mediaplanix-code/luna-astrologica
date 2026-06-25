// ============================================================
// APP.JS v13.2 — Overlay regalo, benvenuto, categorie sogni/affinita
// ============================================================

import { loadNatalChart, updateNatalChartUI } from './natal.js';
import { CONFIG } from './config.js';
import { $, hideAlerts } from './utils.js';
import {
 renderHeader, renderNav, renderHomePage, renderHoroscopePage,
 renderAuthModal, renderCompatModal,
 renderPersonalizedPage, renderVoicePage, showPage as uiShowPage,
 showServiceChoice, closeServiceChoice, getServiceChoiceCategory
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
 activateWelcomeGift,
 shouldShowWelcomeGift
} from './payments.js';
import {
 startVoiceSession as startRealVoiceSession,
 endSession as endRealVoiceSession,
 getStatus as getVoiceSessionStatus
} from './voice.js';

let state = {
 currentPage: "home",
 lastPage: "home",
 voiceCategory: null
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
 alert("✅ Pagamento completato con successo!");
 window.history.replaceState({}, document.title, window.location.pathname);
 } else if (paymentStatus === "cancel") {
 alert("❌ Pagamento annullato.");
 window.history.replaceState({}, document.title, window.location.pathname);
 }

 await initAuth(onAuthStateChange);

 let user = getCurrentUser();
 let profile = getCurrentProfile();

 let attempts = 0;
 while (user && !profile && attempts < 5) {
 console.log(`⏳ Profilo latente, tentativo ${attempts + 1}/5...`);
 await new Promise(r => setTimeout(r, 400));
 await loadUserData();
 user = getCurrentUser();
 profile = getCurrentProfile();
 attempts++;
 }

 if (user && profile?.id) {
 if (!cachedNatalChart) cachedNatalChart = loadNatalChartFromStorage();

 const page = document.getElementById('page-personalized');
 if (!page || page.innerHTML.trim() === '') {
 renderPersonalizedPage(profile, user, cachedNatalChart);
 console.log('🎨 DOM personalized costruito');
 } else if (cachedNatalChart) {
 updateNatalChartUI(cachedNatalChart);
 console.log('🎨 DOM personalized aggiornato da cache');
 }

 const creditsValue = getCredits() || profile?.credits || 0;
 console.log('💰 Crediti inizializzati:', creditsValue);

 updateUI({
 isLoggedIn: true,
 user: user,
 profile: profile,
 credits: creditsValue
 });

 showPage("personalized");
 setTimeout(() => ensureGeocodingAndChart(profile), 600);
 console.log("🌙 Sessione attiva — personalized caricata");
 } else {
 updateUI({ isLoggedIn: false, user: null, profile: null, credits: 0 });
 showPage("home");
 console.log("🌙 Nessuna sessione — home caricata");
 }
});

// ===== AUTH STATE =====
function onAuthStateChange(authState) {
 updateUI(authState);
 updatePaymentsUI();

 if (authState.isLoggedIn && authState.profile?.id && state.currentPage !== 'personalized') {
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
 console.log('⏳ Calcolo tema già in corso, skip');
 return;
 }
 if (!profile) {
 console.warn('❌ ensureGeocodingAndChart: profilo non fornito');
 return;
 }

 isLoadingChart = true;
 try {
 if (!profile.birth_latitude && profile.birth_city && profile.birth_country) {
 console.log('🌍 Geocoding necessario per:', profile.birth_city);
 const geoOk = await geocodeProfileIfNeeded();
 if (!geoOk) {
 console.warn('❌ Geocoding fallito');
 return;
 }
 console.log('✅ Geocoding completato');
 profile = getCurrentProfile() || profile;
 }

 console.log('🔮 Avvio calcolo tema natale...');
 const chart = await loadNatalChart();
 if (chart) {
 cachedNatalChart = chart;
 saveNatalChartToStorage(chart);
 console.log('✅ Tema natale calcolato e salvato');
 } else {
 console.warn('❌ Tema natale non calcolato');
 }

 console.log('🌙 Avvio caricamento transiti...');
 await loadTransits();
 } catch (err) {
 console.error('❌ Errore ensureGeocodingAndChart:', err);
 } finally {
 isLoadingChart = false;
 }
}

// ===== UI =====
function updateUI(authState) {
 const isLoggedIn = authState?.isLoggedIn || false;
 const profile = authState?.profile || null;
 const user = authState?.user || null;

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
 console.log('🎨 Dati natal ridisegnati su personalized');
 } else if (profile) {
 console.log('⏳ Dati natal mancanti, avvio caricamento...');
 setTimeout(() => ensureGeocodingAndChart(profile), 100);
 }
 applyPersonalizedBlur();
 }

 if (pageId === "payments") {
 renderPaymentsPage();
 updatePaymentsUI();
 }
}

// ===== OFFUSCAMENTO PAGINA PERSONALIZZATA — CON MESSAGGIO REGALO =====
function applyPersonalizedBlur() {
 if (!CONFIG.FEATURES.BLUR_UNSUBSCRIBED) return;

 const status = getSubscriptionStatus();
 const isSubscribed = status.active;

 const blurSelectors = [
 '#acc-wheel',
 '#acc-planets',
 '#acc-houses',
 '#acc-aspects',
 '#acc-transits'
 ];

 blurSelectors.forEach(selector => {
 const el = document.querySelector(selector);
 if (!el) return;

 if (!isSubscribed) {
 el.classList.add('blur-section');
 el.style.filter = 'blur(8px)';
 el.style.userSelect = 'none';
 el.style.position = 'relative';
 // Rimosso pointerEvents:none e opacity:0.4 — bloccano l'overlay

 let overlay = el.querySelector('.blur-overlay');
 if (!overlay) {
 overlay = document.createElement('div');
 overlay.className = 'blur-overlay';
 overlay.style.cssText = 'position:absolute;inset:0;z-index:100;pointer-events:auto;border-radius:0.75rem;overflow:hidden;';
 overlay.innerHTML = `
 <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:0.5rem;background:rgba(26,11,46,0.92);backdrop-filter:blur(4px);padding:1rem;text-align:center;cursor:pointer;">
 <span style="font-size:2rem;">🎁</span>
 <span style="color:var(--gold);font-weight:600;font-size:1.1rem;">Regalo per te!</span>
 <span style="color:var(--text-dim);font-size:0.875rem;max-width:260px;">
 Sblocca il tuo tema natale completo — <strong style="color:var(--gold)">3 mesi gratis</strong> (valore €15)
 </span>
 <button class="btn-gold" style="margin-top:0.5rem;padding:0.6rem 1.5rem;font-size:0.875rem;pointer-events:auto;" onclick="event.stopPropagation(); window.app.activateWelcomeGift(); window.app.showPage('personalized');">
 🎁 Attiva ora il regalo
 </button>
 </div>
 `;
 el.appendChild(overlay);
 }
 overlay.style.display = 'block';
 } else {
 el.classList.remove('blur-section');
 el.style.filter = '';
 el.style.userSelect = '';
 el.style.pointerEvents = '';
 el.style.opacity = '';
 el.style.position = '';
 const overlay = el.querySelector('.blur-overlay');
 if (overlay) overlay.style.display = 'none';
 }
 });
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

// ===== SPAZIO VOCE DEDICATO =====
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
 statusEl.textContent = '⚠️ Errore caricamento voce';
 statusEl.style.color = '#ef4444';
 }
 }
}

function goBackFromVoice() {
 endRealVoiceSession();
 showPage(state.lastPage || "home");
}

function toggleVoiceListening() {
 console.log('🎤 toggleVoiceListening — gestito da ElevenLabs widget');
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
 document.body.style.overflow = "";
 }
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

function handleShowServiceChoice(category) {
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
 startVoiceSession(category);
}

function handleChooseService(mode) {
 const category = getServiceChoiceCategory();
 closeServiceChoice();
 if (!category) return;

 if (mode === 'voice') {
 startVoiceSession(category);
 }
}

// ===== PAGINA PAGAMENTI =====
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

// ===== LOGOUT CORRETTO =====
async function handleLogoutClick() {
 console.log('🚪 Logout richiesto...');

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

 console.log('✅ Logout completato con successo');
 } catch (err) {
 console.error('❌ Errore durante logout:', err);
 }
}

window.app = {
 showPage,
 goHome,
 requireAuthOrModal,
 openAuthModal,
 closeAuthModal,
 switchAuthTab,
 handleRegister,
 handleLogin,
 handleLogout: handleLogoutClick,
 showHoroscopePage: handleShowHoroscopePage,
 switchHoroTab,
 openProfileEdit,
 showCompat,
 openCompatModal,
 closeCompatModal,
 handleCompatSubmit,
 toggleAccordion,
 showPaymentsPage,
 toggleLang,
 setLang,
 switchPersonalHoroTab: (tab) => {
 const tabs = ["day", "week", "month", "year"];
 tabs.forEach(t => {
 const tabBtn = document.getElementById("ph-tab-" + t);
 const textEl = document.getElementById("ph-text-" + t);
 if (tabBtn) tabBtn.classList.toggle("active", t === tab);
 if (textEl) textEl.classList.toggle("hidden", t !== tab);
 });
 },
 showServiceChoice: handleShowServiceChoice,
 closeServiceChoice,
 chooseService: handleChooseService,
 getCurrentProfile,
 getCurrentUser,
 loadNatalChart,
 geocodeProfileIfNeeded,
 startStripeCheckout,
 activateWelcomeGift,
 // Voce reale
 startVoiceSession,
 endVoiceSession: () => {
 endRealVoiceSession();
 showPage(state.lastPage || "home");
 },
 goBackFromVoice,
 toggleVoiceListening,
 startVoiceRecording: () => {
 alert('🎙️ Registrazione avanzata in preparazione. Usa il microfono del browser per parlare con Luna.');
 },
 openLunaFromCompat: function(category) {
 window.app.closeCompatModal();
 window.app.startVoiceSession(category);
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
 console.log('🔁 Stato app resettato');
 }
};
