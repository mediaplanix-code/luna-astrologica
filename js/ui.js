// ============================================================
// UI.JS — Renderizza tutti i componenti UI
// FIX: compat modal con reset e struttura per risultato reale
// ============================================================

import { CONFIG, ZODIAC_SIGNS, ZODIAC_TAGS, CATEGORY_LABELS, LANGUAGE_FLAGS } from './config.js';
import { $, setText, setHTML } from './utils.js';

// ========== RENDER HEADER ==========
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
                    <span class="arrow">▾</span>
                </button>
                <div class="lang-menu">
                    <button class="lang-option active" onclick="window.app.setLang('it')" data-lang="it"><span>🇮🇹</span> Italiano</button>
                    <button class="lang-option" onclick="window.app.setLang('en')" data-lang="en"><span>🇬🇧</span> English</button>
                    <button class="lang-option" onclick="window.app.setLang('fr')" data-lang="fr"><span>🇫🇷</span> Français</button>
                    <button class="lang-option" onclick="window.app.setLang('de')" data-lang="de"><span>🇩🇪</span> Deutsch</button>
                    <button class="lang-option" onclick="window.app.setLang('es')" data-lang="es"><span>🇪🇸</span> Español</button>
                </div>
            </div>
            <div class="credits-pill ${isLoggedIn ? 'active' : ''}" id="creditsPill" onclick="window.app.showPaymentsPage()" style="cursor:pointer;">
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

// ========== RENDER BOTTOM NAV — RIMOSSA ==========
export function renderNav(activePage) {
    setHTML("app-nav", "");
}

