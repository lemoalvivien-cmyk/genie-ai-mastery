import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, Building2, Users, Sparkles, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { PersonaStep } from "./PersonaStep";
import { LevelStep } from "./LevelStep";
import { InterestStep } from "./InterestStep";
import { EmailStep } from "./EmailStep";
import { useAnalytics } from "@/hooks/useAnalytics";
import logoGenie from "@/assets/logo-genie.png";

export type OnboardingData = {
  persona: string;
  level: string;
  interests: string[];
};

const TOTAL_STEPS = 4;

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
  const [showConfetti, setShowConfetti] = useState(false);

  const progressPct = ((step - 1) / TOTAL_STEPS) * 100;

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

  const handleInterests = (interests: string[]) => {
    const finalData = { ...data, interests };
    track("onboarding_step_done", { step: "interests", count: interests.length });

    if (finalData.persona === "dirigeant") {
      setData((d) => ({ ...d, interests }));
      setShowOrgForm(true);
      return;
    }

    setData((d) => ({ ...d, interests }));
    setStep(4);
  };

  const handleEmailStep = async (email: string | null) => {
    // Save email lead if provided
    if (email) {
      try {
        await supabase.from("email_leads").insert({ email, source: "onboarding" });
      } catch {
        // non-blocking
      }
    }
    await saveOnboarding(data as OnboardingData, null);
  };

  const handleOrgSubmit = async () => {
    if (!orgName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      // 1. Save profile & create org in free mode (seats from Stripe later)
      if (!user) throw new Error("Non connecté");
      const slug = orgName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now();
      const orgSizeNum = parseInt(orgSize) || 5;
      const { data: orgData, error: orgErr } = await supabase
        .from("organizations")
        .insert({ name: orgName.trim(), slug, plan: "free", seats_max: orgSizeNum })
        .select("id")
        .single();
      if (orgErr) throw orgErr;

      // Assign manager role
      await supabase.from("user_roles").upsert({ user_id: user.id, role: "manager", org_id: orgData.id });
      await supabase.from("profiles").update({
        persona: data.persona as never,
        level: ({ debutant: 1, intermediaire: 3, avance: 5 } as Record<string, number>)[data.level ?? "debutant"] ?? 1,
        onboarding_completed: true,
        has_completed_welcome: true,
        org_id: orgData.id,
        role: "manager",
      }).eq("id", user.id);
      await fetchProfile(user.id);
      track("onboarding_done", { persona: data.persona, has_org: true });

      // 2. Redirect to Stripe checkout to activate seats
      const seatsNeeded = Math.max(1, Math.ceil(orgSizeNum / 25));
      const { data: checkoutData, error: checkoutErr } = await supabase.functions.invoke("create-checkout", {
        body: { seats: seatsNeeded },
      });
      if (checkoutErr || !checkoutData?.url) {
        // Fall back to dashboard if Stripe unavailable
        setShowConfetti(true);
        setTimeout(() => navigate("/app/dashboard", { replace: true }), 1800);
        return;
      }
      window.location.href = checkoutData.url;
    } catch (e) {
      setError("Une erreur est survenue. Réessayez.");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const saveOnboarding = async (finalData: OnboardingData, org: { name: string; size: string } | null) => {
    if (!user) return;
    setSaving(true);
    setError(null);

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
          await supabase.from("user_roles").upsert({ user_id: user.id, role: "manager", org_id: orgData.id });
        }
      }

      const levelMap: Record<string, number> = { debutant: 1, intermediaire: 3, avance: 5 };

      await supabase.from("profiles").update({
        persona: finalData.persona as "dirigeant" | "independant" | "jeune" | "parent" | "salarie" | "senior",
        level: levelMap[finalData.level] ?? 1,
        onboarding_completed: true,
        has_completed_welcome: true,
        ...(org_id ? { org_id, role: "manager" } : {}),
      }).eq("id", user.id);

      await fetchProfile(user.id);
      track("onboarding_done", { persona: finalData.persona, level: finalData.level, has_org: !!org_id });

      // Confetti then redirect
      setShowConfetti(true);
      setTimeout(() => navigate("/app/dashboard", { replace: true }), 1800);
    } catch {
      setError("Une erreur est survenue. Réessayez.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Bienvenue – GENIE IA</title>
      </Helmet>

      {/* Confetti */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className={`absolute w-2 h-2 rounded-sm animate-bounce ${["bg-primary","bg-accent","bg-yellow-400","bg-emerald-400","bg-pink-400"][i % 5]}`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `-${Math.random() * 10}%`,
                animationDelay: `${Math.random() * 1.5}s`,
                animationDuration: `${0.8 + Math.random() * 1.5}s`,
              }}
            />
          ))}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="glass rounded-3xl px-10 py-8 text-center animate-slide-up">
              <Sparkles className="w-12 h-12 mx-auto mb-3" style={{ color: "hsl(var(--accent))" }} />
              <p className="text-2xl font-black text-foreground">Votre Génie est prêt !</p>
              <p className="text-muted-foreground mt-1">Redirection en cours…</p>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-background flex flex-col">
        {/* Top bar with progress */}
        <div className="px-4 pt-6 pb-2 max-w-2xl mx-auto w-full">
          <div className="flex items-center justify-between mb-3">
            <img src={logoGenie} alt="GENIE IA" className="h-8 w-auto" />
            {!showOrgForm && (
              <span className="text-xs text-muted-foreground">
                Étape {Math.min(step, TOTAL_STEPS)} / {TOTAL_STEPS}
              </span>
            )}
          </div>
          {!showOrgForm && (
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--border))" }}>
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progressPct}%`,
                  background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))",
                  boxShadow: "0 0 8px rgba(82,87,216,0.4)",
                }}
              />
            </div>
          )}
        </div>

        {/* Card */}
        <div className="flex-1 flex items-start justify-center px-4 py-8">
          <div className="w-full max-w-2xl">
            {showConfetti ? null : !showOrgForm ? (
              <div className="glass rounded-2xl p-6 sm:p-8 animate-fade-in">
                {step === 1 && <PersonaStep onSelect={handlePersona} />}
                {step === 2 && <LevelStep onSelect={handleLevel} onBack={() => setStep(1)} />}
                {step === 3 && (
                  <InterestStep
                    onFinish={handleInterests}
                    onBack={() => setStep(2)}
                    saving={saving}
                  />
                )}
                {step === 4 && (
                  <EmailStep
                    onFinish={handleEmailStep}
                    onBack={() => setStep(3)}
                    saving={saving}
                  />
                )}
                {error && <p role="alert" className="mt-4 text-sm text-destructive text-center">{error}</p>}
              </div>
            ) : (
              /* Org form for Dirigeant */
              <div className="glass rounded-2xl p-6 sm:p-8 animate-fade-in">
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
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
                        style={{ background: "hsl(var(--secondary)/0.6)", border: "1px solid hsl(var(--border))" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="org-size" className="block text-sm font-medium mb-1.5">Nombre d'employés</label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <select
                        id="org-size"
                        value={orgSize}
                        onChange={(e) => setOrgSize(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all appearance-none"
                        style={{ background: "hsl(var(--secondary)/0.6)", border: "1px solid hsl(var(--border))" }}
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

                  {/* Stripe CTA notice */}
                  <div className="flex items-start gap-2.5 p-3 rounded-xl border border-primary/20 bg-primary/5">
                    <CreditCard className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Essai gratuit 14 jours</span> — Vous serez redirigé vers le paiement sécurisé pour activer les sièges équipe. Aucune facturation avant la fin de l'essai.
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => saveOnboarding(data as OnboardingData, null)}
                      disabled={saving}
                      className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
                    >
                      Continuer sans équipe
                    </button>
                    <button
                      type="button"
                      onClick={handleOrgSubmit}
                      disabled={saving || !orgName.trim()}
                      className="flex-1 py-2.5 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CreditCard className="w-4 h-4" />Créer &amp; Activer</>}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
