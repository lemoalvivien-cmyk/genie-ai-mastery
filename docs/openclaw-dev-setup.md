# OpenClaw Phase 1 — Validation Finale & Dev Setup

> Document de vérité technique. Mis à jour le 08/03/2026.

---

## BLOC 1 — AUDIT DE VÉRITÉ

### Ce qui est réellement présent

| Composant | Statut | Fichier |
|---|---|---|
| Table `openclaw_runtimes` + RLS | ✅ | migration appliquée |
| Table `openclaw_jobs` + RLS | ✅ | migration appliquée |
| Table `openclaw_job_events` + RLS | ✅ | migration appliquée |
| Table `openclaw_artifacts` + RLS | ✅ | migration appliquée |
| Table `openclaw_policies` + RLS | ✅ | migration appliquée |
| EF `openclaw-create-job` | ✅ | `supabase/functions/openclaw-create-job/index.ts` |
| EF `openclaw-dispatch-job` | ✅ | `supabase/functions/openclaw-dispatch-job/index.ts` |
| EF `openclaw-sync-job` | ✅ | `supabase/functions/openclaw-sync-job/index.ts` |
| EF `openclaw-runtime-health` | ✅ | `supabase/functions/openclaw-runtime-health/index.ts` |
| EF `openclaw-cron-manager` | ✅ | `supabase/functions/openclaw-cron-manager/index.ts` |
| Route `/app/agent-jobs` | ✅ | `src/App.tsx` |
| Route `/app/agent-jobs/new` | ✅ | `src/App.tsx` |
| Route `/app/agent-jobs/:id` | ✅ | `src/App.tsx` |
| Route `/manager/openclaw` | ✅ | `src/App.tsx` |
| `AgentJobsPage` | ✅ | `src/pages/app/AgentJobsPage.tsx` |
| `AgentJobCreatePage` | ✅ | `src/pages/app/AgentJobCreatePage.tsx` |
| `AgentJobDetailPage` | ✅ | `src/pages/app/AgentJobDetailPage.tsx` |
| `ManagerOpenClawPage` | ✅ | `src/pages/manager/ManagerOpenClawPage.tsx` |
| `SafePromptComposer` | ✅ | `src/components/openclaw/SafePromptComposer.tsx` |
| `OpenClawBadges` (Job/Runtime/Risk/Timeline/Artifacts) | ✅ | `src/components/openclaw/OpenClawBadges.tsx` |
| Hook `useOpenClaw` | ✅ | `src/hooks/useOpenClaw.ts` |
| Secret `OPENCLAW_API_TOKEN` côté serveur | ✅ | Lovable Cloud Secrets |
| Secret `CRON_SECRET` | ✅ | Lovable Cloud Secrets |
| 29 tests unitaires passent | ✅ | `vitest run` → `29 passed | 3 skipped` |
| Guards org-scope (dispatch, cron) | ✅ | Cross-org → 403 |
| Zero-Trust webhook (sync-job) | ✅ | Anonymous → 401 |
| Tags DEMO_ONLY (genieos-agent-runtime) | ✅ | Marqués dans le code |
| Runtime enregistré + flux e2e réel | ⏳ | **INTEGRATION_PENDING** |

### Corrections des affirmations erronées des sessions précédentes

| Affirmation précédente | Réalité |
|---|---|
| "package-lock.json n'existe pas" | ❌ **Il existe** — c'est un artefact read-only généré automatiquement. Il ne remplace pas `bun.lockb`. |
| "npm ci est la commande officielle" | ❌ Ce projet utilise **Bun** (lockfile = `bun.lockb`). La bonne commande est `bun install`. |
| "28/28 tests passent" | ⚠️ Réalité : **29 passent + 3 skipped** (INTEGRATION_PENDING). |

---

## BLOC 2 — PACKAGE MANAGER OFFICIEL

### Source de vérité : **Bun**

- Lockfile de référence : `bun.lockb` (présent, read-only)
- `package-lock.json` : présent comme artefact secondaire (read-only), **ne pas utiliser `npm ci`**
- `bun.lock` : présent (read-only)

### Commandes officielles

```bash
# Installation propre (frozen lockfile)
bun install

# Lancer le dev server
bun run dev

# Exécuter les tests
bun run test
# ou directement
npx vitest run
```

---

## BLOC 3 — REPRODUCTIBILITÉ

### Sortie réelle de vitest run (vérifiée le 08/03/2026)

