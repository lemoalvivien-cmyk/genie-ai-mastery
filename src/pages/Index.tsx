/**
 * Formetoialia — Landing Page v10 — Conversion First
 * Route: / — Funnel public clair, zéro jargon, zéro faux claims
 */

import React, { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Shield, Sparkles, Users, Zap,
  FileCheck, BarChart3, ChevronDown, CheckCircle,
  Target, BookOpen, MessageSquare, FlaskConical,
  TrendingUp, Clock, Star,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import logoFormetoialia from "@/assets/logo-formetoialia.png";
import { ProFooter } from "@/components/ProFooter";
import {
  softwareApplicationSchema, productSchema,
  organizationSchema, faqSchema,
} from "@/lib/seo";

/* ─── Fade-in wrapper ─── */
function FadeIn({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Section wrapper ─── */
function Section({ children, className = "", id = "", style }: {
  children: React.ReactNode; className?: string; id?: string; style?: React.CSSProperties;
}) {
  return (
    <section id={id} className={`py-20 px-4 sm:px-6 ${className}`} style={style}>
      {children}
    </section>
  );
}

/* ─── CTA Button ─── */
function CTAButton({
  children, onClick, href, variant = "primary", className = "", size = "default",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "outline";
  className?: string;
  size?: "default" | "lg";
}) {
  const base = `inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`;
  const sizeClass = size === "lg" ? "px-8 py-4 text-base" : "px-6 py-3 text-sm";
  const variantClass = variant === "primary"
    ? "bg-accent text-accent-foreground shadow-[0_0_20px_hsl(var(--accent)/0.35)] hover:opacity-90"
    : "border border-primary text-primary hover:bg-primary/10";
  const cls = `${base} ${sizeClass} ${variantClass} ${className}`;

  if (href) return <Link to={href} className={cls}>{children}</Link>;
  return <button onClick={onClick} className={cls}>{children}</button>;
}

/* ─── Données ─── */
const HOW_IT_WORKS = [
  {
    step: "01",
    icon: Target,
    title: "Diagnostic en 3 minutes",
    desc: "À l'inscription, un quiz adaptatif évalue votre niveau réel en IA et cybersécurité. Votre parcours se construit automatiquement.",
  },
  {
    step: "02",
    icon: MessageSquare,
    title: "Une action concrète par jour",
    desc: "Chaque jour, votre copilote IA vous propose une mission ciblée : prompt à rédiger, phishing à détecter, concept à valider. 10 à 15 minutes.",
  },
  {
    step: "03",
    icon: FileCheck,
    title: "Feedback immédiat et preuve",
    desc: "Après chaque action, l'IA corrige, explique, mesure votre progression. Les modules complétés génèrent une attestation PDF vérifiable.",
  },
];

const USE_CASES = [
  {
    icon: "🏢",
    who: "Dirigeants & RH",
    problem: "Comment prouver que vos équipes sont formées à l'IA sans y passer des mois ?",
    answer: "Dashboard de suivi temps réel, attestations vérifiables, rapport de conformité exportable. Jusqu'à 25 membres sur un seul abonnement.",
  },
  {
    icon: "💼",
    who: "Commerciaux & Marketing",
    problem: "Comment utiliser l'IA pour vraiment gagner du temps au quotidien ?",
    answer: "Des missions quotidiennes calées sur votre métier : prompts de prospection, analyse de leads, rédaction IA. Pratique, pas théorique.",
  },
  {
    icon: "🔒",
    who: "Fonctions support & IT",
    problem: "Comment sensibiliser l'équipe au phishing sans formation chiante ?",
    answer: "Labs de simulation phishing interactifs, quiz cyber, scénarios pratiques. La formation qui s'adapte à ceux qui n'ont pas le temps.",
  },
];

const WHAT_YOU_GET = [
  { icon: MessageSquare, title: "Copilote IA (KITT)", desc: "500 messages/jour pour poser vos questions, débloquer un concept, préparer une action. Adapté à votre niveau." },
  { icon: BookOpen, title: "Modules structurés", desc: "IA Pro, IA Perso, Cybersécurité — parcours séquencés avec quiz, missions et jalons mesurables." },
  { icon: FlaskConical, title: "Labs interactifs", desc: "Phishing Lab, Prompt Lab, Cyber Lab. Des environnements de mise en pratique, pas des vidéos." },
  { icon: FileCheck, title: "Attestations vérifiables", desc: "PDF signé + QR code public. Preuve documentée de progression, utile en conformité interne." },
  { icon: BarChart3, title: "Dashboard manager", desc: "Suivi de progression individuel et collectif, identification des lacunes, rapports par équipe." },
  { icon: Target, title: "Mission du jour", desc: "Chaque matin, une action concrète adaptée à votre niveau et votre domaine. 10-15 min." },
];

const COMPARE_ROWS = [
  { feature: "Disponibilité", classic: "Horaires de bureau", fti: "24h/24, 7j/7" },
  { feature: "Coût / organisation", classic: "Devis sur demande", fti: "59€ TTC/mois tout compris" },
  { feature: "Simulation phishing", classic: "Rare, souvent théorique", fti: "Labs interactifs intégrés" },
  { feature: "Attestation vérifiable", classic: "Variable selon prestataire", fti: "PDF signé + QR code natif" },
  { feature: "Suivi manager en temps réel", classic: "Non disponible", fti: "Dashboard inclus" },
  { feature: "Adaptation au niveau de chaque membre", classic: "Non disponible", fti: "Parcours adaptatif intégré" },
  { feature: "RGPD · données hébergées UE", classic: "À vérifier", fti: "Inclus par défaut" },
];

const FAQ_DATA = [
  {
    q: "C'est pour qui exactement ?",
    a: "Pour les PME et équipes (commerciaux, RH, marketing, fonctions support) qui veulent faire adopter l'IA dans le vrai travail quotidien, sans dépendre d'un formateur externe. Zéro compétence technique requise.",
  },
  {
    q: "Comment fonctionne le copilote IA ?",
    a: "KITT est votre assistant IA intégré. Il guide vos sessions, répond à vos questions sur vos modules en cours, suggère des missions et s'adapte à votre niveau. Disponible en mode texte.",
  },
  {
    q: "Les attestations sont-elles reconnues légalement ?",
    a: "Les attestations Formetoialia sont des preuves internes de compétences, vérifiables via QR code. Elles ne sont pas équivalentes à des certifications d'organismes externes. Leur valeur est celle d'une preuve documentée de formation, utile en conformité interne ou contexte professionnel.",
  },
  {
    q: "Le plan couvre combien de personnes ?",
    a: "Un abonnement Pro couvre une organisation jusqu'à 25 membres. Au-delà, contactez-nous pour un devis entreprise.",
  },
  {
    q: "Y a-t-il un essai gratuit ?",
    a: "Oui. Inscription gratuite sans carte bancaire. Plan Découverte disponible en permanence. Le plan Pro inclut 14 jours d'essai.",
  },
  {
    q: "Puis-je annuler librement ?",
    a: "Oui, depuis votre espace en 2 clics, effective à la fin de la période en cours. Garantie satisfait ou remboursé 30 jours, sans condition.",
  },
];

/* ─── FAQ Accordion ─── */
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-xl overflow-hidden border border-border"
      style={{ background: "hsl(var(--card))" }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-foreground leading-snug">{q}</span>
        <ChevronDown
          className="w-4 h-4 shrink-0 text-muted-foreground mt-0.5 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-200"
        style={{ maxHeight: open ? "400px" : "0px" }}
      >
        <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

/* ─── Main ─── */
export default function Index() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Track landing view once on mount (anonymous — no user required)
  useEffect(() => {
    supabase.from("analytics_events").insert({
      actor_user_id: null,
      org_id: null,
      event_name: "landing_viewed",
      properties: { ts: new Date().toISOString(), url: window.location.pathname },
    }).then(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCTA = useCallback(() => {
    if (isAuthenticated) navigate("/app/dashboard");
    else navigate("/register");
  }, [isAuthenticated, navigate]);

  return (
    <>
      <Helmet>
        <title>Formetoialia — Entraînez vos équipes à l'IA dans leur vrai travail</title>
        <meta name="description" content="Formetoialia entraîne vos équipes à utiliser l'IA dans leur vrai travail, chaque jour, avec correction immédiate et progression mesurable. 59€ TTC/mois pour 25 membres." />
        <meta property="og:title" content="Formetoialia — Formation IA pour équipes et PME" />
        <meta property="og:description" content="Copilote IA, modules structurés, labs pratiques, attestations vérifiables, dashboard manager. 59€ TTC/mois." />
        <meta property="og:image" content="https://formetoialia.com/logo-formetoialia.png" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://formetoialia.com/" />
        <script type="application/ld+json">{JSON.stringify(organizationSchema())}</script>
        <script type="application/ld+json">{JSON.stringify(softwareApplicationSchema())}</script>
        <script type="application/ld+json">{JSON.stringify(productSchema())}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema())}</script>
      </Helmet>

      <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

        {/* ── NAVBAR ── */}
        <header className="sticky top-0 z-50 border-b border-border/50 px-4 sm:px-8 h-14 flex items-center justify-between"
          style={{ background: "hsl(var(--background) / 0.95)", backdropFilter: "blur(16px)" }}>
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5">
              <img src={logoFormetoialia} alt="Formetoialia" className="h-7 w-auto" />
              <span className="font-black text-sm tracking-tight">
                <span className="text-primary">formetoi</span><span className="text-accent">alia</span>
              </span>
            </Link>
            <nav className="hidden sm:flex items-center gap-5">
              {[
                { label: "Comment ça marche", href: "#how" },
                { label: "Tarifs", href: "/pricing" },
                { label: "Démo", href: "/demo" },
                { label: "Guides", href: "/guides" },
              ].map((item) => (
                <a key={item.label} href={item.href}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >{item.label}</a>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link to="/app/dashboard" className="text-xs font-semibold text-primary">Mon espace →</Link>
            ) : (
              <>
                <Link to="/login" className="hidden sm:block text-xs text-muted-foreground hover:text-foreground transition-colors">Connexion</Link>
                <CTAButton onClick={handleCTA} size="default">
                  <Sparkles className="w-3.5 h-3.5" />
                  Commencer
                </CTAButton>
              </>
            )}
          </div>
        </header>

        {/* ══════════════════════════════════════════
            SECTION 1 — HERO
        ══════════════════════════════════════════ */}
        <section className="relative flex flex-col items-center justify-center min-h-[92vh] px-4 sm:px-6 pt-12 pb-16 text-center overflow-hidden">
          {/* Background subtil */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 70% 50% at 50% 20%, hsl(var(--primary)/0.08) 0%, transparent 70%)" }} />
          <div className="absolute inset-0 pointer-events-none opacity-[0.02]"
            style={{ backgroundImage: "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

          <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
            {/* Trust badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 border border-primary/20"
              style={{ background: "hsl(var(--primary)/0.08)" }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-primary">RGPD · Données hébergées en UE · Essai gratuit 14 jours</span>
            </motion.div>

            {/* H1 */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="text-[clamp(2rem,5.5vw,4rem)] font-black leading-[1.1] tracking-tight mb-6"
            >
              <span className="block text-foreground">Vos équipes utilisent l'IA</span>
              <span className="block text-foreground">dans leur vrai travail,</span>
              <span className="block" style={{ color: "hsl(var(--primary))" }}>chaque jour.</span>
            </motion.h1>

            {/* Sous-headline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="text-base sm:text-lg text-muted-foreground max-w-2xl mb-10 leading-relaxed"
            >
              Formetoialia entraîne vos collaborateurs à l'IA et à la cybersécurité avec une mission concrète par jour, une correction immédiate et une progression mesurable.
              <span className="block mt-2 text-foreground/70 text-sm">Pour PME, équipes commerciales, RH, marketing et fonctions support.</span>
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.5 }}
              className="flex flex-col sm:flex-row gap-3 mb-6"
            >
              <CTAButton onClick={handleCTA} size="lg">
                <Sparkles className="w-5 h-5" />
                Commencer gratuitement
                <ArrowRight className="w-4 h-4" />
              </CTAButton>
              <CTAButton href="/demo" variant="outline" size="lg">
                Voir la démo produit
              </CTAButton>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-xs text-muted-foreground/60"
            >
              Sans carte bancaire · 14 jours d'essai inclus · 59€ TTC/mois pour toute l'équipe
            </motion.p>

            {/* Stats honnêtes */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.95, duration: 0.5 }}
              className="flex flex-wrap justify-center gap-8 mt-14"
            >
              {[
                { value: "25", label: "membres par abonnement" },
                { value: "59€", label: "TTC/mois" },
                { value: "< 5 min", label: "première victoire" },
                { value: "24/7", label: "disponible" },
              ].map((s) => (
                <div key={s.label} className="flex flex-col items-center gap-1">
                  <span className="text-2xl font-black text-primary">{s.value}</span>
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Scroll hint */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          >
            <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 2, repeat: Infinity }}>
              <ChevronDown className="w-4 h-4 text-muted-foreground/30" />
            </motion.div>
          </motion.div>
        </section>

        {/* ══════════════════════════════════════════
            SECTION 2 — COMMENT ÇA MARCHE
        ══════════════════════════════════════════ */}
        <Section id="how" className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4 border border-primary/20 text-primary"
              style={{ background: "hsl(var(--primary)/0.07)" }}>
              <Zap className="w-3 h-3" /> Comment ça marche
            </div>
            <h2 className="text-2xl sm:text-4xl font-black mb-3 text-foreground">
              De zéro à opérationnel<br />
              <span className="text-primary">en moins de 5 minutes</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
              Pas de formation longue. Pas de vidéo de 3 heures. Une action par jour, mesurée, corrigée par l'IA.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((step, i) => (
              <FadeIn key={step.step} delay={i * 0.1}>
                <div className="relative p-6 rounded-2xl border border-border h-full"
                  style={{ background: "hsl(var(--card))" }}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-black text-primary/50 font-mono">{step.step}</span>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: "hsl(var(--primary)/0.1)" }}>
                      <step.icon className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                  <h3 className="font-bold text-sm text-foreground mb-2">{step.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                  {i < 2 && (
                    <ArrowRight className="absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-border hidden sm:block" />
                  )}
                </div>
              </FadeIn>
            ))}
          </div>
        </Section>

        {/* ══════════════════════════════════════════
            SECTION 3 — CAS D'USAGE MÉTIERS
        ══════════════════════════════════════════ */}
        <Section className="max-w-5xl mx-auto" style={{ paddingTop: 0 }}>
          <FadeIn className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4 border border-primary/20 text-primary"
              style={{ background: "hsl(var(--primary)/0.07)" }}>
              <Users className="w-3 h-3" /> Pour qui
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-foreground">
              Fait pour votre métier,<br />
              <span className="text-primary">pas pour les ingénieurs.</span>
            </h2>
          </FadeIn>

          <div className="space-y-4">
            {USE_CASES.map((uc, i) => (
              <FadeIn key={uc.who} delay={i * 0.1}>
                <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_1fr] gap-4 sm:gap-6 p-5 rounded-2xl border border-border items-start"
                  style={{ background: "hsl(var(--card))" }}>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{uc.icon}</span>
                    <span className="text-sm font-bold text-foreground whitespace-nowrap">{uc.who}</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Le problème</p>
                    <p className="text-sm text-foreground/80 italic">"{uc.problem}"</p>
                  </div>
                  <div className="sm:border-l sm:border-border sm:pl-6">
                    <p className="text-xs font-semibold text-primary mb-1 uppercase tracking-wide">La solution</p>
                    <p className="text-sm text-foreground/80">{uc.answer}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </Section>

        {/* ══════════════════════════════════════════
            SECTION 4 — CE QUE VOUS OBTENEZ
        ══════════════════════════════════════════ */}
        <Section className="max-w-6xl mx-auto"
          style={{ paddingTop: 0, borderTop: "1px solid hsl(var(--border)/0.4)" }}>
          <FadeIn className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4 border border-primary/20 text-primary"
              style={{ background: "hsl(var(--primary)/0.07)" }}>
              <CheckCircle className="w-3 h-3" /> Ce que vous obtenez
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-foreground">
              Tout ce qu'il faut pour progresser,<br />
              <span className="text-primary">rien de superflu.</span>
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {WHAT_YOU_GET.map((item, i) => (
              <FadeIn key={item.title} delay={i * 0.07}>
                <div className="p-5 rounded-2xl border border-border h-full"
                  style={{ background: "hsl(var(--card))" }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: "hsl(var(--primary)/0.1)" }}>
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-bold text-sm text-foreground mb-2">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </Section>

        {/* ══════════════════════════════════════════
            SECTION 5 — COMPARAISON HONNÊTE
        ══════════════════════════════════════════ */}
        <Section className="max-w-4xl mx-auto" style={{ paddingTop: 0 }}>
          <FadeIn className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4 border border-primary/20 text-primary"
              style={{ background: "hsl(var(--primary)/0.07)" }}>
              <TrendingUp className="w-3 h-3" /> Comparaison honnête
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground">
              Formation classique vs Formetoialia
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
              Les formateurs humains apportent de la valeur — contexte, nuance, relation. Voici où la complémentarité numérique fait sens.
            </p>
          </FadeIn>

          <FadeIn>
            <div className="rounded-2xl border border-border overflow-hidden" style={{ background: "hsl(var(--card))" }}>
              <div className="grid grid-cols-3 px-5 py-3 text-xs font-bold border-b border-border"
                style={{ background: "hsl(var(--primary)/0.05)" }}>
                <span className="text-muted-foreground">Critère</span>
                <span className="text-center text-muted-foreground">Formation classique</span>
                <span className="text-center text-primary">Formetoialia</span>
              </div>
              {COMPARE_ROWS.map((row, i) => (
                <div key={row.feature}
                  className="grid grid-cols-3 px-5 py-3.5 text-xs border-b border-border/50 last:border-0">
                  <span className="text-foreground/70">{row.feature}</span>
                  <span className="text-center text-muted-foreground">{row.classic}</span>
                  <span className="text-center font-semibold text-emerald-400">{row.fti}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground/50 text-center mt-3">
              * Comparaison indicative. La valeur d'un formateur humain dépend du contexte.
            </p>
          </FadeIn>
        </Section>

        {/* ══════════════════════════════════════════
            SECTION 6 — PRICING TEASER
        ══════════════════════════════════════════ */}
        <Section className="max-w-2xl mx-auto text-center" style={{ paddingTop: 0 }}>
          <FadeIn>
            <div className="rounded-2xl p-8 sm:p-10 border-2 border-primary/30"
              style={{
                background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--primary)/0.04) 100%)",
                boxShadow: "0 0 40px hsl(var(--primary)/0.1)",
              }}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-5 border border-primary/20 text-primary"
                style={{ background: "hsl(var(--primary)/0.07)" }}>
                <Star className="w-3 h-3" /> Plan Pro
              </div>
              <div className="flex items-end justify-center gap-2 mb-2">
                <span className="text-5xl font-black text-accent">59€</span>
                <span className="text-muted-foreground mb-2">TTC/mois</span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Pour toute l'organisation · jusqu'à 25 membres · tout inclus
              </p>
              <ul className="text-sm text-left space-y-2 mb-8 max-w-sm mx-auto">
                {["Modules complets IA + Cybersécurité", "Copilote IA KITT (500 msg/jour)", "Labs interactifs", "Attestations vérifiables", "Dashboard manager", "Essai 14 jours · 30j remboursé"].map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-foreground/80">{f}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <CTAButton onClick={handleCTA} size="lg">
                  <Sparkles className="w-4 h-4" />
                  Démarrer l'essai gratuit
                </CTAButton>
                <CTAButton href="/pricing" variant="outline" size="lg">
                  Voir le détail →
                </CTAButton>
              </div>
              <p className="text-xs text-muted-foreground/60 mt-4">
                Sans carte bancaire · Résiliation libre · Paiement Stripe sécurisé
              </p>
            </div>
          </FadeIn>
        </Section>

        {/* ══════════════════════════════════════════
            SECTION 7 — APERÇU PRODUIT
        ══════════════════════════════════════════ */}
        <Section className="max-w-5xl mx-auto" style={{ paddingTop: 0 }}>
          <FadeIn className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4 border border-primary/20 text-primary"
              style={{ background: "hsl(var(--primary)/0.07)" }}>
              <Clock className="w-3 h-3" /> Dans l'application
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground">
              Ce que vous voyez au quotidien
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Dashboard aperçu */}
            {[
              {
                title: "Mission du jour",
                content: "KITT vous propose une action concrète en 10 minutes. Vous l'exécutez, il corrige et mesure.",
                badge: "Today",
                badgeColor: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
                lines: [
                  "🎯 Mission : Rédiger un prompt de prospection",
                  "⏱ Durée estimée : 12 min",
                  "📈 XP disponible : +80 pts",
                  "🔁 Feedback IA immédiat",
                ],
              },
              {
                title: "Copilote KITT",
                content: "Posez vos questions à tout moment. KITT s'adapte à votre niveau et votre module en cours.",
                badge: "Chat",
                badgeColor: "text-primary border-primary/30 bg-primary/10",
                lines: [
                  "💬 Comment rédiger un bon prompt ?",
                  "🤖 KITT : Voici 3 techniques adaptées à...",
                  "📌 Enregistré dans votre bibliothèque",
                  "✅ 127 échanges ce mois",
                ],
              },
              {
                title: "Attestation vérifiable",
                content: "À chaque module complété, un PDF signé est généré. Vérifiable en ligne via QR code.",
                badge: "Attestation",
                badgeColor: "text-accent border-accent/30 bg-accent/10",
                lines: [
                  "📄 Module IA Pro — Complété",
                  "🔐 Signature numérique : ✓",
                  "📱 QR code vérification : actif",
                  "📥 PDF exportable",
                ],
              },
            ].map((card, i) => (
              <FadeIn key={card.title} delay={i * 0.1}>
                <div className="rounded-2xl border border-border overflow-hidden h-full"
                  style={{ background: "hsl(var(--card))" }}>
                  {/* Faux header app */}
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between"
                    style={{ background: "hsl(var(--background)/0.5)" }}>
                    <span className="text-xs font-bold text-foreground">{card.title}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${card.badgeColor}`}>
                      {card.badge}
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{card.content}</p>
                    <div className="space-y-2">
                      {card.lines.map((line) => (
                        <div key={line} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-foreground/70"
                          style={{ background: "hsl(var(--secondary)/0.5)" }}>
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </Section>

        {/* ══════════════════════════════════════════
            SECTION 8 — FAQ
        ══════════════════════════════════════════ */}
        <Section className="max-w-2xl mx-auto" style={{ paddingTop: 0 }}>
          <FadeIn className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-foreground">Questions fréquentes</h2>
          </FadeIn>
          <div className="space-y-2.5">
            {FAQ_DATA.map((item) => (
              <FAQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </Section>

        {/* ══════════════════════════════════════════
            SECTION 9 — CTA FINAL
        ══════════════════════════════════════════ */}
        <Section className="max-w-2xl mx-auto text-center" style={{ paddingTop: 0, paddingBottom: "5rem" }}>
          <FadeIn>
            <div className="rounded-2xl p-8 sm:p-10 border border-primary/20"
              style={{ background: "hsl(var(--card))" }}>
              <Shield className="w-10 h-10 text-primary mx-auto mb-5" />
              <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-3">
                Vos équipes méritent<br />mieux qu'un PDF de formation.
              </h2>
              <p className="text-muted-foreground text-sm mb-8 max-w-sm mx-auto leading-relaxed">
                Démarrez gratuitement. Première mission en moins de 5 minutes. Résultats mesurables dès la première semaine.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
                <CTAButton onClick={handleCTA} size="lg">
                  <Sparkles className="w-5 h-5" />
                  Commencer gratuitement
                  <ArrowRight className="w-4 h-4" />
                </CTAButton>
                <CTAButton href="/demo" variant="outline" size="lg">
                  Voir la démo d'abord
                </CTAButton>
              </div>
              <p className="text-xs text-muted-foreground/50">
                Sans carte bancaire · RGPD · Hébergement UE · 30j remboursé
              </p>
            </div>
          </FadeIn>
        </Section>

        <ProFooter />
      </div>
    </>
  );
}
