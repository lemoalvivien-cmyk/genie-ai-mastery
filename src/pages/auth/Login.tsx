import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Eye, EyeOff, Mail, Lock, Loader2, Sparkles, Brain, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  isBlocked,
  recordFailedAttempt,
  clearAttempts,
  formatBlockedTime,
} from "@/lib/security";
import { useDeviceTracker } from "@/hooks/useDeviceTracker";
import DOMPurify from "dompurify";

const schema = z.object({
  email: z.string().trim().email("Email invalide").max(255),
  password: z.string().min(1, "Mot de passe requis"),
});
type FormData = z.infer<typeof schema>;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/app/dashboard";
  const { getDeviceId } = useDeviceTracker();

  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [magicMode, setMagicMode] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [deviceWarning, setDeviceWarning] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const emailValue = watch("email", "");

  const onSubmit = async (data: FormData) => {
    setSubmitError(null);
    setDeviceWarning(false);
    const email = DOMPurify.sanitize(data.email.trim().toLowerCase());

    // BLQ-5 : Vérification brute-force côté client (sessionStorage) conservée comme
    // première ligne de défense UX rapide. Le vrai rate-limit est enforced côté
    // serveur par Supabase Auth (lockout natif) + la RPC check_ip_rate_limit dans
    // les Edge Functions. L'attaquant qui contourne le sessionStorage se heurtera
    // au lockout Supabase Auth après 5 tentatives invalides.
    const { blocked, remainingMs } = isBlocked(email);
    if (blocked) {
      setSubmitError(
        `Trop de tentatives. Réessayez dans ${formatBlockedTime(remainingMs)}.`
      );
      return;
    }

    const { error, data: authData } = await supabase.auth.signInWithPassword({
      email,
      password: data.password,
    });

    if (error) {
      recordFailedAttempt(email);
      const { blocked: nowBlocked, remainingMs: rem } = isBlocked(email);
      if (nowBlocked) {
        setSubmitError(`Compte temporairement bloqué. Réessayez dans ${formatBlockedTime(rem)}.`);
      } else if (error.message.includes("Invalid login") || error.message.includes("invalid_credentials")) {
        setSubmitError("Email ou mot de passe incorrect.");
      } else if (error.message.includes("Email not confirmed")) {
        setSubmitError("Compte non vérifié. Vérifiez votre email.");
      } else if (error.message.includes("over_request_rate_limit") || error.message.includes("too many requests")) {
        // Lockout natif Supabase Auth — rate-limit server-side atteint
        setSubmitError("Trop de tentatives. Compte temporairement bloqué par notre système de sécurité. Réessayez dans 15 minutes.");
      } else {
        setSubmitError("Erreur de connexion. Réessayez.");
      }
      return;
    }

    clearAttempts(email);

    // Device tracking
    const currentDeviceId = getDeviceId();

    if (authData?.user) {
      // Log connexion audit
      supabase.rpc("log_event", {
        _user_id: authData.user.id,
        _event_type: "login",
        _resource_type: "auth",
        _details: { method: "password" },
      }).then(() => {});

      // Check previous device
      const { data: profile } = await supabase
        .from("profiles")
        .select("last_device_id, onboarding_completed")
        .eq("id", authData.user.id)
        .single();

      const previousDeviceId = (profile as { last_device_id?: string | null; onboarding_completed?: boolean | null } | null)?.last_device_id;

      if (previousDeviceId && previousDeviceId !== currentDeviceId) {
        // Different device detected: sign out all other sessions, show warning
        await supabase.auth.signOut({ scope: "others" });
        setDeviceWarning(true);
      }

      // Update last_device_id
      await supabase
        .from("profiles")
        .update({ last_device_id: currentDeviceId })
        .eq("id", authData.user.id);

      // Redirect after short delay if warning shown
      const redirectFn = () => {
        if (!profile?.onboarding_completed) {
          navigate("/onboarding", { replace: true });
        } else {
          navigate(from, { replace: true });
        }
      };

      if (previousDeviceId && previousDeviceId !== currentDeviceId) {
        // Let user read the warning briefly before redirect
        setTimeout(redirectFn, 3500);
      } else {
        redirectFn();
      }
    }
  };

  const sendMagicLink = async () => {
    if (!emailValue) return;
    setMagicLoading(true);
    // Redirige vers /onboarding — le flux Auth vérifie onboarding_completed
    // et redirige ensuite vers /app/dashboard si déjà complété.
    const { error } = await supabase.auth.signInWithOtp({
      email: DOMPurify.sanitize(emailValue.trim().toLowerCase()),
      options: { emailRedirectTo: `${window.location.origin}/onboarding` },
    });
    setMagicLoading(false);
    if (error) {
      setSubmitError("Impossible d'envoyer le lien. Réessayez.");
    } else {
      setMagicSent(true);
    }
  };

  const sendReset = async () => {
    if (!emailValue) return;
    setMagicLoading(true);
    await supabase.auth.resetPasswordForEmail(
      DOMPurify.sanitize(emailValue.trim().toLowerCase()),
      { redirectTo: `${window.location.origin}/reset-password` }
    );
    setMagicLoading(false);
    setResetSent(true);
  };

  return (
    <>
      <Helmet>
        <title>Connexion – GENIE IA</title>
        <meta name="description" content="Connectez-vous à votre espace GENIE IA." />
      </Helmet>

      <div className="min-h-screen gradient-hero flex items-center justify-center px-4 py-12">
        <div className="absolute top-1/3 right-1/3 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">GENIE <span className="text-gradient">IA</span></span>
            </Link>
            <h1 className="text-2xl font-bold">
              {resetMode ? "Mot de passe oublié" : magicMode ? "Lien magique" : "Connexion"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {resetMode ? "Recevez un lien de réinitialisation" : magicMode ? "Connectez-vous sans mot de passe" : "Bon retour parmi nous !"}
            </p>
          </div>

          {/* Device change security warning */}
          {deviceWarning && (
            <div role="alert" className="mb-4 p-4 rounded-xl bg-warning/10 border border-warning/40 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-warning mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-warning">Nouvel appareil détecté</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Une connexion depuis un nouvel appareil a été détectée. L'ancienne session a été déconnectée pour sécuriser votre compte. Redirection en cours…
                </p>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 shadow-card">
            {(magicSent || resetSent) ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 rounded-full bg-emerald/10 border border-emerald/30 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-7 h-7 text-emerald" />
                </div>
                <h2 className="text-lg font-semibold mb-2">Email envoyé !</h2>
                <p className="text-sm text-muted-foreground">
                  {resetSent ? "Vérifiez votre boîte mail pour réinitialiser votre mot de passe." : "Un lien de connexion a été envoyé à votre email."}
                </p>
                <button
                  onClick={() => { setMagicSent(false); setResetSent(false); setMagicMode(false); setResetMode(false); }}
                  className="mt-4 text-sm text-primary hover:underline"
                >
                  ← Retour
                </button>
              </div>
            ) : resetMode ? (
              <div className="space-y-4">
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="reset-email"
                      type="email"
                      {...register("email")}
                      placeholder="votre@email.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/60 border border-border text-base placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={sendReset}
                    disabled={magicLoading || !emailValue}
                    className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
                >
                  {magicLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Envoyer le lien"}
                </button>
                <button onClick={() => setResetMode(false)} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
                  ← Retour à la connexion
                </button>
              </div>
            ) : magicMode ? (
              <div className="space-y-4">
                <div>
                  <label htmlFor="magic-email" className="block text-sm font-medium mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="magic-email"
                      type="email"
                      {...register("email")}
                      placeholder="votre@email.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/60 border border-border text-base placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={sendMagicLink}
                    disabled={magicLoading || !emailValue}
                    className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    {magicLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" /> Envoyer le lien magique</>}
                  </button>
                  <button onClick={() => setMagicMode(false)} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px]">
                  ← Connexion avec mot de passe
                </button>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-1.5">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="marie@example.com"
                        aria-invalid={!!errors.email}
                        {...register("email")}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/60 border border-border text-base placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
                      />
                    </div>
                    {errors.email && <p role="alert" className="text-xs text-destructive mt-1">{errors.email.message}</p>}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="password" className="text-sm font-medium">Mot de passe</label>
                      <button
                        type="button"
                        onClick={() => setResetMode(true)}
                        className="text-xs text-primary hover:underline"
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        aria-invalid={!!errors.password}
                        {...register("password")}
                        onPaste={(e) => e.preventDefault()}
                        onCopy={(e) => e.preventDefault()}
                        onCut={(e) => e.preventDefault()}
                        className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-secondary/60 border border-border text-base placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Masquer" : "Afficher"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground min-w-[44px] min-h-[44px] flex items-center justify-center"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && <p role="alert" className="text-xs text-destructive mt-1">{errors.password.message}</p>}
                  </div>

                  {submitError && (
                    <div role="alert" className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-sm text-destructive">
                      {submitError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Se connecter"}
                  </button>
                </form>

                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-3 text-muted-foreground">ou</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMagicMode(true)}
                  className="w-full py-2.5 rounded-xl border border-primary/40 text-sm font-medium text-primary hover:bg-primary/10 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" /> Connexion par lien magique
                </button>
              </>
            )}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-5">
            Pas encore de compte ?{" "}
            <Link to="/register" className="text-primary font-medium hover:underline">S'inscrire gratuitement</Link>
          </p>
        </div>
      </div>
    </>
  );
}
