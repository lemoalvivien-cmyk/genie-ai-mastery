/** Centralised JSON-LD helpers for schema.org structured data */

const BASE_URL = "https://genie-ai-mastery.lovable.app";
const OG_IMAGE  = `${BASE_URL}/logo-genie.png`;

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
      "Plateforme d'apprentissage IA, Cybersécurité et Vibe Coding. Attestations PDF vérifiables, Jarvis vocal, dashboard manager.",
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
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "87",
    },
  };
}

export function productSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "GENIE Pro",
    description:
      "Abonnement mensuel GENIE IA Pro. Modules illimités IA/Cyber/Vibe Coding, voix Jarvis, attestations vérifiables, dashboard manager.",
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
          text: "GENIE IA est une plateforme de formation professionnelle en Intelligence Artificielle, Cybersécurité et Vibe Coding. Elle propose des modules interactifs, un copilote vocal KITT, et des attestations PDF vérifiables, dès 29€/mois.",
        },
      },
      {
        "@type": "Question",
        name: "Les attestations GENIE IA sont-elles reconnues par les OPCO ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Oui. Les attestations sont signées cryptographiquement et vérifiables en ligne via une URL publique (/verify/:id). Elles sont acceptées pour les démarches OPCO et CPF.",
        },
      },
      {
        "@type": "Question",
        name: "Combien coûte l'abonnement GENIE IA ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "L'abonnement Pro démarre à 29€/mois sans engagement. Un plan Business pour les équipes (jusqu'à 25 sièges) est disponible à partir de 59€/mois.",
        },
      },
      {
        "@type": "Question",
        name: "Puis-je former toute mon équipe sur GENIE IA ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Oui. Le plan Business inclut un dashboard manager, des alertes de progression, des rapports RH exportables et jusqu'à 25 sièges. Des licences multi-équipes sont disponibles sur devis.",
        },
      },
      {
        "@type": "Question",
        name: "Comment fonctionne le copilote vocal KITT ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "KITT est un assistant IA vocal intégré à la plateforme. Il répond à vos questions, génère des résumés de modules, crée des fiches pratiques et vous guide dans votre parcours de formation en langage naturel.",
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
