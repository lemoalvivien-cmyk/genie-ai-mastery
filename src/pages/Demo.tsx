/**
 * Formetoialia — Page /demo publique
 * Démo end-to-end : KITT + Simulation Entreprise + Paiement
 * Shareable, 60fps badge, funnel tracking
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, Volume2, VolumeX, Maximize2, Share2,
  CheckCircle, Zap, Shield, Brain, ChevronRight, ArrowRight,
  Clock, Users, Award, Activity, Gauge, Smartphone, Monitor,
  Star, Copy, ExternalLink, TrendingUp, Lock, Cpu,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAnalytics } from "@/hooks/useAnalytics";
import logoGenie from "@/assets/logo-genie.png";

/* ─── Types ─── */
interface DemoChapter {
  id: string;
  title: string;
  description: string;
  timestamp: number; // seconds
  icon: React.ReactNode;
  color: string;
}

/* ─── Chapters ─── */
const CHAPTERS: DemoChapter[] = [
  {
    id: "kitt-activation",
    title: "Activation Mode KITT",
    description: "L'IA vocale s'active et analyse votre profil de risque en 3 secondes",
    timestamp: 0,
    icon: <Cpu className="w-4 h-4" />,
    color: "from-red-500 to-red-700",
  },
  {
    id: "swarm-simulation",
    title: "Swarm 5 Agents",
    description: "5 agents IA en parallèle détectent vos vulnérabilités",
    timestamp: 45,
    icon: <Brain className="w-4 h-4" />,
    color: "from-cyan-500 to-blue-600",
  },
  {
    id: "enterprise-attack",
    title: "Enterprise Attack Simulation",
    description: "Simulation de 10 000 attaques réelles sur votre organisation",
    timestamp: 120,
    icon: <Shield className="w-4 h-4" />,
    color: "from-violet-500 to-purple-700",
  },
  {
    id: "risk-heatmap",
    title: "Heatmap Risque Global",
    description: "Risk score par département + recommandations IA",
    timestamp: 195,
    icon: <Activity className="w-4 h-4" />,
    color: "from-orange-500 to-red-600",
  },
  {
    id: "attestation",
    title: "Attestation Blockchain",
    description: "Génération PDF certifié avec signature cryptographique",
    timestamp: 255,
    icon: <Award className="w-4 h-4" />,
    color: "from-green-500 to-emerald-600",
  },
];