// ========== RENDER HOME PAGE ==========
export function renderHomePage() {
    const signs = Object.entries(ZODIAC_SIGNS).map(([name, data]) => `
        <div class="card" onclick="window.app.showHoroscopePage('${name}')">
            <div class="card-icon">${data.symbol}</div>
            <div class="card-label">${name}</div>
        </div>
    `).join("");

    const categories = [
        { key: "amore", icon: "💑", cls: "cat-love" },
        { key: "denaro", icon: "💰", cls: "cat-money" },
        { key: "lavoro", icon: "💼", cls: "cat-work" },
        { key: "salute", icon: "🩺", cls: "cat-health" },
        { key: "amici", icon: "🫂", cls: "cat-friends" },
        { key: "famiglia", icon: "👨‍👩‍👧‍👦", cls: "cat-family" },
        { key: "viaggi", icon: "✈️", cls: "cat-travel" },
        { key: "partner", icon: "💏", cls: "cat-partner" },
        { key: "carriera", icon: "🎓", cls: "cat-career" },
    ].map(c => `
        <div class="card ${c.cls}" onclick="window.app.showServiceChoice('${c.key}')">
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
            <button class="mode-btn" id="mode-voice" onclick="window.app.requireAuthOrModalForChat('voice')">🎙️ Voice</button>
        </div>
        <div class="section-title">Segni Zodiacali</div>
        <div class="grid">${signs}</div>
        <div class="banner-cta">
            <button class="btn-gold" onclick="window.app.requireAuthOrModal()">PERSONALIZZA</button>
        </div>
        <div class="section-title">Categorie</div>
        <div class="grid">${categories}</div>
        <div class="banner-cta">
            <button class="btn-gold" onclick="window.app.requireAuthOrModalForChat('chat')">PARLA CON LE TUE STELLE</button>
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

// ========== RENDER HOROSCOPE PAGE ==========
export function renderHoroscopePage(signName) {
    const data = ZODIAC_SIGNS[signName];
    const tags = (ZODIAC_TAGS[signName] || []).map(t => `<span class="tag">${t}</span>`).join("");

    const html = `
        <div class="horoscope-header">
            <button class="horoscope-back" onclick="window.app.showPage('home')">⬅️</button>
            <div class="horoscope-sign" id="horoSignIcon">${data.symbol}</div>
            <div class="horoscope-info">
                <h2 id="horoSignName">${signName}</h2>
                <p id="horoSignDetails">${data.period} · ${data.element} · ${data.ruler}</p>
            </div>
        </div>
        <div class="tags-row" id="horoTags">${tags}</div>
        <div class="horo-tabs">
            <button class="horo-tab active" onclick="window.app.switchHoroTab('day')" id="tab-day">📅 Giorno</button>
            <button class="horo-tab" onclick="window.app.switchHoroTab('week')" id="tab-week">🗓️ Settimana</button>
            <button class="horo-tab" onclick="window.app.switchHoroTab('month')" id="tab-month">📆 Mese</button>
            <button class="horo-tab" onclick="window.app.switchHoroTab('year')" id="tab-year">📈 Anno</button>
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
                <p style="margin-top:0.75rem;">La salute richiede attenzione costante.</p>
            </div>
        </div>
        <div style="padding: 0 1rem;">
            <div class="banner-cta" style="margin: 0 0 0.75rem;">
                <button class="btn-gold" onclick="window.app.requireAuthOrModal()">PERSONALIZZA</button>
            </div>
            <div class="mode-toggle" style="margin: 0 0 0.75rem;">
                <button class="mode-btn active" onclick="window.app.requireAuthOrModalForChat('chat')">💬 Chat</button>
                <button class="mode-btn" onclick="window.app.requireAuthOrModalForChat('voice')">🎙️ Voice</button>
            </div>
            <div class="grid" style="padding: 0;">
                ${Object.entries(CATEGORY_LABELS).map(([key, label]) => `
                    <div class="card cat-${key}" onclick="window.app.showServiceChoice('${key}')">
                        <div class="card-icon">${getCategoryIcon(key)}</div>
                        <div class="card-label">${label}</div>
                    </div>
                `).join("")}
            </div>
            <div class="banner-cta" style="margin: 0.75rem 0 0;">
                <button class="btn-gold" onclick="window.app.requireAuthOrModalForChat('chat')">PARLA CON LE TUE STELLE</button>
            </div>
        </div>
        <footer class="footer">
            <p>⚠️ Le informazioni fornite da Luna Astrologica hanno solo scopo informativo e di intrattenimento. Non sostituiscono in alcun modo consulti medici, legali o professionali.</p>
            <p>Utilizzando il servizio accetti i Termini di Servizio e la Privacy Policy.</p>
            <div class="footer-link"><a href="#">Termini</a><a href="#">Privacy</a><a href="#">Contatti</a></div>
            <p style="margin-top:0.75rem; font-size:0.625rem;">© 2024 Luna Astrologica</p>
        </footer>
    `;
    setHTML("page-horoscope", html);
}

// ========== RENDER CHAT PAGE ==========
export function renderChatPage() {
    const html = `
        <div class="chat-header">
            <button class="chat-back" onclick="window.app.goBackFromChat()">⬅️</button>
            <div class="chat-title">💬 Luna Astrologica</div>
        </div>
        <div class="chat-messages" id="chatMessages">
            <div class="msg msg-ai" id="currentExchange">
                <p>Ciao! Sono Luna, la tua astrologa personale. Come posso aiutarti oggi?</p>
                <div class="msg-meta">Luna · ora</div>
            </div>
        </div>
        <div class="chat-input-wrap">
            <input type="text" class="chat-input" id="chatInput" placeholder="Scrivi un messaggio..." onkeypress="if(event.key==='Enter')window.app.sendMessage()">
            <button class="chat-send" onclick="window.app.sendMessage()">Invia</button>
        </div>
    `;
    setHTML("page-chat", html);
}

// ========== RENDER AUTH MODAL ==========
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
                <div class="form-group" style="font-size:0.875rem; line-height:1.7;">
                    <p style="color:var(--text-dim);"><em>💡 Gli aspetti planetari vengono calcolati automaticamente in base alla posizione dei pianeti nel tuo tema natale.</em></p>
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
                    <input type="password" class="form-input" id="regPassword" placeholder="..." required minlength="6">
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
                        <option value="IT">Italia</option>
                        <option value="FR">Francia</option>
                        <option value="DE">Germania</option>
                        <option value="ES">Spagna</option>
                        <option value="UK">UK</option>
                        <option value="US">USA</option>
                        <option value="CH">Svizzera</option>
                        <option value="AT">Austria</option>
                        <option value="BE">Belgio</option>
                        <option value="NL">Paesi Bassi</option>
                        <option value="PT">Portogallo</option>
                        <option value="GR">Grecia</option>
                        <option value="OTHER">Altro</option>
                    </select>
                </div>
                <button type="submit" class="btn-gold btn-full" id="regSubmitBtn">Crea account</button>
            </form>
        </div>
    `;
    setHTML("authModal", html);
}

// ========== RENDER COMPAT MODAL ==========
export function renderCompatModal() {
    const html = `
        <div class="modal">
            <button class="modal-close" onclick="window.app.closeCompatModal()">✕</button>
            <div class="modal-title">💑 Affinità</div>
            <div class="modal-subtitle">Inserisci i dati della persona da confrontare</div>
            <form id="compatForm" onsubmit="window.app.handleCompatSubmit(event)">
                <div class="form-group">
                    <label class="form-label">Nome</label>
                    <input type="text" class="form-input" id="compatName" placeholder="Nome della persona" required>
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

// ========== RENDER PERSONALIZED PAGE ==========
export function renderPersonalizedPage(profile, user, natalData) {
    const name = profile?.full_name || (user?.email?.split("@")[0]) || "Utente";

    let sunSign = "...";
    let sunSymbol = "✨";
    let moonSign = "";
    let moonSymbol = "";
    let ascendant = "";
    let ascSymbol = "";
    let isLoading = !natalData;

    if (natalData?.planets) {
        const sun = natalData.planets.find(p => p.key === "sun");
        if (sun) {
            sunSign = sun.sign;
            sunSymbol = ZODIAC_SIGNS[sunSign]?.symbol || "☉";
        }
        const moon = natalData.planets.find(p => p.key === "moon");
        if (moon) {
            moonSign = moon.sign;
            moonSymbol = ZODIAC_SIGNS[moonSign]?.symbol || "☽";
        }
        if (natalData.ascendant) {
            ascendant = natalData.ascendant.sign;
            ascSymbol = ZODIAC_SIGNS[ascendant]?.symbol || "ASC";
        }
    }

    const details = [sunSign, moonSign, ascendant].filter(Boolean).join(" · ");

    const loadingBanner = isLoading ? `
        <div class="loading-banner" style="background: rgba(245,158,11,0.1); border: 1px solid var(--gold); border-radius: 0.75rem; padding: 1rem; margin: 0 1rem 1rem; text-align: center; color: var(--gold);">
            <div style="display: inline-block; width: 1rem; height: 1rem; border: 2px solid var(--gold); border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 0.5rem; vertical-align: middle;"></div>
            <span style="font-size: 0.875rem;">Calcolo del tema natale in corso...</span>
        </div>
        <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    ` : "";

    const html = `
        ${loadingBanner}
        <div class="personalized-header">
            <div class="personal-sign" id="personalSignIcon">${sunSymbol}</div>
            <div class="personal-info">
                <h2 id="personalName">${name}</h2>
                <p id="personalDetails">${details}</p>
            </div>
        </div>

        <div class="personal-horo-tabs">
            <button class="ph-tab active" onclick="window.app.switchPersonalHoroTab('day')" id="ph-tab-day">📅 Giorno</button>
            <button class="ph-tab" onclick="window.app.switchPersonalHoroTab('week')" id="ph-tab-week">🗓️ Settimana</button>
            <button class="ph-tab" onclick="window.app.switchPersonalHoroTab('month')" id="ph-tab-month">📆 Mese</button>
            <button class="ph-tab" onclick="window.app.switchPersonalHoroTab('year')" id="ph-tab-year">📈 Anno</button>
        </div>
        <div class="personal-horo-content">
            <div class="ph-text" id="ph-text-day">
                <p><strong>✨ Il tuo oroscopo personalizzato — Giorno</strong></p>
                <p style="margin-top:0.75rem;">Oggi il Sole transita in armonia con il tuo segno natale. È un giorno ideale per prendere decisioni importanti e avviare nuovi progetti.</p>
                <p style="margin-top:0.75rem;">La Luna nel tuo settore emotivo suggerisce di ascoltare l'intuito: un'occasione potrebbe presentarsi quando meno te l'aspetti.</p>
            </div>
            <div class="ph-text hidden" id="ph-text-week">
                <p><strong>✨ Il tuo oroscopo personalizzato — Settimana</strong></p>
                <p style="margin-top:0.75rem;">Questa settimana Mercurio favorisce la comunicazione. È il momento perfetto per risolvere vecchi malintesi e rafforzare i legami.</p>
            </div>
            <div class="ph-text hidden" id="ph-text-month">
                <p><strong>✨ Il tuo oroscopo personalizzato — Mese</strong></p>
                <p style="margin-top:0.75rem;">Il mese si apre con un transito favorevole che illumina il settore della creatività. Esplora nuove passioni e non temere di osare.</p>
            </div>
            <div class="ph-text hidden" id="ph-text-year">
                <p><strong>✨ Il tuo oroscopo personalizzato — Anno</strong></p>
                <p style="margin-top:0.75rem;">L'anno che ti attende è segnato da una profonda crescita interiore. Saturno insegna pazienza e perseveranza.</p>
            </div>
        </div>

        <div class="section-title" style="margin-top:1.5rem;">Tema Natale</div>
        <div class="natal-wheel-wrap">
            <div id="natalWheel" style="width:100%; max-width:320px; margin:0 auto;"></div>
        </div>

        <div class="section-title">Posizioni Planetarie</div>
        <div class="planet-grid">
            ${["sun","moon","mercury","venus","mars","jupiter","saturn","uranus","neptune","pluto"].map(p => `
                <div class="planet-card">
                    <div class="planet-icon">${p === "sun" ? "☉" : p === "moon" ? "☽" : p === "mercury" ? "☿" : p === "venus" ? "♀" : p === "mars" ? "♂" : p === "jupiter" ? "♃" : p === "saturn" ? "♄" : p === "uranus" ? "♅" : p === "neptune" ? "♆" : "♇"}</div>
                    <div class="planet-name">${p.charAt(0).toUpperCase() + p.slice(1)}</div>
                    <div class="planet-pos" id="pos-${p}">${natalData?.planets?.find(x => x.key === p)?.sign || "--"}</div>
                </div>
            `).join("")}
        </div>

        <div class="section-title">Case Astrologiche</div>
        <div class="houses-grid">
            ${Array.from({length: 12}, (_, i) => i + 1).map(h => `
                <div class="house-card" id="house-${h}">
                    <div class="house-num">Casa ${h}</div>
                    <div class="house-sign">${natalData?.houses?.find(x => x.number === h)?.sign || "--"}</div>
                </div>
            `).join("")}
        </div>

        <div class="accordion">
            <div class="accordion-header" onclick="window.app.toggleAccordion(this,'acc-aspects')">
                <div class="accordion-title"><span class="acc-icon">⚡</span> ASPETTI PLANETARI — <span id="aspectsCount">${(natalData?.aspects || []).length}</span></div>
                <span class="accordion-arrow">▾</span>
            </div>
            <div class="accordion-body" id="acc-aspects">
                <div style="font-size:0.875rem; line-height:1.7;">
                    ${(natalData?.aspects || []).length > 0
                        ? natalData.aspects.map(a => `<p>• ${a.planet1} ${a.type} ${a.planet2} (orb ${a.orb}°)</p>`).join("")
                        : `<p style="color:var(--text-dim);"><em>⚡ Gli aspetti planetari vengono calcolati automaticamente in base alla posizione dei pianeti nel tuo tema natale.</em></p>`
                    }
                </div>
                <div class="action-btn-row">
                    <button class="action-btn" onclick="window.app.startChatAbout('aspetti')">
                        ${CHAT_ICON}
                        <span>Chiedi a Luna</span>
                    </button>
                    <button class="action-btn" onclick="window.app.startVoiceAbout('aspetti')">
                        ${VOICE_ICON}
                        <span>Spiegami</span>
                    </button>
                </div>
            </div>
        </div>

        <div class="accordion">
            <div class="accordion-header" onclick="window.app.toggleAccordion(this,'acc-transits')">
                <div class="accordion-title"><span class="acc-icon">🌙</span> TRANSITI PLANETARI — <span id="transitDate">${new Date().toLocaleDateString('it-IT')}</span></div>
                <span class="accordion-arrow">▾</span>
            </div>
            <div class="accordion-body" id="acc-transits">
                <div style="font-size:0.875rem; line-height:1.7;">
                    <p style="color:var(--text-dim);"><em>🌙 I transiti planetari vengono aggiornati quotidianamente in base alla posizione attuale dei pianeti rispetto al tuo tema natale. Torna a trovarci domani per le previsioni aggiornate.</em></p>
                </div>
                <div class="action-btn-row">
                    <button class="action-btn" onclick="window.app.startChatAbout('transiti')">
                        ${CHAT_ICON}
                        <span>Chiedi a Luna</span>
                    </button>
                    <button class="action-btn" onclick="window.app.startVoiceAbout('transiti')">
                        ${VOICE_ICON}
                        <span>Spiegami</span>
                    </button>
                </div>
            </div>
        </div>

        <div class="accordion">
            <div class="accordion-header" onclick="window.app.toggleAccordion(this,'acc-dossier')">
                <div class="accordion-title"><span class="acc-icon">📜</span> DOSSIER ASTROLOGICO</div>
                <span class="accordion-arrow">▾</span>
            </div>
            <div class="accordion-body" id="acc-dossier">
                <div style="font-size:0.875rem; line-height:1.7;">
                    <p style="color:var(--text-dim);"><em>📜 Il dossier astrologico completo verrà generato dopo il calcolo del tema natale. Contiene l'identikit psicologico, i punti di forza, le sfide e i consigli personalizzati.</em></p>
                </div>
                <div class="action-btn-row">
                    <button class="action-btn" onclick="window.app.startChatAbout('dossier')">
                        ${CHAT_ICON}
                        <span>Chiedi a Luna</span>
                    </button>
                    <button class="action-btn" onclick="window.app.startVoiceAbout('dossier')">
                        ${VOICE_ICON}
                        <span>Spiegami</span>
                    </button>
                </div>
            </div>
        </div>

        <div style="padding: 0 1rem; margin-top:1.5rem;">
            <div class="banner-cta" style="margin: 0 0 0.75rem;">
                <button class="btn-gold" onclick="window.app.requireAuthOrModalForChat('chat')">💬 PARLA CON LE TUE STELLE</button>
            </div>
            <div class="section-title">Categorie</div>
            <div class="grid">
                ${Object.entries(CATEGORY_LABELS).map(([key, label]) => `
                    <div class="card cat-${key}" onclick="window.app.showServiceChoice('${key}')">
                        <div class="card-icon">${getCategoryIcon(key)}</div>
                        <div class="card-label">${label}</div>
                    </div>
                `).join("")}
            </div>
        </div>

        <footer class="footer">
            <p>⚠️ Le informazioni fornite da Luna Astrologica hanno solo scopo informativo e di intrattenimento. Non sostituiscono in alcun modo consulti medici, legali o professionali.</p>
            <p>Utilizzando il servizio accetti i Termini di Servizio e la Privacy Policy.</p>
            <div class="footer-link"><a href="#">Termini</a><a href="#">Privacy</a><a href="#">Contatti</a></div>
            <p style="margin-top:0.75rem; font-size:0.625rem;">© 2024 Luna Astrologica</p>
        </footer>
    `;
    setHTML("page-personalized", html);
}

// ========== SERVICE CHOICE MODAL ==========
let serviceChoiceCategory = null;

export function showServiceChoice(category) {
    serviceChoiceCategory = category;
    const label = CATEGORY_LABELS[category] || category;

    let modal = document.getElementById("serviceChoiceModal");
    if (modal) {
        modal.classList.add("active");
        document.body.style.overflow = "hidden";
    }
}

export function closeServiceChoice() {
    const modal = document.getElementById("serviceChoiceModal");
    if (modal) modal.classList.remove("active");
    document.body.style.overflow = "";
}

export function getServiceChoiceCategory() {
    return serviceChoiceCategory;
}

// ========== NAVIGAZIONE PAGINE ==========
export function showPage(pageId, lastPageRef) {
    document.querySelectorAll(".page-section").forEach(s => s.classList.remove("active"));

    const target = document.getElementById("page-" + pageId);
    if (target) target.classList.add("active");

    window.scrollTo(0, 0);
    return pageId;
}

// ========== HELPER: icona categoria ==========
function getCategoryIcon(key) {
    const icons = { amore: "💑", denaro: "💰", lavoro: "💼", salute: "🩺", amici: "🫂", famiglia: "👨‍👩‍👧‍👦", viaggi: "✈️", partner: "💏", carriera: "🎓" };
    return icons[key] || "✨";
}

const CHAT_ICON = `<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
const VOICE_ICON = `<svg viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`;
