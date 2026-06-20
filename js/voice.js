// ============================================================
// VOICE.JS v4.1 — Interazione vocale con Web Speech API
// FIX: nessun loop infinito, gestione stati corretta
// Gratuito, nessuna API esterna necessaria
// Interpretazione astrologica basata su dati utente + transiti
// ============================================================

import { CONFIG } from './config.js';
import { getCurrentUser, getCurrentProfile } from './auth.js';
import { getSubscriptionStatus } from './payments.js';

// ===== STATO SESSIONE VOCE =====
let voiceSession = {
  active: false,
  category: null,
  startTime: null,
  durationSeconds: 18 * 60, // 18 minuti
  elapsedSeconds: 0,
  timerInterval: null,
  recognition: null,
  synthesis: null,
  transcript: '',
  isListening: false,
  isSpeaking: false,
  hasUserSpoken: false,
  lastActivityTime: 0
};

// ===== INIZIALIZZA RICONOSCIMENTO VOCE =====
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn('❌ SpeechRecognition non supportato dal browser');
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'it-IT';
  recognition.continuous = false;      // FIX: non continuous, evita loop
  recognition.interimResults = true;   // Mostra testo mentre parli
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    let finalTranscript = '';
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    // Aggiorna UI con testo interim (quello che stai dicendo)
    if (interimTranscript) {
      updateVoiceInterim(interimTranscript);
    }

    // Quando hai finito di parlare (isFinal)
    if (finalTranscript) {
      voiceSession.hasUserSpoken = true;
      voiceSession.lastActivityTime = Date.now();
      voiceSession.transcript = finalTranscript;

      // Mostra il messaggio definitivo dell'utente
      addVoiceMessage(finalTranscript, 'user');

      // Genera e parla la risposta
      handleUserVoiceInput(finalTranscript);
    }
  };

  recognition.onerror = (event) => {
    console.error('Errore riconoscimento:', event.error);

    if (event.error === 'no-speech') {
      // Non fare nulla, l'utente non ha parlato
      updateVoiceStatus('⏸️ In attesa... Premi il microfono per parlare', 'dim');
      voiceSession.isListening = false;
    } else if (event.error === 'aborted') {
      // L'utente ha premuto stop o cambiato pagina — normale
      voiceSession.isListening = false;
    } else {
      updateVoiceStatus('⚠️ Errore microfono: ' + event.error, 'error');
      voiceSession.isListening = false;
    }
  };

  recognition.onend = () => {
    // FIX CRITICO: NON riavviare automaticamente!
    // Lascia che l'utente premi il microfono quando vuole parlare
    voiceSession.isListening = false;
    updateVoiceStatus('⏸️ In attesa... Premi il microfono per parlare', 'dim');
    updateMicButtonState(false);
  };

  return recognition;
}

// ===== INIZIALIZZA SINTESI VOCE =====
function initSpeechSynthesis() {
  const synth = window.speechSynthesis;
  if (!synth) {
    console.warn('❌ SpeechSynthesis non supportato');
    return null;
  }
  return synth;
}

// ===== TROVA VOCE ITALIANA =====
function getItalianVoice() {
  const voices = window.speechSynthesis.getVoices();

  // Cerca voce italiana femminile preferita
  const preferred = voices.find(v =>
    v.lang.startsWith('it') &&
    (v.name.includes('Female') || v.name.includes('femmina') || 
     v.name.includes('Anna') || v.name.includes('Alice') || 
     v.name.includes('Elsa') || v.name.includes('Bianca'))
  );
  if (preferred) return preferred;

  // Fallback qualsiasi voce italiana
  const italian = voices.find(v => v.lang.startsWith('it'));
  if (italian) return italian;

  // Ultimo fallback: prima voce disponibile
  return voices[0];
}

