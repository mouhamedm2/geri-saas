/**
 * GÉRI — Module Factures
 * Création, affichage, PDF, envoi WhatsApp
 */

'use strict';

// ════════════════════════════════════════
// ÉTAT LOCAL
// ════════════════════════════════════════

let _facFiltreStatut = 'tous';
let _facRecherche    = '';

// ════════════════════════════════════════
// RENDU LISTE
// ════════════════════════════════════════

function renderFactures() {
  const caTotal        = factures.reduce((s, f) => s + f.total, 0);
  const payees         = factures.filter(f => f.statut === 'payée');
  const enAttente      = factures.filter(f => f.statut !== 'payée');
  const montantAttente = enAttente.reduce((s, f) => s + f.total, 0);

  const filtrees = factures.filter(f => {
    const matchStatut   = _facFiltreStatut === 'tous' || f.statut === _facFiltreStatut;
    const matchRecherche = !_facRecherche ||
      f.client.toLowerCase().includes(_facRecherche) ||
      f.num.toLowerCase().includes(_facRecherche);
    return matchStatut && matchRecherche;
  }).reverse();

  return `
    <!-- Stats -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px">
      <div class="stat-card" onclick="setFacFiltre('tous')" style="cursor:pointer;${_facFiltreStatut === 'tous' ? 'border-color:var(--teal)' : ''}">
        <div class="stat-label">Total</div>
        <div class="stat-val" style="font-size:16px">${fmtShort(caTotal)}</div>
        <div class="stat-sub">${factures.length} factures</div>
      </div>
      <div class="stat-card" onclick="setFacFiltre('payée')" style="cursor:pointer;${_facFiltreStatut === 'payée' ? 'border-color:var(--teal)' : ''}">
        <div class="stat-label">Payées</div>
        <div class="stat-val" style="font-size:16px;color:var(--teal)">${fmtShort(payees.reduce((s, f) => s + f.total, 0))}</div>
        <div class="stat-sub">${payees.length} réglées</div>
      </div>
      <div class="stat-card" onclick="setFacFiltre('brouillon')" style="cursor:pointer;">
        <div class="stat-label">En attente</div>
        <div class="stat-val" style="font-size:16px;color:var(--warn)">${fmtShort(montantAttente)}</div>
        <div class="stat-sub">${enAttente.length} à encaisser</div>
      </div>
    </div>

    <!-- Recherche + filtre -->
    <div style="display:flex;gap:8px;margin-bottom:12px">
      <div style="flex:1;position:relative">
        <svg style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--muted)"
             width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="6" cy="6" r="4" stroke="currentColor" stroke-width="1.4"/>
          <path d="M10 10l2.5 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
        <input
          style="width:100%;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px 12px 10px 34px;color:var(--cream);font-family:'DM Sans',sans-serif;font-size:14px;outline:none"
          placeholder="Client, numéro…"
          value="${_facRecherche}"
          oninput="filtrerFactures(this.value)"
        >
      </div>
      <select
        onchange="setFacFiltre(this.value)"
        style="background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:10px;padding:9px 10px;color:var(--cream);font-family:'DM Sans',sans-serif;font-size:12px;outline:none"
      >
        <option value="tous"      ${_facFiltreStatut === 'tous'      ? 'selected' : ''}>Toutes</option>
        <option value="brouillon" ${_facFiltreStatut === 'brouillon' ? 'selected' : ''}>Brouillon</option>
        <option value="envoyée"   ${_facFiltreStatut === 'envoyée'   ? 'selected' : ''}>Envoyées</option>
        <option value="payée"     ${_facFiltreStatut === 'payée'     ? 'selected' : ''}>Payées</option>
      </select>
    </div>

    <!-- Liste -->
    <div class="table-wrap">
      ${filtrees.length
        ? filtrees.map(f => {
            const sStyle = f.statut === 'payée'
              ? 'background:rgba(0,200,150,0.1);color:var(--teal);'
              : f.statut === 'envoyée'
              ? 'background:rgba(100,181,246,0.1);color:#64B5F6;'
              : 'background:rgba(255,255,255,0.06);color:var(--muted);';

            return `
              <div style="padding:13px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;cursor:pointer" onclick="voirFacture(${f.id})">
                <div style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,rgba(0,200,150,0.15),rgba(0,200,150,0.05));border:1px solid rgba(0,200,150,0.2);display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-size:15px;font-weight:800;color:var(--teal);flex-shrink:0">
                  ${f.client.charAt(0).toUpperCase()}
                </div>
                <div style="flex:1;min-width:0">
                  <div class="prod-name">${f.client}</div>
                  <div class="prod-cat">${f.num} · ${formatDate(f.date)}</div>
                </div>
                <div style="text-align:right;flex-shrink:0">
                  <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:700;color:var(--cream)">${fmt(f.total)}</div>
                  <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;${sStyle}">${f.statut}</span>
                </div>
                <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0" onclick="event.stopPropagation()">
                  ${f.statut !== 'payée' ? `
                    <button onclick="marquerPayee(${f.id})" style="background:rgba(0,200,150,0.1);border:1px solid rgba(0,200,150,0.2);color:var(--teal);width:28px;height:28px;border-radius:7px;cursor:pointer;font-size:13px">✓</button>
                  ` : ''}
                  <button onclick="supprimerFacture(${f.id})" style="background:rgba(255,90,90,0.08);border:1px solid rgba(255,90,90,0.15);color:var(--danger);width:28px;height:28px;border-radius:7px;cursor:pointer;font-size:13px">×</button>
                </div>
              </div>
            `;
          }).join('')
        : `<div class="empty"><p>${_facRecherche || _facFiltreStatut !== 'tous' ? 'Aucune facture correspondante' : 'Aucune facture — cliquez + Nouvelle facture'}</p></div>`
      }
    </div>
  `;
}

