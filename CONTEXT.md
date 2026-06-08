# 🧠 CONTEXT.md — Géri SaaS
> **Lis ce fichier en entier avant de toucher au code.**  
> Il contient tout ce qu'une IA (ou un développeur) doit savoir pour travailler efficacement sur ce projet.

---

## 1. Identité du projet

| Champ | Valeur |
|-------|--------|
| **Nom** | Géri |
| **Type** | SaaS de gestion commerciale |
| **Marché cible** | Boutiques, commerces, PME au Sénégal et en Afrique de l'Ouest |
| **Langue de l'UI** | Français |
| **Devise** | FCFA (Franc CFA) |
| **Repo GitHub** | https://github.com/mouhamedm2/geri-saas |
| **URL live** | https://geri-saas.vercel.app |
| **Propriétaire** | mouhamedm2 |

---

## 2. Stack technique

| Couche | Techno | Détail |
|--------|--------|--------|
| Frontend | HTML5 / CSS3 / JS vanilla | Pas de framework (React, Vue, etc.) |
| Base de données | Supabase | PostgreSQL + Auth + Row Level Security |
| Hébergement | Vercel | Déploiement automatique depuis GitHub |
| Paiements | PayDunya | Wave, Orange Money, CB |
| Fonts | Syne (titres) + DM Sans (corps) | Via Google Fonts |

> ⚠️ **Pas de build step** — le code dans `public/` est servi directement. Pas de npm build, pas de bundler actif.

---

## 3. Structure des fichiers

```
geri-saas/
├── public/
│   ├── index.html      ← Page marketing / landing
│   ├── auth.html       ← Connexion & Inscription (Supabase Auth)
│   └── app.html        ← SPA principale (~3 000 lignes, tout-en-un)
├── supabase/
│   ├── schema.sql      ← Schéma complet à exécuter dans Supabase SQL Editor
│   └── migrations/
│       └── 001_schema.sql
├── vercel.json         ← Rewrites : toutes les routes → /public
├── vite.config.js      ← Config (non utilisé en prod, pour dev local)
├── package.json        ← Scripts dev/start avec npx serve
├── README.md           ← Présentation publique du projet
└── CONTEXT.md          ← CE FICHIER — contexte complet pour les IA
```

---

## 4. Architecture de app.html

`app.html` est une **Single Page Application monolithique**. Tout est dans un seul fichier :
- CSS complet en `<style>` dans le `<head>`
- HTML de base (sidebar, topbar, modals)
- JavaScript complet en `<script>` en fin de `<body>`

### Modules de l'application

| Module | Fonction dans le code | Description |
|--------|-----------------------|-------------|
| Dashboard | `showDashboard()` | KPIs du jour, ventes récentes, alertes stock |
| Produits | `showProduits()` | Catalogue, CRUD, stock, catégories |
| Ventes | `showVentes()` | Caisse, historique, reçus WhatsApp/PDF |
| Employés | `showEmployes()` | Gestion équipe, rôles, accès |
| Clients | `showClients()` | Fichier client, historique achats |
| Dépenses | `showDepenses()` | Suivi des charges |
| Rapports | `showRapports()` | CA période, comparaisons |
| Paramètres | `showParametres()` | Profil boutique, plans, config |

### Variables Supabase à configurer

Dans `auth.html` ET `app.html`, chercher et remplacer :
```javascript
const SUPABASE_URL = 'https://VOTRE_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'VOTRE_ANON_KEY';
```

---

## 5. Modèle de données (Supabase)

```
auth.users (Supabase natif)
    │
    └── boutiques (1 user → 1 boutique)
            │
            ├── produits
            │       └── (ref) categories
            ├── categories
            ├── ventes
            │       └── vente_items → produits
            ├── employes
            ├── clients
            └── depenses
```

### Tables principales

```sql
boutiques    (id, user_id, nom, tel, ville, plan, plan_expire_at)
produits     (id, boutique_id, nom, prix_vente, prix_achat, stock, stock_min, categorie_id)
categories   (id, boutique_id, nom, couleur)
ventes       (id, boutique_id, employe_id, client_id, total, paiement, statut)
vente_items  (id, vente_id, produit_id, qte, prix_unitaire)
employes     (id, boutique_id, nom, role, acces, tel)
clients      (id, boutique_id, nom, tel, email, total_achats)
depenses     (id, boutique_id, montant, categorie, description)
```

> Toutes les tables ont **RLS activé** — chaque boutique est isolée.

---

## 6. Design system

```css
--ink:    #0A1628   /* Fond principal (bleu nuit) */
--ink2:   #1C2E4A   /* Fond secondaire (sidebar, cards) */
--teal:   #00C896   /* Couleur principale (vert émeraude) */
--gold:   #F5C842   /* Accent (jaune or) */
--cream:  #F7F4EE   /* Texte principal */
--danger: #FF5A5A   /* Erreurs, stock vide */
--warn:   #FFA940   /* Alertes, stock faible */
```

- **Titres** : font `Syne` (bold, fort)
- **Corps** : font `DM Sans` (lisible)
- **Modals** : slide-up depuis le bas (mobile-first)
- **Breakpoint mobile** : `768px` — bottomnav remplace sidebar

---

## 7. Plans tarifaires

| Plan | Prix | Limites |
|------|------|---------|
| Gratuit | 0 FCFA | 50 produits, 1 employé |
| Pro | 3 500 FCFA/mois | Illimité, rapports avancés |
| Business | 7 500 FCFA/mois | Multi-boutiques, API, priorité support |

---

## 8. Conventions de code

- **Pas de `var`** — utiliser `const` et `let`
- **Fonctions nommées** pour chaque module : `showXxx()`, `openXxxModal()`, `saveXxx()`
- **Supabase client** : initialisé une fois en haut du script, variable globale `supabase`
- **Toast notifications** : fonction `showToast(message, type)` — types : `success`, `error`, `warn`
- **Formatage FCFA** : fonction `fmt(montant)` → ex: `fmt(3500)` → `"3 500 FCFA"`
- **Dates** : format français `DD/MM/YYYY`

---

## 9. Comment modifier le projet

### Via GitHub directement (API)
Le repo est accessible avec un token GitHub. Un assistant IA avec accès à bash peut :
```bash
# Modifier un fichier
git checkout main
# ... modifier le fichier ...
git add .
git commit -m "feat: description"
git push origin main
```
Vercel re-déploie automatiquement à chaque push sur `main`.

### Localement
```bash
git clone https://github.com/mouhamedm2/geri-saas.git
cd geri-saas
npm run dev   # Lance sur http://localhost:3000
```

---

## 10. Ce qui reste à faire (Roadmap)

- [ ] Intégration PayDunya complète (Wave / Orange Money)
- [ ] PWA (Service Worker, icône, install prompt)
- [ ] Export PDF des rapports
- [ ] Notifications push (stock bas)
- [ ] Multi-devise (FCFA, EUR, USD)
- [ ] API publique pour intégrations tierces
- [ ] Dashboard analytique avancé

---

## 11. Prompt rapide pour démarrer

Si tu es une IA qui vient de lire ce fichier, tu as maintenant tout le contexte.  
Demande au propriétaire ce qu'il veut faire aujourd'hui, et commence à travailler directement.

---

*Géri — Fait pour le commerce africain 🇸🇳 · Dernière mise à jour : juin 2026*
