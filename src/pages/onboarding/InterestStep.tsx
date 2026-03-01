import { useState } from "react";
import { ChevronLeft, Bot, User, Shield, Loader2 } from "lucide-react";

const interests = [
  {
    id: "ia_pro",
    icon: Bot,
    title: "IA Générative (usage pro)",
    description: "ChatGPT, Claude, automatisations, productivité",
    color: "from-indigo-500/20 to-purple-500/20",
    border: "border-indigo-500/30",
  },
  {
    id: "ia_perso",
    icon: User,
    title: "IA Générative (usage perso)",
    description: "Créativité, apprentissage, vie quotidienne",
    color: "from-pink-500/20 to-rose-500/20",
    border: "border-pink-500/30",
  },
  {
    id: "cyber",
    icon: Shield,
    title: "Cybersécurité",
    description: "Protéger vos données, reconnaître les menaces",
    color: "from-emerald-500/20 to-teal-500/20",
    border: "border-emerald-500/30",
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
      <h2 className="text-xl font-bold text-center mb-2">Qu'est-ce qui vous intéresse ?</h2>
      <p className="text-sm text-muted-foreground text-center mb-6">
        Sélectionnez un ou plusieurs domaines. Vous pourrez changer plus tard.
      </p>

      <div className="flex flex-col gap-3" role="group" aria-label="Sélection des centres d'intérêt">
        {interests.map((item) => {
          const Icon = item.icon;
          const isSelected = selected.has(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => toggle(item.id)}
              aria-pressed={isSelected}
              className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-300 hover:scale-[1.01] focus-ring ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-glow"
                  : `${item.border} bg-gradient-to-r ${item.color} hover:border-primary/50`
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? "gradient-primary shadow-glow" : "bg-background/60"}`}>
                <Icon className={`w-6 h-6 ${isSelected ? "text-primary-foreground" : "text-foreground"}`} aria-hidden="true" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">{item.title}</div>
                <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>
              </div>
              {/* Toggle visual */}
              <div className={`w-10 h-6 rounded-full border-2 flex items-center transition-all duration-300 px-0.5 flex-shrink-0 ${isSelected ? "border-primary bg-primary justify-end" : "border-border bg-muted justify-start"}`}>
                <div className="w-4 h-4 rounded-full bg-background/90 shadow-sm" />
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
        >
          <ChevronLeft className="w-4 h-4" /> Retour
        </button>
        <button
          type="button"
          onClick={() => onFinish(Array.from(selected))}
          disabled={saving || selected.size === 0}
          className="flex-1 py-2.5 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Sauvegarde...</>
          ) : (
            "Lancer mon Génie IA ✨"
          )}
        </button>
      </div>
      {selected.size === 0 && (
        <p className="text-xs text-muted-foreground text-center mt-2">Sélectionnez au moins un domaine</p>
      )}
    </div>
  );
}
