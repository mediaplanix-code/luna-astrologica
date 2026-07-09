import { CONFIG } from './config.js';
import { $, $$, toast, state } from './utils.js';
import { updateCreditBadge } from './ui.js';

const TEMPLATES = {
  love: 'Ciao, vorrei un'interpretazione astrologica sulla mia situazione sentimentale attuale. Cosa dicono i pianeti?',
  career: 'Ciao, mi interessa sapere come influiscono i transiti attuali sulla mia carriera e prospettive lavorative.',
  spirit: 'Ciao, vorrei orientamento spirituale e consigli per la mia crescita personale secondo il mio tema natale.'
};

const ASTRO_RESPONSES = [
  'I pianeti suggeriscono un periodo di riflessione. Mercurio retrogrado invita a rivedere le priorità prima di agire.',
  'L'allineamento tra Venere e Giove porta opportunità di armonia. È un buon momento per rafforzare i legami.',
  'Marte in transito nel tuo settore lavorativo indica energia da canalizzare. Evita confronti diretti oggi.',
  'La Luna piena di questa settimana chiude un ciclo emotivo. Lascia andare ciò che non serve più.',
  'Saturno ti ricorda che la pazienza è una virtù. I risultati duraturi richiedono tempo e dedizione.',
  'Il tuo ascendente riceve un'influenza positiva da Giove. Nuove porte si stanno aprendo, sii pronto.',
  'Nettuno sfuma i confini: attenzione alle illusioni. Verifica i fatti prima di prendere decisioni importanti.',
  'L'energia del Sole nel tuo segno ti rende magnetico. Usa questo carisma per i tuoi obiettivi.',
  'Plutone lavora in profondità: trasformazioni radicali sono in atto. Abbraccia il cambiamento.',
  'Urano porta improvvisi cambiamenti di programma. Sii flessibile e adattabile oggi.'
];

export function initChat() {
  $$('.template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tmpl = btn.dataset.template;
      if (TEMPLATES[tml]) $('#chat-input').value = TEMPLATES[tml];
    });
  });

  $('#btn-send')?.addEventListener('click', sendMessage);
  $('#chat-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  document.addEventListener('section:change', (e) => {
    if (e.detail.section === 'chat') {
      $('#chat-credits').textContent = state.credits;
    }
  });
}

function addMessage(text, sender) {
  const container = $('#chat-messages');
  const msg = document.createElement('div');
  msg.className = `chat-message ${sender}`;
  const time = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  msg.innerHTML = `
    <div class="msg-text">${escapeHtml(text)}</div>
    <div class="msg-meta">${sender === 'user' ? 'Tu' : 'Astrologa'} • ${time}</div>
  `;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function sendMessage() {
  const input = $('#chat-input');
  const text = input.value.trim();
  if (!text) return;

  const sb = await (await import('./config.js')).getSupabase();
  let hasCredits = false;
  try {
    const { data: enough } = await sb.rpc(CONFIG.RPC.HAS_ENOUGH_CREDITS, {
      p_user_id: state.user.id,
      p_required: CONFIG.CREDIT_PER_MESSAGE
    });
    hasCredits = enough;
  } catch (e) {
    hasCredits = state.credits >= CONFIG.CREDIT_PER_MESSAGE;
  }

  if (!hasCredits) {
    toast('Crediti insufficienti! Acquista un pacchetto.', 'error');
    return;
  }

  let convId = null;
  try {
    const { data: conv } = await sb
      .from(CONFIG.TABLES.CONVERSATIONS)
      .insert({
        user_id: state.user.id,
        mode: 'chat',
        topic: text.substring(0, 50),
        status: 'active',
        message_count: 0,
        credit_spent: 0,
        started_at: new Date().toISOString(),
        last_message_at: new Date().toISOString()
      })
      .select()
      .single();
    convId = conv.id;

    await sb.from(CONFIG.TABLES.MESSAGES).insert({
      conversation_id: convId,
      user_id: state.user.id,
      role: 'user',
      content: text,
      created_at: new Date().toISOString()
    });

    await sb.rpc(CONFIG.RPC.CONSUME_CREDITS, {
      p_user_id: state.user.id,
      p_amount: CONFIG.CREDIT_PER_MESSAGE,
      p_conversation_id: convId,
      p_description: 'Chat consumption'
    });

    state.credits -= CONFIG.CREDIT_PER_MESSAGE;
    updateCreditBadge();
    $('#chat-credits').textContent = state.credits;

  } catch (err) {
    console.error('Chat error:', err);
    toast('Errore invio messaggio. Riprova.', 'error');
    return;
  }

  addMessage(text, 'user');
  input.value = '';

  $('#btn-send').disabled = true;
  $('#btn-send').textContent = '...';

  setTimeout(async () => {
    const response = ASTRO_RESPONSES[Math.floor(Math.random() * ASTRO_RESPONSES.length)];

    try {
      await sb.from(CONFIG.TABLES.MESSAGES).insert({
        conversation_id: convId,
        user_id: state.user.id,
        role: 'assistant',
        content: response,
        created_at: new Date().toISOString()
      });
    } catch (e) {
      console.error('Save response error:', e);
    }

    addMessage(response, 'astro');
    $('#btn-send').disabled = false;
    $('#btn-send').textContent = 'Invia';
  }, 1200 + Math.random() * 800);
}
