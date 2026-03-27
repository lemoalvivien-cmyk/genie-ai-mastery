/**
 * Product Truth Matrix — Formetoialia
 *
 * Central registry of every sensitive public claim.
 * Each entry maps a user-facing promise to its technical proof.
 *
 * Status:
 *   "proven"   — backend, edge function, or test confirms it works
 *   "hedged"   — wording is honest about limitations (e.g. "exportable" not "automatique")
 *   "flagged"  — behind a feature flag, not shown to users
 *   "removed"  — claim was deleted from public pages
 *
 * This file is the single source of truth for the anti-bullshit test suite.
 * If a claim exists on a public page without an entry here → test FAILS.
 */

export type ClaimStatus = "proven" | "hedged" | "flagged" | "removed";

export interface ProductClaim {
  /** The exact or near-exact text shown to users */
  claim: string;
  /** Where it appears */
  location: string;
  /** Keyword category */
  category:
    | "live"
    | "realtime"
    | "automatic"
    | "operational"
    | "multi-agent"
    | "voice"
    | "monthly-report"
    | "advanced-analysis"
    | "pricing"
    | "trial"
    | "attestation";
  /** Current status */
  status: ClaimStatus;
  /** Technical proof: edge function name, DB function, feature flag, or test ID */
  proof: string;
  /** Optional note */
  note?: string;
}

/**
 * ═══════════════════════════════════════════════════════════════
 *  MASTER TRUTH MATRIX
 * ═══════════════════════════════════════════════════════════════
 */
