/**
 * Catalogue de démonstration des playbooks métier
 * Utilisé pour enrichir l'affichage avec des métadonnées orientées résultat
 */

export interface PlaybookMeta {
  slug: string;
  category: string;
  problem: string;
  result: string;
  steps: string[];
  deliverable: string;
  deliverable_type: "email" | "document" | "script" | "analysis" | "presentation" | "process" | "brief";
  difficulty: "rapide" | "guidé" | "approfondi";
  estimated_minutes: number;
}

export const BUSINESS_CATEGORIES = [
  { id: "", label: "Tous", icon: "grid" },
  { id: "communication", label: "Communication", icon: "mail" },
  { id: "vente", label: "Vente", icon: "trending-up" },
  { id: "rh", label: "RH", icon: "users" },
  { id: "productivite", label: "Productivité", icon: "zap" },
  { id: "analyse", label: "Analyse", icon: "bar-chart-2" },
  { id: "presentation", label: "Présentation", icon: "layout" },
  { id: "support", label: "Support", icon: "headphones" },
  { id: "direction", label: "Direction", icon: "briefcase" },
] as const;

export const DEMO_PLAYBOOKS: PlaybookMeta[] = [
  {
    slug: "mail-delicat",
    category: "communication",
    problem: "Vous devez rédiger un message sensible sans créer de conflit",
    result: "Un email professionnel, calibré au bon ton, prêt à envoyer",
    deliverable: "Email complet rédigé",
    deliverable_type: "email",
    difficulty: "rapide",
    estimated_minutes: 5,
    steps: [
      "Décrivez la situation en 2 phrases",
      "Choisissez le ton souhaité",
      "Générez 2 versions (directe / diplomatique)",
      "Ajustez et sauvegardez",
    ],
  },
  {
    slug: "client-mecontent",
    category: "communication",
    problem: "Un client est insatisfait et vous devez répondre avec efficacité",
    result: "Réponse client apaisante qui préserve la relation commerciale",
    deliverable: "Réponse client complète",
    deliverable_type: "email",
    difficulty: "rapide",
    estimated_minutes: 7,
    steps: [
      "Décrivez la plainte reçue",
      "Identifiez le niveau d'urgence",
      "Générez une réponse empathique",
      "Ajoutez vos actions correctives",
    ],
  },
  {
    slug: "compte-rendu",
    category: "productivite",
    problem: "Vous sortez d'une réunion et devez en garder la trace structurée",
    result: "Compte rendu clair avec décisions et actions",
    deliverable: "Compte rendu structuré",
    deliverable_type: "document",
    difficulty: "rapide",
    estimated_minutes: 8,
    steps: [
      "Collez vos notes brutes ou résumez la réunion",
      "Identifiez les participants clés",
      "Structurez en décisions / actions / délais",
      "Exportez en PDF",
    ],
  },
  {
    slug: "presentation-commerciale",
    category: "vente",
    problem: "Vous préparez un pitch client et n'avez pas de structure",
    result: "Plan de présentation commerciale en 5 actes",
    deliverable: "Plan de présentation complet",
    deliverable_type: "presentation",
    difficulty: "guidé",
    estimated_minutes: 15,
    steps: [
      "Décrivez votre offre en une phrase",
      "Identifiez le problème client principal",
      "Construisez les 5 actes du pitch",
      "Générez slides outline + talking points",
    ],
  },
  {
    slug: "post-linkedin",
    category: "communication",
    problem: "Vous avez un brouillon ou une idée mais pas de format percutant",
    result: "Post LinkedIn calibré pour l'engagement",
    deliverable: "Post LinkedIn prêt à publier",
    deliverable_type: "document",
    difficulty: "rapide",
    estimated_minutes: 5,
    steps: [
      "Décrivez votre idée ou collez votre brouillon",
      "Choisissez le format (story / tip / question)",
      "Générez 2 versions avec hook fort",
      "Sélectionnez et ajustez",
    ],
  },
  {
    slug: "proposition-commerciale",
    category: "vente",
    problem: "Vous devez créer une proposition commerciale personnalisée rapidement",
    result: "Proposition commerciale structurée et persuasive",
    deliverable: "Proposition commerciale complète",
    deliverable_type: "document",
    difficulty: "approfondi",
    estimated_minutes: 20,
    steps: [
      "Renseignez le contexte client",
      "Décrivez votre solution en 3 points",
      "Construisez le bloc bénéfices / ROI",
      "Générez l'offre tarifaire et les étapes suivantes",
    ],
  },
  {
    slug: "procedure-interne",
    category: "direction",
    problem: "Vous devez clarifier et documenter une procédure floue",
    result: "Procédure claire, réutilisable et partageable",
    deliverable: "Fiche procédure documentée",
    deliverable_type: "process",
    difficulty: "guidé",
    estimated_minutes: 12,
    steps: [
      "Décrivez la procédure actuelle en langage naturel",
      "Identifiez les acteurs et étapes clés",
      "Structurez en étapes numérotées avec rôles",
      "Ajoutez exceptions et points de contrôle",
    ],
  },
  {
    slug: "resume-document",
    category: "analyse",
    problem: "Vous avez un document long à digérer rapidement",
    result: "Résumé exécutif avec points clés et actions",
    deliverable: "Synthèse exécutive",
    deliverable_type: "analysis",
    difficulty: "rapide",
    estimated_minutes: 6,
    steps: [
      "Collez le texte ou décrivez le document",
      "Choisissez le niveau (résumé flash / synthèse / brief exécutif)",
      "Générez la synthèse avec 3 points clés",
      "Ajoutez vos recommandations",
    ],
  },
  {
    slug: "fiche-process",
    category: "direction",
    problem: "Vous devez créer une fiche de process réutilisable pour votre équipe",
    result: "Fiche process claire et actionnable",
    deliverable: "Fiche process partageable",
    deliverable_type: "process",
    difficulty: "guidé",
    estimated_minutes: 10,
    steps: [
      "Nommez le process et son objectif",
      "Listez les étapes dans l'ordre",
      "Ajoutez ressources et outils nécessaires",
      "Formalisez les critères de succès",
    ],
  },
  {
    slug: "preparer-entretien",
    category: "rh",
    problem: "Vous recrutez et devez préparer un entretien structuré",
    result: "Guide d'entretien avec questions et grille d'évaluation",
    deliverable: "Guide d'entretien structuré",
    deliverable_type: "document",
    difficulty: "guidé",
    estimated_minutes: 12,
    steps: [
      "Décrivez le poste et les compétences clés",
      "Identifiez les 3 critères de sélection",
      "Générez 10 questions comportementales",
      "Créez la grille d'évaluation",
    ],
  },
  {
    slug: "script-appel",
    category: "vente",
    problem: "Vous préparez un appel commercial et voulez un script efficace",
    result: "Script d'appel avec objections préparées",
    deliverable: "Script d'appel complet",
    deliverable_type: "script",
    difficulty: "guidé",
    estimated_minutes: 10,
    steps: [
      "Décrivez le profil de votre interlocuteur",
      "Définissez l'objectif de l'appel",
      "Générez l'accroche + 3 questions clés",
      "Préparez les réponses aux 5 objections types",
    ],
  },
  {
    slug: "planifier-journee",
    category: "productivite",
    problem: "Votre journée est chargée et vous n'avez pas de plan clair",
    result: "Planning de journée priorisé avec blocs de temps",
    deliverable: "Planning journalier structuré",
    deliverable_type: "document",
    difficulty: "rapide",
    estimated_minutes: 4,
    steps: [
      "Listez toutes vos tâches du jour",
      "Identifiez la tâche la plus impactante",
      "Bloquez du temps en matinée pour le focus",
      "Organisez le reste par énergie et urgence",
    ],
  },
  {
    slug: "repondre-ticket-support",
    category: "support",
    problem: "Un utilisateur a un problème urgent et attend une réponse claire et rapide",
    result: "Réponse support professionnelle qui résout et rassure",
    deliverable: "Réponse ticket structurée",
    deliverable_type: "email",
    difficulty: "rapide",
    estimated_minutes: 5,
    steps: [
      "Décrivez le ticket et le problème signalé",
      "Identifiez la solution ou l'escalade nécessaire",
      "Générez une réponse empathique et claire",
      "Ajoutez les étapes de résolution",
    ],
  },
  {
    slug: "brief-equipe",
    category: "direction",
    problem: "Vous devez briefer votre équipe sur une initiative ou un projet",
    result: "Brief équipe clair avec contexte, objectifs et étapes",
    deliverable: "Brief d'équipe complet",
    deliverable_type: "brief",
    difficulty: "guidé",
    estimated_minutes: 10,
    steps: [
      "Décrivez le contexte et l'enjeu",
      "Définissez l'objectif mesurable",
      "Listez les rôles et responsabilités",
      "Précisez les jalons et critères de succès",
    ],
  },
  {
    slug: "analyse-concurrence",
    category: "analyse",
    problem: "Vous devez faire le point sur vos concurrents rapidement",
    result: "Grille d'analyse concurrentielle synthétique",
    deliverable: "Analyse concurrentielle",
    deliverable_type: "analysis",
    difficulty: "approfondi",
    estimated_minutes: 18,
    steps: [
      "Listez vos 3-5 concurrents principaux",
      "Identifiez les axes de comparaison",
      "Remplissez la grille guidée",
      "Générez la synthèse et vos avantages différenciants",
    ],
  },
];

