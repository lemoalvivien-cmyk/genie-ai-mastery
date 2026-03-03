import { Helmet } from "react-helmet-async";
import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, Clock, CheckCircle2, ChevronDown, Brain, Shield, Code2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getGuideBySlug, type Guide } from "@/data/guides";
import logoGenie from "@/assets/logo-genie.png";
import { articleSchema, organizationSchema } from "@/lib/seo";

const DOMAIN_META: Record<Guide["domain"], { label: string; Icon: React.ElementType; color: string }> = {
  ia:    { label: "IA & Automatisation", Icon: Brain,  color: "text-primary" },
  cyber: { label: "Cybersécurité",       Icon: Shield, color: "text-accent" },
  vibe:  { label: "Vibe Coding",         Icon: Code2,  color: "text-emerald-400" },
};

export default function GuideDetail() {
  const { slug } = useParams<{ slug: string }>();
  const guide = getGuideBySlug(slug ?? "");

  if (!guide) return <Navigate to="/guides" replace />;

  const meta = DOMAIN_META[guide.domain];

  return (
    <>
      <Helmet>
        <title>{guide.metaTitle}</title>
        <meta name="description" content={guide.metaDescription} />
        <link rel="canonical" href={`https://genie-ai-mastery.lovable.app/guides/${guide.slug}`} />
        <meta property="og:title" content={guide.metaTitle} />
        <meta property="og:description" content={guide.metaDescription} />
        <meta property="og:type" content="article" />
        <meta property="og:image" content="https://genie-ai-mastery.lovable.app/logo-genie.png" />
        <script type="application/ld+json">
          {JSON.stringify(articleSchema({
            title: guide.title,
            description: guide.metaDescription,
            slug: guide.slug,
            datePublished: guide.datePublished,
          }))}
        </script>
        <script type="application/ld+json">{JSON.stringify(organizationSchema())}</script>
      </Helmet>

      <div className="min-h-screen gradient-hero">
        {/* Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-8 py-4 border-b border-border/30 bg-background/80 backdrop-blur-md">
          <Link to="/">
            <img src={logoGenie} alt="GENIE IA" className="h-10 w-auto" loading="lazy" />
          </Link>
          <Link
            to="/pricing"
            className="px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-sm font-bold shadow-glow hover:brightness-110 transition-all"
          >
            Essai 24h — 59€/mois
          </Link>
        </header>

        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
          {/* Back */}
          <Link
            to="/guides"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Tous les guides
          </Link>

          {/* Meta */}
          <div className="flex items-center gap-3 mb-4">
            <span className={`text-xs font-semibold ${meta.color} flex items-center gap-1`}>
              <meta.Icon className="w-3.5 h-3.5" />
              {meta.label}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {guide.readingMinutes} min de lecture
            </span>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-black text-foreground leading-tight mb-6">
            {guide.title}
          </h1>

          {/* Sections */}
          <article className="space-y-10">
            {guide.sections.map((section, i) => (
              <section key={i}>
                <h2 className="text-lg font-bold text-foreground mb-3">{section.heading}</h2>
                <p className="text-muted-foreground leading-relaxed text-sm sm:text-base whitespace-pre-line">
                  {section.body}
                </p>
              </section>
            ))}
          </article>

          {/* FAQ */}
          {guide.faq.length > 0 && (
            <div className="mt-12">
              <h2 className="text-xl font-bold text-foreground mb-5">Questions fréquentes</h2>
              <Accordion type="single" collapsible className="space-y-2">
                {guide.faq.map((item, i) => (
                  <AccordionItem
                    key={i}
                    value={`faq-${i}`}
                    className="border border-border/60 rounded-xl px-5 bg-card/40"
                  >
                    <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-4">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}

          {/* CTA block */}
          <div className="mt-14 rounded-2xl border border-primary/30 bg-primary/5 p-7 text-center">
            <div className="w-12 h-12 rounded-2xl gradient-primary mx-auto mb-4 flex items-center justify-center shadow-glow">
              <CheckCircle2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-black text-foreground mb-2">
              Passez à la pratique avec GENIE IA
            </h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
              Modules interactifs, KITT IA vocal, attestations PDF vérifiables. Tout ce guide — et bien plus — en pratique.
            </p>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-bold text-sm shadow-glow hover:brightness-110 active:scale-[0.97] transition-all"
            >
              Démarrer — Essai 24h gratuit
            </Link>
            <p className="text-xs text-muted-foreground mt-3">59€/mois TTC · Annulation en 2 clics</p>
          </div>

          {/* Related guides */}
          <div className="mt-12">
            <h3 className="text-base font-bold text-foreground mb-4">Lire aussi</h3>
            <div className="space-y-2">
              {/* Simple static list filtered by domain */}
              <Link to="/guides" className="text-sm text-primary hover:brightness-110 transition-colors flex items-center gap-1.5">
                ← Voir tous les guides gratuits
              </Link>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border/40 px-4 py-6 mt-8">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>© 2026 GENIE IA — Tous droits réservés</span>
            <div className="flex items-center gap-4">
              <Link to="/guides" className="hover:text-foreground transition-colors">Guides</Link>
              <Link to="/pricing" className="hover:text-foreground transition-colors">Tarifs</Link>
              <Link to="/mentions-legales" className="hover:text-foreground transition-colors">Mentions légales</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
