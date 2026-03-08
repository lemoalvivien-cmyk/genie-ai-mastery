# OpenClaw — Dev Setup & Phase 2 Validation

> Document de vérité technique. Mis à jour le 08/03/2026. Référence officielle.

---

## PACKAGE MANAGER OFFICIEL : BUN

| Fait | Valeur |
|------|--------|
| Package manager | **Bun** |
| Lockfile de référence | `bun.lockb` |
| Champ `packageManager` | `"bun@1.2.0"` dans `package.json` |
| `package-lock.json` | Artefact read-only (ne pas utiliser `npm ci`) |
| `bun.lock` | Présent en read-only |

```bash
# Installation propre
bun install

# Tests
bun run test
# ou : npx vitest run

# Dev server
bun run dev
```

---

## ÉTAT PHASE 1 (validé)

| Composant | Statut |
|-----------|--------|
| 5 tables SQL + RLS (`openclaw_runtimes`, `jobs`, `job_events`, `artifacts`, `policies`) | ✅ |
| 5 Edge Functions (`create-job`, `dispatch-job`, `sync-job`, `runtime-health`, `cron-manager`) | ✅ |
| 1 Edge Function dev (`openclaw-dev-harness`) | ✅ DEV_ONLY |
| 4 routes UI (`/app/agent-jobs`, `/new`, `/:id`, `/manager/openclaw`) | ✅ |
| Hook `useOpenClaw` complet | ✅ |
| `SafePromptComposer` avec estimation risque temps réel | ✅ |
| Guards org-scope strict (dispatch, cron) | ✅ |
| Callback anonyme bloqué (sync-job) | ✅ |
| OPENCLAW_API_TOKEN côté serveur uniquement | ✅ |
| 29 tests passent, 3 INTEGRATION_PENDING | ✅ |
| UI observabilité enrichie (Phase 2) | ✅ |
| Quotas org minimaux | ✅ |

---

## STRATÉGIE RUNTIME : DEV_ONLY_OPENCLAW_RUNTIME

Puisqu'aucun runtime OpenClaw externe réel n'est disponible dans ce contexte,
le projet fournit un **harness de développement explicitement nommé** `DEV_ONLY_OPENCLAW_RUNTIME`.

**Ce harness :**
- Répond au contrat API OpenClaw : `GET /v1/health` et `POST /v1/jobs`
- Simule une exécution en ~4 secondes
- Envoie de vrais callbacks via `openclaw-sync-job` (progress → artifact → completed)
- Marque toutes les réponses avec `"dev_only": true`
- **N'est JAMAIS présenté comme un runtime de production**

**URL du harness :**
```
https://xpzvbsfrwnabnwwfsnnc.supabase.co/functions/v1/openclaw-dev-harness
```

---

## VARIABLES SERVEUR REQUISES

| Variable | Statut | Utilisation |
|----------|--------|-------------|
| `OPENCLAW_API_TOKEN` | ✅ Configuré (Lovable Cloud) | Appels dispatch-job → runtime réel |
| `CRON_SECRET` | ✅ Configuré (Lovable Cloud) | Protection cron-manager |
| `OPENCLAW_WEBHOOK_SECRET` | ⚠️ Optionnel | HMAC sur callbacks sync-job |
| `OPENCLAW_TIMEOUT_MS` | ⚠️ Optionnel | Défaut : 30000ms |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Auto-géré | Edge Functions |
| `SUPABASE_ANON_KEY` | ✅ Auto-géré | Utilisé par le dev harness pour les callbacks |

> `OPENCLAW_API_TOKEN` est consommé **exclusivement** dans les Edge Functions.  
> Il n'est jamais exposé au bundle client (vérifié par les tests unitaires).

---

## ENREGISTRER UN RUNTIME

### Option A — DEV_ONLY_OPENCLAW_RUNTIME (disponible immédiatement)