// ===== PARLA (TTS) =====
function speak(text, onEnd) {
  const synth = voiceSession.synthesis;
  if (!synth) return;

  // Ferma eventuale parlata precedente
  synth.cancel();

  voiceSession.isSpeaking = true;
  voiceSession.isListening = false;
  updateMicButtonState(false);
  updateVoiceStatus('🔊 Luna sta parlando...', 'gold');

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = getItalianVoice();
  utterance.lang = 'it-IT';
  utterance.rate = 0.92;   // Leggermente più lento per chiarezza
  utterance.pitch = 1.05;  // Leggermente più alto, tono femminile
  utterance.volume = 1;

  utterance.onend = () => {
    voiceSession.isSpeaking = false;
    if (onEnd) onEnd();
  };

  utterance.onerror = (e) => {
    console.error('Errore TTS:', e);
    voiceSession.isSpeaking = false;
    if (onEnd) onEnd();
  };

  synth.speak(utterance);

  // Aggiungi messaggio di Luna nella conversazione
  addVoiceMessage(text, 'luna');
}

// ===== INTERPRETAZIONE ASTROLOGICA =====
function generateAstrologicalResponse(userInput, category) {
  const profile = getCurrentProfile();

  if (!profile) {
    return "Devi prima completare il tuo profilo per ricevere un'interpretazione personalizzata.";
  }

  // Recupera dati dal localStorage (tema natale calcolato)
  let natalData = null;
  try {
    const saved = localStorage.getItem('luna_natal_chart');
    if (saved) natalData = JSON.parse(saved);
  } catch(e) {}

  const sunSign = profile.sun_sign || natalData?.planets?.find(p => p.key === 'sun')?.sign || 'il tuo segno';
  const moonSign = profile.moon_sign || natalData?.planets?.find(p => p.key === 'moon')?.sign || 'una posizione lunare';
  const ascSign = profile.rising_sign || natalData?.ascendant?.name || 'il tuo ascendente';

  // Data odierna per transiti
  const today = new Date();
  const dayName = today.toLocaleDateString('it-IT', { weekday: 'long' });
  const dateStr = today.toLocaleDateString('it-IT');

  // Costruisci interpretazione basata sulla categoria
  const responses = {
    amore: generateLoveReading(sunSign, moonSign, ascSign, dayName, dateStr, natalData),
    lavoro: generateWorkReading(sunSign, moonSign, ascSign, dayName, dateStr, natalData),
    carriera: generateCareerReading(sunSign, moonSign, ascSign, dayName, dateStr, natalData),
    denaro: generateMoneyReading(sunSign, moonSign, ascSign, dayName, dateStr, natalData),
    salute: generateHealthReading(sunSign, moonSign, ascSign, dayName, dateStr, natalData),
    famiglia: generateFamilyReading(sunSign, moonSign, ascSign, dayName, dateStr, natalData),
    amici: generateFriendsReading(sunSign, moonSign, ascSign, dayName, dateStr, natalData),
    viaggi: generateTravelReading(sunSign, moonSign, ascSign, dayName, dateStr, natalData),
    partner: generatePartnerReading(sunSign, moonSign, ascSign, dayName, dateStr, natalData),
    generale: generateGeneralReading(sunSign, moonSign, ascSign, dayName, dateStr, natalData)
  };

  return responses[category] || responses.generale;
}

// ===== GENERATORI DI LETTURA PER CATEGORIA =====
function generateLoveReading(sun, moon, asc, day, date, natal) {
  const lovePlanets = natal?.planets?.filter(p =>
    ['venus', 'mars', 'moon'].includes(p.key)
  ) || [];

  const venus = lovePlanets.find(p => p.key === 'venus');
  const mars = lovePlanets.find(p => p.key === 'mars');

  let reading = `Ciao, sono Luna. Guardando il tuo tema natale, vedo che hai il Sole in ${sun} e la Luna in ${moon}. `;

  if (venus) {
    reading += `Venere, il pianeta dell'amore, si trova in ${venus.sign} a ${venus.degree}°. `;
    if (venus.sign === 'Toro' || venus.sign === 'Bilancia') {
      reading += `Questa è una posizione eccellente per Venere, ti dona un magnetismo naturale e una profonda capacità di dare e ricevere affetto. `;
    } else if (venus.sign === 'Scorpione' || venus.sign === 'Ariete') {
      reading += `Venere qui ti rende passionale e intenso nelle relazioni, a volte quasi troppo. `;
    }
  }

  if (mars) {
    reading += `Marte in ${mars.sign} indica come approcci il desiderio e la conquista. `;
  }

  reading += `Oggi, ${day} ${date}, i transiti suggeriscono di aprirti emotivamente. `;
  reading += `Con l'Ascendente in ${asc}, la prima impressione che dai agli altri è quella di una persona ${getAscendantTrait(asc)}. `;
  reading += `Il mio consiglio per il cuore oggi: segui l'intuizione lunare, ma lascia che Venere guidi le tue parole.`;

  return reading;
}

