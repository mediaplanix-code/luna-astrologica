// ============================================================
// VOICE.JS v5.0 — Interazione Vocale Pura con Luna
// Modello: segreteria AI — parla, ascolta, interagisce, si ferma
// Nessun testo visibile. Solo voce. Interazione umana e fluida.
// ============================================================

import { getCurrentUser, getCurrentProfile } from './auth.js';

// ===== STATO SESSIONE =====
let session = {
  active: false,
  category: null,
  startTime: null,
  durationSeconds: 18 * 60,
  elapsedSeconds: 0,
  timerInterval: null,
  recognition: null,
  synthesis: null,
  isListening: false,
  isSpeaking: false,
  silenceTimer: null,
  silenceThreshold: 2000,  // ms di silenzio prima di considerare frase finita
};

// ===== INIZIALIZZA RICONOSCIMENTO =====
function initRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    showStatus('⚠️ Microfono non disponibile su questo browser');
    return null;
  }

  const rec = new SR();
  rec.lang = 'it-IT';
  rec.continuous = true;      // Ascolta continuamente
  rec.interimResults = true;  // Risultati parziali per fluidità
  rec.maxAlternatives = 1;

  // Quando inizia ad ascoltare
  rec.onstart = () => {
    session.isListening = true;
    showStatus('🎤 In ascolto...');
    setMicActive(true);
    console.log('🎤 MICROFONO ATTIVO');
  };

  // Risultati parziali e finali
  rec.onresult = (event) => {
    let final = '';
    let interim = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        final += t;
      } else {
        interim += t;
      }
    }

    // Reset timer silenzio ogni volta che sente qualcosa
    if (interim || final) {
      clearTimeout(session.silenceTimer);

      // Se c'è testo interim, l'utente sta parlando — mostra feedback visivo (senza testo)
      if (interim) {
        showStatus('🎤 ...');
        pulseWaves(true);
      }
    }

    // Quando la frase è definitiva
    if (final) {
      console.log('🎤 UTENTE:', final);

      // Breve pausa per naturalezza, poi Luna risponde
      showStatus('💭 ...');
      pulseWaves(false);

      setTimeout(() => {
        if (session.active) {
          respondToUser(final);
        }
      }, 400);
    }
  };

  // Errore
  rec.onerror = (e) => {
    console.error('Errore mic:', e.error);
    session.isListening = false;
    setMicActive(false);

    if (e.error === 'no-speech') {
      // Normale — l'utente non ha parlato, riavvia ascolto
      if (session.active && !session.isSpeaking) {
        restartListening();
      }
    } else if (e.error === 'aborted') {
      // Normale — sessione fermata
    } else if (e.error === 'not-allowed') {
      showStatus('⚠️ Permesso microfono negato');
    } else {
      showStatus('⚠️ Errore microfono, riprovo...');
      setTimeout(() => restartListening(), 1000);
    }
  };

  // Quando si ferma (per qualsiasi motivo)
  rec.onend = () => {
    console.log('🎤 MICROFONO FERMO');
    session.isListening = false;
    setMicActive(false);
    pulseWaves(false);

    // Se sessione ancora attiva e Luna non sta parlando, riavvia
    if (session.active && !session.isSpeaking) {
      setTimeout(() => restartListening(), 300);
    }
  };

  return rec;
}

// ===== RIAVVIA ASCOLTO =====
function restartListening() {
  if (!session.active || session.isSpeaking) return;

  // Ricrea recognition se necessario (alcuni browser la invalidano)
  if (!session.recognition) {
    session.recognition = initRecognition();
  }

  if (session.recognition) {
    try {
      session.recognition.start();
    } catch(e) {
      console.log('Ricrea recognition...');
      session.recognition = initRecognition();
      if (session.recognition) {
        try { session.recognition.start(); } catch(e2) {}
      }
    }
  }
}

// ===== FERMA ASCOLTO TEMPORANEAMENTE =====
function pauseListening() {
  clearTimeout(session.silenceTimer);
  if (session.recognition) {
    try { session.recognition.stop(); } catch(e) {}
  }
  session.isListening = false;
  setMicActive(false);
  pulseWaves(false);
}

// ===== INIZIALIZZA SINTESI VOCE =====
function initSynthesis() {
  const synth = window.speechSynthesis;
  if (!synth) return null;

  // Pre-carica voci
  synth.getVoices();
  return synth;
}

