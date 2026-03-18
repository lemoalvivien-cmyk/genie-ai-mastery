// ============================================================
// LISTE DES SOUS-TRAITANTS — FORMETOIALIA
// Mettre à jour cette liste à chaque ajout/retrait de prestataire.
// ============================================================

export type Subprocessor = {
  name: string;
  role: string;
  region: "UE" | "Hors UE" | "UE / Hors UE";
  guarantees: string;
  website?: string;
};

// ── Sous-traitants confirmés — affichés publiquement ─────────────────────────
export const subprocessors: Subprocessor[] = [
  {
    name: "Lovable Cloud / hébergement cloud UE",
    role: "Hébergement, base de données, authentification, stockage de fichiers",
    region: "UE",
    guarantees: "Infrastructure localisée dans l'Union européenne",
    website: "https://lovable.dev",
  },
  {
    name: "Stripe",
    role: "Paiement en ligne, gestion des abonnements, facturation",
    region: "UE / Hors UE",
    guarantees: "Clauses contractuelles types (SCC) — certifié PCI-DSS",
    website: "https://stripe.com",
  },
  {
    name: "OpenAI / fournisseurs IA",
    role: "Génération de contenus via le chat IA, résumés, aide pédagogique",
    region: "Hors UE",
    guarantees:
      "Clauses contractuelles types (SCC) — données de session non conservées au-delà du traitement",
    website: "https://openai.com",
  },
];

// ── Sous-traitants en cours de sélection — NON publiés ───────────────────────
// Ces entrées sont volontairement exclues de l'affichage public
// tant que le choix de prestataire n'est pas finalisé.
// Ne pas les afficher sur la page légale tant que `website` et `guarantees` sont incomplets.
export const _pendingSubprocessors: Subprocessor[] = [
  {
    name: "Service emailing transactionnel",
    role: "Envoi d'emails (confirmation de compte, alertes, notifications)",
    region: "UE",
    guarantees: "À préciser — décision prestataire en cours (Brevo, Postmark, Resend…)",
    website: "",
  },
  {
    name: "CDN / edge distribution",
    role: "Distribution de contenu statique, performance",
    region: "UE / Hors UE",
    guarantees: "À préciser selon le prestataire retenu",
  },
];

export const subprocessorsUpdatedAt = "09/03/2026";
