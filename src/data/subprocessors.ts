// ============================================================
// LISTE DES SOUS-TRAITANTS — GENIE IA
// Mettre à jour cette liste à chaque ajout/retrait de prestataire.
// ============================================================

export type Subprocessor = {
  name: string;
  role: string;
  region: "UE" | "Hors UE" | "UE / Hors UE";
  guarantees: string;
  website?: string;
};

export const subprocessors: Subprocessor[] = [
  {
    name: "Supabase / hébergement cloud UE",
    role: "Hébergement, base de données, authentification, stockage de fichiers",
    region: "UE",
    guarantees: "Infrastructure localisée dans l'Union européenne",
    website: "https://supabase.com",
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
    guarantees: "Clauses contractuelles types (SCC) — données de session non conservées au-delà du traitement",
    website: "https://openai.com",
  },
  {
    name: "Service emailing transactionnel",
    role: "Envoi d'emails (confirmation de compte, alertes, notifications)",
    region: "UE",
    guarantees: "Infrastructure localisée dans l'Union européenne",
    website: "", // TODO: renseigner le prestataire email (ex: Brevo, Postmark…)
  },
  {
    name: "[À compléter] — CDN / edge",
    role: "Distribution de contenu statique, performance",
    region: "UE / Hors UE",
    guarantees: "À préciser selon le prestataire retenu",
  },
];

export const subprocessorsUpdatedAt = "03/03/2026";
