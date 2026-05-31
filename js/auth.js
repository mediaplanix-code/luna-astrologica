// ============================================================
// AUTH.JS — Autenticazione, profilo, crediti, geocoding
// FIX: handleRegister ora invia correttamente i metadati del form
//      a Supabase Auth, così il trigger handle_new_user() li trova.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { CONFIG } from './config.js';
import { $, setText } from './utils.js';

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

let currentUser = null;
let currentProfile = null;
let currentCredits = 0;

export function getCurrentUser() { return currentUser; }
export function getCurrentProfile() { return currentProfile; }
export function getCredits() { return currentCredits; }

// ============================================================
// INIT AUTH — ascolta cambio stato login/logout
// ============================================================
export async function initAuth(onChange) {
    const { data: { session } } = await supabase.auth.getSession();
    await refreshAuthState(session, onChange);

    supabase.auth.onAuthStateChange(async (event, session) => {
        await refreshAuthState(session, onChange);
    });
}

async function refreshAuthState(session, onChange) {
    if (session?.user) {
        currentUser = session.user;
        await loadUserData();
    } else {
        currentUser = null;
        currentProfile = null;
        currentCredits = 0;
    }
    if (onChange) {
        onChange({
            isLoggedIn: !!currentUser,
            user: currentUser,
            profile: currentProfile,
            credits: currentCredits
        });
    }
}

// ============================================================
// LOAD USER DATA — carica profilo e crediti
// ============================================================
export async function loadUserData() {
    if (!currentUser) return;

    try {
        const { data: profile, error: pErr } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (pErr) {
            console.warn('Errore caricamento profilo:', pErr);
            // Se il profilo non esiste, potrebbe essere un utente appena registrato
            // che il trigger non ha ancora processato. Ritenta tra 1 secondo.
            if (pErr.code === 'PGRST116') {
                console.log('Profilo non trovato, ritento tra 1s...');
                setTimeout(() => loadUserData(), 1000);
            }
            return;
        }

        currentProfile = profile;

        const { data: credits, error: cErr } = await supabase
            .from('credits')
            .select('balance')
            .eq('user_id', currentUser.id)
            .single();

        if (!cErr && credits) {
            currentCredits = credits.balance || 0;
        }

        // Aggiorna UI crediti
        const creditsVal = $('creditsVal');
        if (creditsVal) creditsVal.textContent = currentCredits;

    } catch (err) {
        console.error('Errore loadUserData:', err);
    }
}

// ============================================================
// HANDLE REGISTER — FIX CRITICO: invia metadati del form!
// ============================================================
export async function handleRegister(event) {
    event.preventDefault();

    const btn = $('regSubmitBtn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Creazione account...';
    }

    const errorEl = $('authError');
    const successEl = $('authSuccess');
    if (errorEl) errorEl.style.display = 'none';
    if (successEl) successEl.style.display = 'none';

    // ─── LEGGI I CAMPI DEL FORM ───
    const fullName      = document.getElementById('regName')?.value?.trim();
    const email         = document.getElementById('regEmail')?.value?.trim();
    const password      = document.getElementById('regPassword')?.value;
    const gender        = document.getElementById('regGender')?.value || null;
    const birthDate     = document.getElementById('regBirthDate')?.value;      // YYYY-MM-DD da <input type="date">
    const birthTime     = document.getElementById('regBirthTime')?.value || null;  // HH:MM da <input type="time">
    const birthCity     = document.getElementById('regBirthCity')?.value?.trim();
    const birthCountry  = document.getElementById('regBirthCountry')?.value;

    // Validazione base
    if (!fullName || !email || !password || !birthDate || !birthCity || !birthCountry) {
        if (errorEl) {
            errorEl.textContent = 'Compila tutti i campi obbligatori.';
            errorEl.style.display = 'block';
        }
        if (btn) { btn.disabled = false; btn.textContent = 'Crea account'; }
        return;
    }

    if (password.length < 6) {
        if (errorEl) {
            errorEl.textContent = 'La password deve essere di almeno 6 caratteri.';
            errorEl.style.display = 'block';
        }
        if (btn) { btn.disabled = false; btn.textContent = 'Crea account'; }
        return;
    }

    try {
        // ─── FIX CRITICO: invia i dati del form nei metadati! ───
        // Il trigger handle_new_user() nel DB cerca queste chiavi:
        // full_name, birth_date, birth_time, birth_city, birth_country
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: fullName,           // ← il trigger cerca questo!
                    birth_date: birthDate,         // ← il trigger cerca questo!
                    birth_time: birthTime,         // ← il trigger cerca questo!
                    birth_city: birthCity,         // ← il trigger cerca questo!
                    birth_country: birthCountry,   // ← il trigger cerca questo!
                    gender: gender                 // ← extra, non usato dal trigger ma utile
                },
                emailRedirectTo: window.location.origin + '/?verified=true'
            }
        });

        if (error) throw error;

        if (successEl) {
            successEl.textContent = 'Account creato! Controlla la tua email per confermare.';
            successEl.style.display = 'block';
        }

        // Pulisci form
        document.getElementById('registerForm')?.reset();

        // Dopo 3 secondi, switcha al tab login
        setTimeout(() => {
            window.app.switchAuthTab('login');
            if (successEl) successEl.style.display = 'none';
        }, 3000);

    } catch (err) {
        console.error('Errore registrazione:', err);
        if (errorEl) {
            errorEl.textContent = err.message || 'Errore durante la registrazione.';
            errorEl.style.display = 'block';
        }
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Crea account'; }
    }
}

