// ============================================================
// APP.JS v14.0 — A prova di errore. Logout robusto. No crash.
// ============================================================

import { loadNatalChart, updateNatalChartUI } from './natal.js';
import { CONFIG } from './config.js';
import { $, hideAlerts } from './utils.js';
import {
  renderHeader, renderNav, renderHomePage, renderHoroscopePage,
  renderAuthModal, renderPersonalizedPage, renderVoicePage,
  showPage as uiShowPage, showServiceChoice, closeServiceChoice,
  getServiceChoiceCategory
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
  renderPaymentsPage, startStripeCheckout, getSubscriptionStatus,
  hasFullAccess, hasCalculationsAccess, hasVoiceAccess,
  updatePaymentsUI, shouldBlurPersonalized, activateWelcomeGift,
  shouldShowWelcomeGift, simulatePayment
} from './payments.js';

// Voice module — import sicuro con fallback
let voiceModule = {};
try {
  voiceModule = await import('./voice.js');
} catch (e) {
  console.warn('Voice module non disponibile:', e);
}

const startRealVoiceSession = voiceModule.startVoiceSession || (() => false);
const endRealVoiceSession = voiceModule.endVoiceSession || voiceModule.endSession || (() => {});
const getVoiceStatus = voiceModule.getVoiceSessionStatus || voiceModule.getStatus || (() => ({}));

let state = {
  currentPage: "home",
  lastPage: "home",
  voiceCategory: null
};

let cachedNatalChart = null;
let isLoadingChart = false;

const NATAL_CHART_KEY = 'luna_natal_chart';
const NATAL_CHART_TS_KEY = 'luna_natal_chart_ts';
const CACHE_MS = 24 * 60 * 60 * 1000;

function saveChart(chart) {
  if (!chart) return;
  try {
    localStorage.setItem(NATAL_CHART_KEY, JSON.stringify(chart));
    localStorage.setItem(NATAL_CHART_TS_KEY, Date.now().toString());
  } catch (e) {}
}

