// ============================================================
// APP.JS — Orchestratore principale
// FIX: rimosso calculateSynastry finta, usa profile.js reale
// FIX v2: aggiunte openLunaFromCompat e resetCompatForm in window.app
// FIX v3: cache chart prima di initAuth, no doppio render, re-ingresso protetto
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
    showCompat, openProfileEdit, toggleAccordion
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
let cachedNatalChart = null;
// ===== LOCALSTORAGE PER DATI NATALI (24h) =====
const NATAL_CHART_KEY = 'luna_natal_chart';
const NATAL_CHART_TIMESTAMP_KEY = 'luna_natal_chart_ts';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

function saveNatalChartToStorage(chartData) {
    if (!chartData) return;
    try {
        localStorage.setItem(NATAL_CHART_KEY, JSON.stringify(chartData));
        localStorage.setItem(NATAL_CHART_TIMESTAMP_KEY, Date.now().toString());
    } catch (err) {
        console.warn('Errore salvataggio:', err);
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

// Popola cachedNatalChart dai dati di loadNatalChart
function setCachedNatalChart(chartData) {
    cachedNatalChart = chartData;
}

document.addEventListener("DOMContentLoaded", async () => {
    renderAuthModal();
    renderCompatModal();
    renderHomePage();
    renderChatPage();

    const urlParams = new URLSearchParams(window.location.search);
    const isVerified = urlParams.get("verified");

    // FIX v3: carica cache PRIMA di initAuth, così il primo render ha già i dati
    cachedNatalChart = loadNatalChartFromStorage();

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
        renderPersonalizedPage(profile, user, cachedNatalChart);
        showPage("personalized");
    } else {
        showPage("home");
    }

    console.log("🌙 Luna Astrologica avviata");
});

function onAuthStateChange(authState) {
    updateUI(authState);

    if (isFirstAuthCheck && authState.isLoggedIn && authState.profile?.id) {
        isFirstAuthCheck = false;
        if (!cachedNatalChart) cachedNatalChart = loadNatalChartFromStorage();
        // FIX v3: RIMOSSO renderPersonalizedPage e showPage ridondanti
        // Il primo render è già gestito da DOMContentLoaded
        setTimeout(async () => {
            await ensureGeocodingAndChart();
        }, 500);
    }
}

async function ensureGeocodingAndChart() {
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
        saveNatalChartToStorage(chart);
        console.log('✅ Tema natale calcolato:', chart.moonSign, chart.ascendant?.sign);
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
        // FIX v3: renderizza template SOLO se il container è vuoto (prima volta)
        // altrimenti usa il DOM esistente e ricarica solo i dati
        const container = document.getElementById("page-personalized");
        if (!container || container.innerHTML.trim() === "") {
            renderPersonalizedPage(profile, user, cachedNatalChart);
        }
        showPage("personalized");
        // FIX v3: ricarica sempre transiti al re-ingresso nella pagina
        setTimeout(() => {
            loadTransits();
        }, 100);
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
};
