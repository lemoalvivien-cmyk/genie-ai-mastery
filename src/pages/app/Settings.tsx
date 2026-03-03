import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { CheckCircle2, Calendar, Loader2, Lock, Users, Minus, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import AccessCodeActivator from "@/components/chat/AccessCodeActivator";
import { useQueryClient } from "@tanstack/react-query";
import ReferralSection from "@/components/referral/ReferralSection";

export default function Settings() {
  const { profile, signOut } = useAuth();
  const { data: sub, isLoading } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);
  const [seatsLoading, setSeatsLoading] = useState(false);
  const [pendingSeats, setPendingSeats] = useState<number | null>(null);
  const queryClient = useQueryClient();

  // Seat unit = 25 seats per billing unit
  const currentSeatUnits = sub ? Math.max(1, Math.ceil((sub.seatsMax ?? 25) / 25)) : 1;
  const displaySeats = pendingSeats ?? currentSeatUnits;

  const handleUpdateSeats = async () => {
    if (!pendingSeats || pendingSeats === currentSeatUnits) return;
    setSeatsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-seats", {
        body: { seats: pendingSeats },
      });
      if (error || data?.error) throw new Error(data?.error ?? "Erreur");
      toast({ title: "Sièges mis à jour", description: data.message });
      setPendingSeats(null);
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    } catch (err) {
      toast({ title: "Erreur", description: err instanceof Error ? err.message : "Erreur mise à jour sièges", variant: "destructive" });
    } finally {
      setSeatsLoading(false);
    }
  };

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
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/30 border border-accent/50 text-accent-foreground text-xs font-semibold">
                      <Lock className="w-3 h-3" /> Activé par code d'accès
                    </span>
                  ) : sub.isTrialing ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> Essai gratuit en cours
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald/10 border border-emerald/30 text-emerald text-xs font-semibold">
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
                  <>
                    <button
                      onClick={handleManageSubscription}
                      disabled={portalLoading}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-muted hover:bg-muted/80 text-foreground text-sm font-medium transition-colors"
                    >
                      {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Gérer mon abonnement (factures, carte) →
                    </button>

                    {/* Seat management */}
                    <div className="rounded-xl border border-border/50 bg-secondary/20 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold">Gestion des sièges</span>
                        <span className="ml-auto text-xs text-muted-foreground">{sub.seatsUsed ?? 0} / {sub.seatsMax ?? 25} utilisés</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setPendingSeats(Math.max(1, displaySeats - 1))}
                          disabled={displaySeats <= 1}
                          className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-40"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex-1 text-center">
                          <span className="font-bold text-lg">{displaySeats * 25}</span>
                          <span className="text-xs text-muted-foreground ml-1">sièges</span>
                        </div>
                        <button
                          onClick={() => setPendingSeats(Math.min(200, displaySeats + 1))}
                          className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        {displaySeats} × 59€/mois = <span className="font-semibold text-foreground">{displaySeats * 59}€/mois TTC</span>
                      </p>
                      {pendingSeats && pendingSeats !== currentSeatUnits && (
                        <button
                          onClick={handleUpdateSeats}
                          disabled={seatsLoading}
                          className="w-full mt-3 py-2 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold shadow-glow hover:opacity-90 transition-all flex items-center justify-center gap-2"
                        >
                          {seatsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                          Confirmer — {pendingSeats * 59}€/mois
                        </button>
                      )}
                    </div>
                  </>
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

          {/* Referral section */}
          <ReferralSection />

          {/* Legal & privacy section */}
          <div className="rounded-2xl border border-border bg-card/60 p-6 mt-6">
            <h2 className="text-base font-semibold text-foreground mb-4">Légal & confidentialité</h2>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3 text-sm">
                {[
                  { to: "/legal/confidentialite", label: "Politique de confidentialité" },
                  { to: "/legal/cgu", label: "CGU" },
                  { to: "/legal/cookies", label: "Cookies" },
                  { to: "/legal/rgpd", label: "Exercer mes droits RGPD" },
                  { to: "/legal/mentions-legales", label: "Mentions légales" },
                  { to: "/legal/subprocessors", label: "Sous-traitants" },
                  { to: "/legal/dpa", label: "DPA (entreprises)" },
                ].map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    className="text-primary hover:underline text-xs"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
              <hr className="border-border/40" />
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  disabled
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-muted/40 text-muted-foreground text-sm cursor-not-allowed opacity-60"
                  title="Fonctionnalité à venir"
                >
                  Exporter mes données (bientôt)
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
