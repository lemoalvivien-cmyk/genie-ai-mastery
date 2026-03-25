# Formetoialia — Système d'exécution IA quotidien

## Package Manager officiel : **Bun**

Ce projet utilise **Bun** comme gestionnaire de paquets et moteur d'exécution.  
Le lockfile de référence est `bun.lockb`.

**Commandes officielles :**

```bash
# Installation propre (frozen lockfile)
bun install

# Lancer le serveur de développement
bun run dev

# Exécuter les tests unitaires
bun run test

# Lancer les tests e2e (nécessite un navigateur Playwright installé)
bun run test:simulation
```

---

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- Lovable Cloud (auth, DB, Edge Functions, Secrets)
- Bun (runtime + package manager officiel)

---

## Développement local

```bash
# 1. Cloner le repo
git clone <YOUR_GIT_URL>
cd formetoialia

# 2. Copier le fichier d'exemple et renseigner les valeurs locales
cp .env.example .env.local

# 3. Installer les dépendances
bun install

# 4. Démarrer le serveur de dev
bun run dev
```

> ⚠️ Ne jamais committer `.env.local`, `.env.development` ou `.env.production`.  
> Les secrets (Stripe, OpenRouter, Resend) sont gérés exclusivement via **Lovable Cloud → Settings → Secrets**.

---

## Tests

```bash
# Tests unitaires
bun run test

# Tests e2e (Playwright)
bun run test:simulation

# Tests de charge (k6 — voir tests/load/README.md)
bun run test:load:smoke
```

---

## Déploiement

Ouvre [Lovable](https://lovable.dev) → Share → Publish.

## Domaine personnalisé

Project → Settings → Domains → Connect Domain.

---

## Sécurité

- Toutes les clés privées (Stripe, AI, Resend) sont stockées dans Lovable Cloud Secrets.
- Les clés publiques (`VITE_SUPABASE_*`) sont committées — c'est intentionnel et sûr.
- Le RLS est activé sur toutes les tables.
- Les Edge Functions critiques utilisent `getUser()` (vérification réseau) — jamais `getClaims()` seul.
