// ============================================================
// PAYMENTS.JS v3.0 — Regalo DB, Zona A vs Zona B, soglia €49
// ============================================================

import { CONFIG } from './config.js';
import { getCurrentUser, getCurrentProfile, getSupabase } from './auth.js';

const PACKAGES = {
    subscription: {
        id: 'sub_trimestrale',
        name: 'Abbonamento Completo',
        price: 15,
        periodDays: 90,
        description: 'Sblocca tema natale, case, pianeti, aspetti, transiti e dossier',
        features: [
            'Tema natale completo',
            'Case astrologiche',
            'Posizione pianeti',
            'Aspetti planetari',
            'Transiti giornalieri',
            'Dossier astrologico'
        ]
    },
    services: [
        { id: 'svc_amore', name: 'Amore', icon: '💖', price: 45, duration: '18 min', category: 'amore', type: 'voice' },
        { id: 'svc_lavoro', name: 'Lavoro', icon: '💼', price: 45, duration: '18 min', category: 'lavoro', type: 'voice' },
        { id: 'svc_carriera', name: 'Carriera', icon: '📈', price: 45, duration: '18 min', category: 'carriera', type: 'voice' },
        { id: 'svc_salute', name: 'Salute', icon: '🏥', price: 45, duration: '18 min', category: 'salute', type: 'voice' },
        { id: 'svc_denaro', name: 'Denaro', icon: '💰', price: 45, duration: '18 min', category: 'denaro', type: 'voice' },
        { id: 'svc_famiglia', name: 'Famiglia', icon: '👨‍👩‍👧‍👦', price: 45, duration: '18 min', category: 'famiglia', type: 'voice' },
        { id: 'svc_viaggi', name: 'Viaggi', icon: '✈️', price: 45, duration: '18 min', category: 'viaggi', type: 'voice' },
        { id: 'svc_partner', name: 'Partner', icon: '💑', price: 45, duration: '18 min', category: 'partner', type: 'voice' },
        { id: 'svc_sogni', name: 'Interpretazione Sogni', icon: '🌙', price: 45, duration: '18 min', category: 'sogni', type: 'voice' },
        { id: 'svc_affinita', name: 'Affinità di Coppia', icon: '💞', price: 45, duration: '18 min', category: 'affinita', type: 'voice' },
    ]
};

const SPENDING_THRESHOLD = 49;
const SUB_KEY = 'luna_subscription';
const TX_KEY = 'luna_transactions';
const VOICE_PKG_KEY = 'luna_voice_package';
const WELCOME_GIFT_LS_KEY = 'luna_welcome_gift_shown';

// ===== STATO PACCHETTO VOCE ATTIVO =====
export function getVoicePackage() {
    try {
        const raw = localStorage.getItem(VOICE_PKG_KEY);
        if (!raw) return null;
        const pkg = JSON.parse(raw);
        if (pkg.expiresAt && Date.now() > pkg.expiresAt) {
            localStorage.removeItem(VOICE_PKG_KEY);
            return null;
        }
        return pkg;
    } catch { return null; }
}

export function setVoicePackage(pkg) {
    localStorage.setItem(VOICE_PKG_KEY, JSON.stringify(pkg));
}

export function hasVoicePackage() {
    return !!getVoicePackage();
}

export function getVoicePackageMinutesRemaining() {
    const pkg = getVoicePackage();
    if (!pkg) return 0;
    const elapsed = Math.floor((Date.now() - pkg.startedAt) / 1000 / 60);
    return Math.max(0, pkg.durationMinutes - elapsed);
}

// ===== ABBONAMENTO / REGALO DA DB =====
export async function getSubscriptionFromDB() {
    const profile = getCurrentProfile();
    if (!profile) return null;

    const now = new Date().toISOString();

    // Priorità: regalo di benvenuto attivo
    if (profile.welcome_gift_active && profile.welcome_gift_expires_at && profile.welcome_gift_expires_at > now) {
        return {
            active: true,
            expired: false,
            daysLeft: Math.max(0, Math.ceil((new Date(profile.welcome_gift_expires_at) - Date.now()) / (24 * 60 * 60 * 1000))),
            isWelcomeGift: true,
            expiresAt: new Date(profile.welcome_gift_expires_at).getTime()
        };
    }

    // Altrimenti: abbonamento pagato
    if (profile.subscription_expires_at && profile.subscription_expires_at > now) {
        return {
            active: true,
            expired: false,
            daysLeft: Math.max(0, Math.ceil((new Date(profile.subscription_expires_at) - Date.now()) / (24 * 60 * 60 * 1000))),
            isWelcomeGift: false,
            expiresAt: new Date(profile.subscription_expires_at).getTime()
        };
    }

    return { active: false, expired: true, daysLeft: 0, isWelcomeGift: false };
}

