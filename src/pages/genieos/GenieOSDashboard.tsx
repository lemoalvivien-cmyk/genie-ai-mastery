import { Bot, Zap, Code2, Cpu, Store, BarChart2, ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const MODULES = [
  {
    to: "/os/agents",
    icon: Bot,
    label: "Agent Builder",
    desc: "Conçois et déploie des agents IA autonomes pour automatiser tes tâches.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10 border-emerald-400/20",
    badge: "Populaire",
  },
  {
    to: "/os/automation",
    icon: Zap,
    label: "Automation",
    desc: "Génère des workflows d'automatisation avec Make, Zapier ou n8n.",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10 border-yellow-400/20",
    badge: null,
  },
  {
    to: "/os/app-builder",
    icon: Code2,
    label: "App Builder",
    desc: "Génère l'architecture complète d'une application IA en quelques secondes.",
    color: "text-blue-400",
    bg: "bg-blue-400/10 border-blue-400/20",
    badge: null,
  },
  {
    to: "/os/ai-tools",
    icon: Cpu,
    label: "AI Tools Explorer",
    desc: "Compare et découvre les meilleurs outils IA pour chaque cas d'usage.",
    color: "text-purple-400",
    bg: "bg-purple-400/10 border-purple-400/20",
    badge: "Nouveau",
  },
  {
    to: "/os/marketplace",
    icon: Store,
    label: "Marketplace",
    desc: "Partage et découvre des agents, prompts et workflows créés par la communauté.",
    color: "text-orange-400",
    bg: "bg-orange-400/10 border-orange-400/20",
    badge: "Bientôt",
  },
  {
    to: "/os/business",
    icon: BarChart2,
    label: "Business Analysis",
    desc: "Analyse des opportunités business liées à l'IA avec des insights actionnables.",
    color: "text-pink-400",
    bg: "bg-pink-400/10 border-pink-400/20",
    badge: null,
  },
];

export default function GenieOSDashboard() {
  const navigate = useNavigate();

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium mb-6">
            <Sparkles className="w-3 h-3" />
            Copilote IA Universel
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
            Bienvenue sur <span className="text-gradient">GENIE OS</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            Ton copilote intelligent pour comprendre, automatiser et construire avec l'IA.
            Choisis un module ou démarre une conversation.
          </p>
          <button
            onClick={() => navigate("/os")}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-lg gradient-primary text-white font-semibold text-sm shadow-glow hover:opacity-90 transition-opacity"
          >
            <Sparkles className="w-4 h-4" />
            Démarrer le Chat IA
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Module grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map(({ to, icon: Icon, label, desc, color, bg, badge }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="group relative text-left p-5 rounded-xl border border-border bg-card hover:border-primary/30 transition-all card-hover hover-glow"
            >
              {badge && (
                <span className={cn(
                  "absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full border font-medium",
                  bg
                )}>
                  {badge}
                </span>
              )}
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-4 border", bg)}>
                <Icon className={cn("w-5 h-5", color)} />
              </div>
              <h3 className="font-semibold text-foreground mb-1.5 text-sm">{label}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              <div className="flex items-center gap-1 mt-4 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Ouvrir <ArrowRight className="w-3 h-3" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
