// ============================================================
// APP.JS — Orchestratore principale
// FIX: mantiene logica originale, aggiunge solo natalData + affinità
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
    openCompatModal, closeCompatModal, handleCompatSubmit as profileCompatSubmit,
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

// 🆕 Popola cachedNatalChart dai dati di loadNatalChart
function setCachedNatalChart(chartData) {
    cachedNatalChart = chartData;
}

// 🆕 Calcola sinastria al volo (no salvataggio)
async function calculateSynastry(profile, partnerData) {
    let partnerLat = null, partnerLng = null, partnerTz = 'Europe/Rome';

    try {
        const geoRes = await fetch(
            `https://luna-astrologica-api-render.onrender.com/api/geocode?city=${encodeURIComponent(partnerData.city)}&country=${encodeURIComponent(partnerData.country)}`
        );
        if (geoRes.ok) {
            const geo = await geoRes.json();
            partnerLat = geo.lat;
            partnerLng = geo.lng;
            partnerTz = geo.timezone || 'Europe/Rome';
        }
    } catch (e) {
        console.warn('Geocoding partner fallito:', e.message);
    }

    let partnerChart = null;
    if (partnerLat !== null) {
        try {
            const chartRes = await fetch('https://luna-astrologica-api-render.onrender.com/api/natal-chart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    birthDate: partnerData.birthDate,
                    birthTime: partnerData.birthTime || '12:00',
                    lat: partnerLat,
                    lng: partnerLng,
                    timezone: partnerTz
                })
            });
            if (chartRes.ok) partnerChart = await chartRes.json();
        } catch (e) {
            console.warn('Calcolo tema partner fallito:', e.message);
        }
    }

    if (!partnerChart || !cachedNatalChart) {
        return { score: 0, description: 'Impossibile calcolare: dati insufficienti.' };
    }

    let score = 50;
    const aspects = [];
    const natalPlanets = cachedNatalChart.planets || [];
    const partnerPlanets = partnerChart.planets || [];

    const ASPECTS = [
        { name: 'congiunzione', angle: 0, orb: 8, score: 15 },
        { name: 'trigono', angle: 120, orb: 8, score: 12 },
        { name: 'sestile', angle: 60, orb: 6, score: 8 },
        { name: 'quadrato', angle: 90, orb: 6, score: -8 },
        { name: 'opposizione', angle: 180, orb: 6, score: -10 },
    ];

    function angleDiff(a, b) {
        let diff = Math.abs(a - b) % 360;
        return diff > 180 ? 360 - diff : diff;
    }

    for (const np of natalPlanets) {
        for (const pp of partnerPlanets) {
            for (const asp of ASPECTS) {
                const diff = angleDiff(np.lon || 0, pp.lon || 0);
                if (Math.abs(diff - asp.angle) <= asp.orb) {
                    score += asp.score;
                    aspects.push(`${np.key} ${asp.name} ${pp.key}`);
                }
            }
        }
    }

    const sun1 = natalPlanets.find(p => p.key === 'sun')?.sign;
    const sun2 = partnerPlanets.find(p => p.key === 'sun')?.sign;
    const COMPATIBLE_PAIRS = [
        ['Ariete','Leone'],['Ariete','Sagittario'],
        ['Toro','Vergine'],['Toro','Capricorno'],
        ['Gemelli','Bilancia'],['Gemelli','Acquario'],
        ['Cancro','Scorpione'],['Cancro','Pesci'],
        ['Leone','Ariete'],['Leone','Sagittario'],
        ['Vergine','Toro'],['Vergine','Capricorno'],
        ['Bilancia','Gemelli'],['Bilancia','Acquario'],
        ['Scorpione','Cancro'],['Scorpione','Pesci'],
        ['Sagittario','Ariete'],['Sagittario','Leone'],
        ['Capricorno','Toro'],['Capricorno','Vergine'],
        ['Acquario','Gemelli'],['Acquario','Bilancia'],
        ['Pesci','Cancro'],['Pesci','Scorpione'],
    ];
    if (sun1 && sun2) {
        const isCompat = COMPATIBLE_PAIRS.some(([a,b]) => 
            (a===sun1 && b===sun2) || (a===sun2 && b===sun1)
        );
        if (isCompat) score += 10;
    }

    score = Math.max(0, Math.min(100, score));

    let description = '';
    if (score >= 80) description = `🔥 Affinità eccezionale (${score}%). I vostri temi natali si armonizzano perfettamente.`;
    else if (score >= 60) description = `✨ Buona affinità (${score}%). Ci sono molti punti di contatto tra i vostri temi.`;
    else if (score >= 40) description = `🌙 Affinità moderata (${score}%). Ci sono differenze significative che richiedono comprensione.`;
    else description = `⚡ Affinità complessa (${score}%). I vostri temi mostrano energie molto diverse.`;

    if (aspects.length > 0) {
        description += `\n\nAspetti principali: ${aspects.slice(0,5).join(', ')}${aspects.length > 5 ? '...' : ''}`;
    }

    return { score, description, aspects };
}

