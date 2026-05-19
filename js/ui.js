// ============================================================
// UI.JS — Renderizza tutti i componenti UI
// ============================================================

import { CONFIG, ZODIAC_SIGNS, ZODIAC_TAGS, CATEGORY_LABELS, LANGUAGE_FLAGS } from './config.js';
import { $, setText, setHTML } from './utils.js';

// ===== RENDER HEADER =====
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
            <button class="cart-btn ${isLoggedIn ? 'active' : ''}" id="cartBtn">🛒<<span class="cart-badge" id="cartBadge">0</span></button>
            <div class="credits-pill ${isLoggedIn ? 'active' : ''}" id="creditsPill">
                <div class="credits-dot" id="creditsDot"></div>
                <span id="creditsVal">${userData?.credits || 0}</span>
            </div>
            <div class="user-avatar-sm ${isLoggedIn ? 'active' : ''}" id="userAvatar" onclick="window.app.showPage('personalized')">${avatarInitial}</div>
            <button class="btn-header ${isLoggedIn ? 'hidden' : ''}" id="loginBtn" onclick="window.app.openAuthModal()">LOGIN</button>
            <button class="btn-header ${isLoggedIn ? '' : 'hidden'}" id="logoutBtn" onclick="window.app.handleLogout()">Esci</button>
        </div>
    `;
    setHTML("app-header", html);
}

// ===== RENDER BOTTOM NAV =====
export function renderNav(activePage) {
    const html = `
        <button class="nav-item ${activePage === 'home' ? 'active' : ''}" id="nav-home" onclick="window.app.showPage('home')">
            <span class="nav-icon">🏠</span><span>Home</span>
        </button>
        <button class="nav-item ${activePage === 'chat' ? 'active' : ''}" id="nav-chat" onclick="window.app.requireAuthOrModalForChat('chat')">
            <span class="nav-icon">💬</span><span>Chat</span>
        </button>
        <button class="nav-item ${activePage === 'personalized' ? 'active' : ''}" id="nav-personalized" onclick="window.app.requireAuthOrModal()">
            <span class="nav-icon">⭐</span><span>Profilo</span>
        </button>
    `;
    setHTML("app-nav", html);
}

// ===== RENDER HOME PAGE =====
export function renderHomePage() {
    const signs = Object.entries(ZODIAC_SIGNS).map(([name, data]) => `
        <div class="card" onclick="window.app.showHoroscopePage('${name}')">
            <div class="card-icon">${data.symbol}</div>
            <div class="card-label">${name}</div>
        </div>
    `).join("");

    const categories = [
        { key: "amore", icon: "❤️", cls: "cat-love" },
        { key: "denaro", icon: "💰", cls: "cat-money" },
        { key: "lavoro", icon: "💼", cls: "cat-work" },
        { key: "salute", icon: "🍎", cls: "cat-health" },
        { key: "amici", icon: "👥", cls: "cat-friends" },
        { key: "famiglia", icon: "🏠", cls: "cat-family" },
        { key: "viaggi", icon: "✈️", cls: "cat-travel" },
        { key: "partner", icon: "💑", cls: "cat-partner" },
        { key: "carriera", icon: "📈", cls: "cat-career" },
    ].map(c => `
        <div class="card ${c.cls}" onclick="window.app.requireAuthOrModal()">
            <div class="card-icon">${c.icon}</div>
            <div class="card-label">${CATEGORY_LABELS[c.key]}</div>
        </div>
    `).join("");

    const html = `
        <div class="banner-cta">
            <button class="btn-gold" onclick="window.app.requireAuthOrModal()">PERSONALIZZA</button>
        </div>
        <div class="mode-toggle">
            <button class="mode-btn active" id="mode-chat" onclick="window.app.requireAuthOrModalForChat('chat')">💬 Chat</button>
            <button class="mode-btn" id="mode-voice" onclick="window.app.requireAuthOrModalForChat('voice')">🎙️ Voce</button>
        </div>
        <div class="section-title">Segni Zodiacali</div>
        <div class="grid">${signs}</div>
        <div class="banner-cta">
            <button class="btn-gold" onclick="window.app.requireAuthOrModal()">PERSONALIZZA</button>
        </div>
        <div class="section-title">Categorie</div>
        <div class="grid">${categories}</div>
        <div class="banner-cta">
            <button class="btn-gold" onclick="window.app.requireAuthOrModal()">PARLA CON LE TUE STELLE</button>
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

