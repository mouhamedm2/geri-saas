/**
 * GÉRI — Point d'entrée principal
 * Initialisation de l'application, navigation, état global
 */

'use strict';

// ════════════════════════════════════════
// CONFIGURATION SUPABASE
// ════════════════════════════════════════

const SUPABASE_URL     = 'https://hjbptsdhxqbitqdiybnf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqYnB0c2RoeHFiaXRxZGl5Ym5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MjE4OTAsImV4cCI6MjA5NjQ5Nzg5MH0.EyEc8qfskHGEtFTlj_ZeVN7s8U7xygRP7Szv9QB2Pjw';

// Client Supabase — initialisé après chargement du script
// (voir _waitForSupabase au bas du fichier)
let _supabase = null;

// ════════════════════════════════════════
// BASE DE DONNÉES LOCALE
// Wrapper autour de localStorage
// ════════════════════════════════════════

const DB = {
  get(key, def = null) {
    try {
      const val = localStorage.getItem('geri_' + key);
      return val !== null ? JSON.parse(val) : def;
    } catch {
      return def;
    }
  },
  set(key, val) {
    try {
      localStorage.setItem('geri_' + key, JSON.stringify(val));
    } catch (e) {
      console.warn('[DB] Erreur écriture:', key);
    }
  },
  remove(key) {
    localStorage.removeItem('geri_' + key);
  }
};

// ════════════════════════════════════════
// ÉTAT GLOBAL
// ════════════════════════════════════════

let produits    = DB.get('produits',  []);
let ventes      = DB.get('ventes',    []);
let dettes      = DB.get('dettes',    []);
let factures    = DB.get('factures',  []);
let employes    = DB.get('employes',  []);
let clients     = DB.get('clients',   []);

let boutiqueId     = sessionStorage.getItem('geri_boutique_id') || null;
let userId         = sessionStorage.getItem('geri_user_id')     || null;
let currentPage    = 'dashboard';
let cart           = [];
let lastVente      = null;
let facLignes      = [{ desc: '', qte: 1, prix: 0 }];
let currentFactureId = null;
let dashPeriod     = 7;
let facFiltreStatut  = 'tous';
let facSearch        = '';
let ventePhotoData   = null;
let _topCache        = null;
let _topCacheLen     = -1;
let _dashCache       = null;
let _dashCacheKey    = '';

// ════════════════════════════════════════
// UTILITAIRES
// ════════════════════════════════════════

const fmt     = n => Number(n || 0).toLocaleString('fr-SN') + ' FCFA';
const fmtShort = n => {
  const v = Number(n || 0);
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000)     return (v / 1_000).toFixed(0) + 'k';
  return String(v);
};

function today() {
  return new Date().toISOString().split('T')[0];
}

function now() {
  return new Date().toLocaleTimeString('fr-SN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function nowShort() {
  return new Date().toLocaleTimeString('fr-SN', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-SN');
  } catch {
    return dateStr;
  }
}

function sanitize(str) {
  if (typeof str !== 'string') return str;
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function sanitizeInput(str) {
  return sanitize(str);
}

function genId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function genInviteKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let key = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) key += '-';
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

function genNumFacture() {
  if (!factures.length) return 'FAC-001';
  const nums = factures.map(f => {
    const m = (f.num || '').match(/(\d+)$/);
    return m ? parseInt(m[1]) : 0;
  });
  return 'FAC-' + String(Math.max(...nums) + 1).padStart(3, '0');
}

// ════════════════════════════════════════
// TOAST
// ════════════════════════════════════════

let _toastTimer = null;

function toast(msg, type) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  if (_toastTimer) clearTimeout(_toastTimer);
  el.textContent = msg;
  el.className   = 'toast show ' + (type || '');
  _toastTimer    = setTimeout(() => el.classList.remove('show'), 2500);
}

function showToast(msg, type) {
  toast(msg, type);
}

// ════════════════════════════════════════
// SAUVEGARDE
// ════════════════════════════════════════

