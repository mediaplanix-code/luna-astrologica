// ============================================================
// PROFILE.JS — Gestione profilo, tema natale, compatibilità
// Per ora usa dati mock. Step C: calcolo reale con Swiss Ephemeris
// ============================================================

import { getSunSign, getSignSymbol } from './utils.js';

// ===== APRI MODAL COMPATIBILITÀ =====
export function openCompatModal() {
    const modal = document.getElementById("compatModal");
    if (modal) modal.classList.add("active");
}

export function closeCompatModal() {
    const modal = document.getElementById("compatModal");
    if (modal) modal.classList.remove("active");
}

export function handleCompatSubmit(e) {
    e.preventDefault();
    closeCompatModal();
    alert("Compatibilità calcolata! (funzionalità completa nello step C)");
}

// ===== MOSTRA COMPATIBILITÀ =====
export function showCompat(sign) {
    alert(`Compatibilità con ${sign} — calcolo in arrivo nello step C`);
}

// ===== MODIFICA PROFILO =====
export function openProfileEdit() {
    alert("Modifica profilo — funzionalità in arrivo nello step C");
}

// ===== TOGGLE ACCORDION =====
export function toggleAccordion(header, bodyId) {
    const body = document.getElementById(bodyId);
    if (!body) return;
    const isOpen = body.classList.contains("open");
    body.classList.toggle("open", !isOpen);
    header.classList.toggle("open", !isOpen);
}
