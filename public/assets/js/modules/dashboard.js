/**
 * GÉRI — Dashboard Premium
 * Philosophie : Less is More
 * Inspiré de Stripe, Linear, Pennylane
 */

'use strict';

// ════════════════════════════════════════
// ANALYTIQUE
// ════════════════════════════════════════

function getCAperiode(jours) {
  const index = {};
  ventes.forEach(v => {
    if (!index[v.date]) index[v.date] = { ca: 0, nb: 0 };
    index[v.date].ca += v.total || 0;
    index[v.date].nb += 1;
  });

  if (jours === 90) {
    return Array.from({ length: 3 }, (_, i) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - (2 - i));
      const annee = d.getFullYear();
      const mois  = String(d.getMonth() + 1).padStart(2, '0');
      const label = d.toLocaleDateString('fr-SN', { month: 'short' });
      let ca = 0, nb = 0;
      Object.entries(index).forEach(([ds, val]) => {
        if (ds.startsWith(annee + '-' + mois)) { ca += val.ca; nb += val.nb; }
      });
      return { date: annee + '-' + mois, label, ca, nb };
    });
  }

  return Array.from({ length: jours }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (jours - 1 - i));
    const dateStr = d.toISOString().split('T')[0];
    const label   = jours <= 7
      ? d.toLocaleDateString('fr-SN', { weekday: 'short' }).slice(0, 3)
      : d.toLocaleDateString('fr-SN', { day: 'numeric', month: 'short' });
    return { date: dateStr, label, ca: index[dateStr]?.ca || 0, nb: index[dateStr]?.nb || 0 };
  });
}

function getTopProduits(limite = 5) {
  if (_topCache && _topCacheLen === ventes.length) return _topCache.slice(0, limite);
  const comptages = {};
  ventes.forEach(v => {
    (v.items || []).forEach(item => {
      if (!comptages[item.nom]) comptages[item.nom] = { nom: item.nom, qte: 0, ca: 0 };
      comptages[item.nom].qte += item.qte || 1;
      comptages[item.nom].ca  += (item.prix || 0) * (item.qte || 1);
    });
  });
  _topCache    = Object.values(comptages).sort((a, b) => b.ca - a.ca);
  _topCacheLen = ventes.length;
  return _topCache.slice(0, limite);
}

function getModesPaiement() {
  const modes = {};
  ventes.forEach(v => {
    const mode  = v.modePaiement || v.paiement || 'autres';
    modes[mode] = (modes[mode] || 0) + (v.total || 0);
  });
  return Object.entries(modes).sort((a, b) => b[1] - a[1]);
}

// ════════════════════════════════════════
// GRAPHIQUE SVG — MINIMALISTE
// ════════════════════════════════════════

function svgSparkline(donnees, cleVal) {
  const n   = donnees.length;
  const max = Math.max(...donnees.map(d => d[cleVal]), 1);
  const W   = 600, H = 80;
  const pas = W / Math.max(n - 1, 1);

  const points = donnees.map((d, i) => ({
    x: i * pas,
    y: H - 12 - Math.max(0, (d[cleVal] / max) * (H - 24)),
  }));

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
  const aire     = `0,${H} ${points.map(p => `${p.x},${p.y}`).join(' ')} ${W},${H}`;

  // Points clés (début, fin, max)
  const maxIdx = donnees.reduce((mi, d, i) => d[cleVal] > donnees[mi][cleVal] ? i : mi, 0);

  return `
    <svg width="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"
         xmlns="http://www.w3.org/2000/svg" style="overflow:visible">
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#0B5D48" stop-opacity="0.12"/>
          <stop offset="100%" stop-color="#0B5D48" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <polygon points="${aire}" fill="url(#grad)"/>
      <polyline points="${polyline}"
                fill="none" stroke="#0B5D48" stroke-width="2"
                stroke-linejoin="round" stroke-linecap="round"/>
      <!-- Point final -->
      <circle cx="${points[n-1].x}" cy="${points[n-1].y}" r="4"
              fill="#0B5D48" stroke="#fff" stroke-width="2"/>
      <!-- Point max si différent du final -->
      ${maxIdx !== n-1 && donnees[maxIdx][cleVal] > 0 ? `
        <circle cx="${points[maxIdx].x}" cy="${points[maxIdx].y}" r="3"
                fill="none" stroke="#0B5D48" stroke-width="1.5" stroke-dasharray="2,2"/>
      ` : ''}
    </svg>
  `;
}

