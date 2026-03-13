/**
 * Pricing — Formetoialia
 *
 * Promesse alignée avec la landing :
 * Devenir autonome avec l'IA, la cybersécurité et le vibe coding,
 * grâce à Genie, des modules, des labs, des attestations et un pilotage équipe.
 *
 * Règles :
 * - Zéro faux sentiment d'urgence
 * - Zéro KPI inventé
 * - Données illustratives clairement signalées
 * - Pricing réel conservé (35€ launch / 59€ standard / 25 sièges)
 */
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Check,
  X,
  Loader2,
  Shield,
  ChevronDown,
  Zap,
  BookOpen,
  FlaskConical,
  FileCheck,
  Users,
  BarChart3,
  MessageSquare,
  Award,
  Lock,
  ArrowRight,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useAnalytics } from "@/hooks/useAnalytics";
import { productSchema, organizationSchema } from "@/lib/seo";
import { ProFooter } from "@/components/ProFooter";
import logoGenie from "@/assets/logo-genie.png";

/* ─── Types ──────────────────────────────────────────────────── */
interface LaunchData {
  launch_price_active: boolean;
  spots_remaining: number;
}

/* ─── KITT scanner minimal ───────────────────────────────────── */
function KittDot() {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full bg-accent align-middle"
      style={{ boxShadow: "0 0 6px hsl(var(--accent))" }}
    />
  );
}

/* ─── Séparateur scan K2000 ──────────────────────────────────── */
function ScanLine() {
  return (
    <div className="relative flex items-center gap-3 my-2">
      <div className="flex-1 h-px bg-border/40" />
      <KittDot />
      <div className="flex-1 h-px bg-border/40" />
    </div>
  );
}

/* ─── Données plan — LIBRE ───────────────────────────────────── */
const FREE_ITEMS: { label: string; included: boolean; note?: string }[] = [
  { label: "Chat KITT — 2 messages/jour", included: true },
  { label: "Accès aux modules publics", included: true },
  { label: "Découverte des labs (lecture seule)", included: true },
  { label: "Création de compte & profil", included: true },
  { label: "Missions quotidiennes", included: false },
  { label: "Labs interactifs (Phishing, Prompt, Cyber)", included: false },
  { label: "Attestations PDF vérifiables", included: false },
  { label: "Dashboard équipe & pilotage manager", included: false },
  { label: "Support prioritaire", included: false },
];

/* ─── Données plan — PRO ─────────────────────────────────────── */
const PRO_SECTIONS: {
  heading: string;
  icon: React.ElementType;
  items: string[];
}[] = [
  {
    heading: "Apprendre",
    icon: BookOpen,
    items: [
      "Modules complets : IA Pro, IA Perso, Cybersécurité",
      "Missions quotidiennes guidées par KITT",
      "Quiz adaptatifs et suivi de progression",
    ],
  },
  {
    heading: "Agir",
    icon: FlaskConical,
    items: [
      "Lab Phishing — détection et simulation",
      "Prompt Lab — prompting avancé et évaluation",
      "Cyber Lab — hygiène numérique pratique",
      "Chat KITT illimité (500 messages/jour)",
    ],
  },
  {
    heading: "Prouver",
    icon: FileCheck,
    items: [
      "Attestations PDF avec signature numérique",
      "QR code de vérification publique",
      "Historique de progression exportable",
    ],
  },
  {
    heading: "Piloter",
    icon: BarChart3,
    items: [
      "Dashboard manager — suivi équipe jusqu'à 25 membres",
      "Vue d'ensemble des progressions et lacunes",
      "Rapports automatisés (fonctionnalité en cours de déploiement)",
      "Gestion des sièges et invitation des membres",
    ],
  },
];

