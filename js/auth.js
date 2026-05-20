// ============================================================
// AUTH.JS — Autenticazione Supabase
// Il profilo viene creato AUTOMATICAMENTE dal trigger su Supabase
// Nessun insert manuale nel frontend
// ============================================================

import { CONFIG } from './config.js';
import { showAlert, hideAlerts } from './utils.js';

let supabase = null;
let currentUser = null;
let currentProfile = null;
let credits = 0;
let onAuthChange = null;

export async function initAuth(callback) {
    onAuthChange = callback;

    if (CONFIG.SUPABASE_ANON_KEY.includes("YOUR_ANON")) {
        console.warn("⚠️ Configura SUPABASE_ANON_KEY in js/config.js");
        notifyChange();
        return false;
    }

    try {
        supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

        supabase.auth.onAuthStateChange((event, session) => {
            if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
                currentUser = session?.user ?? null;
                loadUserData();
            } else if (event === "SIGNED_OUT") {
                currentUser = null;
                currentProfile = null;
                credits = 0;
                notifyChange();
            }
        });

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
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

export async function handleRegister(e) {
    e.preventDefault();
    const btn = document.getElementById("regSubmitBtn");
    const orig = btn.innerHTML;
    btn.innerHTML = '<span class="loading"></span>';
    btn.disabled = true;
    hideAlerts();

    try {
        const name = document.getElementById("regName").value.trim();
        const email = document.getElementById("regEmail").value.trim();
        const password = document.getElementById("regPassword").value;
        const gender = document.getElementById("regGender").value;
        const birthDate = document.getElementById("regBirthDate").value;
        const birthTime = document.getElementById("regBirthTime").value;
        const birthCity = document.getElementById("regBirthCity").value.trim();
        const birthCountry = document.getElementById("regBirthCountry").value;

        const { data: authData, error: authErr } = await supabase.auth.signUp({
            email, password,
            options: {
                data: {
                    full_name: name,
                    gender: gender || null,
                    birth_date: birthDate || null,
                    birth_time: birthTime || null,
                    birth_city: birthCity || null,
                    birth_country: birthCountry || null
                }
            }
        });
        if (authErr) throw authErr;

        showAlert("auth", "success",
            "Account creato! Controlla la tua email per confermare, poi accedi.");
        document.getElementById("registerForm").reset();

        setTimeout(() => {
            if (window.app) window.app.switchAuthTab("login");
        }, 1500);

    } catch (err) {
        showAlert("auth", "error", err.message || "Errore registrazione");
    } finally {
        btn.innerHTML = orig;
        btn.disabled = false;
    }
}

export async function handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById("loginSubmitBtn");
    const orig = btn.innerHTML;
    btn.innerHTML = '<span class="loading"></span>';
    btn.disabled = true;
    hideAlerts();

    try {
        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value;

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        currentUser = data.user;
        await loadUserData();

        if (window.app) {
            window.app.closeAuthModal();
            window.app.showPage("personalized");
        }

    } catch (err) {
        showAlert("auth", "error", err.message || "Credenziali non valide");
    } finally {
        btn.innerHTML = orig;
        btn.disabled = false;
    }
}

export async function handleLogout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    currentUser = null;
    currentProfile = null;
    credits = 0;
    notifyChange();
    if (window.app) window.app.showPage("home");
}

export async function loadUserData() {
    if (!currentUser || !supabase) return;

    const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

    if (error && error.code !== "PGRST116") {
        console.error("Errore caricamento profilo:", error);
    }

    currentProfile = profile || {
        id: currentUser.id,
        email: currentUser.email,
        credits: 0
    };

    credits = currentProfile.credits || 0;
    notifyChange();
}

export function getCurrentUser() { return currentUser; }
export function getCurrentProfile() { return currentProfile; }
export function getCredits() { return credits; }
export function getSupabase() { return supabase; }

export function setCredits(newCredits) {
    credits = Math.max(0, newCredits);
    notifyChange();
}

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

// ===== GEOCODING PROFILO =====
export async function geocodeProfileIfNeeded() {
    if (!currentUser || !currentProfile) return false;
    if (currentProfile.birth_latitude) return true;
    if (!currentProfile.birth_city || !currentProfile.birth_country) return false;

    try {
        const url = `${CONFIG.WORKER_URL}/api/geocode?city=${encodeURIComponent(currentProfile.birth_city)}&country=${encodeURIComponent(currentProfile.birth_country)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Geocoding failed');
        const data = await res.json();

        if (data.lat != null && data.lng != null) {
            const { error } = await supabase.from('profiles').update({
                birth_latitude: data.lat,
                birth_longitude: data.lng,
                birth_timezone: data.timezone,
                updated_at: new Date().toISOString(),
            }).eq('id', currentUser.id);

            if (error) throw error;
            await loadUserData();
            return true;
        }
    } catch (err) {
        console.error('Geocoding error:', err);
    }
    return false;
}