function svgBarSemaine(donnees) {
  const n    = donnees.length;
  const max  = Math.max(...donnees.map(d => d.ca), 1);
  const W    = 600, H = 64;
  const barW = Math.floor(W / n) - 6;
  const gap  = 6;

  return `
    <svg width="100%" viewBox="0 0 ${W} ${H + 20}"
         preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      ${donnees.map((d, i) => {
        const hb      = Math.max(3, Math.round(d.ca / max * H));
        const x       = i * (barW + gap) + gap / 2;
        const y       = H - hb;
        const isToday = i === n - 1;
        const fill    = isToday ? '#0B5D48' : d.ca > 0 ? '#D1EDE6' : '#F3FBF8';
        return `
          <rect x="${x}" y="${y}" width="${barW}" height="${hb}"
                rx="4" fill="${fill}"/>
          <text x="${x + barW/2}" y="${H + 14}"
                text-anchor="middle" font-size="9" font-family="DM Sans"
                fill="${isToday ? '#0B5D48' : '#9CA3AF'}" font-weight="${isToday ? '700' : '400'}"
                >${d.label}</text>
        `;
      }).join('')}
    </svg>
  `;
}

// ════════════════════════════════════════
// RENDU DASHBOARD PREMIUM
// ════════════════════════════════════════

