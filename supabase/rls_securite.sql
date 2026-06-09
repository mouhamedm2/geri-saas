-- ═══════════════════════════════════════════════════════
-- RLS SÉCURITÉ — GÉRI SAAS
-- Tables réelles : boutiques, employes, produits, ventes, dettes, factures, audit_logs
-- À exécuter dans Supabase > SQL Editor
-- ═══════════════════════════════════════════════════════

-- 1. Activer RLS sur toutes les tables
ALTER TABLE boutiques    ENABLE ROW LEVEL SECURITY;
ALTER TABLE employes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE produits     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE dettes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE factures     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs   ENABLE ROW LEVEL SECURITY;

-- 2. BOUTIQUES — propriétaire uniquement
DROP POLICY IF EXISTS "boutiques_owner" ON boutiques;
CREATE POLICY "boutiques_owner" ON boutiques
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Tables liées via boutique_id
DROP POLICY IF EXISTS "employes_owner"  ON employes;
DROP POLICY IF EXISTS "produits_owner"  ON produits;
DROP POLICY IF EXISTS "ventes_owner"    ON ventes;
DROP POLICY IF EXISTS "dettes_owner"    ON dettes;
DROP POLICY IF EXISTS "factures_owner"  ON factures;

CREATE POLICY "employes_owner" ON employes
  USING  (boutique_id IN (SELECT id FROM boutiques WHERE user_id = auth.uid()))
  WITH CHECK (boutique_id IN (SELECT id FROM boutiques WHERE user_id = auth.uid()));

CREATE POLICY "produits_owner" ON produits
  USING  (boutique_id IN (SELECT id FROM boutiques WHERE user_id = auth.uid()))
  WITH CHECK (boutique_id IN (SELECT id FROM boutiques WHERE user_id = auth.uid()));

CREATE POLICY "ventes_owner" ON ventes
  USING  (boutique_id IN (SELECT id FROM boutiques WHERE user_id = auth.uid()))
  WITH CHECK (boutique_id IN (SELECT id FROM boutiques WHERE user_id = auth.uid()));

CREATE POLICY "dettes_owner" ON dettes
  USING  (boutique_id IN (SELECT id FROM boutiques WHERE user_id = auth.uid()))
  WITH CHECK (boutique_id IN (SELECT id FROM boutiques WHERE user_id = auth.uid()));

CREATE POLICY "factures_owner" ON factures
  USING  (boutique_id IN (SELECT id FROM boutiques WHERE user_id = auth.uid()))
  WITH CHECK (boutique_id IN (SELECT id FROM boutiques WHERE user_id = auth.uid()));

-- 4. AUDIT LOGS
DROP POLICY IF EXISTS "audit_insert_own" ON audit_logs;
DROP POLICY IF EXISTS "audit_select_own" ON audit_logs;
CREATE POLICY "audit_insert_own" ON audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "audit_select_own" ON audit_logs FOR SELECT USING (auth.uid() = user_id);

-- 5. Vérification finale
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
