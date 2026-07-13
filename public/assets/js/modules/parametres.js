/**
 * GÉRI — Module Paramètres
 * Configuration boutique, visuel, données, compte
 */

'use strict';

let _paramOnglet = 'boutique';

// ════════════════════════════════════════
// RENDU
// ════════════════════════════════════════

function renderParametres() {
  const plan     = DB.get('shopplan')  || 'pro';
  const daysLeft = parseInt(sessionStorage.getItem('geri_days_left') || '7');
  const lastSave = DB.get('lastSave');
  const lastSaveStr = lastSave
    ? new Date(lastSave).toLocaleString('fr-SN')
    : 'Jamais';

  const planNames  = { gratuit: 'Gratuit', pro: 'Pro', business: 'Business' };
  const planColors = { gratuit: 'var(--muted)', pro: 'var(--teal)', business: 'var(--gold)' };

  // Pré-remplir les champs après rendu
  setTimeout(() => {
    _remplir('set-shopname',  DB.get('shopname')    || '');
    _remplir('set-tel',       DB.get('shoptel')     || '');
    _remplir('set-ville',     DB.get('shopville')   || '');
    _remplir('set-adresse',   DB.get('shopadresse') || '');
    _remplir('set-footer',    DB.get('shopfooter')  || '');
    _remplir('set-horaires',  DB.get('shophoraires')|| '');

    const devise = document.getElementById('set-devise');
    if (devise) devise.value = DB.get('shopdevise') || 'FCFA';

    const logo = DB.get('shoplogo');
    if (logo) {
      const prev = document.getElementById('logo-preview');
      const av   = document.getElementById('logo-avatar');
      if (prev) { prev.src = logo; prev.style.display = 'block'; }
      if (av)   av.style.display = 'none';
    }

    renderEmployesList();
  }, 0);

  return `
    <!-- Header plan -->
    <div style="background:linear-gradient(135deg,rgba(0,200,150,0.08),rgba(0,200,150,0.02));border:1px solid rgba(0,200,150,0.15);border-radius:14px;padding:16px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between">
      <div>
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">Votre plan actuel</div>
        <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:${planColors[plan] || 'var(--teal)'}">
          ${planNames[plan] || 'Pro'}
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:3px">
          ${daysLeft > 0 ? daysLeft + ' jour(s) restant(s)' : 'Actif'}
        </div>
      </div>
      <button
        onclick="window.location.href='paiement.html'"
        style="background:var(--teal);color:var(--ink);border:none;border-radius:10px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif"
      >
        ${plan === 'gratuit' ? '⬆ Passer Pro' : '🔄 Renouveler'}
      </button>
    </div>

    <!-- Onglets -->
    <div style="display:flex;gap:4px;background:rgba(255,255,255,0.04);border-radius:10px;padding:4px;margin-bottom:14px;overflow-x:auto" id="param-tabs">
      ${[
        ['boutique',      '🏪'],
        ['visuel',        '🎨'],
        ['employes',      '👥'],
        ['notifications', '🔔'],
        ['donnees',       '💾'],
        ['compte',        '👤'],
      ].map(([id, icon]) => `
        <button
          onclick="switchParamTab('${id}')"
          id="ptab-${id}"
          style="flex:1;padding:8px 4px;border:none;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;white-space:nowrap;min-width:40px;
                 background:${_paramOnglet === id ? 'var(--teal)' : 'transparent'};
                 color:${_paramOnglet === id ? 'var(--ink)' : 'var(--muted)'}"
        >${icon}</button>
      `).join('')}
    </div>

    <!-- ── Boutique ── -->
    <div id="ptab-content-boutique" style="display:${_paramOnglet === 'boutique' ? '' : 'none'}">
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:12px">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--teal);margin-bottom:14px">Informations générales</div>

        <div class="form-group">
          <label class="form-label">Nom de la boutique *</label>
          <input class="form-input" id="set-shopname" placeholder="ex: Boutique Aminata">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="form-group">
            <label class="form-label">Téléphone WhatsApp</label>
            <input class="form-input" id="set-tel" placeholder="7X XXX XX XX" type="tel">
          </div>
          <div class="form-group">
            <label class="form-label">Ville / Quartier</label>
            <input class="form-input" id="set-ville" placeholder="ex: Dakar, Sandaga">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Adresse complète</label>
          <input class="form-input" id="set-adresse" placeholder="ex: 12 Rue Blanchot, Plateau">
        </div>
        <div class="form-group">
          <label class="form-label">Horaires d'ouverture</label>
          <input class="form-input" id="set-horaires" placeholder="ex: Lun-Sam 8h-20h">
        </div>
        <div class="form-group">
          <label class="form-label">Devise</label>
          <select class="form-input form-select" id="set-devise" style="background:rgba(255,255,255,0.05)">
            <option value="FCFA">FCFA (Franc CFA)</option>
            <option value="EUR">EUR (Euro)</option>
            <option value="USD">USD (Dollar US)</option>
            <option value="GNF">GNF (Franc Guinéen)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Message pied de reçu / facture</label>
          <input class="form-input" id="set-footer" placeholder="ex: Merci pour votre fidélité !">
        </div>
        <button class="btn-primary" onclick="sauvegarderParametres()">✓ Enregistrer</button>
      </div>

      <!-- Stats boutique -->
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:14px">Statistiques boutique</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
          ${[
            ['Produits',  produits.length,                          'var(--teal)'],
            ['Ventes',    ventes.length,                            'var(--cream)'],
            ['Clients',   clients.length,                           '#64B5F6'],
            ['Factures',  factures.length,                          'var(--gold)'],
            ['Dettes',    dettes.filter(d=>!d.payee).length,        'var(--warn)'],
            ['Employés',  employes.length,                          'var(--teal)'],
          ].map(([label, val, color]) => `
            <div style="background:rgba(255,255,255,0.03);border-radius:10px;padding:12px;text-align:center">
              <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:${color}">${val}</div>
              <div style="font-size:10px;color:var(--muted);margin-top:3px;text-transform:uppercase;letter-spacing:.05em">${label}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- ── Visuel ── -->
    <div id="ptab-content-visuel" style="display:${_paramOnglet === 'visuel' ? '' : 'none'}">
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:12px">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--teal);margin-bottom:14px">Logo de la boutique</div>
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:14px">
          <div id="logo-avatar" style="width:64px;height:64px;border-radius:14px;background:linear-gradient(135deg,var(--teal),var(--teal2));display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:var(--ink);flex-shrink:0">
            ${(DB.get('shopname') || 'G').charAt(0).toUpperCase()}
          </div>
          <img id="logo-preview" style="width:64px;height:64px;border-radius:14px;object-fit:cover;display:none;flex-shrink:0">
          <div>
            <div style="font-size:13px;color:var(--cream);margin-bottom:4px">Photo ou logo de votre boutique</div>
            <div style="font-size:11px;color:var(--muted)">Apparaît sur vos factures PDF</div>
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <button
            onclick="document.getElementById('logo-input').click()"
            style="flex:1;background:var(--teal);color:var(--ink);border:none;border-radius:9px;padding:11px;font-size:13px;font-weight:700;cursor:pointer"
          >📷 Choisir une photo</button>
          <button
            onclick="supprimerLogo()"
            style="background:rgba(255,90,90,0.08);border:1px solid rgba(255,90,90,0.2);color:var(--danger);border-radius:9px;padding:11px 14px;font-size:13px;cursor:pointer"
          >✕</button>
        </div>
        <input type="file" id="logo-input" accept="image/*" style="display:none" onchange="chargerLogo(this)">
      </div>

      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--teal);margin-bottom:14px">Couleur principale</div>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">
          ${[
            ['#00C896', 'Teal'],
            ['#3B82F6', 'Bleu'],
            ['#F59E0B', 'Or'],
            ['#EF4444', 'Rouge'],
            ['#8B5CF6', 'Violet'],
          ].map(([color, name]) => `
            <div
              onclick="changerCouleur('${color}')"
              title="${name}"
              style="height:44px;border-radius:10px;background:${color};cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid ${DB.get('shopcolor') === color ? '#fff' : 'transparent'};transition:all .15s"
            >${DB.get('shopcolor') === color ? '✓' : ''}</div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- ── Équipe ── -->
    <div id="ptab-content-employes" style="display:${_paramOnglet === 'employes' ? '' : 'none'}">
      <div style="background:linear-gradient(135deg,rgba(0,200,150,0.08),rgba(0,200,150,0.04));border:1px solid rgba(0,200,150,0.2);border-radius:14px;padding:16px;margin-bottom:12px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--teal);margin-bottom:8px">🔑 Clé d'invitation</div>
        <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--cream);letter-spacing:4px;margin-bottom:6px">${DB.get('invite_key') || '—'}</div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:12px">Partagez cette clé à vos employés</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button onclick="copierCleInvitation()" style="background:var(--teal);color:var(--ink);border:none;border-radius:8px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer">📋 Copier</button>
          <button onclick="partagerCleWA()" style="background:#25D366;color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer">💬 WhatsApp</button>
          <button onclick="regenererCle()" style="background:rgba(255,255,255,0.06);color:var(--muted);border:1px solid var(--border);border-radius:8px;padding:8px 14px;font-size:12px;cursor:pointer">🔄 Nouvelle clé</button>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="font-size:13px;font-weight:600;color:var(--cream)">Équipe (${employes.length})</div>
        <button onclick="ouvrirModalEmploye()" style="background:rgba(0,200,150,0.1);border:1px solid rgba(0,200,150,0.2);color:var(--teal);padding:7px 14px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif">+ Ajouter</button>
      </div>
      <div id="employes-list"></div>
    </div>

    <!-- ── Alertes ── -->
    <div id="ptab-content-notifications" style="display:${_paramOnglet === 'notifications' ? '' : 'none'}">
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--teal);margin-bottom:14px">Alertes stock</div>
        ${[
          ['notif-stock-bas', 'Alerte stock faible', 'Notification quand un produit passe sous le seuil minimum'],
          ['notif-rupture',   'Alerte rupture',       'Notification immédiate quand un produit est en rupture'],
        ].map(([id, label, desc]) => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border)">
            <div>
              <div style="font-size:13px;font-weight:500;color:var(--cream)">${label}</div>
              <div style="font-size:11px;color:var(--muted);margin-top:2px">${desc}</div>
            </div>
            <label style="position:relative;display:inline-block;width:44px;height:24px;flex-shrink:0">
              <input type="checkbox" ${DB.get(id) !== '0' ? 'checked' : ''} onchange="toggleNotif('${id}',this.checked)" style="opacity:0;width:0;height:0">
              <span onclick="this.previousElementSibling.click()" style="position:absolute;inset:0;background:${DB.get(id) !== '0' ? 'var(--teal)' : 'rgba(255,255,255,0.1)'};border-radius:24px;cursor:pointer">
                <span style="position:absolute;top:3px;left:${DB.get(id) !== '0' ? '23px' : '3px'};width:18px;height:18px;background:#fff;border-radius:50%;transition:left .2s"></span>
              </span>
            </label>
          </div>
        `).join('')}

        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--teal);margin:16px 0 12px">Alertes dettes</div>
        ${[
          ['notif-dettes-wa', 'Relance WhatsApp', 'Générer un message de relance pour les dettes impayées'],
          ['notif-dette-seuil', 'Alerte haute dette', 'Notifier quand le total des dettes dépasse 50 000 FCFA'],
        ].map(([id, label, desc]) => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border)">
            <div>
              <div style="font-size:13px;font-weight:500;color:var(--cream)">${label}</div>
              <div style="font-size:11px;color:var(--muted);margin-top:2px">${desc}</div>
            </div>
            <label style="position:relative;display:inline-block;width:44px;height:24px;flex-shrink:0">
              <input type="checkbox" ${DB.get(id) !== '0' ? 'checked' : ''} onchange="toggleNotif('${id}',this.checked)" style="opacity:0;width:0;height:0">
              <span onclick="this.previousElementSibling.click()" style="position:absolute;inset:0;background:${DB.get(id) !== '0' ? 'var(--teal)' : 'rgba(255,255,255,0.1)'};border-radius:24px;cursor:pointer">
                <span style="position:absolute;top:3px;left:${DB.get(id) !== '0' ? '23px' : '3px'};width:18px;height:18px;background:#fff;border-radius:50%;transition:left .2s"></span>
              </span>
            </label>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- ── Données ── -->
    <div id="ptab-content-donnees" style="display:${_paramOnglet === 'donnees' ? '' : 'none'}">
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:12px">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--teal);margin-bottom:14px">Sauvegarde & Restauration</div>
        <div style="padding:12px;background:rgba(0,200,150,0.06);border-radius:10px;margin-bottom:14px;font-size:12px;color:var(--muted)">
          🕐 Dernière sauvegarde : <strong style="color:var(--cream)">${lastSaveStr}</strong>
        </div>
        <button onclick="sauvegarderManuel()" class="btn-primary" style="margin-bottom:8px">⬇ Télécharger sauvegarde (.json)</button>
        <button onclick="exportCSVVentes()" style="width:100%;background:rgba(0,200,150,0.08);border:1px solid rgba(0,200,150,0.2);color:var(--teal);border-radius:10px;padding:12px;font-size:13px;font-weight:600;cursor:pointer;margin-bottom:8px;font-family:'DM Sans',sans-serif">📊 Exporter ventes (.csv)</button>
        <button onclick="document.getElementById('restore-input').click()" style="width:100%;background:rgba(245,200,66,0.08);border:1px solid rgba(245,200,66,0.2);color:var(--gold);border-radius:10px;padding:12px;font-size:13px;font-weight:600;cursor:pointer;margin-bottom:14px;font-family:'DM Sans',sans-serif">⬆ Restaurer une sauvegarde</button>
        <input type="file" id="restore-input" accept=".json" style="display:none" onchange="restaurerDonnees(this)">
        <div style="padding:12px;background:rgba(255,169,64,0.08);border:1px solid rgba(255,169,64,0.2);border-radius:10px;font-size:12px;color:var(--warn)">
          ⚠️ Vos données sont dans ce navigateur. Sauvegardez régulièrement.
        </div>
      </div>
      <div style="background:rgba(255,90,90,0.04);border:1px solid rgba(255,90,90,0.15);border-radius:14px;padding:18px">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--danger);margin-bottom:10px">Zone dangereuse</div>
        <button onclick="reinitialiserDonnees()" class="btn-ghost" style="border-color:rgba(255,90,90,0.3);color:var(--danger)">🗑 Réinitialiser toutes les données</button>
      </div>
    </div>

    <!-- ── Compte ── -->
    <div id="ptab-content-compte" style="display:${_paramOnglet === 'compte' ? '' : 'none'}">
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:12px">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--teal);margin-bottom:14px">Mon compte</div>
        <div style="display:flex;align-items:center;gap:14px;padding:14px;background:rgba(255,255,255,0.03);border-radius:10px;margin-bottom:14px">
          <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--teal),var(--teal2));display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:var(--ink);flex-shrink:0">
            ${(DB.get('shopname') || 'G').charAt(0).toUpperCase()}
          </div>
          <div>
            <div style="font-size:15px;font-weight:600;color:var(--cream)">${DB.get('shopname') || 'Ma Boutique'}</div>
            <div style="font-size:12px;color:var(--muted)">${sessionStorage.getItem('geri_email') || '—'}</div>
            <div style="font-size:11px;color:${planColors[plan] || 'var(--teal)'};margin-top:3px;font-weight:600">Plan ${planNames[plan] || 'Pro'}</div>
          </div>
        </div>
        <button onclick="changerMotDePasse()" class="btn-ghost" style="margin-bottom:8px;text-align:left">🔑 Changer le mot de passe</button>
        <button onclick="ouvrirSupport()" class="btn-ghost" style="margin-bottom:8px;text-align:left">💬 Contacter le support</button>
        <button onclick="seDeconnecter()" style="width:100%;background:rgba(255,90,90,0.08);border:1px solid rgba(255,90,90,0.2);color:var(--danger);border-radius:10px;padding:12px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif">⎋ Se déconnecter</button>
      </div>

      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--teal);margin-bottom:12px">À propos</div>
        <div style="font-size:12px;color:var(--muted);line-height:1.8">
          <div>Version : <strong style="color:var(--cream)">1.0.0</strong></div>
          <div>Conçu pour le commerce sénégalais 🇸🇳</div>
          <div style="margin-top:8px"><a href="https://geri-saas.vercel.app" style="color:var(--teal)">geri-saas.vercel.app</a></div>
        </div>
      </div>
    </div>
  `;
}

// ════════════════════════════════════════
// ACTIONS
// ════════════════════════════════════════

function switchParamTab(tab) {
  _paramOnglet = tab;
  ['boutique', 'visuel', 'employes', 'notifications', 'donnees', 'compte'].forEach(t => {
    const content = document.getElementById('ptab-content-' + t);
    const btn     = document.getElementById('ptab-' + t);
    if (content) content.style.display = t === tab ? '' : 'none';
    if (btn) {
      btn.style.background = t === tab ? 'var(--teal)' : 'transparent';
      btn.style.color      = t === tab ? 'var(--ink)'  : 'var(--muted)';
    }
  });
  if (tab === 'employes') renderEmployesList();
}

function sauvegarderParametres() {
  DB.set('shopname',    document.getElementById('set-shopname')?.value.trim()  || '');
  DB.set('shoptel',     document.getElementById('set-tel')?.value.trim()       || '');
  DB.set('shopville',   document.getElementById('set-ville')?.value.trim()     || '');
  DB.set('shopadresse', document.getElementById('set-adresse')?.value.trim()   || '');
  DB.set('shopfooter',  document.getElementById('set-footer')?.value.trim()    || '');
  DB.set('shophoraires',document.getElementById('set-horaires')?.value.trim()  || '');
  DB.set('shopdevise',  document.getElementById('set-devise')?.value           || 'FCFA');

  // Mettre à jour la topbar
  const shopName = DB.get('shopname') || 'Ma Boutique';
  const nameEl   = document.getElementById('shop-name-disp');
  const avatarEl = document.getElementById('shop-avatar');
  if (nameEl)   nameEl.textContent   = shopName;
  if (avatarEl) avatarEl.textContent = shopName.charAt(0).toUpperCase();

  toast('Paramètres enregistrés ✓', 'success');
}

function chargerLogo(input) {
  if (!input.files || !input.files[0]) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX    = 300;
      let { width, height } = img;
      if (width > MAX)  { height = Math.round(height * MAX / width);  width  = MAX; }
      if (height > MAX) { width  = Math.round(width  * MAX / height); height = MAX; }
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      const data = canvas.toDataURL('image/jpeg', 0.8);
      DB.set('shoplogo', data);
      const prev = document.getElementById('logo-preview');
      const av   = document.getElementById('logo-avatar');
      if (prev) { prev.src = data; prev.style.display = 'block'; }
      if (av)   av.style.display = 'none';
      toast('Logo enregistré ✓', 'success');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(input.files[0]);
}

function supprimerLogo() {
  DB.set('shoplogo', '');
  const prev = document.getElementById('logo-preview');
  const av   = document.getElementById('logo-avatar');
  if (prev) prev.style.display = 'none';
  if (av)   av.style.display   = 'flex';
  toast('Logo supprimé', 'success');
}

function changerCouleur(color) {
  DB.set('shopcolor', color);
  document.documentElement.style.setProperty('--teal', color);
  toast('Couleur mise à jour ✓', 'success');
  render();
}

function toggleNotif(key, val) {
  DB.set(key, val ? '1' : '0');
  toast('Préférence enregistrée', 'success');
}

function sauvegarderManuel() {
  const data = {
    version:  '1.0.0',
    date:     new Date().toISOString(),
    produits, ventes, dettes, factures, employes, clients,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'geri-sauvegarde-' + today() + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
  DB.set('lastSave', new Date().toISOString());
  toast('Sauvegarde téléchargée ✓', 'success');
}

function restaurerDonnees(input) {
  if (!input.files || !input.files[0]) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.produits && !data.ventes) { toast('Fichier invalide', 'error'); return; }
      if (!confirm('Remplacer toutes vos données par cette sauvegarde ?')) return;

      if (data.produits)  { produits  = data.produits;  DB.set('produits',  produits);  }
      if (data.ventes)    { ventes    = data.ventes;    DB.set('ventes',    ventes);    }
      if (data.dettes)    { dettes    = data.dettes;    DB.set('dettes',    dettes);    }
      if (data.factures)  { factures  = data.factures;  DB.set('factures',  factures);  }
      if (data.employes)  { employes  = data.employes;  DB.set('employes',  employes);  }
      if (data.clients)   { clients   = data.clients;   DB.set('clients',   clients);   }

      render();
      toast('✓ Données restaurées !', 'success');
    } catch {
      toast('Erreur : fichier JSON invalide', 'error');
    }
  };
  reader.readAsText(input.files[0]);
  input.value = '';
}

function reinitialiserDonnees() {
  if (!confirm('⚠️ Supprimer TOUTES vos données ? Action irréversible.')) return;
  if (!confirm('Dernière confirmation — vraiment tout supprimer ?')) return;

  produits  = []; ventes = []; dettes = [];
  factures  = []; employes = []; clients = [];
  save();
  render();
  toast('Données réinitialisées', 'success');
}

function changerMotDePasse() {
  const email = sessionStorage.getItem('geri_email');
  if (!email) { toast('Email non trouvé', 'error'); return; }
  if (!confirm('Envoyer un lien de réinitialisation à ' + email + ' ?')) return;

  if (_supabase) {
    _supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://geri-saas.vercel.app/auth.html?reset=1'
    }).then(({ error }) => {
      if (error) toast('Erreur : ' + error.message, 'error');
      else toast('Email envoyé ! Vérifiez votre boîte mail', 'success');
    });
  }
}

function ouvrirSupport() {
  const boutique = DB.get('shopname') || '';
  const email    = sessionStorage.getItem('geri_email') || '';
  const msg      = 'Bonjour, j' + String.fromCharCode(39) + 'ai besoin d' + String.fromCharCode(39) + 'aide avec Géri.\n\nBoutique: ' + boutique + '\nEmail: ' + email;
  window.open('https://wa.me/221771332599?text=' + encodeURIComponent(msg), '_blank');
}

// ════════════════════════════════════════
// FACTURES — FONCTIONS GLOBALES
// ════════════════════════════════════════

function openPaymentModal() {
  window.location.href = 'paiement.html';
}

function _remplir(id, valeur) {
  const el = document.getElementById(id);
  if (el) el.value = valeur;
}
