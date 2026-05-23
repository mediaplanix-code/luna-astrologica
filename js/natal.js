// ============================================================
// NATAL.JS — Calcolo e visualizzazione Tema Natale Reale
// Chiama Render server con Swiss Ephemeris (precisione professionale)
// ============================================================

import { getCurrentUser, getCurrentProfile } from './auth.js';

let cachedChart = null;

const API_URL = 'https://luna-astrologica-api-render.onrender.com';

// ===== CARICA TEMA NATALE =====
export async function loadNatalChart() {
  const profile = getCurrentProfile();
  if (!profile?.birth_latitude || !profile.birth_date) {
    console.warn('⏳ Tema natale: mancano coordinate o data di nascita', {
      lat: profile?.birth_latitude,
      date: profile?.birth_date
    });
    return null;
  }
  if (cachedChart) {
    console.log('📦 Tema natale: usando cache');
    return cachedChart;
  }

  try {
    // ✅ FIX: Normalizza birth_time da "10:30:00+00" a "10:30"
    let birthTime = profile.birth_time || '12:00';
    if (birthTime.includes(':')) {
      const parts = birthTime.split(':');
      birthTime = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }

    const url = `${API_URL}/api/natal-chart`;
    console.log('🚀 Invio richiesta tema natale:', {
      birthDate: profile.birth_date,
      birthTime: birthTime,
      lat: profile.birth_latitude,
      lng: profile.birth_longitude
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        birthDate: profile.birth_date,
        birthTime: birthTime,
        lat: profile.birth_latitude,
        lng: profile.birth_longitude,
        timezone: profile.birth_timezone || 'Europe/Rome',
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

  chart.planets.forEach(p => {
    const el = document.getElementById(`pos-${p.key}`);
    if (el) el.textContent = `${p.sign} ${p.degree}° ${p.minutes}'`;
  });

  const nameEl = document.getElementById('personalName');
  if (nameEl && chart.moonSign) {
    const oldExtra = document.getElementById('natalExtra');
    if (oldExtra) oldExtra.remove();
    const extra = document.createElement('div');
    extra.style.cssText = 'font-size:0.75rem;color:var(--gold);margin-top:0.25rem;';
    extra.id = 'natalExtra';
    extra.innerHTML = `🌙 Luna in <strong>${chart.moonSign}</strong> &nbsp;|&nbsp; ⬆️ Ascendente <strong>${chart.ascendant.sign}</strong> ${chart.ascendant.degree}°`;
    nameEl.parentElement.appendChild(extra);
  }

  const wheel = document.getElementById('natalWheel');
  if (wheel && chart.ascendant) {
    wheel.innerHTML = `<div style="text-align:center;font-size:0.875rem;line-height:1.4;">
      <div style="font-size:2rem;margin-bottom:0.25rem;">${chart.ascendant.symbol}</div>
      <div><strong>Ascendente</strong><br>${chart.ascendant.sign} ${chart.ascendant.degree}°</div>
      <div style="margin-top:0.5rem;font-size:0.75rem;color:var(--text-dim);">MC: ${chart.mc.sign} ${chart.mc.degree}°</div>
    </div>`;
  }

  const houses = document.getElementById('acc-houses');
  if (houses && chart.ascendant) {
    const ascIndex = SIGNS.indexOf(chart.ascendant.sign);
    const houseSigns = [];
    for (let i = 0; i < 12; i++) {
      const idx = (ascIndex + i) % 12;
      houseSigns.push(SIGNS[idx]);
    }
    const items = houses.querySelectorAll('.planet-pos');
    items.forEach((el, i) => {
      if (houseSigns[i]) el.textContent = houseSigns[i];
    });
  }
}

const SIGNS = ['Ariete','Toro','Gemelli','Cancro','Leone','Vergine','Bilancia','Scorpione','Sagittario','Capricorno','Acquario','Pesci'];
