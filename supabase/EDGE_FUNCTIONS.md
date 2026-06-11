# Déploiement des Edge Functions Supabase — Géri

## Prérequis
```bash
npm install -g supabase
supabase login
supabase link --project-ref hjbptsdhxqbitqdiybnf
```

## Variables d'environnement à configurer

Dans **Supabase Dashboard → Settings → Edge Functions → Secrets** :

```
NOTCHPAY_SECRET_KEY = sk_test.2pF71h7mxNZdiCzv4k2vBXg6lcO6HjXiNe1t5YtMDM5oFn1MoLyqTE2j9lzK1ckRgr4waqGpAWKHUHaPKkAPch2IQXdo8YuyjGSgOAow4gFZrtHz3BaPWRWo8GJFK
NOTCHPAY_HASH     = [Récupérer dans Notchpay Dashboard → Webhooks → Secret Hash]
SUPABASE_SERVICE_ROLE_KEY = [Supabase → Settings → API → service_role key]
```

## Déployer les fonctions
```bash
supabase functions deploy create-payment
supabase functions deploy notchpay-webhook
```

## Configurer le Webhook Notchpay

Dans **Notchpay Dashboard → Webhooks → Add Webhook** :
- URL : `https://hjbptsdhxqbitqdiybnf.supabase.co/functions/v1/notchpay-webhook`
- Events : `payment.complete`

## URLs des fonctions déployées
- Paiement : `https://hjbptsdhxqbitqdiybnf.supabase.co/functions/v1/create-payment`
- Webhook  : `https://hjbptsdhxqbitqdiybnf.supabase.co/functions/v1/notchpay-webhook`
