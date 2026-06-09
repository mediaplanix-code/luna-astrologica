// ============================================================
// services/telegram.js v2 — Bot Telegram Push-Only
// FIX: nome personalizzato, no comandi utente, link login automatico
// ============================================================

const supabase = require('../config/supabase');
const crypto = require('crypto');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SITE_URL = process.env.SITE_URL || 'https://luna-astrologica.pages.dev';
const JWT_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'fallback-secret-change-me';

const SIGN_EMOJI = {
 'Ariete': '♈', 'Toro': '♉', 'Gemelli': '♊', 'Cancro': '♋',
 'Leone': '♌', 'Vergine': '♍', 'Bilancia': '♎', 'Scorpione': '♏',
 'Sagittario': '♐', 'Capricorno': '♑', 'Acquario': '♒', 'Pesci': '♓'
};

// ===== GENERA LINK LOGIN AUTOMATICO =====
function generateLoginToken(userId) {
 const timestamp = Date.now();
 const data = `${userId}:${timestamp}`;
 const hash = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('hex');
 return `${hash}.${timestamp}`;
}

function getLoginUrl(userId) {
 const token = generateLoginToken(userId);
 return `${SITE_URL}/?auto_login=${encodeURIComponent(token)}&uid=${encodeURIComponent(userId)}`;
}

// ===== INVIA MESSAGGIO TELEGRAM =====
async function sendTelegramMessage(chatId, text, options = {}) {
 if (!BOT_TOKEN) {
 console.warn('TELEGRAM_BOT_TOKEN mancante');
 return { error: 'Token mancante' };
 }

 try {
 const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
 const body = {
 chat_id: chatId,
 text: text,
 parse_mode: 'HTML',
 disable_web_page_preview: false,
 ...options
 };

 const res = await fetch(url, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(body)
 });

 const data = await res.json();
 if (!data.ok) {
 console.error('Telegram API error:', data.description);
 return { error: data.description };
 }

 return { success: true, messageId: data.result.message_id };
 } catch (err) {
 console.error('Telegram send error:', err.message);
 return { error: err.message };
 }
}

// ===== GENERA OROSCOPO GIORNALIERO PERSONALIZZATO =====
function generateDailyHoroscope(name, sign, transits, dailyData) {
 const emoji = SIGN_EMOJI[sign] || '✨';
 const firstName = name?.split(' ')[0] || name || 'amico';
 const today = new Date().toLocaleDateString('it-IT', {
 weekday: 'long', day: 'numeric', month: 'long'
 });

 let text = `<b>${emoji} Buongiorno, ${firstName}!</b>\n\n`;
 text += `<i>Oggi ${today} il cielo ha un messaggio per te...</i>\n\n`;

 // Intestazione segno
 const signTexts = {
 'Ariete': 'Marte infonde coraggio nelle tue azioni.',
 'Toro': 'Venere avvolge la tua giornata di dolcezza.',
 'Gemelli': 'Mercurio accelera i tuoi pensieri e le comunicazioni.',
 'Cancro': 'La Luna risveglia la tua sensibilità più profonda.',
 'Leone': 'Il Sole accende il tuo cuore e la tua creatività.',
 'Vergine': 'La precisione oggi è la tua alleata più potente.',
 'Bilancia': 'L\'armonia che cerchi inizia dentro di te.',
 'Scorpione': 'La tua intuizione è affilata come un rasoio.',
 'Sagittario': 'L\'orizzonte si allarga, l\'avventura chiama.',
 'Capricorno': 'Ogni passo solido oggi costruisce il tuo domani.',
 'Acquario': 'Le tue idee illuminano chi ti circonda.',
 'Pesci': 'La creatività scorre come un fiume in piena.'
 };

 text += `${signTexts[sign] || 'Il cielo oggi ha un messaggio speciale per te.'}\n\n`;

 // Transiti reali del giorno
 if (dailyData?.active_aspects && dailyData.active_aspects.length > 0) {
 text += `<b>🌟 Transiti di oggi:</b>\n`;
 const topAspects = dailyData.active_aspects.slice(0, 3);
 topAspects.forEach(a => {
 const planetName = a.transitPlanet?.charAt(0).toUpperCase() + a.transitPlanet?.slice(1);
 const natalName = a.natalPlanet?.charAt(0).toUpperCase() + a.natalPlanet?.slice(1);
 text += `• ${planetName} ${a.aspect} ${natalName}\n`;
 });
 text += `\n`;
 }

 // Case attivate
 if (dailyData?.activated_houses && dailyData.activated_houses.length > 0) {
 text += `<b>🏠 Case attivate:</b> ${dailyData.activated_houses.join(', ')}\n\n`;
 }

 // Consiglio pratico
 if (dailyData?.consiglio_pratico) {
 text += `<b>💫 Consiglio di Luna:</b>\n`;
 text += `<i>${dailyData.consiglio_pratico}</i>\n\n`;
 }

 // Link al sito
 text += `<b>🔮 Vuoi approfondire?</b>\n`;
 text += `Parla con me o scopri i tuoi transiti completi → `;

 return text;
}

