// ============================================================
// APP.JS — Orchestratore principale
// FIX: mantiene logica originale, aggiunge solo natalData + affinità
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
// 🆕 Calcola affinità generica tra due persone (colleghi, amici, familiari, partner)
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
        return { score: 0, description: 'Impossibile calcolare: dati insufficienti.', details: null };
    }

    const natalPlanets = cachedNatalChart.planets || [];
    const partnerPlanets = partnerChart.planets || [];

    // Mappa posizioni per calcolo aspetti
    const natalPositions = {};
    natalPlanets.forEach(p => { if (p.key) natalPositions[p.key] = (cachedNatalChart.houses?.find(h => h.name === p.sign)?.degree || 0) + (p.degree || 0) + ((p.minutes || 0)/60); });

    // Calcolo longitudine approssimativa per ogni pianeta
    const SIGN_LONG = { 'Ariete':0,'Toro':30,'Gemelli':60,'Cancro':90,'Leone':120,'Vergine':150,'Bilancia':180,'Scorpione':210,'Sagittario':240,'Capricorno':270,'Acquario':300,'Pesci':330 };
    function getLon(planet) {
        return (SIGN_LONG[planet.sign] || 0) + (planet.degree || 0) + ((planet.minutes || 0)/60);
    }

    const ASPECTS = [
        { name: 'congiunzione', angle: 0, orb: 8, score: 15, harmony: 'forte' },
        { name: 'trigono', angle: 120, orb: 8, score: 12, harmony: 'armoniosa' },
        { name: 'sestile', angle: 60, orb: 6, score: 8, harmony: 'armoniosa' },
        { name: 'quadrato', angle: 90, orb: 6, score: -8, harmony: 'tensione' },
        { name: 'opposizione', angle: 180, orb: 6, score: -10, harmony: 'tensione' },
    ];

    function angleDiff(a, b) {
        let diff = Math.abs(a - b) % 360;
        return diff > 180 ? 360 - diff : diff;
    }

    let score = 50;
    const aspects = [];
    const harmony = { armoniose: 0, tensioni: 0, forti: 0 };
    const sectorScores = { comunicazione: 0, emozioni: 0, azione: 0, struttura: 0, creativita: 0, intuizione: 0 };

    for (const np of natalPlanets) {
        for (const pp of partnerPlanets) {
            if (!np.key || !pp.key) continue;
            const lon1 = getLon(np);
            const lon2 = getLon(pp);
            for (const asp of ASPECTS) {
                const diff = angleDiff(lon1, lon2);
                if (Math.abs(diff - asp.angle) <= asp.orb) {
                    score += asp.score;
                    aspects.push({
                        planet1: np.key,
                        planet2: pp.key,
                        type: asp.name,
                        harmony: asp.harmony,
                        orb: Number((Math.abs(diff - asp.angle)).toFixed(1))
                    });
                    harmony[asp.harmony === 'armoniosa' ? 'armoniose' : asp.harmony === 'tensione' ? 'tensioni' : 'forti']++;

                    // Settori
                    if (['mercury','jupiter'].includes(np.key) && ['mercury','jupiter'].includes(pp.key)) sectorScores.comunicazione += asp.score > 0 ? 2 : -1;
                    if (['moon','venus','neptune'].includes(np.key) && ['moon','venus','neptune'].includes(pp.key)) sectorScores.emozioni += asp.score > 0 ? 2 : -1;
                    if (['mars','sun','pluto'].includes(np.key) && ['mars','sun','pluto'].includes(pp.key)) sectorScores.azione += asp.score > 0 ? 2 : -1;
                    if (['saturn','uranus'].includes(np.key) && ['saturn','uranus'].includes(pp.key)) sectorScores.struttura += asp.score > 0 ? 2 : -1;
                    if (['venus','sun','jupiter'].includes(np.key) && ['venus','sun','jupiter'].includes(pp.key)) sectorScores.creativita += asp.score > 0 ? 2 : -1;
                    if (['moon','neptune','pluto'].includes(np.key) && ['moon','neptune','pluto'].includes(pp.key)) sectorScores.intuizione += asp.score > 0 ? 2 : -1;
                }
            }
        }
    }

    // Compatibilità segni solari
    const sun1 = natalPlanets.find(p => p.key === 'sun')?.sign;
    const sun2 = partnerPlanets.find(p => p.key === 'sun')?.sign;
    const moon1 = natalPlanets.find(p => p.key === 'moon')?.sign;
    const moon2 = partnerPlanets.find(p => p.key === 'moon')?.sign;
    const asc1 = cachedNatalChart.ascendant?.name;
    const asc2 = partnerChart.ascendant?.name;

    const ELEMENTS = {
        'Ariete':'fuoco','Leone':'fuoco','Sagittario':'fuoco',
        'Toro':'terra','Vergine':'terra','Capricorno':'terra',
        'Gemelli':'aria','Bilancia':'aria','Acquario':'aria',
        'Cancro':'acqua','Scorpione':'acqua','Pesci':'acqua'
    };

    const elem1 = ELEMENTS[sun1];
    const elem2 = ELEMENTS[sun2];
    if (elem1 === elem2) score += 8;
    else if ((elem1==='fuoco'&&elem2==='aria')||(elem1==='aria'&&elem2==='fuoco')||
             (elem1==='terra'&&elem2==='acqua')||(elem1==='acqua'&&elem2==='terra')) score += 5;
    else if ((elem1==='fuoco'&&elem2==='acqua')||(elem1==='acqua'&&elem2==='fuoco')||
             (elem1==='terra'&&elem2==='aria')||(elem1==='aria'&&elem2==='terra')) score -= 3;

    // Compatibilità segni specifici
    const COMPATIBLE = [
        ['Ariete','Leone'],['Ariete','Sagittario'],['Ariete','Gemelli'],
        ['Toro','Vergine'],['Toro','Capricorno'],['Toro','Cancro'],
        ['Gemelli','Bilancia'],['Gemelli','Acquario'],['Gemelli','Ariete'],
        ['Cancro','Scorpione'],['Cancro','Pesci'],['Cancro','Toro'],
        ['Leone','Sagittario'],['Leone','Ariete'],['Leone','Bilancia'],
        ['Vergine','Capricorno'],['Vergine','Toro'],['Vergine','Scorpione'],
        ['Bilancia','Acquario'],['Bilancia','Gemelli'],['Bilancia','Leone'],
        ['Scorpione','Pesci'],['Scorpione','Cancro'],['Scorpione','Vergine'],
        ['Sagittario','Ariete'],['Sagittario','Leone'],['Sagittario','Acquario'],
        ['Capricorno','Toro'],['Capricorno','Vergine'],['Capricorno','Pesci'],
        ['Acquario','Gemelli'],['Acquario','Bilancia'],['Acquario','Sagittario'],
        ['Pesci','Cancro'],['Pesci','Scorpione'],['Pesci','Capricorno']
    ];
    if (sun1 && sun2) {
        const isCompat = COMPATIBLE.some(([a,b]) => (a===sun1&&b===sun2)||(a===sun2&&b===sun1));
        if (isCompat) score += 10;
    }

    score = Math.max(0, Math.min(100, score));

    // Analisi settori
    const sectors = [];
    if (sectorScores.comunicazione > 0) sectors.push({name:'Comunicazione & Idee', score: Math.min(10, 5+sectorScores.comunicazione), desc:'Scambio fluido di idee, dialogo stimolante'});
    if (sectorScores.emozioni > 0) sectors.push({name:'Empatia & Emozioni', score: Math.min(10, 5+sectorScores.emozioni), desc:'Comprensione reciproca a livello sentimentale'});
    if (sectorScores.azione > 0) sectors.push({name:'Azione & Iniziativa', score: Math.min(10, 5+sectorScores.azione), desc:'Energia condivisa per progetti e obiettivi'});
    if (sectorScores.struttura > 0) sectors.push({name:'Struttura & Organizzazione', score: Math.min(10, 5+sectorScores.struttura), desc:'Capacità di pianificare e costruire insieme'});
    if (sectorScores.creativita > 0) sectors.push({name:'Creatività & Espressione', score: Math.min(10, 5+sectorScores.creativita), desc:'Ispirazione artistica e gusto condiviso'});
    if (sectorScores.intuizione > 0) sectors.push({name:'Intuizione & Percezione', score: Math.min(10, 5+sectorScores.intuizione), desc:'Comprensione silenziosa, sguardi che parlano'});

    sectors.sort((a,b) => b.score - a.score);

    // Tipo di relazione suggerita
    let relationType = 'Collegialità';
    if (score >= 80) relationType = 'Alchimia Rara';
    else if (score >= 65) relationType = 'Sintonia Profonda';
    else if (score >= 50) relationType = 'Complementarità';
    else if (score >= 35) relationType = 'Sfida Evolutiva';
    else relationType = 'Apprendimento Reciproco';

    return {
        score,
        relationType,
        sun1, sun2, moon1, moon2, asc1, asc2,
        aspects: aspects.slice(0, 8),
        harmony,
        sectors: sectors.slice(0, 4),
        totalAspects: aspects.length
    };
}

