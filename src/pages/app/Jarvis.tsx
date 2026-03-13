import { useState, useRef, useCallback, useEffect } from "react";
import { useKITTContext } from "@/hooks/useKITTContext";
import { Helmet } from "react-helmet-async";
import {
  Send, Loader2, Mic, MicOff, Zap, GraduationCap, Leaf,
  ShieldAlert, LayoutGrid, MessageSquare, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { PaywallOverlay } from "@/components/PaywallOverlay";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import DOMPurify from "dompurify";
import KittVisualizer, { KittState } from "@/components/chat/KittVisualizer";
import { useVoiceEngine } from "@/hooks/useVoiceEngine";
import CockpitPanel from "@/components/jarvis/CockpitPanel";
import { ELI10Button } from "@/components/jarvis/ELI10Button";
import { CopilotDock } from "@/components/jarvis/CopilotDock";
import { useCopilot, parseJarvisResponse } from "@/hooks/useCopilot";

// ─── Types ────────────────────────────────────────────────────────────────────
type JarvisAction = "attack" | "motivate" | "generate_exercise" | "sleepforge" | "quiz" | "explain" | "synthesis" | "remediate";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  action?: JarvisAction;
}

interface ActionSuggestion {
  label: string;
  prompt: string;
  emoji: string;
}

