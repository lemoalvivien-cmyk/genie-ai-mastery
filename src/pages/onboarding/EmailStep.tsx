import { useState } from "react";
import { ChevronLeft, Mail, ArrowRight, Loader2 } from "lucide-react";
import { useAnalytics } from "@/hooks/useAnalytics";

interface Props {
  onFinish: (email: string | null) => void;
  onBack: () => void;
  saving: boolean;
}

export function EmailStep({ onFinish, onBack, saving }: Props) {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const { track } = useAnalytics();

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (email.trim() && !isValid) return;
    if (email.trim() && isValid) track("email_captured", { source: "onboarding" });
    onFinish(email.trim() || null);
  };

  return (
    <div>
      {/* Icon */}
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary)/0.15), hsl(var(--accent)/0.1))",
          border: "1px solid hsl(var(--primary)/0.3)",
        }}
      >
        <Mail className="w-7 h-7" style={{ color: "hsl(var(--primary))" }} />
      </div>

      <h2 className="text-xl font-black text-center mb-1">Votre email pro</h2>
      <p className="text-sm text-muted-foreground text-center mb-7 max-w-sm mx-auto leading-relaxed">
        Pour sauvegarder votre progression et recevoir vos attestations de compétence.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setTouched(false); }}
              onBlur={() => setTouched(true)}
              placeholder="votre@email.pro"
              className="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
              style={{
                background: "hsl(var(--card))",
                border: `1px solid ${touched && email && !isValid ? "hsl(var(--destructive))" : "hsl(var(--border))"}`,
              }}
            />
          </div>
          {touched && email && !isValid && (
            <p className="text-xs text-destructive mt-1.5">Email invalide</p>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-black text-base transition-all active:scale-[0.98] disabled:opacity-60"
          style={{ background: "hsl(var(--accent))", boxShadow: "0 0 20px rgba(254,44,64,0.3)" }}
        >
          {saving
            ? <><Loader2 className="w-5 h-5 animate-spin" /> Sauvegarde...</>
            : <><ArrowRight className="w-5 h-5" /> Activer Formetoialia ✨</>
          }
        </button>

        <button
          type="button"
          onClick={() => onFinish(null)}
          disabled={saving}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          Passer cette étape →
        </button>
      </form>

      <button onClick={onBack} className="mt-5 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft className="w-4 h-4" /> Retour
      </button>
    </div>
  );
}
