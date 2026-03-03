import { Helmet } from "react-helmet-async";
import { Link, useLocation } from "react-router-dom";
import { Shield, Lock, Globe, ArrowLeft } from "lucide-react";
import logoGenie from "@/assets/logo-genie.png";

type LegalPage = "cgu" | "confidentialite" | "mentions-legales" | "rgpd" | "security";

const PAGES: Record<LegalPage, { title: string; metaTitle: string; metaDesc: string; content: () => JSX.Element }> = {
  cgu: {
    title: "Conditions Générales d'Utilisation",
    metaTitle: "CGU – Conditions Générales d'Utilisation | GENIE IA",
    metaDesc: "Conditions générales d'utilisation de la plateforme GENIE IA. Abonnement, droits, obligations et résiliation.",
    content: () => (
      <div className="prose prose-invert max-w-none space-y-6 text-sm text-muted-foreground leading-relaxed">
        <p className="text-xs text-muted-foreground/60">Dernière mise à jour : 1er mars 2026</p>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">1. Objet</h2>
          <p>Les présentes CGU régissent l'accès et l'utilisation de la plateforme GENIE IA, service d'apprentissage en ligne en intelligence artificielle, cybersécurité et développement assisté par IA, édité par GENIE IA SAS.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">2. Accès au service</h2>
          <p>L'accès au service nécessite la création d'un compte avec une adresse email valide. Un essai gratuit de 24 heures est proposé à tout nouvel abonné. L'abonnement mensuel est de 59€ TTC/mois, sans engagement, résiliable à tout moment depuis l'espace utilisateur.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">3. Utilisation acceptable</h2>
          <p>Il est interdit d'utiliser le service à des fins illicites, de tenter de contourner les mécanismes de sécurité, d'exploiter automatiquement le contenu ou de partager ses identifiants. GENIE IA se réserve le droit de suspendre tout compte en cas d'abus détecté.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">4. Propriété intellectuelle</h2>
          <p>Le contenu de la plateforme (modules, quiz, attestations, interfaces) est protégé par le droit d'auteur. Toute reproduction, distribution ou revente sans autorisation écrite est interdite.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">5. Attestations de formation</h2>
          <p>Les attestations PDF délivrées par GENIE IA sont vérifiables en ligne via leur identifiant unique. Elles ne constituent pas une certification officielle reconnue par l'État sauf mention contraire.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">6. Résiliation</h2>
          <p>L'utilisateur peut résilier son abonnement à tout moment depuis Paramètres → Abonnement. L'accès reste actif jusqu'à la fin de la période facturée. Aucun remboursement prorata n'est effectué sauf obligation légale.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">7. Responsabilité</h2>
          <p>GENIE IA fournit le service "en l'état". Notre responsabilité est limitée au montant des sommes versées au cours des 3 derniers mois. Nous ne sommes pas responsables des dommages indirects.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">8. Droit applicable</h2>
          <p>Les présentes CGU sont soumises au droit français. Tout litige relève de la compétence des tribunaux de Paris.</p>
        </section>
      </div>
    ),
  },

  confidentialite: {
    title: "Politique de Confidentialité",
    metaTitle: "Politique de confidentialité & RGPD | GENIE IA",
    metaDesc: "Comment GENIE IA collecte, utilise et protège vos données personnelles. Conformité RGPD, droits des utilisateurs.",
    content: () => (
      <div className="prose prose-invert max-w-none space-y-6 text-sm text-muted-foreground leading-relaxed">
        <p className="text-xs text-muted-foreground/60">Dernière mise à jour : 1er mars 2026</p>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">1. Responsable du traitement</h2>
          <p>GENIE IA SAS — contact : privacy@genie-ia.fr</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">2. Données collectées</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Données d'identité : nom, prénom, email</li>
            <li>Données d'usage : modules suivis, scores, temps d'apprentissage</li>
            <li>Données de facturation : gérées exclusivement par Stripe (PCI-DSS)</li>
            <li>Données techniques : logs d'accès, tokens d'IA consommés, adresse IP hashée</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">3. Finalités du traitement</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Fourniture du service d'apprentissage</li>
            <li>Émission des attestations de formation</li>
            <li>Facturation et gestion de l'abonnement</li>
            <li>Sécurité et détection d'abus</li>
            <li>Amélioration du service (données agrégées, anonymisées)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">4. Bases légales</h2>
          <p>Exécution du contrat (services), intérêt légitime (sécurité), obligation légale (facturation), consentement (cookies non-essentiels).</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">5. Hébergement & sous-traitants</h2>
          <p>Données hébergées en Europe (Supabase EU, Hetzner). Sous-traitants : Stripe (paiements), OpenRouter (IA, données non-persistées), Resend (emails transactionnels).</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">6. Durée de conservation</h2>
          <p>Données actives : durée de l'abonnement + 90 jours. Logs de sécurité : 1 an. Données de facturation : 10 ans (obligation légale).</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">7. Vos droits</h2>
          <p>Accès, rectification, effacement, portabilité, opposition, limitation. Exercez vos droits à privacy@genie-ia.fr. Réponse sous 30 jours. Réclamation possible auprès de la CNIL.</p>
        </section>
      </div>
    ),
  },

  "mentions-legales": {
    title: "Mentions Légales",
    metaTitle: "Mentions légales | GENIE IA",
    metaDesc: "Mentions légales de GENIE IA — éditeur, hébergeur, directeur de publication.",
    content: () => (
      <div className="prose prose-invert max-w-none space-y-6 text-sm text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-base font-bold text-foreground mb-2">Éditeur du site</h2>
          <p>GENIE IA SAS<br />Siège social : France<br />Email : contact@genie-ia.fr<br />Directeur de la publication : Équipe GENIE IA</p>
        </section>
        <section>
          <h2 className="text-base font-bold text-foreground mb-2">Hébergement</h2>
          <p>Le site est hébergé via Lovable (Cloudflare Pages) et Supabase (infrastructure cloud UE). Données stockées dans des datacenters conformes au RGPD situés en Europe.</p>
        </section>
        <section>
          <h2 className="text-base font-bold text-foreground mb-2">Propriété intellectuelle</h2>
          <p>L'ensemble du contenu (textes, modules, interfaces, marque GENIE IA) est protégé par le droit d'auteur. Toute reproduction sans autorisation est interdite.</p>
        </section>
        <section>
          <h2 className="text-base font-bold text-foreground mb-2">Cookies</h2>
          <p>Ce site utilise uniquement des cookies fonctionnels strictement nécessaires (session, authentification). Aucun cookie publicitaire ou de tracking tiers n'est utilisé.</p>
        </section>
      </div>
    ),
  },

  rgpd: {
    title: "RGPD & Données Personnelles",
    metaTitle: "RGPD – Vos données personnelles | GENIE IA",
    metaDesc: "GENIE IA et le RGPD : traitement des données, droits des utilisateurs, DPO, sécurité.",
    content: () => (
      <div className="prose prose-invert max-w-none space-y-6 text-sm text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-base font-bold text-foreground mb-2">Engagement RGPD</h2>
          <p>GENIE IA est conçu RGPD-natif. Nous appliquons le principe de minimisation : nous ne collectons que ce qui est strictement nécessaire au service.</p>
        </section>
        <section>
          <h2 className="text-base font-bold text-foreground mb-2">Mesures techniques</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Chiffrement des données en transit (TLS 1.3) et au repos (AES-256)</li>
            <li>Adresses IP stockées uniquement sous forme hashée</li>
            <li>Row-Level Security sur toutes les tables (accès strict par utilisateur)</li>
            <li>Logs d'audit inviolables pour toute action sensible</li>
            <li>Pas de revente de données. Jamais.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-base font-bold text-foreground mb-2">Exercer vos droits</h2>
          <p>Email : privacy@genie-ia.fr — Réponse sous 30 jours ouvrés. Vous pouvez demander l'export ou la suppression de vos données depuis Paramètres → Mon compte.</p>
        </section>
        <section>
          <h2 className="text-base font-bold text-foreground mb-2">Contact DPO</h2>
          <p>dpo@genie-ia.fr</p>
        </section>
      </div>
    ),
  },

  security: {
    title: "Politique de Sécurité",
    metaTitle: "Politique de sécurité & divulgation responsable | GENIE IA",
    metaDesc: "Engagement sécurité de GENIE IA : mesures techniques, bug bounty, contact divulgation responsable.",
    content: () => (
      <div className="prose prose-invert max-w-none space-y-6 text-sm text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-base font-bold text-foreground mb-2">Notre engagement sécurité</h2>
          <p>La sécurité de nos utilisateurs est non-négociable. GENIE IA applique les meilleures pratiques de sécurité applicative dès la conception.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">Mesures en place</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong className="text-foreground">Headers HTTP stricts</strong> — CSP, HSTS, X-Frame-Options: DENY, Referrer-Policy</li>
            <li><strong className="text-foreground">Authentification</strong> — JWT, sessions courtes, 2FA recommandé</li>
            <li><strong className="text-foreground">Row-Level Security</strong> — chaque ligne de base de données est protégée par des policies strictes</li>
            <li><strong className="text-foreground">Rate limiting</strong> — 60 req/min par utilisateur, protection IP par endpoint</li>
            <li><strong className="text-foreground">Anti-abus IA</strong> — scoring comportemental, blocage automatique, kill switch admin</li>
            <li><strong className="text-foreground">Sanitisation</strong> — DOMPurify sur tous les contenus riches, Zod sur tous les formulaires</li>
            <li><strong className="text-foreground">Audit logs</strong> — traçabilité inviolable de toutes les actions sensibles (SECURITY DEFINER)</li>
            <li><strong className="text-foreground">Chiffrement</strong> — TLS 1.3 en transit, AES-256 au repos, IPs hashées</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">Divulgation responsable</h2>
          <p>Vous avez découvert une vulnérabilité ? Merci de nous la signaler de manière responsable avant toute divulgation publique.</p>
          <p className="mt-2"><strong className="text-foreground">Email :</strong> security@genie-ia.fr<br />
          <strong className="text-foreground">Délai de réponse :</strong> 48h ouvrées<br />
          <strong className="text-foreground">Délai de correction :</strong> 90 jours maximum</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">Périmètre du bug bounty</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Injection (SQL, XSS, CSRF)</li>
            <li>Contournement d'authentification ou d'autorisation</li>
            <li>Accès à des données d'autres utilisateurs</li>
            <li>Exploitation des fonctions Edge côté serveur</li>
          </ul>
          <p className="mt-2">Hors périmètre : attaques DoS, ingénierie sociale, tests sur des comptes tiers sans consentement.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-foreground mb-2">Incidents</h2>
          <p>En cas d'incident de sécurité affectant des données personnelles, nous notifions la CNIL dans les 72h et les utilisateurs concernés dans les meilleurs délais.</p>
        </section>
      </div>
    ),
  },
};

