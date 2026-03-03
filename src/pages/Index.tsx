import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import {
  AlertTriangle, CheckCircle, BookOpen, Bot, BarChart3,
  FileText, Users, Zap, Loader2, Mail, Star, ArrowRight,
  Shield, Mic, Globe, Lock, Download, Smartphone, X
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import logoGenie from "@/assets/logo-genie.png";
import { OfficeHoursCard } from "@/components/OfficeHoursCard";
import { softwareApplicationSchema, productSchema, organizationSchema, faqSchema } from "@/lib/seo";
import { ProFooter } from "@/components/ProFooter";
import { usePWAInstall } from "@/hooks/usePWAInstall";

/* ─── CONFIGURABLE CONSTANTS ─────────────────────────────────── */
const LAUNCH_DEADLINE = new Date("2026-04-15T23:59:59");
const LAUNCH_CODE = "LAUNCH40";
const LAUNCH_SPOTS_REMAINING = 23;

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
    title: "59€ TTC/mois",
    body: "Couverture légale totale pour votre organisation. 25 sièges inclus, Evidence Vault illimité. Sans engagement.",
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

/* ─── Main component ─────────────────────────────────────────── */
export default function Index() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [emailLead, setEmailLead] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailDone, setEmailDone] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [installOutcome, setInstallOutcome] = useState<string | null>(null);

  const { isInstallable, isInstalled, isIOS, triggerInstall } = usePWAInstall();

  const { h, m, s } = useCountdown(LAUNCH_DEADLINE);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) sessionStorage.setItem("genie_ref", ref.toUpperCase());
  }, [searchParams]);

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      navigate("/register?redirect=/pricing");
      return;
    }
    setCheckoutLoading(true);
    try {
      const referralCode = sessionStorage.getItem("genie_ref") ?? undefined;
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

  const handleInstall = async () => {
    const result = await triggerInstall();
    if (result === "ios") {
      setShowIOSInstructions(true);
    } else if (result === "accepted") {
      setInstallOutcome("accepted");
      toast({ title: "🎉 Application installée !", description: "GENIE IA est maintenant sur votre écran d'accueil." });
    } else if (result === "unavailable") {
      // Fallback: open install page
      window.open("/", "_blank");
    }
  };

  return (
    <>
      {/* iOS Install Instructions Modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowIOSInstructions(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-base">Installer sur iPhone</h3>
              </div>
              <button onClick={() => setShowIOSInstructions(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">1</span>
                <span>Appuyez sur le bouton <strong className="text-foreground">Partager</strong> <span className="text-lg">⎙</span> en bas de Safari</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">2</span>
                <span>Faites défiler et appuyez sur <strong className="text-foreground">« Sur l'écran d'accueil »</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">3</span>
                <span>Appuyez sur <strong className="text-foreground">« Ajouter »</strong> en haut à droite</span>
              </li>
            </ol>
            <button
              onClick={() => setShowIOSInstructions(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
            >
              Compris !
            </button>
          </div>
        </div>
      )}

      <Helmet>
        <title>GENIE IA – Formez-vous à l'IA. Prouvez-le.</title>
        <meta name="description" content="La seule plateforme qui forme, évalue et certifie vos compétences IA. Pour les pros, les curieux, les PME. 59€ TTC/mois." />
        <meta property="og:title" content="GENIE IA – Formez-vous à l'IA. Prouvez-le." />
        <meta property="og:description" content="Formations IA, Cyber, Vibe Coding. Attestations vérifiables. KITT IA copilote vocal. 59€ TTC/mois." />
        <meta property="og:image" content="https://genie-ai-mastery.lovable.app/logo-genie.png" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://genie-ai-mastery.lovable.app/" />
        <meta name="theme-color" content="#5257D8" />
        <script type="application/ld+json">{JSON.stringify(organizationSchema())}</script>
        <script type="application/ld+json">{JSON.stringify(softwareApplicationSchema())}</script>
        <script type="application/ld+json">{JSON.stringify(productSchema())}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema())}</script>
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

          {/* Install App Banner */}
          {!isInstalled && (isInstallable || isIOS) && installOutcome !== "accepted" && (
            <div
              className="relative w-full max-w-md mb-8 animate-slide-up"
              style={{ animationDelay: "200ms" }}
            >
              <button
                onClick={handleInstall}
                className="w-full flex items-center justify-between gap-3 px-5 py-3.5 rounded-2xl border border-primary/40 bg-primary/5 hover:bg-primary/10 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                    <Download className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-foreground">Télécharger votre Appli</p>
                    <p className="text-xs text-muted-foreground">
                      {isIOS ? "Ajouter à l'écran d'accueil (iOS)" : "Installer sur Android / Desktop"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Smartphone className="w-4 h-4 text-primary" />
                  <ArrowRight className="w-4 h-4 text-primary" />
                </div>
              </button>
            </div>
          )}

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
            SECTION 4b — ARRÊTEZ DE VOUS FAIRE ARNAQUER
        ══════════════════════════════════════════════════════════ */}
        <section className="relative z-10 px-4 sm:px-8 py-24 overflow-hidden">
          {/* precision grid bg */}
          <div className="absolute inset-0 precision-grid opacity-[0.025] pointer-events-none" />
          {/* cold steel left-border accent */}
          <div className="absolute left-0 top-16 bottom-16 w-px" style={{ background: "linear-gradient(to bottom, transparent, hsl(var(--accent)/0.6), transparent)" }} />

          <div className="max-w-5xl mx-auto relative">
            {/* Label chip */}
            <div className="flex items-center gap-3 mb-8">
              <div
                className="inline-flex items-center gap-2 px-3 py-1 text-xs font-bold tracking-widest uppercase data-strip"
                style={{
                  background: "hsl(var(--accent)/0.08)",
                  border: "1px solid hsl(var(--accent)/0.3)",
                  color: "hsl(var(--accent))",
                }}
              >
                ▮ ANALYSE DE MARCHÉ
              </div>
            </div>

            {/* H2 — aggressive */}
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black leading-[1.02] tracking-tight mb-8 max-w-3xl">
              <span className="text-foreground">Arrêtez de vous</span>
              <br />
              <span style={{
                background: "linear-gradient(135deg, hsl(var(--accent)), hsl(354 65% 36%))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                faire arnaquer.
              </span>
            </h2>

            {/* Body copy — direct, unfiltered */}
            <div
              className="glass rounded-sm p-8 mb-12 max-w-3xl"
              style={{ borderLeft: "3px solid hsl(var(--accent)/0.6)" }}
            >
              <p className="text-base sm:text-lg text-foreground/90 leading-relaxed mb-4">
                Le marché regorge de pseudo-formateurs IA vendant des slides obsolètes à prix d'or.
              </p>
              <p className="text-base sm:text-lg font-black text-foreground leading-relaxed mb-4">
                GENIE IA est une <span style={{ color: "hsl(var(--primary))" }}>machine de guerre autonome.</span>
              </p>
              <p className="text-base text-muted-foreground leading-relaxed">
                Nous ne vendons pas des formations. Nous vendons la{" "}
                <span className="text-foreground font-semibold">conformité légale instantanée</span>{" "}
                et des{" "}
                <span className="text-foreground font-semibold">preuves de compétences mathématiquement vérifiables</span>{" "}
                pour vos équipes.
              </p>
            </div>

            {/* 3 Targets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
              {[
                {
                  label: "DIRIGEANTS",
                  metric: "0",
                  unit: "risque légal",
                  headline: "Zéro exposition.",
                  body: "NIS2, RGPD, AI Act — votre organisation est blindée. Attestations auditables, trail complet, conformité prouvable en 48h.",
                  icon: Shield,
                  color: "hsl(var(--primary))",
                },
                {
                  label: "EMPLOYÉS",
                  metric: "∞",
                  unit: "disponibilité",
                  headline: "Tuteur infaillible.",
                  body: "KITT IA répond à chaque question, à 3h du matin comme en réunion. Jamais fatigué. Jamais obsolète. Toujours aligné à votre niveau réel.",
                  icon: Bot,
                  color: "hsl(var(--emerald))",
                },
                {
                  label: "ENTREPRISES",
                  metric: "−80%",
                  unit: "vs consultant",
                  headline: "Remplacement des consultants.",
                  body: "Fini les missions à 1 500€/jour pour un PowerPoint. GENIE IA fait le travail de structuration, formation et certification en continu.",
                  icon: BarChart3,
                  color: "hsl(var(--warning))",
                },
              ].map(({ label, metric, unit, headline, body, icon: Icon, color }) => (
                <div
                  key={label}
                  className="group bg-background p-8 flex flex-col gap-5 transition-colors hover:bg-card cursor-default"
                >
                  {/* Top line */}
                  <div className="flex items-center justify-between">
                    <span className="data-strip text-xs tracking-widest" style={{ color: "hsl(var(--muted-foreground))" }}>{label}</span>
                    <Icon className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" style={{ color }} />
                  </div>

                  {/* Big metric */}
                  <div>
                    <span
                      className="text-5xl font-black tabular-nums leading-none"
                      style={{ fontFamily: "'JetBrains Mono', monospace", color }}
                    >
                      {metric}
                    </span>
                    <span className="block text-xs text-muted-foreground data-strip mt-1">{unit}</span>
                  </div>

                  {/* Headline + body */}
                  <div>
                    <h3 className="text-base font-black text-foreground mb-2">{headline}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                  </div>

                  {/* Bottom border pulse */}
                  <div
                    className="h-px w-0 group-hover:w-full transition-all duration-500"
                    style={{ background: color }}
                  />
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
            OFFICE HOURS
        ══════════════════════════════════════════════════════════ */}
        <section className="relative py-20 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <OfficeHoursCard />
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
