import { useState, useRef, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Send, Zap, Mic, RotateCcw, Loader2, Lock, Brain, AlertTriangle, TrendingDown, Sword, Shield, Eye, BarChart3 } from "lucide-react";
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
import { useGenieBrain, type AgentType } from "@/hooks/useGenieBrain";
import { AgentSwarmVisualizer } from "@/components/brain/AgentSwarmVisualizer";
import { Badge } from "@/components/ui/badge";
import { useBrainTracker } from "@/hooks/useBrainTracker";
import { PalantirOnboardingTour, shouldShowTour } from "@/components/onboarding/PalantirOnboardingTour";
import { QuickStartModal, shouldShowQuickStart } from "@/components/chat/QuickStartModal";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  model_used?: string;
  isLoading?: boolean;
  isUpsell?: boolean;
  isPalantir?: boolean;
  palantirData?: {
    riskScore: number;
    riskDelta: number;
    agentResponses: Array<{ agent: string; content: string }>;
    prediction?: Record<string, unknown> | null;
    humanComparison?: { genie_response_ms: number; human_response_s: number; human_error_rate: number; human_cost_eur: number } | null;
    generatedModule?: { title: string; domain: string; urgency: string; confidence: number } | null;
  };
}

const QUICK_ACTIONS = [
  { label: "Explique plus simplement", prompt: "Peux-tu expliquer cela plus simplement ?" },
  { label: "Donne un exemple", prompt: "Donne-moi un exemple concret." },
  { label: "Fais-moi un quiz", prompt: "Fais-moi un quiz rapide sur ce sujet." },
];

type SuggestionSet = { emoji: string; label: string }[];

function getSuggestions(persona: string | null, hasProgress: boolean): SuggestionSet {
  const day = new Date().getDay();
  const isMondayMorning = day === 1;
  if (persona === "dirigeant" || persona === "manager") return [
    { emoji: "🛡️", label: "Vérifier la sécurité de mon entreprise" },
    { emoji: "🤖", label: "Comment utiliser l'IA au travail" },
    { emoji: "📄", label: "Générer ma charte IA" },
  ];
  if (persona === "senior") return [
    { emoji: "🔒", label: "Protéger mes comptes en ligne" },
    { emoji: "📱", label: "Sécuriser mon téléphone" },
    { emoji: "🆘", label: "J'ai reçu un message bizarre" },
  ];
  if (persona === "parent") return [
    { emoji: "👶", label: "Protéger mes enfants sur Internet" },
    { emoji: "🔒", label: "Contrôle parental : comment faire ?" },
    { emoji: "🤖", label: "Expliquer l'IA à mes enfants" },
  ];
  if (persona === "jeune" || persona === "etudiant") return [
    { emoji: "💻", label: "Créer une app avec le vibe coding" },
    { emoji: "🧠", label: "Techniques avancées de prompt engineering" },
    { emoji: "🔍", label: "Comment fonctionne une IA ?" },
  ];
  if (!hasProgress) return [
    { emoji: "🛡️", label: "Commencer par la cybersécurité" },
    { emoji: "🤖", label: "Découvrir l'IA générative" },
    { emoji: isMondayMorning ? "🚀" : "💡", label: isMondayMorning ? "Boost productivité du lundi" : "Améliorer ma productivité" },
  ];
  return [
    { emoji: "🎯", label: "Continuer mon apprentissage" },
    { emoji: "🛡️", label: "Un quiz cybersécurité rapide" },
    { emoji: "💡", label: "Conseil du jour" },
  ];
}

