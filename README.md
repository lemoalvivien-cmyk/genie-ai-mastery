# GENIE IA — OpenClaw Phase 1

## Package Manager officiel : Bun

Ce projet utilise **Bun** comme gestionnaire de paquets et moteur d'exécution.  
Le lockfile de référence est `bun.lockb`.  
Un `package-lock.json` est également présent (artefact généré automatiquement, ne pas supprimer — référencé en read-only).

**Commandes officielles :**

```bash
# Installation propre
bun install

# Lancer le serveur de développement
bun run dev

# Exécuter les tests
bun run test
# ou directement :
npx vitest run
```

> ⚠️ `npm ci` n'est **pas** la commande officielle sur ce projet.  
> Utilise `bun install` pour une installation reproductible à partir de `bun.lockb`.

---

## Technologies

- Vite + React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (auth, DB, Edge Functions) — via Lovable Cloud
- Bun (runtime + package manager)

---

## Clone propre

```bash
# 1. Cloner le repo
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# 2. Installer les dépendances (frozen lockfile = bun.lockb)
bun install

# 3. Démarrer le serveur de dev
bun run dev

# 4. Lancer les tests unitaires
bun run test
```

---

## Résultat tests (vérifié le 08/03/2026)

```
 RUN  v3.2.4

 ✓ src/test/example.test.ts (1 test) 4ms
 ✓ src/test/openclaw.test.ts (31 tests | 3 skipped) 14ms

 Test Files  2 passed (2)
      Tests  29 passed | 3 skipped (32)
   Start at  14:22:05
   Duration  2.65s
```

Les 3 tests `skipped` = `INTEGRATION_PENDING` — documentent le flux e2e sans runtime réel branché.

---

## Déploiement

Ouvre [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) → Share → Publish.

## Domaine personnalisé

Project → Settings → Domains → Connect Domain.  
[Documentation](https://docs.lovable.dev/features/custom-domain#custom-domain)
