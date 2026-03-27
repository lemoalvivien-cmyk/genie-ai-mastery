import { useState, useRef, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Send, Zap, Mic, RotateCcw, Loader2, Lock } from "lucide-react";
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
import { features } from "@/config/features";


// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  model_used?: string;
  isLoading?: boolean;
  isUpsell?: boolean;
}

const QUICK_ACTIONS = [
  { label: "Explique plus simplement", prompt: "Peux-tu expliquer cela plus simplement ?" },
  { label: "Donne un exemple", prompt: "Donne-moi un exemple concret." },
  { label: "Fais-moi un quiz", prompt: "Fais-moi un quiz rapide sur ce sujet." },
];

type SuggestionSet = { emoji: string; label: string }[];

function getSuggestions(persona: string | null, hasProgress: boolean): SuggestionSet {
  if (persona === "dirigeant" || persona === "manager") return [
    { emoji: "📧", label: "Rédiger un email délicat" },
    { emoji: "📊", label: "Préparer une présentation" },
    { emoji: "📝", label: "Faire un compte rendu de réunion" },
  ];
  if (persona === "senior") return [
    { emoji: "📧", label: "Écrire un message professionnel" },
    { emoji: "📋", label: "Organiser mes tâches de la semaine" },
    { emoji: "💡", label: "Trouver des idées pour un projet" },
  ];
  if (persona === "parent") return [
    { emoji: "📧", label: "Rédiger une lettre administrative" },
    { emoji: "📊", label: "Comparer des options pour une décision" },
    { emoji: "💡", label: "Comment utiliser l'IA au quotidien" },
  ];
  if (persona === "jeune" || persona === "etudiant") return [
    { emoji: "📝", label: "Structurer une dissertation" },
    { emoji: "💡", label: "Trouver des idées de projet" },
    { emoji: "📧", label: "Rédiger un email de candidature" },
  ];
  if (!hasProgress) return [
    { emoji: "📧", label: "Rédiger un email professionnel" },
    { emoji: "📊", label: "Analyser un document" },
    { emoji: "💡", label: "Améliorer ma productivité avec l'IA" },
  ];
  return [
    { emoji: "🎯", label: "Continuer mon apprentissage" },
    { emoji: "📝", label: "Faire un compte rendu" },
    { emoji: "💡", label: "Conseil du jour" },
  ];
}

const PLACEHOLDERS = [
  "Demande-moi n'importe quoi... (ex: rédige un email de relance client)",
  "Pose-moi une question sur l'IA ou la productivité...",
  "Dis-moi ce que tu veux accomplir aujourd'hui...",
];

function sanitizeInput(text: string): string {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-2 h-2 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, background: "#5257D8" }} />
      ))}
    </div>
  );
}

function UpsellBubble({ content }: { content: string }) {
  return (
    <div className="flex gap-3 mb-4">
      <div className="shrink-0 w-8 h-8 rounded-full gradient-primary flex items-center justify-center shadow-glow mt-1">
        <Zap className="w-4 h-4 text-primary-foreground" />
      </div>
      <div className="flex-1 min-w-0 space-y-3">
        <div className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed"
          style={{ background: "rgba(82,87,216,0.08)", border: "1px solid rgba(82,87,216,0.3)" }}>
          {content}
        </div>
        <a href="/pricing"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all hover:brightness-110"
          style={{ background: "#FE2C40", color: "#fff" }}>
          <Lock className="w-4 h-4" />
          Passer au plan Pro — 500 échanges/jour →
        </a>
      </div>
    </div>
  );
}

