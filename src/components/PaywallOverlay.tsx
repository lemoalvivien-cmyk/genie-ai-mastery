import { useState, useEffect } from "react";
import { Lock, Zap, ArrowRight, Check, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useAnalytics } from "@/hooks/useAnalytics";

const ARGS = [
  "Tous les modules illimités",
  "KITT IA sans restriction",
  "Attestation de compétences",
];

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
  const [iconHovered, setIconHovered] = useState(false);
  const { track } = useAnalytics();

  // Fire paywall_shown once on mount
  useEffect(() => { track("paywall_shown", { feature: feature ?? "unknown", compact }); }, []);

  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <div className="pointer-events-none select-none opacity-30 blur-[3px]">{children}</div>
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 rounded-xl">
          <div className="absolute inset-0 rounded-xl backdrop-blur-sm" style={{ background: "linear-gradient(to bottom, rgba(19,21,30,0.8), rgba(19,21,30,0.95))" }} />
          <div className="relative z-10 flex flex-col items-center text-center gap-2 px-3 py-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--accent))", boxShadow: "0 0 12px rgba(254,44,64,0.4)" }}>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <p className="text-xs font-bold text-foreground">{feature ?? "Fonctionnalité Pro"}</p>
          <Link
              to="/pricing"
              onClick={() => track("paywall_clicked", { feature: feature ?? "unknown", compact: true })}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all"
              style={{ background: "hsl(var(--accent))", boxShadow: "0 0 8px rgba(254,44,64,0.3)" }}
            >
              Pro <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Blurred content */}
      <div className="pointer-events-none select-none opacity-25 blur-[4px]">{children}</div>

      {/* Full overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 rounded-2xl">
        <div
          className="absolute inset-0 rounded-2xl backdrop-blur-lg"
          style={{ background: "linear-gradient(to bottom, rgba(19,21,30,0.82), rgba(19,21,30,0.97))" }}
        />

        <div className="relative z-10 flex flex-col items-center text-center gap-4 px-6 py-8 w-full max-w-xs">
          {/* Icon — lock → zap on hover */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-300"
            style={{
              background: iconHovered ? "hsl(var(--accent))" : "hsl(var(--primary)/0.15)",
              border: `1px solid ${iconHovered ? "rgba(254,44,64,0.6)" : "rgba(82,87,216,0.3)"}`,
              boxShadow: iconHovered ? "0 0 20px rgba(254,44,64,0.4)" : "0 0 15px rgba(82,87,216,0.2)",
              transform: iconHovered ? "scale(1.1) rotate(-5deg)" : "scale(1)",
            }}
            onMouseEnter={() => setIconHovered(true)}
            onMouseLeave={() => setIconHovered(false)}
          >
            {iconHovered
              ? <Zap className="w-7 h-7 text-white" />
              : <Lock className="w-7 h-7" style={{ color: "hsl(var(--primary))" }} />
            }
          </div>

          {/* Title */}
          <div>
            <p className="text-lg font-black text-foreground leading-tight">
              {feature ?? "Débloquez cette fonctionnalité"}
            </p>
            <p className="text-sm text-muted-foreground mt-1.5">
              {description ?? "Accès immédiat avec GENIE Pro — 14 jours gratuits"}
            </p>
          </div>

          {/* Arguments */}
          <ul className="space-y-1.5 w-full text-left">
            {ARGS.map((arg) => (
              <li key={arg} className="flex items-center gap-2 text-sm text-foreground">
                <Check className="w-4 h-4 shrink-0" style={{ color: "#22C55E" }} />
                {arg}
              </li>
            ))}
          </ul>

          {/* CTA */}
          <Link
            to="/pricing"
            onClick={() => track("paywall_clicked", { feature: feature ?? "unknown", compact: false })}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-black text-sm transition-all active:scale-[0.98]"
            style={{ background: "hsl(var(--accent))", boxShadow: "0 0 20px rgba(254,44,64,0.35)" }}
          >
            Essai gratuit 14 jours <ArrowRight className="w-4 h-4" />
          </Link>

          {/* Social proof */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <span>Rejoignez les premiers utilisateurs GENIE IA</span>
          </div>

          {/* Legal */}
          <p className="text-xs" style={{ color: "hsl(229 14% 35%)" }}>
            Sans engagement • Résiliation en 2 clics
          </p>
        </div>
      </div>
    </div>
  );
}
