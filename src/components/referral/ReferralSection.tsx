import { useState } from "react";
import { Gift, Copy, CheckCircle2, Users, Loader2, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { useQuery } from "@tanstack/react-query";

function generateReferralCode(userId: string): string {
  // Deterministic short code from user id
  const hex = userId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `REF-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

interface Referral {
  id: string;
  referred_email: string;
  referral_code: string;
  status: "pending" | "completed" | "rewarded";
  created_at: string;
  completed_at: string | null;
}

export default function ReferralSection() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const myCode = userId ? generateReferralCode(userId) : "REF-XXXX-XXXX";
  const referralLink = `${window.location.origin}/?ref=${myCode}`;

  const { data: referrals = [], refetch } = useQuery<Referral[]>({
    queryKey: ["referrals", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Referral[];
    },
  });

  const completedCount = referrals.filter((r) => r.status === "completed" || r.status === "rewarded").length;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Lien copié !" });
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !userId) return;
    setSending(true);
    try {
      const { error } = await supabase.from("referrals").insert({
        referrer_id: userId,
        referred_email: email.trim().toLowerCase(),
        referral_code: myCode,
        status: "pending",
      });
      if (error) {
        if (error.code === "23505") {
          toast({ title: "Déjà invité", description: "Cet email a déjà été invité.", variant: "destructive" });
        } else {
          throw error;
        }
      } else {
        toast({ title: "Invitation enregistrée ✓", description: `${email} a été ajouté à votre liste.` });
        setEmail("");
        refetch();
      }
    } catch {
      toast({ title: "Erreur", description: "Impossible d'enregistrer l'invitation.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const statusLabel = (s: string) => {
    if (s === "completed") return { label: "Inscrit ✓", cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" };
    if (s === "rewarded") return { label: "Récompensé 🎁", cls: "text-primary bg-primary/10 border-primary/20" };
    return { label: "En attente", cls: "text-muted-foreground bg-muted/30 border-border" };
  };

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-6 mt-6 space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shrink-0 shadow-glow">
          <Gift className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-base font-bold bg-gradient-to-r from-primary to-[hsl(var(--accent))] bg-clip-text text-transparent">
            Parrainage — Invitez un collègue, gagnez 1 mois gratuit
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pour chaque ami qui s'abonne, vous recevez 1 mois offert. Sans limite.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Invités", value: referrals.length },
          { label: "Convertis", value: completedCount },
          { label: "Mois gagnés", value: completedCount },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border/50 bg-secondary/20 p-3 text-center">
            <div className="text-xl font-black text-gradient">{s.value}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Referral link */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Votre lien de parrainage</p>
        <div className="flex gap-2">
          <div className="flex-1 px-3 py-2 rounded-xl bg-secondary/60 border border-border text-xs font-mono text-foreground truncate select-all">
            {referralLink}
          </div>
          <button
            onClick={handleCopy}
            className="px-3 py-2 rounded-xl border border-border bg-muted hover:bg-muted/80 transition-colors flex items-center gap-1.5 text-xs font-medium shrink-0"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copié" : "Copier"}
          </button>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: "GENIE IA", url: referralLink });
              } else {
                handleCopy();
              }
            }}
            className="px-3 py-2 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold shadow-glow hover:opacity-90 transition-all flex items-center gap-1.5 shrink-0"
          >
            <Share2 className="w-3.5 h-3.5" /> Partager
          </button>
        </div>
      </div>

      {/* Invite by email */}
      <form onSubmit={handleInvite} className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Inviter directement par email</p>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="collegue@entreprise.com"
            className="flex-1 px-3 py-2 rounded-xl bg-secondary/60 border border-border text-sm placeholder:text-muted-foreground/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
          />
          <button
            type="submit"
            disabled={sending || !email.trim()}
            className="px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold shadow-glow hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
            Inviter
          </button>
        </div>
      </form>

      {/* Referrals list */}
      {referrals.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Mes invitations</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {referrals.map((r) => {
              const { label, cls } = statusLabel(r.status);
              return (
                <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-xl border border-border/40 bg-secondary/10 text-xs">
                  <span className="text-foreground font-medium truncate flex-1">{r.referred_email}</span>
                  <span className={`ml-2 px-2 py-0.5 rounded-full border text-[10px] font-semibold shrink-0 ${cls}`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legal note */}
      <p className="text-[10px] text-muted-foreground/60">
        Le mois gratuit est crédité automatiquement après 30 jours d'abonnement actif de votre filleul. Offre cumulable.
      </p>
    </div>
  );
}
