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
      if (TEMPLATES[tmpl]) $('#chat-input').value = TEMPLATES[tmpl];
    });
  });

  $('#btn-send')?.addEventListener('click', sendMessage);
  $('#chat-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  document.addEventListener('section:change', (e) => {
    if (e.detail.section === 'chat') {
      $('#chat-credits').textContent = state.credits;
      loadConversations();
    }
  });
}

async function loadConversations() {
  if (!state.user) return;
  const sb = await (await import('./config.js')).getSupabase();

  try {
    const { data: convs } = await sb
      .from(CONFIG.TABLES.CONVERSATIONS)
      .select('*')
      .eq('user_id', state.user.id)
      .eq('status', 'active')
      .order('last_message_at', { ascending: false })
      .limit(10);

    const list = $('#conversations-list');
    if (!convs || convs.length === 0) {
      list.innerHTML = '<p class="text-muted" style="font-size:0.85rem;">Nessuna conversazione attiva.</p>';
      return;
    }

    list.innerHTML = '';
    convs.forEach(c => {
      const div = document.createElement('div');
      div.className = 'conversation-item';
      div.style.cssText = 'padding:8px 12px;background:var(--navy);border-radius:6px;margin-bottom:6px;cursor:pointer;font-size:0.85rem;';
      div.innerHTML = `
        <div style="font-weight:500;">${c.topic || 'Conversazione'}</div>
        <div style="color:var(--text-dim);font-size:0.75rem;">${c.message_count} messaggi</div>
      `;
      div.addEventListener('click', () => loadConversationMessages(c.id));
      list.appendChild(div);
    });
  } catch (err) {
    console.error('Conversations load error:', err);
  }
}

async function loadConversationMessages(convId) {
  state.currentConversation = convId;
  const sb = await (await import('./config.js')).getSupabase();

  try {
    const { data: msgs } = await sb
      .from(CONFIG.TABLES.MESSAGES)
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    const container = $('#chat-messages');
    container.innerHTML = '';

    if (msgs) {
      msgs.forEach(m => {
        addMessage(m.content, m.role === 'user' ? 'user' : 'astro', false);
      });
    }
  } catch (err) {
    console.error('Messages load error:', err);
  }
}

function addMessage(text, sender, animate = true) {
  const container = $('#chat-messages');
  const msg = document.createElement('div');
  msg.className = `chat-message ${sender}`;
  if (animate) msg.style.animation = 'fadeIn 0.3s ease';
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

  // Verifica crediti via RPC
  const sb = await (await import('./config.js')).getSupabase();
  let hasCredits = false;
  try {
    const { data: enough } = await sb.rpc(CONFIG.RPC.HAS_ENOUGH_CREDITS, {
      p_user_id: state.user.id,
      p_required: CONFIG.CREDIT_PER_MESSAGE
    });
    hasCredits = enough;
  } catch (e) {
    // Fallback: controlla state locale
    hasCredits = state.credits >= CONFIG.CREDIT_PER_MESSAGE;
  }

  if (!hasCredits) {
    toast('Crediti insufficienti! Acquista un pacchetto.', 'error');
    return;
  }

  // Consuma crediti via RPC
  let convId = state.currentConversation;
  try {
    if (!convId) {
      // Crea nuova conversazione
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
      state.currentConversation = convId;
    }

    // Salva messaggio utente
    await sb.from(CONFIG.TABLES.MESSAGES).insert({
      conversation_id: convId,
      user_id: state.user.id,
      role: 'user',
      content: text,
      created_at: new Date().toISOString()
    });

    // Consuma credito
    await sb.rpc(CONFIG.RPC.CONSUME_CREDITS, {
      p_user_id: state.user.id,
      p_amount: CONFIG.CREDIT_PER_MESSAGE,
      p_conversation_id: convId,
      p_description: 'Chat consumption'
    });

    // Aggiorna crediti locali
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

  // Risposta simulata astrologa
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

      // Aggiorna contatore conversazione
      await sb.from(CONFIG.TABLES.CONVERSATIONS)
        .update({
          message_count: sb.rpc('increment', { x: 1 }),
          credit_spent: sb.rpc('increment', { x: CONFIG.CREDIT_PER_MESSAGE }),
          last_message_at: new Date().toISOString()
        })
        .eq('id', convId);
    } catch (e) {
      console.error('Save response error:', e);
    }

    addMessage(response, 'astro');
    $('#btn-send').disabled = false;
    $('#btn-send').textContent = 'Invia';
  }, 1200 + Math.random() * 800);
}
