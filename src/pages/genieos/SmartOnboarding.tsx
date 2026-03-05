import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Sparkles, ArrowRight, CheckCircle2, Loader2, Bot, Zap, TrendingUp,
  Code2, Brain, Target, Briefcase, Rocket, User, BarChart2, Shield,
} from "lucide-react";

/* ── Types ── */
type Step = "objective" | "activity" | "level" | "projects" | "result";

interface OnboardingData {
  objectives: string[];
  activity: string;
  level: string;
  projects: string[];
}

interface Plan {
  agents: { name: string; desc: string; icon: string }[];
  automations: { name: string; desc: string }[];
  actions: { label: string; priority: "high" | "medium" }[];
}

/* ── Config ── */
const OBJECTIVES = [
  { id: "revenue", label: "Générer du revenu", icon: TrendingUp },
  { id: "automate", label: "Automatiser mes tâches", icon: Zap },
  { id: "build", label: "Construire un produit", icon: Rocket },
  { id: "learn", label: "Apprendre l'IA", icon: Brain },
  { id: "compete", label: "Veille concurrentielle", icon: BarChart2 },
  { id: "secure", label: "Sécuriser mon activité", icon: Shield },
];

const ACTIVITIES = [
  { id: "entrepreneur", label: "Entrepreneur", icon: Briefcase },
  { id: "freelance", label: "Freelance", icon: User },
  { id: "startup", label: "Startup", icon: Rocket },
  { id: "corporate", label: "Grande entreprise", icon: BarChart2 },
  { id: "developer", label: "Développeur", icon: Code2 },
  { id: "marketing", label: "Marketing/Growth", icon: TrendingUp },
];

const LEVELS = [
  { id: "beginner", label: "Débutant", desc: "Je découvre l'IA" },
  { id: "intermediate", label: "Intermédiaire", desc: "J'utilise déjà quelques outils IA" },
  { id: "advanced", label: "Avancé", desc: "Je maîtrise les workflows IA" },
  { id: "expert", label: "Expert", desc: "Je construis avec l'IA" },
];

const PROJECT_IDEAS = [
  "SaaS", "Application mobile", "E-commerce", "Contenu/Média",
  "Consulting IA", "Automatisation interne", "Veille marché", "Lead generation",
];

