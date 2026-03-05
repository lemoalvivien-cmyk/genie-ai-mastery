import { Store, Lock, Sparkles } from "lucide-react";

export default function Marketplace() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 rounded-2xl bg-orange-400/10 border border-orange-400/20 flex items-center justify-center mx-auto mb-6">
          <Store className="w-8 h-8 text-orange-400" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-3">Marketplace</h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-6">
          Le marketplace communautaire arrive bientôt. Tu pourras partager et découvrir des agents IA, prompts et workflows créés par la communauté.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-orange-400/20 bg-orange-400/5 text-orange-400 text-sm">
          <Lock className="w-3.5 h-3.5" />
          Bientôt disponible
        </div>
      </div>
    </div>
  );
}
