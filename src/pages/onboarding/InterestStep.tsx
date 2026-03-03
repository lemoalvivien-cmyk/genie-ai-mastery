import { useState } from "react";
import { ChevronLeft, Zap, BookOpen, Award, Users2, Loader2 } from "lucide-react";

const objectives = [
  {
    id: "productivity",
    icon: Zap,
    title: "Productivité",
    description: "Gagner du temps avec l'IA au quotidien",
    color: "from-amber-500/20 to-orange-500/20",
    border: "border-amber-500/30",
  },
  {
    id: "skills",
    icon: BookOpen,
    title: "Compétences",
    description: "Maîtriser l'IA, la cybersécurité, le vibe coding",
    color: "from-blue-500/20 to-indigo-500/20",
    border: "border-blue-500/30",
  },
  {
    id: "certification",
    icon: Award,
    title: "Certification",
    description: "Obtenir une attestation vérifiable",
    color: "from-emerald-500/20 to-teal-500/20",
    border: "border-emerald-500/30",
  },
  {
    id: "team",
    icon: Users2,
    title: "Équipe",
    description: "Former mes collaborateurs ou mon équipe",
    color: "from-purple-500/20 to-violet-500/20",
    border: "border-purple-500/30",
  },
];

interface Props {
  onFinish: (interests: string[]) => void;
  onBack: () => void;
  saving: boolean;
}

export function InterestStep({ onFinish, onBack, saving }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div>
      <h2 className="text-xl font-black text-center mb-1">Votre objectif ?</h2>
      <p className="text-sm text-muted-foreground text-center mb-6">
        Plusieurs choix possibles. On adapte tout pour vous.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="group" aria-label="Sélection de l'objectif">
        {objectives.map((item) => {
          const Icon = item.icon;
          const isSelected = selected.has(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => toggle(item.id)}
              aria-pressed={isSelected}
              className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-300 hover:scale-[1.02] focus-ring ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-glow"
                  : `${item.border} bg-gradient-to-br ${item.color} hover:border-primary/50`
              }`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? "gradient-primary shadow-glow" : "bg-background/60"}`}>
                <Icon className={`w-5 h-5 ${isSelected ? "text-primary-foreground" : "text-foreground"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{item.title}</div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{item.description}</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? "border-primary bg-primary" : "border-border"}`}>
                {isSelected && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground transition-all"
        >
          <ChevronLeft className="w-4 h-4" /> Retour
        </button>
        <button
          type="button"
          onClick={() => onFinish(Array.from(selected))}
          disabled={saving || selected.size === 0}
          className="flex-1 py-2.5 rounded-xl gradient-primary text-primary-foreground font-bold shadow-glow hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Sauvegarde...</> : "Continuer →"}
        </button>
      </div>
      {selected.size === 0 && (
        <p className="text-xs text-muted-foreground text-center mt-2">Sélectionnez au moins un objectif</p>
      )}
    </div>
  );
}
