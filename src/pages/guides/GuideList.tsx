import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Brain, Shield, Code2, ArrowRight, Clock } from "lucide-react";
import { GUIDES, type Guide } from "@/data/guides";
import logoGenie from "@/assets/logo-genie.png";
import { organizationSchema } from "@/lib/seo";

const DOMAIN_META: Record<Guide["domain"], { label: string; Icon: React.ElementType; color: string }> = {
  ia:    { label: "IA & Automatisation", Icon: Brain,  color: "text-primary" },
  cyber: { label: "Cybersécurité",       Icon: Shield, color: "text-accent" },
  vibe:  { label: "Vibe Coding",         Icon: Code2,  color: "text-emerald-400" },
};

export default function GuideList() {
  return (
    <>
      <Helmet>
        <title>Guides IA, Cybersécurité & Vibe Coding | Formetoialia</title>
        <meta name="description" content="Guides ultra-vulgarisés sur l'IA générative, la cybersécurité et le Vibe Coding. Gratuits, sans jargon, par Formetoialia." />
        <link rel="canonical" href="https://formetoialia.com/guides" />
        <script type="application/ld+json">{JSON.stringify(organizationSchema())}</script>
      </Helmet>

      <div className="min-h-screen gradient-hero">
        <header className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-8 py-4 border-b border-border/30 bg-background/80 backdrop-blur-md">
          <Link to="/">
            <img src={logoGenie} alt="GENIE IA" className="h-10 w-auto" loading="lazy" />
          </Link>
          <Link to="/pricing" className="px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-sm font-bold shadow-glow hover:brightness-110 transition-all">
            Essai 24h — 59€/mois
          </Link>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center mb-14">
            <h1 className="text-3xl sm:text-4xl font-black text-foreground mb-4">
              Guides <span className="text-gradient">gratuits</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              IA, Cybersécurité, Vibe Coding — expliqués simplement. Sans jargon.
            </p>
          </div>

          <div className="grid gap-4">
            {GUIDES.map((guide) => {
              const meta = DOMAIN_META[guide.domain];
              return (
                <Link
                  key={guide.slug}
                  to={`/guides/${guide.slug}`}
                  className="group flex items-start gap-4 p-5 rounded-2xl border border-border/60 bg-card/40 hover:bg-card hover:border-primary/40 transition-all"
                >
                  <div className="mt-0.5 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <meta.Icon className={`w-5 h-5 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />{guide.readingMinutes} min
                      </span>
                    </div>
                    <h2 className="text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
                      {guide.title}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{guide.metaDescription}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </Link>
              );
            })}
          </div>
        </main>
      </div>
    </>
  );
}
