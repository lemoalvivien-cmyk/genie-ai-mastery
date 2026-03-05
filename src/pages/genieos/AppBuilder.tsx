import { Code2, Layers, Database, Globe, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const APP_EXAMPLES = [
  "Un SaaS de génération de contenu IA",
  "Un chatbot pour e-commerce",
  "Un CRM intelligent avec IA",
  "Un outil d'analyse de CV",
  "Un assistant de veille concurrentielle",
];

const STACKS = [
  { label: "Frontend", icon: Globe, color: "text-blue-400", items: ["React + TypeScript", "Tailwind CSS", "Shadcn UI"] },
  { label: "Backend", icon: Layers, color: "text-purple-400", items: ["Supabase Edge Functions", "REST API", "WebSockets"] },
  { label: "Base de données", icon: Database, color: "text-emerald-400", items: ["PostgreSQL (Supabase)", "Redis (cache)", "Vector DB"] },
  { label: "IA", icon: Code2, color: "text-primary", items: ["OpenAI / Gemini", "LangChain", "Embeddings"] },
];

export default function AppBuilder() {
  const [idea, setIdea] = useState("");
  const [generated, setGenerated] = useState(false);

  const handleGenerate = () => {
    if (!idea.trim()) return;
    setGenerated(true);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Code2 className="w-6 h-6 text-blue-400" /> App Builder
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Génère l'architecture complète de ton app IA</p>
        </div>

        {/* Input */}
        <div className="p-5 rounded-xl border border-border bg-card mb-8">
          <label className="text-sm font-medium text-foreground block mb-3">Décris ton idée d'application :</label>
          <div className="flex gap-2">
            <Input
              value={idea}
              onChange={e => setIdea(e.target.value)}
              placeholder="Ex: Un SaaS pour générer des présentations avec l'IA…"
              className="bg-background border-border flex-1"
              onKeyDown={e => e.key === "Enter" && handleGenerate()}
            />
            <Button
              onClick={handleGenerate}
              className="bg-blue-400/10 text-blue-400 border border-blue-400/20 hover:bg-blue-400/20 flex-shrink-0"
            >
              Générer
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {APP_EXAMPLES.map(ex => (
              <button
                key={ex}
                onClick={() => { setIdea(ex); setGenerated(false); }}
                className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-blue-400/30 transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Stack overview — always visible */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            {generated ? `Architecture suggérée pour "${idea}"` : "Stack technique recommandée"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {STACKS.map(({ label, icon: Icon, color, items }) => (
              <div key={label} className="p-4 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-2 mb-3">
                  <Icon className={cn("w-4 h-4", color)} />
                  <span className="font-medium text-foreground text-sm">{label}</span>
                </div>
                <ul className="space-y-1.5">
                  {items.map(item => (
                    <li key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ChevronRight className="w-3 h-3 text-border flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {generated && (
            <div className="mt-4 p-4 rounded-xl border border-blue-400/20 bg-blue-400/5">
              <p className="text-xs text-muted-foreground mb-2 font-medium">💡 Conseil GENIE OS :</p>
              <p className="text-sm text-foreground">
                Pour <em>"{idea}"</em>, commence par le Chat IA et décris ton projet en détail — GENIE OS te fournira
                une architecture complète avec le schéma de base de données, les composants React et les Edge Functions.
              </p>
              <Button
                size="sm"
                className="mt-3 bg-blue-400/10 text-blue-400 border border-blue-400/20 hover:bg-blue-400/20"
                onClick={() => window.location.href = "/os"}
              >
                Continuer dans le Chat →
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
