import { useState } from "react";
import { z } from "zod";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Loader2, Mail, ArrowRight } from "lucide-react";

const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "L'email est requis")
    .email("Adresse email invalide")
    .max(255, "Email trop long"),
});

type FormState = "idle" | "loading" | "success" | "error";

// Simple rate limiter: max 3 attempts per 60 seconds
const attempts: number[] = [];
function checkRateLimit(): boolean {
  const now = Date.now();
  const windowStart = now - 60_000;
  const recent = attempts.filter((t) => t > windowStart);
  if (recent.length >= 3) return false;
  attempts.push(now);
  return true;
}

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<FormState>("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!checkRateLimit()) {
      setError("Trop de tentatives. Réessayez dans une minute.");
      return;
    }

    const sanitized = DOMPurify.sanitize(email.trim());
    const result = emailSchema.safeParse({ email: sanitized });

    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setState("loading");

    try {
      const { error: dbError } = await supabase
        .from("waitlist")
        .insert({ email: result.data.email });

      if (dbError) {
        if (dbError.code === "23505") {
          setError("Cet email est déjà sur la liste d'attente !");
          setState("idle");
          return;
        }
        throw dbError;
      }

      setState("success");
    } catch {
      setError("Une erreur est survenue. Réessayez.");
      setState("idle");
    }
  };

  if (state === "success") {
    return (
      <div className="flex flex-col items-center gap-3 py-4 animate-slide-up" role="status">
        <div className="w-14 h-14 rounded-full bg-emerald/10 border border-emerald/30 flex items-center justify-center">
          <CheckCircle className="w-7 h-7 text-emerald" aria-hidden="true" />
        </div>
        <p className="text-lg font-semibold text-foreground">Vous êtes sur la liste !</p>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          Nous vous enverrons un email dès que GENIE IA sera disponible.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto" noValidate>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Mail
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            placeholder="votre@email.com"
            aria-label="Adresse email pour la liste d'attente"
            aria-describedby={error ? "email-error" : undefined}
            aria-invalid={!!error}
            disabled={state === "loading"}
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all duration-200 disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={state === "loading" || !email}
          aria-label="Rejoindre la liste d'attente"
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold gradient-primary text-primary-foreground shadow-glow hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 whitespace-nowrap focus-ring"
        >
          {state === "loading" ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <>
              Rejoindre <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </>
          )}
        </button>
      </div>
      {error && (
        <p id="email-error" role="alert" className="mt-2 text-sm text-destructive flex items-center gap-1.5">
          <span aria-hidden="true">⚠</span> {error}
        </p>
      )}
      <p className="mt-3 text-xs text-muted-foreground text-center">
        Pas de spam. Désabonnement en un clic. 🔒
      </p>
    </form>
  );
}
