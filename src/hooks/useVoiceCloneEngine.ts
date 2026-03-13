/**
 * useVoiceCloneEngine
 * Extended voice engine with:
 *  - Voice preset selection (system voices + custom clone)
 *  - Clone upload: records a 30s sample → sends to TTS edge function for embedding
 *  - STT via Web Speech API (fr-FR / en-US)
 *  - TTS via DashScope CosyVoice with clone_voice_id support
 *  - Audio analyser output for KITT lip-sync
 */
import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { KittState } from "@/components/chat/KittVisualizer";

export type VoicePreset = {
  id: string;
  label: string;
  description: string;
  icon: string;
  isCustom?: boolean;
};

export const VOICE_PRESETS: VoicePreset[] = [
  { id: "loongstella_v2",  label: "Stella",   description: "Voix féminine chaleureuse",   icon: "🎙️" },
  { id: "longxiaochun_v2", label: "Chun",     description: "Voix féminine douce",          icon: "🌸" },
  { id: "longxiaobai_v2",  label: "Bai",      description: "Voix neutre équilibrée",       icon: "🤖" },
  { id: "longcheng_v2",    label: "Cheng",    description: "Voix masculine posée",         icon: "👔" },
  { id: "longhua_v2",      label: "Hua",      description: "Voix masculine énergique",     icon: "⚡" },
  { id: "custom",          label: "Mon clone",description: "Voix clonée depuis ma voix",   icon: "🧬", isCustom: true },
];

interface Options {
  onTranscript:   (text: string, isFinal: boolean) => void;
  onStateChange:  (state: KittState) => void;
  onQuotaExceeded?: () => void;
  voiceEnabled:   boolean;
  lang?:          "fr-FR" | "en-US";
}

