import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Send, Loader2, Sparkles, User, Copy, Check, RotateCcw,
  Bot, Zap, Code2, BarChart2, Cpu, ArrowRight, X, Cpu as RouterIcon, Mic, Network,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useGenieOSMemory, AI_ROUTER_CLIENT } from "@/hooks/useGenieOSMemory";
import { useAgentRuntime } from "@/hooks/useAgentRuntime";
import { AgentExecutionPanel } from "@/components/genieos/AgentExecutionPanel";

type Message = { role: "user" | "assistant"; content: string };
type Module = "assistant" | "agent_builder" | "automation" | "app_builder" | "ai_tools" | "business";

interface NavigationIntent {
  module: string;
  label: string;
  emoji: string;
  description: string;
  prefill?: Record<string, string>;
}

const MODULE_OPTIONS: { value: Module; label: string; desc: string; emoji: string }[] = [
  { value: "assistant",     label: "Assistant IA",  desc: "Explications & questions",   emoji: "🧠" },
  { value: "agent_builder", label: "Agent Builder", desc: "Créer des agents IA",        emoji: "🤖" },
  { value: "automation",    label: "Automation",    desc: "Workflows & automatisations", emoji: "⚡" },
  { value: "app_builder",   label: "App Builder",   desc: "Architecture d'applications", emoji: "💻" },
  { value: "ai_tools",      label: "AI Tools",      desc: "Explorer des outils IA",     emoji: "🔧" },
  { value: "business",      label: "Business",      desc: "Analyser des opportunités",  emoji: "📊" },
];

const QUICK_PROMPTS = [
  "Explique-moi ce qu'est un agent IA",
  "Crée un agent pour répondre aux emails",
  "Automatise la publication sur les réseaux sociaux",
  "Génère l'architecture d'une app de gestion de leads",
  "Compare ChatGPT, Claude et Gemini",
  "Analyse le business model d'une newsletter IA",
];

// ── Agent execution intent patterns ────────────────────────────
const AGENT_EXEC_PATTERNS = [
  /analys[e]?[r]?\s+(ce\s+|le\s+|ce\s+)?march[eé]/i,
  /trouv[e]?[r]?\s+\d+\s+prospect/i,
  /lanc[e]?[r]?\s+(un\s+)?agent/i,
  /ex[eé]cut[e]?[r]?\s+(un\s+)?agent/i,
  /recherch[e]?[r]?\s+et\s+(analys[e]?[r]?|r[eé]sum[e]?[r]?)/i,
  /g[eé]n[eè]r[e]?[r]?\s+un\s+rapport/i,
  /automatiquement\s+(analys|recherch|cr[eé]e|g[eé]n[eè]r)/i,
];

function detectAgentExecIntent(text: string): string | null {
  for (const p of AGENT_EXEC_PATTERNS) {
    if (p.test(text)) return text.trim();
  }
  return null;
}

// ── Navigation intent patterns for orchestration ────────────────────────────
const INTENT_PATTERNS: Array<{
  regex: RegExp;
  module: string;
  label: string;
  emoji: string;
  description: string;
  extractPrefill?: (text: string) => Record<string, string>;
}> = [
  {
    regex: /cr[eé]{1,2}[e]?\s+(un|une|mon)\s+(agent|bot|assistant\s+ia)/i,
    module: "/os/agents",
    label: "Agent Builder",
    emoji: "🤖",
    description: "Ouvrir l'Agent Builder",
    extractPrefill: (text) => {
      const m = text.match(/agent\s+([\w\s\-àâäéèêëïîôùûü]+?)(?:\s+pour|\s+qui|\s+capable|[,\.]|$)/i);
      const name = m?.[1]?.trim();
      return name ? { prefill_name: name } : {};
    },
  },
  {
    regex: /(automati[sz]|génère?\s+un\s+workflow|créer?\s+un\s+workflow|flux\s+de\s+travail)/i,
    module: "/os/automation",
    label: "Automation",
    emoji: "⚡",
    description: "Ouvrir le module Automation",
  },
  {
    regex: /(cr[eé]{1,2}[e]?\s+(une|mon)\s+app|construi[rstx]+\s+une\s+app|architectur[e]?\s+une\s+app)/i,
    module: "/os/app-builder",
    label: "App Builder",
    emoji: "💻",
    description: "Ouvrir l'App Builder",
    extractPrefill: (text) => {
      const m = text.match(/(?:app|application)\s+([\w\s\-àâäéèêëïîôùûü]+?)(?:\s+pour|\s+avec|[,\.]|$)/i);
      return m?.[1] ? { prefill_idea: m[1].trim() } : {};
    },
  },
  {
    regex: /(compare[r]?\s+(des\s+)?outils|meilleur[s]?\s+outil|quel\s+(outil|logiciel)\s+(ia|ai))/i,
    module: "/os/ai-tools",
    label: "AI Tools",
    emoji: "🔧",
    description: "Explorer les outils IA",
  },
  {
    regex: /(analys[e]?[r]?\s+(le\s+|mon\s+|une\s+)?business|opportunit[eé]\s+business|business\s+plan)/i,
    module: "/os/business",
    label: "Business Analysis",
    emoji: "📊",
    description: "Analyser l'opportunité business",
  },
];