function generateWorkReading(sun, moon, asc, day, date, natal) {
  const mc = natal?.mc || {};
  const saturn = natal?.planets?.find(p => p.key === 'saturn');
  const jupiter = natal?.planets?.find(p => p.key === 'jupiter');

  let reading = `Analizzando il tuo cielo natale, ${sun} con la Luna in ${moon} mi dice che nel lavoro ti muovi con ${getElementTrait(sun)}. `;

  if (mc.name) {
    reading += `Il tuo Medio Cielo in ${mc.name} indica la vocazione professionale verso ambiti ${getMCVocation(mc.name)}. `;
  }

  if (saturn) {
    reading += `Saturno in ${saturn.sign} ti insegna la disciplina attraverso sfide specifiche nel settore lavorativo. `;
  }

  if (jupiter) {
    reading += `Giove in ${jupiter.sign} è il tuo alleato per l'espansione professionale. `;
  }

  reading += `Per oggi ${day}, il consiglio astrologico è di concentrarti su obiettivi a medio termine. `;
  reading += `L'energia di ${sun} ti supporta nelle trattative, mentre ${moon} suggerisce di fidarti del tuo istinto nelle decisioni.`;

  return reading;
}

function generateCareerReading(sun, moon, asc, day, date, natal) {
  return generateWorkReading(sun, moon, asc, day, date, natal) +
    ` Per la carriera specificamente, guarda alle opportunità che arrivano dal settore ${getCareerDirection(sun, natal)}.`;
}

function generateMoneyReading(sun, moon, asc, day, date, natal) {
  const venus = natal?.planets?.find(p => p.key === 'venus');
  const jupiter = natal?.planets?.find(p => p.key === 'jupiter');

  let reading = `Dal punto di vista finanziario, il tuo tema natale rivela molto. `;
  reading += `Con il Sole in ${sun}, il tuo approccio al denaro è ${getMoneyApproach(sun)}. `;

  if (venus) {
    reading += `Venere in ${venus.sign} influenza come attrai abbondanza. `;
  }

  if (jupiter) {
    reading += `Giove in ${jupiter.sign} indica dove puoi trovare espansione economica. `;
  }

  reading += `Oggi ${date}, i transiti suggeriscono cautela nelle spese immediate ma aperture per investimenti legati alla tua vocazione.`;

  return reading;
}

function generateHealthReading(sun, moon, asc, day, date, natal) {
  const mars = natal?.planets?.find(p => p.key === 'mars');
  const saturn = natal?.planets?.find(p => p.key === 'saturn');

  let reading = `Per la salute, guardo Marte e Saturno nel tuo tema. `;

  if (mars) {
    reading += `Marte in ${mars.sign} indica la tua energia vitale e come la esprimi fisicamente. `;
  }

  if (saturn) {
    reading += `Saturno in ${saturn.sign} indica aree dove potresti accumulare tensione se non gestisci lo stress. `;
  }

  reading += `Con ${sun} e Luna in ${moon}, il mio consiglio oggi è di ${getHealthAdvice(sun, moon)}.`;

  return reading;
}

function generateFamilyReading(sun, moon, asc, day, date, natal) {
  const moonData = natal?.planets?.find(p => p.key === 'moon');

  let reading = `La famiglia nel tuo tema natale è rappresentata principalmente dalla Luna e dalla Casa IV. `;
  reading += `Con la Luna in ${moon}, il tuo bisogno emotivo di radici è ${getMoonFamilyTrait(moon)}. `;

  if (moonData) {
    reading += `La posizione precisa a ${moonData.degree}° in ${moonData.sign} aggiunge una sfumatura ${getDegreeMeaning(moonData.degree)}. `;
  }

  reading += `Oggi è un buon giorno per riconnetterti con le origini, anche solo mentalmente.`;

  return reading;
}