function save() {
  DB.set('produits',  produits);
  DB.set('ventes',    ventes);
  DB.set('dettes',    dettes);
  DB.set('factures',  factures);
  DB.set('employes',  employes);
  DB.set('clients',   clients);
  DB.set('lastSave',  new Date().toISOString());

  // Invalider le cache dashboard
  _dashCache    = null;
  _dashCacheKey = '';
  _topCache     = null;
  _topCacheLen  = -1;

  // Synchroniser avec Supabase en arrière-plan
  _syncSupabase();

  // Mettre à jour l'indicateur autosave
  const indicator = document.getElementById('autosave-indicator');
  if (indicator) {
    indicator.innerHTML = '• Sauvegardé';
    indicator.style.color = 'var(--teal)';
    setTimeout(() => {
      indicator.innerHTML = '<div class="autosave-dot"></div> Sauvegardé';
      indicator.style.color = 'var(--muted)';
    }, 1500);
  }
}

async function _syncSupabase() {
  if (!_supabase || !boutiqueId) return;
  try {
    // Sync produits uniquement (les plus importants)
    if (produits.length > 0) {
      await _supabase
        .from('produits')
        .upsert(
          produits.map(p => ({ ...p, boutique_id: boutiqueId })),
          { onConflict: 'id' }
        );
    }
  } catch (err) {
    console.warn('[Sync] Échec silencieux:', err.message);
  }
}

// ════════════════════════════════════════
// AUDIT LOG
// ════════════════════════════════════════

function auditLog(event, details = {}) {
  if (!_supabase) return;
  const uid = sessionStorage.getItem('geri_user_id');
  _supabase.from('audit_logs').insert({
    user_id: uid,
    event,
    details: { ...details, ts: new Date().toISOString() }
  }).catch(() => {});
}

// ════════════════════════════════════════
// NAVIGATION
// ════════════════════════════════════════

const PAGES = {
  dashboard:  { title: 'Tableau de bord',    action: 'Nouvelle vente'   },
  ventes:     { title: 'Ventes',             action: 'Enregistrer vente' },
  stock:      { title: 'Stock & Produits',   action: 'Ajouter produit'   },
  caisse:     { title: 'Caisse du jour',     action: 'Enregistrer vente' },
  rapport:    { title: 'Rapports',           action: 'Exporter CSV'      },
  dettes:     { title: 'Dettes clients',     action: 'Ajouter dette'     },
  factures:   { title: 'Factures',           action: 'Nouvelle facture'  },
  clients:    { title: 'Clients',            action: 'Ajouter client'    },
  employes:   { title: 'Employés',           action: 'Ajouter employé'   },
  parametres: { title: 'Paramètres boutique', action: ''                 },
};

