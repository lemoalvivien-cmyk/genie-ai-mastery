import { Lock, Zap, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface PaywallOverlayProps {
  children: React.ReactNode;
  feature?: string;
  description?: string;
  className?: string;
  compact?: boolean;
}

export function PaywallOverlay({
  children,
  feature,
  description,
  className = "",
  compact = false,
}: PaywallOverlayProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Blurred content */}
      <div className="pointer-events-none select-none opacity-30 blur-[3px]">{children}</div>

      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 rounded-xl">
        {/* Gradient backdrop */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-background/80 via-background/90 to-background/95 backdrop-blur-sm" />

        <div className={`relative z-10 flex flex-col items-center text-center gap-3 ${compact ? "px-3 py-2" : "px-6 py-4"}`}>
          {/* Icon */}
          <div className={`rounded-full gradient-primary flex items-center justify-center shadow-glow ${compact ? "w-8 h-8" : "w-12 h-12"}`}>
            {compact ? (
              <Lock className="w-4 h-4 text-primary-foreground" />
            ) : (
              <Zap className="w-5 h-5 text-primary-foreground" />
            )}
          </div>

          {/* Title */}
          <div>
            <p className={`font-bold text-foreground leading-tight ${compact ? "text-xs" : "text-sm"}`}>
              {feature ?? "Fonctionnalité Pro"}
            </p>
            {!compact && description && (
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px] leading-snug">{description}</p>
            )}
            {!compact && !description && (
              <p className="text-xs text-muted-foreground mt-1">Réservé aux abonnés GENIE Pro</p>
            )}
          </div>

          {/* CTA */}
          <Link
            to="/pricing"
            className={`inline-flex items-center gap-1.5 rounded-lg gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-90 transition-all ${compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-xs"}`}
          >
            {compact ? "Pro" : "Essai 14j gratuit"}
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
