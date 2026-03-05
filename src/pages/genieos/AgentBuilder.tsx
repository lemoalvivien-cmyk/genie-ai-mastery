import { Bot, Plus, Play, Trash2, ChevronRight, Save, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useGenieOSMemory, GenieOSAgent } from "@/hooks/useGenieOSMemory";
import { toast } from "@/hooks/use-toast";

const AGENT_TEMPLATES = [
  { name: "Email Assistant", desc: "Répond aux emails automatiquement selon le contexte", objective: "Traiter et répondre aux emails entrants de manière personnalisée", emoji: "📧" },
  { name: "Content Creator", desc: "Génère des posts LinkedIn, Twitter et articles de blog", objective: "Produire du contenu marketing engageant et cohérent avec la marque", emoji: "✍️" },
  { name: "Data Analyst", desc: "Analyse et synthétise des données en insights", objective: "Transformer des données brutes en insights actionnables", emoji: "📊" },
  { name: "Customer Support", desc: "Support client 24/7 avec escalade intelligente", objective: "Résoudre les demandes clients rapidement et escalader si nécessaire", emoji: "💬" },
  { name: "Research Agent", desc: "Recherche et synthèse d'informations sur un sujet", objective: "Collecter, analyser et résumer des informations de qualité", emoji: "🔍" },
  { name: "Code Reviewer", desc: "Revue de code et suggestions d'amélioration", objective: "Améliorer la qualité du code en identifiant bugs et améliorations", emoji: "👨‍💻" },
];

interface AgentFormData {
  name: string;
  description: string;
  objective: string;
  system_prompt: string;
}

const EMPTY_FORM: AgentFormData = { name: "", description: "", objective: "", system_prompt: "" };

export default function AgentBuilder() {
  const location = useLocation();
  const { agents, saveAgent, deleteAgent, updateAgent, isLoading } = useGenieOSMemory();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AgentFormData>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);

  // Accept prefill from chat orchestrator
  useEffect(() => {
    const state = location.state as { prefill?: Record<string, string>; from_chat?: boolean } | null;
    if (state?.prefill) {
      setForm({
        name: state.prefill.prefill_name ?? "",
        description: "",
        objective: "",
        system_prompt: "",
      });
      setShowForm(true);
    }
  }, [location.state]);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setIsSaving(true);
    const saved = await saveAgent({
      name: form.name,
      description: form.description,
      objective: form.objective,
      system_prompt: form.system_prompt,
      tools: [],
    });
    setIsSaving(false);
    if (saved) {
      toast({ title: "Agent créé !", description: `"${saved.name}" est prêt.` });
      setForm(EMPTY_FORM);
      setShowForm(false);
    } else {
      toast({ title: "Erreur", description: "Impossible de créer l'agent. Connecte-toi d'abord.", variant: "destructive" });
    }
  };

  const handleToggleStatus = async (agent: GenieOSAgent) => {
    const newStatus = agent.status === "active" ? "draft" : "active";
    await updateAgent(agent.id, { status: newStatus });
  };

  const useTemplate = (tpl: typeof AGENT_TEMPLATES[0]) => {
    setForm({ name: tpl.name, description: tpl.desc, objective: tpl.objective, system_prompt: "" });
    setShowForm(true);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Bot className="w-6 h-6 text-emerald-400" /> Agent Builder
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {agents.length} agent{agents.length !== 1 ? "s" : ""} créé{agents.length !== 1 ? "s" : ""}
            </p>
          </div>
          {!showForm && (
            <Button
              onClick={() => { setForm(EMPTY_FORM); setShowForm(true); }}
              className="bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/20"
            >
              <Plus className="w-4 h-4 mr-2" /> Nouvel agent
            </Button>
          )}
        </div>

        {/* Create form */}
        {showForm && (
          <div className="mb-8 p-5 rounded-xl border border-primary/20 bg-primary/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground text-sm">Créer un agent IA</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <Input
                placeholder="Nom de l'agent *"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="bg-background border-border"
              />
              <Input
                placeholder="Description courte"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="bg-background border-border"
              />
              <Textarea
                placeholder="Objectif principal de l'agent…"
                value={form.objective}
                onChange={e => setForm(f => ({ ...f, objective: e.target.value }))}
                className="bg-background border-border resize-none"
                rows={2}
              />
              <Textarea
                placeholder="Prompt système (optionnel) — GENIE OS peut te le générer dans le Chat IA"
                value={form.system_prompt}
                onChange={e => setForm(f => ({ ...f, system_prompt: e.target.value }))}
                className="bg-background border-border resize-none font-mono text-xs"
                rows={4}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleCreate}
                  disabled={!form.name.trim() || isSaving}
                  className="gradient-primary text-white"
                  size="sm"
                >
                  {isSaving ? "Sauvegarde…" : <><Save className="w-3.5 h-3.5 mr-1.5" /> Créer l'agent</>}
                </Button>
                <Button variant="outline" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} size="sm">
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* My agents */}
        {agents.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Mes agents</h2>
            <div className="space-y-2">
              {agents.map(agent => (
                <div key={agent.id} className="rounded-xl border border-border bg-card overflow-hidden">
                  <div
                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/20 transition-colors"
                    onClick={() => setActiveAgent(activeAgent === agent.id ? null : agent.id)}
                  >
                    <span className="text-xl">🤖</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">{agent.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{agent.description || agent.objective}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">{agent.executions} exec</span>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full border",
                        agent.status === "active"
                          ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/20"
                          : "bg-muted/40 text-muted-foreground border-border"
                      )}>
                        {agent.status === "active" ? "Actif" : "Brouillon"}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); handleToggleStatus(agent); }}
                        className="p-1.5 text-muted-foreground hover:text-emerald-400 transition-colors"
                        title={agent.status === "active" ? "Désactiver" : "Activer"}
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); deleteAgent(agent.id); }}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {activeAgent === agent.id && agent.system_prompt && (
                    <div className="px-4 pb-4 border-t border-border pt-3">
                      <p className="text-xs text-muted-foreground mb-1 font-medium">Prompt système :</p>
                      <pre className="text-xs text-muted-foreground bg-background rounded-lg p-3 border border-border overflow-x-auto whitespace-pre-wrap font-mono">
                        {agent.system_prompt}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Templates */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Templates de départ
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {AGENT_TEMPLATES.map(t => (
              <button
                key={t.name}
                onClick={() => useTemplate(t)}
                className="group text-left p-4 rounded-xl border border-border bg-card hover:border-emerald-400/30 hover:bg-emerald-400/5 transition-all card-hover"
              >
                <span className="text-2xl mb-3 block">{t.emoji}</span>
                <p className="font-medium text-foreground text-sm mb-1">{t.name}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{t.desc}</p>
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
