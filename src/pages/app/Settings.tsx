import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { CheckCircle2, Calendar, Loader2, Lock, Users, Minus, Plus, Pencil, Save, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AccessCodeActivator from "@/components/chat/AccessCodeActivator";
import { useQueryClient } from "@tanstack/react-query";
import ReferralSection from "@/components/referral/ReferralSection";

const PERSONA_OPTIONS = [
  { value: "salarie", label: "Salarié(e)" },
  { value: "dirigeant", label: "Dirigeant(e)" },
  { value: "manager", label: "Manager" },
  { value: "jeune", label: "Jeune / Étudiant(e)" },
  { value: "independant", label: "Indépendant(e)" },
  { value: "parent", label: "Parent" },
  { value: "senior", label: "Senior" },
];

const MODE_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "enfant", label: "Simplifié (enfant)" },
  { value: "expert", label: "Expert" },
];

export default function Settings() {
  const { profile, session, refetchProfile } = useAuth();
  const { data: sub, isLoading } = useSubscription();
  const { toast } = useToast();
  const [portalLoading, setPortalLoading] = useState(false);
  const [seatsLoading, setSeatsLoading] = useState(false);
  const [pendingSeats, setPendingSeats] = useState<number | null>(null);
  const queryClient = useQueryClient();

  // PASSE C · #6 — Édition profil
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState(profile?.full_name ?? "");
  const [editPersona, setEditPersona] = useState(profile?.persona ?? "salarie");
  const [editMode2, setEditMode2] = useState(profile?.preferred_mode ?? "normal");

  const handleEditOpen = () => {
    setEditName(profile?.full_name ?? "");
    setEditPersona(profile?.persona ?? "salarie");
    setEditMode2(profile?.preferred_mode ?? "normal");
    setEditMode(true);
  };

  const handleSaveProfile = async () => {
    if (!session?.user?.id) return;
    // Passe F : protection double-submit
    if (saving) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editName.trim() || null,
          persona: editPersona as "dirigeant" | "independant" | "jeune" | "parent" | "salarie" | "senior",
          preferred_mode: editMode2 as "normal" | "enfant" | "expert",
        })
        .eq("id", session.user.id);

      if (error) {
        toast({ title: "Erreur", description: "Impossible de sauvegarder le profil.", variant: "destructive" });
        return;
      }

      await refetchProfile();
      setEditMode(false);
      toast({ title: "Profil mis à jour", description: "Vos informations ont bien été enregistrées." });
    } catch (err) {
      toast({ title: "Erreur", description: err instanceof Error ? err.message : "Erreur inconnue.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

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
      <Helmet><title>Paramètres – Formetoialia</title></Helmet>

      <div className="gradient-hero min-h-full">
        <main className="max-w-2xl mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold text-foreground mb-8">Paramètres</h1>

          {/* Profile section */}
          <div className="rounded-2xl border border-border bg-card/60 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground">Mon profil</h2>
              {!editMode && (
                <button
                  onClick={handleEditOpen}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                  aria-label="Modifier le profil"
                >
                  <Pencil className="w-3.5 h-3.5" /> Modifier
                </button>
              )}
            </div>

            {editMode ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5" htmlFor="edit-name">
                    Prénom / Nom
                  </label>
                  <input
                    id="edit-name"
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={100}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Votre prénom et nom"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5" htmlFor="edit-persona">
                    Profil
                  </label>
                  <select
                    id="edit-persona"
                    value={editPersona}
                    onChange={(e) => setEditPersona(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {PERSONA_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5" htmlFor="edit-mode">
                    Mode de communication
                  </label>
                  <select
                    id="edit-mode"
                    value={editMode2}
                    onChange={(e) => setEditMode2(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {MODE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Enregistrer
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-muted-foreground text-sm hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" /> Annuler
                  </button>
                </div>
              </div>
            ) : (
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
                  <span className="text-muted-foreground">Profil</span>
                  <span className="text-foreground font-medium capitalize">{profile?.persona ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mode</span>
                  <span className="text-foreground font-medium capitalize">{profile?.preferred_mode ?? "normal"}</span>
                </div>
              </div>
            )}
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
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[hsl(142_71%_45%/0.1)] border border-[hsl(142_71%_45%/0.3)] text-[hsl(142_71%_45%)] text-xs font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> Formetoialia Pro ✓
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
                    À l'expiration, vous pourrez souscrire à Formetoialia Pro.
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
                          aria-label="Réduire les sièges"
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
                          aria-label="Augmenter les sièges"
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
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <p className="text-sm font-bold text-foreground mb-2">Passez à Formetoialia Pro</p>
                  <ul className="space-y-1 mb-4">
                    {["Assistance KITT illimitée", "Attestations vérifiables", "Playbooks complets", "Cockpit manager", "500 messages/jour"].map(f => (
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

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3">Vous avez un code d'accès ?</p>
                  <AccessCodeActivator />
                </div>
              </div>
            )}
          </div>

          <ReferralSection />

          {/* Legal section */}
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
                  <Link key={l.to} to={l.to} className="text-primary hover:underline text-xs">
                    {l.label}
                  </Link>
                ))}
              </div>
              <hr className="border-border/40" />
              <Link
                to="/legal/rgpd"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-muted-foreground text-sm hover:text-foreground hover:border-primary/40 transition-all"
              >
                Exercer mes droits RGPD (accès, suppression, export)
              </Link>
            </div>
          </div>

          {/* ── Zone danger : suppression de compte ── */}
          <DangerZone userId={session?.user?.id} />

        </main>
      </div>
    </>
  );
}

/** RGPD-compliant : double confirmation avant suppression définitive du compte */
function DangerZone({ userId }: { userId: string | undefined }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const { signOut } = useAuth();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!userId || confirm !== "SUPPRIMER") return;
    setLoading(true);
    try {
      // Appel à l'Edge Function sécurisée pour la suppression côté serveur
      const { error } = await supabase.functions.invoke("delete-account", {
        body: { confirmation: confirm },
      });
      if (error) throw error;
      toast({ title: "Compte supprimé", description: "Toutes vos données ont été effacées." });
      await signOut();
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le compte. Contactez le support.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 mt-6">
      <h2 className="text-base font-semibold text-destructive mb-1">Zone dangereuse</h2>
      <p className="text-xs text-muted-foreground mb-4">
        La suppression de votre compte est irréversible. Toutes vos données seront effacées conformément à notre politique RGPD.
      </p>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-sm text-destructive border border-destructive/30 px-4 py-2 rounded-xl hover:bg-destructive/10 transition-colors"
        >
          Supprimer mon compte
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium text-destructive">
            Tapez <strong>SUPPRIMER</strong> pour confirmer :
          </p>
          <input
            type="text"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="SUPPRIMER"
            className="w-full px-3 py-2 rounded-xl border border-destructive/40 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-destructive/50"
            autoCapitalize="characters"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setOpen(false); setConfirm(""); }}
              className="flex-1 py-2 rounded-xl border border-border text-muted-foreground text-sm hover:text-foreground transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleDelete}
              disabled={confirm !== "SUPPRIMER" || loading}
              className="flex-1 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmer la suppression"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