function detectIntent(text: string): NavigationIntent | null {
  for (const p of INTENT_PATTERNS) {
    if (p.regex.test(text)) {
      const prefill = p.extractPrefill?.(text);
      return { module: p.module, label: p.label, emoji: p.emoji, description: p.description, prefill };
    }
  }
  return null;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export default function GenieOSChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeModule, setActiveModule] = useState<Module>("assistant");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [detectedIntent, setDetectedIntent] = useState<NavigationIntent | null>(null);
  const [activeModel, setActiveModel] = useState<string>(AI_ROUTER_CLIENT.assistant);
  const [agentExecObjective, setAgentExecObjective] = useState<string | null>(null);
  const { state: execState, runAgent, reset: resetExec, isRunning: agentRunning } = useAgentRuntime();
  const bottomRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { saveConversation, addRecentTopic } = useGenieOSMemory();

  // Accept prefill from navigation state (from other modules)
  useEffect(() => {
    const state = location.state as { prefill_message?: string } | null;
    if (state?.prefill_message) {
      setInput(state.prefill_message);
    }
  }, [location.state]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Update model indicator when module changes
  useEffect(() => {
    setActiveModel(AI_ROUTER_CLIENT[activeModule] ?? "gemini-3-flash");
  }, [activeModule]);

  const send = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isLoading) return;

    // Detect navigation intent before sending
    const intent = detectIntent(content);
    if (intent) setDetectedIntent(intent);
    else setDetectedIntent(null);

    // Detect agent execution intent
    const agentIntent = detectAgentExecIntent(content);
    if (agentIntent) setAgentExecObjective(agentIntent);

    const userMsg: Message = { role: "user", content };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const currentModule = activeModule;
    const currentModel = AI_ROUTER_CLIENT[currentModule] ?? "gemini-3-flash";

    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/genie-os-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ messages: nextMessages, module: currentModule }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ error: "Erreur réseau" }));
        if (resp.status === 429) toast({ title: "Limite atteinte", description: errData.error, variant: "destructive" });
        else if (resp.status === 402) toast({ title: "Crédits insuffisants", description: errData.error, variant: "destructive" });
        else toast({ title: "Erreur IA", description: errData.error ?? "Erreur inconnue", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error("No stream body");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            // Router metadata event
            if (parsed.type === "router") {
              const shortModel = String(parsed.model ?? "").replace("google/", "");
              setActiveModel(shortModel);
              continue;
            }
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              assistantSoFar += delta;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch (_e) {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Save conversation + update recent topics
      const finalMessages = [...nextMessages, { role: "assistant" as const, content: assistantSoFar }];
      saveConversation(finalMessages, currentModule, currentModel);
      addRecentTopic(content.slice(0, 40));

    } catch (err) {
      toast({ title: "Erreur de connexion", description: String(err), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, activeModule, saveConversation, addRecentTopic]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const handleNavigateToModule = () => {
    if (!detectedIntent) return;
    navigate(detectedIntent.module, {
      state: { prefill: detectedIntent.prefill, from_chat: true },
    });
    setDetectedIntent(null);
  };

  const copyMessage = (idx: number, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const reset = () => { setMessages([]); setDetectedIntent(null); };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Module selector + model badge */}
      <div className="flex-shrink-0 border-b border-border bg-card px-4 py-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {MODULE_OPTIONS.map(m => (
            <button
              key={m.value}
              onClick={() => setActiveModule(m.value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                activeModule === m.value
                  ? "bg-primary/20 text-foreground border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <span>{m.emoji}</span>
              <span className="hidden sm:inline">{m.label}</span>
            </button>
          ))}

          {/* Model indicator */}
          <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-muted/30 flex-shrink-0">
            <RouterIcon className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-mono">{activeModel}</span>
          </div>

          {messages.length > 0 && (
            <button
              onClick={reset}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex-shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow mb-6">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              <span className="text-gradient">GENIE OS</span> — Orchestrateur IA
            </h2>
            <p className="text-muted-foreground text-sm mb-2 max-w-md">
              {MODULE_OPTIONS.find(m => m.value === activeModule)?.desc}
            </p>
            <p className="text-xs text-muted-foreground/60 mb-8">
              Modèle actif : <span className="font-mono text-primary/70">{activeModel}</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="text-left px-4 py-3 rounded-lg border border-border bg-card hover:border-primary/30 hover:bg-primary/5 text-sm text-muted-foreground hover:text-foreground transition-all card-hover"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
              <div className={cn(
                "flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5",
                msg.role === "user" ? "bg-secondary border border-border" : "gradient-primary shadow-glow-sm"
              )}>
                {msg.role === "user"
                  ? <User className="w-3.5 h-3.5 text-foreground" />
                  : <Sparkles className="w-3.5 h-3.5 text-white" />
                }
              </div>
              <div className={cn(
                "group relative max-w-[80%] rounded-xl px-4 py-3 text-sm",
                msg.role === "user"
                  ? "bg-primary/15 border border-primary/20 text-foreground"
                  : "bg-card border border-border text-foreground"
              )}>
                <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                  {msg.role === "assistant" && isLoading && idx === messages.length - 1 && (
                    <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-pulse rounded-sm" />
                  )}
                </div>
                {msg.role === "assistant" && msg.content && (
                  <button
                    onClick={() => copyMessage(idx, msg.content)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-muted-foreground hover:text-foreground"
                  >
                    {copiedIdx === idx
                      ? <Check className="w-3 h-3 text-emerald-400" />
                      : <Copy className="w-3 h-3" />
                    }
                  </button>
                )}
              </div>
            </div>
          ))
        )}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-lg gradient-primary flex items-center justify-center shadow-glow-sm">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-card border border-border rounded-xl px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Agent Execution Panel (inline in chat) */}
      {execState.phase !== "idle" && (
        <div className="flex-shrink-0 mx-4 mb-2">
          <AgentExecutionPanel
            state={execState}
            onClose={() => { resetExec(); setAgentExecObjective(null); }}
          />
        </div>
      )}

      {/* Agent execution intent card */}
      {agentExecObjective && execState.phase === "idle" && !isLoading && (
        <div className="flex-shrink-0 mx-4 mb-2">
          <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-400/20 bg-emerald-400/5">
            <span className="text-lg">🤖</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">
                Action détectée : <strong>Exécution d'agent</strong>
              </p>
              <p className="text-xs text-muted-foreground truncate">Objectif : {agentExecObjective}</p>
            </div>
            <Button
              size="sm"
              onClick={() => { runAgent(agentExecObjective); setAgentExecObjective(null); }}
              disabled={agentRunning}
              className="gradient-primary text-white flex-shrink-0 text-xs h-8 px-3"
            >
              <Zap className="w-3 h-3 mr-1" /> Lancer
            </Button>
            <button
              onClick={() => setAgentExecObjective(null)}
              className="p-1 text-muted-foreground hover:text-foreground flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Navigation orchestrator intent card */}
      {detectedIntent && !isLoading && (
        <div className="flex-shrink-0 mx-4 mb-2">
          <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
            <span className="text-lg">{detectedIntent.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">
                Action détectée : <strong>{detectedIntent.label}</strong>
              </p>
              <p className="text-xs text-muted-foreground">{detectedIntent.description}</p>
            </div>
            <Button
              size="sm"
              onClick={handleNavigateToModule}
              className="gradient-primary text-white flex-shrink-0 text-xs h-8 px-3"
            >
              Ouvrir <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
            <button
              onClick={() => setDetectedIntent(null)}
              className="p-1 text-muted-foreground hover:text-foreground flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 border-t border-border bg-card px-4 py-3">
        <div className="flex gap-2 items-end max-w-4xl mx-auto">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Mode ${MODULE_OPTIONS.find(m => m.value === activeModule)?.label} · ${activeModel} · Shift+↵ pour sauter une ligne`}
            className="flex-1 min-h-[44px] max-h-[160px] resize-none bg-background border-border focus:border-primary/50 text-sm leading-relaxed"
            rows={1}
            disabled={isLoading}
          />
          <Button
            onClick={() => send()}
            disabled={!input.trim() || isLoading}
            className="h-11 w-11 p-0 flex-shrink-0 gradient-primary hover:opacity-90 shadow-glow-sm"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
