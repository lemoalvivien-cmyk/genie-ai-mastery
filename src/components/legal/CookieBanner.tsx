import React, { useState } from "react";
import { Link } from "react-router-dom";
import { X, Shield, ChevronDown } from "lucide-react";
import { useCookieConsent } from "@/hooks/useCookieConsent";

interface CookieBannerProps {
  /** If true, show the preferences panel directly (from "Gérer mes cookies") */
  forcePanel?: boolean;
  onClose?: () => void;
}

/**
 * forwardRef is required: React 18 Suspense can pass internal refs to
 * fallback elements rendered inside a <Suspense> boundary. Without it,
 * React emits a "Function components cannot be given refs" warning.
 */
const CookieBanner = React.forwardRef<HTMLDivElement, CookieBannerProps>(
  function CookieBanner({ forcePanel = false, onClose }, _ref) {
    const { bannerOpen, closeBanner, acceptAll, rejectAll, saveConsent, consent } = useCookieConsent();
    const [showPanel, setShowPanel] = useState(forcePanel);
    const [prefs, setPrefs] = useState({
      preferences: consent?.preferences ?? false,
      analytics: consent?.analytics ?? false,
      marketing: consent?.marketing ?? false,
    });

    const visible = forcePanel || bannerOpen;
    if (!visible) return null;

    const handleSave = () => {
      saveConsent(prefs);
      onClose?.();
    };

    const handleAcceptAll = () => {
      acceptAll();
      onClose?.();
    };

    const handleRejectAll = () => {
      rejectAll();
      onClose?.();
    };

    const handleClose = () => {
      closeBanner();
      onClose?.();
    };

    return (
      <div
        role="dialog"
        aria-label="Gestion des cookies"
        aria-modal="true"
        className="fixed inset-0 z-[9999] flex items-end sm:items-end justify-center pointer-events-none"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-background/60 backdrop-blur-sm pointer-events-auto"
          onClick={handleClose}
        />

        <div className="relative pointer-events-auto w-full max-w-2xl mx-auto mb-0 sm:mb-6 bg-card border border-border/60 rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 z-10">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary shrink-0" />
              <h2 className="text-base font-bold text-foreground">Nous respectons ta vie privée</h2>
            </div>
            <button
              onClick={handleClose}
              aria-label="Fermer"
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted/50 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {!showPanel ? (
            <>
              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                GENIE IA utilise des cookies nécessaires au fonctionnement du site. Avec ton accord, nous
                utilisons aussi des cookies optionnels pour mesurer l'audience et améliorer l'expérience.{" "}
                <Link to="/legal/cookies" className="text-primary hover:underline">
                  En savoir plus
                </Link>
              </p>

              {/* 3 buttons — same visual level (CNIL compliant) */}
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleAcceptAll}
                  className="flex-1 py-3 px-4 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all shadow-glow min-h-[44px]"
                >
                  Tout accepter
                </button>
                <button
                  onClick={handleRejectAll}
                  className="flex-1 py-3 px-4 rounded-xl border border-border bg-muted hover:bg-muted/80 text-foreground font-semibold text-sm transition-all min-h-[44px]"
                >
                  Tout refuser
                </button>
                <button
                  onClick={() => setShowPanel(true)}
                  className="flex-1 py-3 px-4 rounded-xl border border-primary/40 text-primary font-semibold text-sm hover:bg-primary/10 transition-all flex items-center justify-center gap-1.5 min-h-[44px]"
                >
                  Personnaliser <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Choisissez les catégories de cookies que vous acceptez.
              </p>

              <div className="space-y-3 mb-5">
                {/* Necessary — always on */}
                <CookieToggleRow
                  label="Nécessaires"
                  description="Authentification, sécurité, session. Toujours actifs — ne peuvent pas être désactivés."
                  checked={true}
                  disabled={true}
                  onChange={() => {}}
                />
                <CookieToggleRow
                  label="Préférences"
                  description="Langue, affichage, accessibilité."
                  checked={prefs.preferences}
                  onChange={(v) => setPrefs((p) => ({ ...p, preferences: v }))}
                />
                <CookieToggleRow
                  label="Audience"
                  description="Analyse de navigation, statistiques anonymisées pour améliorer le produit."
                  checked={prefs.analytics}
                  onChange={(v) => setPrefs((p) => ({ ...p, analytics: v }))}
                />
                <CookieToggleRow
                  label="Marketing"
                  description="Publicité ciblée et reciblage (si activé à l'avenir)."
                  checked={prefs.marketing}
                  onChange={(v) => setPrefs((p) => ({ ...p, marketing: v }))}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 px-4 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all shadow-glow min-h-[44px]"
                >
                  Enregistrer mes choix
                </button>
                <button
                  onClick={() => setShowPanel(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-border bg-muted hover:bg-muted/80 text-foreground font-medium text-sm transition-all min-h-[44px]"
                >
                  Retour
                </button>
              </div>

              <p className="mt-3 text-xs text-muted-foreground text-center">
                <Link to="/legal/cookies" className="text-primary hover:underline">
                  Politique cookies complète
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    );
  }
);

CookieBanner.displayName = "CookieBanner";

function CookieToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-xl border ${
        disabled ? "border-border/40 bg-muted/30 opacity-70" : "border-border bg-muted/20"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold text-foreground">{label}</span>
          {disabled && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
              Toujours actif
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={`${label} ${checked ? "activé" : "désactivé"}`}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative shrink-0 mt-0.5 w-10 h-5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
          checked ? "bg-primary" : "bg-muted-foreground/30"
        } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export { CookieBanner };
export default CookieBanner;
