// ============================================================
// TELEGRAM BOT — Luna Astrologica
// Solo gancio: oroscopo quotidiano + eventi speciali + compleanno
// Nessun comando visibile all'utente. START/STOP gestiti automaticamente.
// ============================================================

const fetch = require('node-fetch');

let supabase = null;
let botToken = null;

function initTelegram(supabaseClient, token) {
  supabase = supabaseClient;
  botToken = token;
}

// ===== WEBHOOK HANDLER =====
async function handleTelegramUpdate(update) {
  if (!update.message || !update.message.text) return;

  const msg = update.message;
  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const username = msg.chat.username || msg.from?.username || null;

  // START — collega account
  if (text.startsWith('/start')) {
    const parts = text.split(' ');
    const userId = parts[1]; // /start USER_ID

    if (userId) {
      await linkTelegramAccount(userId, chatId, username);
      await sendMessage(chatId, 
        `🌙 Benvenuto in Luna Astrologica!\n\n` +
        `Da domani mattina riceverai il tuo oroscopo quotidiano personalizzato.\n` +
        `Ti avviserò anche degli eventi astrologici importanti per te.\n\n` +
        `Per disattivare le notifiche, scrivi STOP.`
      );
    } else {
      await sendMessage(chatId,
        `🌙 Ciao! Sono Luna, la tua astrologa personale.\n\n` +
        `Per attivare le notifiche personalizzate, vai sul sito e clicca "Attiva Telegram".\n` +
        `👉 https://luna-astrologica.pages.dev/`
      );
    }
    return;
  }

  // STOP — disattiva
  if (text.toUpperCase() === 'STOP') {
    await unlinkTelegramAccount(chatId);
    await sendMessage(chatId,
      `🌙 Notifiche disattivate.\n\n` +
      `Puoi riattivarle in qualsiasi momento dal sito.\n` +
      `A presto, Luna 🌙`
    );
    return;
  }

  // Messaggio non riconosciuto — risponde con link al sito
  await sendMessage(chatId,
    `🌙 Ciao! Per consultare il tuo tema natale e parlare con me, vai sul sito:\n` +
    `👉 https://luna-astrologica.pages.dev/`
  );
}

// ===== COLLEGA ACCOUNT =====
async function linkTelegramAccount(userId, chatId, username) {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        telegram_chat_id: String(chatId),
        telegram_username: username,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) console.error('Errore link Telegram:', error.message);
    else console.log('✅ Telegram collegato per user:', userId);
  } catch (e) {
    console.error('Link Telegram error:', e.message);
  }
}

// ===== SCOLLEGA ACCOUNT =====
async function unlinkTelegramAccount(chatId) {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        telegram_chat_id: null,
        telegram_username: null,
        updated_at: new Date().toISOString()
      })
      .eq('telegram_chat_id', String(chatId));

    if (error) console.error('Errore unlink Telegram:', error.message);
    else console.log('✅ Telegram scollegato per chat:', chatId);
  } catch (e) {
    console.error('Unlink Telegram error:', e.message);
  }
}

// ===== INVIA MESSAGGIO =====
async function sendMessage(chatId, text) {
  if (!botToken) return;
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
  } catch (e) {
    console.error('Send Telegram error:', e.message);
  }
}

