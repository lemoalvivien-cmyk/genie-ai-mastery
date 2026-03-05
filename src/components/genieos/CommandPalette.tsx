import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Bot, Zap, DollarSign, Brain, Wand2, MessageSquare, Activity,
  Plane, Clock, Store, Database, Code2, Network, Mic, TrendingUp,
  Handshake, BarChart2, Cpu, Play, Radio, Eye, Search, ArrowRight,
  Command, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── All navigable items ── */
const ALL_ITEMS = [
  // Core
  { id: "chat", label: "Chat IA", desc: "Assistant conversationnel GENIE OS", to: "/os", icon: MessageSquare, group: "Core", keywords: ["chat", "message", "parler", "ia", "assistant"] },
  { id: "control", label: "Command Center", desc: "Cockpit principal GENIE OS", to: "/os/control", icon: Activity, group: "Core", keywords: ["dashboard", "home", "accueil", "centre"] },
  { id: "voice", label: "Voice OS", desc: "Interface vocale", to: "/os/voice", icon: Mic, group: "Core", keywords: ["voix", "parole", "audio"] },
  { id: "start", label: "Smart Onboarding", desc: "Configurer GENIE OS", to: "/os/start", icon: Sparkles, group: "Core", keywords: ["démarrage", "onboarding", "setup", "configurer"] },
  // Revenue
  { id: "revenue", label: "Revenue Engine", desc: "Trouver des leads et opportunités business", to: "/os/revenue", icon: DollarSign, group: "Revenue", keywords: ["revenu", "leads", "prospect", "business", "argent", "opportunité"] },
  { id: "cofounder", label: "Co-Founder IA", desc: "Analyse d'idées et business model", to: "/os/cofounder", icon: Handshake, group: "Revenue", keywords: ["startup", "idée", "co-founder", "business model", "roadmap"] },
  { id: "opportunities", label: "Opportunités", desc: "Opportunités business détectées", to: "/os/opportunities", icon: TrendingUp, group: "Revenue", keywords: ["opportunité", "marché", "croissance"] },
  { id: "economy", label: "Agent Economy", desc: "Acheter, vendre et cloner des agents", to: "/os/economy", icon: Store, group: "Revenue", keywords: ["économie", "vendre", "acheter", "marketplace"] },
  // Intelligence
  { id: "skills", label: "Skill Graph", desc: "Cartographie de vos compétences IA", to: "/os/skills", icon: Brain, group: "Intelligence", keywords: ["compétences", "apprentissage", "niveau", "skill", "graph"] },
  { id: "ai-watch", label: "AI Watch", desc: "Veille IA en temps réel", to: "/os/ai-watch", icon: Eye, group: "Intelligence", keywords: ["veille", "actualités", "signaux", "tendances"] },
  { id: "autopilot", label: "Autopilot", desc: "Agents récurrents automatisés", to: "/os/autopilot", icon: Plane, group: "Intelligence", keywords: ["automatique", "récurrent", "programmé", "cron"] },
  { id: "timeline", label: "Memory Timeline", desc: "Historique chronologique de vos actions", to: "/os/timeline", icon: Clock, group: "Intelligence", keywords: ["mémoire", "historique", "timeline", "passé"] },
  // Agents
  { id: "agents", label: "Agent Builder", desc: "Créer un agent IA personnalisé", to: "/os/agents", icon: Bot, group: "Agents", keywords: ["créer", "agent", "builder", "configurer", "bot"] },
  { id: "agents-runtime", label: "Agents Runtime", desc: "Exécuter et surveiller les agents", to: "/os/agents-runtime", icon: Radio, group: "Agents", keywords: ["runtime", "exécuter", "lancer", "surveiller"] },
  { id: "multi-agent", label: "Multi-Agents", desc: "Orchestrer plusieurs agents en parallèle", to: "/os/multi-agent", icon: Network, group: "Agents", keywords: ["multi", "parallèle", "orchestration"] },
  // Build
  { id: "automation", label: "Automation", desc: "Créer des workflows automatisés", to: "/os/automation", icon: Zap, group: "Build", keywords: ["workflow", "automation", "automatisation", "process"] },
  { id: "app-builder", label: "App Builder", desc: "Construire une application IA", to: "/os/app-builder", icon: Code2, group: "Build", keywords: ["app", "application", "code", "developer"] },
  { id: "builder", label: "Auto Builder", desc: "Générer un projet complet depuis une idée", to: "/os/builder", icon: Wand2, group: "Build", keywords: ["générer", "projet", "idée", "architecture", "saas"] },
  { id: "business", label: "Business Analysis", desc: "Analyser votre business avec l'IA", to: "/os/business", icon: BarChart2, group: "Build", keywords: ["analyse", "business", "stratégie"] },
  // Data
  { id: "knowledge", label: "Knowledge Base", desc: "Base de connaissances personnelle", to: "/os/knowledge", icon: Database, group: "Data", keywords: ["connaissance", "documents", "savoir", "kb"] },
  { id: "brain", label: "AI Brain", desc: "Profil cognitif et mémoire IA", to: "/os/brain", icon: Brain, group: "Data", keywords: ["profil", "cerveau", "mémoire", "objectives", "goals"] },
  // Explore
  { id: "ai-tools", label: "AI Tools Explorer", desc: "Explorer les outils IA", to: "/os/ai-tools", icon: Cpu, group: "Explore", keywords: ["outils", "tools", "explorer"] },
  { id: "store", label: "AI Store", desc: "Installer des agents depuis le store", to: "/os/store", icon: Store, group: "Explore", keywords: ["store", "installer", "agent", "boutique"] },
  { id: "actions", label: "Actions", desc: "Actions et workflows disponibles", to: "/os/actions", icon: Play, group: "Explore", keywords: ["actions", "lancer"] },
];

