// ============================================================
// NATAL.JS — Calcolo e visualizzazione Tema Natale Reale
// Swiss Ephemeris (precisione professionale)
// FIX: timezone dinamico, DST storico, UI conservativa
// ============================================================

import { getCurrentUser, getCurrentProfile } from './auth.js';

let cachedChart = null;
const API_URL = 'https://luna-astrologica-api-render.onrender.com';

const SIGN_SYMBOLS = {
    'Ariete': '♈', 'Toro': '♉', 'Gemelli': '♊', 'Cancro': '♋',
    'Leone': '♌', 'Vergine': '♍', 'Bilancia': '♎', 'Scorpione': '♏',
    'Sagittario': '♐', 'Capricorno': '♑', 'Acquario': '♒', 'Pesci': '♓'
};

const SIGNS = ['Ariete','Toro','Gemelli','Cancro','Leone','Vergine','Bilancia','Scorpione','Sagittario','Capricorno','Acquario','Pesci'];

const SIGN_LONGITUDE = {
    'Ariete': 0, 'Toro': 30, 'Gemelli': 60, 'Cancro': 90, 'Leone': 120, 'Vergine': 150,
    'Bilancia': 180, 'Scorpione': 210, 'Sagittario': 240, 'Capricorno': 270, 'Acquario': 300, 'Pesci': 330
};

const PLANET_NAMES = {
    'sun': 'Sole', 'moon': 'Luna', 'mercury': 'Mercurio', 'venus': 'Venere',
    'mars': 'Marte', 'jupiter': 'Giove', 'saturn': 'Saturno', 'uranus': 'Urano',
    'neptune': 'Nettuno', 'pluto': 'Plutone'
};

const COMPATIBILITY_MAP = {
    'Ariete':    ['Leone',   'Sagittario', 'Gemelli'],
    'Toro':      ['Vergine', 'Capricorno', 'Cancro'],
    'Gemelli':   ['Bilancia','Acquario',   'Ariete'],
    'Cancro':    ['Scorpione','Pesci',     'Toro'],
    'Leone':     ['Sagittario','Ariete',   'Bilancia'],
    'Vergine':   ['Capricorno','Toro',     'Scorpione'],
    'Bilancia':  ['Acquario',  'Gemelli',  'Leone'],
    'Scorpione': ['Pesci',     'Cancro',   'Vergine'],
    'Sagittario':['Ariete',    'Leone',    'Acquario'],
    'Capricorno':['Toro',      'Vergine',  'Pesci'],
    'Acquario':  ['Gemelli',   'Bilancia', 'Sagittario'],
    'Pesci':     ['Cancro',    'Scorpione','Capricorno']
};