function generateFriendsReading(sun, moon, asc, day, date, natal) {
  let reading = `Nelle amicizie, il tuo ${sun} ti rende ${getFriendshipTrait(sun)}. `;
  reading += `La Luna in ${moon} suggerisce che cerchi amici che ${getMoonFriendshipTrait(moon)}. `;
  reading += `Oggi i transiti favoriscono incontri casuali che potrebbero trasformarsi in legami significativi.`;
  return reading;
}

function generateTravelReading(sun, moon, asc, day, date, natal) {
  const jupiter = natal?.planets?.find(p => p.key === 'jupiter');

  let reading = `Per i viaggi, guardo Giove e la Casa IX. `;
  if (jupiter) {
    reading += `Giove in ${jupiter.sign} indica che i viaggi più fortunati per te sono verso destinazioni ${getJupiterTravel(jupiter.sign)}. `;
  }
  reading += `Con il Sole in ${sun}, ti senti più te stesso quando esplori luoghi ${getSunTravel(sun)}.`;
  return reading;
}

function generatePartnerReading(sun, moon, asc, day, date, natal) {
  const venus = natal?.planets?.find(p => p.key === 'venus');
  const mars = natal?.planets?.find(p => p.key === 'mars');

  let reading = `Nel tema natale, il partner è rappresentato dalla Casa VII e da Venere/Marte. `;
  if (venus) reading += `Venere in ${venus.sign} indica cosa ti attrae. `;
  if (mars) reading += `Marte in ${mars.sign} mostra come persegui ciò che desideri. `;
  reading += `Oggi, ascolta cosa il tuo ${moon} emotivo sta cercando di dirti sulle relazioni.`;
  return reading;
}

function generateGeneralReading(sun, moon, asc, day, date, natal) {
  return `Benvenuto nel tuo consulto astrologico vocale. Sono Luna, e guardando il tuo tema natale vedo il Sole in ${sun}, la Luna in ${moon}, e l'Ascendente in ${asc}. Oggi ${day} ${date}, i pianeti ti invitano a ${getGeneralAdvice(sun, moon, asc)}. Ricorda: l'astrologia è una bussola, non una gabbia. Tu sei il capitano della tua nave.`;
}

// ===== HELPERS TRAITS =====
function getAscendantTrait(asc) {
  const traits = {
    'Ariete': 'dinamica e coraggiosa',
    'Toro': 'sensuale e affidabile',
    'Gemelli': 'curiosa e comunicativa',
    'Cancro': 'accogliente e protettiva',
    'Leone': 'carismatica e luminosa',
    'Vergine': 'precisa e servizievole',
    'Bilancia': 'elegante e diplomatica',
    'Scorpione': 'intensa e magnetica',
    'Sagittario': 'avventurosa e ottimista',
    'Capricorno': 'ambiziosa e controllata',
    'Acquario': 'originale e indipendente',
    'Pesci': 'sensibile e compassionevole'
  };
  return traits[asc] || 'unica nel suo genere';
}

function getElementTrait(sign) {
  const elements = {
    'Ariete': 'passione e impeto', 'Leone': 'creatività e calore', 'Sagittario': 'avventura e filosofia',
    'Toro': 'concretezza e persistenza', 'Vergine': 'analisi e perfezione', 'Capricorno': 'ambizione e strategia',
    'Gemelli': 'versatilità e curiosità', 'Bilancia': 'armonia e relazione', 'Acquario': 'innovazione e idealismo',
    'Cancro': 'intuizione e nutrimento', 'Scorpione': 'trasformazione e profondità', 'Pesci': 'sensibilità e spiritualità'
  };
  return elements[sign] || 'energia personale';
}

function getMCVocation(mc) {
  const vocations = {
    'Ariete': 'imprenditoriali e competitivi',
    'Toro': 'artistici e legati alla terra',
    'Gemelli': 'comunicativi e della conoscenza',
    'Cancro': 'di cura e nutrimento',
    'Leone': 'creativi e dello spettacolo',
    'Vergine': 'analitici e del servizio',
    'Bilancia': 'di mediazione e bellezza',
    'Scorpione': 'di ricerca e trasformazione',
    'Sagittario': 'di insegnamento e viaggio',
    'Capricorno': 'manageriali e istituzionali',
    'Acquario': 'tecnologici e umanitari',
    'Pesci': 'artistici e spirituali'
  };
  return vocations[mc] || 'vari';
}

