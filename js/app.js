import { initStarfield, initAuthTabs } from './utils.js';
import { initUI } from './ui.js';
import { initAuth } from './auth.js';
import { initNatal } from './natal.js';
import { initTransits } from './transits.js';
import { initHoroscope } from './horoscope.js';
import { initChat } from './chat.js';
import { initProfile } from './profile.js';
import { initPayments } from './payments.js';

(async function bootstrap() {
  initStarfield();
  initAuthTabs();
  initUI();
  initNatal();
  initTransits();
  initHoroscope();
  initChat();
  initProfile();
  initPayments();
  await initAuth();
  console.log('🌙 Luna Astrologica avviata');
})();
