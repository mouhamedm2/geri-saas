/**
 * GÉRI — Module Ventes
 * Historique des ventes, recherche, détail
 */

'use strict';

let _rechercheVentes = '';

// ════════════════════════════════════════
// RENDU
// ════════════════════════════════════════

function renderVentes() {
  const caTotal       = ventes.reduce((s, v) => s + (v.total || 0), 0);
  const caAujourd     = ventes.filter(v => v.date === today()).reduce((s, v) => s + v.total, 0);
  const nbAujourd     = ventes.filter(v => v.date === today()).length;

  const filtrees = _rechercheVentes
    ? ventes.filter(v =>
        (v.client || '').toLowerCase().includes(_rechercheVentes) ||
        (v.items || []).some(i => i.nom.toLowerCase().includes(_rechercheVentes)) ||
        (v.modePaiement || '').toLowerCase().includes(_rechercheVentes)
      )
    : ventes;

  return `
    <!-- Stats -->
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">CA total</div>
        <div class="stat-val" style="color:var(--teal)">${fmtShort(caTotal)}</div>
        <div class="stat-sub">${ventes.length} vente${ventes.length !== 1 ? 's' : ''}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Aujourd'hui</div>
        <div class="stat-val">${fmtShort(caAujourd)}</div>
        <div class="stat-sub">${nbAujourd} vente${nbAujourd !== 1 ? 's' : ''}</div>
      </div>
    </div>

    <!-- Recherche -->
    <div style="position:relative;margin-bottom:12px">
      <svg style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--muted)"
           width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="6" cy="6" r="4" stroke="currentColor" stroke-width="1.4"/>
        <path d="M10 10l2.5 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      </svg>
      <input
        style="width:100%;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px 12px 10px 34px;color:var(--cream);font-family:'DM Sans',sans-serif;font-size:14px;outline:none"
        placeholder="Rechercher client, produit…"
        value="${_rechercheVentes}"
        oninput="filtrerVentes(this.value)"
      >
    </div>

    <!-- Liste ventes -->
    <div class="table-wrap">
      ${[...filtrees].reverse().slice(0, 100).map(v => `
        <div
          class="table-row"
          style="grid-template-columns:40px 1fr auto"
          onclick="voirDetailVente(${v.id})"
        >
          <!-- Miniature photo ou icône -->
          <div style="width:38px;height:38px;border-radius:10px;overflow:hidden;flex-shrink:0">
            ${v.photo
              ? `<img src="${v.photo}" style="width:38px;height:38px;object-fit:cover">`
              : `<div style="width:38px;height:38px;background:linear-gradient(135deg,rgba(0,200,150,0.15),rgba(0,200,150,0.05));border:1px solid rgba(0,200,150,0.2);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px">
                   ${v.modePaiement === 'wave' ? '💸' : v.modePaiement === 'orange' ? '🟠' : v.modePaiement === 'credit' ? '💳' : '💵'}
                 </div>`
            }
          </div>

          <!-- Infos -->
          <div style="min-width:0">
            <div class="prod-name">
              ${(v.items || []).map(i => i.nom).join(', ') || '—'}
            </div>
            <div class="prod-cat">
              ${v.heure || ''} · ${v.client || 'Anonyme'} · ${v.modePaiement || '—'}
            </div>
          </div>

          <!-- Montant -->
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:14px;font-weight:700;color:var(--teal)">${fmt(v.total)}</div>
            <div style="font-size:10px;color:var(--muted);margin-top:2px">${formatDate(v.date)}</div>
          </div>
        </div>
      `).join('') || `
        <div class="empty">
          <p>${_rechercheVentes ? 'Aucune vente pour "' + _rechercheVentes + '"' : 'Aucune vente enregistrée'}</p>
        </div>
      `}
    </div>
  `;
}

// ════════════════════════════════════════
// DÉTAIL VENTE
// ════════════════════════════════════════