```sql
-- Étape 1 : récupérer votre org_id
SELECT id, org_id, email FROM public.profiles WHERE email = 'votre@email.com';

-- Étape 2 : enregistrer le runtime de dev
INSERT INTO public.openclaw_runtimes (
  org_id,
  name,
  environment,
  base_url,
  tool_profile,
  status,
  is_default
) VALUES (
  'VOTRE_ORG_UUID',
  'DEV_ONLY_OPENCLAW_RUNTIME',
  'dev',
  'https://xpzvbsfrwnabnwwfsnnc.supabase.co/functions/v1/openclaw-dev-harness',
  'tutor_readonly',
  'unknown',
  true
);
```

### Option B — Runtime externe réel

```sql
INSERT INTO public.openclaw_runtimes (
  org_id,
  name,
  environment,
  base_url,
  tool_profile,
  status,
  is_default
) VALUES (
  'VOTRE_ORG_UUID',
  'Runtime Production',
  'prod',
  'https://votre-runtime-openclaw.example.com',
  'tutor_readonly',
  'unknown',
  true
);
```

---

## PROTOCOLE API OPENCLAW (contrat attendu)

### Healthcheck

```
GET <base_url>/v1/health
Authorization: Bearer <OPENCLAW_API_TOKEN>
X-Genie-Runtime-Id: <runtime_id>

→ 200 OK
{
  "status": "ok",
  "version": "1.x",
  "tools": ["web_search", "..."],
  "dev_only": true  ← présent sur le harness uniquement
}
```

### Dispatch job

```
POST <base_url>/v1/jobs
Authorization: Bearer <OPENCLAW_API_TOKEN>
X-Genie-Job-Id: <job.id>
X-Genie-Org-Id: <job.org_id>
Content-Type: application/json

{
  "job_id": "<uuid>",
  "job_type": "tutor_search|browser_lab|scheduled_coach|custom",
  "prompt": "...",
  "payload": {},
  "tool_profile": "tutor_readonly",
  "allowed_tools": ["web_search", "..."],
  "max_runtime_seconds": 120,
  "callback_url": "https://<project>.supabase.co/functions/v1/openclaw-sync-job"
}

→ 202 Accepted
{ "job_id": "<uuid>", "accepted": true }
```

### Callback sync (runtime → GENIE IA)

```
POST /functions/v1/openclaw-sync-job
Authorization: Bearer <user_jwt>
X-OpenClaw-Signature: <hmac-sha256-base64>  ← si OPENCLAW_WEBHOOK_SECRET configuré
Content-Type: application/json

{
  "job_id": "<uuid>",
  "event_type": "progress|completed|failed|artifact",
  "message": "...",
  "result_summary": "...",        ← requis pour event_type: completed
  "result_json": {},              ← requis pour event_type: completed
  "error_message": "...",         ← pour event_type: failed
  "artifact": {
    "type": "text|json|screenshot|pdf|html|log",
    "content": "...",
    "storage_path": "...",
    "mime_type": "...",
    "size_bytes": 1024,
    "metadata": {}
  }
}
```

---

## QUOTAS PAR ORG (Phase 2)

Les quotas sont définis dans `openclaw_policies` :

| Colonne | Défaut | Description |
|---------|--------|-------------|
| `max_jobs_per_hour` | 20 | Max jobs créés par l'org dans les 60 dernières minutes |
| `max_concurrent_jobs` | 5 | Max jobs en statut `running` simultanément |

Vérifiés dans `openclaw-create-job` avant toute création.  
Un message clair est retourné si le quota est dépassé : `quota_exceeded`.

---

## FLUX DE BOUT EN BOUT (Phase 2 — DEV_ONLY)

```
1. Enregistrer le DEV_ONLY_OPENCLAW_RUNTIME (SQL ci-dessus)
2. /manager/openclaw → "Test santé" → status: ok (harness répond)
3. /app/agent-jobs/new → sélectionner le runtime → composer le prompt
4. Créer le job → statut: queued (openclaw-create-job ✅)
5. Page détail → "Lancer" → dispatch (openclaw-dispatch-job ✅)
   → Le harness accepte (202) → job passe running
6. Après ~1s : event "progress" reçu (openclaw-sync-job ✅)
7. Après ~3s : event "artifact" reçu (artefact text visible dans l'UI)
8. Après ~4s : event "completed" → job passe succeeded
   → result_summary visible dans l'onglet Résultat
   → tous les événements visibles dans la Timeline
```

