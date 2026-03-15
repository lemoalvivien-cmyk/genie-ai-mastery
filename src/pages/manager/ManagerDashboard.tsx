import { useState, useEffect, useCallback } from "react";
import { CsvImportDialog } from "@/components/manager/CsvImportDialog";
import { useAuditTrail } from "@/hooks/useAuditTrail";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
// useWeeklyReport removed (GenieOS cleanup)
import { Brain, LogOut, Users, CheckCircle, BarChart3, BookOpen, Download, Upload, Plus, Search, Filter, ChevronUp, ChevronDown, RefreshCw, Building2, Bell, Trash2, Mail, X, Zap, ShieldAlert, TrendingDown, AlertTriangle, FileText, Clock, Shield, Target, ChevronRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrgGapsWidget } from "@/components/skills/OrgGapsWidget";
import { PhishingRiskWidget } from "@/components/phishing/PhishingRiskWidget";
import { OfficeHoursCard } from "@/components/OfficeHoursCard";
import { BrainDashboard } from "@/components/brain/BrainDashboard";

// ─── Types ───────────────────────────────────────────────────────────────────

interface OrgStats {
  total_learners: number;
  completed_modules: number;
  in_progress_modules: number;
  avg_score: number | null;
  completion_rate: number;
  total_attestations: number;
  active_campaigns: number;
}

interface TeamMember {
  id: string;
  full_name: string | null;
  email: string;
  modules_completed: number;
  avg_score: number | null;
  last_active_at: string | null;
  status: "up_to_date" | "late" | "inactive";
}

interface Organization {
  id: string;
  name: string;
  plan: string | null;
  seats_used: number | null;
  seats_max: number | null;
  logo_url: string | null;
  completion_deadline_days: number | null;
  email_reminders_enabled: boolean | null;
  is_read_only: boolean | null;
}

interface Campaign {
  id: string;
  title: string;
  status: string | null;
  created_at: string | null;
  deadline: string | null;
  module_ids: string[];
  description: string | null;
}

interface Attestation {
  id: string;
  user_id: string;
  generated_at: string | null;
  score_average: number | null;
  modules_completed: unknown;
  pdf_url: string | null;
  profile?: { full_name: string | null; email: string };
}

type SortField = "full_name" | "email" | "modules_completed" | "avg_score" | "last_active_at" | "status";
type SortDir = "asc" | "desc";

// ─── Circular progress ───────────────────────────────────────────────────────

