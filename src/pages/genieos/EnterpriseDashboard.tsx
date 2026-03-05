import { useState } from "react";
import { Building2, Users, Zap, BarChart3, Shield, Globe, Code2, Crown, ChevronRight, TrendingUp, Activity, Bot, DollarSign, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const ENTERPRISE_FEATURES = [
  {
    icon: Globe,
    title: "White-Label",
    description: "Déployez GENIE OS sous votre propre marque avec votre domaine.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    available: true,
  },
  {
    icon: Code2,
    title: "API Complète",
    description: "Accès REST & WebSocket pour intégrer GENIE OS dans vos systèmes.",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    available: true,
  },
  {
    icon: Users,
    title: "Gestion d'équipe",
    description: "Gérez des milliers d'utilisateurs, rôles et permissions.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    available: true,
  },
  {
    icon: BarChart3,
    title: "Analytics Avancées",
    description: "ROI par agent, coûts IA, performance des automatisations.",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    available: true,
  },
  {
    icon: Shield,
    title: "Sécurité Enterprise",
    description: "SSO, audit logs, conformité RGPD, chiffrement end-to-end.",
    color: "text-rose-400",
    bg: "bg-rose-400/10",
    available: true,
  },
  {
    icon: Zap,
    title: "Agents illimités",
    description: "Aucune limite sur le nombre d'agents et d'exécutions.",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    available: true,
  },
];

const TEAM_MEMBERS = [
  { name: "Sophie Martin", role: "Admin", agents: 12, actions: 1842, status: "active" },
  { name: "Thomas Dupont", role: "Manager", agents: 7, actions: 934, status: "active" },
  { name: "Claire Roux", role: "Developer", agents: 5, actions: 612, status: "active" },
  { name: "Antoine Leroy", role: "Analyst", agents: 3, actions: 287, status: "idle" },
];

const AUTOMATION_METRICS = [
  { label: "Agents actifs", value: "47", delta: "+12%", icon: Bot, color: "text-primary" },
  { label: "Actions / jour", value: "2 847", delta: "+34%", icon: Activity, color: "text-emerald-400" },
  { label: "Revenu automatisé", value: "€12 400", delta: "+28%", icon: DollarSign, color: "text-amber-400" },
  { label: "Économies réalisées", value: "€8 200", delta: "+19%", icon: TrendingUp, color: "text-blue-400" },
];

export default function EnterpriseDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "team" | "api" | "features">("overview");

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 border border-amber-400/30 flex items-center justify-center">
              <Crown className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Enterprise Mode</h1>
              <p className="text-sm text-muted-foreground">Tableau de bord organisation — accès complet</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400">ENTERPRISE</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted/30 rounded-xl border border-border w-fit">
          {(["overview", "team", "api", "features"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize",
                activeTab === tab
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === "overview" ? "Vue d'ensemble" : tab === "team" ? "Équipe" : tab === "api" ? "API" : "Fonctionnalités"}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {AUTOMATION_METRICS.map((m) => (
                <div key={m.label} className="bg-card border border-border rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <m.icon className={cn("w-4 h-4", m.color)} />
                    <span className="text-xs text-emerald-400 font-medium">{m.delta}</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{m.value}</p>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>

            {/* Activity chart placeholder */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Activité des agents (7 derniers jours)
              </h3>
              <div className="flex items-end gap-2 h-32">
                {[42, 78, 55, 91, 67, 84, 96].map((v, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-primary/40 border-t-2 border-primary transition-all hover:bg-primary/60"
                      style={{ height: `${v}%` }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {["L", "M", "M", "J", "V", "S", "D"][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Team tab */}
        {activeTab === "team" && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Membres de l'équipe
              </h3>
              <button className="text-xs text-primary hover:underline">+ Inviter</button>
            </div>
            <div className="divide-y divide-border">
              {TEAM_MEMBERS.map((m) => (
                <div key={m.name} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-xs font-semibold text-primary">{m.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-xs text-muted-foreground">
                    <span>{m.agents} agents</span>
                    <span>{m.actions.toLocaleString()} actions</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                      m.status === "active" ? "bg-emerald-400/10 text-emerald-400" : "bg-muted text-muted-foreground"
                    )}>
                      {m.status === "active" ? "Actif" : "Inactif"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* API tab */}
        {activeTab === "api" && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Code2 className="w-4 h-4 text-purple-400" />
                Clé API Enterprise
              </h3>
              <div className="flex items-center gap-2">
                <div className="flex-1 font-mono text-xs bg-muted/50 border border-border rounded-lg px-3 py-2 text-muted-foreground">
                  gos_ent_•••••••••••••••••••••••••••••••••
                </div>
                <button className="px-3 py-2 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                  Afficher
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Utilisez cette clé pour authentifier vos requêtes REST & WebSocket.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h3 className="font-semibold text-foreground">Endpoints disponibles</h3>
              {[
                { method: "POST", path: "/api/v1/agents/run", desc: "Exécuter un agent" },
                { method: "GET",  path: "/api/v1/agents",     desc: "Lister les agents" },
                { method: "POST", path: "/api/v1/workflows",  desc: "Créer un workflow" },
                { method: "GET",  path: "/api/v1/analytics",  desc: "Récupérer les analytics" },
              ].map((e) => (
                <div key={e.path} className="flex items-center gap-3 text-sm">
                  <span className={cn(
                    "px-2 py-0.5 rounded font-mono text-[10px] font-bold min-w-[40px] text-center",
                    e.method === "POST" ? "bg-emerald-400/10 text-emerald-400" : "bg-blue-400/10 text-blue-400"
                  )}>
                    {e.method}
                  </span>
                  <code className="text-xs text-muted-foreground font-mono flex-1">{e.path}</code>
                  <span className="text-xs text-muted-foreground">{e.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Features tab */}
        {activeTab === "features" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ENTERPRISE_FEATURES.map((f) => (
              <div key={f.title} className="bg-card border border-border rounded-xl p-5 space-y-3 hover:border-primary/30 transition-colors">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", f.bg)}>
                  <f.icon className={cn("w-5 h-5", f.color)} />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">{f.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{f.description}</p>
                </div>
                <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Disponible
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Subscription plans comparison */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            Comparaison des plans
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              {
                plan: "FREE",
                price: "0€",
                color: "border-border",
                badge: "",
                features: ["1 agent", "10 actions/jour", "Chat IA basique", "—", "—", "—"],
              },
              {
                plan: "PRO",
                price: "59€/mois",
                color: "border-primary/40",
                badge: "Populaire",
                features: ["10 agents", "500 actions/jour", "Autopilot", "AI Watch", "Revenue Engine", "Analytics"],
              },
              {
                plan: "BUSINESS",
                price: "199€/mois",
                color: "border-emerald-400/40",
                badge: "",
                features: ["50 agents", "2000 actions/jour", "Multi-agents", "Data Engine", "Revenue Engine", "Analytics avancées"],
              },
              {
                plan: "ENTERPRISE",
                price: "Sur mesure",
                color: "border-amber-400/40",
                badge: "Enterprise",
                features: ["Agents illimités", "Actions illimitées", "API complète", "White-label", "SSO/SAML", "Support dédié"],
              },
            ].map((p) => (
              <div key={p.plan} className={cn("bg-card border-2 rounded-xl p-5 space-y-4 relative", p.color)}>
                {p.badge && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground">
                      {p.badge}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{p.plan}</p>
                  <p className="text-xl font-bold text-foreground mt-1">{p.price}</p>
                </div>
                <ul className="space-y-2">
                  {p.features.map((f, i) => (
                    <li key={i} className={cn("flex items-center gap-2 text-xs", f === "—" ? "text-muted-foreground/40" : "text-muted-foreground")}>
                      <ChevronRight className={cn("w-3 h-3 flex-shrink-0", f === "—" ? "opacity-20" : "text-primary")} />
                      {f}
                    </li>
                  ))}
                </ul>
                {p.plan === "ENTERPRISE" ? (
                  <button className="w-full py-2 text-xs font-semibold rounded-lg bg-amber-400/10 text-amber-400 border border-amber-400/30 hover:bg-amber-400/20 transition-colors">
                    Contacter l'équipe
                  </button>
                ) : (
                  <button className="w-full py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                    Choisir {p.plan}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
