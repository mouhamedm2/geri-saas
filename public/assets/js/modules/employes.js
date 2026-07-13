/**
 * GÉRI — Module Employés
 * Gestion équipe, clé d'invitation, accès
 */

'use strict';

// ════════════════════════════════════════
// RENDU
// ════════════════════════════════════════

function renderEmployes() {
  const inviteKey = DB.get('invite_key') || '—';

  return `
    <!-- Clé d'invitation -->
    <div style="background:linear-gradient(135deg,rgba(0,200,150,0.1),rgba(0,200,150,0.04));border:1px solid rgba(0,200,150,0.2);border-radius:14px;padding:18px;margin-bottom:14px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--teal);margin-bottom:10px">
        🔑 Clé d'invitation employés
      </div>
      <div style="font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:var(--cream);letter-spacing:4px;margin-bottom:8px">
        ${inviteKey}
      </div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:12px">
        Partagez cette clé avec vos employés pour qu'ils créent leur compte
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button
          onclick="copierCleInvitation()"
          style="background:var(--teal);color:var(--ink);border:none;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif"
        >📋 Copier</button>
        <button
          onclick="partagerCleWA()"
          style="background:#25D366;color:#fff;border:none;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif"
        >💬 WhatsApp</button>
        <button
          onclick="regenererCle()"
          style="background:rgba(255,255,255,0.06);border:1px solid var(--border);color:var(--muted);border-radius:8px;padding:9px 16px;font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif"
        >🔄 Nouvelle clé</button>
      </div>
    </div>

    <!-- Statistiques équipe -->
    <div class="stat-grid" style="margin-bottom:14px">
      <div class="stat-card">
        <div class="stat-label">Employés actifs</div>
        <div class="stat-val">${employes.length}</div>
        <div class="stat-sub">membres</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Ventes équipe</div>
        <div class="stat-val" style="color:var(--teal)">
          ${fmtShort(ventes.filter(v => v.vendeur).reduce((s, v) => s + v.total, 0))}
        </div>
        <div class="stat-sub">par les employés</div>
      </div>
    </div>

    <!-- Liste employés -->
    <div class="section-hd">
      <div class="section-title">Membres de l'équipe</div>
    </div>

    <div class="table-wrap" style="margin-bottom:14px">
      ${employes.length
        ? employes.map(e => `
            <div class="table-row" style="grid-template-columns:40px 1fr auto">
              <!-- Avatar -->
              <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--teal),var(--teal2));display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:var(--ink);flex-shrink:0">
                ${e.nom.charAt(0).toUpperCase()}
              </div>
              <div>
                <div class="prod-name">${e.nom}</div>
                <div class="prod-cat">${e.role || 'Vendeur'} · Accès: ${e.acces || 'ventes'}</div>
              </div>
              <div style="display:flex;gap:4px">
                <button
                  onclick="ouvrirModalEmploye(${e.id})"
                  style="background:var(--card);border:1px solid var(--border);color:var(--muted);width:30px;height:30px;border-radius:7px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center"
                >✏</button>
                <button
                  onclick="supprimerEmploye(${e.id})"
                  style="background:var(--danger-dim);border:1px solid rgba(255,90,90,0.2);color:var(--danger);width:30px;height:30px;border-radius:7px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center"
                >×</button>
              </div>
            </div>
          `).join('')
        : `<div class="empty"><p>Aucun employé — partagez la clé d'invitation</p></div>`
      }
    </div>

    <button
      class="btn-primary"
      onclick="ouvrirModalEmploye()"
    >
      + Ajouter un employé
    </button>
  `;
}

// ════════════════════════════════════════
// MODAL EMPLOYÉ
// ════════════════════════════════════════

let _employeEnCours = null;

function ouvrirModalEmploye(employeId) {
  const emp = employeId ? employes.find(e => e.id === employeId) : null;
  _employeEnCours = emp;

  const modal = document.getElementById('modal-employe');
  if (!modal) return;

  const titre = document.getElementById('modal-employe-title');
  if (titre) titre.textContent = emp ? 'Modifier l\'employé' : 'Ajouter un employé';

  _remplir('emp-nom',   emp?.nom   || '');
  _remplir('emp-role',  emp?.role  || 'Vendeur');
  _remplir('emp-acces', emp?.acces || 'ventes');

  modal.classList.add('open');
}

function sauvegarderEmploye() {
  const nom   = sanitize(document.getElementById('emp-nom')?.value.trim() || '');
  const role  = document.getElementById('emp-role')?.value  || 'Vendeur';
  const acces = document.getElementById('emp-acces')?.value || 'ventes';

  if (!nom) {
    toast('Le nom de l\'employé est obligatoire', 'error');
    return;
  }

  if (_employeEnCours) {
    Object.assign(_employeEnCours, { nom, role, acces, updatedAt: today() });
    toast('Employé mis à jour ✓', 'success');
  } else {
    employes.push({
      id:        genId(),
      nom, role, acces,
      createdAt: today(),
    });
    toast('Employé ajouté ✓', 'success');
  }

  save();
  document.getElementById('modal-employe')?.classList.remove('open');
  render();
}

function supprimerEmploye(employeId) {
  const emp = employes.find(e => e.id === employeId);
  if (!emp) return;
  if (!confirm('Supprimer l\'employé "' + emp.nom + '" ?')) return;

  employes = employes.filter(e => e.id !== employeId);
  save();
  toast('Employé supprimé', 'success');
  render();
}

// ════════════════════════════════════════
// CLÉ D'INVITATION
// ════════════════════════════════════════

function copierCleInvitation() {
  const key = DB.get('invite_key') || '';
  navigator.clipboard.writeText(key)
    .then(() => toast('Clé copiée ✓', 'success'))
    .catch(() => toast('Clé : ' + key, 'info'));
}

function partagerCleWA() {
  const key      = DB.get('invite_key') || '';
  const shopNom  = DB.get('shopname')   || 'Ma Boutique';
  const url      = location.origin + '/auth.html';

  const msg = [
    '🏪 *' + shopNom + '* vous invite à rejoindre l\'équipe sur Géri',
    '',
    '📱 *Comment s\'inscrire :*',
    '1. Ouvrez ' + url,
    '2. Cliquez sur "Employé"',
    '3. Entrez la clé d\'invitation : *' + key + '*',
    '',
    '_Application de gestion boutique Géri_',
  ].join('\n');

  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
}

function regenererCle() {
  if (!confirm('Générer une nouvelle clé ? L\'ancienne ne fonctionnera plus.')) return;

  const newKey = genInviteKey();
  DB.set('invite_key', newKey);

  // Mettre à jour dans Supabase si connecté
  if (_supabase && boutiqueId) {
    _supabase.from('boutiques')
      .update({ invite_key: newKey })
      .eq('id', boutiqueId)
      .then(() => toast('Nouvelle clé générée ✓', 'success'));
  } else {
    toast('Nouvelle clé générée ✓', 'success');
  }

  render();
}

// ════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════

function ajouterEmploye() {
  ouvrirModalEmploye();
}

function renderEmployesList() {
  const zone = document.getElementById('employes-list');
  if (!zone) return;

  zone.innerHTML = employes.length
    ? employes.map(e => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--card);border:1px solid var(--border);border-radius:10px;margin-bottom:8px">
          <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--teal),var(--teal2));display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-size:14px;font-weight:800;color:var(--ink);flex-shrink:0">
            ${e.nom.charAt(0).toUpperCase()}
          </div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:500;color:var(--cream)">${e.nom}</div>
            <div style="font-size:11px;color:var(--muted)">${e.role || 'Vendeur'}</div>
          </div>
          <button
            onclick="supprimerEmploye(${e.id})"
            style="background:var(--danger-dim);border:1px solid rgba(255,90,90,0.2);color:var(--danger);width:28px;height:28px;border-radius:6px;cursor:pointer;font-size:14px"
          >×</button>
        </div>
      `).join('')
    : '<div style="font-size:13px;color:var(--muted);text-align:center;padding:12px">Aucun employé</div>';
}

function _remplir(id, valeur) {
  const el = document.getElementById(id);
  if (el) el.value = valeur;
}
