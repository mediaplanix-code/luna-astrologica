// ============================================================
// UI.JS v6.2 — Aggiunte: sogni, affinita, messaggio regalo overlay
// ============================================================

import { CONFIG, ZODIAC_SIGNS, ZODIAC_TAGS, CATEGORY_LABELS, LANGUAGE_FLAGS } from './config.js';
import { $, setText, setHTML } from './utils.js';

export function renderHeader(isLoggedIn, userData) {
    const avatarInitial = userData?.full_name
        ? userData.full_name.charAt(0).toUpperCase()
        : userData?.email?.charAt(0).toUpperCase() || "?";

    const html = `
        <a href="#" class="logo-wrap" onclick="window.app.goHome(); return false;">
            <span class="logo-moon">🌙</span>
            <span class="logo-text">LUNA ASTROLOGICA</span>
        </a>
        <div class="header-right">
            <div class="lang-dropdown" id="langDropdown">
                <button class="lang-btn" onclick="window.app.toggleLang()">
                    <span class="flag" id="currentFlag">🇮🇹</span>
                    <span class="arrow">▼</span>
                </button>
                <div class="lang-menu">
                    <button class="lang-option active" onclick="window.app.setLang('it')" data-lang="it"><span>🇮🇹</span> Italiano</button>
                    <button class="lang-option" onclick="window.app.setLang('en')" data-lang="en"><span>🇬🇧</span> English</button>
                    <button class="lang-option" onclick="window.app.setLang('fr')" data-lang="fr"><span>🇫🇷</span> Français</button>
                    <button class="lang-option" onclick="window.app.setLang('de')" data-lang="de"><span>🇩🇪</span> Deutsch</button>
                    <button class="lang-option" onclick="window.app.setLang('es')" data-lang="es"><span>🇪🇸</span> Español</button>
                </div>
            </div>

            <div class="cart-btn ${isLoggedIn ? 'active' : ''}" id="cartBtn" onclick="window.app.showPaymentsPage()" style="cursor:pointer;" title="Carrello servizi">
                <span style="font-size:1.25rem;">🛒</span>
            </div>

            <div class="user-avatar-sm ${isLoggedIn ? 'active' : ''}" id="userAvatar" onclick="window.app.showPage('personalized')">${avatarInitial}</div>
            <button class="btn-header ${isLoggedIn ? 'hidden' : ''}" id="loginBtn" onclick="window.app.openAuthModal()">LOGIN</button>
            <button class="btn-header ${isLoggedIn ? '' : 'hidden'}" id="logoutBtn" onclick="window.app.handleLogout()">Esci</button>
        </div>
    `;
    setHTML("app-header", html);
}

export function renderNav(activePage) {
    setHTML("app-nav", "");
}

