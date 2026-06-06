// ============================================================
// PROFILE.JS — Gestione profilo, tema natale, compatibilità
// Step C: calcolo reale con Swiss Ephemeris via API
// FIX v4: preserva dati natali quando si chiude modal affinità
// ============================================================

import { CONFIG } from './config.js';

// ===== APRI MODAL COMPATIBILITÀ =====
export function openCompatModal() {
    const modal = document.getElementById("compatModal");
    if (modal) {
        modal.classList.add("active");
        document.body.style.overflow = "hidden";
    }
    // Resetta il form all'apertura
    const form = document.getElementById("compatForm");
    if (form) form.reset();
    const resultDiv = document.getElementById("compatResult");
    if (resultDiv) {
        resultDiv.style.display = "none";
        resultDiv.innerHTML = "";
    }
}

export function closeCompatModal() {
    const modal = document.getElementById("compatModal");
    if (modal) {
        modal.classList.remove("active");
    }
    // FIX: NON resettare overflow qui — potrebbe esserci un altro modal aperto
    // document.body.style.overflow = "";

    // Resetta il form alla chiusura
    const form = document.getElementById("compatForm");
    if (form) form.reset();
    const resultDiv = document.getElementById("compatResult");
    if (resultDiv) {
        resultDiv.style.display = "none";
        resultDiv.innerHTML = "";
    }
}

// ===== GEOCODING PARTNER =====
async function geocodePartner(city, country) {
    try {
        const response = await fetch(
            `${CONFIG.WORKER_URL}/api/geocode?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country || '')}`
        );
        if (!response.ok) return null;
        return await response.json();
    } catch (err) {
        console.error('Geocoding partner error:', err);
        return null;
    }
}

// ===== HANDLER COMPATIBILITÀ REALE =====
export async function handleCompatSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('compatName')?.value?.trim();
    const gender = document.getElementById('compatGender')?.value;
    const birthDateRaw = document.getElementById('compatBirthDate')?.value;
    const birthTime = document.getElementById('compatBirthTime')?.value;
    const city = document.getElementById('compatBirthCity')?.value?.trim();
    const country = document.getElementById('compatBirthCountry')?.value;

    if (!name || !birthDateRaw || !city || !country) {
        alert('Compila tutti i campi obbligatori');
        return;
    }

    const userId = window.app?.getCurrentProfile?.()?.id;
    if (!userId) {
        alert('Devi essere loggato per calcolare l'affinità');
        return;
    }

    const birthDate = birthDateRaw;

    const resultDiv = document.getElementById('compatResult');
    if (resultDiv) {
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<div class="loading" style="margin:1rem auto;"></div><p style="text-align:center;color:var(--text-muted);">Luna sta cercando le coordinate del partner...</p>';
    }

    const geo = await geocodePartner(city, country);
    if (!geo || !geo.lat || !geo.lng) {
        if (resultDiv) {
            resultDiv.innerHTML = `
                <div style="text-align:center; padding:1rem; color:var(--danger);">
                    <p>⚠️ Impossibile trovare la città "${city}". Controlla l'ortografia.</p>
                    <button class="btn-gold btn-full" style="margin-top:1rem;" onclick="document.getElementById('compatBirthCity').focus()">Riprova</button>
                </div>
            `;
        }
        return;
    }

    if (resultDiv) {
        resultDiv.innerHTML = '<div class="loading" style="margin:1rem auto;"></div><p style="text-align:center;color:var(--text-muted);">Luna sta calcolando la sinastria...</p>';
    }

    try {
        const response = await fetch(`${CONFIG.WORKER_URL}/api/compatibility`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                partner_name: name,
                partner_gender: gender || null,
                partner_birthDate: birthDate,
                partner_birthTime: birthTime || '12:00',
                partner_lat: geo.lat,
                partner_lng: geo.lng,
                partner_timezone: geo.timezone || 'Europe/Rome'
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || `Errore ${response.status}`);
        }

        const data = await response.json();
        renderCompatResult(data, name);

    } catch (err) {
        console.error('Compatibilità error:', err);
        if (resultDiv) {
            resultDiv.innerHTML = `
                <div style="text-align:center; padding:1rem; color:var(--danger);">
                    <p>⚠️ ${err.message || 'Errore nel calcolo dell'affinità'}</p>
                    <button class="btn-gold btn-full" style="margin-top:1rem;" onclick="window.app.closeCompatModal()">Chiudi</button>
                </div>
            `;
        }
    }
}

