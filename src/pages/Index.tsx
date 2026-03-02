import { Helmet } from "react-helmet-async";
import { Brain, ShieldCheck, Award, AlertTriangle, Lock, Globe } from "lucide-react";
import { CountdownTimer } from "@/components/CountdownTimer";
import { WaitlistForm } from "@/components/WaitlistForm";
import heroBg from "@/assets/hero-bg.png";

const whyNotChatgpt = [
  {
    icon: ShieldCheck,
    title: "Jarvis vous guide",
    text: "Pas de champ vide. Genie parle en premier, propose, et vous accompagne pas à pas.",
  },
  {
    icon: Award,
    title: "Des preuves concrètes",
    text: "Attestations de formation vérifiables. Indispensable pour la conformité NIS2 et les audits.",
  },
  {
    icon: AlertTriangle,
    title: "Bouton panique",
    text: "Un problème ? Un clic. Genie vous guide dans la crise, calmement, étape par étape.",
  },
];

const stats = [
  { value: "500+", label: "Modules prévus" },
  { value: "98%", label: "Taux de satisfaction" },
  { value: "24/7", label: "Disponibilité" },
  { value: "0€", label: "Pour commencer" },
];

export default function Index() {
  return (
    <>
      <Helmet>
        <title>GENIE IA – Maîtrisez l'IA & la Cybersécurité</title>
        <meta
          name="description"
          content="Plateforme d'apprentissage IA et cybersécurité. Maîtrisez l'IA générative, protégez-vous en ligne. Sans formateur, à votre rythme."
        />
        <meta property="og:title" content="GENIE IA – Maîtrisez l'IA & la Cybersécurité" />
        <meta
          property="og:description"
          content="Maîtrisez l'IA. Protégez-vous en cyber. Sans formateur."
        />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://genie-ia.fr" />
        <meta name="theme-color" content="#0F172A" />
      </Helmet>

      <div className="min-h-screen flex flex-col gradient-hero relative overflow-hidden">
        {/* Hero background */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 pointer-events-none"
          style={{ backgroundImage: `url(${heroBg})` }}
          aria-hidden="true"
        />

        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none animate-pulse-slow" aria-hidden="true" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-indigo-glow/8 rounded-full blur-3xl pointer-events-none animate-float" aria-hidden="true" />

        {/* Navbar */}
        <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 lg:px-12 py-5 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow animate-glow">
              <Brain className="w-4 h-4 text-primary-foreground" aria-hidden="true" />
            </div>
            <span className="font-bold text-lg tracking-tight text-foreground">
              GENIE <span className="text-gradient">IA</span>
            </span>
          </div>
          <nav aria-label="Navigation principale">
            <a
              href="#waitlist"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/40 text-sm font-medium text-primary hover:bg-primary/10 transition-all duration-200 focus-ring"
            >
              Rejoindre la liste
            </a>
          </nav>
        </header>

        {/* Hero */}
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 sm:py-20">
          {/* Badge */}
          <div className="animate-slide-up" style={{ animationDelay: "0ms" }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-xs font-medium text-primary mb-8">
              ✨ Lancement imminent — Rejoignez les premiers ✨
            </div>
          </div>

          {/* Title */}
          <div className="text-center max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: "100ms" }}>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-6">
              Votre assistant IA pour maîtriser{" "}
              <span className="text-gradient">la cybersécurité,</span>
              <br />
              <span className="text-gradient">l'intelligence artificielle</span>
              {" "}et le{" "}
              <span className="text-gradient">vibe coding.</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
              3 minutes par jour. Guide vocal. Zéro jargon.
            </p>
          </div>

          {/* Stats row */}
          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mt-12 mb-14 w-full max-w-2xl animate-slide-up"
            style={{ animationDelay: "200ms" }}
          >
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1 p-3 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm">
                <span className="text-xl sm:text-2xl font-extrabold text-gradient">{s.value}</span>
                <span className="text-xs text-muted-foreground text-center">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Countdown */}
          <section
            className="w-full max-w-2xl mb-14 animate-slide-up"
            style={{ animationDelay: "300ms" }}
            aria-labelledby="countdown-title"
          >
            <p id="countdown-title" className="text-center text-sm font-medium text-muted-foreground uppercase tracking-widest mb-6">
              🚀 Lancement dans
            </p>
            <CountdownTimer />
          </section>

          {/* Waitlist */}
          <section
            id="waitlist"
            className="w-full max-w-lg animate-slide-up"
            style={{ animationDelay: "400ms" }}
            aria-labelledby="waitlist-title"
          >
            <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6 sm:p-8 shadow-card">
              <div className="text-center mb-6">
                <h2 id="waitlist-title" className="text-xl sm:text-2xl font-bold text-foreground mb-2">
                  Soyez parmi les premiers
                </h2>
                <p className="text-sm text-muted-foreground">
                  Accès anticipé, tarif fondateur, contenu exclusif.
                </p>
              </div>
              <WaitlistForm />
            </div>
          </section>

          {/* Why not ChatGPT */}
          <section
            className="w-full max-w-3xl mt-20 animate-slide-up"
            style={{ animationDelay: "500ms" }}
            aria-labelledby="why-title"
          >
            <h2 id="why-title" className="text-center text-lg font-bold text-foreground mb-8 tracking-tight">
              Pourquoi pas ChatGPT ?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              {whyNotChatgpt.map((f) => (
                <div
                  key={f.title}
                  className="group flex flex-col gap-3 p-5 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm hover:border-primary/40 hover:bg-card/70 hover:scale-[1.02] transition-all duration-300 shadow-card"
                >
                  <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center group-hover:shadow-glow transition-all duration-300">
                    <f.icon className="w-5 h-5 text-primary-foreground" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
              <a
                href="/pricing"
                className="px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm shadow-glow hover:opacity-90 transition-opacity"
              >
                Essai gratuit 14 jours →
              </a>
              <a
                href="/register"
                className="px-6 py-3 rounded-xl border border-border/60 text-foreground font-medium text-sm hover:bg-card/60 transition-colors"
              >
                Découvrir gratuitement
              </a>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="relative z-10 border-t border-border/40 px-4 sm:px-6 py-8">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md gradient-primary flex items-center justify-center">
                <Brain className="w-3 h-3 text-primary-foreground" aria-hidden="true" />
              </div>
              <span className="text-sm font-semibold text-foreground">
                GENIE <span className="text-gradient">IA</span>
              </span>
            </div>
            <nav aria-label="Liens légaux">
              <ul className="flex items-center gap-4 sm:gap-6 list-none m-0 p-0">
                {[
                  { href: "/mentions-legales", label: "Mentions légales" },
                  { href: "/confidentialite", label: "Confidentialité" },
                  { href: "/cgu", label: "CGU" },
                ].map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 focus-ring rounded"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Lock className="w-3 h-3" aria-hidden="true" />
              <span>Données sécurisées</span>
              <Globe className="w-3 h-3" aria-hidden="true" />
              <span>© 2025 GENIE IA</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
