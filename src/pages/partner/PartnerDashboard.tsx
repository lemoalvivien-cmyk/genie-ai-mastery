import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, TrendingUp, DollarSign, Link2, Copy, ExternalLink,
  Loader2, Building2, CheckCircle, Clock, AlertCircle, Download,
  RefreshCw, Zap
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Brain } from "lucide-react";

interface PartnerAccount {
  id: string;
  name: string;
  contact_email: string;
  status: "active" | "paused";
  revshare_percent: number;
  stripe_connect_account_id: string | null;
  created_at: string;
}

interface PartnerReferral {
  id: string;
  referral_code: string;
  landing_url_slug: string | null;
  created_at: string;
}

interface Commission {
  id: string;
  amount_cents: number;
  status: "pending" | "paid" | "failed";
  created_at: string;
  stripe_invoice_id: string | null;
  org_id: string | null;
}

export default function PartnerDashboard() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [connectLoading, setConnectLoading] = useState(false);
  const navigate = useNavigate();

  // Fetch partner account
  const { data: partner, isLoading: partnerLoading } = useQuery<PartnerAccount | null>({
    queryKey: ["partner-account", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("partner-get-account");
      if (error || data?.error) return null;
      return data?.account ?? null;
    },
  });

  // Fetch referral codes
  const { data: referrals = [] } = useQuery<PartnerReferral[]>({
    queryKey: ["partner-referrals", partner?.id],
    enabled: !!partner,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("partner-get-referrals");
      if (error) return [];
      return data?.referrals ?? [];
    },
  });

  // Fetch commissions
  const { data: commissions = [] } = useQuery<Commission[]>({
    queryKey: ["partner-commissions", partner?.id],
    enabled: !!partner,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("partner-get-commissions");
      if (error) return [];
      return data?.commissions ?? [];
    },
  });

  // Fetch attributed orgs count
  const { data: clientsCount = 0 } = useQuery<number>({
    queryKey: ["partner-clients", partner?.id],
    enabled: !!partner,
    queryFn: async () => {
      const { data } = await supabase.functions.invoke("partner-get-stats");
      return data?.clients_count ?? 0;
    },
  });

  const handleConnectOnboarding = async () => {
    setConnectLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("partner-connect-onboard", {
        body: { return_url: window.location.href },
      });
      if (error || data?.error) throw new Error(data?.error ?? "Erreur");
      window.location.href = data.url;
    } catch (err) {
      toast({ title: "Erreur", description: err instanceof Error ? err.message : "Erreur Connect", variant: "destructive" });
    } finally {
      setConnectLoading(false);
    }
  };

  const handleCreateCode = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("partner-create-referral");
      if (error || data?.error) throw new Error(data?.error ?? "Erreur");
      queryClient.invalidateQueries({ queryKey: ["partner-referrals"] });
      toast({ title: "Code créé !", description: `Code: ${data.code}` });
    } catch (err) {
      toast({ title: "Erreur", description: err instanceof Error ? err.message : "Erreur", variant: "destructive" });
    }
  };

  const copyLink = (code: string) => {
    const url = `${window.location.origin}/?ref=${code}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Lien copié !", description: url });
  };

  const pendingAmount = commissions.filter(c => c.status === "pending").reduce((s, c) => s + c.amount_cents, 0);
  const paidAmount = commissions.filter(c => c.status === "paid").reduce((s, c) => s + c.amount_cents, 0);
  const mrr = clientsCount * 59 * (partner?.revshare_percent ?? 30) / 100;

  const exportCSV = () => {
    const rows = [
      ["ID", "Date", "Montant (€)", "Statut", "Facture Stripe"],
      ...commissions.map(c => [
        c.id,
        new Date(c.created_at).toLocaleDateString("fr-FR"),
        (c.amount_cents / 100).toFixed(2),
        c.status,
        c.stripe_invoice_id ?? "",
      ])
    ];
    const csv = rows.map(r => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commissions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (partnerLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!partner) {
    return <PartnerApply />;
  }

  return (
    <>
      <Helmet>
        <title>Portail Partenaire — Formetoialia</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border/40 px-6 py-4 flex items-center justify-between bg-card/50">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
              <Brain className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">Formetoialia</span>
            <Badge variant="outline" className="ml-2 text-xs">Partenaire</Badge>
          </Link>
          <div className="flex items-center gap-3">
            <Badge variant={partner.status === "active" ? "default" : "secondary"} className="gap-1">
              {partner.status === "active" ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              {partner.status === "active" ? "Actif" : "Pausé"}
            </Badge>
            <span className="text-sm text-muted-foreground">{partner.name}</span>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
          {/* KPI Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Clients</span>
                </div>
                <p className="text-3xl font-extrabold text-foreground">{clientsCount}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">MRR attribué</span>
                </div>
                <p className="text-3xl font-extrabold text-foreground">{mrr.toFixed(0)}€</p>
                <p className="text-xs text-muted-foreground mt-1">{partner.revshare_percent}% revshare</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">En attente</span>
                </div>
                <p className="text-3xl font-extrabold text-foreground">{(pendingAmount / 100).toFixed(2)}€</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Versé total</span>
                </div>
                <p className="text-3xl font-extrabold text-foreground">{(paidAmount / 100).toFixed(2)}€</p>
              </CardContent>
            </Card>
          </div>

          {/* Stripe Connect banner */}
          {!partner.stripe_connect_account_id && (
            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="p-6 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-foreground mb-1 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" /> Activez les paiements automatiques
                  </h3>
                  <p className="text-sm text-muted-foreground">Connectez votre compte Stripe pour recevoir vos commissions automatiquement chaque mois.</p>
                </div>
                <Button onClick={handleConnectOnboarding} disabled={connectLoading} className="shrink-0 gradient-primary text-primary-foreground shadow-glow">
                  {connectLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Configurer Stripe →
                </Button>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="referrals">
            <TabsList className="bg-muted">
              <TabsTrigger value="referrals">Liens & Codes</TabsTrigger>
              <TabsTrigger value="commissions">Commissions</TabsTrigger>
              <TabsTrigger value="clients">Clients</TabsTrigger>
            </TabsList>

            {/* Referrals tab */}
            <TabsContent value="referrals" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-foreground">Vos liens de parrainage</h2>
                <Button size="sm" onClick={handleCreateCode} className="gap-2">
                  <Link2 className="w-4 h-4" /> Nouveau code
                </Button>
              </div>
              {referrals.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-10 text-center text-muted-foreground">
                    <Link2 className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    <p>Aucun code pour l'instant. Créez votre premier lien !</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {referrals.map((ref) => {
                    const url = `${window.location.origin}/?ref=${ref.referral_code}`;
                    return (
                      <Card key={ref.id} className="bg-card border-border">
                        <CardContent className="p-4 flex items-center justify-between gap-4">
                          <div>
                            <p className="font-mono font-bold text-foreground text-sm">{ref.referral_code}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{url}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="icon" variant="ghost" onClick={() => copyLink(ref.referral_code)}>
                              <Copy className="w-4 h-4" />
                            </Button>
                            <a href={url} target="_blank" rel="noopener noreferrer">
                              <Button size="icon" variant="ghost">
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </a>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Commissions tab */}
            <TabsContent value="commissions" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-foreground">Historique des commissions</h2>
                {commissions.length > 0 && (
                  <Button size="sm" variant="outline" onClick={exportCSV} className="gap-2">
                    <Download className="w-4 h-4" /> Exporter CSV
                  </Button>
                )}
              </div>
              {commissions.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-10 text-center text-muted-foreground">
                    <DollarSign className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    <p>Les commissions apparaîtront ici après les premiers paiements.</p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-card border-border">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="text-left py-3 px-4 font-medium">Date</th>
                          <th className="text-left py-3 px-4 font-medium">Montant</th>
                          <th className="text-left py-3 px-4 font-medium">Statut</th>
                          <th className="text-left py-3 px-4 font-medium">Réf. Stripe</th>
                        </tr>
                      </thead>
                      <tbody>
                        {commissions.map((c) => (
                          <tr key={c.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                            <td className="py-3 px-4 text-foreground">{new Date(c.created_at).toLocaleDateString("fr-FR")}</td>
                            <td className="py-3 px-4 font-bold text-foreground">{(c.amount_cents / 100).toFixed(2)} €</td>
                            <td className="py-3 px-4">
                              <Badge variant={c.status === "paid" ? "default" : c.status === "pending" ? "outline" : "destructive"} className="gap-1 text-xs">
                                {c.status === "paid" ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                {c.status === "paid" ? "Versé" : c.status === "pending" ? "En attente" : "Échoué"}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground font-mono text-xs">{c.stripe_invoice_id ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* Clients tab */}
            <TabsContent value="clients" className="mt-4">
              <ClientsPanel partnerId={partner.id} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  );
}

function ClientsPanel({ partnerId }: { partnerId: string }) {
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["partner-client-list", partnerId],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke("partner-get-clients");
      return data?.clients ?? [];
    },
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  if (clients.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-muted-foreground">
          <Building2 className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p>Aucun client attribué pour l'instant.</p>
          <p className="text-xs mt-1">Partagez votre lien de parrainage pour commencer.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left py-3 px-4 font-medium">Organisation</th>
              <th className="text-left py-3 px-4 font-medium">Plan</th>
              <th className="text-left py-3 px-4 font-medium">Sièges</th>
              <th className="text-left py-3 px-4 font-medium">Depuis</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c: any) => (
              <tr key={c.id} className="border-b border-border/50 last:border-0">
                <td className="py-3 px-4 font-medium text-foreground">{c.name}</td>
                <td className="py-3 px-4">
                  <Badge variant="outline" className="text-xs">{c.plan}</Badge>
                </td>
                <td className="py-3 px-4 text-muted-foreground">{c.seats_used ?? 0}/{c.seats_max ?? 1}</td>
                <td className="py-3 px-4 text-muted-foreground">{new Date(c.created_at).toLocaleDateString("fr-FR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function PartnerApply() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { profile } = useAuth();

  const handleApply = async () => {
    if (!name.trim() || !email.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("partner-apply", {
        body: { name, contact_email: email },
      });
      if (error || data?.error) throw new Error(data?.error ?? "Erreur");
      toast({ title: "Demande envoyée !", description: "Votre compte partenaire est en cours de validation." });
      window.location.reload();
    } catch (err) {
      toast({ title: "Erreur", description: err instanceof Error ? err.message : "Erreur", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow mx-auto mb-4">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground mb-2">Programme Partenaire</h1>
          <p className="text-muted-foreground text-sm">Revendez Formetoialia et gagnez <strong className="text-primary">30% de revshare</strong> sur chaque client.</p>
        </div>
        <Card className="bg-card border-border shadow-elegant">
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nom de l'entreprise *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Acme Conseil"
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email contact *</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={profile?.email ?? "contact@acme.fr"}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <Button
              onClick={handleApply}
              disabled={loading || !name.trim() || !email.trim()}
              className="w-full gradient-primary text-primary-foreground shadow-glow"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Devenir partenaire →
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Onboarding en 3 minutes · Paiements via Stripe · Export CSV
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
