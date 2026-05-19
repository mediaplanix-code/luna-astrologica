// // ============================================================
// CHAT.JS — Motore conversazionale
// UNA SOLA DOMANDA E UNA SOLA RISPOSTA — NO STORICO
// ============================================================

import { CONFIG, CATEGORY_LABELS } from './config.js';
import { getSunSign } from './utils.js';

let chatMode = "chat";
let lastPage = "home";

// ===== SET MODE =====
export function setChatMode(mode) {
    chatMode = mode;
    const chatBtn = document.getElementById("mode-chat");
    const voiceBtn = document.getElementById("mode-voice");
    if (chatBtn) chatBtn.classList.toggle("active", mode === "chat");
    if (voiceBtn) voiceBtn.classList.toggle("active", mode === "voice");
}

// ===== AVVIA CHAT PER CATEGORIA =====
export function startCategoryChat(topic) {
    if (window.app) window.app.showPage("chat");
    const label = CATEGORY_LABELS[topic] || topic;
    
    // Reset messaggio iniziale con contesto
    const box = document.getElementById("chatMessages");
    if (box) {
        box.innerHTML = `
            <div class="msg msg-ai" id="currentExchange">
                <p>Parliamo di <strong>${label}</strong>. Cosa vorresti sapere?</p>
                <div class="msg-meta">Luna • ora</div>
            </div>
        `;
    }
    
    const input = document.getElementById("chatInput");
    if (input) input.focus();
}

// ===== AVVIA CHAT SU ARGOMENTO SPECIFICO =====
export function startChatAbout(topic) {
    if (window.app) window.app.showPage("chat");
    
    const topics = {
        ruota: "la Ruota del Tema Natale",
        pianeti: "la Posizione dei Pianeti",
        case: "le Case Astrologiche",
        aspetti: "gli Aspetti Planetari",
        transiti: "i Transiti Planetari"
    };
    
    const box = document.getElementById("chatMessages");
    if (box) {
        box.innerHTML = `
            <div class="msg msg-ai" id="currentExchange">
                <p>Cosa vorresti sapere su <strong>${topics[topic] || topic}</strong>? Sono qui per spiegarti tutto nel dettaglio.</p>
                <div class="msg-meta">Luna • ora</div>
            </div>
        `;
    }
    
    const input = document.getElementById("chatInput");
    if (input) {
        input.value = "";
        input.focus();
    }
}

// ===== AVVIA VOCE SU ARGOMENTO =====
export function startVoiceAbout(topic) {
    startChatAbout(topic);
    setChatMode("voice");
    
    const box = document.getElementById("chatMessages");
    if (box) {
        box.innerHTML = `
            <div class="msg msg-ai" id="currentExchange">
                <p>🎙️ <strong>Modalità Voce</strong><br><br>
                Stiamo preparando un'esperienza di dialogo vocale con l'astrologa.<br><br>
                Nel frattempo puoi scrivermi la tua domanda su <strong>${topic}</strong> e ti risponderò subito.</p>
                <div class="msg-meta">Luna • ora</div>
            </div>
        `;
    }
}

// ===== INVIA MESSAGGIO (UNA SOLA DOMANDA/RISPOSTA) =====
export function sendMessage(currentUser, currentProfile, credits, onCreditUsed) {
    const input = document.getElementById("chatInput");
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    // Verifica auth
    if (!currentUser) {
        if (window.app) window.app.openAuthModal();
        return;
    }

    // Verifica crediti
    if (credits <= 0) {
        showSingleExchange("⚡ I tuoi crediti sono esauriti. Ricarica per continuare.");
        return;
    }

    // Sostituisci il contenuto con DOMANDA + RISPOSTA (una sola volta)
    const sunSign = currentProfile?.sun_sign || getSunSign(currentProfile?.birth_date) || "---";

    const replies = [
        `Capisco che questa situazione ti faccia sentire bloccato. ` +
        `Non è un caso: con il tuo Sole in ${sunSign} e la Luna che transita ` +
        `in questi giorni, c'è un'energia di ristrutturazione in atto. ` +
        `Cosa ti spinge di più a cercare una risposta proprio oggi?`,

        `Interessante domanda. Dal punto di vista astrologico, stiamo ` +
        `attraversando un periodo dove Mercurio favorisce la riflessione ` +
        `profonda. Vuoi che esploriamo insieme come questo transito si ` +
        `collega alla tua situazione personale?`,

        `Sento la profondità della tua domanda. L'astrologia non dà ` +
        `risposte scontate, ma ti aiuta a vedere i pattern. Raccontami ` +
        `di più: c'è un evento specifico che ha scatenato questa riflessione?`
    ];

    const reply = replies[Math.floor(Math.random() * replies.length)];

    // SOSTITUISCI il contenuto, non aggiungere
    showSingleExchange(reply, text);

    // Consuma credito
    if (onCreditUsed) onCreditUsed();

    // Pulisci input
    input.value = "";
}

// ===== MOSTRA UNICA DOMANDA/RISPOSTA =====
function showSingleExchange(aiReply, userText) {
    const box = document.getElementById("chatMessages");
    if (!box) return;

    const time = new Date().toLocaleTimeString("it-IT", {
        hour: "2-digit", minute: "2-digit"
    });

    // SOSTITUISCI tutto con una sola conversazione
    box.innerHTML = `
        <div class="msg msg-user">
            <p>${userText || "..."}</p>
            <div class="msg-meta">Tu • ${time}</div>
        </div>
        <div class="msg msg-ai">
            <p>${aiReply}</p>
            <div class="msg-meta">Luna • ${time}</div>
        </div>
    `;
    
    box.scrollTop = box.scrollHeight;
}

// ===== MOSTRA SOLO MESSAGGIO AI (per errori) =====
function showSingleExchange(aiReply) {
    const box = document.getElementById("chatMessages");
    if (!box) return;

    const time = new Date().toLocaleTimeString("it-IT", {
        hour: "2-digit", minute: "2-digit"
    });

    box.innerHTML = `
        <div class="msg msg-ai">
            <p>${aiReply}</p>
            <div class="msg-meta">Luna • ${time}</div>
        </div>
    `;
}

// ===== TORNA INDIETRO =====
export function goBackFromChat(lastPageRef) {
    const target = lastPageRef === "chat" ? "home" : lastPageRef;
    if (window.app) window.app.showPage(target);
}

// ===== GETTER =====
export function getChatMode() { return chatMode; }