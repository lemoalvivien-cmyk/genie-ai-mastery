# 🧪 Formetoialia – Tests Automatisés

Suite de tests complète : **simulation utilisateur**, **tests unitaires**, **tests de charge**.

---

## 📦 Stack de test

| Outil | Usage |
|-------|-------|
| **Playwright** | Simulation E2E (B2C, B2B, mobile, perf) |
| **Vitest** | Tests unitaires React |
| **k6** | Tests de charge (Edge Functions) |

---

## 🚀 Lancer les simulations

### Simulation complète (recommandé)
```bash
# Headless (CI/CD)
npm run test:simulation

# Avec navigateur visible (debug)
npm run test:simulation:headed

# Mode interactif UI Playwright
npm run test:simulation:ui

# Un seul test/parcours
npm run test:simulation -- --grep "B2C"
npm run test:simulation -- --grep "B2B"
npm run test:simulation -- --grep "Mobile"
npm run test:simulation -- --grep "Performance"
```

### Tests E2E legacy (genie.spec.ts)
```bash
npx playwright test tests/e2e/
```

---

## 🎯 Parcours simulés

### Test 1 – Parcours B2C (Learner)
| Étape | Description |
|-------|-------------|
| 1.1 | Landing page – hero + CTA visibles |
| 1.2 | Navigation vers inscription |
| 1.3 | Formulaire register → création compte |
| 1.4 | Onboarding étape 1 – Persona/Niveau |
| 1.5 | Onboarding étape 2 – Intérêts |
| 1.6 | Onboarding quiz phishing (3 questions) |
| 1.7 | Dashboard → liste des modules |
| 1.8 | Ouvrir premier module disponible |
| 1.9 | Démarrer et compléter un quiz |
| 1.10 | **Chat IA** – message + réponse queued < 3s |
| 1.11 | **PDF** – déclencher génération attestation |
| 1.12 | **Attestation** – page vérification contient "Formetoialia" |

### Test 2 – Parcours B2B Manager
| Étape | Description |
|-------|-------------|
| 2.1 | Inscription manager/dirigeant |
| 2.2 | Onboarding – sélection profil manager |
| 2.3 | Compléter étapes onboarding |
| 2.4 | Accès Manager Dashboard |
| 2.5 | **Import CSV** – upload + preview colonnes + détection doublons |
| 2.6 | **Stats realtime** – métriques équipe visibles |

### Test 3 – Mobile Responsive (iPhone 14)
| Étape | Description |
|-------|-------------|
| 3.1 | Landing – hero + CTA + zéro overflow horizontal |
| 3.2 | Chat – textarea accessible + dans le viewport |

### Test 4 – Performance & Sécurité
| Étape | Description |
|-------|-------------|
| 4.1 | LCP landing page < 3 secondes |
| 4.2 | Headers CSP/sécurité présents |
| 4.3 | Page 404 affichée correctement |
| 4.4 | Chat queued < 3s sans authentification |

---

## ⚙️ Variables d'environnement

```bash
# URL de base (défaut: https://formetoialia.com)
PLAYWRIGHT_BASE_URL=http://localhost:5173

# Compte de test B2C existant (optionnel)
B2C_EMAIL=votre-email@test.com
B2C_PASSWORD=votreMotDePasse

# Compte de test B2B Manager existant (optionnel)
B2B_EMAIL=manager@test.com
B2B_PASSWORD=votreMotDePasse

# Compte pour tests hérités (genie.spec.ts)
TEST_USER_EMAIL=test@genie-ia.dev
TEST_USER_PASSWORD=test123456!
```

Créer un fichier `.env.test` à la racine :
```bash
cp tests/e2e/.env.example .env.test
# puis éditer .env.test
```

---

## 🖥️ Targets de test

| Profil | Navigateur | Viewport |
|--------|-----------|----------|
| `desktop` | Chrome (Chromium) | 1280×800 |
| `desktop-wide` | Chrome | 1440×900 |
| `mobile` | Chrome (mobile) | 375×812 |

---

## 📊 Rapports

Après exécution, ouvrir le rapport HTML :
```bash
npx playwright show-report
```

Le rapport est généré dans `playwright-report/`.

---

## 🔁 Intégration CI/CD

Exemple GitHub Actions :
```yaml
- name: Run Playwright simulations
  run: npm run test:simulation
  env:
    PLAYWRIGHT_BASE_URL: https://formetoialia.com
    CI: true
```

---

## 🧪 Tests unitaires Vitest

```bash
npm test              # run once
npm run test:watch    # watch mode
```

---

## 📈 Tests de charge k6

```bash
# Smoke test (rapide)
npm run test:load:smoke

# Full test (charge complète)
npm run test:load:full

# Par scénario
npm run test:load:smoke:chat
npm run test:load:smoke:pdf
npm run test:load:smoke:reads
```

---

## 🐛 Debug

```bash
# Mode headed (navigateur visible)
npm run test:simulation:headed

# Debug interactif pas à pas
npx playwright test --debug

# Un seul test
npx playwright test --grep "1.10"

# Voir les traces
npx playwright show-trace trace.zip
```
