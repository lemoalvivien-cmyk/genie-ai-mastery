import { useState } from "react";
import { Baby, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface ELI10ButtonProps {
  text: string;            // the text to simplify
  className?: string;
  onResult?: (simplified: string) => void;
}

export function ELI10Button({ text, className = "", onResult }: ELI10ButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleClick = async () => {
    if (!text?.trim() || loading) return;
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("chat-completion", {
        body: {
          messages: [
            {
              role: "user",
              content: `Explique-moi le texte suivant comme si j'avais 10 ans. Utilise des mots simples, des exemples concrets de la vie quotidienne, et rassure-moi si c'est un sujet qui peut faire peur. Maximum 3 phrases courtes. Texte à simplifier : "${text.slice(0, 500)}"`,
            },
          ],
          user_profile: { mode: "enfant", level: 1 },
          request_type: "eli10",
        },
      });

      if (error) throw error;
      const simplified = data?.content ?? "Je n'ai pas pu simplifier ce texte. Essaie de me poser une question directement !";
      setResult(simplified);
      onResult?.(simplified);
    } catch {
      toast({ title: "Oups !", description: "Je n'ai pas pu simplifier. Réessaie.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`inline-flex flex-col gap-2 ${className}`}>
      <button
        onClick={handleClick}
        disabled={loading || !text?.trim()}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        title="Explique-moi comme si j'avais 10 ans"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Baby className="w-3.5 h-3.5" />
        )}
        {loading ? "Simplification…" : "Explique comme j'ai 10 ans"}
      </button>

      {result && (
        <div className="relative p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-sm text-foreground leading-relaxed animate-in fade-in slide-in-from-top-1">
          <span className="text-lg mr-2">🧸</span>
          {result}
          <button
            onClick={() => setResult(null)}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
            aria-label="Fermer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
