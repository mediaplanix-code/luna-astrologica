// ============================================================
// UTILS.JS — Funzioni utility usate da TUTTI i moduli
// Nessuna dipendenza da altri moduli
// ============================================================

import { ZODIAC_SIGNS } from './config.js';

// ----- Calcolo segno solare -----
export function getSunSign(dateStr) {
    if (!dateStr) return "Scorpione";
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = d.getMonth() + 1;

    if ((month === 3  && day >= 21) || (month === 4  && day <= 19)) return "Ariete";
    if ((month === 4  && day >= 20) || (month === 5  && day <= 20)) return "Toro";
    if ((month === 5  && day >= 21) || (month === 6  && day <= 20)) return "Gemelli";
    if ((month === 6  && day >= 21) || (month === 7  && day <= 22)) return "Cancro";
    if ((month === 7  && day >= 23) || (month === 8  && day <= 22)) return "Leone";
    if ((month === 8  && day >= 23) || (month === 9  && day <= 22)) return "Vergine";
    if ((month === 9  && day >= 23) || (month === 10 && day <= 22)) return "Bilancia";
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "Scorpione";
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "Sagittario";
    if ((month === 12 && day >= 22) || (month === 1  && day <= 19)) return "Capricorno";
    if ((month === 1  && day >= 20) || (month === 2  && day <= 18)) return "Acquario";
    return "Pesci";
}

export function getSignSymbol(sign) {
    return ZODIAC_SIGNS[sign]?.symbol || "✦";
}

export function getSignData(sign) {
    return ZODIAC_SIGNS[sign] || null;
}

// ----- Formattazione date -----
export function formatDateIT(dateStr) {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleDateString("it-IT", {
        day: "numeric", month: "long", year: "numeric"
    });
}

export function formatTime(timeStr) {
    return timeStr || "--";
}

// ----- DOM Helpers -----
export function $(id) { return document.getElementById(id); }

export function showEl(id) {
    const el = $(id);
    if (el) el.classList.remove("hidden");
}

export function hideEl(id) {
    const el = $(id);
    if (el) el.classList.add("hidden");
}

export function toggleEl(id, show) {
    show ? showEl(id) : hideEl(id);
}

export function setText(id, text) {
    const el = $(id);
    if (el) el.textContent = text;
}

export function setHTML(id, html) {
    const el = $(id);
    if (el) el.innerHTML = html;
}

// ----- Alert system -----
export function showAlert(ctx, type, msg) {
    if (ctx === "auth") {
        const elId = type === "error" ? "authError" : "authSuccess";
        const el = $(elId);
        if (el) {
            el.textContent = msg;
            el.classList.add("active");
        }
    }
}

export function hideAlerts() {
    document.querySelectorAll(".alert").forEach(a => a.classList.remove("active"));
}

// ----- Scroll -----
export function scrollToTop() {
    window.scrollTo(0, 0);
}

// ----- Debounce -----
export function debounce(fn, ms) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}
