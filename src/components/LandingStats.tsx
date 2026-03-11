import React, { useEffect, useState } from "react";
import { CheckCircle, FileText, Users, Zap } from "lucide-react";

interface PublicStats {
  users_trained: number;
  proofs_generated: number;
  quizzes_completed: number;
  generated_at: string;
}

const CACHE_KEY = "genie_public_stats";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function loadFromCache(): PublicStats | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as { data: PublicStats; ts: number };
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function saveToCache(data: PublicStats) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // quota exceeded — ignore
  }
}

function formatCount(n: number): string {
  if (n >= 1000) return `${Math.floor(n / 100) * 100}+`.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return String(n);
}

// Qualitative fallback stats shown when no real data yet
const QUALITATIVE_STATS = [
  {
    icon: CheckCircle,
    value: "Conforme AI Act 2026",
    label: "Régulation européenne",
    color: "text-green-500",
  },
  {
    icon: FileText,
    value: "Attestations vérifiables",
    label: "Preuves cryptographiques",
    color: "text-primary",
  },
  {
    icon: Zap,
    value: "IA souveraine",
    label: "Données hébergées en UE",
    color: "text-yellow-500",
  },
  {
    icon: Users,
    value: "3 min",
    label: "Pour démarrer",
    color: "text-cyan-500",
  },
];

export function LandingStats() {
  const [stats, setStats] = useState<PublicStats | null>(() => loadFromCache());
  const [loading, setLoading] = useState(!loadFromCache());

  useEffect(() => {
    if (stats) return; // cache hit — skip fetch
    const controller = new AbortController();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    fetch(`${supabaseUrl}/functions/v1/get-public-stats`, {
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PublicStats | null) => {
        if (data && typeof data.users_trained === "number") {
          setStats(data);
          saveToCache(data);
        }
      })
      .catch(() => {
        // silently fail — show qualitative fallback
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  // Show qualitative stats while loading or if all counts are 0
  const hasRealData =
    stats &&
    (stats.users_trained > 0 || stats.proofs_generated > 0 || stats.quizzes_completed > 0);

  if (loading) {
    // Skeleton while fetching
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl w-full">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="text-center animate-pulse">
            <div className="h-7 w-16 bg-muted/50 rounded mx-auto mb-1.5" />
            <div className="h-3 w-20 bg-muted/30 rounded mx-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (!hasRealData) {
    // Option B — qualitative arguments
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl w-full">
        {QUALITATIVE_STATS.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="text-center">
              <div className={`flex items-center justify-center gap-1 text-sm font-black ${s.color} mb-0.5`}>
                <Icon className="w-3.5 h-3.5" />
                {s.value}
              </div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          );
        })}
      </div>
    );
  }

  // Option A — real metrics
  const realStats = [
    {
      value: formatCount(stats!.users_trained),
      label: "Utilisateurs formés",
      show: stats!.users_trained > 0,
    },
    {
      value: formatCount(stats!.proofs_generated),
      label: "Preuves générées",
      show: stats!.proofs_generated > 0,
    },
    {
      value: formatCount(stats!.quizzes_completed),
      label: "Quiz complétés",
      show: stats!.quizzes_completed > 0,
    },
    {
      value: "3 min",
      label: "Pour démarrer",
      show: true,
    },
  ].filter((s) => s.show);

  // Ensure we always show at least 2 stats (pad with qualitative if needed)
  const displayStats =
    realStats.length >= 2
      ? realStats
      : [
          ...realStats,
          { value: "Conforme AI Act", label: "Régulation 2026", show: true },
          { value: "Attestations", label: "Vérifiables", show: true },
        ].slice(0, 4);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl w-full">
      {displayStats.map((s) => (
        <div key={s.label} className="text-center">
          <div className="text-2xl font-black text-foreground">{s.value}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
