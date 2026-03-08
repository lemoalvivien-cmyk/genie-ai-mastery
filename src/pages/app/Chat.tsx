import { useState, useRef, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Send, Zap, Mic, RotateCcw, Loader2, Volume2, VolumeX, Lock } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import DOMPurify from "dompurify";
import { fireScoreUtterance, useConversationalScoring } from "@/hooks/useSkillMastery";
import KittVisualizer, { KittState } from "@/components/chat/KittVisualizer";
import { useVoiceEngine } from "@/hooks/useVoiceEngine";
import { useSubscription } from "@/hooks/useSubscription";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useKITTContext, type KITTMode } from "@/hooks/useKITTContext";
import { KITTModePanel } from "@/components/chat/KITTModePanel";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  model_used?: string;
  isLoading?: boolean;
  isUpsell?: boolean;
}

// ─── Action buttons ───────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: "Explique plus simplement", prompt: "Peux-tu expliquer cela plus simplement ?" },
  { label: "Donne un exemple", prompt: "Donne-moi un exemple concret." },
  { label: "Fais-moi un quiz", prompt: "Fais-moi un quiz rapide sur ce sujet." },
];

// ─── Dynamic suggestions per persona ─────────────────────────────────────────
type SuggestionSet = { emoji: string; label: string }[];

function getSuggestions(persona: string | null, hasProgress: boolean): SuggestionSet {
  const day = new Date().getDay();
  const isMondayMorning = day === 1;

  if (persona === "dirigeant" || persona === "manager") {
    return [
      { emoji: "🛡️", label: "Vérifier la sécurité de mon entreprise" },
      { emoji: "🤖", label: "Comment utiliser l'IA au travail" },
      { emoji: "📄", label: "Générer ma charte IA" },
    ];
  }
  if (persona === "senior") {
    return [
      { emoji: "🔒", label: "Protéger mes comptes en ligne" },
      { emoji: "📱", label: "Sécuriser mon téléphone" },
      { emoji: "🆘", label: "J'ai reçu un message bizarre" },
    ];
  }
  if (persona === "parent") {
    return [
      { emoji: "👶", label: "Protéger mes enfants sur Internet" },
      { emoji: "🔒", label: "Contrôle parental : comment faire ?" },
      { emoji: "🤖", label: "Expliquer l'IA à mes enfants" },
    ];
  }
  if (persona === "jeune" || persona === "etudiant") {
    return [
      { emoji: "💻", label: "Créer une app avec le vibe coding" },
      { emoji: "🧠", label: "Techniques avancées de prompt engineering" },
      { emoji: "🔍", label: "Comment fonctionne une IA ?" },
    ];
  }
  if (persona === "independant") {
    return [
      { emoji: "⚡", label: "Automatiser mes tâches répétitives" },
      { emoji: "🛡️", label: "Sécuriser mes données clients" },
      { emoji: "🤖", label: "Outils IA pour gagner du temps" },
    ];
  }
  // Default / salarie
  if (!hasProgress) {
    return [
      { emoji: "🛡️", label: "Commencer par la cybersécurité" },
      { emoji: "🤖", label: "Découvrir l'IA générative" },
      { emoji: isMondayMorning ? "🚀" : "💡", label: isMondayMorning ? "Boost productivité du lundi" : "Améliorer ma productivité" },
    ];
  }
  return [
    { emoji: "🎯", label: "Continuer mon apprentissage" },
    { emoji: "🛡️", label: "Un quiz cybersécurité rapide" },
    { emoji: "💡", label: "Conseil du jour" },
  ];
}

const PLACEHOLDERS = [
  "Demande-moi n'importe quoi... (ex: comment sécuriser mon wifi ?)",
  "Tu peux me parler en vocal aussi... (ex: c'est quoi le phishing ?)",
  "Pose-moi une question sur l'IA ou la cyber...",
  "Dis-moi ce que tu veux apprendre aujourd'hui...",
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
          className="w-2 h-2 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, background: "#5257D8" }}
        />
      ))}
    </div>
  );
}

