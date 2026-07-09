import { CONFIG, getSupabase } from './config.js';
import { $, $$, toast, navigateTo, state, retryWithBackoff } from './utils.js';
import { setNavbar, updateCreditBadge } from './ui.js';

export async function handleRegister(e) {
  e.preventDefault();
  const sb = await getSupabase();

  const name = $('#reg-name').value.trim();
  const email = $('#reg-email').value.trim();
  const password = $('#reg-password').value;
  const birthDate = $('#reg-birth-date').value;
  const birthTime = $('#reg-birth-time').value;
  const birthPlace = $('#reg-birth-place').value.trim();
  const gender = $('#reg-gender').value;

  if (!name || !email || !password || !birthDate || !birthTime || !birthPlace || !gender) {
    toast('Compila tutti i campi', 'error'); return;
  }
  if (password.length < 8) {
    toast('La password deve avere almeno 8 caratteri', 'error'); return;
  }

  const metadata = {
    full_name: name,
    birth_date: birthDate,
    birth_time: birthTime,
    birth_place: birthPlace,
    gender: gender
  };

  try {
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: metadata }
    });

    if (error) throw error;

    $('#login-form').classList.add('hidden');
    $('#register-form').classList.add('hidden');
    $('#verify-pending').classList.remove('hidden');
    toast('Registrazione completata! Controlla la tua email.', 'success');

  } catch (err) {
    toast(err.message || 'Errore registrazione', 'error');
  }
}

export async function handleLogin(e) {
  e.preventDefault();
  const sb = await getSupabase();
  const email = $('#login-email').value.trim();
  const password = $('#login-password').value;

  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await onAuthSuccess(data.session);
  } catch (err) {
    toast(err.message || 'Credenziali non valide', 'error');
  }
}

export async function handleEmailVerification() {
  const sb = await getSupabase();
  const { data: { session } } = await sb.auth.getSession();

  if (session) {
    toast('Email verificata! Accesso automatico...', 'success');
    await onAuthSuccess(session);
    return true;
  }
  return false;
}

export async function onAuthSuccess(session) {
  state.session = session;
  state.user = session.user;

  const sb = await getSupabase();

  let profile = null;
  try {
    profile = await retryWithBackoff(async () => {
      const { data, error } = await sb
        .from(CONFIG.TABLES.PROFILES)
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Profilo non ancora creato');
      return data;
    }, CONFIG.RETRY_MAX_ATTEMPTS, CONFIG.RETRY_DELAY_MS);
  } catch (err) {
    try {
      await sb.rpc(CONFIG.RPC.SYNC_MISSING_PROFILES);
      const { data } = await sb
        .from(CONFIG.TABLES.PROFILES)
        .select('*')
        .eq('id', session.user.id)
        .single();
      if (data) profile = data;
    } catch (syncErr) {
      console.error('Sync failed:', syncErr);
    }

    if (!profile) {
      toast('Errore caricamento profilo. Ricarica la pagina.', 'error');
      return;
    }
  }

  state.profile = profile;

  try {
    const { data: creditBalance } = await sb.rpc(CONFIG.RPC.GET_USER_CREDITS, {
      p_user_id: session.user.id
    });
    state.credits = creditBalance ?? 0;
  } catch (err) {
    state.credits = 0;
  }

  setNavbar(true);
  updateCreditBadge();
  $('#user-name').textContent = profile.full_name || 'Stellare';

  const isNew = profile.created_at && 
    (new Date() - new Date(profile.created_at)) < 24 * 60 * 60 * 1000;
  if (isNew) {
    $('#welcome-gift-banner').classList.remove('hidden');
  }

  navigateTo('home');
  toast(`Benvenuto, ${profile.full_name || ''}!`, 'success');
}

export async function initAuth() {
  initAuthTabs();

  $('#register-form')?.addEventListener('submit', handleRegister);
  $('#login-form')?.addEventListener('submit', handleLogin);

  $('#btn-resend')?.addEventListener('click', async () => {
    const sb = await getSupabase();
    const email = $('#reg-email').value.trim() || $('#login-email').value.trim();
    if (!email) { toast('Inserisci l'email', 'error'); return; }
    const { error } = await sb.auth.resend({ type: 'signup', email });
    if (error) toast(error.message, 'error');
    else toast('Email reinviata!', 'success');
  });

  $('#link-forgot')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = $('#login-email').value.trim();
    if (!email) { toast('Inserisci l'email per il reset', 'error'); return; }
    const sb = await getSupabase();
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    });
    if (error) toast(error.message, 'error');
    else toast('Email di reset inviata!', 'success');
  });

  const sb = await getSupabase();
  const { data: { session } } = await sb.auth.getSession();

  if (session) {
    await onAuthSuccess(session);
  } else {
    const handled = await handleEmailVerification();
    if (!handled) {
      setNavbar(false);
      navigateTo('auth-section');
    }
  }

  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      await onAuthSuccess(session);
    } else if (event === 'SIGNED_OUT') {
      state.user = null;
      state.profile = null;
      state.credits = 0;
      state.session = null;
      setNavbar(false);
      navigateTo('auth-section');
    }
  });
}