export const PRODUCT_TRUTH_MATRIX: ProductClaim[] = [
  // ── PRICING & TRIAL ──────────────────────────────────────────
  {
    claim: "59€ TTC/mois",
    location: "Index.tsx, Pricing.tsx",
    category: "pricing",
    status: "proven",
    proof: "create-checkout edge function → Stripe price lookup",
    note: "Price is fetched from Stripe, not hardcoded in backend",
  },
  {
    claim: "14 jours d'essai sans carte",
    location: "Index.tsx, Pricing.tsx",
    category: "trial",
    status: "proven",
    proof: "create-checkout edge function → trial_period_days: 14",
  },
  {
    claim: "Jusqu'à 25 membres",
    location: "Index.tsx, Pricing.tsx",
    category: "pricing",
    status: "proven",
    proof: "organizations.seats_max default + update-seats edge function",
  },
  {
    claim: "Résiliation en 2 clics via portail Stripe",
    location: "Pricing.tsx FAQ",
    category: "pricing",
    status: "proven",
    proof: "create-portal-session edge function",
  },

  // ── OPERATIONAL CLAIMS ───────────────────────────────────────
  {
    claim: "Missions quotidiennes guidées par KITT",
    location: "Index.tsx, Pricing.tsx",
    category: "operational",
    status: "proven",
    proof: "chat-completion edge function + daily_missions table + get_next_best_action RPC",
  },
  {
    claim: "Playbooks métier complets",
    location: "Index.tsx, Pricing.tsx",
    category: "operational",
    status: "proven",
    proof: "src/data/playbooks.ts + PlaybookCard component + modules table",
  },
  {
    claim: "Attestations PDF vérifiables + QR code",
    location: "Pricing.tsx",
    category: "attestation",
    status: "proven",
    proof: "generate-pdf edge function + attestations table + VerifyAttestation page",
  },
  {
    claim: "Cockpit manager",
    location: "Index.tsx, Pricing.tsx",
    category: "operational",
    status: "proven",
    proof: "ManagerDashboard.tsx + calculate_org_stats RPC + org RLS policies",
  },
  {
    claim: "Diagnostic calibre votre niveau",
    location: "Index.tsx (step 01)",
    category: "operational",
    status: "proven",
    proof: "PlacementQuiz page + placement_quiz_results table + adaptive-learning-path edge function",
  },
  {
    claim: "Plan d'exécution construit automatiquement",
    location: "Index.tsx (step 01)",
    category: "automatic",
    status: "proven",
    proof: "adaptive-learning-path edge function generates path after placement quiz",
  },
  {
    claim: "KITT — 500 échanges/jour (Pro)",
    location: "Pricing.tsx, Chat.tsx",
    category: "operational",
    status: "proven",
    proof: "chat-completion edge function quota logic + check-subscription",
  },
  {
    claim: "2 échanges/jour (Free)",
    location: "Pricing.tsx",
    category: "operational",
    status: "proven",
    proof: "chat-completion edge function free tier quota",
  },
  {
    claim: "Livrables téléchargeables",
    location: "Pricing.tsx",
    category: "operational",
    status: "proven",
    proof: "artifacts table + PdfDownloadButton + generate-pdf edge function",
  },
  {
    claim: "Historique exportable",
    location: "Pricing.tsx",
    category: "operational",
    status: "proven",
    proof: "export-compliance-dossier edge function",
  },
  {
    claim: "XP, jalons, progression mesurable",
    location: "Index.tsx",
    category: "operational",
    status: "proven",
    proof: "user_streaks table + skill_mastery table + XPProgressBar + BadgeGrid",
  },

  // ── REPORTS ──────────────────────────────────────────────────
  {
    claim: "Rapports exportables",
    location: "Pricing.tsx (Piloter group)",
    category: "monthly-report",
    status: "hedged",
    proof: "export-compliance-dossier edge function (manual trigger)",
    note: "Changed from 'Rapports automatisés' to 'Rapports exportables' — no cron auto-send yet",
  },

  // ── VOICE ────────────────────────────────────────────────────
  {
    claim: "Voice mode (STT + TTS) in chat",
    location: "Chat.tsx",
    category: "voice",
    status: "proven",
    proof: "useVoiceEngine hook + text-to-speech edge function + Web Speech API STT + features.voiceMode flag",
    note: "Behind features.voiceMode flag + Pro-only gate",
  },

  // ── FLAGGED / HIDDEN ─────────────────────────────────────────
  {
    claim: "Admin dashboards (ControlRoom, OpsCenter, etc.)",
    location: "App.tsx routes",
    category: "advanced-analysis",
    status: "flagged",
    proof: "features.adminDashboard flag → default false",
  },
  {
    claim: "Palantir / multi-agent mode",
    location: "App.tsx routes",
    category: "multi-agent",
    status: "flagged",
    proof: "features.palantirMode flag → default false",
  },
  {
    claim: "OpenClaw agentic runtime",
    location: "App.tsx routes",
    category: "multi-agent",
    status: "flagged",
    proof: "features.openclawRuntime flag → default false",
  },
  {
    claim: "Monthly report auto-generation",
    location: "Edge functions",
    category: "monthly-report",
    status: "flagged",
    proof: "features.monthlyReportAuto flag → default false",
  },
  {
    claim: "Public live stats on landing",
    location: "LandingStats.tsx",
    category: "live",
    status: "flagged",
    proof: "features.publicLiveStats flag → default false; falls back to qualitative proof",
  },

  // ── REMOVED ──────────────────────────────────────────────────
  {
    claim: "Satisfait ou remboursé",
    location: "Pricing.tsx (was)",
    category: "pricing",
    status: "removed",
    proof: "Verified absent by product-truth.test.tsx",
  },
  {
    claim: "JARVIS branding",
    location: "All pages (was)",
    category: "operational",
    status: "removed",
    proof: "Verified absent by product-truth.test.tsx",
  },
  {
    claim: "Genie IA branding",
    location: "All pages (was)",
    category: "operational",
    status: "removed",
    proof: "Verified absent by product-truth.test.tsx",
  },
];

// ── Helpers for test suite ──────────────────────────────────────
export function getClaimsByStatus(status: ClaimStatus): ProductClaim[] {
  return PRODUCT_TRUTH_MATRIX.filter((c) => c.status === status);
}

export function getClaimsByCategory(category: ProductClaim["category"]): ProductClaim[] {
  return PRODUCT_TRUTH_MATRIX.filter((c) => c.category === category);
}

/** Returns claims that are publicly visible (proven or hedged) */
export function getPublicClaims(): ProductClaim[] {
  return PRODUCT_TRUTH_MATRIX.filter((c) => c.status === "proven" || c.status === "hedged");
}

/** Returns claims that MUST NOT appear on public pages */
export function getFlaggedClaims(): ProductClaim[] {
  return PRODUCT_TRUTH_MATRIX.filter((c) => c.status === "flagged");
}
