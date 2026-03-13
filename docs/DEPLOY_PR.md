# 🚀 GENIE IA v4.0 — PR "Disruptor 2035"
## Objectif : Formation Cyber Complète en 48h, Zéro Formateur Humain

---

## 📋 Résumé du PR

Ce PR assemble la version finale de GENIE IA intégrant tous les systèmes précédemment développés en une expérience cohérente et disruptive.

### Features déployées dans ce PR :

| Feature | Fichier | Impact |
|---------|---------|--------|
| SleepForge Cron | `supabase/functions/sleepforge/` | Modules auto-générés 24/7 à 02h00 UTC |
| CyberPath 48h | `src/pages/app/CyberPath48h.tsx` | Parcours guidé complet sans formateur |
| Attestation NFT | `src/pages/app/AttestationNFT.tsx` | Certification SHA-256 blockchain-grade |
| Jarvis Omnipresent | `src/components/jarvis/JarvisOverlay.tsx` | Copilot IA sur toutes les pages /app |
| Neuro-Rewards | `src/components/rewards/` | Dopamine loops + streaks + badges |
| Collective Hive | `src/hooks/useHiveFeedback.ts` | Intelligence collective → améliore RAG |
| Enterprise RAG | `supabase/functions/enterprise-rag/` | Upload docs org + pgvector + CVE auto |
| Voice Engine + KITT | `src/pages/genieos/VoiceAssistant.tsx` | TTS/STT + avatar lip-sync Canvas |
| Genie Brain Swarm | `supabase/functions/genie-brain-orchestrator/` | 5 agents en parallèle |
| Adversarial Engine | `supabase/functions/adversarial-exercise-gen/` | MITRE ATT&CK dynamique |

---

## 🗄️ Instructions de Déploiement Supabase

### Étape 1 — Prérequis

```bash
# Vérifier la version CLI
supabase --version  # >= 1.168

# Login
supabase login

# Link au projet
supabase link --project-ref xpzvbsfrwnabnwwfsnnc
```

### Étape 2 — Secrets requis

Configurer dans Supabase Dashboard → Settings → Edge Functions → Secrets :

```bash
# Obligatoires
LOVABLE_API_KEY=<votre_clé_ai_gateway>
STRIPE_SECRET_KEY=<sk_live_...>
CRON_SECRET=<random_64_chars>

# Optionnels (TTS avancé)
DASHSCOPE_API_KEY=<pour_CosyVoice>
```

### Étape 3 — Appliquer les migrations

```bash
# Les migrations sont déjà dans supabase/migrations/
supabase db push

# Vérifier que pgvector est activé
supabase db query "SELECT extname FROM pg_extension WHERE extname = 'vector';"

# Activer pg_cron pour SleepForge
supabase db query "CREATE EXTENSION IF NOT EXISTS pg_cron;"
supabase db query "CREATE EXTENSION IF NOT EXISTS pg_net;"
```

### Étape 4 — Déployer les Edge Functions

```bash
# Déployer toutes les functions en parallèle
supabase functions deploy sleepforge
supabase functions deploy genie-brain-orchestrator
supabase functions deploy enterprise-rag
supabase functions deploy chat-completion
supabase functions deploy adversarial-exercise-gen
supabase functions deploy voice-clone-register

# Vérifier le déploiement
supabase functions list
```

### Étape 5 — Configurer le cron SleepForge

```sql
-- Dans Supabase Dashboard → SQL Editor
-- Nécessite pg_cron activé

SELECT cron.schedule(
  'sleepforge-nightly',
  '0 2 * * *',  -- Toutes les nuits à 02h00 UTC
  $$
  SELECT net.http_post(
    url := 'https://xpzvbsfrwnabnwwfsnnc.supabase.co/functions/v1/sleepforge',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.cron_secret', true)
    ),
    body := jsonb_build_object('triggered_by', 'pg_cron', 'time', now())
  ) AS request_id;
  $$
);

-- Configurer le secret dans app settings
ALTER DATABASE postgres SET "app.cron_secret" = 'VOTRE_CRON_SECRET';
```

### Étape 6 — Seeding des données initiales

