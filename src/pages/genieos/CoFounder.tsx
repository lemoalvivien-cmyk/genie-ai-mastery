import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { captureError } from "@/lib/sentry";
import {
  Handshake, Send, Loader2, Sparkles, BarChart2,
  Lightbulb, Map, Users, TrendingUp, ChevronRight, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PROMPTS = [
  "Analyse mon idée de SaaS IA pour PME",
  "Génère un business model pour une app de veille concurrentielle",
  "Analyse le marché des outils de productivité IA",
  "Crée une roadmap produit pour un agent de marketing automation",
  "Trouve des niches sous-exploitées dans l'IA B2B",
];

type AnalysisStep = {
  type: "market" | "model" | "roadmap" | "competition" | "strategy";
  title: string;
  content: string;
};

export default function CoFounder() {
  const user = useAuthStore((s) => s.user);
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<AnalysisStep[]>([]);
  const [streamText, setStreamText] = useState("");
  const [currentStep, setCurrentStep] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const STEP_ICONS: Record<string, typeof Sparkles> = {
    market: BarChart2, model: TrendingUp, roadmap: Map,
    competition: Users, strategy: Lightbulb,
  };

  const STEP_COLORS: Record<string, string> = {
    market: "text-blue-400", model: "text-green-400", roadmap: "text-purple-400",
    competition: "text-orange-400", strategy: "text-pink-400",
  };

  async function runAnalysis() {
    if (!idea.trim() || !user) return;
    setLoading(true);
    setSteps([]);
    setStreamText("");

    abortRef.current = new AbortController();

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/genieos-cofounder`;

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ idea, user_id: user.id }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok || !resp.body) throw new Error("Stream failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      const collectedSteps: AnalysisStep[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));
        for (const line of lines) {
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.type === "step_start") {
              setCurrentStep(evt.step);
              setStreamText("");
            } else if (evt.type === "step_done") {
              const step: AnalysisStep = { type: evt.step, title: evt.title, content: evt.content };
              collectedSteps.push(step);
              setSteps([...collectedSteps]);
              setStreamText("");
              setCurrentStep("");
            } else if (evt.type === "token") {
              setStreamText((p) => p + evt.text);
            }
          } catch {}
        }
      }

      // Log to memory timeline
      await supabase.from("memory_timeline").insert({
        user_id: user.id,
        event_type: "build",
        title: `Co-Founder analysis: ${idea.slice(0, 50)}`,
        summary: `${collectedSteps.length} étapes générées`,
        metadata: { idea, steps: collectedSteps.length },
        importance: "high",
      });
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        captureError(e, { component: "CoFounder" });
      }
    } finally {
      setLoading(false);
      setCurrentStep("");
    }
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border px-4 py-3 bg-card">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Handshake className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">AI Co-Founder</h1>
            <p className="text-xs text-muted-foreground">Analyse ton idée, génère un business model & roadmap</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Quick prompts */}
        {!steps.length && !loading && (
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Exemples</p>
            <div className="flex flex-wrap gap-2">
              {PROMPTS.map((p) => (
                <button key={p} onClick={() => setIdea(p)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {steps.map((step) => {
          const Icon = STEP_ICONS[step.type] ?? Sparkles;
          const color = STEP_COLORS[step.type] ?? "text-primary";
          return (
            <div key={step.type} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/30">
                <Icon className={cn("w-4 h-4", color)} />
                <span className="text-sm font-semibold text-foreground">{step.title}</span>
                <Badge variant="outline" className={cn("ml-auto text-xs", color)}>{step.type}</Badge>
              </div>
              <div className="p-4 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {step.content}
              </div>
            </div>
          );
        })}

        {/* Streaming step */}
        {currentStep && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-primary/10">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
              <span className="text-sm font-semibold text-foreground capitalize">{currentStep} en cours...</span>
            </div>
            <div className="p-4 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed min-h-[60px]">
              {streamText}<span className="animate-pulse">▌</span>
            </div>
          </div>
        )}

        {steps.length > 0 && !loading && (
          <Button variant="outline" size="sm" onClick={() => { setSteps([]); setIdea(""); }}
            className="gap-1.5">
            <RefreshCw className="w-3 h-3" /> Nouvelle analyse
          </Button>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-border p-3 bg-card">
        <div className="flex gap-2">
          <Textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Décris ton idée business, un marché ou une question stratégique..."
            className="flex-1 min-h-[60px] max-h-[120px] resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runAnalysis(); }
            }}
          />
          <Button onClick={runAnalysis} disabled={loading || !idea.trim()} size="sm"
            className="h-full px-3 self-end">
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><Send className="w-4 h-4" /><ChevronRight className="w-3 h-3" /></>
            }
          </Button>
        </div>
      </div>
    </div>
  );
}
