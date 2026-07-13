/**
 * GÉRI — Module Clients
 * Gestion de la clientèle, historique achats
 */

'use strict';

let _rechercheClients = '';
let _clientEnCours    = null;

// ════════════════════════════════════════
// RENDU
// ════════════════════════════════════════

function renderClients() {
  const total     = clients.reduce((s, c) => s + (c.totalAchats || 0), 0);
  const filtres   = _rechercheClients
    ? clients.filter(c =>
        c.nom.toLowerCase().includes(_rechercheClients) ||
        (c.tel || '').includes(_rechercheClients)
      )
    : clients;

  return `
    <!-- Stats -->
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">Total clients</div>
        <div class="stat-val">${clients.length}</div>
        <div class="stat-sub">enregistrés</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">CA clients</div>
        <div class="stat-val" style="color:var(--teal)">${fmtShort(total)}</div>
        <div class="stat-sub">Total achats</div>
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
        placeholder="Rechercher un client…"
        value="${_rechercheClients}"
        oninput="filtrerClients(this.value)"
      >
    </div>

    <!-- Liste clients -->
    <div class="table-wrap">
      ${filtres.length
        ? [...filtres].reverse().map(c => `
            <div class="table-row" style="grid-template-columns:40px 1fr auto" onclick="ouvrirDetailClient(${c.id})">
              <!-- Avatar -->
              <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--teal),var(--teal2));display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:var(--ink);flex-shrink:0">
                ${c.nom.charAt(0).toUpperCase()}
              </div>
              <div style="min-width:0">
                <div class="prod-name">${c.nom}</div>
                <div class="prod-cat">
                  ${c.tel || '—'} · ${c.nbAchats || 0} achat${(c.nbAchats || 0) > 1 ? 's' : ''}
                </div>
              </div>
              <div style="text-align:right;flex-shrink:0">
                <div style="font-size:14px;font-weight:700;color:var(--teal)">${fmt(c.totalAchats || 0)}</div>
                <div style="font-size:10px;color:var(--muted);margin-top:2px">${c.derniereVisite || '—'}</div>
              </div>
            </div>
          `).join('')
        : `<div class="empty"><p>${_rechercheClients ? 'Aucun client trouvé' : 'Aucun client enregistré'}</p></div>`
      }
    </div>
  `;
}

// ════════════════════════════════════════
// MODAL CLIENT
// ════════════════════════════════════════

function openModalClient(clientId) {
  const client    = clientId ? clients.find(c => c.id === clientId) : null;
  _clientEnCours  = client;

  const modal = document.getElementById('modal-client');
  if (!modal) return;

  const titre = document.getElementById('modal-client-title');
  if (titre) titre.textContent = client ? 'Modifier client' : 'Nouveau client';

  _remplirChamp('client-nom',       client?.nom       || '');
  _remplirChamp('client-tel',       client?.tel       || '');
  _remplirChamp('client-email',     client?.email     || '');
  _remplirChamp('client-adresse',   client?.adresse   || '');
  _remplirChamp('client-note',      client?.note      || '');

  modal.classList.add('open');
}

function sauvegarderClient() {
  const nom     = sanitize(document.getElementById('client-nom')?.value.trim()   || '');
  const tel     = document.getElementById('client-tel')?.value.trim()            || '';
  const email   = document.getElementById('client-email')?.value.trim()          || '';
  const adresse = sanitize(document.getElementById('client-adresse')?.value.trim() || '');
  const note    = sanitize(document.getElementById('client-note')?.value.trim()  || '');

  if (!nom) {
    toast('Le nom du client est obligatoire', 'error');
    return;
  }

  if (_clientEnCours) {
    Object.assign(_clientEnCours, { nom, tel, email, adresse, note, updatedAt: today() });
    toast('Client mis à jour ✓', 'success');
  } else {
    clients.push({
      id:          genId(),
      nom, tel, email, adresse, note,
      totalAchats: 0,
      nbAchats:    0,
      createdAt:   today(),
    });
    toast('Client ajouté ✓', 'success');
  }

  save();
  document.getElementById('modal-client')?.classList.remove('open');
  render();
}