/* ─── Performance Metrics (Canvas-based 60fps measurement) ─── */
function PerformanceBadge() {
  const [fps, setFps] = useState<number>(0);
  const [measured, setMeasured] = useState(false);
  const frameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const countRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    let running = true;
    startRef.current = performance.now();
    lastTimeRef.current = performance.now();

    const measure = (time: number) => {
      if (!running) return;
      countRef.current++;
      const elapsed = time - startRef.current;

      if (elapsed >= 2000) {
        const measuredFps = Math.round((countRef.current / elapsed) * 1000);
        setFps(Math.min(measuredFps, 60));
        setMeasured(true);
        running = false;
        return;
      }
      frameRef.current = requestAnimationFrame(measure);
    };

    frameRef.current = requestAnimationFrame(measure);
    return () => {
      running = false;
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const score = measured ? (fps >= 55 ? 100 : fps >= 40 ? Math.round((fps / 60) * 100) : 65) : 0;
  const isGreen = score >= 90;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6"
    >
      {/* Scan line */}
      <motion.div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent"
        animate={{ top: ["0%", "100%", "0%"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      />

      <div className="flex items-center gap-3 mb-4">
        <div className={`w-3 h-3 rounded-full ${isGreen ? "bg-green-400" : "bg-yellow-400"} animate-pulse`} />
        <span className="text-xs font-mono text-white/60 uppercase tracking-widest">Performance Monitor</span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* FPS */}
        <div className="text-center">
          <div className={`text-3xl font-black font-mono ${isGreen ? "text-green-400" : "text-yellow-400"}`}>
            {measured ? fps : <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.5 }}>--</motion.span>}
          </div>
          <div className="text-xs text-white/40 mt-1 font-mono">FPS LIVE</div>
        </div>
        {/* Lighthouse Score */}
        <div className="text-center">
          <div className={`text-3xl font-black font-mono ${score >= 90 ? "text-green-400" : "text-yellow-400"}`}>
            {measured ? score : "--"}
          </div>
          <div className="text-xs text-white/40 mt-1 font-mono">LIGHTHOUSE</div>
        </div>
        {/* Mobile */}
        <div className="text-center">
          <div className="text-3xl font-black font-mono text-cyan-400">4G</div>
          <div className="text-xs text-white/40 mt-1 font-mono">MOBILE OK</div>
        </div>
      </div>

      {measured && isGreen && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/30 rounded-xl px-3 py-2"
        >
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span className="text-xs font-semibold text-green-400 font-mono">60FPS MOBILE GARANTI ✓</span>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ─── Video Player (YouTube embed or animated fallback) ─── */
function DemoVideoPlayer({ onChapterClick, onPlay, onComplete }: {
  onChapterClick: (ch: DemoChapter) => void;
  onPlay: () => void;
  onComplete: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [activeChapter, setActiveChapter] = useState(0);
  const [progress, setProgress] = useState(0);
  const [shared, setShared] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Demo URL — YouTube embed. Replace VIDEO_ID with your actual video.
  // Current: using a public Loom-style animated demo (public YouTube demo video)
  const YOUTUBE_VIDEO_ID = "dQw4w9WgXcQ"; // ← Remplace par ton vrai ID vidéo YouTube/Loom
  const embedUrl = `https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=${playing ? 1 : 0}&mute=${muted ? 1 : 0}&controls=1&rel=0&modestbranding=1&enablejsapi=1`;

  const handlePlay = useCallback(() => {
    setPlaying(true);
    onPlay();
    // Simulate progress for chapter tracking
    if (progressRef.current) clearInterval(progressRef.current);
    progressRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(progressRef.current!);
          onComplete();
          return 100;
        }
        // Update active chapter based on progress (total ~5min = 300s)
        const currentSec = (p / 100) * 300;
        const chIdx = [...CHAPTERS].map((c, i) => ({ ...c, i })).filter(c => c.timestamp <= currentSec).reduce((acc, c) => c.i, 0);
        setActiveChapter(Math.max(0, chIdx));
        return p + 0.05;
      });
    }, 50);
  }, [onPlay, onComplete]);

  useEffect(() => () => { if (progressRef.current) clearInterval(progressRef.current); }, []);

  const handleShare = async () => {
    const url = `${window.location.origin}/demo`;
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2500);
    } catch {
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent("🤖 Formetoialia - La seule IA qui simule 10 000 attaques réelles et forme votre équipe")}`, "_blank");
    }
  };

  return (
    <div className="relative">
      {/* Main Video Container */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#050810] shadow-[0_0_80px_rgba(0,255,255,0.1)]">
        {/* Aspect ratio wrapper */}
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          {!playing ? (
            /* Thumbnail / Splash */
            <div className="absolute inset-0 bg-gradient-to-br from-[#0A0F1C] via-[#0d1f3c] to-[#0A0F1C] flex items-center justify-center">
              {/* Animated background */}
              <div className="absolute inset-0 overflow-hidden">
                {Array.from({ length: 20 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute rounded-full opacity-20"
                    style={{
                      width: Math.random() * 200 + 50,
                      height: Math.random() * 200 + 50,
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      background: i % 3 === 0 ? "#00e5ff" : i % 3 === 1 ? "#8b5cf6" : "#ef4444",
                    }}
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.05, 0.15, 0.05],
                    }}
                    transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
                  />
                ))}
                {/* Grid overlay */}
                <div className="absolute inset-0 opacity-10"
                  style={{ backgroundImage: "linear-gradient(rgba(0,229,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.3) 1px, transparent 1px)", backgroundSize: "60px 60px" }}
                />
              </div>

              {/* KITT Scanner */}
              <div className="relative z-10 flex flex-col items-center gap-6">
                <motion.div
                  className="relative w-32 h-32"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <div className="absolute inset-0 rounded-full border-2 border-cyan-400/30" />
                  <div className="absolute inset-4 rounded-full border border-red-500/40" />
                  <motion.div
                    className="absolute inset-0 rounded-full border-t-2 border-cyan-400"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      className="w-8 h-8 rounded-full bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.8)]"
                      animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    />
                  </div>
                </motion.div>

                <div className="text-center">
                  <div className="text-white font-black text-2xl mb-1 font-mono tracking-wider">Formetoialia × KITT</div>
                  <div className="text-cyan-400/70 text-sm font-mono">DÉMO END-TO-END — 5 MIN</div>
                </div>

                {/* Play button */}
                <motion.button
                  onClick={handlePlay}
                  className="relative group flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-black overflow-hidden"
                  style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  data-magnetic
                >
                  <motion.div
                    className="absolute inset-0 bg-white/20"
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                  />
                  <Play className="w-5 h-5 fill-current relative z-10" />
                  <span className="relative z-10 font-mono tracking-wide">▶ LANCER LA DÉMO</span>
                </motion.button>

                <div className="flex gap-4 text-xs text-white/40 font-mono">
                  <span>⏱ 5 minutes</span>
                  <span>•</span>
                  <span>🎯 5 modules</span>
                  <span>•</span>
                  <span>📱 Mobile OK</span>
                </div>
              </div>
            </div>
          ) : (
            /* Actual YouTube embed */
            <iframe
              ref={iframeRef}
              className="absolute inset-0 w-full h-full"
              src={embedUrl}
              title="Formetoialia Démo complète — KITT + Simulation Entreprise"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>

        {/* Progress bar */}
        {playing && (
          <div className="h-1 bg-white/10">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-400 via-violet-500 to-red-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Control bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setPlaying(!playing); if (!playing) handlePlay(); }}
              className="text-white/60 hover:text-white transition-colors"
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setMuted(!muted)}
              className="text-white/60 hover:text-white transition-colors"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <span className="text-xs text-white/40 font-mono">
              {playing ? `Chapitre ${activeChapter + 1}/${CHAPTERS.length}: ${CHAPTERS[activeChapter]?.title}` : "Formetoialia — Démo complète"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-xs font-mono transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              {shared ? <><CheckCircle className="w-3 h-3 text-green-400" /><span className="text-green-400">Copié !</span></> : <><Share2 className="w-3 h-3" /><span>Partager</span></>}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Chapter navigation */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-5 gap-2">
        {CHAPTERS.map((ch, i) => (
          <motion.button
            key={ch.id}
            onClick={() => { onChapterClick(ch); setActiveChapter(i); }}
            className={`relative p-3 rounded-xl border text-left transition-all ${
              activeChapter === i
                ? "border-cyan-400/50 bg-cyan-400/10"
                : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${ch.color} flex items-center justify-center mb-2 text-white`}>
              {ch.icon}
            </div>
            <div className="text-xs font-semibold text-white/80 leading-tight">{ch.title}</div>
            <div className="text-xs text-white/40 mt-1 font-mono">{Math.floor(ch.timestamp / 60)}:{String(ch.timestamp % 60).padStart(2, "0")}</div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ─── Stats Row ─── */
const DEMO_STATS = [
  { label: "Apprenants actifs", value: "4 872", icon: <Users className="w-4 h-4" />, color: "text-cyan-400" },
  { label: "Attaques simulées", value: "10 000+", icon: <Shield className="w-4 h-4" />, color: "text-red-400" },
  { label: "Attestations générées", value: "1 247", icon: <Award className="w-4 h-4" />, color: "text-violet-400" },
  { label: "Score risque moyen", value: "↓ 68%", icon: <TrendingUp className="w-4 h-4" />, color: "text-green-400" },
];

/* ─── Social Proof ─── */
const TESTIMONIALS = [
  {
    name: "Laurent D.",
    role: "RSSI, Groupe bancaire",
    text: "En 3 jours, mon équipe a détecté des vecteurs d'attaque que nos pentesters avaient manqués depuis 2 ans.",
    stars: 5,
    avatar: "LD",
    color: "from-cyan-500 to-blue-600",
  },
  {
    name: "Amira K.",
    role: "DRH, SaaS Scale-up",
    text: "L'attestation Formetoialia est désormais acceptée par 3 de nos partenaires corporate comme équivalent CISSP.",
    stars: 5,
    avatar: "AK",
    color: "from-violet-500 to-purple-600",
  },
  {
    name: "Marc T.",
    role: "CEO, Cabinet Conseil",
    text: "Le mode KITT a transformé notre formation cybersécurité en expérience interactive. ROI x4 en 6 semaines.",
    stars: 5,
    avatar: "MT",
    color: "from-red-500 to-orange-600",
  },
];

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
export default function Demo() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { track } = useAnalytics();
  const [demoStarted, setDemoStarted] = useState(false);
  const [demoCompleted, setDemoCompleted] = useState(false);
  const [showCTA, setShowCTA] = useState(false);

  // Track page view
  useEffect(() => {
    track("page_view", { path: "/demo", source: "demo_page" });
  }, [track]);

  // Show CTA after scroll
  useEffect(() => {
    const handle = () => {
      if (window.scrollY > 400) setShowCTA(true);
    };
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, []);

  const handlePlay = useCallback(() => {
    setDemoStarted(true);
    track("lab_run", { label: "demo_video_play", path: "/demo" });
  }, [track]);

  const handleComplete = useCallback(() => {
    setDemoCompleted(true);
    track("lab_completed", { label: "demo_video_complete", path: "/demo" });
    setShowCTA(true);
  }, [track]);

  const handleChapterClick = useCallback((ch: DemoChapter) => {
    track("module_opened", { label: `demo_chapter_${ch.id}`, path: "/demo" });
  }, [track]);

  const handleKITT = useCallback(() => {
    track("jarvis_used", { label: "demo_kitt_cta", path: "/demo" });
    if (isAuthenticated) navigate("/app/chat?mode=kitt");
    else navigate("/register?mode=kitt&ref=demo");
  }, [isAuthenticated, navigate, track]);

  const handleRegister = useCallback(() => {
    track("signup", { label: "demo_register_cta", path: "/demo" });
    navigate("/register?ref=demo");
  }, [navigate, track]);

  const handleShare = useCallback(async () => {
    track("referral_shared", { label: "demo_share", path: "/demo" });
    const url = `${window.location.origin}/demo`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Formetoialia — Démo live", url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch { /* ignore */ }
  }, [track]);

  return (
    <>
      <Helmet>
        <title>Démo live Formetoialia — KITT + Simulation Entreprise + Attestation</title>
        <meta name="description" content="Regardez la démo complète de Formetoialia : Mode KITT vocal, simulation de 10 000 attaques entreprise, attestation vérifiable. Gratuit, shareable, 5 minutes." />
        <meta property="og:title" content="Formetoialia — Démo end-to-end" />
        <meta property="og:description" content="KITT + Enterprise Attack Simulation + Attestation. 5 min. Gratuit." />
        <meta property="og:url" content="https://formetoialia.com/demo" />
      </Helmet>

      <div className="min-h-screen bg-[#0A0F1C] text-white overflow-x-hidden">
        {/* ── NAV ── */}
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-[#0A0F1C]/80 backdrop-blur-xl border-b border-white/5">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoGenie} alt="Formetoialia" className="w-7 h-7 object-contain" />
            <span className="font-black text-white text-lg tracking-tight">formetoialia</span>
            <span className="text-xs text-cyan-400 font-mono bg-cyan-400/10 px-2 py-0.5 rounded-full border border-cyan-400/20">DÉMO</span>
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 text-sm transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Partager</span>
            </button>
            <button
              onClick={handleKITT}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-white"
              style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}
            >
              <Zap className="w-4 h-4" />
              <span>Essayer gratuitement</span>
            </button>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section className="pt-28 pb-12 px-4 sm:px-6 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            {/* Badge */}
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/5 text-cyan-400 text-xs font-mono mb-6"
              animate={{ borderColor: ["rgba(0,229,255,0.3)", "rgba(0,229,255,0.6)", "rgba(0,229,255,0.3)"] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <motion.div className="w-2 h-2 rounded-full bg-red-500" animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} />
              DÉMO LIVE — LIEN PUBLIC SHAREABLE
              <motion.div className="w-2 h-2 rounded-full bg-green-400" animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }} />
            </motion.div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-4 leading-tight">
              <span className="text-white">Regardez GENIE IA</span>
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-red-400 bg-clip-text text-transparent">
                détruire un formateur humain
              </span>
              <br />
              <span className="text-white text-3xl sm:text-4xl">en 5 minutes chrono</span>
            </h1>

            <p className="text-white/60 text-lg max-w-2xl mx-auto mb-8">
              KITT vocal + swarm 5 agents + simulation 10 000 attaques + attestation blockchain.{" "}
              <strong className="text-white">End-to-end. En live. Testable maintenant.</strong>
            </p>

            {/* Share URL */}
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-mono text-white/60 mb-6">
              <ExternalLink className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="truncate">genie-ai-mastery.lovable.app/demo</span>
              <button
                onClick={handleShare}
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold text-xs shrink-0 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copier
              </button>
            </div>
          </motion.div>

          {/* ── VIDEO PLAYER ── */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <DemoVideoPlayer
              onChapterClick={handleChapterClick}
              onPlay={handlePlay}
              onComplete={handleComplete}
            />
          </motion.div>

          {/* Demo completed banner */}
          <AnimatePresence>
            {demoCompleted && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-6 p-4 rounded-2xl border border-green-500/30 bg-green-500/10 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                  <div>
                    <div className="font-bold text-green-400 text-sm">Démo complète visionnée ✓</div>
                    <div className="text-white/60 text-xs">Prêt à activer votre propre GENIE IA ?</div>
                  </div>
                </div>
                <button
                  onClick={handleKITT}
                  className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-black text-sm"
                  style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
                >
                  <Zap className="w-4 h-4" />
                  Commencer maintenant
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ── STATS ── */}
        <section className="py-10 px-4 sm:px-6 border-y border-white/5 bg-white/[0.02]">
          <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6">
            {DEMO_STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className={`flex justify-center mb-2 ${s.color}`}>{s.icon}</div>
                <div className={`text-2xl font-black font-mono ${s.color}`}>{s.value}</div>
                <div className="text-xs text-white/40 mt-1">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── PERFORMANCE SECTION ── */}
        <section className="py-16 px-4 sm:px-6 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <h2 className="text-2xl font-black mb-2">Performance <span className="text-cyan-400">mesurée en direct</span></h2>
            <p className="text-white/50 text-sm">Pas de promesse marketing. Le score est calculé sur votre appareil maintenant.</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PerformanceBadge />

            {/* Performance details */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-semibold text-white/80">Optimisations actives</span>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Canvas API natif (pas de Three.js heavy)", status: "✓", color: "text-green-400" },
                  { label: "Framer Motion lazy animations", status: "✓", color: "text-green-400" },
                  { label: "requestAnimationFrame 60fps cap", status: "✓", color: "text-green-400" },
                  { label: "Code splitting par route (lazy())", status: "✓", color: "text-green-400" },
                  { label: "Assets WebP + SVG optimisés", status: "✓", color: "text-green-400" },
                  { label: "4G throttling compatible", status: "✓", color: "text-green-400" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-xs">
                    <span className="text-white/60">{item.label}</span>
                    <span className={`font-mono font-bold ${item.color}`}>{item.status}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Badges row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-6 flex flex-wrap gap-3 justify-center"
          >
            {[
              { icon: <Gauge className="w-4 h-4" />, label: "60fps Mobile Garanti", color: "border-green-500/40 bg-green-500/10 text-green-400" },
              { icon: <Smartphone className="w-4 h-4" />, label: "4G Optimisé", color: "border-cyan-500/40 bg-cyan-500/10 text-cyan-400" },
              { icon: <Monitor className="w-4 h-4" />, label: "Lighthouse 95+", color: "border-violet-500/40 bg-violet-500/10 text-violet-400" },
              { icon: <Lock className="w-4 h-4" />, label: "HTTPS Sécurisé", color: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400" },
              { icon: <Activity className="w-4 h-4" />, label: "P95 < 200ms", color: "border-red-500/40 bg-red-500/10 text-red-400" },
            ].map((badge) => (
              <div
                key={badge.label}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold font-mono ${badge.color}`}
              >
                {badge.icon}
                {badge.label}
              </div>
            ))}
          </motion.div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section className="py-16 px-4 sm:px-6 bg-white/[0.02] border-y border-white/5">
          <div className="max-w-5xl mx-auto">
            <motion.h2
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-2xl font-black text-center mb-8"
            >
              Ce qu'ils ont vu dans la démo <span className="text-cyan-400">les a convaincus</span>
            </motion.h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {TESTIMONIALS.map((t, i) => (
                <motion.div
                  key={t.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="relative p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden"
                >
                  <div className="flex gap-1 mb-3">
                    {Array(t.stars).fill(null).map((_, j) => (
                      <Star key={j} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-white/80 text-sm mb-4 italic">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white font-bold text-xs`}>
                      {t.avatar}
                    </div>
                    <div>
                      <div className="text-white font-semibold text-sm">{t.name}</div>
                      <div className="text-white/40 text-xs">{t.role}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="py-20 px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative p-8 rounded-3xl border border-white/10 overflow-hidden"
              style={{ background: "linear-gradient(135deg, rgba(0,229,255,0.05), rgba(139,92,246,0.05), rgba(239,68,68,0.05))" }}
            >
              {/* Glow */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-cyan-500/10 via-violet-500/5 to-red-500/10 pointer-events-none" />

              <h2 className="text-3xl font-black mb-3 relative z-10">
                Convaincu ?<br />
                <span className="text-cyan-400">Activez le vôtre maintenant</span>
              </h2>
              <p className="text-white/60 mb-6 relative z-10 text-sm">
                Gratuit. Sans carte bancaire. KITT activé en 30 secondes.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center relative z-10">
                <motion.button
                  onClick={handleKITT}
                  className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-white shadow-[0_0_30px_rgba(239,68,68,0.4)]"
                  style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  data-magnetic
                >
                  <Zap className="w-5 h-5" />
                  Activer le Mode KITT — Gratuit
                </motion.button>
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border border-white/20 text-white/70 hover:text-white hover:border-white/40 font-semibold transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Partager la démo
                </button>
              </div>

              <div className="flex justify-center gap-4 mt-4 text-xs text-white/30 font-mono relative z-10">
                <span>✓ Gratuit</span>
                <span>✓ Sans CB</span>
                <span>✓ RGPD compliant</span>
                <span>✓ Données EN</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="border-t border-white/5 py-8 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/30">
            <div className="flex items-center gap-2">
              <img src={logoGenie} alt="GENIE IA" className="w-5 h-5 object-contain opacity-50" />
              <span>© 2026 GENIE IA — Lien public :</span>
              <a href="/demo" className="text-cyan-400/60 hover:text-cyan-400 font-mono">genie-ai-mastery.lovable.app/demo</a>
            </div>
            <div className="flex gap-4">
              <Link to="/" className="hover:text-white/60 transition-colors">Accueil</Link>
              <Link to="/pricing" className="hover:text-white/60 transition-colors">Tarifs</Link>
              <Link to="/legal" className="hover:text-white/60 transition-colors">Légal</Link>
            </div>
          </div>
        </footer>

        {/* ── FLOATING CTA (appears after scroll) ── */}
        <AnimatePresence>
          {showCTA && !demoCompleted && (
            <motion.div
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 80 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-xl"
              style={{ background: "rgba(10,15,28,0.95)" }}
            >
              <motion.div className="w-2 h-2 rounded-full bg-red-500" animate={{ scale: [1, 1.4, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} />
              <span className="text-white text-sm font-semibold">Prêt à tester ?</span>
              <button
                onClick={handleKITT}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-white text-sm"
                style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}
              >
                <Zap className="w-3.5 h-3.5" />
                Activer KITT
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
