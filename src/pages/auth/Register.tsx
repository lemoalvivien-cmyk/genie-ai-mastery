import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Eye, EyeOff, Mail, Lock, User, Loader2, Sparkles, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { validatePassword } from "@/lib/security";
import DOMPurify from "dompurify";
import { useAnalytics } from "@/hooks/useAnalytics";

const schema = z.object({
  full_name: z.string().trim().min(2, "Prénom requis (min 2 caractères)").max(50),
  email: z.string().trim().email("Email invalide").max(255),
  password: z
    .string()
    .min(8, "Minimum 8 caractères")
    .regex(/[A-Z]/, "Au moins 1 majuscule requise")
    .regex(/[0-9]/, "Au moins 1 chiffre requis")
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Au moins 1 caractère spécial requis (!@#$%^&*…)"),
  accept_cgu: z.boolean().refine((v) => v === true, {
    message: "Vous devez accepter les CGU",
  }),
});

type FormData = z.infer<typeof schema>;

export default function Register() {
  const navigate = useNavigate();
  const { track } = useAnalytics();
  const [showPassword, setShowPassword] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicEmail, setMagicEmail] = useState("");
  const [magicLoading, setMagicLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const passwordValue = watch("password", "");
  const pwdError = passwordValue ? validatePassword(passwordValue) : null;
  const SPECIAL_CHARS_RE = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

  const onSubmit = async (data: FormData) => {
    setSubmitError(null);
    const email = DOMPurify.sanitize(data.email.trim().toLowerCase());
    const full_name = DOMPurify.sanitize(data.full_name.trim());

    // Read referral code from sessionStorage before signup
    const referralCode = sessionStorage.getItem("genie_ref");

    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password: data.password,
      options: {
        data: { full_name },
        emailRedirectTo: `${window.location.origin}/app/welcome`,
      },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        setSubmitError("Un compte existe déjà avec cet email.");
      } else {
        setSubmitError("Erreur lors de l'inscription. Réessayez.");
      }
      return;
    }

    // Associate referral: mark referral record as completed
    if (referralCode && authData.user) {
      try {
        await supabase
          .from("referrals")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("referral_code", referralCode)
          .eq("referred_email", email);
      } catch {
        // Non-blocking — referral attribution failure shouldn't block signup
      }
      sessionStorage.removeItem("genie_ref");
    }

    await track("signup", { method: "email", referral_code: referralCode ?? undefined });

    // Passe F : ne pas naviguer vers /onboarding avant confirmation email.
    // On reste sur la page d'inscription et on affiche le message de confirmation.
    setMagicLinkSent(true);
    setMagicEmail(email);
  };

  const sendMagicLink = async () => {
    if (!magicEmail) return;
    setMagicLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: DOMPurify.sanitize(magicEmail.trim().toLowerCase()),
      options: { emailRedirectTo: `${window.location.origin}/onboarding` },
    });
    setMagicLoading(false);
    if (!error) setMagicLinkSent(true);
  };

  return (
    <>
      <Helmet>
        <title>Inscription – GENIE IA</title>
        <meta name="description" content="Créez votre compte GENIE IA gratuitement." />
      </Helmet>

      <div className="min-h-screen gradient-hero flex items-center justify-center px-4 py-12">
        {/* Glow */}
        <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

        <div className="w-full max-w-md relative z-10">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">GENIE <span className="text-gradient">IA</span></span>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Créer votre compte</h1>
            <p className="text-sm text-muted-foreground mt-1">Gratuit, sans carte bancaire</p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 shadow-card">
            {magicLinkSent ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 rounded-full bg-emerald/10 border border-emerald/30 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-7 h-7 text-emerald" />
                </div>
                <h2 className="text-lg font-semibold mb-2">Vérifiez votre email !</h2>
                <p className="text-sm text-muted-foreground">
                  Un lien de confirmation a été envoyé à <strong>{magicEmail}</strong>.<br />
                  Cliquez sur le lien pour activer votre compte et commencer votre parcours.
                </p>
                <p className="text-xs text-muted-foreground/60 mt-3">
                  Pas reçu ? Vérifiez vos spams ou{" "}
                  <button
                    type="button"
                    onClick={() => { setMagicLinkSent(false); setMagicEmail(""); }}
                    className="text-primary hover:underline"
                  >
                    réessayez
                  </button>.
                </p>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                  {/* Full name */}
                  <div>
                    <label htmlFor="full_name" className="block text-sm font-medium mb-1.5">
                      Prénom
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        id="full_name"
                        type="text"
                        autoComplete="given-name"
                        placeholder="Marie"
                        aria-invalid={!!errors.full_name}
                        aria-describedby={errors.full_name ? "fn-err" : undefined}
                        {...register("full_name")}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/60 border border-border text-base placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
                      />
                    </div>
                    {errors.full_name && (
                      <p id="fn-err" role="alert" className="text-xs text-destructive mt-1">{errors.full_name.message}</p>
                    )}
                  </div>

                  {/* Email */}
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

                  {/* Password */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium mb-1.5">Mot de passe</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="Min. 8 caractères"
                        aria-invalid={!!errors.password}
                        {...register("password")}
                        className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-secondary/60 border border-border text-base placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {/* Live password hints */}
                    {passwordValue && (
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {[
                          { ok: passwordValue.length >= 8, label: "8 caractères" },
                          { ok: /[A-Z]/.test(passwordValue), label: "Majuscule" },
                          { ok: /[0-9]/.test(passwordValue), label: "Chiffre" },
                          { ok: SPECIAL_CHARS_RE.test(passwordValue), label: "Caractère spécial" },
                        ].map((hint) => (
                          <span
                            key={hint.label}
                            className={`text-xs px-2 py-0.5 rounded-full border ${hint.ok ? "bg-emerald/10 border-emerald/30 text-emerald" : "bg-muted border-border text-muted-foreground"}`}
                          >
                            {hint.ok ? "✓" : "○"} {hint.label}
                          </span>
                        ))}
                      </div>
                    )}
                    {errors.password && <p role="alert" className="text-xs text-destructive mt-1">{errors.password.message}</p>}
                  </div>

                   {/* CGU */}
                  <div className="flex items-start gap-3">
                    <input
                      id="accept_cgu"
                      type="checkbox"
                      aria-invalid={!!errors.accept_cgu}
                      {...register("accept_cgu")}
                      className="mt-0.5 w-4 h-4 accent-primary rounded cursor-pointer"
                    />
                    <label htmlFor="accept_cgu" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                      J'accepte les{" "}
                      <Link to="/legal/cgu" className="text-primary hover:underline">CGU</Link>{" "}
                      et la{" "}
                      <Link to="/legal/confidentialite" className="text-primary hover:underline">Politique de confidentialité</Link>
                    </label>
                  </div>
                  {errors.accept_cgu && <p role="alert" className="text-xs text-destructive -mt-2">{errors.accept_cgu.message}</p>}
                  <p className="text-xs text-muted-foreground -mt-1">
                    En créant un compte, vous acceptez nos{" "}
                    <Link to="/legal/cgu" className="text-primary hover:underline">CGU</Link>{" "}
                    et notre{" "}
                    <Link to="/legal/confidentialite" className="text-primary hover:underline">Politique de confidentialité</Link>.
                    Hébergement dans l'Union européenne — <Link to="/legal/dpa" className="text-primary hover:underline">DPA disponible</Link> pour les entreprises.
                  </p>

                  {submitError && (
                    <div role="alert" className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-sm text-destructive">
                      {submitError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "S'inscrire"
                    )}
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

                {/* Magic Link */}
                <div className="space-y-2">
                  <label htmlFor="magic-email" className="text-sm font-medium">
                    Inscription par lien magique
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="magic-email"
                      type="email"
                      value={magicEmail}
                      onChange={(e) => setMagicEmail(e.target.value)}
                      placeholder="votre@email.com"
                      className="flex-1 px-3 py-2.5 rounded-xl bg-secondary/60 border border-border text-base placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
                    />
                    <button
                      type="button"
                      onClick={sendMagicLink}
                      disabled={magicLoading || !magicEmail}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-primary/40 text-sm font-medium text-primary hover:bg-primary/10 transition-all disabled:opacity-50"
                    >
                      {magicLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <><Sparkles className="w-4 h-4" /> Envoyer</>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-5">
            Déjà un compte ?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
