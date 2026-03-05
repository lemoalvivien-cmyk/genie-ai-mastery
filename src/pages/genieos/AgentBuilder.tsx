import { Bot, Plus, Play, Save, Trash2, ChevronRight, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const AGENT_TEMPLATES = [
  { name: "Email Assistant", desc: "Répond aux emails automatiquement", emoji: "📧" },
  { name: "Content Creator", desc: "Génère des posts et articles", emoji: "✍️" },
  { name: "Data Analyst", desc: "Analyse et synthétise des données", emoji: "📊" },
  { name: "Customer Support", desc: "Support client 24/7", emoji: "💬" },
  { name: "Research Agent", desc: "Recherche et synthèse d'informations", emoji: "🔍" },
  { name: "Code Reviewer", desc: "Revue et suggestions de code", emoji: "👨‍💻" },
];

export default function AgentBuilder() {
  const [agents, setAgents] = useState([
    { id: "1", name: "Mon Premier Agent", desc: "Agent email assistant", status: "draft", emoji: "📧" },
  ]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const createAgent = () => {
    if (!newName.trim()) return;
    setAgents(prev => [...prev, {
      id: Date.now().toString(),
      name: newName,
      desc: newDesc || "Agent personnalisé",
      status: "draft",
      emoji: "🤖",
    }]);
    setNewName("");
    setNewDesc("");
    setCreating(false);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Bot className="w-6 h-6 text-emerald-400" /> Agent Builder
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Crée et gère tes agents IA autonomes</p>
          </div>
          <Button onClick={() => setCreating(true)} className="gradient-primary text-white shadow-glow-sm">
            <Plus className="w-4 h-4 mr-2" /> Nouvel agent
          </Button>
        </div>

        {creating && (
          <div className="mb-6 p-5 rounded-xl border border-primary/20 bg-primary/5">
            <h3 className="font-semibold text-foreground mb-4 text-sm">Créer un nouvel agent</h3>
            <div className="space-y-3">
              <Input
                placeholder="Nom de l'agent (ex: Email Assistant)"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="bg-background border-border"
              />
              <Textarea
                placeholder="Description et objectif de l'agent…"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                className="bg-background border-border resize-none"
                rows={3}
              />
              <div className="flex gap-2">
                <Button onClick={createAgent} className="gradient-primary text-white" size="sm">
                  <Save className="w-3.5 h-3.5 mr-1.5" /> Créer
                </Button>
                <Button variant="outline" onClick={() => setCreating(false)} size="sm">Annuler</Button>
              </div>
            </div>
          </div>
        )}

        {/* My agents */}
        {agents.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Mes agents</h2>
            <div className="space-y-2">
              {agents.map(agent => (
                <div key={agent.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/20 transition-all">
                  <span className="text-2xl">{agent.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm">{agent.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{agent.desc}</p>
                  </div>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full border",
                    agent.status === "draft"
                      ? "bg-muted/50 text-muted-foreground border-border"
                      : "bg-emerald-400/10 text-emerald-400 border-emerald-400/20"
                  )}>
                    {agent.status === "draft" ? "Brouillon" : "Actif"}
                  </span>
                  <button className="p-1.5 text-muted-foreground hover:text-emerald-400 transition-colors">
                    <Play className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Templates */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Templates de départ</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {AGENT_TEMPLATES.map(t => (
              <button
                key={t.name}
                onClick={() => { setNewName(t.name); setNewDesc(t.desc); setCreating(true); }}
                className="group text-left p-4 rounded-xl border border-border bg-card hover:border-emerald-400/30 hover:bg-emerald-400/5 transition-all card-hover"
              >
                <span className="text-2xl mb-3 block">{t.emoji}</span>
                <p className="font-medium text-foreground text-sm mb-1">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
                <div className="flex items-center gap-1 mt-3 text-xs text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Utiliser ce template <ChevronRight className="w-3 h-3" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