const PLACEHOLDERS = [
  "Demande-moi n'importe quoi... (ex: comment sécuriser mon wifi ?)",
  "Pose-moi une question sur l'IA ou la cyber...",
  "Dis-moi ce que tu veux apprendre aujourd'hui...",
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

// ─── Agent icon map ────────────────────────────────────────────────────────────
const AGENT_ICONS: Record<string, { icon: typeof Sword; color: string; label: string; emoji: string }> = {
  attaquant: { icon: Sword, color: "text-destructive", label: "Agent Attaquant", emoji: "🗡️" },
  defenseur: { icon: Shield, color: "text-blue-400", label: "Agent Défenseur", emoji: "🛡️" },
  tuteur: { icon: Brain, color: "text-primary", label: "Agent Tuteur", emoji: "🎓" },
  predictor: { icon: Eye, color: "text-purple-400", label: "Agent Predictor", emoji: "🔮" },
  analyst: { icon: BarChart3, color: "text-emerald-400", label: "Agent Analyst", emoji: "📊" },
};

// ─── Palantir response card ────────────────────────────────────────────────────
function PalantirBubble({ message, onQuickAction }: { message: Message; onQuickAction: (p: string) => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const d = message.palantirData;
  if (!d) return null;

  const riskColor = d.riskScore >= 70 ? "#EF4444" : d.riskScore >= 40 ? "#F97316" : "#10B981";

  return (
    <div className="flex gap-3 mb-4">
      <div className="shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mt-1 border border-primary/40">
        <Zap className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0 space-y-3">
        {/* Risk score header */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="text-[9px] font-black bg-primary/20 text-primary border-primary/30 px-1.5">⚡ PALANTIR</Badge>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold"
            style={{ background: `${riskColor}15`, borderColor: `${riskColor}40`, color: riskColor }}>
            RISK {d.riskScore}
            {d.riskDelta !== 0 && (
              <span>{d.riskDelta > 0 ? `▲+${d.riskDelta}` : `▼${d.riskDelta}`}</span>
            )}
          </div>
          {d.generatedModule && (
            <Badge className="text-[9px] bg-purple-500/20 text-purple-400 border-purple-500/30">
              📦 Module auto-généré
            </Badge>
          )}
        </div>

        {/* Main tutor response */}
        <div className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
          style={{ background: "#1A1D2E", borderLeft: "3px solid #5257D8" }}>
          {message.isLoading ? <ThinkingDots /> : message.content}
        </div>

        {/* Agent responses */}
        {d.agentResponses.length > 0 && (
          <div className="space-y-2">
            {d.agentResponses.filter(r => r.agent !== "tuteur").map((r) => {
              const cfg = AGENT_ICONS[r.agent] || AGENT_ICONS.tuteur;
              const Icon = cfg.icon;
              const isOpen = expanded === r.agent;
              return (
                <button key={r.agent} onClick={() => setExpanded(isOpen ? null : r.agent)}
                  className="w-full text-left rounded-xl border border-border/40 bg-card/40 hover:bg-card/60 transition-all overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <Icon className={`w-3.5 h-3.5 ${cfg.color} shrink-0`} />
                    <span className={`text-[11px] font-bold ${cfg.color}`}>{cfg.label}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{isOpen ? "▲" : "▼"}</span>
                  </div>
                  {isOpen && (
                    <div className="px-3 pb-3 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap border-t border-border/30 pt-2">
                      {r.content || "Analyse en cours..."}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Predictor alert */}
        {d.prediction && (d.prediction as { urgency?: string }).urgency === "high" && (
          <div className="flex items-start gap-2 p-3 rounded-xl border border-destructive/30 bg-destructive/5">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-bold text-destructive mb-0.5">⚡ Prédiction d'échec détectée</div>
              <div className="text-muted-foreground">{String((d.prediction as { prediction?: string }).prediction ?? "")}</div>
              {(d.prediction as { predicted_failure_hours?: number }).predicted_failure_hours && (
                <div className="text-destructive font-medium mt-1">
                  ⏰ Fenêtre critique : ~{(d.prediction as { predicted_failure_hours?: number }).predicted_failure_hours}h
                </div>
              )}
            </div>
          </div>
        )}

        {/* Module generated */}
        {d.generatedModule && (
          <div className="flex items-start gap-2 p-3 rounded-xl border border-purple-500/30 bg-purple-500/5">
            <span className="text-base">📦</span>
            <div className="text-xs">
              <div className="font-bold text-purple-400 mb-0.5">Module correctif auto-généré</div>
              <div className="text-foreground font-medium">{d.generatedModule.title}</div>
              <div className="text-muted-foreground mt-0.5">
                Domaine : {d.generatedModule.domain} · Confiance : {d.generatedModule.confidence}%
              </div>
            </div>
          </div>
        )}

        {/* Human Trainer Destroyer */}
        {d.humanComparison && (
          <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-black text-emerald-400 text-[11px]">FORMETOIALIA VS FORMATEUR HUMAIN MOYEN</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Temps réponse", jarvis: `${d.humanComparison.genie_response_ms}ms`, human: `${d.humanComparison.human_response_s}s` },
                { label: "Taux d'erreur", jarvis: "0%", human: `${d.humanComparison.human_error_rate}%` },
                { label: "Disponibilité", jarvis: "24/7", human: "8h-18h" },
                { label: "Coût / session", jarvis: "0.002€", human: `${d.humanComparison.human_cost_eur}€` },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-1.5">
                  <span className="text-muted-foreground text-[10px] w-20 shrink-0">{row.label}</span>
                  <span className="text-emerald-400 font-bold">{row.jarvis}</span>
                  <span className="text-muted-foreground/50 text-[10px] line-through">{row.human}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick actions */}
        {!message.isLoading && (
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((a) => (
              <button key={a.label} onClick={() => onQuickAction(a.prompt)}
                className="text-xs px-2.5 py-1 rounded-full border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
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
          Débloquer KITT IA illimité →
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
  if (message.isPalantir) return <PalantirBubble message={message} onQuickAction={onQuickAction} />;
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
  const { trackBrain } = useBrainTracker();

  const {
    state: brainState,
    runBrain,
    reset: resetBrain,
    togglePalantirMode,
  } = useGenieBrain(session?.user?.id ?? null);

  const firstName = profile?.full_name?.split(" ")[0] ?? "";
  const welcomeContent = isPanic
    ? "Dis-moi ce qui se passe, je vais t'aider à trouver une solution."
    : brainState.palantirMode
    ? `⚡ MODE PALANTIR ACTIVÉ ${firstName ? `— Bonjour ${firstName}` : ""}. Swarm de 5 agents IA opérationnel. Posez votre question pour déclencher l'analyse.`
    : firstName
    ? `Salut ${firstName} ! Qu'est-ce qu'on fait aujourd'hui ?`
    : `Salut ! Je suis Jarvis, ton copilote Formetoialia. Pose-moi n'importe quelle question, ou choisis un sujet ci-dessous.`;

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

  // ── Onboarding tour + quick start modal state ─────────────────────────────
  const [showTour, setShowTour] = useState(() => shouldShowTour());
  const [showQuickStart, setShowQuickStart] = useState(false);
  // Count user messages sent in normal (non-Palantir) mode
  const normalMsgCountRef = useRef(0);

  // Listen for prefill event from QuickStartModal demo prompts
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ text: string }>).detail;
      if (detail?.text) setInput(detail.text);
    };
    window.addEventListener("formetoialia:prefill_chat", handler);
    return () => window.removeEventListener("formetoialia:prefill_chat", handler);
  }, []);

  // Sync KITT state with brain phase
  useEffect(() => {
    if (brainState.phase === "swarming" || brainState.phase === "thinking") setKittState("thinking");
    else if (brainState.phase === "complete") setKittState("idle");
  }, [brainState.phase]);

  // Sync palantir brain results into last assistant message
  useEffect(() => {
    if (brainState.phase === "complete" && brainState.finalContent) {
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.isPalantir && last.isLoading) {
          return prev.map((m, i) => i === prev.length - 1 ? {
            ...m,
            isLoading: false,
            content: brainState.finalContent,
            palantirData: {
              riskScore: brainState.riskScore,
              riskDelta: brainState.riskDelta,
              agentResponses: brainState.agentResponses,
              prediction: brainState.prediction as unknown as Record<string, unknown> | null,
              humanComparison: brainState.humanComparison,
              generatedModule: brainState.generatedModule,
            },
          } : m);
        }
        return prev;
      });
      // Track swarm completion with real latency from human_comparison
      const latencyMs = brainState.humanComparison?.genie_response_ms ?? undefined;
      trackBrain("swarm_completed", {
        session_id: sessionId,
        risk_score: brainState.riskScore,
        agents_used: brainState.activeAgents,
        latency_ms: latencyMs,
        metadata: { risk_delta: brainState.riskDelta, agents_count: brainState.activeAgents.length },
      });
      if (brainState.humanComparison) {
        trackBrain("destroyer_shown", {
          session_id: sessionId,
          risk_score: brainState.riskScore,
          latency_ms: latencyMs,
          metadata: { genie_ms: brainState.humanComparison.genie_response_ms },
        });
      }
      if (brainState.generatedModule) {
        trackBrain("module_accepted", {
          session_id: sessionId,
          metadata: { title: brainState.generatedModule.title, domain: brainState.generatedModule.domain },
        });
      }
      if (brainState.prediction) {
        trackBrain("prediction_displayed", {
          session_id: sessionId,
          risk_score: brainState.riskScore,
          metadata: { urgency: (brainState.prediction as { urgency?: string }).urgency },
        });
      }
      setIsLoading(false);
    }
    if (brainState.phase === "error") {
      setMessages(prev => prev.map((m, i) => i === prev.length - 1 && m.isPalantir
        ? { ...m, isLoading: false, content: `❌ Erreur swarm : ${brainState.error}` } : m));
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brainState.phase, brainState.finalContent]);

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
  const brainStateRef = useRef(brainState);
  brainStateRef.current = brainState;

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

    // ── Auto-nudge: after 2nd normal message, show QuickStart modal ──────────
    if (!brainStateRef.current.palantirMode) {
      normalMsgCountRef.current += 1;
      if (normalMsgCountRef.current === 2 && shouldShowQuickStart()) {
        // Show after response is rendered — 1s delay
        setTimeout(() => setShowQuickStart(true), 1200);
      }
    }

    // ── PALANTIR MODE: use brain-orchestrator ────────────────────────
    if (brainStateRef.current.palantirMode) {
      const loadingPalantirMsg: Message = {
        id: "palantir-loading",
        role: "assistant",
        content: "",
        isLoading: true,
        isPalantir: true,
        palantirData: { riskScore: brainStateRef.current.riskScore, riskDelta: 0, agentResponses: [] },
      };
      setMessages(prev => [...prev, loadingPalantirMsg]);

      // Track Brain message
      trackBrain("brain_message_sent", {
        session_id: sessionId,
        risk_score: brainStateRef.current.riskScore,
        agents_used: brainStateRef.current.activeAgents,
        metadata: { msg_length: text.length },
      });
      track("chat_sent", { mode: "palantir", session_id: sessionId });

      const apiMessages = [...messagesRef.current, userMsg]
        .filter(m => !m.isLoading)
        .slice(-20)
        .map(m => ({ role: m.role, content: m.content }));

      const p = profileRef.current;
      await runBrain(
        apiMessages,
        { persona: p?.persona ?? "", level: p?.level ?? 1, completed_modules: kittContext?.completed_modules ?? 0 },
        sessionId,
        true,
        brainStateRef.current.activeAgents
      );
      return;
    }

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
  }, [input, isLoading, sessionId, speak, kittContext, runBrain]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleReset = () => {
    stopSpeaking();
    setKittState("idle");
    resetBrain();
    setMessages([{ id: "welcome", role: "assistant", content: "Nouvelle conversation démarrée. ✨" }]);
  };

  const handleMicPress = () => { if (isListening) stopListening(); else startListening(); };
  const showSuggestions = messages.length === 1 && messages[0].id === "welcome";

  return (
    <>
      <Helmet><title>Chat IA — Formetoialia</title></Helmet>

      {/* ── Onboarding Tour (shown once, first visit) ── */}
      {showTour && (
        <PalantirOnboardingTour
          onComplete={() => setShowTour(false)}
          onActivatePalantir={() => {
            setShowTour(false);
            if (!brainState.palantirMode) togglePalantirMode();
          }}
        />
      )}

      {/* ── Quick Start Modal (after 2nd normal message) ── */}
      {showQuickStart && !showTour && !brainState.palantirMode && (
        <QuickStartModal
          sessionId={sessionId}
          onActivate={() => {
            setShowQuickStart(false);
            if (!brainState.palantirMode) togglePalantirMode();
          }}
          onDismiss={() => setShowQuickStart(false)}
        />
      )}

      <div className="flex flex-col h-full" style={{ background: "#0F1119" }}>
        {/* ── Header with KITT + Palantir toggle ── */}
        <div className="shrink-0 flex flex-col items-center pt-4 pb-2 gap-2">
          <KittVisualizer state={kittState} analyserNode={getAnalyser()} />

          {/* Palantir Mode toggle */}
          <button
            onClick={() => {
              const nextMode = !brainState.palantirMode;
              togglePalantirMode();
              if (brainState.palantirMode) resetBrain();
              trackBrain(nextMode ? "palantir_activated" : "palantir_deactivated", {
                session_id: sessionId,
                metadata: { persona: profile?.persona ?? null },
              });
              track(nextMode ? "kitt_activated" : "chat_sent", { mode: "palantir", action: nextMode ? "activate" : "deactivate" });
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-bold transition-all duration-300 ${
              brainState.palantirMode
                ? "bg-primary/20 border-primary/60 text-primary shadow-[0_0_16px_hsl(var(--primary)/0.5)]"
                : "bg-secondary/30 border-border/50 text-muted-foreground hover:border-primary/40 hover:text-primary"
            }`}
          >
            <Brain className={`w-3.5 h-3.5 ${brainState.palantirMode ? "animate-pulse" : ""}`} />
            {brainState.palantirMode ? "⚡ MODE PALANTIR ACTIF" : "Activer Mode Palantir"}
            {brainState.palantirMode && (
              <Badge className="text-[8px] px-1 py-0 bg-primary/30 text-primary border-0 ml-0.5">5 AGENTS</Badge>
            )}
          </button>

          {/* Swarm visualizer during active run */}
          {brainState.palantirMode && (
            <div className="w-full max-w-2xl px-4">
              <AgentSwarmVisualizer
                phase={brainState.phase}
                activeAgents={brainState.activeAgents as AgentType[]}
                agentResponses={brainState.agentResponses}
                riskScore={brainState.riskScore}
                riskDelta={brainState.riskDelta}
                palantirMode={brainState.palantirMode}
              />
            </div>
          )}
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
                  placeholder={brainState.palantirMode ? "⚡ Posez votre question — les 5 agents analysent en parallèle..." : placeholder}
                  className="min-h-[52px] max-h-36 resize-none text-base transition-all"
                  maxLength={8000}
                  style={{
                    background: brainState.palantirMode ? "rgba(82,87,216,0.08)" : "#1A1D2E",
                    border: brainState.palantirMode ? "1px solid rgba(82,87,216,0.6)" : "1px solid rgba(82,87,216,0.4)",
                    boxShadow: brainState.palantirMode ? "0 0 12px rgba(82,87,216,0.3)" : undefined,
                    color: "hsl(var(--foreground))",
                    fontSize: "16px",
                  }}
                  rows={1}
                  disabled={isLoading}
                />
              </div>
              {isPro ? (
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
              )}
              <Button onClick={() => sendMessage()} disabled={!input.trim() || isLoading}
                size="icon" className="shrink-0 min-h-[52px] min-w-[52px] h-[52px] w-[52px]"
                style={{
                  background: brainState.palantirMode ? "#5257D8" : "#FE2C40",
                  boxShadow: (!input.trim() || isLoading) ? undefined : brainState.palantirMode ? "0 0 16px rgba(82,87,216,0.6)" : "0 0 16px rgba(254,44,64,0.5)",
                  color: "#fff", border: "none",
                }}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-[10px] text-muted-foreground/50">
                {brainState.palantirMode ? "⚡ Swarm 5 agents · MITRE ATT&CK · Prédiction 24h" : "JARVIS peut faire des erreurs. Vérifiez les informations importantes."}
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
