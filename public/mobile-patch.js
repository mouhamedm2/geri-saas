/**
 * GÉRI — Patch Mobile à injecter dans app.html
 * Copie ce bloc <script> juste avant </body> dans app.html
 * Il surcharge les fonctions de rendu existantes sur mobile
 */

// ════════════════════════════════════════
// SERVICE WORKER — MODE HORS LIGNE
// ════════════════════════════════════════

(function() {
  'use strict';

  // Enregistrer le Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          console.log('[Géri] Mode hors ligne activé');

          // Écouter la connexion rétablie
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data?.type === 'CONNEXION_RETABLIE') {
              _cacherHorsLigne();
              if (typeof toast === 'function') toast('🟢 Connexion rétablie');
            }
          });
        })
        .catch(err => console.warn('[Géri] SW non disponible:', err.message));
    });
  }

  // Détecter hors ligne
  window.addEventListener('online',  _cacherHorsLigne);
  window.addEventListener('offline', _afficherHorsLigne);
  if (!navigator.onLine) _afficherHorsLigne();

  let _badgeHorsLigne = null;

  function _afficherHorsLigne() {
    if (!_badgeHorsLigne) {
      _badgeHorsLigne = document.createElement('div');
      _badgeHorsLigne.style.cssText = [
        'position:fixed', 'top:60px', 'left:50%',
        'transform:translateX(-50%)',
        'background:rgba(255,140,66,0.92)',
        'color:#fff', 'font-size:12px', 'font-weight:600',
        'padding:6px 16px', 'border-radius:20px',
        'z-index:500', 'white-space:nowrap',
        'display:flex', 'align-items:center', 'gap:6px',
      ].join(';');
      _badgeHorsLigne.textContent = '📡 Mode hors ligne';
      document.body.appendChild(_badgeHorsLigne);
    }
    _badgeHorsLigne.style.display = 'flex';
  }

  function _cacherHorsLigne() {
    if (_badgeHorsLigne) _badgeHorsLigne.style.display = 'none';
  }

  // ════════════════════════════════════════
  // DÉTECTION MOBILE
  // ════════════════════════════════════════

  const EST_MOBILE = () => window.innerWidth <= 768;

  // ════════════════════════════════════════
  // DASHBOARD MOBILE
  // Surcharge renderDashboard() sur mobile
  // ════════════════════════════════════════

  // Sauvegarder la fonction desktop originale
  let _renderDashboardDesktop = null;

  function patcherDashboardMobile() {
    if (!EST_MOBILE()) return;

    _renderDashboardDesktop = window.renderDashboard;

    window.renderDashboard = function() {
      const dateAujourdui = new Date().toISOString().split('T')[0];
      const ventesJour    = ventes.filter(v => v.date === dateAujourdui);
      const caJour        = ventesJour.reduce((s, v) => s + (v.total || 0), 0);
      const nbTrans       = ventesJour.length;

      const caWave    = ventesJour.filter(v => v.modePaiement === 'wave').reduce((s,v) => s+v.total, 0);
      const caAttente = dettes.filter(d => !d.payee).reduce((s,d) => s+d.montant, 0);

      const hier      = new Date(); hier.setDate(hier.getDate() - 1);
      const dateHier  = hier.toISOString().split('T')[0];
      const caHier    = ventes.filter(v => v.date === dateHier).reduce((s,v) => s+(v.total||0), 0);
      const tendPct   = caHier > 0 ? Math.round((caJour - caHier) / caHier * 100) : 0;

      const alertes      = produits.filter(p => p.stock === 0 || p.stock <= (p.alerte || 5)).length;
      const nomBoutique  = DB.get('shopname') || 'Ma Boutique';
      const heure        = new Date().getHours();
      const salut        = heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon après-midi' : 'Bonsoir';
      const dernieres    = [...ventes].reverse().slice(0, 5);

      return `
        <div style="padding-bottom:4px">
          <div style="font-size:12px;color:rgba(240,237,232,0.5);margin-bottom:2px">${salut},</div>
          <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#F0EDE8;margin-bottom:14px">${nomBoutique}</div>
        </div>

        <!-- Card CA -->
        <div style="background:linear-gradient(135deg,#00C896 0%,#00a87a 100%);border-radius:20px;padding:20px;margin-bottom:14px;position:relative;overflow:hidden">
          <div style="position:absolute;top:-20px;right:-20px;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,0.08)"></div>
          <div style="font-size:12px;font-weight:600;color:rgba(10,22,40,0.65);margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em">Ventes aujourd'hui</div>
          <div style="font-family:'Syne',sans-serif;font-size:32px;font-weight:800;color:#0A1628;line-height:1;margin-bottom:6px">${_fmt(caJour)} FCFA</div>
          ${caHier > 0 ? `<div style="font-size:12px;font-weight:600;color:rgba(10,22,40,0.6)">${tendPct >= 0 ? '📈 +' : '📉 '}${tendPct}% vs hier</div>` : ''}
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:14px;padding-top:14px;border-top:1px solid rgba(10,22,40,0.15)">
            ${[
              ['Transactions', nbTrans],
              ['Wave reçu', _fmtShort(caWave)],
              ['En attente', _fmtShort(caAttente)],
            ].map(([label, val]) => `
              <div style="text-align:center">
                <div style="font-size:10px;color:rgba(10,22,40,0.55);text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px">${label}</div>
                <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:800;color:#0A1628">${val}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Actions rapides 2x2 -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
          ${[
            { icon:'🛒', bg:'rgba(0,200,150,0.15)',  title:'Nouvelle vente', sub:'Caisse rapide',    action:"nav('caisse',null,'caisse')" },
            { icon:'📦', bg:'rgba(74,158,255,0.15)',  title:'Stocks',        sub: alertes > 0 ? `⚠ ${alertes} alertes` : 'Tout est OK', action:"nav('stock',null,'stock')" },
            { icon:'🧾', bg:'rgba(245,200,66,0.15)',  title:'Factures',      sub:'Envoyer par Wave', action:"nav('factures',null,'factures')" },
            { icon:'📊', bg:'rgba(168,85,247,0.15)',  title:'Rapports',      sub:'Semaine, mois',    action:"nav('rapport',null,'rapport')" },
          ].map(a => `
            <div onclick="${a.action}" style="background:#1a2535;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:16px;cursor:pointer;transition:transform .15s;-webkit-tap-highlight-color:transparent" ontouchstart="this.style.transform='scale(0.96)'" ontouchend="this.style.transform=''">
              <div style="width:40px;height:40px;border-radius:12px;background:${a.bg};display:flex;align-items:center;justify-content:center;font-size:20px;margin-bottom:10px">${a.icon}</div>
              <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:#F0EDE8;margin-bottom:2px">${a.title}</div>
              <div style="font-size:11px;color:rgba(240,237,232,0.5)">${a.sub}</div>
            </div>
          `).join('')}
        </div>

        <!-- Dernières transactions -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:700;color:#F0EDE8">Dernières transactions</div>
          <div style="font-size:12px;color:#00C896;cursor:pointer" onclick="nav('ventes',null,'ventes')">Voir tout</div>
        </div>

        ${dernieres.length ? dernieres.map(v => {
          const items = (v.items || []).map(i => i.nom).join(', ') || '—';
          const mode  = v.modePaiement || 'especes';
          const emoji = mode === 'wave' ? '💸' : mode === 'orange' ? '🟠' : mode === 'credit' ? '💳' : '💵';
          return `
            <div onclick="voirDetailVente(${v.id})" style="display:flex;align-items:center;gap:12px;background:#1a2535;border-radius:12px;padding:12px 14px;margin-bottom:8px;border:1px solid rgba(255,255,255,0.07);cursor:pointer">
              <div style="width:38px;height:38px;border-radius:10px;background:rgba(0,200,150,0.12);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${emoji}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:600;color:#F0EDE8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${items}</div>
                <div style="font-size:11px;color:rgba(240,237,232,0.5);margin-top:2px">${v.heure || ''} · ${mode}</div>
              </div>
              <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:#00C896;flex-shrink:0">+${_fmt(v.total)}</div>
            </div>
          `;
        }).join('') : `
          <div style="text-align:center;padding:32px 16px;color:rgba(240,237,232,0.35);font-size:14px">
            Aucune vente aujourd'hui
          </div>
        `}
      `;
    };
  }

  // ════════════════════════════════════════
  // CAISSE MOBILE — grille de produits
  // ════════════════════════════════════════

  function patcherCaisseMobile() {
    if (!EST_MOBILE()) return;

    const _origCaisse = window.renderCaisse;
    window.renderCaisse = function() {
      const prodsEnStock = produits.filter(p => p.stock > 0);

      return `
        <div style="position:relative;margin-bottom:12px">
          <svg style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:rgba(240,237,232,0.35)" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.4"/>
            <path d="M12 12l2.5 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          </svg>
          <input
            style="width:100%;background:#1a2535;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:11px 14px 11px 40px;color:#F0EDE8;font-family:'DM Sans',sans-serif;font-size:14px;outline:none"
            placeholder="Rechercher un produit…"
            oninput="filtrerProduitsCaisse(this.value)"
            id="caisse-search-m"
          >
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:80px" id="mobile-prod-grid">
          ${prodsEnStock.length ? prodsEnStock.map(p => {
            const qte    = cart.find(i => i.id === p.id)?.qte || 0;
            const emoji  = _emojiProduit(p.cat || '');
            return `
              <div
                onclick="addToCart(${p.id})"
                style="background:#1a2535;border:1px solid ${qte > 0 ? '#00C896' : 'rgba(255,255,255,0.07)'};background:${qte > 0 ? 'rgba(0,200,150,0.08)' : '#1a2535'};border-radius:16px;padding:14px;cursor:pointer;text-align:center;position:relative;transition:all .15s;-webkit-tap-highlight-color:transparent"
                ontouchstart="this.style.transform='scale(0.95)'"
                ontouchend="this.style.transform=''"
              >
                ${qte > 0 ? `<div style="position:absolute;top:8px;right:8px;background:#00C896;color:#0A1628;font-size:10px;font-weight:700;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center">${qte}</div>` : ''}
                <div style="font-size:28px;margin-bottom:8px">${emoji}</div>
                <div style="font-size:12px;font-weight:600;color:#F0EDE8;margin-bottom:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${p.nom}</div>
                <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:800;color:#00C896">${_fmt(p.prix_vente || p.vente || 0)}</div>
                <div style="font-size:10px;color:rgba(240,237,232,0.4);margin-top:2px">${p.stock} en stock</div>
              </div>
            `;
          }).join('') : `
            <div style="grid-column:1/-1;text-align:center;padding:40px;color:rgba(240,237,232,0.35)">
              Aucun produit en stock
            </div>
          `}
        </div>
      `;
    };
  }

  // ════════════════════════════════════════
  // STOCK MOBILE
  // ════════════════════════════════════════

  function patcherStockMobile() {
    if (!EST_MOBILE()) return;

    const _origStock = window.renderStock;
    window.renderStock = function() {
      const ruptures = produits.filter(p => p.stock === 0).length;
      const stockBas = produits.filter(p => p.stock > 0 && p.stock <= (p.alerte || 5)).length;

      return `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px">
          ${[
            ['Produits', produits.length, '#00C896'],
            ['Ruptures', ruptures, ruptures > 0 ? '#FF5A5A' : '#F0EDE8'],
            ['Stock bas', stockBas, stockBas > 0 ? '#FFA940' : '#F0EDE8'],
          ].map(([label, val, color]) => `
            <div style="background:#1a2535;border-radius:12px;padding:12px;text-align:center;border:1px solid rgba(255,255,255,0.07)">
              <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:${color}">${val}</div>
              <div style="font-size:10px;color:rgba(240,237,232,0.5);margin-top:2px;text-transform:uppercase;letter-spacing:.04em">${label}</div>
            </div>
          `).join('')}
        </div>

        <div style="position:relative;margin-bottom:12px">
          <input
            style="width:100%;background:#1a2535;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:11px 14px;color:#F0EDE8;font-family:'DM Sans',sans-serif;font-size:14px;outline:none"
            placeholder="Rechercher un produit…"
            oninput="filtrerStock(this.value)"
          >
        </div>

        ${produits.map(p => {
          const emoji    = _emojiProduit(p.cat || '');
          const qtyColor = p.stock === 0 ? '#FF5A5A' : p.stock <= (p.alerte || 5) ? '#FFA940' : '#00C896';
          return `
            <div onclick="ouvrirModalProduit(${p.id})" style="display:flex;align-items:center;gap:12px;background:#1a2535;border-radius:14px;padding:14px;margin-bottom:8px;border:1px solid rgba(255,255,255,0.07);cursor:pointer;-webkit-tap-highlight-color:transparent">
              <div style="width:42px;height:42px;border-radius:12px;background:rgba(0,200,150,0.1);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${emoji}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:14px;font-weight:600;color:#F0EDE8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.nom}</div>
                <div style="font-size:11px;color:rgba(240,237,232,0.5);margin-top:2px">${p.cat || '—'} · ${_fmt(p.prix_vente || p.vente || 0)} FCFA</div>
              </div>
              <div style="text-align:right;flex-shrink:0">
                <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:${qtyColor}">${p.stock}</div>
                <div style="font-size:10px;color:rgba(240,237,232,0.5)">${p.unite || 'pcs'}</div>
              </div>
            </div>
          `;
        }).join('') || `<div style="text-align:center;padding:40px;color:rgba(240,237,232,0.35)">Aucun produit</div>`}
      `;
    };
  }

  // ════════════════════════════════════════
  // UTILITAIRES
  // ════════════════════════════════════════

  function _fmt(n) {
    return Number(n || 0).toLocaleString('fr-SN');
  }

  function _fmtShort(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'k';
    return String(n || 0);
  }

  function _emojiProduit(cat) {
    const c = cat.toLowerCase();
    if (c.includes('aliment') || c.includes('riz') || c.includes('farine')) return '🌾';
    if (c.includes('boisson') || c.includes('eau'))     return '🥤';
    if (c.includes('hygiene') || c.includes('savon'))   return '🧴';
    if (c.includes('vetement') || c.includes('tissu'))  return '👕';
    if (c.includes('electronique') || c.includes('tel')) return '📱';
    if (c.includes('quincaill'))                        return '🔧';
    if (c.includes('cosmetique') || c.includes('beaut')) return '💄';
    return '📦';
  }

  window._emojiProduit = _emojiProduit;

  function filtrerProduitsCaisse(q) {
    const ql   = q.toLowerCase();
    const grid = document.getElementById('mobile-prod-grid');
    if (!grid) return;

    const items = grid.querySelectorAll('[onclick^="addToCart"]');
    items.forEach(item => {
      const nom = item.querySelector('div:nth-child(3)')?.textContent?.toLowerCase() || '';
      item.style.display = !ql || nom.includes(ql) ? '' : 'none';
    });
  }

  window.filtrerProduitsCaisse = filtrerProduitsCaisse;

  // ════════════════════════════════════════
  // INITIALISATION
  // ════════════════════════════════════════

  function init() {
    if (!EST_MOBILE()) return;

    // Injecter le CSS mobile dynamiquement
    const link = document.createElement('link');
    link.rel   = 'stylesheet';
    link.href  = '/src/css/mobile.css';
    document.head.appendChild(link);

    // Patcher les fonctions de rendu
    patcherDashboardMobile();
    patcherCaisseMobile();
    patcherStockMobile();

    console.log('[Géri] Interface mobile activée');
  }

  // Attendre que l'app soit chargée
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Réappliquer si resize vers mobile
  let _wasMobile = EST_MOBILE();
  window.addEventListener('resize', () => {
    const nowMobile = EST_MOBILE();
    if (nowMobile !== _wasMobile) {
      _wasMobile = nowMobile;
      window.location.reload(); // Simple reload pour réappliquer les patches
    }
  });

})();
