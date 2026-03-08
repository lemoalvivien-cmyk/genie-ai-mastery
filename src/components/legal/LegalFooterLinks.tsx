import React, { useState } from "react";
import { Link } from "react-router-dom";
import { CookieBanner } from "@/components/legal/CookieBanner";

const LEGAL_LINKS = [
  { to: "/legal/cgu", label: "CGU" },
  { to: "/legal/mentions-legales", label: "Mentions légales" },
  { to: "/legal/confidentialite", label: "Confidentialité" },
  { to: "/legal/cookies", label: "Cookies" },
  { to: "/legal/rgpd", label: "Exercer mes droits" },
  { to: "/legal/subprocessors", label: "Sous-traitants" },
  { to: "/legal/dpa", label: "DPA" },
];

interface LegalFooterLinksProps {
  className?: string;
}

export const LegalFooterLinks = React.forwardRef<HTMLElement, LegalFooterLinksProps>(
  function LegalFooterLinks({ className = "" }, _ref) {
    const [showCookiePanel, setShowCookiePanel] = useState(false);

    return (
      <>
        <nav
          aria-label="Liens légaux"
          className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground ${className}`}
        >
          {LEGAL_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={() => setShowCookiePanel(true)}
            className="hover:text-foreground transition-colors underline underline-offset-2 cursor-pointer"
          >
            Gérer mes cookies
          </button>
        </nav>

        {showCookiePanel && (
          <CookieBanner forcePanel onClose={() => setShowCookiePanel(false)} />
        )}
      </>
    );
  }
);
LegalFooterLinks.displayName = "LegalFooterLinks";

export default LegalFooterLinks;
