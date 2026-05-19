// ============================================================
// CHAT.JS — Motore conversazionale
// Per ora: risposte mock. Step D: collegamento OpenAI
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
    addMessage("user", `Vorrei parlare di ${label}`);

    setTimeout(() => {
        addMessage("ai",
            `Capisco il tuo interesse per ${label}. Prima di entrare nel vivo, ` +
            `vorrei ricordarti che l'astrologia è uno strumento di consapevolezza, ` +
            `non una sentenza.\n\nQuando sei pronto, raccontami la tua situazione ` +
            `specifica: cosa ti porta a cercare orientamento in questo ambito oggi?`
        );
    }, 600);
}

// ===== INVIA MESSAGGIO =====
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
        addMessage("ai", "⚡ I tuoi crediti sono esauriti. Ricarica per continuare.");
        return;
    }

    addMessage("user", text);
    input.value = "";

    // Genera risposta mock
    setTimeout(() => {
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
        addMessage("ai", reply);

        // Consuma credito
        if (onCreditUsed) onCreditUsed();
    }, 1200);
}

// ===== AGGIUNGI MESSAGGIO =====
export function addMessage(sender, text) {
    const box = document.getElementById("chatMessages");
    if (!box) return;

    const div = document.createElement("div");
    div.className = `msg msg-${sender}`;

    const paragraphs = text.split("\n")
        .map(line => line.trim() ? `<p>${line}</p>` : "")
        .join("");

    const time = new Date().toLocaleTimeString("it-IT", {
        hour: "2-digit", minute: "2-digit"
    });

    div.innerHTML = `${paragraphs}<div class="msg-meta">${sender === "ai" ? "Luna" : "Tu"} • ${time}</div>`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

// ===== TORNA INDIETRO =====
export function goBackFromChat(lastPageRef) {
    const target = lastPageRef === "chat" ? "home" : lastPageRef;
    if (window.app) window.app.showPage(target);
}

// ===== GETTER =====
export function getChatMode() { return chatMode; }
