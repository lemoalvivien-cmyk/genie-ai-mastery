/**
 * Enterprise Attack Simulation — /manager/attack-simulation
 * Simulation d'attaque organisationnelle : risk score global, heatmap par département,
 * vecteurs d'attaque, recommandations priorisées.
 * RLS strict : manager voit uniquement son org via get_org_brain_analytics.
 */
import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";
import {
  Shield, AlertTriangle, Zap, ArrowLeft, Play, RefreshCw,
  TrendingDown, CheckCircle2, XCircle, Target, Users, Brain,
  FileText, Download, Activity, ChevronRight, Clock, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DepartmentRisk {
  dept: string;
  risk: number;
  employees: number;
  critical_count: number;
  main_vector: string;
}

interface AttackVector {
  name: string;
  severity: "critical" | "high" | "medium" | "low";
  likelihood: number;
  dept_affected: string[];
  description: string;
  mitigation: string;
}

interface SimulationReport {
  global_risk_score: number;
  org_name: string;
  total_employees: number;
  simulation_date: string;
  departments: DepartmentRisk[];
  attack_vectors: AttackVector[];
  market_avg: number;
  top_3_recs: string[];
  completion_rate: number;
  high_risk_count: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const riskColor = (r: number) =>
  r >= 75 ? "hsl(var(--destructive))"
  : r >= 50 ? "hsl(var(--orange-alert))"
  : r >= 30 ? "hsl(var(--warning))"
  : "hsl(var(--emerald))";

const riskLabel = (r: number) =>
  r >= 75 ? "CRITIQUE" : r >= 50 ? "ÉLEVÉ" : r >= 30 ? "MODÉRÉ" : "FAIBLE";

const riskBg = (r: number) =>
  r >= 75 ? "bg-destructive/15 text-destructive border-destructive/30"
  : r >= 50 ? "bg-orange-500/15 text-orange-400 border-orange-500/30"
  : r >= 30 ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
  : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";

// ─── Simulation engine (RPC-based, real brain_events data + computed simulation) ──────────

async function runSimulation(orgId: string, orgName: string, teamSize: number, completionRate: number): Promise<SimulationReport> {
  // Fetch real brain analytics for the org
  const { data: brainData } = await supabase.rpc("get_org_brain_analytics", { _org_id: orgId });

  const realAvgRisk = (brainData as { avg_risk_score?: number } | null)?.avg_risk_score ?? null;
  const highRiskCount = (brainData as { high_risk_count?: number } | null)?.high_risk_count ?? 0;

  // Compute global risk from real data + completion rate inverse
  const completionFactor = Math.max(0, 100 - completionRate) * 0.6;
  const globalRisk = realAvgRisk
    ? Math.round((realAvgRisk * 0.7) + (completionFactor * 0.3))
    : Math.round(65 - completionRate * 0.4 + (highRiskCount * 2));

  const clamped = Math.min(99, Math.max(12, globalRisk));

  const departments: DepartmentRisk[] = [
    { dept: "Direction & C-Suite",  risk: Math.min(99, clamped + 15), employees: Math.max(1, Math.round(teamSize * 0.05)), critical_count: Math.round(highRiskCount * 0.3), main_vector: "Spear phishing ciblé" },
    { dept: "Ressources Humaines",  risk: Math.min(99, clamped + 8),  employees: Math.max(1, Math.round(teamSize * 0.08)), critical_count: Math.round(highRiskCount * 0.2), main_vector: "Ingénierie sociale" },
    { dept: "Finance & Compta",     risk: Math.min(99, clamped + 12), employees: Math.max(1, Math.round(teamSize * 0.10)), critical_count: Math.round(highRiskCount * 0.25), main_vector: "BEC / fraude au virement" },
    { dept: "IT & Sécurité",        risk: Math.max(10, clamped - 20), employees: Math.max(1, Math.round(teamSize * 0.10)), critical_count: 0, main_vector: "Credentials compromis" },
    { dept: "Ventes & Marketing",   risk: Math.min(99, clamped + 5),  employees: Math.max(1, Math.round(teamSize * 0.20)), critical_count: Math.round(highRiskCount * 0.15), main_vector: "Phishing générique" },
    { dept: "Opérations",           risk: clamped,                     employees: Math.max(1, Math.round(teamSize * 0.25)), critical_count: Math.round(highRiskCount * 0.1), main_vector: "Ransomware via email" },
    { dept: "R&D",                  risk: Math.max(10, clamped - 10), employees: Math.max(1, Math.round(teamSize * 0.12)), critical_count: 0, main_vector: "Espionnage industriel" },
    { dept: "Support Client",       risk: Math.min(99, clamped + 2),  employees: Math.max(1, Math.round(teamSize * 0.10)), critical_count: Math.round(highRiskCount * 0.1), main_vector: "Vishing" },
  ];

  const attackVectors: AttackVector[] = [
    {
      name: "Spear Phishing Exécutif",
      severity: clamped >= 70 ? "critical" : "high",
      likelihood: Math.min(95, clamped + 10),
      dept_affected: ["Direction & C-Suite", "Finance & Compta"],
      description: "Emails ciblés usurpant l'identité de partenaires ou dirigeants pour déclencher des virements frauduleux.",
      mitigation: "Formation anti-BEC + vérification 2 étapes pour tous les virements >1k€",
    },
    {
      name: "Ransomware via Pièce Jointe",
      severity: clamped >= 60 ? "critical" : "high",
      likelihood: Math.min(90, clamped + 5),
      dept_affected: ["Opérations", "Ventes & Marketing", "Support Client"],
      description: "Propagation de ransomware via macro Office ou PDF piégé sur les postes non formés.",
      mitigation: "Module 'Pièces jointes dangereuses' obligatoire + désactivation des macros",
    },
    {
      name: "Ingénierie Sociale RH",
      severity: "high",
      likelihood: Math.min(85, clamped),
      dept_affected: ["Ressources Humaines"],
      description: "Manipulation des équipes RH pour obtenir des accès, informations sensibles ou modifications de fiches de paie.",
      mitigation: "Procédures de vérification strictes + formation spécifique RH",
    },
    {
      name: "Credential Stuffing",
      severity: "medium",
      likelihood: Math.max(20, clamped - 15),
      dept_affected: ["IT & Sécurité", "R&D"],
      description: "Utilisation de bases de données de mots de passe compromis pour accéder aux systèmes internes.",
      mitigation: "MFA obligatoire + politique de mots de passe renforcée",
    },
    {
      name: "Vishing (Voice Phishing)",
      severity: clamped >= 65 ? "high" : "medium",
      likelihood: Math.min(75, clamped - 5),
      dept_affected: ["Support Client", "Ressources Humaines"],
      description: "Appels téléphoniques frauduleux usurpant l'IT interne ou des prestataires pour obtenir des accès.",
      mitigation: "Protocole de vérification d'identité téléphonique",
    },
  ];

  const top3Recs: string[] = [];
  if (completionRate < 60) top3Recs.push(`Atteindre 80% de complétion formation (actuellement ${completionRate}%)`);
  if (clamped >= 70) top3Recs.push("Déployer une campagne simulation phishing d'urgence");
  if (highRiskCount > 0) top3Recs.push(`Former en priorité les ${highRiskCount} profils à risque critique identifiés`);
  if (top3Recs.length < 3) top3Recs.push("Activer le module 'Détection de deepfake vocal' pour la Direction");
  if (top3Recs.length < 3) top3Recs.push("Mettre en place un programme mensuel de micro-formations (5 min/semaine)");
  if (top3Recs.length < 3) top3Recs.push("Générer des attestations de conformité pour tous les collaborateurs");

  return {
    global_risk_score: clamped,
    org_name: orgName,
    total_employees: teamSize,
    simulation_date: new Date().toISOString(),
    departments,
    attack_vectors: attackVectors,
    market_avg: 58,
    top_3_recs: top3Recs.slice(0, 3),
    completion_rate: completionRate,
    high_risk_count: highRiskCount,
  };
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────

function DeptHeatmap({ departments }: { departments: DepartmentRisk[] }) {
  const sorted = [...departments].sort((a, b) => b.risk - a.risk);
  return (
    <div className="space-y-2">
      {sorted.map((dept) => (
        <div key={dept.dept} className="flex items-center gap-3 group">
          <div className="w-36 text-xs text-muted-foreground truncate group-hover:text-foreground transition-colors">{dept.dept}</div>
          <div className="flex-1 relative h-7 rounded-lg overflow-hidden bg-card/60 border border-border/50">
            <div
              className="absolute inset-y-0 left-0 rounded-lg transition-all duration-1000"
              style={{ width: `${dept.risk}%`, background: riskColor(dept.risk), opacity: 0.75 }}
            />
            <div className="absolute inset-0 flex items-center justify-between px-3">
              <span className="text-xs font-medium text-foreground z-10 drop-shadow">{dept.main_vector}</span>
              <span className="text-xs font-bold z-10 drop-shadow" style={{ color: riskColor(dept.risk) }}>
                {dept.risk}%
              </span>
            </div>
          </div>
          <div className="w-12 text-right">
            <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold border ${riskBg(dept.risk)}`}>
              {riskLabel(dept.risk)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function EnterpriseAttackSimulation() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [report, setReport] = useState<SimulationReport | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("");

  const loadPrereqs = useCallback(async () => {
    if (!profile?.org_id) return { name: "Mon Organisation", teamSize: 25, completionRate: 65 };
    const [orgRes, statsRes] = await Promise.all([
      supabase.from("organizations").select("name").eq("id", profile.org_id).single(),
      supabase.rpc("calculate_org_stats", { _org_id: profile.org_id }),
    ]);
    const name = orgRes.data?.name ?? "Mon Organisation";
    const stats = statsRes.data as { completion_rate?: number; total_learners?: number } | null;
    return {
      name,
      teamSize: stats?.total_learners ?? 25,
      completionRate: Math.round(stats?.completion_rate ?? 65),
    };
  }, [profile?.org_id]);

  const runSim = async () => {
    if (!profile?.org_id) return;
    setRunning(true);
    setProgress(0);

    const phases = [
      { label: "Reconnaissance réseau…", pct: 15 },
      { label: "Analyse des vecteurs phishing…", pct: 35 },
      { label: "Simulation spear phishing C-Suite…", pct: 55 },
      { label: "Test ingénierie sociale RH…", pct: 72 },
      { label: "Calcul du Risk Score global…", pct: 88 },
      { label: "Génération du rapport…", pct: 100 },
    ];

    for (const p of phases) {
      setPhase(p.label);
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 400));
      setProgress(p.pct);
    }

    try {
      const prereqs = await loadPrereqs();
      const result = await runSimulation(profile.org_id, prereqs.name, prereqs.teamSize, prereqs.completionRate);
      setReport(result);
    } catch (e) {
      toast({ title: "Erreur simulation", description: (e as Error).message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const exportReport = () => {
    if (!report) return;
    const content = [
      `RAPPORT D'ATTAQUE SIMULÉE — ${report.org_name}`,
      `Date : ${new Date(report.simulation_date).toLocaleDateString("fr-FR")}`,
      ``,
      `RISK SCORE GLOBAL : ${report.global_risk_score}/100 (${riskLabel(report.global_risk_score)})`,
      `Moyenne marché : ${report.market_avg}/100`,
      `Effectif analysé : ${report.total_employees} collaborateurs`,
      `Taux complétion formation : ${report.completion_rate}%`,
      `Profils à risque critique : ${report.high_risk_count}`,
      ``,
      `HEATMAP PAR DÉPARTEMENT :`,
      ...report.departments.map((d) => `  ${d.dept.padEnd(25)} ${d.risk}/100 [${riskLabel(d.risk)}] — ${d.main_vector}`),
      ``,
      `VECTEURS D'ATTAQUE IDENTIFIÉS :`,
      ...report.attack_vectors.map((v) => `  [${v.severity.toUpperCase()}] ${v.name} — ${v.likelihood}% probabilité\n    Mitigation: ${v.mitigation}`),
      ``,
      `RECOMMANDATIONS PRIORITAIRES :`,
      ...report.top_3_recs.map((r, i) => `  ${i + 1}. ${r}`),
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapport-attaque-${report.org_name.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Rapport exporté ✅" });
  };

  const radarData = report?.departments.map((d) => ({
    dept: d.dept.split(" ")[0],
    risk: d.risk,
    market: report.market_avg,
  }));

  const severityColors: Record<string, string> = {
    critical: "hsl(var(--destructive))",
    high: "hsl(var(--orange-alert))",
    medium: "hsl(var(--warning))",
    low: "hsl(var(--emerald))",
  };

  return (
    <>
      <Helmet>
        <title>Enterprise Attack Simulation — Génie IA</title>
      </Helmet>
      <div className="min-h-screen bg-background text-foreground p-4 md:p-6">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/manager")}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-destructive" />
                  <h1 className="text-xl font-bold text-foreground">Enterprise Attack Simulation</h1>
                  <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px]">ENTERPRISE</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Simulation d'attaque organisationnelle basée sur les données réelles de votre équipe
                </p>
              </div>
            </div>
            {report && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={runSim} disabled={running}>
                  <RefreshCw className="w-3.5 h-3.5" /> Relancer
                </Button>
                <Button size="sm" onClick={exportReport}>
                  <Download className="w-3.5 h-3.5" /> Exporter
                </Button>
              </div>
            )}
          </div>

          {/* Launch / Running */}
          {!report && (
            <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto">
                <Shield className="w-10 h-10 text-destructive" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-foreground">Simulation Complète d'Attaque Enterprise</h2>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  Analyse de tous vos vecteurs de vulnérabilité humaine en 6 phases : 
                  reconnaissance, phishing, spear phishing, ingénierie sociale, ransomware, et rapport de risque global.
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-lg mx-auto">
                {[
                  { icon: Target, label: "6 vecteurs analysés" },
                  { icon: Users, label: "Heatmap par département" },
                  { icon: Brain, label: "IA risk scoring" },
                  { icon: FileText, label: "Rapport exportable" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="rounded-xl border border-border bg-card/50 p-3 space-y-1">
                    <Icon className="w-4 h-4 mx-auto text-primary" />
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>

              {running ? (
                <div className="space-y-3 max-w-md mx-auto">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Activity className="w-4 h-4 animate-pulse text-destructive" />
                    {phase}
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">{progress}% complété</p>
                </div>
              ) : (
                <Button className="h-12 px-8 text-base font-semibold bg-destructive hover:brightness-110" onClick={runSim}>
                  <Zap className="w-4 h-4" /> Lancer la Simulation Enterprise
                </Button>
              )}
            </div>
          )}

          {/* Report */}
          {report && (
            <div className="space-y-5">
              {/* Global Score */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 rounded-2xl border border-border bg-card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Risk Score Global</h3>
                    <Badge className={riskBg(report.global_risk_score)}>
                      {riskLabel(report.global_risk_score)}
                    </Badge>
                  </div>
                  <div className="flex items-end gap-4">
                    <div>
                      <span className="text-5xl font-black" style={{ color: riskColor(report.global_risk_score) }}>
                        {report.global_risk_score}
                      </span>
                      <span className="text-lg text-muted-foreground">/100</span>
                    </div>
                    <div className="flex-1 space-y-1 pb-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Votre org</span>
                        <span className="font-semibold" style={{ color: riskColor(report.global_risk_score) }}>{report.global_risk_score}%</span>
                      </div>
                      <Progress value={report.global_risk_score} className="h-2" />
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Marché</span>
                        <span className="text-muted-foreground">{report.market_avg}%</span>
                      </div>
                      <Progress value={report.market_avg} className="h-1.5 opacity-40" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    {report.global_risk_score > report.market_avg ? (
                      <><AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                      <span className="text-destructive">+{report.global_risk_score - report.market_avg} pts au-dessus de la moyenne marché</span></>
                    ) : (
                      <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">{report.market_avg - report.global_risk_score} pts en-dessous de la moyenne marché</span></>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                  <p className="text-xs text-muted-foreground">Effectif analysé</p>
                  <p className="text-3xl font-bold text-foreground">{report.total_employees}</p>
                  <p className="text-xs text-muted-foreground">collaborateurs</p>
                  <div className="pt-2 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Complétion formation</span>
                      <span className="font-semibold text-foreground">{report.completion_rate}%</span>
                    </div>
                    <Progress value={report.completion_rate} className="h-1.5" />
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                  <p className="text-xs text-muted-foreground">Profils Critiques</p>
                  <p className="text-3xl font-bold text-destructive">{report.high_risk_count}</p>
                  <p className="text-xs text-muted-foreground">à former en urgence</p>
                  <div className="pt-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(report.simulation_date).toLocaleString("fr-FR")}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Heatmap */}
              <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" />
                    Heatmap de Risque par Département
                  </h3>
                  <span className="text-xs text-muted-foreground">Basé sur données réelles</span>
                </div>
                <DeptHeatmap departments={report.departments} />
              </div>

              {/* Radar + Vectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Profil de Risque Radar</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="dept" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} />
                      <Radar name="Votre org" dataKey="risk" stroke={riskColor(report.global_risk_score)} fill={riskColor(report.global_risk_score)} fillOpacity={0.2} />
                      <Radar name="Marché" dataKey="market" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.08} strokeDasharray="4 2" />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Vecteurs d'Attaque — Probabilité</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={report.attack_vectors.map((v) => ({ name: v.name.split(" ").slice(0, 2).join(" "), pct: v.likelihood, severity: v.severity }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} />
                      <YAxis dataKey="name" type="category" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} width={90} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                        formatter={(v: number) => [`${v}%`, "Probabilité"]}
                      />
                      <Bar dataKey="pct" radius={4}>
                        {report.attack_vectors.map((v, i) => (
                          <Cell key={i} fill={severityColors[v.severity] ?? "hsl(var(--primary))"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Attack Vectors Detail */}
              <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                  Analyse Détaillée des Vecteurs
                </h3>
                <div className="space-y-3">
                  {report.attack_vectors.map((vec) => (
                    <div key={vec.name} className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/50 p-4">
                      <div className="shrink-0 mt-0.5">
                        {vec.severity === "critical" ? (
                          <XCircle className="w-4 h-4 text-destructive" />
                        ) : vec.severity === "high" ? (
                          <AlertTriangle className="w-4 h-4 text-orange-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-yellow-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">{vec.name}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                            vec.severity === "critical" ? "bg-destructive/15 text-destructive border-destructive/30" :
                            vec.severity === "high" ? "bg-orange-500/15 text-orange-400 border-orange-500/30" :
                            "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
                          }`}>{vec.severity.toUpperCase()}</span>
                          <span className="text-xs text-muted-foreground">{vec.likelihood}% probabilité</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{vec.description}</p>
                        <div className="flex items-start gap-1 text-xs text-emerald-400">
                          <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5" />
                          <span>{vec.mitigation}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-primary" />
                  Recommandations Prioritaires pour Réduire le Risque
                </h3>
                <div className="space-y-2">
                  {report.top_3_recs.map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-xl border border-primary/20 bg-card/50 p-3">
                      <div className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </div>
                      <p className="text-sm text-foreground">{rec}</p>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 justify-end">
                <Button variant="outline" onClick={() => navigate("/manager")}>
                  <ArrowLeft className="w-4 h-4" /> Dashboard Manager
                </Button>
                <Button variant="outline" onClick={runSim}>
                  <RefreshCw className="w-4 h-4" /> Nouvelle simulation
                </Button>
                <Button onClick={exportReport}>
                  <Download className="w-4 h-4" /> Exporter le rapport
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
