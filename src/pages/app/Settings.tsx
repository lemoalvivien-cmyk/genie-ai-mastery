import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { CheckCircle2, Calendar, Loader2, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import AccessCodeActivator from "@/components/chat/AccessCodeActivator";

export default function Settings() {
  const { profile, signOut } = useAuth();
  const { data: sub, isLoading } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session");
      if (error || data?.error) throw new Error(data?.error ?? "Erreur portail");
      window.location.href = data.url;
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible d'ouvrir le portail.",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const renewalFormatted = sub?.renewalDate
    ? new Date(sub.renewalDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <>
      <Helmet><title>Paramètres – GENIE IA</title></Helmet>

      <div className="gradient-hero min-h-full">
        <main className="max-w-2xl mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold text-foreground mb-8">Paramètres</h1>

          {/* Profile section */}
          <div className="rounded-2xl border border-border bg-card/60 p-6 mb-6">
            <h2 className="text-base font-semibold text-foreground mb-4">Mon profil</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prénom</span>
                <span className="text-foreground font-medium">{profile?.full_name ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="text-foreground font-medium">{profile?.email ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Persona</span>
                <span className="text-foreground font-medium capitalize">{profile?.persona ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mode</span>
                <span className="text-foreground font-medium capitalize">{profile?.preferred_mode ?? "normal"}</span>
              </div>
            </div>
          </div>

          {/* Subscription section */}
          <div className="rounded-2xl border border-border bg-card/60 p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">Mon abonnement</h2>

            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Chargement...
              </div>
            ) : sub?.plan === "pro" ? (
              <div className="space-y-4">
                {/* Status badge */}
                <div className="flex items-center gap-2">
                  {sub.source === "access_code" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-semibold">
                      <Lock className="w-3 h-3" /> Activé par code d'accès
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-500 text-xs font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> GENIE Pro ✓
                    </span>
                  )}
                </div>

                {renewalFormatted && sub.source === "stripe" && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    Prochain renouvellement : <span className="text-foreground font-medium">{renewalFormatted}</span>
                  </div>
                )}

                {sub.source === "access_code" && (
                  <p className="text-sm text-muted-foreground">
                    À l'expiration, vous pourrez souscrire à GENIE Pro.
                  </p>
                )}

                {sub.source === "stripe" && (
                  <button
                    onClick={handleManageSubscription}
                    disabled={portalLoading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-muted hover:bg-muted/80 text-foreground text-sm font-medium transition-colors"
                  >
                    {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Gérer mon abonnement →
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Upsell banner */}
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <p className="text-sm font-bold text-foreground mb-2">Passez à GENIE Pro</p>
                  <ul className="space-y-1 mb-4">
                    {["Voix Jarvis activée", "Attestations vérifiables", "Vibe Coding complet", "Dashboard manager", "500 messages/jour"].map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3 h-3 text-primary shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/pricing"
                    className="inline-flex items-center px-5 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity"
                  >
                    Voir l'offre →
                  </Link>
                </div>

                {/* Access code */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3">Vous avez un code d'accès ?</p>
                  <AccessCodeActivator />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
