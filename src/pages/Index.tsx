/**
 * GENIE IA — Landing Page v5
 * Tunnel de vente premium : apprendre → agir → prouver → piloter
 *
 * Structure :
 *  1. Hero ultra clair
 *  2. Problème du marché
 *  3. Pour qui
 *  4. Mécanisme (comment ça marche)
 *  5. KITT / K2000 signature
 *  6. Modules → Missions → Labs (fonctionnalités en bénéfices)
 *  7. Apprendre → Agir → Prouver
 *  8. Manager / Entreprise
 *  9. Preuves / Sécurité / Attestations
 * 10. Pricing teaser
 * 11. Objections
 * 12. CTA final
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
  PlayCircle,
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

/* ─── Domaines réels (issus de useModules) ──────────────────── */
const DOMAINS = [
  {
    key: "ia_pro",
    icon: Zap,
    label: "IA Professionnelle",
    desc: "Prompting avancé, agents, automatisation. Passer de spectateur à opérateur IA.",
    color: "text-primary",
    bg: "bg-primary/10 border-primary/20",
  },
  {
    key: "ia_perso",
    icon: Target,
    label: "IA Personnelle",
    desc: "Productivité, organisation, décisions augmentées. L'IA au service de votre vie.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  {
    key: "cyber",
    icon: Shield,
    label: "Cybersécurité",
    desc: "Phishing, hygiène numérique, cadre légal AI Act. Protégez-vous et votre équipe.",
    color: "text-accent",
    bg: "bg-accent/10 border-accent/20",
  },
];

/* ─── Fonctionnalités réelles du produit ────────────────────── */
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
    problem: "Les formations théoriques ne suffisent pas",
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
    problem: "Impossible de prouver votre montée en compétence",
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

/* ─── Objections réelles ─────────────────────────────────────── */
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

