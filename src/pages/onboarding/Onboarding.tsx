import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Brain, Loader2, Building2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { PersonaStep } from "./PersonaStep";
import { LevelStep } from "./LevelStep";
import { InterestStep } from "./InterestStep";
import { CodeStep } from "./CodeStep";
import { useAnalytics } from "@/hooks/useAnalytics";

export type OnboardingData = {
  persona: string;
  level: string;
  interests: string[];
};

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, fetchProfile } = useAuthStore();
  const { track } = useAnalytics();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<Partial<OnboardingData>>({});
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgSize, setOrgSize] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCodeStep, setShowCodeStep] = useState(false);

  const totalSteps = 3;

  const handlePersona = (persona: string) => {
    setData((d) => ({ ...d, persona }));
    track("onboarding_step_done", { step: "persona", value: persona });
    setStep(2);
  };

  const handleLevel = (level: string) => {
    setData((d) => ({ ...d, level }));
    track("onboarding_step_done", { step: "level", value: level });
    setStep(3);
  };

  const handleFinish = async (interests: string[]) => {
    const finalData = { ...data, interests };
    setError(null);
    track("onboarding_step_done", { step: "interests", count: interests.length });

    if (finalData.persona === "dirigeant") {
      setData((d) => ({ ...d, interests }));
      setShowOrgForm(true);
      return;
    }

    await saveOnboarding(finalData as OnboardingData, null);
  };

  const handleOrgSubmit = async () => {
    await saveOnboarding(data as OnboardingData, orgName.trim() ? { name: orgName.trim(), size: orgSize } : null);
  };

  const saveOnboarding = async (finalData: OnboardingData, org: { name: string; size: string } | null) => {
    if (!user) return;
    setSaving(true);

    try {
      let org_id: string | null = null;

      if (org?.name) {
        const slug = org.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now();
        const { data: orgData, error: orgErr } = await supabase
          .from("organizations")
          .insert({ name: org.name, slug, plan: "free", seats_max: parseInt(org.size) || 5 })
          .select("id")
          .single();

        if (!orgErr && orgData) {
          org_id = orgData.id;
          await supabase.from("user_roles").upsert({
            user_id: user.id,
            role: "manager",
            org_id: orgData.id,
          });
        }
      }

      const levelMap: Record<string, number> = {
        debutant: 1,
        intermediaire: 3,
        avance: 5,
      };

      await supabase.from("profiles").update({
        persona: finalData.persona as any,
        level: levelMap[finalData.level] ?? 1,
        onboarding_completed: true,
        ...(org_id ? { org_id, role: "manager" } : {}),
      }).eq("id", user.id);

      await fetchProfile(user.id);
      track("onboarding_step_done", { step: "completed", persona: finalData.persona });
      setShowCodeStep(true);
    } catch {
      setError("Une erreur est survenue. Réessayez.");
    } finally {
      setSaving(false);
    }
  };

  const goToToday = () => navigate("/app/today", { replace: true });

  return (
    <>
      <Helmet>
        <title>Bienvenue – GENIE IA</title>
      </Helmet>

      <div className="min-h-screen gradient-hero flex items-center justify-center px-4 py-12">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/8 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

        <div className="w-full max-w-2xl relative z-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">GENIE <span className="text-gradient">IA</span></span>
            </div>
            {!showOrgForm && !showCodeStep && (
              <>
                <h1 className="text-2xl font-bold mb-1">Configurons votre Génie</h1>
                <p className="text-sm text-muted-foreground">Étape {step} sur {totalSteps}</p>
                <div className="mt-4 flex gap-1.5 justify-center" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={totalSteps}>
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-500 ${i < step ? "w-12 bg-primary" : "w-8 bg-border"}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Steps */}
          {showCodeStep ? (
            <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 sm:p-8 shadow-card animate-fade-in">
              <CodeStep
                onDone={goToToday}
                onSkip={goToToday}
              />
            </div>
          ) : !showOrgForm ? (
            <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 sm:p-8 shadow-card">
              {step === 1 && <PersonaStep onSelect={handlePersona} />}
              {step === 2 && <LevelStep onSelect={handleLevel} onBack={() => setStep(1)} />}
              {step === 3 && <InterestStep onFinish={handleFinish} onBack={() => setStep(2)} saving={saving} />}
              {error && <p role="alert" className="mt-4 text-sm text-destructive text-center">{error}</p>}
            </div>
          ) : (
            /* Org creation form for Dirigeant */
            <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 sm:p-8 shadow-card">
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-3 shadow-glow">
                  <Building2 className="w-7 h-7 text-primary-foreground" />
                </div>
                <h2 className="text-xl font-bold">Créez votre espace entreprise</h2>
                <p className="text-sm text-muted-foreground mt-1">Formez votre équipe depuis un dashboard dédié</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="org-name" className="block text-sm font-medium mb-1.5">
                    Nom de l'entreprise <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="org-name"
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="Acme SAS"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/60 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="org-size" className="block text-sm font-medium mb-1.5">
                    Nombre d'employés estimé
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <select
                      id="org-size"
                      value={orgSize}
                      onChange={(e) => setOrgSize(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/60 border border-border text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all appearance-none"
                    >
                      <option value="">Choisir...</option>
                      <option value="5">1 – 10</option>
                      <option value="25">11 – 50</option>
                      <option value="100">51 – 200</option>
                      <option value="500">200+</option>
                    </select>
                  </div>
                </div>

                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => saveOnboarding(data as OnboardingData, null)}
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all disabled:opacity-50"
                  >
                    Passer cette étape
                  </button>
                  <button
                    type="button"
                    onClick={handleOrgSubmit}
                    disabled={saving || !orgName.trim()}
                    className="flex-1 py-2.5 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Créer mon espace"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