function CircularProgress({ value, size = 80 }: { value: number; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const color = value > 70 ? "hsl(var(--emerald))" : value > 50 ? "hsl(var(--orange-alert))" : "hsl(var(--destructive))";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`${value}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" fill="currentColor" fontSize={size * 0.22} fontWeight="700">{value}%</text>
    </svg>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TeamMember["status"] }) {
  const map = {
    up_to_date: { label: "À jour", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    late: { label: "En retard", className: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
    inactive: { label: "Inactif", className: "bg-destructive/15 text-destructive border-destructive/30" },
  };
  const s = map[status];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${s.className}`}>{s.label}</span>;
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ManagerDashboard() {
  const { profile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { logEvent } = useAuditTrail();
  const [exportingDossier, setExportingDossier] = useState(false);
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const weeklyReport = null;
  const refetchReport = () => {};

  const [org, setOrg] = useState<Organization | null>(null);
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [modules, setModules] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgBudget, setOrgBudget] = useState<{
    daily_cost_cap: number; daily_token_cap: number; eco_mode_forced: boolean; eco_triggered_at: string | null;
  } | null>(null);
  const [budgetUsage, setBudgetUsage] = useState<{ org_cost_today: number; org_tokens_today: number } | null>(null);

  // Team table state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TeamMember["status"]>("all");
  const [sortField, setSortField] = useState<SortField>("full_name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Dialogs
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [campaignTitle, setCampaignTitle] = useState("");
  const [campaignDesc, setCampaignDesc] = useState("");
  const [campaignModules, setCampaignModules] = useState<string[]>([]);
  const [campaignDeadline, setCampaignDeadline] = useState("");
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  // Org settings
  const [orgName, setOrgName] = useState("");
  const [deadlineDays, setDeadlineDays] = useState(30);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // ─── Load data ──────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!profile?.org_id) return;
    setLoading(true);
    try {
      const [orgRes, statsRes, teamRes, campaignsRes, attestationsRes, modulesRes, aiBudgetRes] = await Promise.all([
        supabase.from("organizations").select("*").eq("id", profile.org_id).single(),
        supabase.rpc("calculate_org_stats", { _org_id: profile.org_id }),
        // profiles est la source correcte pour le manager de son org (intra-org, pas cross-org)
        // org_member_profiles ne contient pas email — colonne nécessaire pour les exports/invitations
        supabase.from("profiles").select("id, full_name, email, last_active_at").eq("org_id", profile.org_id).limit(200),
        supabase.from("campaigns").select("id, title, description, status, deadline, module_ids, target_group, created_at").eq("org_id", profile.org_id).order("created_at", { ascending: false }).limit(50),
        supabase.from("attestations").select("id, user_id, generated_at, score_average, pdf_url, valid_until, modules_completed").eq("org_id", profile.org_id).order("generated_at", { ascending: false }).limit(100),
        supabase.from("modules").select("id, title").eq("is_published", true).limit(200),
        // ai_budgets table (correct name, not org_budgets)
        supabase.from("ai_budgets").select("daily_limit, used_today, is_blocked, reset_date").eq("org_id", profile.org_id).maybeSingle(),
      ]);

      if (orgRes.data) {
        setOrg(orgRes.data as unknown as Organization);
        setOrgId(orgRes.data.id);
        setOrgName(orgRes.data.name);
        setDeadlineDays((orgRes.data as unknown as Organization).completion_deadline_days ?? 30);
        setRemindersEnabled((orgRes.data as unknown as Organization).email_reminders_enabled ?? true);
      }
      if (statsRes.data) setStats(statsRes.data as unknown as OrgStats);
      if (campaignsRes.data) setCampaigns(campaignsRes.data as Campaign[]);
      if (attestationsRes.data) setAttestations(attestationsRes.data as Attestation[]);
      if (modulesRes.data) setModules(modulesRes.data);

      // Budget data from ai_budgets (correct table)
      if (aiBudgetRes.data) {
        const bd = aiBudgetRes.data as { daily_limit: number; used_today: number; is_blocked: boolean; reset_date: string };
        setBudgetUsage({ org_cost_today: bd.used_today ?? 0, org_tokens_today: 0 });
        setOrgBudget({
          daily_cost_cap: bd.daily_limit ?? 5,
          daily_token_cap: 0,
          eco_mode_forced: bd.is_blocked ?? false,
          eco_triggered_at: null,
        });
      }

      // Build team with progress stats
      if (teamRes.data) {
        const userIds = teamRes.data.map((p) => p.id);
        const { data: progressData } = await supabase
          .from("progress")
          .select("user_id, status, score")
          .in("user_id", userIds);

        const now = Date.now();
        const deadlineDaysMs = ((orgRes.data as unknown as Organization)?.completion_deadline_days ?? 30) * 86400000;
        const inactiveMs = 14 * 86400000;

        const built: TeamMember[] = teamRes.data.map((p) => {
          const userProgress = progressData?.filter((pr) => pr.user_id === p.id) ?? [];
          const completed = userProgress.filter((pr) => pr.status === "completed").length;
          const scores = userProgress.filter((pr) => pr.score != null).map((pr) => pr.score as number);
          const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
          const lastActive = p.last_active_at ? new Date(p.last_active_at).getTime() : null;
          const inactiveThreshold = now - inactiveMs;
          const lateThreshold = now - deadlineDaysMs;

          let status: TeamMember["status"] = "up_to_date";
          if (!lastActive || lastActive < inactiveThreshold) status = "inactive";
          else if (lastActive < lateThreshold) status = "late";

          return { id: p.id, full_name: p.full_name, email: p.email, modules_completed: completed, avg_score: avgScore, last_active_at: p.last_active_at, status };
        });
        setTeam(built);
      }
    } catch {
      toast({ title: "Erreur de chargement", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [profile?.org_id, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── 15s polling (replaces Realtime subscription) ───────────────────────

  useEffect(() => {
    if (!profile?.org_id) return;
    const interval = setInterval(loadData, 15_000);
    return () => clearInterval(interval);
  }, [profile?.org_id, loadData]);

  // Guard retiré : les managers B2B accèdent via le plan organisationnel,
  // pas via un abonnement personnel. Le plan org est vérifié côté RLS + requireRole="manager".

  // ─── Team table logic ────────────────────────────────────────────────────

  const filtered = team.filter((m) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || (m.full_name ?? "").toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    let av: string | number | null = a[sortField] as string | number | null;
    let bv: string | number | null = b[sortField] as string | number | null;
    if (av == null) av = "";
    if (bv == null) bv = "";
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (field: SortField) => {
    if (field === sortField) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  // ─── Compliance dossier export ───────────────────────────────────────────

  const exportComplianceDossier = async () => {
    if (!org || exportingDossier) return;
    setExportingDossier(true);
    toast({ title: "Génération en cours…", description: "Le dossier peut prendre 15–30 secondes selon la taille de l'équipe." });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Non authentifié");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-compliance-dossier`;
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: org.id }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erreur inconnue" }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().split("T")[0];
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `dossier-conformite-${dateStr}.zip`;
      a.click();
      URL.revokeObjectURL(downloadUrl);
      logEvent("compliance_dossier_exported", { details: { org_id: org.id } });
      toast({ title: "✅ Dossier exporté !", description: "Le fichier ZIP est dans vos téléchargements." });
    } catch (e) {
      toast({ title: "Erreur d'export", description: (e as Error).message, variant: "destructive" });
    } finally {
      setExportingDossier(false);
    }
  };

  // ─── CSV export ──────────────────────────────────────────────────────────

  const exportCSV = () => {
    const rows = [["Nom", "Email", "Modules complétés", "Score moyen", "Dernière activité", "Statut"]];
    sorted.forEach((m) => {
      rows.push([
        m.full_name ?? "",
        m.email,
        String(m.modules_completed),
        m.avg_score != null ? `${m.avg_score}%` : "—",
        m.last_active_at ? new Date(m.last_active_at).toLocaleDateString("fr-FR") : "—",
        { up_to_date: "À jour", late: "En retard", inactive: "Inactif" }[m.status],
      ]);
    });
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `equipe-${org?.name ?? "org"}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Invite employee — via Edge Function (service_role côté serveur) ─────────

  const handleInvite = async () => {
    if (!inviteEmail || !org) return;
    setInviteLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Non authentifié");

      const res = await supabase.functions.invoke("manager-invite", {
        body: { email: inviteEmail, org_id: org.id },
      });

      if (res.error) throw new Error(res.error.message ?? "Erreur d'invitation");
      if (res.data?.error) throw new Error(res.data.error);

      toast({ title: "Invitation envoyée ✅", description: `Un email a été envoyé à ${inviteEmail}.` });
      setInviteEmail("");
      setInviteOpen(false);
      loadData();
    } catch (e) {
      toast({ title: "Erreur d'invitation", description: (e as Error).message, variant: "destructive" });
    } finally {
      setInviteLoading(false);
    }
  };

  // ─── Create campaign ─────────────────────────────────────────────────────

  const handleCreateCampaign = async () => {
    if (!campaignTitle || !org) return;
    setCampaignLoading(true);
    try {
      const { error } = await supabase.from("campaigns").insert({
        title: campaignTitle,
        description: campaignDesc || null,
        org_id: org.id,
        module_ids: campaignModules,
        deadline: campaignDeadline || null,
        status: "draft",
        created_by: profile?.id,
      });
      if (error) throw error;
      toast({ title: "Campagne créée !" });
      setCampaignTitle(""); setCampaignDesc(""); setCampaignModules([]); setCampaignDeadline("");
      setCampaignOpen(false);
      loadData();
    } catch {
      toast({ title: "Erreur de création", variant: "destructive" });
    } finally {
      setCampaignLoading(false);
    }
  };

  // ─── Save org settings ───────────────────────────────────────────────────

  const saveSettings = async () => {
    if (!org) return;
    setSettingsSaving(true);
    try {
      let logoUrl = org.logo_url;
      if (logoFile) {
        const path = `${org.id}/logo.${logoFile.name.split(".").pop()}`;
        const { error: upErr } = await supabase.storage.from("org-logos").upload(path, logoFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from("org-logos").getPublicUrl(path);
        logoUrl = publicUrl;
      }
      const { error } = await supabase.from("organizations").update({
        name: orgName,
        logo_url: logoUrl,
        completion_deadline_days: deadlineDays,
        email_reminders_enabled: remindersEnabled,
      } as Record<string, unknown>).eq("id", org.id);
      if (error) throw error;
      toast({ title: "Paramètres sauvegardés !" });
      loadData();
    } catch {
      toast({ title: "Erreur de sauvegarde", variant: "destructive" });
    } finally {
      setSettingsSaving(false);
    }
  };

  // ─── CSV import — via Edge Function (service_role côté serveur) ──────────────

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !org) return;

    const text = await file.text();
    const rows = text.split(/\r?\n/).slice(1).filter(Boolean);

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const MAX_EMAIL_LENGTH = 255;

    let successCount = 0;
    let skipCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const cols = rows[i].match(/(".*?"|[^,]+)(?=,|$)/g)?.map(
        (c) => c.replace(/^"|"$/g, "").trim()
      ) ?? [];
      const raw = (cols[2] || cols[0] || "").replace(/\0/g, "").slice(0, MAX_EMAIL_LENGTH + 1).trim();

      if (!raw) { skipCount++; continue; }
      if (raw.length > MAX_EMAIL_LENGTH || !EMAIL_REGEX.test(raw)) {
        errors.push(`Ligne ${i + 2} : email invalide "${raw.slice(0, 40)}"`);
        skipCount++;
        continue;
      }

      try {
        const res = await supabase.functions.invoke("manager-invite", {
          body: { email: raw, org_id: org.id },
        });
        if (res.error || res.data?.error) {
          throw new Error(res.data?.error ?? res.error?.message ?? "Échec");
        }
        successCount++;
      } catch (err) {
        errors.push(`Ligne ${i + 2} : ${err instanceof Error ? err.message : "Échec"}`);
        skipCount++;
      }
    }

    if (errors.length > 0) {
      toast({
        title: `${successCount} invitation(s) envoyée(s), ${skipCount} ignorée(s)`,
        description: errors.slice(0, 3).join(" | ") + (errors.length > 3 ? ` (+${errors.length - 3} autres)` : ""),
        variant: "destructive",
      });
    } else {
      toast({ title: `${successCount} invitation(s) envoyée(s) ✅` });
    }
    e.target.value = "";
    loadData();
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  const seatsUsed = org?.seats_used ?? 0;
  const seatsMax = org?.seats_max ?? 1;
  const seatsPct = Math.round((seatsUsed / seatsMax) * 100);
  const completionRate = stats?.completion_rate ?? 0;
  const avgScore = stats?.avg_score ?? 0;
  const scoreColor = avgScore > 70 ? "text-emerald-400" : avgScore > 50 ? "text-orange-400" : "text-destructive";

  return (
    <>
      <Helmet><title>Dashboard Manager – {org?.name ?? "GENIE IA"}</title></Helmet>
      <div className="min-h-screen gradient-hero">
        {/* Header */}
        <header className="border-b border-border/40 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-30 bg-background/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {org?.logo_url ? (
              <img src={org.logo_url} alt="Logo" className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
                <Brain className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
            <div>
              <span className="font-bold">{org?.name ?? "Organisation"}</span>
              {org?.plan && (
                <Badge className="ml-2 text-xs" variant="outline">{org.plan.toUpperCase()}</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={loadData} aria-label="Rafraîchir"><RefreshCw className="w-4 h-4" /></Button>
            <Link to="/manager/revenue-ops">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs border-primary/40 text-primary hover:bg-primary/10">
                <Brain className="w-3.5 h-3.5" />
                Revenue Ops
              </Button>
            </Link>
            <Link to="/app/dashboard">
              <Button variant="ghost" size="sm">Tableau de bord</Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Se déconnecter"><LogOut className="w-4 h-4" /></Button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

          {/* ── Read-only banner ── */}
          {org?.is_read_only && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-destructive/40 bg-destructive/8 text-sm">
              <ShieldAlert className="w-5 h-5 text-destructive shrink-0" />
              <span className="text-foreground">
                <strong>Accès en lecture seule</strong> — Votre abonnement a expiré. Les données sont consultables mais les modifications sont désactivées.{" "}
                <Link to="/pricing" className="underline font-semibold">Renouveler →</Link>
              </span>
            </div>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Sièges */}
            <Card className="bg-card/60 border-border/50 backdrop-blur-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">Employés</span>
                </div>
                <div className="text-2xl font-bold">{seatsUsed}<span className="text-muted-foreground text-base font-normal"> / {seatsMax}</span></div>
                <Progress value={seatsPct} className="mt-2 h-1.5" />
                {seatsUsed >= seatsMax && (
                  <p className="text-xs text-destructive mt-1.5">Limite atteinte — <Link to="/pricing" className="underline">Upgrader</Link></p>
                )}
              </CardContent>
            </Card>

            {/* Taux de complétion */}
            <Card className="bg-card/60 border-border/50 backdrop-blur-sm">
              <CardContent className="p-5 flex items-center gap-4">
                <CircularProgress value={Math.round(completionRate)} />
                <div>
                  <div className="text-sm text-muted-foreground">Complétion</div>
                  {completionRate < 50 && (
                    <Badge variant="destructive" className="text-xs mt-1">⚠ Faible</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Score moyen */}
            <Card className="bg-card/60 border-border/50 backdrop-blur-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">Score moyen</span>
                </div>
                <div className={`text-3xl font-bold ${scoreColor}`}>{avgScore ? `${avgScore}%` : "—"}</div>
              </CardContent>
            </Card>

            {/* Modules actifs */}
            <Card className="bg-card/60 border-border/50 backdrop-blur-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">Campagnes actives</span>
                </div>
                <div className="text-3xl font-bold">{stats?.active_campaigns ?? 0}</div>
                <div className="text-xs text-muted-foreground mt-1">{stats?.total_attestations ?? 0} attestations</div>
              </CardContent>
            </Card>
          </div>

          {/* ── Enterprise Navigation Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Attack Simulation CTA */}
            <Link to="/manager/attack-simulation">
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 hover:border-destructive/50 transition-all p-4 cursor-pointer group">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-destructive/15 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Attack Simulation</p>
                      <p className="text-[10px] text-muted-foreground">Enterprise</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-destructive transition-colors" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Simulez une attaque sur toute l'org — heatmap par département, risk score global, recommandations.
                </p>
              </div>
            </Link>

            {/* Revenue Ops CTA */}
            <Link to="/manager/revenue-ops">
              <div className="rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all p-4 cursor-pointer group">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Revenue Ops</p>
                      <p className="text-[10px] text-muted-foreground">MRR · Factures · Monitoring</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Billing Stripe, métriques Brain, taux d'activation Palantir 7j et monitoring swarm en temps réel.
                </p>
              </div>
            </Link>
          </div>

          {/* ── Budget IA du jour ── */}
          {budgetUsage && (() => {
            const costToday = budgetUsage.org_cost_today;
            const tokensToday = budgetUsage.org_tokens_today;
            const costCap = orgBudget?.daily_cost_cap ?? 5;
            const tokenCap = orgBudget?.daily_token_cap ?? 500000;
            const ecoForced = orgBudget?.eco_mode_forced ?? false;
            const costPct = Math.min((costToday / costCap) * 100, 100);
            const tokenPct = Math.min((tokensToday / tokenCap) * 100, 100);
            const warn = costPct >= 80;
            return (
              <Card className={`bg-card/60 backdrop-blur-sm ${ecoForced ? "border-destructive/50" : "border-border/50"}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {ecoForced
                      ? <><ShieldAlert className="w-4 h-4 text-destructive" /> Budget IA — Mode Éco forcé ⚠️</>
                      : <><Zap className="w-4 h-4 text-primary" /> Budget IA du jour</>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {ecoForced && (
                    <p className="text-xs text-destructive/80 bg-destructive/5 rounded-lg px-3 py-2">
                      Le budget quotidien a été dépassé. Les réponses IA sont en mode économique jusqu'à minuit.
                    </p>
                  )}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Coût estimé</span>
                      <span className={warn ? "text-destructive font-semibold" : "text-foreground font-medium"}>
                        €{costToday.toFixed(4)} / €{costCap.toFixed(2)}
                      </span>
                    </div>
                    <Progress value={costPct} className="h-2" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Tokens utilisés</span>
                      <span className="text-foreground font-medium">{tokensToday.toLocaleString()} / {tokenCap.toLocaleString()}</span>
                    </div>
                    <Progress value={tokenPct} className="h-2" />
                  </div>
                  {ecoForced && orgBudget?.eco_triggered_at && (
                    <p className="text-[10px] text-muted-foreground">
                      Mode éco déclenché à {new Date(orgBudget.eco_triggered_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {/* ── Gaps équipe Palantir ── */}
          {org?.id && <OrgGapsWidget orgId={org.id} />}

          {/* ── Risque Phishing ── */}
          {org?.id && <PhishingRiskWidget orgId={org.id} />}

          {/* ── Rapport hebdomadaire ── */}
          {weeklyReport && (
            <Card className="bg-card/60 border-border/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Rapport de la semaine du {new Date(weeklyReport.week_start).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                  </CardTitle>
                  <button
                    onClick={() => supabase.functions.invoke("manager-brief").then(() => refetchReport())}
                    className="text-xs text-muted-foreground hover:text-foreground underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />Actualiser
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-secondary/40 p-3 text-center">
                    <div className="text-2xl font-bold">{weeklyReport.completion_rate}%</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Taux de complétion</div>
                  </div>
                  <div className="rounded-lg bg-secondary/40 p-3 text-center">
                    <div className="text-2xl font-bold">{weeklyReport.avg_score != null ? `${weeklyReport.avg_score}%` : "—"}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Score moyen</div>
                  </div>
                  <div className={`rounded-lg p-3 text-center ${weeklyReport.at_risk_count > 0 ? "bg-orange-500/10 border border-orange-500/20" : "bg-secondary/40"}`}>
                    <div className="text-2xl font-bold text-orange-400">{weeklyReport.at_risk_count}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">À risque</div>
                  </div>
                  <div className={`rounded-lg p-3 text-center ${weeklyReport.inactive_count > 0 ? "bg-destructive/10 border border-destructive/20" : "bg-secondary/40"}`}>
                    <div className="text-2xl font-bold text-destructive">{weeklyReport.inactive_count}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Inactifs</div>
                  </div>
                </div>

                {weeklyReport.top_gaps.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <TrendingDown className="w-3 h-3" />Top 5 failles de formation
                    </h4>
                    <div className="space-y-2">
                      {weeklyReport.top_gaps.map((gap, i) => (
                        <div key={gap.module_id} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                          <span className="text-sm flex-1 truncate">{gap.title}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="w-20 h-1.5 rounded-full bg-secondary overflow-hidden">
                              <div className="h-full rounded-full bg-destructive/70" style={{ width: `${gap.rate}%` }} />
                            </div>
                            <span className="text-xs font-medium w-8 text-right text-destructive">{gap.rate}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {weeklyReport.at_risk_users.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3 text-orange-400" />Employés à risque
                    </h4>
                    <div className="space-y-1.5">
                      {weeklyReport.at_risk_users.slice(0, 5).map((u) => (
                        <div key={u.id} className="flex items-center justify-between text-sm">
                          <span className="text-foreground">{u.full_name ?? "Inconnu"}</span>
                          <div className="flex items-center gap-2">
                            {u.last_active && (
                              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                <Clock className="w-3 h-3" />
                                {new Date(u.last_active).toLocaleDateString("fr-FR")}
                              </span>
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.reason === "inactive" ? "bg-destructive/15 text-destructive" : "bg-orange-500/15 text-orange-400"}`}>
                              {u.reason === "inactive" ? "Inactif" : "En retard"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Tabs ── */}
          <Tabs defaultValue="team">
            <TabsList className="bg-secondary/50 border border-border/50">
              <TabsTrigger value="team">Équipe</TabsTrigger>
              <TabsTrigger value="campaigns">Campagnes</TabsTrigger>
              <TabsTrigger value="attestations">Attestations</TabsTrigger>
              <TabsTrigger value="office-hours">Office Hours</TabsTrigger>
              <TabsTrigger value="settings">Paramètres</TabsTrigger>
            </TabsList>

            {/* ── Team tab ── */}
            <TabsContent value="team" className="space-y-4 mt-4">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex gap-2 flex-1 max-w-lg">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher par nom ou email…"
                      className="pl-9 bg-secondary/50"
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); setPage(1); }}>
                    <SelectTrigger className="w-36 bg-secondary/50">
                      <Filter className="w-4 h-4 mr-1" /><SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="up_to_date">À jour</SelectItem>
                      <SelectItem value="late">En retard</SelectItem>
                      <SelectItem value="inactive">Inactif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
                    <Download className="w-4 h-4" />CSV
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setCsvImportOpen(true)}>
                    <Upload className="w-4 h-4" />Import CSV
                  </Button>
                  <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-1.5 gradient-primary">
                        <Plus className="w-4 h-4" />Inviter
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Inviter un employé</DialogTitle></DialogHeader>
                      <div className="space-y-4 pt-2">
                        {seatsUsed >= seatsMax && (
                          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
                            Limite de sièges atteinte. <Link to="/pricing" className="underline font-medium">Passez au plan supérieur →</Link>
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label>Adresse email</Label>
                          <Input placeholder="prenom.nom@entreprise.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} type="email" />
                        </div>
                        <Button className="w-full gradient-primary" onClick={handleInvite} disabled={inviteLoading || seatsUsed >= seatsMax}>
                          {inviteLoading ? "Envoi…" : "Envoyer l'invitation"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/40 border-b border-border/50">
                      <tr>
                        {(["full_name", "email", "modules_completed", "avg_score", "last_active_at", "status"] as SortField[]).map((f) => {
                          const labels: Record<SortField, string> = { full_name: "Nom", email: "Email", modules_completed: "Modules", avg_score: "Score", last_active_at: "Dernière activité", status: "Statut" };
                          return (
                            <th key={f} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none" onClick={() => handleSort(f)}>
                              <span className="flex items-center gap-1">
                                {labels[f]}
                                {sortField === f ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null}
                              </span>
                            </th>
                          );
                        })}
                        <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Chargement…</td></tr>
                      ) : paginated.length === 0 ? (
                        <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Aucun membre trouvé</td></tr>
                      ) : paginated.map((m) => (
                        <tr key={m.id} className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                          <td className="px-4 py-3 font-medium">{m.full_name ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                          <td className="px-4 py-3 text-center">{m.modules_completed}</td>
                          <td className={`px-4 py-3 font-semibold text-center ${m.avg_score != null ? (m.avg_score > 70 ? "text-emerald-400" : m.avg_score > 50 ? "text-orange-400" : "text-destructive") : ""}`}>
                            {m.avg_score != null ? `${m.avg_score}%` : "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {m.last_active_at ? new Date(m.last_active_at).toLocaleDateString("fr-FR") : "—"}
                          </td>
                          <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Renvoyer invitation">
                                <Mail className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border/30 bg-secondary/20">
                    <span className="text-xs text-muted-foreground">{filtered.length} membres</span>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Précédent</Button>
                      <span className="px-3 py-1 text-sm">{page}/{totalPages}</span>
                      <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Suivant</Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── Campaigns tab ── */}
            <TabsContent value="campaigns" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Campagnes de formation</h2>
                <Dialog open={campaignOpen} onOpenChange={setCampaignOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1.5 gradient-primary"><Plus className="w-4 h-4" />Créer une campagne</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>Nouvelle campagne</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label>Titre *</Label>
                        <Input placeholder="Formation cybersécurité Q1 2026" value={campaignTitle} onChange={(e) => setCampaignTitle(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input placeholder="Description de la campagne" value={campaignDesc} onChange={(e) => setCampaignDesc(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Modules (sélection multiple)</Label>
                        <div className="max-h-40 overflow-y-auto space-y-1 border border-border/50 rounded-lg p-2">
                          {modules.map((mod) => (
                            <label key={mod.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-secondary/50 cursor-pointer">
                              <input
                                type="checkbox"
                                className="rounded border-border"
                                checked={campaignModules.includes(mod.id)}
                                onChange={(e) => {
                                  if (e.target.checked) setCampaignModules(prev => [...prev, mod.id]);
                                  else setCampaignModules(prev => prev.filter(id => id !== mod.id));
                                }}
                              />
                              <span className="text-sm">{mod.title}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Date limite (optionnel)</Label>
                        <Input type="date" value={campaignDeadline} onChange={(e) => setCampaignDeadline(e.target.value)} />
                      </div>
                      <Button className="w-full gradient-primary" onClick={handleCreateCampaign} disabled={campaignLoading || !campaignTitle}>
                        {campaignLoading ? "Création…" : "Créer la campagne"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-3">
                {campaigns.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">Aucune campagne. Créez-en une pour commencer.</div>
                ) : campaigns.map((c) => (
                  <Card key={c.id} className="bg-card/60 border-border/50">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{c.title}</div>
                        {c.description && <div className="text-sm text-muted-foreground">{c.description}</div>}
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <Badge variant={c.status === "active" ? "default" : "secondary"}>
                            {c.status === "active" ? "Active" : c.status === "completed" ? "Terminée" : "Brouillon"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{c.module_ids.length} module(s)</span>
                          {c.deadline && <span className="text-xs text-muted-foreground">→ {new Date(c.deadline).toLocaleDateString("fr-FR")}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {c.status === "draft" && (
                          <Button size="sm" variant="outline" onClick={async () => {
                            await supabase.from("campaigns").update({ status: "active" }).eq("id", c.id);
                            loadData();
                          }}>Activer</Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* ── Attestations tab ── */}
            <TabsContent value="attestations" className="space-y-4 mt-4">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <h2 className="text-lg font-semibold">Attestations de l'organisation</h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{attestations.length} au total</span>
                  <Button
                    size="sm"
                    onClick={exportComplianceDossier}
                    disabled={exportingDossier}
                    className="gap-1.5 bg-primary text-primary-foreground hover:opacity-90"
                  >
                    {exportingDossier ? <><span className="animate-spin">⏳</span> Génération…</> : <><FileText className="w-4 h-4" /> Exporter le Dossier Conformité</>}
                  </Button>
                </div>
              </div>
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40 border-b border-border/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Employé</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Score</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attestations.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Aucune attestation générée</td></tr>
                    ) : attestations.map((a) => {
                      const member = team.find(m => m.id === a.user_id);
                      return (
                        <tr key={a.id} className="border-b border-border/30 hover:bg-secondary/20">
                          <td className="px-4 py-3">{member?.full_name ?? member?.email ?? a.user_id.slice(0, 8)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{a.generated_at ? new Date(a.generated_at).toLocaleDateString("fr-FR") : "—"}</td>
                          <td className="px-4 py-3 font-semibold">{a.score_average != null ? `${Math.round(a.score_average)}%` : "—"}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              {a.pdf_url && (
                                <Button variant="ghost" size="sm" asChild className="gap-1.5">
                                  <a href={a.pdf_url} target="_blank" rel="noopener noreferrer"><Download className="w-3 h-3" />PDF</a>
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" asChild className="gap-1.5">
                                <Link to={`/verify/${a.id}`} target="_blank"><CheckCircle className="w-3 h-3" />Vérifier</Link>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* ── Office Hours tab ── */}
            <TabsContent value="office-hours" className="mt-4">
              <div className="max-w-2xl">
                <OfficeHoursCard />
              </div>
            </TabsContent>

            {/* ── Settings tab ── */}
            <TabsContent value="settings" className="mt-4">
              <Card className="bg-card/60 border-border/50 max-w-2xl">
                <CardHeader><CardTitle>Paramètres de l'organisation</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Nom de l'organisation</Label>
                    <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Logo</Label>
                    <div className="flex items-center gap-4">
                      {(logoFile ? URL.createObjectURL(logoFile) : org?.logo_url) && (
                        <img src={logoFile ? URL.createObjectURL(logoFile) : org?.logo_url ?? ""} alt="Logo" className="w-16 h-16 rounded-lg object-cover border border-border" />
                      )}
                      <label className="cursor-pointer">
                        <Button variant="outline" size="sm" asChild>
                          <span><Upload className="w-4 h-4 mr-2" />Changer le logo</span>
                        </Button>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Délai de complétion par défaut (jours)</Label>
                    <Input type="number" min={1} max={365} value={deadlineDays} onChange={(e) => setDeadlineDays(Number(e.target.value))} className="w-32" />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="reminders"
                      checked={remindersEnabled}
                      onChange={(e) => setRemindersEnabled(e.target.checked)}
                      className="w-4 h-4 rounded border-border text-primary"
                    />
                    <Label htmlFor="reminders" className="cursor-pointer flex items-center gap-2">
                      <Bell className="w-4 h-4 text-muted-foreground" />
                      Activer les rappels email automatiques
                    </Label>
                  </div>

                  <Button onClick={saveSettings} disabled={settingsSaving} className="gradient-primary">
                    {settingsSaving ? "Sauvegarde…" : "Sauvegarder"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* CSV Import Dialog */}
      {org && (
        <CsvImportDialog
          open={csvImportOpen}
          onClose={() => setCsvImportOpen(false)}
          orgId={org.id}
          onComplete={loadData}
        />
      )}
    </>
  );
}
