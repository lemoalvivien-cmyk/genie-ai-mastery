/**
 * Pricing — Formetoialia v6 — B2B Conversion-first
 * Un plan. Tout inclus. 59€ TTC/mois.
 */
import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import {
  Check, X, Loader2, Shield, ChevronDown, Zap,
  BookOpen, FileCheck, Users, BarChart3,
  MessageSquare, Lock, ArrowRight, CheckCircle, TrendingUp,
  Timer, Euro, Activity, Award, Lightbulb, Rocket,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { useAnalytics } from "@/hooks/useAnalytics";
import { productSchema, organizationSchema } from "@/lib/seo";
import { ProFooter } from "@/components/ProFooter";
import logoFormetoialia from "@/assets/logo-formetoialia.png";

/* ── Sub-components ──────────────────────────────────────────── */
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold mb-4 border border-primary/20 text-primary"
      style={{ background: "hsl(var(--primary)/0.07)" }}
    >
      {children}
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-xl overflow-hidden border border-border transition-all"
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
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            color: open ? "hsl(var(--primary))" : undefined,
          }}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-200 ease-in-out"
        style={{ maxHeight: open ? "320px" : "0px" }}
      >
        <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

/* ── Data ────────────────────────────────────────────────────── */
const FREE_FEATURES = [
  { label: "Copilote KITT — 2 échanges/jour", included: true },
  { label: "Accès aux playbooks publics", included: true },
  { label: "1 mission guidée par jour", included: true },
  { label: "Missions illimitées", included: false },
  { label: "Playbooks complets", included: false },
  { label: "Exécutions guidées interactives", included: false },
  { label: "Attestations PDF vérifiables", included: false },
  { label: "Cockpit équipe & manager", included: false },
  { label: "Bibliothèque d'équipe", included: false },
  { label: "Reporting & exports", included: false },
];

const PRO_FEATURES = [
  { group: "Exécuter", icon: BookOpen, items: ["Missions illimitées par KITT", "Playbooks complets : IA Pro, IA Perso, Cybersécurité", "Exécutions guidées adaptatives"] },
  { group: "Agir", icon: Zap, items: ["Mises en situation interactives : Phishing, Prompt, Cyber", "Copilote KITT — 500 échanges/jour"] },
  { group: "Prouver", icon: FileCheck, items: ["Attestations PDF à signature numérique", "QR code de vérification publique", "Historique exportable"] },
  { group: "Piloter", icon: BarChart3, items: ["Cockpit manager — jusqu'à 25 membres", "Suivi progression individuel & collectif", "Bibliothèque d'équipe partagée", "Rapports automatisés"] },
];

const FAQ_DATA = [
  {
    q: "Est-ce juste un chat IA de plus ?",
    a: "Non. ChatGPT vous donne des réponses. Formetoialia vous donne un système : une mission concrète chaque jour, un playbook structuré, une progression mesurable, une preuve de résultat. La différence est dans le système, pas dans l'IA.",
  },
  {
    q: "Est-ce utile si je débute avec l'IA ?",
    a: "C'est précisément fait pour les débutants. L'onboarding calibre votre niveau en 3 minutes. KITT vous guide dès la première session. Zéro compétence technique requise.",
  },
  {
    q: "Pourquoi payer si des IA gratuites existent ?",
    a: "Les IA gratuites répondent. Formetoialia exécute. La valeur est dans le système qui vous force à utiliser l'IA quotidiennement pour obtenir des résultats mesurables. Page blanche éliminée. Progression visible.",
  },
  {
    q: "C'est adapté aux équipes ?",
    a: "Oui. Un seul abonnement Pro couvre jusqu'à 25 membres. Le cockpit manager permet de suivre la progression individuelle, d'identifier les lacunes et d'exporter des rapports.",
  },
  {
    q: "Que contient l'offre Pro en pratique ?",
    a: "Trois dimensions : Exécuter (missions illimitées, playbooks complets IA Pro, IA Perso, Cybersécurité), Agir (mises en situation interactives : phishing, prompting avancé, hygiène numérique), Prouver (attestations PDF à QR code). Pas de vidéos passives — uniquement des exécutions guidées.",
  },
  {
    q: "Les attestations sont-elles reconnues officiellement ?",
    a: "Les attestations Formetoialia sont des preuves internes de compétences, vérifiables via QR code. Elles ne sont pas équivalentes à des certifications d'organismes agréés. Leur valeur est celle d'une preuve documentée de maîtrise, utile en conformité interne.",
  },
  {
    q: "Puis-je annuler librement ?",
    a: "Oui. Résiliation depuis votre espace en 2 clics, effective à la fin de la période en cours. Garantie satisfait ou remboursé 30 jours, sans condition ni justification.",
  },
];

