// ============================================================
// APP.JS — Orchestratore principale
// FIX v8: logout senza reload, renderHeader robusto,
//         crediti triple fallback, profilo passato esplicitamente
// FIX v9: Pagina Crediti/Abbonamento integrata
// ============================================================

import { loadNatalChart, updateNatalChartUI } from './natal.js';
import { CONFIG } from './config.js';
import { $, hideAlerts } from './utils.js';
import {
 renderHeader, renderNav, renderHomePage, renderHoroscopePage,
 renderChatPage, renderAuthModal, renderCompatModal,
 renderPersonalizedPage, showPage as uiShowPage,
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
import {
 setChatMode, startCategoryChat, startChatAbout, startVoiceAbout,
 sendMessage, goBackFromChat
} from './chat.js';
import { loadTransits } from './transits.js';
import {
 renderPaymentsPage,
 startStripeCheckout,
 getSubscriptionStatus,
 hasFullAccess,
 updatePaymentsUI,
 shouldBlurPersonalized
} from './payments.js';

let state = {
 currentPage: "home",
 lastPage: "home",
 chatMode: "chat",
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
 renderChatPage();

 const urlParams = new URLSearchParams(window.location.search);
 const isVerified = urlParams.get("verified");
 if (isVerified === "true") {
 window.history.replaceState({}, document.title, window.location.pathname);
 }

 // Gestione redirect da pagamento Stripe
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

 // Retry esplicito se abbiamo user ma profilo latente
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
 // FIX v8: assicurati che l'header sia pulito per utente non loggato
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
 const credits = authState?.credits || profile?.credits || 0;

 // FIX v8: renderHeader con userData corretto (profile o user o null)
 renderHeader(isLoggedIn, profile || user || null);
 renderNav(state.currentPage);

 const creditsVal = $("creditsVal");
 if (creditsVal) creditsVal.textContent = credits;

 const creditsDot = $("creditsDot");
 if (creditsDot) {
 creditsDot.className = "credits-dot";
 if (credits <= 0) creditsDot.classList.add("danger");
 else if (credits <= 3) creditsDot.classList.add("warning");
 }

 // Aggiorna indicatore abbonamento
 updatePaymentsUI();
}

function showPage(pageId) {
 if (pageId !== "chat") state.lastPage = pageId;
 state.currentPage = pageId;
 uiShowPage(pageId, state.lastPage);
 renderNav(pageId);

 const user = getCurrentUser();
 const profile = getCurrentProfile();
 const creditsValue = getCredits() || profile?.credits || 0;

 updateUI({
 isLoggedIn: !!user,
 user: user,
 profile: profile,
 credits: creditsValue
 });

 if (pageId === "personalized") {
 if (cachedNatalChart) {
 updateNatalChartUI(cachedNatalChart);
 console.log('🎨 Dati natal ridisegnati su personalized');
 } else if (profile) {
 console.log('⏳ Dati natal mancanti, avvio caricamento...');
 setTimeout(() => ensureGeocodingAndChart(profile), 100);
 }
 // Applica offuscamento se necessario
 applyPersonalizedBlur();
 }

 if (pageId === "payments") {
 renderPaymentsPage();
 updatePaymentsUI();
 }
}

// ===== OFFUSCAMENTO PAGINA PERSONALIZZATA =====
function applyPersonalizedBlur() {
 if (!CONFIG.FEATURES.BLUR_UNSUBSCRIBED) return;

 const status = getSubscriptionStatus();
 const isSubscribed = status.active;

 // Selettori delle sezioni da offuscare
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
 el.style.pointerEvents = 'none';
 el.style.opacity = '0.4';
 el.style.position = 'relative';

 // Aggiungi overlay se non esiste
 let overlay = el.querySelector('.blur-overlay');
 if (!overlay) {
 overlay = document.createElement('div');
 overlay.className = 'blur-overlay';
 overlay.innerHTML = `
 <div style="
   position: absolute;
   top: 50%; left: 50%;
   transform: translate(-50%, -50%);
   background: rgba(26, 11, 46, 0.95);
   border: 1.5px solid var(--gold);
   border-radius: 0.75rem;
   padding: 0.875rem 1.5rem;
   font-size: 0.875rem;
   font-weight: 600;
   color: var(--gold);
   white-space: nowrap;
   z-index: 10;
   cursor: pointer;
   text-align: center;
   box-shadow: 0 4px 20px rgba(0,0,0,0.4);
 " onclick="window.app.showPaymentsPage()">
   🔒 Abbonamento richiesto<br>
   <span style="font-size:0.75rem;font-weight:400;color:var(--text-dim);">Sblocca per €15/trimestre</span>
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
 }
}

function requireAuthOrModalForChat(mode) {
 state.chatMode = mode;
 setChatMode(mode);
 const user = getCurrentUser();
 if (user) {
 showPage("chat");
 } else {
 openAuthModal();
 }
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
 const regForm = $("regForm");

 if (loginTab) loginTab.classList.toggle("active", tab === "login");
 if (regTab) regTab.classList.toggle("active", tab === "register");
 if (loginForm) loginForm.classList.toggle("hidden", tab !== "login");
 if (regForm) regForm.classList.toggle("hidden", tab !== "register");

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
 return;
 }
 showServiceChoice(category);
}

function handleChooseService(mode) {
 const category = getServiceChoiceCategory();
 closeServiceChoice();
 if (!category) return;

 if (mode === 'chat') {
 setChatMode("chat");
 startCategoryChat(category);
 } else {
 setChatMode("voice");
 startCategoryChat(category);
 }
}

function handleSendMessage() {
 sendMessage(
 getCurrentUser(),
 getCurrentProfile(),
 getCredits(),
 async () => {
 await updateCredits(-CONFIG.CREDITS_PER_MESSAGE);
 }
 );
}

function handleStartCategoryChat(topic) {
 startCategoryChat(topic);
}

function handleStartChatAbout(topic) {
 startChatAbout(topic);
}

function handleStartVoiceAbout(topic) {
 startVoiceAbout(topic);
}

function handleGoBackFromChat() {
 goBackFromChat(state.lastPage);
}

// ===== PAGINA CREDITI / ABBONAMENTO =====
function showPaymentsPage() {
 const page = document.getElementById('page-payments');
 if (!page || page.innerHTML.trim() === '') {
 renderPaymentsPage();
 }
 showPage("payments");
 updatePaymentsUI();
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

window.app = {
 showPage,
 goHome,
 requireAuthOrModal,
 requireAuthOrModalForChat,
 openAuthModal,
 closeAuthModal,
 switchAuthTab,
 handleRegister,
 handleLogin,
 handleLogout,
 showHoroscopePage: handleShowHoroscopePage,
 switchHoroTab,
 openProfileEdit,
 showCompat,
 openCompatModal,
 closeCompatModal,
 handleCompatSubmit,
 toggleAccordion,
 sendMessage: handleSendMessage,
 startCategoryChat: handleStartCategoryChat,
 startChatAbout: handleStartChatAbout,
 startVoiceAbout: handleStartVoiceAbout,
 goBackFromChat: handleGoBackFromChat,
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
 openLunaFromCompat: function(category) {
 window.app.closeCompatModal();
 window.app.showServiceChoice(category);
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
 // Reset completo stato + DOM (senza reload)
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
