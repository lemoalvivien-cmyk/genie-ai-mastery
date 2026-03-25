/**
 * PersonaStep v2 — orienté besoin immédiat, pas identité
 * 5 options centrées sur ce que l'utilisateur veut FAIRE maintenant
 */
import { useState } from "react";
import { Clock, PenLine, FileSearch, LayoutTemplate, Users2 } from "lucide-react";

const needs = [
  {
    id: "time",
    icon: Clock,
    title: "Gagner du temps",
    description: "Automatiser des tâches répétitives avec l'IA",
    persona: "salarie",
    color: "from-amber-500/20 to-orange-500/20",
    border: "border-amber-500/30",
  },
  {
    id: "write",
    icon: PenLine,
    title: "Mieux écrire",
    description: "Emails, rapports, messages professionnels",
    persona: "independant",
    color: "from-blue-500/20 to-indigo-500/20",
    border: "border-blue-500/30",
  },
  {
    id: "understand",
    icon: FileSearch,
    title: "Comprendre un document",
    description: "Analyser, résumer, extraire l'essentiel",
    persona: "salarie",
    color: "from-emerald-500/20 to-teal-500/20",
    border: "border-emerald-500/30",
  },
  {
    id: "present",
    icon: LayoutTemplate,
    title: "Structurer une présentation",
    description: "Plans, slides, argumentaires convaincants",
    persona: "independant",
    color: "from-violet-500/20 to-purple-500/20",
    border: "border-violet-500/30",
  },
  {
    id: "team",
    icon: Users2,
    title: "Aider mon équipe",
    description: "Déployer l'IA à l'échelle de mon organisation",
    persona: "dirigeant",
    color: "from-rose-500/20 to-pink-500/20",
    border: "border-rose-500/30",
  },
];

interface Props {
  onSelect: (persona: string, needId: string) => void;
  isInvited?: boolean;
}

export function PersonaStep({ onSelect, isInvited = false }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const visible = isInvited ? needs.filter(n => n.id !== "team") : needs;

  return (
    <div>
      <h2 className="text-xl font-black text-center mb-1">
        Quel est votre besoin principal aujourd'hui ?
      </h2>
      <p className="text-sm text-muted-foreground text-center mb-6">
        On construit votre première action autour de ça.
      </p>
      <div className="flex flex-col gap-2.5" role="group" aria-label="Sélection du besoin">
        {visible.map((n) => {
          const Icon = n.icon;
          const isSel = selected === n.id;
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => {
                setSelected(n.id);
                setTimeout(() => onSelect(n.persona, n.id), 180);
              }}
              aria-pressed={isSel}
              className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200 hover:scale-[1.01] focus-ring ${
                isSel
                  ? "border-primary bg-primary/10 shadow-glow"
                  : `${n.border} bg-gradient-to-r ${n.color} hover:border-primary/50`
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${isSel ? "gradient-primary shadow-glow" : "bg-background/60"}`}>
                <Icon className={`w-5 h-5 ${isSel ? "text-primary-foreground" : "text-foreground"}`} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-foreground">{n.title}</div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{n.description}</p>
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
    </div>
  );
}