// ===== TROVA VOCE ITALIANA FEMMINILE =====
function getItalianVoice() {
  const voices = window.speechSynthesis.getVoices();

  // Preferita: voce italiana femminile
  const preferred = voices.find(v =>
    v.lang.startsWith('it') &&
    (v.name.includes('Female') || v.name.includes('femmina') || 
     v.name.includes('Anna') || v.name.includes('Alice') ||
     v.name.includes('Elsa') || v.name.includes('Bianca') ||
     v.name.includes('Sara') || v.name.includes('Paola') ||
     v.name.includes('Elena') || v.name.includes('Laura'))
  );
  if (preferred) return preferred;

  // Fallback: qualsiasi italiana
  const italian = voices.find(v => v.lang.startsWith('it'));
  if (italian) return italian;

  // Ultimo fallback
  return voices[0];
}

// ===== LUNA PARLA =====
function lunaSpeak(text, onDone) {
  const synth = session.synthesis;
  if (!synth) {
    if (onDone) onDone();
    return;
  }

  // Ferma ascolto mentre parla (non puoi parlare sopra)
  pauseListening();

  session.isSpeaking = true;
  showStatus('🔊 Luna sta parlando...');
  pulseWaves(true);

  // Ferma eventuale parlata precedente
  synth.cancel();

  const u = new SpeechSynthesisUtterance(text);
  u.voice = getItalianVoice();
  u.lang = 'it-IT';
  u.rate = 0.90;    // Leggermente lento, naturale
  u.pitch = 1.02;   // Quasi neutro, leggermente caldo
  u.volume = 1;

  u.onend = () => {
    console.log('🔊 LUNA HA FINITO');
    session.isSpeaking = false;
    pulseWaves(false);

    if (onDone) onDone();

    // Riavvia ascolto dopo breve pausa naturale
    if (session.active) {
      showStatus('🎤 In ascolto...');
      setTimeout(() => restartListening(), 200);
    }
  };

  u.onerror = (e) => {
    console.error('Errore TTS:', e);
    session.isSpeaking = false;
    pulseWaves(false);
    if (onDone) onDone();
    if (session.active) restartListening();
  };

  synth.speak(u);
}

// ===== INTERPRETAZIONE ASTROLOGICA =====
function respondToUser(userText) {
  const profile = getCurrentProfile();

  if (!profile) {
    lunaSpeak('Devi prima completare il tuo profilo per ricevere un consulto personalizzato.');
    return;
  }

  // Recupera dati tema natale
  let natal = null;
  try {
    const saved = localStorage.getItem('luna_natal_chart');
    if (saved) natal = JSON.parse(saved);
  } catch(e) {}

  const sun = profile.sun_sign || natal?.planets?.find(p => p.key === 'sun')?.sign || 'il tuo segno';
  const moon = profile.moon_sign || natal?.planets?.find(p => p.key === 'moon')?.sign || 'una posizione lunare';
  const asc = profile.rising_sign || natal?.ascendant?.name || 'il tuo ascendente';
  const name = profile.full_name?.split(' ')[0] || '';

  // Genera risposta basata su categoria e dati
  const response = buildResponse(userText, session.category, sun, moon, asc, name, natal);

  lunaSpeak(response);
}

