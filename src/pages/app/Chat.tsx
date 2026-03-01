import { useState, useRef, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Send, Zap, Mic, RotateCcw, Brain, LogOut, BookOpen, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import DOMPurify from "dompurify";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  model_used?: string;
  isLoading?: boolean;
}

// ─── Action buttons ───────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: "Explique plus simplement", prompt: "Peux-tu expliquer cela plus simplement ?" },
  { label: "Donne un exemple", prompt: "Donne-moi un exemple concret." },
  { label: "Fais-moi un quiz", prompt: "Fais-moi un quiz rapide sur ce sujet." },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sanitizeInput(text: string): string {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}

// ─── Dots loader ──────────────────────────────────────────────────────────────
function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 py-1" aria-label="Genie réfléchit...">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({
  message,
  onQuickAction,
}: {
  message: Message;
  onQuickAction: (prompt: string) => void;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm px-4 py-3 bg-primary text-primary-foreground text-sm leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 mb-4">
      {/* Avatar */}
      <div className="shrink-0 w-8 h-8 rounded-full gradient-primary flex items-center justify-center shadow-glow mt-1">
        <Zap className="w-4 h-4 text-primary-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-muted/60 border border-border/40 text-sm leading-relaxed whitespace-pre-wrap">
          {message.isLoading ? <ThinkingDots /> : message.content}
        </div>
        {!message.isLoading && (
          <>
            {/* Quick actions */}
            <div className="flex flex-wrap gap-2 mt-2">
              {QUICK_ACTIONS.map((a) => (
                <button
                  key={a.label}
                  onClick={() => onQuickAction(a.prompt)}
                  className="text-xs px-2.5 py-1 rounded-full border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                >
                  {a.label}
                </button>
              ))}
            </div>
            {/* Model badge */}
            {message.model_used && (
              <p className="mt-1.5 text-[10px] text-muted-foreground/50 pl-1">
                {message.model_used}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Chat() {
  const { profile, signOut, session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Bonjour ${profile?.full_name?.split(" ")[0] ?? ""} ! 👋 Je suis **Genie**, votre assistant pédagogique IA.\n\nPosez-moi n'importe quelle question sur l'IA ou la cybersécurité. Je suis là pour vous aider ! ✨`,
      model_used: undefined,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (overrideText?: string) => {
      const raw = overrideText ?? input;
      const text = sanitizeInput(raw);
      if (!text || isLoading) return;

      setInput("");
      const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
      const loadingMsg: Message = { id: "loading", role: "assistant", content: "", isLoading: true };

      setMessages((prev) => [...prev, userMsg, loadingMsg]);
      setIsLoading(true);

      try {
        const apiMessages = [...messages, userMsg]
          .filter((m) => !m.isLoading)
          .slice(-20) // Keep last 20 messages for context
          .map((m) => ({ role: m.role, content: m.content }));

        const { data, error } = await supabase.functions.invoke("chat-completion", {
          body: {
            messages: apiMessages,
            user_profile: {
              persona: profile?.persona ?? "",
              level: profile?.level ?? 1,
              mode: profile?.preferred_mode ?? "normal",
            },
            session_id: sessionId,
            request_type: "chat",
          },
        });

        if (error) throw error;
        if (data?.error) {
          // Surface rate limit / payment errors
          if (data.error.includes("Limite") || data.error.includes("heure")) {
            toast({ title: "Limite atteinte", description: data.error, variant: "destructive" });
          }
          throw new Error(data.error);
        }

        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.content,
          model_used: data.model_used,
        };
        setMessages((prev) => prev.filter((m) => m.id !== "loading").concat(assistantMsg));
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Erreur inconnue";
        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `❌ ${errMsg}`,
        };
        setMessages((prev) => prev.filter((m) => m.id !== "loading").concat(assistantMsg));
      } finally {
        setIsLoading(false);
        textareaRef.current?.focus();
      }
    },
    [input, isLoading, messages, profile, session, sessionId],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleReset = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Nouvelle conversation démarrée. Comment puis-je vous aider ? ✨",
      },
    ]);
  };

  const modeBadge: Record<string, string> = {
    enfant: "Mode Enfant 🧒",
    normal: "Mode Normal",
    expert: "Mode Expert 🎓",
  };

  return (
    <>
      <Helmet>
        <title>Chat Genie – GENIE IA</title>
      </Helmet>

      <div className="flex flex-col h-screen gradient-hero">
        {/* ── Navbar ── */}
        <header className="shrink-0 border-b border-border/40 px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
              <Brain className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold hidden sm:inline">GENIE <span className="text-gradient">IA</span></span>
          </Link>

          <div className="flex items-center gap-3">
            {/* Mode indicator */}
            <span className="hidden sm:inline-flex text-xs px-2.5 py-1 rounded-full border border-border/50 text-muted-foreground">
              {modeBadge[profile?.preferred_mode ?? "normal"] ?? "Mode Normal"}
            </span>
            <Link
              to="/app/modules"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Modules</span>
            </Link>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Nouvelle conversation"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Nouveau</span>
            </button>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Se déconnecter"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          <div className="max-w-2xl mx-auto">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onQuickAction={(prompt) => sendMessage(prompt)}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* ── Input ── */}
        <div className="shrink-0 border-t border-border/40 bg-background/80 backdrop-blur-sm px-4 sm:px-6 py-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Posez votre question à Genie... (Entrée pour envoyer)"
                  className="min-h-[52px] max-h-36 resize-none pr-12 text-sm"
                  rows={1}
                  disabled={isLoading}
                />
              </div>

              {/* Mic button (placeholder for Phase 2A) */}
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 h-[52px] w-[52px]"
                disabled
                aria-label="Microphone (bientôt disponible)"
                title="Commande vocale — bientôt disponible"
              >
                <Mic className="w-4 h-4 text-muted-foreground" />
              </Button>

              {/* Send button */}
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className="shrink-0 h-[52px] w-[52px] gradient-primary shadow-glow"
                size="icon"
                aria-label="Envoyer"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground/50 mt-2 text-center">
              Genie peut faire des erreurs. Vérifiez les informations importantes.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
