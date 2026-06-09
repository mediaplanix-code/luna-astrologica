// ============================================================
// routes/telegram.js v2 — Endpoint Telegram
// FIX: endpoint per collegare chat_id al profilo, cron protetti
// ============================================================

const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const {
 sendTelegramMessage,
 sendDailyHoroscopes,
 sendUpcomingEvents,
 sendBirthdayWishes,
 handleTelegramWebhook
} = require('../services/telegram');

// ===== WEBHOOK — Riceve messaggi da Telegram =====
router.post('/webhook', async (req, res) => {
 try {
 const update = req.body;
 await handleTelegramWebhook(update);
 res.json({ ok: true });
 } catch (err) {
 console.error('Webhook error:', err);
 res.json({ ok: true });
 }
});

// ===== COLLEGA ACCOUNT — Collega chat_id al profilo utente =====
router.post('/link-account', async (req, res) => {
 const { user_id, chat_id } = req.body;

 if (!user_id || !chat_id) {
 return res.status(400).json({ error: 'user_id e chat_id richiesti' });
 }

 try {
 const { error } = await supabase
 .from('profiles')
 .update({
 telegram_chat_id: chat_id,
 daily_horoscope_enabled: true,
 updated_at: new Date().toISOString()
 })
 .eq('id', user_id);

 if (error) {
 console.error('Errore collegamento Telegram:', error);
 return res.status(500).json({ error: error.message });
 }

 // Invia messaggio di conferma
 const confirmText = `<b>🌙 Account collegato!</b>\n\n` +
 `Da domani riceverai il tuo oroscopo personalizzato ogni mattina.\n` +
 `Eventi importanti e auguri di compleanno inclusi.\n\n` +
 `Nessun comando necessario — io ti scrivo! 🌟`;

 await sendTelegramMessage(chat_id, confirmText);

 res.json({ success: true, message: 'Account collegato' });
 } catch (err) {
 console.error('Link account error:', err);
 res.status(500).json({ error: err.message });
 }
});

// ===== SCOLLEGA ACCOUNT =====
router.post('/unlink-account', async (req, res) => {
 const { user_id } = req.body;

 if (!user_id) {
 return res.status(400).json({ error: 'user_id richiesto' });
 }

 try {
 const { data: profile } = await supabase
 .from('profiles')
 .select('telegram_chat_id')
 .eq('id', user_id)
 .single();

 if (profile?.telegram_chat_id) {
 await sendTelegramMessage(
 profile.telegram_chat_id,
 `<b>🌙 Account scollegato</b>\n\nNon riceverai più messaggi da Luna. Puoi ricollegarti in qualsiasi momento dal sito.`
 );
 }

 const { error } = await supabase
 .from('profiles')
 .update({
 telegram_chat_id: null,
 daily_horoscope_enabled: false,
 updated_at: new Date().toISOString()
 })
 .eq('id', user_id);

 if (error) {
 return res.status(500).json({ error: error.message });
 }

 res.json({ success: true, message: 'Account scollegato' });
 } catch (err) {
 console.error('Unlink error:', err);
 res.status(500).json({ error: err.message });
 }
});

// ===== CRON — Oroscopo giornaliero =====
router.post('/cron/daily-horoscope', async (req, res) => {
 const cronSecret = req.headers['x-cron-secret'];
 if (cronSecret && cronSecret !== process.env.CRON_SECRET) {
 return res.status(401).json({ error: 'Unauthorized' });
 }

 try {
 await sendDailyHoroscopes();
 res.json({ success: true, message: 'Oroscopi inviati' });
 } catch (err) {
 console.error('Cron daily error:', err);
 res.status(500).json({ error: err.message });
 }
});

// ===== CRON — Eventi importanti =====
router.post('/cron/upcoming-events', async (req, res) => {
 const cronSecret = req.headers['x-cron-secret'];
 if (cronSecret && cronSecret !== process.env.CRON_SECRET) {
 return res.status(401).json({ error: 'Unauthorized' });
 }

 try {
 await sendUpcomingEvents();
 res.json({ success: true, message: 'Eventi inviati' });
 } catch (err) {
 console.error('Cron events error:', err);
 res.status(500).json({ error: err.message });
 }
});

// ===== CRON — Auguri compleanno =====
router.post('/cron/birthday-wishes', async (req, res) => {
 const cronSecret = req.headers['x-cron-secret'];
 if (cronSecret && cronSecret !== process.env.CRON_SECRET) {
 return res.status(401).json({ error: 'Unauthorized' });
 }

 try {
 await sendBirthdayWishes();
 res.json({ success: true, message: 'Auguri inviati' });
 } catch (err) {
 console.error('Cron birthday error:', err);
 res.status(500).json({ error: err.message });
 }
});

// ===== TEST — Invia messaggio a un chat ID =====
router.post('/test', async (req, res) => {
 const { chat_id, message } = req.body;
 if (!chat_id) {
 return res.status(400).json({ error: 'chat_id required' });
 }

 const text = message || '<b>🌙 Test Luna Astrologica</b>\n\nIl bot funziona correttamente!';
 const result = await sendTelegramMessage(chat_id, text);

 if (result.error) {
 return res.status(500).json({ error: result.error });
 }

 res.json({ success: true, messageId: result.messageId });
});

// ===== INFO =====
router.get('/', (req, res) => {
 res.json({
 status: 'Telegram API attivo',
 endpoints: {
 webhook: 'POST /api/telegram/webhook',
 link_account: 'POST /api/telegram/link-account { user_id, chat_id }',
 unlink_account: 'POST /api/telegram/unlink-account { user_id }',
 cron_daily: 'POST /api/telegram/cron/daily-horoscope',
 cron_events: 'POST /api/telegram/cron/upcoming-events',
 cron_birthday: 'POST /api/telegram/cron/birthday-wishes',
 test: 'POST /api/telegram/test { chat_id, message? }'
 }
 });
});

module.exports = router;
