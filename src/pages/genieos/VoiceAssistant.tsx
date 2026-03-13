import { useState, useRef, useCallback, useEffect } from "react";
import {
  Mic, MicOff, Volume2, VolumeX, Loader2, Sparkles,
  Waves, Phone, PhoneOff, Settings2, Radio, Dna,
  Square, Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import KittAvatarCanvas from "@/components/jarvis/KittAvatarCanvas";
import KittVisualizer from "@/components/chat/KittVisualizer";
import { useVoiceCloneEngine, VOICE_PRESETS } from "@/hooks/useVoiceCloneEngine";
import type { KittState } from "@/components/chat/KittVisualizer";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type ConversationMessage = { role: "user" | "assistant"; content: string; timestamp: Date };
type SessionStatus = "idle" | "listening" | "processing" | "speaking";

// ── Voice preset pill ──────────────────────────────────────────────────────
function VoicePill({
  id, label, icon, selected, disabled, onClick,
}: { id: string; label: string; icon: string; selected: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
        selected
          ? "border-primary/60 bg-primary/15 text-primary shadow-glow-sm"
          : "border-border/40 bg-card/60 text-muted-foreground hover:border-primary/30 hover:text-foreground",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}

// ── Clone recording modal ──────────────────────────────────────────────────
function ClonePanel({
  isRecording, isCloning, progress,
  onStart, onStop, onClose,
}: {
  isRecording: boolean; isCloning: boolean; progress: number;
  onStart: () => void; onStop: () => void; onClose: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!isRecording) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [isRecording]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border rounded-2xl p-6 w-80 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <Dna className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">Cloner votre voix</h3>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Lisez le texte suivant pendant <strong>15-30 secondes</strong> pour créer votre empreinte vocale :
        </p>

        <div className="bg-muted/30 rounded-xl p-3 text-xs text-foreground leading-relaxed border border-border/40 italic">
          "La cybersécurité est un enjeu stratégique majeur pour toutes les organisations modernes.
           Chaque jour, des milliers de tentatives d'intrusion sont détectées sur les réseaux mondiaux.
           L'intelligence artificielle transforme profondément notre manière d'apprendre et de travailler."
        </div>

        {isCloning ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Traitement de l'empreinte…</span>
              <span className="text-primary font-bold">{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : isRecording ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-destructive">
              <Circle className="w-3 h-3 fill-current animate-pulse" />
              <span className="text-sm font-mono">{String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}</span>
            </div>
            <Button onClick={onStop} size="sm" variant="destructive" className="gap-1.5">
              <Square className="w-3.5 h-3.5" />
              Terminer
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button onClick={onStart} size="sm" className="flex-1 gap-1.5 gradient-primary border-0">
              <Mic className="w-3.5 h-3.5" />
              Démarrer l'enregistrement
            </Button>
            <Button onClick={onClose} size="sm" variant="ghost" className="text-muted-foreground">
              Annuler
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function VoiceAssistant() {
  const [kittState, setKittState]       = useState<KittState>("idle");
  const [status, setStatus]             = useState<SessionStatus>("idle");
  const [messages, setMessages]         = useState<ConversationMessage[]>([]);
  const [isMuted, setIsMuted]           = useState(false);
  const [isSessionActive, setActive]    = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showClonePanel, setClonePanel] = useState(false);
  const [lang, setLang]                 = useState<"fr-FR" | "en-US">("fr-FR");

  const bottomRef = useRef<HTMLDivElement>(null);
  const listenAfterSpeakRef = useRef(false);

  // Scroll on new messages
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleStateChange = useCallback((s: KittState) => {
    setKittState(s);
    if (s === "listening")  setStatus("listening");
    if (s === "thinking")   setStatus("processing");
    if (s === "speaking")   setStatus("speaking");
    if (s === "idle")       setStatus(prev => prev === "idle" ? "idle" : "listening");
  }, []);

  const {
    isListening, isSpeaking, ttsQuotaExceeded,
    selectedVoice, setSelectedVoice,
    cloneVoiceId, isCloning, cloneProgress, isRecordingClone,
    getAnalyser, startListening, stopListening, speak, stopSpeaking,
    startCloneRecording, stopCloneRecording,
  } = useVoiceCloneEngine({
    onTranscript: (text, isFinal) => {
      if (isFinal) callGenieOS(text);
    },
    onStateChange: handleStateChange,
    onQuotaExceeded: () => toast({
      title: "Quota TTS atteint",
      description: "Mode synthèse navigateur activé.",
    }),
    voiceEnabled: !isMuted,
    lang,
  });

  // ── Call AI ──────────────────────────────────────────────────────────────
  const callGenieOS = useCallback(async (text: string) => {
    setStatus("processing");
    setKittState("thinking");
    setMessages(prev => [...prev, { role: "user", content: text, timestamp: new Date() }]);

    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/genie-os-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            ...messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: text },
          ],
          module: "assistant",
          voice_mode: true,
        }),
      });

      if (!resp.ok || !resp.body) throw new Error("API error");

      const reader  = resp.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";
      let textBuffer   = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, idx);
          textBuffer = textBuffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === "router") continue;
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) fullResponse += delta;
          } catch (_e) { /* ignore malformed */ }
        }
      }

      if (fullResponse) {
        setMessages(prev => [...prev, { role: "assistant", content: fullResponse, timestamp: new Date() }]);
        listenAfterSpeakRef.current = true;
        await speak(fullResponse);
      }
    } catch (err) {
      toast({ title: "Erreur vocale", description: String(err), variant: "destructive" });
      setStatus("listening");
      setKittState("idle");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, speak]);

  // Re-listen after TTS ends
  useEffect(() => {
    if (!isSpeaking && listenAfterSpeakRef.current && isSessionActive) {
      listenAfterSpeakRef.current = false;
      setTimeout(() => {
        if (isSessionActive) startListening();
      }, 400);
    }
  }, [isSpeaking, isSessionActive, startListening]);

  // ── Session control ───────────────────────────────────────────────────────
  const startSession = useCallback(() => {
    setActive(true);
    setMessages([]);
    const greeting = lang === "fr-FR"
      ? "Bonjour ! Je suis votre assistant GENIE OS. Comment puis-je vous aider ?"
      : "Hello! I'm your GENIE OS assistant. How can I help you today?";
    setMessages([{ role: "assistant", content: greeting, timestamp: new Date() }]);
    setTimeout(() => speak(greeting), 300);
  }, [lang, speak]);

  const endSession = useCallback(() => {
    setActive(false);
    setStatus("idle");
    setKittState("idle");
    stopListening();
    stopSpeaking();
    listenAfterSpeakRef.current = false;
  }, [stopListening, stopSpeaking]);

  // ── Status meta ───────────────────────────────────────────────────────────
  const statusLabel: Record<SessionStatus, string> = {
    idle:       "Session inactive",
    listening:  lang === "fr-FR" ? "Je vous écoute…" : "Listening…",
    processing: lang === "fr-FR" ? "Traitement…"     : "Processing…",
    speaking:   lang === "fr-FR" ? "GENIE OS parle…" : "GENIE OS speaking…",
  };
  const statusColor: Record<SessionStatus, string> = {
    idle:       "text-muted-foreground",
    listening:  "text-emerald-400",
    processing: "text-primary",
    speaking:   "text-yellow-400",
  };
  const dotColor: Record<SessionStatus, string> = {
    idle:       "bg-muted-foreground/40",
    listening:  "bg-emerald-400 animate-pulse",
    processing: "bg-primary animate-pulse",
    speaking:   "bg-yellow-400 animate-pulse",
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-card px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shadow-glow-sm">
              <Waves className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-foreground text-sm leading-tight">Voice OS</h1>
              <p className="text-[10px] text-muted-foreground">Assistant vocal · lip-sync IA</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status pill */}
            <div className={cn("flex items-center gap-1.5 text-xs font-medium", statusColor[status])}>
              <span className={cn("w-1.5 h-1.5 rounded-full", dotColor[status])} />
              <span className="hidden sm:inline">{statusLabel[status]}</span>
            </div>

            {/* Settings toggle */}
            <Button
              variant="ghost" size="icon"
              className={cn("h-7 w-7", showSettings && "text-primary bg-primary/10")}
              onClick={() => setShowSettings(s => !s)}
            >
              <Settings2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="mt-3 pt-3 border-t border-border/60 space-y-3 animate-fade-in">
            {/* Language */}
            <div className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground w-16">Langue</span>
              <div className="flex gap-1.5">
                {(["fr-FR", "en-US"] as const).map(l => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full border transition-all",
                      lang === l
                        ? "border-primary/60 bg-primary/15 text-primary"
                        : "border-border/40 text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    {l === "fr-FR" ? "🇫🇷 Français" : "🇺🇸 English"}
                  </button>
                ))}
              </div>
            </div>

            {/* Voice presets */}
            <div className="flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1" />
              <span className="text-xs text-muted-foreground w-16 shrink-0 mt-0.5">Voix</span>
              <div className="flex flex-wrap gap-1.5">
                {VOICE_PRESETS.map(v => (
                  <VoicePill
                    key={v.id}
                    id={v.id}
                    label={v.label}
                    icon={v.isCustom && !cloneVoiceId ? "🎙️+" : v.icon}
                    selected={selectedVoice === v.id}
                    onClick={() => {
                      if (v.isCustom && !cloneVoiceId) {
                        setClonePanel(true);
                      } else {
                        setSelectedVoice(v.id);
                      }
                    }}
                  />
                ))}
              </div>
            </div>

            {ttsQuotaExceeded && (
              <p className="text-[10px] text-yellow-500/80 flex items-center gap-1">
                ⚠️ Quota TTS atteint — synthèse navigateur activée
              </p>
            )}
          </div>
        )}
      </div>

      {/* Avatar + KITT visualizer */}
      <div className="flex-shrink-0 border-b border-border bg-card/50 px-6 py-5">
        <div className="flex flex-col items-center gap-4">
          {/* KITT face avatar */}
          <div className={cn(
            "rounded-full transition-all duration-500",
            status !== "idle"
              ? "shadow-[0_0_40px_rgba(82,87,216,0.35)]"
              : "opacity-90"
          )}>
            <KittAvatarCanvas
              state={kittState}
              analyserNode={getAnalyser()}
              size={148}
            />
          </div>

          {/* KITT bar visualizer */}
          <KittVisualizer state={kittState} analyserNode={getAnalyser()} />

          {/* Controls */}
          <div className="flex items-center gap-3">
            {!isSessionActive ? (
              <Button
                onClick={startSession}
                className="gap-2 gradient-primary border-0 shadow-glow-sm"
              >
                <Phone className="w-4 h-4" />
                {lang === "fr-FR" ? "Démarrer la session" : "Start session"}
              </Button>
            ) : (
              <>
                {/* Push-to-talk */}
                <Button
                  onPointerDown={startListening}
                  onPointerUp={stopListening}
                  onPointerLeave={stopListening}
                  size="icon"
                  variant="outline"
                  className={cn(
                    "w-11 h-11 rounded-full border-2 transition-all",
                    isListening
                      ? "border-emerald-400 bg-emerald-400/10 shadow-[0_0_16px_rgba(16,185,129,0.35)]"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {isListening
                    ? <Mic className="w-5 h-5 text-emerald-400 animate-pulse" />
                    : <Mic className="w-5 h-5 text-muted-foreground" />
                  }
                </Button>

                {/* Mute TTS */}
                <Button
                  variant="outline" size="icon"
                  onClick={() => { setIsMuted(m => !m); if (!isMuted) stopSpeaking(); }}
                  className={cn("border-border", isMuted && "border-destructive/50 text-destructive")}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>

                {/* End session */}
                <Button
                  variant="outline" onClick={endSession}
                  className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
                >
                  <PhoneOff className="w-4 h-4" />
                  {lang === "fr-FR" ? "Terminer" : "End"}
                </Button>
              </>
            )}
          </div>

          {/* Push-to-talk hint */}
          {isSessionActive && !isListening && !isSpeaking && (
            <p className="text-[10px] text-muted-foreground/60 animate-fade-in">
              {lang === "fr-FR"
                ? "Maintenez le bouton micophone pour parler"
                : "Hold mic button to speak"}
            </p>
          )}
        </div>
      </div>

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {messages.length === 0 && !isSessionActive && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 text-muted-foreground">
            <div className="mb-4 opacity-30">
              <KittAvatarCanvas state="idle" size={80} />
            </div>
            <p className="font-semibold mb-1">Assistant vocal GENIE OS</p>
            <p className="text-sm opacity-70">
              {lang === "fr-FR"
                ? "Démarrez une session pour parler avec l'IA"
                : "Start a session to talk with the AI"}
            </p>
            <div className="mt-5 text-xs space-y-1 opacity-50">
              <p>• {lang === "fr-FR" ? "Avatar animé lip-sync temps réel" : "Real-time lip-sync avatar"}</p>
              <p>• {lang === "fr-FR" ? "Clonage vocal (🧬 Cloner ma voix)" : "Voice cloning (🧬 Clone voice)"}</p>
              <p>• {lang === "fr-FR" ? "6 voix IA disponibles"               : "6 AI voices available"}</p>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={cn(
              "flex gap-3 animate-fade-in",
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
          >
            {/* Avatar bubble */}
            <div className={cn(
              "flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5",
              msg.role === "user"
                ? "bg-secondary border border-border"
                : "gradient-primary shadow-glow-sm"
            )}>
              {msg.role === "user"
                ? <Mic className="w-3.5 h-3.5 text-foreground" />
                : <Sparkles className="w-3.5 h-3.5 text-white" />
              }
            </div>

            {/* Message bubble */}
            <div className={cn(
              "max-w-[80%] rounded-xl px-4 py-3 text-sm",
              msg.role === "user"
                ? "bg-primary/15 border border-primary/20 text-foreground"
                : "bg-card border border-border text-foreground"
            )}>
              <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              <p className="text-[10px] text-muted-foreground/50 mt-1">
                {msg.timestamp.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}

        {/* Processing indicator */}
        {status === "processing" && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pl-10 animate-fade-in">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            <span>{lang === "fr-FR" ? "L'IA réfléchit…" : "AI is thinking…"}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-border bg-card px-4 py-2.5">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            <span>
              Voice: <strong className="text-foreground">
                {VOICE_PRESETS.find(v => v.id === selectedVoice)?.label ?? selectedVoice}
              </strong>
              {cloneVoiceId && selectedVoice === "custom" && " 🧬"}
            </span>
          </div>
          <span>{lang === "fr-FR" ? "Maintenir Mic pour parler" : "Hold Mic to speak"}</span>
        </div>
      </div>

      {/* Voice clone panel */}
      {showClonePanel && (
        <ClonePanel
          isRecording={isRecordingClone}
          isCloning={isCloning}
          progress={cloneProgress}
          onStart={startCloneRecording}
          onStop={async () => {
            await stopCloneRecording();
            setClonePanel(false);
            toast({ title: "Voix clonée ✅", description: "Votre empreinte vocale est prête." });
          }}
          onClose={() => setClonePanel(false)}
        />
      )}
    </div>
  );
}
