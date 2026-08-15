/**
 * GÉRI — Sécurité côté client
 * Points couverts :
 * #8  Block field tampering    — validation stricte des types/longueurs
 * #11 Rate limit login         — compteur de tentatives avec lockout
 * #12 Bot protection           — CSRF token + honeypot + timing check
 * #14 Validate all input       — validation avant tout envoi
 * #15 Escape user content      — sanitize() systématique
 * #16 Restrict file uploads    — type MIME + taille max
 * #9  Secure session           — nettoyage session à la déconnexion
 */

'use strict';

// ════════════════════════════════════════
// #11 — RATE LIMITING LOGIN
// Max 5 tentatives, lockout 15 minutes
// ════════════════════════════════════════

const RateLimit = (() => {
  const MAX_ATTEMPTS  = 5;
  const LOCKOUT_MS    = 15 * 60 * 1000; // 15 minutes
  const KEY_ATTEMPTS  = 'geri_auth_attempts';
  const KEY_LOCKOUT   = 'geri_auth_lockout';

  function getAttempts() {
    return parseInt(localStorage.getItem(KEY_ATTEMPTS) || '0');
  }

  function getLockoutUntil() {
    return parseInt(localStorage.getItem(KEY_LOCKOUT) || '0');
  }

  function isLocked() {
    const lockoutUntil = getLockoutUntil();
    if (lockoutUntil && Date.now() < lockoutUntil) return true;
    // Lockout expiré — réinitialiser
    if (lockoutUntil && Date.now() >= lockoutUntil) reset();
    return false;
  }

  function getRemainingLockout() {
    const lockoutUntil = getLockoutUntil();
    if (!lockoutUntil) return 0;
    return Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 60000));
  }

  function increment() {
    const attempts = getAttempts() + 1;
    localStorage.setItem(KEY_ATTEMPTS, String(attempts));
    if (attempts >= MAX_ATTEMPTS) {
      const lockoutUntil = Date.now() + LOCKOUT_MS;
      localStorage.setItem(KEY_LOCKOUT, String(lockoutUntil));
      return false; // Lockout activé
    }
    return MAX_ATTEMPTS - attempts; // Tentatives restantes
  }

  function reset() {
    localStorage.removeItem(KEY_ATTEMPTS);
    localStorage.removeItem(KEY_LOCKOUT);
  }

  function check() {
    if (isLocked()) {
      const mins = getRemainingLockout();
      throw new Error(
        `Trop de tentatives. Réessayez dans ${mins} minute${mins > 1 ? 's' : ''}.`
      );
    }
  }

  return { check, increment, reset, isLocked, getRemainingLockout };
})();

// Rendre disponible globalement pour auth.html
window.RateLimit = RateLimit;

// ════════════════════════════════════════
// #12 — BOT PROTECTION
// CSRF token + honeypot + timing check
// ════════════════════════════════════════

const BotProtection = (() => {
  // Générer un token CSRF stocké en sessionStorage
  function generateCSRF() {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    sessionStorage.setItem('geri_csrf', token);
    return token;
  }

  function getCSRF() {
    return sessionStorage.getItem('geri_csrf') || generateCSRF();
  }

  function validateCSRF(token) {
    const stored = sessionStorage.getItem('geri_csrf');
    return stored && token === stored;
  }

  // Timing check — un humain met au moins 1.5 secondes
  let pageLoadTime = Date.now();

  function checkTiming() {
    const elapsed = Date.now() - pageLoadTime;
    if (elapsed < 1500) {
      console.warn('[Security] Soumission trop rapide — possible bot');
      return false;
    }
    return true;
  }

  // Vérifier si le champ honeypot est vide
  function checkHoneypot(fieldId = 'hp-field') {
    const field = document.getElementById(fieldId);
    return !field || field.value === '';
  }

  return { generateCSRF, getCSRF, validateCSRF, checkTiming, checkHoneypot };
})();

window.BotProtection = BotProtection;

// ════════════════════════════════════════
// #14 #8 — VALIDATION STRICTE DES INPUTS
// ════════════════════════════════════════

