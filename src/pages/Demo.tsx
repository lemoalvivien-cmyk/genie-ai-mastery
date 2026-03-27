/**
 * Formetoialia — Page /demo
 * Démo produit interactive — sans vidéo YouTube externe
 * Montre le parcours réel : diagnostic → mission → feedback → bibliothèque → progression → CTA
 */

import React, { useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, Zap, Shield, Brain, ChevronRight, ArrowRight,
  Target, Award, BarChart3, MessageSquare, BookOpen, FlaskConical,
  FileCheck, Play, Sparkles, Star, Users, Clock,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAnalytics } from "@/hooks/useAnalytics";
import logoFormetoialia from "@/assets/logo-formetoialia.png";
import { ProFooter } from "@/components/ProFooter";

/* ─── Types ─── */
interface DemoStep {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
}

const DEMO_STEPS: DemoStep[] = [
  { id: "diagnostic", label: "Diagnostic", icon: Target, color: "text-primary" },
  { id: "mission", label: "Mission du jour", icon: Zap, color: "text-amber-400" },
  { id: "feedback", label: "Feedback IA", icon: MessageSquare, color: "text-emerald-400" },
  { id: "library", label: "Bibliothèque", icon: BookOpen, color: "text-violet-400" },
  { id: "progression", label: "Progression", icon: BarChart3, color: "text-primary" },
];

