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

  try {
    const { data: existing } = await sb
      .from(CONFIG.TABLES.NATAL_CHARTS)
      .select('*')
      .eq('user_id', state.user.id)
      .single();

    if (existing) {
      renderNatal(existing.chart_data || existing);
      natalLoaded = true;
      return;
    }
  } catch (e) { /* non esiste */ }

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

// ===== AFFINITÀ (nello stesso file per rispettare l'elenco file del prompt) =====
export async function calcCompatibility() {
  const name = $('#compat-name').value.trim();
  const date = $('#compat-date').value;
  const time = $('#compat-time').value;
  const place = $('#compat-place').value.trim();

  if (!name || !date || !time || !place) {
    import('./utils.js').then(({ toast }) => toast('Compila tutti i campi del partner', 'error'));
    return;
  }
  if (!state.profile?.birth_date) {
    import('./utils.js').then(({ toast }) => toast('Completa prima il tuo profilo con data di nascita', 'error'));
    return;
  }

  $('#compat-loading').classList.remove('hidden');
  $('#compat-result').classList.add('hidden');

  try {
    const res = await fetch(`${CONFIG.API_BASE}/api/compatibility`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.session.access_token}`
      },
      body: JSON.stringify({
        user_birth_date: state.profile.birth_date,
        user_birth_time: state.profile.birth_time,
        user_birth_place: state.profile.birth_place,
        partner_name: name,
        partner_birth_date: date,
        partner_birth_time: time,
        partner_birth_place: place
      })
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const sb = await (await import('./config.js')).getSupabase();
    await sb.from(CONFIG.TABLES.COMPATIBILITY_REPORTS).insert({
      user_id: state.user.id,
      partner_name: name,
      partner_birth_date: date,
      partner_birth_time: time,
      partner_birth_city: place,
      partner_natal_chart: data.partner_chart || {},
      compatibility_score: data.score || data.compatibility_score || 0,
      report_text: data.report || data.interpretation || '',
      report_json: data,
      credit_spent: 0,
      created_at: new Date().toISOString()
    });

    renderCompatResult(data);
  } catch (err) {
    import('./utils.js').then(({ toast }) => toast(err.message || 'Errore calcolo affinità', 'error'));
    console.error(err);
  } finally {
    $('#compat-loading').classList.add('hidden');
  }
}

function renderCompatResult(data) {
  $('#compat-result').classList.remove('hidden');
  const score = data.compatibility_score || data.score || 0;
  $('#compat-percent').textContent = `${score}%`;
  $('#compat-label').textContent = score >= 70 ? 'Ottima compatibilità!' : score >= 40 ? 'Compatibilità discreta' : 'Sfide da affrontare';

  const details = $('#compat-details');
  details.innerHTML = '';
  const text = data.report_text || data.report || data.interpretation || '';
  if (text) {
    const p = document.createElement('p');
    p.style.cssText = 'color:var(--text-muted);line-height:1.7;margin-top:16px;';
    p.textContent = text;
    details.appendChild(p);
  }
}

export function initNatal() {
  $('#btn-retry-natal')?.addEventListener('click', () => {
    natalLoaded = false;
    loadNatalChart();
  });
  $('#btn-calc-compat')?.addEventListener('click', calcCompatibility);

  document.addEventListener('tab:change', (e) => {
    if (e.detail.tab === 'natal') loadNatalChart();
  });
}
