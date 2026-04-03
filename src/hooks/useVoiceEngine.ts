import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { KittState } from "@/components/chat/KittVisualizer";

interface UseVoiceEngineOptions {
  onTranscript: (text: string, isFinal: boolean) => void;
  onStateChange: (state: KittState) => void;
  onQuotaExceeded?: () => void;  // called when TTS quota is hit
  voiceEnabled: boolean;
}

export function useVoiceEngine({
  onTranscript,
  onStateChange,
  onQuotaExceeded,
  voiceEnabled,
}: UseVoiceEngineOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsQuotaExceeded, setTtsQuotaExceeded] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const audioCtxRef    = useRef<AudioContext | null>(null);
  const analyserRef    = useRef<AnalyserNode | null>(null);
  const micStreamRef   = useRef<MediaStream | null>(null);
  const ttsAudioRef    = useRef<HTMLAudioElement | null>(null);
  const ttsSourceRef   = useRef<MediaElementAudioSourceNode | null>(null);
  const ttsAnalyserRef = useRef<AnalyserNode | null>(null);
  const isSpeakingRef  = useRef(false);

  const getAnalyser = useCallback((): AnalyserNode | null => {
    if (isListening) return analyserRef.current;
    if (isSpeaking)  return ttsAnalyserRef.current;
    return null;
  }, [isListening, isSpeaking]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    setIsListening(false);
  }, []);

  const startListening = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyserRef.current = analyser;
    } catch {
      // mic access denied — continue without visualizer analyser
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SR();
    recognition.lang = "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      onStateChange("listening");
    };

    recognition.onresult = (event: Event) => {
      const e = event as unknown as { resultIndex: number; results: SpeechRecognitionResultList };
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      if (final) {
        onTranscript(final.trim(), true);
        onStateChange("thinking");
      } else if (interim) {
        onTranscript(interim, false);
      }
    };

    recognition.onerror = () => {
      stopListening();
      onStateChange("idle");
    };

    recognition.onend = () => {
      stopListening();
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [onTranscript, onStateChange, stopListening]);

  // ── Web Speech fallback ──────────────────────────────────────────────────────
  const speakWithBrowser = useCallback((text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    // Pick a French voice if available
    const voices = window.speechSynthesis.getVoices();
    const frVoice = voices.find(v => v.lang.startsWith("fr"));
    if (frVoice) utterance.voice = frVoice;

    utterance.onend = () => {
      if (isSpeakingRef.current) {
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        onStateChange("idle");
      }
    };
    utterance.onerror = () => {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      onStateChange("idle");
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [onStateChange]);

  // ── Main speak function ──────────────────────────────────────────────────────
  const speak = useCallback(async (text: string) => {
    if (!voiceEnabled) return;
    if (isSpeakingRef.current) return; // already speaking

    // Strip markdown
    const clean = text
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/#+\s/g, "")
      .replace(/`{1,3}[^`]*`{1,3}/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\n{2,}/g, ". ")
      .replace(/\n/g, " ")
      .trim()
      .slice(0, 500);

    if (!clean) return;

    isSpeakingRef.current = true;
    setIsSpeaking(true);
    onStateChange("speaking");

    // If quota already exceeded, skip directly to browser fallback
    if (ttsQuotaExceeded) {
      speakWithBrowser(clean);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("text-to-speech", {
        body: { text: clean, voice: "loongstella_v2", speed: 1.0 },
      });

      // Quota exceeded
      if (data?.quota_exceeded || (error as { status?: number } | null)?.status === 429) {
        setTtsQuotaExceeded(true);
        onQuotaExceeded?.();
        // Still speak with browser — user still hears something
        speakWithBrowser(clean);
        return;
      }

      if (error || !data?.audio) throw new Error("TTS failed");

      // Decode base64 audio
      const binary = atob(data.audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "audio/mp3" });
      const url = URL.createObjectURL(blob);

      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;

      const audio = new Audio(url);
      audio.crossOrigin = "anonymous";
      ttsAudioRef.current = audio;

      // New analyser for each utterance
      const source = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      ttsSourceRef.current = source;
      ttsAnalyserRef.current = analyser;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        onStateChange("idle");
        ttsSourceRef.current = null;
        ttsAnalyserRef.current = null;
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        throw new Error("audio playback error");
      };

      await audio.play();
    } catch {
      // Fallback to Web Speech API
      try {
        speakWithBrowser(clean);
      } catch {
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        onStateChange("idle");
      }
    }
  }, [voiceEnabled, onStateChange, onQuotaExceeded, ttsQuotaExceeded, speakWithBrowser]);

  const stopSpeaking = useCallback(() => {
    ttsAudioRef.current?.pause();
    window.speechSynthesis?.cancel();
    isSpeakingRef.current = false;
    setIsSpeaking(false);
    onStateChange("idle");
  }, [onStateChange]);

  return {
    isListening,
    isSpeaking,
    ttsQuotaExceeded,
    getAnalyser,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
