/**
 * AgentSwarmVisualizer — Visualiseur KITT amélioré pour les 5 agents
 * Réagit en temps réel à chaque agent du swarm Génie Brain
 */
import { Brain, Shield, Sword, Eye, BarChart3, Zap } from "lucide-react";
import type { AgentType, AgentResponse } from "@/hooks/useGenieBrain";

const AGENT_CONFIG: Record<AgentType, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  borderColor: string;
  bgColor: string;
  emoji: string;
}> = {
  attaquant: {
    label: "Agent Attaquant",
    icon: Sword,
    color: "text-red-400",
    borderColor: "border-red-500/40",
    bgColor: "bg-red-500/10",
    emoji: "🗡️",
  },
  defenseur: {
    label: "Agent Défenseur",
    icon: Shield,
    color: "text-blue-400",
    borderColor: "border-blue-500/40",
    bgColor: "bg-blue-500/10",
    emoji: "🛡️",
  },
  tuteur: {
    label: "Agent Tuteur",
    icon: Brain,
    color: "text-primary",
    borderColor: "border-primary/40",
    bgColor: "bg-primary/10",
    emoji: "🎓",
  },
  predictor: {
    label: "Agent Predictor",
    icon: Eye,
    color: "text-purple-400",
    borderColor: "border-purple-500/40",
    bgColor: "bg-purple-500/10",
    emoji: "🔮",
  },
  analyst: {
    label: "Agent Analyst",
    icon: BarChart3,
    color: "text-emerald-400",
    borderColor: "border-emerald-500/40",
    bgColor: "bg-emerald-500/10",
    emoji: "📊",
  },
};

interface Props {
  phase: "idle" | "thinking" | "swarming" | "complete" | "error";
  activeAgents: AgentType[];
  agentResponses: AgentResponse[];
  riskScore: number;
  riskDelta: number;
  palantirMode: boolean;
}

function AgentPulse({ agent, isActive, isComplete }: {
  agent: AgentType;
  isActive: boolean;
  isComplete: boolean;
}) {
  const cfg = AGENT_CONFIG[agent];
  const Icon = cfg.icon;
  return (
    <div className={`
      relative flex flex-col items-center gap-1 transition-all duration-500
      ${isActive ? "scale-110" : isComplete ? "scale-100 opacity-80" : "scale-90 opacity-40"}
    `}>
      <div className={`
        w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-300
        ${isActive ? `${cfg.bgColor} ${cfg.borderColor} shadow-lg` : isComplete ? "bg-secondary/30 border-border/40" : "bg-secondary/20 border-border/20"}
      `}>
        {isActive ? (
          <div className="relative">
            <Icon className={`w-4 h-4 ${cfg.color}`}/>
            <div className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-ping ${isActive ? cfg.bgColor : ""}`}
              style={{ background: isActive ? cfg.color.replace("text-", "") : "transparent" }}
            />
          </div>
        ) : (
          <span className="text-sm">{cfg.emoji}</span>
        )}
      </div>
      <div className={`text-[9px] font-medium ${isActive ? cfg.color : "text-muted-foreground"} text-center leading-tight max-w-[56px]`}>
        {cfg.label.split(" ")[1]}
      </div>
    </div>
  );
}

export function AgentSwarmVisualizer({ phase, activeAgents, agentResponses, riskScore, riskDelta, palantirMode }: Props) {
  const completedAgents = new Set(agentResponses.map(r => r.agent));
  const lastActive = agentResponses[agentResponses.length - 1]?.agent;

  const riskColor = riskScore >= 70 ? "text-red-400" : riskScore >= 40 ? "text-orange-400" : "text-emerald-400";
  const riskBg = riskScore >= 70 ? "bg-red-500/10 border-red-500/30" : riskScore >= 40 ? "bg-orange-500/10 border-orange-500/30" : "bg-emerald-500/10 border-emerald-500/30";

  if (!palantirMode) return null;

  return (
    <div className="mb-3 p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-primary"/>
          <span className="text-[11px] font-bold text-primary tracking-wide">GÉNIE BRAIN SWARM</span>
          {phase === "swarming" && (
            <div className="flex gap-0.5">
              {[0,1,2].map(i => (
                <div key={i} className="w-1 h-1 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}/>
              ))}
            </div>
          )}
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold ${riskBg} ${riskColor}`}>
          RISK {riskScore}
          {riskDelta !== 0 && (
            <span className={riskDelta > 0 ? "text-red-400" : "text-emerald-400"}>
              {riskDelta > 0 ? `+${riskDelta}` : riskDelta}
            </span>
          )}
        </div>
      </div>

      {/* Agents row */}
      <div className="flex items-start justify-around gap-2">
        {activeAgents.map(agent => (
          <AgentPulse
            key={agent}
            agent={agent}
            isActive={phase === "swarming" && lastActive === agent}
            isComplete={completedAgents.has(agent)}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-secondary/50 overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-1000"
          style={{ width: phase === "complete" ? "100%" : `${(completedAgents.size / activeAgents.length) * 100}%` }}
        />
      </div>

      {/* Status text */}
      {phase === "swarming" && lastActive && (
        <div className={`text-[10px] ${AGENT_CONFIG[lastActive]?.color} flex items-center gap-1`}>
          <span>{AGENT_CONFIG[lastActive]?.emoji}</span>
          <span>{AGENT_CONFIG[lastActive]?.label} en cours...</span>
        </div>
      )}
    </div>
  );
}