function supprimerClient(clientId) {
  const client = clients.find(c => c.id === clientId);
  if (!client) return;
  if (!confirm('Supprimer le client "' + client.nom + '" ?')) return;

  clients = clients.filter(c => c.id !== clientId);
  save();
  toast('Client supprimé', 'success');
  render();
}

function ouvrirDetailClient(clientId) {
  const client = clients.find(c => c.id === clientId);
  if (!client) return;

  const ventesClient = ventes.filter(v =>
    (v.client || '').toLowerCase() === client.nom.toLowerCase()
  );

  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id        = 'modal-client-detail-temp';

  modal.innerHTML = `
    <div class="modal">
      <div class="modal-handle"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div class="modal-title" style="margin:0">${client.nom}</div>
        <button
          onclick="document.getElementById('modal-client-detail-temp').remove()"
          class="modal-close"
        >×</button>
      </div>

      <!-- Infos client -->
      <div style="background:rgba(0,200,150,0.06);border:1px solid rgba(0,200,150,0.15);border-radius:12px;padding:14px;margin-bottom:14px">
        ${client.tel     ? `<div style="font-size:13px;margin-bottom:6px">📱 ${client.tel}</div>` : ''}
        ${client.email   ? `<div style="font-size:13px;margin-bottom:6px">✉ ${client.email}</div>` : ''}
        ${client.adresse ? `<div style="font-size:13px;margin-bottom:6px">📍 ${client.adresse}</div>` : ''}
        ${client.note    ? `<div style="font-size:13px;color:var(--muted);font-style:italic">${client.note}</div>` : ''}
      </div>

      <!-- Stats client -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px">
        <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px;text-align:center">
          <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:var(--teal)">${client.nbAchats || 0}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px">Achats</div>
        </div>
        <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px;text-align:center">
          <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:var(--cream)">${fmtShort(client.totalAchats || 0)}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px">CA total</div>
        </div>
        <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px;text-align:center">
          <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--cream)">${client.derniereVisite || '—'}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px">Dernière visite</div>
        </div>
      </div>

      <!-- Dernières ventes -->
      <div style="font-size:13px;font-weight:600;color:var(--cream);margin-bottom:8px">Dernières ventes</div>
      <div class="table-wrap" style="max-height:200px;overflow-y:auto">
        ${ventesClient.length
          ? [...ventesClient].reverse().slice(0, 10).map(v => `
              <div class="table-row" style="grid-template-columns:1fr auto">
                <div>
                  <div class="prod-name">${(v.items || []).map(i => i.nom).join(', ')}</div>
                  <div class="prod-cat">${v.date} · ${v.modePaiement}</div>
                </div>
                <div style="font-size:14px;font-weight:700;color:var(--teal)">${fmt(v.total)}</div>
              </div>
            `).join('')
          : '<div class="empty" style="padding:20px"><p>Aucune vente enregistrée</p></div>'
        }
      </div>

      <!-- Actions -->
      <div style="display:flex;gap:8px;margin-top:14px">
        ${client.tel ? `
          <a href="https://wa.me/221${client.tel.replace(/\D/g,'')}"
             target="_blank"
             style="flex:1;background:#25D366;color:#fff;border:none;border-radius:10px;padding:11px;font-size:13px;font-weight:700;cursor:pointer;text-align:center;text-decoration:none">
            💬 WhatsApp
          </a>
        ` : ''}
        <button
          onclick="document.getElementById('modal-client-detail-temp').remove(); openModalClient(${client.id})"
          style="flex:1;background:var(--card);border:1px solid var(--border);color:var(--cream);border-radius:10px;padding:11px;font-size:13px;cursor:pointer"
        >✏ Modifier</button>
        <button
          onclick="supprimerClient(${client.id});document.getElementById('modal-client-detail-temp').remove()"
          style="background:var(--danger-dim);border:1px solid rgba(255,90,90,0.2);color:var(--danger);border-radius:10px;padding:11px 14px;font-size:13px;cursor:pointer"
        >🗑</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

// ════════════════════════════════════════
// FILTRAGE
// ════════════════════════════════════════

function filtrerClients(recherche) {
  _rechercheClients = recherche.toLowerCase();
  const container   = document.getElementById('content');
  if (container) container.innerHTML = renderClients();
}

function _remplirChamp(id, valeur) {
  const el = document.getElementById(id);
  if (el) el.value = valeur;
}
