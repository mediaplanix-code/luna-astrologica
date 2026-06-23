// ============================================================
// NATAL.JS — Calcolo tema natale + disegno ruota SVG lato client
// FIX v6: SVG tag complete, stili CSS variabili, viewBox corretto
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

const COMPAT_MAP = {
 'Ariete': ['Leone', 'Sagittario', 'Gemelli'],
 'Toro': ['Vergine', 'Capricorno', 'Cancro'],
 'Gemelli': ['Bilancia', 'Acquario', 'Ariete'],
 'Cancro': ['Scorpione', 'Pesci', 'Toro'],
 'Leone': ['Sagittario', 'Ariete', 'Bilancia'],
 'Vergine': ['Capricorno', 'Toro', 'Scorpione'],
 'Bilancia': ['Acquario', 'Gemelli', 'Leone'],
 'Scorpione': ['Pesci', 'Cancro', 'Vergine'],
 'Sagittario': ['Ariete', 'Leone', 'Acquario'],
 'Capricorno': ['Toro', 'Vergine', 'Pesci'],
 'Acquario': ['Gemelli', 'Bilancia', 'Sagittario'],
 'Pesci': ['Cancro', 'Scorpione', 'Capricorno']
};

const ELEMENT_COLORS = {
 fire: '#FF6B6B', earth: '#4ECDC4', air: '#FFE66D', water: '#45B7D1'
};

const SIGN_ELEMENTS = ['fire','earth','air','water','fire','earth','air','water','fire','earth','air','water'];

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
 console.warn('⏳ Mancano coordinate o data');
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
 lat: profile.birth_latitude, lng: profile.birth_longitude, timezone: 'UTC',
 user_id: profile.id })
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

// ===== CALCOLO ASPETTI =====
function getLon(p) {
 return (SIGN_LONGITUDE[p.sign] || 0) + (p.degree || 0) + ((p.minutes || 0) / 60);
}