// ===== RENDER HOROSCOPE PAGE =====
export function renderHoroscopePage(signName) {
    const data = ZODIAC_SIGNS[signName];
    const tags = (ZODIAC_TAGS[signName] || []).map(t => `<span class="tag">${t}</span>`).join("");

    const html = `
        <div class="horoscope-header">
            <button class="horoscope-back" onclick="window.app.showPage('home')">←</button>
            <div class="horoscope-sign" id="horoSignIcon">${data.symbol}</div>
            <div class="horoscope-info">
                <h2 id="horoSignName">${signName}</h2>
                <p id="horoSignDetails">${data.period} • ${data.element} • ${data.ruler}</p>
            </div>
        </div>
        <div class="tags-row" id="horoTags">${tags}</div>
        <div class="horo-tabs">
            <button class="horo-tab active" onclick="window.app.switchHoroTab('day')" id="tab-day">📅 Giorno</button>
            <button class="horo-tab" onclick="window.app.switchHoroTab('week')" id="tab-week">📆 Settimana</button>
            <button class="horo-tab" onclick="window.app.switchHoroTab('month')" id="tab-month">🗓️ Mese</button>
            <button class="horo-tab" onclick="window.app.switchHoroTab('year')" id="tab-year">📊 Anno</button>
        </div>
        <div class="horo-content">
            <div class="horo-text" id="horoTextDay">
                <p><strong>✨ Oroscopo di oggi</strong></p>
                <p style="margin-top:0.75rem;">Oggi il tuo pianeta governatore ti infonde un'energia straordinaria. È il momento perfetto per affrontare quei progetti che hai rimandato troppo a lungo.</p>
                <p style="margin-top:0.75rem;">Nel lavoro, la tua iniziativa non passerà inosservata: un superiore potrebbe notare il tuo impegno e proporti una sfida stimolante.</p>
                <p style="margin-top:0.75rem;">In amore, Venere sorride ai cuori solitari. Se sei in coppia, un gesto spontaneo riscalderà la relazione.</p>
                <p style="margin-top:0.75rem;">Sul fronte economico, è un ottimo momento per investimenti a breve termine, ma evita le spese impulsive.</p>
            </div>
            <div class="horo-text hidden" id="horoTextWeek">
                <p><strong>✨ Oroscopo settimanale</strong></p>
                <p style="margin-top:0.75rem;">Questa settimana porta un'energia di trasformazione significativa. I primi giorni saranno dedicati alla riflessione.</p>
                <p style="margin-top:0.75rem;">In ambito professionale, potrebbe emergere un'opportunità inaspettata. Non lasciarti intimidire dalla novità.</p>
                <p style="margin-top:0.75rem;">Nelle relazioni, la comunicazione sarà la chiave. Sii onesto ma gentile.</p>
            </div>
            <div class="horo-text hidden" id="horoTextMonth">
                <p><strong>✨ Oroscopo mensile</strong></p>
                <p style="margin-top:0.75rem;">Il mese si apre con un transito favorevole che illumina il settore della creatività.</p>
                <p style="margin-top:0.75rem;">A livello lavorativo, Giove favorisce le collaborazioni.</p>
                <p style="margin-top:0.75rem;">In amore, la Luna piena di metà mese porta chiarimenti.</p>
            </div>
            <div class="horo-text hidden" id="horoTextYear">
                <p><strong>✨ Oroscopo annuale</strong></p>
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
            <div class="mode-toggle" style="margin: 0 0 0.75rem;">
                <button class="mode-btn active" onclick="window.app.requireAuthOrModalForChat('chat')">💬 Chat</button>
                <button class="mode-btn" onclick="window.app.requireAuthOrModalForChat('voice')">🎙️ Voce</button>
            </div>
            <div class="grid" style="padding: 0;">
                ${Object.entries(CATEGORY_LABELS).map(([key, label]) => `
                    <div class="card cat-${key}" onclick="window.app.requireAuthOrModal()">
                        <div class="card-icon">${getCategoryIcon(key)}</div>
                        <div class="card-label">${label}</div>
                    </div>
                `).join("")}
            </div>
            <div class="banner-cta" style="margin: 0.75rem 0 0;">
                <button class="btn-gold" onclick="window.app.requireAuthOrModal()">PARLA CON LE TUE STELLE</button>
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

// ===== RENDER CHAT PAGE =====
export function renderChatPage() {
    const html = `
        <div class="chat-header">
            <button class="chat-back" onclick="window.app.goBackFromChat()">←</button>
            <div class="chat-title">💬 Luna Astrologica</div>
        </div>
        <div class="chat-messages" id="chatMessages">
            <div class="msg msg-ai">
                <p>Ciao! Sono Luna, la tua astrologa personale. Come posso aiutarti oggi?</p>
                <div class="msg-meta">Luna • ora</div>
            </div>
        </div>
        <div class="chat-input-wrap">
            <input type="text" class="chat-input" id="chatInput" placeholder="Scrivi un messaggio..." onkeypress="if(event.key==='Enter')window.app.sendMessage()">
            <button class="chat-send" onclick="window.app.sendMessage()">Invia</button>
        </div>
    `;
    setHTML("page-chat", html);
}

// ===== RENDER AUTH MODAL =====
export function renderAuthModal() {
    const html = `
        <div class="modal">
            <button class="modal-close" onclick="window.app.closeAuthModal()">×</button>
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
                    <input type="password" class="form-input" id="loginPassword" placeholder="••••••" required>
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
                    <input type="password" class="form-input" id="regPassword" placeholder="••••••" required minlength="6">
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

// ===== RENDER COMPAT MODAL =====
export function renderCompatModal() {
    const html = `
        <div class="modal">
            <button class="modal-close" onclick="window.app.closeCompatModal()">×</button>
            <div class="modal-title">Compatibilità</div>
            <div class="modal-subtitle">Inserisci i dati della persona da confrontare</div>
            <form onsubmit="window.app.handleCompatSubmit(event)">
                <div class="form-group">
                    <label class="form-label">Nome</label>
                    <input type="text" class="form-input" placeholder="Nome della persona" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Data nascita</label>
                        <input type="date" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Ora nascita</label>
                        <input type="time" class="form-input">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Città nascita</label>
                    <input type="text" class="form-input" placeholder="Città">
                </div>
                <div class="form-group">
                    <label class="form-label">Nazione</label>
                    <select class="form-input form-select">
                        <option value="">Seleziona</option>
                        <option value="IT">Italia</option>
                        <option value="FR">Francia</option>
                        <option value="DE">Germania</option>
                        <option value="ES">Spagna</option>
                        <option value="UK">UK</option>
                        <option value="US">USA</option>
                    </select>
                </div>
                <button type="submit" class="btn-gold btn-full">Calcola compatibilità</button>
            </form>
        </div>
    `;
    setHTML("compatModal", html);
}

// ===== RENDER PERSONALIZED PAGE =====
export function renderPersonalizedPage(profile, user) {
    const name = profile?.full_name || (user?.email?.split("@")[0]) || "Utente";
    const bd = profile?.birth_date ? new Date(profile.birth_date).toLocaleDateString("it-IT", {day:"numeric", month:"long", year:"numeric"}) : "--";
    const bt = profile?.birth_time || "--";
    const bc = profile?.birth_city || "--";
    const bco = profile?.birth_country || "";

    const sign = "Scorpione";
    const symbol = "♏";

    const html = `
        <div class="personal-header">
            <button class="personal-back" onclick="window.app.showPage('home')">←</button>
            <div class="personal-sign" id="personalSignIcon">${symbol}</div>
            <div class="personal-info">
                <h2 id="personalName">Benvenuto, ${name}</h2>
                <p id="personalDetails">Nato il ${bd} • ${bt} • ${bc}${bco ? ", " + bco : ""}</p>
            </div>
        </div>
        <div class="compat-row">
            <span class="compat-label">⭐ Compatibilità:</span>
            <button class="compat-pill" onclick="window.app.showCompat('Leone')"><span class="compat-icon">♌</span> Leone</button>
            <button class="compat-pill" onclick="window.app.showCompat('Toro')"><span class="compat-icon">♉</span> Toro</button>
            <button class="compat-pill" onclick="window.app.showCompat('Acquario')"><span class="compat-icon">♒</span> Acquario</button>
            <button class="compat-pill" onclick="window.app.openCompatModal()"><span style="font-size:0.75rem;">➕</span> Altro</button>
        </div>
        <div class="personalize-btn">
            <button class="btn-gold btn-gold-outline" onclick="window.app.openProfileEdit()">
                <span style="font-size:0.875rem; margin-right:0.25rem;">➕</span> Personalizza
            </button>
        </div>

        <div class="accordion">
            <div class="accordion-header" onclick="window.app.toggleAccordion(this,'acc-wheel')">
                <div class="accordion-title"><span class="acc-icon">☸️</span> RUOTA DEL TEMA NATALE</div>
                <span class="accordion-arrow">▼</span>
            </div>
            <div class="accordion-body" id="acc-wheel">
                <div class="natal-wheel"><div class="wheel-placeholder" id="natalWheel">${symbol}</div></div>
                <p style="text-align:center; font-size:0.75rem; color:var(--text-dim); margin-top:0.5rem;">Tema natale calcolato con effemeridi svizzere</p>
            </div>
        </div>

        <div class="accordion">
            <div class="accordion-header" onclick="window.app.toggleAccordion(this,'acc-planets')">
                <div class="accordion-title"><span class="acc-icon">📍</span> POSIZIONE DEI PIANETI</div>
                <span class="accordion-arrow">▼</span>
            </div>
            <div class="accordion-body" id="acc-planets">
                <div class="planet-grid">
                    <div class="planet-item"><span class="planet-symbol">☉</span><span class="planet-name">Sole</span><span class="planet-pos">Scorpione 22°</span></div>
                    <div class="planet-item"><span class="planet-symbol">☽</span><span class="planet-name">Luna</span><span class="planet-pos">Leone 8°</span></div>
                    <div class="planet-item"><span class="planet-symbol">☿</span><span class="planet-name">Mercurio</span><span class="planet-pos">Sagittario 5°</span></div>
                    <div class="planet-item"><span class="planet-symbol">♀</span><span class="planet-name">Venere</span><span class="planet-pos">Scorpione 14°</span></div>
                    <div class="planet-item"><span class="planet-symbol">♂</span><span class="planet-name">Marte</span><span class="planet-pos">Capricorno 3°</span></div>
                    <div class="planet-item"><span class="planet-symbol">♃</span><span class="planet-name">Giove</span><span class="planet-pos">Pesci 28°</span></div>
                    <div class="planet-item"><span class="planet-symbol">♄</span><span class="planet-name">Saturno</span><span class="planet-pos">Acquario 15°</span></div>
                    <div class="planet-item"><span class="planet-symbol">♅</span><span class="planet-name">Urano</span><span class="planet-pos">Toro 17°</span></div>
                    <div class="planet-item"><span class="planet-symbol">♆</span><span class="planet-name">Nettuno</span><span class="planet-pos">Pesci 24°</span></div>
                    <div class="planet-item"><span class="planet-symbol">♇</span><span class="planet-name">Plutone</span><span class="planet-pos">Capricorno 28°</span></div>
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
                    ${[1,2,3,4,5,6,7,8,9,10,11,12].map(n => `
                        <div class="planet-item">
                            <span class="planet-symbol">${n}</span>
                            <span class="planet-name">Casa ${n === 10 ? 'X (MC)' : (n === 1 ? 'I' : ['II','III','IV','V','VI','VII','VIII','IX','XI','XII'][n-2])}</span>
                            <span class="planet-pos">--</span>
                        </div>
                    `).join("")}
                </div>
            </div>
        </div>

        <div class="accordion">
            <div class="accordion-header" onclick="window.app.toggleAccordion(this,'acc-aspects')">
                <div class="accordion-title"><span class="acc-icon">⚡</span> ASPETTI PLANETARI</div>
                <span class="accordion-arrow">▼</span>
            </div>
            <div class="accordion-body" id="acc-aspects">
                <div style="font-size:0.8125rem; line-height:1.7;">
                    <p><strong style="color:var(--gold);">Sole congiunta Venere</strong> — Scorpione 22°/14° • Intensità emotiva e magnetismo personale elevato.</p>
                    <p style="margin-top:0.75rem;"><strong style="color:var(--gold);">Luna quadrata Sole</strong> — Leone/Scorpione • Tensione tra espressione emotiva e identità.</p>
                    <p style="margin-top:0.75rem;"><strong style="color:var(--gold);">Marte trigono Giove</strong> — Capricorno/Pesci • Energia costruttiva e ambizione.</p>
                </div>
            </div>
        </div>

        <div class="accordion">
            <div class="accordion-header" onclick="window.app.toggleAccordion(this,'acc-transits')">
                <div class="accordion-title"><span class="acc-icon">🌙</span> TRANSITI PLANETARI — <span id="transitDate">${new Date().toLocaleDateString('it-IT')}</span></div>
                <span class="accordion-arrow">▼</span>
            </div>
            <div class="accordion-body" id="acc-transits">
                <div style="font-size:0.8125rem; line-height:1.7;">
                    <p><strong style="color:var(--gold);">Giove in Gemelli</strong> transita nella tua Casa VII — Periodo favorevole per nuove partnership.</p>
                    <p style="margin-top:0.75rem;"><strong style="color:var(--gold);">Saturno in Pesci</strong> transita nella tua Casa II — Ristrutturazione delle finanze.</p>
                </div>
            </div>
        </div>

        <div style="padding: 0 1rem; margin-top:1.5rem;">
            <div class="mode-toggle" style="margin: 0 0 0.75rem;">
                <button class="mode-btn active" onclick="window.app.showPage('chat')">💬 Chat</button>
                <button class="mode-btn" onclick="window.app.showPage('chat')">🎙️ Voce</button>
            </div>
            <div class="grid" style="padding: 0;">
                ${Object.entries(CATEGORY_LABELS).map(([key, label]) => `
                    <div class="card cat-${key}" onclick="window.app.startCategoryChat('${key}')">
                        <div class="card-icon">${getCategoryIcon(key)}</div>
                        <div class="card-label">${label}</div>
                    </div>
                `).join("")}
            </div>
        </div>
        <div style="padding: 0 1rem; margin-top:1rem;">
            <button class="btn-gold" style="width:100%;" onclick="window.app.showPage('chat')">PARLA CON LE TUE STELLE</button>
        </div>
        <div style="padding: 1rem; margin-top:1.5rem; border-top:1px solid var(--border);">
            <button class="btn-gold btn-gold-outline" style="width:100%; color:var(--danger); border-color:rgba(239,68,68,0.3);" onclick="window.app.handleLogout()">🚪 Disconnetti account</button>
        </div>
    `;
    setHTML("page-personalized", html);
}

// ===== NAVIGAZIONE PAGINE =====
export function showPage(pageId, lastPageRef) {
    document.querySelectorAll(".page-section").forEach(s => s.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));

    const target = document.getElementById("page-" + pageId);
    if (target) target.classList.add("active");

    const nav = document.getElementById("nav-" + pageId);
    if (nav) nav.classList.add("active");

    window.scrollTo(0, 0);
    return pageId;
}

// ===== HELPER: icona categoria =====
function getCategoryIcon(key) {
    const icons = { amore: "❤️", denaro: "💰", lavoro: "💼", salute: "🍎", amici: "👥", famiglia: "🏠", viaggi: "✈️", partner: "💑", carriera: "📈" };
    return icons[key] || "✨";
}