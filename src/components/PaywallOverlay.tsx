import { Lock } from "lucide-react";
import { Link } from "react-router-dom";

interface PaywallOverlayProps {
  children: React.ReactNode;
  feature?: string;
  className?: string;
}

export function PaywallOverlay({ children, feature, className = "" }: PaywallOverlayProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Blurred content */}
      <div className="pointer-events-none select-none opacity-40 blur-[2px]">{children}</div>

      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl backdrop-blur-sm bg-background/60 z-10">
        <div className="flex flex-col items-center gap-2 text-center px-4">
          <Lock className="w-8 h-8 text-foreground" />
          <p className="text-sm font-bold text-foreground leading-tight">
            {feature ?? "Débloquez avec GENIE Pro"}
          </p>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-border bg-background text-foreground text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            Voir l'offre →
          </Link>
        </div>
      </div>
    </div>
  );
}