const Validator = (() => {

  const RULES = {
    email: {
      pattern: /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/,
      maxLength: 254,
      message: 'Email invalide.',
    },
    password: {
      minLength: 6,
      maxLength: 128,
      message: 'Le mot de passe doit avoir entre 6 et 128 caractères.',
    },
    nom: {
      minLength: 2,
      maxLength: 100,
      pattern: /^[\p{L}\s'\-\.]+$/u,
      message: 'Nom invalide (2-100 caractères, lettres seulement).',
    },
    shopname: {
      minLength: 2,
      maxLength: 100,
      message: 'Nom de boutique invalide (2-100 caractères).',
    },
    inviteKey: {
      pattern: /^[A-Z0-9]{4}-[A-Z0-9]{4}$/,
      message: "Clé d'invitation invalide. Format : ABCD-1234",
    },
    montant: {
      min: 0,
      max: 999999999,
      message: 'Montant invalide.',
    },
    texte: {
      maxLength: 500,
      message: 'Texte trop long (max 500 caractères).',
    },
    tel: {
      pattern: /^[0-9+\s\-]{7,20}$/,
      message: 'Numéro de téléphone invalide.',
    },
  };

  function validate(type, value) {
    const rule = RULES[type];
    if (!rule) return { valid: true };

    const v = String(value || '').trim();

    if (rule.minLength && v.length < rule.minLength) {
      return { valid: false, message: rule.message };
    }
    if (rule.maxLength && v.length > rule.maxLength) {
      return { valid: false, message: rule.message };
    }
    if (rule.pattern && !rule.pattern.test(v)) {
      return { valid: false, message: rule.message };
    }
    if (rule.min !== undefined && parseFloat(v) < rule.min) {
      return { valid: false, message: rule.message };
    }
    if (rule.max !== undefined && parseFloat(v) > rule.max) {
      return { valid: false, message: rule.message };
    }

    return { valid: true };
  }

  function validateForm(fields) {
    for (const [type, value] of Object.entries(fields)) {
      const result = validate(type, value);
      if (!result.valid) return result;
    }
    return { valid: true };
  }

  return { validate, validateForm };
})();

window.Validator = Validator;

// ════════════════════════════════════════
// #15 — ESCAPE USER CONTENT (XSS)
// ════════════════════════════════════════

function sanitizeHTML(str) {
  if (typeof str !== 'string') return String(str || '');
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Sanitize plus agressive — supprime tout HTML
function sanitizeStrict(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
    .slice(0, 1000); // Limite maximale
}

// Sanitize pour affichage dans innerHTML
function sanitize(str) {
  return sanitizeHTML(str);
}

window.sanitize       = sanitize;
window.sanitizeHTML   = sanitizeHTML;
window.sanitizeStrict = sanitizeStrict;

// ════════════════════════════════════════
// #16 — RESTRICTION UPLOADS FICHIERS
// Type MIME + taille max + extension
// ════════════════════════════════════════

const FileValidator = (() => {
  const ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ];
  const MAX_SIZE_MB   = 5;
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

  function validate(file) {
    if (!file) return { valid: false, message: 'Aucun fichier sélectionné.' };

    // Vérifier le type MIME
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        message: `Type de fichier non autorisé. Acceptés : JPEG, PNG, WebP, GIF.`,
      };
    }

    // Vérifier la taille
    if (file.size > MAX_SIZE_BYTES) {
      return {
        valid: false,
        message: `Fichier trop volumineux. Maximum : ${MAX_SIZE_MB} MB.`,
      };
    }

    // Vérifier l'extension
    const ext = file.name.split('.').pop().toLowerCase();
    const validExts = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    if (!validExts.includes(ext)) {
      return { valid: false, message: 'Extension de fichier non autorisée.' };
    }

    return { valid: true };
  }

  return { validate };
})();

window.FileValidator = FileValidator;

// ════════════════════════════════════════
// #9 — SÉCURITÉ SESSION
// Nettoyage complet à la déconnexion
// ════════════════════════════════════════

