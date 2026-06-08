# 🛍️ Géri — Application de gestion boutique Sénégal

> **SaaS de gestion commerciale** conçu pour les boutiques, commerces et PME sénégalaises.  
> Stack : HTML/CSS/JS statique · Supabase · Vercel

---

## 🌐 Démo live

**→ [geri-saas.vercel.app](https://geri-saas.vercel.app)**

---

## 📦 Structure du projet

```
geri-saas/
├── public/
│   ├── index.html          ← Page d'accueil / marketing
│   ├── auth.html           ← Connexion / Inscription
│   └── app.html            ← Application principale (SPA)
├── supabase/
│   ├── schema.sql          ← Schéma complet de la base de données
│   └── migrations/
│       └── 001_schema.sql  ← Migration initiale
├── vercel.json             ← Configuration déploiement Vercel
├── vite.config.js          ← Config build
├── package.json
└── DEPLOIEMENT.md          ← Guide complet de déploiement
```

---

## ✨ Fonctionnalités

| Module | Description |
|--------|-------------|
| 🏪 **Boutique** | Profil boutique, logo, coordonnées |
| 📦 **Produits** | Catalogue, stock, alertes rupture |
| 💰 **Ventes** | Caisse, reçus WhatsApp/PDF |
| 👥 **Employés** | Rôles, accès, suivi des ventes |
| 📊 **Dashboard** | CA du jour, semaine, mois |
| 💳 **Plans** | Gratuit / Pro (3 500 FCFA) / Business (7 500 FCFA) |
| 📱 **Paiements** | Wave, Orange Money via PayDunya |

---

## 🚀 Déploiement rapide

### Prérequis
- Compte [Supabase](https://supabase.com) (gratuit)
- Compte [Vercel](https://vercel.com) (gratuit)

### 1. Base de données
```sql
-- Dans Supabase > SQL Editor, exécuter :
-- supabase/schema.sql
```

### 2. Configuration
Dans `public/auth.html` et `public/app.html`, remplacer :
```javascript
const SUPABASE_URL = 'https://VOTRE_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'VOTRE_ANON_KEY';
```

### 3. Déploiement
```bash
# Via Vercel CLI
npx vercel

# Ou connecter ce repo sur vercel.com → Import Git Repository
```

> Guide complet dans [DEPLOIEMENT.md](./DEPLOIEMENT.md)

---

## 🛠️ Stack technique

| Couche | Techno |
|--------|--------|
| Frontend | HTML5 / CSS3 / JavaScript vanilla |
| Base de données | Supabase (PostgreSQL + Auth + RLS) |
| Hébergement | Vercel (CDN mondial) |
| Paiements | PayDunya (Wave, Orange Money) |
| Reçus | WhatsApp API / PDF natif |

---

## 🗄️ Modèle de données

```
boutiques ──< employes
boutiques ──< produits ──< categories
boutiques ──< ventes ──< vente_items >── produits
boutiques ──< depenses
boutiques ──< clients
```

Toutes les tables sont protégées par **Row Level Security (RLS)** — chaque boutique ne voit que ses propres données.

---

## 📱 Paiements Wave / Orange Money

Intégration via [PayDunya](https://paydunya.com) — voir `DEPLOIEMENT.md` étape 6 pour le code d'intégration.

---

## 🌍 Roadmap

- [ ] App mobile (PWA)
- [ ] Multi-devise (FCFA, EUR)
- [ ] Export comptabilité
- [ ] Gestion fournisseurs
- [ ] API publique

---

## 📄 Licence

Propriétaire — © 2026 Géri. Tous droits réservés.

---

*Fait avec ❤️ pour le commerce sénégalais 🇸🇳*