// ===== RENDER RISULTATO COMPATIBILITÀ =====
function renderCompatResult(data, partnerName) {
    const resultDiv = document.getElementById('compatResult');
    if (!resultDiv) return;

    const score = data.compatibility_score || 0;
    const scoreColor = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : score >= 40 ? '#f97316' : '#ef4444';
    const scoreLabel = score >= 80 ? 'Eccezionale' : score >= 60 ? 'Buona' : score >= 40 ? 'Moderata' : 'Complessa';

    const assonanzeHtml = (data.assonanze || []).map(a =>
        `<div style="display:flex; align-items:flex-start; gap:0.5rem; margin-bottom:0.5rem;">
            <span style="color:var(--gold); font-size:1rem;">✨</span>
            <span style="font-size:0.875rem; color:var(--text); line-height:1.5;">${a}</span>
        </div>`
    ).join('');

    const diversitaHtml = (data.diversita || []).map(d =>
        `<div style="display:flex; align-items:flex-start; gap:0.5rem; margin-bottom:0.5rem;">
            <span style="color:var(--danger); font-size:1rem;">⚡</span>
            <span style="font-size:0.875rem; color:var(--text); line-height:1.5;">${d}</span>
        </div>`
    ).join('');

    const settori = data.settori || {};
    const settoriScores = {
        amore: data.love_score || 50,
        comunicazione: data.communication_score || 50,
        passione: data.passion_score || 50,
        stabilita: data.stability_score || 50,
        crescita: data.growth_score || 50
    };
    const settoriHtml = Object.entries(settori).map(([key, text]) => {
        const icons = {
            amore: '💖', comunicazione: '💬', passione: '🔥',
            stabilita: '🏠', crescita: '🌱'
        };
        const labels = {
            amore: 'Amore', comunicazione: 'Comunicazione', passione: 'Passione',
            stabilita: 'Stabilità', crescita: 'Crescita'
        };
        const s = settoriScores[key] || 50;
        const barColor = s >= 80 ? '#22c55e' : s >= 60 ? '#eab308' : s >= 40 ? '#f97316' : '#ef4444';
        return `
            <div style="margin-bottom:1rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem;">
                    <span style="font-size:0.875rem; font-weight:600; color:var(--text);">${icons[key] || '✨'} ${labels[key] || key}</span>
                    <span style="font-size:0.875rem; font-weight:700; color:${barColor};">${s}%</span>
                </div>
                <div style="width:100%; height:6px; background:var(--border); border-radius:3px; overflow:hidden;">
                    <div style="width:${s}%; height:100%; background:${barColor}; border-radius:3px; transition:width 1s ease;"></div>
                </div>
                <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.25rem; line-height:1.4;">${text}</p>
            </div>
        `;
    }).join('');

    resultDiv.innerHTML = `
        <div style="text-align:center; margin:1.5rem 0;">
            <div style="font-size:3rem; font-weight:800; color:${scoreColor}; line-height:1;">${score}%</div>
            <div style="font-size:1rem; font-weight:600; color:${scoreColor}; margin-top:0.25rem;">${scoreLabel}</div>
            <div style="font-size:0.875rem; color:var(--text-muted); margin-top:0.5rem;">Affinità con ${partnerName}</div>
        </div>

        <div style="background:var(--card-bg); border:1px solid var(--border); border-radius:0.75rem; padding:1rem; margin-bottom:1rem;">
            <div style="font-size:0.875rem; font-weight:700; color:var(--gold); margin-bottom:0.75rem;">✨ Assonanze — Cosa funziona naturalmente</div>
            ${assonanzeHtml || '<p style="font-size:0.875rem; color:var(--text-muted);">Nessuna assonanza significativa rilevata.</p>'}
        </div>

        <div style="background:var(--card-bg); border:1px solid var(--border); border-radius:0.75rem; padding:1rem; margin-bottom:1rem;">
            <div style="font-size:0.875rem; font-weight:700; color:var(--danger); margin-bottom:0.75rem;">⚡ Diversità — Cosa richiede attenzione</div>
            ${diversitaHtml || '<p style="font-size:0.875rem; color:var(--text-muted);">Nessuna diversità significativa rilevata.</p>'}
        </div>

        <div style="background:var(--card-bg); border:1px solid var(--border); border-radius:0.75rem; padding:1rem; margin-bottom:1rem;">
            <div style="font-size:0.875rem; font-weight:700; color:var(--text); margin-bottom:0.75rem;">📊 Analisi per settore</div>
            ${settoriHtml}
        </div>

        <div style="background:linear-gradient(135deg, rgba(212,175,55,0.1), rgba(212,175,55,0.05)); border:1px solid var(--gold); border-radius:0.75rem; padding:1rem; margin-bottom:1rem;">
            <div style="font-size:0.875rem; font-weight:700; color:var(--gold); margin-bottom:0.5rem;">🌙 Parola di Luna</div>
            <p style="font-size:0.875rem; color:var(--text); line-height:1.7; font-style:italic;">${data.luna_advice || 'Ogni sinastria è un invito alla consapevolezza.'}</p>
        </div>

        <div style="display:flex; gap:0.75rem; margin-top:1rem;">
            <button type="button" class="btn-gold btn-full" onclick="window.app.openLunaFromCompat('amore')">💬 Chiedi a Luna</button>
            <button type="button" class="btn-gold btn-full btn-gold-outline" onclick="window.app.resetCompatForm()">Nuovo calcolo</button>
        </div>
    `;
}

// ===== APRI LUNA DALLA COMPATIBILITÀ =====
// Chiude il modal affinità, POI apre il box scelta chat/voce
export function openLunaFromCompat(category) {
    // Chiudi il modal affinità
    const compatModal = document.getElementById('compatModal');
    if (compatModal) compatModal.classList.remove('active');

    // Resetta form
    const form = document.getElementById('compatForm');
    if (form) form.reset();
    const resultDiv = document.getElementById('compatResult');
    if (resultDiv) {
        resultDiv.style.display = 'none';
        resultDiv.innerHTML = '';
    }

    // Apri il box scelta chat/voce
    window.app.showServiceChoice(category);
}

// ===== RESET FORM SENZA CHIUDERE MODAL =====
export function resetCompatForm() {
    const form = document.getElementById('compatForm');
    if (form) form.reset();
    const resultDiv = document.getElementById('compatResult');
    if (resultDiv) {
        resultDiv.style.display = 'none';
        resultDiv.innerHTML = '';
    }
}

// ===== MOSTRA COMPATIBILITÀ (placeholder per click sui segni) =====
export function showCompat(sign) {
    openCompatModal();
}

// ===== MODIFICA PROFILO =====
export function openProfileEdit() {
    alert("Modifica profilo — funzionalità in arrivo nello step C");
}

// ===== TOGGLE ACCORDION =====
export function toggleAccordion(header, bodyId) {
    const body = document.getElementById(bodyId);
    if (!body) return;
    const isOpen = body.classList.contains("open");
    body.classList.toggle("open", !isOpen);
    header.classList.toggle("open", !isOpen);
}
