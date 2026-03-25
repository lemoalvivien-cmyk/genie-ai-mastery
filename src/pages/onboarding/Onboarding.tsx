/**
 * Onboarding express — 3 étapes, ~60 secondes
 * Étape 1 : Persona (qui êtes-vous)
 * Étape 2 : Niveau
 * Étape 3 : Objectif prioritaire
 * 
 * EmailStep supprimé : l'email est déjà connu via auth.users.
 * Confetti supprimé : bloquait la redirection 1.8s pour rien.
 * Redirection intelligente par profil :
 *   - dirigeant non-invité → org form → /manager/onboarding
 *   - tous les autres → /app/first-victory
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, Building2, Users, CreditCard, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { PersonaStep } from "./PersonaStep";
import { LevelStep } from "./LevelStep";
import { InterestStep } from "./InterestStep";
import { useAnalytics } from "@/hooks/useAnalytics";
import logoFormetoialia from "@/assets/logo-formetoialia.png";

export type OnboardingData = {
  persona: string;
  level: string;
  interests: string[];
};

const TOTAL_STEPS = 3;

function useInviteContext() {
  const profile = useAuthStore((s) => s.profile);
  const isInvited = !!profile?.org_id;
  const orgId: string | null = profile?.org_id ?? null;
  return { isInvited, orgId };
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, fetchProfile } = useAuthStore();
  const { track } = useAnalytics();
  const { isInvited, orgId } = useInviteContext();

  const [step, setStep] = useState(1);
  const [data, setData] = useState<Partial<OnboardingData>>({});
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgSize, setOrgSize] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Progress = current step out of 3 visible steps
  const progressPct = ((step - 1) / TOTAL_STEPS) * 100;

  const handlePersona = (persona: string) => {
    const resolvedPersona = (isInvited && persona === "dirigeant") ? "salarie" : persona;
    setData((d) => ({ ...d, persona: resolvedPersona }));
    track("onboarding_step_done", { step: "persona", value: resolvedPersona, is_invited: isInvited });
    setStep(2);
  };

  const handleLevel = (level: string) => {
    setData((d) => ({ ...d, level }));
    track("onboarding_step_done", { step: "level", value: level });
    setStep(3);
  };

  const handleInterests = (interests: string[]) => {
    track("onboarding_step_done", { step: "interests", count: interests.length });
    const finalData = { ...data, interests } as OnboardingData;

    // Dirigeant non-invité → formulaire org
    if (finalData.persona === "dirigeant" && !isInvited) {
      setData(finalData);
      setShowOrgForm(true);
      return;
    }

    setData(finalData);
    saveOnboarding(finalData);
  };

  // ── Org submit — passe par l'edge function create-org-bootstrap ────────────
  const handleOrgSubmit = async () => {
    if (!orgName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (!user) throw new Error("Non connecté");

      const orgSizeNum = parseInt(orgSize) || 5;
      const slug =
        orgName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") +
        "-" +
        Date.now();

      const { data: bootstrapResult, error: bootstrapErr } = await supabase.functions.invoke(
        "create-org-bootstrap",
        { body: { name: orgName.trim(), slug, seats_max: orgSizeNum } },
      );

      if (bootstrapErr) throw bootstrapErr;
      if (!bootstrapResult?.ok) throw new Error(bootstrapResult?.error ?? "Erreur serveur");

      const newOrgId: string = bootstrapResult.org_id;

      await supabase.from("profiles").update({
        persona: data.persona as never,
        level: ({ debutant: 1, intermediaire: 3, avance: 5 } as Record<string, number>)[data.level ?? "debutant"] ?? 1,
        onboarding_completed: true,
        has_completed_welcome: true,
      }).eq("id", user.id);

      await fetchProfile(user.id);
      track("onboarding_done", { persona: data.persona, has_org: true, org_id: newOrgId });

      // Dirigeant → checkout ou manager onboarding
      const seatsNeeded = Math.max(1, Math.ceil(orgSizeNum / 25));
      const { data: checkoutData, error: checkoutErr } = await supabase.functions.invoke(
        "create-checkout",
        { body: { seats: seatsNeeded } },
      );
      if (checkoutErr || !checkoutData?.url) {
        navigate("/manager/onboarding", { replace: true });
        return;
      }
      window.location.href = checkoutData.url;
    } catch (e) {
      setError((e as Error).message ?? "Une erreur est survenue. Réessayez.");
    } finally {
      setSaving(false);
    }
  };

  // ── saveOnboarding — flux collaborateur invité ou utilisateur individuel ──
  const saveOnboarding = async (finalData: OnboardingData) => {
    if (!user) return;
    setSaving(true);
    setError(null);

    try {
      const levelMap: Record<string, number> = { debutant: 1, intermediaire: 3, avance: 5 };

      const profileUpdate: Record<string, unknown> = {
        persona: finalData.persona as "dirigeant" | "independant" | "jeune" | "parent" | "salarie" | "senior",
        level: levelMap[finalData.level] ?? 1,
        onboarding_completed: true,
        has_completed_welcome: true,
      };

      await supabase.from("profiles").update(profileUpdate).eq("id", user.id);
      await fetchProfile(user.id);
      track("onboarding_done", {
        persona: finalData.persona,
        level: finalData.level,
        has_org: !!orgId,
        is_invited: isInvited,
      });

      // Redirection directe — pas de confetti bloquant
      navigate("/app/first-victory", { replace: true });
    } catch {
      setError("Une erreur est survenue. Réessayez.");
      setSaving(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Bienvenue – Formetoialia</title>
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        {/* Top bar with progress */}
        <div className="px-4 pt-6 pb-2 max-w-2xl mx-auto w-full">
          <div className="flex items-center justify-between mb-3">
            <img src={logoFormetoialia} alt="Formetoialia" className="h-8 w-auto" />
            <div className="flex items-center gap-3">
              {isInvited && (
                <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary font-medium">
                  <ShieldCheck className="w-3 h-3" />
                  Collaborateur invité
                </span>
              )}
              {!showOrgForm && (
                <span className="text-xs text-muted-foreground">
                  {step} / {TOTAL_STEPS}
                </span>
              )}
            </div>
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
            {!showOrgForm ? (
              <div className="glass rounded-2xl p-6 sm:p-8 animate-fade-in">
                {step === 1 && <PersonaStep onSelect={handlePersona} isInvited={isInvited} />}
                {step === 2 && <LevelStep onSelect={handleLevel} onBack={() => setStep(1)} />}
                {step === 3 && (
                  <InterestStep
                    onFinish={handleInterests}
                    onBack={() => setStep(2)}
                    saving={saving}
                  />
                )}
                {error && <p role="alert" className="mt-4 text-sm text-destructive text-center">{error}</p>}
              </div>
            ) : (
              /* Org form — uniquement pour dirigeant non-invité */
              <div className="glass rounded-2xl p-6 sm:p-8 animate-fade-in">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-3 shadow-glow">
                    <Building2 className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h2 className="text-xl font-bold">Créez votre espace équipe</h2>
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
                    <label htmlFor="org-size" className="block text-sm font-medium mb-1.5">Nombre de collaborateurs</label>
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

                  <div className="flex items-start gap-2.5 p-3 rounded-xl border border-primary/20 bg-primary/5">
                    <CreditCard className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Essai gratuit 14 jours</span> — Vous serez redirigé vers le paiement sécurisé pour activer les sièges équipe. Aucune facturation avant la fin de l'essai.
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => saveOnboarding(data as OnboardingData)}
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
                      {saving
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <><CreditCard className="w-4 h-4" />Créer &amp; Activer</>
                      }
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
