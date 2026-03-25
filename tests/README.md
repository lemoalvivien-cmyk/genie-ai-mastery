# 🧪 Formetoialia – Tests de simulation automatisée

## 🚀 Commandes

```bash
# Installer les navigateurs (une seule fois)
bunx playwright install chromium

# Tous les tests (headless)
npm run test:simulation

# Tous les tests avec navigateur visible
npm run test:simulation:headed

# Par parcours
npm run test:simulation:b2c       # Learner B2C (11 étapes)
npm run test:simulation:b2b       # Manager B2B (9 étapes)
npm run test:simulation:mobile    # iPhone 14 (10 tests)
npm run test:simulation:perf      # Perf + Sécurité (11 tests)

# Rapport HTML après exécution
bunx playwright show-report
```

## 📋 Fichiers de test

| Fichier | Parcours | Tests |
|---------|----------|-------|
| `formetoialia-b2c.spec.ts` | Landing → Inscription → Onboarding → Modules → Quiz → Chat → PDF | 11 |
| `formetoialia-b2b.spec.ts` | Inscription manager → Onboarding → Dashboard → CSV import → Stats | 9 |
| `formetoialia-mobile.spec.ts` | Même parcours B2C sur iPhone 14 (390×844) | 10 |
| `formetoialia-perf.spec.ts` | LCP < 2s, CSP headers, 404, chat queued < 3s, attestation | 11 |

## ⚙️ Variables d'environnement

```bash
PLAYWRIGHT_BASE_URL=https://formetoialia.com   # URL cible
B2C_EMAIL=learner@test.com                      # Compte B2C existant (optionnel)
B2C_PASSWORD=Secure123!
B2B_EMAIL=manager@test.com                      # Compte B2B existant (optionnel)
B2B_PASSWORD=Secure123!
TEST_USER_EMAIL=test@formetoialia.dev           # Compte de test e2e
TEST_USER_PASSWORD=                             # Renseigner localement, ne jamais committer
```

## 🖥️ Profils navigateur

| Projet | Navigateur | Viewport |
|--------|-----------|----------|
| `b2c-desktop` | Chrome | 1280×800 |
| `b2b-desktop` | Chrome | 1440×900 |
| `mobile-iphone14` | iPhone 14 | 390×844 |
| `perf-security` | Chrome | 1280×800 |