// ============================================================
// HANDLE LOGIN
// ============================================================
export async function handleLogin(event) {
    event.preventDefault();

    const btn = $('loginSubmitBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Accesso...'; }

    const errorEl = $('authError');
    if (errorEl) errorEl.style.display = 'none';

    const email    = document.getElementById('loginEmail')?.value?.trim();
    const password = document.getElementById('loginPassword')?.value;
    const remember = document.getElementById('rememberMe')?.checked;

    if (!email || !password) {
        if (errorEl) {
            errorEl.textContent = 'Inserisci email e password.';
            errorEl.style.display = 'block';
        }
        if (btn) { btn.disabled = false; btn.textContent = 'Accedi'; }
        return;
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        currentUser = data.user;
        await loadUserData();

        window.app.closeAuthModal();
        window.app.showPage('personalized');

    } catch (err) {
        console.error('Errore login:', err);
        if (errorEl) {
            errorEl.textContent = err.message || 'Email o password non validi.';
            errorEl.style.display = 'block';
        }
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Accedi'; }
    }
}

// ============================================================
// HANDLE LOGOUT
// ============================================================
export async function handleLogout() {
    await supabase.auth.signOut();
    currentUser = null;
    currentProfile = null;
    currentCredits = 0;
    window.app.showPage('home');
}

// ============================================================
// UPDATE CREDITS — aggiorna saldo locale e nel DB
// ============================================================
export async function updateCredits(delta) {
    if (!currentUser) return;

    const newBalance = currentCredits + delta;
    if (newBalance < 0) {
        console.warn('Crediti insufficienti');
        return false;
    }

    try {
        const { error } = await supabase
            .from('credits')
            .update({ balance: newBalance })
            .eq('user_id', currentUser.id);

        if (error) throw error;

        currentCredits = newBalance;
        const creditsVal = $('creditsVal');
        if (creditsVal) creditsVal.textContent = currentCredits;

        return true;
    } catch (err) {
        console.error('Errore aggiornamento crediti:', err);
        return false;
    }
}

// ============================================================
// GEOCODE PROFILE — calcola lat/lng/timezone se mancanti
// ============================================================
export async function geocodeProfileIfNeeded() {
    if (!currentProfile || !currentUser) return false;

    // Se già ha coordinate, non fare nulla
    if (currentProfile.birth_latitude && currentProfile.birth_longitude) {
        return true;
    }

    const city = currentProfile.birth_city;
    const country = currentProfile.birth_country;

    if (!city) return false;

    try {
        const res = await fetch(
            `${CONFIG.API_URL}/api/geocode?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country || '')}`
        );
        if (!res.ok) throw new Error('Geocoding fallito');

        const geo = await res.json();

        const { error } = await supabase
            .from('profiles')
            .update({
                birth_latitude: geo.lat,
                birth_longitude: geo.lng,
                birth_timezone: geo.timezone || 'Europe/Rome'
            })
            .eq('id', currentUser.id);

        if (error) throw error;

        // Aggiorna cache locale
        currentProfile.birth_latitude = geo.lat;
        currentProfile.birth_longitude = geo.lng;
        currentProfile.birth_timezone = geo.timezone || 'Europe/Rome';

        return true;
    } catch (err) {
        console.warn('Geocoding fallito:', err.message);
        return false;
    }
}