// ===== COSTRUISCI RISPOSTA =====
function buildResponse(input, category, sun, moon, asc, name, natal) {
  const today = new Date();
  const dayName = today.toLocaleDateString('it-IT', { weekday: 'long' });

  // Risposte per categoria
  const readings = {
    amore: () => {
      const venus = natal?.planets?.find(p => p.key === 'venus');
      let r = name ? `${name}, ` : '';
      r += `guardando il tuo cielo, il Sole in ${sun} e la Luna in ${moon} creano un campo emotivo molto interessante oggi. `;
      if (venus) {
        r += `Venere in ${venus.sign} a ${venus.degree} gradi indica che il tuo modo di amare è `;
        r += venus.sign === 'Toro' || venus.sign === 'Bilancia' 
          ? 'naturale e magnetico. ' 
          : 'intenso e profondo. ';
      }
      r += `Con l'ascendente in ${asc}, la prima impressione che dai è di una persona ${getTrait(asc)}. `;
      r += `Oggi ${dayName}, i transiti suggeriscono di aprirti emotivamente. Segui il cuore, ma lascia che la ragione guidi le parole.`;
      return r;
    },

    lavoro: () => {
      const mc = natal?.mc;
      const saturn = natal?.planets?.find(p => p.key === 'saturn');
      let r = name ? `${name}, ` : '';
      r += `nel tuo tema natale, ${sun} con la Luna in ${moon} indica un approccio al lavoro molto personale. `;
      if (mc) r += `Il Medio Cielo in ${mc.name} suggerisce una vocazione verso ambiti ${getVocation(mc.name)}. `;
      if (saturn) r += `Saturno in ${saturn.sign} ti insegna la disciplina attraverso sfide concrete. `;
      r += `Per oggi ${dayName}, il consiglio è concentrarti su obiettivi a medio termine. L'energia di ${sun} ti supporta nelle trattative.`;
      return r;
    },

    carriera: () => buildResponse(input, 'lavoro', sun, moon, asc, name, natal) + 
      ` Per la carriera, guarda al settore ${getCareer(sun, natal)}.` ,

    denaro: () => {
      const jupiter = natal?.planets?.find(p => p.key === 'jupiter');
      let r = name ? `${name}, ` : '';
      r += `il tuo approccio al denaro con il Sole in ${sun} è ${getMoneyStyle(sun)}. `;
      if (jupiter) r += `Giove in ${jupiter.sign} indica dove puoi trovare espansione economica. `;
      r += `Oggi i transiti suggeriscono cautela nelle spese immediate ma aperture per investimenti legati alla tua vocazione.`;
      return r;
    },

    salute: () => {
      const mars = natal?.planets?.find(p => p.key === 'mars');
      let r = name ? `${name}, ` : '';
      r += `per la salute, guardo Marte nel tuo tema. `;
      if (mars) r += `Marte in ${mars.sign} indica la tua energia vitale. `;
      r += `Con ${sun} e Luna in ${moon}, il consiglio oggi è ${getHealthTip(sun)}.`;
      return r;
    },

    famiglia: () => {
      let r = name ? `${name}, ` : '';
      r += `la famiglia nel tuo tema è rappresentata dalla Luna e dalla Casa IV. `;
      r += `Con la Luna in ${moon}, il tuo bisogno di radici è ${getFamilyTrait(moon)}. `;
      r += `Oggi è un buon giorno per riconnetterti con le origini, anche solo mentalmente.`;
      return r;
    },

    amici: () => {
      let r = name ? `${name}, ` : '';
      r += `nelle amicizie, il tuo ${sun} ti rende ${getFriendTrait(sun)}. `;
      r += `La Luna in ${moon} suggerisce che cerchi amici che ${getFriendNeed(moon)}. `;
      r += `Oggi i transiti favoriscono incontri significativi.`;
      return r;
    },

    viaggi: () => {
      const jupiter = natal?.planets?.find(p => p.key === 'jupiter');
      let r = name ? `${name}, ` : '';
      r += `per i viaggi, guardo Giove. `;
      if (jupiter) r += `Giove in ${jupiter.sign} indica destinazioni ${getTravelType(jupiter.sign)}. `;
      r += `Con il Sole in ${sun}, ti senti più te stesso quando esplori luoghi ${getTravelStyle(sun)}.`;
      return r;
    },

    partner: () => {
      const venus = natal?.planets?.find(p => p.key === 'venus');
      let r = name ? `${name}, ` : '';
      r += `nel tema natale, il partner è rappresentato dalla Casa VII. `;
      if (venus) r += `Venere in ${venus.sign} indica cosa ti attrae. `;
      r += `Oggi, ascolta cosa la tua Luna in ${moon} sta cercando di dirti sulle relazioni.`;
      return r;
    },

    generale: () => {
      let r = name ? `Ciao ${name}, ` : 'Ciao, ';
      r += `sono Luna. Guardando il tuo tema natale, vedo il Sole in ${sun}, la Luna in ${moon}, e l'Ascendente in ${asc}. `;
      r += `Oggi ${dayName}, i pianeti ti invitano a fidarti della tua intuizione mentre agisci con determinazione. `;
      r += `Ricorda: l'astrologia è una bussola, non una gabbia. Tu sei il capitano della tua nave.`;
      return r;
    }
  };

  return (readings[category] || readings.generale)();
}

