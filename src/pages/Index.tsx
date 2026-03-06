import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Bot, Zap, Code2, BarChart3, Users, Globe, ArrowRight, CheckCircle,
  Star, Sparkles, Rocket, Brain, TrendingUp, Play, ChevronRight,
  Mail, Loader2, X, Smartphone,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import logoGenie from "@/assets/logo-genie.png";
import { softwareApplicationSchema, productSchema, organizationSchema, faqSchema } from "@/lib/seo";
import { ProFooter } from "@/components/ProFooter";
import { usePWAInstall } from "@/hooks/usePWAInstall";

const STATS = [
  { value: "2 400+", label: "Agents créés" },
  { value: "850+", label: "Opportunités générées" },
  { value: "98%", label: "Satisfaction" },
  { value: "3 min", label: "Pour démarrer" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: Bot,
    title: "Créer un agent",
    desc: "Configurez un agent IA personnalisé en quelques clics. Il travaille pour vous en autonomie.",
    color: "text-primary",
    bg: "bg-primary/10 border-primary/20",
  },
  {
    step: "02",
    icon: TrendingUp,
    title: "Analyser un marché",
    desc: "Le Revenue Engine scanne les marchés, détecte des opportunités et génère des leads qualifiés.",
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
  },
  {
    step: "03",
    icon: Code2,
    title: "Construire un produit",
    desc: "L'Auto Builder génère une architecture complète pour votre SaaS, app ou service IA.",
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/20",
  },
];

const FEATURES = [
  {
    icon: Bot,
    title: "Agents IA autonomes",
    desc: "Créez des agents qui travaillent pour vous 24h/24 — génération de leads, veille, automatisation.",
    color: "text-primary",
  },
  {
    icon: BarChart3,
    title: "Business Intelligence",
    desc: "Détectez des opportunités business en temps réel grâce à l'analyse de marché assistée par IA.",
    color: "text-green-400",
  },
  {
    icon: Zap,
    title: "Automatisation totale",
    desc: "Générez des workflows Make, Zapier ou n8n. Automatisez les tâches répétitives sans coder.",
    color: "text-yellow-400",
  },
  {
    icon: Code2,
    title: "AI Builder",
    desc: "Prototypez et construisez des produits IA complets avec architecture, stack et roadmap générés automatiquement.",
    color: "text-blue-400",
  },
  {
    icon: Brain,
    title: "Mémoire intelligente",
    desc: "GENIE OS se souvient de vos projets, objectifs et préférences. Chaque session est personnalisée.",
    color: "text-purple-400",
  },
  {
    icon: Globe,
    title: "Veille IA mondiale",
    desc: "Restez à la pointe : tendances, outils, acteurs — un flux curé d'intelligence artificielle.",
    color: "text-cyan-400",
  },
];

const USE_CASES = [
  {
    icon: Rocket,
    title: "Entrepreneurs",
    desc: "Validez votre idée, trouvez vos premiers clients et construisez votre produit IA 10x plus vite.",
    cta: "Démarrer maintenant",
  },
  {
    icon: Users,
    title: "Freelances",
    desc: "Automatisez votre prospection, créez des livrables IA premium et multipliez vos revenus.",
    cta: "Voir comment",
  },
  {
    icon: BarChart3,
    title: "Entreprises",
    desc: "Déployez des agents IA sur mesure, automatisez vos processus et pilotez votre croissance.",
    cta: "Explorer",
  },
  {
    icon: Code2,
    title: "Créateurs SaaS",
    desc: "Du concept à l'architecture en minutes. Générez votre MVP IA avec le Co-Founder IA.",
    cta: "Builder maintenant",
  },
];

const TESTIMONIALS = [
  {
    name: "Sophie M.",
    role: "Entrepreneur, Paris",
    quote: "En 3 jours, GENIE OS m'a aidé à valider mon idée, générer 40 leads et construire le MVP. Bluffant.",
    avatar: "SM",
    stars: 5,
  },
  {
    name: "Thomas R.",
    role: "Freelance Growth",
    quote: "J'ai remplacé 5 outils différents. Le Revenue Engine a trouvé 12 opportunités qualifiées en une semaine.",
    avatar: "TR",
    stars: 5,
  },
  {
    name: "Camille D.",
    role: "Directrice Innovation",
    quote: "Notre équipe a automatisé 60% de ses tâches répétitives. Les agents IA tournent 24h/24.",
    avatar: "CD",
    stars: 5,
  },
];