function loadChart() {
  try {
    const saved = localStorage.getItem(NATAL_CHART_KEY);
    const ts = localStorage.getItem(NATAL_CHART_TS_KEY);
    if (!saved || !ts) return null;
    if (Date.now() - parseInt(ts) > CACHE_MS) {
      localStorage.removeItem(NATAL_CHART_KEY);
      localStorage.removeItem(NATAL_CHART_TS_KEY);
      return null;
    }
    return JSON.parse(saved);
  } catch (e) {
    return null;
  }
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", async () => {
  renderAuthModal();
  renderHomePage();
  renderVoicePage();

  const url = new URLSearchParams(window.location.search);
  if (url.get("verified") === "true") {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  if (url.get("payment") === "success") {
    alert("Pagamento completato!");
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (url.get("payment") === "cancel") {
    alert("Pagamento annullato.");
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  await initAuth(onAuthStateChange);

  let user = getCurrentUser();
  let profile = getCurrentProfile();

  let attempts = 0;
  while (user && !profile && attempts < 5) {
    await new Promise(r => setTimeout(r, 400));
    await loadUserData();
    user = getCurrentUser();
    profile = getCurrentProfile();
    attempts++;
  }

  if (user && profile?.id) {
    if (!cachedNatalChart) cachedNatalChart = loadChart();
    const page = document.getElementById('page-personalized');
    if (!page || page.innerHTML.trim() === '') {
      renderPersonalizedPage(profile, user, cachedNatalChart);
    } else if (cachedNatalChart) {
      updateNatalChartUI(cachedNatalChart);
    }
    updateUI({ isLoggedIn: true, user, profile, credits: getCredits() || profile?.credits || 0 });
    showPage("personalized");
    setTimeout(() => ensureGeocodingAndChart(profile), 600);
  } else {
    updateUI({ isLoggedIn: false, user: null, profile: null, credits: 0 });
    showPage("home");
  }
});

// ===== AUTH STATE =====
function onAuthStateChange(authState) {
  updateUI(authState);
  try { updatePaymentsUI(); } catch (e) {}

  if (authState.isLoggedIn && authState.profile?.id && state.currentPage !== 'personalized') {
    if (!cachedNatalChart) cachedNatalChart = loadChart();
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
  if (isLoadingChart || !profile) return;
  isLoadingChart = true;
  try {
    if (!profile.birth_latitude && profile.birth_city && profile.birth_country) {
      await geocodeProfileIfNeeded();
      profile = getCurrentProfile() || profile;
    }
    const chart = await loadNatalChart();
    if (chart) {
      cachedNatalChart = chart;
      saveChart(chart);
    }
    await loadTransits();
  } catch (err) {
    console.error('Errore geo/chart:', err);
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
  updateUI({ isLoggedIn: !!user, user, profile, credits: getCredits() });

  if (pageId === "personalized") {
    if (cachedNatalChart) {
      try { updateNatalChartUI(cachedNatalChart); } catch (e) {}
    } else if (profile) {
      setTimeout(() => ensureGeocodingAndChart(profile), 100);
    }
    try { applyPersonalizedBlur(); } catch (e) {}
  }

  if (pageId === "payments") {
    try {
      renderPaymentsPage();
      updatePaymentsUI();
    } catch (e) {}
  }
}

// ===== OFFUSCAMENTO =====
async function applyPersonalizedBlur() {
  let hasAccess = false;
  let showGift = false;
  try {
    hasAccess = await hasCalculationsAccess();
    showGift = await shouldShowWelcomeGift();
  } catch (e) { return; }

  const zoneA = document.getElementById('zoneAContainer');
  if (!zoneA) return;

  const old = zoneA.querySelector('.zone-a-overlay');
  if (old) old.remove();

  if (!hasAccess) {
    const overlay = document.createElement('div');
    overlay.className = 'zone-a-overlay';
    if (showGift) {
      overlay.innerHTML = `
        <div class="zone-a-blur-bg"></div>
        <div class="zone-a-gift-box">
          <div class="zone-a-gift-icon">🎁</div>
          <div class="zone-a-gift-title">Regalo di benvenuto</div>
          <div class="zone-a-gift-sub">3 mesi di accesso completo gratuito</div>
          <button class="zone-a-gift-btn" onclick="window.app.activateWelcomeGift()">🎁 Attiva</button>
        </div>
      `;
    } else {
      overlay.innerHTML = `
        <div class="zone-a-blur-bg"></div>
        <div class="zone-a-gift-box">
          <div class="zone-a-gift-icon">🔒</div>
          <div class="zone-a-gift-title">Accesso scaduto</div>
          <div class="zone-a-gift-sub">Rinnova l'accesso per 15/trimestre</div>
          <button class="zone-a-gift-btn" onclick="window.app.showPaymentsPage()">💳 Vai ai servizi</button>
        </div>
      `;
    }
    zoneA.appendChild(overlay);
    zoneA.classList.add('zone-a-locked');
  } else {
    zoneA.classList.remove('zone-a-locked');
  }

  try {
    const voiceBtn = document.querySelector('#page-personalized .banner-cta .btn-gold');
    if (voiceBtn && voiceBtn.textContent.includes('PARLA')) {
      const hasVoice = await hasVoiceAccess();
      if (!hasVoice) {
        voiceBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); window.app.showPaymentsPage(); };
      }
    }
    const cards = document.querySelectorAll('#page-personalized .grid .card');
    for (const card of cards) {
      const hasVoice = await hasVoiceAccess();
      if (!hasVoice) {
        card.classList.add('voice-blocked');
        card.onclick = (e) => { e.preventDefault(); e.stopPropagation(); window.app.showPaymentsPage(); };
      }
    }
  } catch (e) {}
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
      const lf = $("loginForm"), rf = $("registerForm");
      if (lf) lf.classList.add("hidden");
      if (rf) rf.classList.remove("hidden");
      const t = $("authModalTitle");
      if (t) t.textContent = "Registrati";
    }, 50);
  }
}

// ===== VOCE =====
async function startVoiceSession(category) {
  const user = getCurrentUser();
  if (!user) {
    openAuthModal();
    setTimeout(() => {
      switchAuthTab('register');
      const lf = $("loginForm"), rf = $("registerForm");
      if (lf) lf.classList.add("hidden");
      if (rf) rf.classList.remove("hidden");
      const t = $("authModalTitle");
      if (t) t.textContent = "Registrati";
    }, 50);
    return;
  }

  const hasVoice = await hasVoiceAccess();
  if (!hasVoice) {
    showPaymentsPage();
    return;
  }

  state.voiceCategory = category;
  showPage("voice");

  try {
    const started = await startRealVoiceSession(category);
    if (!started) {
      const el = document.getElementById('voiceStatus');
      if (el) { el.textContent = 'Errore caricamento voce'; el.style.color = '#ef4444'; }
    }
  } catch (e) {
    const el = document.getElementById('voiceStatus');
    if (el) { el.textContent = 'Errore caricamento voce'; el.style.color = '#ef4444'; }
  }
}

function goBackFromVoice() {
  try { endRealVoiceSession(); } catch (e) {}
  showPage(state.lastPage || "home");
}

function toggleVoiceListening() {
  console.log('toggleVoiceListening');
}

function openAuthModal() {
  const m = $("authModal");
  if (m) { m.classList.add("active"); document.body.style.overflow = "hidden"; }
}

function closeAuthModal() {
  const m = $("authModal");
  if (m) { m.classList.remove("active"); document.body.style.overflow = ""; }
  hideAlerts();
}