// ===== HELPERS =====
function getTrait(sign) {
  const t = { 'Ariete':'dinamica','Toro':'sensuale','Gemelli':'curiosa','Cancro':'accogliente',
    'Leone':'carismatica','Vergine':'precisa','Bilancia':'elegante','Scorpione':'intensa',
    'Sagittario':'avventurosa','Capricorno':'ambiziosa','Acquario':'originale','Pesci':'sensibile' };
  return t[sign] || 'unica';
}
function getVocation(mc) {
  const v = { 'Ariete':'imprenditoriali','Toro':'artistici','Gemelli':'comunicativi','Cancro':'di cura',
    'Leone':'creativi','Vergine':'analitici','Bilancia':'di mediazione','Scorpione':'di ricerca',
    'Sagittario':'di insegnamento','Capricorno':'manageriali','Acquario':'tecnologici','Pesci':'artistici' };
  return v[mc] || 'vari';
}
function getCareer(sun, natal) {
  const mc = natal?.mc?.name;
  return mc ? `legato a ${mc}` : 'della tua vocazione';
}
function getMoneyStyle(sign) {
  const m = { 'Ariete':'impulsivo ma generoso','Toro':'prudente','Gemelli':'variabile','Cancro':'protettivo',
    'Leone':'generoso','Vergine':'analitico','Bilancia':'bilanciato','Scorpione':'strategico',
    'Sagittario':'ottimista','Capricorno':'disciplinato','Acquario':'originale','Pesci':'intuitivo' };
  return m[sign] || 'personale';
}
function getHealthTip(sign) {
  const h = { 'Ariete':'attività fisica controllata','Toro':'piaceri sensoriali senza eccessi','Gemelli':'stimolare mente e rilassare nervi',
    'Cancro':'nutrire stomaco ed emozioni','Leone':'esprimere creatività','Vergine':'routine salutari',
    'Bilancia':'equilibrio nei ritmi','Scorpione':'detox periodico','Sagittario':'movimento all aperto',
    'Capricorno':'gestire stress articolazioni','Acquario':'attività in gruppo','Pesci':'riposo e acqua' };
  return h[sign] || 'ascoltare il corpo';
}
function getFamilyTrait(moon) {
  const f = { 'Ariete':'indipendente ma protettivo','Toro':'radicato','Gemelli':'comunicativo','Cancro':'profondamente legato',
    'Leone':'orgoglioso','Vergine':'pratico','Bilancia':'cerca armonia','Scorpione':'legami intensi',
    'Sagittario':'cerca libertà','Capricorno':'responsabile','Acquario':'non convenzionale','Pesci':'empatico' };
  return f[moon] || 'emotivamente coinvolto';
}
function getFriendTrait(sun) {
  const f = { 'Ariete':'un leader naturale','Toro':'un amico leale','Gemelli':'un conversatore brillante',
    'Cancro':'un confidente','Leone':'un animatore','Vergine':'un consigliere','Bilancia':'un paciere',
    'Scorpione':'un amico profondo','Sagittario':'un compagno di avventure','Capricorno':'un amico su cui contare',
    'Acquario':'un amico originale','Pesci':'un amico compassionevole' };
  return f[sun] || 'un amico speciale';
}
function getFriendNeed(moon) {
  const n = { 'Ariete':'ti stimolino','Toro':'ti offrano stabilità','Gemelli':'ti intrigino','Cancro':'ti capiscano',
    'Leone':'ti apprezzino','Vergine':'ti aiutino','Bilancia':'ti portano armonia','Scorpione':'ti condividano segreti',
    'Sagittario':'ti espandano','Capricorno':'ti rispettino','Acquario':'ti accettino','Pesci':'ti condividano sogni' };
  return n[moon] || 'ti comprendano';
}
function getTravelType(jup) {
  const t = { 'Ariete':'dinamiche','Toro':'belle','Gemelli':'culturali','Cancro':'vicine all acqua',
    'Leone':'glamour','Vergine':'organizzate','Bilancia':'eleganti','Scorpione':'misteriose',
    'Sagittario':'lontane','Capricorno':'storiche','Acquario':'innovative','Pesci':'spirituali' };
  return t[jup] || 'interessanti';
}
function getTravelStyle(sun) {
  const t = { 'Ariete':'di azione','Toro':'di piacere','Gemelli':'di scoperta','Cancro':'di radici',
    'Leone':'di lusso','Vergine':'di wellness','Bilancia':'di arte','Scorpione':'di mistero',
    'Sagittario':'di avventura','Capricorno':'di obiettivi','Acquario':'di innovazione','Pesci':'di sogno' };
  return t[sun] || 'di scoperta';
}