/* ── Quick actions ── */
const QUICK_ACTIONS = [
  { id: "qa_agent", label: "Créer un agent", icon: Bot, to: "/os/agents", color: "text-emerald-400" },
  { id: "qa_revenue", label: "Trouver une opportunité", icon: DollarSign, to: "/os/revenue", color: "text-green-400" },
  { id: "qa_build", label: "Construire un projet", icon: Wand2, to: "/os/builder", color: "text-orange-400" },
  { id: "qa_chat", label: "Ouvrir le Chat IA", icon: MessageSquare, to: "/os", color: "text-primary" },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim().length === 0
    ? ALL_ITEMS.slice(0, 8)
    : ALL_ITEMS.filter((item) => {
        const q = query.toLowerCase();
        return (
          item.label.toLowerCase().includes(q) ||
          item.desc.toLowerCase().includes(q) ||
          item.keywords.some((k) => k.includes(q))
        );
      }).slice(0, 10);

  const showQuickActions = query.trim().length === 0;

  const totalItems = showQuickActions
    ? QUICK_ACTIONS.length + filtered.length
    : filtered.length;

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const goTo = useCallback((to: string) => {
    navigate(to);
    onClose();
  }, [navigate, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, totalItems - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); return; }
      if (e.key === "Enter") {
        e.preventDefault();
        if (showQuickActions) {
          if (selected < QUICK_ACTIONS.length) goTo(QUICK_ACTIONS[selected].to);
          else goTo(filtered[selected - QUICK_ACTIONS.length]?.to ?? "/os/control");
        } else {
          goTo(filtered[selected]?.to ?? "/os/control");
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, selected, totalItems, filtered, showQuickActions, goTo]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Palette */}
      <div className="fixed left-1/2 top-[20vh] z-[101] w-full max-w-xl -translate-x-1/2 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
            placeholder="Rechercher un module, agent, action…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <kbd className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-2">
          {/* Quick actions */}
          {showQuickActions && (
            <div className="px-3 pb-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-1 py-1.5">
                Actions rapides
              </p>
              {QUICK_ACTIONS.map((qa, i) => (
                <button
                  key={qa.id}
                  onClick={() => goTo(qa.to)}
                  onMouseEnter={() => setSelected(i)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left",
                    selected === i ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center flex-shrink-0")}>
                    <qa.icon className={cn("w-4 h-4", qa.color)} />
                  </div>
                  <span className="text-sm font-medium text-foreground">{qa.label}</span>
                  {selected === i && <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />}
                </button>
              ))}
            </div>
          )}

          {/* Navigation items */}
          {filtered.length > 0 && (
            <div className="px-3 pt-1">
              {showQuickActions && (
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-1 py-1.5">
                  Navigation
                </p>
              )}
              {filtered.map((item, i) => {
                const idx = showQuickActions ? QUICK_ACTIONS.length + i : i;
                return (
                  <button
                    key={item.id}
                    onClick={() => goTo(item.to)}
                    onMouseEnter={() => setSelected(idx)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left",
                      selected === idx ? "bg-muted/60" : "hover:bg-muted/40"
                    )}
                  >
                    <item.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-foreground font-medium">{item.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">{item.desc}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5 flex-shrink-0">
                      {item.group}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {!showQuickActions && filtered.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">Aucun résultat pour « {query} »</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/20">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><kbd className="border border-border rounded px-1">↑↓</kbd> naviguer</span>
            <span className="flex items-center gap-1"><kbd className="border border-border rounded px-1">↵</kbd> ouvrir</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Command className="w-3 h-3" /><span>K pour ouvrir</span>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Hook to register CMD+K globally ── */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return { open, setOpen };
}