export function useVoiceCloneEngine({
  onTranscript,
  onStateChange,
  onQuotaExceeded,
  voiceEnabled,
  lang = "fr-FR",
}: Options) {
  const [isListening,       setIsListening]       = useState(false);
  const [isSpeaking,        setIsSpeaking]         = useState(false);
  const [ttsQuotaExceeded,  setTtsQuotaExceeded]  = useState(false);
  const [selectedVoice,     setSelectedVoice]      = useState<string>("loongstella_v2");
  const [cloneVoiceId,      setCloneVoiceId]       = useState<string | null>(null);
  const [isCloning,         setIsCloning]          = useState(false);
  const [cloneProgress,     setCloneProgress]      = useState(0);
  const [isRecordingClone,  setIsRecordingClone]   = useState(false);

  // Refs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef    = useRef<any>(null);
  const audioCtxRef       = useRef<AudioContext | null>(null);
  const analyserRef       = useRef<AnalyserNode | null>(null);      // mic analyser
  const ttsAnalyserRef    = useRef<AnalyserNode | null>(null);      // TTS analyser
  const ttsAudioRef       = useRef<HTMLAudioElement | null>(null);
  const ttsSourceRef      = useRef<MediaElementAudioSourceNode | null>(null);
  const micStreamRef      = useRef<MediaStream | null>(null);
  const isSpeakingRef     = useRef(false);
  const mediaRecorderRef  = useRef<MediaRecorder | null>(null);
  const cloneChunksRef    = useRef<Blob[]>([]);

  // ── Shared AudioContext helper ────────────────────────────────────────────
  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

  // ── Analyser selector (for KITT visualizer) ───────────────────────────────
  const getAnalyser = useCallback((): AnalyserNode | null => {
    if (isListening) return analyserRef.current;
    if (isSpeaking)  return ttsAnalyserRef.current;
    return null;
  }, [isListening, isSpeaking]);

  // ── STT ───────────────────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    analyserRef.current  = null;
    setIsListening(false);
  }, []);

  const startListening = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const ctx     = getAudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      ctx.createMediaStreamSource(stream).connect(analyser);
      analyserRef.current = analyser;
    } catch (_e) { /* mic denied — continue without analyser */ }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SR();
    recognition.lang            = lang;
    recognition.continuous      = false;
    recognition.interimResults  = true;
    recognition.maxAlternatives = 1;

    recognition.onstart   = () => { setIsListening(true);  onStateChange("listening"); };
    recognition.onresult  = (e: SpeechRecognitionEvent) => {
      let interim = "", final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const txt = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += txt;
        else interim += txt;
      }
      if (final)   { onTranscript(final.trim(), true);  onStateChange("thinking"); }
      else if (interim) { onTranscript(interim, false); }
    };
    recognition.onerror = () => { stopListening(); onStateChange("idle"); };
    recognition.onend   = () => { stopListening(); };

    recognitionRef.current = recognition;
    recognition.start();
  }, [lang, onTranscript, onStateChange, stopListening, getAudioCtx]);

  // ── Browser TTS fallback ──────────────────────────────────────────────────
  const speakWithBrowser = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang  = lang;
    utt.rate  = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const match = voices.find(v => v.lang.startsWith(lang.split("-")[0]));
    if (match) utt.voice = match;
    utt.onend = utt.onerror = () => {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      onStateChange("idle");
    };
    window.speechSynthesis.speak(utt);
  }, [lang, onStateChange]);

  // ── Main TTS ──────────────────────────────────────────────────────────────
  const speak = useCallback(async (text: string) => {
    if (!voiceEnabled || isSpeakingRef.current) return;

    const clean = text
      .replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1")
      .replace(/#+\s/g, "").replace(/`{1,3}[^`]*`{1,3}/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\n{2,}/g, ". ").replace(/\n/g, " ")
      .trim().slice(0, 500);

    if (!clean) return;

    isSpeakingRef.current = true;
    setIsSpeaking(true);
    onStateChange("speaking");

    if (ttsQuotaExceeded) { speakWithBrowser(clean); return; }

    // Resolve voice: custom clone or preset
    const effectiveVoice = (selectedVoice === "custom" && cloneVoiceId)
      ? cloneVoiceId
      : (selectedVoice === "custom" ? "loongstella_v2" : selectedVoice);

    try {
      const { data, error } = await supabase.functions.invoke("text-to-speech", {
        body: { text: clean, voice: effectiveVoice, speed: 1.0 },
      });

      if (data?.quota_exceeded || (error as { status?: number } | null)?.status === 429) {
        setTtsQuotaExceeded(true);
        onQuotaExceeded?.();
        speakWithBrowser(clean);
        return;
      }

      if (error || !data?.audio) throw new Error("TTS failed");

      const binary = atob(data.audio);
      const bytes  = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "audio/mp3" });
      const url  = URL.createObjectURL(blob);

      const ctx     = getAudioCtx();
      const audio   = new Audio(url);
      audio.crossOrigin = "anonymous";
      ttsAudioRef.current = audio;

      // Connect to analyser for lip-sync
      const source   = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      ttsSourceRef.current  = source;
      ttsAnalyserRef.current = analyser;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        isSpeakingRef.current  = false;
        setIsSpeaking(false);
        onStateChange("idle");
        ttsSourceRef.current   = null;
        ttsAnalyserRef.current = null;
      };
      audio.onerror = () => { URL.revokeObjectURL(url); throw new Error("audio error"); };
      await audio.play();
    } catch (_e) {
      try { speakWithBrowser(clean); }
      catch (_e2) {
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        onStateChange("idle");
      }
    }
  }, [voiceEnabled, selectedVoice, cloneVoiceId, ttsQuotaExceeded, onStateChange, onQuotaExceeded, speakWithBrowser, getAudioCtx]);

  const stopSpeaking = useCallback(() => {
    ttsAudioRef.current?.pause();
    window.speechSynthesis?.cancel();
    isSpeakingRef.current  = false;
    setIsSpeaking(false);
    onStateChange("idle");
  }, [onStateChange]);

  // ── Voice clone recording ─────────────────────────────────────────────────
  const startCloneRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      cloneChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) cloneChunksRef.current.push(e.data); };
      mediaRecorderRef.current = mr;
      mr.start(200);
      setIsRecordingClone(true);
    } catch (_e) {
      console.error("Microphone access denied for cloning");
    }
  }, []);

  const stopCloneRecording = useCallback(async (): Promise<void> => {
    return new Promise((resolve) => {
      const mr = mediaRecorderRef.current;
      if (!mr) { resolve(); return; }
      mr.onstop = async () => {
        setIsRecordingClone(false);
        setIsCloning(true);
        setCloneProgress(0);

        try {
          const blob   = new Blob(cloneChunksRef.current, { type: "audio/webm" });
          // Simulate progress
          const timer = setInterval(() => setCloneProgress(p => Math.min(p + 15, 90)), 400);

          const formData = new FormData();
          formData.append("audio", blob, "clone_sample.webm");

          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-clone-register`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${session?.access_token}` },
              body: formData,
            }
          );
          clearInterval(timer);

          if (res.ok) {
            const json = await res.json();
            if (json.voice_id) {
              setCloneVoiceId(json.voice_id);
              setSelectedVoice("custom");
              setCloneProgress(100);
            }
          }
        } catch (_e) {
          console.error("Voice clone failed");
        } finally {
          setIsCloning(false);
          mr.stream.getTracks().forEach(t => t.stop());
          resolve();
        }
      };
      mr.stop();
    });
  }, []);

  return {
    isListening,
    isSpeaking,
    ttsQuotaExceeded,
    selectedVoice,
    setSelectedVoice,
    cloneVoiceId,
    isCloning,
    cloneProgress,
    isRecordingClone,
    getAnalyser,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    startCloneRecording,
    stopCloneRecording,
  };
}