const SessionManager = (() => {

  // Clés sensibles à ne jamais stocker en clair
  const SENSITIVE_KEYS = ['password', 'token', 'secret', 'key'];

  function set(key, value) {
    // Vérifier qu'on ne stocke pas de données sensibles en clair
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some(k => lowerKey.includes(k))) {
      console.warn(`[Security] Tentative de stockage de donnée sensible: ${key}`);
      return false;
    }
    try {
      sessionStorage.setItem('geri_' + key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function get(key) {
    try {
      const val = sessionStorage.getItem('geri_' + key);
      return val ? JSON.parse(val) : null;
    } catch {
      return null;
    }
  }

  function clear() {
    // Supprimer toutes les clés Géri de sessionStorage
    const keys = Object.keys(sessionStorage).filter(k => k.startsWith('geri_'));
    keys.forEach(k => sessionStorage.removeItem(k));

    // Marquer la déconnexion explicite (pour éviter la boucle auth)
    sessionStorage.setItem('geri_logout', '1');
  }

  function clearAll() {
    // Nettoyage total incluant localStorage (utilisé à la déconnexion définitive)
    const lsKeys = Object.keys(localStorage).filter(k =>
      k.startsWith('geri_') && !k.includes('auth')
    );
    lsKeys.forEach(k => localStorage.removeItem(k));
    clear();
  }

  // Vérifier si la session a expiré (timeout d'inactivité 8h)
  const TIMEOUT_MS = 8 * 60 * 60 * 1000;

  function touchSession() {
    sessionStorage.setItem('geri_last_activity', Date.now());
  }

  function isSessionExpired() {
    const last = parseInt(sessionStorage.getItem('geri_last_activity') || '0');
    if (!last) return false; // Première visite
    return Date.now() - last > TIMEOUT_MS;
  }

  // Écouter l'activité utilisateur
  function startActivityTracking() {
    ['click', 'keydown', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, touchSession, { passive: true });
    });
    touchSession(); // Touch immédiat au chargement

    // Vérifier toutes les 5 minutes
    setInterval(() => {
      if (isSessionExpired()) {
        console.warn('[Session] Expirée par inactivité');
        clearAll();
        window.location.href = 'auth.html';
      }
    }, 5 * 60 * 1000);
  }

  return { set, get, clear, clearAll, touchSession, isSessionExpired, startActivityTracking };
})();

window.SessionManager = SessionManager;

// ════════════════════════════════════════
// #17 — TRIM API RESPONSES
// Ne récupérer que les champs nécessaires
// ════════════════════════════════════════

// Wrappers Supabase qui sélectionnent uniquement les champs requis
const SecureDB = (() => {

  function getBoutique(sb, userId) {
    // Ne retourner que les champs nécessaires — jamais les mots de passe ou tokens
    return sb
      .from('boutiques')
      .select('id, nom, tel, ville, adresse, plan, plan_expire_at, invite_key, footer_recu')
      .eq('user_id', userId)
      .single();
  }

  function getEmployeAccount(sb, userId) {
    return sb
      .from('employe_accounts')
      .select('id, boutique_id, nom, email, role, acces')
      .eq('user_id', userId)
      .single();
  }

  function getProduits(sb, boutiqueId) {
    return sb
      .from('produits')
      .select('id, nom, cat, prix_vente, prix_achat, stock, stock_min, unite, description')
      .eq('boutique_id', boutiqueId);
  }

  function getVentes(sb, boutiqueId) {
    return sb
      .from('ventes')
      .select('id, date, heure, items, total, benefice, modePaiement, client, clientTel, vendeur')
      .eq('boutique_id', boutiqueId)
      .order('date', { ascending: false })
      .limit(500);
  }

  return { getBoutique, getEmployeAccount, getProduits, getVentes };
})();

window.SecureDB = SecureDB;

// ════════════════════════════════════════
// INITIALISATION
// ════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // Démarrer le tracking d'activité sur les pages authentifiées
  if (window.location.pathname.includes('app.html') ||
      window.location.pathname.includes('employe.html')) {
    SessionManager.startActivityTracking();
  }

  // Générer le token CSRF
  BotProtection.generateCSRF();

  console.log('[Security] Module chargé ✓');
});
