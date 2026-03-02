import { useState, useRef, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Send, Zap, Mic, RotateCcw, Brain, LogOut, BookOpen, Loader2, Volume2, VolumeX } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import DOMPurify from "dompurify";
import KittVisualizer, { KittState } from "@/components/chat/KittVisualizer";
import { useVoiceEngine } from "@/hooks/useVoiceEngine";

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
      <div className="shrink-0 w-8 h-8 rounded-full gradient-primary flex items-center justify-center shadow-glow mt-1">
        <Zap className="w-4 h-4 text-primary-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-muted/60 border border-border/40 text-sm leading-relaxed whitespace-pre-wrap">
          {message.isLoading ? <ThinkingDots /> : message.content}
        </div>
        {!message.isLoading && (
          <>
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
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [kittState, setKittState] = useState<KittState>("idle");
  const [voiceEnabled, setVoiceEnabled] = useState(() => profile?.voice_enabled ?? true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Voice engine
  const { isListening, getAnalyser, startListening, stopListening, speak, stopSpeaking } = useVoiceEngine({
    onTranscript: (text, isFinal) => {
      if (isFinal) {
        setInput(text);
        // Auto-send after 800ms
        setTimeout(() => sendMessage(text), 800);
      } else {
        setInput(text);
      }
    },
    onStateChange: setKittState,
    voiceEnabled,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Sync voice toggle with profile
  useEffect(() => {
    setVoiceEnabled(profile?.voice_enabled ?? true);
  }, [profile?.voice_enabled]);

  const handleVoiceToggle = async () => {
    const newVal = !voiceEnabled;
    setVoiceEnabled(newVal);
    if (!newVal) stopSpeaking();
    // Persist to profile
    if (session?.user?.id) {
      await supabase.from("profiles").update({ voice_enabled: newVal }).eq("id", session.user.id);
    }
  };

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
      setKittState("thinking");

      try {
        const apiMessages = [...messages, userMsg]
          .filter((m) => !m.isLoading)
          .slice(-20)
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

        // TTS
        if (voiceEnabled) {
          speak(data.content);
        } else {
          setKittState("idle");
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Erreur inconnue";
        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `❌ ${errMsg}`,
        };
        setMessages((prev) => prev.filter((m) => m.id !== "loading").concat(assistantMsg));
        setKittState("idle");
      } finally {
        setIsLoading(false);
        textareaRef.current?.focus();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [input, isLoading, messages, profile, session, sessionId, voiceEnabled, speak],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleReset = () => {
    stopSpeaking();
    setKittState("idle");
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Nouvelle conversation démarrée. Comment puis-je vous aider ? ✨",
      },
    ]);
  };

  const handleMicPress = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
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
            <span className="hidden sm:inline-flex text-xs px-2.5 py-1 rounded-full border border-border/50 text-muted-foreground">
              {modeBadge[profile?.preferred_mode ?? "normal"] ?? "Mode Normal"}
            </span>
            {/* Voice toggle */}
            <button
              onClick={handleVoiceToggle}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              aria-label={voiceEnabled ? "Désactiver la voix" : "Activer la voix"}
              title={voiceEnabled ? "Son activé" : "Son désactivé"}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline">{voiceEnabled ? "Son" : "Muet"}</span>
            </button>
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

        {/* ── KITT Visualizer ── */}
        <div className="shrink-0 flex justify-center pt-4 pb-2">
          <KittVisualizer
            state={kittState}
            analyserNode={getAnalyser()}
          />
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
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

              {/* Mic button */}
              <Button
                variant="outline"
                size="icon"
                  className={`shrink-0 h-[52px] w-[52px] transition-all relative ${
                  isListening
                    ? "border-indigo-400 text-indigo-400 bg-indigo-400/10"
                    : "text-muted-foreground"
                }`}
                onClick={handleMicPress}
                aria-label={isListening ? "Arrêter l'écoute" : "Parler à Genie"}
                title="Parler à Genie"
              >
                <Mic className={`w-4 h-4 ${isListening ? "text-indigo-400" : ""}`} />
                {isListening && (
                  <span className="absolute inset-0 rounded-md border border-primary opacity-40 animate-ping" />
                )}
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
