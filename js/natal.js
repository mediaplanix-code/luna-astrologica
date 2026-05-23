// ============================================================
// NATAL.JS — Calcolo e visualizzazione Tema Natale Reale
// Swiss Ephemeris (precisione professionale)
// ============================================================

import { getCurrentUser, getCurrentProfile } from './auth.js';

let cachedChart = null;
const API_URL = 'https://luna-astrologica-api-render.onrender.com';

// ===== CARICA TEMA NATALE =====
export async function loadNatalChart() {
  const profile = getCurrentProfile();
  if (!profile?.birth_latitude || !profile.birth_date) {
    console.warn('⏳ Tema natale: mancano coordinate o data di nascita');
    return null;
  }
  if (cachedChart) {
    console.log('📦 Tema natale: usando cache');
    return cachedChart;
  }

  try {
    // Normalizza birth_time
    let birthTime = profile.birth_time || '12:00';
    if (birthTime.includes(':')) {
      const parts = birthTime.split(':');
      birthTime = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }

    // ✅ FIX: Converte ora locale in UTC
    // 7 luglio 1961: Italia usava CET (UTC+1), NON CEST
    // L'ora legale stabile è stata introdotta nel 1966
    const [h, m] = birthTime.split(':').map(Number);
    const tzOffset = 1; // CET (UTC+1) — corretto per 1961
    const utHour = h - tzOffset;
    const utTime = `${String(utHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    console.log('🕐 Conversione orario:', {
      locale: birthTime,
      timezone: 'CET (UTC+1) — corretto per 1961',
      ut: utTime
    });

    const url = `${API_URL}/api/natal-chart`;
    console.log('🚀 Invio richiesta:', {
      birthDate: profile.birth_date,
      birthTime: utTime,
      lat: profile.birth_latitude,
      lng: profile.birth_longitude
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        birthDate: profile.birth_date,
        birthTime: utTime,
        lat: profile.birth_latitude,
        lng: profile.birth_longitude,
        timezone: 'UTC',
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('❌ Server errore:', res.status, errText);
      throw new Error('Chart failed: ' + res.status);
    }

    cachedChart = await res.json();
    console.log('✅ Tema natale ricevuto:', cachedChart);
    updateNatalChartUI(cachedChart);
    return cachedChart;
  } catch (err) {
    console.error('❌ Natal chart error:', err);
    return null;
  }
}

// ===== AGGIORNA UI =====
export function updateNatalChartUI(chart) {
  if (!chart) return;

  // Aggiorna i 10 pianeti
  chart.planets.forEach(p => {
    const el = document.getElementById(`pos-${p.key}`);
    if (el) el.textContent = `${p.sign} ${p.degree}° ${p.minutes}'`;
  });

  // Aggiorna info extra (Luna e Ascendente)
  const nameEl = document.getElementById('personalName');
  if (nameEl && chart.moonSign) {
    const oldExtra = document.getElementById('natalExtra');
    if (oldExtra) oldExtra.remove();
    const extra = document.createElement('div');
    extra.style.cssText = 'font-size:0.75rem;color:var(--gold);margin-top:0.25rem;';
    extra.id = 'natalExtra';
    extra.innerHTML = `🌙 Luna in <strong>${chart.moonSign}</strong> &nbsp;|&nbsp; ⬆️ Ascendente <strong>${chart.ascendant?.name || '?'}</strong> ${chart.ascendant?.degree || '?'}°`;
    nameEl.parentElement.appendChild(extra);
  }

  // Aggiorna ruota tema natale
  const wheel = document.getElementById('natalWheel');
  if (wheel && chart.ascendant) {
    wheel.innerHTML = `<div style="text-align:center;font-size:0.875rem;line-height:1.4;">
      <div style="font-size:2rem;margin-bottom:0.25rem;">${chart.ascendant.symbol || '?'}</div>
      <div><strong>Ascendente</strong><br>${chart.ascendant.name || '?'} ${chart.ascendant.degree || '?'}°</div>
      <div style="margin-top:0.5rem;font-size:0.75rem;color:var(--text-dim);">MC: ${chart.mc?.name || '?'} ${chart.mc?.degree || '?'}°</div>
    </div>`;
  }

  // Aggiorna case astrologiche
  const housesEl = document.getElementById('acc-houses');
  if (housesEl && chart.houses && chart.houses.length === 12) {
    const items = housesEl.querySelectorAll('.planet-pos');
    items.forEach((el, i) => {
      if (chart.houses[i]) {
        el.textContent = chart.houses[i].name || '?';
      }
    });
  }
}

const SIGNS = ['Ariete','Toro','Gemelli','Cancro','Leone','Vergine','Bilancia','Scorpione','Sagittario','Capricorno','Acquario','Pesci'];
