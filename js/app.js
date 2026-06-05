// ============================================================
// APP.JS — Orchestratore principale
// FIX v4: cache persistente in localStorage per dati natali
// ============================================================

import { loadNatalChart } from './natal.js';
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
    showCompat, openProfileEdit, toggleAccordion, resetCompatForm,
    openLunaFromCompat
} from './profile.js';
import {
    setChatMode, startCategoryChat, startChatAbout, startVoiceAbout,
    sendMessage, goBackFromChat
} from './chat.js';
import { loadTransits } from './transits.js';

let state = {
    currentPage: "home",
    lastPage: "home",
    chatMode: "chat",
};

let isFirstAuthCheck = true;

// ===== CACHE PERSISTENTE =====
const CACHE_KEY = 'luna_natal_cache';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 ore

function getCachedNatal() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data.timestamp || Date.now() - data.timestamp > CACHE_TTL) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }
        return data.natal;
    } catch (e) {
        return null;
    }
}

function setCachedNatal(natal) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            natal: natal,
            timestamp: Date.now()
        }));
    } catch (e) {
        console.warn('Cache save failed:', e);
    }
}

function clearCachedNatal() {
    localStorage.removeItem(CACHE_KEY);
}

// Variabile in memoria per sessione attiva
let cachedNatalChart = getCachedNatal();

document.addEventListener("DOMContentLoaded", async () => {
    renderAuthModal();
    renderCompatModal();
    renderHomePage();
    renderChatPage();

    const urlParams = new URLSearchParams(window.location.search);
    const isVerified = urlParams.get("verified");

    await initAuth(onAuthStateChange);

    const user = getCurrentUser();
    const profile = getCurrentProfile();

    if (isVerified === "true" && user && profile?.id) {
        window.history.replaceState({}, document.title, window.location.pathname);
        renderPersonalizedPage(profile, user, cachedNatalChart);
        showPage("personalized");
        setTimeout(() => ensureGeocodingAndChart(), 500);
        console.log("🌙 Arrivo da verifica email — pagina personalizzata caricata");
    } else if (user && profile?.id) {
        // Se ho cache, mostro subito, poi aggiorno in background
        renderPersonalizedPage(profile, user, cachedNatalChart);
        showPage("personalized");
        if (!cachedNatalChart) {
            setTimeout(() => ensureGeocodingAndChart(), 100);
        } else {
            // Aggiorno in background senza bloccare l'utente
            setTimeout(() => ensureGeocodingAndChart(true), 500);
        }
    } else {
        showPage("home");
    }

    console.log("🌙 Luna Astrologica avviata");
});

function onAuthStateChange(authState) {
    updateUI(authState);

    if (isFirstAuthCheck && authState.isLoggedIn && authState.profile?.id) {
        isFirstAuthCheck = false;
        renderPersonalizedPage(authState.profile, authState.user, cachedNatalChart);
        showPage("personalized");

        if (!cachedNatalChart) {
            setTimeout(async () => {
                await ensureGeocodingAndChart();
            }, 500);
        }
    }
}

async function ensureGeocodingAndChart(silent = false) {
    const profile = getCurrentProfile();
    if (!profile) return;

    if (!profile.birth_latitude && profile.birth_city && profile.birth_country) {
        console.log('🌍 Geocoding necessario per:', profile.birth_city);
        const geoOk = await geocodeProfileIfNeeded();
        if (geoOk) {
            console.log('✅ Geocoding completato');
        } else {
            console.warn('❌ Geocoding fallito');
            return;
        }
    }

    console.log('🔮 Avvio calcolo tema natale...');
    const chart = await loadNatalChart();
    if (chart) {
        cachedNatalChart = chart;
        setCachedNatal(chart);
        console.log('✅ Tema natale calcolato e salvato:', chart.moonSign, chart.ascendant?.sign);

        // Aggiorna UI solo se siamo sulla pagina personalized
        if (state.currentPage === 'personalized' && !silent) {
            renderPersonalizedPage(profile, getCurrentUser(), chart);
        }
    } else {
        console.warn('❌ Tema natale non calcolato');
    }

    console.log('🌙 Avvio caricamento transiti...');
    await loadTransits();
}

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

function showPage(pageId) {
    if (pageId !== "chat") state.lastPage = pageId;
    state.currentPage = pageId;
    uiShowPage(pageId, state.lastPage);
    renderNav(pageId);

    const user = getCurrentUser();
    const profile = getCurrentProfile();

    // Se torniamo sulla pagina personalized, ricarica i dati dalla cache
    if (pageId === 'personalized' && cachedNatalChart) {
        renderPersonalizedPage(profile, user, cachedNatalChart);
    }

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

function requireAuthOrModal() {
    const user = getCurrentUser();
    if (user) {
        const profile = getCurrentProfile();
        renderPersonalizedPage(profile, user, cachedNatalChart);
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
    const regForm = $("registerForm");

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

function showPaymentsPage() {
    alert("💳 Pagamenti — in arrivo nello step E (Stripe)");
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
    resetCompatForm,
    openLunaFromCompat,
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
    // Esposte per debug
    clearCache: clearCachedNatal,
    getCache: getCachedNatal,
};