function sanitize(t: string) {
  return DOMPurify.sanitize(t, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}

// ─── Action badge config ──────────────────────────────────────────────────────
const ACTION_BADGES: Record<JarvisAction, { emoji: string; label: string; color: string }> = {
  attack:            { emoji: "⚔️", label: "Simulation",     color: "bg-red-500/20 text-red-400 border-red-500/30" },
  motivate:          { emoji: "🚀", label: "Boost Stark",    color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  generate_exercise: { emoji: "🎯", label: "Exercice live",  color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
  sleepforge:        { emoji: "🌙", label: "SleepForge",     color: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
  quiz:              { emoji: "🧠", label: "Quiz",           color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  explain:           { emoji: "💡", label: "Explication",    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  synthesis:         { emoji: "📊", label: "Bilan",          color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  remediate:         { emoji: "🛠️", label: "Remédiation",   color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
};

// ─── Persona-driven quick actions ─────────────────────────────────────────────
function getPersonaActions(persona: string | null | undefined, mode: "senior" | "pro"): ActionSuggestion[] {
  const base: Record<string, ActionSuggestion[]> = {
    dirigeant: [
      { emoji: "⚖️", label: "Conformité IA", prompt: "Quelles règles IA dois-je mettre en place dans mon entreprise ?" },
      { emoji: "🛡️", label: "Audit cyber", prompt: "Quels sont les 3 risques cyber prioritaires pour mon organisation ?" },
      { emoji: "🤖", label: "IA pour mon équipe", prompt: "Comment former mon équipe à utiliser l'IA de façon responsable ?" },
    ],
    salarie: [
      { emoji: "⏱️", label: "Gagner du temps", prompt: "Quelle tâche répétitive puis-je automatiser avec l'IA aujourd'hui ?" },
      { emoji: "📧", label: "Emails plus vite", prompt: "Comment utiliser l'IA pour écrire mes emails plus rapidement ?" },
      { emoji: "🔐", label: "Sécurité perso", prompt: "Comment sécuriser mes comptes pro et perso en 30 minutes ?" },
    ],
    jeune: [
      { emoji: "⚡", label: "Coder avec l'IA", prompt: "Comment créer une app simple avec Lovable aujourd'hui ?" },
      { emoji: "🎮", label: "IA & gaming", prompt: "Comment utiliser l'IA pour améliorer mes projets créatifs ?" },
      { emoji: "📱", label: "Sécurité mobile", prompt: "Mon téléphone est-il bien sécurisé ? Comment le vérifier ?" },
    ],
    parent: [
      { emoji: "👶", label: "IA pour les enfants", prompt: "Comment utiliser l'IA de façon sécurisée avec mes enfants ?" },
      { emoji: "🛡️", label: "Protéger ma famille", prompt: "Comment protéger ma famille en ligne, simplement ?" },
      { emoji: "💡", label: "Simplifier le quotidien", prompt: "Comment l'IA peut m'aider à gérer le quotidien familial ?" },
    ],
    senior: [
      { emoji: "🔒", label: "Éviter les arnaques", prompt: "Comment reconnaître et éviter les arnaques en ligne ?" },
      { emoji: "💊", label: "Santé & IA", prompt: "Comment utiliser l'IA pour mieux comprendre les informations de santé ?" },
      { emoji: "📞", label: "Rester en contact", prompt: "Comment utiliser les outils numériques pour rester en contact avec ma famille ?" },
    ],
    independant: [
      { emoji: "🚀", label: "Booster mon activité", prompt: "Comment l'IA peut augmenter ma productivité en tant qu'indépendant ?" },
      { emoji: "📊", label: "Automatiser", prompt: "Quelles tâches administratives puis-je automatiser avec l'IA ?" },
      { emoji: "🛡️", label: "Sécuriser mon activité", prompt: "Comment sécuriser mes outils et données professionnelles ?" },
    ],
  };

  const actions = (persona && base[persona]) ? base[persona] : [
    { emoji: "🤖", label: "Qu'est-ce que l'IA ?", prompt: "Explique-moi l'intelligence artificielle simplement." },
    { emoji: "🛡️", label: "Cybersécurité de base", prompt: "Quels sont les gestes de base pour ma sécurité en ligne ?" },
    { emoji: "⚡", label: "Commencer", prompt: "Par où commencer pour apprendre l'IA et la cybersécurité ?" },
  ];

  return mode === "senior" ? [actions[0]] : actions;
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  const badge = !isUser && msg.action ? ACTION_BADGES[msg.action] : null;
  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-1`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center shrink-0 shadow-glow mt-0.5">
          <Zap className="w-4 h-4 text-primary-foreground" />
        </div>
      )}
      <div className="max-w-[85%] space-y-2">
        {/* Action badge — shown above assistant messages */}
        {badge && (
          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${badge.color}`}>
            <span>{badge.emoji}</span>
            <span>{badge.label}</span>
          </div>
        )}
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-card border border-border/50 text-foreground rounded-bl-sm shadow-card"
        }`}>
          {msg.content}
        </div>
        {/* ELI10 button for assistant messages */}
        {!isUser && msg.content.length > 50 && (
          <ELI10Button text={msg.content} className="ml-1" />
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Jarvis() {
  const { profile } = useAuth();
  const { data: sub } = useSubscription();
  const isPro = sub?.isActive ?? false;
  const { data: kittContext } = useKITTContext();

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [kittState, setKittState] = useState<KittState>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [expertMode, setExpertMode] = useState(false);
  const [ecoMode] = useState(false);
  const [showCockpit, setShowCockpit] = useState(false);
  const [showDock, setShowDock] = useState(false);

  const copilot = useCopilot();

  const voiceEnabled = profile?.voice_enabled ?? true;
  const persona = profile?.persona ?? null;
  const mode = persona === "senior" || persona === "parent" ? "senior" : "pro";
  const suggestions = getPersonaActions(persona, mode);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef(messages);
  historyRef.current = messages;

  const { isListening, getAnalyser, startListening, stopListening, speak, ttsQuotaExceeded } = useVoiceEngine({
    onTranscript: (text, isFinal) => {
      if (isFinal) {
        setInput(text);
        setTimeout(() => sendMessage(text), 600);
      } else {
        setInput(text);
      }
    },
    onStateChange: setKittState,
    onQuotaExceeded: () => {
      toast({
        title: "🔇 Mode lecture activé",
        description: "Quota voix atteint ce mois. KITT IA continue en texte + voix navigateur.",
      });
    },
    voiceEnabled,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Welcome message — Jarvis persona (Tony Stark + Deadpool light)
  useEffect(() => {
    const firstName = profile?.full_name?.split(" ")[0] ?? "vous";
    const greetings: Record<string, string> = {
      senior: `Salut ${firstName} ! 😊 Je suis JARVIS, votre copilote IA personnel. Pas de panique, pas de jargon. Je suis là et je suis patient. Qu'est-ce qu'on fait aujourd'hui ?`,
      parent: `Hey ${firstName} ! 👋 JARVIS en ligne. Je m'occupe de vous et de votre famille. Moins de stress numérique, plus de sécurité. Par quoi on commence ?`,
      jeune: `Yo ${firstName} ! ⚡ JARVIS ici. Ton formateur IA façon Tony Stark, sans le costume (dommage). On code, on apprend, on détruit les hackers. C'est parti !`,
      dirigeant: `Bonjour ${firstName}. JARVIS opérationnel. Votre formateur humain dort probablement sur ses slides PowerPoint — moi non. Quel défi tactique on résout aujourd'hui ?`,
      independant: `Salut ${firstName} ! 🚀 JARVIS connecté. Dis-moi ce qui te vole du temps — je vais l'automatiser avant que tu finisses ta phrase. Prêt ?`,
      salarie: `Bonjour ${firstName} ! 🤖 JARVIS à votre service. Votre formateur habituel ? Il lit encore ses notes. Moi, j'ai déjà analysé votre profil. On y va ?`,
    };
    const welcome = (persona && greetings[persona]) ?? `Salut ${firstName} ! ⚡ JARVIS en ligne — votre copilote IA façon Tony Stark. Phishing, IA, cybersécurité, vibe coding… Demandez, je livre. Par quoi on commence ?`;
    setMessages([{ id: "welcome", role: "assistant", content: welcome }]);

    if (voiceEnabled) {
      setTimeout(() => speak(welcome), 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const sendMessage = useCallback(async (text?: string) => {
    const userText = sanitize(text ?? input).trim();
    if (!userText || isLoading) return;

    // Passe D/G : longueur max + protection iOS zoom
    if (userText.length > 8000) {
      toast({ title: "Message trop long", description: "Maximum 8000 caractères.", variant: "destructive" });
      return;
    }

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: userText };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setKittState("thinking");

    // Passe D : AbortController 30s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const { data, error } = await supabase.functions.invoke("chat-completion", {
        body: {
          messages: [
            ...historyRef.current.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: userText },
          ],
          user_profile: {
            persona: profile?.persona ?? "",
            level: profile?.level ?? 1,
            mode: expertMode ? "expert" : (persona === "senior" || persona === "parent" ? "enfant" : "normal"),
          },
          kitt_context: kittContext ?? null,
          session_id: sessionId,
          request_type: "jarvis_chat",
          expert_mode: expertMode,
          eco_mode: ecoMode,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const raw: string = data?.content ?? "Je n'ai pas pu générer une réponse. Réessaie !";
      const parsed = parseJarvisResponse(raw);
      const displayContent = parsed.message || raw;

      // Extract Jarvis action and tts_text from parsed JSON
      let jarvisAction: JarvisAction | undefined;
      let ttsText: string | undefined;
      try {
        const rawObj = JSON.parse(raw.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] ?? raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
        if (rawObj?.action) jarvisAction = rawObj.action as JarvisAction;
        if (rawObj?.tts_text) ttsText = rawObj.tts_text;
      } catch { /* use defaults */ }

      const assistantMsg: ChatMessage = { id: crypto.randomUUID(), role: "assistant", content: displayContent, action: jarvisAction };
      setMessages(prev => [...prev, assistantMsg]);

      if (parsed.plan.length > 0 || parsed.immediate_action) {
        copilot.applyResponse(parsed);
        setShowDock(true);
      }

      setKittState("speaking");
      // Prefer tts_text (clean, no markdown) for voice; fallback to display content
      if (voiceEnabled) speak((ttsText || displayContent).slice(0, 250));
    } catch (err) {
      const isAbort = err instanceof Error && err.name === "AbortError";
      toast({
        title: isAbort ? "Timeout" : "Erreur",
        description: isAbort
          ? "La requête a pris trop de temps. Vérifiez votre connexion."
          : err instanceof Error ? err.message : "Problème de connexion.",
        variant: "destructive",
      });
      setKittState("idle");
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }, [input, isLoading, profile, persona, expertMode, ecoMode, sessionId, voiceEnabled, speak, copilot]);


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearHistory = () => {
    const firstName = profile?.full_name?.split(" ")[0] ?? "toi";
    setMessages([{ id: "reset", role: "assistant", content: `C'est reparti, ${firstName} ! 😊 Nouvelle conversation. Que puis-je faire pour toi ?` }]);
  };

  // ── Hard paywall: free users cannot access KITT ─────────────────────────────
  if (!isPro) {
    return (
      <>
        <Helmet>
          <title>KITT IA — Copilote Pro | GENIE IA</title>
        </Helmet>
        <div className="flex min-h-full items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <PaywallOverlay
              feature="KITT IA — Copilote Vocal"
              description="Posez vos questions en voix et texte. Formé sur l'IA, la cybersécurité, la conformité AI Act."
            >
              {/* Blurred preview */}
              <div className="rounded-2xl border border-border/40 bg-card/60 p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-primary" />
                  <div className="h-3 bg-muted rounded w-32" />
                </div>
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-5/6" />
              </div>
            </PaywallOverlay>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>KITT IA — Votre copilote intelligent | GENIE IA</title>
        <meta name="description" content="KITT IA : votre copilote intelligent. Guide, coaching, missions du jour et cockpit de progression." />
      </Helmet>

      <div className="flex h-full overflow-hidden">

        {/* ── LEFT: Chat ─────────────────────────────────────────────────── */}
        <div className={`flex flex-col ${showCockpit ? "hidden lg:flex lg:flex-1" : "flex-1"} min-w-0 border-r border-border/30`}>

          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border/40 bg-card/30 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center shadow-glow">
                <Zap className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">JARVIS</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">En ligne</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Tony Stark IA · Formateur humain obsolète remplacé · 24/7</p>
              </div>
            </div>


            <div className="flex items-center gap-2">
              {/* Mode toggle */}
              <button
                onClick={() => setExpertMode(v => !v)}
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all ${
                  expertMode
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "border-border/50 text-muted-foreground hover:border-border"
                }`}
              >
                <GraduationCap className="w-3 h-3" />
                {expertMode ? "Expert" : "Standard"}
              </button>

              {/* Clear */}
              <button onClick={clearHistory} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors" title="Nouvelle conversation">
                <RefreshCw className="w-4 h-4" />
              </button>

              {/* Cockpit toggle (mobile) */}
              <button
                onClick={() => setShowCockpit(true)}
                className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                title="Voir le Cockpit"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* KITT Visualizer */}
          <div className="shrink-0 flex justify-center py-3 px-4 border-b border-border/20 bg-background/40">
            <KittVisualizer state={kittState} analyserNode={getAnalyser()} />
          </div>

          {/* Suggestions */}
          {messages.length <= 1 && (
            <div className="shrink-0 px-4 py-3 border-b border-border/20">
              <p className="text-xs text-muted-foreground mb-2">
                {mode === "senior" ? "👉 Je te suggère cette action :" : "⚡ Actions rapides :"}
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s.prompt)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/50 bg-card/60 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
                  >
                    <span>{s.emoji}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            {isLoading && (
              <div className="flex gap-3 items-start animate-in fade-in">
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center shrink-0 shadow-glow mt-0.5">
                  <Zap className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-card border border-border/50 rounded-bl-sm shadow-card">
                  <div className="flex gap-1.5 items-center">
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="shrink-0 border-t border-border/40 px-4 py-3 bg-card/30 backdrop-blur-sm">
            <div className="flex items-end gap-2">
              {/* Voice button */}
              {voiceEnabled && (
                <button
                  onMouseDown={startListening}
                  onMouseUp={stopListening}
                  onTouchStart={startListening}
                  onTouchEnd={stopListening}
                  className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all relative ${
                    isListening
                      ? "bg-destructive text-destructive-foreground shadow-[0_0_12px_hsl(var(--destructive)/0.4)]"
                      : ttsQuotaExceeded
                      ? "bg-muted/50 text-muted-foreground/50"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                  title={ttsQuotaExceeded ? "Mode lecture (quota voix atteint)" : "Maintenir pour parler"}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={mode === "senior" ? "Pose-moi ta question ici…" : "Pose une question ou décris ton problème…"}
                  rows={1}
                  className="min-h-[44px] max-h-[120px] resize-none rounded-xl bg-background border-border/60 focus-visible:ring-primary pr-10"
                  style={{ fontSize: "16px" }}
                  maxLength={8000}
                  disabled={isLoading}
                />
              </div>

              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="shrink-0 w-10 h-10 rounded-xl gradient-primary shadow-glow"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>

            {/* Footer badges */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Leaf className="w-3 h-3 text-emerald-400" />
                Mode économe actif
              </span>
              {!isPro && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <ShieldAlert className="w-3 h-3 text-amber-400" />
                  Plan gratuit · 3 msg/h
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Copilot Dock / Cockpit ───────────────────────────── */}
        <div className={`${showCockpit ? "flex flex-col flex-1" : "hidden"} lg:flex lg:flex-col lg:w-[340px] xl:w-[380px] shrink-0 bg-card/20`}>
          {/* Tab bar */}
          <div className="shrink-0 flex items-center border-b border-border/40">
            <button
              onClick={() => setShowDock(false)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors border-b-2 ${
                !showDock ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Cockpit
            </button>
            <button
              onClick={() => setShowDock(true)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors border-b-2 relative ${
                showDock ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Plan d'action
              {copilot.dockVisible && copilot.plan.length > 0 && !showDock && (
                <span className="absolute top-2 right-4 w-2 h-2 rounded-full bg-primary animate-pulse" />
              )}
            </button>
            <button
              onClick={() => setShowCockpit(false)}
              className="lg:hidden p-2 mr-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title="Retour au chat"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            {showDock
              ? <CopilotDock
                  plan={copilot.plan}
                  immediateAction={copilot.immediateAction}
                  proofType={copilot.proofType}
                  completedSteps={copilot.completedSteps}
                  onMarkDone={copilot.markStepDone}
                  onDismiss={() => setShowDock(false)}
                  actionPath={copilot.actionPath}
                />
              : <CockpitPanel />
            }
          </div>
        </div>

      </div>
    </>
  );
}
