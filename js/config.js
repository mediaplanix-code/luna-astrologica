// ============================================================
// CONFIG.JS — Unico punto di configurazione
// ============================================================

export const CONFIG = {
    // Supabase
    SUPABASE_URL: "https://yyserqquzqoywtqrqvlk.supabase.co",
    SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5c2VycXF1enFveXd0cXJxdmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4ODgzMzAsImV4cCI6MjA5NDQ2NDMzMH0.FJWeBOUKX69Fk4BvFh0RSU92LiKj2e7ZoFczbkbw1dY",

    // App
    APP_NAME: "Luna Astrologica",
    DEFAULT_LANG: "it",
    WELCOME_CREDITS: 10,

    // Chat
    CHAT_MAX_HISTORY: 50,
    CREDITS_PER_MESSAGE: 1,

    // Stripe (placeholder per futuro)
    STRIPE_PUBLISHABLE_KEY: "pk_test_YOUR_KEY",
    STRIPE_PRICE_ID: "price_YOUR_PRICE_ID",

    // Worker API
    WORKER_URL: "https://luna-astrologica-api.mediaplanix.workers.dev",

    // Feature flags
    FEATURES: {
        REAL_NATAL_CHART: false,
        AI_CHAT: false,
        STRIPE_PAYMENTS: false,
        TELEGRAM_BOT: false,
        VOICE_MODE: false,
    }
};

// Mappatura segni zodiacali
export const ZODIAC_SIGNS = {
    "Ariete":     { symbol: "♈", element: "Fuoco", ruler: "Marte",     period: "21 Mar - 19 Apr" },
    "Toro":       { symbol: "♉", element: "Terra", ruler: "Venere",    period: "20 Apr - 20 Mag" },
    "Gemelli":    { symbol: "♊", element: "Aria",  ruler: "Mercurio",  period: "21 Mag - 20 Giu" },
    "Cancro":     { symbol: "♋", element: "Acqua", ruler: "Luna",      period: "21 Giu - 22 Lug" },
    "Leone":      { symbol: "♌", element: "Fuoco", ruler: "Sole",      period: "23 Lug - 22 Ago" },
    "Vergine":    { symbol: "♍", element: "Terra", ruler: "Mercurio",  period: "23 Ago - 22 Set" },
    "Bilancia":   { symbol: "♎", element: "Aria",  ruler: "Venere",    period: "23 Set - 22 Ott" },
    "Scorpione":  { symbol: "♏", element: "Acqua", ruler: "Plutone",   period: "23 Ott - 21 Nov" },
    "Sagittario": { symbol: "♐", element: "Fuoco", ruler: "Giove",     period: "22 Nov - 21 Dic" },
    "Capricorno": { symbol: "♑", element: "Terra", ruler: "Saturno",   period: "22 Dic - 19 Gen" },
    "Acquario":   { symbol: "♒", element: "Aria",  ruler: "Urano",     period: "20 Gen - 18 Feb" },
    "Pesci":      { symbol: "♓", element: "Acqua", ruler: "Nettuno",   period: "19 Feb - 20 Mar" },
};

export const ZODIAC_TAGS = {
    "Ariete":     ["Coraggioso", "Determinato", "Impulsivo", "Leader"],
    "Toro":       ["Paziente", "Leale", "Testardo", "Sensuale"],
    "Gemelli":    ["Versatile", "Curioso", "Inquieto", "Comunicativo"],
    "Cancro":     ["Sensibile", "Protettivo", "Moody", "Intuitivo"],
    "Leone":      ["Generoso", "Carismatico", "Orgoglioso", "Creativo"],
    "Vergine":    ["Analitico", "Pratico", "Perfezionista", "Umile"],
    "Bilancia":   ["Diplomatico", "Esteta", "Indeciso", "Socievole"],
    "Scorpione":  ["Intenso", "Passionale", "Misterioso", "Trasformativo"],
    "Sagittario": ["Ottimista", "Avventuroso", "Impulsivo", "Filosofico"],
    "Capricorno": ["Ambizioso", "Disciplinato", "Riservato", "Pragmatico"],
    "Acquario":   ["Originale", "Indipendente", "Eccentrico", "Umanitario"],
    "Pesci":      ["Empatico", "Creativo", "Sognatore", "Compassionevole"],
};

export const CATEGORY_LABELS = {
    amore:    "Amore",
    denaro:   "Denaro",
    lavoro:   "Lavoro",
    salute:   "Salute",
    amici:    "Amici",
    famiglia: "Famiglia",
    viaggi:   "Viaggi",
    partner:  "Partner",
    carriera: "Carriera",
};

export const LANGUAGE_FLAGS = {
    it: "🇮🇹", en: "🇬🇧", fr: "🇫🇷", de: "🇩🇪", es: "🇪🇸"
};

// Schema tabella profiles per riferimento
export const PROFILE_SCHEMA = {
    id:                      { type: "uuid", nullable: false },
    email:                   { type: "text", nullable: true },
    full_name:               { type: "text", nullable: true },
    birth_date:              { type: "date", nullable: false },
    birth_time:              { type: "time with time zone", nullable: true },
    birth_city:              { type: "text", nullable: false },
    birth_country:           { type: "text", nullable: false },
    birth_latitude:          { type: "numeric", nullable: true },
    birth_longitude:         { type: "numeric", nullable: true },
    birth_timezone:          { type: "text", nullable: true },
    sun_sign:                { type: "text", nullable: true },
    moon_sign:               { type: "text", nullable: true },
    rising_sign:             { type: "text", nullable: true },
    telegram_chat_id:        { type: "text", nullable: true },
    telegram_username:       { type: "text", nullable: true },
    phone:                   { type: "text", nullable: true },
    avatar_url:              { type: "text", nullable: true },
    language:                { type: "text", nullable: true, default: "it" },
    notification_enabled:    { type: "boolean", nullable: true, default: true },
    daily_horoscope_enabled: { type: "boolean", nullable: true, default: true },
    event_alerts_enabled:    { type: "boolean", nullable: true, default: true },
    created_at:              { type: "timestamp with time zone", nullable: true, default: "now()" },
    updated_at:              { type: "timestamp with time zone", nullable: true, default: "now()" },
    birth_place:             { type: "text", nullable: true },
    gender:                  { type: "text", nullable: true },
    country:                 { type: "text", nullable: true },
    credits:                 { type: "integer", nullable: true, default: 10 },
};