/** Enrichit un module avec les métadonnées playbook si disponibles */
export function getPlaybookMeta(slug: string): PlaybookMeta | undefined {
  return DEMO_PLAYBOOKS.find((p) => p.slug === slug);
}

/** Retourne les playbooks filtrés par catégorie métier */
export function getPlaybooksByCategory(category: string): PlaybookMeta[] {
  if (!category) return DEMO_PLAYBOOKS;
  return DEMO_PLAYBOOKS.filter((p) => p.category === category);
}

export const DELIVERABLE_COLORS: Record<PlaybookMeta["deliverable_type"], { bg: string; text: string; label: string }> = {
  email:        { bg: "bg-blue-500/10 border-blue-500/20",    text: "text-blue-400",    label: "Email" },
  document:     { bg: "bg-violet-500/10 border-violet-500/20", text: "text-violet-400",  label: "Document" },
  script:       { bg: "bg-amber-500/10 border-amber-500/20",   text: "text-amber-400",   label: "Script" },
  analysis:     { bg: "bg-cyan-500/10 border-cyan-500/20",     text: "text-cyan-400",    label: "Analyse" },
  presentation: { bg: "bg-pink-500/10 border-pink-500/20",     text: "text-pink-400",    label: "Présentation" },
  process:      { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400", label: "Process" },
  brief:        { bg: "bg-teal-500/10 border-teal-500/20",     text: "text-teal-400",    label: "Brief" },
};
