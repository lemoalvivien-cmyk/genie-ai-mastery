/**
 * JarvisOverlay — sidebar fixe avec mode vocal + KITT visualizer Canvas pulsant sur TTS
 *
 * Features:
 *  - Sidebar fixe droite (collapsible)
 *  - Chat history persistant (session)
 *  - KITT Canvas visualizer (pulse sur TTS/STT)
 *  - Push-to-Talk (Web Speech API)
 *  - TTS via edge function + browser fallback
 *  - LangGraph call via chat-completion edge function
 *  - Prompt système intégré (Tony Stark + Deadpool persona)
 *  - Chaîne de pensée + format JSON {message, action, tts_text}
 *
 * Intégration dans /app :
 *   import { JarvisOverlay } from "@/components/jarvis/JarvisOverlay";
 *   // Dans AppLayout ou n'importe quel layout :
 *   <JarvisOverlay />
 *   // Le composant se positionne en fixed right-0, z-50.
 *   // Ajouter pr-[var(--jarvis-w)] au main si sidebar ouverte pour éviter overlap.
 */

import { useState, useRef, useCallback, useEffect, useReducer } from "react";
import { createPortal } from "react-dom";
import {
  Zap, Mic, MicOff, Send, X, ChevronRight, ChevronLeft,
  Volume2, VolumeX, RotateCcw, Bot, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DOMPurify from "dompurify";
import KittVisualizer, { KittState } from "@/components/chat/KittVisualizer";
import { useVoiceEngine } from "@/hooks/useVoiceEngine";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type JarvisAction =
  | "attack" | "motivate" | "generate_exercise" | "sleepforge"
  | "quiz"   | "explain"  | "synthesis"          | "remediate";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  action?: JarvisAction;
}

// ─── JARVIS SYSTEM PROMPT — intégré côté client pour LangGraph context ────────
// Note : le vrai prompt système est dans la edge function chat-completion.
// Ce prompt est envoyé comme metadata pour orienter le LangGraph router.
export const JARVIS_SYSTEM_CONTEXT = `
Tu es JARVIS, formateur IA de GENIE IA. Style Tony Stark + Deadpool light.
Chaîne de pensée obligatoire : 1. Analyse humeur/apprentissage 2. Choix mode 3. Sécurité éthique 4. Génère.
Format JSON : { "message": "...", "action": "attack|motivate|generate_exercise|sleepforge|quiz|explain|synthesis|remediate", "tts_text": "..." }
Toujours positif, jamais insultant. Blagues légères, refs pop-culture.
`.trim();

