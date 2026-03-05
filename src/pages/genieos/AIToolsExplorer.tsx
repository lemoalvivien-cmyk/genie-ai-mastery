import { Cpu, Search, ExternalLink, Star } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const AI_TOOLS = [
  { name: "ChatGPT", category: "Chatbot", desc: "Assistant IA conversationnel généraliste d'OpenAI.", stars: 5, url: "https://chat.openai.com", tags: ["Texte", "Code", "Analyse"] },
  { name: "Claude", category: "Chatbot", desc: "IA d'Anthropic, excellente pour les longs documents et le raisonnement.", stars: 5, url: "https://claude.ai", tags: ["Texte", "Analyse", "Documents"] },
  { name: "Gemini", category: "Chatbot", desc: "Modèle multimodal de Google, intégré à Google Workspace.", stars: 4, url: "https://gemini.google.com", tags: ["Multimodal", "Google"] },
  { name: "Make", category: "Automation", desc: "Plateforme d'automatisation no-code avec 1500+ intégrations.", stars: 5, url: "https://make.com", tags: ["Automation", "No-code"] },
  { name: "n8n", category: "Automation", desc: "Automation open-source, hébergeable soi-même.", stars: 4, url: "https://n8n.io", tags: ["Automation", "Open-source"] },
  { name: "Midjourney", category: "Image", desc: "Génération d'images artistiques de haute qualité.", stars: 5, url: "https://midjourney.com", tags: ["Image", "Créatif"] },
  { name: "Perplexity", category: "Recherche", desc: "Moteur de recherche alimenté par l'IA avec citations.", stars: 4, url: "https://perplexity.ai", tags: ["Recherche", "Citations"] },
  { name: "Notion AI", category: "Productivité", desc: "IA intégrée dans Notion pour rédiger, résumer, organiser.", stars: 4, url: "https://notion.so", tags: ["Productivité", "Notes"] },
  { name: "Cursor", category: "Code", desc: "IDE alimenté par IA pour coder plus vite.", stars: 5, url: "https://cursor.so", tags: ["Code", "IDE"] },
  { name: "ElevenLabs", category: "Voix", desc: "Synthèse vocale ultra-réaliste multilingue.", stars: 4, url: "https://elevenlabs.io", tags: ["Voix", "TTS"] },
  { name: "Dify", category: "Agent", desc: "Plateforme open-source pour construire des apps LLM.", stars: 4, url: "https://dify.ai", tags: ["Agent", "LLM"] },
  { name: "Zapier", category: "Automation", desc: "Automatisation accessible, 6000+ apps connectées.", stars: 4, url: "https://zapier.com", tags: ["Automation", "No-code"] },
];

const CATEGORIES = ["Tous", "Chatbot", "Automation", "Image", "Code", "Recherche", "Voix", "Agent", "Productivité"];

export default function AIToolsExplorer() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Tous");

  const filtered = AI_TOOLS.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.desc.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "Tous" || t.category === category;
    return matchSearch && matchCat;
  });

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Cpu className="w-6 h-6 text-purple-400" /> AI Tools Explorer
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{AI_TOOLS.length} outils IA recensés et comparés</p>
        </div>

        {/* Search + filters */}
        <div className="space-y-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un outil…"
              className="pl-9 bg-card border-border"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full border transition-all",
                  category === cat
                    ? "bg-primary/20 text-foreground border-primary/30"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-muted"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(tool => (
            <div
              key={tool.name}
              className="group p-4 rounded-xl border border-border bg-card hover:border-purple-400/30 hover:bg-purple-400/5 transition-all card-hover"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="font-semibold text-foreground text-sm">{tool.name}</span>
                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground border border-border">
                    {tool.category}
                  </span>
                </div>
                <a href={tool.url} target="_blank" rel="noopener noreferrer"
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">{tool.desc}</p>
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={cn("w-3 h-3", i < tool.stars ? "text-yellow-400 fill-yellow-400" : "text-border")} />
                  ))}
                </div>
                <div className="flex gap-1 flex-wrap justify-end">
                  {tool.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Aucun outil trouvé pour "{search}"
          </div>
        )}
      </div>
    </div>
  );
}
