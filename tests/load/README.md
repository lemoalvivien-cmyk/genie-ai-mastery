# GENIE IA — Load Tests

Tests de charge k6 pour valider la capacité à 30 000 utilisateurs.

## Prérequis

```bash
# macOS
brew install k6

# Linux
sudo snap install k6

# Vérifier
k6 version
```

## Configuration

```bash
cp tests/load/.env.load.example tests/load/.env.load
# Éditer .env.load et remplacer BEARER_TOKEN par votre JWT
```

Pour obtenir votre JWT :
1. Connectez-vous à l'app dans le navigateur
2. DevTools → Application → Local Storage → clé Supabase
3. Copiez la valeur `access_token`

## Lancement

### Smoke test (~30s — validation rapide)
```bash
npm run test:load:smoke         # tous les scénarios
npm run test:load:smoke:chat    # chat uniquement
npm run test:load:smoke:pdf     # PDF uniquement
npm run test:load:smoke:reads   # DB reads uniquement
```

### Full test (~10-15 min — charge réelle)
```bash
npm run test:load:full          # tous les scénarios séquentiels
npm run test:load:full:chat     # chat 50→1000 VUs
npm run test:load:full:pdf      # PDF 10→200 VUs
npm run test:load:full:reads    # DB reads 100→1000 VUs
```

## Scénarios

| Scénario | VUs max (full) | Thresholds |
|---|---|---|
| **chat-completion** | 1000 | p95 < 8s, p99 < 15s, errors < 5% |
| **generate-pdf** | 200 | p95 < 20s, p99 < 40s, errors < 5% |
| **supabase-reads** | 1000 | p95 < 2s, p99 < 5s, errors < 2% |

## Résultats

Les rapports JSON sont sauvegardés dans `tests/load/results/` :
```
tests/load/results/
  chat-2026-03-03T10-00-00.json
  pdf-2026-03-03T10-15-00.json
  reads-2026-03-03T10-25-00.json
```

Chaque rapport contient toutes les métriques k6 : p50, p95, p99, max, error_rate, counters.

## Métriques mesurées

- **`*_duration_ms`** — latence p50/p95/p99/max par scénario
- **`*_error_rate`** — taux d'erreur (5xx, timeouts, parse errors)
- **`*_timeouts`** — nombre absolu de timeouts réseau
- **`chat_eco_mode_activations`** — déclenchements du circuit-breaker budget
- **`modules_fetched / progress_fetched`** — counters de succès DB