export function renderHomePage() {
    const signs = Object.entries(ZODIAC_SIGNS).map(([name, data]) => `
        <div class="card" onclick="window.app.showHoroscopePage('${name}')">
            <div class="card-icon">${data.symbol}</div>
            <div class="card-label">${name}</div>
        </div>
    `).join("");

    const categories = [
        { key: "amore", icon: "💖", cls: "cat-love" },
        { key: "denaro", icon: "💰", cls: "cat-money" },
        { key: "lavoro", icon: "💼", cls: "cat-work" },
        { key: "salute", icon: "🏥", cls: "cat-health" },
        { key: "amici", icon: "👥", cls: "cat-friends" },
        { key: "famiglia", icon: "👨‍👩‍👧‍👦", cls: "cat-family" },
        { key: "viaggi", icon: "✈️", cls: "cat-travel" },
        { key: "partner", icon: "💑", cls: "cat-partner" },
        { key: "carriera", icon: "📈", cls: "cat-career" },
        { key: "sogni", icon: "🌙", cls: "cat-dreams" },
        { key: "affinita", icon: "💞", cls: "cat-compat" },
    ].map(c => `
        <div class="card ${c.cls}" onclick="window.app.startVoiceSession('${c.key}')">
            <div class="card-icon">${c.icon}</div>
            <div class="card-label">${CATEGORY_LABELS[c.key]}</div>
        </div>
    `).join("");

    const html = `
        <div class="banner-cta">
            <button class="btn-gold" onclick="window.app.requireAuthOrModal()">PERSONALIZZA</button>
        </div>
        <div class="section-title">Segni Zodiacali</div>
        <div class="grid">${signs}</div>
        <div class="banner-cta">
            <button class="btn-gold" onclick="window.app.requireAuthOrModal()">PERSONALIZZA</button>
        </div>
        <div class="section-title">Categorie</div>
        <div class="grid">${categories}</div>
        <div class="banner-cta">
            <button class="btn-gold" onclick="window.app.startVoiceSession('generale')">🎙️ PARLA CON LE TUE STELLE</button>
        </div>
        <!-- SEZIONE PRESENTAZIONE -->
        <div class="section-title">Scopri Luna Astrologica</div>
        <div class="accordion" style="margin-bottom:0.625rem;">
            <div class="accordion-header" onclick="window.app.toggleAccordion(this,'acc-preso-cosae')">
                <div class="accordion-title"><span class="acc-icon">🔮</span> Cos'è Luna Astrologica</div>
                <span class="accordion-arrow">▼</span>
            </div>
            <div class="accordion-body" id="acc-preso-cosae">
                <p>Luna Astrologica è il tuo <strong>consultorio astrologico digitale</strong>. Entri, inserisci data, ora e luogo di nascita, e il motore calcola la tua <strong>carta natale completa</strong>: ruota astrologica, 12 case, posizione dei pianeti, ascendente, segno lunare, Medio Cielo.</p>
                <p>Poi ti mostra i <strong>transiti reali</strong> — cosa sta succedendo oggi nel cielo rispetto alla tua carta — e un dossier interpretativo.</p>
                <p style="margin-top:0.75rem; color:var(--gold);"><strong>La differenza?</strong> Non è un oroscopo generico del giorno. È il TUO cielo, calcolato in tempo reale.</p>
            </div>
        </div>
        <div class="accordion" style="margin-bottom:0.625rem;">
            <div class="accordion-header" onclick="window.app.toggleAccordion(this,'acc-preso-regalo')">
                <div class="accordion-title"><span class="acc-icon">🎁</span> Il Regalo di Benvenuto</div>
                <span class="accordion-arrow">▼</span>
            </div>
            <div class="accordion-body" id="acc-preso-regalo">
                <p>Appena entri, il sito ti fa un regalo: <strong>3 mesi di accesso completo gratis</strong>. Sblocchi tutti i calcoli del tuo tema natale: la ruota, le case, gli aspetti, i transiti, il dossier.</p>
                <p>Se non lo attivi, quei contenuti restano offuscati — li vedi sfocati dietro una vetrata, con un bottone dorato che dice <strong>"Attiva il regalo"</strong>. Clicchi e tutto si sblocca.</p>
                <p style="margin-top:0.75rem; color:var(--gold);"><strong>Perché?</strong> Perché tu possa toccare con mano la potenza dei calcoli reali prima di decidere se vuoi anche l'interpretazione.</p>
            </div>
        </div>
        <div class="accordion" style="margin-bottom:0.625rem;">
            <div class="accordion-header" onclick="window.app.toggleAccordion(this,'acc-preso-voce')">
                <div class="accordion-title"><span class="acc-icon">🎤</span> Parla con le tue Stelle</div>
                <span class="accordion-arrow">▼</span>
            </div>
            <div class="accordion-body" id="acc-preso-voce">
                <p>Non c'è chat testuale — l'unico modo per dialogare con Luna è la <strong>viva voce</strong>.</p>
                <p>Premi il microfono e parli: <em>"Cosa mi dici del lavoro?"</em> — <em>"Ho incontrato una persona, è la mia anima gemella?"</em></p>
                <p>Luna ti risponde a voce, in italiano, basandosi sui <strong>tuoi dati reali</strong>: il tuo segno solare, la tua Luna, il tuo ascendente, dove sta Venere oggi, se Saturno ti sta quadrando. Non è un oroscopo generico — è una <strong>consulenza su misura</strong>.</p>
                <p style="margin-top:0.75rem; color:var(--gold);"><strong>18 minuti di consulenza</strong> per approfondire l'argomento che vuoi. Ma puoi spaziare tra le categorie fino a consumare il tempo acquistato.</p>
            </div>
        </div>
        <div class="accordion" style="margin-bottom:0.625rem;">
            <div class="accordion-header" onclick="window.app.toggleAccordion(this,'acc-preso-affinita')">
                <div class="accordion-title"><span class="acc-icon">💞</span> Affinità di Coppia</div>
                <span class="accordion-arrow">▼</span>
            </div>
            <div class="accordion-body" id="acc-preso-affinita">
                <p>Puoi calcolare la <strong>sinastria</strong> tra il tuo tema natale e quello di una persona che ti sta a cuore. Il sistema analizza le posizioni reciproche dei pianeti, gli elementi, le modalità e genera un punteggio di affinità con consigli personalizzati.</p>
                <p>Non è un gioco — è un confronto tra due cieli, calcolato con la stessa precisione del tema natale singolo.</p>
            </div>
        </div>
        <div class="accordion" style="margin-bottom:0.625rem;">
            <div class="accordion-header" onclick="window.app.toggleAccordion(this,'acc-preso-telegram')">
                <div class="accordion-title"><span class="acc-icon">📱</span> Telegram — Il tuo oroscopo quotidiano</div>
                <span class="accordion-arrow">▼</span>
            </div>
            <div class="accordion-body" id="acc-preso-telegram">
                <p>Nel sito trovi il logo Telegram. Un click, ti iscrivi, e ogni giorno ricevi il tuo <strong>oroscopo personalizzato</strong> direttamente sul telefono.</p>
                <p>Ma c'è di più: se il sistema calcola un evento specifico nel tuo cielo — un transito importante, un'opposizione critica — <strong>Luna ti avvisa per tempo</strong>. Non è una notifica generica, è un alert astrologico su misura.</p>
            </div>
        </div>
        <div class="accordion" style="margin-bottom:0.625rem;">
            <div class="accordion-header" onclick="window.app.toggleAccordion(this,'acc-preso-pagamento')">
                <div class="accordion-title"><span class="acc-icon">💳</span> Come funziona il pagamento</div>
                <span class="accordion-arrow">▼</span>
            </div>
            <div class="accordion-body" id="acc-preso-pagamento">
                <p>Ci sono due strade, a seconda di cosa cerchi:</p>
                <ul style="list-style:none; padding-left:0; margin:0.5rem 0;">
                    <li style="padding-left:1.25rem; position:relative; margin-bottom:0.5rem; color:var(--text-dim);"><span style="position:absolute; left:0; color:var(--gold); font-size:0.7rem;">✦</span> <strong style="color:var(--gold-light);">Accesso Completo (€15/trimestre)</strong> — sblocca tutti i calcoli del tema natale, la ruota, i transiti, il dossier. Se sai leggere la carta, hai il tuo futuro in mano.</li>
                    <li style="padding-left:1.25rem; position:relative; margin-bottom:0.5rem; color:var(--text-dim);"><span style="position:absolute; left:0; color:var(--gold); font-size:0.7rem;">✦</span> <strong style="color:var(--gold-light);">Consulenze vocali (€45)</strong> — 18 minuti di viva voce con Luna che interpreta i tuoi calcoli. Una categoria specifica, ma puoi spaziare tra argomenti fino a consumare i minuti.</li>
                </ul>
                <p style="margin-top:0.75rem; color:var(--gold);"><strong>Soglia €49</strong> — se in un trimestre spendi almeno €49 in consulenze, il trimestre successivo è gratis. È un modo per premiare chi usa davvero il servizio.</p>
            </div>
        </div>
        <div class="accordion" style="margin-bottom:1.5rem;">
            <div class="accordion-header" onclick="window.app.toggleAccordion(this,'acc-preso-unica')">
                <div class="accordion-title"><span class="acc-icon">✨</span> Cosa la rende unica</div>
                <span class="accordion-arrow">▼</span>
            </div>
            <div class="accordion-body" id="acc-preso-unica">
                <p>La maggior parte dei siti ti dà l'oroscopo del giorno generico per il tuo segno. Luna Astrologica invece:</p>
                <ul style="list-style:none; padding-left:0; margin:0.5rem 0;">
                    <li style="padding-left:1.25rem; position:relative; margin-bottom:0.45rem; color:var(--text-dim);"><span style="position:absolute; left:0; color:var(--gold); font-size:0.7rem;">✦</span> Calcola il <strong style="color:var(--gold-light);">tuo tema natale in tempo reale</strong></li>
                    <li style="padding-left:1.25rem; position:relative; margin-bottom:0.45rem; color:var(--text-dim);"><span style="position:absolute; left:0; color:var(--gold); font-size:0.7rem;">✦</span> Ti dice i <strong style="color:var(--gold-light);">transiti personalizzati</strong> e ti spiega cosa significano</li>
                    <li style="padding-left:1.25rem; position:relative; margin-bottom:0.45rem; color:var(--text-dim);"><span style="position:absolute; left:0; color:var(--gold); font-size:0.7rem;">✦</span> Ti permette di fare <strong style="color:var(--gold-light);">sinastria di coppia</strong> con calcoli reali</li>
                    <li style="padding-left:1.25rem; position:relative; margin-bottom:0.45rem; color:var(--text-dim);"><span style="position:absolute; left:0; color:var(--gold); font-size:0.7rem;">✦</span> Ti offre una <strong style="color:var(--gold-light);">consulenza vocale personalizzata</strong>, non generica</li>
                    <li style="padding-left:1.25rem; position:relative; margin-bottom:0.45rem; color:var(--text-dim);"><span style="position:absolute; left:0; color:var(--gold); font-size:0.7rem;">✦</span> Funziona tutto da browser, <strong style="color:var(--gold-light);">senza scaricare nulla</strong></li>
                </ul>
            </div>
        </div>
        <footer class="footer">
            <p>⚠️ Le informazioni fornite da Luna Astrologica hanno solo scopo informativo e di intrattenimento. Non sostituiscono in alcun modo consulti medici, legali o professionali.</p>
            <p>Utilizzando il servizio accetti i Termini di Servizio e la Privacy Policy.</p>
            <div class="footer-links"><a href="#">Termini</a><a href="#">Privacy</a><a href="#">Contatti</a></div>
            <p style="margin-top:0.75rem; font-size:0.625rem;">© 2024 Luna Astrologica</p>
        </footer>
    `;
    setHTML("page-home", html);
}

