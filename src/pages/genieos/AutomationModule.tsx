import { Zap, Plus, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WORKFLOW_TEMPLATES = [
  {
    name: "Publication réseaux sociaux",
    trigger: "Nouveau contenu créé",
    steps: ["Générer le texte avec IA", "Redimensionner les visuels", "Publier sur LinkedIn + Twitter"],
    tools: "Make + Buffer",
    emoji: "📱",
  },
  {
    name: "Qualification de leads",
    trigger: "Nouveau formulaire soumis",
    steps: ["Enrichir les données (Clearbit)", "Scorer le lead avec IA", "Notifier le commercial", "Créer dans CRM"],
    tools: "n8n + HubSpot",
    emoji: "🎯",
  },
  {
    name: "Veille IA quotidienne",
    trigger: "Chaque matin à 7h",
    steps: ["Scraper les sources IA", "Résumer avec GPT", "Envoyer digest par email"],
    tools: "Zapier + OpenAI",
    emoji: "🔍",
  },
  {
    name: "Support client IA",
    trigger: "Nouveau ticket support",
    steps: ["Classifier la demande", "Chercher dans la KB", "Générer une réponse", "Assigner si escalade"],
    tools: "Make + Claude",
    emoji: "💬",
  },
];

export default function AutomationModule() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-400" /> Automation
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Workflows & automatisations intelligentes</p>
          </div>
          <Button className="bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 hover:bg-yellow-400/20">
            <Plus className="w-4 h-4 mr-2" /> Nouveau workflow
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Workflows actifs", value: "0", color: "text-yellow-400" },
            { label: "Exécutions ce mois", value: "0", color: "text-foreground" },
            { label: "Temps économisé", value: "0h", color: "text-emerald-400" },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-xl border border-border bg-card text-center">
              <p className={cn("text-2xl font-bold font-mono", s.color)}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Templates */}
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Templates de workflows
        </h2>
        <div className="space-y-3">
          {WORKFLOW_TEMPLATES.map(w => (
            <div key={w.name} className="rounded-xl border border-border bg-card overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === w.name ? null : w.name)}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/30 transition-colors"
              >
                <span className="text-2xl flex-shrink-0">{w.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm">{w.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Déclencheur : {w.trigger}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 flex-shrink-0">
                  {w.tools}
                </span>
                {expanded === w.name
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                }
              </button>
              {expanded === w.name && (
                <div className="px-4 pb-4 border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground mb-3 font-medium">Étapes du workflow :</p>
                  <div className="space-y-2">
                    {w.steps.map((step, i) => (
                      <div key={step} className="flex items-center gap-3">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-xs flex items-center justify-center font-mono font-bold">
                          {i + 1}
                        </span>
                        <span className="text-sm text-foreground">{step}</span>
                        {i < w.steps.length - 1 && (
                          <ArrowRight className="w-3 h-3 text-muted-foreground ml-auto" />
                        )}
                      </div>
                    ))}
                  </div>
                  <Button size="sm" className="mt-4 bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 hover:bg-yellow-400/20">
                    Utiliser ce template
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
