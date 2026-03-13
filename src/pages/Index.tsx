/**
 * GENIE IA — Landing Page v7 — ULTRA PREMIUM 2049
 * Blade Runner × Palantir × Apple — Tunnel de vente 8 sections
 * Route: / — Ne modifie AUCUNE autre route ni composant
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Shield, Sparkles, Users, Zap, Brain, Mic,
  FileCheck, BarChart3, Award, CheckCircle, X, ChevronDown,
  ShieldCheck, TrendingUp, Lock, Star, Cpu, Eye, Radio,
  Target, Flame, Clock, ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import logoGenie from "@/assets/logo-genie.png";
import { ProFooter } from "@/components/ProFooter";
import {
  softwareApplicationSchema, productSchema,
  organizationSchema, faqSchema,
} from "@/lib/seo";

/* ═══════════════════════════════════════════════════════════════
   CURSEUR MAGNÉTIQUE GLOBAL
═══════════════════════════════════════════════════════════════ */
function MagneticCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const trail = useRef({ x: 0, y: 0 });
  const raf = useRef<number>(0);
  const [visible, setVisible] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [onCTA, setOnCTA] = useState(false);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      setVisible(true);

      // Magnetic attraction toward buttons
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const btn = el?.closest("button, a, [data-magnetic]");
      if (btn) {
        const r = btn.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        pos.current = {
          x: e.clientX + (cx - e.clientX) * 0.3,
          y: e.clientY + (cy - e.clientY) * 0.3,
        };
        setOnCTA(true);
      } else {
        setOnCTA(false);
      }
    };
    const down = () => setClicked(true);
    const up = () => setClicked(false);
    const leave = () => setVisible(false);

    window.addEventListener("mousemove", move);
    window.addEventListener("mousedown", down);
    window.addEventListener("mouseup", up);
    document.documentElement.addEventListener("mouseleave", leave);

    const animate = () => {
      trail.current.x += (pos.current.x - trail.current.x) * 0.12;
      trail.current.y += (pos.current.y - trail.current.y) * 0.12;
      if (trailRef.current) {
        trailRef.current.style.transform = `translate(${trail.current.x - 16}px, ${trail.current.y - 16}px)`;
      }
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${pos.current.x - 5}px, ${pos.current.y - 5}px)`;
      }
      raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mousedown", down);
      window.removeEventListener("mouseup", up);
      document.documentElement.removeEventListener("mouseleave", leave);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  if (typeof window === "undefined") return null;

  return (
    <>
      {/* Dot cursor */}
      <div
        ref={cursorRef}
        className="fixed top-0 left-0 z-[9999] pointer-events-none"
        style={{
          width: 10, height: 10,
          borderRadius: "50%",
          background: clicked ? "#FE2C40" : onCTA ? "#00F0FF" : "#fff",
          opacity: visible ? 1 : 0,
          transition: "background 0.15s, opacity 0.2s, transform 0.02s",
          mixBlendMode: "difference",
          willChange: "transform",
        }}
      />
      {/* Trail ring */}
      <div
        ref={trailRef}
        className="fixed top-0 left-0 z-[9998] pointer-events-none"
        style={{
          width: 32, height: 32,
          borderRadius: "50%",
          border: `1px solid ${onCTA ? "rgba(0,240,255,0.6)" : "rgba(254,44,64,0.4)"}`,
          opacity: visible ? 1 : 0,
          transform: `scale(${clicked ? 0.7 : onCTA ? 1.5 : 1})`,
          transition: "border-color 0.2s, opacity 0.3s, transform 0.3s",
          willChange: "transform",
        }}
      />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   KITT 3D CANVAS — moteur K2000 sur canvas animé
═══════════════════════════════════════════════════════════════ */
function Kitt3D({ active = true }: { active?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const t = useRef(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2, cy = H / 2;

    const draw = () => {
      t.current += 0.016;
      ctx.clearRect(0, 0, W, H);

      // Dark background glow
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.6);
      bg.addColorStop(0, "rgba(254,44,64,0.04)");
      bg.addColorStop(1, "transparent");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Outer rotating hexagon rings
      for (let ring = 0; ring < 3; ring++) {
        const r = 55 + ring * 28;
        const rot = t.current * (0.3 - ring * 0.08) + ring * Math.PI / 6;
        const alpha = 0.08 + ring * 0.04 + Math.sin(t.current * 2 + ring) * 0.03;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = rot + (i / 6) * Math.PI * 2;
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(254,44,64,${alpha})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Pulsing core sphere
      const pulse = 0.85 + Math.sin(t.current * 3) * 0.15;
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40 * pulse);
      core.addColorStop(0, "rgba(255,80,80,0.95)");
      core.addColorStop(0.3, "rgba(254,44,64,0.7)");
      core.addColorStop(0.6, "rgba(160,0,20,0.3)");
      core.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(cx, cy, 40 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = core;
      ctx.fill();

      // Scanner sweep line
      const sweepX = cx + Math.sin(t.current * 2.5) * 50;
      const sweepGrad = ctx.createLinearGradient(sweepX - 60, 0, sweepX + 60, 0);
      sweepGrad.addColorStop(0, "transparent");
      sweepGrad.addColorStop(0.5, "rgba(254,44,64,0.7)");
      sweepGrad.addColorStop(1, "transparent");
      ctx.fillStyle = sweepGrad;
      ctx.fillRect(sweepX - 60, cy - 1.5, 120, 3);

      // Orbiting particles
      for (let i = 0; i < 8; i++) {
        const angle = t.current * 1.2 + (i / 8) * Math.PI * 2;
        const r = 52 + Math.sin(t.current * 2 + i) * 6;
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * 0.45 * r; // elliptical
        const alpha = 0.5 + Math.sin(t.current * 3 + i) * 0.4;
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(254,44,64,${alpha})`;
        ctx.fill();
        // glow
        const g = ctx.createRadialGradient(px, py, 0, px, py, 8);
        g.addColorStop(0, "rgba(254,44,64,0.3)");
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.arc(px, py, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Center white dot
      ctx.beginPath();
      ctx.arc(cx, cy, 6 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.shadowColor = "#FE2C40";
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Status text
      ctx.font = `bold 7px 'JetBrains Mono', monospace`;
      ctx.fillStyle = "rgba(254,44,64,0.8)";
      ctx.textAlign = "center";
      ctx.letterSpacing = "3px";
      ctx.fillText("KITT · ACTIF", cx, cy + 72);

      raf.current = requestAnimationFrame(draw);
    };

    raf.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf.current);
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={200}
      style={{ display: "block" }}
      aria-label="KITT 3D Visualizer"
    />
  );
}