export function renderHoroscopePage(signName) {
    const data = ZODIAC_SIGNS[signName];
    const tags = (ZODIAC_TAGS[signName] || []).map(t => `<span class="tag">${t}</span>`).join("");

    const html = `
        <div class="horoscope-header">
            <button class="horoscope-back" onclick="window.app.showPage('home')">🔙</button>
            <div class="horoscope-sign" id="horoSignIcon">${data.symbol}</div>
            <div class="horoscope-info">
                <h2 id="horoSignName">${signName}</h2>
                <p id="horoSignDetails">${data.period} • ${data.element} • ${data.ruler}</p>
            </div>
        </div>
        <div class="tags-row" id="horoTags">${tags}</div>
        <div class="horo-tabs">
            <button class="horo-tab active" onclick="window.app.switchHoroTab('day')" id="tab-day">📅 Giorno</button>
            <button class="horo-tab" onclick="window.app.switchHoroTab('week')" id="tab-week">🗓️ Settimana</button>
            <button class="horo-tab" onclick="window.app.switchHoroTab('month')" id="tab-month">📆 Mese</button>
            <button class="horo-tab" onclick="window.app.switchHoroTab('year')" id="tab-year">📊 Anno</button>
        </div>
        <div class="horo-content">
            <div class="horo-text" id="horoTextDay">
                <p><strong>✨ Oroscopo di oggi — ${signName}</strong></p>
                <p style="margin-top:0.75rem;">Oggi il tuo pianeta governatore ti infonde un'energia straordinaria. È il momento perfetto per affrontare quei progetti che hai rimandato troppo a lungo.</p>
                <p style="margin-top:0.75rem;">Nel lavoro, la tua iniziativa non passerà inosservata: un superiore potrebbe notare il tuo impegno e proporti una sfida stimolante.</p>
                <p style="margin-top:0.75rem;">In amore, Venere sorride ai cuori solitari. Se sei in coppia, un gesto spontaneo riscalderà la relazione.</p>
                <p style="margin-top:0.75rem;">Sul fronte economico, è un ottimo momento per investimenti a breve termine, ma evita le spese impulsive.</p>
            </div>
            <div class="horo-text hidden" id="horoTextWeek">
                <p><strong>✨ Oroscopo settimanale — ${signName}</strong></p>
                <p style="margin-top:0.75rem;">Questa settimana porta un'energia di trasformazione significativa. I primi giorni saranno dedicati alla riflessione.</p>
                <p style="margin-top:0.75rem;">In ambito professionale, potrebbe emergere un'opportunità inaspettata. Non lasciarti intimidire dalla novità.</p>
                <p style="margin-top:0.75rem;">Nelle relazioni, la comunicazione sarà la chiave. Sii onesto ma gentile.</p>
            </div>
            <div class="horo-text hidden" id="horoTextMonth">
                <p><strong>✨ Oroscopo mensile — ${signName}</strong></p>
                <p style="margin-top:0.75rem;">Il mese si apre con un transito favorevole che illumina il settore della creatività.</p>
                <p style="margin-top:0.75rem;">A livello lavorativo, Giove favorisce le collaborazioni.</p>
                <p style="margin-top:0.75rem;">In amore, la Luna piena di metà mese porta chiarimenti.</p>
            </div>
            <div class="horo-text hidden" id="horoTextYear">
                <p><strong>✨ Oroscopo annuale — ${signName}</strong></p>
                <p style="margin-top:0.75rem;">L'anno che ti attende è segnato da una profonda crescita interiore.</p>
                <p style="margin-top:0.75rem;">Nel lavoro, aspettati una svolta importante tra la primavera e l'estate.</p>
                <p style="margin-top:0.75rem;">Sul piano sentimentale, l'anno favorisce le relazioni mature e autentiche.</p>
                <p style="margin-top:0.75rem;">La salute richiede attenzione costante.</p>
            </div>
        </div>
        <div style="padding: 0 1rem;">
            <div class="banner-cta" style="margin: 0 0 0.75rem;">
                <button class="btn-gold" onclick="window.app.requireAuthOrModal()">PERSONALIZZA</button>
            </div>
            <div class="grid" style="padding: 0;">
                ${Object.entries(CATEGORY_LABELS).map(([key, label]) => `
                    <div class="card cat-${key}" onclick="window.app.startVoiceSession('${key}')">
                        <div class="card-icon">${getCategoryIcon(key)}</div>
                        <div class="card-label">${label}</div>
                    </div>
                `).join("")}
            </div>
            <div class="banner-cta" style="margin: 0.75rem 0 0;">
                <button class="btn-gold" onclick="window.app.startVoiceSession('generale')">🎙️ PARLA CON LE TUE STELLE</button>
            </div>
        </div>
        <footer class="footer">
            <p>⚠️ Le informazioni fornite da Luna Astrologica hanno solo scopo informativo e di intrattenimento.</p>
            <p>Utilizzando il servizio accetti i Termini di Servizio e la Privacy Policy.</p>
            <div class="footer-links"><a href="#">Termini</a><a href="#">Privacy</a><a href="#">Contatti</a></div>
            <p style="margin-top:0.75rem; font-size:0.625rem;">© 2024 Luna Astrologica</p>
        </footer>
    `;
    setHTML("page-horoscope", html);
}