// ===== UI HELPERS =====
function showStatus(text) {
  const el = document.getElementById('voiceStatus');
  if (el) el.textContent = text;
}

function setMicActive(active) {
  const btn = document.getElementById('voiceMicBtn');
  if (!btn) return;

  if (active) {
    btn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
    btn.style.color = '#fff';
    btn.style.animation = 'pulse 1.5s infinite';
  } else {
    btn.style.background = 'linear-gradient(135deg, var(--gold), var(--gold-dark))';
    btn.style.color = '#1a0b2e';
    btn.style.animation = 'none';
  }
}

function pulseWaves(active) {
  const waves = document.getElementById('voiceWaves');
  if (!waves) return;

  const bars = waves.querySelectorAll('.voice-wave-bar');
  bars.forEach((bar, i) => {
    if (active) {
      bar.style.animation = `wave ${0.8 + i * 0.2}s ease-in-out infinite`;
      bar.style.animationDelay = `${i * 0.1}s`;
    } else {
      bar.style.animation = 'none';
      bar.style.height = '20px';
    }
  });
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
      lunaSpeak('Il tempo del consulto è terminato. È stato un piacere parlare con te. A presto.');
    }
  }, 1000);
}

// ===== AVVIA SESSIONE =====
export function startVoiceSession(category) {
  const user = getCurrentUser();
  if (!user) {
    alert('Devi essere loggato per usare la modalità voce');
    return false;
  }

  // Reset
  session.active = true;
  session.category = category || 'generale';
  session.startTime = Date.now();
  session.elapsedSeconds = 0;
  session.isListening = false;
  session.isSpeaking = false;

  // Init
  session.recognition = initRecognition();
  session.synthesis = initSynthesis();

  // Reset UI
  const bar = document.getElementById('voiceTimerBar');
  const text = document.getElementById('voiceTimerText');
  if (bar) { bar.style.width = '0%'; bar.style.background = 'linear-gradient(90deg, #22c55e, #16a34a)'; }
  if (text) text.textContent = '18:00';

  showStatus('⏸️ Pronta ad ascoltarti');
  setMicActive(false);
  pulseWaves(false);

  // Saluto iniziale — breve, caldo, nessun riferimento a costi o minuti
  const profile = getCurrentProfile();
  const name = profile?.full_name?.split(' ')[0] || '';

  setTimeout(() => {
    const greeting = name 
      ? `Ciao ${name}, sono Luna. Sono qui per te. Parla quando vuoi.`
      : `Ciao, sono Luna. Sono qui per te. Parla quando vuoi.`;

    lunaSpeak(greeting, () => {
      // Dopo saluto, inizia ad ascoltare
      restartListening();
    });
  }, 500);

  startTimer();
  return true;
}

// ===== TERMINA SESSIONE =====
export function endSession() {
  session.active = false;
  session.isListening = false;
  session.isSpeaking = false;

  clearTimeout(session.silenceTimer);
  clearInterval(session.timerInterval);
  session.timerInterval = null;

  if (session.recognition) {
    try { session.recognition.stop(); } catch(e) {}
    session.recognition = null;
  }

  if (session.synthesis) {
    session.synthesis.cancel();
  }

  pulseWaves(false);
  setMicActive(false);
  showStatus('Sessione terminata');

  console.log('🎙️ SESSIONE TERMINATA');
}

// ===== TOGGLE MANUALE (per bottone) =====
export function toggleListening() {
  if (!session.active) return;

  if (session.isSpeaking) {
    showStatus('🔊 Attendi che Luna finisca...');
    return;
  }

  if (session.isListening) {
    pauseListening();
    showStatus('⏸️ In pausa');
  } else {
    restartListening();
  }
}

// ===== STATO =====
export function getStatus() {
  return {
    active: session.active,
    elapsed: session.elapsedSeconds,
    remaining: session.durationSeconds - session.elapsedSeconds,
    category: session.category,
    listening: session.isListening,
    speaking: session.isSpeaking
  };
}
