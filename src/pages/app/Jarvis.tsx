import { useState, useRef, useCallback, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { SkillMapPanel } from "@/components/skills/SkillMapPanel";
import { NouveautesPanel } from "@/components/jarvis/NouveautesPanel";
import {
  Send, Loader2, Zap, CheckSquare, Square, AlertCircle,
  HelpCircle, Lightbulb, RefreshCw, Mic, Lock,
  GraduationCap, Leaf, ShieldAlert, FileText, Download,
  ClipboardCopy, Hammer, Clock, ChevronDown, ChevronUp,
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
  deep_dive?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ArtifactRecord {
  id: string;
  type: string;
  title: string;
  signed_url: string | null;
  created_at: string;
}

// Artifact Forge config
const FORGE_ARTIFACTS = [
  {
    type: "checklist",
    label: "Checklist",
    emoji: "✅",
    pages: "1 page",
    description: "Liste d'actions courtes. Imprime et coche.",
    punchline: "Parce qu'un cerveau, ça oublie.",
  },
  {
    type: "sop",
    label: "SOP Cyber",
    emoji: "🔐",
    pages: "3–6 pages",
    description: "Procédures de sécurité pour ton équipe.",
    punchline: "Mieux vaut prévenir que payer une rançon.",
  },
  {
    type: "charte",
    label: "Charte IA",
    emoji: "📜",
    pages: "3–6 pages",
    description: "Règles d'usage de l'IA dans l'organisation.",
    punchline: "Parce que l'IA sans règles, c'est le Far West.",
  },
  {
    type: "memo_vibe",
    label: "Mémo Vibe Coding",
    emoji: "⚡",
    pages: "1 page",
    description: "Checklist du dev IA-first. Simple et efficace.",
    punchline: "Code avec l'IA, pas contre elle.",
  },
] as const;

type ForgeType = (typeof FORGE_ARTIFACTS)[number]["type"];

// ─── Autopilot config ─────────────────────────────────────────────────────────
interface AutopilotStep {
  id: number;
  label: string;
  detail: string;
}

interface AutopilotSnippet {
  title: string;
  code: string;
  lang: string;
}

interface AutopilotPlan {
  title: string;
  intro: string;
  steps: AutopilotStep[];
  artifacts_to_generate: string[];
  snippets: AutopilotSnippet[];
  tips: string[];
  estimated_time: string;
  difficulty: string;
}

const AUTOPILOTS = [
  {
    id: "conformite_48h" as const,
    label: "Conformité en 48h",
    emoji: "⚖️",
    tagline: "Checklist + SOP + Charte IA",
    color: "text-primary border-primary/40 bg-primary/5",
    description: "Mise en conformité IA express pour ton organisation.",
  },
  {
    id: "vibe_coding_mvp" as const,
    label: "Vibe Coding MVP",
    emoji: "🚀",
    tagline: "Plan + Prompts + Mémo déploiement",
    color: "text-secondary border-secondary/40 bg-secondary/5",
    description: "Lance ton MVP IA-first en quelques heures.",
  },
  {
    id: "cyber_hygiene_tpe" as const,
    label: "Cyber Hygiène TPE",
    emoji: "🛡️",
    tagline: "Plan 7 jours + SOP incident + Checklist",
    color: "text-accent border-accent/40 bg-accent/5",
    description: "Sécurise ta petite entreprise, sans technicien.",
  },
] as const;

type AutopilotId = (typeof AUTOPILOTS)[number]["id"];

const EMPTY_PANEL: JarvisPanel = {
  kid_summary: "",
  action_plan: [],
  one_click_actions: [],
  confidence: 0,
  sources: [],
};

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

function triggerDownload(base64: string, filename: string) {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length).fill(0).map((_, i) => byteChars.charCodeAt(i));
  const blob = new Blob([new Uint8Array(byteNumbers)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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

const ACTION_MAP: Record<string, { icon: React.ElementType; label: string; className: string }> = {
  generate_pdf_checklist: { icon: FileText, label: "PDF", className: "text-primary border-primary/40 hover:bg-primary/10" },
  mini_quiz: { icon: HelpCircle, label: "Mini-quiz", className: "text-secondary border-secondary/40 hover:bg-secondary/10" },
  example: { icon: Lightbulb, label: "Exemple", className: "text-accent border-accent/40 hover:bg-accent/10" },
};

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

function SavingsBadge({ ecoForced = false }: { ecoForced?: boolean }) {
  if (ecoForced) {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 border border-destructive/30 text-[10px] text-destructive font-medium">
        <ShieldAlert className="w-2.5 h-2.5" />
        Éco forcé ⚠️
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/20 border border-accent/40 text-[10px] text-accent-foreground font-medium">
      <Leaf className="w-2.5 h-2.5" />
      Économiseur ✅
    </span>
  );
}

// ─── Artifact result card ─────────────────────────────────────────────────────
function ArtifactCard({
  type, title, signedUrl, base64, filename, attestationId,
  onDismiss,
}: {
  type: string;
  title: string;
  signedUrl: string | null;
  base64?: string;
  filename: string;
  attestationId?: string;
  onDismiss: () => void;
}) {
  const verifyUrl = attestationId
    ? `${window.location.origin}/verify/${attestationId}`
    : null;

  const handleDownload = () => {
    if (signedUrl) window.open(signedUrl, "_blank");
    else if (base64) triggerDownload(base64, filename);
  };

  const handleCopy = () => {
    const link = verifyUrl ?? signedUrl ?? "";
    if (!link) return;
    navigator.clipboard.writeText(link);
    toast({ title: "Lien copié !", description: link.slice(0, 60) + "…" });
  };

  const forge = FORGE_ARTIFACTS.find((f) => f.type === type);

  return (
    <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{forge?.emoji ?? "📄"}</span>
          <div>
            <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>
            <p className="text-[10px] text-muted-foreground">{forge?.pages}</p>
          </div>
        </div>
        <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground text-xs shrink-0">✕</button>
      </div>
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant="default" className="h-8 text-xs gap-1.5 gradient-primary shadow-glow" onClick={handleDownload}>
          <Download className="w-3.5 h-3.5" />
          Télécharger
        </Button>
        {(verifyUrl ?? signedUrl) && (
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={handleCopy}>
            <ClipboardCopy className="w-3.5 h-3.5" />
            Copier le lien
          </Button>
        )}
      </div>
      {verifyUrl && (
        <p className="text-[10px] text-muted-foreground truncate">
          🔍 Vérification : <span className="text-primary">{verifyUrl}</span>
        </p>
      )}
    </div>
  );
}

// ─── Artifact history item ────────────────────────────────────────────────────
function ArtifactHistoryItem({ artifact }: { artifact: ArtifactRecord }) {
  const forge = FORGE_ARTIFACTS.find((f) => f.type === artifact.type);
  const date = new Date(artifact.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  return (
    <div className="flex items-center gap-2 py-2 px-3 rounded-xl border border-border/40 bg-card/30 hover:bg-card/60 transition-all">
      <span className="text-base shrink-0">{forge?.emoji ?? "📄"}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{artifact.title}</p>
        <p className="text-[10px] text-muted-foreground">{date}</p>
      </div>
      {artifact.signed_url && (
        <a href={artifact.signed_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
          <Download className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors" />
        </a>
      )}
    </div>
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
  const [ecoMode, setEcoMode] = useState(false);

  // Artifact Forge state
  const [forgeLoading, setForgeLoading] = useState<ForgeType | null>(null);
  const [forgeResult, setForgeResult] = useState<{
    type: string; title: string; signedUrl: string | null;
    base64?: string; filename: string; attestationId?: string;
  } | null>(null);
  const [artifacts, setArtifacts] = useState<ArtifactRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Autopilot state
  const [autopilotLoading, setAutopilotLoading] = useState<AutopilotId | null>(null);
  const [autopilotPlan, setAutopilotPlan] = useState<AutopilotPlan | null>(null);
  const [activeAutopilotId, setActiveAutopilotId] = useState<AutopilotId | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const historyRef = useRef(history);
  historyRef.current = history;
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const expertRef = useRef(expertMode);
  expertRef.current = expertMode;

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load artifact history
  const loadArtifacts = useCallback(async () => {
    const { data } = await supabase
      .from("artifacts")
      .select("id, type, title, signed_url, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setArtifacts(data as ArtifactRecord[]);
  }, []);

  useEffect(() => {
    loadArtifacts();
  }, [loadArtifacts]);

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

  // ── Artifact Forge — Generate PDF ───────────────────────────────────────────
  const handleForge = useCallback(async (type: ForgeType) => {
    if (!isPro) { navigate("/pricing"); return; }
    if (forgeLoading) return;
    setForgeLoading(type);
    setForgeResult(null);

    const forge = FORGE_ARTIFACTS.find((f) => f.type === type)!;
    const p = profileRef.current;

    try {
      // memo_vibe uses checklist type under the hood (single page)
      const pdfType = type === "memo_vibe" ? "checklist" : type;

      const { data, error } = await supabase.functions.invoke("generate-pdf", {
        body: {
          type: pdfType,
          org_name: p?.full_name ? `${p.full_name}` : undefined,
          base_url: window.location.origin,
          artifact_title: forge.label,
          session_id: sessionId,
        },
      });

      if (error || !data?.success) throw new Error(data?.error ?? error?.message ?? "Erreur génération");

      setForgeResult({
        type,
        title: forge.label,
        signedUrl: data.signed_url ?? null,
        base64: data.pdf_base64,
        filename: data.filename,
        attestationId: data.attestation_id,
      });

      toast({ title: `${forge.emoji} ${forge.label} généré !`, description: forge.punchline });
      loadArtifacts();
    } catch (err) {
      toast({
        title: "Erreur génération",
        description: err instanceof Error ? err.message : "Réessaie.",
        variant: "destructive",
      });
    } finally {
      setForgeLoading(null);
    }
  }, [isPro, forgeLoading, sessionId, navigate, loadArtifacts]);

  // ── Autopilot — launch a program ─────────────────────────────────────────────
  const handleAutopilot = useCallback(async (id: AutopilotId) => {
    if (!isPro) { navigate("/pricing"); return; }
    if (autopilotLoading) return;
    setAutopilotLoading(id);
    setAutopilotPlan(null);
    setActiveAutopilotId(id);
    setCompletedSteps(new Set());
    setKittState("thinking");

    try {
      const p = profileRef.current;
      const { data, error } = await supabase.functions.invoke("chat-completion", {
        body: {
          messages: [{ role: "user", content: `Lance l'autopilot ${id} pour mon organisation.` }],
          user_profile: { persona: p?.persona ?? "", level: p?.level ?? 1, mode: "normal" },
          session_id: sessionId,
          request_type: "autopilot",
          autopilot_id: id,
          expert_mode: false,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const raw: string = data.content ?? "";
      const match = raw.match(/```json\s*([\s\S]*?)```/i) ?? raw.match(/```\s*([\s\S]*?)```/i);
      const jsonStr = match ? match[1] : raw;
      const parsed: AutopilotPlan = JSON.parse(jsonStr.trim());
      setAutopilotPlan(parsed);
      setKittState("idle");
      const ap = AUTOPILOTS.find((a) => a.id === id)!;
      toast({ title: `${ap.emoji} ${ap.label} lancé !`, description: parsed.intro });
    } catch (err) {
      toast({ title: "Erreur autopilot", description: err instanceof Error ? err.message : "Réessaie.", variant: "destructive" });
      setKittState("idle");
      setActiveAutopilotId(null);
    } finally {
      setAutopilotLoading(null);
    }
  }, [isPro, autopilotLoading, sessionId, navigate]);

  const handleCopySnippet = useCallback((code: string, title: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(title);
    toast({ title: "Snippet copié !", description: title });
    setTimeout(() => setCopiedSnippet(null), 2000);
  }, []);

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

        if (data?.security_refused) {
          toast({ title: "⚠️ Demande refusée", description: data.content, variant: "destructive" });
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
        if (data?.eco_mode) setEcoMode(true);
        if (voiceEnabled && isPro) speak(newPanel.kid_summary);
        else setKittState("idle");

        if (!isOneClick) setHistory((prev) => [...prev, { role: "assistant", content: rawContent }]);
      } catch (err) {
        toast({ title: "Erreur", description: err instanceof Error ? err.message : "Erreur inconnue", variant: "destructive" });
        setKittState("idle");
      } finally {
        setIsLoading(false);
        textareaRef.current?.focus();
      }
    },
    [input, isLoading, sessionId, speak, voiceEnabled, isPro],
  );

  // ── Stage 2 ──────────────────────────────────────────────────────────────────
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
    } catch {
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

        {/* ═══════════════════ LEFT — Chat + KITT ═══════════════════ */}
        <div className="flex flex-col w-full lg:w-[40%] lg:border-r border-border/40 overflow-hidden shrink-0">

          {/* Header */}
          <div className="shrink-0 px-4 py-2.5 border-b border-border/40 bg-card/20 flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-6 h-6 rounded-lg gradient-primary flex items-center justify-center shadow-glow shrink-0">
                <Zap className="w-3 h-3 text-primary-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground leading-none">Jarvis</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!expertMode && <SavingsBadge ecoForced={ecoMode} />}
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

        {/* ═══════════════════ RIGHT — Cockpit + Artifact Forge ═══════════════ */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-5 space-y-4">

          {/* ── Autopilots ────────────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-border/50 bg-card/40 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
              <Zap className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Autopilots</h3>
              <span className="ml-auto text-[10px] text-muted-foreground">1 clic → plan + docs</span>
            </div>

            {/* 3 autopilot buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3">
              {AUTOPILOTS.map((ap) => {
                const isRunning = autopilotLoading === ap.id;
                const isActive = activeAutopilotId === ap.id && autopilotPlan;
                return (
                  <button
                    key={ap.id}
                    onClick={() => handleAutopilot(ap.id)}
                    disabled={!!autopilotLoading}
                    className={`flex flex-col gap-1.5 p-3 rounded-xl border transition-all text-left group disabled:opacity-60 disabled:cursor-not-allowed ${
                      isActive
                        ? ap.color + " ring-1 ring-primary/30"
                        : `border-border/50 bg-background/40 hover:bg-card/80 hover:border-primary/40`
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">{ap.emoji}</span>
                      {isRunning && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />}
                      {isActive && !isRunning && <CheckSquare className="w-3.5 h-3.5 text-primary" />}
                    </div>
                    <p className="text-xs font-semibold text-foreground leading-tight">{ap.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{ap.tagline}</p>
                  </button>
                );
              })}
            </div>

            {/* Autopilot result panel */}
            {autopilotPlan && activeAutopilotId && (
              <div className="border-t border-border/30 px-4 pb-4 pt-3 space-y-4 animate-in fade-in slide-in-from-top-1">
                {/* Intro */}
                <div className="flex items-start gap-2">
                  <span className="text-xl shrink-0">{AUTOPILOTS.find((a) => a.id === activeAutopilotId)?.emoji}</span>
                  <div>
                    <p className="text-sm font-bold text-foreground">{autopilotPlan.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{autopilotPlan.intro}</p>
                  </div>
                  <div className="ml-auto shrink-0 text-right">
                    <p className="text-[10px] text-muted-foreground">{autopilotPlan.estimated_time}</p>
                    <p className="text-[10px] text-primary/70">{autopilotPlan.difficulty}</p>
                  </div>
                </div>

                {/* Steps */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">📋 Plan d'action</p>
                  {autopilotPlan.steps.map((step) => {
                    const done = completedSteps.has(step.id);
                    return (
                      <div
                        key={step.id}
                        onClick={() => setCompletedSteps((prev) => {
                          const next = new Set(prev);
                          done ? next.delete(step.id) : next.add(step.id);
                          return next;
                        })}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all select-none ${
                          done
                            ? "border-primary/20 bg-primary/5 opacity-60"
                            : "border-border/40 bg-background/30 hover:border-primary/30 hover:bg-card/60"
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {done
                            ? <CheckSquare className="w-4 h-4 text-primary" />
                            : <Square className="w-4 h-4 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium leading-tight ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {step.label}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{step.detail}</p>
                        </div>
                      </div>
                    );
                  })}
                  {/* Progress bar */}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1.5 rounded-full bg-border/40 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${(completedSteps.size / autopilotPlan.steps.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {completedSteps.size}/{autopilotPlan.steps.length}
                    </span>
                  </div>
                </div>

                {/* Snippets (vibe coding) */}
                {autopilotPlan.snippets.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">⚡ Snippets de prompts</p>
                    {autopilotPlan.snippets.map((snip) => (
                      <div key={snip.title} className="rounded-xl border border-border/40 bg-muted/30 overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
                          <p className="text-[11px] font-medium text-foreground">{snip.title}</p>
                          <button
                            onClick={() => handleCopySnippet(snip.code, snip.title)}
                            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                          >
                            {copiedSnippet === snip.title
                              ? <><CheckSquare className="w-3 h-3 text-primary" /> Copié !</>
                              : <><ClipboardCopy className="w-3 h-3" /> Copier</>}
                          </button>
                        </div>
                        <pre className="px-3 py-2.5 text-[10px] text-muted-foreground leading-relaxed whitespace-pre-wrap overflow-x-auto">
                          {snip.code}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tips */}
                {autopilotPlan.tips.length > 0 && (
                  <div className="rounded-xl border border-border/30 bg-muted/20 p-3 space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">💡 Conseils Jarvis</p>
                    {autopilotPlan.tips.map((tip, i) => (
                      <p key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                        <span className="shrink-0 mt-0.5 text-primary/60">→</span>
                        {tip}
                      </p>
                    ))}
                  </div>
                )}

                {/* Generate artifact buttons */}
                {autopilotPlan.artifacts_to_generate.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">📄 Générer les documents</p>
                    <div className="flex flex-wrap gap-2">
                      {autopilotPlan.artifacts_to_generate.map((artType) => {
                        const forge = FORGE_ARTIFACTS.find((f) => f.type === artType);
                        if (!forge) return null;
                        return (
                          <button
                            key={artType}
                            onClick={() => handleForge(artType as ForgeType)}
                            disabled={!!forgeLoading}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-primary/40 text-primary text-xs font-medium hover:bg-primary/5 transition-all disabled:opacity-50"
                          >
                            {forgeLoading === artType
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <FileText className="w-3.5 h-3.5" />}
                            {forge.emoji} {forge.label}
                          </button>
                        );
                      })}
                    </div>
                    {/* Show last forge result if relevant */}
                    {forgeResult && autopilotPlan.artifacts_to_generate.includes(forgeResult.type) && (
                      <ArtifactCard
                        type={forgeResult.type}
                        title={forgeResult.title}
                        signedUrl={forgeResult.signedUrl}
                        base64={forgeResult.base64}
                        filename={forgeResult.filename}
                        attestationId={forgeResult.attestationId}
                        onDismiss={() => setForgeResult(null)}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Artifact Forge ─────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-border/50 bg-card/40 overflow-hidden">
            {/* Section header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
              <Hammer className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Artifact Forge</h3>
              <span className="ml-auto text-[10px] text-muted-foreground">Génère en 1 clic</span>
            </div>

            {/* 4 buttons grid */}
            <div className="grid grid-cols-2 gap-2 p-3">
              {FORGE_ARTIFACTS.map((forge) => {
                const isGenerating = forgeLoading === forge.type;
                return (
                  <button
                    key={forge.type}
                    onClick={() => handleForge(forge.type)}
                    disabled={!!forgeLoading}
                    className="flex flex-col gap-1 p-3 rounded-xl border border-border/50 bg-background/40 hover:bg-card/80 hover:border-primary/40 transition-all text-left group disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg">{forge.emoji}</span>
                      {isGenerating
                        ? <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                        : <Download className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                      }
                    </div>
                    <p className="text-xs font-semibold text-foreground leading-tight">{forge.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{forge.pages}</p>
                    <p className="text-[10px] text-muted-foreground/60 italic leading-tight">{forge.punchline}</p>
                  </button>
                );
              })}
            </div>

            {/* Result card */}
            {forgeResult && (
              <div className="px-3 pb-3">
                <ArtifactCard
                  type={forgeResult.type}
                  title={forgeResult.title}
                  signedUrl={forgeResult.signedUrl}
                  base64={forgeResult.base64}
                  filename={forgeResult.filename}
                  attestationId={forgeResult.attestationId}
                  onDismiss={() => setForgeResult(null)}
                />
              </div>
            )}

            {/* History toggle */}
            {artifacts.length > 0 && (
              <div className="border-t border-border/30">
                <button
                  onClick={() => setShowHistory((v) => !v)}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Historique ({artifacts.length})</span>
                  {showHistory ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
                </button>
                {showHistory && (
                  <div className="px-3 pb-3 space-y-1.5">
                    {artifacts.map((a) => (
                      <ArtifactHistoryItem key={a.id} artifact={a} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Nouveautés (No source = no claim) ──────────────────────────── */}
          <div className="rounded-2xl border border-border/50 bg-card/40 overflow-hidden">
            <div className="px-4 py-4">
              <NouveautesPanel />
            </div>
          </div>

          {/* ── Carte Palantir ─────────────────────────────────────────────── */}
          <SkillMapPanel />

          {/* ── Cockpit panels ─────────────────────────────────────────────── */}
          {!hasResult ? (
            <div className="flex flex-col items-center justify-center gap-5 text-center max-w-sm mx-auto py-8">
              <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-glow opacity-70">
                <Zap className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Cockpit prêt</h2>
                <p className="text-sm text-muted-foreground mt-1">Pose ta première question — Jarvis remplit les 4 panneaux.</p>
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
            <div className="grid grid-cols-1 gap-3">

              {/* Panel 1 — Résumé enfant */}
              <div className="rounded-2xl border border-border/50 bg-card/40 p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">📖 Résumé simplifié</h3>
                  <button
                    onClick={handleExplainMore}
                    disabled={isDeepLoading || isLoading}
                    className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 border border-primary/30 rounded-full px-2.5 py-1 transition-all disabled:opacity-50 hover:bg-primary/5"
                  >
                    {isDeepLoading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RefreshCw className="w-2.5 h-2.5" />}
                    Explique plus
                  </button>
                </div>
                <p className="text-sm leading-relaxed text-foreground">{panel.kid_summary}</p>
                {panel.deep_dive && (
                  <div className="mt-3 pt-3 border-t border-border/30 space-y-1">
                    <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-wider">🔬 Approfondissement</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">{panel.deep_dive}</p>
                  </div>
                )}
              </div>

              {/* Panel 2 — Plan d'action */}
              {panel.action_plan.length > 0 && (
                <div className="rounded-2xl border border-border/50 bg-card/40 p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">🎯 Plan d'action</h3>
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
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">⚡ Actions rapides</h3>
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
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">🔍 Sources & confiance</h3>
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
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-destructive/80">
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
