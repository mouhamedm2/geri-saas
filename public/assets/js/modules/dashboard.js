/**
 * GÉRI — Module Dashboard
 * Analytique, graphiques SVG, KPIs
 */

'use strict';

// ════════════════════════════════════════
// ANALYTIQUE
// ════════════════════════════════════════

function getCAperiode(jours) {
  // Construire un index date → {ca, nb} pour éviter O(n²)
  const index = {};
  ventes.forEach(v => {
    if (!index[v.date]) index[v.date] = { ca: 0, nb: 0 };
    index[v.date].ca += v.total || 0;
    index[v.date].nb += 1;
  });

  // Mode 90 jours → agréger par mois (3 points)
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

  // Mode 7j / 30j → par jour
  return Array.from({ length: jours }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (jours - 1 - i));
    const dateStr = d.toISOString().split('T')[0];
    const label   = jours <= 7
      ? d.toLocaleDateString('fr-SN', { weekday: 'short' }).slice(0, 3)
      : d.toLocaleDateString('fr-SN', { day: 'numeric', month: 'short' });
    return {
      date:  dateStr,
      label,
      ca:    index[dateStr]?.ca || 0,
      nb:    index[dateStr]?.nb || 0,
    };
  });
}

function getTopProduits(limite = 5) {
  // Utiliser le cache si les ventes n'ont pas changé
  if (_topCache && _topCacheLen === ventes.length) {
    return _topCache.slice(0, limite);
  }

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
    const mode    = v.modePaiement || v.paiement || 'autres';
    modes[mode]   = (modes[mode] || 0) + (v.total || 0);
  });
  return Object.entries(modes).sort((a, b) => b[1] - a[1]);
}

// ════════════════════════════════════════
// GRAPHIQUES SVG
// ════════════════════════════════════════

function svgBarChart(donnees, cleVal, cleLabel) {
  const n         = donnees.length;
  const viewW     = 320;
  const h         = 80;
  const max       = Math.max(...donnees.map(d => d[cleVal]), 1);
  const largBarre = Math.max(4, Math.floor((viewW - 8) / n) - 4);
  const ecart     = Math.max(2, Math.floor((viewW - n * largBarre) / (n + 1)));
  const totalW    = n * (largBarre + ecart) + ecart;
  const showAll   = n <= 14;
  const freq      = n <= 30 ? 5 : 10;

  const barres = donnees.map((d, i) => {
    const valeur   = d[cleVal] || 0;
    const hb       = Math.max(2, Math.round(valeur / max * h));
    const x        = ecart + i * (largBarre + ecart);
    const y        = h - hb;
    const today    = i === n - 1;
    const fill     = today ? '#00C896' : valeur > 0 ? 'rgba(0,200,150,0.35)' : 'rgba(255,255,255,0.04)';
    const valStr   = valeur >= 1_000_000 ? (valeur / 1_000_000).toFixed(1) + 'M'
                   : valeur >= 1_000     ? (valeur / 1_000).toFixed(0) + 'k'
                   : valeur > 0          ? String(valeur) : '';
    const showLbl  = showAll || i % freq === 0 || today;

    return `
      <rect x="${x}" y="${y}" width="${largBarre}" height="${hb}"
            rx="${Math.min(3, largBarre / 2)}" fill="${fill}"/>
      ${showLbl
        ? `<text x="${x + largBarre / 2}" y="${h + 14}"
                 text-anchor="middle" font-size="8"
                 fill="rgba(247,244,238,0.4)" font-family="DM Sans"
                 >${d[cleLabel]}</text>`
        : ''}
      ${valeur > 0 && largBarre >= 12
        ? `<text x="${x + largBarre / 2}" y="${y - 3}"
                 text-anchor="middle" font-size="7"
                 fill="#00C896" font-weight="700">${valStr}</text>`
        : ''}
    `;
  }).join('');

  return `
    <svg width="100%" viewBox="0 0 ${totalW} ${h + 22}"
         preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      ${barres}
    </svg>
  `;
}

