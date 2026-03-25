/**
 * LevelStep v2 — wording action-first, pas classement scolaire
 */
import { ChevronLeft, Sprout, TrendingUp, Zap } from "lucide-react";
import { useState } from "react";

const levels = [
  {
    id: "debutant",
    icon: Sprout,
    title: "Je débute",
    description: "Guidez-moi pas à pas, sans jargon",
    badge: "Idéal pour commencer",
    color: "from-emerald-500/20 to-green-500/20",
    border: "border-emerald-500/30",
  },
  {
    id: "intermediaire",
    icon: TrendingUp,
    title: "Je me débrouille",
    description: "Je connais les bases, je veux aller plus loin",
    badge: "Le plus choisi",
    color: "from-blue-500/20 to-indigo-500/20",
    border: "border-blue-500/30",
  },
  {
    id: "avance",
    icon: Zap,
    title: "Je veux aller plus vite",
    description: "Donnez-moi des raccourcis et du concret",
    badge: "Efficacité maximale",
    color: "from-amber-500/20 to-orange-500/20",
    border: "border-amber-500/30",
  },
];

interface Props {
  onSelect: (level: string) => void;
  onBack: () => void;
}

export function LevelStep({ onSelect, onBack }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div>
      <h2 className="text-xl font-black text-center mb-1">Quel est votre niveau avec l'IA ?</h2>
      <p className="text-sm text-muted-foreground text-center mb-6">On adapte le contenu à votre rythme.</p>

      <div className="flex flex-col gap-2.5" role="group" aria-label="Sélection du niveau">
        {levels.map((l) => {
          const Icon = l.icon;
          const isSel = selected === l.id;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                setSelected(l.id);
                setTimeout(() => onSelect(l.id), 180);
              }}
              aria-pressed={isSel}
              className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200 hover:scale-[1.01] focus-ring ${
                isSel
                  ? "border-primary bg-primary/10 shadow-glow"
                  : `${l.border} bg-gradient-to-r ${l.color} hover:border-primary/50`
              }`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all ${isSel ? "gradient-primary shadow-glow" : "bg-background/60"}`}>
                <Icon className={`w-6 h-6 ${isSel ? "text-primary-foreground" : "text-foreground"}`} aria-hidden="true" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm">{l.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${isSel ? "bg-primary/20 border-primary/40 text-primary" : "bg-muted border-border text-muted-foreground"}`}>
                    {l.badge}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{l.description}</p>
              </div>
              {isSel && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <button onClick={onBack} className="mt-5 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft className="w-4 h-4" /> Retour
      </button>
    </div>
  );
}