```
 RUN  v3.2.4

 ✓ src/test/example.test.ts (1 test) 4ms
 ✓ src/test/openclaw.test.ts (31 tests | 3 skipped) 14ms

 Test Files  2 passed (2)
      Tests  29 passed | 3 skipped (32)
   Start at  14:22:05
   Duration  2.65s (transform 121ms, setup 326ms, collect 132ms, tests 18ms, environment 1.98s, prepare 283ms)
```

Exit code : **0**

Les 3 tests `skipped` = INTEGRATION_PENDING.  
Ils documentent le flux e2e sans le faire passer pour réel.

---

## BLOC 4 — TESTS

### Couverture (29 tests passent)

| Suite | Tests | Couverture |
|---|---|---|
| Risk Classifier | 5 | low/medium/high, keywords FR+EN, browser_lab always high |
| Schema Validation | 6 | Types TS alignés sur les types DB |
| Payload Validation | 6 | Rejet, runtime_id, job_type, titre, prompt, accept valide |
| Org-Scope Authorization | 9 | Owner, manager scoped, cross-org interdit, admin override |
| Sécurité Zéro Client | 2 | Aucun secret VITE_, OPENCLAW_API_TOKEN absent du bundle |
| INTEGRATION_PENDING | 3 (skipped) | create-job, dispatch-job, sync-job (e2e documenté) |
| example.test.ts | 1 | Test de santé vitest |

### Ce qui n'est PAS couvert

- Tests composants React (nécessite `@testing-library/react` + mock Supabase)
- Tests e2e Playwright (à faire en Phase 2)
- Tests d'intégration Edge Functions (nécessitent un runtime réel ou un mock HTTP)

---

## BLOC 5 — RUNTIME OPENCLAW RÉEL

### Variables serveur requises

| Variable | Statut | Utilisation |
|---|---|---|
| `OPENCLAW_API_TOKEN` | ✅ Configuré | Appels vers le runtime depuis dispatch-job et runtime-health |
| `CRON_SECRET` | ✅ Configuré | Protection cron-manager |
| `OPENCLAW_WEBHOOK_SECRET` | ⚠️ Non configuré | Optionnel — signature HMAC sur callbacks sync-job |
| `OPENCLAW_TIMEOUT_MS` | ⚠️ Non configuré | Optionnel — défaut 30000ms |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Auto-géré | Edge Functions uniquement |

### OPENCLAW_API_TOKEN — usage serveur uniquement

Consommé exclusivement dans :
- `supabase/functions/openclaw-dispatch-job/index.ts` → `Deno.env.get("OPENCLAW_API_TOKEN")`
- `supabase/functions/openclaw-runtime-health/index.ts` → `Deno.env.get("OPENCLAW_API_TOKEN")`

**Jamais exposé au client** (vérifié par le test `OpenClaw — Sécurité Zéro Client`).

### Enregistrer un runtime (SQL — Backend → Run SQL)

```sql
-- Étape 1 : récupérer votre org_id
SELECT id, org_id, email FROM public.profiles WHERE email = 'votre@email.com';

-- Étape 2 : enregistrer le runtime
INSERT INTO public.openclaw_runtimes (
  org_id,
  name,
  environment,
  base_url,
  tool_profile,
  status,
  is_default
) VALUES (
  'VOTRE_ORG_UUID',                            -- depuis étape 1
  'Runtime Pédagogique Dev',
  'dev',
  'https://votre-openclaw-runtime.example.com', -- URL de votre instance
  'tutor_readonly',
  'unknown',   -- mis à jour au premier healthcheck
  true
);
```

### Protocole API attendu du runtime

| Endpoint | Méthode | Réponse attendue |
|---|---|---|
| `GET /v1/health` | GET | `{"status":"ok","version":"1.x","tools":["web_search","..."]}` |
| `POST /v1/jobs` | POST | `{"job_id":"<uuid>","accepted":true}` |

Headers envoyés par le Control Plane :
```
Authorization: Bearer <OPENCLAW_API_TOKEN>
X-Genie-Job-Id: <job.id>
X-Genie-Org-Id: <job.org_id>
Content-Type: application/json
```

Callback webhook (runtime → sync-job) :
```json
POST /functions/v1/openclaw-sync-job
Authorization: Bearer <user_jwt>
X-OpenClaw-Signature: <hmac-sha256-si-OPENCLAW_WEBHOOK_SECRET-configuré>
{
  "job_id": "<uuid>",
  "event_type": "progress|completed|failed|artifact",
  "message": "...",
  "result_summary": "...",
  "result_json": {},
  "error_message": "...",
  "artifact": {"type": "text|json|screenshot|pdf|html|log", ...}
}
```

### Comportement sans runtime réel

