/**
 * EmergencyMode — 3 accès ultra-rapides sans prompt
 *
 * L'utilisateur choisit un cas, remplit 1-2 champs, l'IA construit le prompt
 * en arrière-plan et ouvre le chat avec le résultat.
 *
 * Principe : zéro page blanche, zéro jargon, résultat en < 30s.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, FileSearch, Presentation, ChevronRight, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/hooks/useAnalytics";

// ── Types ────────────────────────────────────────────────────────────────────
type CaseId = "mail" | "document" | "presentation";

interface EmergencyCase {
  id: CaseId;
  icon: React.ElementType;
  label: string;
  sublabel: string;
  color: string;
  bg: string;
  border: string;
  fields: Field[];
  buildPrompt: (values: Record<string, string>) => string;
}

interface Field {
  key: string;
  placeholder: string;
  multiline?: boolean;
  optional?: boolean;
}

// ── Config des cas ────────────────────────────────────────────────────────────
const CASES: EmergencyCase[] = [
  {
    id: "mail",
    icon: Mail,
    label: "Un mail difficile à rédiger",
    sublabel: "Refus, relance, demande délicate...",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    fields: [
      { key: "situation", placeholder: "Décrivez la situation en une phrase (ex : refuser poliment une tâche hors périmètre à mon manager)" },
      { key: "tone", placeholder: "Ton souhaité : professionnel, ferme, conciliant... (optionnel)", optional: true },
    ],
    buildPrompt: (v) =>
      `Rédige-moi un email ${v.tone ? `avec un ton ${v.tone}` : "professionnel"} pour la situation suivante : "${v.situation}". 
Donne-moi 2 versions : une directe, une plus diplomatique. 
Garde chaque version en moins de 150 mots. Commence directement par les emails, sans introduction.`,
  },
  {
    id: "document",
    icon: FileSearch,
    label: "Analyser un document",
    sublabel: "Contrat, rapport, email reçu...",
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/30",
    fields: [
      { key: "content", placeholder: "Collez ici le texte du document, ou décrivez ce que vous voulez analyser", multiline: true },
      { key: "question", placeholder: "Que voulez-vous savoir ? (ex : y a-t-il des clauses dangereuses ?)", optional: true },
    ],
    buildPrompt: (v) =>
      `Analyse ce document et ${v.question ? `réponds à cette question : "${v.question}".` : "résume les points clés."}

Document :
"""
${v.content}
"""

Structure ta réponse en : 1) Points essentiels 2) Points d'attention 3) Ce que je dois faire maintenant.`,
  },
  {
    id: "presentation",
    icon: Presentation,
    label: "Préparer une présentation",
    sublabel: "Réunion, pitch, rapport...",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    fields: [
      { key: "subject", placeholder: "Quel est le sujet ? (ex : présenter les résultats Q3 à mon équipe)" },
      { key: "audience", placeholder: "Pour qui ? (ex : mon équipe de 5 personnes, mon directeur...)", optional: true },
      { key: "duration", placeholder: "Durée ? (ex : 10 minutes, 1 slide, 30 min...)", optional: true },
    ],
    buildPrompt: (v) =>
      `Crée un plan de présentation complet pour : "${v.subject}".
${v.audience ? `Audience : ${v.audience}.` : ""}
${v.duration ? `Durée : ${v.duration}.` : ""}

Pour chaque section, donne-moi : le titre, le message clé en 1 phrase, et 2-3 points à couvrir.
Termine par une slide de conclusion avec l'action attendue de l'audience.`,
  },
];

// ── Composant principal ───────────────────────────────────────────────────────
interface EmergencyModeProps {
  onClose?: () => void;
  compact?: boolean; // mode intégré dans une page vs modal
}

export function EmergencyMode({ onClose, compact = false }: EmergencyModeProps) {
  const navigate = useNavigate();
  const { track } = useAnalytics();
  const [activeCase, setActiveCase] = useState<EmergencyCase | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSelectCase = (c: EmergencyCase) => {
    setActiveCase(c);
    setValues({});
    track("emergency_mode_used", { case_id: c.id });
  };

  const handleSubmit = () => {
    if (!activeCase) return;
    // Validate required fields
    const missing = activeCase.fields.filter(f => !f.optional && !values[f.key]?.trim());
    if (missing.length > 0) return;

    setLoading(true);
    const prompt = activeCase.buildPrompt(values);
    const encoded = encodeURIComponent(prompt);
    // Small delay for perceived "processing" feel
    setTimeout(() => {
      navigate(`/app/chat?q=${encoded}`);
    }, 600);
  };

  const canSubmit = activeCase
    ? activeCase.fields.filter(f => !f.optional).every(f => values[f.key]?.trim())
    : false;

  // ── Sélection du cas ─────────────────────────────────────────────────────
  if (!activeCase) {
    return (
      <div className={compact ? "space-y-3" : "space-y-4"}>
        {!compact && (
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-base font-black text-foreground">Mode urgence</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Résultat en moins de 30 secondes. Aucun prompt à écrire.</p>
            </div>
            {onClose && (
              <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        <div className={`grid gap-2.5 ${compact ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1"}`}>
          {CASES.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.id}
                onClick={() => handleSelectCase(c)}
                className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all duration-200 hover:scale-[1.01] group ${c.bg} ${c.border} hover:brightness-110`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${c.bg} border ${c.border}`}>
                  <Icon className={`w-4.5 h-4.5 ${c.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">{c.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.sublabel}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Formulaire ────────────────────────────────────────────────────────────
  const Icon = activeCase.icon;
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setActiveCase(null)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
        >
          ←
        </button>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeCase.bg} border ${activeCase.border}`}>
          <Icon className={`w-4 h-4 ${activeCase.color}`} />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground leading-tight">{activeCase.label}</p>
          <p className="text-xs text-muted-foreground">Remplissez et c'est parti</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-auto w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-3">
        {activeCase.fields.map((field) => (
          <div key={field.key}>
            {field.optional && (
              <p className="text-xs text-muted-foreground mb-1">Optionnel</p>
            )}
            {field.multiline ? (
              <textarea
                value={values[field.key] ?? ""}
                onChange={(e) => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                rows={4}
                className="w-full px-3.5 py-3 rounded-xl text-sm placeholder:text-muted-foreground/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all resize-none"
                style={{ background: "hsl(var(--secondary)/0.5)", border: "1px solid hsl(var(--border))" }}
              />
            ) : (
              <input
                type="text"
                value={values[field.key] ?? ""}
                onChange={(e) => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="w-full px-3.5 py-3 rounded-xl text-sm placeholder:text-muted-foreground/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
                style={{ background: "hsl(var(--secondary)/0.5)", border: "1px solid hsl(var(--border))" }}
                onKeyDown={(e) => e.key === "Enter" && canSubmit && handleSubmit()}
              />
            )}
          </div>
        ))}
      </div>

      <Button
        className="w-full h-12 font-black gradient-primary shadow-glow gap-2"
        disabled={!canSubmit || loading}
        onClick={handleSubmit}
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" />Construction en cours…</>
        ) : (
          <>Obtenir le résultat maintenant <ChevronRight className="w-4 h-4" /></>
        )}
      </Button>
    </div>
  );
}
