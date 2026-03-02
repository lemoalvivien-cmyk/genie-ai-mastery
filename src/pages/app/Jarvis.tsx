import { useState, useRef, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import {
  Send, Loader2, Zap, CheckSquare, Square, AlertCircle,
  FileText, HelpCircle, Lightbulb, RefreshCw, Mic, Lock,
  GraduationCap, Leaf, ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import DOMPurify from "dompurify";
import KittVisualizer, { KittState } from "@/components/chat/KittVisualizer";
import { useVoiceEngine } from "@/hooks/useVoiceEngine";
import { useNavigate } from "react-router-dom";

// ─── Types ────────────────────────────────────────────────────────────────────
interface JarvisPanel {
  kid_summary: string;
  action_plan: string[];
  one_click_actions: string[];
  confidence: number;
  sources: string[];
  deep_dive?: string; // filled on stage 2 "Explique plus"
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const EMPTY_PANEL: JarvisPanel = {
  kid_summary: "",
  action_plan: [],
  one_click_actions: [],
  confidence: 0,
  sources: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sanitize(t: string) {
  return DOMPurify.sanitize(t, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}

function parseJarvisPanel(raw: string): JarvisPanel | null {
  const match = raw.match(/```json\s*([\s\S]*?)```/i) ?? raw.match(/```\s*([\s\S]*?)```/i);
  const jsonStr = match ? match[1] : raw;
  try {
    const parsed = JSON.parse(jsonStr.trim());
    if (parsed.kid_summary) return parsed as JarvisPanel;
  } catch {}
  return null;
}

// ─── Confidence ring ──────────────────────────────────────────────────────────
function ConfidenceRing({ value }: { value: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  const color = value >= 75 ? "hsl(142 76% 36%)" : value >= 50 ? "hsl(25 95% 53%)" : "hsl(0 84% 60%)";
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={72} height={72} className="shrink-0">
        <circle cx={36} cy={36} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={5} />
        <circle
          cx={36} cy={36} r={r} fill="none"
          stroke={color} strokeWidth={5}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
          fill={color} fontSize={15} fontWeight="bold"
        >
          {value}%
        </text>
      </svg>
      <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Confiance</span>
    </div>
  );
}

// ─── One-click action labels ───────────────────────────────────────────────────
const ACTION_MAP: Record<string, { icon: React.ElementType; label: string; className: string }> = {
  generate_pdf_checklist: { icon: FileText, label: "PDF", className: "text-primary border-primary/40 hover:bg-primary/10" },
  mini_quiz: { icon: HelpCircle, label: "Mini-quiz", className: "text-secondary border-secondary/40 hover:bg-secondary/10" },
  example: { icon: Lightbulb, label: "Exemple", className: "text-accent border-accent/40 hover:bg-accent/10" },
};

// ─── Expert toggle ─────────────────────────────────────────────────────────────
function ExpertToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all ${
        value
          ? "bg-primary/10 border-primary/40 text-primary"
          : "border-border/50 text-muted-foreground hover:border-border"
      }`}
      title={value ? "Mode Expert actif (modèle puissant)" : "Mode Standard — économique"}
    >
      <GraduationCap className="w-3 h-3" />
      {value ? "Expert" : "Standard"}
    </button>
  );
}

// ─── Savings badge ─────────────────────────────────────────────────────────────
function SavingsBadge() {
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
      <Leaf className="w-2.5 h-2.5" />
      Économiseur ✅
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Jarvis() {
  const { profile } = useAuth();
  const { data: sub } = useSubscription();
  const isPro = sub?.isActive ?? false;
  const navigate = useNavigate();

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDeepLoading, setIsDeepLoading] = useState(false);
  const [kittState, setKittState] = useState<KittState>("idle");
  const [panel, setPanel] = useState<JarvisPanel>(EMPTY_PANEL);
  const [hasResult, setHasResult] = useState(false);
  const [voiceEnabled] = useState(() => profile?.voice_enabled ?? true);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [expertMode, setExpertMode] = useState(false);

  const historyRef = useRef(history);
  historyRef.current = history;
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const expertRef = useRef(expertMode);
  expertRef.current = expertMode;

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { isListening, getAnalyser, startListening, stopListening, speak } =
    useVoiceEngine({
      onTranscript: (text, isFinal) => {
        if (isFinal) {
          setInput(text);
          setTimeout(() => sendQuery(text), 800);
        } else {
          setInput(text);
        }
      },
      onStateChange: setKittState,
      voiceEnabled,
    });

  // ── Stage 1: short structured JSON ──────────────────────────────────────────
  const sendQuery = useCallback(
    async (overrideText?: string, isOneClick = false) => {
      const raw = overrideText ?? input;
      const text = sanitize(raw);
      if (!text || isLoading) return;

      if (!isOneClick) setInput("");
      setIsLoading(true);
      setKittState("thinking");

      const userMsg: ChatMessage = { role: "user", content: text };
      if (!isOneClick) setHistory((prev) => [...prev, userMsg]);

      try {
        const apiMessages = [...historyRef.current, userMsg]
          .slice(-10)
          .map((m) => ({ role: m.role, content: m.content }));

        const p = profileRef.current;
        const { data, error } = await supabase.functions.invoke("chat-completion", {
          body: {
            messages: apiMessages,
            user_profile: {
              persona: p?.persona ?? "",
              level: p?.level ?? 1,
              mode: expertRef.current ? "expert" : (p?.preferred_mode ?? "normal"),
            },
            session_id: sessionId,
            request_type: "jarvis",
            jarvis_stage: "short",
            expert_mode: expertRef.current,
          },
        });

        if (error) throw error;
        if (data?.error) {
          toast({ title: "Limite atteinte", description: data.error, variant: "destructive" });
          throw new Error(data.error);
        }

        // Check for security refusal
        if (data?.security_refused) {
          toast({
            title: "⚠️ Demande refusée",
            description: data.content,
            variant: "destructive",
          });
          setKittState("idle");
          return;
        }

        const rawContent: string = data.content ?? "";
        const parsed = parseJarvisPanel(rawContent);

        const newPanel = parsed ?? {
          kid_summary: rawContent,
          action_plan: [],
          one_click_actions: [],
          confidence: 0,
          sources: [],
        };

        setPanel(newPanel);
        setHasResult(true);
        if (voiceEnabled && isPro) speak(newPanel.kid_summary);
        else setKittState("idle");

        if (!isOneClick) setHistory((prev) => [...prev, { role: "assistant", content: rawContent }]);
      } catch (err) {
        toast({
          title: "Erreur",
          description: err instanceof Error ? err.message : "Erreur inconnue",
          variant: "destructive",
        });
        setKittState("idle");
      } finally {
        setIsLoading(false);
        textareaRef.current?.focus();
      }
    },
    [input, isLoading, sessionId, speak, voiceEnabled, isPro],
  );

  // ── Stage 2: deep dive (only on demand) ─────────────────────────────────────
  const handleExplainMore = useCallback(async () => {
    if (!panel.kid_summary || isDeepLoading) return;
    setIsDeepLoading(true);
    setKittState("thinking");
    try {
      const p = profileRef.current;
      const { data, error } = await supabase.functions.invoke("chat-completion", {
        body: {
          messages: [
            ...historyRef.current.slice(-6).map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: "Explique-moi ça plus en détail, avec des exemples concrets et des analogies simples." },
          ],
          user_profile: {
            persona: p?.persona ?? "",
            level: p?.level ?? 1,
            mode: expertRef.current ? "expert" : (p?.preferred_mode ?? "normal"),
          },
          session_id: sessionId,
          request_type: "jarvis",
          jarvis_stage: "long",
          expert_mode: expertRef.current,
        },
      });
      if (error) throw error;
      const deepContent = data?.content ?? "";
      setPanel((prev) => ({ ...prev, deep_dive: deepContent }));
      setKittState("idle");
    } catch (err) {
      toast({ title: "Erreur", description: "Impossible d'approfondir.", variant: "destructive" });
      setKittState("idle");
    } finally {
      setIsDeepLoading(false);
    }
  }, [panel.kid_summary, isDeepLoading, sessionId]);

  const handleOneClickAction = (action: string) => {
    const prompts: Record<string, string> = {
      generate_pdf_checklist: "Génère une checklist PDF à partir du plan d'action.",
      mini_quiz: "Fais-moi un mini-quiz rapide sur ce sujet (3 questions max).",
      example: "Donne-moi un exemple concret simple, comme si je n'y connaissais rien.",
    };
    const p = prompts[action];
    if (p) sendQuery(p, true);
  };

  return (
    <>
      <Helmet><title>Jarvis Cockpit – GENIE IA</title></Helmet>

      <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-background">

        {/* ════════════════════════ LEFT — Chat + KITT ═══════════════════════ */}
        <div className="flex flex-col w-full lg:w-[40%] lg:border-r border-border/40 overflow-hidden shrink-0">

          {/* Header */}
          <div className="shrink-0 px-4 py-2.5 border-b border-border/40 bg-card/20 flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-6 h-6 rounded-lg gradient-primary flex items-center justify-center shadow-glow shrink-0">
                <Zap className="w-3 h-3 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground leading-none">Jarvis</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!expertMode && <SavingsBadge />}
              <ExpertToggle value={expertMode} onChange={setExpertMode} />
            </div>
          </div>

          {/* KITT Visualizer */}
          <div className="shrink-0 flex justify-center pt-3 pb-1">
            <KittVisualizer state={kittState} analyserNode={getAnalyser()} />
          </div>

          {/* Conversation history */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  👋 Salut ! Pose-moi n'importe quelle question. Je vais tout analyser pour toi et remplir le cockpit à droite.
                </p>
                <p className="text-xs text-muted-foreground/60">
                  {expertMode
                    ? "Mode Expert actif — réponses techniques approfondies."
                    : "Mode Standard — réponses courtes, claires, économiques."}
                </p>
              </div>
            ) : (
              history.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted/60 border border-border/40 rounded-tl-sm text-foreground"
                    }`}
                  >
                    {m.role === "assistant" ? "✅ Cockpit mis à jour !" : m.content}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-border/40 bg-background/80 backdrop-blur-sm px-4 py-3">
            <div className="flex gap-2 items-end">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendQuery();
                  }
                }}
                placeholder="Ex: Comment sécuriser mon Wi-Fi ?"
                className="min-h-[44px] max-h-28 resize-none text-sm"
                rows={1}
                disabled={isLoading}
              />
              {isPro ? (
                <Button
                  variant="outline"
                  size="icon"
                  className={`shrink-0 h-11 w-11 transition-all relative ${
                    isListening ? "border-primary text-primary bg-primary/10" : "text-muted-foreground"
                  }`}
                  onClick={() => (isListening ? stopListening() : startListening())}
                  aria-label={isListening ? "Arrêter" : "Parler"}
                >
                  <Mic className="w-4 h-4" />
                  {isListening && (
                    <span className="absolute inset-0 rounded-md border border-primary opacity-40 animate-ping" />
                  )}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 h-11 w-11 text-muted-foreground opacity-50"
                  onClick={() => navigate("/pricing")}
                  title="Voix disponible avec GENIE Pro"
                >
                  <Lock className="w-4 h-4" />
                </Button>
              )}
              <Button
                onClick={() => sendQuery()}
                disabled={!input.trim() || isLoading}
                className="shrink-0 h-11 w-11 gradient-primary shadow-glow"
                size="icon"
                aria-label="Envoyer"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* ════════════════════════ RIGHT — Cockpit Panels ══════════════════ */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-5">
          {!hasResult ? (
            // ── Empty state with suggestions ──────────────────────────────────
            <div className="h-full flex flex-col items-center justify-center gap-5 text-center max-w-sm mx-auto">
              <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-glow opacity-70">
                <Zap className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Cockpit prêt</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Pose ta première question — Jarvis remplit les 4 panneaux.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full">
                {[
                  "Comment sécuriser mon Wi-Fi ?",
                  "C'est quoi le phishing ?",
                  "Comment utiliser l'IA au travail ?",
                  "Expliquer le chiffrement simplement",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => sendQuery(q)}
                    className="text-xs px-3 py-2.5 rounded-xl border border-border/60 bg-card/40 hover:bg-card/80 hover:border-primary/40 text-muted-foreground hover:text-foreground transition-all text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 max-w-3xl mx-auto lg:max-w-none">

              {/* Panel 1 — Résumé enfant */}
              <div className="rounded-2xl border border-border/50 bg-card/40 p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    📖 Résumé simplifié
                  </h3>
                  <button
                    onClick={handleExplainMore}
                    disabled={isDeepLoading || isLoading}
                    className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 border border-primary/30 rounded-full px-2.5 py-1 transition-all disabled:opacity-50 hover:bg-primary/5"
                  >
                    {isDeepLoading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RefreshCw className="w-2.5 h-2.5" />}
                    Explique plus
                  </button>
                </div>
                <p className="text-sm leading-relaxed text-foreground">
                  {panel.kid_summary}
                </p>
                {/* Stage 2 deep dive (only when loaded) */}
                {panel.deep_dive && (
                  <div className="mt-3 pt-3 border-t border-border/30 space-y-1">
                    <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-wider">
                      🔬 Approfondissement
                    </p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {panel.deep_dive}
                    </p>
                  </div>
                )}
              </div>

              {/* Panel 2 — Plan d'action */}
              {panel.action_plan.length > 0 && (
                <div className="rounded-2xl border border-border/50 bg-card/40 p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    🎯 Plan d'action
                  </h3>
                  <ol className="space-y-2">
                    {panel.action_plan.map((step, i) => (
                      <ActionStep key={`${step}-${i}`} index={i} text={step} />
                    ))}
                  </ol>
                </div>
              )}

              {/* Panel 3 — Actions 1 clic */}
              {panel.one_click_actions.length > 0 && (
                <div className="rounded-2xl border border-border/50 bg-card/40 p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    ⚡ Actions rapides
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {panel.one_click_actions.map((action) => {
                      const meta = ACTION_MAP[action];
                      if (!meta) return null;
                      const Icon = meta.icon;
                      return (
                        <button
                          key={action}
                          onClick={() => handleOneClickAction(action)}
                          disabled={isLoading}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all disabled:opacity-50 ${meta.className}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Panel 4 — Sources + confiance */}
              <div className="rounded-2xl border border-border/50 bg-card/40 p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  🔍 Sources & confiance
                </h3>
                <div className="flex items-start gap-4">
                  <ConfidenceRing value={panel.confidence} />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {panel.sources.length > 0 ? (
                      panel.sources.map((src, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <AlertCircle className="w-3 h-3 mt-0.5 shrink-0 text-primary/60" />
                          <span className="leading-relaxed">{src}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Connaissance générale — vérifie avec un expert.</p>
                    )}
                    {panel.confidence < 60 && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-500 dark:text-amber-400">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                        Score de confiance bas — consulte un professionnel.
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Checkable step ───────────────────────────────────────────────────────────
function ActionStep({ index, text }: { index: number; text: string }) {
  const [done, setDone] = useState(false);
  return (
    <li
      className={`flex items-start gap-2.5 text-sm cursor-pointer group transition-opacity ${done ? "opacity-50" : ""}`}
      onClick={() => setDone((d) => !d)}
    >
      <div className="mt-0.5 shrink-0 text-primary">
        {done
          ? <CheckSquare className="w-4 h-4" />
          : <Square className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />}
      </div>
      <span className={`leading-relaxed ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
        <span className="font-medium text-primary/70 mr-1">{index + 1}.</span>
        {text}
      </span>
    </li>
  );
}
