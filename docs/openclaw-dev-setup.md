# OpenClaw Phase 1 — Dev Setup, Runtime Seeding & Validation Finale

## ─── BLOC 1 : AUDIT DE VÉRITÉ ────────────────────────────────────────────────

### Ce qui est réellement présent (vérifié le 08/03/2026)

| Composant | Statut |
|---|---|
| Tables DB (runtimes, jobs, events, artifacts, policies) | ✅ Présent (migration appliquée) |
| Edge Functions (create, dispatch, sync, health, cron) | ✅ Déployées |
| Routes UI (/app/agent-jobs, /new, /:id, /manager/openclaw) | ✅ Câblées |
| Pages UI (AgentJobsPage, AgentJobCreatePage, AgentJobDetailPage, ManagerOpenClawPage) | ✅ Présentes |
| SafePromptComposer | ✅ Présent |
| OpenClawBadges (Job, Runtime, Risk, Timeline, Artifacts) | ✅ Présents |
| Tests unitaires (29/29 passent) | ✅ Vérifiés |
| Runtime réel branché | ⏳ INTEGRATION_PENDING (voir ci-dessous) |

---

## Brancher un premier runtime réel

### 1. Variables serveur requises (Lovable Cloud Secrets)

```
OPENCLAW_API_TOKEN   — Token Bearer pour appeler le runtime OpenClaw
OPENCLAW_TIMEOUT_MS  — (optionnel) Timeout réseau, défaut: 30000ms
OPENCLAW_WEBHOOK_SECRET — (optionnel mais recommandé) Secret HMAC pour les callbacks
CRON_SECRET          — Secret pour les appels automatisés au cron-manager
```

Ces variables **ne sont JAMAIS exposées au client**. Elles sont consommées exclusivement dans les Edge Functions.

### 2. Enregistrer un runtime de test (SQL à exécuter dans Cloud > Run SQL)

```sql
-- Remplacer YOUR_ORG_ID par l'UUID réel de votre organisation
-- et https://your-openclaw-runtime.example.com par l'URL de votre instance OpenClaw

INSERT INTO public.openclaw_runtimes (
  org_id,
  name,
  environment,
  base_url,
  tool_profile,
  status,
  is_default
) VALUES (
  'YOUR_ORG_ID',
  'Runtime Pédagogique (Dev)',
  'dev',
  'https://your-openclaw-runtime.example.com',
  'tutor_readonly',
  'unknown',  -- sera mis à jour au premier healthcheck
  true
);
```

### 3. Protocole API OpenClaw attendu

Le runtime doit exposer :

| Endpoint | Méthode | Rôle |
|---|---|---|
| `GET /v1/health` | GET | Healthcheck — retourne `{"status": "ok", "version": "1.x", "tools": [...]}` |
| `POST /v1/jobs` | POST | Reçoit un job OpenClaw, retourne `{"job_id": "...", "accepted": true}` |

**Headers attendus sur chaque appel depuis le Control Plane :**
```
Authorization: Bearer <OPENCLAW_API_TOKEN>
X-Genie-Job-Id: <job.id>
X-Genie-Org-Id: <job.org_id>
```

**Callback webhook (optionnel)** — Le runtime appelle `openclaw-sync-job` :
```
POST /functions/v1/openclaw-sync-job
Authorization: Bearer <user_jwt>  # ou X-OpenClaw-Signature: <hmac_base64>
Content-Type: application/json

{
  "job_id": "<uuid>",
  "event_type": "progress|completed|failed|artifact",
  "message": "...",
  "result_summary": "...",   # requis si event_type=completed
  "result_json": {...},       # optionnel
  "error_message": "...",    # requis si event_type=failed
  "artifact": { "type": "text|json|screenshot|pdf|html|log", ... }
}
```

### 4. Tester le flux minimal

Une fois le runtime enregistré et OPENCLAW_API_TOKEN configuré :

1. Se connecter à l'app → `/app/agent-jobs` → "Nouveau job"
2. Sélectionner le runtime de dev
3. Créer un job `tutor_search` avec un prompt simple
4. Cliquer "Lancer" sur la page de détail
5. Si OPENCLAW_API_TOKEN manque → le job passe en `failed` avec message explicite (comportement honnête)
6. Si le runtime répond → le job passe en `running` puis attend le callback webhook

### 5. Status si OPENCLAW_API_TOKEN absent

Le dispatch retourne explicitement :
```json
{
  "success": false,
  "status": "failed",
  "message": "OpenClaw runtime non configuré. Veuillez configurer OPENCLAW_API_TOKEN."
}
```

Jamais de résultat inventé. L'UI affiche le message d'erreur dans la fiche job.

---

## Tests unitaires

```bash
npm test
# ✓ src/test/example.test.ts (1 test) 
# ✓ src/test/openclaw.test.ts (29 tests)
# Tests: 30 passed
```

Les tests `INTEGRATION_PENDING` dans `openclaw.test.ts` sont marqués `it.skip` et documentent le flux e2e attendu sans le faire passer pour réel.
