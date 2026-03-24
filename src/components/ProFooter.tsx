import React from "react";
import { Mail, Lock, Globe, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import logoFormetoialia from "@/assets/logo-formetoialia.png";
import { LegalFooterLinks } from "@/components/legal/LegalFooterLinks";

export const ProFooter = React.forwardRef<HTMLElement>(
  function ProFooter(_props, ref) {
  return (
    <footer ref={ref} className="border-t border-border/30 bg-background/80 backdrop-blur-sm pt-14 pb-8 px-4 sm:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Col 1 — Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img src={logoGenie} alt="Formetoialia" className="h-7 w-auto" />
              <span className="text-base font-black tracking-tight" style={{ fontFamily: "'Orbitron', monospace", fontSize: "0.9rem" }}>
                <span style={{ color: "hsl(var(--primary))" }}>formetoi</span><span style={{ color: "hsl(var(--accent))" }}>alia</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              La formation qui apprend plus vite que vous. IA, cybersécurité, vibe coding — en solo ou en équipe.
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3" /> RGPD natif
              </span>
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3" /> Hébergement UE
              </span>
            </div>
            {/* Swiss Precision badge */}
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
              style={{
                background: "hsl(var(--primary) / 0.08)",
                border: "1px solid hsl(var(--primary) / 0.2)",
                color: "hsl(var(--primary))",
              }}
            >
              <Sparkles className="w-2.5 h-2.5" />
              Swiss Precision Engineered
            </div>
          </div>

          {/* Col 2 — Produit */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-4">Produit</p>
            <ul className="space-y-2.5">
              {[
                { to: "/pricing", label: "Tarifs" },
                { to: "/app/modules", label: "Modules" },
                { to: "/app/chat", label: "Copilote Genie" },
                { to: "/app/today", label: "Missions quotidiennes" },
                { to: "/guides", label: "Guides gratuits" },
                { to: "/app/cyberpath", label: "CyberPath 48h" },
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
                  href="mailto:contact@formetoialia.com"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5" />
                  contact@formetoialia.com
                </a>
              </li>
              <li>
                <a
                  href="https://linkedin.com/company/formetoialia"
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
            © {new Date().getFullYear()} Formetoialia. Tous droits réservés.
          </p>
          <LegalFooterLinks />
        </div>
      </div>
    </footer>
  );
});
ProFooter.displayName = "ProFooter";
