// ============================================================
// AUTH.JS — Autenticazione Supabase
// VERSIONE FINALE CORRETTA
// FIX: fallback full_name dai metadati + pulizia cache al logout
//
// Funzionamento:
// 1. handleRegister legge i campi del form
// 2. Invia email, password + METADATI (nome, data, ora, città, nazione) a Supabase Auth
// 3. Il trigger handle_new_user() nel DB crea automaticamente profilo e crediti
// 4. Dopo conferma email, loadUserData carica il profilo creato dal trigger
//
// NON crea profilo manualmente — lascia fare al trigger!
// ============================================================

import { CONFIG } from './config.js';

let supabase = null;
let currentUser = null;
let currentProfile = null;
let credits = 0;
let onAuthChange = null;

// ============================================================
// INIT
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
// HANDLE REGISTER — INVIA METADATI AL SIGNUP
// ============================================================
export async function handleRegister(e) {
 e.preventDefault();

 const btn = document.getElementById("regSubmitBtn");
 const orig = btn?.innerHTML || "Crea account";
 if (btn) {
 btn.innerHTML = '<span class="spinner"></span>';
 btn.disabled = true;
 }

 hideAlerts();

 // ─── LEGGI I VALORI DEL FORM ───
 const fullName = document.getElementById("regName")?.value?.trim();
 const email = document.getElementById("regEmail")?.value?.trim();
 const password = document.getElementById("regPassword")?.value;
 const gender = document.getElementById("regGender")?.value || null;
 const birthDate = document.getElementById("regBirthDate")?.value;
 const birthTime = document.getElementById("regBirthTime")?.value || null;
 const birthCity = document.getElementById("regBirthCity")?.value?.trim();
 const birthCountry = document.getElementById("regBirthCountry")?.value;

 // DEBUG — guarda in F12 Console cosa legge
 console.log("📋 [handleRegister] Form letto:", {
 fullName, email, birthDate, birthTime, birthCity, birthCountry, gender
 });

 // Validazione
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
 // ─── SIGNUP CON METADATI ───
 // Questi dati vanno in auth.users.raw_user_meta_data
 // Il trigger handle_new_user() nel DB li legge e crea il profilo
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
 emailRedirectTo: window.location.origin + '/?verified=true'
 }
 });

 if (authErr) throw authErr;

 console.log("✅ [handleRegister] Utente creato:", authData.user?.id);
 console.log("📦 [handleRegister] Metadati inviati:", authData.user?.user_metadata);

 showAlert("auth", "success",
 "🌙 Account creato! Controlla la tua email e clicca il link di conferma.");

 // Pulisci form e nascondi
 const regForm = document.getElementById("registerForm");
 if (regForm) regForm.reset();

 const authTabs = document.querySelector(".auth-tabs");
 if (authTabs) authTabs.style.display = "none";

 } catch (err) {
 console.error("❌ [handleRegister] Errore:", err);
 showAlert("auth", "error", err.message || "Errore durante la registrazione");
 } finally {
 if (btn) { btn.innerHTML = orig; btn.disabled = false; }
 }
}

// ============================================================
// HANDLE LOGIN
// ============================================================
export async function handleLogin(e) {
 e.preventDefault();

 const btn = document.getElementById("loginSubmitBtn");
 const orig = btn?.innerHTML || "Accedi";
 if (btn) {
 btn.innerHTML = '<span class="spinner"></span>';
 btn.disabled = true;
 }

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
 console.error("❌ [handleLogin] Errore:", err);
 showAlert("auth", "error", err.message || "Credenziali non valide");
 } finally {
 if (btn) { btn.innerHTML = orig; btn.disabled = false; }
 }
}

// ============================================================
// HANDLE LOGOUT
// ============================================================
export async function handleLogout() {
 if (!supabase) return;
 try {
 await supabase.auth.signOut();
 } catch (e) {
 console.error("Logout error:", e);
 }
 currentUser = null;
 currentProfile = null;
 credits = 0;

 // FIX: pulisci cache locale del tema natale
 localStorage.removeItem('luna_natal_chart');
 localStorage.removeItem('luna_natal_chart_ts');

 notifyChange();
 if (window.app) window.app.showPage("home");
}

// ============================================================
// LOAD USER DATA
// ============================================================
export async function loadUserData() {
 if (!currentUser || !supabase) return;

 const { data: profile, error } = await supabase
 .from("profiles")
 .select("*")
 .eq("id", currentUser.id)
 .single();

 if (error) {
 console.error("❌ [loadUserData] Errore:", error);
 if (error.code === "PGRST116") {
 console.warn("⚠️ Profilo non trovato per utente:", currentUser.id);
 }
 currentProfile = null;
 credits = 0;
 notifyChange();
 return;
 }

 // FIX: se il DB non ha il nome, recupera dai metadati di registrazione
 if (!profile.full_name && currentUser.user_metadata?.full_name) {
 profile.full_name = currentUser.user_metadata.full_name;
 // Sincronizza silenziosamente nel DB per i prossimi refresh
 await supabase.from("profiles")
 .update({ full_name: profile.full_name, updated_at: new Date().toISOString() })
 .eq("id", currentUser.id);
 }

 currentProfile = profile;
 credits = profile?.credits || 0;

 console.log("✅ [loadUserData] Profilo caricato:", {
 nome: profile?.full_name,
 data: profile?.birth_date,
 citta: profile?.birth_city,
 crediti: credits
 });

 notifyChange();
}

// ============================================================
// CREDITS
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
 if (!currentUser || !currentProfile) {
 console.warn('Geocoding: no user/profile');
 return false;
 }
 if (currentProfile.birth_latitude) {
 console.log('Geocoding: already has coordinates');
 return true;
 }
 if (!currentProfile.birth_city) {
 console.warn('Geocoding: no city');
 return false;
 }

 try {
 const url = `${CONFIG.WORKER_URL || CONFIG.API_URL}/api/geocode?city=${encodeURIComponent(currentProfile.birth_city)}&country=${encodeURIComponent(currentProfile.birth_country || '')}`;
 console.log('🌍 Geocoding:', url);

 const res = await fetch(url);
 if (!res.ok) throw new Error('Geocoding failed: ' + res.status);

 const data = await res.json();
 console.log('🌍 Geocoding response:', data);

 if (data.lat != null && data.lng != null) {
 const { error } = await supabase.from('profiles').update({
 birth_latitude: data.lat,
 birth_longitude: data.lng,
 birth_timezone: data.timezone || 'Europe/Rome',
 updated_at: new Date().toISOString(),
 }).eq('id', currentUser.id);

 if (error) throw error;

 await loadUserData();
 console.log('✅ Geocoding saved');
 return true;
 }
 } catch (err) {
 console.error('❌ Geocoding error:', err);
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
 document.querySelectorAll(".alert").forEach(el => {
 el.style.display = "none";
 });
}

// ============================================================
// EXPORT
// ============================================================
export function getCurrentUser() { return currentUser; }
export function getCurrentProfile() { return currentProfile; }
export function getCredits() { return credits; }
export function getSupabase() { return supabase; }
export function getUserId() { return currentUser?.id || null; }
