/**
 * GÉRI — Module Caisse
 * Enregistrement des ventes, panier, reçus WhatsApp
 */

'use strict';

// ════════════════════════════════════════
// CAISSE — RENDU
// ════════════════════════════════════════

function renderCaisse() {
  const prodsEnStock = produits.filter(p => p.stock > 0);

  return `
    <!-- Barre de recherche produits -->
    <div style="position:relative;margin-bottom:12px">
      <svg style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--muted)"
           width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="6" cy="6" r="4" stroke="currentColor" stroke-width="1.4"/>
        <path d="M10 10l2.5 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      </svg>
      <input
        style="width:100%;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px 12px 10px 34px;color:var(--cream);font-family:'DM Sans',sans-serif;font-size:14px;outline:none"
        placeholder="Rechercher un produit…"
        oninput="filtrerProduitsCaisse(this.value)"
        id="caisse-search"
      >
    </div>

    <!-- Grille produits -->
    <div class="prod-grid" id="caisse-prod-grid">
      ${prodsEnStock.length
        ? prodsEnStock.map(p => {
            const qteCart = cart.find(i => i.id === p.id)?.qte || 0;
            return `
              <div class="prod-btn ${qteCart > 0 ? 'in-cart' : ''}" onclick="addToCart(${p.id})">
                ${qteCart > 0 ? `<div class="cart-badge">${qteCart}</div>` : ''}
                <div class="prod-name" style="font-size:13px">${p.nom}</div>
                <div class="prod-price">${fmt(p.prix_vente || p.vente || 0)}</div>
                <div style="font-size:10px;color:var(--muted);margin-top:2px">Stock: ${p.stock}</div>
              </div>
            `;
          }).join('')
        : `<div class="empty" style="grid-column:1/-1">
             <p>Aucun produit en stock.<br>Ajoutez des produits dans Stock.</p>
           </div>`
      }
    </div>

    <!-- Bouton nouvelle vente -->
    <button
      class="btn-primary"
      onclick="ouvrirScanPhoto()"
      style="margin-bottom:8px;background:rgba(0,200,150,0.08);border:1px solid rgba(0,200,150,0.2);color:var(--teal);"
    >
      📷 Scanner un produit
    </button>
    <button
      class="btn-primary"
      onclick="openModal('modal-vente')"
    >
      + Enregistrer une vente
    </button>
  `;
}

function filtrerProduitsCaisse(recherche) {
  const ql   = recherche.toLowerCase();
  const grid = document.getElementById('caisse-prod-grid');
  if (!grid) return;

  const items = grid.querySelectorAll('.prod-btn');
  items.forEach(item => {
    const nom = item.querySelector('.prod-name')?.textContent?.toLowerCase() || '';
    item.style.display = !ql || nom.includes(ql) ? '' : 'none';
  });
}

// ════════════════════════════════════════
// PANIER
// ════════════════════════════════════════

function addToCart(prodId) {
  const prod = produits.find(p => p.id === prodId);
  if (!prod) return;

  if (prod.stock <= 0) {
    toast('Produit en rupture de stock', 'error');
    return;
  }

  const existing = cart.find(c => c.id === prodId);
  if (existing) {
    if (existing.qte >= prod.stock) {
      toast('Stock maximum atteint', 'error');
      return;
    }
    existing.qte++;
  } else {
    cart.push({
      id:    prod.id,
      nom:   prod.nom,
      prix:  prod.prix_vente || prod.vente || 0,
      achat: prod.prix_achat || prod.achat || 0,
      qte:   1,
      stock: prod.stock,
    });
  }

  // Mettre à jour le visuel du bouton produit
  const btn = document.querySelector(`[onclick="addToCart(${prodId})"]`);
  if (btn) {
    btn.classList.add('in-cart');
    let badge = btn.querySelector('.cart-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'cart-badge';
      btn.prepend(badge);
    }
    badge.textContent = cart.find(c => c.id === prodId).qte;
  }

  // Mettre à jour la barre panier
  _mettreAJourCartBar();

  toast(prod.nom + ' ajouté ✓', 'success');
}

