import { useState, useEffect } from "react";
import { Flame, Trophy, ShieldAlert, Zap, FileText, CheckCircle2, AlertCircle, Loader2, ChevronRight, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useStreak } from "@/hooks/useStreak";
import { Link } from "react-router-dom";

interface CockpitTab {
  id: string;
  label: string;
  icon: React.ElementType;
  emoji: string;
}

const TABS: CockpitTab[] = [
  { id: "today", label: "Aujourd'hui", icon: Zap, emoji: "⚡" },
  { id: "skills", label: "Compétences", icon: Star, emoji: "🧠" },
  { id: "risks", label: "Risques", icon: ShieldAlert, emoji: "🛡️" },
  { id: "actions", label: "Actions", icon: CheckCircle2, emoji: "✅" },
  { id: "proofs", label: "Preuves", icon: FileText, emoji: "📜" },
];

interface ProgressData {
  total: number;
  completed: number;
  inProgress: number;
  domains: Record<string, { completed: number; total: number }>;
}

interface Artifact {
  id: string;
  type: string;
  title: string;
  signed_url: string | null;
  created_at: string;
}

export default function CockpitPanel() {
  const { profile } = useAuth();
  const { streak, todayLog } = useStreak();
  const [activeTab, setActiveTab] = useState("today");
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [progressRes, artifactsRes] = await Promise.all([
        supabase.from("progress").select("status, module_id"),
        supabase.from("artifacts").select("id, type, title, signed_url, created_at").order("created_at", { ascending: false }).limit(5),
      ]);

      if (progressRes.data) {
        const rows = progressRes.data;
        const completed = rows.filter(r => r.status === "completed").length;
        const inProgress = rows.filter(r => r.status === "in_progress").length;
        setProgress({ total: rows.length, completed, inProgress, domains: {} });
      }
      if (artifactsRes.data) setArtifacts(artifactsRes.data as Artifact[]);
    } finally {
      setLoading(false);
    }
  };

  const currentStreak = streak?.current_streak ?? 0;
  const missionDone = !!todayLog;

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex gap-1 p-2 border-b border-border/40 overflow-x-auto shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "bg-primary/15 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <span>{tab.emoji}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {activeTab === "today" && <TodayTab streak={currentStreak} missionDone={missionDone} progress={progress} />}
            {activeTab === "skills" && <SkillsTab progress={progress} />}
            {activeTab === "risks" && <RisksTab completedModules={progress?.completed ?? 0} />}
            {activeTab === "actions" && <ActionsTab persona={profile?.persona ?? null} completed={progress?.completed ?? 0} />}
            {activeTab === "proofs" && <ProofsTab artifacts={artifacts} />}
          </>
        )}
      </div>
    </div>
  );
}

