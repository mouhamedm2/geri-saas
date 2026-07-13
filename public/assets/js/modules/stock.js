/**
 * GÉRI — Module Stock & Produits
 * Gestion catalogue, alertes, réapprovisionnement
 */

'use strict';

let _rechercheStock = '';
let _produitEnCours = null;

// ════════════════════════════════════════
// RENDU
// ════════════════════════════════════════

function renderStock() {
  const ruptures    = produits.filter(p => p.stock === 0);
  const stockBas    = produits.filter(p => p.stock > 0 && p.stock <= (p.alerte || p.stock_min || 5));
  const valeurStock = produits.reduce((s, p) => s + (p.prix_achat || p.achat || 0) * p.stock, 0);

  const filtres = _rechercheStock
    ? produits.filter(p =>
        p.nom.toLowerCase().includes(_rechercheStock) ||
        (p.cat || '').toLowerCase().includes(_rechercheStock)
      )
    : produits;

  return `
    <!-- Stats -->
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">Total produits</div>
        <div class="stat-val">${produits.length}</div>
        <div class="stat-sub">${produits.reduce((s, p) => s + p.stock, 0)} unités</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Valeur stock</div>
        <div class="stat-val" style="color:var(--teal)">${fmtShort(valeurStock)}</div>
        <div class="stat-sub">Prix d'achat</div>
      </div>
      <div class="stat-card" style="${ruptures.length ? 'border-color:var(--danger)' : ''}">
        <div class="stat-label">Ruptures</div>
        <div class="stat-val" style="color:var(--danger)">${ruptures.length}</div>
        <div class="stat-sub">${ruptures.length ? '⚠ Action requise' : '✓ Aucune'}</div>
      </div>
      <div class="stat-card" style="${stockBas.length ? 'border-color:var(--warn)' : ''}">
        <div class="stat-label">Stock bas</div>
        <div class="stat-val" style="color:var(--warn)">${stockBas.length}</div>
        <div class="stat-sub">${stockBas.length ? '⚠ À réapprovisionner' : '✓ OK'}</div>
      </div>
    </div>

    <!-- Alertes critiques -->
    ${ruptures.length ? `
      <div style="background:rgba(255,90,90,0.06);border:1px solid rgba(255,90,90,0.2);border-radius:12px;padding:12px;margin-bottom:12px">
        <div style="font-size:11px;font-weight:700;color:var(--danger);margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em">
          🚨 Ruptures de stock
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${ruptures.map(p => `
            <span
              onclick="ouvrirReappro(${p.id})"
              style="background:rgba(255,90,90,0.1);border:1px solid rgba(255,90,90,0.2);color:var(--danger);font-size:12px;padding:4px 10px;border-radius:20px;cursor:pointer"
            >${p.nom}</span>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <!-- Recherche -->
    <div style="position:relative;margin-bottom:12px">
      <svg style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--muted)"
           width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="6" cy="6" r="4" stroke="currentColor" stroke-width="1.4"/>
        <path d="M10 10l2.5 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      </svg>
      <input
        style="width:100%;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px 12px 10px 34px;color:var(--cream);font-family:'DM Sans',sans-serif;font-size:14px;outline:none"
        placeholder="Rechercher un produit…"
        value="${_rechercheStock}"
        oninput="filtrerStock(this.value)"
      >
    </div>

    <!-- Liste produits -->
    <div class="table-wrap">
      ${filtres.length
        ? filtres.map(p => `
            <div class="table-row" style="grid-template-columns:1fr auto auto auto" onclick="ouvrirModalProduit(${p.id})">
              <div>
                <div class="prod-name">${p.nom}</div>
                <div class="prod-cat">${p.cat || 'Sans catégorie'} · Achat: ${fmt(p.prix_achat || p.achat || 0)}</div>
              </div>
              <div style="text-align:center;margin-right:8px">
                <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:${
                  p.stock === 0 ? 'var(--danger)'
                  : p.stock <= (p.alerte || 5) ? 'var(--warn)'
                  : 'var(--teal)'
                }">${p.stock}</div>
                <div style="font-size:10px;color:var(--muted)">${p.unite || 'pcs'}</div>
              </div>
              <div style="text-align:right;margin-right:8px">
                <div style="font-size:13px;font-weight:600;color:var(--cream)">${fmt(p.prix_vente || p.vente || 0)}</div>
                <div style="font-size:10px;color:var(--muted)">Prix vente</div>
              </div>
              ${stockBadge(p)}
            </div>
          `).join('')
        : `<div class="empty">
             <p>${_rechercheStock ? 'Aucun résultat pour "' + _rechercheStock + '"' : 'Aucun produit — cliquez + Ajouter produit'}</p>
           </div>`
      }
    </div>
  `;
}

// ════════════════════════════════════════
// MODAL PRODUIT
// ════════════════════════════════════════

function ouvrirModalProduit(produitId) {
  const prod        = produitId ? produits.find(p => p.id === produitId) : null;
  _produitEnCours   = prod;

  const modal = document.getElementById('modal-produit');
  if (!modal) return;

  const titre = document.getElementById('modal-produit-title');
  if (titre) titre.textContent = prod ? 'Modifier le produit' : 'Nouveau produit';

  _remplir('prod-nom',         prod?.nom                             || '');
  _remplir('prod-cat',         prod?.cat                             || '');
  _remplir('prod-vente',       prod?.prix_vente  || prod?.vente      || '');
  _remplir('prod-achat',       prod?.prix_achat  || prod?.achat      || '');
  _remplir('prod-stock',       prod?.stock                           ?? '');
  _remplir('prod-alerte',      prod?.stock_min   || prod?.alerte     || '5');
  _remplir('prod-unite',       prod?.unite                           || 'pcs');
  _remplir('prod-description', prod?.description                     || '');

  modal.classList.add('open');
}

function sauvegarderProduit() {
  const nom         = sanitize(document.getElementById('prod-nom')?.value.trim()         || '');
  const cat         = sanitize(document.getElementById('prod-cat')?.value.trim()         || '');
  const prixVente   = parseFloat(document.getElementById('prod-vente')?.value            || 0);
  const prixAchat   = parseFloat(document.getElementById('prod-achat')?.value            || 0);
  const stock       = parseInt(document.getElementById('prod-stock')?.value              || 0);
  const alerte      = parseInt(document.getElementById('prod-alerte')?.value             || 5);
  const unite       = document.getElementById('prod-unite')?.value                       || 'pcs';
  const description = sanitize(document.getElementById('prod-description')?.value.trim() || '');

  if (!nom) {
    toast('Le nom du produit est obligatoire', 'error');
    return;
  }
  if (prixVente < 0 || prixAchat < 0) {
    toast('Les prix ne peuvent pas être négatifs', 'error');
    return;
  }
  if (stock < 0) {
    toast('Le stock ne peut pas être négatif', 'error');
    return;
  }

  if (_produitEnCours) {
    // Modification
    Object.assign(_produitEnCours, {
      nom, cat,
      prix_vente: prixVente, vente: prixVente,
      prix_achat: prixAchat, achat: prixAchat,
      stock,
      stock_min: alerte, alerte,
      unite, description,
      updatedAt: today(),
    });
    toast('Produit mis à jour ✓', 'success');
  } else {
    // Création
    produits.push({
      id:         genId(),
      nom, cat,
      prix_vente: prixVente, vente: prixVente,
      prix_achat: prixAchat, achat: prixAchat,
      stock,
      stock_min:  alerte, alerte,
      unite, description,
      vendu:      0,
      createdAt:  today(),
    });
    toast('Produit ajouté ✓', 'success');
  }

  save();
  document.getElementById('modal-produit')?.classList.remove('open');
  render();
}

function supprimerProduit(produitId) {
  const prod = produits.find(p => p.id === produitId);
  if (!prod) return;
  if (!confirm('Supprimer le produit "' + prod.nom + '" ? Cette action est irréversible.')) return;

  produits = produits.filter(p => p.id !== produitId);
  save();
  document.getElementById('modal-produit')?.classList.remove('open');
  toast('Produit supprimé', 'success');
  render();
}

// ════════════════════════════════════════
// RÉAPPROVISIONNEMENT RAPIDE
// ════════════════════════════════════════

function ouvrirReappro(produitId) {
  const prod = produits.find(p => p.id === produitId);
  if (!prod) return;

  const modal = document.createElement('div');
  modal.id    = 'modal-reappro-temp';
  modal.style.cssText = 'position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.65);display:flex;align-items:flex-end;justify-content:center';

  modal.innerHTML = `
    <div style="background:#1C2E4A;border-radius:20px 20px 0 0;padding:24px;width:100%;max-width:500px">
      <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:#F7F4EE;margin-bottom:4px">
        📦 Réapprovisionner
      </div>
      <div style="font-size:13px;color:rgba(247,244,238,0.5);margin-bottom:16px">${prod.nom} · Stock actuel : ${prod.stock}</div>
      <div class="form-group">
        <label class="form-label">Quantité à ajouter</label>
        <input id="reappro-qte" class="form-input" type="number" min="1" value="10"
               style="font-size:24px;text-align:center;font-weight:700">
      </div>
      <button onclick="validerReappro(${produitId})" class="btn-primary" style="margin-bottom:8px">
        ✓ Ajouter au stock
      </button>
      <button onclick="document.getElementById('modal-reappro-temp').remove()" class="btn-ghost">
        Annuler
      </button>
    </div>
  `;

  document.body.appendChild(modal);
  setTimeout(() => document.getElementById('reappro-qte')?.focus(), 100);
}

function validerReappro(produitId) {
  const prod = produits.find(p => p.id === produitId);
  const qte  = parseInt(document.getElementById('reappro-qte')?.value || 0);

  if (!prod || qte <= 0) {
    toast('Quantité invalide', 'error');
    return;
  }

  prod.stock += qte;
  save();
  document.getElementById('modal-reappro-temp')?.remove();
  toast('+' + qte + ' unités ajoutées à ' + prod.nom + ' ✓', 'success');
  render();
}

// ════════════════════════════════════════
// FILTRAGE
// ════════════════════════════════════════

function filtrerStock(recherche) {
  _rechercheStock = recherche.toLowerCase();
  const container = document.getElementById('content');
  if (container) container.innerHTML = renderStock();
}

function _remplir(id, valeur) {
  const el = document.getElementById(id);
  if (el) el.value = valeur;
}
