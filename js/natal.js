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
    // Pulisci birthTime: rimuove "+00", secondi, millisecondi
    let cleanTime = birthTime || '12:00';
    if (cleanTime.includes('+')) cleanTime = cleanTime.split('+')[0];
    if (cleanTime.includes('.')) cleanTime = cleanTime.split('.')[0];
    const partsTime = cleanTime.split(':');
    const h = parseInt(partsTime[0]) || 0;
    const m = parseInt(partsTime[1]) || 0;

    // Se manca timezone o è UTC, restituisci diretto
    if (!timeZone || timeZone === 'UTC' || timeZone === 'Etc/UTC') {
        return {
            date: birthDate,
            time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        };
    }

    // Se timezone è in formato Etc/GMT±X, calcola offset statico
    // Nota: Etc/GMT-1 = UTC+1, Etc/GMT+1 = UTC-1 (convenzione IANA invertita)
    const etcMatch = timeZone.match(/^Etc\/GMT([+-]?\d+)$/);
    if (etcMatch) {
        const offsetHours = -parseInt(etcMatch[1]); // inversione convenzione Etc/GMT
        let utHour = h - offsetHours;
        let utDay = parseInt(birthDate.split('-')[2]);
        let utMonth = parseInt(birthDate.split('-')[1]);
        let utYear = parseInt(birthDate.split('-')[0]);

        // Gestione cambio giorno (indietro)
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
        // Gestione cambio giorno (avanti)
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

    // Per timezone IANA (Europe/Rome, America/New_York, etc.)
    // Usiamo Intl.DateTimeFormat per calcolare l'offset per quella data specifica
    const [year, month, day] = birthDate.split('-').map(Number);

    // Timestamp candidato: assumiamo inizialmente che l'ora locale = UTC naive
    let guess = Date.UTC(year, month - 1, day, h, m);

    // Iterazione per affinare (max 6 cicli, converge in 2-3)
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

        // Se matcha esattamente, abbiamo trovato il timestamp UTC corretto
        if (fYear === year && fMonth === month && fDay === day && fHour === h && fMinute === m) {
            break;
        }

        // Calcola differenza in ms tra desired e actual (entrambi in UTC)
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
        // Normalizza birth_time
        let birthTime = profile.birth_time || '12:00';

        // Usa il timezone salvato dal Worker (es. Europe/Rome, Etc/GMT-1)
        const timeZone = profile.birth_timezone || 'UTC';

        // Converte ora locale in UTC in modo robusto (gestisce DST storico)
        const utc = convertToUTC(profile.birth_date, birthTime, timeZone);

        console.log('🕐 Conversione orario:', {
            locale: birthTime,
            timezone: timeZone,
            utcDate: utc.date,
            utcTime: utc.time
        });

        const url = `${API_URL}/api/natal-chart`;
        console.log('🚀 Invio richiesta:', {
            birthDate: utc.date,
            birthTime: utc.time,
            lat: profile.birth_latitude,
            lng: profile.birth_longitude,
            originalTimezone: timeZone
        });

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

// ===== INVALIDA CACHE (utile dopo modifica profilo) =====
export function invalidateChartCache() {
    cachedChart = null;
    console.log('🗑️ Cache tema natale invalidata');
}

// ===== AGGIORNA UI =====
export function updateNatalChartUI(chart) {
    if (!chart) return;

    // Trova il segno solare dai pianeti
    const sunPlanet = chart.planets?.find(p => p.key === 'sun');
    const sunSign = sunPlanet ? sunPlanet.sign : null;
    const sunSymbol = sunSign ? (SIGN_SYMBOLS[sunSign] || '?') : '?';

    // 1. Aggiorna icona segno in testa alla pagina
    const signIconEl = document.getElementById('personalSignIcon');
    if (signIconEl && sunSymbol) {
        signIconEl.textContent = sunSymbol;
    }

    // 2. Aggiorna nome segno ovunque compare
    document.querySelectorAll('.ph-sign-name').forEach(el => {
        if (sunSign) el.textContent = sunSign;
    });

    // 3. Aggiorna i 10 pianeti
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

    // 4. Aggiorna info extra (Luna e Ascendente)
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

    // 5. Aggiorna ruota tema natale
    const wheel = document.getElementById('natalWheel');
    if (wheel && chart.ascendant) {
        const ascSymbol = SIGN_SYMBOLS[chart.ascendant.name] || '?';
        wheel.innerHTML = `<div style="text-align:center;font-size:0.875rem;line-height:1.4;">
            <div style="font-size:2rem;margin-bottom:0.25rem;">${ascSymbol}</div>
            <div><strong>Ascendente</strong><br>${chart.ascendant.name || '?'} ${chart.ascendant?.degree !== undefined ? chart.ascendant.degree + '°' : ''}</div>
            <div style="margin-top:0.5rem;font-size:0.75rem;color:var(--text-dim);">MC: ${chart.mc?.name || '?'} ${chart.mc?.degree !== undefined ? chart.mc.degree + '°' : ''}</div>
        </div>`;
    }

    // 6. Aggiorna case astrologiche (prima prova con id specifici, poi fallback)
    if (chart.houses && chart.houses.length === 12) {
        let updatedCount = 0;
        for (let i = 0; i < 12; i++) {
            const el = document.getElementById(`house-${i + 1}`);
            if (el) {
                el.textContent = chart.houses[i].name || '?';
                updatedCount++;
            }
        }
        // Fallback se id non presenti
        if (updatedCount === 0) {
            const housesEl = document.getElementById('acc-houses');
            if (housesEl) {
                const items = housesEl.querySelectorAll('.planet-pos');
                items.forEach((el, i) => {
                    if (chart.houses[i]) {
                        el.textContent = chart.houses[i].name || '?';
                    }
                });
            }
        }
    }

    // 7. Aggiorna aspetti (se presenti nel chart)
    if (chart.aspects && Array.isArray(chart.aspects)) {
        const aspectsEl = document.getElementById('acc-aspects');
        if (aspectsEl) {
            const container = aspectsEl.querySelector('div[style*="font-size:0.8125rem"]') || aspectsEl;
            // Mantieni i bottoni, sostituisci solo i paragrafi degli aspetti
            const existingPs = container.querySelectorAll('p');
            existingPs.forEach(p => p.remove());

            chart.aspects.forEach(asp => {
                const p = document.createElement('p');
                p.style.marginTop = '0.75rem';
                p.innerHTML = `<strong style="color:var(--gold);">${asp.planet1} ${asp.type} ${asp.planet2}</strong> — ${asp.sign1 || ''} ${asp.degree1 || ''}°/${asp.sign2 || ''} ${asp.degree2 || ''}° • ${asp.orb || ''}° orb`;
                container.insertBefore(p, container.querySelector('div[style*="text-align:center"]'));
            });
        }
    }

    // 8. Aggiorna transiti (se presenti nel chart)
    if (chart.transits && Array.isArray(chart.transits)) {
        const transitsEl = document.getElementById('acc-transits');
        if (transitsEl) {
            const container = transitsEl.querySelector('div[style*="font-size:0.8125rem"]') || transitsEl;
            const existingPs = container.querySelectorAll('p');
            existingPs.forEach(p => p.remove());

            chart.transits.forEach(tr => {
                const p = document.createElement('p');
                p.style.marginTop = '0.75rem';
                p.innerHTML = `<strong style="color:var(--gold);">${tr.planet} in ${tr.sign}</strong> transita nella tua Casa ${tr.house || '?'}`;
                if (tr.description) {
                    p.innerHTML += ` — ${tr.description}`;
                }
                container.insertBefore(p, container.querySelector('div[style*="text-align:center"]'));
            });
        }
    }
}
