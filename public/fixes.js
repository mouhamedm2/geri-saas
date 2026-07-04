/**
 * GÉRI — Corrections Auth & Factures
 * Patch à ajouter dans app.html pour corriger les bugs connus
 * 
 * INSTRUCTIONS : Colle ce contenu dans app.html juste avant </body>
 * APRÈS <script src="mobile-patch.js"></script>
 */

// ════════════════════════════════════════
// FIX 1 — Vérification session robuste
// Redirige vers auth.html si pas connecté
// ════════════════════════════════════════

(function checkAuthOnLoad() {
  const supabase = window.__supabase || window.supabase?.createClient;
  if (!supabase) return;

  // Vérifier la session après chargement
  window.addEventListener('load', async () => {
    try {
      const sb = window._supabase;
      if (!sb) return;

      const { data: { session } } = await sb.auth.getSession();

      if (!session) {
        // Pas de session → rediriger vers auth
        window.location.href = 'auth.html';
        return;
      }

      // Écouter les changements d'état auth
      sb.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          window.location.href = 'auth.html';
        }
      });

    } catch (err) {
      console.warn('[Auth] Vérification session échouée:', err.message);
    }
  });
})();

// ════════════════════════════════════════
// FIX 2 — Factures : fonctions manquantes
// Alias pour les fonctions qui peuvent manquer
// ════════════════════════════════════════

window.addEventListener('DOMContentLoaded', () => {

  // Alias renderLignesFac → renderLignesFacture
  if (typeof window.renderLignesFac === 'undefined' && typeof window.renderLignesFacture !== 'undefined') {
    window.renderLignesFac = window.renderLignesFacture;
  }

  // Alias ajouterLigneFac → ajouterLigneFacture
  if (typeof window.ajouterLigneFac === 'undefined') {
    window.ajouterLigneFac = function() {
      if (typeof facLignes !== 'undefined') {
        facLignes.push({ desc: '', qte: 1, prix: 0 });
        if (typeof renderLignesFac === 'function') renderLignesFac();
        if (typeof calcFacTotal === 'function') calcFacTotal();
      }
    };
  }

  // Alias mettreAJourLigne
  if (typeof window.mettreAJourLigne === 'undefined') {
    window.mettreAJourLigne = function(index, champ, valeur) {
      if (typeof facLignes !== 'undefined' && facLignes[index]) {
        facLignes[index][champ] = champ === 'desc' ? valeur : parseFloat(valeur) || 0;
        if (typeof calcFacTotal === 'function') calcFacTotal();
      }
    };
  }

  // Alias supprimerLigne
  if (typeof window.supprimerLigne === 'undefined') {
    window.supprimerLigne = function(index) {
      if (typeof facLignes !== 'undefined') {
        if (facLignes.length <= 1) {
          if (typeof toast === 'function') toast('La facture doit avoir au moins un article');
          return;
        }
        facLignes.splice(index, 1);
        if (typeof renderLignesFac === 'function') renderLignesFac();
        if (typeof calcFacTotal === 'function') calcFacTotal();
      }
    };
  }

  // S'assurer que calcFacTotal existe
  if (typeof window.calcFacTotal === 'undefined' && typeof window.majTotalFac !== 'undefined') {
    window.calcFacTotal = window.majTotalFac;
  }

  // Fix ouvrirNouvelleFacture si elle plante
  const _origOuvrir = window.ouvrirNouvelleFacture;
  if (_origOuvrir) {
    window.ouvrirNouvelleFacture = function() {
      try {
        _origOuvrir();
      } catch (err) {
        console.error('[Factures] Erreur ouverture:', err);
        // Fallback minimal
        if (typeof facLignes !== 'undefined') {
          facLignes = [{ desc: '', qte: 1, prix: 0 }];
        }
        const modal = document.getElementById('modal-facture');
        if (modal) modal.classList.add('open');
        const numBadge = document.getElementById('fac-num-badge');
        if (numBadge && typeof genNumFacture === 'function') {
          numBadge.textContent = genNumFacture();
        }
        const dateEl = document.getElementById('fac-date');
        if (dateEl && typeof today === 'function') dateEl.value = today();
        if (typeof renderLignesFac === 'function') renderLignesFac();
      }
    };
  }

  // ════════════════════════════════════════
  // FIX 3 — Mobile : corriger les bugs visuels
  // ════════════════════════════════════════

  if (window.innerWidth <= 768) {

    // S'assurer que le topbar est correct sur mobile
    const topbar = document.querySelector('.topbar');
    if (topbar) {
      topbar.style.left = '0';
    }

    // S'assurer que le content a le bon margin
    const content = document.getElementById('content');
    if (content) {
      content.style.marginLeft = '0';
      content.style.paddingBottom = '80px';
    }

    // Cacher la sidebar sur mobile
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.style.display = 'none';

    // Afficher la bottom nav
    const bnav = document.querySelector('.bottomnav');
    if (bnav) bnav.style.display = 'flex';

    // Fix : topbar action btn trop grand sur mobile
    const topbarBtn = document.getElementById('topbar-action');
    if (topbarBtn) {
      topbarBtn.style.padding = '7px 12px';
      topbarBtn.style.fontSize = '12px';
    }
  }

  // ════════════════════════════════════════
  // FIX 4 — Navigation : s'assurer que nav() existe
  // ════════════════════════════════════════

  if (typeof window.naviguer === 'function' && typeof window.nav === 'undefined') {
    window.nav = function(page, el, bnav) {
      naviguer(page, {});
    };
  }

  console.log('[Géri] Patches appliqués ✓');
});