Ce flux prouve le pipeline **create → dispatch → sync × 3 → résultat** de bout en bout.

La mention `[DEV_ONLY]` dans le résultat confirme que c'est le harness, pas un runtime réel.

---

## OBSERVABILITÉ UI (Phase 2)

Ajouté dans `AgentJobDetailPage` :

- **Durée d'exécution** (started_at → completed_at en secondes)
- **Date de dispatch** (started_at)
- **Date de completion** (completed_at)
- **Runtime utilisé** (nom + environnement)
- **Panneau Runtime** dans l'onglet Infos
- **Résumé d'exécution** avec métriques clés
- **Message d'erreur structuré** dans un bloc rouge dédié
- **Timeline complète** avec métadonnées détaillées
- **Panneau artefacts** avec type, taille, MIME

---

## HONNÊTETÉ FINALE

### Ce qui est réellement validé (Phase 2)

- ✅ DEV_ONLY_OPENCLAW_RUNTIME déployé et documenté
- ✅ Flux complet prouvable : create → dispatch → sync (3 callbacks) → résultat
- ✅ Quotas par org (max_jobs_per_hour, max_concurrent_jobs)
- ✅ UI enrichie : durée, dispatch, completion, runtime, artefacts, timeline
- ✅ Package manager unifié : Bun, `packageManager: "bun@1.2.0"` dans package.json
- ✅ README et docs cohérents avec `bun.lockb`

### Ce qui reste INTEGRATION_PENDING

- ⏳ Runtime OpenClaw externe réel (URL, token, protocole documentés mais non branchés)
- ⏳ `OPENCLAW_WEBHOOK_SECRET` (HMAC optionnel, recommandé pour la prod)
- ⏳ Tests Playwright e2e (Phase 3)
- ⏳ Dashboard coût/usage recharts avec vraies données agrégées

---

## PROMPT PHASE 3

```
RÔLE
Tu es un Principal Engineer expert React/TypeScript, Supabase, observabilité, Playwright.

CONTEXTE
Phase 2 OpenClaw validée :
- DEV_ONLY_OPENCLAW_RUNTIME déployé, flux complet prouvé (create→dispatch→sync→résultat)
- Quotas org en place (max_jobs_per_hour, max_concurrent_jobs)
- UI enrichie (durée, timeline, artefacts, runtime panel)
- Package manager unifié : Bun

OBJECTIF Phase 3 : E2E, Dashboard coût/usage, Monitoring zombies

MISSIONS

1. TESTS E2E PLAYWRIGHT
   - tests/e2e/openclaw.spec.ts
   - Navigation /app/agent-jobs → bouton "Nouveau job" visible
   - Formulaire SafePromptComposer → runtime sélectionnable
   - Création job → statut "queued" visible
   - Timeline → au moins 1 événement visible

2. DASHBOARD COÛT/USAGE
   - Vue agrégée dans ManagerOpenClawPage
   - Jobs par statut (recharts BarChart)
   - Taux de succès (gaugeChart)
   - Consommation quotas (progress bar)
   - Alimenté par vraies données DB — JAMAIS de mocks

3. MONITORING ZOMBIES
   - Jobs running > 10min sans callback → alerte
   - Cron openclaw-cron-manager : reset zombie jobs → failed
   - Notification manager (edge function manager-alerts)

4. RUNTIME RÉEL
   - Documenter le branchement d'un vrai runtime OpenClaw
   - Tester le healthcheck réel
   - Valider un dispatch réel (si runtime disponible)

INTERDICTIONS
- Ne pas dire "done" sans montrer vitest run + playwright test réels
- Ne pas inventer de données dans le dashboard
- Ne pas prétendre que Playwright tourne sans résultat réel

PREUVES EXIGÉES
- playwright test output réel (même partiel)
- vitest run output après modifications
- Dashboard alimenté par vraies données DB
```