```sql
-- Badges neuro-rewards (si pas déjà seedé)
INSERT INTO badge_definitions (id, name, description, emoji, category, condition_type, condition_value, rarity, xp_reward)
VALUES
  ('cyber_master',     'Cyber Master',     'Complété 10 modules cyber', '🛡️', 'skill', 'modules_done', 10, 'epic',      500),
  ('sleepforge_first', 'Premier Forgé',    'Premier module SleepForge consommé', '🌙', 'special', 'modules_done', 1, 'rare', 200),
  ('nft_minted',       'NFT Pioneer',      'Première attestation NFT mintée', '🏆', 'achievement', 'modules_done', 3, 'legendary', 1000)
ON CONFLICT (id) DO NOTHING;

-- Plan limits mise à jour pour SleepForge
UPDATE plan_limits SET ai_tokens_out_max = 500000 WHERE plan = 'pro';
UPDATE plan_limits SET ai_tokens_out_max = -1     WHERE plan = 'business';  -- illimité
```

### Étape 7 — Vérifier les RLS

```sql
-- SleepForge écrit au nom des users — besoin service role
-- Vérifier que brain_generated_modules a la bonne policy

SELECT schemaname, tablename, policyname, permissive, cmd
FROM pg_policies
WHERE tablename IN ('brain_generated_modules', 'attestations', 'brain_events')
ORDER BY tablename;
```

### Étape 8 — Build et déploiement frontend

```bash
# Build de production
npm run build

# Variables d'environnement production (.env.production)
VITE_SUPABASE_URL=https://xpzvbsfrwnabnwwfsnnc.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_GENIEOS_ENABLED=true
VITE_OPENCLAW_ENABLED=true
```

---

## 🧪 Test "Obsolescence Totale" — Formation 48h sans Formateur Humain

### Objectif du test
Valider qu'un utilisateur sans aucune connaissance préalable peut compléter une formation cyber complète en moins de 48h, guidé uniquement par GENIE IA.

### Setup

```bash
# 1. Créer un compte test
email: test-obsolescence@genie-ia.app
password: Test48h2026!

# 2. Activer le profil
persona: salarie
level: 1
org_id: null (solo learner)
```

### Scénario de test step-by-step

#### ⏱️ H+0 : Inscription et Diagnostic (15 min)
```
1. S'inscrire sur /register
2. Compléter l'onboarding (persona: "salarié", domaine: "cyber")
3. Naviguer vers /app/dashboard
4. Lancer le CyberPath 48h (bouton "Démarrer le Défi")
5. Étape 1 : JARVIS Diagnostic
   → Envoyer : "Analyse mon profil cyber complet"
   → Vérifier : brain_events contient 'swarm_completed'
   → Vérifier : genie_brain.predicted_risk_score > 0
```

#### ⏱️ H+1 : Phishing Lab (20 min)
```
1. Naviguer vers /app/labs/phishing
2. Compléter les 5 scénarios de phishing
3. Vérifier : progress INSERT avec status='completed'
4. Vérifier : badge 'phishing_survivor' awarded
```

#### ⏱️ H+3 : Module Auto-Généré par SleepForge
```
-- Simuler le cron SleepForge manuellement :
curl -X POST \
  https://xpzvbsfrwnabnwwfsnnc.supabase.co/functions/v1/sleepforge \
  -H "x-cron-secret: VOTRE_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"test_user_id": "UUID_DU_USER_TEST"}'

-- Attendre 30s puis vérifier :
SELECT title, domain, predicted_gap, status
FROM brain_generated_modules
WHERE user_id = 'UUID_DU_USER_TEST'
ORDER BY created_at DESC LIMIT 1;

-- Résultat attendu :
-- title: Module personnalisé sur le domaine critique détecté
-- predicted_gap: > 60
-- status: 'pending'
```

#### ⏱️ H+4 : Quiz Adversarial (15 min)
```
1. Naviguer vers /app/chat
2. Envoyer : "Lance un quiz adversarial sur le phishing et le ransomware. 
   Active les agents Attaquant et Défenseur."
3. Vérifier : active_agents = ['attaquant', 'defenseur', 'tuteur']
4. Compléter 10 questions
5. Vérifier : brain_events 'swarm_completed' avec risk_delta
```

