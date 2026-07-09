import { CONFIG } from './config.js';
import { $, state } from './utils.js';

let natalLoaded = false;

export async function loadNatalChart() {
  if (natalLoaded) return;
  if (!state.profile?.birth_date) return;

  $('#natal-loading').classList.remove('hidden');
  $('#natal-result').classList.add('hidden');
  $('#natal-error').classList.add('hidden');

  const sb = await (await import('./config.js')).getSupabase();

  // 1. Controlla se esiste già in DB
  try {
    const { data: existing } = await sb
      .from(CONFIG.TABLES.NATAL_CHARTS)
      .select('*')
      .eq('user_id', state.user.id)
      .single();

    if (existing) {
      renderNatal(existing);
      natalLoaded = true;
      return;
    }
  } catch (e) { /* non esiste, procedi */ }

  // 2. Chiama API e salva
  try {
    const params = new URLSearchParams({
      birth_date: state.profile.birth_date,
      birth_time: state.profile.birth_time,
      birth_place: state.profile.birth_place
    });

    const res = await fetch(`${CONFIG.API_BASE}/api/natal-chart?${params}`, {
      headers: { 'Authorization': `Bearer ${state.session.access_token}` }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Salva in DB
    await sb.from(CONFIG.TABLES.NATAL_CHARTS).insert({
      user_id: state.user.id,
      chart_data: data,
      created_at: new Date().toISOString()
    });

    renderNatal(data);
    natalLoaded = true;
  } catch (err) {
    console.error('Natal chart error:', err);
    $('#natal-loading').classList.add('hidden');
    $('#natal-error').classList.remove('hidden');
  }
}

function renderNatal(data) {
  $('#natal-loading').classList.add('hidden');
  $('#natal-result').classList.remove('hidden');

  const chart = data.chart_data || data;

  $('#natal-sun').textContent = chart.sun || chart.sun_sign || '—';
  $('#natal-moon').textContent = chart.moon || chart.moon_sign || '—';
  $('#natal-asc').textContent = chart.ascendant || chart.asc || '—';
  $('#natal-mercury').textContent = chart.mercury || '—';
  $('#natal-venus').textContent = chart.venus || '—';
  $('#natal-mars').textContent = chart.mars || '—';
  $('#natal-jupiter').textContent = chart.jupiter || '—';
  $('#natal-saturn').textContent = chart.saturn || '—';

  $('#natal-chart-svg').innerHTML = generateZodiacWheel(chart);
  $('#natal-interpretation').textContent = chart.interpretation || 
    'Il tuo tema natale rivela la tua essenza unica. Ogni pianeta, segno e casa racconta una parte del tuo percorso cosmico.';
}

function generateZodiacWheel(data) {
  const size = 280;
  const cx = size / 2, cy = size / 2, r = 120;
  let svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
  svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#F59E0B" stroke-width="1.5" opacity="0.4"/>`;
  svg += `<circle cx="${cx}" cy="${cy}" r="${r-30}" fill="none" stroke="#F59E0B" stroke-width="0.5" opacity="0.2"/>`;

  for (let i = 0; i < 12; i++) {
    const angle = (i * 30 - 90) * Math.PI / 180;
    const x1 = cx + (r-30) * Math.cos(angle);
    const y1 = cy + (r-30) * Math.sin(angle);
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#F59E0B" stroke-width="0.5" opacity="0.3"/>`;
  }

  const planets = [
    { key: 'sun', label: '☉', color: '#FCD34D' },
    { key: 'moon', label: '☽', color: '#E2E8F0' },
    { key: 'mercury', label: '☿', color: '#94A3B8' },
    { key: 'venus', label: '♀', color: '#F472B6' },
    { key: 'mars', label: '♂', color: '#EF4444' },
    { key: 'jupiter', label: '♃', color: '#F59E0B' },
    { key: 'saturn', label: '♄', color: '#64748B' }
  ];

  planets.forEach((p, idx) => {
    const pos = data.positions?.[p.key] || (idx * 50);
    const angle = (pos - 90) * Math.PI / 180;
    const pr = r - 15;
    const px = cx + pr * Math.cos(angle);
    const py = cy + pr * Math.sin(angle);
    svg += `<text x="${px}" y="${py}" fill="${p.color}" font-size="14" text-anchor="middle" dominant-baseline="middle">${p.label}</text>`;
  });

  svg += `</svg>`;
  return svg;
}

export function resetNatal() { natalLoaded = false; }

export function initNatal() {
  $('#btn-retry-natal')?.addEventListener('click', () => {
    natalLoaded = false;
    loadNatalChart();
  });
  document.addEventListener('tab:change', (e) => {
    if (e.detail.tab === 'natal') loadNatalChart();
  });
}
