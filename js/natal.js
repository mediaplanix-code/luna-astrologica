// ============================================================
// NATAL.JS — Calcolo e visualizzazione Tema Natale Reale
// Chiama Supabase Edge Function (precisione professionale)
// ============================================================

import { CONFIG } from './config.js';
import { getSupabase, getCurrentUser, getCurrentProfile, loadUserData } from './auth.js';

let cachedChart = null;

// ===== GEOCODING (resta sul Worker Cloudflare) =====
export async function geocodeProfileIfNeeded() {
  const profile = getCurrentProfile();
  const user = getCurrentUser();
  if (!profile || !user) return false;
  if (profile.birth_latitude) return true;
  if (!profile.birth_city || !profile.birth_country) return false;

  try {
    const url = `${CONFIG.WORKER_URL}/api/geocode?city=${encodeURIComponent(profile.birth_city)}&country=${encodeURIComponent(profile.birth_country)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Geocoding failed');
    const data = await res.json();

    if (data.lat != null && data.lng != null) {
      const supabase = getSupabase();
      if (!supabase) return false;

      await supabase.from('profiles').update({
        birth_latitude: data.lat,
        birth_longitude: data.lng,
        birth_timezone: data.timezone,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id);

      await loadUserData();
      return true;
    }
  } catch (err) {
    console.error('Geocoding error:', err);
  }
  return false;
}

// ===== CARICA TEMA NATALE (Supabase Edge Function) =====
export async function loadNatalChart() {
  const profile = getCurrentProfile();
  if (!profile?.birth_latitude || !profile.birth_date) return null;
  if (cachedChart) return cachedChart;

  try {
    const url = `${CONFIG.SUPABASE_URL}/functions/v1/natal-chart`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        birthDate: profile.birth_date,
        birthTime: profile.birth_time || '12:00',
        lat: profile.birth_latitude,
        lng: profile.birth_longitude,
        timezone: profile.birth_timezone,
      }),
    });
    if (!res.ok) throw new Error('Chart failed: ' + res.status);
    cachedChart = await res.json();
    updateNatalChartUI(cachedChart);
    return cachedChart;
  } catch (err) {
    console.error('Natal chart error:', err);
    return null;
  }
}

// ===== AGGIORNA UI CON DATI REALI =====
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