/* ── Step components ── */
function SelectGrid<T extends { id: string; label: string }>({
  options, selected, onToggle, multi = false, renderItem,
}: {
  options: T[];
  selected: string[];
  onToggle: (id: string) => void;
  multi?: boolean;
  renderItem?: (opt: T, active: boolean) => React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {options.map((opt) => {
        const active = selected.includes(opt.id);
        return (
          <button
            key={opt.id}
            onClick={() => onToggle(opt.id)}
            className={cn(
              "relative p-4 rounded-xl border text-left transition-all duration-150",
              active
                ? "border-primary/60 bg-primary/10 text-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-muted/30"
            )}
          >
            {active && <CheckCircle2 className="absolute top-2 right-2 w-3.5 h-3.5 text-primary" />}
            {renderItem ? renderItem(opt, active) : (
              <span className="text-sm font-medium">{opt.label}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── Plan generator (local heuristic) ── */
function generatePlan(data: OnboardingData): Plan {
  const agents: Plan["agents"] = [];
  const automations: Plan["automations"] = [];
  const actions: Plan["actions"] = [];

  if (data.objectives.includes("revenue")) {
    agents.push({ name: "Revenue Agent", desc: "Génère des leads et opportunités", icon: "💰" });
    automations.push({ name: "Lead scanner", desc: "Scanne les marchés chaque matin" });
    actions.push({ label: "Lancer Revenue Engine", priority: "high" });
  }
  if (data.objectives.includes("automate")) {
    agents.push({ name: "Automation Agent", desc: "Automatise vos workflows répétitifs", icon: "⚡" });
    automations.push({ name: "Daily digest", desc: "Résumé quotidien de vos tâches" });
    actions.push({ label: "Créer votre premier workflow", priority: "high" });
  }
  if (data.objectives.includes("build")) {
    agents.push({ name: "Co-Founder IA", desc: "Analyse et valide vos idées produit", icon: "🚀" });
    automations.push({ name: "Market analyser", desc: "Veille sur votre secteur" });
    actions.push({ label: "Décrire votre idée produit", priority: "high" });
  }
  if (data.objectives.includes("learn")) {
    agents.push({ name: "Learning Agent", desc: "Parcours personnalisé selon votre niveau", icon: "🧠" });
    actions.push({ label: "Explorer le Skill Graph", priority: "medium" });
  }
  if (data.objectives.includes("compete")) {
    agents.push({ name: "Veille Agent", desc: "Surveille la concurrence en temps réel", icon: "👁️" });
    automations.push({ name: "AI Watch", desc: "Alertes sur les tendances IA" });
    actions.push({ label: "Configurer les sources de veille", priority: "medium" });
  }
  if (data.level === "beginner") {
    actions.push({ label: "Faire le tour de GENIE OS", priority: "medium" });
  }
  if (data.level === "expert" || data.level === "advanced") {
    agents.push({ name: "Multi-Agent Runner", desc: "Orchestrez plusieurs agents en parallèle", icon: "🤖" });
    actions.push({ label: "Builder un agent personnalisé", priority: "medium" });
  }
  if (data.projects.length > 0) {
    actions.push({ label: `Générer l'architecture pour : ${data.projects[0]}`, priority: "high" });
  }

  // Ensure at least some defaults
  if (agents.length === 0) agents.push({ name: "Assistant IA", desc: "Votre copilote général", icon: "✨" });
  if (actions.length === 0) actions.push({ label: "Découvrir le Chat IA", priority: "medium" });

  return { agents: agents.slice(0, 4), automations: automations.slice(0, 3), actions: actions.slice(0, 5) };
}

/* ── Main Component ── */
export default function SmartOnboarding() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("objective");
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    objectives: [], activity: "", level: "", projects: [],
  });
  const [plan, setPlan] = useState<Plan | null>(null);

  const toggle = (field: keyof OnboardingData, value: string, multi = false) => {
    setData((prev) => {
      const arr = prev[field] as string[];
      if (!multi) return { ...prev, [field]: [value] };
      return {
        ...prev,
        [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      };
    });
  };

  const canNext = () => {
    if (step === "objective") return data.objectives.length > 0;
    if (step === "activity") return data.activity.length > 0;
    if (step === "level") return data.level.length > 0;
    return true;
  };

  const next = async () => {
    if (step === "objective") setStep("activity");
    else if (step === "activity") setStep("level");
    else if (step === "level") setStep("projects");
    else if (step === "projects") {
      const generatedPlan = generatePlan(data);
      setPlan(generatedPlan);
      setSaving(true);
      try {
        if (user?.id) {
          await supabase.from("genieos_user_memory").upsert({
            user_id: user.id,
            primary_goals: data.objectives,
            preferences: { activity: data.activity, level: data.level, projects: data.projects },
            context_summary: `Activité: ${data.activity}, Niveau: ${data.level}, Objectifs: ${data.objectives.join(", ")}`,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });
          await supabase.from("memory_timeline").insert([{
            user_id: user.id,
            title: "Onboarding GENIE OS complété",
            summary: `Plan généré avec ${generatedPlan.agents.length} agents recommandés`,
            event_type: "insight",
            importance: "high",
            metadata: { plan: generatedPlan, onboarding_data: data } as any,
          }]);
        }
      } catch (e) { /* non-blocking */ }
      setSaving(false);
      setStep("result");
    }
  };

  const STEPS: Step[] = ["objective", "activity", "level", "projects", "result"];
  const stepIndex = STEPS.indexOf(step);
  const progress = (stepIndex / (STEPS.length - 1)) * 100;

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 mb-2">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Bienvenue sur GENIE OS</h1>
          <p className="text-muted-foreground text-sm">
            Quelques questions pour personnaliser votre expérience
          </p>
        </div>

        {/* Progress */}
        {step !== "result" && (
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Step content */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          {step === "objective" && (
            <>
              <h2 className="text-lg font-semibold text-foreground">Quels sont vos objectifs ?</h2>
              <p className="text-sm text-muted-foreground">Sélectionnez tout ce qui s'applique</p>
              <SelectGrid
                options={OBJECTIVES}
                selected={data.objectives}
                onToggle={(id) => toggle("objectives", id, true)}
                multi
                renderItem={(opt, active) => (
                  <div className="flex flex-col gap-1.5">
                    <opt.icon className={cn("w-5 h-5", active ? "text-primary" : "text-muted-foreground")} />
                    <span className="text-sm font-medium text-foreground">{opt.label}</span>
                  </div>
                )}
              />
            </>
          )}

          {step === "activity" && (
            <>
              <h2 className="text-lg font-semibold text-foreground">Quelle est votre activité ?</h2>
              <p className="text-sm text-muted-foreground">Choisissez le profil qui vous correspond le mieux</p>
              <SelectGrid
                options={ACTIVITIES}
                selected={[data.activity]}
                onToggle={(id) => toggle("activity", id)}
                renderItem={(opt, active) => (
                  <div className="flex flex-col gap-1.5">
                    <opt.icon className={cn("w-5 h-5", active ? "text-primary" : "text-muted-foreground")} />
                    <span className="text-sm font-medium text-foreground">{opt.label}</span>
                  </div>
                )}
              />
            </>
          )}

          {step === "level" && (
            <>
              <h2 className="text-lg font-semibold text-foreground">Votre niveau IA ?</h2>
              <p className="text-sm text-muted-foreground">Cela nous aide à personnaliser votre plan</p>
              <div className="space-y-3">
                {LEVELS.map((l) => {
                  const active = data.level === l.id;
                  return (
                    <button
                      key={l.id}
                      onClick={() => toggle("level", l.id)}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all",
                        active
                          ? "border-primary/60 bg-primary/10"
                          : "border-border bg-card/50 hover:border-primary/30"
                      )}
                    >
                      {active
                        ? <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                        : <div className="w-5 h-5 rounded-full border-2 border-border flex-shrink-0" />
                      }
                      <div>
                        <p className={cn("text-sm font-semibold", active ? "text-foreground" : "text-muted-foreground")}>{l.label}</p>
                        <p className="text-xs text-muted-foreground">{l.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === "projects" && (
            <>
              <h2 className="text-lg font-semibold text-foreground">Quels projets vous intéressent ?</h2>
              <p className="text-sm text-muted-foreground">Optionnel — vous pouvez passer cette étape</p>
              <div className="flex flex-wrap gap-2">
                {PROJECT_IDEAS.map((p) => {
                  const active = data.projects.includes(p);
                  return (
                    <button
                      key={p}
                      onClick={() => toggle("projects", p, true)}
                      className={cn(
                        "px-3 py-1.5 rounded-full border text-sm transition-all",
                        active
                          ? "border-primary/60 bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:border-primary/30"
                      )}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === "result" && plan && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Votre plan est prêt !</h2>
                <p className="text-sm text-muted-foreground">GENIE OS a généré votre configuration personnalisée</p>
              </div>

              {/* Agents recommandés */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                  Agents recommandés
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {plan.agents.map((a, i) => (
                    <div key={i} className="flex items-center gap-2.5 p-3 rounded-lg border border-border bg-card/50">
                      <span className="text-xl">{a.icon}</span>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{a.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{a.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions prioritaires */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                  Actions prioritaires
                </p>
                <div className="space-y-2">
                  {plan.actions.map((a, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full flex-shrink-0",
                        a.priority === "high" ? "bg-primary" : "bg-muted-foreground"
                      )} />
                      <span className="text-sm text-foreground">{a.label}</span>
                      {a.priority === "high" && (
                        <Badge className="ml-auto text-xs h-4 px-1.5 bg-primary/20 text-primary border-primary/30">
                          Prioritaire
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Automations */}
              {plan.automations.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                    Automations suggérées
                  </p>
                  <div className="space-y-1.5">
                    {plan.automations.map((a, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Zap className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                        <span className="text-sm text-foreground">{a.name}</span>
                        <span className="text-xs text-muted-foreground ml-1">— {a.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          {step !== "result" ? (
            <>
              {stepIndex > 0 ? (
                <Button variant="ghost" size="sm" onClick={() => {
                  const prev = STEPS[stepIndex - 1];
                  setStep(prev);
                }}>
                  Retour
                </Button>
              ) : <div />}
              <Button
                onClick={next}
                disabled={!canNext() || saving}
                className="gap-2"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Génération...</>
                ) : step === "projects" ? (
                  <><Sparkles className="w-4 h-4" /> Générer mon plan</>
                ) : (
                  <>Suivant <ArrowRight className="w-4 h-4" /></>
                )}
              </Button>
            </>
          ) : (
            <Button className="w-full gap-2" onClick={() => navigate("/os/control")}>
              <Bot className="w-4 h-4" />
              Accéder à mon Command Center
            </Button>
          )}
        </div>

        {step === "projects" && (
          <button
            onClick={next}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Passer cette étape →
          </button>
        )}
      </div>
    </div>
  );
}
