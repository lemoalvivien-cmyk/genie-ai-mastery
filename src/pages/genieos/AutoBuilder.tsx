import { useState, useRef } from "react";
import { Wand2, Code2, Bot, TrendingUp, Rocket, Loader2, ChevronRight, Sparkles, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface BuildStep {
  step: string;
  label: string;
  data: unknown;
}

interface Project {
  id: string;
  name: string;
  description: string;
}

const QUICK_IDEAS = [
  { label: "SaaS IA pour RH", icon: Bot, idea: "Un SaaS IA pour automatiser le recrutement et la gestion des talents en entreprise" },
  { label: "Plateforme veille concurrentielle", icon: TrendingUp, idea: "Une plateforme d'intelligence économique qui surveille automatiquement les concurrents et génère des rapports" },
  { label: "AI Code Review Tool", icon: Code2, idea: "Un outil SaaS qui analyse automatiquement le code et propose des améliorations par IA" },
  { label: "Agent marketing autonome", icon: Sparkles, idea: "Un agent IA qui gère automatiquement les campagnes marketing, le contenu et la distribution" },
];

const STEP_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  analysis:     { icon: BarChart2, color: "text-blue-400",    label: "Analyse" },
  architecture: { icon: Code2,     color: "text-purple-400",  label: "Architecture" },
  agents:       { icon: Bot,       color: "text-primary",     label: "Agents IA" },
  strategy:     { icon: Rocket,    color: "text-orange-400",  label: "Stratégie" },
};

function MarkdownSection({ content }: { content: string }) {
  if (!content) return null;
  return (
    <div className="space-y-1 text-sm">
      {content.split("\n").map((line, i) => {
        if (line.startsWith("# ")) return <h2 key={i} className="text-base font-bold text-foreground mt-4 mb-1">{line.slice(2)}</h2>;
        if (line.startsWith("## ")) return <h3 key={i} className="text-sm font-bold text-foreground mt-3 mb-1">{line.slice(3)}</h3>;
        if (line.startsWith("### ")) return <h4 key={i} className="text-xs font-semibold text-primary mt-2 mb-0.5 uppercase tracking-wide">{line.slice(4)}</h4>;
        const boldParts = line.split(/\*\*(.*?)\*\*/g);
        if (boldParts.length > 1) {
          return (
            <p key={i} className="text-muted-foreground leading-relaxed">
              {boldParts.map((p, j) => j % 2 === 1 ? <strong key={j} className="text-foreground">{p}</strong> : p)}
            </p>
          );
        }
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return <div key={i} className="flex gap-2 text-muted-foreground"><span className="text-primary mt-1 flex-shrink-0">•</span><span className="leading-relaxed">{line.slice(2)}</span></div>;
        }
        if (/^\d+\./.test(line)) {
          const idx = line.indexOf(". ");
          const num = line.slice(0, idx);
          const rest = line.slice(idx + 2);
          return <div key={i} className="flex gap-2"><span className="text-primary font-bold flex-shrink-0">{num}.</span><span className="text-muted-foreground leading-relaxed">{rest}</span></div>;
        }
        if (line.trim() === "") return <div key={i} className="h-1.5" />;
        return <p key={i} className="text-muted-foreground leading-relaxed">{line}</p>;
      })}
    </div>
  );
}

