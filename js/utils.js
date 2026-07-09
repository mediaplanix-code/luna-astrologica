import { CONFIG } from './config.js';

// ===== DOM helpers =====
export const $ = (sel, ctx = document) => ctx.querySelector(sel);
export const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// ===== Toast =====
export function toast(message, type = 'info', duration = 4000) {
  const container = $('#toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), duration + 500);
}

// ===== Modal =====
let modalResolve = null;
export function showModal(title, message, showCancel = true) {
  return new Promise((resolve) => {
    modalResolve = resolve;
    const overlay = $('#modal-overlay');
    if (!overlay) return resolve(false);
    $('#modal-title').textContent = title;
    $('#modal-message').textContent = message;
    const cancelBtn = $('#modal-cancel');
    if (cancelBtn) cancelBtn.classList.toggle('hidden', !showCancel);
    overlay.classList.remove('hidden');
  });
}
export function hideModal(result = false) {
  const overlay = $('#modal-overlay');
  if (overlay) overlay.classList.add('hidden');
  if (modalResolve) { modalResolve(result); modalResolve = null; }
}
$('#modal-confirm')?.addEventListener('click', () => hideModal(true));
$('#modal-cancel')?.addEventListener('click', () => hideModal(false));

// ===== Navigation =====
export function navigateTo(sectionId) {
  $$('.section').forEach(s => s.classList.remove('active'));
  const target = $(`#${sectionId}`);
  if (target) target.classList.add('active');
  $$('.nav-links a').forEach(a => a.classList.toggle('active', a.dataset.section === sectionId));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  document.dispatchEvent(new CustomEvent('section:change', { detail: { section: sectionId } }));
}

// ===== Local state =====
export const state = {
  user: null,
  profile: null,
  credits: 0,
  session: null,
  currentConversation: null
};

// ===== Retry with backoff (idempotente) =====
export async function retryWithBackoff(fn, maxAttempts = CONFIG.RETRY_MAX_ATTEMPTS, delay = CONFIG.RETRY_DELAY_MS) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxAttempts - 1) throw err;
      await new Promise(r => setTimeout(r, delay * (i + 1)));
    }
  }
}

// ===== Formatters =====
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return isNaN(d) ? '—' : d.toLocaleDateString('it-IT');
}
export function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d) ? '—' : d.toLocaleString('it-IT');
}
export function formatTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d) ? '—' : d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

// ===== Starfield canvas =====
export function initStarfield() {
  const canvas = $('#starfield');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let stars = [];
  const STAR_COUNT = 180;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3,
      alpha: Math.random(),
      speed: Math.random() * 0.3 + 0.05
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      s.alpha += s.speed * 0.02;
      const a = 0.3 + Math.abs(Math.sin(s.alpha)) * 0.7;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(226,232,240,${a})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

// ===== Auth tab switching =====
export function initAuthTabs() {
  $$('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      $('#login-form').classList.toggle('hidden', target !== 'login');
      $('#register-form').classList.toggle('hidden', target !== 'register');
      $('#verify-pending').classList.add('hidden');
    });
  });
}
