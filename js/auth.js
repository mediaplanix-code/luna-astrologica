// ============================================================
// AUTH.JS — Modulo Autenticazione
// Gestione sessione Supabase, profilo utente, crediti
// ============================================================

import { CONFIG } from './config.js';

// --- Stato interno ---
let supabase = null;
let currentUser = null;
let currentProfile = null;
let credits = 0;
let onAuthChange = null;

const PROFILE_BACKUP_KEY = 'luna_profile_backup';

// ============================================================
// INIZIALIZZAZIONE
// ============================================================
export async function initAuth(callback) {
  onAuthChange = callback;

  if (!CONFIG.SUPABASE_URL || CONFIG.SUPABASE_ANON_KEY.includes("YOUR")) {
    console.warn("⚠️ Configura SUPABASE_URL e SUPABASE_ANON_KEY in js/config.js");
    notifyChange();
    return false;
  }

  try {
    supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

    // Ascolta cambiamenti di stato auth (login, logout, conferma email)
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        currentUser = session?.user ?? null;
        await loadUserData();
      } else if (event === "SIGNED_OUT") {
        currentUser = null;
        currentProfile = null;
        credits = 0;
        notifyChange();
      }
    });

    // Controlla se c'è già una sessione attiva
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      currentUser = session.user;
      await loadUserData();
    } else {
      notifyChange();
    }
    return true;
  } catch (err) {
    console.error("Errore init Supabase:", err);
    notifyChange();
    return false;
  }
}

// ============================================================
// REGISTRAZIONE
// ============================================================
export async function handleRegister(e) {
  e.preventDefault();

  const btn = document.getElementById("regSubmitBtn");
  const orig = btn?.innerHTML || "Crea account";
  if (btn) { btn.innerHTML = ''; btn.disabled = true; }

  hideAlerts();

  const fullName = document.getElementById("regName")?.value?.trim();
  const email = document.getElementById("regEmail")?.value?.trim();
  const password = document.getElementById("regPassword")?.value;
  const gender = document.getElementById("regGender")?.value || null;
  const birthDate = document.getElementById("regBirthDate")?.value;
  const birthTime = document.getElementById("regBirthTime")?.value || null;
  const birthCity = document.getElementById("regBirthCity")?.value?.trim();
  const birthCountry = document.getElementById("regBirthCountry")?.value;

  if (!fullName || !email || !password || !birthDate || !birthCity || !birthCountry) {
    showAlert("auth", "error", "Compila tutti i campi obbligatori (*)");
    if (btn) { btn.innerHTML = orig; btn.disabled = false; }
    return;
  }
  if (password.length < 6) {
    showAlert("auth", "error", "La password deve essere di almeno 6 caratteri");
    if (btn) { btn.innerHTML = orig; btn.disabled = false; }
    return;
  }

  try {
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullName,
          birth_date: birthDate,
          birth_time: birthTime,
          birth_city: birthCity,
          birth_country: birthCountry,
          gender: gender
        },
        emailRedirectTo: window.location.origin
      }
    });

    if (authErr) throw authErr;

    showAlert("auth", "success",
      "🌙 Account creato! Controlla la tua email e clicca il link di conferma.");

    const regForm = document.getElementById("registerForm");
    if (regForm) regForm.reset();

  } catch (err) {
    console.error("❌ Errore registrazione:", err);
    showAlert("auth", "error", err.message || "Errore durante la registrazione");
  } finally {
    if (btn) { btn.innerHTML = orig; btn.disabled = false; }
  }
}

// ============================================================
// LOGIN
// ============================================================
export async function handleLogin(e) {
  e.preventDefault();

  const btn = document.getElementById("loginSubmitBtn");
  const orig = btn?.innerHTML || "Accedi";
  if (btn) { btn.innerHTML = ''; btn.disabled = true; }

  hideAlerts();

  const email = document.getElementById("loginEmail")?.value?.trim();
  const password = document.getElementById("loginPassword")?.value;

  if (!email || !password) {
    showAlert("auth", "error", "Inserisci email e password");
    if (btn) { btn.innerHTML = orig; btn.disabled = false; }
    return;
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    currentUser = data.user;
    await loadUserData();

    if (window.app) {
      window.app.closeAuthModal();
      window.app.showPage("personalized");
    }

  } catch (err) {
    console.error("❌ Errore login:", err);
    showAlert("auth", "error", err.message || "Credenziali non valide");
  } finally {
    if (btn) { btn.innerHTML = orig; btn.disabled = false; }
  }
}

// ============================================================
// LOGOUT
// ============================================================
export async function handleLogout() {
  if (supabase) {
    try { await supabase.auth.signOut(); } catch (e) { console.error(e); }
  }

  currentUser = null;
  currentProfile = null;
  credits = 0;

  localStorage.removeItem('luna_natal_chart');
  localStorage.removeItem('luna_natal_chart_ts');
  localStorage.removeItem(PROFILE_BACKUP_KEY);

  notifyChange();

  if (window.app && window.app._resetState) window.app._resetState();
  if (window.app) window.app.showPage("home");
}

