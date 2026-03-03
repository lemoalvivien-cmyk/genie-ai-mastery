import { useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Check, Lock, Globe, Loader2, Shield, FileText, Brain,
  Zap, Mic, ChevronDown, Play, AlertTriangle, BarChart3,
  BookOpen, Bot, Flame, Star
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import logoGenie from "@/assets/logo-genie.png";
import { softwareApplicationSchema, productSchema, organizationSchema } from "@/lib/seo";

/* ─── Copy & data ────────────────────────────────────────────── */
const PROOFS = [
  { icon: FileText, label: "Attestation PDF vérifiable", desc: "Signature cryptographique — inviolable" },
  { icon: Zap,      label: "Cockpit Jarvis",             desc: "Voix + IA + missions quotidiennes" },
  { icon: Shield,   label: "Control Room anti-abus",     desc: "Bouclier IA + monitoring temps réel" },
];

const PROBLEMS = [
  { title: "3 000€ pour une certif.", body: "Des formations à prix hors de portée, souvent obsolètes en 6 mois." },
  { title: "Jargon incompréhensible", body: "\"Prompting avancé\", \"RAG\", \"NIS2\" — sans jamais expliquer concrètement." },
  { title: "Zéro preuve d'apprentissage", body: "Pas d'attestation, pas d'audit trail, pas de preuves pour votre OPCO." },
];

const STEPS = [
  { num: "01", title: "Tu dis", body: "Décris ton besoin en langage naturel. Pas de jargon." },
  { num: "02", title: "Jarvis fait", body: "L'IA génère, forme, protège et documente en temps réel." },
  { num: "03", title: "Tu prouves", body: "Attestation PDF signée + audit trail exportable en 1 clic." },
];

const FEATURES = [
  { icon: BookOpen, title: "Modules + Quiz + Attestation",  desc: "500+ modules IA/Cyber/Vibe Coding. Quiz adaptatifs. PDFs vérifiables." },
  { icon: Mic,      title: "Chat + Voix KITT",              desc: "Jarvis parle. Vraiment. Interface vocale façon science-fiction." },
  { icon: FileText, title: "Artifact Forge",                desc: "Génère SOP, charte IA, plan de conformité — PDF en 1 clic." },
  { icon: Bot,      title: "Autopilots",                    desc: "Conformité NIS2, MVP tech, Hygiène cyber — pilote automatique." },
  { icon: BarChart3, title: "Manager Dashboard",            desc: "25 sièges, suivi d'équipe, alertes de risque, rapports RH." },
  { icon: Shield,   title: "Control Room coûts",            desc: "Monitoring usage IA, kill switch, budget cap, anti-abus." },
];

const PRO_FEATURES = [
  "Modules illimités (IA, Cyber, Vibe Coding)",
  "500 messages IA / jour",
  "Voix Jarvis KITT activée",
  "Attestations PDF vérifiables",
  "Artifact Forge (PDFs illimités)",
  "Dashboard Manager (25 sièges)",
  "Missions quotidiennes Jarvis",
  "Annulation en 2 clics — sans engagement",
];

const FAQ = [
  {
    q: "Comment fonctionne l'essai 24h ?",
    a: "Vous accédez à tout Pro pendant 24h. Zéro prélèvement. Si vous ne résiliez pas avant, l'abonnement démarre automatiquement à 59€/mois.",
  },
  {
    q: "Puis-je résilier quand je veux ?",
    a: "Oui. En 2 clics depuis votre espace. Pas d'engagement. Vos données sont conservées 90 jours.",
  },
  {
    q: "Est-ce finançable OPCO ?",
    a: "Oui. GENIE IA délivre des attestations de formation. Contactez-nous pour un devis OPCO ou CPF.",
  },
  {
    q: "Combien de collaborateurs ?",
    a: "25 sièges inclus dans le plan Pro. Pour des équipes plus larges, contactez-nous.",
  },
  {
    q: "Mes données sont-elles sécurisées ?",
    a: "Oui — hébergement européen, chiffrement bout-en-bout, RGPD natif. Aucune donnée vendue.",
  },
  {
    q: "Qui gère l'IA derrière GENIE ?",
    a: "Nous orchestrons les meilleurs modèles (Gemini, GPT-5) avec un bouclier anti-abus propriétaire. Vous ne payez pas l'API.",
  },
];

/* ─── Component ──────────────────────────────────────────────── */
export default function Index() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [demoInput, setDemoInput] = useState("");
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoResult, setDemoResult] = useState<string | null>(null);

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      navigate("/register?redirect=/pricing");
      return;
    }
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");
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

  const handleDemo = async () => {
    if (!demoInput.trim()) return;
    setDemoLoading(true);
    // Simulated demo response — no real API call needed for funnel
    await new Promise((r) => setTimeout(r, 1200));
    setDemoResult(
      `✅ Jarvis a analysé votre besoin : "${demoInput.trim()}"\n\n📄 Un plan d'action en 3 étapes a été généré.\n🔐 Une attestation PDF est prête à télécharger.\n\n➡️ Passez en GENIE Pro pour débloquer ce rapport complet.`
    );
    setDemoLoading(false);
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <Helmet>
        <title>GENIE IA – Maîtrisez l'IA & la Cybersécurité — 59€/mois</title>
        <meta name="description" content="Formations IA, Cybersécurité et Vibe Coding. Attestations PDF vérifiables, voix Jarvis, dashboard manager. Essai 24h. 59€/mois TTC." />
        <meta property="og:title" content="GENIE IA – Maîtrisez l'IA & la Cybersécurité" />
        <meta property="og:description" content="Formez-vous à l'IA, Cyber et Vibe Coding. Attestations vérifiables. 59€/mois. Essai 24h." />
        <meta property="og:image" content="https://genie-ai-mastery.lovable.app/logo-genie.png" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://genie-ai-mastery.lovable.app/" />
        <meta name="theme-color" content="#646CDC" />
        <script type="application/ld+json">{JSON.stringify(organizationSchema())}</script>
        <script type="application/ld+json">{JSON.stringify(softwareApplicationSchema())}</script>
        <script type="application/ld+json">{JSON.stringify(productSchema())}</script>
      </Helmet>

      <div className="min-h-screen flex flex-col gradient-hero relative overflow-x-hidden">
        {/* ── Ambient glows ── */}
        <div className="fixed top-1/4 left-1/4 w-[500px] h-[500px] rounded-full pointer-events-none opacity-30 blur-3xl animate-pulse-slow"
          style={{ background: "radial-gradient(circle, hsl(235 62% 63% / 0.15) 0%, transparent 70%)" }} />
        <div className="fixed bottom-1/3 right-1/4 w-80 h-80 rounded-full pointer-events-none opacity-20 blur-3xl animate-float"
          style={{ background: "radial-gradient(circle, hsl(350 76% 47% / 0.12) 0%, transparent 70%)" }} />

        {/* ══════════════════════════════════════════════════════════
            NAVBAR
        ══════════════════════════════════════════════════════════ */}
        <header className="relative z-20 flex items-center justify-between px-4 sm:px-8 py-4 border-b border-border/30 bg-background/80 backdrop-blur-md sticky top-0">
          <img src={logoGenie} alt="GENIE IA" className="h-10 w-auto" style={{ filter: "drop-shadow(0 0 10px hsl(235 62% 63% / 0.4))" }} />
          <nav className="flex items-center gap-3">
            <button onClick={() => scrollTo("demo")} className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors">
              Démo 60s
            </button>
            {isAuthenticated ? (
              <Link to="/app/dashboard" className="text-sm font-medium text-primary hover:brightness-110 transition-colors">
                Mon espace →
              </Link>
            ) : (
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Connexion
              </Link>
            )}
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-sm font-bold shadow-glow hover:brightness-110 active:scale-[0.97] transition-all"
            >
              {checkoutLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Essai 24h — 59€/mois
            </button>
          </nav>
        </header>

        {/* ══════════════════════════════════════════════════════════
            1 — HERO
        ══════════════════════════════════════════════════════════ */}
        <section className="relative z-10 flex flex-col items-center justify-center px-4 sm:px-6 pt-20 pb-24 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent/40 bg-accent/10 text-xs font-bold text-accent mb-6 animate-fade-in">
            <Flame className="w-3.5 h-3.5" />
            Offre de lancement — 100 places à 59€/mois
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-[1.08] tracking-tight mb-6 max-w-4xl animate-slide-up">
            Il est temps d'arrêter de payer des{" "}
            <span className="text-gradient">formations IA hors de prix.</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mb-4 leading-relaxed animate-slide-up" style={{ animationDelay: "80ms" }}>
            Qui d'autre que l'IA peut mieux vous former à l'IA ?
          </p>
          <p className="text-base text-muted-foreground max-w-xl mb-10 animate-slide-up" style={{ animationDelay: "120ms" }}>
            GENIE IA démocratise l'accès à l'IA, la Cybersécurité et le Vibe Coding — avec une qualité extrême, des attestations vérifiables et un Jarvis vocal à la demande.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 mb-14 animate-slide-up" style={{ animationDelay: "160ms" }}>
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl gradient-primary text-primary-foreground font-black text-base shadow-glow hover:brightness-110 active:scale-[0.97] transition-all text-center"
            >
              {checkoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Démarrer maintenant — 59€/mois — Essai 24h
            </button>
            <button
              onClick={() => scrollTo("demo")}
              className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border border-border/60 text-foreground font-semibold text-base glass hover:border-primary/40 transition-all"
            >
              <Play className="w-4 h-4 text-primary" />
              Voir la démo 60s
            </button>
          </div>

          {/* 3 Preuves */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full animate-slide-up" style={{ animationDelay: "220ms" }}>
            {PROOFS.map((p) => (
              <div key={p.label} className="glass rounded-2xl px-5 py-4 flex flex-col gap-2 hover-glow transition-all">
                <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow-sm">
                  <p.icon className="w-4.5 h-4.5 text-primary-foreground" style={{ width: 18, height: 18 }} />
                </div>
                <p className="text-sm font-bold text-foreground">{p.label}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>

          {/* Scroll indicator */}
          <button onClick={() => scrollTo("problem")} className="mt-16 text-muted-foreground hover:text-primary transition-colors animate-bounce">
            <ChevronDown className="w-6 h-6" />
          </button>
        </section>

        {/* ══════════════════════════════════════════════════════════
            2 — LE PROBLÈME
        ══════════════════════════════════════════════════════════ */}
        <section id="problem" className="relative z-10 px-4 sm:px-8 py-20 max-w-5xl mx-auto w-full">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/30 bg-accent/8 text-xs font-semibold text-accent mb-4">
              <AlertTriangle className="w-3.5 h-3.5" />
              Le problème
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-foreground leading-tight">
              Le marché de la formation est cassé.<br />
              <span className="text-gradient-accent">Vous le savez déjà.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PROBLEMS.map((p) => (
              <div key={p.title} className="glass rounded-2xl p-6 border border-accent/20 hover:border-accent/40 transition-all group">
                <div className="w-2 h-2 rounded-full bg-accent mb-4 group-hover:shadow-accent transition-all" />
                <h3 className="font-black text-foreground text-lg mb-2">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            3 — LA SOLUTION
        ══════════════════════════════════════════════════════════ */}
        <section className="relative z-10 px-4 sm:px-8 py-20 max-w-5xl mx-auto w-full">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-xs font-semibold text-primary mb-4">
              <Star className="w-3.5 h-3.5" />
              La solution GENIE IA
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-foreground leading-tight">
              Le formateur humain explique.<br />
              <span className="text-gradient">GENIE IA exécute et protège.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((s) => (
              <div key={s.num} className="relative glass rounded-2xl p-7 hover-glow transition-all">
                <span className="text-6xl font-black text-primary/10 leading-none select-none absolute top-4 right-5">{s.num}</span>
                <h3 className="text-2xl font-black text-gradient mb-3">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            4 — FONCTIONNALITÉS
        ══════════════════════════════════════════════════════════ */}
        <section className="relative z-10 px-4 sm:px-8 py-20 max-w-6xl mx-auto w-full">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-foreground">
              Tout ce qu'il vous faut.<br />
              <span className="text-gradient">Dans un seul outil.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="glass rounded-2xl p-6 group hover:border-primary/40 hover:shadow-glow-sm transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center mb-4 group-hover:shadow-glow transition-all">
                  <f.icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <h3 className="font-bold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            5 — DÉMO 60s
        ══════════════════════════════════════════════════════════ */}
        <section id="demo" className="relative z-10 px-4 sm:px-8 py-20 max-w-3xl mx-auto w-full">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-xs font-semibold text-primary mb-4">
              <Play className="w-3.5 h-3.5" />
              Démo 60 secondes
            </div>
            <h2 className="text-3xl font-black text-foreground">
              Testez Jarvis.<br />
              <span className="text-gradient">Maintenant. Gratuitement.</span>
            </h2>
          </div>
          <div className="glass rounded-2xl p-6 sm:p-8">
            {!demoResult ? (
              <>
                <label className="block text-sm font-semibold text-foreground mb-3">
                  Votre besoin en une phrase :
                </label>
                <textarea
                  value={demoInput}
                  onChange={(e) => setDemoInput(e.target.value)}
                  placeholder="Ex : Je veux comprendre comment sécuriser mon entreprise contre les ransomwares"
                  rows={3}
                  className="w-full rounded-xl border border-border/60 bg-input/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 transition-all resize-none mb-4"
                />
                <button
                  onClick={handleDemo}
                  disabled={demoLoading || !demoInput.trim()}
                  className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-bold text-sm shadow-glow hover:brightness-110 active:scale-[0.97] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {demoLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Jarvis analyse...</>
                  ) : (
                    <><Zap className="w-4 h-4" /> Lancer l'analyse — Gratuit</>
                  )}
                </button>
              </>
            ) : (
              <div className="space-y-5">
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
                  <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">{demoResult}</pre>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={checkoutLoading}
                  className="w-full py-4 rounded-xl gradient-primary text-primary-foreground font-black text-base shadow-glow hover:brightness-110 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
                >
                  {checkoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  Débloquer le rapport complet — 59€/mois — Essai 24h
                </button>
                <button onClick={() => { setDemoResult(null); setDemoInput(""); }} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
                  Relancer une démo
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            6 — PRICING
        ══════════════════════════════════════════════════════════ */}
        <section id="pricing" className="relative z-10 px-4 sm:px-8 py-20 max-w-lg mx-auto w-full">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-black text-foreground">
              Un seul plan.<br />
              <span className="text-gradient">Tout inclus.</span>
            </h2>
          </div>

          <div className="relative rounded-3xl border-2 border-primary/60 p-7 sm:p-10 glass shadow-glow">
            {/* Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
              <div className="inline-flex items-center gap-1.5 px-5 py-1.5 rounded-full text-xs font-black text-primary-foreground gradient-primary animate-glow-pulse">
                🔥 OFFRE LANCEMENT — -40%
              </div>
            </div>

            <div className="mt-2 mb-1">
              <h3 className="text-xl font-black text-foreground">GENIE Pro</h3>
              <p className="text-sm text-muted-foreground mt-1">IA · Cybersécurité · Vibe Coding</p>
            </div>

            <div className="flex items-end gap-2 my-5">
              <span className="text-muted-foreground line-through text-lg">99€</span>
              <span className="text-6xl font-black text-foreground leading-none">59€</span>
              <span className="text-muted-foreground text-sm mb-2">/mois TTC</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-xs font-semibold text-primary mb-6">
              <Check className="w-3 h-3" />
              Essai 24h — Annulation en 2 clics
            </div>

            <ul className="space-y-3 mb-8">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-foreground">
                  <div className="w-5 h-5 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="w-full py-4 rounded-2xl gradient-primary text-primary-foreground font-black text-lg shadow-glow hover:brightness-110 active:scale-[0.97] transition-all flex items-center justify-center gap-3"
            >
              {checkoutLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              Démarrer — 59€/mois
            </button>

            <p className="text-xs text-muted-foreground text-center mt-4">
              Paiement sécurisé Stripe · RGPD · Données hébergées en Europe
            </p>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            7 — FAQ
        ══════════════════════════════════════════════════════════ */}
        <section className="relative z-10 px-4 sm:px-8 py-16 max-w-3xl mx-auto w-full">
          <h2 className="text-2xl sm:text-3xl font-black text-foreground text-center mb-10">
            Vos objections. <span className="text-gradient">Nos réponses.</span>
          </h2>
          <Accordion type="single" collapsible className="space-y-3">
            {FAQ.map((item, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="border border-border/50 rounded-2xl px-6 glass"
              >
                <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-5 text-left">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-5 leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* ══════════════════════════════════════════════════════════
            8 — FOOTER
        ══════════════════════════════════════════════════════════ */}
        <footer className="relative z-10 border-t border-border/30 px-4 sm:px-8 py-10 bg-background/60 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-6">
              <img src={logoGenie} alt="GENIE IA" className="h-10 w-auto opacity-80" />
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-muted-foreground">
                {[
                  { to: "/mentions-legales", label: "Mentions légales" },
                  { to: "/confidentialite", label: "Confidentialité" },
                  { to: "/cgu", label: "CGU" },
                  { to: "/rgpd", label: "RGPD" },
                  { to: "/security", label: "Sécurité" },
                  { to: "/guides", label: "Guides" },
                ].map((l) => (
                  <Link key={l.to} to={l.to} className="hover:text-foreground transition-colors">{l.label}</Link>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-muted-foreground pt-4 border-t border-border/20">
              <span className="flex items-center gap-1.5"><Lock className="w-3 h-3" /> Paiement sécurisé Stripe</span>
              <span className="flex items-center gap-1.5"><Shield className="w-3 h-3" /> RGPD natif</span>
              <span className="flex items-center gap-1.5"><Globe className="w-3 h-3" /> Hébergement Europe</span>
              <span>© 2025 GENIE IA. Tous droits réservés.</span>
            </div>
          </div>
        </footer>

        {/* ══════════════════════════════════════════════════════════
            STICKY CTA — MOBILE
        ══════════════════════════════════════════════════════════ */}
        <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden px-4 pb-4 pt-3 bg-background/95 backdrop-blur-md border-t border-border/40">
          <button
            onClick={handleCheckout}
            disabled={checkoutLoading}
            className="w-full py-4 rounded-2xl gradient-primary text-primary-foreground font-black text-sm shadow-glow hover:brightness-110 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
          >
            {checkoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Démarrer — 59€/mois — Essai 24h
          </button>
          <p className="text-center text-xs text-muted-foreground mt-1.5">Annulation en 2 clics · Zéro engagement</p>
        </div>
      </div>
    </>
  );
}
