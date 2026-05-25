// ============================================================
// TRANSITS.JS — Carica transiti reali dal server Render
// File separato, non tocca natal.js
// ============================================================

import { getCurrentUser } from './auth.js';

const API_URL = 'https://luna-astrologica-api-render.onrender.com';

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
  
  // Rimuovi vecchi paragrafi
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
        const aspects = t.aspectsToNatal.map(a => 
          `${a.aspect} ${a.natalPlanet} (${a.orb}°)`
        ).join(', ');
        html += `
          <div style="padding:0.5rem;background:rgba(245,158,11,0.1);border-radius:0.5rem;border-left:3px solid var(--gold);">
            <strong style="color:var(--gold);text-transform:capitalize;">${t.planet}</strong> 
            in <strong>${t.sign}</strong> ${Math.floor(t.degree % 30)}° 
            <span style="color:var(--text-dim);font-size:0.75rem;">Casa ${t.house}</span>
            ${aspects ? `<br><small style="color:var(--text-dim);">↳ ${aspects}</small>` : ''}
          </div>
        `;
      });
      html += '</div>';
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