function MessageBubble({ message, onQuickAction }: { message: Message; onQuickAction: (prompt: string) => void }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed text-foreground"
          style={{ background: "rgba(82,87,216,0.20)", borderLeft: "3px solid #5257D8" }}>
          {message.content}
        </div>
      </div>
    );
  }
  if (message.isUpsell) return <UpsellBubble content={message.content} />;
  return (
    <div className="flex gap-3 mb-4">
      <div className="shrink-0 w-8 h-8 rounded-full gradient-primary flex items-center justify-center shadow-glow mt-1">
        <Zap className="w-4 h-4 text-primary-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
          style={{ background: "#1A1D2E", borderLeft: "3px solid #FE2C40" }}>
          {message.isLoading ? <ThinkingDots /> : message.content}
        </div>
        {!message.isLoading && (
          <>
            <div className="flex flex-wrap gap-2 mt-2">
              {QUICK_ACTIONS.map((a) => (
                <button key={a.label} onClick={() => onQuickAction(a.prompt)}
                  className="text-xs px-2.5 py-1 rounded-full border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
                  {a.label}
                </button>
              ))}
            </div>
            {message.model_used && <p className="mt-1.5 text-[10px] text-muted-foreground/50 pl-1">{message.model_used}</p>}
          </>
        )}
      </div>
    </div>
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
  const contextSkillIds = (searchParams.get("skill_ids") ?? "").split(",").filter(Boolean);
  const contextModuleId = searchParams.get("module_id") ?? undefined;
  const [kittMode, setKittMode] = useState<KITTMode>("coaching");
  const { data: kittContext } = useKITTContext();
  const hasProgress = (kittContext?.completed_modules ?? 0) > 0;
  const { track } = useAnalytics();
  

  const firstName = profile?.full_name?.split(" ")[0] ?? "";
  const welcomeContent = isPanic
    ? "Dis-moi ce qui se passe, je vais t'aider à trouver une solution."
    : firstName
    ? `Salut ${firstName} ! Qu'est-ce qu'on fait aujourd'hui ?`
    : `Salut ! Je suis KITT, ton copilote Formetoialia. Pose-moi n'importe quelle question, ou choisis un sujet ci-dessous.`;

  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "assistant", content: welcomeContent },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [kittState, setKittState] = useState<KittState>("idle");
  const [voiceEnabled, setVoiceEnabled] = useState(() => profile?.voice_enabled ?? true);
  const { scoreExchange } = useConversationalScoring();
  const [placeholder] = useState(() => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const consecutiveFailuresRef = useRef(consecutiveFailures);
  consecutiveFailuresRef.current = consecutiveFailures;
  const kittModeRef = useRef(kittMode);
  kittModeRef.current = kittMode;
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const suggestions = getSuggestions(profile?.persona ?? null, hasProgress);

  const { isListening, getAnalyser, startListening, stopListening, speak, stopSpeaking } = useVoiceEngine({
    onTranscript: (text, isFinal) => {
      if (isFinal) { setInput(text); setTimeout(() => sendMessage(text), 800); }
      else setInput(text);
    },
    onStateChange: setKittState,
    voiceEnabled,
  });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { setVoiceEnabled(profile?.voice_enabled ?? true); }, [profile?.voice_enabled]);

  const handleVoiceToggle = async () => {
    const newVal = !voiceEnabled;
    setVoiceEnabled(newVal);
    if (!newVal) stopSpeaking();
    if (session?.user?.id) await supabase.from("profiles").update({ voice_enabled: newVal }).eq("id", session.user.id);
  };

  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const isProRef = useRef(isPro);
  isProRef.current = isPro;

  const CONFUSION_SIGNALS = [/je (ne )?comprends? (pas|rien)/i, /c'est (quoi|compliqué|confus)/i, /t'as perdu/i, /j'ai (pas|rien) compris/i];
  const detectConfusion = (text: string) => CONFUSION_SIGNALS.some(p => p.test(text));

  const sendMessage = useCallback(async (overrideText?: string) => {
    const raw = overrideText ?? input;
    const text = sanitizeInput(raw);
    if (!text || isLoading) return;
    if (text.length > 8000) {
      toast({ title: "Message trop long", description: "Maximum 8000 caractères.", variant: "destructive" });
      return;
    }

    const isConfused = detectConfusion(text);
    setConsecutiveFailures(prev => isConfused ? Math.min(2, prev + 1) : Math.max(0, prev - 1));
    setInput("");

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setKittState("thinking");

    track("chat_sent", { session_id: sessionId });

    // ── NORMAL MODE: use chat-completion ──────────────────────────────────
    const loadingMsg: Message = { id: "loading", role: "assistant", content: "", isLoading: true };
    setMessages(prev => [...prev, loadingMsg]);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const apiMessages = [...messagesRef.current, userMsg]
        .filter(m => !m.isLoading)
        .slice(-20)
        .map(m => ({ role: m.role, content: m.content }));

      const p = profileRef.current;
      const { data, error } = await supabase.functions.invoke("chat-completion", {
        body: {
          messages: apiMessages,
          user_profile: { persona: p?.persona ?? "", level: p?.level ?? 1, mode: p?.preferred_mode ?? "normal" },
          session_id: sessionId,
          request_type: "chat",
          adaptation_level: Math.min(2, consecutiveFailuresRef.current),
          kitt_context: { ...(kittContext ?? {}), kitt_mode: kittModeRef.current },
        },
      });

      if (data?.error && !data?.quota_exceeded) {
        if (data.error.includes("Limite") || data.error.includes("heure")) {
          toast({ title: "Limite atteinte", description: data.error, variant: "destructive" });
        }
        throw new Error(data.error);
      }

      if (data?.quota_exceeded) {
        // Use unified analytics layer — never insert directly
        track("quota_hit", { plan: "free" });
      }

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.content,
        model_used: data.model_used,
        isUpsell: !!data.quota_exceeded,
      };
      setMessages(prev => prev.filter(m => m.id !== "loading").concat(assistantMsg));

      if (session?.access_token && !data.quota_exceeded && data.content) {
        if (contextSkillIds.length) {
          fireScoreUtterance({ utterance: text, assistantReply: data.content, skillIds: contextSkillIds, moduleId: contextModuleId, accessToken: session.access_token });
        } else {
          scoreExchange({ utterance: text, assistantReply: data.content, accessToken: session.access_token });
        }
      }

      if (voiceEnabled && isProRef.current) speak(data.content);
      else setKittState("idle");
    } catch (err) {
      const isAbort = err instanceof Error && err.name === "AbortError";
      const errMsg = isAbort ? "Temps dépassé. Réessayez." : err instanceof Error ? err.message : "Erreur inconnue";
      setMessages(prev => prev.filter(m => m.id !== "loading").concat({ id: crypto.randomUUID(), role: "assistant", content: `❌ ${errMsg}` }));
      setKittState("idle");
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, isLoading, sessionId, speak, kittContext]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleReset = () => {
    stopSpeaking();
    setKittState("idle");
    setMessages([{ id: "welcome", role: "assistant", content: "Nouvelle conversation démarrée. ✨" }]);
  };

  const handleMicPress = () => { if (isListening) stopListening(); else startListening(); };
  const showSuggestions = messages.length === 1 && messages[0].id === "welcome";

  return (
    <>
      <Helmet><title>Chat IA — Formetoialia</title></Helmet>

      <div className="flex flex-col h-full" style={{ background: "#0F1119" }}>
        {/* ── Header with KITT visualizer ── */}
        <div className="shrink-0 flex flex-col items-center pt-4 pb-2 gap-2">
          <KittVisualizer state={kittState} analyserNode={getAnalyser()} />
        </div>

        {/* ── KITT Mode Panel ── */}
        <div className="shrink-0 px-4 sm:px-6 pb-2">
          <div className="max-w-2xl mx-auto">
            <KITTModePanel
              mode={kittMode}
              onModeChange={(m) => {
                setKittMode(m);
                if (m === "diagnostic") sendMessage("Lance mon diagnostic de niveau sur les 4 domaines.");
                else if (m === "synthesis") sendMessage("Génère mon bilan de progression complet.");
                else if (m === "remediation" && kittContext?.top_gap) sendMessage(`Aide-moi à corriger ma lacune sur : ${kittContext.top_gap.name}`);
              }}
              context={kittContext ?? null}
              isPro={isPro}
            />
          </div>
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4" style={{ background: "#0F1119" }}>
          <div className="max-w-2xl mx-auto">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} onQuickAction={(p) => sendMessage(p)} />
            ))}

            {showSuggestions && (
              <div className="mt-4 flex flex-col gap-3">
                {suggestions.map((s) => (
                  <button key={s.label} onClick={() => sendMessage(s.label)}
                    className="w-full min-h-[52px] flex items-center gap-3 px-5 py-3 rounded-2xl border border-border/60 bg-card/50 hover:bg-card/80 hover:border-primary/50 text-foreground text-sm font-medium text-left transition-all group">
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
                  placeholder={placeholder}
                  className="min-h-[52px] max-h-36 resize-none text-base transition-all"
                  maxLength={8000}
                  style={{
                    background: "#1A1D2E",
                    border: "1px solid rgba(82,87,216,0.4)",
                    color: "hsl(var(--foreground))",
                    fontSize: "16px",
                  }}
                  rows={1}
                  disabled={isLoading}
                />
              </div>
              {features.voiceMode ? (
                isPro ? (
                  <Button variant="outline" size="icon"
                    className={`shrink-0 h-[52px] w-[52px] transition-all relative ${isListening ? "border-indigo-400 text-indigo-400 bg-indigo-400/10" : "text-muted-foreground"}`}
                    onClick={handleMicPress}>
                    <Mic className={`w-4 h-4 ${isListening ? "text-indigo-400" : ""}`} />
                    {isListening && <span className="absolute inset-0 rounded-md border border-primary opacity-40 animate-ping" />}
                  </Button>
                ) : (
                  <Button variant="outline" size="icon"
                    className="shrink-0 h-[52px] w-[52px] text-muted-foreground opacity-50"
                    onClick={() => navigate("/pricing")}>
                    <Lock className="w-4 h-4" />
                  </Button>
                )
              ) : null}
              <Button onClick={() => sendMessage()} disabled={!input.trim() || isLoading}
                size="icon" className="shrink-0 min-h-[52px] min-w-[52px] h-[52px] w-[52px]"
                style={{
                  background: "#FE2C40",
                  boxShadow: (!input.trim() || isLoading) ? undefined : "0 0 16px rgba(254,44,64,0.5)",
                  color: "#fff", border: "none",
                }}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-[10px] text-muted-foreground/50">
                KITT peut faire des erreurs. Vérifiez les informations importantes.
              </p>
              <button onClick={handleReset} className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground flex items-center gap-1">
                <RotateCcw className="w-2.5 h-2.5" /> Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
