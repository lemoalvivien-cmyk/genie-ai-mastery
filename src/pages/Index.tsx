import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import {
  AlertTriangle, CheckCircle, BookOpen, Bot, BarChart3,
  FileText, Users, Zap, Loader2, Mail, Star, ArrowRight,
  Shield, Mic, Globe, Lock
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import logoGenie from "@/assets/logo-genie.png";
import { softwareApplicationSchema, productSchema, organizationSchema } from "@/lib/seo";
import { LegalFooterLinks } from "@/components/legal/LegalFooterLinks";

/* ─── CONFIGURABLE CONSTANTS ─────────────────────────────────── */
const LAUNCH_DEADLINE = new Date("2026-04-15T23:59:59");
const LAUNCH_CODE = "LAUNCH40";
const LAUNCH_SPOTS_REMAINING = 23;
const SOCIAL_PROOF_COUNT = 127;

const TRUSTED_BY = ["BNP Paribas", "Crédit Agricole", "KPMG", "Alten", "Freelances"];

const TESTIMONIALS = [
  {
    name: "Sophie M.",
    title: "Responsable RH",
    company: "Groupe Alten",
    quote: "En 2 semaines, toute mon équipe avait une attestation IA. Enfin quelque chose de concret.",
    avatar: "SM",
  },
  {
    name: "Thomas R.",
    title: "Consultant indépendant",
    company: "Freelance",
    quote: "KITT IA a remplacé 3 outils différents. L'interface vocale est bluffante.",
    avatar: "TR",
  },
  {
    name: "Camille D.",
    title: "Directrice Digitale",
    company: "KPMG France",
    quote: "La certification vérifiable nous a permis de justifier la formation auprès de l'OPCO.",
    avatar: "CD",
  },
];

const PROBLEMS = [
  {
    icon: AlertTriangle,
    title: "Formations à 3 000€",
    body: "Des programmes hors de portée, souvent obsolètes avant même la fin du cursus.",
  },
  {
    icon: AlertTriangle,
    title: "Jargon incompréhensible",
    body: '"Prompting avancé", "RAG", "NIS2" — sans jamais expliquer concrètement ce que ça change pour vous.',
  },
  {
    icon: AlertTriangle,
    title: "Zéro preuve de compétence",
    body: "Pas d'attestation, pas d'audit trail, pas de preuve pour votre OPCO ou vos clients.",
  },
];

const SOLUTIONS = [
  {
    icon: CheckCircle,
    title: "Dès 29€/mois",
    body: "Accès complet à 500+ modules IA, Cyber et Vibe Coding. Sans engagement.",
  },
  {
    icon: CheckCircle,
    title: "Expliqué pour les humains",
    body: "Chaque concept est traduit en langage clair, avec des cas pratiques immédiats.",
  },
  {
    icon: CheckCircle,
    title: "Attestation vérifiable",
    body: "PDF signé cryptographiquement. Valide pour OPCO, CPF et audits de conformité.",
  },
];

const FEATURES = [
  {
    icon: BookOpen,
    title: "Modules + Quiz + Attestation",
    desc: "500+ modules IA/Cyber/Vibe Coding. Quiz adaptatifs. PDFs vérifiables signés.",
  },
  {
    icon: Bot,
    title: "KITT IA Copilote",
    desc: "Votre copilote vocal IA. Répond, forme, génère — en langage naturel.",
  },
  {
    icon: Zap,
    title: "Missions quotidiennes",
    desc: "5 minutes par jour suffisent. Streak, XP, progressivement vers l'expert.",
  },
  {
    icon: BarChart3,
    title: "Dashboard Cockpit",
    desc: "Suivi de progression, compétences, usage IA — tout visible en un coup d'œil.",
  },
  {
    icon: Globe,
    title: "Multi-domaines",
    desc: "IA Pro, IA Perso, Cybersécurité, Vibe Coding. Un seul outil pour tout.",
  },
  {
    icon: Users,
    title: "Compatible équipe",
    desc: "25 sièges inclus. Manager dashboard, alertes, rapports RH exportables.",
  },
];

/* ─── Countdown hook ─────────────────────────────────────────── */
function useCountdown(target: Date) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });
  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, target.getTime() - Date.now());
      const totalSec = Math.floor(diff / 1000);
      setTimeLeft({
        h: Math.floor(totalSec / 3600),
        m: Math.floor((totalSec % 3600) / 60),
        s: totalSec % 60,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return timeLeft;
}

/* ─── Counter-up hook ────────────────────────────────────────── */
function useCounterUp(target: number, duration = 1500) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = Date.now();
        const step = () => {
          const elapsed = Date.now() - start;
          const progress = Math.min(elapsed / duration, 1);
          setCount(Math.floor(progress * target));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);
  return { count, ref };
}

