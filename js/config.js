// Configurazione centralizzata basata sul DB reale
export const CONFIG = {
  SUPABASE_URL: 'https://TUO-PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'TUO-ANON-KEY',
  API_BASE: 'https://tuo-render-backend.onrender.com',

  // Feature flags
  ENABLE_VOICE: false,
  ENABLE_PAYMENTS: false,

  // Pricing
  PRICES: {
    quarterly: 15,
    consultation: 45,
    credits_pack: 10
  },

  // Chat
  INITIAL_CREDITS: 10,
  CREDIT_PER_MESSAGE: 1,

  // Welcome gift
  WELCOME_DAYS: 90,

  // Retry config (race condition profilo)
  RETRY_MAX_ATTEMPTS: 5,
  RETRY_DELAY_MS: 800,

  // Tabelle DB reali
  TABLES: {
    PROFILES: 'profiles',
    CREDITS: 'credits',
    CREDIT_TRANSACTIONS: 'credit_transactions',
    CONVERSATIONS: 'conversations',
    MESSAGES: 'messages',
    NATAL_CHARTS: 'natal_charts',
    DAILY_TRANSITS: 'daily_transits',
    COMPATIBILITY_REPORTS: 'compatibility_reports',
    CONSULT_PURCHASES: 'consult_purchases',
    CONSULT_SESSIONS: 'consult_sessions',
    USER_REPORTS: 'user_reports',
    UPCOMING_EVENTS: 'upcoming_events',
    ASTROLOGICAL_EVENTS: 'astrological_events',
    USER_PREFERENCES: 'user_preferences',
    PERSONALIZATION_UNLOCKS: 'personalization_unlocks',
    TELEGRAM_NOTIFICATIONS: 'telegram_notifications'
  },

  // Funzioni RPC esistenti
  RPC: {
    CONSUME_CREDITS: 'consume_credits',
    GET_DAILY_REPORT: 'get_daily_report',
    GET_UPCOMING_EVENTS: 'get_upcoming_events',
    GET_USER_AGE: 'get_user_age',
    GET_USER_CREDITS: 'get_user_credits',
    GET_USER_REPORTS: 'get_user_reports_by_type',
    HAS_ENOUGH_CREDITS: 'has_enough_credits',
    SAVE_USER_REPORT: 'save_user_report',
    SCHEDULE_NOTIFICATION: 'schedule_telegram_notification',
    SYNC_MISSING_PROFILES: 'sync_missing_profiles'
  },

  // Oroscopo
  SIGNS: [
    { name: 'Ariete', icon: '♈', dates: '21 Mar - 19 Apr' },
    { name: 'Toro', icon: '♉', dates: '20 Apr - 20 Mag' },
    { name: 'Gemelli', icon: '♊', dates: '21 Mag - 20 Giu' },
    { name: 'Cancro', icon: '♋', dates: '21 Giu - 22 Lug' },
    { name: 'Leone', icon: '♌', dates: '23 Lug - 22 Ago' },
    { name: 'Vergine', icon: '♍', dates: '23 Ago - 22 Set' },
    { name: 'Bilancia', icon: '♎', dates: '23 Set - 22 Ott' },
    { name: 'Scorpione', icon: '♏', dates: '23 Ott - 21 Nov' },
    { name: 'Sagittario', icon: '♐', dates: '22 Nov - 21 Dic' },
    { name: 'Capricorno', icon: '♑', dates: '22 Dic - 19 Gen' },
    { name: 'Acquario', icon: '♒', dates: '20 Gen - 18 Feb' },
    { name: 'Pesci', icon: '♓', dates: '19 Feb - 20 Mar' }
  ]
};

// Lazy init Supabase client
let supabaseClient = null;
export async function getSupabase() {
  if (supabaseClient) return supabaseClient;
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm');
  supabaseClient = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });
  return supabaseClient;
}
