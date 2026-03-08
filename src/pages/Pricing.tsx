/**
 * Pricing — BLQ-3
 * 
 * Le LAUNCH_CODE est retiré du bundle client.
 * Le code promo est validé uniquement côté serveur (Edge Function redeem-code).
 * Les stats dynamiques (spots, deadline) viennent de check-launch-price.
 */
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Check, X, Loader2, Shield, ChevronDown, Star, Zap,
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

/* ─── Data ───────────────────────────────────────────────────── */
// BLQ-3: LAUNCH_CODE et LAUNCH_SPOTS_REMAINING retirés du bundle client.
// La deadline est un affichage statique. Le code est validé côté serveur uniquement.
const LAUNCH_DEADLINE = new Date("2026-04-15T23:59:59");

const FREE_FEATURES: { label: string; included: boolean }[] = [
  { label: "Chat IA (2 messages/jour)", included: true },
  { label: "1 agent IA créé", included: true },
  { label: "Modules de formation IA", included: true },
  { label: "Agents autonomes illimités", included: false },
  { label: "Revenue Engine", included: false },
  { label: "Auto Builder", included: false },
  { label: "Co-Founder IA", included: false },
  { label: "Support prioritaire", included: false },
];

const PRO_FEATURES: string[] = [
  "Agents IA autonomes illimités",
  "Chat IA (500 messages/jour)",
  "Revenue Engine — génération de leads IA",
  "Auto Builder — prototypage produit IA",
  "Co-Founder IA — validation et roadmap",
  "Knowledge Base & AI Brain personnalisés",
  "Attestations PDF vérifiables",
  "Support prioritaire",
  "Sans engagement — résiliation en 2 clics",
];

const FAQ = [
  {
    q: "C'est quoi la différence avec ChatGPT ?",
    a: "ChatGPT est un outil généraliste. GENIE OS est un système complet : agents autonomes, Revenue Engine, Co-Founder IA et mémoire persistante. Vous ne posez plus des questions — vous pilotez une machine.",
  },
  {
    q: "Je suis débutant total, c'est pour moi ?",
    a: "Oui. L'onboarding adapte tout à votre niveau. Le Smart Onboarding vous guide pas à pas pour créer votre premier agent en 3 minutes.",
  },
  {
    q: "Les agents tournent vraiment en autonomie ?",
    a: "Oui. Une fois configurés, vos agents exécutent leurs missions (veille, génération de leads, analyse) sans intervention manuelle. Vous recevez les résultats directement.",
  },
  {
    q: "Je peux annuler quand je veux ?",
    a: "Oui. Résiliation en 2 clics depuis votre espace, effective immédiatement. Garantie satisfait ou remboursé 30 jours, sans condition.",
  },
  {
    q: "C'est sécurisé ?",
    a: "Paiement Stripe (certifié PCI-DSS). Données hébergées en Europe. RGPD complet. Aucune donnée revendue. Jamais.",
  },
];

/* ─── Urgency Banner ─────────────────────────────────────────── */
function UrgencyBanner({ spotsRemaining }: { spotsRemaining: number }) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });
  const pad = (n: number) => String(n).padStart(2, "0");

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, LAUNCH_DEADLINE.getTime() - Date.now());
      const totalSec = Math.floor(diff / 1000);
      setTimeLeft({ h: Math.floor(totalSec / 3600), m: Math.floor((totalSec % 3600) / 60), s: totalSec % 60 });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white text-center"
      style={{ background: "linear-gradient(90deg, #FE2C40 0%, #5257D8 100%)" }}
    >
      <span>🔥 Offre de lancement : -40% avec votre code d'accès</span>
      {spotsRemaining > 0 && <span>— Plus que {spotsRemaining} places</span>}
      <span className="flex items-center gap-1 opacity-90">
        · Expire dans <span className="font-mono">{pad(timeLeft.h)}:{pad(timeLeft.m)}:{pad(timeLeft.s)}</span>
      </span>
    </div>
  );
}

