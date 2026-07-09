import { CONFIG } from './config.js';
import { $, state, toast } from './utils.js';

export async function loadCompatibilityHistory() {
  if (!state.user) return;
  const sb = await (await import('./config.js')).getSupabase();

  try {
    const { data: reports } = await sb
      .from(CONFIG.TABLES.COMPATIBILITY_REPORTS)
      .select('*')
      .eq('user_id', state.user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const list = $('#compat-history-list');
    if (!reports || reports.length === 0) {
      list.innerHTML = '<p class="text-muted">Nessun report salvato.</p>';
      return;
    }

    list.innerHTML = '';
    reports.forEach(r => {
      const div = document.createElement('div');
      div.className = 'compat-history-item';
      div.style.cssText = 'background:var(--navy);padding:12px 16px;border-radius:8px;margin-bottom:8px;cursor:pointer;';
      div.innerHTML = `
        <div style="font-weight:600;color:var(--gold);">${r.partner_name}</div>
        <div style="font-size:0.85rem;color:var(--text-muted);">
          Compatibilità: ${r.compatibility_score || '?'}% • ${new Date(r.created_at).toLocaleDateString('it-IT')}
        </div>
      `;
      div.addEventListener('click', () => renderCompatResult(r));
      list.appendChild(div);
    });
  } catch (err) {
    console.error('Compat history error:', err);
  }
}

export async function calcCompatibility() {
  const name = $('#compat-name').value.trim();
  const date = $('#compat-date').value;
  const time = $('#compat-time').value;
  const place = $('#compat-place').value.trim();

  if (!name || !date || !time || !place) {
    toast('Compila tutti i campi del partner', 'error'); return;
  }
  if (!state.profile?.birth_date) {
    toast('Completa prima il tuo profilo con data di nascita', 'error'); return;
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

    // Salva in DB
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
    loadCompatibilityHistory();
  } catch (err) {
    toast(err.message || 'Errore calcolo affinità', 'error');
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

export function initCompatibility() {
  $('#btn-calc-compat')?.addEventListener('click', calcCompatibility);
  document.addEventListener('tab:change', (e) => {
    if (e.detail.tab === 'compatibility') loadCompatibilityHistory();
  });
}