/* ─── FAQ ────────────────────────────────────────────────────── */
const FAQ = [
  {
    q: "Qu'est-ce que Formetoialia concrètement ?",
    a: "Un système guidé de montée en compétence IA. Il combine un copilote conversationnel (Genie), des modules structurés, des labs pratiques et des attestations vérifiables. Ce n'est pas un chatbot généraliste, c'est un parcours orienté autonomie.",
  },
  {
    q: "Genie, c'est quoi exactement ?",
    a: "Genie est le copilote IA intégré à la plateforme. Il guide vos sessions, répond à vos questions sur vos modules en cours, suggère des missions et s'adapte à votre niveau déclaré lors de l'onboarding.",
  },
  {
    q: "Que contiennent les labs ?",
    a: "Trois labs pratiques : détection de phishing (Phishing Lab), prompting avancé (Prompt Lab) et hygiène numérique (Cyber Lab). Ce sont des environnements interactifs, pas des vidéos.",
  },
  {
    q: "Les attestations sont-elles reconnues légalement ?",
    a: "Les attestations Formetoialia sont des preuves internes de compétences, vérifiables via QR code. Elles ne sont pas équivalentes à des certifications reconnues par des organismes externes (ANSSI, etc.). Leur valeur est celle d'une preuve documentée de formation, utile dans un contexte professionnel ou de conformité interne.",
  },
  {
    q: "Le plan inclut combien de personnes ?",
    a: "Un abonnement Pro couvre une organisation jusqu'à 25 membres. Au-delà, contactez-nous pour un devis entreprise.",
  },
  {
    q: "Puis-je annuler librement ?",
    a: "Oui. Résiliation depuis votre espace en quelques clics, effective à la fin de la période en cours. Garantie satisfait ou remboursé 30 jours, sans condition.",
  },
  {
    q: "Y a-t-il une période d'essai ?",
    a: "L'abonnement Pro inclut 14 jours d'essai. Aucune carte requise pour démarrer l'essai.",
  },
  {
    q: "Je suis débutant total, c'est fait pour moi ?",
    a: "Oui. L'onboarding adapte le parcours à votre niveau. Genie vous accompagne dès la première session. Vous n'avez pas besoin de savoir programmer.",
  },
];

/* ─── Accordion FAQ ──────────────────────────────────────────── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-foreground leading-snug">
          {q}
        </span>
        <ChevronDown
          className="w-4 h-4 shrink-0 text-muted-foreground mt-0.5 transition-transform duration-200"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            color: open ? "hsl(var(--primary))" : undefined,
          }}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-200 ease-in-out"
        style={{ maxHeight: open ? "300px" : "0px" }}
      >
        <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
          {a}
        </p>
      </div>
    </div>
  );
}

/* ─── Composant ProSection ───────────────────────────────────── */
function ProSection({
  heading,
  icon: Icon,
  items,
}: {
  heading: string;
  icon: React.ElementType;
  items: string[];
}) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center gap-2 mb-2">
        <Icon
          className="w-3.5 h-3.5 shrink-0"
          style={{ color: "hsl(var(--primary))" }}
        />
        <span
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: "hsl(var(--primary))" }}
        >
          {heading}
        </span>
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm">
            <Check
              className="w-3.5 h-3.5 shrink-0 mt-0.5"
              style={{ color: "hsl(142 71% 45%)" }}
            />
            <span className="text-foreground/90 leading-snug">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────── */
