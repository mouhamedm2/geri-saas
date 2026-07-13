/**
 * GÉRI — Module Rapports
 * Analytique avancée, export CSV
 */

'use strict';

// ════════════════════════════════════════
// RENDU
// ════════════════════════════════════════

function renderRapport() {
  const caTotal     = ventes.reduce((s, v) => s + (v.total    || 0), 0);
  const benTotal    = ventes.reduce((s, v) => s + (v.benefice || 0), 0);
  const nbVentes    = ventes.length;
  const panierMoy   = nbVentes > 0 ? Math.round(caTotal / nbVentes) : 0;
  const tauxMarge   = caTotal > 0 ? Math.round(benTotal / caTotal * 100) : 0;

  // Top 5 produits
  const topProds = _getTopProdRapport(5);

  // CA par mode de paiement
  const modes = {};
  ventes.forEach(v => {
    const m = v.modePaiement || v.paiement || 'autres';
    modes[m] = (modes[m] || 0) + (v.total || 0);
  });
  const modesEntries = Object.entries(modes).sort((a, b) => b[1] - a[1]);

  // CA des 7 derniers jours
  const semaine = Array.from({ length: 7 }, (_, i) => {
    const d   = new Date();
    d.setDate(d.getDate() - (6 - i));
    const ds  = d.toISOString().split('T')[0];
    const ca  = ventes.filter(v => v.date === ds).reduce((s, v) => s + v.total, 0);
    const lbl = d.toLocaleDateString('fr-SN', { weekday: 'short' }).slice(0, 3);
    return { date: ds, label: lbl, ca };
  });
  const caS  = semaine.reduce((s, d) => s + d.ca, 0);

  return `
    <!-- Stats globales -->
    <div style="background:linear-gradient(135deg,rgba(0,200,150,0.1),rgba(0,200,150,0.04));border:1px solid rgba(0,200,150,0.2);border-radius:14px;padding:18px;margin-bottom:14px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--teal);margin-bottom:12px">
        📊 Synthèse globale
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${[
          ['CA total',    fmt(caTotal),   'var(--teal)'],
          ['Bénéfice',    fmt(benTotal),  '#64B5F6'],
          ['Ventes',      nbVentes,       'var(--cream)'],
          ['Panier moy.', fmt(panierMoy), 'var(--cream)'],
          ['Marge',       tauxMarge + '%', tauxMarge > 20 ? 'var(--teal)' : tauxMarge > 10 ? 'var(--warn)' : 'var(--danger)'],
          ['Clients',     clients.length, 'var(--cream)'],
        ].map(([label, val, color]) => `
          <div>
            <div style="font-size:11px;color:var(--muted);margin-bottom:3px">${label}</div>
            <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:${color}">${val}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- CA cette semaine -->
    <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--cream)">CA cette semaine</div>
          <div style="font-size:11px;color:var(--muted)">7 derniers jours</div>
        </div>
        <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:var(--teal)">${fmtShort(caS)}</div>
      </div>
      ${_svgBarSemaine(semaine)}
    </div>

    <!-- Top produits -->
    <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;color:var(--cream);margin-bottom:12px">🏆 Top 5 produits</div>
      ${topProds.length
        ? topProds.map((p, i) => `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
              <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:800;color:${i === 0 ? 'var(--gold)' : 'var(--muted)'};width:20px;text-align:center">
                ${i + 1}
              </div>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:500;color:var(--cream);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.nom}</div>
                <div style="height:4px;background:rgba(255,255,255,0.06);border-radius:2px;margin-top:4px;overflow:hidden">
                  <div style="height:100%;width:${Math.round(p.ca / topProds[0].ca * 100)}%;background:${i === 0 ? 'var(--gold)' : 'rgba(0,200,150,0.4)'};border-radius:2px"></div>
                </div>
              </div>
              <div style="text-align:right;flex-shrink:0">
                <div style="font-size:12px;font-weight:700;color:var(--cream)">${fmtShort(p.ca)}</div>
                <div style="font-size:10px;color:var(--muted)">${p.qte} vte</div>
              </div>
            </div>
          `).join('')
        : '<div style="text-align:center;padding:12px;color:var(--muted);font-size:13px">Aucune vente enregistrée</div>'
      }
    </div>

    <!-- Modes de paiement -->
    <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px">
      <div style="font-size:13px;font-weight:600;color:var(--cream);margin-bottom:12px">💳 Modes de paiement</div>
      ${modesEntries.length
        ? modesEntries.map(([mode, montant]) => {
            const pct = caTotal > 0 ? Math.round(montant / caTotal * 100) : 0;
            const emoji = mode === 'wave' ? '💸' : mode === 'orange' ? '🟠' : mode === 'free' ? '💜' : mode === 'credit' ? '💳' : '💵';
            return `
              <div style="margin-bottom:10px">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                  <div style="font-size:13px;color:var(--cream)">${emoji} ${mode.charAt(0).toUpperCase() + mode.slice(1)}</div>
                  <div style="font-size:12px;font-weight:600;color:var(--teal)">${pct}% · ${fmtShort(montant)}</div>
                </div>
                <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden">
                  <div style="height:100%;width:${pct}%;background:var(--teal);border-radius:3px;transition:width .4s"></div>
                </div>
              </div>
            `;
          }).join('')
        : '<div style="text-align:center;padding:12px;color:var(--muted);font-size:13px">Aucune données</div>'
      }
    </div>

    <!-- Exports -->
    <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px">
      <div style="font-size:13px;font-weight:600;color:var(--cream);margin-bottom:12px">📥 Exports</div>
      <button
        onclick="exportCSVVentes()"
        style="width:100%;background:rgba(0,200,150,0.08);border:1px solid rgba(0,200,150,0.2);color:var(--teal);border-radius:10px;padding:12px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;margin-bottom:8px;display:flex;align-items:center;justify-content:center;gap:8px"
      >
        📊 Exporter ventes (.csv)
      </button>
      <button
        onclick="exportCSVStock()"
        style="width:100%;background:rgba(255,255,255,0.04);border:1px solid var(--border);color:var(--muted);border-radius:10px;padding:12px;font-size:13px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;justify-content:center;gap:8px"
      >
        📦 Exporter stock (.csv)
      </button>
    </div>
  `;
}

// ════════════════════════════════════════
// GRAPHIQUE BARRES SEMAINE
// ════════════════════════════════════════

function _svgBarSemaine(semaine) {
  const max = Math.max(...semaine.map(d => d.ca), 1);
  const w   = 300;
  const h   = 60;
  const barW = 30;
  const gap  = (w - 7 * barW) / 8;

  const barres = semaine.map((d, i) => {
    const hb  = Math.max(2, Math.round(d.ca / max * h));
    const x   = gap + i * (barW + gap);
    const y   = h - hb;
    const today = d.date === new Date().toISOString().split('T')[0];
    const fill  = today ? '#00C896' : d.ca > 0 ? 'rgba(0,200,150,0.3)' : 'rgba(255,255,255,0.04)';
    return `
      <rect x="${x}" y="${y}" width="${barW}" height="${hb}" rx="5" fill="${fill}"/>
      <text x="${x + barW/2}" y="${h + 14}" text-anchor="middle" font-size="9"
            fill="rgba(247,244,238,0.45)" font-family="DM Sans">${d.label}</text>
      ${d.ca > 0 ? `<text x="${x + barW/2}" y="${y - 3}" text-anchor="middle" font-size="8"
            fill="#00C896" font-weight="700">${fmtShort(d.ca)}</text>` : ''}
    `;
  }).join('');

  return `
    <svg width="100%" viewBox="0 0 ${w} ${h + 20}"
         preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      ${barres}
    </svg>
  `;
}

// ════════════════════════════════════════
// TOP PRODUITS RAPPORT
// ════════════════════════════════════════

function _getTopProdRapport(limite) {
  const comptages = {};
  ventes.forEach(v => {
    (v.items || []).forEach(item => {
      if (!comptages[item.nom]) comptages[item.nom] = { nom: item.nom, qte: 0, ca: 0 };
      comptages[item.nom].qte += item.qte || 1;
      comptages[item.nom].ca  += (item.prix || 0) * (item.qte || 1);
    });
  });
  return Object.values(comptages).sort((a, b) => b.ca - a.ca).slice(0, limite);
}

// ════════════════════════════════════════
// EXPORTS CSV
// ════════════════════════════════════════

function exportCSVVentes() {
  const rows = [['Date', 'Heure', 'Client', 'Articles', 'Total', 'Bénéfice', 'Mode paiement', 'Vendeur']];

  ventes.forEach(v => {
    rows.push([
      v.date,
      v.heure || '',
      v.client || '',
      (v.items || []).map(i => i.nom + ' x' + i.qte).join(' / '),
      v.total,
      v.benefice || 0,
      v.modePaiement || '',
      v.vendeur || '',
    ]);
  });

  _telechargerCSV(rows, 'geri-ventes');
  toast('Export ventes téléchargé ✓', 'success');
}

function exportCSVStock() {
  const rows = [['Nom', 'Catégorie', 'Prix vente', 'Prix achat', 'Stock', 'Alerte', 'Unité']];

  produits.forEach(p => {
    rows.push([
      p.nom,
      p.cat || '',
      p.prix_vente || p.vente || 0,
      p.prix_achat || p.achat || 0,
      p.stock,
      p.alerte || p.stock_min || 5,
      p.unite || 'pcs',
    ]);
  });

  _telechargerCSV(rows, 'geri-stock');
  toast('Export stock téléchargé ✓', 'success');
}

// Alias pour la topbar
function exporterCSV() {
  exportCSVVentes();
}

function _telechargerCSV(rows, nom) {
  const csv  = rows.map(r =>
    r.map(c => '"' + String(c || '').replace(/"/g, '""') + '"').join(',')
  ).join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = nom + '-' + today() + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
