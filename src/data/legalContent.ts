// ============================================================
// SOURCE DE VÉRITÉ LÉGALE — FORMETOIALIA
// Modifier les variables LEGAL_CONFIG pour mettre à jour
// tout le centre légal d'un seul coup.
// ============================================================

export const LEGAL_CONFIG = {
  COMPANY_NAME: "Formetoialia",
  PUBLISHER_NAME: "Vivien LE MOAL",
  BUSINESS_STATUS: "Entrepreneur individuel",
  SIRET: "835 125 089 00028",
  NAF: "7022Z — Conseil pour les affaires et autres conseils de gestion",
  BUSINESS_ADDRESS: "295 Rue Verte, 59170 Croix, France",
  CONTACT_EMAIL: "contact@formetoialia.com",
  CONTACT_PHONE: "+33 X XX XX XX XX",
  SECURITY_EMAIL: "security@formetoialia.com",
  RGPD_EMAIL: "rgpd@formetoialia.com",
  HOSTING_STATEMENT: "hébergé dans l'Union européenne (UE) via Supabase/Lovable Cloud",
  HOST_NAME: "Lovable / Supabase (hébergement EU)",
  HOST_ADDRESS: "Union européenne",
  HOST_PHONE: "support@lovable.dev",
  LAST_UPDATED_DATE: "18/03/2026",
  DOMAIN: "formetoialia.com",
};

export type LegalSection = {
  id: string;
  title: string;
  content: string;
};

export type LegalPage = {
  slug: string;
  title: string;
  metaDescription: string;
  updatedAt?: string;
  sections: LegalSection[];
};

const C = LEGAL_CONFIG;

