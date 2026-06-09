-- ═══════════════════════════════════════════════════════
-- VÉRIFICATION ET ACTIVATION RLS SUR TOUTES LES TABLES
-- À exécuter dans Supabase > SQL Editor
-- ═══════════════════════════════════════════════════════

-- Activer RLS sur toutes les tables métier
ALTER TABLE boutiques ENABLE ROW LEVEL SECURITY;
ALTER TABLE produits ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vente_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE employes ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE depenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies boutiques : lecture/écriture uniquement pour le propriétaire
DROP POLICY IF EXISTS "boutiques_owner" ON boutiques;
CREATE POLICY "boutiques_owner" ON boutiques
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies pour tables liées à boutique_id
-- (produits, categories, ventes, employes, clients, depenses)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['produits','categories','ventes','employes','clients','depenses']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_boutique_owner" ON %s', tbl, tbl);
    EXECUTE format('
      CREATE POLICY "%s_boutique_owner" ON %s
      USING (boutique_id IN (SELECT id FROM boutiques WHERE user_id = auth.uid()))
      WITH CHECK (boutique_id IN (SELECT id FROM boutiques WHERE user_id = auth.uid()))',
      tbl, tbl);
  END LOOP;
END $$;

-- Vente_items via ventes
DROP POLICY IF EXISTS "vente_items_owner" ON vente_items;
CREATE POLICY "vente_items_owner" ON vente_items
  USING (vente_id IN (
    SELECT v.id FROM ventes v
    JOIN boutiques b ON b.id = v.boutique_id
    WHERE b.user_id = auth.uid()
  ));

-- Vérification finale
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
