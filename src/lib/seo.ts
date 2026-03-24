/** Centralised JSON-LD helpers for schema.org structured data */

const BASE_URL = "https://formetoialia.com";
const OG_IMAGE = `${BASE_URL}/logo-formetoialia.png`;

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Formetoialia",
    url: BASE_URL,
    logo: OG_IMAGE,
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      email: "contact@formetoialia.com",
      contactType: "customer support",
      availableLanguage: "French",
    },
  };
}

export function softwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Formetoialia",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: BASE_URL,
    description:
      "Formetoialia — La formation qui apprend plus vite que vous. Plateforme de montée en compétence IA, cybersécurité et vibe coding. Modules structurés, labs pratiques, copilote IA, attestations PDF vérifiables et dashboard manager équipe.",
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
  };
}

export function productSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Formetoialia Pro",
    description:
      "Abonnement Formetoialia Pro. Modules IA, cybersécurité et vibe coding, copilote IA illimité, labs interactifs, attestations PDF vérifiables, dashboard manager jusqu'à 25 membres.",
    brand: { "@type": "Brand", name: "Formetoialia" },
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
        name: "Qu'est-ce que Formetoialia ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Formetoialia est un système guidé de montée en compétence IA. Il combine des modules structurés (IA Pro, IA Perso, Cybersécurité), un copilote conversationnel Genie, des labs pratiques et des attestations PDF vérifiables.",
        },
      },
      {
        "@type": "Question",
        name: "Les attestations Formetoialia sont-elles reconnues légalement ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Les attestations Formetoialia sont des preuves internes de compétences, signées cryptographiquement et vérifiables via QR code public (/verify/:id). Elles ne sont pas des certifications reconnues par des organismes externes. Leur valeur est celle d'une preuve documentée de formation, utile dans un contexte de conformité interne ou professionnelle.",
        },
      },
      {
        "@type": "Question",
        name: "Combien coûte l'abonnement Formetoialia ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "L'abonnement Pro est à 59€ TTC/mois par organisation. Il couvre jusqu'à 25 membres, sans engagement. Résiliation en 2 clics, remboursement 30 jours.",
        },
      },
      {
        "@type": "Question",
        name: "Puis-je former toute mon équipe sur Formetoialia ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Oui. Le plan Pro inclut un dashboard manager, le suivi de progression individuel et collectif, et jusqu'à 25 sièges. Pour des équipes plus grandes, contactez-nous pour un devis entreprise.",
        },
      },
      {
        "@type": "Question",
        name: "Comment fonctionne le copilote IA Formetoialia ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "JARVIS est le copilote IA intégré à la plateforme Formetoialia. Il répond à vos questions sur les modules en cours, suggère des missions quotidiennes adaptées à votre niveau et vous guide en cas de blocage. Il fonctionne en mode texte et vocal.",
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
    author: { "@type": "Organization", name: "Formetoialia" },
    publisher: {
      "@type": "Organization",
      name: "Formetoialia",
      logo: { "@type": "ImageObject", url: OG_IMAGE },
    },
    image: OG_IMAGE,
    mainEntityOfPage: `${BASE_URL}/guides/${opts.slug}`,
  };
}
