import { useState } from "react";
import { Key, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/components/ui/use-toast";

interface Props {
  onSuccess?: () => void;
  compact?: boolean;
}

export default function AccessCodeActivator({ onSuccess, compact = false }: Props) {
  const { user, fetchProfile } = useAuthStore();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const formatCode = (val: string) => {
    // Auto-format: GENIE-XXXX-XXXX
    const raw = val.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (raw.startsWith("GENIE")) {
      const body = raw.slice(5);
      if (body.length <= 4) return `GENIE-${body}`;
      return `GENIE-${body.slice(0, 4)}-${body.slice(4, 8)}`;
    }
    return raw.slice(0, 14);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || loading || !user) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("redeem-code", {
        body: { code: code.trim() },
      });

      if (error || data?.error) {
        toast({
          title: "Code invalide",
          description: data?.error ?? "Vérifiez votre code et réessayez.",
          variant: "destructive",
        });
        return;
      }

      setSuccess(true);
      await fetchProfile(user.id);
      toast({
        title: "🎉 Accès activé !",
        description: data.message,
      });
      onSuccess?.();
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={`flex items-center gap-2 text-sm text-green-500 ${compact ? "" : "p-4 rounded-xl bg-green-500/10 border border-green-500/20"}`}>
        <CheckCircle className="w-4 h-4 shrink-0" />
        <span>Accès Business activé !</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? "flex gap-2" : "space-y-3"}>
      {!compact && (
        <div className="flex items-center gap-2 mb-1">
          <Key className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Vous avez un code d'accès ?</span>
        </div>
      )}
      <div className={compact ? "flex gap-2 flex-1" : "flex gap-2"}>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(formatCode(e.target.value))}
          placeholder="GENIE-XXXX-XXXX"
          maxLength={14}
          className="flex-1 px-3 py-2 rounded-xl bg-secondary/60 border border-border text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
          disabled={loading}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="submit"
          disabled={loading || code.length < 14}
          className="px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold shadow-glow hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Activer"}
        </button>
      </div>
    </form>
  );
}
