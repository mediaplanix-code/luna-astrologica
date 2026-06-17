🌙 LUNA ASTROLOGICA — Deploy v2.0 Completo
File da sostituire (5 file totali)
1. NUOVI FILE (carica nella repo)
Table
File	Destinazione	Note
payments.js	js/payments.js	Modulo completo abbonamento + pacchetti
2. FILE DA SOSTITUIRE
Table
File	Destinazione	Note
app_v9.js	js/app.js	Orchestratore con pagamenti integrati
config_v2.js	js/config.js	Config con feature flags abbonamento
ui_v2.js	js/ui.js	UI con 9 categorie, apertura diretta voce
index.html	index.html	Con page-payments e script payments.js
3. CSS — già fatto da te
Hai già aggiunto styles_payments.css in fondo a styles.css. ✅
Cosa cambia rispetto a prima
✅ Home
Tolta scelta Chat/Voce (mode-toggle rimosso)
Cliccando una categoria → apre DIRETTAMENTE voce (non più modale scelta)
Cliccando "PARLA CON LE TUE STELLE" → apre voce
9 categorie complete (Amore, Denaro, Lavoro, Salute, Amici, Famiglia, Viaggi, Partner, Carriera)
✅ Pagina Personalizzata
Mostra SOLO oroscopo giornaliero (gratis)
Sezioni Ruota, Pianeti, Case, Aspetti, Transiti sono OFFUSCATE (blur) se non abbonato
Overlay "🔒 Abbonamento richiesto — Sblocca per €15/trimestre"
✅ Pagina Pagamenti (nuova)
Card abbonamento €15/trimestre (stato attivo/scaduto)
Barra progresso spesa €0/€49 per rinnovo gratuito
Pacchetti servizi €45 (18 min AI Voice) — 6 categorie
Chat AI €25 (12 min, risposte limitate)
Storico transazioni
✅ Header
Pill crediti cliccabile → va a pagina pagamenti
Dot verde = abbonato, rosso = scaduto
Modello Business
Table
Servizio	Prezzo	Durata	Note
Abbonamento	€15	90 giorni	Sblocca tema natale completo
Rinnovo gratis	€0	90 giorni	Se spesa ≥€49 nel trimestre
Pacchetti	€45	18 min AI Voice	Amore, Lavoro, Carriera, Salute, Denaro, Famiglia
Chat AI	€25	12 min	Risposte limitate
Test Rapido
Registrati → vedi pagina personalizzata
Verifica che Ruota/Pianeti/Case siano offuscati
Clicca pill crediti → vai a pagina pagamenti
Clicca "Sblocca ora per €15" → conferma (modalità test)
Torna a personalized → verifica sezioni sbloccate
Acquista un servizio €45 → verifica progresso spesa
Clicca una categoria in home → deve aprire voce direttamente
Prossimi Step (quando avrai Stripe)
Crea account Stripe → ottieni chiavi
Aggiorna config.js: STRIPE_PAYMENTS: true, inserisci chiavi
Backend: endpoint /api/create-checkout-session
Backend: webhook /api/stripe-webhook
Passa da localStorage a Supabase per abbonamenti
