import { BarChart2, TrendingUp, Target, AlertTriangle, CheckCircle } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FRAMEWORKS = [
  { label: "Taille du marché", icon: TrendingUp, color: "text-primary", desc: "Marché cible et potentiel de croissance" },
  { label: "Proposition de valeur", icon: Target, color: "text-emerald-400", desc: "Ce qui te différencie de la concurrence" },
  { label: "Risques", icon: AlertTriangle, color: "text-yellow-400", desc: "Obstacles et risques à anticiper" },
  { label: "Validation", icon: CheckCircle, color: "text-blue-400", desc: "Étapes pour valider l'idée rapidement" },
];

export default function BusinessAnalysis() {
  const [idea, setIdea] = useState("");
  const [analyzed, setAnalyzed] = useState(false);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-pink-400" /> Business Analysis
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Analyse tes opportunités business IA</p>
        </div>

        {/* Input */}
        <div className="p-5 rounded-xl border border-border bg-card mb-8">
          <label className="text-sm font-medium text-foreground block mb-3">Décris ton idée business :</label>
          <div className="flex gap-2">
            <Input
              value={idea}
              onChange={e => setIdea(e.target.value)}
              placeholder="Ex: Une newsletter payante sur l'IA pour les dirigeants…"
              className="bg-background border-border flex-1"
              onKeyDown={e => e.key === "Enter" && idea.trim() && setAnalyzed(true)}
            />
            <Button
              onClick={() => idea.trim() && setAnalyzed(true)}
              className="bg-pink-400/10 text-pink-400 border border-pink-400/20 hover:bg-pink-400/20 flex-shrink-0"
            >
              Analyser
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {[
              "Newsletter IA hebdomadaire",
              "Agence d'automatisation IA",
              "Formation en ligne IA",
              "SaaS génération de contenu",
            ].map(ex => (
              <button
                key={ex}
                onClick={() => { setIdea(ex); setAnalyzed(false); }}
                className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-pink-400/30 transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Framework */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Cadre d'analyse
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FRAMEWORKS.map(({ label, icon: Icon, color, desc }) => (
              <div key={label} className="p-4 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={cn("w-4 h-4", color)} />
                  <span className="font-medium text-foreground text-sm">{label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{desc}</p>
                {analyzed && (
                  <div className="mt-3 p-2 rounded-lg bg-muted/30 border border-border">
                    <p className="text-xs text-muted-foreground italic">
                      Utilise le Chat IA en mode Business pour une analyse complète de "{idea}" sur ce point.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {analyzed && (
            <div className="mt-6 p-4 rounded-xl border border-pink-400/20 bg-pink-400/5 text-center">
              <p className="text-sm text-foreground mb-3">
                🚀 Pour une analyse approfondie de <strong>"{idea}"</strong>, démarre une conversation avec GENIE OS
              </p>
              <Button
                className="bg-pink-400/10 text-pink-400 border border-pink-400/20 hover:bg-pink-400/20"
                onClick={() => window.location.href = "/os"}
              >
                Analyser dans le Chat IA →
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
