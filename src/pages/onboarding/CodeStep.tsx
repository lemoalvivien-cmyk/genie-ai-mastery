import { useState } from "react";
import { z } from "zod";
import { Loader2, Gift, Users, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAnalytics } from "@/hooks/useAnalytics";

const schema = z.object({
  access_code: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^FTI-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(v.trim()),
      { message: "Format attendu : FTI-XXXX-XXXX" },
    ),
  referral_code: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^PARTNER-[A-Z0-9]{4}$/i.test(v.trim()),
      { message: "Format attendu : PARTNER-XXXX" },
    ),
});

interface Props {
  onDone: () => void;
  onSkip: () => void;
}

type ActivationResult = { type: "access" | "referral"; message: string } | null;

export function CodeStep({ onDone, onSkip }: Props) {
  const { track } = useAnalytics();
  const [accessCode, setAccessCode] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [errors, setErrors] = useState<{ access_code?: string; referral_code?: string }>({});
  const [loading, setLoading] = useState(false);
  const [activated, setActivated] = useState<ActivationResult>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setGlobalError(null);
    setErrors({});

    const parsed = schema.safeParse({
      access_code: accessCode || undefined,
      referral_code: referralCode || undefined,
    });

    if (!parsed.success) {
      const fieldErrors: { access_code?: string; referral_code?: string } = {};
      parsed.error.errors.forEach((e) => {
        const field = e.path[0] as string;
        fieldErrors[field as keyof typeof fieldErrors] = e.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (!accessCode.trim() && !referralCode.trim()) {
      onSkip();
      return;
    }

    setLoading(true);

    try {
      // Handle access code
      if (accessCode.trim()) {
        const { data, error } = await supabase.functions.invoke("redeem-code", {
          body: { code: accessCode.trim().toUpperCase() },
        });

        if (error || data?.error) {
          setErrors({ access_code: data?.error ?? "Code invalide ou expiré" });
          setLoading(false);
          return;
        }

        setActivated({ type: "access", message: data.message ?? "Accès activé ! 🎉" });
        await track("access_code_redeemed", { code: accessCode.trim().toUpperCase(), plan: data.plan });
      }

      // Handle referral code
      if (referralCode.trim()) {
        const { data, error } = await supabase.rpc("resolve_referral", {
          _code: referralCode.trim().toUpperCase(),
        });

        const refData = data as Record<string, unknown> | null;

        if (error || !refData?.found) {
          setErrors((prev) => ({ ...prev, referral_code: "Code partenaire introuvable ou inactif" }));
          setLoading(false);
          return;
        }

        // Store referral attribution via analytics
        await track("referral_applied", {
          referral_code: referralCode.trim().toUpperCase(),
          partner_id: refData.partner_id,
          partner_name: refData.partner_name,
        });

        if (!activated) {
          setActivated({ type: "referral", message: `Code partenaire appliqué via ${refData.partner_name} ✅` });
        }
      }

      setTimeout(() => onDone(), 1200);
    } catch {
      setGlobalError("Une erreur est survenue. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-3 shadow-glow">
          <Gift className="w-7 h-7 text-primary-foreground" />
        </div>
        <h2 className="text-xl font-bold">Vous avez un code ?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Code d'accès ou code partenaire — 100% facultatif
        </p>
      </div>

      {activated ? (
        <div className="flex flex-col items-center gap-4 py-4 animate-fade-in">
          <CheckCircle2 className="w-12 h-12 text-primary" />
          <p className="text-center font-semibold">{activated.message}</p>
          <p className="text-sm text-muted-foreground">Redirection en cours…</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Access code field */}
          <div>
            <label htmlFor="access-code" className="block text-sm font-medium mb-1.5">
              Code d'accès <span className="text-muted-foreground font-normal">(GENIE-XXXX-XXXX)</span>
            </label>
            <input
              id="access-code"
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              placeholder="GENIE-A1B2-C3D4"
              maxLength={14}
              className="w-full px-4 py-2.5 rounded-xl bg-secondary/60 border border-border text-sm font-mono placeholder:text-muted-foreground/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all uppercase"
            />
            {errors.access_code && (
              <p className="mt-1 text-xs text-destructive">{errors.access_code}</p>
            )}
          </div>

          {/* Referral code field */}
          <div>
            <label htmlFor="referral-code" className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Code partenaire <span className="text-muted-foreground font-normal">(PARTNER-XXXX)</span>
            </label>
            <input
              id="referral-code"
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="PARTNER-AB12"
              maxLength={12}
              className="w-full px-4 py-2.5 rounded-xl bg-secondary/60 border border-border text-sm font-mono placeholder:text-muted-foreground/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all uppercase"
            />
            {errors.referral_code && (
              <p className="mt-1 text-xs text-destructive">{errors.referral_code}</p>
            )}
          </div>

          {globalError && (
            <p role="alert" className="text-sm text-destructive text-center">{globalError}</p>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Activation…</>
              ) : (
                <>Activer <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="w-full py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all flex items-center justify-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Passer cette étape
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
