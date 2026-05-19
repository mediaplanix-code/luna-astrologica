// ============================================================
// PAYMENTS.JS — Stripe checkout e gestione crediti
// Placeholder: funziona in modalità test senza Stripe
// Per attivare: imposta FEATURES.STRIPE_PAYMENTS = true in config.js
// e inserisci le chiavi Stripe
// ============================================================

import { CONFIG } from './config.js';
import { getSupabase, getCurrentUser, updateCredits } from './auth.js';

// ===== CHECKOUT STRIPE (placeholder per produzione) =====
export async function startStripeCheckout(creditsAmount) {
    if (!CONFIG.FEATURES.STRIPE_PAYMENTS) {
        // Modalità test: aggiungi crediti gratis
        alert(`💳 Modalità test: aggiunti ${creditsAmount} crediti gratuitamente.\n\nPer attivare i pagamenti reali:\n1. Crea account Stripe\n2. Inserisci pk_test_... in config.js\n3. Imposta STRIPE_PAYMENTS: true`);
        await updateCredits(creditsAmount);
        return;
    }

    // Produzione: chiama Worker per sessione Stripe
    try {
        const user = getCurrentUser();
        if (!user) {
            alert("Devi essere loggato per acquistare crediti");
            return;
        }

        const response = await fetch(`${CONFIG.WORKER_URL}/api/create-checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: user.id,
                credits: creditsAmount,
                priceId: CONFIG.STRIPE_PRICE_ID
            })
        });

        const { sessionId } = await response.json();

        // Redirect a Stripe Checkout
        const stripe = Stripe(CONFIG.STRIPE_PUBLISHABLE_KEY);
        await stripe.redirectToCheckout({ sessionId });

    } catch (err) {
        console.error("Errore checkout:", err);
        alert("Errore nel caricamento del pagamento. Riprova.");
    }
}

// ===== MOSTRA MODALE PAGAMENTI =====
export function showPaymentsModal() {
    const modal = document.getElementById("paymentsModal");
    if (modal) {
        modal.classList.add("active");
        document.body.style.overflow = "hidden";
    } else {
        // Fallback se modale non esiste
        const amounts = [10, 50, 100];
        const choice = prompt(
            `💳 Ricarica crediti\n\nScegli quanti crediti aggiungere:\n` +
            amounts.map((a, i) => `${i + 1}. ${a} crediti`).join('\n') +
            `\n\n0. Annulla`
        );
        
        if (choice && choice !== "0") {
            const idx = parseInt(choice) - 1;
            if (amounts[idx]) {
                startStripeCheckout(amounts[idx]);
            }
        }
    }
}

export function closePaymentsModal() {
    const modal = document.getElementById("paymentsModal");
    if (modal) {
        modal.classList.remove("active");
        document.body.style.overflow = "";
    }
}