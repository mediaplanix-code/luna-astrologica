/**
 * transits-loader.js — Modulo isolato per caricare i transiti dal backend
 * Architettura: SPA modulare, usa MutationObserver per rilevare la sezione Transiti
 * NON tocca natal.js, app.js, auth.js, transits.js
 * Se questo file fallisce, il resto del sito continua a funzionare
 */

const API_URL = 'https://luna-astrologica-api-render.onrender.com/api/transits';
const CONTAINER_ID = 'transits-live-container';
const BTN_ID = 'btn-refresh-transits';

// Mappa pianeti: inglese → italiano con emoji
const PLANET_NAMES = {
    sun: '☀️ Sole',
    moon: '🌙 Luna',
    mercury: '☿ Mercurio',
    venus: '♀ Venere',
    mars: '♂ Marte',
    jupiter: '♃ Giove',
    saturn: '♄ Saturno',
    uranus: '♅ Urano',
    neptune: '♆ Nettuno',
    pluto: '♇ Plutone'
};

// Mappa segni zodiacali → emoji
const SIGN_EMOJI = {
    'Ariete': '♈', 'Toro': '♉', 'Gemelli': '♊', 'Cancro': '♋',
    'Leone': '♌', 'Vergine': '♍', 'Bilancia': '♎', 'Scorpione': '♏',
    'Sagittario': '♐', 'Capricorno': '♑', 'Acquario': '♒', 'Pesci': '♓'
};

// Mappa aspetti → emoji
const ASPECT_EMOJI = {
    'congiunzione': '🔗',
    'sestile': '✡️',
    'quadrato': '□',
    'trigono': '△',
    'opposizione': '☍',
    'quincunx': '⚻'
};

function getPlanetName(key) {
    return PLANET_NAMES[key] || key;
}

function getSignEmoji(sign) {
    return SIGN_EMOJI[sign] || '';
}

function getAspectEmoji(aspect) {
    return ASPECT_EMOJI[aspect] || '◆';
}

function formatDegree(deg) {
    const d = Math.floor(deg);
    const m = Math.floor((deg - d) * 60);
    return `${d}° ${m}'`;
}

function formatDateIT(isoDate) {
    const d = new Date(isoDate + 'T00:00:00');
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Trova la sezione Transiti nel DOM (anche se renderizzata dinamicamente)
 */
function findTransitsSection() {
    // 1. Cerca per ID esplicito
    let el = document.getElementById('page-transits') || 
             document.getElementById('transits') ||
             document.getElementById('transiti') ||
             document.getElementById('section-transits');
    if (el) return el;

    // 2. Cerca per classe
    el = document.querySelector('.page-transits, .section-transits, [data-page="transits"], [data-section="transits"]');
    if (el) return el;

    // 3. Cerca per testo in heading (case-insensitive)
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6, .section-title, .card-title, .page-title');
    for (const h of headings) {
        const text = h.textContent.toLowerCase();
        if (text.includes('transit') || text.includes('transiti') || text.includes('planetari')) {
            // Risali fino a trovare un container sensato
            let parent = h.closest('.page-section, section, .section, .card, .tab-pane, [role="tabpanel"]');
            if (parent) return parent;
            parent = h.parentElement?.parentElement;
            if (parent) return parent;
            return h.parentElement;
        }
    }

    // 4. Cerca dentro page-personalized (spesso i transiti sono lì)
    const personalized = document.getElementById('page-personalized');
    if (personalized && personalized.classList.contains('active')) {
        // Se la pagina personalized è attiva, potrebbe contenere i transiti
        const subHeadings = personalized.querySelectorAll('h1, h2, h3, h4, h5, h6');
        for (const h of subHeadings) {
            const text = h.textContent.toLowerCase();
            if (text.includes('transit') || text.includes('transiti')) {
                let parent = h.closest('.card, .section, div');
                if (parent) return parent;
                return personalized;
            }
        }
    }

    return null;
}

/**
 * Nasconde il testo statico "torna domani" se presente
 */
function hideStaticText(section) {
    const allText = section.querySelectorAll('p, div, span');
    for (const el of allText) {
        const text = el.textContent.toLowerCase();
        if (text.includes('torna domani') || 
            text.includes('aggiornati quotidianamente') ||
            text.includes('disponibile domani') ||
            text.includes('presto disponibile')) {
            el.style.display = 'none';
        }
    }
}

/**
 * Inietta il pulsante e il container nella sezione trovata
 */
function injectUI(section) {
    if (section.querySelector('#' + CONTAINER_ID)) return; // Già iniettato

    hideStaticText(section);

    const wrapper = document.createElement('div');
    wrapper.id = CONTAINER_ID;
    wrapper.style.cssText = `
        margin: 16px 0;
        padding: 16px;
        background: rgba(30, 20, 60, 0.6);
        border-radius: 12px;
        border: 1px solid rgba(139, 92, 246, 0.3);
        backdrop-filter: blur(4px);
    `;

    const btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.textContent = '🔄 Aggiorna transiti oggi';
    btn.style.cssText = `
        background: linear-gradient(135deg, #8b5cf6, #6d28d9);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 1rem;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.2s ease;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-family: inherit;
    `;
    btn.onmouseenter = () => { 
        btn.style.transform = 'translateY(-2px)'; 
        btn.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4)'; 
    };
    btn.onmouseleave = () => { 
        btn.style.transform = 'none'; 
        btn.style.boxShadow = 'none'; 
    };
    btn.onclick = handleRefresh;

    const results = document.createElement('div');
    results.id = 'transits-results';
    results.style.cssText = 'margin-top: 16px; display: none;';

    wrapper.appendChild(btn);
    wrapper.appendChild(results);

    // Inserisci all'inizio della sezione
    section.insertBefore(wrapper, section.firstChild);
    console.log('[transits-loader] UI iniettata nella sezione Transiti ✅');
}

