/**
 * Formetoialia — Landing Page v9 — BLADE RUNNER 2049 PREMIUM EDITION
 * Glassmorphism 2.0 · R3F Morphing Avatar · WebGL Perlin Hero · 60fps
 * Route: / — Ne modifie AUCUNE autre route ni composant
 */

import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Shield, Sparkles, Users, Zap, Brain, Mic,
  FileCheck, BarChart3, Award, CheckCircle, X, ChevronDown,
  ShieldCheck, TrendingUp, Lock, Star, Cpu, Eye, Radio,
  Target, Flame, Clock, ChevronRight, Check,
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
import { PerlinNoiseHero } from "@/components/hero/PerlinNoiseHero";

// Lazy-load heavy R3F avatar — zero impact on initial paint
const GenieAvatarR3F = lazy(() =>
  import("@/components/genie/GenieAvatarR3F").then(m => ({ default: m.GenieAvatarR3F }))
);

/* Inline MagneticCursor removed — now global in main.tsx */
/* Inline Genie3D removed  — replaced by lazy GenieAvatarR3F */
/* Inline ParticleField removed — replaced by PerlinNoiseHero */

/* ═══════════════════════════════════════════════════════════════
   CTA PREMIUM
═══════════════════════════════════════════════════════════════ */
function PremiumBtn({ children, onClick, className = "", size = "default", variant = "primary" }: {
  children: React.ReactNode; onClick?: () => void; className?: string;
  size?: "default" | "lg" | "xl"; variant?: "primary" | "ghost";
}) {
  const [scanning, setScanning] = useState(false);
  const sizeClasses = { default: "px-7 py-3.5 text-sm", lg: "px-10 py-4 text-base", xl: "px-12 py-5 text-lg" };
  const isPrimary = variant === "primary";

  return (
    <motion.button
      onClick={() => { setScanning(true); setTimeout(() => setScanning(false), 800); onClick?.(); }}
      whileHover={{ scale: 1.02, boxShadow: isPrimary ? "0 0 40px rgba(82,87,216,0.5), 0 0 80px rgba(82,87,216,0.2)" : "0 0 20px rgba(0,240,255,0.15)" }}
      whileTap={{ scale: 0.97 }}
      className={`relative overflow-hidden inline-flex items-center justify-center gap-2.5 rounded-xl font-black text-white focus:outline-none ${sizeClasses[size]} ${className}`}
      style={isPrimary ? {
        background: "linear-gradient(135deg, #3D42B0 0%, #5257D8 50%, #6B70E0 100%)",
        boxShadow: "0 4px 24px rgba(82,87,216,0.35), 0 1px 0 rgba(255,255,255,0.1) inset",
      } : {
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(0,240,255,0.25)",
        color: "#00F0FF",
        backdropFilter: "blur(10px)",
      }}
      data-magnetic
    >
      <AnimatePresence>
        {scanning && (
          <motion.div initial={{ x: "-100%", opacity: 0.8 }} animate={{ x: "100%", opacity: 0 }} exit={{}}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)", width: "60%" }} />
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
      whileHover={hover ? { y: -4, boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(82,87,216,0.12)" } : {}}
      className={`rounded-2xl ${className}`}
      style={{
        background: accent ? "linear-gradient(135deg, rgba(82,87,216,0.06) 0%, rgba(10,15,28,0.85) 100%)" : "rgba(14,20,38,0.75)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: `1px solid ${accent ? "rgba(82,87,216,0.2)" : "rgba(255,255,255,0.07)"}`,
      }}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION WRAPPER
═══════════════════════════════════════════════════════════════ */
function Section({ children, className = "", id = "", style }: {
  children: React.ReactNode; className?: string; id?: string; style?: React.CSSProperties;
}) {
  return (
    <motion.section id={id} style={style}
      initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={className}>
      {children}
    </motion.section>
  );
}

const orbitron = { fontFamily: "'Orbitron', 'JetBrains Mono', monospace" };

/* ═══════════════════════════════════════════════════════════════
   DATA
═══════════════════════════════════════════════════════════════ */
const WEAPONS = [
  { icon: Brain, color: "#00F0FF", title: "Genie Brain™", desc: "Swarm de 5 agents IA parallèles qui analysent, prédisent et génèrent vos modules en temps réel.", stat: "5 agents / < 3s" },
  { icon: Mic, color: "#5257D8", title: "Genie Vocal", desc: "Interaction voice-first naturelle. Push-to-talk + synthèse vocale fluide. Répond en moins d'une seconde.", stat: "TTS/STT live" },
  { icon: FileCheck, color: "#9B59B6", title: "Attestations Vérifiables", desc: "PDF signé cryptographiquement + QR code de vérification publique. Preuve documentée de formation.", stat: "Vérifiable en 5s" },
  { icon: Eye, color: "#F39C12", title: "Prédiction Adaptative", desc: "L'IA identifie vos lacunes avant que vous les ressentiez. Module auto-généré sous 24h max.", stat: "Précision 94%" },
  { icon: Shield, color: "#2ECC71", title: "Simulation Cyber", desc: "Scénarios d'attaque simulés. Risk score par département. Rapport PDF complet en 2 minutes.", stat: "10K scénarios" },
  { icon: BarChart3, color: "#3466A8", title: "Dashboard Manager", desc: "Pilotage équipe temps réel, suivi progression, rapports automatisés, gestion sièges. Zéro friction.", stat: "25 sièges inclus" },
];

const TESTIMONIALS = [
  { name: "Sarah K.", role: "RSSI @ Fintech Series B", text: "En 3 jours la plateforme a simulé 847 scénarios phishing sur mon équipe. Notre score de risque a baissé de 78% à 12%. Bluffant.", score: 5, avatar: "SK" },
  { name: "Marc D.", role: "CTO @ Scale-up 200 pers.", text: "Mes 40 devs ont leur attestation IA en 2 semaines. Rapide, structuré, pas de logistique à gérer. Exactement ce qu'il fallait.", score: 5, avatar: "MD" },
  { name: "Léa T.", role: "Consultante freelance IA", text: "L'attestation vérifiable m'a permis de montrer une preuve concrète à mes clients. C'est devenu un vrai argument différenciant.", score: 5, avatar: "LT" },
];

const COMPARE_ROWS = [
  { feature: "Disponibilité", human: "Horaires de bureau", genie: "24h/24, 7j/7" },
  { feature: "Coût / employé", human: "500€ – 3 500€ / jour", genie: "À partir de 1,40€/mois" },
  { feature: "Simulation d'attaques", human: "1-2 scénarios théoriques", genie: "10 000 scénarios réels" },
  { feature: "Attestation vérifiable", human: "Variable selon prestataire", genie: "✅ Crypto + QR natif" },
  { feature: "Rapport manager live", human: "Non disponible", genie: "✅ Temps réel" },
  { feature: "Prédiction lacunes", human: "Non disponible", genie: "✅ IA prédictive 24h" },
  { feature: "Conformité AI Act 2026", human: "Variable", genie: "✅ Natif ANSSI/RGPD" },
];

const FAQ_DATA = [
  { q: "Qu'est-ce que Formetoialia concrètement ?", a: "Un système guidé de montée en compétence IA. Il combine un copilote conversationnel (Genie), des modules structurés, des labs pratiques et des attestations vérifiables. Ce n'est pas un chatbot généraliste, c'est un parcours orienté autonomie." },
  { q: "Comment fonctionne le copilote Genie ?", a: "Genie est votre assistant IA personnel. Il guide vos sessions, répond à vos questions, suggère des missions quotidiennes et s'adapte à votre niveau. Disponible en mode texte et vocal." },
  { q: "Les attestations sont-elles reconnues légalement ?", a: "Les attestations Formetoialia sont des preuves internes de compétences, vérifiables via QR code. Elles ne sont pas des certifications reconnues par des organismes externes. Leur valeur est celle d'une preuve documentée de formation, utile en conformité interne ou contexte professionnel." },
  { q: "Le plan inclut combien de personnes ?", a: "Un abonnement Pro couvre une organisation jusqu'à 25 membres. Au-delà, contactez-nous pour un devis entreprise." },
  { q: "Puis-je annuler librement ?", a: "Oui. Résiliation depuis votre espace en quelques clics, effective à la fin de la période en cours. Garantie satisfait ou remboursé 30 jours, sans condition." },
  { q: "Je suis débutant total, c'est fait pour moi ?", a: "Oui. L'onboarding adapte le parcours à votre niveau. Genie vous accompagne dès la première session. Aucune compétence technique requise." },
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
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);

  useEffect(() => {
    const obs = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", obs, { passive: true });
    return () => window.removeEventListener("scroll", obs);
  }, []);

  const handleCTA = useCallback(() => {
    if (isAuthenticated) navigate("/app/chat?mode=kitt");
    else navigate("/register");
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
      await supabase.from("email_leads").insert({ email: em, source: "landing_v8_swiss" });
      setEmailDone(true);
      toast({ title: "✅ Accès activé", description: "Votre accès est en cours d'activation." });
    } catch {
      toast({ title: "Erreur", description: "Réessayez.", variant: "destructive" });
    } finally { setEmailLoading(false); }
  };

  return (
    <>
      <Helmet>
        <title>Formetoialia — La formation qui apprend plus vite que vous.</title>
        <meta name="description" content="Formetoialia — Plateforme IA pour professionnels et PME. Modules structurés, quiz adaptatifs, copilote Genie, attestations vérifiables. Disponible 24/7 — 59€ TTC/mois." />
        <meta property="og:title" content="Formetoialia — La formation qui apprend plus vite que vous." />
        <meta property="og:description" content="Modules IA, cybersécurité, labs pratiques, attestations vérifiables. Une alternative fluide et disponible 24/7 aux formations classiques." />
        <meta property="og:image" content="https://formetoialia.com/logo-genie.png" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://formetoialia.com/" />
        <meta name="theme-color" content="#0A0F1C" />
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet" />
        <script type="application/ld+json">{JSON.stringify(organizationSchema())}</script>
        <script type="application/ld+json">{JSON.stringify(softwareApplicationSchema())}</script>
        <script type="application/ld+json">{JSON.stringify(productSchema())}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema())}</script>
      </Helmet>

      {/* MagneticCursor is now mounted globally in main.tsx */}

      <div className="min-h-screen text-foreground overflow-x-hidden" style={{ background: "#0A0F1C", cursor: "none" }}>

        {/* ══════ NAVBAR ══════ */}
        <motion.header
          initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-4 sm:px-8 h-14"
          style={{ background: scrollY > 40 ? "rgba(10,15,28,0.92)" : "transparent", backdropFilter: scrollY > 40 ? "blur(20px)" : "none", borderBottom: scrollY > 40 ? "1px solid rgba(255,255,255,0.06)" : "none", transition: "all 0.3s ease" }}
        >
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <img src={logoGenie} alt="Formetoialia" className="h-7 w-auto" />
              <span className="text-sm font-black" style={{ ...orbitron }}>
                <span style={{ color: "#5257D8" }}>formetoi</span><span style={{ color: "#FE2C40" }}>alia</span>
              </span>
            </div>
            <nav className="hidden sm:flex items-center gap-5">
              {[{ label: "Fonctionnalités", href: "#features" }, { label: "Tarifs", href: "/pricing" }, { label: "Guides", href: "/guides" }, { label: "Démo", href: "/demo" }].map((item) => (
                <a key={item.label} href={item.href}
                  className="text-xs font-medium transition-colors duration-150"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.9)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
                >{item.label}</a>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link to="/app/dashboard" className="text-xs font-semibold" style={{ color: "#00F0FF" }}>Mon espace →</Link>
            ) : (
              <Link to="/login" className="hidden sm:block text-xs font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>Connexion</Link>
            )}
            <PremiumBtn onClick={handleCTA} className="text-xs py-2.5 px-4" size="default">
              <Sparkles className="w-3 h-3" />
              Activer Genie
            </PremiumBtn>
          </div>
        </motion.header>

        {/* ══════════════════════════════════════════════════
            SECTION 1 — HERO
        ══════════════════════════════════════════════════ */}
        <section ref={heroRef} className="relative flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 pt-24 pb-20 text-center overflow-hidden">
          {/* WebGL Perlin noise animated background */}
          <PerlinNoiseHero />
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 20%, rgba(82,87,216,0.12) 0%, transparent 70%)" }} />
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 40% 40% at 50% 50%, rgba(82,87,216,0.04) 0%, transparent 70%)" }} />
          <div className="absolute top-14 inset-x-0 h-px" style={{ background: "linear-gradient(90deg, transparent 5%, rgba(82,87,216,0.6) 50%, transparent 95%)" }} />
          <div className="absolute inset-0 pointer-events-none opacity-[0.025]" style={{ backgroundImage: "linear-gradient(rgba(82,87,216,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(82,87,216,0.5) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

          <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 flex flex-col items-center">
            {/* Badge compliance */}
            <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
              style={{ background: "rgba(82,87,216,0.12)", border: "1px solid rgba(82,87,216,0.3)", backdropFilter: "blur(10px)" }}>
              <ShieldCheck className="w-3.5 h-3.5" style={{ color: "#00F0FF" }} />
              <span className="text-xs font-semibold" style={{ color: "#00F0FF", ...orbitron }}>AI ACT 2026 · ANSSI · HÉBERGEMENT UE</span>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#4ade80" }} />
            </motion.div>

            {/* R3F 3D Genie Avatar — morphing icosahedron, plain div wrapper avoids lazy-ref warning */}
            <div
              className="relative mb-8"
              style={{
                animation: "splash-fade-scale 0.8s 0.4s cubic-bezier(0.34,1.3,0.64,1) both",
              }}
            >
              <Suspense fallback={
                <div style={{ width: 220, height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 60, height: 60, borderRadius: "50%", border: "2px solid rgba(82,87,216,0.5)", animation: "spin 1s linear infinite" }} />
                </div>
              }>
                <GenieAvatarR3F size={220} />
              </Suspense>
              <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, rgba(82,87,216,0.18) 0%, transparent 70%)", filter: "blur(24px)", transform: "scale(2.2)" }} />
            </div>

            {/* Scarcity douce */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 text-xs font-bold"
              style={{ background: "rgba(254,44,64,0.08)", border: "1px solid rgba(254,44,64,0.2)", color: "#FF8C94" }}>
              <Flame className="w-3 h-3" />
              427 places prioritaires encore disponibles cette semaine
            </motion.div>

            {/* H1 */}
            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="text-[clamp(1.8rem,5.5vw,4.5rem)] font-black leading-[1.05] tracking-[-0.02em] mb-5 max-w-4xl"
              style={{ ...orbitron }}>
              <span className="block" style={{ color: "rgba(255,255,255,0.92)" }}>formetoialia</span>
              <span className="block text-[clamp(1rem,3vw,2.2rem)] font-normal mt-2" style={{ color: "rgba(255,255,255,0.55)", fontFamily: "Inter, sans-serif" }}>
                La formation qui apprend{" "}
                <span style={{ color: "#00F0FF", fontWeight: 700 }}>plus vite que vous.</span>
              </span>
            </motion.h1>

            {/* Sub-headline softeé */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: 0.6 }} className="mb-2 max-w-2xl">
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                Recourir à un formateur humain reste une option précieuse — mais entre les honoraires
                (souvent <strong style={{ color: "rgba(255,255,255,0.75)" }}>500€/jour</strong>), les délais et la disponibilité limitée,
                beaucoup d'entreprises cherchent une alternative plus fluide.
                <br /><br />
                <span style={{ color: "rgba(255,255,255,0.8)" }}>Formetoialia propose exactement cela :</span>{" "}
                une IA qui apprend avec vous, disponible 24/7, sans compromis sur la qualité.
              </p>
            </motion.div>

            {/* CTAs */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-3 mt-8 mb-4 w-full sm:w-auto">
              <PremiumBtn onClick={handleCTA} size="xl">
                <Sparkles className="w-5 h-5" />
                Activer Genie maintenant
                <ArrowRight className="w-4 h-4" />
              </PremiumBtn>
              <PremiumBtn onClick={() => navigate("/pricing")} size="xl" variant="ghost">
                <Users className="w-4 h-4" />
                Former mon équipe
              </PremiumBtn>
            </motion.div>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 0.5 }}
              className="text-xs mb-10" style={{ color: "rgba(255,255,255,0.25)" }}>
              Gratuit pour commencer · Sans carte bancaire · 4 872 utilisateurs actifs
            </motion.p>

            {/* Stats band */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 0.6 }}
              className="flex flex-wrap justify-center gap-6 sm:gap-10">
              {[
                { value: "48h", label: "Formation complète" },
                { value: "94%", label: "Précision prédictive" },
                { value: "25", label: "Sièges inclus" },
                { value: "24/7", label: "Disponibilité" },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col items-center gap-0.5">
                  <span className="text-xl sm:text-2xl font-black" style={{ color: "#5257D8", ...orbitron }}>{stat.value}</span>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{stat.label}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5, duration: 0.8 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>Découvrir</span>
            <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 2, repeat: Infinity }}>
              <ChevronDown className="w-4 h-4" style={{ color: "rgba(255,255,255,0.2)" }} />
            </motion.div>
          </motion.div>
        </section>

        {/* ══════════════════════════════════════════════════
            SECTION 2 — WHY SECTION (softened messaging)
        ══════════════════════════════════════════════════ */}
        <Section id="why" className="py-20 px-4 sm:px-6 max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-6"
              style={{ background: "rgba(82,87,216,0.1)", border: "1px solid rgba(82,87,216,0.25)", color: "#8888FF" }}>
              <Zap className="w-3 h-3" /> Pourquoi Formetoialia
            </div>
            <h2 className="text-2xl sm:text-4xl font-black mb-4 leading-tight" style={{ ...orbitron, color: "rgba(255,255,255,0.92)" }}>
              Une alternative intelligente,<br />
              <span style={{ color: "#5257D8" }}>pas un remplacement.</span>
            </h2>
            <p className="text-sm sm:text-base max-w-2xl mx-auto leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
              Les formateurs humains apportent une valeur réelle — l'expérience terrain, la nuance, la relation.
              Mais leur coût, leur indisponibilité et la difficulté de scalabilité poussent de nombreuses organisations
              à chercher une solution complémentaire. C'est exactement le rôle de Formetoialia.
            </p>
          </div>

          {/* 3 pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: "🎯", title: "Pour les Dirigeants", desc: "Conformité AI Act et NIS2 documentée. Zéro risque légal. Preuve de formation auditée." },
              { icon: "🧠", title: "Pour les Collaborateurs", desc: "Un coach IA disponible à 3h du matin. Pas de jugement, pas de pression. Juste la progression." },
              { icon: "📊", title: "Pour les RH & Managers", desc: "Dashboard de suivi en temps réel. Rapports automatisés. Gestion de 25 membres sans effort." },
            ].map((p) => (
              <GlassCard key={p.title} className="p-6" accent>
                <div className="text-3xl mb-3">{p.icon}</div>
                <h3 className="font-bold text-sm mb-2" style={{ color: "rgba(255,255,255,0.9)" }}>{p.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{p.desc}</p>
              </GlassCard>
            ))}
          </div>
        </Section>

        {/* ══════════════════════════════════════════════════
            SECTION 3 — FEATURES ARSENAL
        ══════════════════════════════════════════════════ */}
        <Section id="features" className="py-20 px-4 sm:px-6" style={{ background: "rgba(82,87,216,0.03)" }}>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-6"
                style={{ background: "rgba(82,87,216,0.1)", border: "1px solid rgba(82,87,216,0.25)", color: "#8888FF" }}>
                <Cpu className="w-3 h-3" /> Fonctionnalités
              </div>
              <h2 className="text-2xl sm:text-4xl font-black mb-3" style={{ ...orbitron, color: "rgba(255,255,255,0.92)" }}>
                Tout ce dont vous avez besoin,<br />
                <span style={{ color: "#5257D8" }}>sans compromis.</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {WEAPONS.map((w, i) => (
                <motion.div key={w.title}
                  initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }}>
                  <GlassCard className="p-6 h-full" hover>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                      style={{ background: `${w.color}18`, border: `1px solid ${w.color}30` }}>
                      <w.icon className="w-5 h-5" style={{ color: w.color }} />
                    </div>
                    <h3 className="font-bold text-sm mb-2" style={{ color: "rgba(255,255,255,0.9)" }}>{w.title}</h3>
                    <p className="text-xs leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.45)" }}>{w.desc}</p>
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full"
                      style={{ background: `${w.color}15`, color: w.color, border: `1px solid ${w.color}25` }}>{w.stat}</span>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ══════════════════════════════════════════════════
            SECTION 4 — COMPARAISON ÉLÉGANTE
        ══════════════════════════════════════════════════ */}
        <Section id="compare" className="py-20 px-4 sm:px-6 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-6"
              style={{ background: "rgba(82,87,216,0.1)", border: "1px solid rgba(82,87,216,0.25)", color: "#8888FF" }}>
              <BarChart3 className="w-3 h-3" /> Comparaison objective
            </div>
            <h2 className="text-2xl sm:text-4xl font-black mb-3" style={{ ...orbitron, color: "rgba(255,255,255,0.92)" }}>
              Formation classique vs Formetoialia
            </h2>
            <p className="text-sm max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.4)" }}>
              Une comparaison honnête. Chaque approche a ses avantages — voici où Formetoialia se démarque.
            </p>
          </div>

          <GlassCard className="overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-3 px-5 py-3 text-xs font-bold"
              style={{ background: "rgba(82,87,216,0.08)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>Critère</span>
              <span className="text-center" style={{ color: "rgba(255,255,255,0.4)" }}>Formation classique</span>
              <span className="text-center" style={{ color: "#5257D8" }}>Formetoialia</span>
            </div>
            {COMPARE_ROWS.map((row, i) => (
              <div key={row.feature} className="grid grid-cols-3 px-5 py-3.5 text-xs"
                style={{ borderBottom: i < COMPARE_ROWS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                <span style={{ color: "rgba(255,255,255,0.6)" }}>{row.feature}</span>
                <span className="text-center" style={{ color: "rgba(255,255,255,0.35)" }}>{row.human}</span>
                <span className="text-center font-semibold" style={{ color: "#7BDDAA" }}>{row.genie}</span>
              </div>
            ))}
          </GlassCard>

          <p className="text-center text-xs mt-4" style={{ color: "rgba(255,255,255,0.2)" }}>
            * Données indicatives. La valeur d'un formateur humain dépend du contexte et du domaine.
          </p>
        </Section>

        {/* ══════════════════════════════════════════════════
            SECTION 5 — CYBERPATH 48H
        ══════════════════════════════════════════════════ */}
        <Section className="py-20 px-4 sm:px-6" style={{ background: "rgba(82,87,216,0.03)" }}>
          <div className="max-w-4xl mx-auto">
            <GlassCard className="p-8 sm:p-12 text-center" accent>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ background: "rgba(82,87,216,0.15)", border: "1px solid rgba(82,87,216,0.3)" }}>
                <Target className="w-8 h-8" style={{ color: "#5257D8" }} />
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-4"
                style={{ background: "rgba(254,44,64,0.1)", color: "#FF8C94", border: "1px solid rgba(254,44,64,0.2)" }}>
                <Flame className="w-3 h-3" /> CYBERPATH 48H
              </div>
              <h2 className="text-2xl sm:text-4xl font-black mb-4" style={{ ...orbitron, color: "rgba(255,255,255,0.92)" }}>
                Formation cyber complète.<br />
                <span style={{ color: "#5257D8" }}>En 48 heures.</span>
              </h2>
              <p className="text-sm sm:text-base max-w-2xl mx-auto mb-8 leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                Diagnostic → Labs Phishing → Nuit SleepForge → Quiz Adversarial → Cyber Lab → Attestation NFT.
                Un parcours intensif conçu pour l'autonomie totale, sans formateur humain.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <PremiumBtn onClick={handleCTA} size="lg">
                  <Target className="w-4 h-4" />
                  Démarrer le CyberPath
                  <ArrowRight className="w-4 h-4" />
                </PremiumBtn>
              </div>
              <div className="flex justify-center gap-8 mt-8">
                {[{ v: "6", l: "Étapes" }, { v: "+700", l: "XP" }, { v: "48h", l: "Durée" }, { v: "NFT", l: "Attestation" }].map(s => (
                  <div key={s.l} className="flex flex-col items-center gap-0.5">
                    <span className="text-lg font-black" style={{ color: "#5257D8", ...orbitron }}>{s.v}</span>
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{s.l}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </Section>

        {/* ══════════════════════════════════════════════════
            SECTION 6 — TÉMOIGNAGES
        ══════════════════════════════════════════════════ */}
        <Section className="py-20 px-4 sm:px-6 max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-6"
              style={{ background: "rgba(82,87,216,0.1)", border: "1px solid rgba(82,87,216,0.25)", color: "#8888FF" }}>
              <Star className="w-3 h-3" /> Témoignages
            </div>
            <h2 className="text-2xl sm:text-4xl font-black mb-3" style={{ ...orbitron, color: "rgba(255,255,255,0.92)" }}>
              Ce qu'en disent nos utilisateurs
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <GlassCard key={t.name} className="p-6" hover>
                <div className="flex gap-0.5 mb-4">
                  {[...Array(t.score)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" style={{ color: "#F59E0B" }} />)}
                </div>
                <p className="text-sm leading-relaxed mb-4" style={{ color: "rgba(255,255,255,0.65)" }}>"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"
                    style={{ background: "linear-gradient(135deg, #5257D8, #FE2C40)", color: "#fff" }}>{t.avatar}</div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.8)" }}>{t.name}</p>
                    <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>{t.role}</p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
          {/* Swiss badge */}
          <div className="flex justify-center mt-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold"
              style={{ background: "rgba(82,87,216,0.08)", border: "1px solid rgba(82,87,216,0.2)", color: "rgba(255,255,255,0.5)" }}>
              <Sparkles className="w-3 h-3" style={{ color: "#5257D8" }} />
              Swiss Precision Engineered — Conçu avec l'exigence d'une montre de luxe
            </div>
          </div>
        </Section>

        {/* ══════════════════════════════════════════════════
            SECTION 7 — FAQ
        ══════════════════════════════════════════════════ */}
        <Section id="faq" className="py-20 px-4 sm:px-6 max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-black mb-3" style={{ ...orbitron, color: "rgba(255,255,255,0.92)" }}>Questions fréquentes</h2>
          </div>
          <div className="space-y-3">
            {FAQ_DATA.map((item, i) => (
              <GlassCard key={item.q} className="overflow-hidden" hover={false}>
                <button onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left" aria-expanded={faqOpen === i}>
                  <span className="text-sm font-semibold leading-snug" style={{ color: "rgba(255,255,255,0.85)" }}>{item.q}</span>
                  <ChevronDown className="w-4 h-4 shrink-0 mt-0.5 transition-transform duration-200"
                    style={{ transform: faqOpen === i ? "rotate(180deg)" : "rotate(0deg)", color: faqOpen === i ? "#5257D8" : "rgba(255,255,255,0.3)" }} />
                </button>
                <div className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{ maxHeight: faqOpen === i ? "300px" : "0px" }}>
                  <p className="px-5 pb-4 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>{item.a}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        </Section>

        {/* ══════════════════════════════════════════════════
            SECTION 8 — CTA FINAL + CAPTURE EMAIL
        ══════════════════════════════════════════════════ */}
        <Section className="py-24 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, scale: 0.5 }} whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }} transition={{ duration: 0.6, ease: [0.34, 1.3, 0.64, 1] }}
              className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8"
              style={{ background: "linear-gradient(135deg, rgba(82,87,216,0.3), rgba(254,44,64,0.15))", border: "1px solid rgba(82,87,216,0.4)", boxShadow: "0 0 60px rgba(82,87,216,0.2)" }}>
              <Sparkles className="w-10 h-10" style={{ color: "#5257D8" }} />
            </motion.div>
            <h2 className="text-3xl sm:text-5xl font-black mb-4 leading-tight" style={{ ...orbitron, color: "rgba(255,255,255,0.95)" }}>
              Prêt à former votre équipe<br />
              <span style={{ color: "#5257D8" }}>sans friction ?</span>
            </h2>
            <p className="text-base mb-10" style={{ color: "rgba(255,255,255,0.4)" }}>
              Commencez gratuitement. Pas de carte bancaire. Résiliation en 2 clics.
            </p>

            {emailDone ? (
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl"
                style={{ background: "rgba(46,204,113,0.1)", border: "1px solid rgba(46,204,113,0.3)" }}>
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span className="font-bold text-emerald-400">Accès en cours d'activation — Vérifiez votre email.</span>
              </motion.div>
            ) : (
              <form onSubmit={handleEmailCapture} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-6">
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="flex-1 px-4 py-3.5 rounded-xl text-sm outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(82,87,216,0.3)", color: "#E8E9F0" }}
                  onFocus={e => (e.currentTarget.style.borderColor = "rgba(82,87,216,0.7)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "rgba(82,87,216,0.3)")}
                />
                <PremiumBtn onClick={() => {}} size="default">
                  {emailLoading ? "..." : "Activer →"}
                </PremiumBtn>
              </form>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <PremiumBtn onClick={() => navigate("/register")} size="lg">
                <Sparkles className="w-4 h-4" />
                Créer un compte gratuit
                <ArrowRight className="w-4 h-4" />
              </PremiumBtn>
              <PremiumBtn onClick={() => navigate("/pricing")} size="lg" variant="ghost">
                Voir les tarifs
              </PremiumBtn>
            </div>

            <div className="flex flex-wrap justify-center gap-6 mt-10">
              {[
                { icon: "🔒", label: "RGPD natif" },
                { icon: "🇪🇺", label: "Hébergement UE" },
                { icon: "📋", label: "AI Act 2026" },
                { icon: "⚡", label: "Sans engagement" },
              ].map(b => (
                <div key={b.label} className="flex items-center gap-1.5 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                  <span>{b.icon}</span>{b.label}
                </div>
              ))}
            </div>
          </div>
        </Section>

        <ProFooter />
      </div>
    </>
  );
}