/* ─── Pro Footer component ───────────────────────────────────── */
export function ProFooter() {
  return (
    <footer className="border-t border-border/30 bg-background/80 backdrop-blur-sm pt-16 pb-8 px-4 sm:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Col 1 — Brand */}
          <div className="space-y-4">
            <img src={logoGenie} alt="GENIE IA" className="h-9 w-auto" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              La plateforme qui forme, évalue et certifie vos compétences IA.
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> RGPD natif</span>
              <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> Hébergement UE</span>
            </div>
          </div>

          {/* Col 2 — Produit */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-4">Produit</p>
            <ul className="space-y-2.5">
              {[
                { to: "/pricing", label: "Tarifs" },
                { to: "/app/modules", label: "Modules" },
                { to: "/app/chat", label: "KITT IA" },
                { to: "/app/today", label: "Missions" },
                { to: "/guides", label: "Guides gratuits" },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 — Légal */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-4">Légal</p>
            <ul className="space-y-2.5">
              {[
                { to: "/legal/mentions-legales", label: "Mentions légales" },
                { to: "/legal/confidentialite", label: "Confidentialité" },
                { to: "/legal/cookies", label: "Cookies" },
                { to: "/legal/rgpd", label: "Exercer mes droits" },
                { to: "/legal/subprocessors", label: "Sous-traitants" },
                { to: "/legal/dpa", label: "DPA Entreprises" },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4 — Contact */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-4">Contact</p>
            <ul className="space-y-2.5">
              <li>
                <a href="mailto:contact@genie-ia.app" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> contact@genie-ia.app
                </a>
              </li>
              <li>
                <a href="https://linkedin.com/company/genie-ia" target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  LinkedIn
                </a>
              </li>
              <li>
                <Link to="/partner" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Devenir partenaire
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/30 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} GENIE IA. Tous droits réservés.
          </p>
          <LegalFooterLinks />
        </div>
      </div>
    </footer>
  );
}

/* ─── Main component ─────────────────────────────────────────── */
export default function Index() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [emailLead, setEmailLead] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailDone, setEmailDone] = useState(false);

  const { h, m, s } = useCountdown(LAUNCH_DEADLINE);
  const { count: proCount, ref: proRef } = useCounterUp(SOCIAL_PROOF_COUNT);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) localStorage.setItem("genie_ref", ref.toUpperCase());
  }, [searchParams]);

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      navigate("/register?redirect=/pricing");
      return;
    }
    setCheckoutLoading(true);
    try {
      const referralCode = localStorage.getItem("genie_ref") ?? undefined;
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { seats: 1, ...(referralCode ? { referral_code: referralCode } : {}) },
      });
      if (error || data?.error) throw new Error(data?.error ?? "Erreur checkout");
      window.location.href = data.url;
    } catch (err) {
      toast({ title: "Erreur", description: err instanceof Error ? err.message : "Impossible de créer la session.", variant: "destructive" });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleEmailCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = emailLead.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "Email invalide", variant: "destructive" });
      return;
    }
    setEmailLoading(true);
    try {
      const { error } = await supabase.from("email_leads").insert({ email, source: "landing_prompts" });
      if (error) throw error;
      setEmailDone(true);
      toast({ title: "✅ C'est parti !", description: "Vérifiez votre boîte mail." });
    } catch {
      toast({ title: "Erreur", description: "Réessayez dans un instant.", variant: "destructive" });
    } finally {
      setEmailLoading(false);
    }
  };

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <>
      <Helmet>
        <title>GENIE IA – Formez-vous à l'IA. Prouvez-le.</title>
        <meta name="description" content="La seule plateforme qui forme, évalue et certifie vos compétences IA. Pour les pros, les curieux, les PME. Dès 29€/mois." />
        <meta property="og:title" content="GENIE IA – Formez-vous à l'IA. Prouvez-le." />
        <meta property="og:description" content="Formations IA, Cyber, Vibe Coding. Attestations vérifiables. KITT IA copilote vocal. Dès 29€/mois." />
        <meta property="og:image" content="https://genie-ai-mastery.lovable.app/logo-genie.png" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://genie-ai-mastery.lovable.app/" />
        <meta name="theme-color" content="#5257D8" />
        <script type="application/ld+json">{JSON.stringify(organizationSchema())}</script>
        <script type="application/ld+json">{JSON.stringify(softwareApplicationSchema())}</script>
        <script type="application/ld+json">{JSON.stringify(productSchema())}</script>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden">

        {/* ══════════════════════════════════════════════════════════
            URGENCY BANNER (sticky)
        ══════════════════════════════════════════════════════════ */}
        <div
          className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white text-center"
          style={{ background: "linear-gradient(90deg, #FE2C40 0%, #5257D8 100%)" }}
        >
          <span>🔥 Offre de lancement : -40% avec le code</span>
          <code className="bg-white/20 px-2 py-0.5 rounded font-mono tracking-widest">{LAUNCH_CODE}</code>
          <span>— Plus que {LAUNCH_SPOTS_REMAINING} places</span>
          <span className="flex items-center gap-1 opacity-90">
            · Expire dans
            <span className="font-mono">{pad(h)}:{pad(m)}:{pad(s)}</span>
          </span>
        </div>

        {/* ══════════════════════════════════════════════════════════
            NAVBAR
        ══════════════════════════════════════════════════════════ */}
        <header className="relative z-40 flex items-center justify-between px-4 sm:px-8 py-4 border-b border-border/30 bg-background/90 backdrop-blur-md">
          <img src={logoGenie} alt="GENIE IA" className="h-9 w-auto" style={{ filter: "drop-shadow(0 0 10px rgba(82,87,216,0.4))" }} />
          <nav className="flex items-center gap-3">
            <Link to="/pricing" className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors">Tarifs</Link>
            <Link to="/guides" className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors">Guides</Link>
            {isAuthenticated ? (
              <Link to="/app/dashboard" className="text-sm font-semibold text-primary hover:brightness-110 transition-colors">
                Mon espace →
              </Link>
            ) : (
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Connexion</Link>
            )}
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-[0_0_15px_rgba(254,44,64,0.3)] hover:shadow-[0_0_25px_rgba(254,44,64,0.5)] transition-all active:scale-[0.97]"
              style={{ background: "hsl(var(--accent))" }}
            >
              {checkoutLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Démarrer gratuitement
            </button>
          </nav>
        </header>

        {/* ══════════════════════════════════════════════════════════
            SECTION 1 — HERO (100vh)
        ══════════════════════════════════════════════════════════ */}
        <section className="relative flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-4 sm:px-6 py-20 text-center overflow-hidden">
          {/* Animated grid background */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(82,87,216,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(82,87,216,0.8) 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
              animation: "grid-move 20s linear infinite",
            }}
          />
          {/* Ambient glow */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full pointer-events-none blur-3xl"
            style={{ background: "radial-gradient(ellipse, rgba(82,87,216,0.12) 0%, transparent 70%)" }} />

          {/* Headline */}
          <h1 className="relative text-5xl sm:text-6xl md:text-7xl font-black leading-[1.05] tracking-tight mb-5 max-w-3xl animate-slide-up">
            <span className="text-foreground">Formez-vous à l'IA.</span>
            <br />
            <span
              className="font-black"
              style={{
                background: "linear-gradient(135deg, #5257D8, #FE2C40)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Prouvez-le.
            </span>
          </h1>

          <p className="relative text-lg sm:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed animate-slide-up" style={{ animationDelay: "80ms" }}>
            La seule plateforme qui forme, évalue et certifie vos compétences IA.
            <br className="hidden sm:block" /> Pour les pros, les curieux, les PME.
          </p>

          {/* CTAs */}
          <div className="relative flex flex-col sm:flex-row gap-3 mb-16 animate-slide-up" style={{ animationDelay: "160ms" }}>
            {/* Primary CTA — shake on hover */}
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-white font-black text-base transition-all active:scale-[0.97]"
              style={{
                background: "hsl(var(--accent))",
                boxShadow: "0 0 20px rgba(254,44,64,0.35)",
              }}
              onMouseEnter={(e) => e.currentTarget.style.animation = "cta-shake 0.4s ease"}
              onMouseLeave={(e) => e.currentTarget.style.animation = ""}
            >
              {checkoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Démarrer gratuitement →
            </button>

            {/* Secondary CTA */}
            <Link
              to="/app/chat"
              className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-semibold text-base transition-all hover:bg-primary/10"
              style={{ border: "1px solid rgba(82,87,216,0.5)", color: "hsl(var(--primary))" }}
            >
              <Bot className="w-4 h-4" />
              Voir la démo KITT IA
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="relative flex flex-wrap items-center justify-center gap-5 text-xs text-muted-foreground animate-fade-in" style={{ animationDelay: "300ms" }}>
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-primary" /> Hébergement EU</span>
            <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-primary" /> RGPD natif</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-primary" /> Attestations vérifiables</span>
            <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-primary" /> Sans engagement</span>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION 2 — SOCIAL PROOF
        ══════════════════════════════════════════════════════════ */}
        <section className="relative z-10 px-4 sm:px-8 py-16 border-y border-border/20">
          <div className="max-w-5xl mx-auto">
            {/* Trusted by */}
            <div className="text-center mb-10">
              <p className="text-sm text-muted-foreground mb-5 uppercase tracking-widest font-medium">Utilisé par des équipes chez</p>
              <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
                {TRUSTED_BY.map((name) => (
                  <span key={name} className="text-sm font-semibold text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                    {name}
                  </span>
                ))}
              </div>
            </div>

            {/* Counter */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl glass">
                <span
                  ref={proRef}
                  className="text-3xl font-black tabular-nums"
                  style={{ color: "hsl(var(--primary))" }}
                >
                  {proCount}+
                </span>
                <span className="text-base font-semibold text-foreground">professionnels formés</span>
              </div>
            </div>

            {/* Testimonials */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {TESTIMONIALS.map((t) => (
                <div key={t.name} className="glass rounded-2xl p-6 hover-glow transition-all">
                  <p className="text-sm text-foreground leading-relaxed mb-5 italic">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))" }}
                    >
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.title} · {t.company}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION 3 — PROBLÈME
        ══════════════════════════════════════════════════════════ */}
        <section className="relative z-10 px-4 sm:px-8 py-20 bg-background">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-black text-foreground leading-tight">
                3 problèmes que<br />
                <span style={{ background: "linear-gradient(135deg, #FE2C40, #c41830)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  personne ne résout
                </span>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {PROBLEMS.map((p) => (
                <div key={p.title} className="glass rounded-2xl p-6 border border-accent/20 hover:border-accent/40 transition-all">
                  <p.icon className="w-6 h-6 mb-4" style={{ color: "hsl(var(--accent))" }} />
                  <h3 className="font-black text-foreground text-lg mb-2">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION 4 — SOLUTION
        ══════════════════════════════════════════════════════════ */}
        <section className="relative z-10 px-4 sm:px-8 py-20">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-black leading-tight">
                <span
                  style={{ background: "linear-gradient(135deg, #5257D8, #FE2C40)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
                >
                  GENIE IA règle tout ça.
                </span>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {SOLUTIONS.map((s) => (
                <div key={s.title} className="glass rounded-2xl p-6 border border-primary/20 hover:border-primary/40 transition-all hover-glow">
                  <s.icon className="w-6 h-6 mb-4" style={{ color: "#22C55E" }} />
                  <h3 className="font-black text-foreground text-lg mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION 5 — FEATURES
        ══════════════════════════════════════════════════════════ */}
        <section className="relative z-10 px-4 sm:px-8 py-20 bg-background/50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-black text-foreground">
                Tout ce qu'il vous faut.<br />
                <span
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-mid)))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
                >
                  Dans un seul outil.
                </span>
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map((f) => (
                <div key={f.title} className="glass rounded-2xl p-6 group hover:border-primary/40 hover-glow transition-all">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all group-hover:scale-110"
                    style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.2), hsl(var(--primary)/0.1))", border: "1px solid hsl(var(--primary)/0.2)" }}
                  >
                    <f.icon className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
                  </div>
                  <h3 className="font-bold text-foreground text-base mb-1.5">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>

            {/* CTA under features */}
            <div className="text-center mt-12">
              <button
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl text-white font-black text-lg transition-all active:scale-[0.97]"
                style={{ background: "hsl(var(--accent))", boxShadow: "0 0 25px rgba(254,44,64,0.35)" }}
              >
                {checkoutLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                Démarrer gratuitement →
              </button>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION 6 — EMAIL CAPTURE
        ══════════════════════════════════════════════════════════ */}
        <section className="relative z-10 px-4 sm:px-8 py-20">
          <div className="max-w-xl mx-auto text-center">
            {/* Glow behind */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-[500px] h-[300px] rounded-full blur-3xl opacity-10"
                style={{ background: "radial-gradient(ellipse, hsl(var(--primary)) 0%, transparent 70%)" }} />
            </div>
            <div className="relative">
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold text-white mb-6"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.8), hsl(var(--accent)/0.8))" }}
              >
                <Mail className="w-3.5 h-3.5" /> Gratuit
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-foreground mb-3">
                Recevez 3 prompts IA<br />gratuits par email
              </h2>
              <p className="text-muted-foreground mb-8">
                Prêts à l'emploi. Testés par des pros. Utiles dès aujourd'hui.
              </p>

              {emailDone ? (
                <div className="glass rounded-2xl p-6 border border-primary/30">
                  <CheckCircle className="w-8 h-8 mx-auto mb-3" style={{ color: "#22C55E" }} />
                  <p className="font-bold text-foreground">C'est dans votre boîte mail !</p>
                  <p className="text-sm text-muted-foreground mt-1">Vérifiez vos spams si besoin.</p>
                </div>
              ) : (
                <form onSubmit={handleEmailCapture} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    value={emailLead}
                    onChange={(e) => setEmailLead(e.target.value)}
                    placeholder="votre@email.pro"
                    required
                    className="flex-1 px-4 py-3.5 rounded-xl border border-border/60 bg-card/60 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all backdrop-blur-sm"
                  />
                  <button
                    type="submit"
                    disabled={emailLoading}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-white font-bold text-sm transition-all active:scale-[0.97] shrink-0"
                    style={{ background: "hsl(var(--accent))", boxShadow: "0 0 15px rgba(254,44,64,0.3)" }}
                  >
                    {emailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    Recevoir →
                  </button>
                </form>
              )}

              <p className="text-xs text-muted-foreground mt-4">
                Rejoignez {SOCIAL_PROOF_COUNT}+ professionnels. Zéro spam, désinscription en 1 clic.
              </p>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            FOOTER
        ══════════════════════════════════════════════════════════ */}
        <ProFooter />
      </div>

      {/* CTA shake keyframe */}
      <style>{`
        @keyframes cta-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-3px) rotate(-1deg); }
          40% { transform: translateX(3px) rotate(1deg); }
          60% { transform: translateX(-2px); }
          80% { transform: translateX(2px); }
        }
        @keyframes grid-move {
          0% { backgroundPosition: 0 0; }
          100% { backgroundPosition: 40px 40px; }
        }
      `}</style>
    </>
  );
}