function switchAuthTab(tab) {
  const lt = $("tab-login"), rt = $("tab-register");
  const lf = $("loginForm"), rf = $("registerForm");
  if (lt) lt.classList.toggle("active", tab === "login");
  if (rt) rt.classList.toggle("active", tab === "register");
  if (lf) lf.classList.toggle("hidden", tab !== "login");
  if (rf) rf.classList.toggle("hidden", tab !== "register");
  const t = $("authModalTitle");
  if (t) t.textContent = tab === "login" ? "Accedi" : "Registrati";
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
      const lf = $("loginForm"), rf = $("registerForm");
      if (lf) lf.classList.add("hidden");
      if (rf) rf.classList.remove("hidden");
      const t = $("authModalTitle");
      if (t) t.textContent = "Registrati";
    }, 50);
    return;
  }
  startVoiceSession(category);
}

function handleChooseService(mode) {
  const category = getServiceChoiceCategory();
  closeServiceChoice();
  if (!category) return;
  if (mode === 'voice') startVoiceSession(category);
}

function showPaymentsPage() {
  const page = document.getElementById('page-payments');
  if (!page || page.innerHTML.trim() === '') {
    try { renderPaymentsPage(); } catch (e) {}
  }
  showPage("payments");
}

function toggleLang() {
  const d = $("langDropdown");
  if (d) d.classList.toggle("open");
}

function setLang(lang) {
  const flags = { it: "🇮🇹", en: "🇬🇧", fr: "🇫🇷", de: "🇩🇪", es: "🇪🇸" };
  const f = $("currentFlag");
  if (f) f.textContent = flags[lang] || "🇮🇹";
  document.querySelectorAll(".lang-option").forEach(o => {
    o.classList.toggle("active", o.dataset.lang === lang);
  });
  const d = $("langDropdown");
  if (d) d.classList.remove("open");
}

document.addEventListener("click", (e) => {
  if (!e.target.closest(".lang-dropdown")) {
    const d = $("langDropdown");
    if (d) d.classList.remove("open");
  }
});

// ===== LOGOUT — INTERRUTTORE SEMPLICE =====
async function handleLogoutClick() {
  console.log('Logout...');

  // 1. Ferma voce
  try { endRealVoiceSession(); } catch (e) {}

  // 2. Signout Supabase + pulizia variabili
  try { await handleLogout(); } catch (e) {}

  // 3. Reset stato
  cachedNatalChart = null;
  isLoadingChart = false;
  state.currentPage = "home";
  state.lastPage = "home";

  // 4. Svuota pagine
  const p = document.getElementById('page-personalized');
  if (p) p.innerHTML = '';
  const pay = document.getElementById('page-payments');
  if (pay) pay.innerHTML = '';

  // 5. Ricostruisci e mostra home
  try { renderHomePage(); } catch (e) {}
  showPage("home");

  console.log('Logout fatto.');
}

// ===== WINDOW.APP =====
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
      const b = document.getElementById("ph-tab-" + t);
      const e = document.getElementById("ph-text-" + t);
      if (b) b.classList.toggle("active", t === tab);
      if (e) e.classList.toggle("hidden", t !== tab);
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
  activateWelcomeGift: async () => {
    try {
      const ok = await activateWelcomeGift();
      if (ok) {
        const zoneA = document.getElementById('zoneAContainer');
        if (zoneA) {
          zoneA.classList.remove('zone-a-locked');
          const ov = zoneA.querySelector('.zone-a-overlay');
          if (ov) ov.remove();
        }
      }
    } catch (e) {}
  },
  startVoiceSession,
  endVoiceSession: () => {
    try { endRealVoiceSession(); } catch (e) {}
    showPage(state.lastPage || "home");
  },
  goBackFromVoice,
  toggleVoiceListening,
  startVoiceRecording: () => {
    alert('Registrazione avanzata in preparazione. Usa il microfono del browser.');
  },
  openLunaFromCompat: (category) => {
    window.app.closeCompatModal();
    window.app.startVoiceSession(category);
  },
  resetCompatForm: () => {
    const f = document.getElementById("compatForm");
    if (f) f.reset();
    const r = document.getElementById("compatResult");
    if (r) { r.style.display = "none"; r.innerHTML = ""; }
  },
  openTelegram: () => {
    window.open('https://t.me/LunaAstrologicaBot', '_blank');
    const c = document.getElementById('telegramCard');
    if (c) c.style.display = 'none';
  },
  _resetState: () => {
    cachedNatalChart = null;
    isLoadingChart = false;
    state.currentPage = "home";
    state.lastPage = "home";
    const p = document.getElementById('page-personalized');
    if (p) p.innerHTML = '';
    const pay = document.getElementById('page-payments');
    if (pay) pay.innerHTML = '';
  }
};
