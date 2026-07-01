// ============================================================
// APP.JS — Orchestratore principale
// Flusso naturale: Supabase gestisce login/logout/conferma email
// ============================================================

import { geocodeProfileIfNeeded, loadNatalChart } from './natal.js';
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
  updateCredits
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

let state = {
  currentPage: "home",
  lastPage: "home",
  chatMode: "chat",
};

let isFirstAuthCheck = true;

// ============================================================
// AVVIO APPLICAZIONE
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  renderAuthModal();
  renderCompatModal();
  renderHomePage();
  renderChatPage();

  // Inizializza autenticazione (ascolta eventi login/logout)
  await initAuth(onAuthStateChange);

  // Dopo init: se utente già loggato, mostra pagina personalizzata
  const user = getCurrentUser();
  const profile = getCurrentProfile();

  if (user && profile?.id) {
    renderPersonalizedPage(profile, user);
    showPage("personalized");
  } else {
    showPage("home");
  }

  console.log("🌙 Luna Astrologica avviata");
});

// ============================================================
// GESTORE CAMBIO STATO AUTENTICAZIONE
// Chiamato da Supabase quando l'utente fa login, logout,
// o conferma l'email (anche da link esterno)
// ============================================================
function onAuthStateChange(authState) {
  updateUI(authState);

  // Primo login o ritorno da conferma email: mostra pagina personalizzata
  if (isFirstAuthCheck && authState.isLoggedIn && authState.profile?.id) {
    isFirstAuthCheck = false;
    renderPersonalizedPage(authState.profile, authState.user);
    showPage("personalized");

    // Geocoding e calcolo tema natale in background
    setTimeout(async () => {
      await geocodeProfileIfNeeded();
      await loadNatalChart();
    }, 500);
  }
}

// ============================================================
// AGGIORNA UI (header, crediti, navigazione)
// ============================================================
function updateUI(authState) {
  const isLoggedIn = authState?.isLoggedIn || false;
  const profile = authState?.profile || null;
  const user = authState?.user || null;
  const credits = authState?.credits || 0;

  renderHeader(isLoggedIn, profile || user);
  renderNav(state.currentPage);

  const creditsVal = $("creditsVal");
  if (creditsVal) creditsVal.textContent = credits;

  const creditsDot = $("creditsDot");
  if (creditsDot) {
    creditsDot.className = "credits-dot";
    if (credits <= 0) creditsDot.classList.add("danger");
    else if (credits <= 3) creditsDot.classList.add("warning");
  }
}

// ============================================================
// NAVIGAZIONE PAGINE
// ============================================================
function showPage(pageId) {
  if (pageId !== "chat") state.lastPage = pageId;
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
}

function goHome() {
  showPage("home");
}

// ============================================================
// CONTROLLO ACCESSO (richiede login)
// ============================================================
function requireAuthOrModal() {
  const user = getCurrentUser();
  if (user) {
    const profile = getCurrentProfile();
    renderPersonalizedPage(profile, user);
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

// ============================================================
// MODALE AUTENTICAZIONE
// ============================================================
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

  hideAlerts();
}

// ============================================================
// GESTORI PAGINE
// ============================================================
function handleShowHoroscopePage(signName) {
  renderHoroscopePage(signName);
  showPage("horoscope");
}

function handleShowServiceChoice(category) {
  const user = getCurrentUser();
  if (!user) { openAuthModal(); return; }
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
    async () => { await updateCredits(-CONFIG.CREDITS_PER_MESSAGE); }
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

function showPaymentsPage() {
  alert("💳 Pagamenti — in arrivo nello step E (Stripe)");
}

// ============================================================
// LINGUA
// ============================================================
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

// ============================================================
// ESPOSIZIONE API GLOBALE
// ============================================================
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
};
