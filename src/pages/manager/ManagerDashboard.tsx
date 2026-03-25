import { useState, useEffect, useCallback } from "react";
import { CsvImportDialog } from "@/components/manager/CsvImportDialog";
import { useAuditTrail } from "@/hooks/useAuditTrail";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import {
  Brain, LogOut, Users, CheckCircle, BarChart3, BookOpen, Download, Upload, Plus,
  Search, Filter, ChevronUp, ChevronDown, RefreshCw, Building2, Bell, Trash2,
  Mail, X, Zap, ShieldAlert, TrendingDown, AlertTriangle, FileText, Clock, Shield,
  Target, ChevronRight, TrendingUp, Award, Lightbulb, Timer, Rocket, Euro, Star,
  Activity, MessageSquare, ArrowUpRight, Calendar,
} from "lucide-react";
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
  const color = value > 70 ? "hsl(var(--emerald, 142 71% 45%))" : value > 50 ? "hsl(var(--orange-alert, 25 95% 53%))" : "hsl(var(--destructive))";
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
    up_to_date: { label: "Actif", className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
    late: { label: "En retard", className: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
    inactive: { label: "Inactif", className: "bg-destructive/15 text-destructive border-destructive/30" },
  };
  const s = map[status];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${s.className}`}>{s.label}</span>;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, accent = "primary", trend,
}: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; accent?: string; trend?: "up" | "down" | "neutral";
}) {
  const accentMap: Record<string, string> = {
    primary: "hsl(var(--primary))",
    emerald: "hsl(142 71% 45%)",
    amber: "hsl(45 95% 58%)",
    sky: "hsl(199 89% 48%)",
    violet: "hsl(262 83% 58%)",
    rose: "hsl(350 89% 60%)",
  };
  const color = accentMap[accent] ?? accentMap.primary;
  return (
    <Card className="bg-card/70 border-border/50 backdrop-blur-sm hover:border-primary/30 transition-all">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          {trend && (
            <span className={`text-xs font-semibold flex items-center gap-0.5 ${trend === "up" ? "text-emerald-500" : trend === "down" ? "text-destructive" : "text-muted-foreground"}`}>
              {trend === "up" ? <TrendingUp className="w-3 h-3" /> : trend === "down" ? <TrendingDown className="w-3 h-3" /> : null}
            </span>
          )}
        </div>
        <div className="text-2xl font-black text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
        {sub && <div className="text-xs mt-1.5 font-medium" style={{ color }}>{sub}</div>}
      </CardContent>
    </Card>
  );
}

// ─── ROI Card ─────────────────────────────────────────────────────────────────

function ROIBanner({ team, stats }: { team: TeamMember[]; stats: OrgStats | null }) {
  const activeUsers = team.filter((m) => m.status === "up_to_date").length;
  const completed = stats?.completed_modules ?? 0;
  // Estimation : 20 min saved per completed mission
  const estimatedMinutes = completed * 20;
  const estimatedHours = Math.round(estimatedMinutes / 60);
  const seatsUsed = team.length;
  const monthlyInvestment = 59;
  const costPerPerson = seatsUsed > 0 ? (monthlyInvestment / seatsUsed).toFixed(2) : "—";
  const roi = estimatedHours > 0 ? Math.round((estimatedHours * 50 - monthlyInvestment) / monthlyInvestment * 100) : 0;

  return (
    <div
      className="rounded-2xl border border-primary/20 p-6 sm:p-8"
      style={{
        background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--primary)/0.04) 100%)",
        boxShadow: "0 0 40px hsl(var(--primary)/0.06)",
      }}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
              <Euro className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Vue ROI mensuel</span>
          </div>
          <p className="text-foreground font-semibold text-sm mt-0.5">
            Vous ne payez pas pour une formation.{" "}
            <span className="text-primary">Vous payez pour rendre votre équipe opérationnelle.</span>
          </p>
        </div>
        <div
          className="shrink-0 px-5 py-3 rounded-xl text-center border border-primary/30"
          style={{ background: "hsl(var(--primary)/0.08)" }}
        >
          <div className="text-2xl font-black text-primary">59 €</div>
          <div className="text-[10px] text-muted-foreground font-medium">/ mois · 25 sièges</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            icon: Users, label: "Membres actifs", value: `${activeUsers} / ${seatsUsed}`,
            color: "hsl(199 89% 48%)", sub: `${seatsUsed > 0 ? Math.round(activeUsers / seatsUsed * 100) : 0}% adoption`,
          },
          {
            icon: Timer, label: "Heures économisées est.", value: `~${estimatedHours}h`,
            color: "hsl(142 71% 45%)", sub: `à 20 min / mission`,
          },
          {
            icon: Euro, label: "Coût / personne / mois", value: `${costPerPerson} €`,
            color: "hsl(45 95% 58%)", sub: "vs 300€ min en formation",
          },
          {
            icon: TrendingUp, label: "ROI estimé", value: roi > 0 ? `+${roi}%` : "En cours",
            color: "hsl(var(--primary))", sub: "si valeur temps = 50€/h",
          },
        ].map((item) => (
          <div key={item.label} className="rounded-xl p-3 border border-border/50 bg-background/30">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{ background: `${item.color}18` }}>
              <item.icon className="w-4 h-4" style={{ color: item.color }} />
            </div>
            <div className="text-lg font-black text-foreground">{item.value}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{item.label}</div>
            <div className="text-[10px] font-semibold mt-1" style={{ color: item.color }}>{item.sub}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 pt-4 border-t border-border/40 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500" />14 jours d'essai inclus</span>
          <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500" />Jusqu'à 25 sièges</span>
          <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500" />Rapport mensuel auto</span>
          <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500" />Aucune formation à organiser</span>
        </div>
        <Link to="/pricing">
          <Button variant="outline" size="sm" className="text-xs border-primary/40 text-primary hover:bg-primary/8">
            Détail de l'offre <ArrowUpRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ManagerDashboard() {
  const { profile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { logEvent } = useAuditTrail();
  const [exportingDossier, setExportingDossier] = useState(false);
  const [orgId, setOrgId] = useState<string | undefined>(undefined);

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
        supabase.from("profiles").select("id, full_name, email, last_active_at").eq("org_id", profile.org_id).limit(200),
        supabase.from("campaigns").select("id, title, description, status, deadline, module_ids, target_group, created_at").eq("org_id", profile.org_id).order("created_at", { ascending: false }).limit(50),
        supabase.from("attestations").select("id, user_id, generated_at, score_average, pdf_url, valid_until, modules_completed").eq("org_id", profile.org_id).order("generated_at", { ascending: false }).limit(100),
        supabase.from("modules").select("id, title").eq("is_published", true).limit(200),
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

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    if (!profile?.org_id) return;
    const interval = setInterval(loadData, 15_000);
    return () => clearInterval(interval);
  }, [profile?.org_id, loadData]);

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
      a.download = `rapport-mensuel-${dateStr}.zip`;
      a.click();
      URL.revokeObjectURL(downloadUrl);
      logEvent("compliance_dossier_exported", { details: { org_id: org.id } });
      toast({ title: "✅ Rapport exporté !", description: "Le fichier ZIP est dans vos téléchargements." });
    } catch (e) {
      toast({ title: "Erreur d'export", description: (e as Error).message, variant: "destructive" });
    } finally {
      setExportingDossier(false);
    }
  };

  // ─── CSV export ──────────────────────────────────────────────────────────

  const exportCSV = () => {
    const rows = [["Nom", "Email", "Missions complétées", "Score moyen", "Dernière activité", "Statut", "Heures économisées est."]];
    sorted.forEach((m) => {
      const estimatedHours = Math.round(m.modules_completed * 20 / 60);
      rows.push([
        m.full_name ?? "",
        m.email,
        String(m.modules_completed),
        m.avg_score != null ? `${m.avg_score}%` : "—",
        m.last_active_at ? new Date(m.last_active_at).toLocaleDateString("fr-FR") : "—",
        { up_to_date: "Actif", late: "En retard", inactive: "Inactif" }[m.status],
        `~${estimatedHours}h`,
      ]);
    });
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `rapport-equipe-${org?.name ?? "org"}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Invite employee ──────────────────────────────────────────────────────

  const handleInvite = async () => {
    if (!inviteEmail || !org) return;
    setInviteLoading(true);
    try {
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

  // ─── Render ──────────────────────────────────────────────────────────────

  const seatsUsed = org?.seats_used ?? team.length;
  const seatsMax = org?.seats_max ?? 25;
  const seatsPct = Math.round((seatsUsed / seatsMax) * 100);
  const completionRate = stats?.completion_rate ?? 0;
  const avgScore = stats?.avg_score ?? 0;
  const activeMembers = team.filter((m) => m.status === "up_to_date").length;
  const inactiveMembers = team.filter((m) => m.status === "inactive").length;
  const totalCompleted = stats?.completed_modules ?? 0;
  const activationRate = team.length > 0 ? Math.round((activeMembers / team.length) * 100) : 0;
  const estimatedHoursSaved = Math.round(totalCompleted * 20 / 60);

  return (
    <>
      <Helmet>
        <title>Cockpit Manager – {org?.name ?? "Formetoialia"}</title>
        <meta name="description" content="Pilotez l'adoption IA de votre équipe. Missions, progression, ROI — tout en un." />
      </Helmet>
      <div className="min-h-screen gradient-hero">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="border-b border-border/40 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-30 bg-background/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {org?.logo_url ? (
              <img src={org.logo_url} alt="Logo" className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Brain className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
            <div>
              <span className="font-bold text-sm">{org?.name ?? "Organisation"}</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge className="text-[10px] px-1.5 py-0 border-primary/30 text-primary bg-primary/8" variant="outline">
                  {seatsUsed} / 25 sièges
                </Badge>
                {org?.plan && (
                  <Badge className="text-[10px] px-1.5 py-0" variant="secondary">{org.plan.toUpperCase()}</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={loadData} aria-label="Rafraîchir">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs border-primary/40 text-primary hover:bg-primary/10"
              onClick={exportComplianceDossier}
              disabled={exportingDossier}
            >
              <Download className="w-3.5 h-3.5" />
              Rapport mensuel
            </Button>
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 text-xs">
                  <Plus className="w-3.5 h-3.5" />
                  Inviter
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Inviter un collaborateur</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label className="text-sm mb-1.5 block">Adresse email</Label>
                    <Input
                      placeholder="collaborateur@entreprise.fr"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                      type="email"
                    />
                  </div>
                  <div className="text-xs text-muted-foreground bg-primary/5 rounded-lg px-3 py-2 border border-primary/15">
                    <strong>{seatsMax - seatsUsed} sièges disponibles</strong> sur {seatsMax} inclus dans votre plan.
                  </div>
                  <Button onClick={handleInvite} disabled={inviteLoading || !inviteEmail} className="w-full">
                    {inviteLoading ? "Envoi…" : "Envoyer l'invitation"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Se déconnecter">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

          {/* ── Read-only banner ── */}
          {org?.is_read_only && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-destructive/40 bg-destructive/8 text-sm">
              <ShieldAlert className="w-5 h-5 text-destructive shrink-0" />
              <span>
                <strong>Accès en lecture seule</strong> — Votre abonnement a expiré. Les données sont consultables.{" "}
                <Link to="/pricing" className="underline font-semibold">Renouveler →</Link>
              </span>
            </div>
          )}

          {/* ── Hero tagline ── */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-foreground">Cockpit équipe</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Pilotez l'adoption IA, mesurez les gains, relancez au bon moment.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <Link to="/manager/revenue-ops">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs border-primary/30 text-primary">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Revenue Ops
                </Button>
              </Link>
              <Link to="/manager/attack-simulation">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs border-destructive/30 text-destructive">
                  <Shield className="w-3.5 h-3.5" />
                  Simulation
                </Button>
              </Link>
            </div>
          </div>

          {/* ── KPIs ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={Activity}
              label="Membres actifs"
              value={`${activeMembers} / ${team.length}`}
              sub={`${activationRate}% d'adoption`}
              accent="sky"
              trend={activationRate >= 70 ? "up" : activationRate < 40 ? "down" : "neutral"}
            />
            <KpiCard
              icon={CheckCircle}
              label="Missions terminées"
              value={totalCompleted}
              sub={`${stats?.in_progress_modules ?? 0} en cours`}
              accent="emerald"
              trend="up"
            />
            <KpiCard
              icon={Timer}
              label="Heures économisées est."
              value={`~${estimatedHoursSaved}h`}
              sub="à 20 min / mission"
              accent="amber"
            />
            <KpiCard
              icon={Award}
              label="Attestations générées"
              value={stats?.total_attestations ?? 0}
              sub={`${Math.round(completionRate)}% de complétion`}
              accent="violet"
            />
          </div>

          {/* ── ROI Banner ── */}
          <ROIBanner team={team} stats={stats} />

          {/* ── Signaux d'alerte ── */}
          {inactiveMembers > 0 && (
            <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong className="text-foreground">{inactiveMembers} membre{inactiveMembers > 1 ? "s" : ""} inactif{inactiveMembers > 1 ? "s" : ""}</strong>
                <span className="text-muted-foreground ml-1">— Dernière activité &gt; 14 jours. Relancez-les pour maintenir l'adoption.</span>
              </div>
            </div>
          )}

          {/* ── Tabs ── */}
          <Tabs defaultValue="team">
            <TabsList className="grid grid-cols-4 w-full max-w-lg">
              <TabsTrigger value="team" className="text-xs">Équipe</TabsTrigger>
              <TabsTrigger value="pilotage" className="text-xs">Pilotage</TabsTrigger>
              <TabsTrigger value="campaigns" className="text-xs">Campagnes</TabsTrigger>
              <TabsTrigger value="settings" className="text-xs">Paramètres</TabsTrigger>
            </TabsList>

            {/* ═══════════ TAB TEAM ═══════════ */}
            <TabsContent value="team" className="mt-6 space-y-5">

              {/* Actions bar */}
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher…"
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                      className="pl-9 h-9 text-sm"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                    <SelectTrigger className="h-9 w-36 text-xs">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="up_to_date">Actifs</SelectItem>
                      <SelectItem value="late">En retard</SelectItem>
                      <SelectItem value="inactive">Inactifs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <CsvImportDialog open={csvImportOpen} onClose={() => setCsvImportOpen(false)} orgId={org?.id ?? ""} onComplete={loadData} />
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={exportCSV}>
                    <Download className="w-3.5 h-3.5" />
                    Export CSV
                  </Button>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50" style={{ background: "hsl(var(--card)/0.6)" }}>
                        {(
                          [
                            { field: "full_name", label: "Collaborateur" },
                            { field: "modules_completed", label: "Missions" },
                            { field: "avg_score", label: "Score" },
                            { field: "last_active_at", label: "Dernière activité" },
                            { field: "status", label: "Statut" },
                          ] as { field: SortField; label: string }[]
                        ).map(({ field, label }) => (
                          <th
                            key={field}
                            className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                            onClick={() => handleSort(field)}
                          >
                            <span className="flex items-center gap-1">
                              {label}
                              {sortField === field && (
                                sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                              )}
                            </span>
                          </th>
                        ))}
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Heures éco. est.</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                            {loading ? "Chargement…" : "Aucun collaborateur trouvé."}
                          </td>
                        </tr>
                      ) : (
                        paginated.map((m, idx) => {
                          const hoursEst = Math.round(m.modules_completed * 20 / 60);
                          return (
                            <tr
                              key={m.id}
                              className={`border-b border-border/30 hover:bg-primary/3 transition-colors ${idx % 2 === 0 ? "" : "bg-card/30"}`}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                    {(m.full_name ?? m.email)[0]?.toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-medium text-sm truncate">{m.full_name ?? "—"}</div>
                                    <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-foreground">{m.modules_completed}</span>
                                  {m.modules_completed > 0 && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`font-semibold ${m.avg_score != null && m.avg_score > 70 ? "text-emerald-500" : m.avg_score != null && m.avg_score > 50 ? "text-amber-400" : "text-muted-foreground"}`}>
                                  {m.avg_score != null ? `${m.avg_score}%` : "—"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">
                                {m.last_active_at
                                  ? new Date(m.last_active_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
                                  : <span className="text-destructive/70">Jamais</span>}
                              </td>
                              <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                              <td className="px-4 py-3 text-xs font-semibold text-emerald-500">
                                ~{hoursEst}h
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {m.status === "inactive" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-xs gap-1 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                                      onClick={() => {
                                        toast({ title: `Rappel envoyé à ${m.full_name ?? m.email}` });
                                      }}
                                    >
                                      <Bell className="w-3 h-3" />
                                      Relancer
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-7 h-7 text-muted-foreground hover:text-foreground"
                                    onClick={() => navigate(`/manager/members/${m.id}`)}
                                    aria-label="Voir le profil"
                                  >
                                    <ChevronRight className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border/30 text-xs text-muted-foreground bg-card/30">
                    <span>{sorted.length} collaborateur{sorted.length > 1 ? "s" : ""}</span>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                        Précédent
                      </Button>
                      <span>{page} / {totalPages}</span>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                        Suivant
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ═══════════ TAB PILOTAGE ═══════════ */}
            <TabsContent value="pilotage" className="mt-6 space-y-6">

              {/* Score adoption */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-card/70 border-border/50">
                  <CardContent className="p-5 flex items-center gap-4">
                    <CircularProgress value={activationRate} />
                    <div>
                      <div className="text-sm font-semibold text-foreground">Score d'adoption</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {activationRate >= 70 ? "🟢 Bonne adoption" : activationRate >= 40 ? "🟡 En progression" : "🔴 Adoption faible"}
                      </div>
                      {activationRate < 70 && (
                        <div className="text-xs text-primary mt-1.5 font-medium">
                          Objectif : relancer les inactifs
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/70 border-border/50">
                  <CardContent className="p-5">
                    <div className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Progression équipe</div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Missions terminées</span>
                        <span className="font-bold">{totalCompleted}</span>
                      </div>
                      <Progress value={completionRate} className="h-2" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>0%</span>
                        <span className="font-semibold text-primary">{Math.round(completionRate)}%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/70 border-border/50">
                  <CardContent className="p-5">
                    <div className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Répartition équipe</div>
                    <div className="space-y-2.5">
                      {[
                        { label: "Actifs", count: activeMembers, color: "bg-emerald-500", pct: team.length > 0 ? Math.round(activeMembers / team.length * 100) : 0 },
                        { label: "En retard", count: team.filter(m => m.status === "late").length, color: "bg-amber-500", pct: team.length > 0 ? Math.round(team.filter(m => m.status === "late").length / team.length * 100) : 0 },
                        { label: "Inactifs", count: inactiveMembers, color: "bg-destructive", pct: team.length > 0 ? Math.round(inactiveMembers / team.length * 100) : 0 },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-2 text-xs">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${item.color}`} />
                          <span className="text-muted-foreground flex-1">{item.label}</span>
                          <span className="font-semibold">{item.count}</span>
                          <span className="text-muted-foreground w-8 text-right">{item.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recommandations */}
              <Card className="bg-card/70 border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    Recommandations d'action
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {inactiveMembers > 0 && (
                    <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground">Relancer {inactiveMembers} membre{inactiveMembers > 1 ? "s" : ""} inactif{inactiveMembers > 1 ? "s" : ""}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Un simple rappel peut réactiver l'usage. Chaque mission = ~20 min économisées.</div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 text-xs border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                        onClick={() => toast({ title: "Rappels envoyés aux membres inactifs !" })}
                      >
                        <Bell className="w-3 h-3 mr-1" />
                        Relancer tous
                      </Button>
                    </div>
                  )}
                  {activationRate < 50 && (
                    <div className="flex items-start gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
                      <Rocket className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground">Recommander un playbook de démarrage</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Partagez "Rédiger un mail difficile" — résultat visible en moins de 10 min.</div>
                      </div>
                    </div>
                  )}
                  {completionRate > 0 && (
                    <div className="flex items-start gap-3 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                      <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground">Votre équipe progresse</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{totalCompleted} missions terminées — estimez ~{estimatedHoursSaved}h économisées ce mois.</div>
                      </div>
                    </div>
                  )}
                  {totalCompleted === 0 && (
                    <div className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card/50">
                      <Target className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-foreground">Invitez vos premiers collaborateurs</div>
                        <div className="text-xs text-muted-foreground mt-0.5">25 sièges disponibles. Invitez votre équipe pour commencer à piloter l'adoption.</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Gaps & Risks */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {orgId && <OrgGapsWidget orgId={orgId} />}
                {orgId && <PhishingRiskWidget orgId={orgId} />}
              </div>

              {/* Budget IA */}
              {budgetUsage && (() => {
                const costToday = budgetUsage.org_cost_today;
                const costCap = orgBudget?.daily_cost_cap ?? 5;
                const ecoForced = orgBudget?.eco_mode_forced ?? false;
                const costPct = Math.min((costToday / costCap) * 100, 100);
                const warn = costPct >= 80;
                return (
                  <Card className={`bg-card/60 backdrop-blur-sm ${ecoForced ? "border-destructive/50" : "border-border/50"}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {ecoForced
                          ? <><ShieldAlert className="w-4 h-4 text-destructive" />Budget IA — Mode Éco forcé</>
                          : <><Zap className="w-4 h-4 text-primary" />Budget IA du jour</>}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Coût estimé aujourd'hui</span>
                          <span className={warn ? "text-destructive font-semibold" : "text-foreground font-medium"}>
                            €{costToday.toFixed(4)} / €{costCap.toFixed(2)}
                          </span>
                        </div>
                        <Progress value={costPct} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
            </TabsContent>

            {/* ═══════════ TAB CAMPAIGNS ═══════════ */}
            <TabsContent value="campaigns" className="mt-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm text-foreground">Campagnes de déploiement</h2>
                <Dialog open={campaignOpen} onOpenChange={setCampaignOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1.5 text-xs"><Plus className="w-3.5 h-3.5" />Nouvelle campagne</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Créer une campagne</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div>
                        <Label className="text-sm mb-1.5 block">Titre de la campagne</Label>
                        <Input placeholder="Formation IA — Juin 2025" value={campaignTitle} onChange={(e) => setCampaignTitle(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-sm mb-1.5 block">Description (optionnel)</Label>
                        <Input placeholder="Objectif de la campagne…" value={campaignDesc} onChange={(e) => setCampaignDesc(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-sm mb-1.5 block">Date limite (optionnel)</Label>
                        <Input type="date" value={campaignDeadline} onChange={(e) => setCampaignDeadline(e.target.value)} />
                      </div>
                      <Button onClick={handleCreateCampaign} disabled={campaignLoading || !campaignTitle} className="w-full">
                        {campaignLoading ? "Création…" : "Créer la campagne"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {campaigns.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-sm">
                  <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  Aucune campagne. Créez votre première campagne de déploiement.
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.map((c) => (
                    <div key={c.id} className="rounded-xl border border-border/50 bg-card/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-foreground">{c.title}</div>
                          {c.description && <div className="text-xs text-muted-foreground mt-0.5">{c.description}</div>}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span>{c.module_ids.length} module{c.module_ids.length > 1 ? "s" : ""}</span>
                            {c.deadline && <span>Échéance : {new Date(c.deadline).toLocaleDateString("fr-FR")}</span>}
                          </div>
                        </div>
                        <Badge variant={c.status === "active" ? "default" : "secondary"} className="text-xs shrink-0">
                          {c.status ?? "Brouillon"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Attestations */}
              {attestations.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4 text-primary" />
                    Attestations récentes ({attestations.length})
                  </h3>
                  <div className="space-y-2">
                    {attestations.slice(0, 5).map((a) => (
                      <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/30 bg-card/50 px-4 py-3 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                            <Award className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-medium text-foreground truncate">{a.user_id.slice(0, 8)}…</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                          {a.score_average && <span className="font-semibold text-emerald-500">{a.score_average}%</span>}
                          {a.generated_at && <span>{new Date(a.generated_at).toLocaleDateString("fr-FR")}</span>}
                          {a.pdf_url && (
                            <a href={a.pdf_url} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1">
                                <Download className="w-3 h-3" />PDF
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Export rapport */}
              <div
                className="rounded-xl border border-primary/20 p-5"
                style={{ background: "hsl(var(--primary)/0.04)" }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-sm text-foreground">Rapport mensuel complet</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Activité équipe · Gains estimés · Progression · Attestations — format ZIP téléchargeable.
                    </div>
                  </div>
                  <Button
                    onClick={exportComplianceDossier}
                    disabled={exportingDossier}
                    variant="outline"
                    className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10 shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    {exportingDossier ? "Génération…" : "Exporter"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* ═══════════ TAB SETTINGS ═══════════ */}
            <TabsContent value="settings" className="mt-6 space-y-6">
              <div className="max-w-lg space-y-5">
                <div>
                  <Label className="text-sm mb-1.5 block">Nom de l'organisation</Label>
                  <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} />
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">Délai de complétion (jours)</Label>
                  <Input
                    type="number" min={1} max={365}
                    value={deadlineDays}
                    onChange={(e) => setDeadlineDays(Number(e.target.value))}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="reminders"
                    checked={remindersEnabled}
                    onChange={(e) => setRemindersEnabled(e.target.checked)}
                    className="w-4 h-4 accent-primary"
                  />
                  <Label htmlFor="reminders" className="text-sm cursor-pointer">
                    Activer les rappels automatiques par email
                  </Label>
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">Logo de l'organisation</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                    className="text-sm"
                  />
                </div>
                <Button onClick={saveSettings} disabled={settingsSaving} className="w-full sm:w-auto">
                  {settingsSaving ? "Sauvegarde…" : "Sauvegarder"}
                </Button>
              </div>

              {/* Sièges */}
              <div className="max-w-lg rounded-xl border border-border/50 bg-card/60 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm text-foreground">Sièges utilisés</div>
                  <span className="text-sm font-bold text-primary">{seatsUsed} / {seatsMax}</span>
                </div>
                <Progress value={seatsPct} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{seatsMax - seatsUsed} sièges disponibles</span>
                  {seatsUsed >= seatsMax && (
                    <Link to="/pricing" className="text-primary underline font-semibold">Voir l'offre</Link>
                  )}
                </div>
              </div>

              <OfficeHoursCard />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  );
}