// ─── Action badge config ──────────────────────────────────────────────────────
const ACTION_BADGES: Record<JarvisAction, { emoji: string; label: string; cls: string }> = {
  attack:            { emoji: "⚔️", label: "Simulation",    cls: "bg-red-500/20 text-red-400 border-red-500/30" },
  motivate:          { emoji: "🚀", label: "Boost Stark",   cls: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  generate_exercise: { emoji: "🎯", label: "Exercice live", cls: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
  sleepforge:        { emoji: "🌙", label: "SleepForge",    cls: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
  quiz:              { emoji: "🧠", label: "Quiz",          cls: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  explain:           { emoji: "💡", label: "Explication",   cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  synthesis:         { emoji: "📊", label: "Bilan",         cls: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  remediate:         { emoji: "🛠️", label: "Remédiation",  cls: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
};

// ─── Reducer ──────────────────────────────────────────────────────────────────
type State = {
  messages: ChatMessage[];
  input: string;
  isLoading: boolean;
  kittState: KittState;
  isOpen: boolean;
  voiceMuted: boolean;
};

type Action =
  | { type: "TOGGLE_OPEN" }
  | { type: "SET_INPUT"; payload: string }
  | { type: "SET_KITT_STATE"; payload: KittState }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "TOGGLE_MUTE" }
  | { type: "ADD_MSG"; payload: ChatMessage }
  | { type: "RESET" };

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "⚡ JARVIS en ligne. Votre formateur humain vient de raccrocher… C'est moi qui prends le relais. Phishing, IA, cyber — demandez, je livre. Par quoi on commence ?",
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "TOGGLE_OPEN":   return { ...state, isOpen: !state.isOpen };
    case "SET_INPUT":     return { ...state, input: action.payload };
    case "SET_KITT_STATE":return { ...state, kittState: action.payload };
    case "SET_LOADING":   return { ...state, isLoading: action.payload };
    case "TOGGLE_MUTE":   return { ...state, voiceMuted: !state.voiceMuted };
    case "ADD_MSG":       return { ...state, messages: [...state.messages, action.payload] };
    case "RESET":         return { ...state, messages: [WELCOME] };
    default:              return state;
  }
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  const badge  = !isUser && msg.action ? ACTION_BADGES[msg.action] : null;
  return (
    <div className={cn("flex gap-2 animate-fade-in", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_8px_hsl(var(--primary)/0.5)]">
          <Zap className="w-3 h-3 text-primary-foreground" />
        </div>
      )}
      <div className="max-w-[88%] space-y-1">
        {badge && (
          <div className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-semibold", badge.cls)}>
            <span>{badge.emoji}</span>
            <span>{badge.label}</span>
          </div>
        )}
        <div className={cn(
          "px-3 py-2 rounded-xl text-xs leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-card border border-border/50 text-foreground rounded-bl-sm"
        )}>
          {msg.content}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function JarvisOverlay() {
  const { profile } = useAuth();
  const [state, dispatch] = useReducer(reducer, {
    messages: [WELCOME],
    input: "",
    isLoading: false,
    kittState: "idle",
    isOpen: false,
    voiceMuted: false,
  });

  const [sessionId] = useState(() => crypto.randomUUID());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const historyRef     = useRef(state.messages);
  historyRef.current   = state.messages;

  // ── Voice Engine ────────────────────────────────────────────────────────────
  const { isListening, getAnalyser, startListening, stopListening, speak } = useVoiceEngine({
    onTranscript: (text, isFinal) => {
      if (isFinal) {
        dispatch({ type: "SET_INPUT", payload: text });
        setTimeout(() => sendMessage(text), 400);
      } else {
        dispatch({ type: "SET_INPUT", payload: text });
      }
    },
    onStateChange: (s) => dispatch({ type: "SET_KITT_STATE", payload: s }),
    voiceEnabled: !state.voiceMuted,
  });

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages]);

  // ── Parse Jarvis JSON response ──────────────────────────────────────────────
  const parseResponse = useCallback((raw: string): { message: string; action?: JarvisAction; ttsText?: string } => {
    try {
      // Try to extract JSON block from markdown or raw string
      const jsonStr =
        raw.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] ??
        raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
      const obj = JSON.parse(jsonStr);
      return {
        message: obj.message || raw,
        action:  obj.action as JarvisAction | undefined,
        ttsText: obj.tts_text,
      };
    } catch {
      return { message: raw };
    }
  }, []);

  // ── LangGraph / chat-completion call ───────────────────────────────────────
  const sendMessage = useCallback(async (text?: string) => {
    const raw = DOMPurify.sanitize(text ?? state.input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
    if (!raw || state.isLoading) return;
    if (raw.length > 8000) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: raw };
    dispatch({ type: "ADD_MSG",      payload: userMsg });
    dispatch({ type: "SET_INPUT",    payload: "" });
    dispatch({ type: "SET_LOADING",  payload: true });
    dispatch({ type: "SET_KITT_STATE", payload: "thinking" });

    const ctrl = new AbortController();
    const tid   = setTimeout(() => ctrl.abort(), 30_000);

    try {
      const { data, error } = await supabase.functions.invoke("chat-completion", {
        body: {
          messages: [
            ...historyRef.current.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: raw },
          ],
          user_profile: {
            persona: profile?.persona ?? "",
            level:   profile?.level   ?? 1,
            mode:    "jarvis_overlay",
          },
          session_id:    sessionId,
          request_type:  "jarvis_chat",
          // LangGraph routing hint — enables adversarial / adaptive sub-agents
          langgraph_context: {
            system: JARVIS_SYSTEM_CONTEXT,
            enable_subagents: ["adversarial", "adaptive_path", "world_watch"],
          },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const content = data?.content ?? "Je n'ai pas pu générer de réponse.";
      const { message, action, ttsText } = parseResponse(content);

      const assistantMsg: ChatMessage = {
        id:      crypto.randomUUID(),
        role:    "assistant",
        content: message,
        action,
      };
      dispatch({ type: "ADD_MSG", payload: assistantMsg });
      dispatch({ type: "SET_KITT_STATE", payload: "speaking" });

      if (!state.voiceMuted) {
        speak((ttsText || message).slice(0, 300));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur de connexion.";
      dispatch({
        type: "ADD_MSG",
        payload: { id: crypto.randomUUID(), role: "assistant", content: `❌ ${msg}` },
      });
      dispatch({ type: "SET_KITT_STATE", payload: "idle" });
    } finally {
      clearTimeout(tid);
      dispatch({ type: "SET_LOADING", payload: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.input, state.isLoading, state.voiceMuted, profile, sessionId, parseResponse, speak]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleMic = () => {
    if (isListening) stopListening();
    else startListening();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const SIDEBAR_W = 340;

  const overlay = (
    <>
      {/* ── Toggle tab ───────────────────────────────────────────────────── */}
      <button
        onClick={() => dispatch({ type: "TOGGLE_OPEN" })}
        aria-label={state.isOpen ? "Fermer JARVIS" : "Ouvrir JARVIS"}
        className={cn(
          "fixed top-1/2 -translate-y-1/2 z-[51] flex items-center justify-center",
          "w-8 h-16 rounded-l-xl border border-r-0 border-border/60",
          "bg-card/90 backdrop-blur-md shadow-lg transition-all duration-300",
          "hover:bg-primary/10 hover:border-primary/40",
          state.isOpen ? "right-[340px]" : "right-0"
        )}
        style={{ transition: "right 0.35s cubic-bezier(0.4,0,0.2,1)" }}
      >
        <div className="flex flex-col items-center gap-1">
          {state.isOpen ? (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          <Bot className="w-3.5 h-3.5 text-primary" />
        </div>
      </button>

      {/* ── Sidebar panel ────────────────────────────────────────────────── */}
      <aside
        aria-label="JARVIS copilote IA"
        style={{
          width: SIDEBAR_W,
          transform: state.isOpen ? "translateX(0)" : `translateX(${SIDEBAR_W}px)`,
          transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
        }}
        className={cn(
          "fixed right-0 top-0 bottom-0 z-50 flex flex-col",
          "bg-card/95 backdrop-blur-xl border-l border-border/50",
          "shadow-[-8px_0_32px_rgba(0,0,0,0.4)]"
        )}
      >
        {/* Header ──────────────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-between px-3 py-2.5 border-b border-border/40 bg-card/80">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-[0_0_12px_hsl(var(--primary)/0.5)]">
              <Zap className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-xs font-bold leading-none">JARVIS</p>
              <p className="text-[9px] text-muted-foreground leading-none mt-0.5">
                Formateur IA — Tony Stark mode
              </p>
            </div>
            {/* Status dot */}
            <span className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_#34d399]" />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => dispatch({ type: "TOGGLE_MUTE" })}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              aria-label={state.voiceMuted ? "Activer la voix" : "Couper la voix"}
              title={state.voiceMuted ? "Activer la voix" : "Couper la voix"}
            >
              {state.voiceMuted
                ? <VolumeX className="w-3.5 h-3.5" />
                : <Volume2  className="w-3.5 h-3.5" />
              }
            </button>
            <button
              onClick={() => dispatch({ type: "RESET" })}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              aria-label="Réinitialiser la conversation"
              title="Nouvelle conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => dispatch({ type: "TOGGLE_OPEN" })}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              aria-label="Fermer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* KITT Visualizer ──────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-center py-2 px-3 border-b border-border/30 bg-[hsl(var(--background)/0.6)]">
          <KittVisualizer state={state.kittState} analyserNode={getAnalyser()} />
        </div>

        {/* Messages ─────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin scrollbar-thumb-border/40">
          {state.messages.map(msg => (
            <Bubble key={msg.id} msg={msg} />
          ))}
          {state.isLoading && (
            <div className="flex gap-2 justify-start animate-fade-in">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-[0_0_8px_hsl(var(--primary)/0.5)]">
                <Zap className="w-3 h-3 text-primary-foreground" />
              </div>
              <div className="px-3 py-2 bg-card border border-border/50 rounded-xl rounded-bl-sm">
                <div className="flex gap-1 items-center h-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick chips ───────────────────────────────────────────────────── */}
        <div className="shrink-0 flex gap-1.5 overflow-x-auto px-3 py-2 border-t border-border/30 scrollbar-none">
          {[
            { emoji: "⚔️", label: "Phishing", prompt: "Simule une attaque phishing niveau débutant" },
            { emoji: "🧠", label: "Quiz IA",  prompt: "Quiz rapide sur l'intelligence artificielle" },
            { emoji: "🛡️", label: "Cyber",    prompt: "Top 3 gestes de cybersécurité urgents" },
          ].map(chip => (
            <button
              key={chip.label}
              onClick={() => sendMessage(chip.prompt)}
              disabled={state.isLoading}
              className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-full border border-border/50 bg-muted/30 text-[10px] font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:border-border transition-all disabled:opacity-50"
            >
              <span>{chip.emoji}</span>
              <span>{chip.label}</span>
            </button>
          ))}
        </div>

        {/* Input area ────────────────────────────────────────────────────── */}
        <div className="shrink-0 px-3 pb-3 pt-2 space-y-2">
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={state.input}
              onChange={e => dispatch({ type: "SET_INPUT", payload: e.target.value })}
              onKeyDown={handleKey}
              placeholder="Posez une question à JARVIS…"
              rows={2}
              maxLength={8000}
              disabled={state.isLoading}
              className={cn(
                "flex-1 resize-none text-xs rounded-xl bg-input border-border/50",
                "placeholder:text-muted-foreground/50 min-h-[52px] max-h-[120px]",
                "focus-visible:ring-1 focus-visible:ring-primary/50"
              )}
            />
            <div className="flex flex-col gap-1.5">
              {/* Mic button */}
              <button
                onClick={toggleMic}
                className={cn(
                  "w-8 h-8 rounded-xl border flex items-center justify-center transition-all",
                  isListening
                    ? "bg-red-500/20 border-red-500/40 text-red-400 shadow-[0_0_8px_rgba(254,44,64,0.3)] animate-pulse"
                    : "bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
                aria-label={isListening ? "Arrêter l'écoute" : "Parler à JARVIS"}
                title={isListening ? "Arrêter" : "Push-to-Talk"}
              >
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
              {/* Send button */}
              <Button
                size="icon"
                className="w-8 h-8 rounded-xl bg-primary hover:bg-primary/90 shadow-[0_0_8px_hsl(var(--primary)/0.3)]"
                onClick={() => sendMessage()}
                disabled={state.isLoading || !state.input.trim()}
                aria-label="Envoyer"
              >
                {state.isLoading
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Send className="w-3.5 h-3.5" />
                }
              </Button>
            </div>
          </div>
          <p className="text-[9px] text-muted-foreground/40 text-center">
            JARVIS · Formateur IA · LangGraph powered
          </p>
        </div>
      </aside>
    </>
  );

  return createPortal(overlay, document.body);
}

export default JarvisOverlay;