function getMoneyApproach(sign) {
  const approaches = {
    'Ariete': 'impulsivo ma generoso',
    'Toro': 'prudente ma attaccato al comfort',
    'Gemelli': 'variabile e curioso di nuove opportunità',
    'Cancro': 'protettivo e orientato alla sicurezza',
    'Leone': 'generoso e attento allo status',
    'Vergine': 'analitico e risparmiatore',
    'Bilancia': 'bilanciato ma a volte indeciso',
    'Scorpione': 'strategico e riservato',
    'Sagittario': 'ottimista e a volte spericolato',
    'Capricorno': 'disciplinato e lungimirante',
    'Acquario': 'originale e non convenzionale',
    'Pesci': 'intuitivo ma a volte confuso'
  };
  return approaches[sign] || 'personale';
}

function getHealthAdvice(sun, moon) {
  const advice = {
    'Ariete': 'fare attività fisica intensa ma controllata',
    'Toro': 'godere dei piaceri sensoriali senza eccessi',
    'Gemelli': 'stimolare la mente ma rilassare il nervosismo',
    'Cancro': 'nutrire lo stomaco e le emozioni',
    'Leone': 'esprimere creatività e curare il cuore',
    'Vergine': 'routine salutari e attenzione all intestino',
    'Bilancia': 'equilibrio e armonia nei ritmi',
    'Scorpione': 'detox emotivo e fisico periodico',
    'Sagittario': 'movimento all aperto e stretching',
    'Capricorno': 'gestire lo stress sulle ossa e articolazioni',
    'Acquario': 'circolazione e attività in gruppo',
    'Pesci': 'riposo, acqua e attività creative'
  };
  return advice[sun] || 'ascoltare il tuo corpo';
}

function getMoonFamilyTrait(moon) {
  const traits = {
    'Ariete': 'indipendente ma protettivo',
    'Toro': 'radicato e tradizionale',
    'Gemelli': 'comunicativo ma a volte distante',
    'Cancro': 'profondamente legato alle radici',
    'Leone': 'orgoglioso e generoso in famiglia',
    'Vergine': 'pratico e attento ai dettagli domestici',
    'Bilancia': 'cerca armonia in famiglia',
    'Scorpione': 'legami intensi e trasformativi',
    'Sagittario': 'cerca libertà anche in famiglia',
    'Capricorno': 'responsabile e a volte rigido',
    'Acquario': 'non convenzionale nella famiglia',
    'Pesci': 'empatico e a volte confuso nei ruoli'
  };
  return traits[moon] || 'emotivamente coinvolto';
}

function getDegreeMeaning(deg) {
  if (deg < 10) return 'di iniziazione e potenziale puro';
  if (deg < 20) return 'di sviluppo e manifestazione';
  return 'di maturità e compimento';
}

function getFriendshipTrait(sun) {
  const traits = {
    'Ariete': 'un leader naturale nel gruppo',
    'Toro': 'un amico leale e costante',
    'Gemelli': 'un conversatore brillante',
    'Cancro': 'un confidente empatico',
    'Leone': 'un animatore generoso',
    'Vergine': 'un consigliere pratico',
    'Bilancia': 'un paciere sociale',
    'Scorpione': 'un amico profondo e fedele',
    'Sagittario': 'un compagno di avventure',
    'Capricorno': 'un amico su cui contare',
    'Acquario': 'un amico originale e riformatore',
    'Pesci': 'un amico compassionevole'
  };
  return traits[sun] || 'un amico speciale';
}

function getMoonFriendshipTrait(moon) {
  const traits = {
    'Ariete': 'ti stimolino e ti sfidino',
    'Toro': 'ti offrano stabilità e comfort',
    'Gemelli': 'ti intrigino mentalmente',
    'Cancro': 'ti capiscano emotivamente',
    'Leone': 'ti apprezzino e ti applaudano',
    'Vergine': 'ti aiutino concretamente',
    'Bilancia': 'ti portano armonia',
    'Scorpione': 'ti condividano segreti profondi',
    'Sagittario': 'ti espandano gli orizzonti',
    'Capricorno': 'ti rispettino e ti sostengano',
    'Acquario': 'ti accettino per come sei',
    'Pesci': 'ti condividano sogni e intuizioni'
  };
  return traits[moon] || 'ti comprendano';
}

