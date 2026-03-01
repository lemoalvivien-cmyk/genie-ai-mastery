import { Helmet } from "react-helmet-async";
import { Brain, LogOut, BookOpen, BarChart3, MessageSquare, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { profile, signOut } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] || "vous";

  const cards = [
    { icon: BookOpen, title: "Modules", description: "Continuez votre apprentissage", href: "/app/modules", color: "from-indigo-500/20 to-purple-500/20" },
    { icon: MessageSquare, title: "Chat IA", description: "Posez vos questions à votre Génie", href: "/app/chat", color: "from-cyan-500/20 to-teal-500/20" },
    { icon: BarChart3, title: "Progression", description: "Suivez vos statistiques", href: "/app/progress", color: "from-emerald-500/20 to-green-500/20" },
    { icon: Shield, title: "Cybersécurité", description: "Modules sécurité dédiés", href: "/app/modules?domain=cyber", color: "from-amber-500/20 to-orange-500/20" },
  ];

  return (
    <>
      <Helmet>
        <title>Dashboard – GENIE IA</title>
      </Helmet>
      <div className="min-h-screen gradient-hero">
        {/* Navbar */}
        <header className="border-b border-border/40 px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
              <Brain className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold">GENIE <span className="text-gradient">IA</span></span>
          </Link>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Se déconnecter"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
          {/* Welcome message */}
          <div className="mb-8 animate-slide-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-sm text-primary mb-3">
              ✨ Bienvenue sur GENIE IA
            </div>
            <h1 className="text-3xl font-bold">
              Bienvenue <span className="text-gradient">{firstName}</span> !
            </h1>
            <p className="text-muted-foreground mt-1">Votre Génie est prêt. Que voulez-vous apprendre aujourd'hui ?</p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { label: "Modules complétés", value: "0" },
              { label: "Série en cours", value: `${profile?.streak_count ?? 0} 🔥` },
              { label: "Score moyen", value: "—" },
              { label: "Attestations", value: "0" },
            ].map((s) => (
              <div key={s.label} className="p-4 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm">
                <div className="text-2xl font-bold text-gradient">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.title}
                  to={card.href}
                  className={`group flex items-center gap-4 p-5 rounded-2xl border border-border/50 bg-gradient-to-br ${card.color} hover:border-primary/40 hover:scale-[1.02] transition-all duration-300 shadow-card`}
                >
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center group-hover:shadow-glow transition-all">
                    <Icon className="w-6 h-6 text-primary-foreground" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="font-semibold">{card.title}</div>
                    <div className="text-sm text-muted-foreground">{card.description}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </main>
      </div>
    </>
  );
}