// ============================================================
// CARICAMENTO DATI UTENTE
// Se il profilo non esiste, lo crea automaticamente dai metadati
// ============================================================
export async function loadUserData() {
  if (!currentUser || !supabase) return;

  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Profilo non trovato: crealo al volo
        console.warn("Profilo non trovato, creazione automatica...");
        const newProfile = await createProfileFromUser(currentUser);
        if (newProfile) {
          currentProfile = newProfile;
          credits = newProfile.credits || 0;
          saveProfileBackup(newProfile);
          notifyChange();
          return;
        }
      }
      // Fallback backup
      const backup = loadProfileBackup();
      if (backup && backup.id === currentUser.id) {
        currentProfile = backup;
        credits = backup.credits || 0;
        notifyChange();
        return;
      }
      currentProfile = null;
      credits = 0;
      notifyChange();
      return;
    }

    // Recupera nome dai metadati se mancante nel DB
    if (!profile.full_name) {
      const metaName = currentUser.user_metadata?.full_name;
      if (metaName) {
        await supabase.from("profiles")
          .update({ full_name: metaName, updated_at: new Date().toISOString() })
          .eq("id", currentUser.id);
        profile.full_name = metaName;
      } else {
        profile.full_name = currentUser.email?.split("@")[0] || "Utente";
      }
    }

    currentProfile = profile;
    credits = profile.credits ?? 0;
    saveProfileBackup(profile);
    notifyChange();

  } catch (err) {
    console.error("Errore caricamento profilo:", err);
    const backup = loadProfileBackup();
    if (backup && backup.id === currentUser?.id) {
      currentProfile = backup;
      credits = backup.credits || 0;
      notifyChange();
    }
  }
}

// ============================================================
// CREAZIONE PROFILO AUTOMATICA
// ============================================================
async function createProfileFromUser(user) {
  if (!supabase || !user) return null;

  const meta = user.user_metadata || {};
  const profileData = {
    id: user.id,
    email: user.email,
    full_name: meta.full_name || meta.fullName || user.email?.split("@")[0] || "Utente",
    birth_date: meta.birth_date || meta.birthDate || null,
    birth_time: meta.birth_time || meta.birthTime || null,
    birth_city: meta.birth_city || meta.birthCity || null,
    birth_country: meta.birth_country || meta.birthCountry || null,
    gender: meta.gender || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    credits: 10,
    welcome_gift_active: false,
    language: 'it'
  };

  const { data, error } = await supabase
    .from('profiles')
    .insert([profileData])
    .select()
    .single();

  if (error) {
    console.error("Errore creazione profilo:", error);
    return null;
  }
  return data;
}

// ============================================================
// BACKUP / RESTORE
// ============================================================
function saveProfileBackup(profile) {
  if (!profile) return;
  try { localStorage.setItem(PROFILE_BACKUP_KEY, JSON.stringify(profile)); } catch (e) {}
}

function loadProfileBackup() {
  try {
    const saved = localStorage.getItem(PROFILE_BACKUP_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (e) { return null; }
}

// ============================================================
// CREDITI
// ============================================================
export async function updateCredits(delta) {
  if (!supabase || !currentUser) return false;

  const newCredits = Math.max(0, credits + delta);
  const { error } = await supabase
    .from("profiles")
    .update({ credits: newCredits, updated_at: new Date().toISOString() })
    .eq("id", currentUser.id);

  if (error) {
    console.error("Errore aggiornamento crediti:", error);
    return false;
  }

  credits = newCredits;
  if (currentProfile) { currentProfile.credits = newCredits; saveProfileBackup(currentProfile); }
  notifyChange();
  return true;
}

export function setCredits(newCredits) {
  credits = Math.max(0, newCredits);
  notifyChange();
}

// ============================================================
// GEOCODING
// ============================================================
export async function geocodeProfileIfNeeded() {
  if (!currentUser || !currentProfile) return false;
  if (currentProfile.birth_latitude) return true;
  if (!currentProfile.birth_city) return false;

  try {
    const url = `${CONFIG.WORKER_URL || CONFIG.API_URL}/api/geocode?city=${encodeURIComponent(currentProfile.birth_city)}&country=${encodeURIComponent(currentProfile.birth_country || '')}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Geocoding failed: ' + res.status);
    const data = await res.json();

    if (data.lat != null && data.lng != null) {
      await supabase.from('profiles').update({
        birth_latitude: data.lat,
        birth_longitude: data.lng,
        birth_timezone: data.timezone || 'Europe/Rome',
        updated_at: new Date().toISOString(),
      }).eq('id', currentUser.id);
      await loadUserData();
      return true;
    }
  } catch (err) {
    console.error('Geocoding error:', err);
  }
  return false;
}

// ============================================================
// HELPERS
// ============================================================
function notifyChange() {
  if (onAuthChange) {
    onAuthChange({
      isLoggedIn: !!currentUser,
      user: currentUser,
      profile: currentProfile,
      credits: credits
    });
  }
}

function showAlert(scope, type, message) {
  const el = document.getElementById(scope + "Error") || document.getElementById(scope + "Success");
  if (!el) return;
  el.textContent = message;
  el.className = "alert alert-" + type;
  el.style.display = "block";
}

function hideAlerts() {
  document.querySelectorAll(".alert").forEach(el => { el.style.display = "none"; });
}

// ============================================================
// EXPORT
// ============================================================
export function getCurrentUser() { return currentUser; }

export function getCurrentProfile() {
  if (currentProfile) return currentProfile;
  const backup = loadProfileBackup();
  if (backup && currentUser && backup.id === currentUser.id) {
    currentProfile = backup;
    return currentProfile;
  }
  return null;
}

export function getCredits() {
  if (credits > 0) return credits;
  if (currentProfile?.credits > 0) return currentProfile.credits;
  const backup = loadProfileBackup();
  if (backup?.credits > 0) return backup.credits;
  return credits;
}

export function getSupabase() { return supabase; }
export function getUserId() { return currentUser?.id || null; }