function getJupiterTravel(sign) {
  const places = {
    'Ariete': 'dinamiche e avventurose',
    'Toro': 'belle e confortevoli',
    'Gemelli': 'culturalmente stimolanti',
    'Cancro': 'vicine all acqua e alla storia',
    'Leone': 'glamour e dello spettacolo',
    'Vergine': 'organizzate e naturali',
    'Bilancia': 'eleganti e artistiche',
    'Scorpione': 'misteriose e trasformative',
    'Sagittario': 'lontane e filosofiche',
    'Capricorno': 'storiche e prestigiose',
    'Acquario': 'innovative e inconsuete',
    'Pesci': 'spirituali e vicine al mare'
  };
  return places[sign] || 'interessanti';
}

function getSunTravel(sign) {
  const travels = {
    'Ariete': 'di azione e sfida',
    'Toro': 'di piacere e bellezza',
    'Gemelli': 'di scoperta e varietà',
    'Cancro': 'di radici e memoria',
    'Leone': 'di lusso e celebrazione',
    'Vergine': 'di wellness e organizzazione',
    'Bilancia': 'di arte e romanticismo',
    'Scorpione': 'di mistero e trasformazione',
    'Sagittario': 'di avventura e conoscenza',
    'Capricorno': 'di obiettivi e conquista',
    'Acquario': 'di innovazione e comunità',
    'Pesci': 'di sogno e spiritualità'
  };
  return travels[sign] || 'di scoperta';
}

function getGeneralAdvice(sun, moon, asc) {
  return 'fidarti della tua intuizione mentre agisci con determinazione';
}

function getCareerDirection(sun, natal) {
  const mc = natal?.mc?.name;
  if (mc) return `legato a ${mc}`;
  return 'della tua vocazione naturale';
}

// ===== GESTISCE INPUT VOCE UTENTE =====
function handleUserVoiceInput(transcript) {
  console.log('🎤 Utente ha detto:', transcript);

  // Genera risposta astrologica
  const response = generateAstrologicalResponse(transcript, voiceSession.category);

  // Luna risponde a voce
  speak(response, () => {
    // Dopo che Luna ha finito di parlare, mostra "pronto ad ascoltare"
    if (voiceSession.active) {
      updateVoiceStatus('⏸️ In attesa... Premi il microfono per parlare', 'dim');
    }
  });
}

// ===== AGGIORNA UI VOCE — STATO =====
function updateVoiceStatus(text, type) {
  const voiceStatus = document.getElementById('voiceStatus');
  if (!voiceStatus) return;

  voiceStatus.textContent = text;

  const colors = {
    dim: 'var(--text-dim)',
    gold: 'var(--gold)',
    error: '#ef4444',
    success: '#4ade80'
  };
  voiceStatus.style.color = colors[type] || colors.dim;
}

// ===== AGGIORNA UI VOCE — TESTO INTERIM =====
function updateVoiceInterim(text) {
  const voiceInterim = document.getElementById('voiceInterim');
  if (voiceInterim) {
    voiceInterim.textContent = text;
    voiceInterim.style.display = text ? 'block' : 'none';
  }

  if (text) {
    updateVoiceStatus('🎤 Sto ascoltando...', 'success');
    updateMicButtonState(true);
  }
}

// ===== AGGIUNGI MESSAGGIO ALLA CONVERSAZIONE =====
function addVoiceMessage(text, speaker) {
  const voiceConversation = document.getElementById('voiceConversation');
  if (!voiceConversation) return;

  // Nascondi il messaggio di benvenuto se presente
  const welcome = voiceConversation.querySelector('.voice-welcome');
  if (welcome) welcome.style.display = 'none';

  const msgDiv = document.createElement('div');
  msgDiv.className = speaker === 'luna' ? 'voice-msg-luna' : 'voice-msg-user';
  msgDiv.innerHTML = speaker === 'luna' 
    ? `<strong>Luna:</strong> ${text}`
    : `<em>Tu:</em> "${text}"`;

  voiceConversation.appendChild(msgDiv);
  voiceConversation.scrollTop = voiceConversation.scrollHeight;

  // Pulisci interim
  const voiceInterim = document.getElementById('voiceInterim');
  if (voiceInterim) {
    voiceInterim.textContent = '';
    voiceInterim.style.display = 'none';
  }
}

