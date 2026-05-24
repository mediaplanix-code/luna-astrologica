// ============================================================
// NATAL.JS — Calcolo e visualizzazione Tema Natale Reale
// Swiss Ephemeris (precisione professionale)
// FIX: timezone dinamico, DST storico, cambio giorno
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

// ===== CONVERTE ORA LOCALE IN UTC (robusto per DST storico) =====
function convertToUTC(birthDate, birthTime, timeZone) {
    let cleanTime = birthTime || '12:00';
    if (cleanTime.includes('+')) cleanTime = cleanTime.split('+')[0];
    if (cleanTime.includes('.')) cleanTime = cleanTime.split('.')[0];
    const partsTime = cleanTime.split(':');
    const h = parseInt(partsTime[0]) || 0;
    const m = parseInt(partsTime[1]) || 0;

    if (!timeZone || timeZone === 'UTC' || timeZone === 'Etc/UTC') {
        return {
            date: birthDate,
            time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        };
    }

    const etcMatch = timeZone.match(/^Etc\/GMT([+-]?\d+)$/);
    if (etcMatch) {
        const offsetHours = -parseInt(etcMatch[1]);
        let utHour = h - offsetHours;
        let utDay = parseInt(birthDate.split('-')[2]);
        let utMonth = parseInt(birthDate.split('-')[1]);
        let utYear = parseInt(birthDate.split('-')[0]);

        while (utHour < 0) {
            utHour += 24;
            utDay--;
            if (utDay < 1) {
                utMonth--;
                if (utMonth < 1) { utMonth = 12; utYear--; }
                const daysInPrev = new Date(utYear, utMonth, 0).getDate();
                utDay = daysInPrev;
            }
        }
        while (utHour >= 24) {
            utHour -= 24;
            utDay++;
            const daysInMonth = new Date(utYear, utMonth, 0).getDate();
            if (utDay > daysInMonth) {
                utDay = 1;
                utMonth++;
                if (utMonth > 12) { utMonth = 1; utYear++; }
            }
        }
        return {
            date: `${utYear}-${String(utMonth).padStart(2, '0')}-${String(utDay).padStart(2, '0')}`,
            time: `${String(utHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        };
    }

    const [year, month, day] = birthDate.split('-').map(Number);
    let guess = Date.UTC(year, month - 1, day, h, m);

    for (let i = 0; i < 6; i++) {
        const d = new Date(guess);
        const formatted = new Intl.DateTimeFormat('en-US', {
            timeZone: timeZone,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
        }).format(d);

        const parts = formatted.match(/(\d{1,2})\/(\d{1,2})\/(\d{4}),\s*(\d{2}):(\d{2}):(\d{2})/);
        if (!parts) break;

        const [, fMonth, fDay, fYear, fHour, fMinute] = parts.map(Number);
        if (fYear === year && fMonth === month && fDay === day && fHour === h && fMinute === m) {
            break;
        }
        const actual = Date.UTC(fYear, fMonth - 1, fDay, fHour, fMinute);
        const desired = Date.UTC(year, month - 1, day, h, m);
        const diff = desired - actual;
        guess += diff;
    }

    const utcDate = new Date(guess);
    const uYear = utcDate.getUTCFullYear();
    const uMonth = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
    const uDay = String(utcDate.getUTCDate()).padStart(2, '0');
    const uHour = String(utcDate.getUTCHours()).padStart(2, '0');
    const uMinute = String(utcDate.getUTCMinutes()).padStart(2, '0');

    return { date: `${uYear}-${uMonth}-${uDay}`, time: `${uHour}:${uMinute}` };
}

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
        let birthTime = profile.birth_time || '12:00';
        const timeZone = profile.birth_timezone || 'UTC';
        const utc = convertToUTC(profile.birth_date, birthTime, timeZone);

        console.log('🕐 Conversione orario:', {
            locale: birthTime,
            timezone: timeZone,
            utcDate: utc.date,
            utcTime: utc.time
        });

        const url = `${API_URL}/api/natal-chart`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                birthDate: utc.date,
                birthTime: utc.time,
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

export function invalidateChartCache() {
    cachedChart = null;
    console.log('🗑️ Cache tema natale invalidata');
}

// ===== AGGIORNA UI =====
export function updateNatalChartUI(chart) {
    if (!chart) return;

    const sunPlanet = chart.planets?.find(p => p.key === 'sun');
    const sunSign = sunPlanet ? sunPlanet.sign : null;
    const sunSymbol = sunSign ? (SIGN_SYMBOLS[sunSign] || '?') : '?';

    // 1. Icona segno in testa
    const signIconEl = document.getElementById('personalSignIcon');
    if (signIconEl && sunSymbol) {
        signIconEl.textContent = sunSymbol;
    }

    // 2. Nome segno ovunque
    document.querySelectorAll('.ph-sign-name').forEach(el => {
        if (sunSign) el.textContent = sunSign;
    });

    // 3. Pianeti
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

    // 4. Info extra Luna + Ascendente
    const nameEl = document.getElementById('personalName');
    if (nameEl && chart.moonSign) {
        const oldExtra = document.getElementById('natalExtra');
        if (oldExtra) oldExtra.remove();
        const extra = document.createElement('div');
        extra.style.cssText = 'font-size:0.75rem;color:var(--gold);margin-top:0.25rem;';
        extra.id = 'natalExtra';
        extra.innerHTML = `🌙 Luna in <strong>${chart.moonSign}</strong> &nbsp;|&nbsp; ⬆️ Ascendente <strong>${chart.ascendant?.name || '?'}</strong> ${chart.ascendant?.degree !== undefined ? chart.ascendant.degree + '°' : ''}`;
        nameEl.parentElement.appendChild(extra);
    }

    // 5. RUOTA TEMA NATALE — layout visivo a cerchio con 12 case
    const wheel = document.getElementById('natalWheel');
    if (wheel && chart.ascendant && chart.houses) {
        const ascSymbol = SIGN_SYMBOLS[chart.ascendant.name] || '?';
        const mcSymbol = chart.mc?.name ? (SIGN_SYMBOLS[chart.mc.name] || '?') : '?';

        // Costruisci griglia 12 case in cerchio semplificato
        let housesHTML = '';
        if (chart.houses.length === 12) {
            const housePositions = [
                {pos:'top',    label:'Casa I'},   {pos:'topR',   label:'Casa II'},
                {pos:'rightT', label:'Casa III'}, {pos:'right',  label:'Casa IV'},
                {pos:'rightB', label:'Casa V'},   {pos:'bottomR',label:'Casa VI'},
                {pos:'bottom', label:'Casa VII'}, {pos:'bottomL',label:'Casa VIII'},
                {pos:'leftB',  label:'Casa IX'}, {pos:'left',   label:'Casa X'},
                {pos:'leftT',  label:'Casa XI'},{pos:'topL',   label:'Casa XII'}
            ];
            housesHTML = `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.25rem;margin-top:0.75rem;font-size:0.65rem;">`;
            chart.houses.forEach((h, i) => {
                const sym = SIGN_SYMBOLS[h.name] || '?';
                housesHTML += `
                    <div style="text-align:center;padding:0.25rem;background:rgba(255,215,0,0.08);border-radius:4px;">
                        <div style="font-size:1rem;color:var(--gold);">${sym}</div>
                        <div style="color:var(--text-dim);">${h.name || '?'}</div>
                        <div style="font-size:0.6rem;opacity:0.7;">${housePositions[i]?.label || ''}</div>
                    </div>`;
            });
            housesHTML += `</div>`;
        }

        wheel.innerHTML = `
            <div style="text-align:center;padding:0.5rem;">
                <div style="display:flex;align-items:center;justify-content:center;gap:1.5rem;margin-bottom:0.5rem;">
                    <div>
                        <div style="font-size:2.5rem;color:var(--gold);">${ascSymbol}</div>
                        <div style="font-size:0.75rem;color:var(--text-dim);">Ascendente</div>
                        <div style="font-size:0.875rem;font-weight:600;">${chart.ascendant.name || '?'} ${chart.ascendant?.degree !== undefined ? chart.ascendant.degree + '°' : ''}</div>
                    </div>
                    <div style="width:1px;height:3rem;background:var(--gold);opacity:0.3;"></div>
                    <div>
                        <div style="font-size:2.5rem;color:var(--gold);">${mcSymbol}</div>
                        <div style="font-size:0.75rem;color:var(--text-dim);">MC (Casa X)</div>
                        <div style="font-size:0.875rem;font-weight:600;">${chart.mc?.name || '?'} ${chart.mc?.degree !== undefined ? chart.mc.degree + '°' : ''}</div>
                    </div>
                </div>
                ${housesHTML}
            </div>`;
    }

    // 6. Case astrologiche (tabella)
    if (chart.houses && chart.houses.length === 12) {
        let updatedCount = 0;
        for (let i = 0; i < 12; i++) {
            const el = document.getElementById(`house-${i + 1}`);
            if (el) {
                el.textContent = chart.houses[i].name || '?';
                updatedCount++;
            }
        }
        if (updatedCount === 0) {
            const housesEl = document.getElementById('acc-houses');
            if (housesEl) {
                const items = housesEl.querySelectorAll('.planet-pos');
                items.forEach((el, i) => {
                    if (chart.houses[i]) el.textContent = chart.houses[i].name || '?';
                });
            }
        }
    }

    // 7. Aspetti — se il server non li manda, mostra messaggio invece di dati finti
    const aspectsEl = document.getElementById('acc-aspects');
    if (aspectsEl) {
        const container = aspectsEl.querySelector('div[style*="font-size:0.8125rem"]') || aspectsEl;
        const existingPs = container.querySelectorAll('p');
        existingPs.forEach(p => p.remove());

        if (chart.aspects && Array.isArray(chart.aspects) && chart.aspects.length > 0) {
            chart.aspects.forEach(asp => {
                const p = document.createElement('p');
                p.style.marginTop = '0.75rem';
                p.innerHTML = `<strong style="color:var(--gold);">${asp.planet1} ${asp.type} ${asp.planet2}</strong> — ${asp.sign1 || ''} ${asp.degree1 || ''}°/${asp.sign2 || ''} ${asp.degree2 || ''}° • ${asp.orb || ''}° orb`;
                container.insertBefore(p, container.querySelector('div[style*="text-align:center"]'));
            });
        } else {
            const p = document.createElement('p');
            p.style.marginTop = '0.75rem';
            p.style.color = 'var(--text-dim)';
            p.innerHTML = `🔮 <em>Gli aspetti planetari verranno calcolati al prossimo aggiornamento del server.</em>`;
            container.insertBefore(p, container.querySelector('div[style*="text-align:center"]'));
        }
    }

    // 8. Transiti — se il server non li manda, mostra messaggio
    const transitsEl = document.getElementById('acc-transits');
    if (transitsEl) {
        const container = transitsEl.querySelector('div[style*="font-size:0.8125rem"]') || transitsEl;
        const existingPs = container.querySelectorAll('p');
        existingPs.forEach(p => p.remove());

        if (chart.transits && Array.isArray(chart.transits) && chart.transits.length > 0) {
            chart.transits.forEach(tr => {
                const p = document.createElement('p');
                p.style.marginTop = '0.75rem';
                p.innerHTML = `<strong style="color:var(--gold);">${tr.planet} in ${tr.sign}</strong> transita nella tua Casa ${tr.house || '?'}`;
                if (tr.description) p.innerHTML += ` — ${tr.description}`;
                container.insertBefore(p, container.querySelector('div[style*="text-align:center"]'));
            });
        } else {
            const p = document.createElement('p');
            p.style.marginTop = '0.75rem';
            p.style.color = 'var(--text-dim)';
            p.innerHTML = `🌙 <em>I transiti planetari verranno aggiornati automaticamente quando il server sarà online.</em>`;
            container.insertBefore(p, container.querySelector('div[style*="text-align:center"]'));
        }
    }
}