export default function Pricing() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [activationSuccess, setActivationSuccess] = useState(false);
  const { track } = useAnalytics();

  useEffect(() => {
    track("pricing_viewed");
  }, []);

  // Prix unique fixe : 59€ TTC/mois — aucun tier, aucune promo
  const LAUNCH_PRICE_ACTIVE = false;
  const currentPrice = 59;

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "create-portal-session"
      );
      if (error || data?.error) throw new Error(data?.error ?? "Erreur portail");
      window.location.href = data.url;
    } catch (err) {
      toast({
        title: "Erreur",
        description:
          err instanceof Error ? err.message : "Impossible d'ouvrir le portail.",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCheckout = async () => {
    // Passe E : mutex checkout — double-clic impossible
    if (checkoutLoading) return;
    if (!isAuthenticated) {
      navigate("/register?redirect=/pricing");
      return;
    }
    setCheckoutLoading(true);
    track("checkout_started");
    try {
      const referralCode =
        sessionStorage.getItem("genie_ref") ?? undefined;
      const { data, error } = await supabase.functions.invoke(
        "create-checkout",
        {
          body: {
            seats: 1,
            ...(referralCode ? { referral_code: referralCode } : {}),
          },
        }
      );
      if (error || data?.error)
        throw new Error(data?.error ?? "Erreur checkout");
      // Passe E : stocker flag pending pour réconciliation post-redirect
      sessionStorage.setItem("genie_payment_pending", "1");
      window.location.href = data.url;
    } catch (err) {
      toast({
        title: "Erreur",
        description:
          err instanceof Error
            ? err.message
            : "Impossible de créer la session.",
        variant: "destructive",
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const formatCode = (val: string) => {
    const raw = val
      .replace(/[^A-Z0-9]/gi, "")
      .toUpperCase()
      .slice(0, 14);
    return [raw.slice(0, 5), raw.slice(5, 9), raw.slice(9, 13)]
      .filter(Boolean)
      .join("-");
  };

  const handleActivateCode = async () => {
    if (!accessCode.trim()) return;
    if (!isAuthenticated) {
      navigate("/register?redirect=/pricing");
      return;
    }
    setCodeLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("redeem-code", {
        body: { code: accessCode.replace(/-/g, "").trim() },
      });
      if (error || data?.error)
        throw new Error(data?.error ?? "Code invalide");
      setActivationSuccess(true);
      toast({ title: "✅ Accès Pro activé !", description: data.message });
      setTimeout(() => navigate("/app/dashboard"), 2000);
    } catch (err) {
      toast({
        title: "Code invalide",
        description:
          err instanceof Error
            ? err.message
            : "Ce code est invalide ou expiré.",
        variant: "destructive",
      });
    } finally {
      setCodeLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Tarifs Formetoialia — Devenez autonome avec l'IA</title>
        <meta
          name="description"
          content="Formetoialia Pro à partir de 35€ TTC/mois — modules, labs, copilote Genie, attestations vérifiables et dashboard équipe. Essai 14 jours, sans carte requise."
        />
        <link rel="canonical" href="https://formetoialia.com/pricing" />
        <meta
          property="og:title"
          content="Tarifs Formetoialia — Modules, Labs, Attestations"
        />
        <meta
          property="og:description"
          content="Autonomie IA, cybersécurité, vibe coding. Essai 14 jours gratuit. Jusqu'à 25 membres."
        />
        <meta
          property="og:image"
          content="https://formetoialia.com/logo-genie.png"
        />
        <script type="application/ld+json">
          {JSON.stringify(productSchema())}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(organizationSchema())}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background text-foreground flex flex-col">
        {/* ── Navbar ───────────────────────────────────────────── */}
        <header
          className="sticky top-0 z-50 border-b px-4 sm:px-8 py-3 flex items-center justify-between"
          style={{
            background: "hsl(var(--background) / 0.92)",
            backdropFilter: "blur(12px)",
            borderColor: "hsl(var(--border) / 0.4)",
          }}
        >
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logoGenie} alt="Formetoialia" className="h-8 w-auto"
              style={{ filter: "drop-shadow(0 0 6px hsl(var(--primary) / 0.35))" }} />
          </Link>
          <nav className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Se connecter</Link>
            <Link to="/register" className="px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-[0.98]" style={{ background: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}>Démarrer gratuitement</Link>
          </nav>
        </header>

        <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-14 sm:py-20">
          {/* ── Plans ────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-7 items-start mb-12">

            {/* Découverte */}
            <div
              className="rounded-2xl p-6 sm:p-7 flex flex-col"
              style={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
              }}
            >
              <div className="mb-5">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  Découverte
                </p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-black text-foreground">
                    0€
                  </span>
                  <span className="text-muted-foreground text-sm mb-1.5">
                    /mois
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Pour explorer la plateforme sans engagement.
                </p>
              </div>

              <ul className="space-y-2.5 mb-7 flex-1">
                {FREE_ITEMS.map((f) => (
                  <li key={f.label} className="flex items-start gap-2.5 text-sm">
                    {f.included ? (
                      <Check
                        className="w-4 h-4 shrink-0 mt-0.5"
                        style={{ color: "hsl(142 71% 45%)" }}
                      />
                    ) : (
                      <X className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground/30" />
                    )}
                    <span
                      className={
                        f.included
                          ? "text-foreground/90"
                          : "text-muted-foreground/50"
                      }
                    >
                      {f.label}
                      {f.note && (
                        <span className="ml-1 text-xs text-muted-foreground/50">
                          ({f.note})
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                to="/register"
                className="block w-full text-center py-3 rounded-xl font-bold text-sm transition-all hover:bg-primary/10"
                style={{
                  border: "1px solid hsl(var(--primary))",
                  color: "hsl(var(--primary))",
                }}
              >
                Commencer gratuitement
              </Link>
            </div>

            {/* Pro */}
            <div
              className="relative rounded-2xl p-6 sm:p-7 flex flex-col"
              style={{
                background: "hsl(var(--card))",
                border: "2px solid hsl(var(--primary))",
                boxShadow: "0 0 28px hsl(var(--primary) / 0.12)",
                transform: "scale(1.01)",
                transformOrigin: "top center",
              }}
            >
              {/* Badge */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <div
                  className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black"
                  style={{
                    background: "hsl(var(--accent))",
                    color: "hsl(var(--accent-foreground))",
                    boxShadow: "0 0 10px hsl(var(--accent) / 0.4)",
                  }}
                >
                  <KittDot />
                  RECOMMANDÉ
                </div>
              </div>

              {/* Prix */}
              <div className="mb-5 mt-3">
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-2"
                  style={{ color: "hsl(var(--primary))" }}
                >
                  Pro
                </p>
                <div className="flex items-end gap-2 mb-0.5 flex-wrap">
                  <span
                    className="text-4xl font-black"
                    style={{ color: "hsl(var(--accent))" }}
                  >
                    {currentPrice}€
                  </span>
                  {LAUNCH_PRICE_ACTIVE && (
                    <span className="text-xl font-bold line-through text-muted-foreground/40 mb-1">
                      59€
                    </span>
                  )}
                  <span className="text-muted-foreground text-sm mb-1.5">
                    TTC/mois
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  par organisation · jusqu'à 25 membres
                </p>
                {LAUNCH_PRICE_ACTIVE && (
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Prix de lancement — tarif standard : 59€/mois
                  </p>
                )}
              </div>

              <ScanLine />

              {/* Sections de bénéfices */}
              <div className="flex-1 my-4 space-y-3">
                {PRO_SECTIONS.map((s) => (
                  <ProSection key={s.heading} {...s} />
                ))}
              </div>

              <ScanLine />

              {/* CTA */}
              <button
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="w-full mt-4 py-3.5 rounded-xl font-black text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60"
                style={{
                  background: "hsl(var(--accent))",
                  color: "hsl(var(--accent-foreground))",
                  boxShadow: "0 0 18px hsl(var(--accent) / 0.3)",
                }}
              >
                {checkoutLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                Démarrer l'essai 14 jours →
              </button>
              <p className="text-xs text-muted-foreground text-center mt-2.5">
                Aucune carte requise · Résiliation en 2 clics · 30j remboursé
              </p>
            </div>
          </div>

          {/* ── Entreprise ───────────────────────────────────── */}
          <div
            className="rounded-2xl p-6 sm:p-8 mb-12"
            style={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Users
                    className="w-4 h-4"
                    style={{ color: "hsl(var(--primary))" }}
                  />
                  <p
                    className="text-xs font-bold uppercase tracking-widest"
                    style={{ color: "hsl(var(--primary))" }}
                  >
                    Entreprise / &gt; 25 membres
                  </p>
                </div>
                <h2 className="text-lg font-black text-foreground mb-2">
                  Vous déployez sur toute une organisation ?
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Pilotage centralisé, gestion de groupes, rapports
                  personnalisés, SLA et onboarding dédié. Contactez-nous pour un
                  devis adapté à votre contexte.
                </p>
                <ul className="mt-3 space-y-1.5">
                  {[
                    "Nombre de sièges illimité",
                    "Dashboard manager avancé",
                    "Rapports personnalisés par équipe",
                    "Onboarding guidé dédié",
                    "Contrat et facturation adaptés",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm text-foreground/80"
                    >
                      <Check
                        className="w-3.5 h-3.5 shrink-0"
                        style={{ color: "hsl(142 71% 45%)" }}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="shrink-0">
                <Link
                  to="/register?plan=enterprise"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                  style={{
                    background: "hsl(var(--primary))",
                    color: "hsl(var(--primary-foreground))",
                  }}
                >
                  Nous contacter
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* ── Ce que vous débloquez ─────────────────────────── */}
          <div className="mb-14">
            <h2 className="text-xl font-black text-center mb-2">
              Ce que vous débloquez avec Pro
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-8 max-w-lg mx-auto">
              Pas un abonnement à un outil. Un accès à un système de progression
              structuré.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  icon: BookOpen,
                  title: "Modules complets",
                  desc: "IA Pro, IA Perso, Cybersécurité — des parcours séquencés avec quiz, missions et jalons clairs.",
                  color: "hsl(var(--primary))",
                },
                {
                  icon: MessageSquare,
                  title: "KITT — votre copilote",
                  desc: "500 messages/jour pour poser des questions sur vos modules, débloquer un concept ou préparer une action.",
                  color: "hsl(var(--accent))",
                },
                {
                  icon: FlaskConical,
                  title: "Labs interactifs",
                  desc: "Phishing Lab, Prompt Lab, Cyber Lab — des environnements de mise en pratique, pas des vidéos.",
                  color: "hsl(142 71% 45%)",
                },
                {
                  icon: FileCheck,
                  title: "Attestations vérifiables",
                  desc: "PDF signé + QR code public. Une preuve documentée de votre progression, utile dans un contexte pro ou de conformité interne.",
                  color: "hsl(var(--primary))",
                },
                {
                  icon: BarChart3,
                  title: "Dashboard manager",
                  desc: "Jusqu'à 25 membres. Suivi de progression individuel et collectif, identification des lacunes par domaine.",
                  color: "hsl(var(--accent))",
                },
                {
                  icon: Award,
                  title: "Missions quotidiennes",
                  desc: "KITT propose chaque jour une action concrète adaptée à votre niveau et à votre domaine en cours.",
                  color: "hsl(142 71% 45%)",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-xl p-5 flex flex-col gap-3"
                  style={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${card.color}18` }}
                  >
                    <card.icon
                      className="w-4 h-4"
                      style={{ color: card.color }}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground mb-1">
                      {card.title}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {card.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Garanties ─────────────────────────────────────── */}
          <div
            className="flex flex-col sm:flex-row items-start sm:items-center gap-4 px-6 py-5 rounded-2xl mb-12"
            style={{
              background: "hsl(142 71% 45% / 0.05)",
              border: "1px solid hsl(142 71% 45% / 0.18)",
            }}
          >
            <Shield
              className="w-7 h-7 shrink-0 mt-0.5"
              style={{ color: "hsl(142 71% 45%)" }}
            />
            <div>
              <p className="font-bold text-foreground text-sm">
                Satisfait ou remboursé — 30 jours, sans condition.
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Paiement Stripe · PCI-DSS · Données hébergées en Europe · RGPD
                conforme · Résiliation en 2 clics
              </p>
            </div>
          </div>

          {/* ── Code d'accès ──────────────────────────────────── */}
          <div
            className="rounded-2xl p-6 mb-12"
            style={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Lock
                className="w-4 h-4"
                style={{ color: "hsl(var(--primary))" }}
              />
              <h2 className="text-base font-bold">Code d'accès</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Si vous avez reçu un code d'activation (partenaire, équipe,
              promotion), entrez-le ici pour activer votre accès Pro
              instantanément.
            </p>
            {activationSuccess ? (
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
                style={{
                  background: "hsl(142 71% 45% / 0.1)",
                  color: "hsl(142 71% 45%)",
                  border: "1px solid hsl(142 71% 45% / 0.25)",
                }}
              >
                <Check className="w-4 h-4" />
                Accès Pro activé — redirection en cours…
              </div>
            ) : (
              <div className="flex gap-3 flex-col sm:flex-row">
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(formatCode(e.target.value))}
                  placeholder="XXXXX-XXXX-XXXX"
                  maxLength={15}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-mono tracking-widest uppercase focus:outline-none focus-visible:ring-2 transition-all"
                  style={{
                    background: "hsl(var(--secondary) / 0.6)",
                    border: "1px solid hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                    outlineColor: "hsl(var(--primary))",
                  }}
                  aria-label="Code d'accès"
                />
                <button
                  onClick={handleActivateCode}
                  disabled={codeLoading || !accessCode.trim()}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2 justify-center"
                  style={{
                    background: "hsl(var(--primary))",
                    color: "hsl(var(--primary-foreground))",
                  }}
                >
                  {codeLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Activer"
                  )}
                </button>
              </div>
            )}
          </div>

          {/* ── FAQ ───────────────────────────────────────────── */}
          <div className="mb-16">
            <h2 className="text-2xl font-black text-center mb-2">
              Questions fréquentes
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-8">
              Ce qu'on nous demande avant de s'abonner.
            </p>
            <div className="space-y-2.5 max-w-2xl mx-auto">
              {FAQ.map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>

          {/* ── CTA final ─────────────────────────────────────── */}
          <div
            className="rounded-2xl p-8 sm:p-10 text-center"
            style={{
              background:
                "linear-gradient(135deg, hsl(var(--primary) / 0.07) 0%, hsl(var(--accent) / 0.07) 100%)",
              border: "1px solid hsl(var(--primary) / 0.2)",
            }}
          >
            <div className="flex justify-center mb-4">
              <KittDot />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black mb-3">
              Prêt à passer de spectateur à opérateur IA ?
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto mb-6 leading-relaxed">
              14 jours pour tester. Aucune carte requise. Résiliation libre.
              <br />
              Votre autonomie commence maintenant.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-black text-sm transition-all active:scale-[0.98] disabled:opacity-60"
                style={{
                  background: "hsl(var(--accent))",
                  color: "hsl(var(--accent-foreground))",
                  boxShadow: "0 0 20px hsl(var(--accent) / 0.3)",
                }}
              >
                {checkoutLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                Démarrer l'essai gratuit 14j
              </button>
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm transition-all hover:bg-primary/10"
                style={{
                  border: "1px solid hsl(var(--primary))",
                  color: "hsl(var(--primary))",
                }}
              >
                Créer un compte gratuit
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Déjà un compte ?{" "}
              <Link
                to="/login"
                className="underline underline-offset-2 hover:opacity-80 transition-opacity"
                style={{ color: "hsl(var(--primary))" }}
              >
                Se connecter
              </Link>
            </p>
          </div>
        </main>

        <ProFooter />
      </div>
    </>
  );
}