export function renderVoicePage() {
    const html = `
        <div class="voice-header">
            <button class="voice-back" onclick="window.app.endVoiceSession(); window.app.goBackFromVoice();">🔙</button>
            <div class="voice-title">🎙️ Luna</div>
        </div>

        <div class="voice-timer-wrap">
            <div class="voice-timer-bar-container">
                <div class="voice-timer-bar" id="voiceTimerBar" style="width: 0%;"></div>
            </div>
            <div class="voice-timer-text" id="voiceTimerText">18:00</div>
        </div>

        <div class="voice-status" id="voiceStatus">⏳ Caricamento...</div>

        <div id="elevenlabs-widget-container" style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 1rem;">
        </div>

        <div class="voice-controls">
            <button class="voice-btn voice-btn-end" onclick="window.app.endVoiceSession(); window.app.goBackFromVoice();">
                <span style="font-size: 1.25rem;">✕</span>
            </button>
        </div>
    `;
    setHTML("page-voice", html);
}

export function renderAuthModal() {
    const html = `
        <div class="modal">
            <button class="modal-close" onclick="window.app.closeAuthModal()">✕</button>
            <div class="modal-title" id="authModalTitle">Accedi</div>
            <div class="modal-subtitle">Entra nel tuo universo personale</div>

            <div class="alert alert-error" id="authError"></div>
            <div class="alert alert-success" id="authSuccess"></div>

            <div class="auth-tabs">
                <button class="auth-tab active" id="tab-login" onclick="window.app.switchAuthTab('login')">Accedi</button>
                <button class="auth-tab" id="tab-register" onclick="window.app.switchAuthTab('register')">Registrati</button>
            </div>

            <form id="loginForm" onsubmit="window.app.handleLogin(event)">
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" class="form-input" id="loginEmail" placeholder="la tua email" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Password</label>
                    <input type="password" class="form-input" id="loginPassword" placeholder="••••••••" required>
                </div>
                <div class="remember-wrap">
                    <input type="checkbox" id="rememberMe">
                    <label for="rememberMe">Ricordami</label>
                </div>
                <button type="submit" class="btn-gold btn-full" id="loginSubmitBtn">Accedi</button>
            </form>

            <form id="registerForm" class="hidden" onsubmit="window.app.handleRegister(event)">
                <div class="form-group">
                    <label class="form-label">Nome completo *</label>
                    <input type="text" class="form-input" id="regName" placeholder="Mario Rossi" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Email *</label>
                    <input type="email" class="form-input" id="regEmail" placeholder="email@esempio.it" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Password * (min 6 caratteri)</label>
                    <input type="password" class="form-input" id="regPassword" placeholder="••••••••" required minlength="6">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Sesso</label>
                        <select class="form-input form-select" id="regGender">
                            <option value="">Seleziona</option>
                            <option value="M">Uomo</option>
                            <option value="F">Donna</option>
                            <option value="O">Altro</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Data di nascita *</label>
                        <input type="date" class="form-input" id="regBirthDate" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Ora di nascita</label>
                        <input type="time" class="form-input" id="regBirthTime">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Città di nascita *</label>
                        <input type="text" class="form-input" id="regBirthCity" placeholder="Es. Roma" required>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Nazione *</label>
                    <select class="form-input form-select" id="regBirthCountry" required>
                        <option value="">Seleziona nazione</option>
                        <option value="IT">🇮🇹 Italia</option>
                        <option value="FR">🇫🇷 Francia</option>
                        <option value="DE">🇩🇪 Germania</option>
                        <option value="ES">🇪🇸 Spagna</option>
                        <option value="UK">🇬🇧 Regno Unito</option>
                        <option value="US">🇺🇸 Stati Uniti</option>
                        <option value="CH">🇨🇭 Svizzera</option>
                        <option value="AT">🇦🇹 Austria</option>
                        <option value="BE">🇧🇪 Belgio</option>
                        <option value="NL">🇳🇱 Paesi Bassi</option>
                        <option value="PT">🇵🇹 Portogallo</option>
                        <option value="GR">🇬🇷 Grecia</option>
                        <option value="OTHER">🌍 Altro</option>
                    </select>
                </div>
                <button type="submit" class="btn-gold btn-full" id="regSubmitBtn">Crea account</button>
            </form>
        </div>
    `;
    setHTML("authModal", html);
}

