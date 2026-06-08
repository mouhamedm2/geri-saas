# 🚀 GÉRI — Guide de déploiement complet

## Ce que contient ce dossier

```
geri-saas/
├── public/
│   ├── index.html      ← Page d'accueil / marketing
│   ├── auth.html       ← Connexion / Inscription
│   └── app.html        ← L'application principale
├── supabase/
│   └── schema.sql      ← Base de données à créer
├── vercel.json         ← Config déploiement Vercel
└── DEPLOIEMENT.md      ← Ce fichier
```

---

## ÉTAPE 1 — Créer la base de données Supabase (15 min)

### 1.1 Créer un compte Supabase
1. Aller sur **https://supabase.com**
2. Cliquer "Start your project" → créer un compte gratuit
3. Cliquer "New Project"
4. Remplir :
   - **Organization** : Géri
   - **Name** : geri-prod
   - **Database Password** : choisir un mot de passe fort (le noter !)
   - **Region** : choisir "West EU (Ireland)" — le plus proche du Sénégal
5. Cliquer "Create new project" → attendre 2 minutes

### 1.2 Créer les tables
1. Dans Supabase, aller dans **SQL Editor** (icône base de données à gauche)
2. Cliquer "New query"
3. Copier-coller **tout le contenu** du fichier `supabase/schema.sql`
4. Cliquer **"Run"** (ou Ctrl+Enter)
5. Vérifier que vous voyez "Success. No rows returned"

### 1.3 Récupérer vos clés API
1. Aller dans **Settings** → **API**
2. Copier :
   - **Project URL** → `https://XXXX.supabase.co`
   - **anon / public key** → longue chaîne commençant par `eyJ...`

---

## ÉTAPE 2 — Configurer les clés dans le code (5 min)

Dans les fichiers `public/auth.html` ET `public/app.html`, remplacer :

```javascript
const SUPABASE_URL = 'https://VOTRE_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'VOTRE_ANON_KEY';
```

Par vos vraies valeurs :

```javascript
const SUPABASE_URL = 'https://abcdefghijk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

**⚠️ Important** : La clé `anon` est publique et sécurisée par RLS — c'est normal de la mettre dans le code.

---

## ÉTAPE 3 — Déployer sur Vercel (10 min)

### Option A — Interface web (la plus simple)

1. Aller sur **https://vercel.com** → créer un compte gratuit
2. Cliquer **"Add New Project"**
3. Choisir **"Import Git Repository"**
   - Si vous avez mis le code sur GitHub : connecter GitHub et choisir le repo
   - Sinon : cliquer "Deploy" depuis la CLI (voir Option B)
4. Vercel détecte automatiquement le projet
5. Cliquer **"Deploy"**
6. En 2 minutes vous avez une URL du type `geri-saas.vercel.app`

### Option B — Via terminal (si vous avez Node.js installé)

```bash
# Installer Vercel CLI
npm install -g vercel

# Dans le dossier geri-saas
cd geri-saas
vercel

# Suivre les instructions :
# - Lier à votre compte Vercel
# - Nom du projet : geri-saas
# - Dossier source : ./
# → URL générée automatiquement
```

---

## ÉTAPE 4 — Domaine personnalisé (optionnel, 5 min)

### Acheter un domaine .sn
- **https://www.registre.sn** — registre officiel sénégalais
- Prix : ~5 000 FCFA/an pour un .sn
- Suggestions : `geri.sn`, `geri-app.sn`, `mygeri.sn`

### Lier à Vercel
1. Dans Vercel → votre projet → **Settings** → **Domains**
2. Taper votre domaine ex: `geri.sn`
3. Vercel donne des records DNS à copier
4. Les coller dans le panneau DNS de votre registrar
5. Attendre 10–30 min pour la propagation

---

## ÉTAPE 5 — Activer les emails (optionnel)

Dans Supabase → **Authentication** → **Email Templates** :
- Personnaliser l'email de confirmation en français
- Remplacer "Supabase" par "Géri"

Dans **Authentication** → **Settings** :
- **Site URL** : mettre votre URL Vercel ou domaine
- **Redirect URLs** : ajouter `https://votre-domaine/app.html`

---

## ÉTAPE 6 — Paiements Wave/Orange Money

### PayDunya (recommandé pour le Sénégal)
1. Créer un compte sur **https://paydunya.com**
2. Obtenir les clés API
3. Ajouter ce code dans `app.html` pour déclencher un paiement :

```javascript
async function initierAbonnement(plan) {
  const montant = plan === 'pro' ? 3500 : 7500;
  const response = await fetch('https://app.paydunya.com/api/v1/checkout-invoice/create', {
    method: 'POST',
    headers: {
      'PAYDUNYA-MASTER-KEY': 'VOTRE_MASTER_KEY',
      'PAYDUNYA-PUBLIC-KEY': 'VOTRE_PUBLIC_KEY',
      'PAYDUNYA-TOKEN': 'VOTRE_TOKEN',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      invoice: { total_amount: montant, description: `Géri ${plan} — 1 mois` },
      store: { name: 'Géri App' },
      actions: { callback_url: 'https://votre-domaine/webhook' }
    })
  });
  const data = await response.json();
  window.open(data.response_text, '_blank'); // ouvre Wave/Orange Money
}
```

---

## Checklist finale avant lancement

- [ ] Tables Supabase créées (schema.sql exécuté)
- [ ] Clés Supabase remplacées dans auth.html et app.html
- [ ] Déployé sur Vercel — URL fonctionnelle
- [ ] Test inscription → connexion → ajout produit → vente → reçu WhatsApp
- [ ] Domaine .sn lié (optionnel)
- [ ] Email de confirmation en français
- [ ] Paiements Wave/Orange configurés (optionnel phase 2)

---

## Support & Ressources

- **Supabase docs** : https://supabase.com/docs
- **Vercel docs** : https://vercel.com/docs
- **PayDunya docs** : https://paydunya.com/developers

---

*Géri — Gestion boutique Sénégal 🇸🇳*
