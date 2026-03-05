import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, Volume2, VolumeX, Loader2, Sparkles, Waves, MessageSquare, Phone, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type ConversationMessage = { role: "user" | "assistant"; content: string; timestamp: Date };
type SessionStatus = "idle" | "listening" | "processing" | "speaking";

// Animated waveform bars
function WaveformVisualizer({ active, speaking }: { active: boolean; speaking: boolean }) {
  const bars = Array.from({ length: 12 });
  return (
    <div className="flex items-center justify-center gap-0.5 h-12">
      {bars.map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-1 rounded-full transition-all",
            speaking
              ? "bg-primary animate-pulse"
              : active
                ? "bg-emerald-400"
                : "bg-muted-foreground/30"
          )}
          style={{
            height: active || speaking
              ? `${20 + Math.sin((Date.now() / 200 + i * 0.8)) * 18 + Math.random() * 14}px`
              : "6px",
            animationDelay: `${i * 80}ms`,
            transition: "height 0.12s ease",
          }}
        />
      ))}
    </div>
  );
}

export default function VoiceAssistant() {
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [visualizerTick, setVisualizerTick] = useState(0);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animate waveform
  useEffect(() => {
    if (status === "listening" || status === "speaking") {
      tickRef.current = setInterval(() => setVisualizerTick(t => t + 1), 80);
    } else {
      if (tickRef.current) clearInterval(tickRef.current);
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [status]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const speak = useCallback((text: string) => {
    if (isMuted || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    utterance.rate = 1.05;
    utterance.pitch = 1;
    // Try to find a French voice
    const voices = window.speechSynthesis.getVoices();
    const frVoice = voices.find(v => v.lang.startsWith("fr")) ?? voices[0];
    if (frVoice) utterance.voice = frVoice;
    utterance.onstart = () => setStatus("speaking");
    utterance.onend = () => {
      setStatus("listening");
      startListening();
    };
    utteranceRef.current = utterance;
    synthRef.current = window.speechSynthesis;
    window.speechSynthesis.speak(utterance);
  }, [isMuted]);

  const callGenieOS = useCallback(async (text: string) => {
    setStatus("processing");
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/genie-os-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            ...messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: text },
          ],
          module: "assistant",
          voice_mode: true,
        }),
      });

      if (!resp.ok || !resp.body) throw new Error("API error");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === "router") continue;
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) fullResponse += delta;
          } catch (_) { /* ignore */ }
        }
      }

      if (fullResponse) {
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: fullResponse, timestamp: new Date() },
        ]);
        speak(fullResponse);
      }
    } catch (err) {
      toast({ title: "Erreur vocale", description: String(err), variant: "destructive" });
      setStatus("listening");
      startListening();
    }
  }, [messages, speak]);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Non supporté", description: "Votre navigateur ne supporte pas la reconnaissance vocale.", variant: "destructive" });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setStatus("listening");
    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) final += result[0].transcript;
        else interim += result[0].transcript;
      }
      setInterimTranscript(interim);
      if (final.trim()) {
        setTranscript(final.trim());
        setInterimTranscript("");
        setMessages(prev => [...prev, { role: "user", content: final.trim(), timestamp: new Date() }]);
        callGenieOS(final.trim());
      }
    };
    recognition.onerror = (e) => {
      if (e.error === "no-speech") {
        startListening(); // restart on silence
      } else {
        console.warn("Speech recognition error:", e.error);
      }
    };
    recognition.onend = () => {
      if (status === "listening") {
        // auto-restart if still in session
        setTimeout(() => { if (isSessionActive) startListening(); }, 300);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [status, isSessionActive, callGenieOS]);

  const startSession = useCallback(() => {
    setIsSessionActive(true);
    setMessages([]);
    setTranscript("");
    const greeting = "Bonjour ! Je suis votre assistant GENIE OS. Comment puis-je vous aider ?";
    setMessages([{ role: "assistant", content: greeting, timestamp: new Date() }]);
    setTimeout(() => speak(greeting), 300);
  }, [speak]);

  const endSession = useCallback(() => {
    setIsSessionActive(false);
    setStatus("idle");
    recognitionRef.current?.abort();
    window.speechSynthesis?.cancel();
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(m => !m);
    if (!isMuted) window.speechSynthesis?.cancel();
  }, [isMuted]);

  const statusLabels: Record<SessionStatus, string> = {
    idle: "Session inactive",
    listening: "Je vous écoute...",
    processing: "Traitement en cours...",
    speaking: "GENIE OS parle...",
  };

  const statusColors: Record<SessionStatus, string> = {
    idle: "text-muted-foreground",
    listening: "text-emerald-400",
    processing: "text-primary",
    speaking: "text-yellow-400",
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow-sm">
              <Waves className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-foreground text-sm">Voice OS</h1>
              <p className="text-xs text-muted-foreground">Assistant vocal temps réel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn("flex items-center gap-1.5 text-xs font-medium", statusColors[status])}>
              <span className={cn(
                "w-1.5 h-1.5 rounded-full",
                status === "idle" ? "bg-muted-foreground/50" :
                status === "listening" ? "bg-emerald-400 animate-pulse" :
                status === "processing" ? "bg-primary animate-pulse" :
                "bg-yellow-400 animate-pulse"
              )} />
              {statusLabels[status]}
            </div>
          </div>
        </div>
      </div>

      {/* Visualizer + controls */}
      <div className="flex-shrink-0 border-b border-border bg-card/50 px-6 py-6">
        <div className="flex flex-col items-center gap-4">
          {/* Main visualizer */}
          <div className={cn(
            "w-24 h-24 rounded-full flex items-center justify-center border-2 transition-all duration-300",
            status === "idle" ? "border-border bg-card" :
            status === "listening" ? "border-emerald-400/50 bg-emerald-400/5 shadow-[0_0_20px_hsl(var(--emerald)/0.2)]" :
            status === "processing" ? "border-primary/50 bg-primary/5" :
            "border-yellow-400/50 bg-yellow-400/5 shadow-[0_0_20px_rgba(250,204,21,0.15)]"
          )}>
            {status === "processing" ? (
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            ) : status === "speaking" ? (
              <Volume2 className="w-8 h-8 text-yellow-400" />
            ) : status === "listening" ? (
              <Mic className="w-8 h-8 text-emerald-400 animate-pulse" />
            ) : (
              <Sparkles className="w-8 h-8 text-muted-foreground" />
            )}
          </div>

          {/* Waveform */}
          <div key={visualizerTick}>
            <WaveformVisualizer active={status === "listening"} speaking={status === "speaking"} />
          </div>

          {/* Interim transcript */}
          {interimTranscript && (
            <p className="text-sm text-muted-foreground italic">"{interimTranscript}..."</p>
          )}

          {/* Controls */}
          <div className="flex items-center gap-3">
            {!isSessionActive ? (
              <Button onClick={startSession} className="gap-2 gradient-primary border-0 shadow-glow-sm">
                <Phone className="w-4 h-4" />
                Démarrer la session vocale
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleMute}
                  className={cn("border-border", isMuted && "border-destructive/50 text-destructive")}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  onClick={endSession}
                  className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
                >
                  <PhoneOff className="w-4 h-4" />
                  Terminer
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Conversation history */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && !isSessionActive && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 text-muted-foreground">
            <Waves className="w-12 h-12 mb-4 opacity-30" />
            <p className="font-medium mb-1">Assistant vocal GENIE OS</p>
            <p className="text-sm opacity-70">Démarrez une session pour parler avec l'IA</p>
            <div className="mt-6 text-xs space-y-1 opacity-50">
              <p>• Parlez naturellement en français</p>
              <p>• L'IA répond vocalement et par texte</p>
              <p>• Continuez à parler après la réponse</p>
            </div>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
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
            <div className={cn(
              "max-w-[80%] rounded-xl px-4 py-3 text-sm",
              msg.role === "user"
                ? "bg-primary/15 border border-primary/20 text-foreground"
                : "bg-card border border-border text-foreground"
            )}>
              <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              <p className="text-xs text-muted-foreground/50 mt-1">
                {msg.timestamp.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Text input fallback */}
      <div className="flex-shrink-0 border-t border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Mode vocal actif — la saisie texte reste disponible via le Chat IA</span>
        </div>
      </div>
    </div>
  );
}
