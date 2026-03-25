/**
 * Formetoialia — Homepage — Système d'exécution IA quotidien
 * "Formetoialia transforme l'IA en résultats concrets, chaque jour."
 */

import React, { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Shield, Sparkles, Users, Zap,
  FileCheck, BarChart3, ChevronDown, CheckCircle,
  Target, MessageSquare, TrendingUp, Clock, Play,
  AlertCircle, Repeat, HelpCircle, BookOpen,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import logoFormetoialia from "@/assets/logo-formetoialia.png";
import { ProFooter } from "@/components/ProFooter";
import {
  softwareApplicationSchema, productSchema,
  organizationSchema, faqSchema,
} from "@/lib/seo";

/* ── Helpers ─────────────────────────────────────────────────── */
function FadeIn({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Sec({ children, id = "", className = "", style }: {
  children: React.ReactNode; id?: string; className?: string; style?: React.CSSProperties;
}) {
  return (
    <section id={id} className={`py-16 sm:py-24 px-4 sm:px-6 ${className}`} style={style}>
      {children}
    </section>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold mb-5 border border-primary/20 text-primary"
      style={{ background: "hsl(var(--primary)/0.07)" }}
    >
      {children}
    </div>
  );
}

function CTAPrimary({ onClick, href, children }: {
  onClick?: () => void; href?: string; children: React.ReactNode;
}) {
  const cls = "inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary";
  const style = {
    background: "hsl(var(--accent))",
    color: "hsl(var(--accent-foreground))",
    boxShadow: "0 0 22px hsl(var(--accent)/0.3)",
  };
  if (href) return <Link to={href} className={cls} style={style}>{children}</Link>;
  return <button onClick={onClick} className={cls} style={style}>{children}</button>;
}

function CTASecondary({ onClick, href, children }: {
  onClick?: () => void; href?: string; children: React.ReactNode;
}) {
  const cls = "inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] border border-primary/40 text-primary hover:bg-primary/8 focus:outline-none";
  if (href) return <Link to={href} className={cls}>{children}</Link>;
  return <button onClick={onClick} className={cls}>{children}</button>;
}

/* ── FAQ ─────────────────────────────────────────────────────── */
const FAQ_DATA = [
  {
    q: "Est-ce juste un chat IA de plus ?",
    a: "Non. ChatGPT vous donne des réponses. Formetoialia vous donne un système : une mission concrète chaque jour, un playbook structuré, une progression mesurable et une preuve de résultat. C'est la différence entre une réponse isolée et une habitude d'exécution.",
  },
  {
    q: "Est-ce utile si je débute avec l'IA ?",
    a: "C'est précisément fait pour ça. L'onboarding calibre votre niveau en 3 minutes. KITT vous guide dès la première session. Zéro compétence technique requise — juste la volonté de commencer.",
  },
  {
    q: "Pourquoi payer si des IA gratuites existent ?",
    a: "Les IA gratuites répondent. Formetoialia exécute. La valeur n'est pas dans l'accès à l'IA — elle est dans le système qui vous force à l'utiliser quotidiennement pour obtenir des résultats mesurables. Page blanche éliminée. Progression visible. Résultats exportables.",
  },
  {
    q: "C'est adapté aux équipes ?",
    a: "Oui. Le plan Pro couvre jusqu'à 25 membres sous un seul abonnement. Le cockpit manager permet au responsable de suivre la progression individuelle, d'identifier les lacunes et d'exporter des rapports.",
  },
  {
    q: "En combien de temps j'obtiens une première valeur ?",
    a: "Moins de 5 minutes après l'inscription. Votre première mission est assignée immédiatement. Vous l'exécutez, KITT l'évalue. Vous avez votre premier résultat concret avant la fin de la journée.",
  },
  {
    q: "Y a-t-il un engagement ?",
    a: "Aucun. L'essai de 14 jours est sans carte bancaire. L'abonnement se résilie en 2 clics, effectif à la fin de la période. Garantie satisfait ou remboursé 30 jours.",
  },
];

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

/* ── Main ────────────────────────────────────────────────────── */
export default function Index() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // landing_viewed : event exempté de consentement car non-identifiant
    // (actor_user_id=null, pas de cookie traceur).
    // On utilise le SDK analytics pour avoir le batch + fallback log.
    import("@/hooks/useAnalytics").then(({ useAnalytics: _noop }) => {
      // Insertion directe minimaliste — aucune donnée personnelle
      try {
        import("@/integrations/supabase/client").then(({ supabase: sb }) => {
          sb.from("analytics_events").insert({
            actor_user_id: null,
            org_id: null,
            event_name: "landing_viewed",
            properties: { ts: new Date().toISOString(), url: window.location.pathname },
          }).then(({ error }) => {
            if (error) console.warn("[analytics] landing_viewed:", error.message);
          });
        });
      } catch (err) {
        console.warn("[analytics] landing_viewed failed:", err);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCTA = useCallback(() => {
    if (isAuthenticated) navigate("/app/dashboard");
    else navigate("/register");
  }, [isAuthenticated, navigate]);

  return (
    <>
      <Helmet>
        <title>Formetoialia — Système d'exécution IA quotidien pour équipes</title>
        <meta name="description" content="Arrêtez les formations IA qui finissent en oubli. Formetoialia transforme l'IA en résultats concrets : missions guidées, playbooks métier, cockpit manager. 59€/mois — 25 membres." />
        <meta property="og:title" content="Formetoialia — Système d'exécution IA quotidien" />
        <meta property="og:description" content="Missions concrètes, playbooks prêts à l'emploi, copilote KITT, cockpit manager. 59€ TTC/mois pour toute l'équipe." />
        <meta property="og:image" content="https://formetoialia.com/logo-formetoialia.png" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://formetoialia.com/" />
        <script type="application/ld+json">{JSON.stringify(organizationSchema())}</script>
        <script type="application/ld+json">{JSON.stringify(softwareApplicationSchema())}</script>
        <script type="application/ld+json">{JSON.stringify(productSchema())}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema())}</script>
      </Helmet>

      <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

        {/* ══ NAVBAR ══════════════════════════════════════════════ */}
        <header
          className="sticky top-0 z-50 border-b border-border/40 px-4 sm:px-8 h-14 flex items-center justify-between"
          style={{ background: "hsl(var(--background)/0.96)", backdropFilter: "blur(16px)" }}
        >
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5">
              <img src={logoFormetoialia} alt="Formetoialia" className="h-7 w-auto" />
              <span className="font-black text-sm tracking-tight">
                <span className="text-primary">formetoi</span><span className="text-accent">alia</span>
              </span>
            </Link>
            <nav className="hidden sm:flex items-center gap-5" aria-label="Navigation principale">
              {[
                { label: "Comment ça marche", href: "#how" },
                { label: "Playbooks", href: "#playbooks" },
                { label: "Prix", href: "/pricing" },
                { label: "Démo", href: "/demo" },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link to="/app/dashboard" className="text-xs font-semibold text-primary">Mon espace →</Link>
            ) : (
              <>
                <Link to="/login" className="hidden sm:block text-xs text-muted-foreground hover:text-foreground transition-colors">Connexion</Link>
                <CTAPrimary onClick={handleCTA}>
                  <Sparkles className="w-3.5 h-3.5" />
                  Essayer gratuitement
                </CTAPrimary>
              </>
            )}
          </div>
        </header>

        {/* ══ 1. HERO ═════════════════════════════════════════════ */}
        <section className="relative flex flex-col items-center justify-center min-h-[90vh] px-4 sm:px-6 pt-10 pb-16 text-center overflow-hidden">
          {/* Ambient glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 65% 55% at 50% 15%, hsl(var(--primary)/0.09) 0%, transparent 70%)" }}
          />
          {/* Subtle grid */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.025]"
            style={{
              backgroundImage: "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
            }}
          />

          <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
            {/* Trust pill */}
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.45 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 border border-primary/20"
              style={{ background: "hsl(var(--primary)/0.07)" }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-primary">RGPD · Hébergé en UE · Essai 14 jours sans carte</span>
            </motion.div>

          <span className="text-[clamp(2.1rem,5.8vw,4.2rem)] font-black leading-[1.08] tracking-tight mb-6">
            <span className="block text-foreground">Transformez votre équipe</span>
            <span className="block" style={{ color: "hsl(var(--primary))" }}>avec l'IA, dès demain.</span>
          </span>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.55 }}
              className="text-base sm:text-lg text-muted-foreground max-w-2xl mb-10 leading-relaxed"
            >
              Formetoialia transforme l'IA en résultats concrets grâce à des{" "}
              <strong className="text-foreground">missions guidées</strong>,
              des <strong className="text-foreground">playbooks prêts à l'emploi</strong>{" "}
              et un <strong className="text-foreground">suivi de progression mesurable</strong>.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.58, duration: 0.45 }}
              className="flex flex-col sm:flex-row gap-3 mb-5"
            >
              <CTAPrimary onClick={handleCTA}>
                <Sparkles className="w-4 h-4" />
                Essayer gratuitement
                <ArrowRight className="w-4 h-4" />
              </CTAPrimary>
              <CTASecondary href="/demo">
                <Play className="w-4 h-4" />
                Voir une mission en direct
              </CTASecondary>
            </motion.div>

            {/* Micro-proof */}
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 0.72 }}
              className="text-xs text-muted-foreground/60 mb-14"
            >
              1 mission par jour &nbsp;·&nbsp; 1 résultat concret &nbsp;·&nbsp; 0 page blanche
            </motion.p>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.88, duration: 0.4 }}
              className="flex flex-wrap justify-center gap-8 sm:gap-12"
            >
              {[
                { value: "< 5 min", label: "première victoire" },
                { value: "25", label: "membres inclus" },
                { value: "59€", label: "TTC/mois tout compris" },
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
            transition={{ delay: 1.4 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 2, repeat: Infinity }}>
              <ChevronDown className="w-4 h-4 text-muted-foreground/25" />
            </motion.div>
          </motion.div>
        </section>

        {/* ══ 2. PROBLÈME ═════════════════════════════════════════ */}
        <Sec className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-12">
            <Chip><AlertCircle className="w-3 h-3" /> Le vrai problème</Chip>
            <h2 className="text-2xl sm:text-4xl font-black text-foreground mb-4">
              Le vrai problème n'est pas<br />
              <span className="text-primary">l'accès à l'IA. C'est son usage.</span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              La plupart des équipes ont déjà accès à ChatGPT. Mais en pratique, rien ne change.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: BookOpen,
                title: "Trop de théorie",
                desc: "Des vidéos, des slides, des PDF. Personne n'est plus opérationnel à la fin.",
              },
              {
                icon: HelpCircle,
                title: "Trop de page blanche",
                desc: "On sait que l'IA est utile. On ne sait pas par où commencer ni quoi produire.",
              },
              {
                icon: Repeat,
                title: "Trop de bricolage",
                desc: "Chacun fait sa sauce. Pas de méthode partagée, pas de progression collective.",
              },
              {
                icon: BarChart3,
                title: "Zéro résultat mesurable",
                desc: "Impossible de prouver que les équipes progressent. Aucun reporting, aucune trace.",
              },
            ].map((card, i) => (
              <FadeIn key={card.title} delay={i * 0.08}>
                <div
                  className="p-5 rounded-2xl border border-border h-full"
                  style={{ background: "hsl(var(--card))" }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: "hsl(var(--destructive)/0.1)" }}
                  >
                    <card.icon className="w-4 h-4 text-destructive" />
                  </div>
                  <h3 className="font-bold text-sm text-foreground mb-2">{card.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </Sec>

        {/* ══ 3. PROMESSE ═════════════════════════════════════════ */}
        <Sec
          className="max-w-5xl mx-auto"
          style={{ paddingTop: 0 }}
        >
          <FadeIn className="text-center mb-12">
            <Chip><Zap className="w-3 h-3" /> La promesse</Chip>
            <h2 className="text-2xl sm:text-4xl font-black text-foreground mb-4">
              Avec Formetoialia, l'IA cesse d'être un gadget.
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Elle devient <strong className="text-foreground">une habitude de production</strong>.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              {
                number: "01",
                icon: Target,
                title: "Mission concrète",
                desc: "Chaque jour, une exécution assignée par KITT. Pas un cours — une tâche réelle sur votre vrai travail.",
                accent: "hsl(var(--primary))",
              },
              {
                number: "02",
                icon: CheckCircle,
                title: "Résultat exploitable",
                desc: "À la fin de chaque mission, vous avez un livrable : email rédigé, document analysé, présentation préparée.",
                accent: "hsl(var(--accent))",
              },
              {
                number: "03",
                icon: TrendingUp,
                title: "Progression visible",
                desc: "XP, jalons, attestations, cockpit manager. Chaque effort est mesuré et documenté.",
                accent: "hsl(142 71% 45%)",
              },
            ].map((card, i) => (
              <FadeIn key={card.title} delay={i * 0.1}>
                <div
                  className="relative p-6 rounded-2xl border border-border h-full overflow-hidden"
                  style={{ background: "hsl(var(--card))" }}
                >
                  <div
                    className="absolute top-0 left-0 w-full h-0.5"
                    style={{ background: card.accent }}
                  />
                  <span className="text-xs font-black text-muted-foreground/30 font-mono block mb-4">{card.number}</span>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `${card.accent}18` }}
                  >
                    <card.icon className="w-5 h-5" style={{ color: card.accent }} />
                  </div>
                  <h3 className="font-bold text-foreground mb-2">{card.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{card.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </Sec>

        {/* ══ 4. COMMENT ÇA MARCHE ════════════════════════════════ */}
        <Sec
          id="how"
          className="max-w-4xl mx-auto"
          style={{ borderTop: "1px solid hsl(var(--border)/0.4)" }}
        >
          <FadeIn className="text-center mb-14">
            <Chip><Zap className="w-3 h-3" /> Comment ça marche</Chip>
            <h2 className="text-2xl sm:text-4xl font-black text-foreground mb-3">
              En 3 étapes.{" "}
              <span className="text-primary">Pas en 3 semaines.</span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              Pas de cours magistral. Pas de vidéo de 3h. Une exécution guidée, évaluée par l'IA.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                icon: Target,
                title: "Choisir un objectif",
                desc: "En 3 minutes, un diagnostic calibre votre niveau. Votre plan d'exécution est construit automatiquement.",
              },
              {
                step: "02",
                icon: MessageSquare,
                title: "Être guidé pas à pas",
                desc: "KITT assigne une mission ciblée. Vous l'exécutez. L'IA évalue, corrige, adapte la suite.",
              },
              {
                step: "03",
                icon: FileCheck,
                title: "Obtenir un vrai résultat",
                desc: "Un livrable exploitable à chaque session. Une attestation à chaque jalon complété.",
              },
            ].map((s, i) => (
              <FadeIn key={s.step} delay={i * 0.1}>
                <div
                  className="relative p-6 rounded-2xl border border-border h-full"
                  style={{ background: "hsl(var(--card))" }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-black text-primary/40 font-mono">{s.step}</span>
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: "hsl(var(--primary)/0.1)" }}
                    >
                      <s.icon className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                  <h3 className="font-bold text-sm text-foreground mb-2">{s.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                  {i < 2 && (
                    <ArrowRight className="absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-border hidden sm:block" />
                  )}
                </div>
              </FadeIn>
            ))}
          </div>
        </Sec>

        {/* ══ 5. EMERGENCY MODE ═══════════════════════════════════ */}
        <Sec className="max-w-4xl mx-auto" style={{ paddingTop: 0 }}>
          <FadeIn>
            <div
              className="rounded-2xl p-7 sm:p-10 border border-accent/30"
              style={{
                background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--accent)/0.05) 100%)",
                boxShadow: "0 0 30px hsl(var(--accent)/0.07)",
              }}
            >
              <div className="text-center mb-8">
                <Chip><Zap className="w-3 h-3 text-accent" />Besoin immédiat</Chip>
                <h2 className="text-2xl sm:text-3xl font-black text-foreground">
                  Besoin d'un résultat maintenant ?
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  KITT peut vous aider en moins de 5 minutes sur vos vraies tâches.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { emoji: "✉️", title: "Rédiger un mail difficile", desc: "Refus, relance, escalade — KITT vous guide phrase par phrase." },
                  { emoji: "📄", title: "Analyser un document", desc: "Résumé, points clés, risques, actions prioritaires en secondes." },
                  { emoji: "🎯", title: "Préparer une présentation", desc: "Structure, arguments, slides — du brouillon au pitch final." },
                ].map((item, i) => (
                  <FadeIn key={item.title} delay={i * 0.08}>
                    <div
                      className="p-4 rounded-xl border border-border cursor-pointer hover:border-primary/40 transition-all group"
                      style={{ background: "hsl(var(--background)/0.5)" }}
                      onClick={handleCTA}
                      role="button"
                      tabIndex={0}
                    >
                      <span className="text-2xl mb-3 block">{item.emoji}</span>
                      <p className="text-sm font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{item.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </FadeIn>
                ))}
              </div>
              <div className="text-center mt-7">
                <CTAPrimary onClick={handleCTA}>
                  <Sparkles className="w-4 h-4" />
                  Essayer maintenant — c'est gratuit
                </CTAPrimary>
              </div>
            </div>
          </FadeIn>
        </Sec>

        {/* ══ 6. PLAYBOOKS ════════════════════════════════════════ */}
        <Sec
          id="playbooks"
          className="max-w-6xl mx-auto"
          style={{ borderTop: "1px solid hsl(var(--border)/0.4)" }}
        >
          <FadeIn className="text-center mb-12">
            <Chip><BookOpen className="w-3 h-3" /> Playbooks</Chip>
            <h2 className="text-2xl sm:text-4xl font-black text-foreground mb-3">
              Des playbooks prêts à l'emploi
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              Pas des templates vides. Des exécutions guidées, étape par étape, sur vos vraies tâches métier.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: MessageSquare,
                tag: "Communication",
                title: "Prompts de prospection",
                desc: "Rédigez des emails de prospection, des relances et des propositions commerciales en 5 minutes.",
              },
              {
                icon: FileCheck,
                tag: "Cybersécurité",
                title: "Détection d'attaques phishing",
                desc: "Reconnaître les tentatives de manipulation, les faux emails et les liens suspects.",
              },
              {
                icon: Zap,
                tag: "Productivité",
                title: "Automatisation de tâches répétitives",
                desc: "Identifiez et déléguer à l'IA ce qui vous fait perdre du temps chaque semaine.",
              },
              {
                icon: BarChart3,
                tag: "Management",
                title: "Rapports de performance",
                desc: "Générez des synthèses d'équipe, des compte-rendus et des plans d'action structurés.",
              },
              {
                icon: Target,
                tag: "Décision",
                title: "Analyse de documents complexes",
                desc: "Contrats, rapports, comptes-rendus — extrayez l'essentiel en secondes.",
              },
              {
                icon: TrendingUp,
                tag: "Croissance",
                title: "Stratégie de contenu",
                desc: "Posts LinkedIn, newsletters, pages web — produisez du contenu cohérent sans blocage.",
              },
            ].map((pb, i) => (
              <FadeIn key={pb.title} delay={i * 0.06}>
                <div
                  className="p-5 rounded-2xl border border-border h-full hover:border-primary/30 transition-all cursor-pointer group"
                  style={{ background: "hsl(var(--card))" }}
                  onClick={handleCTA}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: "hsl(var(--primary)/0.1)" }}
                    >
                      <pb.icon className="w-4 h-4 text-primary" />
                    </div>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary/20 text-primary"
                      style={{ background: "hsl(var(--primary)/0.06)" }}
                    >
                      {pb.tag}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-foreground mb-2 group-hover:text-primary transition-colors">{pb.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{pb.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn className="text-center mt-8">
            <CTASecondary onClick={handleCTA}>
              Voir tous les playbooks <ArrowRight className="w-4 h-4" />
            </CTASecondary>
          </FadeIn>
        </Sec>

        {/* ══ 7. COCKPIT MANAGER ══════════════════════════════════ */}
        <Sec className="max-w-5xl mx-auto" style={{ paddingTop: 0 }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <FadeIn>
              <Chip><Users className="w-3 h-3" /> Pour les dirigeants & managers</Chip>
              <h2 className="text-2xl sm:text-4xl font-black text-foreground mb-4">
                59€/mois pour 25 membres.{" "}
                <span className="text-primary">Rentable dès la première semaine.</span>
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-5 leading-relaxed">
                Vous ne payez pas pour former votre équipe à l'IA.
                Vous payez pour la <strong className="text-foreground">rendre opérationnelle</strong>,
                mesurer l'adoption, et prouver la valeur en temps réel.
              </p>
              <div
                className="rounded-xl border border-primary/20 px-4 py-3 mb-5 text-sm"
                style={{ background: "hsl(var(--primary)/0.05)" }}
              >
                <span className="font-bold text-foreground">Calcul simple :</span>
                <span className="text-muted-foreground ml-1">
                  10 membres · 2 missions/sem. = ~13h éco./mois. À 50€/h = <span className="text-primary font-bold">650€ de valeur pour 59€.</span>
                </span>
              </div>
              <ul className="space-y-2.5 mb-7">
                {[
                  "Score d'adoption équipe en temps réel",
                  "Signaux d'inactivité et relances automatiques",
                  "Heures économisées estimées par membre",
                  "Rapport mensuel exportable en 1 clic",
                  "Jusqu'à 25 membres inclus dans le plan",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-foreground/80">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <CTAPrimary onClick={handleCTA}>
                Découvrir le cockpit manager
              </CTAPrimary>
            </FadeIn>

            <FadeIn delay={0.15}>
              <div
                className="rounded-2xl border border-border overflow-hidden"
                style={{ background: "hsl(var(--card))" }}
              >
                {/* Fake cockpit header */}
                <div
                  className="px-4 py-3 border-b border-border flex items-center justify-between"
                  style={{ background: "hsl(var(--background)/0.5)" }}
                >
                  <span className="text-xs font-bold text-foreground">Cockpit équipe</span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full border font-semibold text-emerald-400 border-emerald-400/30"
                    style={{ background: "hsl(142 71% 45% / 0.08)" }}
                  >
                    En direct
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  {[
                    { name: "Marie R.", progress: 78, tag: "IA Pro", status: "Actif" },
                    { name: "Thomas B.", progress: 45, tag: "Cybersécurité", status: "Actif" },
                    { name: "Sophie L.", progress: 92, tag: "IA Perso", status: "Complété" },
                    { name: "David M.", progress: 12, tag: "IA Pro", status: "À relancer" },
                  ].map((member) => (
                    <div
                      key={member.name}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: "hsl(var(--secondary)/0.4)" }}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{ background: "hsl(var(--primary)/0.2)", color: "hsl(var(--primary))" }}
                      >
                        {member.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-foreground truncate">{member.name}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{member.progress}%</span>
                        </div>
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: "hsl(var(--border))" }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${member.progress}%`,
                              background: member.progress > 70
                                ? "hsl(142 71% 45%)"
                                : member.progress > 30
                                  ? "hsl(var(--primary))"
                                  : "hsl(var(--accent))",
                            }}
                          />
                        </div>
                      </div>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full border font-medium shrink-0"
                        style={{
                          borderColor: member.status === "Complété"
                            ? "hsl(142 71% 45% / 0.3)"
                            : member.status === "À relancer"
                              ? "hsl(var(--accent)/0.3)"
                              : "hsl(var(--primary)/0.3)",
                          color: member.status === "Complété"
                            ? "hsl(142 71% 45%)"
                            : member.status === "À relancer"
                              ? "hsl(var(--accent))"
                              : "hsl(var(--primary))",
                          background: "transparent",
                        }}
                      >
                        {member.status}
                      </span>
                    </div>
                  ))}
                </div>
                <div
                  className="px-4 py-3 border-t border-border flex items-center justify-between"
                  style={{ background: "hsl(var(--background)/0.3)" }}
                >
                  <span className="text-xs text-muted-foreground">4 membres actifs · 1 à relancer</span>
                  <span className="text-xs font-semibold text-primary cursor-pointer hover:underline">Exporter →</span>
                </div>
              </div>
            </FadeIn>
          </div>
        </Sec>

        {/* ══ 8. COMPARATIF ═══════════════════════════════════════ */}
        <Sec
          className="max-w-4xl mx-auto"
          style={{ borderTop: "1px solid hsl(var(--border)/0.4)" }}
        >
          <FadeIn className="text-center mb-10">
            <Chip><TrendingUp className="w-3 h-3" /> Comparaison honnête</Chip>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-3">
              Pourquoi payer alors que{" "}
              <span className="text-primary">ChatGPT existe déjà ?</span>
            </h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              ChatGPT répond. Formetoialia exécute. La différence est dans le système, pas dans l'IA.
            </p>
          </FadeIn>

          <FadeIn>
            <div
              className="rounded-2xl border border-border overflow-hidden"
              style={{ background: "hsl(var(--card))" }}
            >
              <div
                className="grid grid-cols-3 px-5 py-3.5 text-xs font-black border-b border-border"
                style={{ background: "hsl(var(--primary)/0.04)" }}
              >
                <span className="text-muted-foreground" />
                <span className="text-center text-muted-foreground">ChatGPT seul</span>
                <span className="text-center" style={{ color: "hsl(var(--primary))" }}>Formetoialia</span>
              </div>
              {[
                { feature: "Réponse isolée", classic: "✓ Oui", fti: "Système guidé structuré" },
                { feature: "Page blanche à remplir", classic: "Toujours", fti: "Mission prête à exécuter" },
                { feature: "Suivi de progression", classic: "Aucun", fti: "Mesurable & exportable" },
                { feature: "Usage solo uniquement", classic: "Oui", fti: "Pilotage équipe inclus" },
                { feature: "Résultat documenté", classic: "Non", fti: "Attestation + rapport" },
                { feature: "Adapté à mon niveau", classic: "Non", fti: "Parcours adaptatif intégré" },
              ].map((row, i) => (
                <div
                  key={row.feature}
                  className="grid grid-cols-3 px-5 py-3.5 text-xs border-b border-border/50 last:border-0"
                  style={{ background: i % 2 === 0 ? "transparent" : "hsl(var(--primary)/0.015)" }}
                >
                  <span className="text-foreground/70 font-medium">{row.feature}</span>
                  <span className="text-center text-muted-foreground/60">{row.classic}</span>
                  <span className="text-center font-semibold text-emerald-400">{row.fti}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground/40 text-center mt-3">
              * Comparaison indicative basée sur l'usage standard de ChatGPT sans système d'exécution structuré.
            </p>
          </FadeIn>
        </Sec>

        {/* ══ 9. PRICING TEASER ═══════════════════════════════════ */}
        <Sec className="max-w-3xl mx-auto" id="pricing">
          <FadeIn className="text-center mb-10">
            <Chip>Prix</Chip>
            <h2 className="text-2xl sm:text-4xl font-black text-foreground mb-3">
              Commencez gratuitement.<br />
              <span className="text-primary">Passez à l'exécution complète quand vous êtes prêt.</span>
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
            {/* Gratuit */}
            <FadeIn>
              <div
                className="rounded-2xl p-6 border border-border h-full flex flex-col"
                style={{ background: "hsl(var(--card))" }}
              >
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">Gratuit</p>
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-4xl font-black text-foreground">0€</span>
                  <span className="text-muted-foreground text-sm mb-1.5">/mois</span>
                </div>
                <p className="text-xs text-muted-foreground mb-5">Pour explorer sans engagement.</p>
                <ul className="space-y-2.5 text-sm flex-1 mb-6">
                  {[
                    "Copilote KITT — 2 échanges/jour",
                    "Accès aux playbooks publics",
                    "1 mission guidée par jour",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-foreground/80">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className="block w-full text-center py-2.5 rounded-xl font-semibold text-sm transition-all hover:bg-primary/10 border border-primary/40 text-primary"
                >
                  Commencer gratuitement
                </Link>
              </div>
            </FadeIn>

            {/* Pro */}
            <FadeIn delay={0.1}>
              <div
                className="relative rounded-2xl p-6 border-2 border-primary h-full flex flex-col"
                style={{
                  background: "hsl(var(--card))",
                  boxShadow: "0 0 30px hsl(var(--primary)/0.1)",
                }}
              >
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span
                    className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-black"
                    style={{ background: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}
                  >
                    RECOMMANDÉ
                  </span>
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-primary mb-3 mt-2">Pro</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-black text-accent">59€</span>
                  <span className="text-muted-foreground text-sm mb-1.5">TTC/mois</span>
                </div>
                <p className="text-xs text-muted-foreground mb-5">Jusqu'à 25 membres · 14 jours d'essai</p>
                <ul className="space-y-2 text-sm flex-1 mb-6">
                  {[
                    "Missions illimitées",
                    "Playbooks complets",
                    "Copilote KITT illimité",
                    "Cockpit manager",
                    "Bibliothèque d'équipe",
                    "Attestations vérifiables",
                    "Reporting & exports",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-foreground/90">{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={handleCTA}
                  className="w-full py-3 rounded-xl font-black text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  style={{
                    background: "hsl(var(--accent))",
                    color: "hsl(var(--accent-foreground))",
                    boxShadow: "0 0 16px hsl(var(--accent)/0.3)",
                  }}
                >
                  <Zap className="w-4 h-4" />
                  Démarrer l'essai 14 jours →
                </button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Sans carte bancaire · Résiliation libre
                </p>
              </div>
            </FadeIn>
          </div>

          <FadeIn>
            <div className="text-center">
              <Link to="/pricing" className="text-xs text-muted-foreground hover:text-primary underline underline-offset-2 transition-colors">
                Voir le détail complet des plans →
              </Link>
            </div>
          </FadeIn>
        </Sec>

        {/* ══ 10. FAQ ══════════════════════════════════════════════ */}
        <Sec
          className="max-w-2xl mx-auto"
          style={{ paddingTop: 0 }}
        >
          <FadeIn className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-foreground">Questions fréquentes</h2>
          </FadeIn>
          <div className="space-y-2.5">
            {FAQ_DATA.map((item) => (
              <FAQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </Sec>

        {/* ══ 11. CTA FINAL ════════════════════════════════════════ */}
        <Sec
          className="max-w-2xl mx-auto text-center"
          style={{ paddingBottom: "5rem" }}
        >
          <FadeIn>
            <div
              className="rounded-2xl p-9 sm:p-12 border border-primary/20"
              style={{
                background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--primary)/0.04) 100%)",
                boxShadow: "0 0 40px hsl(var(--primary)/0.08)",
              }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: "hsl(var(--primary)/0.1)" }}
              >
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-3">
                Arrêtez d'apprendre l'IA.<br />
                <span className="text-primary">Commencez à l'utiliser vraiment.</span>
              </h2>
              <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto leading-relaxed">
                Première mission en moins de 5 minutes. Résultats mesurables dès la première semaine. Sans carte bancaire.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
                <CTAPrimary onClick={handleCTA}>
                  <Sparkles className="w-5 h-5" />
                  Créer mon accès gratuit
                  <ArrowRight className="w-4 h-4" />
                </CTAPrimary>
                <CTASecondary href="/demo">
                  Voir la démo d'abord
                </CTASecondary>
              </div>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
                {[
                  "Sans carte bancaire",
                  "RGPD · Hébergement UE",
                  "30j remboursé",
                  "Résiliation libre",
                ].map((t) => (
                  <span key={t} className="text-xs text-muted-foreground/50 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </FadeIn>
        </Sec>

        <ProFooter />
      </div>
    </>
  );
}
