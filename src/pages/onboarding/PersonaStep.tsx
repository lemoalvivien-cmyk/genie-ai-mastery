import { useState } from "react";
import { Backpack, Heart, Briefcase, Building2, HeartHandshake, Rocket } from "lucide-react";

const personas = [
  {
    id: "jeune",
    icon: Backpack,
    title: "Jeune",
    age: "12 – 18 ans",
    description: "J'apprends et je me protège",
    color: "from-blue-500/20 to-indigo-500/20",
    border: "border-blue-500/30",
  },
  {
    id: "parent",
    icon: HeartHandshake,
    title: "Parent",
    age: "Famille",
    description: "Je protège ma famille",
    color: "from-pink-500/20 to-rose-500/20",
    border: "border-pink-500/30",
  },
  {
    id: "salarie",
    icon: Briefcase,
    title: "Salarié",
    age: "En entreprise",
    description: "Mon entreprise me forme",
    color: "from-amber-500/20 to-orange-500/20",
    border: "border-amber-500/30",
  },
  {
    id: "dirigeant",
    icon: Building2,
    title: "Dirigeant / RH",
    age: "Management",
    description: "Je forme mon équipe",
    color: "from-purple-500/20 to-violet-500/20",
    border: "border-purple-500/30",
  },
  {
    id: "senior",
    icon: Heart,
    title: "Senior",
    age: "À mon rythme",
    description: "J'apprends à mon rythme",
    color: "from-emerald-500/20 to-green-500/20",
    border: "border-emerald-500/30",
  },
  {
    id: "independant",
    icon: Rocket,
    title: "Indépendant",
    age: "Freelance / Auto",
    description: "Je me débrouille seul",
    color: "from-cyan-500/20 to-teal-500/20",
    border: "border-cyan-500/30",
  },
];

interface Props {
  onSelect: (persona: string) => void;
  /** Masquer l'option "Dirigeant / RH" pour les collaborateurs B2B invités */
  isInvited?: boolean;
}

export function PersonaStep({ onSelect, isInvited = false }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  // Les collaborateurs invités ne peuvent pas créer d'organisation
  const visiblePersonas = isInvited
    ? personas.filter((p) => p.id !== "dirigeant")
    : personas;

  return (
    <div>
      <h2 className="text-xl font-bold text-center mb-2">Qui êtes-vous ?</h2>
      <p className="text-sm text-muted-foreground text-center mb-6">
        Formetoialia adapte votre parcours à votre situation réelle.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" role="group" aria-label="Sélection du persona">
        {visiblePersonas.map((p) => {
          const Icon = p.icon;
          const isSelected = selected === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSelected(p.id);
                setTimeout(() => onSelect(p.id), 200);
              }}
              aria-pressed={isSelected}
              className={`relative flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-300 text-center group hover:scale-[1.03] focus-ring ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-glow scale-[1.03]"
                  : `${p.border} bg-gradient-to-br ${p.color} hover:border-primary/50`
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                  </svg>
                </div>
              )}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${isSelected ? "gradient-primary shadow-glow" : "bg-background/60 group-hover:bg-primary/10"}`}>
                <Icon className={`w-6 h-6 ${isSelected ? "text-primary-foreground" : "text-foreground"}`} aria-hidden="true" />
              </div>
              <div>
                <div className="font-semibold text-sm">{p.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{p.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