// ===== AGGIORNA STATO BOTTONE MICROFONO =====
function updateMicButtonState(isListening) {
  const micBtn = document.getElementById('voiceMicBtn');
  if (!micBtn) return;

  if (isListening) {
    micBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
    micBtn.style.color = '#fff';
    micBtn.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v6a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`;
    micBtn.title = 'Ferma ascolto';
  } else {
    micBtn.style.background = 'linear-gradient(135deg, var(--gold), var(--gold-dark))';
    micBtn.style.color = '#1a0b2e';
    micBtn.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`;
    micBtn.title = 'Parla con Luna';
  }
}

// ===== TIMER =====
function startTimer() {
  const timerBar = document.getElementById('voiceTimerBar');
  const timerText = document.getElementById('voiceTimerText');

  voiceSession.timerInterval = setInterval(() => {
    voiceSession.elapsedSeconds++;
    const remaining = voiceSession.durationSeconds - voiceSession.elapsedSeconds;
    const progress = (voiceSession.elapsedSeconds / voiceSession.durationSeconds) * 100;

    if (timerBar) {
      timerBar.style.width = `${progress}%`;

      // Cambia colore
      const remainingMin = remaining / 60;
      if (remainingMin <= 1) {
        timerBar.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)'; // Rosso
      } else if (remainingMin <= 3) {
        timerBar.style.background = 'linear-gradient(90deg, #fbbf24, #f59e0b)'; // Giallo
      } else {
        timerBar.style.background = 'linear-gradient(90deg, #22c55e, #16a34a)'; // Verde
      }
    }

    if (timerText) {
      const min = Math.floor(remaining / 60);
      const sec = remaining % 60;
      timerText.textContent = `${min}:${sec.toString().padStart(2, '0')} rimanenti`;
    }

    // Fine sessione
    if (voiceSession.elapsedSeconds >= voiceSession.durationSeconds) {
      endVoiceSession();
      speak('Il tempo del consulto è terminato. Spero che questa conversazione ti sia stata utile. A presto, e ricorda: le stelle ti guidano, ma tu sei il capitano della tua nave.');
    }
  }, 1000);
}

// ===== AVVIA SESSIONE VOCE =====
export function startVoiceSession(category) {
  const user = getCurrentUser();
  if (!user) {
    alert('Devi essere loggato per usare la modalità voce');
    return false;
  }

  // Verifica abbonamento o pagamento
  // Per ora permetti a tutti (modalità test)
  // In produzione: if (!status.active) { alert('Abbonamento richiesto'); return; }

  // Reset stato
  voiceSession.active = true;
  voiceSession.category = category || 'generale';
  voiceSession.startTime = Date.now();
  voiceSession.elapsedSeconds = 0;
  voiceSession.transcript = '';
  voiceSession.hasUserSpoken = false;
  voiceSession.isListening = false;
  voiceSession.isSpeaking = false;

  // Inizializza Speech API
  voiceSession.recognition = initSpeechRecognition();
  voiceSession.synthesis = initSpeechSynthesis();

  // Carica voci (necessario su alcuni browser)
  if (voiceSession.synthesis) {
    voiceSession.synthesis.getVoices();
  }

  // Pulisci conversazione precedente
  const voiceConversation = document.getElementById('voiceConversation');
  if (voiceConversation) {
    voiceConversation.innerHTML = `
      <div class="voice-welcome">
        <div style="font-size: 3rem; margin-bottom: 0.5rem;">🌙</div>
        <p style="color: var(--text-muted); font-size: 0.9375rem; line-height: 1.6;">
          <strong style="color: var(--gold);">Luna ti ascolta</strong><br>
          Premi il microfono e parla. Luna risponderà interpretando il tuo tema natale.
        </p>
        <p style="color: var(--text-dim); font-size: 0.8125rem; margin-top: 0.75rem;">
          💰 Costo: €45 per 18 minuti • 🎙️ Interazione vocale reale
        </p>
      </div>
    `;
  }

  // Reset timer UI
  const timerBar = document.getElementById('voiceTimerBar');
  const timerText = document.getElementById('voiceTimerText');
  if (timerBar) {
    timerBar.style.width = '0%';
    timerBar.style.background = 'linear-gradient(90deg, #22c55e, #16a34a)';
  }
  if (timerText) {
    timerText.textContent = '18:00 rimanenti';
  }

  // Reset mic button
  updateMicButtonState(false);
  updateVoiceStatus('⏸️ In attesa... Premi il microfono per parlare', 'dim');

  // Saluto iniziale di Luna (dopo un attimo)
  const profile = getCurrentProfile();
  const name = profile?.full_name?.split(' ')[0] || 'amico';

  setTimeout(() => {
    speak(`Ciao ${name}, sono Luna. Sono pronta per il tuo consulto astrologico vocale su ${getCategoryLabel(category)}. Hai 18 minuti. Premi il microfono quando vuoi parlare, io ti ascolterò.`);
  }, 800);

  // Avvia timer
  startTimer();

  return true;
}

