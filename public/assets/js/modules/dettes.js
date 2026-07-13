/**
 * GÉRI — Module Dettes
 * Suivi des créances clients, relances WhatsApp
 */

'use strict';

// ════════════════════════════════════════
// RENDU
// ════════════════════════════════════════

function renderDettes() {
  const dettesActives  = dettes.filter(d => !d.payee);
  const dettesPayees   = dettes.filter(d => d.payee);
  const totalDu        = dettesActives.reduce((s, d) => s + d.montant, 0);
  const totalRecouvre  = dettesPayees.reduce((s, d) => s + d.montant, 0);

  return `
    <!-- Stats -->
    <div class="stat-grid">
      <div class="stat-card" style="${totalDu > 0 ? 'border-color:var(--warn)' : ''}">
        <div class="stat-label">Total dû</div>
        <div class="stat-val" style="color:${totalDu > 0 ? 'var(--warn)' : 'var(--cream)'}">${fmtShort(totalDu)}</div>
        <div class="stat-sub">${dettesActives.length} client${dettesActives.length > 1 ? 's' : ''}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Recouvré</div>
        <div class="stat-val" style="color:var(--teal)">${fmtShort(totalRecouvre)}</div>
        <div class="stat-sub">${dettesPayees.length} réglée${dettesPayees.length > 1 ? 's' : ''}</div>
      </div>
    </div>

    <!-- Dettes actives -->
    ${dettesActives.length ? `
      <div class="section-hd">
        <div class="section-title">⏳ En attente (${dettesActives.length})</div>
      </div>
      <div class="table-wrap" style="margin-bottom:16px">
        ${[...dettesActives].reverse().map(d => `
          <div class="table-row" style="grid-template-columns:1fr auto auto">
            <div>
              <div class="prod-name">${d.client}</div>
              <div class="prod-cat">${d.date ? formatDate(d.date) : '—'} · ${d.note || 'Aucune note'}</div>
            </div>
            <div style="font-size:15px;font-weight:700;color:var(--warn);margin-right:8px">${fmt(d.montant)}</div>
            <div style="display:flex;gap:4px">
              <button
                onclick="marquerDettePayee(${d.id})"
                style="background:rgba(0,200,150,0.1);border:1px solid rgba(0,200,150,0.2);color:var(--teal);width:30px;height:30px;border-radius:7px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center"
                title="Marquer payée"
              >✓</button>
              <button
                onclick="relancerDetteWA(${d.id})"
                style="background:rgba(37,211,102,0.1);border:1px solid rgba(37,211,102,0.2);color:#25D366;width:30px;height:30px;border-radius:7px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center"
                title="Relancer sur WhatsApp"
              >💬</button>
              <button
                onclick="supprimerDette(${d.id})"
                style="background:var(--danger-dim);border:1px solid rgba(255,90,90,0.2);color:var(--danger);width:30px;height:30px;border-radius:7px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center"
                title="Supprimer"
              >×</button>
            </div>
          </div>
        `).join('')}
      </div>
    ` : `
      <div style="background:rgba(0,200,150,0.06);border:1px solid rgba(0,200,150,0.2);border-radius:12px;padding:16px;text-align:center;margin-bottom:14px">
        <div style="font-size:20px;margin-bottom:6px">✅</div>
        <div style="font-size:14px;font-weight:600;color:var(--teal)">Aucune dette en attente</div>
        <div style="font-size:12px;color:var(--muted);margin-top:2px">Tous vos clients sont à jour</div>
      </div>
    `}

    <!-- Dettes payées (récentes) -->
    ${dettesPayees.length ? `
      <div class="section-hd">
        <div class="section-title">✅ Réglées récemment</div>
      </div>
      <div class="table-wrap">
        ${[...dettesPayees].reverse().slice(0, 5).map(d => `
          <div class="table-row" style="grid-template-columns:1fr auto auto;opacity:0.6">
            <div>
              <div class="prod-name">${d.client}</div>
              <div class="prod-cat">${formatDate(d.payeeLeAt || d.date)} · ${d.note || '—'}</div>
            </div>
            <div style="font-size:14px;font-weight:600;color:var(--teal);margin-right:8px">${fmt(d.montant)}</div>
            <span class="badge badge-ok">Payée</span>
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;
}

// ════════════════════════════════════════
// MODAL NOUVELLE DETTE
// ════════════════════════════════════════

function ouvrirModalDette(clientNom) {
  const modal = document.getElementById('modal-dette');
  if (!modal) return;

  const nomEl = document.getElementById('dette-client');
  if (nomEl && clientNom) nomEl.value = clientNom;

  const dateEl = document.getElementById('dette-date');
  if (dateEl) dateEl.value = today();

  modal.classList.add('open');
}

function sauvegarderDette() {
  const client  = sanitize(document.getElementById('dette-client')?.value.trim() || '');
  const montant = parseFloat(document.getElementById('dette-montant')?.value     || 0);
  const note    = sanitize(document.getElementById('dette-note')?.value.trim()   || '');
  const date    = document.getElementById('dette-date')?.value                   || today();

  if (!client) {
    toast('Le nom du client est obligatoire', 'error');
    return;
  }
  if (montant <= 0) {
    toast('Le montant doit être positif', 'error');
    return;
  }

  dettes.push({
    id:     genId(),
    client,
    montant,
    note,
    date,
    payee:  false,
    createdAt: today(),
  });

  save();
  toast('Dette enregistrée ✓', 'success');
  document.getElementById('modal-dette')?.classList.remove('open');

  // Réinitialiser
  ['dette-client', 'dette-montant', 'dette-note'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  render();
}

function marquerDettePayee(detteId) {
  const dette = dettes.find(d => d.id === detteId);
  if (!dette) return;

  dette.payee     = true;
  dette.payeeLeAt = today();

  save();
  toast('Dette marquée comme payée ✓', 'success');
  render();
}

function relancerDetteWA(detteId) {
  const dette   = dettes.find(d => d.id === detteId);
  if (!dette) return;

  const shopNom = DB.get('shopname') || 'Ma Boutique';

  const msg = [
    'Bonjour ' + dette.client + ' 👋',
    '',
    'Nous vous rappelons qu\'un solde de *' + fmt(dette.montant) + '* est en attente de règlement.',
    dette.note ? '_' + dette.note + '_' : '',
    '',
    'Merci de régulariser votre situation.',
    '',
    '🏪 *' + shopNom + '*',
  ].filter(Boolean).join('\n');

  // Chercher le téléphone du client
  const clientObj = clients.find(c => c.nom.toLowerCase() === dette.client.toLowerCase());
  const tel       = clientObj?.tel ? clientObj.tel.replace(/\D/g, '') : '';
  const url       = tel
    ? 'https://wa.me/221' + tel + '?text=' + encodeURIComponent(msg)
    : 'https://wa.me/?text=' + encodeURIComponent(msg);

  window.open(url, '_blank');
}

function supprimerDette(detteId) {
  if (!confirm('Supprimer cette dette ?')) return;
  dettes = dettes.filter(d => d.id !== detteId);
  save();
  toast('Dette supprimée', 'success');
  render();
}