// Fallback localStorage se DB non ha i campi
function getSubscriptionFallback() {
    try {
        const raw = localStorage.getItem(SUB_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch { return null; }
}

export async function getSubscriptionStatus() {
    // Prova DB prima
    const dbStatus = await getSubscriptionFromDB();
    if (dbStatus && (dbStatus.active || dbStatus.expired)) {
        return enrichStatus(dbStatus);
    }

    // Fallback localStorage
    const sub = getSubscriptionFallback();
    const now = Date.now();

    if (!sub) {
        return { active: false, expired: true, daysLeft: 0, canRenewFree: false, hasWelcomeGift: false, isWelcomeGift: false };
    }

    const expiresAt = sub.expiresAt;
    const daysLeft = Math.max(0, Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000)));
    const active = daysLeft > 0;

    return enrichStatus({
        active,
        expired: !active,
        daysLeft,
        startedAt: sub.startedAt,
        expiresAt,
        isWelcomeGift: sub.isWelcomeGift || false
    });
}

function enrichStatus(status) {
    const periodStart = status.startedAt || Date.now() - (90 * 24 * 60 * 60 * 1000);
    const periodEnd = status.expiresAt || Date.now();
    const txs = getTransactions();
    const periodSpending = txs
        .filter(t => new Date(t.date) >= new Date(periodStart) && new Date(t.date) <= new Date(periodEnd) && t.type === 'service')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

    const canRenewFree = periodSpending >= SPENDING_THRESHOLD;

    return {
        ...status,
        periodSpending,
        canRenewFree,
        spendingNeeded: Math.max(0, SPENDING_THRESHOLD - periodSpending),
        spendingProgress: Math.min(100, (periodSpending / SPENDING_THRESHOLD) * 100),
        hasWelcomeGift: status.isWelcomeGift || false
    };
}

export async function hasFullAccess() {
    const status = await getSubscriptionStatus();
    return status.active;
}

// ZONA A: accesso ai calcoli (regalo o abbonamento)
export async function hasCalculationsAccess() {
    return await hasFullAccess();
}

// ZONA B: accesso alla voce (pacchetto voce attivo)
export async function hasVoiceAccess() {
    return hasVoicePackage();
}

// ===== REGALO BENVENUTO 3 MESI — DB + localStorage =====
export async function activateWelcomeGift() {
    const user = getCurrentUser();
    const profile = getCurrentProfile();
    const supabase = getSupabase();

    if (!user || !supabase) {
        // Fallback localStorage
        return activateWelcomeGiftLocal();
    }

    // Verifica se già attivo su DB
    if (profile?.welcome_gift_active && profile?.welcome_gift_expires_at > new Date().toISOString()) {
        return false;
    }

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + (90 * 24 * 60 * 60 * 1000)).toISOString();

    try {
        const { error } = await supabase
            .from('profiles')
            .update({
                welcome_gift_active: true,
                welcome_gift_expires_at: expiresAt,
                updated_at: now
            })
            .eq('id', user.id);

        if (error) throw error;

        // Aggiorna anche localStorage come backup
        localStorage.setItem(WELCOME_GIFT_LS_KEY, JSON.stringify({
            activatedAt: now,
            expiresAt: expiresAt
        }));

        addTransaction({
            type: 'welcome_gift',
            packageId: 'sub_trimestrale',
            amount: 0,
            description: '🎁 Regalo di benvenuto — 3 mesi gratis'
        });

        return true;
    } catch (err) {
        console.error('Errore attivazione regalo DB:', err);
        return activateWelcomeGiftLocal();
    }
}