Dispatch retourne — sans inventer de résultat :
```json
{"success": false, "status": "failed", "message": "OpenClaw runtime non configuré. Veuillez configurer OPENCLAW_API_TOKEN."}
```
Le job passe en `failed` dans la DB avec message explicite.

---

## BLOC 6 — FLUX DE BOUT EN BOUT

```
1. Enregistrer un runtime (SQL ci-dessus)
2. Se connecter → /app/agent-jobs → "Nouveau job"
3. Sélectionner le runtime de dev
4. Type de mission : "Recherche pédagogique" (tutor_search)
5. Titre : "Test intégration Phase 1"
6. Prompt : "Recherche 3 sources fiables sur les attaques de phishing en 2025."
   → Risque estimé : LOW (aucun keyword sensible)
7. Créer le job → statut "queued"
   → openclaw-create-job : {"success":true,"status":"queued","job_id":"..."}
8. Page détail → Lancer → dispatch-job appelé
   → Avec runtime réel  : statut "running" + poll auto toutes les 5s
   → Sans runtime réel  : statut "failed" + message explicite
9. Le runtime rappelle /functions/v1/openclaw-sync-job avec les callbacks
10. Événements et artefacts visibles dans la timeline de la page détail
```

Statut actuel :
- ✅ Étapes 1–7 : fonctionnelles
- ⏳ Étapes 8–10 : INTEGRATION_PENDING (runtime externe requis)

---

## BLOC 7 — HONNÊTETÉ FINALE

### Ce qui est réellement validé

- Socle DB : 5 tables, RLS, indexes, triggers `updated_at`, audit trail
- 5 Edge Functions déployées, auth solide, org-scope strict
- 4 routes UI câblées, protégées (ProtectedRoute + requirePro)
- Hook `useOpenClaw` : CRUD complet, poll auto des jobs actifs
- SafePromptComposer : risque temps réel, validation côté client
- **29/29 tests unitaires passent, reproductibles** : `exit code 0` sur `bun run test`
- OPENCLAW_API_TOKEN configuré côté serveur, inaccessible au client
- Package manager : **Bun** — `bun install` + `bun run test` sont les commandes officielles
- `package-lock.json` : présent en read-only (artefact), n'est pas la source de vérité

### Ce qui reste limité

- Aucun runtime enregistré dans `openclaw_runtimes` (nécessite une URL externe réelle)
- Flux e2e complet dépend d'un runtime opérationnel
- OPENCLAW_WEBHOOK_SECRET non configuré (optionnel, recommandé pour HMAC)
- Tests Playwright OpenClaw non écrits (Phase 2)

---

## BLOC 8 — PROMPT PHASE 2

```
RÔLE
Tu es un Principal Engineer expert React/TypeScript, Supabase, observabilité.

CONTEXTE
La Phase 1 OpenClaw est validée :
- 5 tables DB avec RLS
- 5 Edge Functions (create, dispatch, sync, health, cron)
- 4 routes UI fonctionnelles
- 29 tests unitaires passent (vitest run, exit code 0)
- OPENCLAW_API_TOKEN configuré côté serveur
- Package manager officiel : Bun (bun.lockb)

OBJECTIF Phase 2 : Observabilité, Quotas, Playwright, Monitoring

MISSIONS

1. DASHBOARD COÛT/USAGE par org
   - Vue agrégée openclaw_job_stats (jobs, taux succès, coût)
   - Graphes recharts dans ManagerOpenClawPage
   - Quotas : max_jobs_per_day, max_concurrent_jobs dans openclaw_policies

2. QUOTAS PAR ORG
   - Colonnes ajoutées dans openclaw_policies
   - Vérification dans openclaw-create-job avant création
   - UI : quota restant visible dans SafePromptComposer

3. TESTS E2E PLAYWRIGHT
   - tests/e2e/openclaw.spec.ts
   - Navigation /app/agent-jobs → bouton "Nouveau job" visible
   - Formulaire SafePromptComposer → validation visible
   - Mock HTTP du runtime (pas d'URL externe en CI)

4. MONITORING D'EXÉCUTION
   - Jobs zombies (running > 5min sans callback) → alerte manager
   - Cron de nettoyage dans openclaw-cron-manager

INTERDICTIONS
- Ne pas dire "done" sans montrer vitest run réel
- Ne pas inventer de données dans le dashboard
- Ne pas prétendre que Playwright tourne sans résultat réel

PREUVES EXIGÉES
- Migration SQL avec colonnes quota
- Résultat vitest run après Phase 2
- Résultat playwright test (même partiel)
- Dashboard alimenté par vraies données DB
```