/**
 * Gestisce il click sul pulsante
 */
async function handleRefresh() {
    const btn = document.getElementById(BTN_ID);
    const results = document.getElementById('transits-results');

    // Recupera user da window.app (esposto globalmente da app.js)
    let user = null;
    try {
        if (window.app && typeof window.app.getCurrentUser === 'function') {
            user = window.app.getCurrentUser();
        }
    } catch (e) {
        console.warn('[transits-loader] getCurrentUser non disponibile');
    }

    if (!user || !user.id) {
        results.style.display = 'block';
        results.innerHTML = '<p style="color:#f87171; font-size:0.95rem;">⚠️ Devi essere loggato per vedere i transiti personalizzati.</p>';
        return;
    }

    // Stato di caricamento
    btn.disabled = true;
    btn.textContent = '⏳ Calcolo in corso...';
    btn.style.opacity = '0.8';
    results.style.display = 'block';
    results.innerHTML = '<p style="color:#a78bfa; font-size:0.95rem;">🔮 Sto consultando le stelle... Attendi qualche secondo.</p>';

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: user.id })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Server errore ${response.status}: ${errText}`);
        }

        const data = await response.json();
        renderResults(data);
        btn.textContent = '✅ Aggiornato! Ricarica';
        setTimeout(() => { 
            btn.textContent = '🔄 Aggiorna transiti oggi'; 
        }, 3000);

    } catch (err) {
        console.error('[transits-loader] Errore:', err);
        results.innerHTML = `<p style="color:#f87171; font-size:0.95rem;">❌ Errore: ${escapeHtml(err.message)}<br><small style="color:#a78bfa;">Riprova tra qualche istante.</small></p>`;
        btn.textContent = '🔄 Riprova';
    } finally {
        btn.disabled = false;
        btn.style.opacity = '1';
    }
}

/**
 * Renderizza i risultati dei transiti
 */
function renderResults(data) {
    const results = document.getElementById('transits-results');
    const natal = data.natal || {};
    const transits = data.transitsToday || [];
    const eventsFound = data.eventsFound || 0;
    const date = data.date || new Date().toISOString().split('T')[0];

    let html = '';

    // Header
    html += `<div style="margin-bottom:16px; padding-bottom:12px; border-bottom:1px solid rgba(139,92,246,0.2);">`;
    html += `<h3 style="margin:0 0 8px 0; color:#e9d5ff; font-size:1.15rem; font-weight:700;">📅 Transiti del ${formatDateIT(date)}</h3>`;
    html += `<div style="display:flex; gap:12px; flex-wrap:wrap; font-size:0.85rem; color:#c4b5fd;">`;
    html += `<span>⬆️ Asc: ${getSignEmoji(natal.ascendantSign)} ${natal.ascendantSign} ${formatDegree(natal.ascendant || 0)}</span>`;
    html += `<span>🏔️ MC: ${getSignEmoji(natal.mcSign)} ${natal.mcSign} ${formatDegree(natal.mc || 0)}</span>`;
    html += `<span>📊 Eventi 90gg: ${eventsFound.toLocaleString('it-IT')}</span>`;
    html += `</div></div>`;

    // Griglia transiti (responsive)
    html += `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:10px;">`;

    for (const t of transits) {
        const planetName = getPlanetName(t.planet);
        const signEmoji = getSignEmoji(t.sign);
        const aspects = t.aspectsToNatal || [];
        const hasAspects = aspects.length > 0;

        html += `<div style="
            background: rgba(15, 10, 40, 0.7);
            border-radius: 10px;
            padding: 12px;
            border: 1px solid ${hasAspects ? 'rgba(139, 92, 246, 0.5)' : 'rgba(100, 100, 150, 0.15)'};
            transition: all 0.2s ease;
        " onmouseenter="this.style.transform='translateY(-2px)'; this.style.borderColor='rgba(139, 92, 246, 0.8)';" 
           onmouseleave="this.style.transform='none'; this.style.borderColor='${hasAspects ? 'rgba(139, 92, 246, 0.5)' : 'rgba(100, 100, 150, 0.15)'}';">`;

        // Riga pianeta + casa
        html += `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">`;
        html += `<span style="font-weight:700; color:#f3e8ff; font-size:1rem;">${planetName}</span>`;
        html += `<span style="font-size:0.8rem; color:#a78bfa; background:rgba(139,92,246,0.15); padding:2px 8px; border-radius:12px;">🏠 Casa ${t.house}</span>`;
        html += `</div>`;

        // Segno e grado
        html += `<div style="font-size:0.9rem; color:#ddd6fe; margin-bottom:6px;">`;
        html += `${signEmoji} <strong>${t.sign}</strong> <span style="color:#a78bfa;">${formatDegree(t.degree || 0)}</span>`;
        html += `</div>`;

        // Aspetti
        if (hasAspects) {
            html += `<div style="margin-top:8px; padding-top:8px; border-top:1px solid rgba(139,92,246,0.15);">`;
            html += `<div style="font-size:0.7rem; text-transform:uppercase; letter-spacing:0.08em; color:#8b5cf6; margin-bottom:6px; font-weight:600;">Aspetti con il tema natale</div>`;
            for (const asp of aspects) {
                const natalPlanet = getPlanetName(asp.natalPlanet);
                const aspectEmoji = getAspectEmoji(asp.aspect);
                const orb = (asp.orb || 0).toFixed(2);
                html += `<div style="display:flex; align-items:center; gap:6px; margin:3px 0; font-size:0.85rem; color:#e9d5ff;">`;
                html += `<span style="font-size:1rem;">${aspectEmoji}</span>`;
                html += `<span style="flex:1;">${asp.aspect} <span style="color:#c4b5fd;">${natalPlanet}</span></span>`;
                html += `<span style="font-size:0.75rem; color:#8b5cf6; white-space:nowrap;">orb ${orb}°</span>`;
                html += `</div>`;
            }
            html += `</div>`;
        } else {
            html += `<div style="font-size:0.75rem; color:#6b7280; margin-top:6px; font-style:italic;">Nessun aspetto significativo oggi</div>`;
        }

        html += `</div>`;
    }

    html += `</div>`;

    // Footer
    html += `<div style="margin-top:14px; padding-top:10px; border-top:1px solid rgba(139,92,246,0.2); font-size:0.75rem; color:#8b5cf6; text-align:center; line-height:1.5;">`;
    html += `✨ Dati calcolati in tempo reale via Swiss Ephemeris<br>${eventsFound.toLocaleString('it-IT')} eventi astrologici nei prossimi 90 giorni`;
    html += `</div>`;

    results.innerHTML = html;
}

/**
 * Inizializzazione principale con MutationObserver
 * Rileva automaticamente quando la sezione Transiti appare nel DOM
 */
function init() {
    // 1. Prova subito (se la pagina è già renderizzata)
    const section = findTransitsSection();
    if (section && !section.querySelector('#' + CONTAINER_ID)) {
        injectUI(section);
    }

    // 2. Osserva il DOM per rilevare quando la sezione appare (navigazione SPA)
    const observer = new MutationObserver(() => {
        const sec = findTransitsSection();
        if (sec && !sec.querySelector('#' + CONTAINER_ID)) {
            injectUI(sec);
        }
    });

    observer.observe(document.body, { 
        childList: true, 
        subtree: true 
    });

    console.log('[transits-loader] MutationObserver attivo — in attesa della sezione Transiti 👁️');
}

// Avvia quando il DOM è pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