function voirDetailVente(venteId) {
  const vente = ventes.find(v => v.id === venteId);
  if (!vente) return;

  lastVente = vente;

  const shopNom    = DB.get('shopname')   || 'Ma Boutique';
  const shopFooter = DB.get('shopfooter') || 'Merci pour votre achat !';

  const html = `
    <div style="background:#fff;color:#111;border-radius:12px;padding:20px;font-family:'DM Sans',Arial,sans-serif">

      <!-- En-tête -->
      <div style="text-align:center;margin-bottom:14px;padding-bottom:12px;border-bottom:2px solid #00897B">
        <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:#00897B">${shopNom}</div>
        <div style="font-size:11px;color:#999;margin-top:2px">${vente.date} à ${vente.heure || ''}</div>
      </div>

      <!-- Photo -->
      ${vente.photo ? `
        <div style="border-radius:10px;overflow:hidden;margin-bottom:12px;border:1px solid #f0f0f0">
          <img src="${vente.photo}" style="width:100%;max-height:180px;object-fit:cover">
          <div style="padding:4px 10px;background:#f8fafb;font-size:10px;color:#888;text-align:center">📷 Photo de la vente</div>
        </div>
      ` : ''}

      <!-- Client -->
      ${vente.client ? `
        <div style="background:#f8fafb;border-left:3px solid #00897B;border-radius:0 8px 8px 0;padding:8px 12px;margin-bottom:12px">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#00897B;margin-bottom:2px">Client</div>
          <div style="font-size:14px;font-weight:700">${vente.client}</div>
          ${vente.clientTel ? `<div style="font-size:12px;color:#777">📱 ${vente.clientTel}</div>` : ''}
        </div>
      ` : ''}

      <!-- Articles -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:12px">
        <thead>
          <tr style="border-bottom:2px solid #00897B">
            <th style="text-align:left;font-size:10px;color:#aaa;padding:5px 0;text-transform:uppercase">Article</th>
            <th style="text-align:center;font-size:10px;color:#aaa;padding:5px 0">Qté</th>
            <th style="text-align:right;font-size:10px;color:#aaa;padding:5px 0">Total</th>
          </tr>
        </thead>
        <tbody>
          ${(vente.items || []).map((item, i) => `
            <tr style="border-bottom:1px solid #f5f5f5;background:${i % 2 === 0 ? '#fff' : '#fafafa'}">
              <td style="padding:8px 0;font-size:13px">${item.nom}</td>
              <td style="text-align:center;color:#666;font-size:13px">${item.qte}</td>
              <td style="text-align:right;font-weight:600;font-size:13px">${Number(item.prix * item.qte).toLocaleString('fr-SN')} F</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Total -->
      <div style="background:#00897B;border-radius:8px;padding:11px;display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <span style="font-weight:700;font-size:14px;color:#fff">TOTAL</span>
        <span style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:#fff">${fmt(vente.total)}</span>
      </div>

      <!-- Mode paiement -->
      <div style="text-align:center;font-size:12px;color:#888">
        ${(vente.modePaiement || '').toUpperCase()}
        ${vente.vendeur ? ' · Vendeur : ' + vente.vendeur : ''}
      </div>

      <div style="text-align:center;font-size:12px;color:#aaa;padding-top:10px;border-top:1px solid #f0f0f0;margin-top:10px">
        ${shopFooter}
      </div>
    </div>
  `;

  const zone = document.getElementById('recu-preview-wrap');
  if (zone) zone.innerHTML = html;

  document.getElementById('modal-recu')?.classList.add('open');
}

// ════════════════════════════════════════
// SUPPRESSION
// ════════════════════════════════════════

function supprimerVente(venteId) {
  if (!confirm('Supprimer cette vente ?')) return;
  ventes = ventes.filter(v => v.id !== venteId);
  save();
  toast('Vente supprimée', 'success');
  document.getElementById('modal-recu')?.classList.remove('open');
  render();
}

// ════════════════════════════════════════
// FILTRAGE
// ════════════════════════════════════════

function filtrerVentes(recherche) {
  _rechercheVentes = recherche.toLowerCase();
  const container  = document.getElementById('content');
  if (container) container.innerHTML = renderVentes();
}
