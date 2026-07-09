import { CONFIG } from './config.js';
import { $, $$ } from './utils.js';

const HOROSCOPE_DATA = {
  'Ariete': { text: 'Oggi Marte ti dà energia extra. È il momento di agire sui progetti rimandati.', love: 4, work: 5, money: 3, energy: 5 },
  'Toro': { text: 'Venere favorisce la stabilità emotiva. Concentrati sulle relazioni consolidate.', love: 5, work: 3, money: 4, energy: 3 },
  'Gemelli': { text: 'Mercurio rende la comunicazione fluida. Ottimo giorno per negoziati.', love: 3, work: 5, money: 3, energy: 4 },
  'Cancro': { text: 'La Luna ti rende più sensibile. Dedicati al riposo e alla famiglia.', love: 4, work: 2, money: 3, energy: 2 },
  'Leone': { text: 'Il Sole risplende sul tuo segno. Autostima alle stelle, osa di più.', love: 5, work: 4, money: 4, energy: 5 },
  'Vergine': { text: 'Mercurio ti aiuta nell'analisi. Dettagli che prima sfuggivano ora sono chiari.', love: 3, work: 5, money: 4, energy: 3 },
  'Bilancia': { text: 'Venere cerca armonia. Risolvi i conflitti con diplomazia.', love: 5, work: 3, money: 3, energy: 4 },
  'Scorpione': { text: 'Plutone svela verità nascoste. Intuizione potenziata.', love: 4, work: 4, money: 3, energy: 4 },
  'Sagittario': { text: 'Giove espande i tuoi orizzonti. Nuove opportunità all'orizzonte.', love: 3, work: 4, money: 5, energy: 5 },
  'Capricorno': { text: 'Saturno richiede disciplina. I risultati arrivano con la costanza.', love: 2, work: 5, money: 5, energy: 3 },
  'Acquario': { text: 'Urano porta innovazione. Pensa fuori dagli schemi.', love: 3, work: 4, money: 3, energy: 4 },
  'Pesci': { text: 'Nettuno amplifica l'intuizione. Creatività e sensibilità al massimo.', love: 5, work: 3, money: 2, energy: 3 }
};

function stars(n) { return '★'.repeat(n) + '☆'.repeat(5 - n); }

export function initHoroscope() {
  const grid = $('#horoscope-grid');
  if (!grid) return;
  grid.innerHTML = '';
  CONFIG.SIGNS.forEach(sign => {
    const el = document.createElement('div');
    el.className = 'horoscope-item';
    el.dataset.sign = sign.name;
    el.innerHTML = `<span class="sign-icon">${sign.icon}</span><span class="sign-name">${sign.name}</span><span class="sign-date">${sign.dates}</span>`;
    el.addEventListener('click', () => showHoroscopeDetail(sign.name));
    grid.appendChild(el);
  });
}

async function showHoroscopeDetail(signName) {
  $$('.horoscope-item').forEach(i => i.classList.toggle('active', i.dataset.sign === signName));

  const { state } = await import('./utils.js');
  let data = null;
  if (state.user) {
    try {
      const { getSupabase } = await import('./config.js');
      const sb = await getSupabase();
      const today = new Date().toISOString().split('T')[0];
      const { data: report } = await sb.rpc('get_daily_report', {
        p_user_id: state.user.id,
        p_date: today
      });
      if (report && report[signName]) data = report[signName];
    } catch (e) { /* fallback statico */ }
  }

  if (!data) data = HOROSCOPE_DATA[signName];
  if (!data) return;

  $('#horoscope-sign-title').textContent = `Oroscopo ${signName}`;
  $('#horoscope-text').textContent = data.text || data.description || '';
  $('#horoscope-love').textContent = stars(data.love || 3);
  $('#horoscope-work').textContent = stars(data.work || 3);
  $('#horoscope-money').textContent = stars(data.money || 3);
  $('#horoscope-energy').textContent = stars(data.energy || 3);
  $('#horoscope-detail').classList.remove('hidden');
}