function _mettreAJourCartBar() {
  const bar   = document.getElementById('cart-bar');
  const count = document.getElementById('cart-count');
  const total = document.getElementById('cart-total');

  if (!bar) return;

  const nbArticles = cart.reduce((s, i) => s + i.qte, 0);
  const montant    = cart.reduce((s, i) => s + i.prix * i.qte, 0);

  if (count) count.textContent = nbArticles;
  if (total) total.textContent = fmt(montant);

  bar.classList.toggle('visible', cart.length > 0);
}

function renderCart() {
  const zone = document.getElementById('cart-items');
  if (!zone) return;

  const total = cart.reduce((s, i) => s + i.prix * i.qte, 0);

  zone.innerHTML = cart.map(item => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:500;color:var(--cream);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.nom}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:2px">${fmt(item.prix)} / unité</div>
      </div>
      <div style="font-size:14px;font-weight:700;color:var(--teal);flex-shrink:0">${fmt(item.prix * item.qte)}</div>
      <div style="display:flex;align-items:center;gap:6px">
        <button
          onclick="modifierQteCart(${item.id}, -1)"
          style="width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,0.06);border:1px solid var(--border);color:var(--cream);font-size:16px;display:flex;align-items:center;justify-content:center;cursor:pointer"
        >−</button>
        <span style="font-size:14px;font-weight:700;min-width:20px;text-align:center">${item.qte}</span>
        <button
          onclick="modifierQteCart(${item.id}, 1)"
          style="width:28px;height:28px;border-radius:50%;background:rgba(0,200,150,0.1);border:1px solid rgba(0,200,150,0.2);color:var(--teal);font-size:16px;display:flex;align-items:center;justify-content:center;cursor:pointer"
        >+</button>
      </div>
    </div>
  `).join('');

  const totalEl = document.getElementById('cart-total-modal');
  if (totalEl) totalEl.textContent = fmt(total);
}

function modifierQteCart(prodId, delta) {
  const item = cart.find(i => i.id === prodId);
  if (!item) return;

  item.qte += delta;

  if (item.qte <= 0) {
    cart = cart.filter(i => i.id !== prodId);
  } else if (item.qte > item.stock) {
    item.qte = item.stock;
    toast('Stock maximum atteint', 'error');
  }

  _mettreAJourCartBar();
  renderCart();
}

// ════════════════════════════════════════
// CONFIRMATION VENTE
// ════════════════════════════════════════

function confirmerVente() {
  if (!cart.length) {
    toast('Le panier est vide', 'error');
    return;
  }

  const mode      = document.getElementById('pay-method')?.value  || 'especes';
  const client    = sanitize(document.getElementById('vente-client')?.value.trim()     || '');
  const clientTel = document.getElementById('vente-client-tel')?.value.trim()           || '';
  const vendeur   = document.getElementById('vente-vendeur')?.value                     || '';
  const total     = cart.reduce((s, i) => s + i.prix * i.qte, 0);
  const benefice  = cart.reduce((s, i) => s + (i.prix - (i.achat || 0)) * i.qte, 0);

  // Construire l'objet vente
  const vente = {
    id:           genId(),
    date:         today(),
    heure:        nowShort(),
    items:        cart.map(i => ({ id: i.id, nom: i.nom, qte: i.qte, prix: i.prix })),
    total,
    benefice,
    modePaiement: mode,
    paiement:     mode,
    client,
    clientTel,
    vendeur,
    photo:        ventePhotoData || null,
  };

  // Déduire le stock
  cart.forEach(item => {
    const prod = produits.find(p => p.id === item.id);
    if (prod) prod.stock = Math.max(0, prod.stock - item.qte);
  });

  // Mettre à jour le client
  if (client) {
    _mettreAJourClient(client, clientTel, total);
  }

  // Enregistrer
  ventes.push(vente);
  save();

  // Réinitialiser
  lastVente    = vente;
  const photo  = ventePhotoData;
  cart         = [];
  ventePhotoData = null;

  // Fermer le modal vente
  closeModal('modal-vente');

  // Afficher le reçu
  _afficherRecu(vente, photo);

  toast('Vente enregistrée ✓', 'success');
  render();
}

function _mettreAJourClient(nom, tel, montant) {
  const existant = clients.find(c => c.nom.toLowerCase() === nom.toLowerCase());
  if (existant) {
    existant.totalAchats    = (existant.totalAchats || 0) + montant;
    existant.nbAchats       = (existant.nbAchats || 0) + 1;
    existant.derniereVisite = today();
    if (tel && !existant.tel) existant.tel = tel;
  } else {
    clients.push({
      id:             genId(),
      nom,
      tel,
      totalAchats:    montant,
      nbAchats:       1,
      derniereVisite: today(),
      createdAt:      today(),
    });
  }
}

// ════════════════════════════════════════
// REÇU
// ════════════════════════════════════════

function _afficherRecu(vente, photo) {
  const shopNom    = DB.get('shopname')  || 'Ma Boutique';
  const shopFooter = DB.get('shopfooter') || 'Merci pour votre achat !';

  const recuHTML = `
    <div style="background:#fff;color:#111;border-radius:12px;padding:20px;font-family:'DM Sans',Arial,sans-serif">

      <!-- En-tête -->
      <div style="text-align:center;margin-bottom:14px;padding-bottom:12px;border-bottom:2px solid #00897B">
        <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:#00897B">${shopNom}</div>
        <div style="font-size:11px;color:#999;margin-top:2px">${vente.date} à ${vente.heure}</div>
      </div>

      <!-- Photo -->
      ${photo ? `
        <div style="border-radius:10px;overflow:hidden;margin-bottom:12px;border:1px solid #f0f0f0">
          <img src="${photo}" style="width:100%;max-height:160px;object-fit:cover">
          <div style="padding:4px 10px;background:#f8fafb;font-size:10px;color:#888;text-align:center">📷 Photo de la vente</div>
        </div>
      ` : ''}

      <!-- Client -->
      ${vente.client ? `
        <div style="background:#f8fafb;border-left:3px solid #00897B;border-radius:0 8px 8px 0;padding:8px 12px;margin-bottom:12px">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#00897B;margin-bottom:2px">Client</div>
          <div style="font-size:14px;font-weight:700;color:#111">${vente.client}</div>
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
          ${vente.items.map((item, i) => `
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
      <div style="text-align:center;font-size:12px;color:#888;margin-bottom:8px">
        Paiement : <strong>${(vente.modePaiement || '').toUpperCase()}</strong>
        ${vente.vendeur ? ' · Vendeur : ' + vente.vendeur : ''}
      </div>

      <!-- Footer -->
      <div style="text-align:center;font-size:12px;color:#aaa;padding-top:10px;border-top:1px solid #f0f0f0">
        ${shopFooter}
      </div>
    </div>
  `;

  const zone = document.getElementById('recu-preview-wrap');
  if (zone) zone.innerHTML = recuHTML;

  // Ouvrir le modal reçu
  document.getElementById('modal-recu')?.classList.add('open');
}

function partagerRecuWA() {
  if (!lastVente) return;

  const v        = lastVente;
  const shopNom  = DB.get('shopname')   || 'Ma Boutique';
  const footer   = DB.get('shopfooter') || 'Merci pour votre achat !';

  const lignes = (v.items || []).map(i =>
    '  • ' + i.nom + ' × ' + i.qte + ' — ' + Number(i.prix * i.qte).toLocaleString('fr-SN') + ' FCFA'
  ).join('\n');

  const msg = [
    '━━━━━━━━━━━━━━━━━',
    '🧾 *REÇU DE VENTE*',
    '━━━━━━━━━━━━━━━━━',
    '🏪 *' + shopNom + '*',
    '📅 ' + v.date + ' à ' + v.heure,
    v.client ? '👤 ' + v.client : '',
    '',
    '📦 *Articles :*',
    lignes,
    '',
    '━━━━━━━━━━━━━━━━━',
    '💰 *TOTAL : ' + fmt(v.total) + '*',
    '💳 ' + (v.modePaiement || '').toUpperCase(),
    '━━━━━━━━━━━━━━━━━',
    '_' + footer + '_',
  ].filter(Boolean).join('\n');

  const tel = v.clientTel ? v.clientTel.replace(/\D/g, '') : '';
  const url = tel
    ? 'https://wa.me/221' + tel + '?text=' + encodeURIComponent(msg)
    : 'https://wa.me/?text=' + encodeURIComponent(msg);

  window.open(url, '_blank');
}

// ════════════════════════════════════════
// PHOTO DE VENTE
// ════════════════════════════════════════

function prendrePhotoVente() {
  const input = document.getElementById('vente-photo-input');
  if (!input) return;
  input.setAttribute('capture', 'environment');
  input.click();
}

function importerPhotoVente() {
  const input = document.getElementById('vente-photo-input');
  if (!input) return;
  input.removeAttribute('capture');
  input.click();
}

function chargerPhotoVente(input) {
  if (!input.files || !input.files[0]) return;

  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const canvas  = document.createElement('canvas');
      let { width, height } = img;
      const MAX     = 800;
      if (width > MAX)  { height = Math.round(height * MAX / width);  width  = MAX; }
      if (height > MAX) { width  = Math.round(width  * MAX / height); height = MAX; }
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      ventePhotoData = canvas.toDataURL('image/jpeg', 0.75);

      const prev = document.getElementById('vente-photo-preview');
      const imgEl = document.getElementById('vente-photo-img');
      const zone  = document.getElementById('vente-photo-zone');
      if (imgEl) imgEl.src = ventePhotoData;
      if (prev)  prev.style.display = 'block';
      if (zone)  zone.style.display = 'none';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(input.files[0]);
}

function supprimerPhotoVente() {
  ventePhotoData = null;
  const prev  = document.getElementById('vente-photo-preview');
  const zone  = document.getElementById('vente-photo-zone');
  const input = document.getElementById('vente-photo-input');
  if (prev)  prev.style.display  = 'none';
  if (zone)  zone.style.display  = 'flex';
  if (input) input.value         = '';
}

// ════════════════════════════════════════
// SCAN PHOTO IA
// ════════════════════════════════════════

let scanStream = null;

function ouvrirScanPhoto() {
  document.getElementById('modal-scan')?.classList.add('open');
  _activerCamera();
}

async function _activerCamera() {
  try {
    scanStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
    const video = document.getElementById('scan-video');
    const placeholder = document.getElementById('scan-placeholder');
    if (video) { video.srcObject = scanStream; video.style.display = 'block'; }
    if (placeholder) placeholder.style.display = 'none';
  } catch {
    toast('Caméra non disponible — utilisez la galerie', 'error');
  }
}

function fermerScan() {
  if (scanStream) { scanStream.getTracks().forEach(t => t.stop()); scanStream = null; }
  const video = document.getElementById('scan-video');
  if (video) { video.style.display = 'none'; video.srcObject = null; }
  document.getElementById('scan-photo-preview')?.style.setProperty('display', 'none');
  document.getElementById('scan-result')?.style.setProperty('display', 'none');
  document.getElementById('scan-actions')?.style.setProperty('display', 'flex');
  document.getElementById('scan-placeholder')?.style.setProperty('display', 'block');
  document.getElementById('modal-scan')?.classList.remove('open');
}

function prendrePhotoScan() {
  const video  = document.getElementById('scan-video');
  const canvas = document.getElementById('scan-canvas');
  if (!video?.srcObject) { toast('Activez la caméra', 'error'); return; }
  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  _afficherPhotoScan(canvas.toDataURL('image/jpeg', 0.85));
}

function importerPhotoScan() {
  document.getElementById('scan-file-input')?.click();
}

function traiterImageFileScan(input) {
  if (!input.files || !input.files[0]) return;
  const reader = new FileReader();
  reader.onload = e => _afficherPhotoScan(e.target.result);
  reader.readAsDataURL(input.files[0]);
}

function _afficherPhotoScan(dataUrl) {
  const img  = document.getElementById('scan-photo-img');
  const prev = document.getElementById('scan-photo-preview');
  const acts = document.getElementById('scan-actions');
  const vid  = document.getElementById('scan-video');
  const ph   = document.getElementById('scan-placeholder');
  if (img)  img.src              = dataUrl;
  if (prev) prev.style.display   = 'block';
  if (acts) acts.style.display   = 'none';
  if (vid)  vid.style.display    = 'none';
  if (ph)   ph.style.display     = 'none';
}

function revenirScan() {
  document.getElementById('scan-photo-preview')?.style.setProperty('display', 'none');
  document.getElementById('scan-result')?.style.setProperty('display', 'none');
  document.getElementById('scan-actions')?.style.setProperty('display', 'flex');
  if (scanStream) {
    const vid = document.getElementById('scan-video');
    if (vid) vid.style.display = 'block';
  } else {
    document.getElementById('scan-placeholder')?.style.setProperty('display', 'block');
    _activerCamera();
  }
}

async function analyserPhotoScan() {
  const img = document.getElementById('scan-photo-img');
  if (!img?.src) return;

  const btn = document.getElementById('btn-analyser-scan');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Analyse en cours…'; }

  const base64   = img.src.split(',')[1];
  const shopNom  = DB.get('shopname') || 'boutique';
  const prodList = produits.map(p =>
    p.nom + ' (' + fmt(p.vente || p.prix_vente || 0) + ', stock: ' + p.stock + ')'
  ).join(', ');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
            { type: 'text', text: 'Tu es l\'assistant de caisse de la boutique "' + shopNom + '". Voici les produits disponibles: ' + prodList + '. Analyse la photo et identifie les produits qui correspondent. Réponds UNIQUEMENT en JSON: {"produits": [{"nom": "nom exact", "qte": 1, "prix": 0, "confiance": "haute|moyenne|faible"}], "message": "description"}' }
          ]
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Format invalide');
    _afficherResultatScan(JSON.parse(match[0]));

  } catch {
    _afficherFallbackScan();
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🔍 Analyser la photo'; }
  }
}

function _afficherResultatScan(result) {
  const zone     = document.getElementById('scan-result');
  const detected = document.getElementById('scan-detected-products');
  if (!zone || !detected) return;

  zone.style.display = 'block';

  if (!result.produits?.length) {
    detected.innerHTML = `
      <div style="font-size:13px;color:var(--muted);margin-bottom:6px">${result.message || 'Aucun produit reconnu'}</div>
      <div style="font-size:12px;color:var(--warn)">💡 Essayez avec une photo plus nette</div>
    `;
    return;
  }

  detected.innerHTML = result.produits.map(p => {
    const prod = produits.find(x =>
      x.nom.toLowerCase() === p.nom.toLowerCase() ||
      x.nom.toLowerCase().includes(p.nom.toLowerCase())
    );
    if (!prod) return '';

    const couleurConf = p.confiance === 'haute' ? 'var(--teal)' : p.confiance === 'moyenne' ? 'var(--warn)' : 'var(--muted)';
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px;background:rgba(255,255,255,0.04);border-radius:10px;margin-bottom:8px;border:1px solid rgba(0,200,150,0.15)">
        <div style="flex:1">
          <div style="font-size:14px;font-weight:600;color:var(--cream)">${prod.nom}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px">${fmt(prod.prix_vente || prod.vente || 0)} · Stock: ${prod.stock}</div>
          <div style="font-size:10px;color:${couleurConf};margin-top:3px;font-weight:600">● Confiance ${p.confiance}</div>
        </div>
        <button
          onclick="ajouterDepuisScan(${prod.id})"
          style="background:var(--teal);color:#0A1628;border:none;border-radius:8px;padding:7px 12px;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0"
        >+ Ajouter</button>
      </div>
    `;
  }).join('') || '<div style="font-size:13px;color:var(--muted)">Aucun produit correspondant trouvé</div>';

  if (result.message) {
    detected.innerHTML += `<div style="font-size:11px;color:var(--muted);margin-top:8px;font-style:italic">🤖 ${result.message}</div>`;
  }
}

function _afficherFallbackScan() {
  const zone     = document.getElementById('scan-result');
  const detected = document.getElementById('scan-detected-products');
  if (!zone || !detected) return;

  zone.style.display = 'block';
  detected.innerHTML = `
    <div style="font-size:13px;color:var(--muted);margin-bottom:10px">Sélectionnez manuellement :</div>
    <div style="max-height:200px;overflow-y:auto">
      ${produits.filter(p => p.stock > 0).map(p => `
        <div
          onclick="ajouterDepuisScan(${p.id})"
          style="padding:10px;background:rgba(255,255,255,0.04);border-radius:8px;margin-bottom:6px;cursor:pointer;border:1px solid var(--border)"
        >
          <span style="font-size:13px;font-weight:500">${p.nom}</span>
          <span style="font-size:12px;color:var(--teal);margin-left:8px">${fmt(p.prix_vente || p.vente || 0)}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function ajouterDepuisScan(prodId) {
  const prod = produits.find(p => p.id === prodId);
  if (!prod) return;
  addToCart(prodId);
  fermerScan();
  openModal('modal-vente');
  renderCart();
}