/* ── Main ────────────────────────────────────────────────────── */
export default function Pricing() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [activationSuccess, setActivationSuccess] = useState(false);
  const stickyRef = useRef<HTMLDivElement>(null);
  const { track } = useAnalytics();

  useEffect(() => {
    track("pricing_viewed");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session");
      if (error || data?.error) throw new Error(data?.error ?? "Erreur portail");
      track("portal_opened");
      window.location.href = data.url;
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible d'ouvrir le portail.",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (checkoutLoading) return;
    if (!isAuthenticated) {
      navigate("/register?redirect=/pricing");
      return;
    }
    setCheckoutLoading(true);
    track("checkout_started");
    try {
      const referralCode = sessionStorage.getItem("formetoialia_ref") ?? undefined;
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { seats: 1, ...(referralCode ? { referral_code: referralCode } : {}) },
      });
      if (error || data?.error) throw new Error(data?.error ?? "Erreur checkout");
      sessionStorage.setItem("formetoialia_payment_pending", "1");
      window.location.href = data.url;
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible de créer la session.",
        variant: "destructive",
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const formatCode = (val: string) => {
    const raw = val.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 14);
    return [raw.slice(0, 5), raw.slice(5, 9), raw.slice(9, 13)].filter(Boolean).join("-");
  };

  const handleActivateCode = async () => {
    if (!accessCode.trim()) return;
    if (!isAuthenticated) { navigate("/register?redirect=/pricing"); return; }
    setCodeLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("redeem-code", {
        body: { code: accessCode.replace(/-/g, "").trim() },
      });
      if (error || data?.error) throw new Error(data?.error ?? "Code invalide");
      setActivationSuccess(true);
      toast({ title: "✅ Accès Pro activé !", description: data.message });
      setTimeout(() => navigate("/app/dashboard"), 2000);
    } catch (err) {
      toast({
        title: "Code invalide",
        description: err instanceof Error ? err.message : "Ce code est invalide ou expiré.",
        variant: "destructive",
      });
    } finally {
      setCodeLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Prix — Formetoialia · 59€/mois pour toute l'équipe</title>
        <meta name="description" content="Formetoialia Pro — 59€ TTC/mois. Missions illimitées, playbooks complets, copilote KITT, cockpit manager, attestations vérifiables. 14 jours d'essai sans carte. Jusqu'à 25 membres." />
        <link rel="canonical" href="https://formetoialia.com/pricing" />
        <meta property="og:title" content="Prix Formetoialia — Système d'exécution IA à 59€/mois" />
        <meta property="og:description" content="Un plan. Tout inclus. 59€ TTC/mois pour 25 membres. 14 jours d'essai sans carte." />
        <meta property="og:image" content="https://formetoialia.com/logo-formetoialia.png" />
        <script type="application/ld+json">{JSON.stringify(productSchema())}</script>
        <script type="application/ld+json">{JSON.stringify(organizationSchema())}</script>
      </Helmet>

      <div className="min-h-screen bg-background text-foreground flex flex-col">

        {/* ── Navbar ─────────────────────────────────────────────── */}
        <header
          className="sticky top-0 z-50 border-b border-border/40 px-4 sm:px-8 h-14 flex items-center justify-between"
          style={{ background: "hsl(var(--background)/0.96)", backdropFilter: "blur(16px)" }}
        >
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logoFormetoialia} alt="Formetoialia" className="h-7 w-auto" />
            <span className="font-black text-sm tracking-tight">
              <span className="text-primary">formetoi</span><span className="text-accent">alia</span>
            </span>
          </Link>
          <nav className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link to="/app/dashboard" className="text-xs font-semibold text-primary">Mon espace →</Link>
            ) : (
              <>
                <Link to="/login" className="hidden sm:block text-xs text-muted-foreground hover:text-foreground transition-colors">Connexion</Link>
                <button
                  onClick={handleCheckout}
                  disabled={checkoutLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98] flex items-center gap-1.5 disabled:opacity-60"
                  style={{ background: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}
                >
                  {checkoutLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  Essai gratuit 14j
                </button>
              </>
            )}
          </nav>
        </header>

        <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-20">

          {/* ── Hero Pricing ───────────────────────────────────────── */}
          <div className="text-center mb-14">
            <Chip>Un seul plan. Tout inclus.</Chip>
            <h1 className="text-3xl sm:text-5xl font-black text-foreground mb-4 leading-tight">
              Rendez vos équipes opérationnelles sur l'IA<br />
              <span style={{ color: "hsl(var(--primary))" }}>pour 59€ TTC par mois.</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed mb-6">
              Missions illimitées, playbooks complets, copilote KITT, cockpit manager, attestations vérifiables.
              <strong className="text-foreground"> Jusqu'à 25 membres. Aucun coût caché.</strong>
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground/70">
              {["14 jours d'essai sans carte", "Résiliation en 2 clics", "Remboursé 30 jours si insatisfait", "Paiement Stripe sécurisé"].map(t => (
                <span key={t} className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-400" />{t}</span>
              ))}
            </div>
          </div>

          {/* ── Plans comparatifs ──────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-7 items-start mb-14">

            {/* Gratuit */}
            <div
              className="rounded-2xl p-6 sm:p-7 flex flex-col border border-border"
              style={{ background: "hsl(var(--card))" }}
            >
              <div className="mb-5">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Gratuit</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-black text-foreground">0€</span>
                  <span className="text-muted-foreground text-sm mb-1.5">/mois</span>
                </div>
                <p className="text-sm text-muted-foreground">Pour explorer la plateforme, sans engagement.</p>
              </div>
              <ul className="space-y-2.5 mb-7 flex-1">
                {FREE_FEATURES.map((f) => (
                  <li key={f.label} className="flex items-start gap-2.5 text-sm">
                    {f.included ? (
                      <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "hsl(142 71% 45%)" }} />
                    ) : (
                      <X className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground/25" />
                    )}
                    <span className={f.included ? "text-foreground/90" : "text-muted-foreground/50"}>{f.label}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className="block w-full text-center py-3 rounded-xl font-bold text-sm transition-all hover:bg-primary/10 border border-primary/40"
                style={{ color: "hsl(var(--primary))" }}
              >
                Commencer gratuitement
              </Link>
            </div>

            {/* Pro */}
            <div
              className="relative rounded-2xl p-6 sm:p-7 flex flex-col border-2 border-primary"
              style={{
                background: "hsl(var(--card))",
                boxShadow: "0 0 32px hsl(var(--primary)/0.12)",
              }}
            >
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span
                  className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black"
                  style={{
                    background: "hsl(var(--accent))",
                    color: "hsl(var(--accent-foreground))",
                    boxShadow: "0 0 10px hsl(var(--accent)/0.4)",
                  }}
                >
                  RECOMMANDÉ
                </span>
              </div>

              <div className="mb-5 mt-3">
                <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: "hsl(var(--primary))" }}>Pro</p>
                <div className="flex items-end gap-2 mb-0.5">
                  <span className="text-4xl font-black" style={{ color: "hsl(var(--accent))" }}>59€</span>
                  <span className="text-muted-foreground text-sm mb-1.5">TTC/mois</span>
                </div>
                <p className="text-xs text-muted-foreground">par organisation · jusqu'à 25 membres</p>
              </div>

              <div className="h-px bg-border/50 mb-4" />

              <div className="flex-1 space-y-4 mb-5">
                {PRO_FEATURES.map((s) => (
                  <div key={s.group}>
                    <div className="flex items-center gap-2 mb-2">
                      <s.icon className="w-3.5 h-3.5 shrink-0" style={{ color: "hsl(var(--primary))" }} />
                      <span className="text-xs font-black uppercase tracking-widest" style={{ color: "hsl(var(--primary))" }}>
                        {s.group}
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {s.items.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm">
                          <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "hsl(142 71% 45%)" }} />
                          <span className="text-foreground/90 leading-snug">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="h-px bg-border/50 mb-4" />

              <button
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="w-full py-3.5 rounded-xl font-black text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60"
                style={{
                  background: "hsl(var(--accent))",
                  color: "hsl(var(--accent-foreground))",
                  boxShadow: "0 0 18px hsl(var(--accent)/0.3)",
                }}
              >
                {checkoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Démarrer l'essai 14 jours →
              </button>
              <p className="text-xs text-muted-foreground text-center mt-2.5">
                Aucune carte requise · Résiliation en 2 clics · 30j remboursé
              </p>
            </div>
          </div>

          {/* ── ROI Section ────────────────────────────────────────── */}
          <div className="mb-14">
            <div className="text-center mb-8">
              <Chip><TrendingUp className="w-3 h-3" />Le ROI concret</Chip>
              <h2 className="text-xl sm:text-2xl font-black text-foreground mb-2">
                59€/mois pour toute l'équipe. Rentable dès le premier résultat.
              </h2>
              <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                Comparez avec ce que coûte une heure de formation classique.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {[
                {
                  label: "Formation externe",
                  price: "500–2000€",
                  detail: "par session, par groupe",
                  note: "Aucun suivi post-formation. Résultats non mesurables.",
                  highlight: false,
                },
                {
                  label: "Formetoialia Pro",
                  price: "59€",
                  detail: "par mois, jusqu'à 25 membres",
                  note: "Exécution quotidienne. Progression mesurable. Attestations incluses.",
                  highlight: true,
                },
                {
                  label: "ChatGPT seul",
                  price: "0–20€",
                  detail: "par mois, sans système",
                  note: "Page blanche permanente. Aucun suivi. Résultats non reproductibles.",
                  highlight: false,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl p-5 border"
                  style={{
                    background: item.highlight ? "hsl(var(--card))" : "hsl(var(--card)/0.6)",
                    borderColor: item.highlight ? "hsl(var(--primary))" : "hsl(var(--border))",
                    boxShadow: item.highlight ? "0 0 20px hsl(var(--primary)/0.08)" : "none",
                  }}
                >
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">{item.label}</p>
                  <p className="text-2xl font-black mb-0.5" style={{ color: item.highlight ? "hsl(var(--accent))" : "hsl(var(--foreground))" }}>
                    {item.price}
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">{item.detail}</p>
                  <p className="text-xs leading-relaxed" style={{ color: item.highlight ? "hsl(var(--foreground)/0.8)" : "hsl(var(--muted-foreground)/0.7)" }}>
                    {item.note}
                  </p>
                </div>
              ))}
            </div>

            {/* ── Cockpit Manager Proof ── */}
            <div
              className="rounded-2xl border border-primary/25 p-6 sm:p-8"
              style={{
                background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--primary)/0.04) 100%)",
                boxShadow: "0 0 40px hsl(var(--primary)/0.06)",
              }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-wider text-primary">Cockpit manager inclus</span>
                  </div>
                  <h3 className="text-xl font-black text-foreground mb-2">
                    Vous ne payez pas pour former.{" "}
                    <span className="text-primary">Vous payez pour piloter.</span>
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                    Voyez en temps réel qui utilise l'IA, qui stagne, et ce que ça représente en heures économisées. Exportez un rapport en un clic.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: Activity, label: "Score d'adoption", value: "temps réel" },
                      { icon: Timer, label: "Heures éco. estimées", value: "auto-calculées" },
                      { icon: Award, label: "Attestations équipe", value: "exportables" },
                      { icon: Lightbulb, label: "Recommandations IA", value: "contextuelles" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2 p-2.5 rounded-lg bg-background/40 border border-border/40">
                        <item.icon className="w-4 h-4 text-primary shrink-0" />
                        <div>
                          <div className="text-xs font-semibold text-foreground leading-tight">{item.label}</div>
                          <div className="text-[10px] text-primary font-medium">{item.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 text-xs font-medium text-muted-foreground/70 border-t border-border/40 pt-4">
                    🧮 Avec 10 membres actifs à 2 missions/semaine = ~13h économisées/mois.{" "}
                    <span className="text-foreground font-semibold">À 50€/h = 650€ de valeur. Pour 59€.</span>
                  </div>
                </div>

                {/* Mini cockpit mockup */}
                <div className="rounded-xl border border-border overflow-hidden text-xs" style={{ background: "hsl(var(--card))" }}>
                  <div className="px-4 py-2.5 border-b border-border flex items-center justify-between bg-background/40">
                    <span className="font-bold text-foreground text-xs">Cockpit équipe — ce mois</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 font-semibold">
                      En direct
                    </span>
                  </div>
                  <div className="p-3 grid grid-cols-3 gap-2 border-b border-border/30">
                    {[
                      { label: "Actifs", value: "8/10", color: "text-emerald-500" },
                      { label: "Missions", value: "47", color: "text-primary" },
                      { label: "Heures éco.", value: "~16h", color: "text-amber-400" },
                    ].map((kpi) => (
                      <div key={kpi.label} className="text-center p-2 rounded-lg bg-background/30">
                        <div className={`text-base font-black ${kpi.color}`}>{kpi.value}</div>
                        <div className="text-muted-foreground">{kpi.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 space-y-2">
                    {[
                      { name: "Marie R.", pct: 78, status: "Actif", statusColor: "text-emerald-500" },
                      { name: "Thomas B.", pct: 45, status: "Actif", statusColor: "text-emerald-500" },
                      { name: "Sophie L.", pct: 92, status: "Top", statusColor: "text-amber-400" },
                      { name: "David M.", pct: 12, status: "À relancer", statusColor: "text-destructive" },
                    ].map((m) => (
                      <div key={m.name} className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
                          {m.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-medium text-foreground truncate text-[11px]">{m.name}</span>
                            <span className={`${m.statusColor} font-semibold text-[10px] shrink-0 ml-1`}>{m.status}</span>
                          </div>
                          <div className="h-1 rounded-full bg-border overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${m.pct}%`,
                                background: m.pct > 70 ? "hsl(142 71% 45%)" : m.pct > 30 ? "hsl(var(--primary))" : "hsl(var(--destructive))",
                              }}
                            />
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground w-7 text-right shrink-0">{m.pct}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="px-3 py-2 border-t border-border/30 flex items-center justify-between bg-background/20">
                    <span className="text-muted-foreground text-[10px]">1 membre à relancer · Export dispo</span>
                    <button
                      onClick={handleCheckout}
                      className="text-[10px] font-bold text-primary hover:underline"
                    >
                      Activer →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Garanties ──────────────────────────────────────────── */}
          <div
            className="flex flex-col sm:flex-row items-start sm:items-center gap-4 px-6 py-5 rounded-2xl mb-14"
            style={{
              background: "hsl(142 71% 45% / 0.05)",
              border: "1px solid hsl(142 71% 45% / 0.18)",
            }}
          >
            <Shield className="w-7 h-7 shrink-0 mt-0.5" style={{ color: "hsl(142 71% 45%)" }} />
            <div>
              <p className="font-bold text-foreground text-sm">Satisfait ou remboursé — 30 jours, sans condition.</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Paiement Stripe · PCI-DSS · Données hébergées en Europe · RGPD conforme · Résiliation en 2 clics
              </p>
            </div>
          </div>

          {/* ── Entreprise ─────────────────────────────────────────── */}
          <div
            className="rounded-2xl p-6 sm:p-8 mb-14 border border-border"
            style={{ background: "hsl(var(--card))" }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
                  <p className="text-xs font-black uppercase tracking-widest" style={{ color: "hsl(var(--primary))" }}>
                    Entreprise / &gt; 25 membres
                  </p>
                </div>
                <h2 className="text-lg font-black text-foreground mb-2">Vous déployez à grande échelle ?</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Pilotage centralisé, groupes, rapports personnalisés, SLA et onboarding dédié.
                </p>
              </div>
              <div className="shrink-0">
                <Link
                  to="/register?plan=enterprise"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                  style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
                >
                  Nous contacter <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* ── Code d'accès ───────────────────────────────────────── */}
          <div
            className="rounded-2xl p-6 mb-14 border border-border"
            style={{ background: "hsl(var(--card))" }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
              <h2 className="text-base font-bold">Code d'accès partenaire</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Vous avez reçu un code d'activation ? Entrez-le ici pour activer votre accès Pro instantanément.
            </p>
            {activationSuccess ? (
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
                style={{ background: "hsl(142 71% 45% / 0.1)", color: "hsl(142 71% 45%)", border: "1px solid hsl(142 71% 45% / 0.25)" }}
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
                    background: "hsl(var(--secondary)/0.6)",
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
                  style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
                >
                  {codeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Activer"}
                </button>
              </div>
            )}
          </div>

          {/* ── Objections / FAQ ───────────────────────────────────── */}
          <div className="mb-16">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black text-foreground mb-2">Questions avant de s'abonner</h2>
              <p className="text-sm text-muted-foreground">Ce qu'on nous demande le plus souvent.</p>
            </div>
            <div className="space-y-2.5 max-w-2xl mx-auto">
              {FAQ_DATA.map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>

          {/* ── CTA final ──────────────────────────────────────────── */}
          <div
            ref={stickyRef}
            className="rounded-2xl p-8 sm:p-10 text-center"
            style={{
              background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--primary)/0.05) 100%)",
              border: "1px solid hsl(var(--primary)/0.2)",
              boxShadow: "0 0 40px hsl(var(--primary)/0.07)",
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "hsl(var(--primary)/0.1)" }}
            >
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black mb-3 text-foreground">
              Arrêtez d'apprendre l'IA.<br />
              <span style={{ color: "hsl(var(--primary))" }}>Commencez à l'utiliser vraiment.</span>
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-7 leading-relaxed">
              14 jours pour tester. Aucune carte requise. Résiliation libre.
              Votre équipe opérationnelle commence maintenant.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
              <button
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-black text-sm transition-all active:scale-[0.98] disabled:opacity-60"
                style={{
                  background: "hsl(var(--accent))",
                  color: "hsl(var(--accent-foreground))",
                  boxShadow: "0 0 20px hsl(var(--accent)/0.3)",
                }}
              >
                {checkoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Démarrer l'essai gratuit 14j
              </button>
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all hover:bg-primary/8 border border-primary/40"
                style={{ color: "hsl(var(--primary))" }}
              >
                Créer un compte gratuit <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <p className="text-xs text-muted-foreground/60">
              Déjà un compte ?{" "}
              <Link to="/login" className="underline underline-offset-2 hover:opacity-80 transition-opacity">
                Se connecter
              </Link>
              {isAuthenticated && (
                <>
                  {" "}·{" "}
                  <button
                    onClick={handlePortal}
                    disabled={portalLoading}
                    className="underline underline-offset-2 hover:opacity-80 transition-opacity disabled:opacity-50"
                  >
                    {portalLoading ? "Chargement…" : "Gérer mon abonnement"}
                  </button>
                </>
              )}
            </p>
          </div>

        </main>

        <ProFooter />
      </div>
    </>
  );
}