// ─── TODAY TAB ────────────────────────────────────────────────────────────────
function TodayTab({ streak, missionDone, progress }: {
  streak: number;
  missionDone: boolean;
  progress: ProgressData | null;
}) {
  return (
    <div className="space-y-4">
      {/* Streak */}
      <div className="p-4 rounded-2xl border border-orange-500/30 bg-orange-500/10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-orange-400">{streak}</span>
              <span className="text-sm text-muted-foreground">jours d'affilée 🔥</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {streak === 0 ? "Commence ta série aujourd'hui !" : streak < 7 ? "Continue, tu es lancé !" : "Impressionnant, ne lâche pas !"}
            </p>
          </div>
        </div>
      </div>

      {/* Mission du jour */}
      <div className={`p-4 rounded-2xl border ${missionDone ? "border-emerald-500/30 bg-emerald-500/10" : "border-primary/30 bg-primary/10"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {missionDone
              ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              : <Zap className="w-5 h-5 text-primary" />
            }
            <span className="text-sm font-semibold">Mission du jour</span>
          </div>
          {!missionDone && (
            <Link to="/app/today" className="flex items-center gap-1 text-xs text-primary hover:underline">
              Faire <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {missionDone ? "✅ Terminée ! Reviens demain pour continuer." : "🎯 Une micro-mission de 3 min t'attend."}
        </p>
      </div>

      {/* Progression */}
      {progress && (
        <div className="p-4 rounded-2xl border border-border/40 bg-card/60">
          <h3 className="text-sm font-semibold mb-3">Ta progression</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Terminés", value: progress.completed, color: "text-emerald-400" },
              { label: "En cours", value: progress.inProgress, color: "text-amber-400" },
              { label: "Total", value: progress.total, color: "text-primary" },
            ].map(stat => (
              <div key={stat.label} className="text-center p-3 rounded-xl bg-muted/30">
                <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
          {progress.total > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Complétion globale</span>
                <span>{Math.round((progress.completed / Math.max(progress.total, 1)) * 100)}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-700"
                  style={{ width: `${(progress.completed / Math.max(progress.total, 1)) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SKILLS TAB ───────────────────────────────────────────────────────────────
function SkillsTab({ progress }: { progress: ProgressData | null }) {
  const domains = [
    { key: "ia_pro", label: "IA Pro", emoji: "🤖", color: "from-indigo-500 to-purple-500", score: 0 },
    { key: "ia_perso", label: "IA Perso", emoji: "💡", color: "from-pink-500 to-rose-500", score: 0 },
    { key: "cyber", label: "Cybersécurité", emoji: "🛡️", color: "from-emerald-500 to-teal-500", score: 0 },
    { key: "vibe_coding", label: "Vibe Coding", emoji: "⚡", color: "from-amber-500 to-orange-500", score: 0 },
  ];

  const completed = progress?.completed ?? 0;
  const levelLabel = completed === 0 ? "Débutant" : completed < 5 ? "Curieux" : completed < 10 ? "Praticien" : "Expert";
  const levelEmoji = completed === 0 ? "🌱" : completed < 5 ? "🌿" : completed < 10 ? "🌳" : "🏆";

  return (
    <div className="space-y-4">
      {/* Level card */}
      <div className="p-4 rounded-2xl border border-primary/30 bg-primary/10 text-center">
        <div className="text-4xl mb-2">{levelEmoji}</div>
        <div className="text-lg font-bold">{levelLabel}</div>
        <div className="text-xs text-muted-foreground">{completed} module{completed > 1 ? "s" : ""} complété{completed > 1 ? "s" : ""}</div>
      </div>

      {/* Domain bars */}
      <div className="space-y-3">
        {domains.map(domain => (
          <div key={domain.key} className="p-3 rounded-xl border border-border/40 bg-card/60">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span>{domain.emoji}</span>
                <span className="text-sm font-medium">{domain.label}</span>
              </div>
              <span className="text-xs text-muted-foreground">Commencer →</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full bg-gradient-to-r ${domain.color} transition-all duration-700`} style={{ width: "5%" }} />
            </div>
          </div>
        ))}
      </div>

      <Link to="/app/modules" className="block w-full text-center py-3 rounded-xl border border-primary/40 text-sm text-primary hover:bg-primary/10 transition-colors">
        Voir tous les modules →
      </Link>
    </div>
  );
}

// ─── RISKS TAB ────────────────────────────────────────────────────────────────
function RisksTab({ completedModules }: { completedModules: number }) {
  const risks = [
    {
      level: completedModules < 1 ? "high" : "medium",
      label: "Phishing",
      desc: completedModules < 1 ? "Risque élevé : aucune formation anti-phishing" : "Module cyber recommandé pour renforcer",
      action: "Faire le module Détection Phishing",
      link: "/app/modules?domain=cyber",
    },
    {
      level: completedModules < 2 ? "high" : "low",
      label: "Mots de passe",
      desc: completedModules < 2 ? "Risque : gestion des mots de passe non optimisée" : "Bonne pratique en place",
      action: "Voir le module Gestionnaire MDP",
      link: "/app/modules?domain=cyber",
    },
    {
      level: "medium" as const,
      label: "IA non sécurisée",
      desc: "Données partagées avec des outils IA non vérifiés",
      action: "Module : Utiliser l'IA en sécurité",
      link: "/app/modules?domain=ia_pro",
    },
  ];

  const riskColors: Record<string, string> = {
    high: "border-destructive/40 bg-destructive/10 text-destructive",
    medium: "border-amber-500/40 bg-amber-500/10 text-amber-400",
    low: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  };

  const riskLabels: Record<string, string> = { high: "🔴 Élevé", medium: "🟡 Moyen", low: "🟢 Faible" };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Basé sur tes modules complétés et ton profil.</p>
      {risks.map((risk, i) => (
        <div key={i} className={`p-4 rounded-xl border ${riskColors[risk.level]}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold">{risk.label}</span>
            <span className="text-xs font-medium">{riskLabels[risk.level]}</span>
          </div>
          <p className="text-xs opacity-80 mb-3">{risk.desc}</p>
          <Link to={risk.link} className="flex items-center gap-1 text-xs font-medium hover:underline">
            <ChevronRight className="w-3 h-3" />
            {risk.action}
          </Link>
        </div>
      ))}
    </div>
  );
}

// ─── ACTIONS TAB ─────────────────────────────────────────────────────────────
function ActionsTab({ persona, completed }: { persona: string | null; completed: number }) {
  const personaActions: Record<string, string[]> = {
    dirigeant: [
      "📋 Créer une charte IA pour ton organisation",
      "🛡️ Auditer la sécurité de tes systèmes",
      "🤖 Former tes équipes à l'IA Pro",
    ],
    salarie: [
      "⏱️ Tester l'IA pour ta productivité quotidienne",
      "🔐 Sécuriser tes mots de passe avec Bitwarden",
      "📧 Identifier 1 phishing dans ta boîte mail",
    ],
    jeune: [
      "⚡ Essayer Lovable pour créer une app",
      "🎮 Faire le module Vibe Coding Intro",
      "📱 Auditer les permissions de ton téléphone",
    ],
    parent: [
      "💡 Apprendre à utiliser l'IA pour la famille",
      "🛡️ Sécuriser les appareils des enfants",
      "📸 Paramétrer la confidentialité des réseaux sociaux",
    ],
    senior: [
      "🔒 Créer un gestionnaire de mots de passe",
      "📞 Reconnaître les arnaques par téléphone",
      "💡 Utiliser l'IA pour organiser son quotidien",
    ],
    independant: [
      "🤖 Automatiser ses tâches répétitives avec l'IA",
      "🛡️ Sécuriser son activité en télétravail",
      "⚡ Créer ses premiers prompts professionnels",
    ],
  };

  const actions = persona && personaActions[persona]
    ? personaActions[persona]
    : ["🎯 Commencer par un module de ton choix", "🛡️ Sécuriser ton environnement numérique", "🤖 Explorer l'IA pour ta productivité"];

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Actions prioritaires pour ton profil.</p>
      {actions.map((action, i) => (
        <div key={i} className={`p-4 rounded-xl border transition-all ${i === 0 ? "border-primary/40 bg-primary/10" : "border-border/40 bg-card/60"}`}>
          <div className="flex items-start gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {i + 1}
            </div>
            <p className="text-sm leading-relaxed">{action}</p>
          </div>
        </div>
      ))}

      <Link to="/app/modules" className="flex items-center justify-center gap-2 py-3 rounded-xl border border-border/40 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
        <ChevronRight className="w-4 h-4" />
        Voir tous les modules
      </Link>
    </div>
  );
}

// ─── PROOFS TAB ───────────────────────────────────────────────────────────────
function ProofsTab({ artifacts }: { artifacts: Artifact[] }) {
  const typeEmoji: Record<string, string> = {
    checklist: "✅",
    sop: "🔐",
    charte: "📜",
    memo_vibe: "⚡",
    attestation: "🏆",
  };

  if (artifacts.length === 0) {
    return (
      <div className="text-center py-8 space-y-3">
        <div className="text-4xl">📜</div>
        <p className="text-sm text-muted-foreground">Aucune preuve générée pour l'instant.</p>
        <p className="text-xs text-muted-foreground">Génère des documents depuis le Cockpit IA pour les retrouver ici.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Tes documents et attestations générés.</p>
      {artifacts.map(artifact => (
        <div key={artifact.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card/60 hover:bg-card/80 transition-colors">
          <span className="text-xl shrink-0">{typeEmoji[artifact.type] ?? "📄"}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{artifact.title}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(artifact.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" })}
            </p>
          </div>
          {artifact.signed_url && (
            <a href={artifact.signed_url} target="_blank" rel="noopener noreferrer" className="shrink-0 p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
              <FileText className="w-4 h-4 text-muted-foreground" />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