export const legalPages: LegalPage[] = [
  // ─────────────────────────────────────────
  // MENTIONS LÉGALES
  // ─────────────────────────────────────────
  {
    slug: "mentions-legales",
    title: "Mentions légales",
    metaDescription: "Mentions légales de Formetoialia — éditeur, hébergement, propriété intellectuelle, signalement.",
    sections: [
      {
        id: "editeur",
        title: "Éditeur du site / Responsable de publication",
        content: `**${C.PUBLISHER_NAME}** (${C.BUSINESS_STATUS})

SIRET : ${C.SIRET}

Code NAF : ${C.NAF}

Adresse professionnelle : ${C.BUSINESS_ADDRESS}

Email : ${C.CONTACT_EMAIL}

Téléphone : ${C.CONTACT_PHONE}`,
      },
      {
        id: "hebergement",
        title: "Hébergement",
        content: `Le site est ${C.HOSTING_STATEMENT}.

Hébergeur : ${C.HOST_NAME || "**[À renseigner — confidentiel admin]**"}

Adresse : ${C.HOST_ADDRESS || "**[À renseigner]**"}

Téléphone : ${C.HOST_PHONE || "**[À renseigner]**"}

> *Conformément à la loi, le nom et les coordonnées de l'hébergeur doivent être renseignés. Modifiez LEGAL_CONFIG dans src/data/legalContent.ts.*`,
      },
      {
        id: "propriete-intellectuelle",
        title: "Propriété intellectuelle",
        content: `L'ensemble des contenus présents sur ${C.COMPANY_NAME} (textes, visuels, logos, marques, modules, quiz) est protégé par le droit de la propriété intellectuelle.

Toute reproduction, représentation, modification, publication ou adaptation de tout ou partie de ces éléments, quel que soit le moyen ou le procédé utilisé, est interdite sans l'autorisation écrite préalable de ${C.PUBLISHER_NAME}.`,
      },
      {
        id: "signalement",
        title: "Signalement",
        content: `Pour signaler un contenu illicite ou un problème de sécurité, contactez-nous :

Email sécurité : **${C.SECURITY_EMAIL}**

Nous traitons les signalements dans les meilleurs délais.`,
      },
    ],
  },

  // ─────────────────────────────────────────
  // POLITIQUE DE CONFIDENTIALITÉ
  // ─────────────────────────────────────────
  {
    slug: "confidentialite",
    title: "Politique de confidentialité",
    metaDescription: "Politique de confidentialité RGPD de Formetoialia — données traitées, finalités, droits des utilisateurs.",
    updatedAt: C.LAST_UPDATED_DATE,
    sections: [
      {
        id: "responsable",
        title: "1. Qui est responsable du traitement ?",
        content: `Le responsable du traitement est :

**${C.PUBLISHER_NAME}** (${C.BUSINESS_STATUS}) — SIRET ${C.SIRET}

Adresse : ${C.BUSINESS_ADDRESS}

Contact : ${C.CONTACT_EMAIL}`,
      },
      {
        id: "donnees",
        title: "2. Données que nous traitons",
        content: `Selon votre usage de ${C.COMPANY_NAME}, nous pouvons traiter :

- **Données de compte** : email, prénom/nom, identifiants, paramètres, organisation (si entreprise).
- **Données pédagogiques** : modules suivis, scores, progression, attestations.
- **Données techniques & sécurité** : logs, adresse IP (souvent tronquée/limitée), user-agent, événements de sécurité, mesures anti-fraude.
- **Données de paiement** : statut d'abonnement, identifiants de transaction (les données de carte sont traitées par notre prestataire de paiement, pas stockées par nous).
- **Données de support** : messages envoyés au support, historique de demandes.
- **Chat / IA (si activé)** : contenus que vous écrivez dans le chat et sorties générées.`,
      },
      {
        id: "finalites",
        title: "3. Finalités et bases légales",
        content: `Nous traitons vos données pour :

1. **Créer et gérer votre compte** (authentification, accès, abonnement) — *exécution du contrat*.
2. **Fournir l'apprentissage** (modules, quiz, progression, attestations) — *exécution du contrat*.
3. **Améliorer l'expérience** (personnalisation, recommandations pédagogiques) — *intérêt légitime*.
4. **Sécuriser la plateforme** (anti-fraude, détection d'abus, journalisation) — *intérêt légitime / obligation légale selon les cas*.
5. **Support & relation client** — *exécution du contrat / intérêt légitime*.
6. **Communication marketing** (newsletter, offres) — *consentement* (désinscription à tout moment).`,
      },
      {
        id: "destinataires",
        title: "4. Destinataires & sous-traitants",
        content: `Vos données peuvent être accessibles :

- Aux équipes habilitées de ${C.COMPANY_NAME}.
- À nos sous-traitants strictement nécessaires (hébergement en UE, base de données/auth, emails transactionnels, paiement, génération de documents, etc.).
- À des prestataires IA lorsque vous utilisez le chat IA (uniquement pour exécuter la fonctionnalité).

**Hébergement : ${C.HOSTING_STATEMENT}.** Nous choisissons des infrastructures localisées dans l'Union européenne pour l'hébergement et le stockage principal des données.

**Transferts hors UE** : si un prestataire implique un transfert hors UE/EEE, nous encadrons ce transfert par des garanties prévues par le RGPD (clauses contractuelles types ou équivalent). Consultez notre [liste des sous-traitants](/legal/subprocessors).`,
      },
      {
        id: "conservation",
        title: "5. Durées de conservation",
        content: `| Données | Durée de conservation |
|---|---|
| Données de compte | Durée du compte + 3 ans |
| Données pédagogiques | Durée du compte + 3 ans |
| Attestations | 10 ans (valeur légale) |
| Logs de sécurité | 6 à 12 mois |
| Données de facturation | 10 ans (obligation comptable) |
| Cookies de mesure d'audience | 6 mois maximum |`,
      },
      {
        id: "cookies",
        title: "6. Cookies & traceurs",
        content: `Voir la [Politique cookies](/legal/cookies). Nous ne déposons pas de cookies non essentiels sans votre consentement préalable.`,
      },
      {
        id: "droits",
        title: "7. Vos droits",
        content: `Conformément au RGPD, vous avez le droit :

- d'**accéder** à vos données, de les **rectifier**, de les **supprimer**
- de **limiter** ou de vous **opposer** à certains traitements
- de **retirer votre consentement** (si le traitement est basé sur votre consentement)
- de demander la **portabilité** de vos données (selon les cas)
- d'**introduire une réclamation** auprès de la CNIL

Pour exercer vos droits : **${C.RGPD_EMAIL}** — [Page dédiée](/legal/rgpd)

Délai de réponse : en général 1 mois (prolongeable dans les cas complexes).`,
      },
      {
        id: "securite",
        title: "8. Sécurité",
        content: `Nous mettons en œuvre des mesures de sécurité adaptées : contrôle d'accès par rôles, journalisation des accès, chiffrement en transit (TLS), limitation des abus, séparation des rôles, sauvegardes régulières, tests de vulnérabilité.`,
      },
      {
        id: "avertissement-chat",
        title: "9. Avertissement — données sensibles dans le chat",
        content: `Le chat IA est conçu pour apprendre et résoudre des problèmes. Évitez d'y saisir des données sensibles (données de santé, documents d'identité, secrets, mots de passe, etc.). Si vous le faites, vous prenez un risque inutile.`,
      },
      {
        id: "modification",
        title: "10. Modification de la politique",
        content: `Nous pouvons mettre à jour cette politique. La date en haut de page fait foi. En cas de modification substantielle, nous vous en informerons.`,
      },
    ],
  },

  // ─────────────────────────────────────────
  // POLITIQUE COOKIES
  // ─────────────────────────────────────────
  {
    slug: "cookies",
    title: "Politique cookies",
    metaDescription: "Politique cookies de Formetoialia — catégories, durée, gestion de vos préférences.",
    updatedAt: C.LAST_UPDATED_DATE,
    sections: [
      {
        id: "definition",
        title: "1. Définition",
        content: `Les cookies (ou traceurs) sont de petits fichiers déposés sur votre terminal (ordinateur, téléphone, tablette) lors de votre visite sur ${C.COMPANY_NAME}. Ils permettent de faire fonctionner le site, de mesurer l'audience, de personnaliser l'expérience, etc.`,
      },
      {
        id: "regle-or",
        title: "2. Règle d'or",
        content: `- **Cookies strictement nécessaires** → pas de consentement requis.
- **Cookies non essentiels** (mesure d'audience non exemptée, publicité, réseaux sociaux, etc.) → **consentement obligatoire**.

Le refus doit être aussi simple que l'acceptation (même niveau, même facilité).`,
      },
      {
        id: "choix",
        title: "3. Votre choix : accepter / refuser / personnaliser",
        content: `Lors de votre première visite (ou après 6 mois), un bandeau vous propose trois options au même niveau :

- **Tout accepter** — active tous les cookies optionnels
- **Tout refuser** — refuse tous les cookies optionnels (seuls les nécessaires restent actifs)
- **Personnaliser** — vous choisissez catégorie par catégorie

Vous pouvez modifier votre choix à tout moment via le lien **"Gérer mes cookies"** en bas de page.`,
      },
      {
        id: "duree",
        title: "4. Durée de conservation du choix",
        content: `Nous conservons votre choix (consentement ou refus) pendant **6 mois**, après quoi nous vous demandons à nouveau.`,
      },
      {
        id: "categories",
        title: "5. Catégories de cookies",
        content: `**A. Nécessaires (toujours actifs)**
- Authentification / session
- Sécurité / anti-abus
- Préférences essentielles

*Ces cookies sont indispensables au fonctionnement du site et ne peuvent pas être désactivés.*

---

**B. Préférences (optionnel)**
- Langue, affichage, accessibilité

---

**C. Mesure d'audience (optionnel)**
- Analyse de navigation (statistiques anonymisées si possible)
- Compréhension des parcours utilisateurs pour améliorer le produit

---

**D. Marketing (optionnel)**
- Publicité ciblée, reciblage (si activé à l'avenir)`,
      },
      {
        id: "liste",
        title: "6. Liste des cookies",
        content: `| Nom | Finalité | Type | Durée |
|---|---|---|---|
| formetoialia_cookie_consent | Stockage de votre choix de consentement | Nécessaire | 6 mois |
| sb-* (session auth) | Authentification et session sécurisée | Nécessaire | Session |
| À compléter | … | … | … |`,
      },
      {
        id: "gestion",
        title: "7. Gestion",
        content: `À tout moment, vous pouvez modifier votre choix via le lien **"Gérer mes cookies"** en bas de chaque page.

Vous pouvez également gérer les cookies directement dans les paramètres de votre navigateur, mais cela peut altérer le fonctionnement du site.`,
      },
    ],
  },

  // ─────────────────────────────────────────
  // EXERCER MES DROITS RGPD
  // ─────────────────────────────────────────
  {
    slug: "rgpd",
    title: "Exercer mes droits RGPD",
    metaDescription: "Comment exercer vos droits RGPD avec Formetoialia : accès, rectification, suppression, portabilité, opposition.",
    sections: [
      {
        id: "intro",
        title: "Vos droits en un coup d'œil",
        content: `Le RGPD (Règlement Général sur la Protection des Données) vous confère des droits sur vos données personnelles. Voici comment les exercer auprès de ${C.COMPANY_NAME}.`,
      },
      {
        id: "droits",
        title: "Les droits disponibles",
        content: `| Droit | Description |
|---|---|
| **Accès** | Obtenir une copie de toutes les données que nous détenons sur vous |
| **Rectification** | Corriger des données inexactes ou incomplètes |
| **Suppression** | Demander l'effacement de vos données ("droit à l'oubli") |
| **Limitation** | Suspendre temporairement le traitement de vos données |
| **Opposition** | S'opposer à un traitement basé sur l'intérêt légitime |
| **Portabilité** | Recevoir vos données dans un format structuré et lisible par machine |
| **Retrait du consentement** | Retirer votre consentement à tout moment |`,
      },
      {
        id: "comment",
        title: "Comment faire une demande ?",
        content: `Envoyez votre demande à : **${C.RGPD_EMAIL}**

Merci d'indiquer :

1. **Email du compte** ${C.COMPANY_NAME} concerné
2. **Type de demande** (accès / rectification / suppression / etc.)
3. **Précisions utiles** (périmètre, dates, données concernées)
4. **Justificatif d'identité** uniquement si nécessaire (en masquant les informations non pertinentes)

Nous répondons dans un délai d'**1 mois** (prolongeable en cas de complexité).`,
      },
      {
        id: "cnil",
        title: "Réclamation auprès de la CNIL",
        content: `Si vous estimez que vos droits ne sont pas respectés, vous pouvez déposer une réclamation auprès de la **CNIL** :

- **Site web** : [cnil.fr](https://www.cnil.fr)
- **Adresse** : CNIL, 3 Place de Fontenoy – TSA 80715 – 75334 PARIS CEDEX 07`,
      },
    ],
  },

  // ─────────────────────────────────────────
  // CGU (PLACEHOLDER)
  // ─────────────────────────────────────────
  {
    slug: "cgu",
    title: "Conditions Générales d'Utilisation",
    metaDescription: "Conditions Générales d'Utilisation de Formetoialia.",
    updatedAt: C.LAST_UPDATED_DATE,
    sections: [
      {
        id: "objet",
        title: "1. Objet",
        content: `Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de la plateforme **${C.COMPANY_NAME}**, accessible à l'adresse ${C.DOMAIN}, exploitée par ${C.PUBLISHER_NAME} (${C.BUSINESS_STATUS}), SIRET ${C.SIRET}.`,
      },
      {
        id: "acces",
        title: "2. Accès au service",
        content: `L'accès à ${C.COMPANY_NAME} est réservé aux personnes physiques majeures ou aux entreprises dûment représentées. En créant un compte, vous acceptez les présentes CGU ainsi que notre [Politique de confidentialité](/legal/confidentialite).`,
      },
      {
        id: "compte",
        title: "3. Compte utilisateur",
        content: `Vous êtes responsable de la confidentialité de vos identifiants. Toute utilisation de votre compte est sous votre responsabilité. Signalez immédiatement toute utilisation non autorisée à ${C.CONTACT_EMAIL}.`,
      },
      {
        id: "utilisation",
        title: "4. Utilisation acceptable",
        content: `Il est interdit d'utiliser ${C.COMPANY_NAME} pour :
- Diffuser des contenus illicites, offensants ou portant atteinte à des tiers
- Tenter d'accéder de manière non autorisée aux systèmes
- Automatiser des requêtes de manière abusive
- Contourner les limitations techniques ou tarifaires`,
      },
      {
        id: "abonnement",
        title: "5. Abonnement & paiement",
        content: `Les tarifs sont indiqués sur la [page Tarifs](/pricing). L'abonnement est renouvelé automatiquement sauf résiliation. Vous pouvez résilier à tout moment depuis vos paramètres — la résiliation prend effet à la fin de la période en cours.`,
      },
      {
        id: "responsabilite",
        title: "6. Limitation de responsabilité",
        content: `${C.COMPANY_NAME} est fourni "en l'état". Nous faisons notre meilleur effort pour assurer la disponibilité du service mais ne garantissons pas une disponibilité sans interruption. Les contenus générés par l'IA sont fournis à titre indicatif et ne remplacent pas un conseil professionnel.`,
      },
      {
        id: "droit-applicable",
        title: "7. Droit applicable",
        content: `Les présentes CGU sont soumises au droit français. En cas de litige, et à défaut de résolution amiable, les tribunaux compétents seront ceux du ressort de l'adresse professionnelle de ${C.PUBLISHER_NAME}.`,
      },
    ],
  },

  // ─────────────────────────────────────────
  // DPA
  // ─────────────────────────────────────────
  {
    slug: "dpa",
    title: "Accord de sous-traitance (DPA)",
    metaDescription: "Data Processing Agreement — Accord de sous-traitance RGPD Art. 28 entre Formetoialia et ses clients B2B.",
    updatedAt: C.LAST_UPDATED_DATE,
    sections: [
      {
        id: "intro",
        title: "Présentation",
        content: `Le présent Accord de Sous-traitance (DPA) est proposé aux clients professionnels (entreprises) qui inscrivent leurs collaborateurs sur ${C.COMPANY_NAME}. Il encadre les traitements de données personnelles conformément à l'**article 28 du RGPD**.

Dans cette relation :
- **Client** = Responsable de traitement
- **${C.COMPANY_NAME} / ${C.PUBLISHER_NAME}** = Sous-traitant`,
      },
      {
        id: "parties",
        title: "1. Parties",
        content: `**Client (Responsable de traitement)** : société cliente, représentée par son responsable légal, ayant accepté les présentes conditions.

**Sous-traitant** : ${C.PUBLISHER_NAME} (${C.BUSINESS_STATUS}), SIRET ${C.SIRET}, ${C.BUSINESS_ADDRESS}.`,
      },
      {
        id: "objet",
        title: "2. Objet",
        content: `Le présent accord encadre les traitements de données personnelles réalisés par le Sous-traitant pour fournir la plateforme ${C.COMPANY_NAME} : gestion des comptes, formation, quiz, attestations, tableaux de bord manager, support.`,
      },
      {
        id: "duree",
        title: "3. Durée",
        content: `Pendant la durée du contrat principal + périodes de conservation légales définies dans la Politique de confidentialité.`,
      },
      {
        id: "nature",
        title: "4. Nature des opérations",
        content: `Collecte, enregistrement, organisation, conservation, consultation, génération de documents (attestations), suppression des données personnelles des utilisateurs du Client.`,
      },
      {
        id: "categories-donnees",
        title: "5. Catégories de données",
        content: `Identité professionnelle, email, rôle, organisation, progression pédagogique, scores, logs de sécurité.`,
      },
      {
        id: "personnes",
        title: "6. Catégories de personnes concernées",
        content: `Salariés, prestataires et utilisateurs autorisés du Client.`,
      },
      {
        id: "obligations",
        title: "7. Obligations du Sous-traitant",
        content: `${C.COMPANY_NAME} s'engage à :

- Traiter uniquement sur instruction documentée du Client
- Garantir la confidentialité (personnel habilité uniquement)
- Mettre en place des mesures de sécurité adaptées (voir Annexe sécurité)
- Aider le Client à répondre aux demandes d'exercice de droits RGPD
- Notifier toute violation de données sans délai indu (et fournir les informations utiles)
- Supprimer ou restituer les données à la fin du contrat (selon instruction du Client)
- Tenir à jour la liste des sous-traitants ultérieurs`,
      },
      {
        id: "sous-traitants",
        title: "8. Sous-traitants ultérieurs",
        content: `Le Client autorise le recours à des sous-traitants strictement nécessaires (hébergement UE, paiement, emailing transactionnel, etc.). La liste à jour est accessible sur la page [Sous-traitants](/legal/subprocessors).

Délai d'opposition : 7 jours calendaires après notification d'un nouveau sous-traitant.`,
      },
      {
        id: "violations",
        title: "9. Violations de données",
        content: `En cas de violation de données, ${C.COMPANY_NAME} notifie le Client dès constat, avec : nature de la violation, volume de données concernées, impacts potentiels, mesures prises et actions recommandées.`,
      },
      {
        id: "audits",
        title: "10. Audits",
        content: `Le Client peut auditer (ou faire auditer) les mesures de sécurité, dans la limite d'1 audit par an, avec préavis raisonnable et sous obligation de confidentialité.`,
      },
      {
        id: "securite-annexe",
        title: "11. Mesures de sécurité (Annexe)",
        content: `- Chiffrement en transit (TLS 1.2+)
- Contrôles d'accès et séparation des rôles (RBAC)
- Journalisation sécurité et monitoring
- Sauvegardes régulières et procédure de reprise
- Tests de vulnérabilité
- Durées de conservation et procédure de purge
- Hébergement dans l'Union européenne`,
      },
      {
        id: "contact-dpa",
        title: "Contact DPA",
        content: `Pour toute question relative à cet accord : **${C.RGPD_EMAIL}**

Pour accéder à la liste complète des sous-traitants : [/legal/subprocessors](/legal/subprocessors)`,
      },
    ],
  },
];

export const getLegalPage = (slug: string): LegalPage | undefined =>
  legalPages.find((p) => p.slug === slug);
