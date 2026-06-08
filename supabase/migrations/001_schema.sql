-- ================================================================
-- GÉRI — Supabase Database Schema
-- À exécuter dans Supabase > SQL Editor
-- ================================================================

-- Activer Row Level Security sur toutes les tables
-- Chaque utilisateur voit UNIQUEMENT ses propres données

-- ── TABLE: boutiques ──────────────────────────────────────────
CREATE TABLE boutiques (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nom         TEXT NOT NULL DEFAULT 'Ma Boutique',
  telephone   TEXT,
  ville       TEXT,
  adresse     TEXT,
  footer_recu TEXT DEFAULT 'Merci pour votre achat !',
  plan        TEXT DEFAULT 'gratuit', -- 'gratuit' | 'pro' | 'business'
  plan_expiry TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE boutiques ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_boutique" ON boutiques
  FOR ALL USING (auth.uid() = user_id);

-- ── TABLE: employes ───────────────────────────────────────────
CREATE TABLE employes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  boutique_id UUID REFERENCES boutiques(id) ON DELETE CASCADE NOT NULL,
  nom         TEXT NOT NULL,
  role        TEXT DEFAULT 'Vendeur',
  acces       TEXT DEFAULT 'ventes',
  telephone   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE employes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_employes" ON employes
  FOR ALL USING (
    boutique_id IN (SELECT id FROM boutiques WHERE user_id = auth.uid())
  );

-- ── TABLE: produits ───────────────────────────────────────────
CREATE TABLE produits (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  boutique_id UUID REFERENCES boutiques(id) ON DELETE CASCADE NOT NULL,
  nom         TEXT NOT NULL,
  categorie   TEXT DEFAULT 'general',
  prix_achat  NUMERIC(12,0) DEFAULT 0,
  prix_vente  NUMERIC(12,0) NOT NULL,
  stock       INTEGER DEFAULT 0,
  alerte      INTEGER DEFAULT 5,
  unite       TEXT DEFAULT 'pièce',
  vendu       INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE produits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_produits" ON produits
  FOR ALL USING (
    boutique_id IN (SELECT id FROM boutiques WHERE user_id = auth.uid())
  );

-- ── TABLE: ventes ─────────────────────────────────────────────
CREATE TABLE ventes (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  boutique_id     UUID REFERENCES boutiques(id) ON DELETE CASCADE NOT NULL,
  date_vente      DATE NOT NULL DEFAULT CURRENT_DATE,
  heure           TEXT,
  client_nom      TEXT,
  client_tel      TEXT,
  vendeur         TEXT,
  total           NUMERIC(12,0) NOT NULL,
  benefice        NUMERIC(12,0) DEFAULT 0,
  mode_paiement   TEXT DEFAULT 'especes',
  items           JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE ventes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_ventes" ON ventes
  FOR ALL USING (
    boutique_id IN (SELECT id FROM boutiques WHERE user_id = auth.uid())
  );

-- ── TABLE: dettes ─────────────────────────────────────────────
CREATE TABLE dettes (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  boutique_id     UUID REFERENCES boutiques(id) ON DELETE CASCADE NOT NULL,
  client_nom      TEXT NOT NULL,
  description     TEXT,
  montant         NUMERIC(12,0) NOT NULL,
  date_dette      DATE DEFAULT CURRENT_DATE,
  date_remb       DATE,
  payee           BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE dettes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_dettes" ON dettes
  FOR ALL USING (
    boutique_id IN (SELECT id FROM boutiques WHERE user_id = auth.uid())
  );

-- ── TABLE: factures ───────────────────────────────────────────
CREATE TABLE factures (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  boutique_id     UUID REFERENCES boutiques(id) ON DELETE CASCADE NOT NULL,
  numero          TEXT NOT NULL,
  client_nom      TEXT NOT NULL,
  client_tel      TEXT,
  note            TEXT,
  date_facture    DATE DEFAULT CURRENT_DATE,
  lignes          JSONB NOT NULL DEFAULT '[]',
  total           NUMERIC(12,0) NOT NULL,
  statut          TEXT DEFAULT 'brouillon', -- 'brouillon' | 'envoyée' | 'payée'
  created_at      TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE factures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_factures" ON factures
  FOR ALL USING (
    boutique_id IN (SELECT id FROM boutiques WHERE user_id = auth.uid())
  );

-- ── INDEXES pour les performances ────────────────────────────
CREATE INDEX idx_ventes_boutique_date ON ventes(boutique_id, date_vente);
CREATE INDEX idx_produits_boutique ON produits(boutique_id);
CREATE INDEX idx_dettes_boutique ON dettes(boutique_id, payee);
CREATE INDEX idx_factures_boutique ON factures(boutique_id);

-- ── FUNCTION: auto-update updated_at ─────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER produits_updated_at
  BEFORE UPDATE ON produits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── NOTE: Créer la boutique automatiquement à l'inscription ──
-- Ce trigger crée une boutique par défaut pour chaque nouvel utilisateur
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO boutiques (user_id, nom)
  VALUES (NEW.id, 'Ma Boutique');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
