import React from "react";
import { Mail, Lock, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import logoGenie from "@/assets/logo-genie.png";
import { LegalFooterLinks } from "@/components/legal/LegalFooterLinks";

export const ProFooter = React.forwardRef<HTMLElement>(
  function ProFooter(_props, ref) {
  return (
    <footer className="border-t border-border/30 bg-background/80 backdrop-blur-sm pt-14 pb-8 px-4 sm:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Col 1 — Brand */}
          <div className="space-y-4">
            <img src={logoGenie} alt="GENIE IA" className="h-8 w-auto" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Apprendre, agir, prouver — le système guidé pour maîtriser l'IA en équipe ou en solo.
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3" /> RGPD natif
              </span>
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3" /> Hébergement UE
              </span>
            </div>
          </div>

          {/* Col 2 — Produit */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-4">Produit</p>
            <ul className="space-y-2.5">
              {[
                { to: "/pricing", label: "Tarifs" },
                { to: "/app/modules", label: "Modules" },
                { to: "/app/chat", label: "Copilote KITT" },
                { to: "/app/today", label: "Missions quotidiennes" },
                { to: "/guides", label: "Guides gratuits" },
              ].map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 — Légal */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-4">Légal</p>
            <ul className="space-y-2.5">
              {[
                { to: "/legal/mentions-legales", label: "Mentions légales" },
                { to: "/legal/confidentialite", label: "Confidentialité" },
                { to: "/legal/cookies", label: "Cookies" },
                { to: "/legal/rgpd", label: "Exercer mes droits" },
                { to: "/legal/subprocessors", label: "Sous-traitants" },
                { to: "/legal/dpa", label: "DPA Entreprises" },
              ].map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4 — Contact */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-4">Contact</p>
            <ul className="space-y-2.5">
              <li>
                <a
                  href="mailto:contact@genie-ia.app"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5" />
                  contact@genie-ia.app
                </a>
              </li>
              <li>
                <a
                  href="https://linkedin.com/company/genie-ia"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  LinkedIn
                </a>
              </li>
              <li>
                <Link
                  to="/partner"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Devenir partenaire
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/30 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} GENIE IA. Tous droits réservés.
          </p>
          <LegalFooterLinks />
        </div>
      </div>
    </footer>
  );
}
