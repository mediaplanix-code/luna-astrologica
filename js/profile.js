import { CONFIG } from './config.js';
import { $, state, formatDate, toast, showModal } from './utils.js';

export function updateProfileUI() {
  if (!state.profile) return;
  const p = state.profile;

  $('#prof-name').textContent = p.full_name || '—';
  $('#prof-email').textContent = state.user?.email || '—';
  $('#prof-birth-date').textContent = formatDate(p.birth_date);
  $('#prof-birth-time').textContent = p.birth_time || '—';
  $('#prof-birth-place').textContent = p.birth_place || '—';
  $('#prof-gender').textContent = p.gender || '—';
  $('#prof-credits').textContent = state.credits;
  $('#prof-subscription').textContent = p.subscription_type || 'Gratuito';
}

export function initProfile() {
  document.addEventListener('section:change', (e) => {
    if (e.detail.section === 'profile') updateProfileUI();
  });

  $('#btn-edit-profile')?.addEventListener('click', async () => {
    toast('Modifica profilo in arrivo nella prossima versione!', 'info');
  });

  $('#btn-delete-account')?.addEventListener('click', async () => {
    const confirmed = await showModal(
      'Elimina Account',
      'Sei sicuro di voler eliminare il tuo account? Questa azione è irreversibile.',
      true
    );
    if (!confirmed) return;

    try {
      const { getSupabase } = await import('./config.js');
      const sb = await getSupabase();
      await sb.from(CONFIG.TABLES.PROFILES)
        .update({ status: 'deleted', updated_at: new Date().toISOString() })
        .eq('id', state.user.id);
      await sb.auth.signOut();
      toast('Account eliminato.', 'success');
    } catch (err) {
      toast(err.message || 'Errore eliminazione account', 'error');
    }
  });
}