function renderDashboard() {
  // ── Données ──
  const todayStr    = today();
  const ventesJour  = ventes.filter(v => v.date === todayStr);
  const ca          = ventesJour.reduce((s, v) => s + (v.total    || 0), 0);
  const benefice    = ventesJour.reduce((s, v) => s + (v.benefice || 0), 0);
  const nbVentes    = ventesJour.length;

  // Tendance vs hier
  const hier        = new Date(); hier.setDate(hier.getDate() - 1);
  const caHier      = ventes.filter(v => v.date === hier.toISOString().split('T')[0]).reduce((s, v) => s + (v.total || 0), 0);
  const tendance    = caHier > 0 ? Math.round((ca - caHier) / caHier * 100) : null;

  // Stock critique
  const ruptures    = produits.filter(p => p.stock === 0);
  const stockBas    = produits.filter(p => p.stock > 0 && p.stock <= (p.alerte || p.stock_min || 5));
  const nbAlertes   = ruptures.length + stockBas.length;

  // Dettes
  const dettesOuv   = dettes.filter(d => !d.payee);
  const totalDettes = dettesOuv.reduce((s, d) => s + d.montant, 0);

  // Période graphique
  const periode7    = getCAperiode(7);
  const ca7         = periode7.reduce((s, d) => s + d.ca, 0);
  const panierMoy   = nbVentes > 0 ? Math.round(ca / nbVentes) : 0;

  // Top produits
  const top         = getTopProduits(4);

  // Date lisible
  const dateStr = new Date().toLocaleDateString('fr-SN', {
    weekday: 'long', day: 'numeric', month: 'long'
  });
  const heure   = new Date().getHours();
  const salut   = heure < 12 ? 'Bonjour' : heure < 18 ? 'Bonne journée' : 'Bonsoir';
  const shopNom = DB.get('shopname') || 'Ma Boutique';

  return `
<style>
/* ── Dashboard Premium ── */
.db {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 0 40px;
}

/* En-tête */
.db-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 28px;
  gap: 16px;
  flex-wrap: wrap;
}

.db-greeting {
  font-size: 22px;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.3px;
}

.db-date {
  font-size: 13px;
  color: #6B7280;
  margin-top: 3px;
  text-transform: capitalize;
}

.db-status {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #F3FBF8;
  border: 1px solid #D1EDE6;
  color: #0B5D48;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 20px;
  flex-shrink: 0;
}

.db-status-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #0B5D48;
}

/* Actions rapides */
.db-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.db-action-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  background: #fff;
  border: 1px solid #E5E7EB;
  color: #374151;
  font-size: 13px;
  font-weight: 500;
  padding: 9px 16px;
  border-radius: 10px;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  transition: all 0.15s;
  white-space: nowrap;
}

.db-action-btn:hover {
  border-color: #0B5D48;
  color: #0B5D48;
  background: #F3FBF8;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(11,93,72,0.1);
}

.db-action-btn.primary {
  background: #0B5D48;
  color: #fff;
  border-color: #0B5D48;
}

.db-action-btn.primary:hover {
  background: #0a4f3d;
  color: #fff;
  box-shadow: 0 4px 12px rgba(11,93,72,0.25);
}

/* KPI Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.kpi-card {
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 16px;
  padding: 18px 20px;
  transition: box-shadow 0.15s, border-color 0.15s;
  cursor: pointer;
}

.kpi-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
  border-color: #D1D5DB;
}

.kpi-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.kpi-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #9CA3AF;
}

.kpi-icon {
  width: 28px; height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.kpi-val {
  font-family: 'Syne', sans-serif;
  font-size: 24px;
  font-weight: 800;
  color: #111827;
  line-height: 1;
  margin-bottom: 6px;
  letter-spacing: -0.5px;
}

.kpi-sub {
  font-size: 12px;
  color: #9CA3AF;
  display: flex;
  align-items: center;
  gap: 4px;
}

.kpi-trend-up   { color: #0B5D48; font-weight: 600; }
.kpi-trend-down { color: #EF4444; font-weight: 600; }
.kpi-trend-warn { color: #F59E0B; font-weight: 600; }

/* Graphique */
.chart-card {
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.chart-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.chart-subtitle {
  font-size: 12px;
  color: #9CA3AF;
  margin-top: 2px;
}

.chart-total {
  font-family: 'Syne', sans-serif;
  font-size: 22px;
  font-weight: 800;
  color: #0B5D48;
  text-align: right;
}

.chart-period {
  font-size: 11px;
  color: #9CA3AF;
  text-align: right;
  margin-top: 2px;
}

.period-tabs {
  display: flex;
  gap: 2px;
  background: #F3F4F6;
  border-radius: 8px;
  padding: 3px;
}

.period-tab {
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #6B7280;
  cursor: pointer;
  border: none;
  background: transparent;
  font-family: 'DM Sans', sans-serif;
  transition: all 0.15s;
}

.period-tab.active {
  background: #fff;
  color: #0B5D48;
  font-weight: 700;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

/* Performance + Top produits */
.db-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.perf-card {
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 16px;
  padding: 24px;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 16px;
}

.perf-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #F3F4F6;
}

.perf-row:last-child { border-bottom: none; }

.perf-label { font-size: 13px; color: #6B7280; }
.perf-val   { font-size: 14px; font-weight: 600; color: #111827; }

/* Top produits */
.top-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #F3F4F6;
}

.top-item:last-child { border-bottom: none; }

.top-rank {
  font-family: 'Syne', sans-serif;
  font-size: 13px;
  font-weight: 800;
  color: #D1D5DB;
  width: 20px;
  flex-shrink: 0;
}

.top-rank.gold { color: #F59E0B; }

.top-info { flex: 1; min-width: 0; }

.top-name {
  font-size: 13px;
  font-weight: 500;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.top-bar-wrap {
  height: 3px;
  background: #F3F4F6;
  border-radius: 2px;
  margin-top: 4px;
  overflow: hidden;
}

.top-bar-fill {
  height: 100%;
  background: #0B5D48;
  border-radius: 2px;
  transition: width 0.4s;
}

.top-ca {
  font-size: 13px;
  font-weight: 600;
  color: #0B5D48;
  flex-shrink: 0;
}

/* Alertes */
.alert-card {
  border-radius: 12px;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  cursor: pointer;
  transition: opacity 0.15s;
}

.alert-card:hover { opacity: 0.85; }

.alert-card.warn {
  background: #FFFBEB;
  border: 1px solid #FDE68A;
}

.alert-card.danger {
  background: #FEF2F2;
  border: 1px solid #FECACA;
}

.alert-card.info {
  background: #F3FBF8;
  border: 1px solid #D1EDE6;
}

.alert-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.alert-icon { font-size: 16px; }

.alert-text { font-size: 13px; font-weight: 500; }
.alert-text.warn   { color: #92400E; }
.alert-text.danger { color: #991B1B; }
.alert-text.info   { color: #0B5D48; }

.alert-link {
  font-size: 12px;
  font-weight: 600;
  color: #6B7280;
  text-decoration: none;
}

/* Dernières ventes */
.ventes-card {
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 16px;
  overflow: hidden;
}

.ventes-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid #F3F4F6;
}

.vente-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 24px;
  border-bottom: 1px solid #F9FAFB;
  cursor: pointer;
  transition: background 0.1s;
}

.vente-row:last-child { border-bottom: none; }
.vente-row:hover { background: #F9FAFB; }

.vente-avatar {
  width: 36px; height: 36px;
  border-radius: 10px;
  background: #F3FBF8;
  border: 1px solid #D1EDE6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.vente-info { flex: 1; min-width: 0; }

.vente-nom {
  font-size: 14px;
  font-weight: 500;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vente-meta { font-size: 12px; color: #9CA3AF; margin-top: 2px; }

.vente-montant {
  font-size: 14px;
  font-weight: 600;
  color: #0B5D48;
  flex-shrink: 0;
}

.vente-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
  flex-shrink: 0;
}

.vente-badge.wave     { background: #EFF6FF; color: #1D4ED8; }
.vente-badge.especes  { background: #F0FDF4; color: #166534; }
.vente-badge.orange   { background: #FFF7ED; color: #C2410C; }
.vente-badge.credit   { background: #FDF4FF; color: #7E22CE; }

/* Responsive */
@media (max-width: 768px) {
  .kpi-grid { grid-template-columns: 1fr 1fr; }
  .db-row   { grid-template-columns: 1fr; }
  .db-header { flex-direction: column; }
  .db-actions { gap: 6px; }
  .db-action-btn { font-size: 12px; padding: 8px 12px; }
  .vente-row { padding: 12px 16px; }
  .ventes-header { padding: 16px; }
}
</style>

<div class="db">

  <!-- ── En-tête ── -->
  <div class="db-header">
    <div>
      <div class="db-greeting">${salut}, ${shopNom} 👋</div>
      <div class="db-date">${dateStr}</div>
    </div>
    <div class="db-status">
      <div class="db-status-dot"></div>
      ${nbAlertes > 0 ? nbAlertes + ' alerte' + (nbAlertes > 1 ? 's' : '') : 'Tout est OK'}
    </div>
  </div>

  <!-- ── Actions rapides ── -->
  <div class="db-actions">
    <button class="db-action-btn primary" onclick="nav('caisse',null,'caisse')">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M2 3h10l-1 8H3L2 3z" stroke-linejoin="round"/>
        <path d="M5 6h4M7 4v4" stroke-linecap="round"/>
      </svg>
      Nouvelle vente
    </button>
    <button class="db-action-btn" onclick="ouvrirModalProduit()">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8">
        <rect x="2" y="7" width="10" height="5" rx="1"/>
        <path d="M4 7V5a3 3 0 016 0v2"/>
        <path d="M7 3v2M6 4h2" stroke-linecap="round"/>
      </svg>
      Ajouter produit
    </button>
    <button class="db-action-btn" onclick="openModalClient()">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8">
        <circle cx="7" cy="4" r="2.5"/>
        <path d="M2 12c0-2.5 2-4 5-4s5 1.5 5 4" stroke-linecap="round"/>
      </svg>
      Ajouter client
    </button>
    <button class="db-action-btn" onclick="ouvrirScanPhoto()">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M2 4V3a1 1 0 011-1h1M10 2h1a1 1 0 011 1v1M12 10v1a1 1 0 01-1 1h-1M4 12H3a1 1 0 01-1-1v-1"/>
        <rect x="4.5" y="4.5" width="5" height="5" rx="1"/>
      </svg>
      Scanner
    </button>
    <button class="db-action-btn" onclick="ouvrirNouvelleFacture()">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8">
        <rect x="2" y="1" width="10" height="12" rx="1.5"/>
        <path d="M5 4h4M5 7h4M5 10h2" stroke-linecap="round"/>
      </svg>
      Facture
    </button>
  </div>

  <!-- ── KPIs ── -->
  <div class="kpi-grid">

    <!-- CA du jour -->
    <div class="kpi-card" onclick="nav('ventes',null,'ventes')">
      <div class="kpi-top">
        <div class="kpi-label">CA aujourd'hui</div>
        <div class="kpi-icon" style="background:#F3FBF8">💰</div>
      </div>
      <div class="kpi-val">${fmtShort(ca)}</div>
      <div class="kpi-sub">
        ${tendance !== null
          ? `<span class="${tendance >= 0 ? 'kpi-trend-up' : 'kpi-trend-down'}">
               ${tendance >= 0 ? '↑' : '↓'} ${Math.abs(tendance)}%
             </span> vs hier`
          : 'Premier jour de suivi'
        }
      </div>
    </div>

    <!-- Bénéfice -->
    <div class="kpi-card" onclick="nav('rapport',null,'rapport')">
      <div class="kpi-top">
        <div class="kpi-label">Bénéfice brut</div>
        <div class="kpi-icon" style="background:#EFF6FF">📈</div>
      </div>
      <div class="kpi-val" style="color:${benefice > 0 ? '#0B5D48' : '#EF4444'}">${fmtShort(benefice)}</div>
      <div class="kpi-sub">
        ${ca > 0 ? Math.round(benefice / ca * 100) + '% de marge' : 'Aucune vente'}
      </div>
    </div>

    <!-- Nombre de ventes -->
    <div class="kpi-card" onclick="nav('ventes',null,'ventes')">
      <div class="kpi-top">
        <div class="kpi-label">Ventes du jour</div>
        <div class="kpi-icon" style="background:#FFF7ED">🛒</div>
      </div>
      <div class="kpi-val">${nbVentes}</div>
      <div class="kpi-sub">
        ${nbVentes > 0 ? 'Panier moy. ' + fmtShort(panierMoy) : 'Aucune vente aujourd\'hui'}
      </div>
    </div>

    <!-- Stock critique -->
    <div class="kpi-card" onclick="nav('stock',null,'stock')"
         style="${nbAlertes > 0 ? 'border-color:#FDE68A' : ''}">
      <div class="kpi-top">
        <div class="kpi-label">Stock critique</div>
        <div class="kpi-icon" style="background:${nbAlertes > 0 ? '#FFFBEB' : '#F3FBF8'}">
          ${nbAlertes > 0 ? '⚠️' : '✅'}
        </div>
      </div>
      <div class="kpi-val" style="color:${nbAlertes > 0 ? '#F59E0B' : '#0B5D48'}">${nbAlertes}</div>
      <div class="kpi-sub">
        ${ruptures.length > 0
          ? `<span class="kpi-trend-down">${ruptures.length} rupture${ruptures.length > 1 ? 's' : ''}</span>`
          : stockBas.length > 0
          ? `<span class="kpi-trend-warn">${stockBas.length} stock${stockBas.length > 1 ? 's' : ''} bas</span>`
          : 'Stock en bonne santé'
        }
      </div>
    </div>

  </div>

  <!-- ── Alertes compactes ── -->
  ${nbAlertes > 0 ? `
    ${ruptures.length > 0 ? `
      <div class="alert-card danger" onclick="nav('stock',null,'stock')">
        <div class="alert-left">
          <span class="alert-icon">🚨</span>
          <span class="alert-text danger">
            ${ruptures.length} produit${ruptures.length > 1 ? 's' : ''} en rupture —
            ${ruptures.slice(0,3).map(p => p.nom).join(', ')}${ruptures.length > 3 ? '…' : ''}
          </span>
        </div>
        <span class="alert-link">Voir →</span>
      </div>
    ` : ''}
    ${stockBas.length > 0 ? `
      <div class="alert-card warn" onclick="nav('stock',null,'stock')">
        <div class="alert-left">
          <span class="alert-icon">⚠️</span>
          <span class="alert-text warn">
            ${stockBas.length} produit${stockBas.length > 1 ? 's' : ''} à réapprovisionner —
            ${stockBas.slice(0,3).map(p => p.nom).join(', ')}${stockBas.length > 3 ? '…' : ''}
          </span>
        </div>
        <span class="alert-link">Voir →</span>
      </div>
    ` : ''}
    ${dettesOuv.length > 0 ? `
      <div class="alert-card info" onclick="nav('dettes',null,'dettes')">
        <div class="alert-left">
          <span class="alert-icon">💳</span>
          <span class="alert-text info">
            ${dettesOuv.length} dette${dettesOuv.length > 1 ? 's' : ''} en attente —
            ${fmtShort(totalDettes)} FCFA à récupérer
          </span>
        </div>
        <span class="alert-link">Relancer →</span>
      </div>
    ` : ''}
  ` : ''}

  <!-- ── Graphique ventes ── -->
  <div class="chart-card">
    <div class="chart-header">
      <div>
        <div class="chart-title">Évolution des ventes</div>
        <div class="chart-subtitle">Chiffre d'affaires · FCFA</div>
      </div>
      <div style="text-align:right">
        <div class="chart-total">${fmtShort(ca7)}</div>
        <div class="chart-period">7 derniers jours</div>
      </div>
    </div>
    ${periode7.every(d => d.ca === 0)
      ? `<div style="text-align:center;padding:32px;color:#9CA3AF;font-size:14px">
           Aucune vente sur la période
         </div>`
      : svgBarSemaine(periode7)
    }
  </div>

  <!-- ── Performance + Top produits ── -->
  <div class="db-row">

    <!-- Performance -->
    <div class="perf-card">
      <div class="card-title">Performance de la boutique</div>
      <div class="perf-row">
        <span class="perf-label">CA cette semaine</span>
        <span class="perf-val" style="color:#0B5D48">${fmtShort(ca7)} FCFA</span>
      </div>
      <div class="perf-row">
        <span class="perf-label">Ventes totales</span>
        <span class="perf-val">${ventes.length}</span>
      </div>
      <div class="perf-row">
        <span class="perf-label">Panier moyen</span>
        <span class="perf-val">${fmtShort(panierMoy)} FCFA</span>
      </div>
      <div class="perf-row">
        <span class="perf-label">Clients enregistrés</span>
        <span class="perf-val">${clients.length}</span>
      </div>
      <div class="perf-row">
        <span class="perf-label">Produits en catalogue</span>
        <span class="perf-val">${produits.length}</span>
      </div>
    </div>

    <!-- Top produits -->
    <div class="perf-card">
      <div class="card-title">Meilleurs produits</div>
      ${top.length
        ? top.map((p, i) => `
            <div class="top-item">
              <div class="top-rank ${i === 0 ? 'gold' : ''}">${i + 1}</div>
              <div class="top-info">
                <div class="top-name">${p.nom}</div>
                <div class="top-bar-wrap">
                  <div class="top-bar-fill" style="width:${Math.round(p.ca / top[0].ca * 100)}%"></div>
                </div>
              </div>
              <div class="top-ca">${fmtShort(p.ca)}</div>
            </div>
          `).join('')
        : `<div style="text-align:center;padding:24px;color:#9CA3AF;font-size:13px">
             Enregistrez des ventes pour voir vos top produits
           </div>`
      }
    </div>

  </div>

  <!-- ── Dernières ventes ── -->
  <div class="ventes-card">
    <div class="ventes-header">
      <div>
        <div style="font-size:15px;font-weight:600;color:#111827">Dernières ventes</div>
        <div style="font-size:12px;color:#9CA3AF;margin-top:2px">${ventesJour.length} vente${ventesJour.length > 1 ? 's' : ''} aujourd'hui</div>
      </div>
      <button onclick="nav('ventes',null,'ventes')"
              style="background:none;border:none;font-size:13px;color:#0B5D48;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif">
        Voir tout →
      </button>
    </div>

    ${[...ventes].reverse().slice(0, 6).map(v => {
      const items  = (v.items || []).map(i => i.nom).join(', ') || '—';
      const mode   = v.modePaiement || 'especes';
      const emoji  = mode === 'wave' ? '💸' : mode === 'orange' ? '🟠' : mode === 'credit' ? '💳' : '💵';
      const badge  = mode === 'wave' ? 'wave' : mode === 'orange' ? 'orange' : mode === 'credit' ? 'credit' : 'especes';
      return `
        <div class="vente-row" onclick="voirDetailVente(${v.id})">
          <div class="vente-avatar">${emoji}</div>
          <div class="vente-info">
            <div class="vente-nom">${items}</div>
            <div class="vente-meta">${v.heure || ''} · ${v.client || 'Anonyme'}</div>
          </div>
          <span class="vente-badge ${badge}">${mode}</span>
          <div class="vente-montant">+${fmtShort(v.total)}</div>
        </div>
      `;
    }).join('') || `
      <div style="text-align:center;padding:40px;color:#9CA3AF;font-size:14px">
        Aucune vente enregistrée — <span style="color:#0B5D48;cursor:pointer;font-weight:600" onclick="nav('caisse',null,'caisse')">commencer la caisse →</span>
      </div>
    `}
  </div>

</div>
  `;
}

function changerPeriodeDash(j) {
  dashPeriod    = j;
  _dashCache    = null;
  _dashCacheKey = '';
  render();
}
