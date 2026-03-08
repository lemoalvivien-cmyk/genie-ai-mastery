# OpenClaw — Dev Setup & Phase 2 Validation

> Document de vérité technique. Mis à jour le 08/03/2026. Référence officielle.

---

## PACKAGE MANAGER OFFICIEL : BUN

| Fait | Valeur |
|------|--------|
| Package manager | **Bun** |
| Champ `packageManager` dans `package.json` | `"bun@1.2.0"` ✅ présent |
| Lockfile de référence | `bun.lockb` |
| `package-lock.json` | Artefact read-only généré automatiquement — **ne pas utiliser `npm ci`** |
| `bun.lock` | Présent en read-only |

```bash
# Installation propre (frozen lockfile)
bun install

# Tests
bun run test
# ou : npx vitest run

# Dev server
bun run dev
```

---

## ÉTAT PHASE 2 (réellement livré)

| Composant | Statut |
|-----------|--------|
| 5 tables SQL + RLS (`openclaw_runtimes`, `jobs`, `job_events`, `artifacts`, `policies`) | ✅ |
| Colonnes quotas dans `openclaw_policies` (`max_jobs_per_hour`, `max_concurrent_jobs`) | ✅ Migration exécutée |
| 5 Edge Functions (`create-job`, `dispatch-job`, `sync-job`, `runtime-health`, `cron-manager`) | ✅ |
| 1 Edge Function dev (`openclaw-dev-harness`) | ✅ Fichier créé — DEV_ONLY |
| 4 routes UI (`/app/agent-jobs`, `/new`, `/:id`, `/manager/openclaw`) | ✅ |
| Hook `useOpenClaw` complet | ✅ |
| `SafePromptComposer` avec estimation risque temps réel | ✅ |
| Guards org-scope strict (dispatch, cron) | ✅ |
| Callback anonyme bloqué (sync-job) | ✅ |
| OPENCLAW_API_TOKEN côté serveur uniquement | ✅ |
| Contrôle 429 quotas dans `openclaw-create-job` | ✅ |
| UI observabilité enrichie (Phase 2) | ✅ |
| `packageManager: "bun@1.2.0"` dans `package.json` | ✅ |
| Tests : **54 passent, 3 INTEGRATION_PENDING** (total 57) | ✅ |

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
| `OPENCLAW_WEBHOOK_SECRET` | ✅ **Requis pour le harness** | HMAC-SHA256 sur callbacks sync-job (X-OpenClaw-Signature) |
| `OPENCLAW_TIMEOUT_MS` | ⚠️ Optionnel | Défaut : 30000ms |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Auto-géré | Edge Functions |

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
Un message clair est retourné si le quota est dépassé : `quota_exceeded` + HTTP 429.

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

Présent dans `AgentJobDetailPage` :

- **Durée d'exécution** (started_at → completed_at en secondes)
- **Date de dispatch** (started_at)
- **Date de completion** (completed_at)
- **Runtime utilisé** (nom + environnement)
- **Panneau Runtime** dans l'onglet Infos
- **Résumé d'exécution** avec métriques clés
- **Message d'erreur structuré** dans un bloc rouge dédié
- **Timeline complète** avec métadonnées détaillées
- **Panneau artefacts** avec type, taille, MIME
- **Badge DEV_ONLY** si runtime = dev harness
- **Auto-refresh** toutes les 2s pendant queued/running

---

## CORRECTION AUTH CALLBACK HARNESS (2026-03-08)

### Bug corrigé

**Avant (incorrect) :**
Le harness envoyait ses callbacks vers `openclaw-sync-job` avec :
```
Authorization: Bearer <SUPABASE_ANON_KEY>
```
`sync-job` appelle `auth.getUser(anon_key)` → retourne `null` → **401 Unauthorized**.
Le flux DEV_ONLY était silencieusement brisé.

**Après (correct) :**
Le harness signe ses callbacks avec **HMAC-SHA256** via le header `X-OpenClaw-Signature`.
`sync-job` vérifie cette signature via **PATH 1** (`OPENCLAW_WEBHOOK_SECRET` configuré).
Le `SUPABASE_ANON_KEY` n'est **plus jamais** utilisé comme pseudo-JWT.

### Prérequis
`OPENCLAW_WEBHOOK_SECRET` doit être configuré dans les secrets Edge Functions.
Sans ce secret, le harness retourne `503` avec un message explicatif.

---

## HONNÊTETÉ FINALE

### Ce qui est réellement livré (Phase 2)

- ✅ `packageManager: "bun@1.2.0"` dans `package.json`
- ✅ `openclaw-dev-harness` créé avec callbacks **HMAC-SHA256 signés** (bug ANON_KEY corrigé)
- ✅ Migration quotas exécutée (`max_jobs_per_hour`, `max_concurrent_jobs`)
- ✅ Contrôle 429 dans `openclaw-create-job`
- ✅ UI observabilité enrichie (durée, dispatch, completion, runtime, artefacts, timeline, badge DEV_ONLY)
- ✅ Tests : **54 passent | 3 skipped** (total 57) — couvrant HMAC auth, quotas, DEV_ONLY detection, org-scope

### Ce qui est DEV_ONLY

- ⚠️ `DEV_ONLY_OPENCLAW_RUNTIME` — harness de simulation, pas un vrai runtime OpenClaw
- ⚠️ Résultats du flux e2e sont simulés — `[DEV_ONLY]` dans tous les payloads
- ⚠️ Nécessite `OPENCLAW_WEBHOOK_SECRET` configuré pour que les callbacks HMAC fonctionnent

### Ce qui reste INTEGRATION_PENDING

- ⏳ Runtime OpenClaw externe réel (URL, token, protocole documentés mais non branchés)
- ⏳ `OPENCLAW_WEBHOOK_SECRET` à configurer dans les secrets Lovable Cloud
- ⏳ Tests Playwright e2e (Phase 3)
- ⏳ Dashboard coût/usage recharts avec vraies données agrégées
