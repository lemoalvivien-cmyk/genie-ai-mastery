import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Brain, Check, X, Lock, Globe, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { useQuery } from "@tanstack/react-query";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { productSchema, organizationSchema } from "@/lib/seo";

const FREE_FEATURES_YES = [
  "3 modules par domaine",
  "5 messages IA / jour",
  "1 quiz / jour",
  "1 checklist PDF",
  "Bouton panique",
];
const FREE_FEATURES_NO = [
  "Voix Jarvis (KITT)",
  "Attestations de formation",
  "Vibe Coding",
  "Dashboard manager",
  "Missions quotidiennes illimitées",
];

const PRO_FEATURES = [
  "TOUT illimité (modules, quiz, chat 500 msg/jour)",
  "Voix Jarvis activée",
  "Attestations vérifiables",
  "Vibe Coding complet",
  "Dashboard manager (25 sièges)",
  "Missions quotidiennes Jarvis",
  "PDFs illimités (attestations, chartes, SOP)",
  "Sans engagement — résiliation en 1 clic",
];

const FAQ = [
  {
    q: "Comment fonctionne l'essai gratuit ?",
    a: "14 jours complets, zéro prélèvement, carte nécessaire. Vous pouvez résilier avant la fin de l'essai sans rien payer. La TVA applicable est calculée automatiquement selon votre pays.",
  },
  {
    q: "Puis-je résilier quand je veux ?",
    a: "Oui. En 1 clic. Pas d'engagement. Vos données restent 90 jours.",
  },
  {
    q: "Pourquoi 59 EUR au lieu de 99 EUR ?",
    a: "C'est notre tarif de lancement réservé aux 100 premiers inscrits. Ce prix est garanti à vie pour ceux qui souscrivent maintenant.",
  },
  {
    q: "Est-ce éligible OPCO / formation professionnelle ?",
    a: "Oui. GENIE IA délivre des attestations de formation. Contactez-nous pour un devis OPCO.",
  },
  {
    q: "Combien de collaborateurs par abonnement ?",
    a: "25 sièges inclus. Contactez-nous pour plus.",
  },
];