export default function Index() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [emailLead, setEmailLead] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailDone, setEmailDone] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const { isInstallable, isIOS, triggerInstall } = usePWAInstall();

  // Ref capture handled globally by App.tsx RefCapture component

  const handleCTA = () => {
    if (isAuthenticated) {
      navigate("/os/control");
    } else {
      navigate("/register");
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
      await supabase.from("email_leads").insert({ email, source: "landing_genieos" });
      setEmailDone(true);
      toast({ title: "✅ C'est parti !", description: "Vérifiez votre boîte mail." });
    } catch {
      toast({ title: "Erreur", description: "Réessayez dans un instant.", variant: "destructive" });
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
              <li className="flex items-start gap-3"><span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">1</span><span>Appuyez sur <strong className="text-foreground">Partager ⎙</strong> dans Safari</span></li>
              <li className="flex items-start gap-3"><span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">2</span><span>Appuyez sur <strong className="text-foreground">« Sur l'écran d'accueil »</strong></span></li>
              <li className="flex items-start gap-3"><span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">3</span><span>Appuyez sur <strong className="text-foreground">« Ajouter »</strong></span></li>
            </ol>
            <button onClick={() => setShowIOSInstructions(false)} className="mt-5 w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">Compris !</button>
          </div>
        </div>
      )}

      <Helmet>
        <title>GENIE OS – Votre copilote IA pour créer, automatiser et générer des opportunités business</title>
        <meta name="description" content="GENIE OS combine agents IA, automatisations et intelligence business dans un seul système. Créez votre premier agent en 3 minutes." />
        <meta property="og:title" content="GENIE OS – Copilote IA Business" />
        <meta property="og:description" content="Agents IA autonomes, Revenue Engine, Auto Builder. La machine économique IA complète." />
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

        {/* ── NAVBAR ── */}
        <header className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-8 py-3.5 border-b border-border/40 bg-background/90 backdrop-blur-md">
          <img src={logoGenie} alt="GENIE OS" className="h-8 w-auto" />
          <nav className="flex items-center gap-3">
            <Link to="/pricing" className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors">Tarifs</Link>
            <Link to="/guides" className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors">Guides</Link>
            {isAuthenticated ? (
              <Link to="/os/control" className="text-sm font-semibold text-primary hover:brightness-110 transition-colors">
                Mon GENIE OS →
              </Link>
            ) : (
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Connexion</Link>
            )}
            <button
              onClick={handleCTA}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-glow hover:brightness-110 transition-all active:scale-[0.97]"
              style={{ background: "hsl(var(--accent))" }}
            >
              Essayer gratuitement
            </button>
          </nav>
        </header>

        {/* ══════════════════ HERO ══════════════════ */}
        <section className="relative flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-4 sm:px-6 py-20 text-center overflow-hidden">
          {/* Grid background */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: `linear-gradient(rgba(82,87,216,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(82,87,216,0.8) 1px, transparent 1px)`, backgroundSize: "40px 40px" }} />
          {/* Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full pointer-events-none blur-3xl" style={{ background: "radial-gradient(ellipse, rgba(82,87,216,0.1) 0%, transparent 70%)" }} />

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium mb-6 animate-slide-up">
            <Sparkles className="w-3 h-3" />
            Copilote IA Business — 2026
          </div>

          {/* Headline */}
          <h1 className="relative text-5xl sm:text-6xl md:text-7xl font-black leading-[1.05] tracking-tight mb-5 max-w-4xl animate-slide-up">
            <span className="text-foreground">Votre copilote IA pour</span>
            <br />
            <span className="font-black" style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              créer, automatiser
            </span>
            <br />
            <span className="text-foreground">et générer des opportunités</span>
          </h1>

          <p className="relative text-lg sm:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed animate-slide-up" style={{ animationDelay: "80ms" }}>
            GENIE OS combine <strong className="text-foreground">agents IA</strong>, <strong className="text-foreground">automatisations</strong> et{" "}
            <strong className="text-foreground">intelligence business</strong> dans un seul système.
          </p>

          {/* CTAs */}
          <div className="relative flex flex-col sm:flex-row gap-3 mb-16 animate-slide-up" style={{ animationDelay: "160ms" }}>
            <button
              onClick={handleCTA}
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-white font-black text-base transition-all active:scale-[0.97] hover:brightness-110"
              style={{ background: "hsl(var(--accent))", boxShadow: "0 0 30px rgba(254,44,64,0.3)" }}
            >
              <Sparkles className="w-4 h-4" />
              Essayer GENIE OS gratuitement
            </button>
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-semibold text-base transition-all hover:bg-primary/10"
              style={{ border: "1px solid rgba(82,87,216,0.5)", color: "hsl(var(--primary))" }}
            >
              <Play className="w-4 h-4" />
              Voir comment ça marche
            </Link>
          </div>

          {/* Stats */}
          <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl w-full animate-slide-up" style={{ animationDelay: "240ms" }}>
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-black text-foreground">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════ HOW IT WORKS ══════════════════ */}
        <section className="py-24 px-4 sm:px-6 bg-card/30 border-y border-border/40">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-black text-foreground mb-3">Comment ça marche</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">Trois actions puissantes. Un système cohérent.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {HOW_IT_WORKS.map((item) => (
                <div key={item.step} className="relative p-6 rounded-2xl border border-border bg-card hover:border-primary/30 transition-all group">
                  <div className="absolute top-4 right-4 text-4xl font-black text-muted/20">{item.step}</div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border mb-4 ${item.bg}`}>
                    <item.icon className={`w-6 h-6 ${item.color}`} />
                  </div>
                  <h3 className="font-bold text-foreground text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  <div className="flex items-center gap-1 mt-4 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Essayer <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════ FEATURES ══════════════════ */}
        <section className="py-24 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-black text-foreground mb-3">Fonctionnalités principales</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">Tout ce dont vous avez besoin pour automatiser, analyser et construire.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map((f) => (
                <div key={f.title} className="p-5 rounded-xl border border-border bg-card hover:border-primary/20 transition-all">
                  <f.icon className={`w-6 h-6 mb-3 ${f.color}`} />
                  <h3 className="font-semibold text-foreground mb-1.5 text-sm">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════ USE CASES ══════════════════ */}
        <section className="py-24 px-4 sm:px-6 bg-card/30 border-y border-border/40">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-black text-foreground mb-3">Cas d'usage</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">GENIE OS s'adapte à votre activité, votre niveau et vos objectifs.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {USE_CASES.map((u) => (
                <div key={u.title} className="group p-6 rounded-2xl border border-border bg-card hover:border-primary/30 transition-all cursor-pointer" onClick={handleCTA}>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                      <u.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-foreground mb-1">{u.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{u.desc}</p>
                      <span className="inline-flex items-center gap-1 text-xs text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                        {u.cta} <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════ SOCIAL PROOF ══════════════════ */}
        <section className="py-24 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-black text-foreground mb-3">Ce qu'ils disent</h2>
              <div className="flex items-center justify-center gap-1 mt-2">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
                <span className="text-sm text-muted-foreground ml-2">4.9/5 • 200+ utilisateurs</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {TESTIMONIALS.map((t) => (
                <div key={t.name} className="p-5 rounded-xl border border-border bg-card space-y-3">
                  <div className="flex gap-0.5">
                    {[...Array(t.stars)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />)}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">"{t.quote}"</p>
                  <div className="flex items-center gap-2.5 pt-1">
                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">{t.avatar}</div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════ CTA FINAL ══════════════════ */}
        <section className="py-24 px-4 sm:px-6 bg-card/30 border-t border-border/40">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium mb-6">
              <CheckCircle className="w-3 h-3" />
              Gratuit pour commencer · Sans carte bancaire
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-foreground mb-4">
              Créez votre premier agent
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
              Rejoignez 2 400+ utilisateurs qui automatisent leur business avec GENIE OS.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
              <button
                onClick={handleCTA}
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-white font-black text-base transition-all hover:brightness-110 active:scale-[0.97]"
                style={{ background: "hsl(var(--accent))", boxShadow: "0 0 30px rgba(254,44,64,0.3)" }}
              >
                <Sparkles className="w-4 h-4" />
                Essayer GENIE OS →
              </button>
              <Link
                to="/os/agents"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-semibold text-base transition-all hover:bg-primary/10"
                style={{ border: "1px solid rgba(82,87,216,0.5)", color: "hsl(var(--primary))" }}
              >
                <Bot className="w-4 h-4" />
                Créer votre premier agent
              </Link>
            </div>

            {/* Email capture */}
            <div className="max-w-md mx-auto">
              <p className="text-xs text-muted-foreground mb-3">Ou recevez une démo personnalisée</p>
              {emailDone ? (
                <div className="flex items-center justify-center gap-2 text-sm text-green-400">
                  <CheckCircle className="w-4 h-4" /> On vous contacte bientôt !
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
                    {emailLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
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
