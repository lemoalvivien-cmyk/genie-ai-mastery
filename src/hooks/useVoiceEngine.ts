import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { KittState } from "@/components/chat/KittVisualizer";

interface UseVoiceEngineOptions {
  onTranscript: (text: string, isFinal: boolean) => void;
  onStateChange: (state: KittState) => void;
  voiceEnabled: boolean;
}

export function useVoiceEngine({ onTranscript, onStateChange, voiceEnabled }: UseVoiceEngineOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const ttsAnalyserRef = useRef<AnalyserNode | null>(null);

  // Returns the analyser node currently in use (mic or TTS)
  const getAnalyser = useCallback((): AnalyserNode | null => {
    if (isListening) return analyserRef.current;
    if (isSpeaking) return ttsAnalyserRef.current;
    return null;
  }, [isListening, isSpeaking]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    setIsListening(false);
  }, []);

  const startListening = useCallback(async () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      console.warn("SpeechRecognition not supported");
      return;
    }

    // Setup AudioContext + mic analyser
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
      // mic access denied - continue without visualizer
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SR();
    recognition.lang = "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      onStateChange("listening");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
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

  const speak = useCallback(async (text: string) => {
    if (!voiceEnabled) return;

    // Strip markdown for TTS
    const clean = text
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/#+\s/g, "")
      .replace(/`{1,3}[^`]*`{1,3}/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\n{2,}/g, ". ")
      .replace(/\n/g, " ")
      .trim()
      .slice(0, 500); // limit length for TTS

    setIsSpeaking(true);
    onStateChange("speaking");

    try {
      const { data, error } = await supabase.functions.invoke("text-to-speech", {
        body: { text: clean, voice: "loongstella_v2", speed: 1.0 },
      });

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
      ttsAudioRef.current = audio;

      if (!ttsSourceRef.current || ttsSourceRef.current.mediaElement !== audio) {
        const source = ctx.createMediaElementSource(audio);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyser.connect(ctx.destination);
        ttsSourceRef.current = source;
        ttsAnalyserRef.current = analyser;
      }

      audio.onended = () => {
        URL.revokeObjectURL(url);
        setIsSpeaking(false);
        onStateChange("idle");
        ttsSourceRef.current = null;
        ttsAnalyserRef.current = null;
      };

      await audio.play();
    } catch {
      // Fallback to Web Speech API
      try {
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.lang = "fr-FR";
        utterance.rate = 1.0;
        utterance.onend = () => {
          setIsSpeaking(false);
          onStateChange("idle");
        };
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      } catch {
        setIsSpeaking(false);
        onStateChange("idle");
      }
    }
  }, [voiceEnabled, onStateChange]);

  const stopSpeaking = useCallback(() => {
    ttsAudioRef.current?.pause();
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    onStateChange("idle");
  }, [onStateChange]);

  return {
    isListening,
    isSpeaking,
    getAnalyser,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