export default function Pricing() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [portalLoading, setPortalLoading] = useState(false);

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

  const { data: launchData } = useQuery({
    queryKey: ["launch-price"],
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-launch-price");
      if (error) return { launch_price_active: true };
      return data as { launch_price_active: boolean };
    },
  });
  const LAUNCH_PRICE_ACTIVE = launchData?.launch_price_active ?? true;
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [confetti, setConfetti] = useState(false);

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
    const parts = [raw.slice(0, 5), raw.slice(5, 9), raw.slice(9, 13)].filter(Boolean);
    return parts.join("-");
  };

  const handleCodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAccessCode(formatCode(e.target.value));
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
        body: { code: accessCode.trim() },
      });
      if (error || data?.error) throw new Error(data?.error ?? "Code invalide");
      setConfetti(true);
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
        <title>Tarifs GENIE IA – 59€/mois, Essai 24h</title>
        <meta name="description" content="GENIE Pro à 59€/mois TTC. Essai 24h gratuit. Voix Jarvis, attestations vérifiables, Vibe Coding, dashboard manager. Annulation en 2 clics." />
        <link rel="canonical" href="https://genie-ai-mastery.lovable.app/pricing" />
        <meta property="og:title" content="Tarifs GENIE IA – 59€/mois" />
        <meta property="og:description" content="Essai 24h gratuit. Tout illimité. Attestations PDF. Annulation en 2 clics." />
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
              style={{
                left: `${Math.random() * 100}%`,
                top: `-${Math.random() * 20}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="min-h-screen gradient-hero">
        {/* Navbar */}
        <header className="border-b border-border/40 px-4 sm:px-6 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
              <Brain className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight text-foreground">
              GENIE <span className="text-gradient">IA</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <button
                  onClick={handlePortal}
                  disabled={portalLoading}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  {portalLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Gérer mon abonnement
                </button>
                <Link to="/app/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Mon espace →
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">Se connecter</Link>
                <Link to="/register" className="px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium shadow-glow">
                  Commencer
                </Link>
              </>
            )}
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
          {/* Title */}
          <div className="text-center mb-14">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-3">
              Un seul plan. <span className="text-gradient">Tout inclus.</span>
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-lg mx-auto">
              Simple, transparent, sans surprise.
            </p>
          </div>

          {/* Plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start mb-16">
            {/* Free plan */}
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-foreground mb-1">Découvrir</h2>
                <p className="text-muted-foreground text-sm">Pour commencer sans engagement</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-foreground">0€</span>
              </div>
              <ul className="space-y-3 mb-8">
                {FREE_FEATURES_YES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
                {FREE_FEATURES_NO.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <X className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className="block w-full text-center py-3 rounded-xl border border-border text-foreground font-semibold text-sm hover:bg-muted transition-colors"
              >
                Commencer gratuitement
              </Link>
            </div>

            {/* Pro plan — highlighted */}
            <div
              className="relative rounded-2xl border-2 border-primary bg-primary/5 p-6 sm:p-8"
              style={{ transform: "scale(1.03)", transformOrigin: "top center" }}
            >
              {/* Launch badge */}
              {LAUNCH_PRICE_ACTIVE && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold text-primary-foreground gradient-primary animate-pulse">
                    OFFRE LANCEMENT 🔥 -40%
                  </div>
                </div>
              )}

              <div className="mb-6 mt-2">
                <h2 className="text-lg font-bold text-foreground mb-1">GENIE Pro</h2>
                <p className="text-muted-foreground text-sm">Tout illimité, voix Jarvis, attestations</p>
              </div>

              <div className="mb-2">
                {LAUNCH_PRICE_ACTIVE && (
                  <span className="text-muted-foreground line-through text-base mr-2">99€</span>
                )}
                <span className="text-4xl font-extrabold text-foreground">
                  {LAUNCH_PRICE_ACTIVE ? "59€" : "99€"}
                </span>
                <span className="text-muted-foreground text-sm ml-1">/mois TTC</span>
              </div>
              {LAUNCH_PRICE_ACTIVE && (
                <p className="text-xs text-primary font-medium mb-6">
                  Pour les 100 premiers inscrits uniquement
                </p>
              )}
              {!LAUNCH_PRICE_ACTIVE && <div className="mb-6" />}

              <ul className="space-y-3 mb-8">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="w-full min-h-[52px] py-3 rounded-xl gradient-primary text-primary-foreground font-bold text-sm shadow-glow hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {checkoutLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Redirection...</>
                ) : (
                  "Démarrer — Essai 14 jours gratuit →"
                )}
              </button>
            </div>
          </div>

          {/* Access code section */}
          <div className="max-w-md mx-auto mb-16 text-center">
            <p className="text-sm font-medium text-muted-foreground mb-3">Vous avez un code d'accès ?</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={accessCode}
                onChange={handleCodeInput}
                placeholder="GENIE-XXXX-XXXX"
                maxLength={14}
                className="flex-1 px-4 py-3 rounded-xl border border-border bg-card text-foreground text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                onClick={handleActivateCode}
                disabled={codeLoading || accessCode.length < 5}
                className="px-5 py-3 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
              >
                {codeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Activer"}
              </button>
            </div>
          </div>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-foreground text-center mb-6">Questions fréquentes</h2>
            <Accordion type="single" collapsible className="space-y-2">
              {FAQ.map((item, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="border border-border/60 rounded-xl px-5 bg-card/40"
                >
                  <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-4">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border/40 px-4 sm:px-6 py-6 mt-8">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="w-3 h-3" />
              <span>Paiement sécurisé Stripe</span>
              <Globe className="w-3 h-3" />
              <span>© 2025 GENIE IA</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <Link to="/mentions-legales" className="hover:text-foreground transition-colors">Mentions légales</Link>
              <Link to="/confidentialite" className="hover:text-foreground transition-colors">Confidentialité</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