// ─── Upsell bubble ───────────────────────────────────────────────────────────
function UpsellBubble({ content }: { content: string }) {
  return (
    <div className="flex gap-3 mb-4">
      <div className="shrink-0 w-8 h-8 rounded-full gradient-primary flex items-center justify-center shadow-glow mt-1">
        <Zap className="w-4 h-4 text-primary-foreground" />
      </div>
      <div className="flex-1 min-w-0 space-y-3">
        <div
          className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed"
          style={{
            background: "rgba(82,87,216,0.08)",
            border: "1px solid rgba(82,87,216,0.3)",
          }}
        >
          {content}
        </div>
        {/* Progress bar 2/2 */}
        <div className="px-1">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Messages gratuits utilisés</span>
            <span className="font-semibold" style={{ color: "#FE2C40" }}>2/2</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div className="h-full rounded-full w-full" style={{ background: "#FE2C40" }} />
          </div>
        </div>
        <a
          href="/pricing"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all hover:brightness-110"
          style={{ background: "#FE2C40", color: "#fff" }}
        >
          <Lock className="w-4 h-4" />
          Débloquer KITT IA illimité →
        </a>
      </div>
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
        <div
          className="max-w-[80%] rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed text-foreground"
          style={{
            background: "rgba(82,87,216,0.20)",
            borderLeft: "3px solid #5257D8",
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }
  if (message.isUpsell) {
    return <UpsellBubble content={message.content} />;
  }
  return (
    <div className="flex gap-3 mb-4">
      <div className="shrink-0 w-8 h-8 rounded-full gradient-primary flex items-center justify-center shadow-glow mt-1">
        <Zap className="w-4 h-4 text-primary-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
          style={{
            background: "#1A1D2E",
            borderLeft: "3px solid #FE2C40",
          }}
        >
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
              <p className="mt-1.5 text-[10px] text-muted-foreground/50 pl-1">{message.model_used}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Eco mode badge ───────────────────────────────────────────────────────────
function EcoModeBadge({ active }: { active: boolean }) {
  if (!active) return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] text-primary font-medium">
      ✅ Économiseur
    </span>
  );
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 border border-destructive/30 text-[10px] text-destructive font-medium">
      ⚠️ Éco forcé
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Chat() {
  const { profile, session } = useAuth();
  const navigate = useNavigate();
  const { data: sub } = useSubscription();
  const isPro = sub?.isActive ?? false;
  const [searchParams] = useSearchParams();
  const isPanic = searchParams.get("panic") === "autre";
  // skill_ids & module_id can be passed via query params when Chat is opened from a module
  const contextSkillIds = (searchParams.get("skill_ids") ?? "").split(",").filter(Boolean);
  const contextModuleId = searchParams.get("module_id") ?? undefined;
  const [ecoMode, setEcoMode] = useState(false);
  const [kittMode, setKittMode] = useState<KITTMode>("coaching");
  const { data: kittContext } = useKITTContext();
  const hasProgress = (kittContext?.completed_modules ?? 0) > 0;

  // Dynamic welcome message
  const firstName = profile?.full_name?.split(" ")[0] ?? "";
  const welcomeContent = isPanic
    ? "Dis-moi ce qui se passe, je vais t'aider à trouver une solution. Prends ton temps pour m'expliquer."
    : firstName
    ? `Salut ${firstName} ! Qu'est-ce qu'on fait aujourd'hui ?`
    : `Salut ! Je suis ton Genie. Pose-moi n'importe quelle question, ou choisis un sujet ci-dessous. Je m'adapte à toi.`;

  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "assistant", content: welcomeContent },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [kittState, setKittState] = useState<KittState>("idle");
  const [voiceEnabled, setVoiceEnabled] = useState(() => profile?.voice_enabled ?? true);
  // hasProgress is now derived from real kittContext data (replaced the hardcoded false)
  const { scoreExchange } = useConversationalScoring();
  const [placeholder] = useState(() => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]);
  // ── Semantic adaptation engine ─────────────────────────────────────────────
  // Tracks consecutive "failure signals" (wrong quiz answers or explicit confusion)
  // 0 = normal | 1 = simplify | 2 = ELI10 forced analogies
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const adaptationLevel = Math.min(2, consecutiveFailures);
  const consecutiveFailuresRef = useRef(consecutiveFailures);
  consecutiveFailuresRef.current = consecutiveFailures;
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const suggestions = getSuggestions(profile?.persona ?? null, hasProgress);

  const { isListening, getAnalyser, startListening, stopListening, speak, stopSpeaking } = useVoiceEngine({
    onTranscript: (text, isFinal) => {
      if (isFinal) {
        setInput(text);
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

  useEffect(() => {
    setVoiceEnabled(profile?.voice_enabled ?? true);
  }, [profile?.voice_enabled]);

  const handleVoiceToggle = async () => {
    const newVal = !voiceEnabled;
    setVoiceEnabled(newVal);
    if (!newVal) stopSpeaking();
    if (session?.user?.id) {
      await supabase.from("profiles").update({ voice_enabled: newVal }).eq("id", session.user.id);
    }
  };

  // Use refs for stable values so sendMessage doesn't change identity on every keystroke
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const voiceEnabledRef = useRef(voiceEnabled);
  voiceEnabledRef.current = voiceEnabled;
  const isProRef = useRef(isPro);
  isProRef.current = isPro;

  // Detect failure signals in user message (confusion keywords)
  const CONFUSION_SIGNALS = [
    /je (ne )?comprends? (pas|rien)/i,
    /c'est (quoi|quoi exactement|compliqué|confus)/i,
    /t'as perdu/i,
    /explique (encore|autrement|plus simplement|mieux)/i,
    /j'ai (pas|rien) compris/i,
    /ça (veut|veux) dire quoi/i,
    /je suis perdu/i,
    /c'est trop (compliqué|technique|complexe)/i,
  ];

  const detectConfusion = (text: string): boolean =>
    CONFUSION_SIGNALS.some((p) => p.test(text));

  const sendMessage = useCallback(
    async (overrideText?: string, isFailureSignal?: boolean) => {
      const raw = overrideText ?? input;
      const text = sanitizeInput(raw);
      if (!text || isLoading) return;

      // ── Adaptation: bump failure counter if confused ─────────────────────
      const isConfused = isFailureSignal || detectConfusion(text);
      const newFailures = isConfused
        ? Math.min(2, consecutiveFailuresRef.current + 1)
        : Math.max(0, consecutiveFailuresRef.current - 1); // success slowly resets
      setConsecutiveFailures(newFailures);
      const currentAdaptation = Math.min(2, newFailures);

      setInput("");
      const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
      const loadingMsg: Message = { id: "loading", role: "assistant", content: "", isLoading: true };

      setMessages((prev) => [...prev, userMsg, loadingMsg]);
      setIsLoading(true);
      setKittState("thinking");

      try {
        const apiMessages = [...messagesRef.current, userMsg]
          .filter((m) => !m.isLoading)
          .slice(-20)
          .map((m) => ({ role: m.role, content: m.content }));

        const p = profileRef.current;
        const { data, error } = await supabase.functions.invoke("chat-completion", {
          body: {
            messages: apiMessages,
            user_profile: {
              persona: p?.persona ?? "",
              level: p?.level ?? 1,
              mode: p?.preferred_mode ?? "normal",
            },
            session_id: sessionId,
            request_type: "chat",
            adaptation_level: currentAdaptation,
          },
        });

        if (data?.error && !data?.quota_exceeded) {
          if (data.error.includes("Limite") || data.error.includes("heure")) {
            toast({ title: "Limite atteinte", description: data.error, variant: "destructive" });
          }
          throw new Error(data.error);
        }

        if (data?.quota_exceeded) {
          // Fire quota_hit event (fire-and-forget)
          supabase.from("analytics_events").insert({
            actor_user_id: session?.user?.id ?? null,
            event_name: "quota_hit",
            properties: { plan: "free", path: window.location.pathname },
          }).then(() => {});
        }

        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.content,
          model_used: data.model_used,
          isUpsell: !!data.quota_exceeded,
        };
        setMessages((prev) => prev.filter((m) => m.id !== "loading").concat(assistantMsg));
        if (data.eco_mode) setEcoMode(true);

        // Invisible conversational skill scoring — fire-and-forget, never blocks UI
        // Works in all chat contexts: with or without explicit skill_ids from a module
        if (session?.access_token && !data.quota_exceeded && data.content) {
          if (contextSkillIds.length) {
            // Module context: score explicit skills (UUID list)
            fireScoreUtterance({
              utterance: text,
              assistantReply: data.content,
              skillIds: contextSkillIds,
              moduleId: contextModuleId,
              accessToken: session.access_token,
            });
          } else {
            // Free-form chat: auto-detect skills from conversation
            scoreExchange({
              utterance: text,
              assistantReply: data.content,
              accessToken: session.access_token,
            });
          }
        }


        if (voiceEnabledRef.current && isProRef.current) speak(data.content);
        else setKittState("idle");
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Erreur inconnue";
        setMessages((prev) =>
          prev.filter((m) => m.id !== "loading").concat({
            id: crypto.randomUUID(),
            role: "assistant",
            content: `❌ ${errMsg}`,
          }),
        );
        setKittState("idle");
      } finally {
        setIsLoading(false);
        textareaRef.current?.focus();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [input, isLoading, sessionId, speak],
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
    setMessages([{ id: "welcome", role: "assistant", content: "Nouvelle conversation démarrée. Comment puis-je vous aider ? ✨" }]);
  };

  const handleMicPress = () => {
    if (isListening) stopListening();
    else startListening();
  };

  const modeBadge: Record<string, string> = {
    enfant: "Mode Enfant 🧒",
    normal: "Mode Normal",
    expert: "Mode Expert 🎓",
  };

  // Check if only the welcome message is shown (no user messages yet)
  const showSuggestions = messages.length === 1 && messages[0].id === "welcome";

  return (
    <>
      <Helmet><title>Chat Genie – GENIE IA</title></Helmet>

      <div className="flex flex-col h-full page-enter" style={{ background: "#0F1119" }}>
        {/* ── KITT Visualizer + Eco badge ── */}
        <div className="shrink-0 flex flex-col items-center pt-4 pb-2 gap-2">
          <KittVisualizer state={kittState} analyserNode={getAnalyser()} />
          {ecoMode && (
            <div className="flex items-center gap-2">
              <EcoModeBadge active={true} />
              <span className="text-[10px] text-muted-foreground">Réponses courtes jusqu'à minuit</span>
            </div>
          )}
          {adaptationLevel >= 2 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[hsl(var(--warning)/0.15)] border border-[hsl(var(--warning)/0.3)] text-[10px] text-[hsl(var(--warning))] font-medium animate-pulse">
              🧒 Mode analogies activé
            </span>
          )}
          {adaptationLevel === 1 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] text-primary font-medium">
              💡 Mode simplifié
            </span>
          )}
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4" style={{ background: "#0F1119" }}>
          <div className="max-w-2xl mx-auto">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} onQuickAction={(p) => sendMessage(p)} />
            ))}

            {/* ── Suggestions (only shown when chat is empty) ── */}
            {showSuggestions && (
              <div className="mt-4 flex flex-col gap-3">
                {suggestions.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => sendMessage(s.label)}
                    className="w-full min-h-[52px] flex items-center gap-3 px-5 py-3 rounded-2xl border border-border/60 bg-card/50 hover:bg-card/80 hover:border-primary/50 text-foreground text-sm font-medium text-left transition-all group"
                  >
                    <span className="text-lg shrink-0">{s.emoji}</span>
                    <span className="group-hover:text-primary transition-colors">{s.label}</span>
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* ── Input ── */}
        <div className="shrink-0 border-t px-4 sm:px-6 py-4" style={{ borderColor: "#2A2D3A", background: "#13151E" }}>
          <div className="max-w-2xl mx-auto">
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Posez votre question à KITT IA..."
                  className="min-h-[52px] max-h-36 resize-none pr-12 text-sm transition-all"
                  maxLength={2000}
                  style={{
                    background: "#1A1D2E",
                    border: "1px solid rgba(82,87,216,0.4)",
                    boxShadow: input ? "0 0 0 2px rgba(82,87,216,0.25)" : undefined,
                    color: "hsl(var(--foreground))",
                  }}
                  rows={1}
                  disabled={isLoading}
                />
              </div>
              {isPro ? (
                <Button
                  variant="outline"
                  size="icon"
                  className={`shrink-0 h-[52px] w-[52px] transition-all relative ${isListening ? "border-indigo-400 text-indigo-400 bg-indigo-400/10" : "text-muted-foreground"}`}
                  onClick={handleMicPress}
                  aria-label={isListening ? "Arrêter l'écoute" : "Parler à Genie"}
                >
                  <Mic className={`w-4 h-4 ${isListening ? "text-indigo-400" : ""}`} />
                  {isListening && (
                    <span className="absolute inset-0 rounded-md border border-primary opacity-40 animate-ping" />
                  )}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 h-[52px] w-[52px] text-muted-foreground opacity-50"
                  onClick={() => navigate("/pricing")}
                  title="Voix — Débloquez avec GENIE Pro"
                  aria-label="Voix disponible avec GENIE Pro"
                >
                  <Lock className="w-4 h-4" />
                </Button>
              )}
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="shrink-0 h-[52px] w-[52px] transition-all"
                style={{
                  background: "#FE2C40",
                  boxShadow: (!input.trim() || isLoading) ? undefined : "0 0 16px rgba(254,44,64,0.5)",
                  color: "#fff",
                  border: "none",
                }}
                aria-label="Envoyer"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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
