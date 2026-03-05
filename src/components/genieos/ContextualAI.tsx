import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Bot, DollarSign, Wand2, Brain, Zap, MessageSquare, ChevronRight,
  X, Lightbulb, Eye, Plane, Store, Database, Code2,
} from "lucide-react";

/* ── Context map per route ── */
interface ContextAction {
  label: string;
  to: string;
  icon: React.ElementType;
  color: string;
}

interface RouteContext {
  title: string;
  tip: string;
  actions: ContextAction[];
}

const ROUTE_CONTEXTS: Record<string, RouteContext> = {
  "/os/agents": {
    title: "Agent Builder",
    tip: "Définissez un objectif précis et des outils ciblés pour maximiser l'efficacité de votre agent.",
    actions: [
      { label: "Voir les agents actifs", to: "/os/agents-runtime", icon: Bot, color: "text-cyan-400" },
      { label: "Multi-Agents", to: "/os/multi-agent", icon: Zap, color: "text-sky-400" },
      { label: "Store d'agents", to: "/os/store", icon: Store, color: "text-violet-400" },
    ],
  },
  "/os/agents-runtime": {
    title: "Agents Runtime",
    tip: "Surveillez vos agents en temps réel. Un agent 'running' depuis trop longtemps peut nécessiter une révision.",
    actions: [
      { label: "Créer un agent", to: "/os/agents", icon: Bot, color: "text-emerald-400" },
      { label: "Multi-Agents", to: "/os/multi-agent", icon: Zap, color: "text-sky-400" },
      { label: "Memory Timeline", to: "/os/timeline", icon: Brain, color: "text-indigo-400" },
    ],
  },
  "/os/revenue": {
    title: "Revenue Engine",
    tip: "Plus votre requête est précise (secteur, taille d'entreprise, géo), meilleurs seront les leads générés.",
    actions: [
      { label: "Co-Founder IA", to: "/os/cofounder", icon: DollarSign, color: "text-emerald-400" },
      { label: "Opportunités", to: "/os/opportunities", icon: Zap, color: "text-yellow-400" },
      { label: "Construire un produit", to: "/os/builder", icon: Wand2, color: "text-orange-400" },
    ],
  },
  "/os/cofounder": {
    title: "Co-Founder IA",
    tip: "Partagez votre idée avec le maximum de contexte : secteur, cible, budget, timeline. L'IA génèrera un plan actionnable.",
    actions: [
      { label: "Revenue Engine", to: "/os/revenue", icon: DollarSign, color: "text-green-400" },
      { label: "Auto Builder", to: "/os/builder", icon: Wand2, color: "text-orange-400" },
      { label: "Business Analysis", to: "/os/business", icon: Zap, color: "text-pink-400" },
    ],
  },
  "/os/builder": {
    title: "Auto Builder",
    tip: "Décrivez votre idée en une phrase claire. L'IA génère une architecture, des agents et une stratégie go-to-market.",
    actions: [
      { label: "Co-Founder IA", to: "/os/cofounder", icon: DollarSign, color: "text-emerald-400" },
      { label: "App Builder", to: "/os/app-builder", icon: Code2, color: "text-blue-400" },
      { label: "Automation", to: "/os/automation", icon: Zap, color: "text-yellow-400" },
    ],
  },
  "/os/store": {
    title: "AI Store",
    tip: "Installez des agents officiels GENIE pour accélérer votre démarrage. Les agents étoilés sont les plus performants.",
    actions: [
      { label: "Agent Builder", to: "/os/agents", icon: Bot, color: "text-emerald-400" },
      { label: "Agent Economy", to: "/os/economy", icon: Store, color: "text-violet-400" },
      { label: "Agents Runtime", to: "/os/agents-runtime", icon: Zap, color: "text-cyan-400" },
    ],
  },
  "/os/skills": {
    title: "Skill Graph",
    tip: "Pratiquez régulièrement sur le Chat IA pour faire progresser automatiquement votre Skill Graph.",
    actions: [
      { label: "Chat IA", to: "/os", icon: MessageSquare, color: "text-primary" },
      { label: "Memory Timeline", to: "/os/timeline", icon: Brain, color: "text-indigo-400" },
      { label: "AI Brain", to: "/os/brain", icon: Brain, color: "text-rose-400" },
    ],
  },
  "/os/ai-watch": {
    title: "AI Watch",
    tip: "Configurez des sources RSS et mots-clés dans Knowledge pour des signaux encore plus pertinents.",
    actions: [
      { label: "Knowledge Base", to: "/os/knowledge", icon: Database, color: "text-indigo-400" },
      { label: "Autopilot", to: "/os/autopilot", icon: Plane, color: "text-sky-400" },
      { label: "Opportunités", to: "/os/opportunities", icon: Eye, color: "text-emerald-400" },
    ],
  },
  "/os/autopilot": {
    title: "Autopilot",
    tip: "Programmez vos agents sur des créneaux hors-heures de bureau pour maximiser la productivité.",
    actions: [
      { label: "Agents Runtime", to: "/os/agents-runtime", icon: Bot, color: "text-cyan-400" },
      { label: "AI Watch", to: "/os/ai-watch", icon: Eye, color: "text-amber-400" },
      { label: "Memory Timeline", to: "/os/timeline", icon: Brain, color: "text-indigo-400" },
    ],
  },
  "/os/timeline": {
    title: "Memory Timeline",
    tip: "Épinglez les événements importants pour que GENIE OS y fasse référence dans vos futures sessions.",
    actions: [
      { label: "AI Brain", to: "/os/brain", icon: Brain, color: "text-rose-400" },
      { label: "Command Center", to: "/os/control", icon: Zap, color: "text-primary" },
    ],
  },
  "/os/knowledge": {
    title: "Knowledge Base",
    tip: "Importez vos documents internes pour que le Chat IA réponde avec votre propre base de connaissances.",
    actions: [
      { label: "AI Brain", to: "/os/brain", icon: Brain, color: "text-rose-400" },
      { label: "Chat IA", to: "/os", icon: MessageSquare, color: "text-primary" },
    ],
  },
};