function nav(page, el, bnavPage) {
  currentPage = page;

  // Mettre à jour sidebar
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // Mettre à jour bottom nav
  document.querySelectorAll('.bnav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // Mettre à jour topbar
  const config    = PAGES[page];
  const titleEl   = document.getElementById('topbar-title');
  const actionBtn = document.getElementById('topbar-action');

  if (titleEl && config)  titleEl.textContent  = config.title;
  if (actionBtn && config) {
    if (config.action) {
      actionBtn.textContent  = '+ ' + config.action;
      actionBtn.style.display = 'flex';
    } else {
      actionBtn.style.display = 'none';
    }
  }

  // Rendre le contenu
  render();

  // Scroller en haut
  const content = document.getElementById('content');
  if (content) content.scrollTop = 0;
}

function topbarAction() {
  if (currentPage === 'stock')      { ouvrirModalProduit(); return; }
  if (currentPage === 'dettes')     { openModal('modal-dette'); return; }
  if (currentPage === 'factures')   { ouvrirNouvelleFacture(); return; }
  if (currentPage === 'rapport')    { exporterCSV(); return; }
  if (currentPage === 'clients')    { openModalClient(); return; }
  if (currentPage === 'employes')   { ajouterEmploye(); return; }
  openModal('modal-vente');
}

// ════════════════════════════════════════
// RENDU
// ════════════════════════════════════════

function render() {
  const c = document.getElementById('content');
  if (!c) return;

  if (currentPage === 'dashboard') {
    const cacheKey = dashPeriod + '_' + ventes.length + '_' + produits.length;
    if (_dashCache && _dashCacheKey === cacheKey) {
      c.innerHTML = _dashCache;
      return;
    }
    c.innerHTML = renderSkeleton();
    requestAnimationFrame(() => {
      const html    = renderDashboard();
      _dashCache    = html;
      _dashCacheKey = cacheKey;
      c.innerHTML   = html;
    });
    return;
  }

  const renderers = {
    ventes:     renderVentes,
    stock:      renderStock,
    caisse:     renderCaisse,
    rapport:    renderRapport,
    dettes:     renderDettes,
    factures:   renderFactures,
    clients:    renderClients,
    employes:   renderEmployes,
    parametres: renderParametres,
  };

  const fn = renderers[currentPage];
  if (fn) c.innerHTML = fn();
}

function renderSkeleton() {
  return `
    <style>
      @keyframes sk { 0%,100%{opacity:1} 50%{opacity:.4} }
      .sk { animation: sk 1.2s ease-in-out infinite; }
      .skb { background:rgba(255,255,255,0.04); border:1px solid rgba(247,244,238,0.08); border-radius:12px; }
    </style>
    <div class="sk">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div class="skb" style="height:70px"></div>
        <div class="skb" style="height:70px"></div>
        <div class="skb" style="height:70px"></div>
        <div class="skb" style="height:70px"></div>
      </div>
      <div class="skb" style="height:160px;margin-bottom:12px"></div>
      <div class="skb" style="height:120px;margin-bottom:12px"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="skb" style="height:180px"></div>
        <div class="skb" style="height:180px"></div>
      </div>
    </div>
  `;
}

function invalidateDashCache() {
  _dashCache    = null;
  _dashCacheKey = '';
}

// ════════════════════════════════════════
// MODALS
// ════════════════════════════════════════

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('open');

  if (id === 'modal-vente') {
    renderCart();
    // Réinitialiser photo
    ventePhotoData = null;
    const zone  = document.getElementById('vente-photo-zone');
    const prev  = document.getElementById('vente-photo-preview');
    if (zone) zone.style.display = 'flex';
    if (prev) prev.style.display = 'none';
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('open');

  if (id === 'modal-vente') {
    cart = [];
    renderCart();
  }
}

// ════════════════════════════════════════
// VENTES — CHIFFRES
// ════════════════════════════════════════

function ventesAujourdhui() {
  return ventes.filter(v => v.date === today());
}

function caAujourdhui() {
  return ventesAujourdhui().reduce((s, v) => s + (v.total || 0), 0);
}

function beneficeAujourdhui() {
  return ventesAujourdhui().reduce((s, v) => s + (v.benefice || 0), 0);
}

// ════════════════════════════════════════
// STOCK — UTILITAIRES
// ════════════════════════════════════════

function stockBadge(p) {
  if (p.stock === 0) {
    return '<span class="badge badge-out">Rupture</span>';
  }
  const seuil = p.stock_min || p.alerte || 5;
  if (p.stock <= seuil) {
    return '<span class="badge badge-low">Stock bas</span>';
  }
  return '<span class="badge badge-ok">OK</span>';
}

// ════════════════════════════════════════
// DÉCONNEXION
// ════════════════════════════════════════

function seDeconnecter() {
  if (!confirm('Se déconnecter ?')) return;
  if (_supabase) _supabase.auth.signOut();
  sessionStorage.clear();
  window.location.href = 'auth.html';
}

// ════════════════════════════════════════
// EXPORT CSV
// ════════════════════════════════════════

function exporterCSV() {
  const rows = [['Date', 'Client', 'Produits', 'Total', 'Mode paiement', 'Vendeur']];
  ventes.forEach(v => {
    rows.push([
      v.date,
      v.client || '—',
      (v.items || []).map(i => i.nom + '(x' + i.qte + ')').join(' / '),
      v.total,
      v.modePaiement || '—',
      v.vendeur || '—'
    ]);
  });

  const csv  = rows.map(r => r.map(c => '"' + String(c || '').replace(/"/g, '""') + '"').join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');

  a.href     = url;
  a.download = 'geri-ventes-' + today() + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);

  toast('Export CSV téléchargé ✓', 'success');
}

// ════════════════════════════════════════
// RECHERCHE GLOBALE
// ════════════════════════════════════════

function toggleSearch() {
  let bar = document.getElementById('global-search-bar');
  if (bar) { bar.remove(); return; }

  bar         = document.createElement('div');
  bar.id      = 'global-search-bar';
  bar.style.cssText = 'position:fixed;top:56px;left:0;right:0;z-index:200;background:#1C2E4A;border-bottom:1px solid rgba(247,244,238,0.08);padding:10px 16px';
  bar.innerHTML = `
    <input
      id="global-search-input"
      autofocus
      placeholder="Rechercher produit, client, vente..."
      style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(247,244,238,0.08);border-radius:10px;padding:10px 14px;color:#F7F4EE;font-family:'DM Sans',sans-serif;font-size:14px;outline:none"
      oninput="searchGlobal(this.value)"
      onkeydown="if(event.key==='Escape')toggleSearch()"
    >
    <div id="search-results" style="margin-top:8px;max-height:300px;overflow-y:auto"></div>
  `;

  document.body.appendChild(bar);
  document.getElementById('global-search-input')?.focus();
}

function searchGlobal(q) {
  if (!q || q.length < 2) {
    document.getElementById('search-results').innerHTML = '';
    return;
  }

  const ql  = q.toLowerCase();
  const res = [];

  const colors = {
    Produit:  '#00C896',
    Client:   '#F5C842',
    Vente:    '#64B5F6',
    Facture:  '#CE93D8'
  };

  produits
    .filter(p => p.nom.toLowerCase().includes(ql))
    .forEach(p => res.push({
      type:   'Produit',
      label:  p.nom,
      sub:    fmt(p.vente) + ' · stock: ' + p.stock,
      action: "nav('stock',null,'stock')"
    }));

  clients
    .filter(c => c.nom.toLowerCase().includes(ql) || (c.tel || '').includes(ql))
    .forEach(c => res.push({
      type:   'Client',
      label:  c.nom,
      sub:    c.tel || '—',
      action: "nav('clients',null,'clients')"
    }));

  [...ventes]
    .reverse()
    .filter(v => (v.items || []).some(i => i.nom.toLowerCase().includes(ql)))
    .slice(0, 5)
    .forEach(v => res.push({
      type:   'Vente',
      label:  (v.items || []).map(i => i.nom).join(', '),
      sub:    fmt(v.total) + ' · ' + v.date,
      action: "nav('ventes',null,'ventes')"
    }));

  factures
    .filter(f => f.client.toLowerCase().includes(ql) || f.num.toLowerCase().includes(ql))
    .forEach(f => res.push({
      type:   'Facture',
      label:  f.num + ' — ' + f.client,
      sub:    fmt(f.total),
      action: "nav('factures',null,'factures')"
    }));

  document.getElementById('search-results').innerHTML = res.length
    ? res.slice(0, 8).map(r => `
        <div
          onclick="${r.action};toggleSearch()"
          style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;cursor:pointer"
          onmouseover="this.style.background='rgba(255,255,255,0.05)'"
          onmouseout="this.style.background=''"
        >
          <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:${colors[r.type]};background:rgba(255,255,255,0.05);padding:2px 6px;border-radius:4px;white-space:nowrap">
            ${r.type}
          </span>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:500;color:#F7F4EE">${r.label}</div>
            <div style="font-size:11px;color:rgba(247,244,238,0.5)">${r.sub}</div>
          </div>
        </div>
      `).join('')
    : '<div style="padding:12px;font-size:13px;color:rgba(247,244,238,0.5);text-align:center">Aucun résultat pour "' + q + '"</div>';
}

// ════════════════════════════════════════
// INITIALISATION
// ════════════════════════════════════════

async function initApp() {
  // Vérifier la session Supabase
  try {
    const { data: { session }, error } = await _supabase.auth.getSession();

    if (error || !session) {
      // Aucune session valide → rediriger vers auth
      sessionStorage.clear();
      window.location.href = 'auth.html';
      return;
    }
  } catch (err) {
    // Erreur Supabase → rediriger vers auth
    console.error('[Auth] Erreur session:', err);
    sessionStorage.clear();
    window.location.href = 'auth.html';
    return;
  }

  // Session valide — continuer
  const { data: { session } } = await _supabase.auth.getSession();

  // Écouter les changements d'auth
  _supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
      window.location.href = 'auth.html';
    }
  });

  // Sauvegarder la session
  sessionStorage.setItem('geri_user_id', session.user.id);
  sessionStorage.setItem('geri_email',   session.user.email);
  userId = session.user.id;

  // Vérifier si c'est un employé
  const { data: empAccount } = await _supabase
    .from('employe_accounts')
    .select('*')
    .eq('user_id', session.user.id)
    .single();

  if (empAccount) {
    window.location.href = 'employe.html';
    return;
  }

  // Charger la boutique
  const { data: boutique } = await _supabase
    .from('boutiques')
    .select('*')
    .eq('user_id', session.user.id)
    .single();

  if (boutique) {
    boutiqueId = boutique.id;
    sessionStorage.setItem('geri_boutique_id', boutiqueId);

    // Sauvegarder les infos boutique
    DB.set('shopname',    boutique.nom);
    DB.set('shoptel',     boutique.tel     || '');
    DB.set('shopville',   boutique.ville   || '');
    DB.set('shopadresse', boutique.adresse || '');
    DB.set('shopfooter',  boutique.footer_recu || 'Merci pour votre achat !');
    DB.set('shopplan',    boutique.plan    || 'pro');
    DB.set('invite_key',  boutique.invite_key || '');

    // Générer une clé d'invitation si absente
    if (!boutique.invite_key) {
      const newKey = genInviteKey();
      DB.set('invite_key', newKey);
      await _supabase
        .from('boutiques')
        .update({ invite_key: newKey })
        .eq('id', boutiqueId);
    }

    // Vérifier l'expiration du plan
    await checkPlanExpiry(boutique, session.user.email);
  }

  _demarrerApp(boutique);
}

