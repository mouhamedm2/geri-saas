-- ═══════════════════════════════════════
-- GÉRI — Schéma Supabase
-- Exécuter dans Supabase > SQL Editor
-- ═══════════════════════════════════════

-- Extension UUID
create extension if not exists "uuid-ossp";

-- ── Boutiques ──
create table boutiques (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  nom text not null default 'Ma Boutique',
  tel text,
  ville text,
  adresse text,
  footer_recu text default 'Merci pour votre achat !',
  plan text default 'gratuit', -- 'gratuit' | 'pro' | 'business'
  plan_expire_at timestamptz,
  created_at timestamptz default now()
);

-- ── Employés ──
create table employes (
  id uuid primary key default uuid_generate_v4(),
  boutique_id uuid references boutiques(id) on delete cascade not null,
  nom text not null,
  role text default 'Vendeur',
  acces text default 'ventes',
  tel text,
  created_at timestamptz default now()
);

-- ── Produits ──
create table produits (
  id uuid primary key default uuid_generate_v4(),
  boutique_id uuid references boutiques(id) on delete cascade not null,
  nom text not null,
  cat text default 'general',
  achat numeric default 0,
  vente numeric not null,
  stock integer default 0,
  alerte integer default 5,
  unite text default 'pièce',
  vendu integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Ventes ──
create table ventes (
  id uuid primary key default uuid_generate_v4(),
  boutique_id uuid references boutiques(id) on delete cascade not null,
  date date not null default current_date,
  heure text,
  items jsonb not null default '[]',
  total numeric not null default 0,
  benefice numeric default 0,
  mode_paiement text default 'especes',
  client text,
  client_tel text,
  vendeur text,
  type text default 'vente',
  created_at timestamptz default now()
);

-- ── Dettes ──
create table dettes (
  id uuid primary key default uuid_generate_v4(),
  boutique_id uuid references boutiques(id) on delete cascade not null,
  client text not null,
  description text,
  montant numeric not null,
  date date default current_date,
  date_remb date,
  payee boolean default false,
  created_at timestamptz default now()
);

-- ── Factures ──
create table factures (
  id uuid primary key default uuid_generate_v4(),
  boutique_id uuid references boutiques(id) on delete cascade not null,
  num text not null,
  client text not null,
  tel text,
  note text,
  date date default current_date,
  lignes jsonb not null default '[]',
  total numeric not null default 0,
  statut text default 'brouillon',
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- Chaque utilisateur ne voit que ses données
-- ═══════════════════════════════════════

alter table boutiques enable row level security;
alter table employes enable row level security;
alter table produits enable row level security;
alter table ventes enable row level security;
alter table dettes enable row level security;
alter table factures enable row level security;

-- Boutiques : l'utilisateur ne voit que ses boutiques
create policy "Mes boutiques" on boutiques
  for all using (auth.uid() = user_id);

-- Toutes les autres tables : via boutique_id
create policy "Mes employes" on employes
  for all using (
    boutique_id in (select id from boutiques where user_id = auth.uid())
  );

create policy "Mes produits" on produits
  for all using (
    boutique_id in (select id from boutiques where user_id = auth.uid())
  );

create policy "Mes ventes" on ventes
  for all using (
    boutique_id in (select id from boutiques where user_id = auth.uid())
  );

create policy "Mes dettes" on dettes
  for all using (
    boutique_id in (select id from boutiques where user_id = auth.uid())
  );

create policy "Mes factures" on factures
  for all using (
    boutique_id in (select id from boutiques where user_id = auth.uid())
  );

-- ── Trigger updated_at sur produits ──
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger produits_updated_at
  before update on produits
  for each row execute function update_updated_at();

-- ═══════════════════════════════════════
-- DONNÉES DE TEST (optionnel)
-- ═══════════════════════════════════════
-- (Décommenter après avoir créé un compte)
-- insert into boutiques (user_id, nom, tel, ville)
-- values (auth.uid(), 'Boutique Test', '+221 77 000 00 00', 'Dakar');

-- ── Audit Logs (sécurité) ──
create table if not exists audit_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  event text not null,
  details jsonb default '{}',
  ip text,
  created_at timestamptz default now()
);

-- Index pour recherche rapide par user et événement
create index if not exists idx_audit_user on audit_logs(user_id);
create index if not exists idx_audit_event on audit_logs(event);
create index if not exists idx_audit_created on audit_logs(created_at desc);

-- RLS : uniquement l'admin peut lire les logs
alter table audit_logs enable row level security;
create policy "audit_insert_own" on audit_logs for insert with check (true);
create policy "audit_select_own" on audit_logs for select using (auth.uid() = user_id);

-- ── Clé d'invitation boutique ──
ALTER TABLE boutiques ADD COLUMN IF NOT EXISTS invite_key text unique;

-- ── Comptes employés (liés à auth.users + boutique) ──
CREATE TABLE IF NOT EXISTS employe_accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  boutique_id uuid REFERENCES boutiques(id) ON DELETE CASCADE NOT NULL,
  employe_id uuid REFERENCES employes(id) ON DELETE SET NULL,
  nom text NOT NULL,
  role text DEFAULT 'Vendeur',
  acces text DEFAULT 'ventes',
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, boutique_id)
);

ALTER TABLE employe_accounts ENABLE ROW LEVEL SECURITY;

-- L'employé voit son propre compte
CREATE POLICY "emp_account_own" ON employe_accounts
  FOR ALL USING (auth.uid() = user_id);

-- Le patron voit les comptes de sa boutique
CREATE POLICY "emp_account_patron" ON employe_accounts
  FOR SELECT USING (
    boutique_id IN (SELECT id FROM boutiques WHERE user_id = auth.uid())
  );
