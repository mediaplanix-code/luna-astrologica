// ============================================================
// VOICE.JS v6.2 — ElevenLabs Conversational AI Widget
// Dynamic Variables in formato JSON corretto
// ============================================================

import { getCurrentUser, getCurrentProfile } from './auth.js';

// ===== CONFIGURAZIONE =====
const ELEVENLABS_AGENT_ID = 'agent_2001kkv60b6fetctf45errwqwjmg';

// ===== STATO =====
let session = {
  active: false,
  category: null,
  startTime: null,
  durationSeconds: 18 * 60,
  elapsedSeconds: 0,
  timerInterval: null
};

// ===== CARICA SCRIPT ELEVENLABS =====
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

// ===== RECUPERA DATI TEMA NATALE =====
function getNatalData() {
  try {
    const saved = localStorage.getItem('luna_natal_chart');
    if (saved) return JSON.parse(saved);
  } catch(e) {}
  return null;
}

// ===== COSTRUISCI DYNAMIC VARIABLES =====
function buildDynamicVars(profile, natal, category) {
  const vars = {};
  
  // Dati base
  vars.nome = profile?.full_name?.split(' ')[0] || 'amico';
  vars.segno_solare = profile?.sun_sign || natal?.planets?.find(p => p.key === 'sun')?.sign || 'sconosciuto';
  vars.segno_lunare = profile?.moon_sign || natal?.planets?.find(p => p.key === 'moon')?.sign || 'sconosciuto';
  vars.ascendente = profile?.rising_sign || natal?.ascendant?.name || 'sconosciuto';
  vars.data_nascita = profile?.birth_date || 'sconosciuta';
  vars.citta_nascita = profile?.birth_city || 'sconosciuta';
  vars.categoria = category || 'generale';
  
  // Pianeti
  const planetKeys = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'];
  planetKeys.forEach(key => {
    const p = natal?.planets?.find(pl => pl.key === key);
    vars[`pianeta_${key}`] = p ? `${p.sign} ${p.degree}°` : 'sconosciuto';
  });
  
  // Case
  for (let i = 1; i <= 12; i++) {
    const h = natal?.houses?.[i - 1];
    vars[`casa_${i}`] = h ? `${h.sign} ${h.degree}°` : 'sconosciuta';
  }
  
  return vars;
}

// ===== INIZIALIZZA WIDGET =====
function initWidget(category) {
  const container = document.getElementById('elevenlabs-widget-container');
  if (!container) return;
  
  const profile = getCurrentProfile();
  const natal = getNatalData();
  const vars = buildDynamicVars(profile, natal, category);
  
  // JSON string per dynamic-variables
  const varsJson = JSON.stringify(vars);
  
  container.innerHTML = `
    <elevenlabs-convai 
      agent-id="${ELEVENLABS_AGENT_ID}"
      dynamic-variables='${varsJson}'
    ></elevenlabs-convai>
  `;
  
  console.log('🎙️ Widget ElevenLabs inizializzato');
  console.log('📊 Dynamic variables:', vars);
}

// ===== TIMER =====
function startTimer() {
  const bar = document.getElementById('voiceTimerBar');
  const text = document.getElementById('voiceTimerText');

  session.timerInterval = setInterval(() => {
    session.elapsedSeconds++;
    const remaining = session.durationSeconds - session.elapsedSeconds;
    const progress = (session.elapsedSeconds / session.durationSeconds) * 100;

    if (bar) {
      bar.style.width = `${progress}%`;
      const min = remaining / 60;
      if (min <= 1) bar.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
      else if (min <= 3) bar.style.background = 'linear-gradient(90deg, #fbbf24, #f59e0b)';
      else bar.style.background = 'linear-gradient(90deg, #22c55e, #16a34a)';
    }

    if (text) {
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      text.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    }

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

  session.active = true;
  session.category = category || 'generale';
  session.startTime = Date.now();
  session.elapsedSeconds = 0;

  const bar = document.getElementById('voiceTimerBar');
  const text = document.getElementById('voiceTimerText');
  const status = document.getElementById('voiceStatus');
  
  if (bar) { bar.style.width = '0%'; bar.style.background = 'linear-gradient(90deg, #22c55e, #16a34a)'; }
  if (text) text.textContent = '18:00';
  if (status) status.textContent = '⏳ Caricamento...';

  try {
    await loadElevenLabsScript();
    initWidget(category);
    if (status) status.textContent = '🎙️ Pronta — premi Start a call';
    startTimer();
    return true;
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
  if (status) status.textContent = 'Sessione terminata';
  
  console.log('🎙️ SESSIONE TERMINATA');
}

// ===== STATO =====
export function getStatus() {
  return {
    active: session.active,
    elapsed: session.elapsedSeconds,
    remaining: session.durationSeconds - session.elapsedSeconds,
    category: session.category
  };
}
