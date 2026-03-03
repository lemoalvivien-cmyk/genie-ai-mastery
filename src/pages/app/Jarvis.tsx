import { useState, useRef, useCallback, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Send, Loader2, Mic, MicOff, Zap, GraduationCap, Leaf,
  ShieldAlert, LayoutGrid, MessageSquare, RefreshCw, Baby,
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
import CockpitPanel from "@/components/jarvis/CockpitPanel";
import { ELI10Button } from "@/components/jarvis/ELI10Button";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ActionSuggestion {
  label: string;
  prompt: string;
  emoji: string;
}

function sanitize(t: string) {
  return DOMPurify.sanitize(t, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}

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
  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-1`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center shrink-0 shadow-glow mt-0.5">
          <Zap className="w-4 h-4 text-primary-foreground" />
        </div>
      )}
      <div className={`max-w-[85%] space-y-2`}>
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

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [kittState, setKittState] = useState<KittState>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [expertMode, setExpertMode] = useState(false);
  const [ecoMode] = useState(false);
  const [showCockpit, setShowCockpit] = useState(false);

  const voiceEnabled = profile?.voice_enabled ?? true;
  const persona = profile?.persona ?? null;
  const mode = persona === "senior" || persona === "parent" ? "senior" : "pro";
  const suggestions = getPersonaActions(persona, mode);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef(messages);
  historyRef.current = messages;

  const { isListening, getAnalyser, startListening, stopListening, speak } = useVoiceEngine({
    onTranscript: (text, isFinal) => {
      if (isFinal) {
        setInput(text);
        setTimeout(() => sendMessage(text), 600);
      } else {
        setInput(text);
      }
    },
    onStateChange: setKittState,
    voiceEnabled,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Welcome message
  useEffect(() => {
    const firstName = profile?.full_name?.split(" ")[0] ?? "toi";
    const greetings: Record<string, string> = {
      senior: `Bonjour ${firstName} ! 😊 Je suis Jarvis, ton assistant numérique. Je suis là pour t'aider, étape par étape, sans jargon. Par quoi voudrais-tu commencer aujourd'hui ?`,
      parent: `Salut ${firstName} ! 👋 Je suis Jarvis. Je t'aide à utiliser le numérique en toute sécurité pour toi et ta famille. Qu'est-ce qui te préoccupe en ce moment ?`,
      jeune: `Hey ${firstName} ! ⚡ Je suis Jarvis, ton copilote IA. On peut coder, apprendre, et explorer ensemble. C'est parti !`,
      dirigeant: `Bonjour ${firstName}. Je suis Jarvis, votre Génie IA. Je vais vous donner des actions concrètes pour votre organisation. Quel est votre défi du moment ?`,
      independant: `Salut ${firstName} ! 🚀 Je suis Jarvis. Dis-moi ce qui te prend trop de temps — on va automatiser ça !`,
      salarie: `Bonjour ${firstName} ! 🤖 Je suis Jarvis. Ensemble on va booster ta productivité et sécuriser ton quotidien numérique. Par où commencer ?`,
    };
    const welcome = (persona && greetings[persona]) ?? `Bonjour ${firstName} ! ⚡ Je suis Jarvis, ton Génie IA. Pose-moi n'importe quelle question sur l'IA ou la cybersécurité !`;
    setMessages([{ id: "welcome", role: "assistant", content: welcome }]);

    if (voiceEnabled) {
      setTimeout(() => speak(welcome), 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = useCallback(async (text?: string) => {
    const userText = sanitize(text ?? input).trim();
    if (!userText || isLoading) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: userText };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setKittState("thinking");

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
          session_id: sessionId,
          request_type: "jarvis_chat",
          expert_mode: expertMode,
          eco_mode: ecoMode,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const raw: string = data?.content ?? "Je n'ai pas pu générer une réponse. Réessaie !";
      // Remove JSON blocks if any (plain chat mode)
      const content = raw.replace(/```json[\s\S]*?```/gi, "").replace(/```[\s\S]*?```/gi, "").trim() || raw.trim();

      const assistantMsg: ChatMessage = { id: crypto.randomUUID(), role: "assistant", content: content };
      setMessages(prev => [...prev, assistantMsg]);
      setKittState("speaking");
      if (voiceEnabled) speak(content.slice(0, 200));
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Problème de connexion.",
        variant: "destructive",
      });
      setKittState("idle");
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, profile, persona, expertMode, ecoMode, sessionId, voiceEnabled, speak]);

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

  return (
    <>
      <Helmet>
        <title>Jarvis – Cockpit IA | GENIE IA</title>
        <meta name="description" content="Votre assistant IA personnel : guide, coaching, missions du jour et cockpit de progression." />
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
                  <span className="text-sm font-bold">Jarvis</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">En ligne</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Guide IA · Ultra patient · Toujours là</p>
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
                  className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    isListening
                      ? "bg-destructive text-destructive-foreground shadow-[0_0_12px_hsl(var(--destructive)/0.4)]"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                  title="Maintenir pour parler"
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
                  className="min-h-[42px] max-h-[120px] resize-none text-sm rounded-xl bg-background border-border/60 focus-visible:ring-primary pr-10"
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

        {/* ── RIGHT: Cockpit ──────────────────────────────────────────────── */}
        <div className={`${showCockpit ? "flex flex-col flex-1" : "hidden"} lg:flex lg:flex-col lg:w-[340px] xl:w-[380px] shrink-0 bg-card/20`}>
          {/* Cockpit header */}
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold">Cockpit</span>
            </div>
            <button
              onClick={() => setShowCockpit(false)}
              className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title="Retour au chat"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            <CockpitPanel />
          </div>
        </div>

      </div>
    </>
  );
}
