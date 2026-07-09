import { $, $$, navigateTo, state } from './utils.js';

export function initUI() {
  // Navbar links
  $$('.nav-links a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(link.dataset.section);
    });
  });

  // Hero cards navigation
  $$('.hero-card').forEach(card => {
    card.addEventListener('click', () => {
      navigateTo(card.dataset.section);
    });
  });

  // Personalized tabs
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      $$('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      $$('.tab-content').forEach(c => c.classList.remove('active'));
      $(`#tab-${tab}`)?.classList.add('active');
      document.dispatchEvent(new CustomEvent('tab:change', { detail: { tab } }));
    });
  });

  // Logout
  $('#btn-logout')?.addEventListener('click', async () => {
    const { getSupabase } = await import('./config.js');
    const sb = await getSupabase();
    await sb.auth.signOut();
    state.user = null;
    state.profile = null;
    state.credits = 0;
    state.session = null;
    state.currentConversation = null;
    $('#navbar').classList.add('hidden');
    navigateTo('auth-section');
  });
}

export function updateCreditBadge() {
  const badge = $('#credit-badge');
  if (badge) badge.textContent = `💎 ${state.credits}`;
}

export function setNavbar(show) {
  $('#navbar').classList.toggle('hidden', !show);
}