// 🆕 Handler affinità (sovrascrive quello di profile.js)
async function handleCompatSubmit(event) {
    event.preventDefault();
    const name = document.getElementById('compatName')?.value;
    const birthDate = document.getElementById('compatBirthDate')?.value;
    const birthTime = document.getElementById('compatBirthTime')?.value;
    const city = document.getElementById('compatBirthCity')?.value;
    const country = document.getElementById('compatBirthCountry')?.value;

    if (!name || !birthDate || !city || !country) {
        alert('Compila tutti i campi obbligatori');
        return;
    }

    const resultDiv = document.getElementById('compatResult');
    if (resultDiv) {
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<div class="loading" style="margin:1rem auto;"></div><p style="text-align:center;color:var(--text-muted);">Calcolo in corso...</p>';
    }

    const partnerData = { name, birthDate, birthTime, city, country };
    const result = await calculateSynastry(getCurrentProfile(), partnerData);

    if (resultDiv) {
        resultDiv.innerHTML = `
            <div style="text-align:center; margin:1.5rem 0;">
                <div style="font-size:3rem; font-weight:800; color:var(--gold); line-height:1;">${result.score}%</div>
                <div style="font-size:0.875rem; color:var(--text-muted); margin-top:0.5rem;">Affinità con ${name}</div>
            </div>
            <div style="background:var(--card-bg); border:1px solid var(--border); border-radius:0.75rem; padding:1rem; font-size:0.875rem; line-height:1.7; color:var(--text-muted); white-space:pre-line;">
                ${result.description}
            </div>
            <button class="btn-gold btn-full" style="margin-top:1rem;" onclick="window.app.closeCompatModal()">Chiudi</button>
        `;
    }
}

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
        // cachedNatalChart viene popolato da loadNatalChart() in ensureGeocodingAndChart()
        renderPersonalizedPage(profile, user, cachedNatalChart);
        showPage("personalized");
        setTimeout(() => ensureGeocodingAndChart(), 500);
        console.log("🌙 Arrivo da verifica email — pagina personalizzata caricata");
    } else if (user && profile?.id) {
        // cachedNatalChart viene popolato da loadNatalChart() in ensureGeocodingAndChart()
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
        renderPersonalizedPage(authState.profile, authState.user, cachedNatalChart);
            showPage("personalized");

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
        console.log('✅ Tema natale calcolato:', chart.moonSign, chart.ascendant.sign);
        const profile = getCurrentProfile();
        if (profile?.id) {
            // cachedNatalChart viene popolato da loadNatalChart() in ensureGeocodingAndChart()
            if (state.currentPage === 'personalized') {
                renderPersonalizedPage(profile, getCurrentUser(), cachedNatalChart);
            }
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
};