function _demarrerApp(boutique) {
  const shopName = boutique?.nom || DB.get('shopname') || 'Ma Boutique';

  // Mettre à jour le topbar
  const nameEl   = document.getElementById('shop-name-disp');
  const avatarEl = document.getElementById('shop-avatar');
  const dateEl   = document.getElementById('topbar-date');

  if (nameEl)   nameEl.textContent   = shopName;
  if (avatarEl) avatarEl.textContent = shopName.charAt(0).toUpperCase();
  if (dateEl)   dateEl.textContent   = new Date().toLocaleDateString('fr-SN', {
    weekday: 'short',
    day: 'numeric',
    month: 'long'
  });

  // Détecter le retour après paiement
  const params = new URLSearchParams(location.search);
  if (params.get('payment') === 'success') {
    history.replaceState({}, '', 'app.html');
    setTimeout(() => toast('🎉 Paiement confirmé ! Votre plan est activé.', 'success'), 1000);
  }

  // Rendre le dashboard
  nav('dashboard');
}

// ════════════════════════════════════════
// VÉRIFICATION PLAN
// ════════════════════════════════════════

async function checkPlanExpiry(boutique, email) {
  if (!boutique.plan_expire_at) return;

  const expire   = new Date(boutique.plan_expire_at);
  const now      = new Date();
  const daysLeft = Math.ceil((expire - now) / (1000 * 60 * 60 * 24));

  sessionStorage.setItem('geri_days_left', daysLeft);

  if (daysLeft <= 0) {
    // Expiré → afficher le paywall
    await _supabase.auth.signOut();
    window.location.href = 'paiement.html?expired=1';
    return;
  }

  if (daysLeft <= 2) {
    const lastReminder = localStorage.getItem('geri_reminder_sent');
    const todayStr     = new Date().toDateString();
    if (lastReminder !== todayStr) {
      localStorage.setItem('geri_reminder_sent', todayStr);
      _afficherRappelPaiement(daysLeft, email);
    }
  }

  if (daysLeft <= 5) {
    _afficherBanniereEssai(daysLeft);
  }
}