// ===== GENERA EVENTI IMPORTANTI =====
function generateEventsMessage(name, events, sign) {
 const emoji = SIGN_EMOJI[sign] || '✨';
 const firstName = name?.split(' ')[0] || name || 'amico';

 let text = `<b>${emoji} Ciao ${firstName}, ho visto qualcosa nel cielo...</b>\n\n`;
 text += `<i>Eventi importanti in arrivo per te:</i>\n\n`;

 events.forEach((e, i) => {
 const date = new Date(e.event_date).toLocaleDateString('it-IT', {
 day: 'numeric', month: 'long'
 });
 const severityEmoji = e.severity === 'high' ? '🔴' : e.severity === 'medium' ? '🟡' : '🟢';
 text += `${severityEmoji} <b>${e.title}</b>\n`;
 text += `📅 ${date}\n`;
 if (e.description) {
 text += `${e.description}\n`;
 }
 text += `\n`;
 });

 text += `<b>🌙 Preparati con Luna</b>\n`;
 text += `Scopri cosa ti riserva il cielo → `;

 return text;
}

// ===== GENERA AUGURI COMPLEANNO =====
function generateBirthdayMessage(name, sign, age) {
 const emoji = SIGN_EMOJI[sign] || '🎂';
 const firstName = name?.split(' ')[0] || name || 'amico';

 let text = `<b>${emoji} Buon Compleanno, ${firstName}!</b> 🎉🌙\n\n`;
 text += `Oggi il Sole torna esattamente dove era quando sei nato. `;
 text += `È il tuo <b>ritorno solare</b> — un nuovo anno astrologico che inizia.\n\n`;

 if (age) {
 text += `🎂 <b>${age} anni di stelle</b> ti hanno portato qui.\n\n`;
 }

 text += `🎁 <b>Regalo di Luna:</b> 5 crediti bonus per il tuo nuovo anno!\n`;
 text += `Usali per chattare con me o scoprire i transiti del tuo anno.\n\n`;
 text += `<b>🔮 Cosa ti riserva questo anno?</b>\n`;
 text += `Entra nel tuo universo personale → `;

 return text;
}

// ===== INVIA OROSCOPO GIORNALIERO A TUTTI =====
async function sendDailyHoroscopes() {
 if (!supabase) {
 console.warn('Supabase non disponibile');
 return;
 }

 try {
 const { data: users, error } = await supabase
 .from('profiles')
 .select('id, full_name, sun_sign, telegram_chat_id, daily_horoscope_enabled')
 .not('telegram_chat_id', 'is', null)
 .eq('daily_horoscope_enabled', true);

 if (error) {
 console.error('Errore recupero utenti:', error.message);
 return;
 }

 console.log(`📨 Invio oroscopo a ${users?.length || 0} utenti Telegram`);

 for (const user of users || []) {
 if (!user.sun_sign || !user.telegram_chat_id) continue;

 const today = new Date().toISOString().split('T')[0];

 // Recupera i transiti giornalieri già calcolati
 const { data: daily } = await supabase
 .from('daily_transits')
 .select('*')
 .eq('user_id', user.id)
 .eq('transit_date', today)
 .single();

 // Se non esistono, calcolali al volo
 let dailyData = daily;
 if (!dailyData) {
 const { calculateAndSaveDailyTransits } = require('./daily-transits');
 const result = await calculateAndSaveDailyTransits(user.id);
 if (result.success) {
 const { data: fresh } = await supabase
 .from('daily_transits')
 .select('*')
 .eq('user_id', user.id)
 .eq('transit_date', today)
 .single();
 dailyData = fresh;
 }
 }

 const loginUrl = getLoginUrl(user.id);
 const text = generateDailyHoroscope(
 user.full_name,
 user.sun_sign,
 dailyData?.transit_planets,
 dailyData
 ).replace(/→ $/, `→ <a href="${loginUrl}">Entra nel sito</a>`);

 const result = await sendTelegramMessage(user.telegram_chat_id, text);

 if (result.success) {
 console.log(`✅ Oroscopo inviato a ${user.full_name || user.id}`);
 } else {
 console.error(`❌ Errore invio a ${user.id}:`, result.error);
 }
 }
 } catch (err) {
 console.error('Errore sendDailyHoroscopes:', err.message);
 }
}

