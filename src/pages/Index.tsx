/**
 * GENIE IA — Landing Page v6 — Polish Premium
 * Tunnel de vente : apprendre → agir → prouver → piloter
 */

import { useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  ArrowRight,
  BookOpen,
  CheckCircle,
  ChevronDown,
  FileCheck,
  FlaskConical,
  Loader2,
  Lock,
  Mail,
  MessageSquare,
  Mic,
  Shield,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
  X,
  Smartphone,
  BarChart3,
  Award,
  PlayCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import logoGenie from "@/assets/logo-genie.png";
import {
  softwareApplicationSchema,
  productSchema,
  organizationSchema,
  faqSchema,
} from "@/lib/seo";
import { ProFooter } from "@/components/ProFooter";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { LandingStats } from "@/components/LandingStats";

/* ─── Domaines réels ─────────────────────────────────────────── */
const DOMAINS = [
  {
    key: "ia_pro",
    icon: Zap,
    label: "IA Professionnelle",
    desc: "Prompting avancé, agents, automatisation. Passer de spectateur à opérateur IA.",
    color: "text-primary",
    accent: "hsl(var(--primary))",
    bg: "bg-primary/5 border-primary/20",
  },
  {
    key: "ia_perso",
    icon: Target,
    label: "IA Personnelle",
    desc: "Productivité, organisation, décisions augmentées. L'IA au service de votre quotidien.",
    color: "text-emerald-400",
    accent: "hsl(var(--emerald))",
    bg: "bg-emerald-500/5 border-emerald-500/20",
  },
  {
    key: "cyber",
    icon: Shield,
    label: "Cybersécurité",
    desc: "Phishing, hygiène numérique, cadre légal AI Act. Protégez-vous et votre équipe.",
    color: "text-accent",
    accent: "hsl(var(--accent))",
    bg: "bg-accent/5 border-accent/20",
  },
];

/* ─── Fonctionnalités réelles ────────────────────────────────── */
const FEATURES = [
  {
    icon: BookOpen,
    title: "Modules adaptatifs",
    problem: "Vous ne savez pas par où commencer",
    benefit: "Des parcours courts, concrets, calibrés à votre niveau et à votre métier.",
    cta: "Voir les modules",
    route: "/app/modules",
  },
  {
    icon: Target,
    title: "Missions quotidiennes",
    problem: "Vous apprenez mais n'agissez pas",
    benefit: "Chaque jour, une mission concrète à exécuter dans votre vrai contexte.",
    cta: "Voir les missions",
    route: "/app/today",
  },
  {
    icon: FlaskConical,
    title: "Labs pratiques",
    problem: "La théorie seule ne suffit pas",
    benefit: "3 labs live : phishing, cybersécurité, prompt engineering en situation réelle.",
    cta: "Explorer les labs",
    route: "/app/labs/prompt",
  },
  {
    icon: MessageSquare,
    title: "Copilote KITT",
    problem: "Pas de support quand vous êtes bloqué",
    benefit: "KITT répond en contexte, explique, reformule, guide. 24h/24, sans attente.",
    cta: "Parler à KITT",
    route: "/app/chat",
  },
  {
    icon: FileCheck,
    title: "Attestations vérifiables",
    problem: "Impossible de prouver votre progression",
    benefit: "Chaque module validé génère un PDF signé + QR de vérification publique.",
    cta: "Voir un exemple",
    route: "/verify/demo",
  },
  {
    icon: BarChart3,
    title: "Dashboard Manager",
    problem: "Le manager ne sait pas où en est l'équipe",
    benefit: "Taux de complétion, scores, alertes auto, rapport mensuel PDF — zéro intervention.",
    cta: "Vue Manager",
    route: "/pricing",
  },
];

/* ─── Étapes du mécanisme ─────────────────────────────────────── */
const STEPS = [
  {
    n: "01",
    icon: BookOpen,
    title: "Apprendre",
    desc: "Module adapté à votre niveau. Théorie essentielle, exemples concrets, 15 min max.",
    color: "text-primary",
    borderColor: "rgba(52,102,168,0.35)",
    glowColor: "rgba(52,102,168,0.08)",
  },
  {
    n: "02",
    icon: Target,
    title: "Agir",
    desc: "Mission du jour : appliquez dans votre vrai contexte. KITT vous accompagne si besoin.",
    color: "text-emerald-400",
    borderColor: "rgba(52,211,153,0.35)",
    glowColor: "rgba(52,211,153,0.06)",
  },
  {
    n: "03",
    icon: TrendingUp,
    title: "Progresser",
    desc: "Quiz de validation, score, feedback immédiat. Le niveau suivant se déverrouille.",
    color: "text-yellow-400",
    borderColor: "rgba(250,204,21,0.3)",
    glowColor: "rgba(250,204,21,0.05)",
  },
  {
    n: "04",
    icon: Award,
    title: "Prouver",
    desc: "Attestation PDF générée automatiquement dès le seuil atteint. Vérifiable en ligne.",
    color: "text-accent",
    borderColor: "rgba(212,32,53,0.35)",
    glowColor: "rgba(212,32,53,0.06)",
  },
];

/* ─── Objections ─────────────────────────────────────────────── */
const OBJECTIONS = [
  {
    q: "C'est quoi la différence avec une formation en ligne classique ?",
    a: "Une formation classique vous donne de la théorie. GENIE IA vous met en situation : missions du jour, labs live, copilote en temps réel. Vous agissez, pas juste vous écoutez.",
  },
  {
    q: "Je suis déjà à l'aise avec ChatGPT. C'est pour moi ?",
    a: "ChatGPT est un outil. GENIE IA vous apprend à le maîtriser professionnellement, à l'intégrer dans vos processus, à sécuriser son usage et à en prouver la valeur à votre employeur ou équipe.",
  },
  {
    q: "Les attestations sont-elles reconnues légalement ?",
    a: "Elles sont vérifiables via QR code public. Chaque attestation est horodatée, signée cryptographiquement et conforme au cadre AI Act 2026 (article 4 — formation des utilisateurs). Décision finale : à votre employeur.",
  },
  {
    q: "Et si l'équipe n'utilise pas la plateforme ?",
    a: "Le système autopilot détecte les retardataires et envoie des relances automatiques. Le manager reçoit un rapport mensuel PDF sans rien faire. Le taux de complétion se maintient sans micro-management.",
  },
  {
    q: "C'est combien exactement ?",
    a: "0€ pour commencer — compte gratuit, modules de base inclus. L'offre Pro démarre à 35€/mois (tarif de lancement), par organisation avec 25 sièges inclus. Résiliation en 2 clics, remboursement 30 jours.",
  },
];

/* ─── Section divider avec scan K2000 ───────────────────────── */
function ScanDivider({ color = "accent" }: { color?: "accent" | "primary" }) {
  return (
    <div className="flex items-center justify-center mb-7">
      <div
        className="h-px w-8 rounded-full"
        style={{
          background:
            color === "accent"
              ? "hsl(var(--accent))"
              : "hsl(var(--primary))",
        }}
      />
    </div>
  );
}

/* ─── FAQ Item ───────────────────────────────────────────────── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-lg overflow-hidden transition-colors duration-200"
      style={{
        background: "hsl(var(--card))",
        border: `1px solid ${open ? "hsl(var(--primary)/0.25)" : "hsl(var(--border))"}`,
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors duration-150">
          {q}
        </span>
        <ChevronDown
          className="w-4 h-4 shrink-0 transition-transform duration-200 ease-out"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            color: open ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
          }}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-200 ease-out"
        style={{ maxHeight: open ? "200px" : "0px" }}
      >
        <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

/* ─── KITT Bar — grammaire visuelle K2000 ───────────────────── */
function KittBar({
  active = false,
  size = "md",
}: {
  active?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const widths = { sm: "w-40", md: "w-56", lg: "w-72" };
  const heights = { sm: "h-8", md: "h-10", lg: "h-12" };

  return (
    <div
      className="relative inline-flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-xl select-none transition-all duration-500"
      style={{
        background: active
          ? "linear-gradient(160deg, rgba(212,32,53,0.06) 0%, hsl(var(--card)) 100%)"
          : "hsl(var(--card))",
        border: `1px solid ${active ? "rgba(212,32,53,0.3)" : "hsl(var(--border))"}`,
        boxShadow: active
          ? "0 0 32px rgba(212,32,53,0.12), inset 0 1px 0 rgba(212,32,53,0.08)"
          : "none",
      }}
    >
      {/* Corner brackets — signature K2000 */}
      {(["tl", "tr", "bl", "br"] as const).map((pos) => (
        <div
          key={pos}
          className="absolute w-2.5 h-2.5"
          style={{
            top: pos.startsWith("t") ? 4 : "auto",
            bottom: pos.startsWith("b") ? 4 : "auto",
            left: pos.endsWith("l") ? 6 : "auto",
            right: pos.endsWith("r") ? 6 : "auto",
            borderTop: pos.startsWith("t") ? "1px solid rgba(212,32,53,0.45)" : "none",
            borderBottom: pos.startsWith("b") ? "1px solid rgba(212,32,53,0.45)" : "none",
            borderLeft: pos.endsWith("l") ? "1px solid rgba(212,32,53,0.45)" : "none",
            borderRight: pos.endsWith("r") ? "1px solid rgba(212,32,53,0.45)" : "none",
            borderRadius:
              pos === "tl" ? "2px 0 0 0" :
              pos === "tr" ? "0 2px 0 0" :
              pos === "bl" ? "0 0 0 2px" : "0 0 2px 0",
          }}
        />
      ))}

      {/* Scanner bar */}
      <div className={`relative ${widths[size]} ${heights[size]} overflow-hidden rounded`}>
        {/* Dark track */}
        <div className="absolute inset-0" style={{ background: "rgba(212,32,53,0.04)" }} />
        {/* Center rail */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-px w-full"
          style={{ background: "rgba(212,32,53,0.07)" }}
        />
        {/* Sweep glow */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full"
          style={{
            width: "38%",
            background:
              "linear-gradient(90deg, transparent, rgba(212,32,53,0.5), #D42035, rgba(212,32,53,0.5), transparent)",
            animation: `kitt-scan ${active ? "1.5s" : "3.8s"} ease-in-out infinite alternate`,
            left: 0,
          }}
        />
        {/* Hot dot */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
          style={{
            background: "radial-gradient(circle, #fff 15%, #D42035 55%, transparent 100%)",
            boxShadow: active ? "0 0 10px rgba(212,32,53,0.9)" : "0 0 6px rgba(212,32,53,0.5)",
            animation: `kitt-scan ${active ? "1.5s" : "3.8s"} ease-in-out infinite alternate`,
            left: "calc(38% - 5px)",
          }}
        />
      </div>

      {/* Status label */}
      <span
        className="font-mono tracking-[0.22em] uppercase transition-all duration-300"
        style={{
          fontSize: 7,
          color: active ? "#D42035" : "rgba(255,255,255,0.18)",
          textShadow: active ? "0 0 8px rgba(212,32,53,0.6)" : "none",
          letterSpacing: "0.2em",
        }}
      >
        {active ? "KITT · ACTIF" : "EN VEILLE"}
      </span>
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────── */
export default function Index() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [emailLead, setEmailLead] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailDone, setEmailDone] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const { triggerInstall } = usePWAInstall();

  const handleCTA = () => {
    if (isAuthenticated) navigate("/app/dashboard");
    else navigate("/register");
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
      await supabase.from("email_leads").insert({ email, source: "landing_v6" });
      setEmailDone(true);
      toast({ title: "✅ Reçu", description: "On vous contacte sous 24h." });
    } catch {
      toast({ title: "Erreur", description: "Réessayez.", variant: "destructive" });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleInstall = async () => {
    const result = await triggerInstall();
    if (result === "ios") setShowIOSInstructions(true);
  };

  return (
    <>
      {/* iOS Install Modal */}
      {showIOSInstructions && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowIOSInstructions(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-card animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-base text-foreground">Installer sur iPhone</h3>
              </div>
              <button
                onClick={() => setShowIOSInstructions(false)}
                className="text-muted-foreground hover:text-foreground transition-colors focus-ring rounded"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ol className="space-y-3 text-sm text-muted-foreground">
              {[
                <span>Appuyez sur <strong className="text-foreground">Partager ⎙</strong> dans Safari</span>,
                <span>Appuyez sur <strong className="text-foreground">« Sur l'écran d'accueil »</strong></span>,
                <span>Appuyez sur <strong className="text-foreground">« Ajouter »</strong></span>,
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <button
              onClick={() => setShowIOSInstructions(false)}
              className="mt-5 w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition-all active:scale-[0.98] focus-ring"
            >
              Compris
            </button>
          </div>
        </div>
      )}

      <Helmet>
        <title>GENIE IA – Devenez autonome avec l'IA, la cybersécurité et le vibe coding</title>
        <meta
          name="description"
          content="GENIE IA : modules, missions, labs, copilote KITT et attestations vérifiables. Apprenez, agissez, progressez et prouvez votre maîtrise de l'IA. Conforme AI Act 2026."
        />
        <meta property="og:title" content="GENIE IA – Copilote d'autonomie IA" />
        <meta
          property="og:description"
          content="Modules IA & cybersécurité, missions quotidiennes, labs pratiques, attestations PDF vérifiables. Conforme AI Act 2026."
        />
        <meta property="og:image" content="https://genie-ai-mastery.lovable.app/logo-genie.png" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://genie-ai-mastery.lovable.app/" />
        <meta name="theme-color" content="#0A0C11" />
        <script type="application/ld+json">{JSON.stringify(organizationSchema())}</script>
        <script type="application/ld+json">{JSON.stringify(softwareApplicationSchema())}</script>
        <script type="application/ld+json">{JSON.stringify(productSchema())}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema())}</script>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden">

        {/* ══════ NAVBAR ══════ */}
        <header className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-8 h-14 border-b border-border/30 bg-background/92 backdrop-blur-lg">
          {/* Left: logo + nav links */}
          <div className="flex items-center gap-6">
            <img src={logoGenie} alt="GENIE IA" className="h-7 w-auto" />
            <nav className="hidden sm:flex items-center gap-5">
              <Link to="/pricing" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors duration-150">
                Tarifs
              </Link>
              <Link to="/guides" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors duration-150">
                Guides
              </Link>
            </nav>
          </div>
          {/* Right: auth + CTA */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <Link
                to="/app/dashboard"
                className="text-xs font-semibold text-primary hover:brightness-110 transition-colors"
              >
                Mon espace →
              </Link>
            ) : (
              <Link
                to="/login"
                className="hidden sm:block text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Connexion
              </Link>
            )}
            <button
              onClick={handleCTA}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white transition-all active:scale-[0.97] hover:brightness-110 focus-ring"
              style={{
                background: "hsl(var(--accent))",
                boxShadow: "0 2px 12px rgba(212,32,53,0.25)",
              }}
            >
              <Sparkles className="w-3 h-3" />
              Démarrer gratuitement
            </button>
          </div>
        </header>

        {/* ══════════════════ 1. HERO ══════════════════ */}
        <section className="relative flex flex-col items-center justify-center min-h-[calc(100svh-56px)] px-4 sm:px-6 py-16 sm:py-24 text-center overflow-hidden">
          {/* Precision grid — très subtil */}
          <div className="absolute inset-0 pointer-events-none precision-grid opacity-[0.02]" />
          {/* Ambient glow center — froid, bleu profond */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at center top, rgba(52,102,168,0.07) 0%, transparent 65%)",
              filter: "blur(40px)",
            }}
          />
          {/* K2000 scan — une seule ligne, signal précieux en haut */}
          <div
            className="absolute top-0 inset-x-0 h-px"
            style={{
              background: "linear-gradient(90deg, transparent 10%, rgba(212,32,53,0.5) 50%, transparent 90%)",
            }}
          />

          {/* Compliance badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/25 bg-primary/8 text-primary text-xs font-medium mb-7 animate-fade-in">
            <ShieldCheck className="w-3 h-3" />
            <span>Conforme AI Act 2026 · Hébergement UE</span>
          </div>

          {/* Headline — statut, tension, lisibilité */}
          <h1 className="relative text-[clamp(2.4rem,7vw,5rem)] font-black leading-[1.04] tracking-[-0.02em] mb-5 max-w-3xl animate-fade-in">
            <span className="block text-foreground">Maîtrisez l'IA.</span>
            <span
              className="block"
              style={{
                background: "linear-gradient(125deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Prouvez-le.
            </span>
          </h1>

          {/* Sous-titre — dense, factuel */}
          <p className="text-sm sm:text-base text-muted-foreground max-w-lg mb-3 leading-relaxed animate-fade-in">
            Modules IA & cybersécurité. Missions quotidiennes. Labs pratiques.{" "}
            <strong className="text-foreground font-semibold">Attestations vérifiables.</strong>{" "}
            Copilote KITT.
          </p>
          <p
            className="text-xs text-muted-foreground/55 mb-10 max-w-md animate-fade-in"
            style={{ animationDelay: "80ms" }}
          >
            Pas une formation molle. Pas un chatbot générique.
            Un système guidé pour apprendre, agir et prouver.
          </p>

          {/* CTAs */}
          <div
            className="flex flex-col sm:flex-row gap-2.5 mb-3 w-full sm:w-auto animate-fade-in"
            style={{ animationDelay: "120ms" }}
          >
            <button
              onClick={handleCTA}
              className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-white font-black text-sm transition-all active:scale-[0.97] hover:brightness-110 focus-ring cta-hover"
              style={{
                background: "hsl(var(--accent))",
                boxShadow: "0 2px 20px rgba(212,32,53,0.3), 0 1px 0 rgba(255,255,255,0.08) inset",
              }}
            >
              <Sparkles className="w-4 h-4" />
              Créer mon compte gratuit
            </button>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm transition-all hover:bg-primary/8 focus-ring"
              style={{
                border: "1px solid hsl(var(--primary)/0.35)",
                color: "hsl(var(--primary))",
              }}
            >
              <Users className="w-4 h-4" />
              Former mon équipe
            </Link>
          </div>

          {/* Micro-reassurance */}
          <p className="text-xs text-muted-foreground/50 mb-10">
            Gratuit pour commencer · Sans carte bancaire · Annulation en 2 clics
          </p>

          {/* Stats */}
          <div className="w-full flex justify-center mb-14">
            <LandingStats />
          </div>

          {/* KITT Hero widget — signature K2000 */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground/40 font-mono tracking-[0.18em] uppercase">
              <div
                className="w-1 h-1 rounded-full"
                style={{
                  background: "hsl(var(--accent))",
                  boxShadow: "0 0 5px hsl(var(--accent))",
                  animation: "pulse-slow 3s ease-in-out infinite",
                }}
              />
              Copilote KITT
            </div>
            <KittBar active size="lg" />
            <p className="text-xs text-muted-foreground/35 font-mono tracking-wide">
              Vocal & textuel · 24h/24
            </p>
          </div>
        </section>

        {/* ══════════════════ 2. PROBLÈME ══════════════════ */}
        <section
          className="py-20 px-4 sm:px-6 border-y border-border/30"
          style={{ background: "hsl(var(--card))" }}
        >
          <div className="max-w-4xl mx-auto text-center">
            <ScanDivider color="accent" />
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground mb-2 max-w-2xl mx-auto leading-snug">
              L'IA change tout.
            </h2>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-muted-foreground mb-10 max-w-2xl mx-auto">
              Mais la plupart des gens n'ont aucun système pour la maîtriser.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              {[
                {
                  symbol: "✕",
                  label: "Des outils dispersés",
                  desc: "ChatGPT, Copilot, Perplexity… sans cadre ni méthode, l'usage reste superficiel.",
                },
                {
                  symbol: "✕",
                  label: "Des formations sans suite",
                  desc: "Vous regardez des vidéos. Vous prenez des notes. Puis vous n'agissez pas.",
                },
                {
                  symbol: "✕",
                  label: "Aucune preuve exploitable",
                  desc: "Votre employeur ou votre équipe ne peut pas mesurer votre progression réelle.",
                },
              ].map((p) => (
                <div
                  key={p.label}
                  className="p-5 rounded-lg border border-border/50 bg-background/60"
                >
                  <div
                    className="text-sm font-black mb-2.5"
                    style={{ color: "hsl(var(--accent))" }}
                  >
                    {p.symbol}
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-1.5">{p.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════ 3. POUR QUI ══════════════════ */}
        <section className="py-20 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <ScanDivider color="primary" />
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground mb-2">
                Pour les professionnels qui veulent aller plus loin
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto text-sm">
                Solo ou en équipe — dès lors que prouver votre compétence IA compte.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {[
                {
                  icon: "👩‍💻",
                  title: "Professionnels",
                  desc: "Intégrez l'IA dans votre quotidien. Gagnez du temps mesurable. Documentez votre progression.",
                },
                {
                  icon: "🏢",
                  title: "Équipes & Managers",
                  desc: "Formez en autopilot. Suivez les taux de complétion. Rapports automatiques.",
                },
                {
                  icon: "🔒",
                  title: "Métiers sensibles",
                  desc: "Cybersécurité, conformité AI Act, phishing — formation certifiante.",
                },
                {
                  icon: "🚀",
                  title: "Freelances & Créateurs",
                  desc: "Positionnez-vous comme expert IA. Attestation = différenciation tangible.",
                },
              ].map((u) => (
                <button
                  key={u.title}
                  className="group p-5 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-primary/4 transition-all duration-200 text-left focus-ring card-hover"
                  onClick={handleCTA}
                >
                  <div className="text-xl mb-3">{u.icon}</div>
                  <h3 className="font-bold text-foreground text-sm mb-1.5">{u.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{u.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════ 4. MÉCANISME ══════════════════ */}
        <section
          className="py-20 px-4 sm:px-6 border-y border-border/30"
          style={{ background: "hsl(var(--card))" }}
        >
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <ScanDivider color="accent" />
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground mb-2">
                Comment GENIE IA vous rend autonome
              </h2>
              <p className="text-muted-foreground max-w-sm mx-auto text-sm">
                Un rail de progression — pas un catalogue infini.
              </p>
            </div>

            {/* Steps — rail visuel */}
            <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Connecting rail — desktop */}
              <div
                className="hidden lg:block absolute top-9 left-[calc(12.5%+20px)] right-[calc(12.5%+20px)] h-px"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(52,102,168,0.4) 0%, rgba(52,211,153,0.4) 33%, rgba(250,204,21,0.4) 66%, rgba(212,32,53,0.4) 100%)",
                }}
              />

              {STEPS.map((s) => (
                <div
                  key={s.n}
                  className="relative p-5 rounded-xl bg-background transition-all duration-200 hover-glow"
                  style={{
                    border: `1px solid ${s.borderColor}`,
                    background: `linear-gradient(160deg, ${s.glowColor} 0%, hsl(var(--background)) 60%)`,
                  }}
                >
                  {/* Step number */}
                  <div
                    className="absolute top-3.5 right-4 font-mono font-black opacity-10 leading-none"
                    style={{ fontSize: "2rem", color: s.borderColor.replace("0.35", "1").replace("0.3", "1") }}
                  >
                    {s.n}
                  </div>
                  {/* Icon */}
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center mb-4"
                    style={{ background: s.glowColor, border: `1px solid ${s.borderColor}` }}
                  >
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                  <h3 className={`font-black text-sm mb-1.5 ${s.color}`}>{s.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>

            <div className="text-center mt-8">
              <button
                onClick={handleCTA}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-bold text-sm transition-all hover:brightness-110 active:scale-[0.97] focus-ring"
                style={{ background: "hsl(var(--accent))" }}
              >
                Commencer le parcours <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* ══════════════════ 5. KITT SIGNATURE ══════════════════ */}
        <section className="py-20 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border)/0.6)",
                boxShadow: "0 0 40px rgba(212,32,53,0.04)",
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Left — KITT visuel */}
                <div
                  className="flex flex-col items-center justify-center gap-6 p-10 border-b md:border-b-0 md:border-r border-border/30 relative overflow-hidden"
                  style={{
                    background:
                      "linear-gradient(160deg, rgba(212,32,53,0.04) 0%, hsl(var(--card)) 60%)",
                  }}
                >
                  {/* Top scan accent */}
                  <div
                    className="absolute top-0 inset-x-0 h-px"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent 5%, rgba(212,32,53,0.45) 50%, transparent 95%)",
                    }}
                  />
                  <div className="text-center">
                    <div
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold mb-1"
                      style={{
                        background: "rgba(212,32,53,0.08)",
                        border: "1px solid rgba(212,32,53,0.25)",
                        color: "#D42035",
                        letterSpacing: "0.12em",
                      }}
                    >
                      SYSTÈME KITT · K2000
                    </div>
                  </div>
                  <KittBar active size="lg" />
                  <div className="flex items-center gap-5 text-xs text-muted-foreground/40 font-mono">
                    <span className="flex items-center gap-1.5">
                      <Mic className="w-3 h-3" /> Voix
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="w-3 h-3" /> Texte
                    </span>
                    <span className="flex items-center gap-1.5">
                      <PlayCircle className="w-3 h-3" /> 24h/24
                    </span>
                  </div>
                </div>

                {/* Right — Copy */}
                <div className="p-8 md:p-10 flex flex-col justify-center gap-5">
                  <h2 className="text-xl sm:text-2xl font-black text-foreground leading-snug">
                    KITT — votre copilote IA,<br className="hidden sm:block" /> pas un chatbot générique
                  </h2>
                  <div className="space-y-3.5">
                    {[
                      {
                        icon: MessageSquare,
                        text: "Répond en contexte sur les modules en cours.",
                      },
                      {
                        icon: Target,
                        text: "Suggère la prochaine mission selon votre niveau.",
                      },
                      {
                        icon: Mic,
                        text: "Interaction vocale native (push-to-talk).",
                      },
                      {
                        icon: Shield,
                        text: "Maîtrise les 3 domaines : IA Pro, IA Perso, Cyber.",
                      },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{
                            background: "rgba(212,32,53,0.08)",
                            border: "1px solid rgba(212,32,53,0.2)",
                          }}
                        >
                          <item.icon className="w-3.5 h-3.5 text-accent" />
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleCTA}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all hover:bg-accent/10 w-fit focus-ring"
                    style={{
                      border: "1px solid rgba(212,32,53,0.25)",
                      color: "hsl(var(--accent))",
                    }}
                  >
                    Parler à KITT <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════ 6. DOMAINES ══════════════════ */}
        <section
          className="py-20 px-4 sm:px-6 border-y border-border/30"
          style={{ background: "hsl(var(--card))" }}
        >
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <ScanDivider color="primary" />
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground mb-2">
                3 domaines. Une compétence complète.
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Chaque domaine couvre une zone de risque ou d'opportunité réelle.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {DOMAINS.map((d) => (
                <div
                  key={d.key}
                  className={`p-6 rounded-xl border bg-background ${d.bg} card-hover transition-all duration-200`}
                >
                  {/* Top accent bar */}
                  <div
                    className="absolute top-0 left-6 right-6 h-px rounded-full opacity-60"
                    style={{ background: d.accent }}
                  />
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center border mb-4 ${d.bg}`}
                  >
                    <d.icon className={`w-4.5 h-4.5 ${d.color}`} />
                  </div>
                  <h3 className={`font-black text-sm mb-2 ${d.color}`}>{d.label}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{d.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════ 7. FEATURES EN BÉNÉFICES ══════════════════ */}
        <section className="py-20 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <ScanDivider color="accent" />
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground mb-2">
                Chaque fonctionnalité résout un problème réel
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="group p-5 rounded-xl border border-border bg-card hover:border-primary/25 hover-glow transition-all duration-200 flex flex-col"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/8 border border-primary/15 flex items-center justify-center mb-4 flex-shrink-0">
                    <f.icon className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground text-sm mb-1">{f.title}</h3>
                  <p className="text-xs text-muted-foreground/55 mb-2 font-mono">{f.problem}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed flex-1">{f.benefit}</p>
                  <Link
                    to={f.route}
                    className="mt-3.5 text-xs text-primary font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  >
                    {f.cta} <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════ 8. APPRENDRE → AGIR → PROUVER ══════════════════ */}
        <section
          className="py-20 px-4 sm:px-6 border-y border-border/30"
          style={{ background: "hsl(var(--card))" }}
        >
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <ScanDivider color="primary" />
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground mb-2">
                Apprendre → Agir → Prouver
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Le seul tunnel qui transforme la compétence IA en actif professionnel.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Apprendre */}
              <div className="p-6 rounded-xl border border-primary/20 bg-background relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-0.5" style={{ background: "hsl(var(--primary))" }} />
                <BookOpen className="w-5 h-5 text-primary mb-4" />
                <h3 className="font-black text-foreground text-base mb-3">Apprendre</h3>
                <ul className="space-y-2.5">
                  {[
                    "Modules courts (15 min) par niveau",
                    "3 domaines : IA Pro, IA Perso, Cyber",
                    "Contenu actualisé selon l'actu IA",
                    "Quiz de validation à chaque étape",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Agir */}
              <div className="p-6 rounded-xl border bg-background relative overflow-hidden" style={{ borderColor: "rgba(52,211,153,0.25)" }}>
                <div className="absolute top-0 inset-x-0 h-0.5" style={{ background: "hsl(var(--emerald))" }} />
                <Target className="w-5 h-5 text-emerald-400 mb-4" />
                <h3 className="font-black text-foreground text-base mb-3">Agir</h3>
                <ul className="space-y-2.5">
                  {[
                    "Mission du jour dans votre vrai contexte",
                    "Labs live : phishing, cyber, prompt",
                    "KITT vous guide si vous êtes bloqué",
                    "Défi chronométré + retour immédiat",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Prouver */}
              <div className="p-6 rounded-xl border border-accent/20 bg-background relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-0.5" style={{ background: "hsl(var(--accent))" }} />
                <Award className="w-5 h-5 text-accent mb-4" />
                <h3 className="font-black text-foreground text-base mb-3">Prouver</h3>
                <ul className="space-y-2.5">
                  {[
                    "Attestation PDF auto-générée dès le seuil",
                    "QR code de vérification publique",
                    "Signature cryptographique horodatée",
                    "Conforme cadre AI Act 2026 (art. 4)",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle className="w-3 h-3 text-accent shrink-0 mt-0.5" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="text-center mt-8">
              <button
                onClick={handleCTA}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-white font-black text-sm transition-all hover:brightness-110 active:scale-[0.97] focus-ring"
                style={{
                  background: "hsl(var(--accent))",
                  boxShadow: "0 2px 20px rgba(212,32,53,0.2)",
                }}
              >
                <Sparkles className="w-4 h-4" />
                Démarrer le parcours
              </button>
            </div>
          </div>
        </section>

        {/* ══════════════════ 9. MANAGER / ÉQUIPE ══════════════════ */}
        <section className="py-20 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              {/* Copy */}
              <div>
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-5"
                  style={{
                    background: "hsl(var(--primary)/0.08)",
                    border: "1px solid hsl(var(--primary)/0.25)",
                    color: "hsl(var(--primary))",
                    letterSpacing: "0.06em",
                  }}
                >
                  PILOTAGE ÉQUIPE · B2B
                </div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground mb-4 leading-snug">
                  Le manager ne fait rien.<br />
                  <span className="text-primary">Il reçoit tout.</span>
                </h2>
                <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                  L'autopilot surveille les taux de complétion, relance les retardataires et génère les rapports. Le manager pilote. Il ne micro-manage pas.
                </p>
                <div className="space-y-3 mb-6">
                  {[
                    { icon: BarChart3, text: "Tableau de bord : taux de complétion, scores, alertes temps réel" },
                    { icon: Zap, text: "Campagnes auto si taux < 70% — relance email + in-app" },
                    { icon: FileCheck, text: "Rapport mensuel PDF auto : bilan formation + recommandations" },
                    { icon: Award, text: "Attestations envoyées automatiquement dès le seuil atteint" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-md bg-primary/8 border border-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <item.icon className="w-3 h-3 text-primary" />
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                    </div>
                  ))}
                </div>
                <Link
                  to="/pricing"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-all hover:bg-primary/8 focus-ring"
                  style={{
                    border: "1px solid hsl(var(--primary)/0.3)",
                    color: "hsl(var(--primary))",
                  }}
                >
                  Voir l'offre Équipe <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Mock dashboard — precision instrument */}
              <div className="space-y-3">
                <div
                  className="p-4 rounded-xl border border-border bg-card"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-muted-foreground/50 uppercase tracking-widest">Taux complétion</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-xs text-muted-foreground/50 font-mono">LIVE</span>
                    </div>
                  </div>
                  <div className="text-3xl font-black text-foreground mb-2 font-mono">78%</div>
                  <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "hsl(var(--border))" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: "78%", background: "hsl(var(--emerald))" }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground/35 mt-2 font-mono tracking-wide">données illustratives</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl border border-border bg-card">
                    <span className="text-xs font-mono text-muted-foreground/50 uppercase tracking-wider block mb-1.5">Attestations</span>
                    <div className="text-2xl font-black text-foreground font-mono">12</div>
                    <div className="text-xs mt-0.5" style={{ color: "hsl(var(--accent))" }}>auto-générées</div>
                    <p className="text-xs text-muted-foreground/30 mt-1.5 font-mono">illustratif</p>
                  </div>
                  <div className="p-4 rounded-xl border border-border bg-card">
                    <span className="text-xs font-mono text-muted-foreground/50 uppercase tracking-wider block mb-1.5">Score moy.</span>
                    <div className="text-2xl font-black text-foreground font-mono">84%</div>
                    <div className="text-xs text-primary mt-0.5">ce mois</div>
                    <p className="text-xs text-muted-foreground/30 mt-1.5 font-mono">illustratif</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-border bg-card flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "rgba(212,32,53,0.08)",
                      border: "1px solid rgba(212,32,53,0.2)",
                    }}
                  >
                    <FileCheck className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Rapport PDF mensuel</p>
                    <p className="text-xs text-muted-foreground/55">Envoyé automatiquement le 1er du mois</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════ 10. SÉCURITÉ / CONFORMITÉ ══════════════════ */}
        <section
          className="py-20 px-4 sm:px-6 border-y border-border/30"
          style={{ background: "hsl(var(--card))" }}
        >
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <ScanDivider color="accent" />
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground mb-2">
                Sécurité. Confidentialité. Conformité.
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Pas des arguments marketing. Des choix d'architecture.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  icon: Lock,
                  title: "RGPD natif",
                  desc: "Aucune donnée vendue. Effacement en 1 clic. DPA entreprises disponible.",
                  color: "text-primary",
                  border: "border-primary/20",
                  bg: "bg-primary/5",
                },
                {
                  icon: ShieldCheck,
                  title: "Conforme AI Act 2026",
                  desc: "Art. 4 — formation IA. Attestations reconnaissables par votre DPO.",
                  color: "text-emerald-400",
                  border: "border-emerald-500/20",
                  bg: "bg-emerald-500/5",
                },
                {
                  icon: Shield,
                  title: "Hébergement UE",
                  desc: "Infrastructure souveraine. Aucun transfert hors Union Européenne.",
                  color: "text-yellow-400",
                  border: "border-yellow-500/20",
                  bg: "bg-yellow-500/5",
                },
                {
                  icon: FileCheck,
                  title: "Attestations signées",
                  desc: "Signature cryptographique + QR public. Vérifiable sur /verify/:id.",
                  color: "text-accent",
                  border: "border-accent/20",
                  bg: "bg-accent/5",
                },
              ].map((s) => (
                <div
                  key={s.title}
                  className={`p-5 rounded-xl border ${s.border} ${s.bg} bg-background flex flex-col gap-3`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center border ${s.border}`}
                    style={{ background: "hsl(var(--card))" }}
                  >
                    <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                  </div>
                  <h3 className="font-bold text-foreground text-xs tracking-wide">{s.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════ 11. PRICING TEASER ══════════════════ */}
        <section className="py-20 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <ScanDivider color="primary" />
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground mb-2">
                Simple. Transparent. Sans surprise.
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Free */}
              <div className="p-6 rounded-xl border border-border bg-card flex flex-col">
                <div className="mb-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 font-mono">
                    Découverte
                  </p>
                  <div className="text-4xl font-black text-foreground font-mono">0€</div>
                  <p className="text-xs text-muted-foreground mt-1">Pour commencer sans engagement</p>
                </div>
                <ul className="space-y-2 flex-1 mb-5">
                  {["Chat KITT (limité)", "Modules de base", "1 agent IA"].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle className="w-3 h-3 text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className="block w-full text-center py-3 rounded-lg font-bold text-sm transition-all hover:bg-primary/8 focus-ring"
                  style={{
                    border: "1px solid hsl(var(--primary)/0.3)",
                    color: "hsl(var(--primary))",
                  }}
                >
                  Commencer gratuitement
                </Link>
              </div>

              {/* Pro */}
              <div
                className="p-6 rounded-xl flex flex-col relative"
                style={{
                  background: "hsl(var(--card))",
                  border: "2px solid hsl(var(--primary)/0.6)",
                  boxShadow: "0 0 32px rgba(52,102,168,0.1)",
                }}
              >
                <div
                  className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-black text-white"
                  style={{
                    background: "hsl(var(--accent))",
                    boxShadow: "0 2px 10px rgba(212,32,53,0.35)",
                  }}
                >
                  RECOMMANDÉ
                </div>
                <div className="mb-5 mt-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2 font-mono">Pro</p>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-black text-accent font-mono">35€</span>
                    <span className="text-base text-muted-foreground/40 line-through mb-0.5">59€</span>
                    <span className="text-xs text-muted-foreground mb-0.5">TTC/mois</span>
                  </div>
                  <p className="text-xs text-muted-foreground/60 mt-1 font-mono">par organisation · 25 sièges inclus</p>
                </div>
                <ul className="space-y-2 flex-1 mb-5">
                  {[
                    "Modules illimités + labs",
                    "KITT illimité (voix + texte)",
                    "Attestations PDF vérifiables",
                    "Dashboard Manager",
                    "Rapport mensuel auto",
                    "Support prioritaire",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-foreground">
                      <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={handleCTA}
                  className="w-full py-3.5 rounded-lg text-white font-black text-sm transition-all hover:brightness-110 active:scale-[0.98] focus-ring"
                  style={{ background: "hsl(var(--accent))" }}
                >
                  Activer Pro →
                </button>
              </div>
            </div>
            <p className="text-center mt-5">
              <Link
                to="/pricing"
                className="text-sm text-primary hover:brightness-110 transition-colors underline underline-offset-4"
              >
                Tous les détails et options Entreprise →
              </Link>
            </p>
          </div>
        </section>

        {/* ══════════════════ 12. OBJECTIONS ══════════════════ */}
        <section
          className="py-20 px-4 sm:px-6 border-y border-border/30"
          style={{ background: "hsl(var(--card))" }}
        >
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <ScanDivider color="primary" />
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground">
                Questions directes, réponses directes
              </h2>
            </div>
            <div className="space-y-2.5">
              {OBJECTIONS.map((o) => (
                <FaqItem key={o.q} q={o.q} a={o.a} />
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════ 13. CTA FINAL ══════════════════ */}
        <section className="py-24 px-4 sm:px-6 relative overflow-hidden">
          {/* K2000 scan — signal précieux */}
          <div
            className="absolute top-0 inset-x-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent 10%, rgba(212,32,53,0.45) 50%, transparent 90%)",
            }}
          />
          {/* Ambient glow */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[280px] pointer-events-none"
            style={{
              background: "radial-gradient(ellipse, rgba(52,102,168,0.05) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />

          <div className="max-w-xl mx-auto text-center relative">
            <div className="flex justify-center mb-8">
              <KittBar active size="lg" />
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground mb-3 leading-tight tracking-tight">
              Votre maîtrise de l'IA.
              <br />
              <span
                style={{
                  background:
                    "linear-gradient(125deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Prouvée. Vérifiable. Maintenant.
              </span>
            </h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
              Le premier module est disponible immédiatement. Le premier résultat est mesurable dès aujourd'hui.
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5 justify-center mb-3">
              <button
                onClick={handleCTA}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-white font-black text-sm transition-all hover:brightness-110 active:scale-[0.97] focus-ring cta-hover"
                style={{
                  background: "hsl(var(--accent))",
                  boxShadow: "0 2px 24px rgba(212,32,53,0.28)",
                }}
              >
                <Sparkles className="w-4 h-4" />
                Créer mon compte gratuit
              </button>
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm transition-all hover:bg-primary/8 focus-ring"
                style={{
                  border: "1px solid hsl(var(--primary)/0.35)",
                  color: "hsl(var(--primary))",
                }}
              >
                <Users className="w-4 h-4" />
                Former mon équipe
              </Link>
            </div>
            <p className="text-xs text-muted-foreground/45">
              Gratuit pour commencer · Sans carte bancaire · Résiliation en 2 clics · Remboursement 30 jours
            </p>

            {/* Email capture — discret */}
            <div className="mt-10 max-w-sm mx-auto">
              <p className="text-xs text-muted-foreground/45 mb-3">Ou demandez une démo équipe</p>
              {emailDone ? (
                <div className="flex items-center justify-center gap-2 text-sm text-emerald-400">
                  <CheckCircle className="w-4 h-4" /> On vous contacte sous 24h.
                </div>
              ) : (
                <form onSubmit={handleEmailCapture} className="flex gap-2">
                  <input
                    type="email"
                    value={emailLead}
                    onChange={(e) => setEmailLead(e.target.value)}
                    placeholder="votre@email.com"
                    className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={emailLoading}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all active:scale-[0.97] disabled:opacity-60 focus-ring"
                  >
                    {emailLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Mail className="w-3.5 h-3.5" />
                    )}
                    Envoyer
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        <ProFooter />
      </div>
    </>
  );
}