function _afficherBanniereEssai(daysLeft) {
  const existing = document.getElementById('trial-banner');
  if (existing) return;

  const banner = document.createElement('div');
  banner.id    = 'trial-banner';
  banner.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:999',
    'background:linear-gradient(90deg,#F5C842,#f0b800)',
    'color:#0A1628', 'padding:10px 16px',
    'display:flex', 'align-items:center', 'justify-content:space-between',
    'font-size:13px', 'font-weight:600'
  ].join(';');

  banner.innerHTML = `
    <span>⏰ Il vous reste <strong>${daysLeft} jour${daysLeft > 1 ? 's' : ''}</strong> d'essai gratuit</span>
    <button
      onclick="window.location.href='paiement.html'"
      style="background:#0A1628;color:#F5C842;border:none;border-radius:6px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer"
    >Passer Pro →</button>
  `;

  document.body.prepend(banner);

  const topbar = document.querySelector('.topbar');
  if (topbar) topbar.style.top = '40px';

  const content = document.getElementById('content');
  if (content) content.style.marginTop = (56 + 40) + 'px';
}

function _afficherRappelPaiement(daysLeft, email) {
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;padding:20px';

  modal.innerHTML = `
    <div style="background:#1C2E4A;border:1px solid rgba(245,200,66,0.3);border-radius:16px;padding:28px;max-width:380px;width:100%;text-align:center">
      <div style="font-size:40px;margin-bottom:12px">⏰</div>
      <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:#F5C842;margin-bottom:8px">
        ${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''}
      </div>
      <p style="font-size:14px;color:rgba(247,244,238,0.7);margin-bottom:20px;line-height:1.6">
        Votre période d'essai se termine bientôt.<br>
        Passez Pro pour continuer sans interruption.
      </p>
      <button
        onclick="window.location.href='paiement.html?plan=pro'"
        style="width:100%;background:#00C896;color:#0A1628;border:none;border-radius:10px;padding:13px;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:10px"
      >Passer Pro — 4 900 FCFA/mois →</button>
      <button
        onclick="this.closest('div[style*=inset]').remove()"
        style="width:100%;background:transparent;color:rgba(247,244,238,0.5);border:1px solid rgba(247,244,238,0.1);border-radius:10px;padding:11px;font-size:13px;cursor:pointer"
      >Continuer l'essai</button>
    </div>
  `;

  document.body.appendChild(modal);
}

// ════════════════════════════════════════
// DÉMARRAGE
// ════════════════════════════════════════

// Attendre que Supabase soit disponible (chargé en defer)
function _waitForSupabase(callback, attempts = 0) {
  if (window.supabase) {
    // Supabase disponible — initialiser le client
    window.__supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    callback();
  } else if (attempts < 20) {
    // Réessayer toutes les 100ms (max 2 secondes)
    setTimeout(() => _waitForSupabase(callback, attempts + 1), 100);
  } else {
    // Timeout — vérifier session locale
    console.warn('[App] Supabase timeout — vérification session locale');
    const userId = sessionStorage.getItem('geri_user_id');
    if (!userId) {
      window.location.href = 'auth.html';
    } else {
      _demarrerApp({ nom: DB.get('shopname') || 'Ma Boutique' });
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  _waitForSupabase(initApp);
});