const DEFAULT_CONTEXT: RouteContext = {
  title: "GENIE OS",
  tip: "Utilisez CMD+K pour naviguer rapidement entre les modules.",
  actions: [
    { label: "Chat IA", to: "/os", icon: MessageSquare, color: "text-primary" },
    { label: "Revenue Engine", to: "/os/revenue", icon: DollarSign, color: "text-green-400" },
    { label: "Créer un agent", to: "/os/agents", icon: Bot, color: "text-emerald-400" },
  ],
};

export function ContextualAI() {
  const [visible, setVisible] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const location = useLocation();

  const context = ROUTE_CONTEXTS[location.pathname] ?? DEFAULT_CONTEXT;

  // Hide on home/control/start — CopilotPanel already serves that
  const hiddenRoutes = ["/os", "/os/control", "/os/start"];
  if (hiddenRoutes.includes(location.pathname) || dismissed) return null;

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="fixed bottom-24 right-6 z-40 w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        title="Aide contextuelle"
      >
        <Lightbulb className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-6 z-40 w-72 rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-semibold text-foreground">{context.title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setVisible(false)}
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Réduire"
          >
            <ChevronRight className="w-3 h-3 rotate-90" />
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Tip */}
      <div className="px-3 py-2.5 border-b border-border/50">
        <p className="text-xs text-muted-foreground leading-relaxed">{context.tip}</p>
      </div>

      {/* Actions */}
      <div className="p-2 space-y-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-1 py-1">
          Actions suggérées
        </p>
        {context.actions.map((action) => (
          <Link key={action.to} to={action.to}>
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer">
              <action.icon className={cn("w-3.5 h-3.5 flex-shrink-0", action.color)} />
              <span className="text-xs text-foreground group-hover:text-foreground flex-1">{action.label}</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