// ===== CRON: OROSCOPO QUOTIDIANO =====
async function sendDailyHoroscopes() {
  if (!supabase || !botToken) return;

  const today = new Date().toISOString().split('T')[0];

  try {
    // Trova utenti con telegram attivo
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, full_name, telegram_chat_id, birth_date, birth_time, birth_city, birth_latitude, birth_longitude, birth_timezone')
      .not('telegram_chat_id', 'is', null);

    if (error || !users || users.length === 0) {
      console.log('Nessun utente Telegram attivo');
      return;
    }

    console.log(`📨 Invio oroscopo a ${users.length} utenti`);

    for (const user of users) {
      const name = user.full_name?.split(' ')[0] || 'amico';

      // 1. Controlla compleanno
      const isBirthday = checkBirthday(user.birth_date);

      // 2. Genera oroscopo (semplificato per ora, poi GPT-3.5)
      let message = generateDailyHoroscope(name, user);

      // 3. Aggiungi auguri se compleanno
      if (isBirthday) {
        message = `🎂 <b>Buon compleanno, ${name}!</b>\n\n` +
          `Oggi il Sole ritorna esattamente dove era quando sei nato. ` +
          `È il tuo giorno di rinascita astrologica.\n\n` +
          message;
      }

      // 4. Aggiungi eventi speciali (max 3/mese)
      const eventMessage = await getUpcomingEventMessage(user.id, name);
      if (eventMessage) {
        message += `\n\n${eventMessage}`;
      }

      // 5. Link CTA sempre presente
      message += `\n\n👉 <a href="https://luna-astrologica.pages.dev/">Parla con Luna sul sito</a>`;

      await sendMessage(user.telegram_chat_id, message);

      // Aggiorna last_horoscope_sent
      await supabase.from('profiles').update({
        last_horoscope_sent: today,
        updated_at: new Date().toISOString()
      }).eq('id', user.id);
    }

    console.log('✅ Oroscopi inviati');
  } catch (e) {
    console.error('Daily horoscope error:', e.message);
  }
}

// ===== CHECK COMPLEANNO =====
function checkBirthday(birthDate) {
  if (!birthDate) return false;
  const today = new Date();
  const bd = new Date(birthDate);
  return today.getMonth() === bd.getMonth() && today.getDate() === bd.getDate();
}

// ===== GENERA OROSCOPO (regole, poi GPT-3.5) =====
function generateDailyHoroscope(name, user) {
  const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  const today = new Date();
  const dayName = days[today.getDay()];

  // Per ora: oroscopo generico ma personalizzato col nome
  // In futuro: usa daily_transits + GPT-3.5
  return `🌙 <b>${dayName} — Il cielo di oggi</b>\n\n` +
    `Ciao ${name}, oggi le stelle parlano di trasformazione. ` +
    `È un buon momento per riflettere su ciò che vuoi davvero.\n\n` +
    `Se vuoi un'interpretazione più profonda del tuo tema natale, ` +
    `sono qui per te.`;
}

// ===== EVENTI SPECIALI (max 3/mese) =====
async function getUpcomingEventMessage(userId, name) {
  if (!supabase) return null;

  try {
    // Controlla se già inviato 3 eventi questo mese
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);

    const { data: sentEvents, error: countErr } = await supabase
      .from('telegram_notifications')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', startOfMonth.toISOString());

    if (countErr || (sentEvents && sentEvents.length >= 3)) return null;

    // Trova prossimo evento importante
    const { data: events, error } = await supabase
      .from('upcoming_events')
      .select('*')
      .eq('user_id', userId)
      .eq('telegram_sent', false)
      .eq('severity', 'high')
      .order('event_date', { ascending: true })
      .limit(1);

    if (error || !events || events.length === 0) return null;

    const event = events[0];
    const daysUntil = Math.ceil((new Date(event.event_date) - new Date()) / (1000 * 60 * 60 * 24));

    if (daysUntil > 5 || daysUntil < 0) return null;

    // Marca come inviato
    await supabase.from('upcoming_events').update({
      telegram_sent: true,
      updated_at: new Date().toISOString()
    }).eq('id', event.id);

    // Registra invio
    await supabase.from('telegram_notifications').insert({
      user_id: userId,
      notification_type: 'event_alert',
      title: event.title,
      sent_at: new Date().toISOString()
    });

    return `⚡ <b>Evento importante</b>\n\n` +
      `${event.title}\n` +
      `${event.description}\n\n` +
      `Se vuoi prepararti, parlane con me sul sito.`;
  } catch (e) {
    console.error('Event message error:', e.message);
    return null;
  }
}

module.exports = {
  initTelegram,
  handleTelegramUpdate,
  sendDailyHoroscopes,
  sendMessage
};