function activateWelcomeGiftLocal() {
    const user = getCurrentUser();
    if (!user) return false;

    const existing = getSubscriptionFallback();
    if (existing && existing.active) return false;

    const shown = localStorage.getItem(WELCOME_GIFT_LS_KEY);
    if (shown) {
        try {
            const parsed = JSON.parse(shown);
            if (parsed.expiresAt && new Date(parsed.expiresAt) > new Date()) return false;
        } catch {}
    }

    const now = Date.now();
    const sub = {
        startedAt: now,
        expiresAt: now + (90 * 24 * 60 * 60 * 1000),
        userId: user.id,
        isWelcomeGift: true
    };

    localStorage.setItem(SUB_KEY, JSON.stringify(sub));
    localStorage.setItem(WELCOME_GIFT_LS_KEY, JSON.stringify({
        activatedAt: new Date().toISOString(),
        expiresAt: new Date(sub.expiresAt).toISOString()
    }));

    addTransaction({
        type: 'welcome_gift',
        packageId: 'sub_trimestrale',
        amount: 0,
        description: '🎁 Regalo di benvenuto — 3 mesi gratis'
    });

    return true;
}

export async function shouldShowWelcomeGift() {
    const profile = getCurrentProfile();

    // Se ha il regalo attivo su DB, non mostrare
    if (profile?.welcome_gift_active && profile?.welcome_gift_expires_at > new Date().toISOString()) {
        return false;
    }

    // Se ha abbonamento pagato, non mostrare
    if (profile?.subscription_expires_at && profile?.subscription_expires_at > new Date().toISOString()) {
        return false;
    }

    // Fallback localStorage
    const shown = localStorage.getItem(WELCOME_GIFT_LS_KEY);
    if (shown) {
        try {
            const parsed = JSON.parse(shown);
            if (parsed.expiresAt && new Date(parsed.expiresAt) > new Date()) return false;
        } catch {}
    }

    const sub = getSubscriptionFallback();
    return !sub || !sub.active;
}

// ===== TRANSACTIONS =====
function getTransactions() {
    try {
        const raw = localStorage.getItem(TX_KEY);
        if (!raw) return [];
        return JSON.parse(raw);
    } catch { return []; }
}

function addTransaction(tx) {
    const txs = getTransactions();
    txs.unshift({ ...tx, id: 'tx_' + Date.now(), date: new Date().toISOString() });
    localStorage.setItem(TX_KEY, JSON.stringify(txs.slice(0, 50)));
}

// ===== SIMULA PAGAMENTO =====
export async function simulatePayment(packageId, amount) {
    const user = getCurrentUser();
    if (!user) {
        alert("Devi essere loggato per effettuare un acquisto");
        return false;
    }

    await new Promise(r => setTimeout(r, 800));
    const now = Date.now();

    if (packageId === 'sub_trimestrale') {
        // Abbonamento trimestrale
        const supabase = getSupabase();
        const expiresAt = new Date(Date.now() + (90 * 24 * 60 * 60 * 1000)).toISOString();

        if (supabase) {
            try {
                await supabase.from('profiles').update({
                    subscription_expires_at: expiresAt,
                    welcome_gift_active: false,
                    updated_at: new Date().toISOString()
                }).eq('id', user.id);
            } catch (e) {
                console.warn('Fallback localStorage per abbonamento');
            }
        }

        const existing = getSubscriptionFallback();
        let startedAt, lsExpiresAt;

        if (existing && existing.expiresAt > now) {
            startedAt = existing.startedAt;
            lsExpiresAt = existing.expiresAt + (90 * 24 * 60 * 60 * 1000);
        } else {
            startedAt = now;
            lsExpiresAt = now + (90 * 24 * 60 * 60 * 1000);
        }

        localStorage.setItem(SUB_KEY, JSON.stringify({
            startedAt, expiresAt: lsExpiresAt, userId: user.id, isWelcomeGift: false
        }));

        addTransaction({
            type: 'subscription',
            packageId,
            amount,
            description: 'Abbonamento trimestrale'
        });

        alert(`✅ Abbonamento attivato!\nValido fino al ${new Date(lsExpiresAt).toLocaleDateString('it-IT')}`);
        return true;
    }

    // Servizio voce
    const svc = PACKAGES.services.find(s => s.id === packageId);
    if (svc) {
        setVoicePackage({
            packageId,
            category: svc.category,
            startedAt: now,
            durationMinutes: 18,
            expiresAt: now + (18 * 60 * 1000)
        });

        addTransaction({
            type: 'service',
            packageId,
            amount,
            description: `Acquisto ${svc.name}`
        });

        // Verifica soglia €49 per rinnovo gratuito
        const status = await getSubscriptionStatus();
        if (status.canRenewFree && status.daysLeft <= 30) {
            const sub = getSubscriptionFallback();
            if (sub) {
                sub.expiresAt += (90 * 24 * 60 * 60 * 1000);
                localStorage.setItem(SUB_KEY, JSON.stringify(sub));
                addTransaction({
                    type: 'auto_renew',
                    amount: 0,
                    description: 'Rinnovo gratuito (spesa ≥ €49)'
                });
            }
        }

        alert(`✅ Acquisto completato!\nHai acquistato ${svc.name} per €${amount}\n\n⏱️ 18 minuti di consulenza vocale attivati.`);
        return true;
    }

    return false;
}

