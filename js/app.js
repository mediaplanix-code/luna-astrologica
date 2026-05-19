// ============================================================
// APP.JS — Orchestratore principale
// Collega tutti i moduli, gestisce stato globale e navigazione
// È l'unico file che tocca window.app
// ============================================================

import { CONFIG } from './config.js';
import { $, hideAlerts, scrollToTop } from './utils.js';
import {
    renderHeader, renderNav, renderHomePage, renderHoroscopePage,
    renderChatPage, renderAuthModal, renderCompatModal,
    renderPersonalizedPage, showPage as uiShowPage
} from './ui.js';
import {
    initAuth, handleRegister, handleLogin, handleLogout,
    loadUserData, getCurrentUser, getCurrentProfile, getCredits,
    updateCredits
} from './auth.js';
import { showHoroscopePage, switchHoroTab } from './horoscope.js';
import {
    openCompatModal, closeCompatModal, handleCompatSubmit,
    showCompat, openProfileEdit, toggleAccordion
} from './profile.js';
import {
    setChatMode, startCategoryChat, sendMessage, goBackFromChat, getChatMode
} from './chat.js';

// ===== STATO GLOBALE =====
let state = {
    currentPage: "home",
    lastPage: "home",
    chatMode: "chat",
};

// ===== INIT =====
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Render componenti statici
    renderAuthModal();
    renderCompatModal();
    renderHomePage();
    renderChatPage();

    // 2. Inizializza auth (carica sessione se esiste)
    await initAuth(onAuthStateChange);

    // 3. Render header e nav iniziali
    updateUI();

    // 4. Mostra home
    showPage("home");

    console.log("✅ Luna Astrologica avviata");
});

// ===== CALLBACK CAMBIO AUTH =====
function onAuthStateChange(authState) {
    updateUI(authState);

    // Se l'utente si è appena loggato, renderizza il profilo
    if (authState.isLoggedIn && authState.profile) {
        renderPersonalizedPage(authState.profile, authState.user);
    }
}

// ===== AGGIORNA UI =====
function updateUI(authState) {
    const isLoggedIn = authState?.isLoggedIn || false;
    const profile = authState?.profile || null;
    const user = authState?.user || null;
    const credits = authState?.credits || 0;

    renderHeader(isLoggedIn, profile || user);
    renderNav(state.currentPage);

    // Aggiorna crediti
    const creditsVal = $("creditsVal");
    if (creditsVal) creditsVal.textContent = credits;

    const creditsDot = $("creditsDot");
    if (creditsDot) {
        creditsDot.className = "credits-dot";
        if (credits <= 0) creditsDot.classList.add("danger");
        else if (credits <= 3) creditsDot.classList.add("warning");
    }
}

// ===== NAVIGAZIONE =====
function showPage(pageId) {
    if (pageId !== "chat") state.lastPage = pageId;
    state.currentPage = pageId;
    uiShowPage(pageId, state.lastPage);
    renderNav(pageId);
}

function goHome() {
    showPage("home");
}

// ===== AUTH WRAPPERS =====
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

// ===== MODAL AUTH =====
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

// ===== CHAT WRAPPERS =====
function handleSendMessage() {
    sendMessage(
        getCurrentUser(),
        getCurrentProfile(),
        getCredits(),
        async () => {
            // Callback: credito consumato
            await updateCredits(-CONFIG.CREDITS_PER_MESSAGE);
        }
    );
}

function handleStartCategoryChat(topic) {
    startCategoryChat(topic);
}

function handleGoBackFromChat() {
    goBackFromChat(state.lastPage);
}

// ===== LINGUA =====
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

// Chiudi dropdown cliccando fuori
document.addEventListener("click", (e) => {
    if (!e.target.closest(".lang-dropdown")) {
        const dropdown = $("langDropdown");
        if (dropdown) dropdown.classList.remove("open");
    }
});

// ===== ESPORTA SU WINDOW =====
// Tutte le funzioni chiamate da onclick nell'HTML devono essere su window.app
window.app = {
    // Navigazione
    showPage,
    goHome,
    requireAuthOrModal,
    requireAuthOrModalForChat,

    // Auth
    openAuthModal,
    closeAuthModal,
    switchAuthTab,
    handleRegister,
    handleLogin,
    handleLogout,

    // Oroscopo
    showHoroscopePage,
    switchHoroTab,

    // Profilo
    openProfileEdit,
    showCompat,
    openCompatModal,
    closeCompatModal,
    handleCompatSubmit,
    toggleAccordion,

    // Chat
    sendMessage: handleSendMessage,
    startCategoryChat: handleStartCategoryChat,
    goBackFromChat: handleGoBackFromChat,

    // Lingua
    toggleLang,
    setLang,
};
