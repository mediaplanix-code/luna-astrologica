// ============================================================
// HOROSCOPE.JS — Logica oroscopi e segni zodiacali
// Nessuna dipendenza da Supabase
// ============================================================

import { ZODIAC_SIGNS, ZODIAC_TAGS } from './config.js';
import { $ } from './utils.js';

let currentSign = null;

// ===== MOSTRA PAGINA OROSCOPO =====
export function showHoroscopePage(signName) {
    currentSign = signName;
    const data = ZODIAC_SIGNS[signName];
    if (!data) return;

    // Aggiorna header
    const signIcon = $("horoSignIcon");
    const signNameEl = $("horoSignName");
    const signDetails = $("horoSignDetails");
    const tagsRow = $("horoTags");

    if (signIcon) signIcon.textContent = data.symbol;
    if (signNameEl) signNameEl.textContent = signName;
    if (signDetails) signDetails.textContent = `${data.period} • ${data.element} • ${data.ruler}`;

    if (tagsRow) {
        tagsRow.innerHTML = (ZODIAC_TAGS[signName] || [])
            .map(t => `<span class="tag">${t}</span>`)
            .join("");
    }

    // Reset tab
    switchHoroTab("day");

    if (window.app) window.app.showPage("horoscope");
}

// ===== CAMBIO TAB =====
export function switchHoroTab(tab) {
    const tabs = ["day", "week", "month", "year"];
    tabs.forEach(t => {
        const tabBtn = $("tab-" + t);
        const textEl = $("horoText" + t.charAt(0).toUpperCase() + t.slice(1));

        if (tabBtn) tabBtn.classList.toggle("active", t === tab);
        if (textEl) textEl.classList.toggle("hidden", t !== tab);
    });
}

// ===== GET SEGNO CORRENTE =====
export function getCurrentSign() {
    return currentSign;
}
