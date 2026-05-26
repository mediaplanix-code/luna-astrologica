// ============================================================
// TRANSITS.JS — Carica transiti reali dal server Render
// File separato, non tocca natal.js
// VERSIONE ITALIANA — elimina testo statico placeholder
// ============================================================

import { getCurrentUser } from './auth.js';

const API_URL = 'https://luna-astrologica-api-render.onrender.com';

// Mappa pianeti: inglese → italiano
const PLANET_NAMES = {
  sun: '☉ Sole',
  moon: '☽ Luna',
  mercury: '☿ Mercurio',
  venus: '♀ Venere',
  mars: '♂ Marte',
  jupiter: '♃ Giove',
  saturn: '♄ Saturno',
  uranus: '♅ Urano',
  neptune: '♆ Nettuno',
  pluto: '♇ Plutone'
};

// Mappa segni: già italiani dall'endpoint
const SIGN_NAMES = {
  'Ariete': '♈ Ariete',
  'Toro': '♉ Toro',
  'Gemelli': '♊ Gemelli',
  'Cancro': '♋ Cancro',
  'Leone': '♌ Leone',
  'Vergine': '♍ Vergine',
  'Bilancia': '♎ Bilancia',
  'Scorpione': '♏ Scorpione',
  'Sagittario': '♐ Sagittario',
  'Capricorno': '♑ Capricorno',
  'Acquario': '♒ Acquario',
  'Pesci': '♓ Pesci'
};

// Mappa aspetti: già italiani dall'endpoint
const ASPECT_NAMES = {
  'congiunzione': '🔗 Congiunzione',
  'sestile': '✡️ Sestile',
  'quadrato': '□ Quadrato',
  'trigono': '△ Trigono',
  'opposizione': '☍ Opposizione',
  'quincunx': '⚻ Quincunx'
};

function getPlanetName(key) {
  return PLANET_NAMES[key] || key;
}

function getSignName(sign) {
  return SIGN_NAMES[sign] || sign;
}

function getAspectName(aspect) {
  return ASPECT_NAMES[aspect] || aspect;
}

function getNatalPlanetName(key) {
  return PLANET_NAMES[key] || key;
}

function formatDegree(deg) {
  const d = Math.floor(deg % 30);
  const m = Math.floor((deg % 30 - d) * 60);
  return `${d}° ${m.toString().padStart(2, '0')}'`;
}

export async function loadTransits() {
  const user = getCurrentUser();
  if (!user) {
    console.log('Transiti: utente non loggato');
    return;
  }

  const transitsEl = document.getElementById('acc-transits');
  if (!transitsEl) return;

  // Trova il container interno
  const container = transitsEl.querySelector('div[style*="font-size:0.8125rem"]') || transitsEl;

  // 🗑️ ELIMINA TESTO STATICO PLACEHOLDER
  const staticText = container.querySelector('p');
  if (staticText && staticText.textContent.includes('Torna domani')) {
    staticText.style.display = 'none';
  }

  // Rimuovi vecchi paragrafi transiti
  container.querySelectorAll('p.transit-real').forEach(p => p.remove());

  try {
    const res = await fetch(`${API_URL}/api/transits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id })
    });

    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    // Crea paragrafo con i transiti
    const p = document.createElement('p');
    p.className = 'transit-real';
    p.style.marginTop = '0.75rem';

    if (data.transitsToday && data.transitsToday.length > 0) {
      let html = '<div style="display:grid;gap:0.5rem;">';

      data.transitsToday.forEach(t => {
        const planetName = getPlanetName(t.planet);
        const signName = getSignName(t.sign);
        const aspects = t.aspectsToNatal.map(a => {
          const aspectName = getAspectName(a.aspect);
          const natalPlanet = getNatalPlanetName(a.natalPlanet);
          return `${aspectName} ${natalPlanet} (orb ${a.orb}°)`;
        }).join(', ');

        html += `
          <div style="padding:0.5rem;background:rgba(245,158,11,0.1);border-radius:0.5rem;border-left:3px solid var(--gold);">
            <strong style="color:var(--gold);">${planetName}</strong> 
            in <strong>${signName}</strong> ${formatDegree(t.degree)} 
            <span style="color:var(--text-dim);font-size:0.75rem;">🏠 Casa ${t.house}</span>
            ${aspects ? `<br><small style="color:var(--text-dim);">↳ ${aspects}</small>` : ''}
          </div>
        `;
      });

      html += '</div>';

      // Aggiungi info data e eventi
      if (data.date && data.eventsFound) {
        html += `<div style="margin-top:0.5rem;font-size:0.75rem;color:var(--text-dim);text-align:center;">
          📅 Transiti del ${new Date(data.date).toLocaleDateString('it-IT')} — 
          ${data.eventsFound} eventi astrologici nei prossimi 90 giorni
        </div>`;
      }

      p.innerHTML = html;
    } else {
      p.innerHTML = '<em style="color:var(--text-dim);">🌙 Nessun transito significativo oggi.</em>';
    }

    // Inserisci prima dei bottoni
    const btns = container.querySelector('div[style*="text-align:center"]');
    if (btns) {
      container.insertBefore(p, btns);
    } else {
      container.appendChild(p);
    }

  } catch (err) {
    console.error('Transiti error:', err);
    const p = document.createElement('p');
    p.className = 'transit-real';
    p.style.marginTop = '0.75rem';
    p.innerHTML = '<em style="color:var(--text-dim);">🌙 Transiti in aggiornamento...</em>';
    const btns = container.querySelector('div[style*="text-align:center"]');
    if (btns) container.insertBefore(p, btns);
  }
}