function svgLineChart(donnees, cleVal, cleLabel) {
  const h     = 80;
  const padL  = 10;
  const padR  = 10;
  const svgW  = 320;
  const n     = donnees.length;
  const max   = Math.max(...donnees.map(d => d[cleVal]), 1);
  const pas   = (svgW - padL - padR) / Math.max(n - 1, 1);

  const points = donnees.map((d, i) => ({
    x:     padL + i * pas,
    y:     10 + (1 - d[cleVal] / max) * (h - 20),
    val:   d[cleVal],
    label: d[cleLabel],
    i,
  }));

  const polyline = points.map(p => p.x + ',' + p.y).join(' ');
  const aire     = padL + ',' + h + ' ' + points.map(p => p.x + ',' + p.y).join(' ') + ' ' + (svgW - padR) + ',' + h;
  const freq     = n <= 7 ? 1 : n <= 14 ? 2 : n <= 31 ? 7 : 15;
  const lblPts   = points.filter(p => p.i === 0 || p.i === n - 1 || p.i % freq === 0);
  const dots     = n <= 14
    ? points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="${p.i === n-1 ? 4 : 2.5}" fill="${p.i === n-1 ? '#00C896' : 'rgba(0,200,150,0.6)'}"/>`).join('')
    : `<circle cx="${points[n-1].x}" cy="${points[n-1].y}" r="4" fill="#00C896"/>`;

  return `
    <svg width="100%" viewBox="0 0 ${svgW} ${h + 20}"
         preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#00C896" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="#00C896" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <polygon points="${aire}" fill="url(#areaGrad)"/>
      <polyline points="${polyline}"
                fill="none" stroke="#00C896" stroke-width="1.8"
                stroke-linejoin="round" stroke-linecap="round"/>
      ${dots}
      ${lblPts.map(p => `
        <text x="${Math.min(Math.max(p.x, 18), svgW - 18)}"
              y="${h + 14}" text-anchor="middle" font-size="8"
              fill="rgba(247,244,238,0.45)" font-family="DM Sans"
              >${p.label}</text>
      `).join('')}
    </svg>
  `;
}

function svgDonut(modes) {
  const total = modes.reduce((s, [, v]) => s + v, 0);
  if (!total) {
    return '<div style="text-align:center;padding:16px;color:var(--muted);font-size:13px">Aucune donnée</div>';
  }

  const couleurs = ['#00C896', '#F5C842', '#64B5F6', '#CE93D8', '#FF8A65'];
  const cx = 60, cy = 60, r = 50, ir = 32;
  let angle = -Math.PI / 2;

  const tranches = modes.map(([label, val], i) => {
    const pct = val / total;
    const a1  = angle;
    const a2  = angle + pct * 2 * Math.PI;
    angle     = a2;

    const x1  = cx + r  * Math.cos(a1), y1  = cy + r  * Math.sin(a1);
    const x2  = cx + r  * Math.cos(a2), y2  = cy + r  * Math.sin(a2);
    const ix1 = cx + ir * Math.cos(a1), iy1 = cy + ir * Math.sin(a1);
    const ix2 = cx + ir * Math.cos(a2), iy2 = cy + ir * Math.sin(a2);
    const arc = pct > 0.5 ? 1 : 0;

    return `
      <path d="M${ix1},${iy1} L${x1},${y1}
               A${r},${r} 0 ${arc} 1 ${x2},${y2}
               L${ix2},${iy2}
               A${ir},${ir} 0 ${arc} 0 ${ix1},${iy1} Z"
            fill="${couleurs[i % couleurs.length]}" opacity="0.9"/>
    `;
  });

  const legende = modes.map(([label, val], i) => `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
      <div style="width:10px;height:10px;border-radius:3px;background:${couleurs[i % couleurs.length]};flex-shrink:0"></div>
      <div style="font-size:11px;color:var(--muted);flex:1;text-transform:capitalize">${label}</div>
      <div style="font-size:11px;font-weight:700;color:var(--cream)">${Math.round(val / total * 100)}%</div>
    </div>
  `).join('');

  return `
    <div style="display:flex;align-items:center;gap:16px">
      <svg width="120" height="120" viewBox="0 0 120 120"
           xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0">
        ${tranches.join('')}
        <circle cx="${cx}" cy="${cy}" r="${ir}" fill="#1C2E4A"/>
        <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="10"
              fill="rgba(247,244,238,0.5)" font-family="DM Sans">Total</text>
        <text x="${cx}" y="${cy + 10}" text-anchor="middle" font-size="11"
              fill="#00C896" font-weight="700" font-family="DM Sans">
          ${total >= 1000 ? (total / 1000).toFixed(0) + 'k' : total}
        </text>
      </svg>
      <div style="flex:1">${legende}</div>
    </div>
  `;
}

// ════════════════════════════════════════
// RENDU DASHBOARD
// ════════════════════════════════════════

function renderDashboard() {
  const ventesJour  = ventesAujourdhui();
  const ca          = caAujourdhui();
  const benefice    = beneficeAujourdhui();
  const stockBas    = produits.filter(p => p.stock > 0 && p.stock <= (p.alerte || 5));
  const rupture     = produits.filter(p => p.stock === 0);
  const dettesTotal = dettes.filter(d => !d.payee).reduce((s, d) => s + d.montant, 0);

  // Analytique de la période
  const periode    = getCAperiode(dashPeriod);
  const caTotal    = periode.reduce((s, d) => s + d.ca, 0);
  const nbVentes   = periode.reduce((s, d) => s + d.nb, 0);
  const panierMoy  = nbVentes > 0 ? Math.round(caTotal / nbVentes) : 0;

  // Tendance vs période précédente
  const periodPrec  = getCAperiode(dashPeriod === 90 ? 180 : dashPeriod * 2).slice(0, dashPeriod === 90 ? 3 : dashPeriod);
  const caPrec      = periodPrec.reduce((s, d) => s + d.ca, 0);
  const tendance    = caPrec > 0 ? Math.round((caTotal - caPrec) / caPrec * 100) : 0;

  const top    = getTopProduits(5);
  const modes  = getModesPaiement();
  const label  = dashPeriod === 7 ? '7 jours' : dashPeriod === 30 ? '30 jours' : '3 mois';

  return `
    <!-- Alerte stock -->
    ${(stockBas.length || rupture.length) ? `
      <div class="alert-banner" onclick="nav('stock',null,'stock')">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 2L1 14h14L8 2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
          <path d="M8 6v4M8 11.5v.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
        <span>
          ${rupture.length ? rupture.length + ' rupture(s) · ' : ''}
          ${stockBas.length ? stockBas.length + ' stock(s) bas' : ''}
          — Voir le stock →
        </span>
      </div>
    ` : ''}

    <!-- KPIs du jour -->
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:10px">
      Aujourd'hui · ${new Date().toLocaleDateString('fr-SN', { weekday: 'long', day: 'numeric', month: 'long' })}
    </div>

    <div class="stat-grid">
      <div class="stat-card" onclick="nav('caisse',null,'caisse')" style="cursor:pointer;border-color:rgba(0,200,150,0.15)">
        <div class="stat-label">Chiffre d'affaires</div>
        <div class="stat-val" style="color:var(--teal)">${fmtShort(ca)}</div>
        <div class="stat-sub">${ventesJour.length} vente${ventesJour.length !== 1 ? 's' : ''}</div>
      </div>
      <div class="stat-card" onclick="nav('rapport',null,'rapport')" style="cursor:pointer">
        <div class="stat-label">Bénéfice brut</div>
        <div class="stat-val" style="color:#64B5F6">${fmtShort(benefice)}</div>
        <div class="stat-sub">Marge du jour</div>
      </div>
      <div class="stat-card" onclick="nav('stock',null,'stock')" style="cursor:pointer">
        <div class="stat-label">Produits</div>
        <div class="stat-val">${produits.length}</div>
        <div class="stat-sub ${rupture.length ? 'stat-down' : ''}">
          ${rupture.length ? '⚠ ' + rupture.length + ' rupture' : '✓ Stock OK'}
        </div>
      </div>
      <div class="stat-card" onclick="nav('dettes',null,'dettes')" style="cursor:pointer">
        <div class="stat-label">Dettes</div>
        <div class="stat-val" style="${dettesTotal ? 'color:var(--warn)' : ''}">${fmtShort(dettesTotal)}</div>
        <div class="stat-sub">${dettes.filter(d => !d.payee).length} client(s)</div>
      </div>
    </div>

    <!-- Sélecteur période -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin:16px 0 10px">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">
        Analytique
      </div>
      <div style="display:flex;gap:4px">
        ${[[7,'7j'],[30,'30j'],[90,'3M']].map(([j, l]) => `
          <button
            onclick="changerPeriodeDash(${j})"
            style="
              background:${dashPeriod === j ? 'var(--teal)' : 'rgba(255,255,255,0.05)'};
              color:${dashPeriod === j ? '#0A1628' : 'var(--muted)'};
              border:1px solid ${dashPeriod === j ? 'var(--teal)' : 'var(--border)'};
              border-radius:6px;padding:4px 10px;font-size:11px;font-weight:600;
              cursor:pointer;font-family:'DM Sans',sans-serif
            "
          >${l}</button>
        `).join('')}
      </div>
    </div>

    <!-- KPIs période -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px">
      <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">CA ${label}</div>
        <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:var(--cream)">${fmtShort(caTotal)}</div>
        <div style="font-size:11px;margin-top:3px;color:${tendance >= 0 ? 'var(--teal)' : 'var(--danger)'}">
          ${tendance >= 0 ? '↑' : '↓'} ${Math.abs(tendance)}% vs préc.
        </div>
      </div>
      <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Ventes</div>
        <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:var(--cream)">${nbVentes}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:3px">transactions</div>
      </div>
      <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Panier moy.</div>
        <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:var(--cream)">${fmtShort(panierMoy)}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:3px">par vente</div>
      </div>
    </div>

    <!-- Graphique courbe -->
    <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--cream)">Évolution du CA</div>
          <div style="font-size:11px;color:var(--muted)">${label} · en FCFA</div>
        </div>
        <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:var(--teal)">${fmtShort(caTotal)}</div>
      </div>
      ${periode.every(d => d.ca === 0)
        ? '<div style="text-align:center;padding:24px;color:var(--muted);font-size:13px">Aucune vente sur la période</div>'
        : svgLineChart(periode, 'ca', 'label')}
    </div>

    <!-- Graphique barres -->
    <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;color:var(--cream);margin-bottom:4px">
        ${dashPeriod === 90 ? 'CA par mois' : 'Ventes par jour'}
      </div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:14px">${label}</div>
      ${svgBarChart(periode, 'ca', 'label')}
    </div>

    <!-- Top produits + Modes paiement -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">

      <!-- Top produits -->
      <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px">
        <div style="font-size:12px;font-weight:600;color:var(--cream);margin-bottom:12px">🏆 Top produits</div>
        ${top.length
          ? top.map((p, i) => `
              <div style="margin-bottom:10px">
                <div style="display:flex;justify-content:space-between;margin-bottom:3px">
                  <div style="font-size:11px;font-weight:500;color:var(--cream);max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.nom}</div>
                  <div style="font-size:10px;color:var(--teal);font-weight:600;flex-shrink:0">${p.qte} vte</div>
                </div>
                <div style="height:4px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden">
                  <div style="height:100%;width:${Math.round(p.ca / top[0].ca * 100)}%;background:${i === 0 ? 'var(--teal)' : 'rgba(0,200,150,0.4)'};border-radius:2px"></div>
                </div>
                <div style="font-size:9px;color:var(--muted);margin-top:2px">${fmtShort(p.ca)} FCFA</div>
              </div>
            `).join('')
          : '<div style="font-size:12px;color:var(--muted);text-align:center;padding:12px">Aucune vente</div>'
        }
      </div>

      <!-- Modes paiement -->
      <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px">
        <div style="font-size:12px;font-weight:600;color:var(--cream);margin-bottom:12px">💳 Paiements</div>
        ${svgDonut(modes)}
      </div>
    </div>

    <!-- Dernières ventes -->
    <div class="section-hd">
      <div class="section-title">Dernières ventes</div>
      <div class="section-link" onclick="nav('ventes',null,'ventes')">Voir tout</div>
    </div>
    <div class="table-wrap">
      ${[...ventes].reverse().slice(0, 5).map(v => `
        <div class="table-row" style="grid-template-columns:1fr auto auto">
          <div>
            <div class="prod-name">${(v.items || []).map(i => i.nom).join(', ') || '—'}</div>
            <div class="prod-cat">${v.heure || ''} · ${v.modePaiement || '—'}</div>
          </div>
          <div style="font-size:12px;color:var(--muted);margin-right:12px">
            ${(v.items || []).reduce((s, i) => s + (i.qte || 1), 0)} art.
          </div>
          <div style="font-size:14px;font-weight:600;color:var(--teal)">${fmt(v.total)}</div>
        </div>
      `).join('') || '<div class="empty"><p>Aucune vente enregistrée</p></div>'}
    </div>

    <!-- Stocks critiques -->
    ${(rupture.length || stockBas.length) ? `
      <div class="section-hd" style="margin-top:16px">
        <div class="section-title">⚠ Stocks critiques</div>
        <div class="section-link" onclick="nav('stock',null,'stock')">Gérer</div>
      </div>
      <div class="table-wrap">
        ${[...rupture, ...stockBas].slice(0, 4).map(p => `
          <div class="table-row" style="grid-template-columns:1fr auto auto" onclick="ouvrirModalProduit(${p.id})">
            <div>
              <div class="prod-name">${p.nom}</div>
              <div class="prod-cat">${p.cat || '—'}</div>
            </div>
            <div style="font-size:13px;color:var(--cream);margin-right:10px">${p.stock}</div>
            ${stockBadge(p)}
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;
}

function changerPeriodeDash(j) {
  dashPeriod    = j;
  _dashCache    = null;
  _dashCacheKey = '';
  render();
}
