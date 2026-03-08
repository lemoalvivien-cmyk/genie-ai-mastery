/** Centralised JSON-LD helpers for schema.org structured data */

const BASE_URL = "https://genie-ai-mastery.lovable.app";
const OG_IMAGE = `${BASE_URL}/logo-genie.png`;

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "GENIE IA",
    url: BASE_URL,
    logo: OG_IMAGE,
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      email: "contact@genie-ia.app",
      contactType: "customer support",
      availableLanguage: "French",
    },
  };
}

export function softwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "GENIE IA",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: BASE_URL,
    description:
      "Plateforme de montée en compétence IA, cybersécurité et vibe coding. Modules structurés, labs pratiques, copilote KITT, attestations PDF vérifiables et dashboard manager équipe.",
    offers: {
      "@type": "Offer",
      price: "59",
      priceCurrency: "EUR",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        billingDuration: "P1M",
      },
      availability: "https://schema.org/InStock",
    },
    // Note: no aggregateRating — aucune donnée réelle disponible
  };
}

export function productSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "GENIE Pro",
    description:
      "Abonnement GENIE IA Pro. Modules IA, cybersécurité et vibe coding, copilote KITT illimité, labs interactifs, attestations PDF vérifiables, dashboard manager jusqu'à 25 membres.",
    brand: { "@type": "Brand", name: "GENIE IA" },
    image: OG_IMAGE,
    offers: {
      "@type": "Offer",
      price: "59",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: `${BASE_URL}/pricing`,
      priceValidUntil: "2026-12-31",
    },
  };
}

export function faqSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Qu'est-ce que GENIE IA ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "GENIE IA est un système guidé de montée en compétence IA. Il combine des modules structurés (IA Pro, IA Perso, Cybersécurité), un copilote conversationnel appelé KITT, des labs pratiques et des attestations PDF vérifiables.",
        },
      },
      {
        "@type": "Question",
        name: "Les attestations GENIE IA sont-elles reconnues légalement ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Les attestations GENIE IA sont des preuves internes de compétences, signées cryptographiquement et vérifiables via QR code public (/verify/:id). Elles ne sont pas des certifications reconnues par des organismes externes. Leur valeur est celle d'une preuve documentée de formation, utile dans un contexte de conformité interne ou professionnelle.",
        },
      },
      {
        "@type": "Question",
        name: "Combien coûte l'abonnement GENIE IA ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "L'abonnement Pro est à 59€ TTC/mois par organisation (prix de lancement disponible). Il couvre jusqu'à 25 membres, sans engagement. Résiliation en 2 clics, remboursement 30 jours.",
        },
      },
      {
        "@type": "Question",
        name: "Puis-je former toute mon équipe sur GENIE IA ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Oui. Le plan Pro inclut un dashboard manager, le suivi de progression individuel et collectif, et jusqu'à 25 sièges. Pour des équipes plus grandes, contactez-nous pour un devis entreprise.",
        },
      },
      {
        "@type": "Question",
        name: "Comment fonctionne le copilote KITT ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "KITT est le copilote IA intégré à la plateforme. Il répond à vos questions sur les modules en cours, suggère des missions quotidiennes adaptées à votre niveau et vous guide en cas de blocage. Il fonctionne en mode texte et vocal.",
        },
      },
    ],
  };
}

export function articleSchema(opts: {
  title: string;
  description: string;
  slug: string;
  datePublished?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.title,
    description: opts.description,
    url: `${BASE_URL}/guides/${opts.slug}`,
    datePublished: opts.datePublished ?? "2026-03-01",
    dateModified: opts.datePublished ?? "2026-03-01",
    author: { "@type": "Organization", name: "GENIE IA" },
    publisher: {
      "@type": "Organization",
      name: "GENIE IA",
      logo: { "@type": "ImageObject", url: OG_IMAGE },
    },
    image: OG_IMAGE,
    mainEntityOfPage: `${BASE_URL}/guides/${opts.slug}`,
  };
}