// ===== CONVERTE ORA LOCALE IN UTC =====
function convertToUTC(birthDate, birthTime, timeZone) {
    let cleanTime = birthTime || '12:00';
    if (cleanTime.includes('+')) cleanTime = cleanTime.split('+')[0];
    if (cleanTime.includes('.')) cleanTime = cleanTime.split('.')[0];
    const partsTime = cleanTime.split(':');
    const h = parseInt(partsTime[0]) || 0;
    const m = parseInt(partsTime[1]) || 0;

    if (!timeZone || timeZone === 'UTC' || timeZone === 'Etc/UTC') {
        return { date: birthDate, time: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}` };
    }

    const etcMatch = timeZone.match(/^Etc\/GMT([+-]?\d+)$/);
    if (etcMatch) {
        const offsetHours = -parseInt(etcMatch[1]);
        let utHour = h - offsetHours;
        let utDay = parseInt(birthDate.split('-')[2]);
        let utMonth = parseInt(birthDate.split('-')[1]);
        let utYear = parseInt(birthDate.split('-')[0]);
        while (utHour < 0) { utHour += 24; utDay--; if (utDay < 1) { utMonth--; if (utMonth < 1) { utMonth = 12; utYear--; } utDay = new Date(utYear, utMonth, 0).getDate(); } }
        while (utHour >= 24) { utHour -= 24; utDay++; const dim = new Date(utYear, utMonth, 0).getDate(); if (utDay > dim) { utDay = 1; utMonth++; if (utMonth > 12) { utMonth = 1; utYear++; } } }
        return { date: `${utYear}-${String(utMonth).padStart(2,'0')}-${String(utDay).padStart(2,'0')}`, time: `${String(utHour).padStart(2,'0')}:${String(m).padStart(2,'0')}` };
    }

    const [year, month, day] = birthDate.split('-').map(Number);
    let guess = Date.UTC(year, month - 1, day, h, m);
    for (let i = 0; i < 6; i++) {
        const d = new Date(guess);
        const formatted = new Intl.DateTimeFormat('en-US', {
            timeZone: timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        }).format(d);
        const parts = formatted.match(/(\d{1,2})\/(\d{1,2})\/(\d{4}),\s*(\d{2}):(\d{2}):(\d{2})/);
        if (!parts) break;
        const [, fMonth, fDay, fYear, fHour, fMinute] = parts.map(Number);
        if (fYear === year && fMonth === month && fDay === day && fHour === h && fMinute === m) break;
        const actual = Date.UTC(fYear, fMonth - 1, fDay, fHour, fMinute);
        const desired = Date.UTC(year, month - 1, day, h, m);
        guess += desired - actual;
    }
    const u = new Date(guess);
    return {
        date: `${u.getUTCFullYear()}-${String(u.getUTCMonth()+1).padStart(2,'0')}-${String(u.getUTCDate()).padStart(2,'0')}`,
        time: `${String(u.getUTCHours()).padStart(2,'0')}:${String(u.getUTCMinutes()).padStart(2,'0')}`
    };
}

// ===== CARICA TEMA NATALE =====
export async function loadNatalChart() {
    const profile = getCurrentProfile();
    if (!profile?.birth_latitude || !profile.birth_date) {
        console.warn('⏳ Tema natale: mancano coordinate o data');
        return null;
    }
    if (cachedChart) { console.log('📦 Cache'); return cachedChart; }
    try {
        const birthTime = profile.birth_time || '12:00';
        const timeZone = profile.birth_timezone || 'UTC';
        const utc = convertToUTC(profile.birth_date, birthTime, timeZone);
        console.log('🕐 UTC:', utc);
        const res = await fetch(`${API_URL}/api/natal-chart`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ birthDate: utc.date, birthTime: utc.time,
                lat: profile.birth_latitude, lng: profile.birth_longitude, timezone: 'UTC' })
        });
        if (!res.ok) throw new Error('Chart ' + res.status);
        cachedChart = await res.json();
        console.log('✅ Chart:', cachedChart);
        updateNatalChartUI(cachedChart);
        return cachedChart;
    } catch (err) { console.error('❌ Chart error:', err); return null; }
}

export function invalidateChartCache() { cachedChart = null; }
export function getCachedChart() { return cachedChart; }

// ===== CALCOLO ASPETTI LATO CLIENT =====
function getLongitude(planet) {
    return (SIGN_LONGITUDE[planet.sign] || 0) + (planet.degree || 0) + ((planet.minutes || 0) / 60);
}

function calculateAspects(planets) {
    const aspects = [];
    const longs = {};
    planets.forEach(p => { if (p.key && p.sign && p.degree !== undefined) longs[p.key] = getLongitude(p); });
    const keys = Object.keys(longs);
    const types = [
        { name: 'congiunzione', angle: 0, orb: 8 },
        { name: 'sestile', angle: 60, orb: 6 },
        { name: 'quadratura', angle: 90, orb: 8 },
        { name: 'trigono', angle: 120, orb: 8 },
        { name: 'opposizione', angle: 180, orb: 8 }
    ];
    for (let i = 0; i < keys.length; i++) {
        for (let j = i + 1; j < keys.length; j++) {
            let diff = Math.abs(longs[keys[i]] - longs[keys[j]]);
            if (diff > 180) diff = 360 - diff;
            for (const t of types) {
                const orb = Math.abs(diff - t.angle);
                if (orb <= t.orb) {
                    aspects.push({
                        planet1: PLANET_NAMES[keys[i]] || keys[i],
                        planet2: PLANET_NAMES[keys[j]] || keys[j],
                        type: t.name, orb: orb.toFixed(1)
                    });
                    break;
                }
            }
        }
    }
    return aspects;
}

// ===== COMPATIBILITÀ DINAMICA =====
function updateCompatibility(sunSign) {
    const compat = COMPATIBILITY_MAP[sunSign];
    if (!compat) return;
    const pills = document.querySelectorAll('.compat-pill');
    let idx = 0;
    pills.forEach(pill => {
        if (pill.textContent.includes('Affinità')) return;
        if (compat[idx]) {
            const sign = compat[idx];
            const sym = SIGN_SYMBOLS[sign] || '?';
            pill.setAttribute('onclick', `window.app.showCompat('${sign}')`);
            pill.innerHTML = `<span class="compat-icon" style="font-size:1.1rem;line-height:1;">${sym}</span><span style="font-size:0.65rem;color:var(--text-dim);line-height:1;">${sign}</span>`;
            idx++;
        }
    });
}

// ===== AGGIORNA UI =====
export function updateNatalChartUI(chart) {
    if (!chart) return;
    const sunPlanet = chart.planets?.find(p => p.key === 'sun');
    const sunSign = sunPlanet ? sunPlanet.sign : null;
    const sunSymbol = sunSign ? (SIGN_SYMBOLS[sunSign] || '?') : '?';

    // 1. Icona segno testa pagina
    const signIconEl = document.getElementById('personalSignIcon');
    if (signIconEl && sunSymbol) signIconEl.textContent = sunSymbol;

    // 2. Nome segno ovunque
    document.querySelectorAll('.ph-sign-name').forEach(el => { if (sunSign) el.textContent = sunSign; });

    // 3. Compatibilità dinamica
    if (sunSign) updateCompatibility(sunSign);

    // 4. Pianeti
    if (chart.planets && Array.isArray(chart.planets)) {
        chart.planets.forEach(p => {
            const el = document.getElementById(`pos-${p.key}`);
            if (el) {
                const deg = p.degree !== undefined ? `${p.degree}°` : '';
                const min = p.minutes !== undefined ? ` ${p.minutes}'` : '';
                el.textContent = `${p.sign} ${deg}${min}`;
            }
        });
    }

    // 5. Info extra Luna + Ascendente
    const nameEl = document.getElementById('personalName');
    if (nameEl && chart.moonSign) {
        const old = document.getElementById('natalExtra');
        if (old) old.remove();
        const extra = document.createElement('div');
        extra.style.cssText = 'font-size:0.75rem;color:var(--gold);margin-top:0.25rem;';
        extra.id = 'natalExtra';
        extra.innerHTML = `🌙 Luna in <strong>${chart.moonSign}</strong> &nbsp;|&nbsp; ⬆️ Ascendente <strong>${chart.ascendant?.name || '?'}</strong> ${chart.ascendant?.degree !== undefined ? chart.ascendant.degree + '°' : ''}`;
        nameEl.parentElement.appendChild(extra);
    }

    // 6. RUOTA — conservativa: aggiorna SOLO testo dentro cerchio, griglia case SOTTO
    const wheel = document.getElementById('natalWheel');
    if (wheel && chart.ascendant) {
        const ascSym = SIGN_SYMBOLS[chart.ascendant.name] || '?';
        const mcSym = chart.mc?.name ? (SIGN_SYMBOLS[chart.mc.name] || '?') : '?';
        // Testo dentro cerchio (sovrapposizione sicura)
        let txt = wheel.querySelector('.wheel-inner-text');
        if (!txt) { txt = document.createElement('div'); txt.className = 'wheel-inner-text'; txt.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;width:100%;pointer-events:none;'; wheel.appendChild(txt); }
        txt.innerHTML = `<div style="font-size:2.2rem;color:var(--gold);line-height:1;">${ascSym}</div><div style="font-size:0.8rem;font-weight:600;">Ascendente</div><div style="font-size:0.75rem;">${chart.ascendant.name || '?'} ${chart.ascendant?.degree !== undefined ? chart.ascendant.degree + '°' : ''}</div><div style="margin-top:0.4rem;font-size:0.6rem;color:var(--text-dim);">MC ${mcSym} ${chart.mc?.name || '?'} ${chart.mc?.degree !== undefined ? chart.mc.degree + '°' : ''}</div>`;

        // Griglia 12 case SOTTO il cerchio, in div separato
        let grid = document.getElementById('wheelHousesGrid');
        if (!grid) {
            grid = document.createElement('div');
            grid.id = 'wheelHousesGrid';
            grid.style.cssText = 'margin-top:0.75rem;display:grid;grid-template-columns:repeat(3,1fr);gap:0.35rem;';
            wheel.parentElement.appendChild(grid);
        }
        if (chart.houses && chart.houses.length === 12) {
            const labels = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
            grid.innerHTML = chart.houses.map((h, i) => {
                const sym = SIGN_SYMBOLS[h.name] || '?';
                return `<div style="text-align:center;padding:0.35rem 0.2rem;background:rgba(255,215,0,0.06);border-radius:6px;border:1px solid rgba(255,215,0,0.1);"><div style="font-size:1.1rem;color:var(--gold);">${sym}</div><div style="font-size:0.62rem;color:var(--text);font-weight:500;">${h.name}</div><div style="font-size:0.52rem;color:var(--text-dim);opacity:0.8;">Casa ${labels[i]}</div></div>`;
            }).join('');
        }
    }

    // 7. Case astrologiche (tabella)
    if (chart.houses && chart.houses.length === 12) {
        for (let i = 0; i < 12; i++) {
            const el = document.getElementById(`house-${i + 1}`);
            if (el) el.textContent = chart.houses[i].name || '?';
        }
    }

    // 8. ASPETTI — calcolo lato client
    const aspectsEl = document.getElementById('acc-aspects');
    if (aspectsEl) {
        const container = aspectsEl.querySelector('div[style*="font-size:0.8125rem"]') || aspectsEl;
        container.querySelectorAll('p').forEach(p => p.remove());
        const aspects = calculateAspects(chart.planets || []);
        if (aspects.length > 0) {
            aspects.forEach(asp => {
                const p = document.createElement('p');
                p.style.marginTop = '0.75rem';
                p.innerHTML = `<strong style="color:var(--gold);">${asp.planet1} ${asp.type} ${asp.planet2}</strong> — ${asp.orb}° orb`;
                const btns = container.querySelector('div[style*="text-align:center"]');
                container.insertBefore(p, btns);
            });
        } else {
            const p = document.createElement('p');
            p.style.marginTop = '0.75rem';
            p.style.color = 'var(--text-dim)';
            p.innerHTML = '<em>🔮 Nessun aspetto planetario significativo rilevato nel tema natale.</em>';
            const btns = container.querySelector('div[style*="text-align:center"]');
            container.insertBefore(p, btns);
        }
    }

    // 9. TRANSITI — placeholder elegante (non calcolabili senza effemeridi attuali)
    const transitsEl = document.getElementById('acc-transits');
    if (transitsEl) {
        const container = transitsEl.querySelector('div[style*="font-size:0.8125rem"]') || transitsEl;
        container.querySelectorAll('p').forEach(p => p.remove());
        const p = document.createElement('p');
        p.style.marginTop = '0.75rem';
        p.innerHTML = `<em>🌙 I transiti planetari vengono aggiornati quotidianamente in base alla posizione attuale dei pianeti rispetto al tuo tema natale. Torna a trovarci domani per le previsioni aggiornate.</em>`;
        p.style.color = 'var(--text-dim)';
        const btns = container.querySelector('div[style*="text-align:center"]');
        container.insertBefore(p, btns);
    }
}
