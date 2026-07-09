import { CONFIG } from './config.js';
import { $, state } from './utils.js';

let transitsLoaded = false;

export async function loadTransits() {
  if (transitsLoaded) return;
  if (!state.profile?.birth_date) return;

  $('#transits-loading').classList.remove('hidden');
  $('#transits-result').classList.add('hidden');

  const sb = await (await import('./config.js')).getSupabase();
  const today = new Date().toISOString().split('T')[0];

  // 1. Controlla se esiste già in DB
  try {
    const { data: existing } = await sb
      .from(CONFIG.TABLES.DAILY_TRANSITS)
      .select('*')
      .eq('user_id', state.user.id)
      .eq('transit_date', today)
      .single();

    if (existing) {
      renderTransits(existing);
      transitsLoaded = true;
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

    const res = await fetch(`${CONFIG.API_BASE}/api/transits?${params}`, {
      headers: { 'Authorization': `Bearer ${state.session.access_token}` }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    await sb.from(CONFIG.TABLES.DAILY_TRANSITS).insert({
      user_id: state.user.id,
      transit_date: today,
      transit_planets: data.transit_planets || {},
      active_aspects: data.active_aspects || [],
      activated_houses: data.activated_houses || [],
      created_at: new Date().toISOString()
    });

    renderTransits(data);
    transitsLoaded = true;
  } catch (err) {
    console.error('Transits error:', err);
    $('#transits-loading').classList.add('hidden');
    $('#transits-result').innerHTML = '<p class="error-panel">Errore caricamento transiti. Riprova più tardi.</p>';
    $('#transits-result').classList.remove('hidden');
  }
}

function renderTransits(data) {
  $('#transits-loading').classList.add('hidden');
  $('#transits-result').classList.remove('hidden');

  const list = $('#transits-list');
  list.innerHTML = '';

  const transits = data.transits || data.active_aspects || [];
  transits.forEach(t => {
    const div = document.createElement('div');
    div.className = 'transit-item';
    div.style.cssText = 'background:var(--navy);padding:12px 16px;border-radius:8px;margin-bottom:10px;';
    div.innerHTML = `
      <div style="font-weight:600;color:var(--gold);margin-bottom:4px;">
        ${t.planet || t.transit_planet || 'Transito'} 
        ${t.aspect ? `in ${t.aspect}` : ''}
      </div>
      <p style="color:var(--text-muted);font-size:0.9rem;margin:0;">${t.description || t.interpretation || ''}</p>
    `;
    list.appendChild(div);
  });

  $('#transits-interpretation').textContent = data.summary || 
    'I transiti di oggi influenzano le tue energie personali. Osserva come i pianeti interagiscono con il tuo tema natale.';
}

export function resetTransits() { transitsLoaded = false; }

export function initTransits() {
  document.addEventListener('tab:change', (e) => {
    if (e.detail.tab === 'transits') loadTransits();
  });
}