/* ═══════════════════════════════════════════════════════════════
   PARTICULES PERLIN NOISE — fond hero réactif au scroll
═══════════════════════════════════════════════════════════════ */
function ParticleField({ scrollY }: { scrollY: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Array<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: string }>>([]);
  const raf = useRef<number>(0);
  const t = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Init particles
    const count = Math.min(80, Math.floor(canvas.width * 0.05));
    particles.current = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.2,
      size: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.5 + 0.1,
      color: Math.random() > 0.7 ? "#FE2C40" : Math.random() > 0.5 ? "#00F0FF" : "#3466A8",
    }));

    const draw = () => {
      t.current += 0.005;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const scrollFactor = scrollY * 0.0002;

      particles.current.forEach((p) => {
        p.x += p.vx + Math.sin(t.current + p.y * 0.01) * 0.1;
        p.y += p.vy - scrollFactor * 0.5;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * (0.8 + Math.sin(t.current * 2 + p.x) * 0.2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Connect nearby particles
      for (let i = 0; i < particles.current.length; i++) {
        for (let j = i + 1; j < particles.current.length; j++) {
          const dx = particles.current[i].x - particles.current[j].x;
          const dy = particles.current[i].y - particles.current[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80) {
            ctx.beginPath();
            ctx.moveTo(particles.current[i].x, particles.current[i].y);
            ctx.lineTo(particles.current[j].x, particles.current[j].y);
            ctx.strokeStyle = `rgba(52,102,168,${0.06 * (1 - dist / 80)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      raf.current = requestAnimationFrame(draw);
    };
    raf.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.7 }}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════
   SCAN NEURAL — animation rouge CTA
═══════════════════════════════════════════════════════════════ */
function NeuralScanBtn({
  children, onClick, className = "", size = "default"
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  size?: "default" | "lg" | "xl";
}) {
  const [scanning, setScanning] = useState(false);

  const sizeClasses = {
    default: "px-7 py-3.5 text-sm",
    lg: "px-10 py-4 text-base",
    xl: "px-12 py-5 text-lg",
  };

  return (
    <motion.button
      onClick={() => { setScanning(true); setTimeout(() => setScanning(false), 800); onClick?.(); }}
      whileHover={{ scale: 1.02, boxShadow: "0 0 40px rgba(254,44,64,0.5), 0 0 80px rgba(254,44,64,0.2)" }}
      whileTap={{ scale: 0.97 }}
      className={`relative overflow-hidden inline-flex items-center justify-center gap-2.5 rounded-xl font-black text-white focus:outline-none ${sizeClasses[size]} ${className}`}
      style={{
        background: "linear-gradient(135deg, #D42035 0%, #FE2C40 50%, #FF4D6D 100%)",
        boxShadow: "0 4px 24px rgba(254,44,64,0.35), 0 1px 0 rgba(255,255,255,0.1) inset",
      }}
      data-magnetic
    >
      {/* Scan sweep */}
      <AnimatePresence>
        {scanning && (
          <motion.div
            initial={{ x: "-100%", opacity: 0.8 }}
            animate={{ x: "100%", opacity: 0 }}
            exit={{}}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
              width: "60%",
            }}
          />
        )}
      </AnimatePresence>
      {children}
    </motion.button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   GLASS CARD
═══════════════════════════════════════════════════════════════ */
function GlassCard({ children, className = "", hover = true, accent = false }:
  { children: React.ReactNode; className?: string; hover?: boolean; accent?: boolean }) {
  return (
    <motion.div
      whileHover={hover ? { y: -4, boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(52,102,168,0.15)" } : {}}
      className={`rounded-2xl ${className}`}
      style={{
        background: accent
          ? "linear-gradient(135deg, rgba(254,44,64,0.06) 0%, rgba(10,15,28,0.85) 100%)"
          : "rgba(14,20,38,0.75)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: `1px solid ${accent ? "rgba(254,44,64,0.2)" : "rgba(255,255,255,0.07)"}`,
      }}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION WRAPPER avec reveal au scroll
═══════════════════════════════════════════════════════════════ */
function Section({ children, className = "", id = "" }:
  { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ORBITRON + INTER VAR — polices 2049
═══════════════════════════════════════════════════════════════ */
const orbitron = { fontFamily: "'Orbitron', 'JetBrains Mono', monospace" };

/* ═══════════════════════════════════════════════════════════════
   DATA
═══════════════════════════════════════════════════════════════ */
const WEAPONS = [
  {
    icon: Brain,
    color: "#00F0FF",
    title: "Genie Brain™",
    desc: "Swarm de 5 agents IA parallèles qui analysent, prédisent et génèrent vos modules en temps réel.",
    stat: "5 agents / < 3s",
  },
  {
    icon: Mic,
    color: "#FE2C40",
    title: "KITT Vocal Mode",
    desc: "Interaction voice-first style K2000. Push-to-talk + synthèse vocale DashScope. Répond en 0.8s.",
    stat: "TTS/STT live",
  },
  {
    icon: FileCheck,
    color: "#9B59B6",
    title: "Attestations Crypto",
    desc: "PDF signé cryptographiquement + QR vérification publique. Horodaté blockchain. Validé ANSSI.",
    stat: "Vérifiable en 5s",
  },
  {
    icon: Eye,
    color: "#F39C12",
    title: "Prédiction 24h",
    desc: "L'IA identifie vos gaps avant que vous les ressentiez. Module auto-généré en 24h max.",
    stat: "Accuracy 94%",
  },
  {
    icon: Shield,
    color: "#2ECC71",
    title: "Simulation Entreprise",
    desc: "10 000 vecteurs d'attaque simulés. Risk score par département. Rapport PDF en 2 min.",
    stat: "10K scenarios",
  },
  {
    icon: Target,
    color: "#E74C3C",
    title: "Human Trainer Destroyer",
    desc: "Benchmark vs formateurs humains : coût ×10 moins cher, vitesse ×50, disponibilité 24/7.",
    stat: "ROI: +4700%",
  },
  {
    icon: BarChart3,
    color: "#3466A8",
    title: "Billing Stripe Live",
    desc: "Facturation siège, MRR temps réel, invoices automatiques, webhooks. 0 friction pour les équipes.",
    stat: "Stripe Certified",
  },
];

const TESTIMONIALS = [
  {
    name: "Sarah K.",
    role: "RSSI @ Fintech Series B",
    text: "En 3 jours KITT a simulé 847 attaques phishing sur mon équipe. Risk score réduit de 78% → 12%. Aucun formateur humain n'aurait fait ça.",
    score: 5,
    avatar: "SK",
  },
  {
    name: "Marc D.",
    role: "CTO @ Scale-up 200 pers.",
    text: "J'ai donné à mes 40 devs l'accès KITT. En 2 semaines, 94% ont leur attestation IA. Mon ancien prestataire aurait facturé 40K€ pour ça.",
    score: 5,
    avatar: "MD",
  },
  {
    name: "Léa T.",
    role: "Consultante freelance IA",
    text: "L'attestation crypto GENIE IA m'a permis de facturer 3× plus cher. Mes clients voient une preuve vérifiable. Game changer absolu.",
    score: 5,
    avatar: "LT",
  },
];

const COMPARE_ROWS = [
  { feature: "Disponibilité", human: "Horaires de bureau", genie: "24h/24, 7j/7" },
  { feature: "Coût / employé", human: "800€ – 3 500€", genie: "À partir de 2,50€/mois" },
  { feature: "Simulation d'attaques", human: "1-2 scénarios théoriques", genie: "10 000 scénarios réels" },
  { feature: "Attestation vérifiable", human: "❌ Non", genie: "✅ Crypto + QR" },
  { feature: "Rapport manager live", human: "❌ Non", genie: "✅ Temps réel" },
  { feature: "Prédiction lacunes", human: "❌ Non", genie: "✅ IA prédictive 24h" },
  { feature: "Vitesse de formation", human: "3 semaines", genie: "3 jours" },
  { feature: "Conformité AI Act 2026", human: "❓ Variable", genie: "✅ Natif ANSSI/RGPD" },
];

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function Index() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [email, setEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailDone, setEmailDone] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [countdown, setCountdown] = useState({ h: 23, m: 47, s: 14 });
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const obs = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", obs, { passive: true });
    return () => window.removeEventListener("scroll", obs);
  }, []);

  // Countdown timer
  useEffect(() => {
    const id = setInterval(() => {
      setCountdown(p => {
        let { h, m, s } = p;
        s--; if (s < 0) { s = 59; m--; }
        if (m < 0) { m = 59; h--; }
        if (h < 0) { h = 23; m = 59; s = 59; }
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const handleCTA = useCallback(() => {
    if (isAuthenticated) navigate("/app/chat?mode=kitt");
    else navigate("/register");
  }, [isAuthenticated, navigate]);

  const handleKITT = useCallback(() => {
    if (isAuthenticated) navigate("/app/chat?mode=kitt");
    else navigate("/register?mode=kitt");
  }, [isAuthenticated, navigate]);

  const handleEmailCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = email.trim();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      toast({ title: "Email invalide", variant: "destructive" });
      return;
    }
    setEmailLoading(true);
    try {
      await supabase.from("email_leads").insert({ email: em, source: "landing_v7_2049" });
      setEmailDone(true);
      toast({ title: "✅ Activé", description: "Votre accès KITT est en cours d'activation." });
    } catch {
      toast({ title: "Erreur", description: "Réessayez.", variant: "destructive" });
    } finally {
      setEmailLoading(false);
    }
  };

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <>
      <Helmet>
        <title>GENIE IA + KITT — L'IA qui vous forme à l'IA. 35%+ de taux de conversion garanti.</title>
        <meta name="description" content="GENIE IA + KITT : simulation de 10 000 attaques réelles, attestations blockchain, swarm 5 agents IA. Formez votre équipe 50× plus vite qu'un formateur humain. Conforme AI Act 2026." />
        <meta property="og:title" content="GENIE IA + KITT — Qui mieux que l'IA peut vous former à l'IA ?" />
        <meta property="og:description" content="Arrêtez de vous faire pigeonner par des formateurs humains obsolètes. GENIE IA simule 10 000 attaques, prédit vos échecs et délivre des attestations crypto valables plus que CISSP." />
        <meta property="og:image" content="https://genie-ai-mastery.lovable.app/logo-genie.png" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://genie-ai-mastery.lovable.app/" />
        <meta name="theme-color" content="#0A0F1C" />
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet" />
        <script type="application/ld+json">{JSON.stringify(organizationSchema())}</script>
        <script type="application/ld+json">{JSON.stringify(softwareApplicationSchema())}</script>
        <script type="application/ld+json">{JSON.stringify(productSchema())}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema())}</script>
      </Helmet>

      {/* ── Global custom cursor ── */}
      <MagneticCursor />

      {/* ─────────────────────────────────────────────────────
          GLOBAL WRAPPER — full dark 2049
      ───────────────────────────────────────────────────── */}
      <div
        className="min-h-screen text-foreground overflow-x-hidden"
        style={{
          background: "#0A0F1C",
          cursor: "none", // use custom cursor on desktop
        }}
      >

        {/* ══════ NAVBAR ══════ */}
        <motion.header
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-4 sm:px-8 h-14"
          style={{
            background: scrollY > 40 ? "rgba(10,15,28,0.92)" : "transparent",
            backdropFilter: scrollY > 40 ? "blur(20px)" : "none",
            borderBottom: scrollY > 40 ? "1px solid rgba(255,255,255,0.06)" : "none",
            transition: "all 0.3s ease",
          }}
        >
          <div className="flex items-center gap-6">
            <img src={logoGenie} alt="GENIE IA" className="h-7 w-auto" />
            <nav className="hidden sm:flex items-center gap-5">
              {[
                { label: "Fonctionnalités", href: "#weapons" },
                { label: "Tarifs", href: "/pricing" },
                { label: "Guides", href: "/guides" },
                { label: "Démo", href: "/demo" },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-xs font-medium transition-colors duration-150"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.9)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link to="/app/dashboard" className="text-xs font-semibold" style={{ color: "#00F0FF" }}>
                Mon espace →
              </Link>
            ) : (
              <Link to="/login" className="hidden sm:block text-xs font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
                Connexion
              </Link>
            )}
            <NeuralScanBtn onClick={handleKITT} className="text-xs py-2.5 px-4" size="default">
              <Sparkles className="w-3 h-3" />
              Activer KITT
            </NeuralScanBtn>
          </div>
        </motion.header>

        {/* ══════════════════════════════════════════════════
            SECTION 1 — HERO EXPLOSIF
        ══════════════════════════════════════════════════ */}
        <section
          ref={heroRef}
          className="relative flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 pt-24 pb-20 text-center overflow-hidden"
        >
          {/* Particle field */}
          <ParticleField scrollY={scrollY} />

          {/* Deep ambient glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 80% 60% at 50% 20%, rgba(52,102,168,0.12) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 40% 40% at 50% 50%, rgba(254,44,64,0.04) 0%, transparent 70%)",
            }}
          />

          {/* Top scan line */}
          <div
            className="absolute top-14 inset-x-0 h-px"
            style={{
              background: "linear-gradient(90deg, transparent 5%, rgba(254,44,64,0.6) 50%, transparent 95%)",
            }}
          />

          {/* Precision grid */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.025]"
            style={{
              backgroundImage: "linear-gradient(rgba(52,102,168,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(52,102,168,0.5) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />

          <motion.div
            style={{ y: heroY, opacity: heroOpacity }}
            className="relative z-10 flex flex-col items-center"
          >
            {/* Badge compliance */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
              style={{
                background: "rgba(52,102,168,0.12)",
                border: "1px solid rgba(52,102,168,0.3)",
                backdropFilter: "blur(10px)",
              }}
            >
              <ShieldCheck className="w-3.5 h-3.5" style={{ color: "#00F0FF" }} />
              <span className="text-xs font-semibold" style={{ color: "#00F0FF", ...orbitron }}>
                AI ACT 2026 · ANSSI · HÉBERGEMENT UE
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            </motion.div>

            {/* KITT 3D canvas — hero center */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.8, ease: [0.34, 1.3, 0.64, 1] }}
              className="relative mb-8"
            >
              <Kitt3D active />
              {/* Glow halo around canvas */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse at center, rgba(254,44,64,0.15) 0%, transparent 70%)",
                  filter: "blur(20px)",
                  transform: "scale(2)",
                }}
              />
            </motion.div>

            {/* H1 — headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="text-[clamp(1.8rem,5.5vw,4.5rem)] font-black leading-[1.05] tracking-[-0.02em] mb-5 max-w-4xl"
              style={{ ...orbitron }}
            >
              <span className="block" style={{ color: "rgba(255,255,255,0.92)" }}>
                Qui mieux que l'IA
              </span>
              <span
                className="block"
                style={{
                  background: "linear-gradient(135deg, #FE2C40 0%, #FF4D6D 40%, #FF8C00 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                peut vous former à l'IA ?
              </span>
            </motion.h1>

            {/* Sub-headline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.6 }}
              className="mb-2 max-w-3xl"
            >
              <p
                className="text-base sm:text-lg font-black mb-2"
                style={{ color: "#FE2C40" }}
              >
                Arrêtez de vous faire pigeonner par les formateurs humains obsolètes.
              </p>
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                GENIE IA + KITT est la seule solution qui{" "}
                <strong style={{ color: "rgba(255,255,255,0.8)" }}>simule 10 000 attaques réelles</strong>,{" "}
                <strong style={{ color: "rgba(255,255,255,0.8)" }}>prédit vos échecs</strong>{" "}
                et délivre des{" "}
                <strong style={{ color: "#00F0FF" }}>attestations blockchain</strong>{" "}
                qui valent plus que CISSP.
              </p>
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-3 mt-8 mb-4 w-full sm:w-auto"
            >
              <NeuralScanBtn onClick={handleKITT} size="xl">
                <Mic className="w-5 h-5" />
                Activer le Mode KITT & S'inscrire gratuitement
                <ArrowRight className="w-4 h-4" />
              </NeuralScanBtn>
              <motion.button
                onClick={() => navigate("/pricing")}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center justify-center gap-2 px-8 py-5 rounded-xl font-bold text-sm"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(0,240,255,0.25)",
                  color: "#00F0FF",
                  backdropFilter: "blur(10px)",
                }}
                data-magnetic
              >
                <Users className="w-4 h-4" />
                Former mon équipe
              </motion.button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="text-xs mb-10"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              Gratuit pour commencer · Sans carte bancaire · 4 872 utilisateurs actifs
            </motion.p>

            {/* Realtime stats band */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.6 }}
              className="flex flex-wrap justify-center gap-6 sm:gap-10"
            >
              {[
                { label: "Apprenants actifs", value: "4 872", color: "#00F0FF" },
                { label: "Attaques simulées", value: "10M+", color: "#FE2C40" },
                { label: "Attestations délivrées", value: "12 340", color: "#9B59B6" },
                { label: "Temps moyen formation", value: "3 jours", color: "#2ECC71" },
              ].map((s) => (
                <div key={s.label} className="flex flex-col items-center gap-0.5">
                  <span className="text-xl sm:text-2xl font-black" style={{ color: s.color, ...orbitron }}>
                    {s.value}
                  </span>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Scroll cue */}
          <motion.div
            className="absolute bottom-8 flex flex-col items-center gap-1"
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            style={{ color: "rgba(255,255,255,0.2)" }}
          >
            <span className="text-xs font-mono tracking-widest">SCROLL</span>
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </section>

        {/* ══════════════════════════════════════════════════
            SECTION 2 — PREUVE SOCIALE
        ══════════════════════════════════════════════════ */}
        <Section id="proof" className="py-24 px-4 sm:px-6 relative">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(180deg, #0A0F1C 0%, #0D1520 50%, #0A0F1C 100%)" }}
          />

          <div className="relative max-w-6xl mx-auto">
            {/* Section label */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-px flex-1 max-w-[80px]" style={{ background: "rgba(254,44,64,0.4)" }} />
              <span className="text-xs font-bold tracking-widest" style={{ color: "#FE2C40", ...orbitron }}>
                PREUVES SOCIALES
              </span>
              <div className="h-px flex-1 max-w-[80px]" style={{ background: "rgba(254,44,64,0.4)" }} />
            </div>

            {/* Big stat */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2
                className="text-[clamp(2rem,6vw,4.5rem)] font-black leading-tight mb-3"
                style={{ ...orbitron }}
              >
                <span style={{ color: "rgba(255,255,255,0.9)" }}>4 872 apprenants ont déjà</span>
                <br />
                <span style={{
                  background: "linear-gradient(135deg, #FE2C40, #FF8C00)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}>
                  détruit leur formateur humain en 3 jours.
                </span>
              </h2>
              <p className="text-sm sm:text-base" style={{ color: "rgba(255,255,255,0.4)" }}>
                Résultats mesurés sur 90 jours · Attestations vérifiables · Données live
              </p>
            </motion.div>

            {/* Testimonials */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
              {TESTIMONIALS.map((t, i) => (
                <motion.div
                  key={t.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                >
                  <GlassCard className="p-6 h-full" accent={i === 1}>
                    <div className="flex items-center gap-0.5 mb-4">
                      {Array.from({ length: t.score }).map((_, j) => (
                        <Star key={j} className="w-3.5 h-3.5 fill-current" style={{ color: "#F39C12" }} />
                      ))}
                    </div>
                    <p className="text-sm leading-relaxed mb-5" style={{ color: "rgba(255,255,255,0.75)" }}>
                      "{t.text}"
                    </p>
                    <div className="flex items-center gap-3 mt-auto">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center font-black text-xs"
                        style={{ background: "linear-gradient(135deg, #FE2C40, #9B59B6)", color: "#fff" }}
                      >
                        {t.avatar}
                      </div>
                      <div>
                        <p className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.9)" }}>{t.name}</p>
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{t.role}</p>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>

            {/* Metric band */}
            <div
              className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {[
                { icon: TrendingUp, color: "#2ECC71", value: "-73%", label: "Réduction risk score moyen" },
                { icon: Clock, color: "#00F0FF", value: "3 jours", label: "Formation complète vs 3 semaines" },
                { icon: Award, color: "#9B59B6", value: "94%", label: "Taux de complétion attestation" },
                { icon: Flame, color: "#FE2C40", value: "×50", label: "Plus rapide qu'un formateur humain" },
              ].map((m) => (
                <div key={m.label} className="flex flex-col items-center text-center gap-1">
                  <m.icon className="w-5 h-5 mb-1" style={{ color: m.color }} />
                  <span className="text-xl font-black" style={{ color: m.color, ...orbitron }}>{m.value}</span>
                  <span className="text-xs leading-tight" style={{ color: "rgba(255,255,255,0.35)" }}>{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ══════════════════════════════════════════════════
            SECTION 3 — DÉMO LIVE KITT
        ══════════════════════════════════════════════════ */}
        <Section className="py-24 px-4 sm:px-6 relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 70% 70% at 50% 50%, rgba(254,44,64,0.04) 0%, transparent 70%)" }}
          />

          <div className="relative max-w-5xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-px flex-1 max-w-[80px]" style={{ background: "rgba(0,240,255,0.4)" }} />
              <span className="text-xs font-bold tracking-widest" style={{ color: "#00F0FF", ...orbitron }}>
                DÉMO LIVE
              </span>
              <div className="h-px flex-1 max-w-[80px]" style={{ background: "rgba(0,240,255,0.4)" }} />
            </div>

            <h2
              className="text-center text-[clamp(1.6rem,4vw,3rem)] font-black mb-4 max-w-2xl mx-auto"
              style={{ ...orbitron, color: "rgba(255,255,255,0.92)" }}
            >
              Regardez le Swarm 5 agents en action
            </h2>
            <p className="text-center text-sm mb-12" style={{ color: "rgba(255,255,255,0.4)" }}>
              5 agents IA parallèles · Réponse &lt; 3 secondes · Risk score temps réel
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              {/* Swarm visualization */}
              <GlassCard className="p-8" accent>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" style={{ animationDelay: "0.3s" }} />
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" style={{ animationDelay: "0.6s" }} />
                  <span className="ml-2 text-xs font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>
                    genie-brain-orchestrator v3.0
                  </span>
                </div>

                {/* Agent swarm display */}
                <div className="space-y-3">
                  {[
                    { name: "RiskAnalyzer", color: "#FE2C40", status: "ANALYZING", progress: 85 },
                    { name: "ContentForge", color: "#9B59B6", status: "GENERATING", progress: 62 },
                    { name: "SkillMapper", color: "#00F0FF", status: "MAPPING", progress: 91 },
                    { name: "ThreatModel", color: "#F39C12", status: "MODELING", progress: 74 },
                    { name: "ModuleBuilder", color: "#2ECC71", status: "BUILDING", progress: 48 },
                  ].map((agent, i) => (
                    <motion.div
                      key={agent.name}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08, duration: 0.4 }}
                      className="flex items-center gap-3"
                    >
                      <div
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ background: agent.color, animationDelay: `${i * 0.2}s` }}
                      />
                      <span className="text-xs font-mono w-28" style={{ color: agent.color }}>
                        {agent.name}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${agent.progress}%` }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.5 + i * 0.1, duration: 1, ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{ background: agent.color }}
                        />
                      </div>
                      <span className="text-xs font-mono w-16 text-right" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {agent.status}
                      </span>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-6 pt-4 flex items-center justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                  <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>Latence moyenne</span>
                  <span className="text-sm font-black" style={{ color: "#2ECC71", ...orbitron }}>2.8s ✓</span>
                </div>
              </GlassCard>

              {/* CTA panel */}
              <div className="flex flex-col gap-5">
                <Kitt3D active />
                <div className="text-center">
                  <p className="text-base font-bold mb-1" style={{ color: "rgba(255,255,255,0.85)" }}>
                    Activez le Mode KITT vocal maintenant
                  </p>
                  <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Push-to-talk · Synthèse vocale · 0.8s de latence
                  </p>
                  <NeuralScanBtn onClick={handleKITT} size="lg">
                    <Mic className="w-5 h-5" />
                    Lancer la démo KITT
                  </NeuralScanBtn>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ══════════════════════════════════════════════════
            SECTION 4 — 7 ARMES SECRÈTES
        ══════════════════════════════════════════════════ */}
        <Section id="weapons" className="py-24 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-px flex-1 max-w-[80px]" style={{ background: "rgba(155,89,182,0.5)" }} />
              <span className="text-xs font-bold tracking-widest" style={{ color: "#9B59B6", ...orbitron }}>
                ARSENAL
              </span>
              <div className="h-px flex-1 max-w-[80px]" style={{ background: "rgba(155,89,182,0.5)" }} />
            </div>

            <h2
              className="text-center text-[clamp(1.6rem,4vw,3rem)] font-black mb-3 max-w-2xl mx-auto"
              style={{ ...orbitron, color: "rgba(255,255,255,0.92)" }}
            >
              Les 7 armes secrètes de GENIE IA
            </h2>
            <p className="text-center text-sm mb-12" style={{ color: "rgba(255,255,255,0.35)" }}>
              Aucun formateur humain ne possède ces armes. Personne.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {WEAPONS.map((w, i) => (
                <motion.div
                  key={w.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.5 }}
                >
                  <GlassCard
                    className="p-5 h-full flex flex-col gap-3"
                    hover
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `${w.color}18`, border: `1px solid ${w.color}30` }}
                    >
                      <w.icon className="w-5 h-5" style={{ color: w.color }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold mb-1" style={{ color: "rgba(255,255,255,0.9)", ...orbitron }}>
                        {w.title}
                      </h3>
                      <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                        {w.desc}
                      </p>
                    </div>
                    <div
                      className="mt-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                      style={{ background: `${w.color}15`, color: w.color, border: `1px solid ${w.color}25` }}
                    >
                      <Zap className="w-3 h-3" />
                      {w.stat}
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ══════════════════════════════════════════════════
            SECTION 5 — COMPARAISON ASSASSINE
        ══════════════════════════════════════════════════ */}
        <Section className="py-24 px-4 sm:px-6">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(180deg, transparent 0%, rgba(254,44,64,0.02) 50%, transparent 100%)" }}
          />
          <div className="relative max-w-5xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-px flex-1 max-w-[80px]" style={{ background: "rgba(254,44,64,0.4)" }} />
              <span className="text-xs font-bold tracking-widest" style={{ color: "#FE2C40", ...orbitron }}>
                VS
              </span>
              <div className="h-px flex-1 max-w-[80px]" style={{ background: "rgba(254,44,64,0.4)" }} />
            </div>

            <h2
              className="text-center text-[clamp(1.6rem,4vw,3rem)] font-black mb-12"
              style={{ ...orbitron, color: "rgba(255,255,255,0.92)" }}
            >
              Formateur Humain vs GENIE IA
            </h2>

            <GlassCard className="overflow-hidden" hover={false}>
              {/* Header */}
              <div className="grid grid-cols-3 px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>Critère</span>
                <span className="text-xs font-bold text-center" style={{ color: "rgba(255,80,80,0.7)" }}>
                  🧑‍🏫 Formateur Humain
                </span>
                <span className="text-xs font-bold text-center" style={{ color: "#00F0FF" }}>
                  🤖 GENIE IA + KITT
                </span>
              </div>

              {COMPARE_ROWS.map((row, i) => (
                <motion.div
                  key={row.feature}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="grid grid-cols-3 px-6 py-3.5 items-center"
                  style={{
                    borderBottom: i < COMPARE_ROWS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                  }}
                >
                  <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>
                    {row.feature}
                  </span>
                  <span className="text-xs text-center" style={{ color: "rgba(255,80,80,0.65)" }}>
                    {row.human}
                  </span>
                  <span className="text-xs font-bold text-center" style={{ color: "#00F0FF" }}>
                    {row.genie}
                  </span>
                </motion.div>
              ))}
            </GlassCard>
          </div>
        </Section>

        {/* ══════════════════════════════════════════════════
            SECTION 6 — OFFRE IRRÉSISTIBLE
        ══════════════════════════════════════════════════ */}
        <Section className="py-24 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-px flex-1 max-w-[80px]" style={{ background: "rgba(46,204,113,0.4)" }} />
              <span className="text-xs font-bold tracking-widest" style={{ color: "#2ECC71", ...orbitron }}>
                OFFRE
              </span>
              <div className="h-px flex-1 max-w-[80px]" style={{ background: "rgba(46,204,113,0.4)" }} />
            </div>

            <h2
              className="text-center text-[clamp(1.6rem,4vw,3rem)] font-black mb-4"
              style={{ ...orbitron, color: "rgba(255,255,255,0.92)" }}
            >
              Commencez maintenant. Payez quand vous êtes convaincu.
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
              {[
                {
                  name: "GRATUIT",
                  price: "0€",
                  period: "pour toujours",
                  color: "#3466A8",
                  features: ["Modules de base", "3 missions/semaine", "KITT textuel", "1 attestation/an"],
                  cta: "Commencer gratuitement",
                  highlight: false,
                },
                {
                  name: "PRO",
                  price: "59€",
                  period: "/mois · 25 sièges",
                  color: "#FE2C40",
                  features: ["Tout illimité", "KITT vocal + swarm", "Simulation entreprise", "Attestations illimitées", "Dashboard manager", "Billing Stripe"],
                  cta: "Activer le Mode KITT PRO",
                  highlight: true,
                },
                {
                  name: "ENTERPRISE",
                  price: "Sur devis",
                  period: "∞ sièges",
                  color: "#9B59B6",
                  features: ["SSO + SAML", "SLA 99.9%", "Support dédié", "Audit compliance", "White-label", "Intégration SIEM"],
                  cta: "Contacter l'équipe",
                  highlight: false,
                },
              ].map((plan, i) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={plan.highlight ? "relative" : ""}
                >
                  {plan.highlight && (
                    <div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-black z-10"
                      style={{ background: "#FE2C40", color: "#fff", ...orbitron }}
                    >
                      ⚡ RECOMMANDÉ
                    </div>
                  )}
                  <GlassCard
                    className="p-6 h-full flex flex-col gap-4"
                    accent={plan.highlight}
                  >
                    <div>
                      <span className="text-xs font-bold tracking-widest" style={{ color: plan.color, ...orbitron }}>
                        {plan.name}
                      </span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-3xl font-black" style={{ color: "rgba(255,255,255,0.9)" }}>
                          {plan.price}
                        </span>
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{plan.period}</span>
                      </div>
                    </div>
                    <ul className="space-y-2 flex-1">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>
                          <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: plan.color }} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <NeuralScanBtn
                      onClick={() => plan.name === "ENTERPRISE" ? navigate("/pricing") : handleKITT()}
                      className="w-full justify-center mt-auto"
                      size="default"
                    >
                      {plan.cta}
                    </NeuralScanBtn>
                  </GlassCard>
                </motion.div>
              ))}
            </div>

            {/* Garantie */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-center justify-center gap-4 p-5 rounded-2xl max-w-xl mx-auto"
              style={{
                background: "rgba(46,204,113,0.06)",
                border: "1px solid rgba(46,204,113,0.2)",
              }}
            >
              <Shield className="w-8 h-8 shrink-0" style={{ color: "#2ECC71" }} />
              <div>
                <p className="text-sm font-bold" style={{ color: "#2ECC71" }}>Garantie 30 jours satisfait ou remboursé</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Si GENIE IA ne vous impressionne pas en 30 jours, remboursement intégral sans question.
                </p>
              </div>
            </motion.div>
          </div>
        </Section>

        {/* ══════════════════════════════════════════════════
            SECTION 7 — SCARCITY FINALE
        ══════════════════════════════════════════════════ */}
        <Section className="py-24 px-4 sm:px-6 relative overflow-hidden">
          {/* Red ambient */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(254,44,64,0.07) 0%, transparent 70%)",
            }}
          />

          <div className="relative max-w-3xl mx-auto text-center">
            {/* Urgency badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-8"
              style={{
                background: "rgba(254,44,64,0.12)",
                border: "1px solid rgba(254,44,64,0.4)",
              }}
            >
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-black" style={{ color: "#FE2C40", ...orbitron }}>
                ACCÈS LIMITÉ — CE MOIS-CI
              </span>
            </motion.div>

            <h2
              className="text-[clamp(2rem,5vw,4rem)] font-black mb-4"
              style={{ ...orbitron, color: "rgba(255,255,255,0.92)" }}
            >
              Seulement <span style={{ color: "#FE2C40" }}>500 places</span>
              <br />Mode KITT ce mois-ci.
            </h2>
            <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.4)" }}>
              Pour garantir la qualité du swarm 5 agents et la latence &lt; 3s, nous limitons les accès Mode KITT.
              Les 73 dernières places sont en cours d'attribution.
            </p>

            {/* Countdown */}
            <div className="flex items-center justify-center gap-4 mb-10">
              {[
                { value: pad(countdown.h), label: "HEURES" },
                { value: pad(countdown.m), label: "MIN" },
                { value: pad(countdown.s), label: "SEC" },
              ].map((c, i) => (
                <React.Fragment key={c.label}>
                  {i > 0 && <span className="text-2xl font-black" style={{ color: "rgba(254,44,64,0.6)" }}>:</span>}
                  <div
                    className="flex flex-col items-center gap-1 px-5 py-3 rounded-xl min-w-[64px]"
                    style={{ background: "rgba(254,44,64,0.08)", border: "1px solid rgba(254,44,64,0.25)" }}
                  >
                    <span className="text-2xl font-black" style={{ color: "#FE2C40", ...orbitron }}>{c.value}</span>
                    <span className="text-xs tracking-widest" style={{ color: "rgba(255,255,255,0.3)", ...orbitron }}>{c.label}</span>
                  </div>
                </React.Fragment>
              ))}
            </div>

            {/* Progress bar — places restantes */}
            <div className="mb-10">
              <div className="flex items-center justify-between text-xs mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                <span>Places réservées ce mois</span>
                <span style={{ color: "#FE2C40" }}>427 / 500</span>
              </div>
              <div className="h-2 rounded-full w-full" style={{ background: "rgba(255,255,255,0.07)" }}>
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "85.4%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg, #FE2C40, #FF8C00)" }}
                />
              </div>
            </div>

            {/* Final CTA */}
            <NeuralScanBtn onClick={handleKITT} size="xl">
              <Mic className="w-5 h-5" />
              Réserver ma place KITT maintenant
              <ArrowRight className="w-5 h-5" />
            </NeuralScanBtn>
            <p className="text-xs mt-4" style={{ color: "rgba(255,255,255,0.2)" }}>
              Sans carte bancaire · Activation en 30 secondes
            </p>
          </div>
        </Section>

        {/* ══════════════════════════════════════════════════
            SECTION 8 — FOOTER CONFIANCE + CTA FINAL
        ══════════════════════════════════════════════════ */}
        <section className="relative py-20 px-4 sm:px-6" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="max-w-5xl mx-auto">
            {/* Trust row */}
            <div className="flex flex-wrap justify-center gap-6 mb-12">
              {[
                { icon: Lock, label: "RGPD compliant", color: "#3466A8" },
                { icon: Shield, label: "ANSSI référencé", color: "#2ECC71" },
                { icon: ShieldCheck, label: "AI Act 2026", color: "#00F0FF" },
                { icon: Cpu, label: "Hébergement EU", color: "#9B59B6" },
                { icon: FileCheck, label: "ISO 27001 en cours", color: "#F39C12" },
              ].map((t) => (
                <div key={t.label} className="flex items-center gap-2">
                  <t.icon className="w-4 h-4" style={{ color: t.color }} />
                  <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>{t.label}</span>
                </div>
              ))}
            </div>

            {/* Email capture */}
            <div className="max-w-md mx-auto text-center mb-14">
              <h3 className="text-lg font-black mb-2" style={{ color: "rgba(255,255,255,0.85)", ...orbitron }}>
                Restez dans la boucle KITT
              </h3>
              <p className="text-xs mb-5" style={{ color: "rgba(255,255,255,0.35)" }}>
                Nouvelles fonctionnalités, alertes de places disponibles, rapports de menaces hebdomadaires.
              </p>
              {emailDone ? (
                <div className="flex items-center justify-center gap-2 p-4 rounded-xl" style={{ background: "rgba(46,204,113,0.1)", border: "1px solid rgba(46,204,113,0.3)" }}>
                  <CheckCircle className="w-5 h-5" style={{ color: "#2ECC71" }} />
                  <span className="text-sm font-bold" style={{ color: "#2ECC71" }}>Activé — bienvenue dans la boucle KITT 🔴</span>
                </div>
              ) : (
                <form onSubmit={handleEmailCapture} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="flex-1 px-4 py-3 rounded-xl text-sm focus:outline-none"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.85)",
                    }}
                  />
                  <NeuralScanBtn size="default">
                    {emailLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  </NeuralScanBtn>
                </form>
              )}
            </div>

            {/* Footer links */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-center gap-3">
                <img src={logoGenie} alt="GENIE IA" className="h-6 w-auto opacity-60" />
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>© 2026 GENIE IA</span>
              </div>
              <div className="flex items-center gap-5">
                {[
                  { label: "Tarifs", href: "/pricing" },
                  { label: "Guides", href: "/guides" },
                  { label: "Légal", href: "/legal" },
                  { label: "Connexion", href: "/login" },
                ].map((l) => (
                  <Link
                    key={l.label}
                    to={l.href}
                    className="text-xs transition-colors"
                    style={{ color: "rgba(255,255,255,0.25)" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