// ===== STRIPE CHECKOUT =====
export async function startStripeCheckout(packageId, amount) {
    if (!CONFIG.FEATURES.STRIPE_PAYMENTS) {
        const name = getPackageName(packageId);
        const confirmed = confirm(
            `💳 MODALITÀ TEST\n\n` +
            `Stai per acquistare:\n` +
            `${name} — €${amount}\n\n` +
            `Confermi il pagamento simulato?`
        );
        if (confirmed) {
            return simulatePayment(packageId, amount);
        }
        return false;
    }

    try {
        const user = getCurrentUser();
        if (!user) {
            alert("Devi essere loggato per acquistare");
            return false;
        }

        const response = await fetch(`${CONFIG.WORKER_URL}/api/create-checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: user.id,
                packageId,
                amount,
                successUrl: window.location.origin + '/?payment=success',
                cancelUrl: window.location.origin + '/?payment=cancel'
            })
        });

        const { sessionId, url } = await response.json();

        if (url) {
            window.location.href = url;
        } else if (sessionId && window.Stripe) {
            const stripe = Stripe(CONFIG.STRIPE_PUBLISHABLE_KEY);
            await stripe.redirectToCheckout({ sessionId });
        }

        return true;
    } catch (err) {
        console.error("Errore checkout Stripe:", err);
        alert("Errore nel caricamento del pagamento. Riprova.");
        return false;
    }
}

function getPackageName(packageId) {
    if (packageId === 'sub_trimestrale') return 'Abbonamento Trimestrale';
    const svc = PACKAGES.services.find(s => s.id === packageId);
    if (svc) return svc.name;
    return packageId;
}

// ===== RENDER PAGINA PAGAMENTI =====
export async function renderPaymentsPage() {
    const container = document.getElementById('page-payments');
    if (!container) return;

    const status = await getSubscriptionStatus();
    const txs = getTransactions().slice(0, 5);
    const user = getCurrentUser();

    const subSection = status.active ? `
        <div class="sub-card">
            <div class="sub-status active dot">Attivo</div>
            <div class="sub-title">Abbonamento Completo</div>
            <div class="sub-price">€15 <span>/ trimestre</span></div>
            <ul class="sub-features">
                ${PACKAGES.subscription.features.map(f => `<li>${f}</li>`).join('')}
            </ul>
            <div style="font-size:0.8125rem;color:var(--text-dim);margin-bottom:0.75rem;">
                ⏳ Scade il <strong style="color:var(--gold)">${new Date(status.expiresAt).toLocaleDateString('it-IT')}</strong> 
                (${status.daysLeft} giorni rimasti)
            </div>
            ${status.canRenewFree 
                ? `<div style="font-size:0.8125rem;color:#4ade80;margin-bottom:0.75rem;">✅ Rinnovo gratuito garantito! Hai speso €${status.periodSpending}</div>`
                : `<div style="font-size:0.8125rem;color:var(--text-dim);margin-bottom:0.75rem;">
                    💰 Hai speso €${status.periodSpending}/€${SPENDING_THRESHOLD} in questo periodo
                   </div>`
            }
            <button class="sub-btn secondary" onclick="window.app.startStripeCheckout('sub_trimestrale', 15)">
                Rinnova ora (€15)
            </button>
        </div>
    ` : `
        <div class="sub-card" style="border-color:#ef4444;">
            <div class="sub-status expired">Offuscato</div>
            <div class="sub-title">Abbonamento Completo</div>
            <div class="sub-price">€15 <span>/ trimestre</span></div>
            <ul class="sub-features">
                ${PACKAGES.subscription.features.map(f => `<li class="locked">${f}</li>`).join('')}
            </ul>
            <div style="font-size:0.8125rem;color:#f87171;margin-bottom:0.75rem;">
                🔒 La tua pagina personale mostra solo l'oroscopo giornaliero
            </div>
            <button class="sub-btn primary" onclick="window.app.startStripeCheckout('sub_trimestrale', 15)">
                Sblocca ora per €15
            </button>
        </div>
    `;

    const spendingSection = status.active ? `
        <div class="spending-tracker">
            <div class="spending-header">
                <span class="spending-label">💰 Spesa nel periodo attuale</span>
                <span class="spending-amount">€${status.periodSpending} / €${SPENDING_THRESHOLD}</span>
            </div>
            <div class="spending-bar">
                <div class="spending-fill ${status.spendingProgress >= 100 ? 'complete' : ''}" 
                     style="width:${status.spendingProgress}%"></div>
            </div>
            <div class="spending-note ${status.spendingProgress >= 100 ? 'complete' : ''}">
                ${status.spendingProgress >= 100 
                    ? '🎉 Complimenti! Il prossimo trimestre è gratuito' 
                    : `Mancano €${status.spendingNeeded} per il rinnovo gratuito`
                }
            </div>
        </div>
    ` : '';

    const packagesSection = `
        <div class="payments-header">
            <h2>🔮 Pacchetti Servizi Vocali</h2>
            <p>Consulto astrologico completo con Luna — 18 minuti</p>
        </div>
        <div class="packages-grid">
            ${PACKAGES.services.map((pkg, i) => `
                <div class="package-card ${i === 0 ? 'featured' : ''}" 
                     onclick="window.app.startStripeCheckout('${pkg.id}', ${pkg.price})">
                    <div class="package-icon">${pkg.icon}</div>
                    <div class="package-name">${pkg.name}</div>
                    <div class="package-price">€${pkg.price}</div>
                    <div class="package-duration">⏱️ ${pkg.duration}</div>
                </div>
            `).join('')}
        </div>
    `;

    const historySection = txs.length > 0 ? `
        <div class="history-section">
            <div class="history-title">📜 Ultime transazioni</div>
            ${txs.map(t => `
                <div class="history-item">
                    <div>
                        <div class="history-desc">${t.description}</div>
                        <div class="history-date">${new Date(t.date).toLocaleDateString('it-IT')}</div>
                    </div>
                    <div class="history-amount ${t.amount === 0 ? '' : 'negative'}">
                        ${t.amount === 0 ? 'GRATIS' : '-€' + t.amount}
                    </div>
                </div>
            `).join('')}
        </div>
    ` : '';

    container.innerHTML = `
        <div class="payments-page">
            <div class="payments-header">
                <h2>💳 Crediti & Abbonamento</h2>
                <p>Gestisci il tuo abbonamento e i servizi a pagamento</p>
            </div>

            ${subSection}
            ${spendingSection}
            ${packagesSection}
            ${historySection}

            <footer class="footer" style="margin-top:2rem;">
                <p style="font-size:0.75rem;color:var(--text-dim);">
                    ⚠️ I pagamenti sono gestiti in modo sicuro. L'abbonamento si rinnova automaticamente ogni 90 giorni.
                    Se spendi almeno €49 in servizi, il rinnovo è gratuito.
                </p>
            </footer>
        </div>
    `;
}

export function updatePaymentsUI() {
    // Aggiorna UI pagamenti se necessario
}

export async function shouldBlurPersonalized() {
    return !(await hasFullAccess());
}

export { PACKAGES, SPENDING_THRESHOLD };
