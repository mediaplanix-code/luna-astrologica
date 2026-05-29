// ============================================
// LUNA ASTROLOGICA — luna-context.js
// Step 2: Caricamento contesto giornaliero + 3 caselle eventi
// Data: 2026-05-29
// ============================================

const API_URL = 'https://luna-astrologica-api-render.onrender.com';

// ============================================
// FUNZIONE PRINCIPALE: chiama all'ingresso utente
// ============================================
async function initLunaContext(userId) {
  const container = document.getElementById('luna-context');
  if (!container) {
    console.warn('[Luna] Div #luna-context non trovato. Creo uno automatico.');
    const autoDiv = document.createElement('div');
    autoDiv.id = 'luna-context';
    document.body.prepend(autoDiv);
  }

  showLoading('Caricamento del tuo cielo personale...');

  try {
    // 1. Chiama /get-daily-context
    const res = await fetch(`${API_URL}/get-daily-context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Errore API');
    }

    const data = await res.json();
    console.log('[Luna] Context ricevuto:', data);

    // 2. Renderizza tutto
    renderDashboard(data, userId);

  } catch (err) {
    console.error('[Luna] Errore caricamento context:', err);
    showError('Non riesco a contattare Luna. Ricarica la pagina tra un minuto.');
  }
}

// ============================================
// RENDER DASHBOARD
// ============================================
function renderDashboard(data, userId) {
  const container = document.getElementById('luna-context');
  
  const daily = data.daily || {};
  const profile = data.profile_context || {};
  const dossierSummary = data.dossier_summary;

  // Stile base inline (puoi spostare nel tuo CSS)
  container.innerHTML = `
    <div style="max-width:600px;margin:20px auto;padding:20px;border:1px solid #d4af37;border-radius:12px;background:#1a1a2e;color:#f0e6d3;font-family:Georgia,serif;">
      
      <!-- HEADER -->
      <div style="text-align:center;margin-bottom:20px;">
        <h2 style="color:#d4af37;margin:0;">🌙 Il tuo cielo oggi</h2>
        <p style="margin:5px 0 0;font-size:0.9em;opacity:0.8;">${profile.full_name || 'Benvenuto'} — ${profile.sun_sign || ''}</p>
      </div>

      <!-- CREDITI -->
      <div style="background:#16213e;padding:12px 16px;border-radius:8px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
        <span>💎 Crediti disponibili</span>
        <span style="font-size:1.4em;font-weight:bold;color:#d4af37;">${profile.credits !== undefined ? profile.credits : '—'}</span>
      </div>

      <!-- OROSCOPO DEL GIORNO -->
      <div style="background:#16213e;padding:16px;border-radius:8px;margin-bottom:16px;">
        <h3 style="margin:0 0 10px;color:#d4af37;font-size:1em;">📜 Messaggio di oggi</h3>
        <p style="margin:0;line-height:1.6;font-size:0.95em;">${daily.daily_horoscope_text || daily.interpretation_ai || 'Il cielo è in attesa...'}</p>
        ${daily.consiglio_pratico ? `<p style="margin-top:10px;font-size:0.85em;opacity:0.7;border-top:1px solid #333;padding-top:8px;">💡 <em>${daily.consiglio_pratico}</em></p>` : ''}
      </div>

      <!-- DOSSIER (se presente) -->
      ${dossierSummary ? `
      <div style="background:#16213e;padding:16px;border-radius:8px;margin-bottom:16px;">
        <h3 style="margin:0 0 10px;color:#d4af37;font-size:1em;">✨ Il tuo dossier astrologico</h3>
        <p style="margin:0;line-height:1.6;font-size:0.9em;">${dossierSummary}</p>
      </div>
      ` : ''}

      <!-- 3 CASELLE EVENTI FUTURI -->
      <div style="margin-bottom:16px;">
        <h3 style="color:#d4af37;margin:0 0 12px;font-size:1em;">🔮 Prossimi eventi importanti</h3>
        <div id="luna-events-grid" style="display:flex;flex-direction:column;gap:10px;">
          ${renderEventCards(profile.next_events)}
        </div>
      </div>

      <!-- AZIONI (dossier/transiti mancanti) -->
      <div id="luna-actions" style="display:flex;gap:10px;flex-wrap:wrap;">
        ${!profile.dossier_generated ? `
          <button onclick="generateDossier('${userId}')" style="flex:1;min-width:140px;padding:12px;background:#d4af37;color:#1a1a2e;border:none;border-radius:6px;cursor:pointer;font-weight:bold;">
            ✨ Genera Dossier
          </button>
        ` : ''}
        ${(!profile.next_events || profile.next_events.length === 0) ? `
          <button onclick="calculateTransits('${userId}')" style="flex:1;min-width:140px;padding:12px;background:#4a4e69;color:#f0e6d3;border:1px solid #d4af37;border-radius:6px;cursor:pointer;font-weight:bold;">
            🪐 Calcola Transiti 90gg
          </button>
        ` : ''}
      </div>

      <!-- TELEGRAM -->
      ${!profile.telegram_connected ? `
      <div style="margin-top:16px;padding:12px;background:#2a2a40;border-radius:8px;font-size:0.85em;text-align:center;">
        📲 <a href="#" style="color:#d4af37;">Collega Telegram</a> per ricevere l'oroscopo ogni mattina
      </div>
      ` : '<div style="margin-top:16px;text-align:center;font-size:0.85em;opacity:0.6;">📲 Telegram collegato</div>'}

    </div>
  `;
}

// ============================================
// RENDER 3 CASELLE EVENTI
// ============================================
function renderEventCards(events) {
  if (!events || events.length === 0) {
    return `<div style="padding:20px;text-align:center;opacity:0.6;background:#16213e;border-radius:8px;">
      Nessun evento futuro calcolato.<br><em>Clicca "Calcola Transiti 90gg" per scoprirli.</em>
    </div>`;
  }

  return events.map((evt, idx) => `
    <div style="background:#16213e;padding:14px;border-radius:8px;border-left:4px solid ${idx === 0 ? '#d4af37' : '#4a4e69'};">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <strong style="color:#d4af37;font-size:0.95em;">${evt.title || 'Evento speciale'}</strong>
        <span style="font-size:0.8em;opacity:0.7;">${formatDate(evt.event_date)}</span>
      </div>
      <p style="margin:0 0 8px;font-size:0.9em;line-height:1.5;">${evt.interpretation_ai || evt.description || ''}</p>
      ${evt.consiglio_difesa ? `<p style="margin:0;font-size:0.85em;opacity:0.8;">🛡️ ${evt.consiglio_difesa}</p>` : ''}
    </div>
  `).join('');
}

// ============================================
// AZIONI: Genera Dossier
// ============================================
async function generateDossier(userId) {
  const btn = document.querySelector('#luna-actions button');
  if (btn) btn.disabled = true;
  showLoading('Luna sta scrivendo il tuo dossier astrologico... (può richiedere 10-20 secondi)');

  try {
    const res = await fetch(`${API_URL}/generate-dossier`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });

    if (!res.ok) throw new Error('Errore generazione dossier');

    const data = await res.json();
    alert('✨ Dossier astrologico generato con successo! Ricarico la pagina...');
    window.location.reload();

  } catch (err) {
    console.error(err);
    alert('❌ Errore: ' + err.message);
    if (btn) btn.disabled = false;
  }
}

// ============================================
// AZIONI: Calcola Transiti
// ============================================
async function calculateTransits(userId) {
  const btn = document.querySelectorAll('#luna-actions button')[1];
  if (btn) btn.disabled = true;
  showLoading('Luna sta calcolando i transiti per i prossimi 90 giorni... (può richiedere 20-30 secondi)');

  try {
    const res = await fetch(`${API_URL}/calculate-transits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, days: 90 })
    });

    if (!res.ok) throw new Error('Errore calcolo transiti');

    const data = await res.json();
    alert(`🪐 Transiti calcolati! ${data.events_calculated} eventi importanti trovati. Ricarico la pagina...`);
    window.location.reload();

  } catch (err) {
    console.error(err);
    alert('❌ Errore: ' + err.message);
    if (btn) btn.disabled = false;
  }
}

// ============================================
// HELPERS UI
// ============================================
function showLoading(msg) {
  const container = document.getElementById('luna-context');
  if (container) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:#d4af37;font-family:Georgia,serif;">
      <div style="font-size:2em;margin-bottom:10px;">🌙</div>
      <p>${msg}</p>
    </div>`;
  }
}

function showError(msg) {
  const container = document.getElementById('luna-context');
  if (container) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:#ff6b6b;font-family:Georgia,serif;">
      <div style="font-size:2em;margin-bottom:10px;">⚠️</div>
      <p>${msg}</p>
    </div>`;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ============================================
// AUTO-INIT (opzionale: se usi Supabase nel tuo progetto)
// Chiama questa funzione dopo il login/verifica
// Esempio nel tuo auth.js o app.js:
//   await initLunaContext(user.id);
// ============================================