export default function AutoBuilder() {
  const [idea, setIdea] = useState("");
  const [steps, setSteps] = useState<BuildStep[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [activeStep, setActiveStep] = useState<string>("analysis");
  const abortRef = useRef<AbortController | null>(null);

  async function build(ideaText: string) {
    if (!ideaText.trim() || loading) return;
    setLoading(true);
    setSteps([]);
    setProject(null);
    setProgress("Initialisation du builder...");

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? "";
    abortRef.current = new AbortController();

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/genieos-auto-builder`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ mode: "build", idea: ideaText }),
          signal: abortRef.current.signal,
        }
      );

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.type === "progress") setProgress(parsed.message);
            if (parsed.type === "step") {
              setSteps((prev) => [...prev, { step: parsed.step, label: parsed.label, data: parsed.data }]);
              setActiveStep(parsed.step);
            }
            if (parsed.type === "done") {
              setProject(parsed.project);
              setProgress("");
            }
          } catch (_e) { /* ignore */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setProgress("Erreur de connexion.");
      }
    } finally {
      setLoading(false);
    }
  }

  const analysisStep = steps.find((s) => s.step === "analysis");
  const analysis = analysisStep?.data as Record<string, unknown> | undefined;

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Wand2 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground">AI Auto Builder</h1>
            <p className="text-xs text-muted-foreground">Générez des projets complets depuis une idée</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Input */}
        <div className="space-y-3">
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Décrivez votre idée de projet ou SaaS... Ex: 'Une plateforme IA qui génère automatiquement des contenus marketing personnalisés pour les PME'"
            rows={3}
            disabled={loading}
            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 disabled:opacity-50"
          />
          <button
            onClick={() => build(idea)}
            disabled={!idea.trim() || loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-all"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> {progress}</> : <><Wand2 className="w-4 h-4" /> Construire le projet</>}
          </button>
        </div>

        {/* Quick ideas */}
        {steps.length === 0 && !loading && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Idées rapides</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUICK_IDEAS.map((q) => {
                const Icon = q.icon;
                return (
                  <button
                    key={q.label}
                    onClick={() => { setIdea(q.idea); build(q.idea); }}
                    className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/50 text-left transition-all group"
                  >
                    <Icon className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{q.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{q.idea}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground flex-shrink-0 ml-auto mt-0.5" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Project header */}
        {analysis && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="text-base font-bold text-foreground">{analysis.project_name as string}</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{analysis.tagline as string}</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Problème", value: analysis.problem as string },
                { label: "Audience", value: analysis.target_audience as string },
                { label: "Marché", value: analysis.market_size as string },
                { label: "Concurrence", value: analysis.competition_level as string },
              ].map(({ label, value }) => value && (
                <div key={label} className="rounded-lg bg-card border border-border p-3">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className="text-xs text-foreground font-medium">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step tabs & content */}
        {steps.length > 0 && (
          <div className="space-y-3">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {steps.map((s) => {
                const cfg = STEP_CONFIG[s.step];
                if (!cfg) return null;
                const Icon = cfg.icon;
                return (
                  <button
                    key={s.step}
                    onClick={() => setActiveStep(s.step)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border whitespace-nowrap flex-shrink-0 transition-all",
                      activeStep === s.step
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border hover:text-foreground"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {s.label}
                  </button>
                );
              })}
            </div>

            {steps.map((s) => {
              if (s.step !== activeStep) return null;

              if (s.step === "agents") {
                const agents = s.data as Array<{ name: string; role: string; capabilities: string[]; system_prompt: string }>;
                return (
                  <div key={s.step} className="space-y-3">
                    {(Array.isArray(agents) ? agents : []).map((agent, i) => (
                      <div key={i} className="rounded-xl border border-border bg-card p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Bot className="w-4 h-4 text-primary" />
                          <p className="text-sm font-bold text-foreground">{agent.name}</p>
                          <span className="text-xs text-muted-foreground">— {agent.role}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{agent.system_prompt}</p>
                        {Array.isArray(agent.capabilities) && (
                          <div className="flex flex-wrap gap-1">
                            {agent.capabilities.map((cap: string, j: number) => (
                              <span key={j} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{cap}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              }

              return (
                <div key={s.step} className="rounded-xl border border-border bg-card p-5">
                  <MarkdownSection content={typeof s.data === "string" ? s.data : JSON.stringify(s.data, null, 2)} />
                </div>
              );
            })}
          </div>
        )}

        {/* Project saved */}
        {project && (
          <div className="rounded-xl border border-primary/20 bg-card p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Rocket className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Projet sauvegardé ✓</p>
              <p className="text-xs text-muted-foreground">{project.name} — disponible dans vos projets</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
