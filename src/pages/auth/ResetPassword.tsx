import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Helmet } from "react-helmet-async";
import { Lock, Eye, EyeOff, Loader2, Brain, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

const schema = z.object({
  password: z
    .string()
    .min(8, "Minimum 8 caractères")
    .regex(/[A-Z]/, "Au moins 1 majuscule")
    .regex(/[0-9]/, "Au moins 1 chiffre"),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirm"],
});

type FormData = z.infer<typeof schema>;

export default function ResetPassword() {
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setSubmitError(null);
    const { error } = await supabase.auth.updateUser({ password: data.password });
    if (error) {
      setSubmitError("Lien expiré ou invalide. Demandez un nouveau lien.");
      return;
    }
    setDone(true);
  };

  return (
    <>
      <Helmet>
        <title>Nouveau mot de passe – GENIE IA</title>
      </Helmet>
      <div className="min-h-screen gradient-hero flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">GENIE <span className="text-gradient">IA</span></span>
            </Link>
            <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 shadow-card">
            {done ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 rounded-full bg-emerald/10 border border-emerald/30 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-7 h-7 text-emerald" />
                </div>
                <h2 className="text-lg font-semibold mb-2">Mot de passe mis à jour !</h2>
                <Link to="/login" className="text-primary hover:underline text-sm">→ Se connecter</Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-1.5">Nouveau mot de passe</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      {...register("password")}
                      placeholder="Min. 8 caractères"
                      className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-secondary/60 border border-border text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p role="alert" className="text-xs text-destructive mt-1">{errors.password.message}</p>}
                </div>
                <div>
                  <label htmlFor="confirm" className="block text-sm font-medium mb-1.5">Confirmer</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input id="confirm" type="password" {...register("confirm")} placeholder="••••••••" className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/60 border border-border text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all" />
                  </div>
                  {errors.confirm && <p role="alert" className="text-xs text-destructive mt-1">{errors.confirm.message}</p>}
                </div>
                {submitError && <div role="alert" className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-sm text-destructive">{submitError}</div>}
                <button type="submit" disabled={isSubmitting} className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Mettre à jour"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