// ===== TERMINA SESSIONE VOCE =====
export function endVoiceSession() {
  voiceSession.active = false;
  voiceSession.isListening = false;
  voiceSession.isSpeaking = false;

  if (voiceSession.recognition) {
    try { voiceSession.recognition.stop(); } catch(e) {}
    voiceSession.recognition = null;
  }

  if (voiceSession.synthesis) {
    voiceSession.synthesis.cancel();
  }

  if (voiceSession.timerInterval) {
    clearInterval(voiceSession.timerInterval);
    voiceSession.timerInterval = null;
  }

  console.log('🎙️ Sessione voce terminata');
}

// ===== TOGGLE MICROFONO (premi per parlare, premi per fermare) =====
export function toggleVoiceListening() {
  if (!voiceSession.active) return;

  // Se Luna sta parlando, non interrompere
  if (voiceSession.isSpeaking) {
    updateVoiceStatus('🔊 Attendi che Luna finisca di parlare...', 'gold');
    return;
  }

  if (voiceSession.isListening) {
    // Ferma ascolto
    if (voiceSession.recognition) {
      try { voiceSession.recognition.stop(); } catch(e) {}
    }
    voiceSession.isListening = false;
    updateMicButtonState(false);
    updateVoiceStatus('⏸️ In attesa... Premi il microfono per parlare', 'dim');
  } else {
    // Avvia ascolto
    if (!voiceSession.recognition) {
      voiceSession.recognition = initSpeechRecognition();
    }
    if (voiceSession.recognition) {
      try {
        voiceSession.recognition.start();
        voiceSession.isListening = true;
        updateMicButtonState(true);
        updateVoiceStatus('🎤 Sto ascoltando... Parla ora', 'success');
      } catch(e) {
        console.error('Errore avvio ascolto:', e);
        updateVoiceStatus('⚠️ Errore microfono. Riprova.', 'error');
      }
    }
  }
}

// ===== PAUSA/RIPRENDI (per uso esterno) =====
export function pauseVoiceSession() {
  if (voiceSession.recognition) {
    try { voiceSession.recognition.stop(); } catch(e) {}
  }
  voiceSession.isListening = false;
  updateMicButtonState(false);
  updateVoiceStatus('⏸️ In pausa', 'dim');
}

export function resumeVoiceSession() {
  if (voiceSession.recognition && voiceSession.active && !voiceSession.isSpeaking) {
    try {
      voiceSession.recognition.start();
      voiceSession.isListening = true;
      updateMicButtonState(true);
    } catch(e) {}
  }
}

// ===== HELPER =====
function getCategoryLabel(cat) {
  const labels = {
    amore: 'amore', denaro: 'denaro', lavoro: 'lavoro', salute: 'salute',
    famiglia: 'famiglia', amici: 'amicizia', viaggi: 'viaggi',
    partner: 'relazioni di coppia', carriera: 'carriera', generale: 'tema generale'
  };
  return labels[cat] || 'tema generale';
}

// ===== STATO ESPORTATO =====
export function getVoiceSessionStatus() {
  return {
    active: voiceSession.active,
    elapsed: voiceSession.elapsedSeconds,
    remaining: voiceSession.durationSeconds - voiceSession.elapsedSeconds,
    category: voiceSession.category,
    isListening: voiceSession.isListening,
    isSpeaking: voiceSession.isSpeaking
  };
}