// 🆕 Handler affinità generica — risultato dettagliato con Chat/Voce
async function handleCompatSubmit(event) {
    event.preventDefault();
    const name = document.getElementById('compatName')?.value;
    const birthDate = document.getElementById('compatBirthDate')?.value;
    const birthTime = document.getElementById('compatBirthTime')?.value;
    const city = document.getElementById('compatBirthCity')?.value;
    const country = document.getElementById('compatBirthCountry')?.value;
    const gender = document.getElementById('compatGender')?.value;

    if (!name || !birthDate || !city || !country) {
        alert('Compila tutti i campi obbligatori');
        return;
    }

    const resultDiv = document.getElementById('compatResult');
    if (resultDiv) {
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<div class="loading" style="margin:1rem auto;"></div><p style="text-align:center;color:var(--text-muted);">Calcolo in corso tra i due temi natali...</p>';
    }

    const partnerData = { name, birthDate, birthTime, city, country, gender };
    const result = await calculateSynastry(getCurrentProfile(), partnerData);

    if (result.score === 0 && !result.sectors) {
        if (resultDiv) {
            resultDiv.innerHTML = '<p style="color:var(--danger);text-align:center;">⚠️ Impossibile calcolare: dati insufficienti o errore nel calcolo del tema natale.</p>';
        }
        return;
    }

    // Costruisco HTML risultato
    let sectorsHtml = '';
    if (result.sectors && result.sectors.length > 0) {
        sectorsHtml = '<div style="margin-top:1rem;"><p style="font-size:0.8125rem;font-weight:600;color:var(--gold);margin-bottom:0.5rem;">🎯 Settori di Accord</p>';
        result.sectors.forEach(s => {
            const barWidth = Math.round((s.score / 10) * 100);
            sectorsHtml += `
                <div style="margin-bottom:0.625rem;">
                    <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-muted);margin-bottom:0.25rem;">
                        <span>${s.name}</span>
                        <span>${s.score}/10</span>
                    </div>
                    <div style="height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;">
                        <div style="width:${barWidth}%;height:100%;background:linear-gradient(90deg,var(--gold),var(--gold-dark));border-radius:3px;"></div>
                    </div>
                    <p style="font-size:0.6875rem;color:var(--text-dim);margin-top:0.25rem;">${s.desc}</p>
                </div>`;
        });
        sectorsHtml += '</div>';
    }

    let aspectsHtml = '';
    if (result.aspects && result.aspects.length > 0) {
        aspectsHtml = '<div style="margin-top:1rem;"><p style="font-size:0.8125rem;font-weight:600;color:var(--gold);margin-bottom:0.5rem;">⚡ Aspetti Principali</p><div style="display:grid;gap:0.375rem;">';
        result.aspects.forEach(a => {
            const color = a.harmony === 'armoniosa' ? '#10B981' : a.harmony === 'tensione' ? '#EF4444' : '#F59E0B';
            const icon = a.harmony === 'armoniosa' ? '✨' : a.harmony === 'tensione' ? '⚡' : '🔗';
            aspectsHtml += `
                <div style="display:flex;align-items:center;gap:0.5rem;padding:0.5rem;background:rgba(255,255,255,0.04);border-radius:0.5rem;border-left:3px solid ${color};">
                    <span style="font-size:0.875rem;">${icon}</span>
                    <span style="font-size:0.8125rem;color:var(--text-muted);">${a.planet1} ${a.type} ${a.planet2} <span style="color:var(--text-dim);font-size:0.75rem;">(orb ${a.orb}°)</span></span>
                </div>`;
        });
        aspectsHtml += '</div></div>';
    }

    let harmonyHtml = '';
    if (result.harmony) {
        harmonyHtml = `
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.5rem;margin-top:1rem;">
                <div style="text-align:center;padding:0.5rem;background:rgba(16,185,129,0.1);border-radius:0.5rem;">
                    <div style="font-size:1.25rem;font-weight:700;color:#10B981;">${result.harmony.armoniose}</div>
                    <div style="font-size:0.6875rem;color:var(--text-dim);">Armonie</div>
                </div>
                <div style="text-align:center;padding:0.5rem;background:rgba(245,158,11,0.1);border-radius:0.5rem;">
                    <div style="font-size:1.25rem;font-weight:700;color:#F59E0B;">${result.harmony.forti}</div>
                    <div style="font-size:0.6875rem;color:var(--text-dim);">Connessioni</div>
                </div>
                <div style="text-align:center;padding:0.5rem;background:rgba(239,68,68,0.1);border-radius:0.5rem;">
                    <div style="font-size:1.25rem;font-weight:700;color:#EF4444;">${result.harmony.tensioni}</div>
                    <div style="font-size:0.6875rem;color:var(--text-dim);">Tensioni</div>
                </div>
            </div>`;
    }

    const CHAT_ICON = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
    const VOICE_ICON = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`;

    if (resultDiv) {
        resultDiv.innerHTML = `
            <div style="text-align:center; margin:1.5rem 0 1rem;">
                <div style="font-size:0.875rem;color:var(--text-muted);margin-bottom:0.5rem;">Affinità con ${name}</div>
                <div style="font-size:3.5rem; font-weight:800; color:var(--gold); line-height:1;">${result.score}%</div>
                <div style="font-size:1rem;color:var(--text-muted);margin-top:0.5rem;font-weight:600;">${result.relationType}</div>
            </div>

            <div style="background:var(--card-bg); border:1px solid var(--border); border-radius:0.75rem; padding:1rem; margin-bottom:1rem;">
                <p style="font-size:0.8125rem;color:var(--text-muted);line-height:1.6;margin-bottom:0.75rem;">
                    <strong style="color:var(--gold);">☉ Sole:</strong> ${result.sun1 || '?'} ↔ ${result.sun2 || '?'}<br>
                    <strong style="color:var(--gold);">☽ Luna:</strong> ${result.moon1 || '?'} ↔ ${result.moon2 || '?'}<br>
                    <strong style="color:var(--gold);">⬆️ Ascendente:</strong> ${result.asc1 || '?'} ↔ ${result.asc2 || '?'}
                </p>
                ${harmonyHtml}
            </div>

            ${sectorsHtml}
            ${aspectsHtml}

            <div style="margin-top:1.5rem; padding-top:1rem; border-top:1px solid var(--border);">
                <p style="font-size:0.75rem;color:var(--text-dim);text-align:center;margin-bottom:0.75rem;">
                    ${result.totalAspects} aspetti analizzati tra i due temi natali
                </p>
                <div style="display:flex; gap:0.75rem; justify-content:center;">
                    <button class="action-btn" onclick="window.app.startChatAbout('affinita')">
                        ${CHAT_ICON}
                        <span>Chiedi a Luna</span>
                    </button>
                    <button class="action-btn" onclick="window.app.startVoiceAbout('affinita')">
                        ${VOICE_ICON}
                        <span>Spiegami</span>
                    </button>
                </div>
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
        // ─── FIX 1: popola esplicitamente la cache ───
        cachedNatalChart = chart;
        console.log('✅ Tema natale calcolato:', chart.moonSign, chart.ascendant?.sign);
        // ─── FIX 2: NON richiamare renderPersonalizedPage qui —
        // loadNatalChart() chiama già updateNatalChartUI() che popola il DOM.
        // Rerenderizzare cancellerebbe la ruota SVG e i dati appena disegnati.
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