#### ⏱️ H+6 : Cyber Lab (25 min)
```
1. Naviguer vers /app/labs/cyber
2. Compléter : audit de mots de passe
3. Compléter : checklist d'incident cybersécurité  
4. Vérifier : proofs INSERT avec evidence_type='cyber_audit'
5. Vérifier : skill_mastery UPDATE pour skills cyber
```

#### ⏱️ H+8 : Attestation NFT (5 min)
```
1. Naviguer vers /app/attestation-nft
2. Vérifier éligibilité :
   - completedCount >= 3 ✓
   - avgScore >= 60 ✓
3. Cliquer "Minter mon Attestation NFT"
4. Vérifier : attestations INSERT avec signature_hash non-null

-- Vérification SQL :
SELECT id, signature_hash, score_average, valid_until
FROM attestations
WHERE user_id = 'UUID_DU_USER_TEST';

-- Vérification publique :
curl https://genie-ia.app/verify/ATTESTATION_ID
```

### Critères de succès

| Critère | Seuil | Mesure |
|---------|-------|--------|
| Temps total actif | < 110 min | Somme des durées steps |
| Temps total elapsed | < 48h | started_at → attestation mintée |
| Score moyen | ≥ 70/100 | AVG(progress.score) |
| Modules complétés | ≥ 3 | COUNT(progress WHERE status='completed') |
| Brain events | ≥ 5 | COUNT(brain_events) |
| Attestation générée | 1 | COUNT(attestations) |
| XP total | ≥ 500 | user_streaks.total_xp |
| Formateur humain impliqué | 0 | par définition |

### Commandes de validation

```sql
-- Rapport complet du test
WITH user_data AS (
  SELECT 'UUID_DU_USER_TEST'::uuid AS uid
)
SELECT
  (SELECT COUNT(*) FROM progress    WHERE user_id = u.uid AND status = 'completed') AS modules_done,
  (SELECT ROUND(AVG(score)) FROM progress WHERE user_id = u.uid AND status = 'completed') AS avg_score,
  (SELECT COUNT(*) FROM brain_events WHERE user_id = u.uid) AS brain_events,
  (SELECT total_xp FROM user_streaks WHERE user_id = u.uid) AS total_xp,
  (SELECT COUNT(*) FROM attestations WHERE user_id = u.uid) AS attestations,
  (SELECT COUNT(*) FROM brain_generated_modules WHERE user_id = u.uid) AS sf_modules,
  (SELECT COUNT(*) FROM user_badges WHERE user_id = u.uid) AS badges_earned
FROM user_data u;
```

---

## 📊 Métriques attendues post-déploiement (J+30)

| KPI | Baseline (avant) | Cible (J+30) |
|-----|-----------------|--------------|
| Taux de complétion 48h | N/A | > 35% |
| NPS learner | - | > 72 |
| Churn mensuel | - | < 5% |
| Temps formation | 20h (humain) | < 8h (IA) |
| Coût / formation | 120€ (humain) | < 0.50€ (IA) |
| Attestations NFT générées | 0 | > 200 |
| SleepForge modules/nuit | 0 | > 50 |

---

## 🔒 Checklist Sécurité pre-merge

- [ ] RLS activé sur toutes les nouvelles tables
- [ ] `verify_jwt = false` uniquement pour les fonctions cron (protégées par X-CRON-SECRET)
- [ ] Aucun secret hardcodé dans le code frontend
- [ ] Rate limiting actif sur `/sleepforge` (50 users max / run)
- [ ] `brain_generated_modules.expires_at` respecté (nettoyage auto 48h)
- [ ] Attestation hash SHA-256 vérifié côté client ET serveur
- [ ] CORS restreint aux domaines autorisés

---

## 🌍 Vision 2026

> "En 12 mois, chaque salarié en France peut obtenir une certification cyber reconnue,  
>  en 48h, depuis son téléphone, pour 0.50€ — sans formateur humain.  
>  GENIE IA devient la référence mondiale. Les formateurs traditionnels s'adaptent ou disparaissent."

**Stack finale :**
- Frontend : React 18 + Vite + Tailwind (Lovable Cloud)
- Backend : Supabase + pgvector + pg_cron  
- AI : Lovable AI Gateway (Gemini 2.5, GPT-5)
- Payments : Stripe
- Monitoring : Sentry + brain_events analytics
- Certifications : SHA-256 + ERC-721 metadata
