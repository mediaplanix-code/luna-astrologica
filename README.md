[README_LUNA_ASTROLOGICA.md](https://github.com/user-attachments/files/29521822/README_LUNA_ASTROLOGICA.md)
# 🌙 LUNA ASTROLOGICA

**Consultorio astrologico digitale** con calcoli reali del tema natale, transiti, sinastria e consulenza vocale AI.

> ⚠️ **Stato attuale:** v2.0 funzionante. Stripe in modalità test. Alcuni fix in corso.

---

## ✨ Cosa fa

- **Tema natale reale** — Ruota astrologica SVG, 12 case, posizione pianeti, ascendente, segno lunare, Medio Cielo, aspetti
- **Transiti personalizzati** — Cosa sta succedendo oggi nel cielo rispetto alla tua carta
- **Sinastria di coppia** — Affinità calcolata con due temi natali reali
- **Consulenza vocale AI** — 18 minuti con Luna (ElevenLabs) basati sui tuoi dati astrologici
- **Regalo benvenuto** — 3 mesi di accesso completo gratis (valore €15)

---

## 🏗️ Architettura

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Cloudflare     │────▶│  Render API      │────▶│  Supabase       │
│  Pages (SPA)    │◄────│  (Swiss Ephemeris│◄────│  (Auth + DB)    │
│                 │     │   + Geocoding)   │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │
        ▼
┌─────────────────┐
│  ElevenLabs     │
│  (Voce AI Luna) │
└─────────────────┘
```

---

## 📁 Struttura file

```
├── index.html              # Shell SPA
├── css/
│   └── styles.css          # Stili completi (mobile-first)
└── js/
    ├── app.js              # Orchestratore v13.5
    ├── ui.js               # Render componenti v6.5
    ├── config.js           # Costanti e feature flags v2.2
    ├── utils.js            # Funzioni base
    ├── auth.js             # Supabase auth v8
    ├── natal.js            # Calcolo tema natale + SVG v6
    ├── transits.js         # Transiti giornalieri
    ├── voice.js            # ElevenLabs widget v6.3
    ├── payments.js         # Regalo, abbonamento, pacchetti v3.0
    ├── horoscope.js        # Tab oroscopo generico
    └── profile.js          # Compatibilità/sinastria v3
```

---

## 🚀 Deploy

1. **Front-end:** Carica su GitHub → si sincronizza con Cloudflare Pages automaticamente
2. **Back-end:** Repo `luna-astrologica-api-render` su Render (free tier = dorme dopo inattività)
3. **Database:** Supabase con schema completo (19 tabelle)

---

## 💰 Modello di business

| Servizio | Prezzo | Durata | Note |
|---|---|---|---|
| Regalo benvenuto | €0 | 3 mesi | Sblocca calcoli tema natale |
| Abbonamento completo | €15 | 90 giorni | Tema, case, pianeti, aspetti, transiti |
| Rinnovo gratuito | €0 | 90 giorni | Se spesa ≥ €49 nel trimestre |
| Pacchetto voce | €45 | 18 min | Consulenza AI per categoria |
| Chat AI | €25 | 12 min | Risposte limitate (non attiva) |

---

## ⚙️ Feature flags (config.js)

```javascript
STRIPE_PAYMENTS: false      // Attiva per pagamenti reali
AI_CHAT: false               // Chat testuale disattivata
TELEGRAM_BOT: false          // Notifiche Telegram disattivate
VOICE_MODE: false            // Voce sempre attiva indipendentemente
SUBSCRIPTION: true           // Abbonamenti attivi
BLUR_UNSUBSCRIBED: true      // Offuscamento per non abbonati
```

---

## 🗄️ Database (19 tabelle)

**Tabelle attive (usate dal codice):**
- `profiles` — Dati utente, abbonamento, regalo, crediti
- `natal_charts` — Tema natale calcolato (JSONB)
- `daily_transits` — Transiti giornalieri (JSONB)
- `compatibility_reports` — Report sinastria

**Tabelle esistenti ma non usate dal codice attuale:**
- `credits` / `credit_transactions` — Sistema crediti dedicato
- `consult_purchases` / `consult_sessions` — Pacchetti voce reali
- `conversations` / `messages` — Chat AI
- `astrological_events` — Eventi astrologici
- `telegram_notifications` — Coda notifiche
- `upcoming_events` — Eventi futuri
- `user_preferences` — Preferenze utente
- `user_reports` — Report generati
- `personalization_unlocks` — Sblocchi pagamento
- `crm_sync_log` — Log sincronizzazione

---

## 🐛 Bug noti

| # | Bug | Stato |
|---|---|---|
| 1 | `startVoiceAbout()` non esiste in app.js | 🔴 Critico — errore JS in tendine |
| 2 | Profilo non creato automaticamente dopo signup | 🔴 Critico — trigger mancante |
| 3 | Crediti in `profiles.credits` vs tabella `credits` | 🟡 Medio — disallineamento |
| 4 | Pacchetti voce in localStorage, non in DB | 🟡 Medio — non persistente |
| 5 | Transazioni in localStorage, non in DB | 🟡 Medio — non persistente |
| 6 | `<base target="_blank">` ×3 in index.html | 🟢 Basso — inutile |
| 7 | `simulatePayment` non scala crediti | 🟢 Basso — test mode |

---

## 🔧 Fix in corso

Vedi issue tracker o contatta lo sviluppatore per i prossimi step.

---

## 📜 Disclaimer

> Le informazioni fornite da Luna Astrologica hanno solo scopo informativo e di intrattenimento. Non sostituiscono in alcun modo consulti medici, legali o professionali.

---

© 2024 Luna Astrologica