function calcAspects(planets) {
 const aspects = [];
 const longs = {};
 planets.forEach(p => { if (p.key && p.sign && p.degree !== undefined) longs[p.key] = getLon(p); });
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

// ===== COMPATIBILITÀ =====
function updateCompatibility(sunSign) {
 const compat = COMPAT_MAP[sunSign];
 if (!compat) return;
 const pills = document.querySelectorAll('.compat-pill');
 let idx = 0;
 pills.forEach(pill => {
 if (pill.textContent.includes('Affinit') || pill.getAttribute('onclick')?.includes('CompatModal')) return;
 if (compat[idx]) {
 const sign = compat[idx];
 const sym = SIGN_SYMBOLS[sign] || '?';
 pill.setAttribute('onclick', `window.app.showCompat('${sign}')`);
 const iconSpan = pill.querySelector('.compat-icon');
 if (iconSpan) {
 iconSpan.textContent = sym;
 let nameSpan = pill.querySelector('.compat-name');
 if (!nameSpan) {
 nameSpan = document.createElement('span');
 nameSpan.className = 'compat-name';
 nameSpan.style.cssText = 'display:block;font-size:0.65rem;color:var(--text-dim);margin-top:0.1rem;';
 pill.appendChild(nameSpan);
 }
 nameSpan.textContent = sign;
 }
 idx++;
 }
 });
}

// ===== DISEGNA RUOTA SVG LATO CLIENT =====
function drawWheelSVG(chart, container) {
 if (!chart.houses || chart.houses.length !== 12) return;

 const size = 900;
 const cx = size / 2;
 const cy = size / 2;
 const rOuter = 440;
 const rSign = 400;
 const rPlanet = 300;
 const rCenter = 140;

 function polar(r, angle) {
 const rad = (angle - 90) * Math.PI / 180;
 return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
 }

 const houseLongs = chart.houses.map(h => {
 return (SIGN_LONGITUDE[h.name] || 0) + (h.degree || 0) + ((h.minutes || 0) / 60);
 });

 const planetLongs = (chart.planets || []).map(p => {
 return (SIGN_LONGITUDE[p.sign] || 0) + (p.degree || 0) + ((p.minutes || 0) / 60);
 });

 const lineColors = {
 fire: '#FF6B6B', earth: '#4ECDC4', air: '#FFE66D', water: '#45B7D1'
 };

 // FIX v6: SVG tag complete, viewBox corretto, stili CSS variabili
 let svgHTML = `<svg viewBox="0 0 ${size} ${size}" style="width:100%;height:auto;max-width:900px;" xmlns="http://www.w3.org/2000/svg">`;
 svgHTML += `<defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
 svgHTML += `<rect width="${size}" height="${size}" fill="transparent"/>`;

 // Cerchio esterno
 svgHTML += `<circle cx="${cx}" cy="${cy}" r="${rOuter}" fill="none" stroke="#333" stroke-width="1"/>`;

 // 12 linee divisorie
 for (let i = 0; i < 12; i++) {
 const start = houseLongs[i];
 const signIdx = Math.floor(start / 30) % 12;
 const element = SIGN_ELEMENTS[signIdx];
 const color = lineColors[element];
 const o = polar(rOuter, start);
 const inn = polar(rCenter, start);
 svgHTML += `<line x1="${o.x}" y1="${o.y}" x2="${inn.x}" y2="${inn.y}" stroke="${color}" stroke-width="1.5" opacity="0.7"/>`;
 }

 // Cerchi interni
 svgHTML += `<circle cx="${cx}" cy="${cy}" r="${rSign}" fill="none" stroke="#444" stroke-width="1"/>`;
 svgHTML += `<circle cx="${cx}" cy="${cy}" r="${rPlanet}" fill="none" stroke="#555" stroke-width="1"/>`;
 svgHTML += `<circle cx="${cx}" cy="${cy}" r="${rCenter}" fill="none" stroke="#666" stroke-width="1"/>`;

 // 12 sezioni: numero casa + SIMBOLO
 for (let i = 0; i < 12; i++) {
 const start = houseLongs[i];
 const end = houseLongs[(i + 1) % 12];
 const mid = (start + end) / 2;
 const signIdx = Math.floor(start / 30) % 12;

 const n = polar(rCenter + 35, mid);
 svgHTML += `<text x="${n.x}" y="${n.y}" text-anchor="middle" dominant-baseline="middle" fill="#888" font-size="14" font-weight="bold">${i + 1}</text>`;

 const s = polar((rSign + rOuter) / 2, mid);
 const sym = SIGN_SYMBOLS[SIGNS[signIdx]] || '?';
 svgHTML += `<text x="${s.x}" y="${s.y}" text-anchor="middle" dominant-baseline="middle" fill="#d4af37" font-size="22" filter="url(#glow)">${sym}</text>`;
 }

 // Pianeti
 const planetSymbols = {'sun':'☉','moon':'☽','mercury':'☿','venus':'♀','mars':'♂','jupiter':'♃','saturn':'♄','uranus':'♅','neptune':'♆','pluto':'♇'};
 const planetColors = {'sun':'#FFD700','moon':'#C0C0C0','mercury':'#A9A9A9','venus':'#FFC0CB','mars':'#FF4500','jupiter':'#DAA520','saturn':'#808080','uranus':'#00CED1','neptune':'#1E90FF','pluto':'#8B008B'};

 (chart.planets || []).forEach((p, idx) => {
 const lon = planetLongs[idx];
 const pt = polar(rPlanet, lon);
 const sym = planetSymbols[p.key] || '●';
 const col = planetColors[p.key] || '#fff';

 svgHTML += `<circle cx="${pt.x}" cy="${pt.y}" r="12" fill="#1a1a2e" stroke="${col}" stroke-width="2"/>`;
 svgHTML += `<text x="${pt.x}" y="${pt.y}" text-anchor="middle" dominant-baseline="middle" fill="${col}" font-size="14" font-weight="bold">${sym}</text>`;

 const dpt = polar(rPlanet + 40, lon);
 const deg = Math.floor(lon % 30);
 const min = Math.floor((lon % 30 - deg) * 60);
 svgHTML += `<text x="${dpt.x}" y="${dpt.y}" text-anchor="middle" dominant-baseline="middle" fill="#888" font-size="11">${deg}°${min}'</text>`;
 });

 // Linee aspetti
 const aspects = calcAspects(chart.planets || []);
 aspects.forEach(asp => {
 const p1 = chart.planets.find(p => PLANET_NAMES[p.key] === asp.planet1);
 const p2 = chart.planets.find(p => PLANET_NAMES[p.key] === asp.planet2);
 if (p1 && p2) {
 const lon1 = (SIGN_LONGITUDE[p1.sign] || 0) + (p1.degree || 0) + ((p1.minutes || 0) / 60);
 const lon2 = (SIGN_LONGITUDE[p2.sign] || 0) + (p2.degree || 0) + ((p2.minutes || 0) / 60);
 const pt1 = polar(rPlanet - 25, lon1);
 const pt2 = polar(rPlanet - 25, lon2);
 let color = '#999';
 if (asp.type === 'congiunzione') color = '#FFD700';
 else if (asp.type === 'trigono') color = '#4ECDC4';
 else if (asp.type === 'quadratura') color = '#FF6B6B';
 else if (asp.type === 'opposizione') color = '#FF6B6B';
 else if (asp.type === 'sestile') color = '#FFE66D';
 svgHTML += `<line x1="${pt1.x}" y1="${pt1.y}" x2="${pt2.x}" y2="${pt2.y}" stroke="${color}" stroke-width="1" opacity="0.6"/>`;
 }
 });

 // Centro
 const asc = chart.ascendant;
 const ascSym = SIGN_SYMBOLS[asc?.name] || '?';
 svgHTML += `<text x="${cx}" y="${cy - 10}" text-anchor="middle" dominant-baseline="middle" fill="#d4af37" font-size="18" font-weight="bold" filter="url(#glow)">${ascSym} Ascendente</text>`;
 svgHTML += `<text x="${cx}" y="${cy + 10}" text-anchor="middle" dominant-baseline="middle" fill="#888" font-size="12">${asc?.name || '?'} ${asc?.degree !== undefined ? asc.degree + '°' : ''}</text>`;
 svgHTML += `<text x="${cx}" y="${cy + 28}" text-anchor="middle" dominant-baseline="middle" fill="#888" font-size="11">MC: ${chart.mc?.name || '?'} ${chart.mc?.degree !== undefined ? chart.mc.degree + '°' : ''}</text>`;

 svgHTML += `</svg>`;
 container.innerHTML = svgHTML;
}