export function renderCompatModal() {
    const html = `
        <div class="modal">
            <button class="modal-close" onclick="window.app.closeCompatModal()">✕</button>
            <div class="modal-title">🔮 Affinità</div>
            <div class="modal-subtitle">Inserisci i dati della persona da confrontare</div>
            <form id="compatForm" onsubmit="window.app.handleCompatSubmit(event)">
                <div class="form-group">
                    <label class="form-label">Nome</label>
                    <input type="text" class="form-input" id="compatName" placeholder="Nome della persona" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Sesso</label>
                    <select class="form-input form-select" id="compatGender">
                        <option value="">Seleziona</option>
                        <option value="M">Uomo</option>
                        <option value="F">Donna</option>
                        <option value="O">Altro</option>
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Data nascita *</label>
                        <input type="date" class="form-input" id="compatBirthDate" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Ora nascita</label>
                        <input type="time" class="form-input" id="compatBirthTime">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Città nascita *</label>
                    <input type="text" class="form-input" id="compatBirthCity" placeholder="Città" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Nazione *</label>
                    <select class="form-input form-select" id="compatBirthCountry" required>
                        <option value="">Seleziona</option>
                        <option value="IT">Italia</option>
                        <option value="FR">Francia</option>
                        <option value="DE">Germania</option>
                        <option value="ES">Spagna</option>
                        <option value="UK">UK</option>
                        <option value="US">USA</option>
                    </select>
                </div>
                <button type="submit" class="btn-gold btn-full">Calcola affinità</button>
            </form>
            <div id="compatResult" style="margin-top:1rem; display:none;"></div>
        </div>
    `;
    setHTML("compatModal", html);
}

const VOICE_ICON = `<svg viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`;