// ===== INVIA EVENTI IMPORTANTI (max 3 al mese) =====
async function sendUpcomingEvents() {
 if (!supabase) return;

 try {
 const today = new Date().toISOString().split('T')[0];
 const nextMonth = new Date();
 nextMonth.setDate(nextMonth.getDate() + 30);

 // Recupera eventi non ancora inviati
 const { data: events, error } = await supabase
 .from('upcoming_events')
 .select('*')
 .gte('event_date', today)
 .lte('event_date', nextMonth.toISOString().split('T')[0])
 .eq('telegram_sent', false)
 .order('event_date', { ascending: true });

 if (error) {
 console.error('Errore recupero eventi:', error.message);
 return;
 }

 // Raggruppa per utente (max 3 eventi)
 const byUser = {};
 for (const e of events || []) {
 if (!byUser[e.user_id]) byUser[e.user_id] = [];
 if (byUser[e.user_id].length < 3) {
 byUser[e.user_id].push(e);
 }
 }

 for (const [userId, userEvents] of Object.entries(byUser)) {
 const { data: profile } = await supabase
 .from('profiles')
 .select('full_name, sun_sign, telegram_chat_id')
 .eq('id', userId)
 .single();

 if (!profile?.telegram_chat_id) continue;

 const loginUrl = getLoginUrl(userId);
 const text = generateEventsMessage(
 profile.full_name,
 userEvents,
 profile.sun_sign
 ).replace(/→ $/, `→ <a href="${loginUrl}">Entra nel sito</a>`);

 const result = await sendTelegramMessage(profile.telegram_chat_id, text);

 if (result.success) {
 // Marca eventi come inviati
 for (const e of userEvents) {
 await supabase
 .from('upcoming_events')
 .update({ telegram_sent: true })
 .eq('id', e.id);
 }
 console.log(`✅ Eventi inviati a ${profile.full_name || userId}`);
 }
 }
 } catch (err) {
 console.error('Errore sendUpcomingEvents:', err.message);
 }
}

// ===== INVIA AUGURI COMPLEANNO =====
async function sendBirthdayWishes() {
 if (!supabase) return;

 try {
 const today = new Date();
 const month = String(today.getMonth() + 1).padStart(2, '0');
 const day = String(today.getDate()).padStart(2, '0');
 const todayPattern = `%-${month}-${day}`;

 const { data: birthdays, error } = await supabase
 .from('profiles')
 .select('id, full_name, birth_date, sun_sign, telegram_chat_id, credits')
 .not('telegram_chat_id', 'is', null)
 .ilike('birth_date', todayPattern);

 if (error) {
 console.error('Errore recupero compleanni:', error.message);
 return;
 }

 for (const user of birthdays || []) {
 const birthYear = parseInt(user.birth_date.split('-')[0]);
 const age = today.getFullYear() - birthYear;

 const loginUrl = getLoginUrl(user.id);
 const text = generateBirthdayMessage(
 user.full_name,
 user.sun_sign,
 age
 ).replace(/→ $/, `→ <a href="${loginUrl}">Entra nel sito</a>`);

 const result = await sendTelegramMessage(user.telegram_chat_id, text);

 if (result.success) {
 // Aggiungi 5 crediti bonus
 await supabase
 .from('profiles')
 .update({ credits: (user.credits || 0) + 5 })
 .eq('id', user.id);

 console.log(`🎂 Auguri inviati a ${user.full_name}`);
 }
 }
 } catch (err) {
 console.error('Errore sendBirthdayWishes:', err.message);
 }
}

// ===== WEBHOOK TELEGRAM (solo per collegamento account, NO comandi) =====
async function handleTelegramWebhook(update) {
 if (!update.message) return;

 const chatId = update.message.chat.id;
 const text = update.message.text || '';
 const username = update.message.from?.username || update.message.from?.first_name || 'amico';

 console.log('Telegram message:', { chatId, username, text });

 // Solo /start per il primo collegamento — nessun altro comando
 if (text === '/start') {
 const welcome = `<b>🌙 Benvenuto in Luna Astrologica, ${username}!</b>\n\n`;
 welcome += `Sono Luna, la tua astrologa personale.\n`;
 welcome += `Per ricevere i miei messaggi quotidiani, collega il tuo account Telegram dal sito.\n\n`;
 welcome += `🔗 <a href="${SITE_URL}">Entra nel sito</a>`;

 await sendTelegramMessage(chatId, welcome);
 return;
 }

 // Ignora tutti gli altri messaggi — nessuna risposta
 console.log(`Messaggio ignorato da ${username}: ${text}`);
}

module.exports = {
 sendTelegramMessage,
 sendDailyHoroscopes,
 sendUpcomingEvents,
 sendBirthdayWishes,
 handleTelegramWebhook,
 generateDailyHoroscope,
 generateEventsMessage,
 generateBirthdayMessage,
 getLoginUrl
};