// ════════════════════════════════════════
// CRÉATION FACTURE
// ════════════════════════════════════════

function ouvrirNouvelleFacture() {
  currentFactureId = null;
  facLignes        = [{ desc: '', qte: 1, prix: 0 }];

  const num = genNumFacture();

  const numBadge = document.getElementById('fac-num-badge');
  if (numBadge) numBadge.textContent = num;

  ['fac-client', 'fac-tel', 'fac-note', 'fac-remise', 'fac-tva'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  const dateEl = document.getElementById('fac-date');
  if (dateEl) dateEl.value = today();

  const titre = document.getElementById('modal-facture-title');
  if (titre) titre.textContent = 'Nouvelle facture';

  renderLignesFac();
  calcFacTotal();

  document.getElementById('modal-facture')?.classList.add('open');
}

function renderLignesFac() {
  const zone = document.getElementById('fac-lignes');
  if (!zone) return;

  zone.innerHTML = facLignes.map((ligne, i) => `
    <div style="display:grid;grid-template-columns:1fr 60px 90px 28px;gap:6px;margin-bottom:8px;align-items:center">
      <input
        class="form-input"
        placeholder="Description"
        value="${ligne.desc || ''}"
        oninput="mettreAJourLigne(${i},'desc',this.value)"
        style="padding:9px 10px"
      >
      <input
        class="form-input"
        type="number" min="1" placeholder="Qté"
        value="${ligne.qte || 1}"
        oninput="mettreAJourLigne(${i},'qte',this.value)"
        style="padding:9px 10px;text-align:center"
      >
      <input
        class="form-input"
        type="number" min="0" placeholder="Prix"
        value="${ligne.prix || ''}"
        oninput="mettreAJourLigne(${i},'prix',this.value)"
        style="padding:9px 10px;text-align:right"
      >
      <button
        onclick="supprimerLigne(${i})"
        style="width:28px;height:28px;border-radius:7px;background:rgba(255,90,90,0.08);border:1px solid rgba(255,90,90,0.15);color:var(--danger);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0"
      >×</button>
    </div>
  `).join('');
}

function mettreAJourLigne(index, champ, valeur) {
  if (!facLignes[index]) return;
  facLignes[index][champ] = champ === 'desc' ? valeur : parseFloat(valeur) || 0;
  calcFacTotal();
}

function ajouterLigneFac() {
  facLignes.push({ desc: '', qte: 1, prix: 0 });
  renderLignesFac();
}

function supprimerLigne(index) {
  if (facLignes.length <= 1) {
    toast('La facture doit avoir au moins un article', 'error');
    return;
  }
  facLignes.splice(index, 1);
  renderLignesFac();
  calcFacTotal();
}

function calcFacTotal() {
  const subtotal  = facLignes.reduce((s, l) => s + (l.prix || 0) * (l.qte || 1), 0);
  const remisePct = parseFloat(document.getElementById('fac-remise')?.value || 0);
  const tvaPct    = parseFloat(document.getElementById('fac-tva')?.value    || 0);
  const remiseAmt = subtotal * remisePct / 100;
  const tvaAmt    = (subtotal - remiseAmt) * tvaPct / 100;
  const total     = Math.round(subtotal - remiseAmt + tvaAmt);

  const _s = id => { const el = document.getElementById(id); if (el) el.textContent = arguments[1]; };
  const stEl = document.getElementById('fac-subtotal');
  const tEl  = document.getElementById('fac-total-preview');
  if (stEl) stEl.textContent = fmt(subtotal);
  if (tEl)  tEl.textContent  = fmt(total);

  const rLine = document.getElementById('fac-remise-line');
  const rAmt  = document.getElementById('fac-remise-amount');
  if (rLine)  rLine.style.display = remisePct > 0 ? 'flex' : 'none';
  if (rAmt)   rAmt.textContent    = '- ' + fmt(Math.round(remiseAmt));

  const tLine = document.getElementById('fac-tva-line');
  const tAmt  = document.getElementById('fac-tva-amount');
  if (tLine)  tLine.style.display = tvaPct > 0 ? 'flex' : 'none';
  if (tAmt)   tAmt.textContent    = '+ ' + fmt(Math.round(tvaAmt));
}

// Alias pour compatibilité
function majTotalFac() { calcFacTotal(); }
function updateFacTotal() { calcFacTotal(); }

function ajouterDepuisCatalogue() {
  const modal = document.createElement('div');
  modal.id    = 'modal-catalogue-fac';
  modal.style.cssText = 'position:fixed;inset:0;z-index:400;background:rgba(0,0,0,0.7);display:flex;align-items:flex-end;justify-content:center';
  modal.innerHTML = `
    <div style="background:#1C2E4A;border-radius:20px 20px 0 0;width:100%;max-height:65vh;overflow-y:auto;padding:16px">
      <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:#F7F4EE;margin-bottom:12px">📦 Choisir depuis le catalogue</div>
      ${produits.filter(p => p.stock > 0).map(p => `
        <div onclick="ajouterProduitDansFac(${p.id})" style="display:flex;align-items:center;justify-content:space-between;padding:12px;border-radius:10px;margin-bottom:6px;cursor:pointer;border:1px solid rgba(247,244,238,0.08)" onmouseover="this.style.background='rgba(0,200,150,0.06)'" onmouseout="this.style.background=''">
          <div>
            <div style="font-size:14px;font-weight:500;color:#F7F4EE">${p.nom}</div>
            <div style="font-size:11px;color:rgba(247,244,238,0.5)">Stock : ${p.stock}</div>
          </div>
          <div style="font-size:14px;font-weight:700;color:var(--teal)">${fmt(p.prix_vente || p.vente || 0)}</div>
        </div>
      `).join('') || '<div style="padding:20px;text-align:center;color:rgba(247,244,238,0.5)">Aucun produit en stock</div>'}
      <button onclick="document.getElementById('modal-catalogue-fac').remove()" style="width:100%;margin-top:10px;background:transparent;border:1px solid rgba(247,244,238,0.08);color:rgba(247,244,238,0.5);border-radius:10px;padding:12px;font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif">Fermer</button>
    </div>
  `;
  document.body.appendChild(modal);
}

function ajouterProduitDansFac(prodId) {
  const prod = produits.find(p => p.id === prodId);
  if (!prod) return;
  const existant = facLignes.find(l => l.desc === prod.nom);
  if (existant) { existant.qte++; }
  else { facLignes.push({ desc: prod.nom, qte: 1, prix: prod.prix_vente || prod.vente || 0 }); }
  renderLignesFac();
  calcFacTotal();
  document.getElementById('modal-catalogue-fac')?.remove();
  toast(prod.nom + ' ajouté ✓', 'success');
}

function autoCompleteClient(q) {
  const box = document.getElementById('fac-client-suggestions');
  if (!box) return;
  if (!q || q.length < 2) { box.style.display = 'none'; return; }
  const matches = clients.filter(c => c.nom.toLowerCase().includes(q.toLowerCase())).slice(0, 5);
  if (!matches.length) { box.style.display = 'none'; return; }
  box.innerHTML = matches.map(c =>
    '<div onclick="selectionnerClientFac(' + c.id + ')" style="padding:10px 14px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--border)" onmouseover="this.style.background=\'rgba(0,200,150,0.08)\'" onmouseout="this.style.background=\'\'">' +
    '<span style="font-weight:600;color:var(--cream)">' + c.nom + '</span>' +
    (c.tel ? '<span style="color:var(--muted);margin-left:8px;font-size:11px">' + c.tel + '</span>' : '') +
    '</div>'
  ).join('');
  box.style.display = 'block';
}

function selectionnerClientFac(id) {
  const c = clients.find(x => x.id === id);
  if (!c) return;
  const clientEl = document.getElementById('fac-client');
  const telEl    = document.getElementById('fac-tel');
  if (clientEl) clientEl.value = c.nom;
  if (telEl && c.tel) telEl.value = c.tel;
  const box = document.getElementById('fac-client-suggestions');
  if (box) box.style.display = 'none';
}

function sauvegarderFacture() {
  const client = sanitize(document.getElementById('fac-client')?.value.trim() || '');
  if (!client) { toast('Nom du client obligatoire', 'error'); return; }

  const lignesValides = facLignes.filter(l => l.desc.trim());
  if (!lignesValides.length) { toast('Ajoutez au moins un article', 'error'); return; }

  const subtotal  = lignesValides.reduce((s, l) => s + l.prix * l.qte, 0);
  const remisePct = parseFloat(document.getElementById('fac-remise')?.value || 0);
  const tvaPct    = parseFloat(document.getElementById('fac-tva')?.value    || 0);
  const remiseAmt = Math.round(subtotal * remisePct / 100);
  const tvaAmt    = Math.round((subtotal - remiseAmt) * tvaPct / 100);
  const total     = Math.round(subtotal - remiseAmt + tvaAmt);

  const fac = {
    id:            currentFactureId || genId(),
    num:           genNumFacture(),
    client,
    tel:           document.getElementById('fac-tel')?.value.trim() || '',
    note:          sanitize(document.getElementById('fac-note')?.value.trim() || ''),
    date:          document.getElementById('fac-date')?.value || today(),
    heureCreation: nowShort(),
    lignes:        lignesValides.map(l => ({ ...l })),
    subtotal, remise: remisePct, remiseAmt, tva: tvaPct, tvaAmt, total,
    statut:        'brouillon',
    createdAt:     today(),
  };

  if (currentFactureId) {
    const idx = factures.findIndex(f => f.id === currentFactureId);
    if (idx !== -1) factures[idx] = fac;
  } else {
    factures.push(fac);
  }

  save();
  document.getElementById('modal-facture')?.classList.remove('open');
  voirFacture(fac.id);
  toast('Facture créée ✓', 'success');
}

// ════════════════════════════════════════
// AFFICHAGE + PDF
// ════════════════════════════════════════

function voirFacture(facId) {
  const fac = factures.find(f => f.id === facId);
  if (!fac) return;

  currentFactureId = facId;

  const zone = document.getElementById('facture-preview-wrap');
  if (zone) zone.innerHTML = buildFactureHTML(fac);

  document.getElementById('modal-facture-view')?.classList.add('open');
}

function buildFactureHTML(f) {
  const shopNom      = DB.get('shopname')    || 'Ma Boutique';
  const shopTel      = DB.get('shoptel')     || '';
  const shopVille    = DB.get('shopville')   || 'Sénégal';
  const shopAdresse  = DB.get('shopadresse') || '';
  const shopLogo     = DB.get('shoplogo')    || '';
  const shopFooter   = DB.get('shopfooter')  || 'Merci pour votre confiance !';
  const shopHoraires = DB.get('shophoraires')|| '';
  const shopEmail    = sessionStorage.getItem('geri_email') || '';

  const subtotal  = f.lignes.reduce((s, l) => s + (l.prix || 0) * (l.qte || 1), 0);
  const remisePct = f.remise || 0;
  const tvaPct    = f.tva || 0;
  const remiseAmt = f.remiseAmt || Math.round(subtotal * remisePct / 100);
  const tvaAmt    = f.tvaAmt    || Math.round((subtotal - remiseAmt) * tvaPct / 100);
  const total     = f.total     || Math.round(subtotal - remiseAmt + tvaAmt);

  const sConfig   = {
    'payée':     { couleur:'#00C896', bg:'#E8F5E9', label:'✓ PAYÉE' },
    'envoyée':   { couleur:'#1565C0', bg:'#E3F2FD', label:'➤ ENVOYÉE' },
    'brouillon': { couleur:'#888',    bg:'#F5F5F5', label:'◎ BROUILLON' },
  };
  const statut   = sConfig[f.statut] || sConfig.brouillon;

  const dateObj  = new Date(f.date || new Date());
  const echeance = new Date(dateObj.setDate(dateObj.getDate() + 30)).toLocaleDateString('fr-SN');

  return `
    <div id="fac-print-zone" style="background:#fff;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;max-width:620px;margin:0 auto;box-shadow:0 4px 32px rgba(0,0,0,0.1);border-radius:4px;overflow:hidden">

      <!-- Header teal -->
      <div style="background:#00897B;position:relative;overflow:hidden">
        <svg style="position:absolute;bottom:0;left:0;right:0;display:block" viewBox="0 0 620 40" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d="M0 40 Q155 0 310 20 Q465 40 620 10 L620 40 Z" fill="rgba(0,0,0,0.15)"/>
        </svg>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:24px 28px 40px;position:relative;z-index:1">
          <div>
            <div style="font-size:36px;font-weight:900;color:#fff;letter-spacing:2px;line-height:1">FACTURE</div>
            <div style="font-size:12px;color:rgba(255,255,255,0.7);margin-top:6px">N° ${f.num}</div>
          </div>
          <div style="text-align:right">
            ${shopLogo ? `<img src="${shopLogo}" style="height:36px;width:auto;border-radius:6px;margin-bottom:6px;display:block;margin-left:auto">` : ''}
            <div style="font-size:18px;font-weight:800;color:#fff">${shopNom}</div>
            ${shopTel     ? `<div style="font-size:11px;color:rgba(255,255,255,0.8);margin-top:3px">☎ ${shopTel}</div>` : ''}
            ${shopEmail   ? `<div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:2px">✉ ${shopEmail}</div>` : ''}
            ${shopVille   ? `<div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:2px">📍 ${shopVille}${shopAdresse ? ', ' + shopAdresse : ''}</div>` : ''}
          </div>
        </div>
      </div>

      <!-- Méta -->
      <div style="background:#f8f9fa;border-bottom:1px solid #e8e8e8;padding:10px 28px;display:flex;gap:20px;font-size:12px;flex-wrap:wrap;align-items:center">
        <div><span style="color:#888">N° :</span> <strong>${f.num}</strong></div>
        <div><span style="color:#888">Date :</span> <strong>${formatDate(f.date)}</strong></div>
        <div><span style="color:#888">Échéance :</span> <strong>${echeance}</strong></div>
        <div style="margin-left:auto">
          <span style="background:${statut.bg};color:${statut.couleur};font-weight:700;font-size:11px;padding:3px 10px;border-radius:20px">${statut.label}</span>
        </div>
      </div>

      <!-- Facturé à / Émis par -->
      <div style="display:grid;grid-template-columns:1fr 1fr;padding:18px 28px;border-bottom:1px solid #f0f0f0">
        <div>
          <div style="font-size:11px;font-weight:800;color:#00897B;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Facturé à</div>
          <div style="font-size:15px;font-weight:700">${f.client}</div>
          ${f.tel  ? `<div style="font-size:12px;color:#555;margin-top:3px">☎ ${f.tel}</div>` : ''}
          ${f.note ? `<div style="font-size:12px;color:#777;margin-top:3px;font-style:italic">${f.note}</div>` : ''}
        </div>
        <div style="padding-left:20px;border-left:1px solid #f0f0f0">
          <div style="font-size:11px;font-weight:800;color:#00897B;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Émis par</div>
          <div style="font-size:14px;font-weight:700">${shopNom}</div>
          ${shopTel     ? `<div style="font-size:12px;color:#555;margin-top:3px">☎ ${shopTel}</div>` : ''}
          ${shopVille   ? `<div style="font-size:12px;color:#555;margin-top:2px">📍 ${shopVille}</div>` : ''}
          ${shopHoraires ? `<div style="font-size:11px;color:#888;margin-top:2px">🕐 ${shopHoraires}</div>` : ''}
        </div>
      </div>

      <!-- Tableau -->
      <div style="padding:0 28px 20px">
        <table style="width:100%;border-collapse:collapse;margin-top:16px">
          <thead>
            <tr style="background:#00897B">
              <th style="padding:10px 12px;text-align:center;font-size:10px;font-weight:700;text-transform:uppercase;color:#fff;width:40px">QTE</th>
              <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;color:#fff">DÉSIGNATION</th>
              <th style="padding:10px 12px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;color:#fff">PRIX UNIT.</th>
              <th style="padding:10px 12px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;color:#fff">MONTANT</th>
            </tr>
          </thead>
          <tbody>
            ${f.lignes.map((l, i) => `
              <tr style="border-bottom:1px solid #f0f0f0;background:${i % 2 === 0 ? '#fff' : '#f9fafb'}">
                <td style="padding:10px 12px;text-align:center;font-size:13px;color:#555;font-weight:600">${l.qte}</td>
                <td style="padding:10px 12px;font-size:13px">${l.desc}</td>
                <td style="padding:10px 12px;text-align:right;font-size:13px;color:#555">${Number(l.prix).toLocaleString('fr-SN')}</td>
                <td style="padding:10px 12px;text-align:right;font-size:13px;font-weight:700">${Number(l.prix * l.qte).toLocaleString('fr-SN')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Totaux -->
        <div style="display:flex;justify-content:flex-end;margin-top:8px">
          <div style="width:260px">
            <div style="display:flex;justify-content:space-between;padding:8px 12px;font-size:13px;color:#555;border-bottom:1px solid #f0f0f0">
              <span>Montant HT</span><span style="font-weight:600">${Number(subtotal).toLocaleString('fr-SN')}</span>
            </div>
            ${remisePct > 0 ? `
              <div style="display:flex;justify-content:space-between;padding:8px 12px;font-size:13px;color:#E65100;border-bottom:1px solid #f0f0f0">
                <span>Remise (${remisePct}%)</span><span style="font-weight:600">- ${Number(remiseAmt).toLocaleString('fr-SN')}</span>
              </div>
            ` : ''}
            <div style="display:flex;justify-content:space-between;padding:8px 12px;font-size:13px;color:#555;border-bottom:2px solid #1a1a1a">
              <span>TVA ${tvaPct > 0 ? tvaPct + '%' : '(0%)'}</span><span style="font-weight:600">${Number(tvaAmt).toLocaleString('fr-SN')}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:#00897B">
              <span style="font-size:14px;font-weight:800;color:#fff">TOTAL TTC</span>
              <span style="font-size:20px;font-weight:900;color:#fff">${Number(total).toLocaleString('fr-SN')} FCFA</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Conditions -->
      <div style="padding:12px 28px;border-top:1px solid #f0f0f0">
        <div style="font-size:12px;font-weight:700;color:#00897B;margin-bottom:3px">Conditions de paiement</div>
        <div style="font-size:12px;color:#555">Paiement dû dans 30 jours. Modes acceptés : Wave, Orange Money, Espèces.</div>
      </div>

      <!-- Footer -->
      <div style="background:#1a1a1a;padding:12px 28px;text-align:center">
        ${shopTel ? `<div style="font-size:11px;color:rgba(255,255,255,0.5)">TEL : ${shopTel}</div>` : ''}
        <div style="font-size:12px;color:#00C896;font-weight:600;margin-top:3px">${shopFooter}</div>
        <div style="font-size:10px;color:rgba(255,255,255,0.25);margin-top:3px">Propulsé par Géri · geri-saas.vercel.app</div>
      </div>
    </div>
  `;
}

function imprimerFacture() {
  const fac = factures.find(f => f.id === currentFactureId);
  if (!fac) { toast('Facture introuvable', 'error'); return; }

  const filename = 'Facture-' + fac.num + '-' + fac.client.replace(/[^a-zA-Z0-9]/g, '-') + '.pdf';
  const facHTML  = buildFactureHTML(fac);

  const pageHTML = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${filename}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;background:#f5f5f5;display:flex;flex-direction:column;align-items:center;padding:20px;min-height:100vh}
  .actions{width:100%;max-width:620px;display:flex;gap:8px;margin-bottom:16px}
  .btn-p{flex:1;background:#00897B;color:#fff;border:none;border-radius:8px;padding:12px;font-size:14px;font-weight:700;cursor:pointer}
  .btn-c{background:#f0f0f0;color:#333;border:none;border-radius:8px;padding:12px 16px;font-size:14px;cursor:pointer}
  @media print{body{background:#fff;padding:0;display:block}.actions{display:none}#fac-print-zone{max-width:100%;box-shadow:none!important;border-radius:0!important}@page{margin:0;size:A4}}
</style>
</head>
<body>
  <div class="actions">
    <button class="btn-p" onclick="window.print()">🖨️ Imprimer / Enregistrer en PDF</button>
    <button class="btn-c" onclick="window.close()">✕ Fermer</button>
  </div>
  ${facHTML}
</body>
</html>`;

  const fenetre = window.open('', '_blank');
  if (fenetre) {
    fenetre.document.open();
    fenetre.document.write(pageHTML);
    fenetre.document.close();
    fenetre.document.title = filename;
    setTimeout(() => { try { fenetre.focus(); fenetre.print(); } catch(e) {} }, 800);
  } else {
    const blob = new Blob([pageHTML], { type: 'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename.replace('.pdf', '.html');
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    toast('📥 Ouvrez le fichier et imprimez en PDF', 'info');
  }
}

function partagerFactureWA() {
  const fac     = factures.find(f => f.id === currentFactureId);
  if (!fac) return;
  const shopNom = DB.get('shopname') || 'Ma Boutique';
  const msg     = 'Bonjour ' + fac.client + ' 👋\n\nVotre facture *' + fac.num + '* de *' + fmt(fac.total) + '* est prête.\n\n🏪 ' + shopNom;
  const tel     = fac.tel ? fac.tel.replace(/\D/g, '') : '';
  const url     = tel
    ? 'https://wa.me/221' + tel + '?text=' + encodeURIComponent(msg)
    : 'https://wa.me/?text=' + encodeURIComponent(msg);
  window.open(url, '_blank');

  fac.statut = 'envoyée';
  save();
}

function copierLienFacture() {
  const fac = factures.find(f => f.id === currentFactureId);
  if (!fac) return;
  const shopNom = DB.get('shopname') || 'Ma Boutique';
  const lignes  = fac.lignes.map(l => '  • ' + l.desc + ' × ' + l.qte + ' — ' + Number(l.prix * l.qte).toLocaleString('fr-SN') + ' FCFA').join('\n');
  const txt     = '🧾 FACTURE ' + fac.num + '\n' + shopNom + '\n' + formatDate(fac.date) + '\n\n' + lignes + '\n\nTOTAL : ' + fmt(fac.total);
  navigator.clipboard.writeText(txt).then(() => toast('Texte copié ✓', 'success'));
}

// ════════════════════════════════════════
// ACTIONS RAPIDES
// ════════════════════════════════════════

function marquerPayee(facId) {
  const fac = factures.find(f => f.id === facId);
  if (!fac) return;
  fac.statut    = 'payée';
  fac.payeeLeAt = today();
  save();
  const container = document.getElementById('content');
  if (container) container.innerHTML = renderFactures();
  toast('Facture marquée comme payée ✓', 'success');
}

function supprimerFacture(facId) {
  const fac = factures.find(f => f.id === facId);
  if (!fac) return;
  if (!confirm('Supprimer la facture ' + fac.num + ' ?')) return;
  factures = factures.filter(f => f.id !== facId);
  save();
  document.getElementById('modal-facture-view')?.classList.remove('open');
  const container = document.getElementById('content');
  if (container) container.innerHTML = renderFactures();
  toast('Facture supprimée', 'success');
}

function filtrerFactures(recherche) {
  _facRecherche = recherche.toLowerCase();
  const container = document.getElementById('content');
  if (container) container.innerHTML = renderFactures();
}

function setFacFiltre(statut) {
  _facFiltreStatut = statut;
  const container  = document.getElementById('content');
  if (container) container.innerHTML = renderFactures();
}