export function renderPersonalizedPage(profile, user, natalData) {
    const name = profile?.full_name || (user?.email?.split("@")[0]) || "Utente";
    const bd = profile?.birth_date ? new Date(profile.birth_date).toLocaleDateString("it-IT", {day:"numeric", month:"long", year:"numeric"}) : "--";
    const bt = profile?.birth_time || "--";
    const bc = profile?.birth_city || "--";
    const bco = profile?.birth_country || "";

    let sunSign = "...";
    let sunSymbol = "✨";
    let moonSign = "...";
    let ascSign = "...";
    let ascDeg = "";
    let mcSign = "...";
    let mcDeg = "";

    if (natalData?.planets) {
        const sun = natalData.planets.find(p => p.key === 'sun');
        if (sun) { sunSign = sun.sign; sunSymbol = sun.symbol || '☉'; }
        const moon = natalData.planets.find(p => p.key === 'moon');
        if (moon) moonSign = moon.sign;
    }
    if (natalData?.ascendant) {
        ascSign = natalData.ascendant.name;
        ascDeg = natalData.ascendant.degree + "°" + (natalData.ascendant.minutes || "0") + "'";
    }
    if (natalData?.mc) {
        mcSign = natalData.mc.name;
        mcDeg = natalData.mc.degree + "°" + (natalData.mc.minutes || "0") + "'";
    }

    const html = `
        <div class="personal-header">
            <div class="personal-sign" id="personalSignIcon">${sunSymbol}</div>
            <div class="personal-info">
                <h2 id="personalName">Benvenuto, ${name}</h2>
                <p id="personalDetails">Nato il ${bd} • ${bt} • ${bc}${bco ? ", " + bco : ""}</p>
            </div>
        </div>

        <div class="personal-astro-line">
            <span>🌙 Luna in <span class="astro-gold">${moonSign}</span></span>
            <span class="astro-sep">|</span>
            <span>⬆️ Ascendente <span class="astro-gold">${ascSign} ${ascDeg}</span></span>
            <span class="astro-sep">|</span>
            <span>🏠 MC <span class="astro-gold">${mcSign} ${mcDeg}</span></span>
        </div>

        <div class="compat-row">
            <span class="compat-label">👤 Compatibilità:</span>
            <span class="compat-pill"><span class="compat-icon">♌</span><span class="compat-name">Leone</span></span>
            <span class="compat-pill"><span class="compat-icon">♉</span><span class="compat-name">Toro</span></span>
            <span class="compat-pill"><span class="compat-icon">♒</span><span class="compat-name">Acquario</span></span>
        </div>

        <div style="padding: 0 1rem; margin-top:1rem;">
            <div class="section-title" style="margin-top:0;">✨ IL TUO OROSCOPO PERSONALIZZATO</div>
            <div class="horo-tabs" style="margin-bottom:0.75rem;">
                <button class="horo-tab active" onclick="window.app.switchPersonalHoroTab('day')" id="ph-tab-day">📅 Giorno</button>
                <button class="horo-tab" onclick="window.app.switchPersonalHoroTab('week')" id="ph-tab-week">🗓️ Settimana</button>
                <button class="horo-tab" onclick="window.app.switchPersonalHoroTab('month')" id="ph-tab-month">📆 Mese</button>
                <button class="horo-tab" onclick="window.app.switchPersonalHoroTab('year')" id="ph-tab-year">📊 Anno</button>
            </div>
            <div class="horo-content" style="margin-bottom:1.5rem;">
                <div class="horo-text" id="ph-text-day">
                    <p><strong style="color:var(--gold);">✨ Il tuo oroscopo di oggi, ${name}</strong></p>
                    <p style="margin-top:0.75rem;">Con il tuo Sole in <span class="ph-sign-name">${sunSign}</span> e la Luna che transita oggi in una posizione favorevole, è un giorno ideale per prendere decisioni legate al lavoro. La tua energia comunicativa è al massimo.</p>
                    <p style="margin-top:0.75rem;">In amore, Venere sorride al tuo segno. Se sei in coppia, un gesto spontaneo riscalderà la relazione. Se sei single, un incontro casuale potrebbe sorprenderti.</p>
                </div>
                <div class="horo-text hidden" id="ph-text-week">
                    <p><strong style="color:var(--gold);">✨ La tua settimana</strong></p>
                    <p style="margin-top:0.75rem;">Questa settimana Giove transita in una posizione favorevole rispetto al tuo segno solare <span class="ph-sign-name">${sunSign}</span>. Le opportunità professionali si moltiplicano.</p>
                    <p style="margin-top:0.75rem;">Attenzione alla Luna piena di mercoledì: potrebbe portare chiarimenti in una relazione importante.</p>
                </div>
                <div class="horo-text hidden" id="ph-text-month">
                    <p><strong style="color:var(--gold);">✨ Il tuo mese</strong></p>
                    <p style="margin-top:0.75rem;">Il mese si apre con un transito favorevole che illumina il settore della creatività per <span class="ph-sign-name">${sunSign}</span>. È il momento di lanciare progetti rimandati.</p>
                    <p style="margin-top:0.75rem;">Saturno ti invita alla prudenza finanziaria nei primi 10 giorni. Poi Giove apre una finestra fortunata.</p>
                </div>
                <div class="horo-text hidden" id="ph-text-year">
                    <p><strong style="color:var(--gold);">✨ Il tuo anno</strong></p>
                    <p style="margin-top:0.75rem;">L'anno che ti attende è segnato da una profonda crescita interiore. Con il tuo segno <span class="ph-sign-name">${sunSign}</span>, sarai chiamato a riscoprire la tua autenticità.</p>
                    <p style="margin-top:0.75rem;">Nel lavoro, aspettati una svolta importante tra la primavera e l'estate. Le collaborazioni internazionali sono favorite.</p>
                </div>
            </div>
        </div>

        <div class="accordion">
            <div class="accordion-header" onclick="window.app.toggleAccordion(this,'acc-wheel')">
                <div class="accordion-title"><span class="acc-icon">🎯</span> RUOTA DEL TEMA NATALE</div>
                <span class="accordion-arrow">▼</span>
            </div>
            <div class="accordion-body" id="acc-wheel">
                <div id="natalWheel" style="width:100%;min-height:350px;display:flex;align-items:center;justify-content:center;padding:0.5rem 0;">✨</div>
                <div class="action-btn-row">
                    <button class="action-btn" onclick="window.app.startVoiceAbout('ruota')">
                        ${VOICE_ICON}
                        <span>Cosa vuol dire? Parla con Luna</span>
                    </button>
                </div>
                <p style="text-align:center; font-size:0.75rem; color:var(--text-dim); margin-top:0.75rem;">Tema natale calcolato con effemeridi svizzere</p>
            </div>
        </div>

        <div class="accordion">
            <div class="accordion-header" onclick="window.app.toggleAccordion(this,'acc-planets')">
                <div class="accordion-title"><span class="acc-icon">🪐</span> POSIZIONE DEI PIANETI</div>
                <span class="accordion-arrow">▼</span>
            </div>
            <div class="accordion-body" id="acc-planets">
                <div class="planet-grid">
                    <div class="planet-item"><span class="planet-symbol">☉</span><span class="planet-name">Sole</span><span class="planet-pos" id="pos-sun">--</span></div>
                    <div class="planet-item"><span class="planet-symbol">☽</span><span class="planet-name">Luna</span><span class="planet-pos" id="pos-moon">--</span></div>
                    <div class="planet-item"><span class="planet-symbol">☿</span><span class="planet-name">Mercurio</span><span class="planet-pos" id="pos-mercury">--</span></div>
                    <div class="planet-item"><span class="planet-symbol">♀</span><span class="planet-name">Venere</span><span class="planet-pos" id="pos-venus">--</span></div>
                    <div class="planet-item"><span class="planet-symbol">♂</span><span class="planet-name">Marte</span><span class="planet-pos" id="pos-mars">--</span></div>
                    <div class="planet-item"><span class="planet-symbol">♃</span><span class="planet-name">Giove</span><span class="planet-pos" id="pos-jupiter">--</span></div>
                    <div class="planet-item"><span class="planet-symbol">♄</span><span class="planet-name">Saturno</span><span class="planet-pos" id="pos-saturn">--</span></div>
                    <div class="planet-item"><span class="planet-symbol">♅</span><span class="planet-name">Urano</span><span class="planet-pos" id="pos-uranus">--</span></div>
                    <div class="planet-item"><span class="planet-symbol">♆</span><span class="planet-name">Nettuno</span><span class="planet-pos" id="pos-neptune">--</span></div>
                    <div class="planet-item"><span class="planet-symbol">♇</span><span class="planet-name">Plutone</span><span class="planet-pos" id="pos-pluto">--</span></div>
                </div>
                <div class="action-btn-row">
                    <button class="action-btn" onclick="window.app.startVoiceAbout('pianeti')">
                        ${VOICE_ICON}
                        <span>Cosa vuol dire? Parla con Luna</span>
                    </button>
                </div>
            </div>
        </div>

        <div class="accordion">
            <div class="accordion-header" onclick="window.app.toggleAccordion(this,'acc-houses')">
                <div class="accordion-title"><span class="acc-icon">🏠</span> CASE ASTROLOGICHE</div>
                <span class="accordion-arrow">▼</span>
            </div>
            <div class="accordion-body" id="acc-houses">
                <div class="planet-grid">
                    <div class="planet-item"><span class="planet-symbol">1</span><span class="planet-name">Casa I</span><span class="planet-pos" id="house-1">--</span></div>
                    <div class="planet-item"><span class="planet-symbol">2</span><span class="planet-name">Casa II</span><span class="planet-pos" id="house-2">--</span></div>
                    <div class="planet-item"><span class="planet-symbol">3</span><span class="planet-name">Casa III</span><span class="planet-pos" id="house-3">--</span></div>
                    <div class="planet-item"><span class="planet-symbol">4</span><span class="planet-name">Casa IV</span><span class="planet-pos" id="house-4">--</span></div>
                    <div class="planet-item"><span class="planet-symbol">5</span><span class="planet-name">Casa V</span><span class="planet-pos" id="house-5">--</span></div>
                    <div class="planet-item"><span class="planet-symbol">6</span><span class="planet-name">Casa VI</span><span class="planet-pos" id="house-6">--</span></div>
                    <div class="planet-item"><span class="planet-symbol">7</span><span class="planet-name">Casa VII</span><span class="planet-pos" id="house-7">--</span></div>
                    <div class="planet-item"><span class="planet-symbol">8</span><span class="planet-name">Casa VIII</span><span class="planet-pos" id="house-8">--</span></div>
                    <div class="planet-item"><span class="planet-symbol">9</span><span class="planet-name">Casa IX</span><span class="planet-pos" id="house-9">--</span></div>
                    <div class="planet-item"><span class="planet-symbol">10</span><span class="planet-name">Casa X (MC)</span><span class="planet-pos" id="house-10">--</span></div>
                    <div class="planet-item"><span class="planet-symbol">11</span><span class="planet-name">Casa XI</span><span class="planet-pos" id="house-11">--</span></div>
                    <div class="planet-item"><span class="planet-symbol">12</span><span class="planet-name">Casa XII</span><span class="planet-pos" id="house-12">--</span></div>
                </div>
                <div class="action-btn-row">
                    <button class="action-btn" onclick="window.app.startVoiceAbout('case')">
                        ${VOICE_ICON}
                        <span>Cosa vuol dire? Parla con Luna</span>
                    </button>
                </div>
            </div>
        </div>

        <div class="accordion">
            <div class="accordion-header" onclick="window.app.toggleAccordion(this,'acc-aspects')">
                <div class="accordion-title"><span class="acc-icon">⚡</span> ASPETTI PLANETARI</div>
                <span class="accordion-arrow">▼</span>
            </div>
            <div class="accordion-body" id="acc-aspects">
                <div class="acc-static-content" style="font-size:0.875rem; line-height:1.7;">
                    <p style="color:var(--text-dim);"><em>🔮 Gli aspetti planetari vengono calcolati automaticamente in base alla posizione dei pianeti nel tuo tema natale.</em></p>
                </div>
                <div class="action-btn-row" style="margin-top:1rem; text-align:center;">
                    <button class="action-btn" onclick="window.app.startVoiceAbout('aspetti')">
                        ${VOICE_ICON}
                        <span>Cosa vuol dire? Parla con Luna!</span>
                    </button>
                </div>
            </div>
        </div>

        <div class="accordion">
            <div class="accordion-header" onclick="window.app.toggleAccordion(this,'acc-transits')">
                <div class="accordion-title"><span class="acc-icon">🌙</span> TRANSITI PLANETARI — <span id="transitDate">${new Date().toLocaleDateString('it-IT')}</span></div>
                <span class="accordion-arrow">▼</span>
            </div>
            <div class="accordion-body" id="acc-transits">
                <div class="acc-static-content" style="font-size:0.875rem; line-height:1.7;">
                    <p style="color:var(--text-dim);"><em>🌙 I transiti planetari vengono aggiornati quotidianamente in base alla posizione attuale dei pianeti rispetto al tuo tema natale. Torna a trovarci domani per le previsioni aggiornate.</em></p>
                </div>
                <div class="action-btn-row" style="margin-top:1rem; text-align:center;">
                    <button class="action-btn" onclick="window.app.startVoiceAbout('transiti')">
                        ${VOICE_ICON}
                        <span>Cosa vuol dire? Parla con Luna!</span>
                    </button>
                </div>
            </div>
        </div>

        <div class="accordion">
            <div class="accordion-header" onclick="window.app.toggleAccordion(this,'acc-compat')">
                <div class="accordion-title"><span class="acc-icon">💞</span> AFFINITÀ DI COPPIA</div>
                <span class="accordion-arrow">▼</span>
            </div>
            <div class="accordion-body" id="acc-compat">
                <div style="font-size:0.875rem; line-height:1.7;">
                    <p style="color:var(--text-dim);"><em>💞 Scopri la sinastria tra il tuo tema natale e quello di una persona che ti sta a cuore. Analisi delle posizioni reciproche, degli elementi e delle modalità.</em></p>
                </div>
                <div class="action-btn-row" style="margin-top:1rem; text-align:center;">
                    <button class="action-btn" onclick="window.app.openCompatModal()">
                        ${VOICE_ICON}
                        <span>Calcola affinità di coppia</span>
                    </button>
                </div>
            </div>
        </div>

        <div style="padding: 0 1rem; margin-top:1.5rem;">
            <div class="banner-cta" style="margin: 0 0 0.75rem;">
                <button class="btn-gold" onclick="window.app.startVoiceSession('generale')">🎙️ PARLA CON LE TUE STELLE</button>
            </div>
            <div class="section-title">Categorie</div>
            <div class="grid">
                ${Object.entries(CATEGORY_LABELS).map(([key, label]) => `
                    <div class="card cat-${key}" onclick="window.app.startVoiceSession('${key}')">
                        <div class="card-icon">${getCategoryIcon(key)}</div>
                        <div class="card-label">${label}</div>
                    </div>
                `).join("")}
            </div>
        </div>

        <footer class="footer">
            <p>⚠️ Le informazioni fornite da Luna Astrologica hanno solo scopo informativo e di intrattenimento. Non sostituiscono in alcun modo consulti medici, legali o professionali.</p>
            <p>Utilizzando il servizio accetti i Termini di Servizio e la Privacy Policy.</p>
            <div class="footer-links"><a href="#">Termini</a><a href="#">Privacy</a><a href="#">Contatti</a></div>
            <p style="margin-top:0.75rem; font-size:0.625rem;">© 2024 Luna Astrologica</p>
        </footer>
    `;
    setHTML("page-personalized", html);
}

let serviceChoiceCategory = null;

export function showServiceChoice(category) {
    serviceChoiceCategory = category;
}

export function closeServiceChoice() {
    const modal = document.getElementById("serviceChoiceModal");
    if (modal) modal.classList.remove("active");
    document.body.style.overflow = "";
}

export function getServiceChoiceCategory() {
    return serviceChoiceCategory;
}

export function showPage(pageId, lastPageRef) {
    document.querySelectorAll(".page-section").forEach(s => s.classList.remove("active"));

    const target = document.getElementById("page-" + pageId);
    if (target) target.classList.add("active");

    window.scrollTo(0, 0);
    return pageId;
}

function getCategoryIcon(key) {
    const icons = { amore: "💖", denaro: "💰", lavoro: "💼", salute: "🏥", amici: "👥", famiglia: "👨‍👩‍👧‍👦", viaggi: "✈️", partner: "💑", carriera: "📈", sogni: "🌙", affinita: "💞" };
    return icons[key] || "✨";
}