/* ─── FAQ Accordion Item ─────────────────────────────────────── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-300"
      style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left group"
      >
        <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{q}</span>
        <ChevronDown
          className="w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-300"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", color: open ? "hsl(var(--primary))" : undefined }}
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

/* ─── Main ───────────────────────────────────────────────────── */
export default function Pricing() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const { track } = useAnalytics();

  useEffect(() => { track("pricing_viewed"); }, []);

  const { data: launchData } = useQuery({
    queryKey: ["launch-price"],
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-launch-price");
      if (error) return { launch_price_active: true, spots_remaining: 23 };
      return data as { launch_price_active: boolean; spots_remaining: number };
    },
  });
  const LAUNCH_PRICE_ACTIVE = launchData?.launch_price_active ?? true;
  // BLQ-3: spotsRemaining vient du serveur, jamais hardcodé ici
  const spotsRemaining = launchData?.spots_remaining ?? 0;

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session");
      if (error || data?.error) throw new Error(data?.error ?? "Erreur");
      window.location.href = data.url;
    } catch (err) {
      toast({ title: "Erreur", description: err instanceof Error ? err.message : "Erreur portail", variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (checkoutLoading) return;
    if (!isAuthenticated) { navigate("/register?redirect=/pricing"); return; }
    setCheckoutLoading(true);
    track("checkout_started");
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
      setConfetti(true);
      toast({ title: "✅ Accès Pro activé !", description: data.message });
      setTimeout(() => navigate("/app/dashboard"), 2000);
    } catch (err) {
      toast({ title: "Code invalide", description: err instanceof Error ? err.message : "Ce code est invalide ou expiré.", variant: "destructive" });
    } finally {
      setCodeLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Tarifs GENIE IA – 59€ TTC/mois, Essai 14 jours</title>
        <meta name="description" content="GENIE Pro à 59€ TTC/mois par organisation. Essai 14 jours gratuit. KITT IA, attestations vérifiables, couverture légale totale. Annulation en 2 clics." />
        <link rel="canonical" href="https://genie-ai-mastery.lovable.app/pricing" />
        <meta property="og:title" content="Tarifs GENIE IA – 59€ TTC/mois" />
        <meta property="og:description" content="Essai 14 jours gratuit. Tout illimité. Attestations PDF. Annulation en 2 clics." />
        <meta property="og:image" content="https://genie-ai-mastery.lovable.app/logo-genie.png" />
        <script type="application/ld+json">{JSON.stringify(productSchema())}</script>
        <script type="application/ld+json">{JSON.stringify(organizationSchema())}</script>
      </Helmet>

      {/* Confetti */}
      {confetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className={`absolute w-2 h-2 rounded-sm animate-bounce ${["bg-primary","bg-accent","bg-orange-500","bg-yellow-400","bg-amber-400"][i % 5]}`}
              style={{ left: `${Math.random() * 100}%`, top: `-${Math.random() * 20}%`, animationDelay: `${Math.random() * 2}s`, animationDuration: `${1 + Math.random() * 2}s` }}
            />
          ))}
        </div>
      )}

      <div className="min-h-screen bg-background text-foreground flex flex-col">
        {/* Banner — spots viennent du serveur */}
        <UrgencyBanner spotsRemaining={spotsRemaining} />

        {/* Navbar */}
        <header className="border-b border-border/30 px-4 sm:px-8 py-4 flex items-center justify-between bg-background/90 backdrop-blur-md">
          <Link to="/">
            <img src={logoGenie} alt="GENIE IA" className="h-9 w-auto" style={{ filter: "drop-shadow(0 0 8px rgba(82,87,216,0.3))" }} />
          </Link>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <button onClick={handlePortal} disabled={portalLoading} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  {portalLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Gérer mon abonnement
                </button>
                <Link to="/app/dashboard" className="text-sm font-semibold text-primary hover:brightness-110 transition-colors">Mon espace →</Link>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Se connecter</Link>
                <Link to="/register" className="px-4 py-2 rounded-xl text-white text-sm font-bold shadow-glow transition-all" style={{ background: "hsl(var(--accent))" }}>
                  Commencer
                </Link>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-16">

          {/* Hero title */}
          <div className="text-center mb-14">
            <h1 className="text-3xl sm:text-5xl font-black mb-3 leading-tight">
              <span
                style={{ background: "linear-gradient(135deg, #5257D8, #FE2C40)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
              >
                Investissez dans les compétences.
              </span>
            </h1>
            <p className="text-lg text-muted-foreground">Pas de surprise. Pas d'engagement.</p>
          </div>

          {/* Plans grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start mb-12">

            {/* ── FREE plan ── */}
            <div
              className="rounded-2xl p-6 sm:p-8 flex flex-col"
              style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
            >
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Découverte</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-5xl font-black text-foreground">0€</span>
                  <span className="text-muted-foreground text-base mb-1.5">/mois</span>
                </div>
                <p className="text-sm text-muted-foreground">Pour découvrir sans engagement</p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {FREE_FEATURES.map((f) => (
                  <li key={f.label} className="flex items-center gap-2.5 text-sm">
                    {f.included
                      ? <Check className="w-4 h-4 shrink-0 text-primary" />
                      : <X className="w-4 h-4 shrink-0 text-muted-foreground/40" />
                    }
                    <span className={f.included ? "text-foreground" : "text-muted-foreground/60"}>{f.label}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/register"
                className="block w-full text-center py-3.5 rounded-xl font-bold text-sm transition-all hover:bg-primary/10"
                style={{ border: "1px solid hsl(var(--primary))", color: "hsl(var(--primary))" }}
              >
                Commencer gratuitement
              </Link>
            </div>

            {/* ── PRO plan ── */}
            <div
              className="relative rounded-2xl p-6 sm:p-8 flex flex-col"
              style={{
                background: "hsl(var(--card))",
                border: "2px solid hsl(var(--primary))",
                boxShadow: "0 0 30px rgba(82,87,216,0.2)",
                transform: "scale(1.02)",
                transformOrigin: "top center",
              }}
            >
              {/* POPULAIRE badge */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <div
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black text-white"
                  style={{ background: "hsl(var(--accent))", boxShadow: "0 0 12px rgba(254,44,64,0.4)" }}
                >
                  <Star className="w-3 h-3" /> POPULAIRE
                </div>
              </div>

              <div className="mb-6 mt-2">
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(var(--primary))" }}>Pro</p>
                <div className="flex items-end gap-2 mb-1">
                  {LAUNCH_PRICE_ACTIVE ? (
                    <div className="flex items-end gap-2">
                      <span className="text-5xl font-black" style={{ color: "hsl(var(--accent))" }}>35€</span>
                      <span className="text-2xl font-bold line-through text-muted-foreground/50 mb-1">59€</span>
                    </div>
                  ) : (
                    <span className="text-5xl font-black" style={{ color: "hsl(var(--accent))" }}>59€</span>
                  )}
                  <span className="text-muted-foreground text-base mb-1.5">TTC/mois</span>
                </div>
                <p className="text-xs text-muted-foreground font-mono">par organisation · 25 sièges inclus</p>
                {LAUNCH_PRICE_ACTIVE && (
                  <div className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mt-1" style={{ background: "hsl(var(--accent)/0.1)", color: "hsl(var(--accent))" }}>
                    <Zap className="w-3 h-3" /> Couverture légale totale · Evidence Vault illimité
                  </div>
                )}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                    <Check className="w-4 h-4 shrink-0" style={{ color: "#22C55E" }} />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="w-full py-4 rounded-xl text-white font-black text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                style={{ background: "hsl(var(--accent))", boxShadow: "0 0 20px rgba(254,44,64,0.35)" }}
              >
                {checkoutLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                Démarrer l'essai gratuit 14j →
              </button>
              <p className="text-xs text-muted-foreground text-center mt-3">Sans carte requise pour l'essai</p>
            </div>
          </div>

          {/* Guarantee */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 px-6 py-5 rounded-2xl mb-12 text-center sm:text-left"
            style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}
          >
            <Shield className="w-8 h-8 shrink-0" style={{ color: "#22C55E" }} />
            <div>
              <p className="font-bold text-foreground">Satisfait ou remboursé 30 jours. Sans condition.</p>
              <p className="text-sm text-muted-foreground mt-0.5">Paiement Stripe sécurisé · Données hébergées en Europe · RGPD complet</p>
            </div>
          </div>

          {/* Access code section */}
          {LAUNCH_PRICE_ACTIVE && (
            <div
              className="rounded-2xl p-6 mb-12"
              style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
            >
              <h2 className="text-base font-bold mb-1">Vous avez un code d'accès ?</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Entrez votre code pour activer votre accès Pro instantanément.
              </p>
              <div className="flex gap-3 flex-col sm:flex-row">
                <input
                  type="text"
                  value={accessCode}
                  onChange={e => setAccessCode(formatCode(e.target.value))}
                  placeholder="XXXXX-XXXX-XXXX"
                  maxLength={15}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-secondary/60 border border-border text-sm font-mono tracking-widest uppercase focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
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
            </div>
          )}

          {/* FAQ */}
          <div className="mb-16">
            <h2 className="text-2xl font-black text-center mb-8">Questions fréquentes</h2>
            <div className="space-y-3 max-w-2xl mx-auto">
              {FAQ.map((item) => <FaqItem key={item.q} {...item} />)}
            </div>
          </div>

        </main>

        <ProFooter />
      </div>
    </>
  );
}
