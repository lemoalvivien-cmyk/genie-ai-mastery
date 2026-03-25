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
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: BASE_URL,
    description:
      "Formetoialia — Système d'exécution IA quotidien pour équipes. Missions guidées, playbooks métier, copilote KITT, cockpit manager. Résultats concrets dès la première session. 59€/mois — jusqu'à 25 membres.",
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
      "Abonnement Formetoialia Pro. Missions illimitées, playbooks métier complets, copilote KITT illimité, cockpit manager, attestations PDF vérifiables — jusqu'à 25 membres inclus.",
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
          text: "Formetoialia est un système d'exécution IA quotidien. Il combine des missions guidées, des playbooks métier prêts à l'emploi (IA Pro, IA Perso, Cybersécurité), un copilote conversationnel KITT, et un cockpit manager pour piloter l'adoption IA de toute l'équipe.",
        },
      },
      {
        "@type": "Question",
        name: "Les attestations Formetoialia sont-elles reconnues légalement ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Les attestations Formetoialia sont des preuves internes de compétences, signées cryptographiquement et vérifiables via QR code public (/verify/:id). Elles ne sont pas des certifications reconnues par des organismes externes. Leur valeur est celle d'une preuve documentée de maîtrise, utile dans un contexte de conformité interne ou professionnelle.",
        },
      },
      {
        "@type": "Question",
        name: "Combien coûte l'abonnement Formetoialia ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "L'abonnement Pro est à 59€ TTC/mois par organisation. Il couvre jusqu'à 25 membres. Essai 14 jours sans carte bancaire. Résiliation en 2 clics, accès jusqu'à la fin de la période payée.",
        },
      },
      {
        "@type": "Question",
        name: "Puis-je déployer Formetoialia sur toute mon équipe ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Oui. Le plan Pro inclut un cockpit manager, le suivi de progression individuel et collectif, et jusqu'à 25 sièges. Pour des équipes plus grandes, contactez-nous pour un devis entreprise.",
        },
      },
      {
        "@type": "Question",
        name: "Comment fonctionne le copilote KITT de Formetoialia ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "KITT est le copilote IA intégré à la plateforme Formetoialia. Il assigne vos missions du jour, vous guide étape par étape dans les playbooks, évalue vos réponses et adapte votre parcours en temps réel. Plan gratuit : 2 échanges/jour. Plan Pro : 500 échanges/jour.",
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
