import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Sparkles, Bot, User, Copy, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

type Message = { role: "user" | "assistant"; content: string };
type Module = "assistant" | "agent_builder" | "automation" | "app_builder" | "ai_tools" | "business";

const MODULE_OPTIONS: { value: Module; label: string; desc: string; emoji: string }[] = [
  { value: "assistant", label: "Assistant IA", desc: "Explications & questions", emoji: "🧠" },
  { value: "agent_builder", label: "Agent Builder", desc: "Créer des agents IA", emoji: "🤖" },
  { value: "automation", label: "Automation", desc: "Workflows & automatisations", emoji: "⚡" },
  { value: "app_builder", label: "App Builder", desc: "Architecture d'applications", emoji: "💻" },
  { value: "ai_tools", label: "AI Tools", desc: "Explorer des outils IA", emoji: "🔧" },
  { value: "business", label: "Business", desc: "Analyser des opportunités", emoji: "📊" },
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const QUICK_PROMPTS = [
  "Explique-moi ce qu'est un agent IA",
  "Crée un agent pour répondre aux emails",
  "Automatise la publication sur les réseaux sociaux",
  "Génère une app de gestion de leads",
  "Compare ChatGPT, Claude et Gemini",
  "Analyse le business model d'une newsletter IA",
];

export default function GenieOSChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeModule, setActiveModule] = useState<Module>("assistant");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isLoading) return;

    const userMsg: Message = { role: "user", content };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";

    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/genie-os-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ messages: nextMessages, module: activeModule }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ error: "Erreur réseau" }));
        if (resp.status === 429) toast({ title: "Limite atteinte", description: errData.error, variant: "destructive" });
        else if (resp.status === 402) toast({ title: "Crédits insuffisants", description: errData.error, variant: "destructive" });
        else toast({ title: "Erreur", description: errData.error ?? "Erreur IA", variant: "destructive" });
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
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (err) {
      toast({ title: "Erreur de connexion", description: String(err), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const copyMessage = (idx: number, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const reset = () => setMessages([]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Module selector */}
      <div className="flex-shrink-0 border-b border-border bg-card px-4 py-2">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
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
          {messages.length > 0 && (
            <button
              onClick={reset}
              className="ml-auto flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex-shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Effacer</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow mb-6">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Bonjour, je suis <span className="text-gradient">GENIE OS</span>
            </h2>
            <p className="text-muted-foreground text-sm mb-8 max-w-md">
              {MODULE_OPTIONS.find(m => m.value === activeModule)?.desc} — Pose ta question ou choisis un point de départ ci-dessous.
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
            <div
              key={idx}
              className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
            >
              {/* Avatar */}
              <div className={cn(
                "flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5",
                msg.role === "user" ? "bg-secondary border border-border" : "gradient-primary shadow-glow-sm"
              )}>
                {msg.role === "user"
                  ? <User className="w-3.5 h-3.5 text-foreground" />
                  : <Sparkles className="w-3.5 h-3.5 text-white" />
                }
              </div>

              {/* Bubble */}
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
                {msg.role === "assistant" && (
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

      {/* Input */}
      <div className="flex-shrink-0 border-t border-border bg-card px-4 py-3">
        <div className="flex gap-2 items-end max-w-4xl mx-auto">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Mode ${MODULE_OPTIONS.find(m => m.value === activeModule)?.label} — Envoie ta question…`}
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
        <p className="text-center text-xs text-muted-foreground/50 mt-2">
          Propulsé par <span className="text-primary/70">GENIE OS</span> · Shift+Entrée pour sauter une ligne
        </p>
      </div>
    </div>
  );
}
