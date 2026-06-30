// ============================================================
// VOICE.JS v6.3 — Benvenuto AI + blocco, timer nascosto, pacchetti voce
// ============================================================

import { getCurrentUser, getCurrentProfile } from './auth.js';
import { hasVoicePackage, getVoicePackage, getVoicePackageMinutesRemaining } from './payments.js';

const ELEVENLABS_AGENT_ID = 'agent_2001kkv60b6fetctf45errwqwjmg';

let session = {
  active: false,
  category: null,
  startTime: null,
  durationSeconds: 18 * 60,
  elapsedSeconds: 0,
  timerInterval: null,
  welcomePlayed: false
};

function loadElevenLabsScript() {
  return new Promise((resolve, reject) => {
    if (document.getElementById('elevenlabs-convai-script')) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.id = 'elevenlabs-convai-script';
    script.src = 'https://elevenlabs.io/convai-widget/index.js';
    script.async = true;
    script.type = 'text/javascript';
    script.onload = () => {
      console.log('✅ ElevenLabs widget caricato');
      resolve();
    };
    script.onerror = () => reject(new Error('Errore caricamento ElevenLabs'));
    document.head.appendChild(script);
  });
}

function getNatalData() {
  try {
    const saved = localStorage.getItem('luna_natal_chart');
    if (saved) return JSON.parse(saved);
  } catch(e) {}
  return null;
}

function buildDynamicVars(profile, natal, category) {
  const vars = {};

  vars.nome = profile?.full_name?.split(' ')[0] || 'amico';
  vars.segno_solare = profile?.sun_sign || natal?.planets?.find(p => p.key === 'sun')?.sign || 'sconosciuto';
  vars.segno_lunare = profile?.moon_sign || natal?.planets?.find(p => p.key === 'moon')?.sign || 'sconosciuto';
  vars.ascendente = profile?.rising_sign || natal?.ascendant?.name || 'sconosciuto';
  vars.data_nascita = profile?.birth_date || 'sconosciuta';
  vars.citta_nascita = profile?.birth_city || 'sconosciuta';
  vars.categoria = category || 'generale';

  const planetKeys = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'];
  planetKeys.forEach(key => {
    const p = natal?.planets?.find(pl => pl.key === key);
    vars[`pianeta_${key}`] = p ? `${p.sign} ${p.degree}°` : 'sconosciuto';
  });

  for (let i = 1; i <= 12; i++) {
    const h = natal?.houses?.[i - 1];
    vars[`casa_${i}`] = h ? `${h.sign} ${h.degree}°` : 'sconosciuta';
  }

  return vars;
}

function initWidget(category, mode) {
  const container = document.getElementById('elevenlabs-widget-container');
  if (!container) return;

  const profile = getCurrentProfile();
  const natal = getNatalData();
  const vars = buildDynamicVars(profile, natal, category);

  // Aggiungi flag per il prompt di ElevenLabs
  vars.has_package = mode === 'full' ? 'true' : 'false';
  vars.minuti_rimanenti = mode === 'full' ? String(getVoicePackageMinutesRemaining()) : '0';

  const varsJson = JSON.stringify(vars);

  container.innerHTML = `
    <elevenlabs-convai 
      agent-id="${ELEVENLABS_AGENT_ID}"
      dynamic-variables='${varsJson}'
    ></elevenlabs-convai>
  `;

  console.log('🎙️ Widget ElevenLabs inizializzato — modalità:', mode);
}

function startTimer() {
  session.timerInterval = setInterval(() => {
    session.elapsedSeconds++;
    const remaining = session.durationSeconds - session.elapsedSeconds;

    if (session.elapsedSeconds >= session.durationSeconds) {
      endSession();
    }
  }, 1000);
}

// ===== AVVIA SESSIONE =====
export async function startVoiceSession(category) {
  const user = getCurrentUser();
  if (!user) {
    alert('Devi essere loggato per usare la modalità voce');
    return false;
  }

  const hasPkg = hasVoicePackage();
  const pkg = getVoicePackage();

  session.active = true;
  session.category = category || 'generale';
  session.startTime = Date.now();
  session.elapsedSeconds = 0;
  session.welcomePlayed = false;

  const status = document.getElementById('voiceStatus');

  // Nascondi timer visibile
  const timerWrap = document.querySelector('.voice-timer-wrap');
  if (timerWrap) timerWrap.style.display = 'none';

  try {
    await loadElevenLabsScript();

    if (!hasPkg) {
      // MODALITÀ BENVENUTO: carica widget, fa parlare Luna, poi blocca
      initWidget(category, 'welcome');
      if (status) status.textContent = '🎙️ Luna ti sta salutando...';

      // Dopo 15 secondi di benvenuto, mostra blocco
      setTimeout(() => {
        session.welcomePlayed = true;
        const container = document.getElementById('elevenlabs-widget-container');
        if (container) container.innerHTML = '';

        if (status) {
          status.innerHTML = `
            <div style="text-align:center; padding: 1rem;">
              <div style="font-size: 2rem; margin-bottom: 0.5rem;">🎁</div>
              <div style="color: var(--gold); font-weight: 600; margin-bottom: 0.5rem;">
                Ciao ${getCurrentProfile()?.full_name?.split(' ')[0] || 'amico'}!
              </div>
              <div style="color: var(--text-dim); font-size: 0.875rem; margin-bottom: 1rem;">
                Sono Luna, ho letto il tuo tema natale.<br>
                Per parlare con me e approfondire il consulto,<br>
                acquista un pacchetto dal carrello.
              </div>
              <button class="btn-gold" onclick="window.app.showPaymentsPage()" style="padding: 0.75rem 1.5rem;">
                🛒 Vai al carrello
              </button>
            </div>
          `;
        }
      }, 15000); // 15 secondi di benvenuto

      return true;
    } else {
      // MODALITÀ FULL: pacchetto acquistato, parla liberamente
      initWidget(category, 'full');
      if (status) status.textContent = '🎙️ Luna è pronta per ascoltarti';
      startTimer();
      return true;
    }
  } catch (err) {
    console.error('❌ Errore avvio ElevenLabs:', err);
    if (status) status.textContent = '⚠️ Errore caricamento voce';
    return false;
  }
}

// ===== TERMINA SESSIONE =====
export function endSession() {
  session.active = false;
  clearInterval(session.timerInterval);
  session.timerInterval = null;

  const container = document.getElementById('elevenlabs-widget-container');
  if (container) container.innerHTML = '';

  const status = document.getElementById('voiceStatus');
  if (status) status.textContent = 'Grazie per aver parlato con Luna';

  console.log('🎙️ SESSIONE TERMINATA');
}

export function getStatus() {
  return {
    active: session.active,
    elapsed: session.elapsedSeconds,
    remaining: session.durationSeconds - session.elapsedSeconds,
    category: session.category
  };
}