/* ─── Step panels ─── */
const STEP_CONTENT: Record<string, React.ReactNode> = {
  diagnostic: (
    <div className="space-y-4">
      <div className="p-4 rounded-xl border border-border" style={{ background: "hsl(var(--secondary)/0.5)" }}>
        <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-wide">Quiz de diagnostic — 3 min</p>
        {[
          { q: "Vous rédigez un prompt pour résumer un email client.", correct: "Donnez du contexte, un rôle, et un format de sortie", wrong: "Résume cet email" },
          { q: "Vous détectez un email suspect. Quel premier réflexe ?", correct: "Vérifier l'expéditeur réel + ne pas cliquer", wrong: "Ouvrir les pièces jointes pour vérifier" },
          { q: "Votre équipe veut automatiser un rapport hebdo. Par quoi commencer ?", correct: "Identifier les données sources et le format cible", wrong: "Acheter un outil IA directement" },
        ].map((item, i) => (
          <div key={i} className="mb-4 last:mb-0">
            <p className="text-sm text-foreground font-medium mb-2">Q{i + 1} — {item.q}</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 text-xs text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" /> {item.correct}
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground/60 line-through">
                <div className="w-3.5 h-3.5 rounded-full border border-current shrink-0" /> {item.wrong}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
        <Target className="w-5 h-5 text-primary shrink-0" />
        <div>
          <p className="text-sm font-bold text-foreground">Résultat : Niveau Intermédiaire</p>
          <p className="text-xs text-muted-foreground">Votre parcours est généré. Module IA Pro recommandé en priorité.</p>
        </div>
      </div>
    </div>
  ),

  mission: (
    <div className="space-y-4">
      <div className="p-4 rounded-xl border border-amber-400/20 bg-amber-400/5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
            <Zap className="w-3 h-3" /> Mission du jour
          </span>
          <span className="text-xs text-muted-foreground">⏱ ~12 min · +80 XP</span>
        </div>
        <h3 className="text-sm font-bold text-foreground mb-2">
          Rédigez un prompt de prospection pour votre secteur
        </h3>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          Vous êtes commercial dans une PME. Vous devez rédiger un prompt pour demander à une IA de générer 5 messages de prospection personnalisés pour des directeurs RH.
        </p>
        <div className="rounded-lg border border-border p-3 text-xs font-mono text-foreground/70 leading-relaxed"
          style={{ background: "hsl(var(--background)/0.7)" }}>
          <span className="text-primary">Rôle :</span> Tu es un expert en prospection B2B.<br />
          <span className="text-primary">Contexte :</span> Je vends une plateforme de formation IA.<br />
          <span className="text-primary">Cible :</span> Directeurs RH de PME de 50-200 personnes.<br />
          <span className="text-primary">Format :</span> 5 messages LinkedIn de max 150 mots, ton pro mais humain.<br />
          <span className="text-amber-400">▌</span>
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground text-center"
          style={{ background: "hsl(var(--card))" }}>
          Aide KITT
        </div>
        <button className="flex-1 px-3 py-2 rounded-lg text-xs font-bold text-accent-foreground text-center"
          style={{ background: "hsl(var(--accent))" }}>
          Soumettre →
        </button>
      </div>
    </div>
  ),

  feedback: (
    <div className="space-y-4">
      <div className="p-4 rounded-xl border border-border" style={{ background: "hsl(var(--card))" }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-bold text-foreground">Correction KITT</span>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-400/8 border border-emerald-400/20">
            <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-emerald-400">✓ Structure solide</p>
              <p className="text-xs text-muted-foreground mt-0.5">Votre prompt inclut un rôle, un contexte, une cible et un format. C'est la structure RCTF — très bonne pratique.</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-400/8 border border-amber-400/20">
            <Star className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-400">→ À améliorer</p>
              <p className="text-xs text-muted-foreground mt-0.5">Ajoutez un exemple de ton ou un vrai résultat attendu. L'IA calibre mieux avec des exemples concrets ("comme ceci…").</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-primary/8 border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-primary">💡 Score : 78/100</p>
              <p className="text-xs text-muted-foreground mt-0.5">Excellent début. Refaites-le avec un exemple et vous dépasserez 90.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5 text-xs">
        <Award className="w-5 h-5 text-primary shrink-0" />
        <div>
          <span className="font-bold text-foreground">+80 XP gagnés</span>
          <span className="text-muted-foreground ml-2">Mission complétée</span>
        </div>
      </div>
    </div>
  ),

  library: (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Chaque artefact produit (prompt, analyse, rapport) est automatiquement sauvegardé dans votre bibliothèque personnelle.
      </p>
      {[
        { type: "Prompt", title: "Prospection RH LinkedIn × 5", date: "Aujourd'hui", score: "78/100", icon: MessageSquare, color: "text-primary" },
        { type: "Analyse", title: "Contrat fournisseur — Points clés extraits", date: "Hier", score: "92/100", icon: Shield, color: "text-emerald-400" },
        { type: "Synthèse", title: "Compte rendu réunion Q1", date: "Il y a 2j", score: "Complété", icon: BookOpen, color: "text-violet-400" },
        { type: "Rapport", title: "Plan d'action commercial — Draft", date: "Il y a 3j", score: "Validé", icon: FileCheck, color: "text-amber-400" },
      ].map((item) => (
        <div key={item.title}
          className="flex items-center gap-3 p-3 rounded-xl border border-border"
          style={{ background: "hsl(var(--card))" }}>
          <div className="w-8 h-8 rounded-lg bg-card flex items-center justify-center border border-border shrink-0">
            <item.icon className={`w-4 h-4 ${item.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
            <p className="text-[10px] text-muted-foreground">{item.type} · {item.date}</p>
          </div>
          <span className="text-[10px] font-bold text-muted-foreground shrink-0">{item.score}</span>
        </div>
      ))}
    </div>
  ),

  progression: (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "XP total", value: "1 240", color: "text-primary" },
          { label: "Missions", value: "14 / 30", color: "text-amber-400" },
          { label: "Streak", value: "6 jours", color: "text-emerald-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-3 text-center border border-border"
            style={{ background: "hsl(var(--card))" }}>
            <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-2.5">
        {[
          { label: "Communication", pct: 68, color: "bg-primary" },
          { label: "Productivité", pct: 41, color: "bg-emerald-400" },
          { label: "Analyse", pct: 100, color: "bg-violet-400" },
          { label: "Stratégie", pct: 25, color: "bg-amber-400" },
        ].map((m) => (
          <div key={m.label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-foreground/70">{m.label}</span>
              <span className="text-muted-foreground font-mono">{m.pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${m.color}`}
                initial={{ width: 0 }}
                animate={{ width: `${m.pct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center gap-3">
        <FileCheck className="w-5 h-5 text-primary shrink-0" />
        <div>
          <p className="text-sm font-bold text-foreground">Attestation disponible</p>
          <p className="text-xs text-muted-foreground">Phishing Lab — PDF signé + QR code de vérification</p>
        </div>
        <button className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold text-primary-foreground bg-primary">
          Voir →
        </button>
      </div>
    </div>
  ),
};

/* ─── Main ─── */
export default function Demo() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { track } = useAnalytics();
  const [activeStep, setActiveStep] = useState<string>("diagnostic");

  const handleCTA = useCallback(() => {
    track("signup", { label: "demo_cta", path: "/demo" });
    if (isAuthenticated) navigate("/app/dashboard");
    else navigate("/register?ref=demo");
  }, [isAuthenticated, navigate, track]);

  const handleStepClick = useCallback((stepId: string) => {
    setActiveStep(stepId);
    track("module_opened", { label: `demo_step_${stepId}`, path: "/demo" });
  }, [track]);

  return (
    <>
      <Helmet>
        <title>Démo Formetoialia — Voyez le produit en action</title>
        <meta name="description" content="Explorez Formetoialia en 5 étapes : diagnostic, mission du jour, feedback IA, bibliothèque d'artefacts et progression mesurable. Sans compte requis." />
        <meta property="og:title" content="Formetoialia — Démo produit interactive" />
        <meta property="og:description" content="Diagnostic, mission quotidienne, feedback IA, attestations vérifiables. Voyez comment ça marche avant de vous inscrire." />
        <meta property="og:url" content="https://formetoialia.com/demo" />
        <meta property="og:image" content="https://formetoialia.com/logo-formetoialia.png" />
        <link rel="canonical" href="https://formetoialia.com/demo" />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

        {/* ── NAVBAR ── */}
        <header className="sticky top-0 z-50 border-b border-border/50 px-4 sm:px-8 h-14 flex items-center justify-between"
          style={{ background: "hsl(var(--background)/0.95)", backdropFilter: "blur(16px)" }}>
          <Link to="/" className="flex items-center gap-2">
            <img src={logoFormetoialia} alt="Formetoialia" className="h-7 w-auto" />
            <span className="font-black text-sm tracking-tight">
              <span className="text-primary">formetoi</span><span className="text-accent">alia</span>
            </span>
            <span className="text-[10px] font-bold text-primary/70 border border-primary/20 px-2 py-0.5 rounded-full ml-1 hidden sm:inline">DÉMO</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/" className="hidden sm:block text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← Retour
            </Link>
            <button
              onClick={handleCTA}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-accent-foreground transition-all hover:opacity-90"
              style={{ background: "hsl(var(--accent))" }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Essayer gratuitement
            </button>
          </div>
        </header>

        {/* ── HERO ── */}
        <section className="pt-16 pb-10 px-4 sm:px-6 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 text-primary text-xs font-semibold mb-6"
              style={{ background: "hsl(var(--primary)/0.07)" }}>
              <Play className="w-3 h-3" /> Démo produit interactive — sans compte requis
            </div>
            <h1 className="text-3xl sm:text-5xl font-black mb-4 leading-tight text-foreground">
              Voyez exactement<br />
              <span className="text-primary">ce que vous allez utiliser</span>
            </h1>
            <p className="text-muted-foreground text-base max-w-xl mx-auto mb-2">
              Explorez les 5 étapes du parcours Formetoialia : diagnostic, mission quotidienne, feedback IA, bibliothèque de résultats et progression mesurable.
            </p>
            <p className="text-sm text-muted-foreground/60">Cliquez sur chaque étape pour explorer.</p>
          </motion.div>
        </section>

        {/* ── DÉMO INTERACTIVE ── */}
        <section className="px-4 sm:px-6 max-w-5xl mx-auto pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">

            {/* Steps navigation */}
            <div className="space-y-2">
              {DEMO_STEPS.map((step, i) => {
                const isActive = activeStep === step.id;
                return (
                  <motion.button
                    key={step.id}
                    onClick={() => handleStepClick(step.id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all border"
                    style={{
                      background: isActive ? "hsl(var(--primary)/0.1)" : "hsl(var(--card))",
                      borderColor: isActive ? "hsl(var(--primary)/0.3)" : "hsl(var(--border))",
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive ? "bg-primary/20" : "bg-secondary"
                    }`}>
                      <step.icon className={`w-4 h-4 ${isActive ? step.color : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground/60 font-mono">0{i + 1}</span>
                        <span className={`text-sm font-semibold ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                          {step.label}
                        </span>
                      </div>
                    </div>
                    {isActive && <ChevronRight className="w-4 h-4 text-primary shrink-0" />}
                  </motion.button>
                );
              })}

              {/* CTA dans la nav */}
              <div className="pt-4">
                <button
                  onClick={handleCTA}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-accent-foreground"
                  style={{ background: "hsl(var(--accent))", boxShadow: "0 0 16px hsl(var(--accent)/0.25)" }}
                >
                  <Sparkles className="w-4 h-4" />
                  Démarrer gratuitement
                </button>
                <p className="text-[10px] text-muted-foreground text-center mt-2">Sans carte · 14 jours offerts</p>
              </div>
            </div>

            {/* Step content */}
            <div className="rounded-2xl border border-border overflow-hidden" style={{ background: "hsl(var(--card))" }}>
              {/* Content header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border"
                style={{ background: "hsl(var(--background)/0.5)" }}>
                {(() => {
                  const step = DEMO_STEPS.find(s => s.id === activeStep);
                  if (!step) return null;
                  const Icon = step.icon;
                  return (
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${step.color}`} />
                      <span className="text-sm font-bold text-foreground">{step.label}</span>
                    </div>
                  );
                })()}
                <span className="text-[10px] text-muted-foreground font-mono">
                  {DEMO_STEPS.findIndex(s => s.id === activeStep) + 1} / {DEMO_STEPS.length}
                </span>
              </div>

              {/* Content body */}
              <div className="p-5 min-h-[400px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.25 }}
                  >
                    {STEP_CONTENT[activeStep]}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between px-5 py-4 border-t border-border">
                <button
                  onClick={() => {
                    const idx = DEMO_STEPS.findIndex(s => s.id === activeStep);
                    if (idx > 0) handleStepClick(DEMO_STEPS[idx - 1].id);
                  }}
                  disabled={DEMO_STEPS.findIndex(s => s.id === activeStep) === 0}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 flex items-center gap-1"
                >
                  ← Précédent
                </button>

                {DEMO_STEPS.findIndex(s => s.id === activeStep) < DEMO_STEPS.length - 1 ? (
                  <button
                    onClick={() => {
                      const idx = DEMO_STEPS.findIndex(s => s.id === activeStep);
                      handleStepClick(DEMO_STEPS[idx + 1].id);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-primary-foreground bg-primary hover:opacity-90 transition-opacity"
                  >
                    Étape suivante <ArrowRight className="w-3 h-3" />
                  </button>
                ) : (
                  <button
                    onClick={handleCTA}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-accent-foreground"
                    style={{ background: "hsl(var(--accent))" }}
                  >
                    <Sparkles className="w-3 h-3" /> Commencer maintenant
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── VALEUR EN 3 POINTS ── */}
        <section className="px-4 sm:px-6 py-16 border-t border-border/40">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-black text-center text-foreground mb-10">
              Ce que vous avez vu dans cette démo
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                {
                  icon: Target,
                  title: "Un parcours adapté à votre niveau",
                  desc: "Le diagnostic initial calibre votre parcours. Pas de contenu générique. Chaque module est pertinent par rapport à là où vous en êtes.",
                },
                {
                  icon: MessageSquare,
                  title: "Correction immédiate, pas de notation froide",
                  desc: "Le feedback IA explique pourquoi, pas seulement ce qui est juste. Vous comprenez pour progresser, pas pour valider une case.",
                },
                {
                  icon: FileCheck,
                  title: "Une trace de ce que vous avez appris",
                  desc: "Bibliothèque, attestations, progression — tout est enregistré. Vous pouvez prouver votre montée en compétences à tout moment.",
                },
              ].map((item) => (
                <div key={item.title} className="p-5 rounded-2xl border border-border"
                  style={{ background: "hsl(var(--card))" }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4 bg-primary/10">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground mb-2">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SOCIAL PROOF RÉALISTE ── */}
        <section className="px-4 sm:px-6 py-12 max-w-4xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              { icon: Users, value: "PME", label: "Cible principale" },
              { icon: Clock, value: "< 5 min", label: "Première victoire" },
              { icon: Award, value: "25 membres", label: "Par abonnement" },
              { icon: Shield, value: "59€/mois", label: "Tout inclus" },
            ].map((s) => (
              <div key={s.label} className="p-4 rounded-xl border border-border"
                style={{ background: "hsl(var(--card))" }}>
                <s.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                <div className="text-lg font-black text-foreground">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="px-4 sm:px-6 py-16 max-w-2xl mx-auto text-center">
          <div className="rounded-2xl p-8 border border-primary/20"
            style={{ background: "hsl(var(--card))" }}>
            <h2 className="text-2xl font-black text-foreground mb-3">
              Convaincu par ce que vous avez vu ?
            </h2>
            <p className="text-muted-foreground text-sm mb-8 max-w-sm mx-auto leading-relaxed">
              Créez votre compte gratuitement. Votre première mission est disponible en moins de 5 minutes. Aucune carte bancaire requise.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
              <button
                onClick={handleCTA}
                className="flex items-center justify-center gap-2 px-7 py-4 rounded-xl font-black text-sm text-accent-foreground"
                style={{ background: "hsl(var(--accent))", boxShadow: "0 0 20px hsl(var(--accent)/0.3)" }}
              >
                <Sparkles className="w-5 h-5" />
                Commencer gratuitement
              </button>
              <Link
                to="/pricing"
                className="flex items-center justify-center gap-2 px-7 py-4 rounded-xl font-bold text-sm border border-primary text-primary hover:bg-primary/10 transition-colors"
              >
                Voir les tarifs
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <p className="text-xs text-muted-foreground/60">
              ✓ Sans carte · ✓ RGPD · ✓ Données UE · ✓ Résiliation en 2 clics
            </p>
          </div>
        </section>

        <ProFooter />
      </div>
    </>
  );
}