export default function Legal() {
  const location = useLocation();
  const pageKey = (location.pathname.replace("/", "") || "cgu") as LegalPage;
  const content = PAGES[pageKey] ?? PAGES.cgu;

  return (
    <>
      <Helmet>
        <title>{content.metaTitle}</title>
        <meta name="description" content={content.metaDesc} />
        <link rel="canonical" href={`https://genie-ai-mastery.lovable.app/${pageKey}`} />
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <div className="min-h-screen gradient-hero">
        {/* Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-8 py-4 border-b border-border/30 bg-background/80 backdrop-blur-md">
          <Link to="/">
            <img src={logoGenie} alt="GENIE IA" className="h-10 w-auto" loading="lazy" />
          </Link>
          <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Link>
        </header>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
          {/* Icon */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow-sm">
              {pageKey === "security" ? (
                <Shield className="w-5 h-5 text-primary-foreground" />
              ) : pageKey === "confidentialite" || pageKey === "rgpd" ? (
                <Lock className="w-5 h-5 text-primary-foreground" />
              ) : (
                <Globe className="w-5 h-5 text-primary-foreground" />
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">{content.title}</h1>
          </div>

          <div className="glass rounded-2xl p-6 sm:p-8">
            <content.content />
          </div>

          {/* Footer links */}
          <div className="mt-8 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {[
              { href: "/cgu", label: "CGU" },
              { href: "/confidentialite", label: "Confidentialité" },
              { href: "/mentions-legales", label: "Mentions légales" },
              { href: "/rgpd", label: "RGPD" },
              { href: "/security", label: "Sécurité" },
            ].map((l) => (
              <Link key={l.href} to={l.href} className={`hover:text-foreground transition-colors ${pageKey === l.href.slice(1) ? "text-primary font-semibold" : ""}`}>
                {l.label}
              </Link>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
