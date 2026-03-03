export interface Guide {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  domain: "ia" | "cyber" | "vibe";
  readingMinutes: number;
  datePublished: string;
  sections: {
    heading: string;
    body: string;
  }[];
  faq: { q: string; a: string }[];
}

export const GUIDES: Guide[] = [
  /* ───────────────── IA ───────────────── */
  {
    slug: "c-est-quoi-l-ia-generative",
    title: "C'est quoi l'IA générative ? (explication simple)",
    metaTitle: "IA générative : définition simple et concrète | GENIE IA",
    metaDescription:
      "Comprendre l'IA générative en 5 minutes. Pas de jargon. Exemples concrets, utilisations pratiques et comment s'y former à moindre coût.",
    domain: "ia",
    readingMinutes: 5,
    datePublished: "2026-03-01",
    sections: [
      {
        heading: "L'IA générative, c'est quoi exactement ?",
        body: "L'IA générative désigne une famille d'algorithmes capables de créer du contenu nouveau : texte, images, code, audio ou vidéo. Contrairement à une IA qui classifie (\"est-ce un chat ou un chien ?\"), elle produit. ChatGPT, Gemini, Midjourney — tous sont des IA génératives.",
      },
      {
        heading: "Comment ça marche sans être ingénieur ?",
        body: "Ces modèles ont été entraînés sur des milliards de textes. Ils prédisent quel mot vient après un autre, avec une précision si fine qu'ils semblent comprendre. En pratique : vous posez une question, l'IA génère la réponse la plus probable et la plus utile.",
      },
      {
        heading: "3 utilisations concrètes aujourd'hui",
        body: "1. Rédiger des emails, des rapports ou du code en quelques secondes. 2. Analyser des documents (contrats, bilans) et en extraire les points clés. 3. Créer des visuels professionnels sans designer. Ces tâches prenaient des heures. L'IA les fait en minutes.",
      },
      {
        heading: "Pourquoi se former maintenant ?",
        body: "Les entreprises recrutent des profils qui maîtrisent ces outils. Les indépendants qui utilisent l'IA facturent 2× plus en travaillant moitié moins. Attendre 6 mois, c'est déjà être en retard.",
      },
    ],
    faq: [
      { q: "L'IA peut-elle remplacer mon métier ?", a: "Pas votre métier — mais quelqu'un qui maîtrise l'IA pourrait vous concurrencer. Mieux vaut l'utiliser que la subir." },
      { q: "Faut-il savoir coder pour utiliser l'IA ?", a: "Non. 90% des usages professionnels de l'IA se font sans une ligne de code." },
      { q: "Combien coûte une formation IA sérieuse ?", a: "Entre 500€ et 3 000€ pour une formation classique. GENIE IA propose tout ça à 59€/mois, avec des attestations vérifiables." },
    ],
  },
  {
    slug: "prompt-engineering-debutant",
    title: "Prompt engineering : le guide complet pour débutants",
    metaTitle: "Prompt engineering débutant : guide pratique 2026 | GENIE IA",
    metaDescription:
      "Apprenez le prompt engineering sans jargon. Techniques de base, exemples concrets, erreurs à éviter. Formez-vous à 59€/mois avec GENIE IA.",
    domain: "ia",
    readingMinutes: 6,
    datePublished: "2026-03-01",
    sections: [
      {
        heading: "Le prompt engineering, c'est l'art de parler à l'IA",
        body: "Un prompt, c'est l'instruction que vous donnez à l'IA. La qualité de votre prompt détermine à 80% la qualité de la réponse. Un mauvais prompt donne une réponse générique. Un bon prompt donne une réponse précise, utile, prête à l'emploi.",
      },
      {
        heading: "Les 4 éléments d'un prompt efficace",
        body: "1. RÔLE — Dites à l'IA qui elle est : \"Tu es un expert comptable.\"\n2. CONTEXTE — Donnez les informations utiles : \"Mon client est une PME de 10 salariés.\"\n3. TÂCHE — Ce que vous voulez : \"Rédige un email de relance de facture.\"\n4. FORMAT — La forme souhaitée : \"3 paragraphes courts, ton professionnel mais chaleureux.\"",
      },
      {
        heading: "Les 3 erreurs les plus fréquentes",
        body: "Trop vague (\"parle-moi de la cybersécurité\"), trop long sans structure, ou oublier le format de sortie. Résultat : une réponse inutilisable que vous retravaillez pendant 20 minutes.",
      },
      {
        heading: "Pratiquer avec GENIE IA",
        body: "GENIE IA intègre 500+ modules de prompt engineering, des exercices guidés et un Jarvis vocal qui corrige vos prompts en temps réel. Vous progressez en pratiquant, pas en lisant.",
      },
    ],
    faq: [
      { q: "Le prompt engineering est-il un vrai métier ?", a: "Oui. De nombreuses entreprises recrutent des 'Prompt Engineers' ou forment leurs équipes à cette compétence." },
      { q: "Est-ce que ça marche sur tous les modèles ?", a: "Les principes sont universels. ChatGPT, Gemini, Claude — la même logique s'applique avec de légères variantes." },
    ],
  },
  /* ───────────────── CYBER ───────────────── */
  {
    slug: "cybersecurite-pour-les-nuls",
    title: "Cybersécurité pour les nuls : 10 réflexes qui protègent vraiment",
    metaTitle: "Cybersécurité pour les nuls : 10 réflexes essentiels 2026 | GENIE IA",
    metaDescription:
      "10 réflexes de cybersécurité expliqués simplement. Protégez vous et votre entreprise sans être informaticien. Formation cyber à 59€/mois.",
    domain: "cyber",
    readingMinutes: 5,
    datePublished: "2026-03-01",
    sections: [
      {
        heading: "Pourquoi la cybersécurité vous concerne (même si vous n'êtes pas IT)",
        body: "En 2025, une PME sur trois a subi au moins une tentative d'attaque cyber. Les hackers ne visent plus seulement les grandes entreprises — ils automatisent leurs attaques pour toucher tout le monde. Le meilleur antivirus, c'est vous.",
      },
      {
        heading: "Les 10 réflexes essentiels",
        body: "1. Mot de passe unique par service (gestionnaire de mots de passe). 2. Double authentification (2FA) activée partout. 3. Mise à jour immédiate des appareils. 4. Ne jamais cliquer sur un lien dans un email inattendu. 5. Sauvegardes automatiques (règle 3-2-1). 6. VPN sur Wi-Fi public. 7. Vérifier l'expéditeur, pas seulement le nom affiché. 8. Données sensibles uniquement sur appareils chiffrés. 9. Former son entourage (la chaîne est aussi solide que son maillon le plus faible). 10. Signaler toute anomalie immédiatement.",
      },
      {
        heading: "Le phishing : comment ne plus jamais se faire avoir",
        body: "80% des cyberattaques commencent par un email de phishing. La règle d'or : l'urgence + la peur = manipulation. Toute demande urgente de virement, de mot de passe ou de document suspect doit être vérifiée par un autre canal avant action.",
      },
    ],
    faq: [
      { q: "Mon entreprise est petite, les hackers ne s'y intéressent pas ?", a: "Faux. Les PME sont des cibles privilégiées : moins de défenses, mais des données de valeur et des accès aux grands comptes." },
      { q: "La certification NIS2 me concerne-t-elle ?", a: "Si votre entreprise a plus de 50 salariés ou opère dans un secteur critique, probablement oui. GENIE IA propose un module de conformité NIS2." },
    ],
  },
  {
    slug: "phishing-reconnaitre-eviter",
    title: "Phishing : comment reconnaître et éviter les arnaques en 2026",
    metaTitle: "Reconnaître le phishing en 2026 : guide pratique | GENIE IA",
    metaDescription:
      "Apprenez à détecter les emails et SMS de phishing avec des exemples réels. Exercices pratiques disponibles sur GENIE IA à 59€/mois.",
    domain: "cyber",
    readingMinutes: 4,
    datePublished: "2026-03-01",
    sections: [
      {
        heading: "Le phishing en 2026 : plus sophistiqué que jamais",
        body: "Avec l'IA générative, les hackers créent des emails sans fautes d'orthographe, personnalisés, qui imitent parfaitement le style de votre banque ou de votre chef. Les anciens indices (fautes, adresses bizarres) ne suffisent plus.",
      },
      {
        heading: "5 signaux d'alarme universels",
        body: "1. Urgence imposée (\"votre compte sera clôturé dans 24h\"). 2. Demande de clic sur un lien pour vérifier quelque chose. 3. Expéditeur légèrement différent de l'officiel (support@app1e.com). 4. Pièce jointe inattendue. 5. Demande d'information confidentielle par email.",
      },
      {
        heading: "L'exercice GENIE IA Phishing Lab",
        body: "GENIE IA propose un laboratoire interactif où vous analysez de vrais emails de phishing reconstitués. Vous identifiez les indices, vous validez vos réflexes, vous obtenez un score. Idéal pour la formation d'équipe.",
      },
    ],
    faq: [
      { q: "J'ai cliqué sur un lien de phishing, que faire ?", a: "Déconnectez-vous d'internet immédiatement. Changez vos mots de passe depuis un autre appareil. Contactez votre IT ou votre banque." },
    ],
  },
  /* ───────────────── VIBE CODING ───────────────── */
  {
    slug: "vibe-coding-c-est-quoi",
    title: "Vibe Coding : créer une app sans savoir coder en 2026",
    metaTitle: "Vibe Coding : créer une app sans coder | Guide 2026 | GENIE IA",
    metaDescription:
      "Le Vibe Coding permet de créer de vraies applications web en décrivant ce que vous voulez en langage naturel. Guide complet pour débutants.",
    domain: "vibe",
    readingMinutes: 5,
    datePublished: "2026-03-01",
    sections: [
      {
        heading: "Vibe Coding : la révolution du développement no-code",
        body: "Le Vibe Coding consiste à décrire une application en langage naturel et à laisser l'IA générer le code. En 2026, des outils comme Lovable, Cursor ou v0 permettent à des non-développeurs de créer de vraies applications web fonctionnelles en quelques heures.",
      },
      {
        heading: "Ce qu'il est possible de créer",
        body: "Plateformes SaaS, outils internes, applications mobiles web, landing pages interactives, tableaux de bord. Toute l'infrastructure (base de données, authentification, paiements) peut être générée et configurée sans toucher une ligne de code.",
      },
      {
        heading: "Vibe Coding vs no-code classique",
        body: "Les outils no-code classiques (Webflow, Bubble) vous contraignent à leur logique. Le Vibe Coding génère du vrai code modifiable — vous n'êtes pas enfermé. Si vous apprenez les bases, vous pouvez personnaliser et évoluer sans limite.",
      },
      {
        heading: "Comment démarrer avec GENIE IA",
        body: "GENIE IA propose un module Vibe Coding complet : des exercices guidés pour passer de l'idée à l'application déployée en une session. Vous construisez, vous apprenez en faisant, vous obtenez une attestation.",
      },
    ],
    faq: [
      { q: "Le Vibe Coding remplace-t-il les développeurs ?", a: "Pour des projets simples, oui. Pour des applications complexes, il les accélère. Les devs qui utilisent l'IA produisent 3× plus vite." },
      { q: "Faut-il des notions de programmation ?", a: "Non pour commencer. Comprendre les bases (variables, fonctions) accélère votre progression mais n'est pas requis." },
    ],
  },
  {
    slug: "automatiser-son-travail-avec-ia",
    title: "Automatiser son travail avec l'IA : les 5 cas d'usage les plus rentables",
    metaTitle: "Automatiser son travail avec l'IA en 2026 | Guide GENIE IA",
    metaDescription:
      "Découvrez les 5 automatisations IA les plus rentables pour gagner du temps au travail. Guide pratique, sans jargon, avec exemples concrets.",
    domain: "ia",
    readingMinutes: 5,
    datePublished: "2026-03-01",
    sections: [
      {
        heading: "Pourquoi automatiser avec l'IA plutôt qu'avec des scripts ?",
        body: "Les scripts automatisent des tâches répétitives et rigides. L'IA automatise des tâches complexes qui nécessitent du jugement : rédiger un email adapté au contexte, analyser un document et en extraire des informations pertinentes, résumer une réunion.",
      },
      {
        heading: "Les 5 automatisations les plus rentables",
        body: "1. Triage et réponse aux emails (économie : 1h/jour). 2. Génération de rapports et comptes-rendus (économie : 2h/semaine). 3. Recherche documentaire et veille (économie : 3h/semaine). 4. Création de contenus marketing (économie : 4h/semaine). 5. Analyse de données et tableaux de bord (économie : 2h/semaine).",
      },
      {
        heading: "Comment démarrer sans tout automatiser d'un coup",
        body: "Identifiez la tâche la plus répétitive et chronophage de votre semaine. Testez une automatisation IA sur cette seule tâche pendant 2 semaines. Mesurez le gain. Puis passez à la suivante. L'erreur est de vouloir tout automatiser en même temps.",
      },
    ],
    faq: [
      { q: "L'automatisation IA nécessite-t-elle un abonnement payant ?", a: "Les outils de base sont souvent gratuits en version limitée. GENIE IA inclut des automatisations pré-configurées dans son plan Pro à 59€/mois." },
    ],
  },
];

export function getGuideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export function getGuidesByDomain(domain: Guide["domain"]): Guide[] {
  return GUIDES.filter((g) => g.domain === domain);
}
