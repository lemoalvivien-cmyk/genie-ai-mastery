/**
 * Manager Onboarding — /manager/onboarding
 * Parcours enterprise 4 étapes : org creation → plan → sièges → dashboard
 * RLS strict : create_org_and_assign_manager (SECURITY DEFINER)
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Users, Shield, Zap, CheckCircle2, ArrowRight, ArrowLeft,
  ChevronRight, Sparkles, Lock, Star, TrendingUp, Globe, Award,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrgForm { name: string; slug: string; }
interface PlanInfo { id: string; name: string; price: number; seats: number; features: string[]; badge?: string; }

const PLANS: PlanInfo[] = [
  {
    id: "starter",
    name: "Starter",
    price: 59,
    seats: 10,
    features: ["Génie Brain inclus", "Modules IA illimités", "Attestations PDF", "Dashboard manager"],
  },
  {
    id: "business",
    name: "Business",
    price: 49,
    seats: 50,
    badge: "POPULAIRE",
    features: ["Tout Starter", "Mode Palantir", "Attack Simulation", "Analytics avancés", "Support prioritaire"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 39,
    seats: 200,
    badge: "BEST VALUE",
    features: ["Tout Business", "SSO / SAML", "Contrat sur-mesure", "SLA 99,9%", "Onboarding dédié", "Revue mensuelle"],
  },
];

// ─── Step components ───────────────────────────────────────────────────────────

function StepOrg({ form, setForm, onNext, loading }: {
  form: OrgForm; setForm: (f: OrgForm) => void;
  onNext: () => void; loading: boolean;
}) {
  const slugify = (s: string) => s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 40);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-2">
          <Building2 className="w-3.5 h-3.5" /> ÉTAPE 1 / 4
        </div>
        <h2 className="text-2xl font-bold text-foreground">Créez votre organisation</h2>
        <p className="text-muted-foreground text-sm">Votre espace sécurisé multi-tenant pour toute l'équipe.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="org-name" className="text-sm font-medium text-foreground">Nom de l'organisation</Label>
          <Input
            id="org-name"
            placeholder="Ex: ACME Cybersecurity"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })}
            className="bg-card border-border h-12 text-base"
            maxLength={120}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="org-slug" className="text-sm font-medium text-foreground">Identifiant unique (slug)</Label>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm shrink-0">genie.ai/</span>
            <Input
              id="org-slug"
              placeholder="acme-security"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
              className="bg-card border-border h-12 font-mono text-sm"
              maxLength={40}
            />
          </div>
          <p className="text-xs text-muted-foreground">Lettres minuscules, chiffres et tirets uniquement.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-2">
        {[
          { icon: Shield, label: "RLS multi-tenant", desc: "Isolation totale des données" },
          { icon: Lock, label: "RGPD conforme", desc: "Hébergement EU" },
          { icon: Award, label: "Certifiable", desc: "Attestations PDF signées" },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="rounded-xl border border-border bg-card/50 p-3 text-center space-y-1">
            <Icon className="w-4 h-4 mx-auto text-primary" />
            <p className="text-xs font-semibold text-foreground">{label}</p>
            <p className="text-[10px] text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>

      <Button
        className="w-full h-12 text-base font-semibold"
        onClick={onNext}
        disabled={!form.name.trim() || !form.slug || loading}
      >
        {loading ? "Création…" : "Créer l'organisation"}
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

function StepPlan({ selectedPlan, setSelectedPlan, seats, setSeats, onNext, onBack }: {
  selectedPlan: string; setSelectedPlan: (p: string) => void;
  seats: number; setSeats: (n: number) => void;
  onNext: () => void; onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-2">
          <Star className="w-3.5 h-3.5" /> ÉTAPE 2 / 4
        </div>
        <h2 className="text-2xl font-bold text-foreground">Choisissez votre plan</h2>
        <p className="text-muted-foreground text-sm">Tarification par siège. Annulez à tout moment.</p>
      </div>

      <div className="space-y-3">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            onClick={() => { setSelectedPlan(plan.id); setSeats(plan.seats); }}
            className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all ${
              selectedPlan === plan.id
                ? "border-primary bg-primary/8 shadow-glow-sm"
                : "border-border bg-card/50 hover:border-primary/40"
            }`}
          >
            {plan.badge && (
              <span className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground">
                {plan.badge}
              </span>
            )}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  selectedPlan === plan.id ? "border-primary bg-primary" : "border-muted-foreground"
                }`}>
                  {selectedPlan === plan.id && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{plan.name}</span>
                    <span className="text-xs text-muted-foreground">jusqu'à {plan.seats} utilisateurs</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {plan.features.slice(0, 3).map((f) => (
                      <span key={f} className="text-[10px] text-muted-foreground">{f} ·</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-lg font-bold text-foreground">{plan.price}€</span>
                <span className="text-xs text-muted-foreground">/user/mois</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Nombre de sièges initial</Label>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            min={1}
            max={1000}
            value={seats}
            onChange={(e) => setSeats(Math.max(1, parseInt(e.target.value) || 1))}
            className="bg-card border-border h-10 w-24 text-center font-mono"
          />
          <span className="text-sm text-muted-foreground">
            = <span className="text-foreground font-semibold">
              {(seats * (PLANS.find(p => p.id === selectedPlan)?.price ?? 59)).toLocaleString("fr-FR")}€/mois
            </span>
          </span>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 h-11" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" /> Retour
        </Button>
        <Button className="flex-1 h-11 font-semibold" onClick={onNext} disabled={!selectedPlan}>
          Continuer <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function StepInvite({ seats, onNext, onBack, orgId }: {
  seats: number; onNext: () => void; onBack: () => void; orgId: string;
}) {
  const { toast } = useToast();
  const [emails, setEmails] = useState<string[]>(Array(Math.min(seats, 5)).fill(""));
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string[]>([]);

  const updateEmail = (i: number, v: string) => {
    const next = [...emails];
    next[i] = v;
    setEmails(next);
  };

  const sendInvitations = async () => {
    const valid = emails.filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e));
    if (valid.length === 0) { onNext(); return; }
    setSending(true);
    const results: string[] = [];
    for (const email of valid) {
      try {
        const res = await supabase.functions.invoke("manager-invite", {
          body: { email: email.trim().toLowerCase(), org_id: orgId },
        });
        if (!res.error && !res.data?.error) results.push(email);
      } catch { /* continue */ }
    }
    setSent(results);
    setSending(false);
    if (results.length > 0) {
      toast({ title: `✅ ${results.length} invitation(s) envoyée(s)` });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-2">
          <Users className="w-3.5 h-3.5" /> ÉTAPE 3 / 4
        </div>
        <h2 className="text-2xl font-bold text-foreground">Invitez votre équipe</h2>
        <p className="text-muted-foreground text-sm">
          {seats} siège(s) disponible(s). Passez cette étape pour inviter plus tard.
        </p>
      </div>

      <div className="space-y-3">
        {emails.map((email, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
            <Input
              type="email"
              placeholder={`collaborateur${i + 1}@entreprise.fr`}
              value={email}
              onChange={(e) => updateEmail(i, e.target.value)}
              className={`bg-card border-border h-10 text-sm ${sent.includes(email) ? "border-emerald-500/50" : ""}`}
            />
            {sent.includes(email) && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
          </div>
        ))}
        {emails.length < Math.min(seats, 10) && (
          <button
            onClick={() => setEmails([...emails, ""])}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            + Ajouter un email
          </button>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card/40 p-3 flex items-start gap-3">
        <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Les invitations sont traitées côté serveur via une Edge Function sécurisée.
          Chaque collaborateur reçoit un lien d'activation unique valable 7 jours.
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 h-11" onClick={onBack} disabled={sending}>
          <ArrowLeft className="w-4 h-4" /> Retour
        </Button>
        <Button
          className="flex-1 h-11 font-semibold"
          onClick={async () => { await sendInvitations(); onNext(); }}
          disabled={sending}
        >
          {sending ? "Envoi…" : sent.length > 0 ? "Continuer" : "Envoyer & continuer"}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function StepSuccess({ orgName, plan, seats, onGo }: {
  orgName: string; plan: string; seats: number; onGo: () => void;
}) {
  const planData = PLANS.find((p) => p.id === plan);

  return (
    <div className="space-y-6 text-center">
      <div className="space-y-2">
        <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Organisation créée !</h2>
        <p className="text-muted-foreground text-sm">Votre espace enterprise est prêt.</p>
      </div>

      <div className="rounded-xl border border-border bg-card/50 p-4 text-left space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Organisation</span>
          <span className="text-sm font-semibold text-foreground">{orgName}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Plan</span>
          <Badge className="bg-primary/15 text-primary border-primary/30">{planData?.name ?? plan}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Sièges</span>
          <span className="text-sm font-semibold text-foreground">{seats} utilisateurs</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Valeur mensuelle</span>
          <span className="text-sm font-semibold text-emerald-400">
            {((planData?.price ?? 59) * seats).toLocaleString("fr-FR")}€/mois
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: TrendingUp, label: "Brain activé", color: "text-primary" },
          { icon: Shield, label: "RLS strict", color: "text-emerald-400" },
          { icon: Globe, label: "RGPD OK", color: "text-primary" },
        ].map(({ icon: Icon, label, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card/40 p-3 space-y-1">
            <Icon className={`w-5 h-5 mx-auto ${color}`} />
            <p className="text-xs font-medium text-foreground">{label}</p>
          </div>
        ))}
      </div>

      <Button className="w-full h-12 text-base font-semibold" onClick={onGo}>
        <Sparkles className="w-4 h-4" />
        Ouvrir mon Dashboard Manager
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ManagerOnboarding() {
  const navigate = useNavigate();
  const { profile, refetchProfile } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [orgForm, setOrgForm] = useState<OrgForm>({ name: "", slug: "" });
  const [selectedPlan, setSelectedPlan] = useState("business");
  const [seats, setSeats] = useState(50);
  const [createdOrgId, setCreatedOrgId] = useState("");
  const [createdOrgName, setCreatedOrgName] = useState("");
  const [creating, setCreating] = useState(false);

  const STEPS = ["Organisation", "Plan", "Équipe", "Prêt"];

  const handleCreateOrg = async () => {
    if (!orgForm.name.trim() || !orgForm.slug) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-org-bootstrap", {
        body: { name: orgForm.name.trim(), slug: orgForm.slug, seats_max: seats },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setCreatedOrgId(data.org_id);
      setCreatedOrgName(orgForm.name.trim());
      await refetchProfile();
      setStep(1);
    } catch (e) {
      toast({ title: "Erreur", description: (e as Error).message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="w-6 h-6 text-primary" />
            <span className="text-lg font-bold text-foreground tracking-tight">GÉNIE IA</span>
            <Badge className="text-[10px] bg-primary/15 text-primary border-primary/30">ENTERPRISE</Badge>
          </div>
          {/* Progress bar */}
          <div className="flex items-center gap-1 justify-center mb-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold transition-all ${
                  i === step
                    ? "bg-primary text-primary-foreground"
                    : i < step
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-card text-muted-foreground"
                }`}>
                  {i < step ? <CheckCircle2 className="w-3 h-3" /> : <span>{i + 1}</span>}
                  <span className="hidden sm:inline">{s}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-6 h-0.5 ${i < step ? "bg-emerald-500/50" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card shadow-card p-6">
          {step === 0 && (
            <StepOrg form={orgForm} setForm={setOrgForm} onNext={handleCreateOrg} loading={creating} />
          )}
          {step === 1 && (
            <StepPlan
              selectedPlan={selectedPlan} setSelectedPlan={setSelectedPlan}
              seats={seats} setSeats={setSeats}
              onNext={() => setStep(2)} onBack={() => setStep(0)}
            />
          )}
          {step === 2 && (
            <StepInvite
              seats={seats} orgId={createdOrgId}
              onNext={() => setStep(3)} onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <StepSuccess
              orgName={createdOrgName} plan={selectedPlan} seats={seats}
              onGo={() => navigate("/manager")}
            />
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Déjà manager ?{" "}
          <button onClick={() => navigate("/manager")} className="text-primary hover:underline">
            Accéder au dashboard →
          </button>
        </p>
      </div>
    </div>
  );
}