// ===== AGGIORNA UI =====
export function updateNatalChartUI(chart) {
 if (!chart) return;
 const sunPlanet = chart.planets?.find(p => p.key === 'sun');
 const sunSign = sunPlanet ? sunPlanet.sign : null;
 const sunSymbol = sunSign ? (SIGN_SYMBOLS[sunSign] || '?') : '?';

 // 1. Icona segno
 const signIconEl = document.getElementById('personalSignIcon');
 if (signIconEl) signIconEl.textContent = sunSymbol;

 // 2. Nome segno
 document.querySelectorAll('.ph-sign-name').forEach(el => { if (sunSign) el.textContent = sunSign; });

 // 3. Compatibilità
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

 // 5. Aggiorna .personal-astro-line (FIX: no duplicati, aggiorna placeholder esistente)
 const astroLine = document.querySelector('.personal-astro-line');
 if (astroLine) {
 const spans = astroLine.querySelectorAll(':scope > span');
 // spans[0] = Luna, spans[2] = Ascendente, spans[4] = MC
 const moonGold = spans[0]?.querySelector('.astro-gold');
 if (moonGold && chart.moonSign) moonGold.textContent = chart.moonSign;

 const ascGold = spans[2]?.querySelector('.astro-gold');
 if (ascGold && chart.ascendant) {
 const deg = chart.ascendant.degree !== undefined ? chart.ascendant.degree + '°' : '';
 const min = chart.ascendant.minutes !== undefined ? chart.ascendant.minutes + "'" : '';
 ascGold.textContent = `${chart.ascendant.name} ${deg}${min}`;
 }

 const mcGold = spans[4]?.querySelector('.astro-gold');
 if (mcGold && chart.mc) {
 const deg = chart.mc.degree !== undefined ? chart.mc.degree + '°' : '';
 const min = chart.mc.minutes !== undefined ? chart.mc.minutes + "'" : '';
 mcGold.textContent = `${chart.mc.name} ${deg}${min}`;
 }
 }

 // Rimuovi eventuale natalExtra duplicato da versioni precedenti
 const oldExtra = document.getElementById('natalExtra');
 if (oldExtra) oldExtra.remove();

 // 6. RUOTA SVG
 const wheel = document.getElementById('natalWheel');
 if (wheel && chart.houses && chart.houses.length === 12) {
 wheel.style.width = '100%';
 wheel.style.minHeight = '400px';
 wheel.style.display = 'flex';
 wheel.style.alignItems = 'center';
 wheel.style.justifyContent = 'center';
 drawWheelSVG(chart, wheel);
 }

 // 7. Case
 if (chart.houses && chart.houses.length === 12) {
 for (let i = 0; i < 12; i++) {
 const el = document.getElementById(`house-${i + 1}`);
 if (el) el.textContent = chart.houses[i].name || '?';
 }
 }

 // 8. Aspetti
 const aspectsEl = document.getElementById('acc-aspects');
 if (aspectsEl) {
 const container = aspectsEl.querySelector('div[style*="font-size:0.8125rem"]') || aspectsEl;
 container.querySelectorAll('p').forEach(p => p.remove());
 const aspects = calcAspects(chart.planets || []);
 const btns = container.querySelector('div[style*="text-align:center"]');
 if (aspects.length > 0) {
 aspects.forEach(asp => {
 const p = document.createElement('p');
 p.style.marginTop = '0.75rem';
 p.innerHTML = `<strong>${asp.planet1} ${asp.type} ${asp.planet2}</strong> — ${asp.orb}° orb`;
 container.insertBefore(p, btns);
 });
 } else {
 const p = document.createElement('p');
 p.style.marginTop = '0.75rem';
 p.style.color = 'var(--text-dim)';
 p.innerHTML = '<em>🔮 Nessun aspetto significativo rilevato.</em>';
 container.insertBefore(p, btns);
 }
 }

 // 9. Transiti
 const transitsEl = document.getElementById('acc-transits');
 if (transitsEl) {
 const container = transitsEl.querySelector('div[style*="font-size:0.8125rem"]') || transitsEl;
 container.querySelectorAll('p').forEach(p => p.remove());
 const p = document.createElement('p');
 p.style.marginTop = '0.75rem';
 p.innerHTML = '<em>🌙 I transiti vengono aggiornati quotidianamente. Torna domani per le previsioni.</em>';
 p.style.color = 'var(--text-dim)';
 const btns = container.querySelector('div[style*="text-align:center"]');
 container.insertBefore(p, btns);
 }
}