/* ─── Étapes du mécanisme ─────────────────────────────────────── */
const STEPS = [
  {
    n: "01",
    icon: BookOpen,
    title: "Apprendre",
    desc: "Module adapté à votre niveau. Théorie essentielle, exemples concrets, 15 min max.",
    color: "text-primary",
    border: "border-primary/30",
  },
  {
    n: "02",
    icon: Target,
    title: "Agir",
    desc: "Mission du jour : appliquez dans votre vrai contexte. KITT vous accompagne si besoin.",
    color: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  {
    n: "03",
    icon: TrendingUp,
    title: "Progresser",
    desc: "Quiz de validation, score, feedback immédiat. Le niveau suivant se déverrouille.",
    color: "text-yellow-400",
    border: "border-yellow-500/30",
  },
  {
    n: "04",
    icon: Award,
    title: "Prouver",
    desc: "Attestation PDF générée automatiquement dès le seuil atteint. Vérifiable en ligne.",
    color: "text-accent",
    border: "border-accent/30",
  },
];

/* ─── FAQ Item ───────────────────────────────────────────────── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-300 border border-border"
      style={{ background: "hsl(var(--card))" }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left group"
      >
        <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
          {q}
        </span>
        <ChevronDown
          className="w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-300"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            color: open ? "hsl(var(--primary))" : undefined,
          }}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: open ? "200px" : "0px" }}
      >
        <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

/* ─── KITT Static Visualizer (décoration landing) ─────────────── */
function KittBar({ active = false }: { active?: boolean }) {
  return (
    <div
      className="relative flex flex-col items-center gap-1 px-5 py-3 rounded-2xl select-none"
      style={{
        background: active
          ? "linear-gradient(145deg, rgba(212,32,53,0.07) 0%, hsl(var(--card)) 100%)"
          : "hsl(var(--card))",
        border: `1px solid ${active ? "rgba(212,32,53,0.35)" : "hsl(var(--border))"}`,
        boxShadow: active ? "0 0 28px rgba(212,32,53,0.15)" : "none",
      }}
    >
      {/* Corner decorations */}
      <div className="absolute top-1.5 left-2 w-2 h-2 border-l border-t rounded-tl" style={{ borderColor: "rgba(212,32,53,0.5)" }} />
      <div className="absolute top-1.5 right-2 w-2 h-2 border-r border-t rounded-tr" style={{ borderColor: "rgba(212,32,53,0.5)" }} />
      <div className="absolute bottom-1.5 left-2 w-2 h-2 border-l border-b rounded-bl" style={{ borderColor: "rgba(212,32,53,0.5)" }} />
      <div className="absolute bottom-1.5 right-2 w-2 h-2 border-r border-b rounded-br" style={{ borderColor: "rgba(212,32,53,0.5)" }} />

      {/* Animated bar */}
      <div className="relative w-56 h-10 overflow-hidden rounded">
        {/* Track */}
        <div
          className="absolute inset-0 rounded"
          style={{ background: "rgba(212,32,53,0.05)" }}
        />
        {/* Animated scan line */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-0.5 w-full"
          style={{ background: "rgba(212,32,53,0.08)" }}
        />
        {/* Core glow — CSS animated */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full"
          style={{
            width: "40%",
            background: "linear-gradient(90deg, transparent, rgba(212,32,53,0.6), #D42035, rgba(212,32,53,0.6), transparent)",
            animation: active
              ? "kitt-scan 1.4s ease-in-out infinite alternate"
              : "kitt-scan 3.5s ease-in-out infinite alternate",
            left: 0,
          }}
        />
        {/* Hot dot */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
          style={{
            background: "radial-gradient(circle, #fff 20%, #D42035 60%, transparent 100%)",
            boxShadow: "0 0 12px rgba(212,32,53,0.8)",
            animation: active
              ? "kitt-scan 1.4s ease-in-out infinite alternate"
              : "kitt-scan 3.5s ease-in-out infinite alternate",
            left: "calc(40% - 6px)",
          }}
        />
      </div>

      <span
        className="tracking-[0.2em] uppercase font-mono"
        style={{
          fontSize: 8,
          color: active ? "#D42035" : "rgba(255,255,255,0.2)",
          textShadow: active ? "0 0 8px rgba(212,32,53,0.7)" : "none",
        }}
      >
        {active ? "KITT ACTIF" : "EN VEILLE"}
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
  const { isInstallable, isIOS, triggerInstall } = usePWAInstall();
  const kittRef = useRef<HTMLDivElement>(null);

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
      await supabase.from("email_leads").insert({ email, source: "landing_v5" });
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
          className="fixed inset-0 z-[100] flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowIOSInstructions(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
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
                <span>Appuyez sur <strong className="text-foreground">Partager ⎙</strong> dans Safari</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">2</span>
                <span>Appuyez sur <strong className="text-foreground">« Sur l'écran d'accueil »</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">3</span>
                <span>Appuyez sur <strong className="text-foreground">« Ajouter »</strong></span>
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
        <title>GENIE IA – Devenez autonome avec l'IA, la cybersécurité et le vibe coding</title>
        <meta
          name="description"
          content="GENIE IA : modules, missions, labs, copilote KITT et attestations vérifiables. Apprenez, agissez, progressez et prouvez votre maîtrise de l'IA. Conforme AI Act 2026."
        />
        <meta property="og:title" content="GENIE IA – Copilote d'autonomie IA" />
        <meta
          property="og:description"
          content="Modules IA & cybersécurité, missions quotidiennes, labs pratiques, attestations PDF. Le système complet pour prouver votre compétence IA."
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

        {/* ══════ NAVBAR STICKY ══════ */}
        <header className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-8 py-3.5 border-b border-border/40 bg-background/90 backdrop-blur-md">
          <img src={logoGenie} alt="GENIE IA" className="h-8 w-auto" />
          <nav className="flex items-center gap-3">
            <Link to="/pricing" className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors">
              Tarifs
            </Link>
            <Link to="/guides" className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors">
              Guides
            </Link>
            {isAuthenticated ? (
              <Link to="/app/dashboard" className="text-sm font-semibold text-primary hover:brightness-110 transition-colors">
                Mon espace →
              </Link>
            ) : (
              <Link to="/login" className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Connexion
              </Link>
            )}
            <button
              onClick={handleCTA}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-glow hover:brightness-110 transition-all active:scale-[0.97]"
              style={{ background: "hsl(var(--accent))" }}
            >
              Démarrer gratuitement
            </button>
          </nav>
        </header>

        {/* ══════════════════ 1. HERO ══════════════════ */}
        <section className="relative flex flex-col items-center justify-center min-h-[calc(100vh-56px)] px-4 sm:px-6 py-20 text-center overflow-hidden">
          {/* Precision grid background */}
          <div className="absolute inset-0 pointer-events-none precision-grid opacity-[0.025]" />
          {/* Glow center */}
          <div
            className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full pointer-events-none blur-3xl"
            style={{ background: "radial-gradient(ellipse, rgba(52,102,168,0.08) 0%, transparent 70%)" }}
          />
          {/* KITT scan accent */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent 0%, rgba(212,32,53,0.4) 50%, transparent 100%)" }}
          />

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium mb-6">
            <ShieldCheck className="w-3 h-3" />
            Conforme AI Act 2026 · Données hébergées en UE
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.06] tracking-tight mb-5 max-w-4xl">
            <span className="text-foreground">Devenez vraiment</span>
            <br />
            <span
              className="font-black"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              autonome avec l'IA
            </span>
            <br />
            <span className="text-foreground">— et le prouver.</span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mb-4 leading-relaxed">
            Modules IA & cybersécurité. Missions quotidiennes. Labs pratiques.{" "}
            <strong className="text-foreground">Attestations vérifiables.</strong> Copilote KITT.
          </p>
          <p className="text-sm text-muted-foreground/70 mb-10 max-w-lg">
            Pas une formation molle. Pas un chatbot. Un système guidé pour apprendre, agir, progresser et prouver.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <button
              onClick={handleCTA}
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-white font-black text-base transition-all active:scale-[0.97] hover:brightness-110"
              style={{
                background: "hsl(var(--accent))",
                boxShadow: "0 0 24px rgba(212,32,53,0.25)",
              }}
            >
              <Sparkles className="w-4 h-4" />
              Créer mon compte gratuit
            </button>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-sm transition-all hover:bg-primary/10 border border-primary/30 text-primary"
            >
              <Users className="w-4 h-4" />
              Former mon équipe
            </Link>
          </div>
          {/* Micro-reassurance */}
          <p className="text-xs text-muted-foreground mb-10">
            Gratuit pour commencer · Aucune carte bancaire · Annulation en 2 clics
          </p>

          {/* Stats bloc */}
          <div className="w-full flex justify-center">
            <LandingStats />
          </div>

          {/* KITT Hero widget */}
          <div className="mt-12 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground/60 font-mono tracking-widest uppercase">
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              Votre copilote IA
            </div>
            <KittBar active />
            <p className="text-xs text-muted-foreground/50 font-mono tracking-wide">
              KITT — Copilote vocal & textuel 24h/24
            </p>
          </div>
        </section>

        {/* ══════════════════ 2. PROBLÈME DU MARCHÉ ══════════════════ */}
        <section className="py-20 px-4 sm:px-6 border-y border-border/40" style={{ background: "hsl(var(--card))" }}>
          <div className="max-w-4xl mx-auto text-center">
            {/* Scan line déco */}
            <div
              className="w-12 h-px mx-auto mb-6"
              style={{ background: "hsl(var(--accent))" }}
            />
            <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-8 max-w-2xl mx-auto">
              L'IA change tout. Mais la plupart des gens n'ont aucun système pour la maîtriser.
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-left">
              {[
                {
                  icon: "✗",
                  label: "Des outils dispersés",
                  desc: "ChatGPT, Copilot, Perplexity… sans cadre ni méthode, l'usage reste superficiel.",
                  color: "text-accent",
                },
                {
                  icon: "✗",
                  label: "Des formations sans suite",
                  desc: "Vous regardez des vidéos. Vous prenez des notes. Puis vous n'agissez pas. Et vous oubliez.",
                  color: "text-accent",
                },
                {
                  icon: "✗",
                  label: "Aucune preuve exploitable",
                  desc: "Votre employeur, vos clients ou votre équipe n'ont aucun moyen de mesurer votre progression réelle.",
                  color: "text-accent",
                },
              ].map((p) => (
                <div key={p.label} className="p-5 rounded-xl border border-border/60 bg-background/50">
                  <div className={`text-lg font-black mb-2 ${p.color}`}>{p.icon}</div>
                  <p className="text-sm font-semibold text-foreground mb-1">{p.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════ 3. POUR QUI ══════════════════ */}
        <section className="py-20 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="w-12 h-px bg-primary mx-auto mb-6" />
              <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-3">
                Pour les professionnels qui veulent aller plus loin que l'usage basique
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto text-sm">
                Solo ou en équipe, salarié ou indépendant — dès lors que vous avez besoin de prouver votre compétence IA.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  icon: "👩‍💻",
                  title: "Professionnels",
                  desc: "Intégrez l'IA dans votre quotidien. Gagnez du temps mesurable. Documentez votre progression.",
                },
                {
                  icon: "🏢",
                  title: "Équipes & Managers",
                  desc: "Formez votre équipe en autopilot. Suivez les taux de complétion. Recevez les rapports automatiquement.",
                },
                {
                  icon: "🔒",
                  title: "Métiers sensibles",
                  desc: "Cybersécurité, conformité AI Act, phishing — formation certifiante pour les profils exposés.",
                },
                {
                  icon: "🚀",
                  title: "Freelances & Créateurs",
                  desc: "Positionnez-vous comme expert IA. Proposez des livrables augmentés. Attestation = différenciation.",
                },
              ].map((u) => (
                <div
                  key={u.title}
                  className="p-5 rounded-xl border border-border bg-card hover:border-primary/30 transition-all cursor-pointer card-hover"
                  onClick={handleCTA}
                >
                  <div className="text-2xl mb-3">{u.icon}</div>
                  <h3 className="font-bold text-foreground text-sm mb-2">{u.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{u.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════ 4. MÉCANISME ══════════════════ */}
        <section
          className="py-20 px-4 sm:px-6 border-y border-border/40"
          style={{ background: "hsl(var(--card))" }}
        >
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="w-12 h-px bg-accent mx-auto mb-6" />
              <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-3">
                Comment GENIE IA vous rend autonome
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto text-sm">
                Un rail de progression structuré — pas un catalogue infini.
              </p>
            </div>
            {/* Steps */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 relative">
              {/* Connecting line (desktop) */}
              <div
                className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-px"
                style={{ background: "linear-gradient(90deg, hsl(var(--primary)/0.3), hsl(var(--accent)/0.3))" }}
              />
              {STEPS.map((s) => (
                <div
                  key={s.n}
                  className={`relative p-5 rounded-xl border bg-background ${s.border} hover:shadow-card transition-all`}
                >
                  <div className="absolute top-3 right-3 text-3xl font-black text-muted-foreground/10 font-mono">
                    {s.n}
                  </div>
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 border ${s.border}`}
                    style={{ background: "hsl(var(--card))" }}
                  >
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <h3 className={`font-black text-base mb-2 ${s.color}`}>{s.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
            {/* CTA inline */}
            <div className="text-center mt-8">
              <button
                onClick={handleCTA}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm transition-all hover:brightness-110 active:scale-[0.97]"
                style={{ background: "hsl(var(--accent))" }}
              >
                Commencer le parcours <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* ══════════════════ 5. KITT SIGNATURE ══════════════════ */}
        <section className="py-20 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="rounded-2xl border border-border/60 overflow-hidden" style={{ background: "hsl(var(--card))" }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                {/* Left — KITT visuel */}
                <div
                  className="flex flex-col items-center justify-center p-10 border-b md:border-b-0 md:border-r border-border/40 relative overflow-hidden"
                  style={{
                    background: "linear-gradient(145deg, rgba(212,32,53,0.04) 0%, hsl(var(--card)) 100%)",
                  }}
                >
                  {/* Scan line top */}
                  <div
                    className="absolute top-0 left-0 right-0 h-px"
                    style={{ background: "linear-gradient(90deg, transparent, rgba(212,32,53,0.5), transparent)" }}
                  />
                  <div className="mb-6 text-center">
                    <div
                      className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold mb-4"
                      style={{
                        background: "rgba(212,32,53,0.1)",
                        border: "1px solid rgba(212,32,53,0.3)",
                        color: "#D42035",
                      }}
                    >
                      SYSTÈME KITT — K2000
                    </div>
                  </div>
                  <KittBar active />
                  <div className="mt-6 flex items-center gap-4 text-xs text-muted-foreground/50 font-mono">
                    <span className="flex items-center gap-1">
                      <Mic className="w-3 h-3" /> Voix
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> Texte
                    </span>
                    <span className="flex items-center gap-1">
                      <PlayCircle className="w-3 h-3" /> 24h/24
                    </span>
                  </div>
                </div>
                {/* Right — Description */}
                <div className="p-8 flex flex-col justify-center">
                  <h2 className="text-2xl font-black text-foreground mb-4 leading-tight">
                    KITT — votre copilote IA, pas un chatbot générique
                  </h2>
                  <div className="space-y-4">
                    {[
                      {
                        icon: MessageSquare,
                        text: "Posez vos questions sur les modules en cours. KITT répond en contexte.",
                      },
                      {
                        icon: Target,
                        text: "KITT suggère la prochaine mission selon votre niveau et vos objectifs.",
                      },
                      {
                        icon: Mic,
                        text: "Interaction vocale native (push-to-talk) — idéal en mobilité.",
                      },
                      {
                        icon: Shield,
                        text: "Prompt engineering, cybersécurité, conformité — KITT maîtrise les 3 domaines.",
                      },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <item.icon className="w-3.5 h-3.5 text-accent" />
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleCTA}
                    className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm border border-accent/30 text-accent hover:bg-accent/10 transition-all w-fit"
                  >
                    Parler à KITT <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════ 6. DOMAINES ══════════════════ */}
        <section
          className="py-20 px-4 sm:px-6 border-y border-border/40"
          style={{ background: "hsl(var(--card))" }}
        >
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="w-12 h-px bg-primary mx-auto mb-6" />
              <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-3">
                3 domaines. Une compétence complète.
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Chaque domaine correspond à une zone de risque ou d'opportunité réelle pour votre activité.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {DOMAINS.map((d) => (
                <div
                  key={d.key}
                  className={`p-6 rounded-xl border bg-background ${d.bg} hover:shadow-card transition-all card-hover`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center border mb-4 ${d.bg}`}>
                    <d.icon className={`w-5 h-5 ${d.color}`} />
                  </div>
                  <h3 className={`font-black text-base mb-2 ${d.color}`}>{d.label}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{d.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════ 7. FONCTIONNALITÉS EN BÉNÉFICES ══════════════════ */}
        <section className="py-20 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="w-12 h-px bg-accent mx-auto mb-6" />
              <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-3">
                Chaque fonctionnalité résout un problème réel
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="group p-5 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-card transition-all flex flex-col"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 flex-shrink-0">
                    <f.icon className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground text-sm mb-1">{f.title}</h3>
                  <p className="text-xs text-muted-foreground/70 mb-2 italic">{f.problem}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed flex-1">{f.benefit}</p>
                  <Link
                    to={f.route}
                    className="mt-3 text-xs text-primary font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
          className="py-20 px-4 sm:px-6 border-y border-border/40"
          style={{ background: "hsl(var(--card))" }}
        >
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="w-12 h-px bg-primary mx-auto mb-6" />
              <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-3">
                Apprendre → Agir → Prouver
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Le seul tunnel qui transforme une compétence IA en actif professionnel.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Apprendre */}
              <div className="p-6 rounded-xl border border-primary/20 bg-background relative overflow-hidden">
                <div
                  className="absolute top-0 left-0 right-0 h-0.5"
                  style={{ background: "hsl(var(--primary))" }}
                />
                <BookOpen className="w-6 h-6 text-primary mb-4" />
                <h3 className="font-black text-foreground text-lg mb-3">Apprendre</h3>
                <ul className="space-y-2">
                  {[
                    "Modules courts (15 min) adaptés à votre niveau",
                    "3 domaines : IA Pro, IA Perso, Cybersécurité",
                    "Contenu mis à jour selon l'actualité IA",
                    "Quiz de validation à chaque étape",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              {/* Agir */}
              <div className="p-6 rounded-xl border border-emerald-500/20 bg-background relative overflow-hidden">
                <div
                  className="absolute top-0 left-0 right-0 h-0.5"
                  style={{ background: "hsl(158 50% 44%)" }}
                />
                <Target className="w-6 h-6 text-emerald-400 mb-4" />
                <h3 className="font-black text-foreground text-lg mb-3">Agir</h3>
                <ul className="space-y-2">
                  {[
                    "Mission du jour dans votre vrai contexte",
                    "Labs live : phishing, cyber, prompt",
                    "KITT vous guide si vous êtes bloqué",
                    "Défi chronométré + retour immédiat",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              {/* Prouver */}
              <div className="p-6 rounded-xl border border-accent/20 bg-background relative overflow-hidden">
                <div
                  className="absolute top-0 left-0 right-0 h-0.5"
                  style={{ background: "hsl(var(--accent))" }}
                />
                <Award className="w-6 h-6 text-accent mb-4" />
                <h3 className="font-black text-foreground text-lg mb-3">Prouver</h3>
                <ul className="space-y-2">
                  {[
                    "Attestation PDF auto-générée dès le seuil",
                    "QR code de vérification publique (/verify/:id)",
                    "Signature cryptographique horodatée",
                    "Conforme cadre AI Act 2026 (art. 4)",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="text-center mt-8">
              <button
                onClick={handleCTA}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white font-black text-base transition-all hover:brightness-110 active:scale-[0.97]"
                style={{
                  background: "hsl(var(--accent))",
                  boxShadow: "0 0 24px rgba(212,32,53,0.2)",
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div>
                <div
                  className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-5"
                  style={{
                    background: "hsl(var(--primary)/0.1)",
                    border: "1px solid hsl(var(--primary)/0.3)",
                    color: "hsl(var(--primary))",
                  }}
                >
                  PILOTAGE ÉQUIPE — B2B
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-4 leading-tight">
                  Le manager ne fait rien.<br />Il reçoit tout.
                </h2>
                <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                  L'autopilot GENIE IA surveille les taux de complétion, relance les retardataires et génère les rapports. Le manager pilote, pas il micro-manage.
                </p>
                <div className="space-y-3 mb-6">
                  {[
                    {
                      icon: BarChart3,
                      text: "Tableau de bord : taux de complétion, scores, alertes en temps réel",
                    },
                    {
                      icon: Zap,
                      text: "Campagnes automatiques si taux < 70% — relance email + in-app",
                    },
                    {
                      icon: FileCheck,
                      text: "Rapport mensuel PDF auto-généré : bilan formation + recommandations",
                    },
                    {
                      icon: Award,
                      text: "Attestations PDF envoyées automatiquement dès le seuil atteint",
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <item.icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                    </div>
                  ))}
                </div>
                <Link
                  to="/pricing"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm border border-primary/30 text-primary hover:bg-primary/10 transition-all"
                >
                  Voir l'offre Équipe <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="space-y-3">
                {/* Mock dashboard cards */}
                <div className="p-4 rounded-xl border border-border bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-muted-foreground/60 uppercase tracking-widest">Taux complétion</span>
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                  <div className="text-2xl font-black text-foreground mb-2">78%</div>
                  <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: "78%" }} />
                  </div>
                  <p className="text-xs text-muted-foreground/60 mt-1.5 font-mono">données illustratives</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl border border-border bg-card">
                    <span className="text-xs font-mono text-muted-foreground/60 uppercase tracking-widest block mb-1">Attestations</span>
                    <div className="text-xl font-black text-foreground">12</div>
                    <div className="text-xs text-accent mt-0.5">auto-générées</div>
                    <p className="text-xs text-muted-foreground/50 mt-1 font-mono">illustratif</p>
                  </div>
                  <div className="p-4 rounded-xl border border-border bg-card">
                    <span className="text-xs font-mono text-muted-foreground/60 uppercase tracking-widest block mb-1">Score moy.</span>
                    <div className="text-xl font-black text-foreground">84%</div>
                    <div className="text-xs text-primary mt-0.5">ce mois</div>
                    <p className="text-xs text-muted-foreground/50 mt-1 font-mono">illustratif</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-border bg-card flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
                    <FileCheck className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Rapport PDF mensuel</p>
                    <p className="text-xs text-muted-foreground/60">Envoyé automatiquement le 1er de chaque mois</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════ 10. PREUVES / SÉCURITÉ ══════════════════ */}
        <section
          className="py-20 px-4 sm:px-6 border-y border-border/40"
          style={{ background: "hsl(var(--card))" }}
        >
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="w-12 h-px bg-accent mx-auto mb-6" />
              <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-3">
                Sécurité, confidentialité, conformité
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Ces éléments ne sont pas des arguments marketing. Ce sont des choix d'architecture.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  icon: Lock,
                  title: "RGPD natif",
                  desc: "Aucune donnée vendue. Droit à l'effacement en 1 clic. DPA entreprises disponible.",
                  color: "text-primary",
                  border: "border-primary/20",
                },
                {
                  icon: ShieldCheck,
                  title: "Conforme AI Act 2026",
                  desc: "Article 4 — formation des utilisateurs IA. Attestations reconnaissables par votre DPO.",
                  color: "text-emerald-400",
                  border: "border-emerald-500/20",
                },
                {
                  icon: Shield,
                  title: "Hébergement UE",
                  desc: "Infrastructure souveraine. Aucun transfert hors Union Européenne.",
                  color: "text-yellow-400",
                  border: "border-yellow-500/20",
                },
                {
                  icon: FileCheck,
                  title: "Attestations signées",
                  desc: "Signature cryptographique + QR public. Vérifiable en ligne sur /verify/:id.",
                  color: "text-accent",
                  border: "border-accent/20",
                },
              ].map((s) => (
                <div
                  key={s.title}
                  className={`p-5 rounded-xl border ${s.border} bg-background flex flex-col gap-3`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center border ${s.border}`}
                    style={{ background: "hsl(var(--card))" }}
                  >
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                  <h3 className="font-bold text-foreground text-sm">{s.title}</h3>
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
              <div className="w-12 h-px bg-primary mx-auto mb-6" />
              <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-3">
                Simple. Transparent. Sans surprise.
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Free */}
              <div className="p-6 rounded-xl border border-border bg-card flex flex-col">
                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Découverte</p>
                  <div className="text-4xl font-black text-foreground">0€</div>
                  <p className="text-xs text-muted-foreground mt-1">Pour commencer sans engagement</p>
                </div>
                <ul className="space-y-2 flex-1 mb-5">
                  {[
                    "Chat KITT (limité)",
                    "Modules de base",
                    "1 agent IA",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className="block w-full text-center py-3 rounded-xl font-bold text-sm border border-primary/30 text-primary hover:bg-primary/10 transition-all"
                >
                  Commencer gratuitement
                </Link>
              </div>
              {/* Pro */}
              <div
                className="p-6 rounded-xl border-2 border-primary bg-card flex flex-col relative"
                style={{ boxShadow: "0 0 24px rgba(52,102,168,0.12)" }}
              >
                <div
                  className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-black text-white"
                  style={{ background: "hsl(var(--accent))", boxShadow: "0 0 10px rgba(212,32,53,0.3)" }}
                >
                  RECOMMANDÉ
                </div>
                <div className="mb-4 mt-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Pro</p>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-black text-accent">35€</span>
                    <span className="text-lg text-muted-foreground/50 line-through mb-0.5">59€</span>
                    <span className="text-sm text-muted-foreground mb-0.5">TTC/mois</span>
                  </div>
                  <p className="text-xs text-muted-foreground/70 mt-0.5 font-mono">par organisation · 25 sièges inclus</p>
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
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={handleCTA}
                  className="w-full py-3.5 rounded-xl text-white font-black text-sm transition-all hover:brightness-110 active:scale-[0.98]"
                  style={{ background: "hsl(var(--accent))" }}
                >
                  Activer Pro →
                </button>
              </div>
            </div>
            <div className="text-center mt-5">
              <Link to="/pricing" className="text-sm text-primary hover:brightness-110 transition-colors underline underline-offset-4">
                Voir tous les détails et options Entreprise →
              </Link>
            </div>
          </div>
        </section>

        {/* ══════════════════ 12. OBJECTIONS ══════════════════ */}
        <section
          className="py-20 px-4 sm:px-6 border-y border-border/40"
          style={{ background: "hsl(var(--card))" }}
        >
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <div className="w-12 h-px bg-primary mx-auto mb-6" />
              <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-3">
                Questions directes, réponses directes
              </h2>
            </div>
            <div className="space-y-3">
              {OBJECTIONS.map((o) => (
                <FaqItem key={o.q} q={o.q} a={o.a} />
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════ 13. CTA FINAL ══════════════════ */}
        <section className="py-24 px-4 sm:px-6 relative overflow-hidden">
          {/* Scan line top */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(212,32,53,0.4), transparent)" }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full pointer-events-none blur-3xl"
            style={{ background: "radial-gradient(ellipse, rgba(52,102,168,0.06) 0%, transparent 70%)" }}
          />

          <div className="max-w-2xl mx-auto text-center relative">
            <KittBar active />
            <h2 className="text-3xl sm:text-4xl font-black text-foreground mt-10 mb-4 leading-tight">
              Votre maîtrise de l'IA.<br />
              <span
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Prouvée. Vérifiable. Maintenant.
              </span>
            </h2>
            <p className="text-base text-muted-foreground mb-8 max-w-lg mx-auto leading-relaxed">
              Créez votre compte gratuit. Le premier module est disponible immédiatement. Le premier résultat est mesurable dès aujourd'hui.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
              <button
                onClick={handleCTA}
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-white font-black text-base transition-all hover:brightness-110 active:scale-[0.97]"
                style={{
                  background: "hsl(var(--accent))",
                  boxShadow: "0 0 28px rgba(212,32,53,0.25)",
                }}
              >
                <Sparkles className="w-4 h-4" />
                Créer mon compte gratuit
              </button>
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-sm border border-primary/30 text-primary hover:bg-primary/10 transition-all"
              >
                <Users className="w-4 h-4" />
                Former mon équipe
              </Link>
            </div>
            <p className="text-xs text-muted-foreground/60">
              Gratuit pour commencer · Aucune carte bancaire · Résiliation en 2 clics · Remboursement 30 jours
            </p>

            {/* Email capture discret */}
            <div className="mt-10 max-w-md mx-auto">
              <p className="text-xs text-muted-foreground/60 mb-3">Ou demandez une démo équipe</p>
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
                    className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                  />
                  <button
                    type="submit"
                    disabled={emailLoading}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all"
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
