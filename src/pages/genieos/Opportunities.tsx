import { useState, useRef } from "react";
import { TrendingUp, Search, Sparkles, Target, BarChart2, Lightbulb, ChevronRight, Loader2, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
  type?: "analysis" | "opportunities" | "text";
}

const QUICK_PROMPTS = [
  { label: "Opportunités SaaS IA 2025", icon: TrendingUp, query: "Trouve 5 opportunités SaaS dans l'IA pour 2025", type: "opportunities" },
  { label: "Analyse marché agents IA", icon: BarChart2, query: "Analyse le marché des agents IA autonomes", type: "market" },
  { label: "Niches sous-exploitées", icon: Target, query: "Quelles sont les niches IA encore peu exploitées ?", type: "opportunities" },
  { label: "Concurrence IA générative", icon: Globe, query: "Analyse de la concurrence dans l'IA générative B2B", type: "competitor" },
  { label: "Idées startup IA", icon: Lightbulb, query: "Génère 5 idées de startups IA innovantes avec un fort potentiel", type: "saas" },
  { label: "Tendances IA 2025-2026", icon: Sparkles, query: "Quelles sont les tendances IA majeures pour 2025-2026 ?", type: "trend" },
];

function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="space-y-1">
      {content.split("\n").map((line, i) => {
        if (line.startsWith("# ")) {
          return <h2 key={i} className="text-lg font-bold text-foreground mt-4 mb-2">{line.slice(2)}</h2>;
        }
        if (line.startsWith("## ")) {
          return <h3 key={i} className="text-base font-bold text-foreground mt-3 mb-1">{line.slice(3)}</h3>;
        }
        if (line.startsWith("### ")) {
          return <h4 key={i} className="text-sm font-semibold text-primary mt-2 mb-1">{line.slice(4)}</h4>;
        }
        if (line.startsWith("**") && line.endsWith("**") && line.length > 4) {
          return <p key={i} className="font-semibold text-foreground">{line.slice(2, -2)}</p>;
        }
        // Bold inline
        const boldParts = line.split(/\*\*(.*?)\*\*/g);
        if (boldParts.length > 1) {
          return (
            <p key={i} className="text-sm text-muted-foreground leading-relaxed">
              {boldParts.map((part, j) =>
                j % 2 === 1 ? <strong key={j} className="text-foreground font-semibold">{part}</strong> : part
              )}
            </p>
          );
        }
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return (
            <div key={i} className="flex gap-2 text-sm text-muted-foreground">
              <span className="text-primary mt-1 flex-shrink-0">•</span>
              <span className="leading-relaxed">{line.slice(2)}</span>
            </div>
          );
        }
        if (/^\d+\./.test(line)) {
          const [num, ...rest] = line.split(". ");
          return (
            <div key={i} className="flex gap-2 text-sm">
              <span className="text-primary font-bold flex-shrink-0">{num}.</span>
              <span className="text-muted-foreground leading-relaxed">{rest.join(". ")}</span>
            </div>
          );
        }
        if (line.trim() === "") return <div key={i} className="h-2" />;
        return <p key={i} className="text-sm text-muted-foreground leading-relaxed">{line}</p>;
      })}
    </div>
  );
}

export default function Opportunities() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function sendQuery(queryText: string, analysisType = "market") {
    if (!queryText.trim() || loading) return;

    const userMsg: Message = { role: "user", content: queryText };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setProgress("Initialisation de l'analyse...");

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? "";
    abortRef.current = new AbortController();

    // Determine mode and type from query
    const isOpportunity = queryText.toLowerCase().includes("opportunit") ||
      queryText.toLowerCase().includes("niche") ||
      queryText.toLowerCase().includes("idée") ||
      analysisType === "opportunities";

    const mode = isOpportunity ? "opportunities" : "analyze";

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/genieos-data-engine`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            mode,
            query: queryText,
            analysis_type: analysisType,
          }),
          signal: abortRef.current.signal,
        }
      );

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.type === "progress") setProgress(parsed.message);
            if (parsed.type === "done") {
              const content = parsed.analysis ?? parsed.result ?? "Analyse terminée.";
              setMessages((prev) => [
                ...prev,
                { role: "assistant", content, type: isOpportunity ? "opportunities" : "analysis" },
              ]);
              setProgress("");
            }
            if (parsed.type === "error") {
              setMessages((prev) => [
                ...prev,
                { role: "assistant", content: `❌ Erreur: ${parsed.message}` },
              ]);
              setProgress("");
            }
          } catch (_e) { /* ignore */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Erreur de connexion. Vérifiez votre connexion." },
        ]);
      }
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground">Business Intelligence</h1>
            <p className="text-xs text-muted-foreground">Détection d'opportunités & analyse marché IA</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && !loading && (
          <div className="space-y-6">
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <Lightbulb className="w-7 h-7 text-emerald-400" />
              </div>
              <h2 className="text-base font-bold text-foreground">Business Agent</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Analysez des marchés, trouvez des opportunités et générez des stratégies business avec l'IA.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUICK_PROMPTS.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.label}
                    onClick={() => sendQuery(p.query, p.type)}
                    className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/50 text-left transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{p.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.query}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground flex-shrink-0 mt-2" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-lg bg-accent/50 border border-border flex items-center justify-center flex-shrink-0 mr-3 mt-1">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
            )}
            <div
              className={cn(
                "rounded-xl px-4 py-3 max-w-[85%]",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground text-sm"
                  : "bg-card border border-border text-foreground flex-1"
              )}
            >
              {msg.role === "user" ? (
                <p>{msg.content}</p>
              ) : (
                <MarkdownRenderer content={msg.content} />
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-lg bg-accent/50 border border-border flex items-center justify-center flex-shrink-0 mr-3 mt-1">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            </div>
            <div className="bg-card border border-border rounded-xl px-4 py-3">
              <p className="text-sm text-muted-foreground">{progress || "Analyse en cours..."}</p>
              <div className="mt-2 flex gap-1">
                {[0, 1, 2].map((j) => (
                  <div
                    key={j}
                    className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: `${j * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-border bg-card/50">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendQuery(input); } }}
            placeholder="Ex: Trouve 5 opportunités SaaS IA, analyse ce marché..."
            disabled={loading}
            className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 disabled:opacity-50"
          />
          <button
            onClick={() => sendQuery(input)}
            disabled={!input.trim() || loading}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium disabled:opacity-40 transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? "" : "Analyser"}
          </button>
        </div>
      </div>
    </div>
  );
}
