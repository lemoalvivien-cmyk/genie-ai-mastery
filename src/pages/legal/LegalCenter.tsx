import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { legalPages, LEGAL_CONFIG } from "@/data/legalContent";
import { subprocessors, subprocessorsUpdatedAt } from "@/data/subprocessors";
import { LegalFooterLinks } from "@/components/legal/LegalFooterLinks";

// ────────────────────────────────────────────────────────────
// Markdown-like renderer (no deps — handles bold, italic,
// tables, links, lists, hr)
// ────────────────────────────────────────────────────────────
function RenderContent({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  const inlineFormat = (raw: string, key: string | number) => {
    // Bold, links, italics
    const parts = raw.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|_[^_]+_)/g);
    return (
      <span key={key}>
        {parts.map((p, idx) => {
          if (p.startsWith("**") && p.endsWith("**"))
            return <strong key={idx}>{p.slice(2, -2)}</strong>;
          if (p.startsWith("[") && p.includes("]("))
            return (
              <Link
                key={idx}
                to={p.slice(p.indexOf("(") + 1, p.lastIndexOf(")"))}
                className="text-primary hover:underline"
              >
                {p.slice(1, p.indexOf("]"))}
              </Link>
            );
          if (p.startsWith("_") && p.endsWith("_"))
            return <em key={idx}>{p.slice(1, -1)}</em>;
          return p;
        })}
      </span>
    );
  };

  while (i < lines.length) {
    const line = lines[i];

    // Table
    if (line.trim().startsWith("|") && lines[i + 1]?.includes("---")) {
      const headers = line
        .split("|")
        .filter((_, j, a) => j !== 0 && j !== a.length - 1)
        .map((h) => h.trim());
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(
          lines[i]
            .split("|")
            .filter((_, j, a) => j !== 0 && j !== a.length - 1)
            .map((c) => c.trim())
        );
        i++;
      }
      elements.push(
        <div key={i} className="overflow-x-auto my-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                {headers.map((h) => (
                  <th key={h} className="text-left py-2 px-3 font-semibold text-foreground">
                    {inlineFormat(h, h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="border-b border-border/40 hover:bg-muted/30">
                  {row.map((cell, ci) => (
                    <td key={ci} className="py-2 px-3 text-muted-foreground">
                      {inlineFormat(cell, `${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // HR
    if (line.trim() === "---") {
      elements.push(<hr key={i} className="border-border/40 my-4" />);
      i++;
      continue;
    }

    // Blockquote
    if (line.trim().startsWith(">")) {
      elements.push(
        <blockquote key={i} className="border-l-2 border-primary/40 pl-4 my-3 text-muted-foreground italic text-sm">
          {inlineFormat(line.trim().slice(1).trim(), i)}
        </blockquote>
      );
      i++;
      continue;
    }

    // Numbered list
    if (/^\d+\./.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\./.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s*/, ""));
        i++;
      }
      elements.push(
        <ol key={i} className="list-decimal pl-5 space-y-1 my-3">
          {items.map((item, idx) => (
            <li key={idx} className="text-muted-foreground text-sm leading-relaxed">
              {inlineFormat(item, idx)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Bullet list
    if (line.trim().startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("- ")) {
        items.push(lines[i].trim().slice(2));
        i++;
      }
      elements.push(
        <ul key={i} className="list-disc pl-5 space-y-1 my-3">
          {items.map((item, idx) => (
            <li key={idx} className="text-muted-foreground text-sm leading-relaxed">
              {inlineFormat(item, idx)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Default paragraph
    elements.push(
      <p key={i} className="text-sm text-muted-foreground leading-relaxed mb-2">
        {inlineFormat(line, i)}
      </p>
    );
    i++;
  }

  return <div className="space-y-1">{elements}</div>;
}

// ────────────────────────────────────────────────────────────
// SUBPROCESSORS PAGE
// ────────────────────────────────────────────────────────────
function SubprocessorsPage() {
  return (
    <>
      <Helmet>
        <title>Sous-traitants — GENIE IA</title>
        <meta
          name="description"
          content="Liste des sous-traitants de GENIE IA — hébergement, paiement, IA, emailing."
        />
      </Helmet>

      <div className="mb-6 pb-4 border-b border-border/40">
        <h1 className="text-2xl font-bold text-foreground mb-1">
          Liste des sous-traitants
        </h1>
        <p className="text-sm text-muted-foreground">
          Mise à jour : {subprocessorsUpdatedAt}
        </p>
      </div>

      <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
        Conformément à l'article 28 du RGPD et à notre{" "}
        <Link to="/legal/dpa" className="text-primary hover:underline">
          Accord de sous-traitance (DPA)
        </Link>
        , voici la liste des sous-traitants auxquels fait appel GENIE IA pour fournir ses services. Tout transfert hors UE/EEE est encadré par des garanties appropriées (clauses contractuelles types ou équivalent).
      </p>

      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              {["Fournisseur", "Rôle", "Région", "Garanties"].map((h) => (
                <th
                  key={h}
                  className="text-left py-3 px-4 font-semibold text-foreground text-xs uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {subprocessors.map((sp, i) => (
              <tr
                key={i}
                className="border-t border-border/40 hover:bg-muted/20 transition-colors"
              >
                <td className="py-3 px-4 font-medium text-foreground">
                  {sp.website ? (
                    <a
                      href={sp.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      {sp.name}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    sp.name
                  )}
                </td>
                <td className="py-3 px-4 text-muted-foreground">{sp.role}</td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      sp.region === "UE"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : sp.region === "Hors UE"
                        ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                        : "bg-muted text-muted-foreground border border-border"
                    }`}
                  >
                    {sp.region}
                  </span>
                </td>
                <td className="py-3 px-4 text-muted-foreground text-xs">
                  {sp.guarantees}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Pour toute question : {LEGAL_CONFIG.RGPD_EMAIL}
      </p>
    </>
  );
}

// ────────────────────────────────────────────────────────────
// LEGAL INDEX PAGE
// ────────────────────────────────────────────────────────────
function LegalIndexPage() {
  const cards = [
    {
      slug: "mentions-legales",
      title: "Mentions légales",
      desc: "Éditeur, hébergement, propriété intellectuelle.",
    },
    {
      slug: "confidentialite",
      title: "Politique de confidentialité",
      desc: "Données traitées, finalités, droits RGPD.",
    },
    {
      slug: "cookies",
      title: "Politique cookies",
      desc: "Catégories, durée de conservation, gestion.",
    },
    {
      slug: "rgpd",
      title: "Exercer mes droits RGPD",
      desc: "Accès, rectification, suppression, portabilité.",
    },
    {
      slug: "cgu",
      title: "CGU",
      desc: "Conditions générales d'utilisation du service.",
    },
    {
      slug: "subprocessors",
      title: "Sous-traitants",
      desc: "Liste des prestataires qui traitent vos données.",
    },
    {
      slug: "dpa",
      title: "Accord de sous-traitance (DPA)",
      desc: "Pour les entreprises — Art. 28 RGPD.",
    },
  ];

  return (
    <>
      <Helmet>
        <title>Centre légal — GENIE IA</title>
        <meta
          name="description"
          content="Centre légal GENIE IA — mentions légales, confidentialité, cookies, CGU, DPA, sous-traitants."
        />
      </Helmet>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">Centre légal</h1>
        <p className="text-muted-foreground text-sm">
          Transparence, conformité RGPD et respect de votre vie privée.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {cards.map((c) => (
          <Link
            key={c.slug}
            to={`/legal/${c.slug}`}
            className="group rounded-xl border border-border/60 bg-card/60 hover:bg-card hover:border-primary/30 p-5 transition-all"
          >
            <h2 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
              {c.title}
            </h2>
            <p className="text-xs text-muted-foreground">{c.desc}</p>
          </Link>
        ))}
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────
// GENERIC LEGAL PAGE
// ────────────────────────────────────────────────────────────
function GenericLegalPage({ slug }: { slug: string }) {
  const page = legalPages.find((p) => p.slug === slug);

  if (!page) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Page légale introuvable.</p>
        <Link to="/legal" className="text-primary hover:underline mt-2 inline-block">
          Retour au centre légal
        </Link>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{page.title} — GENIE IA</title>
        <meta name="description" content={page.metaDescription} />
      </Helmet>

      {/* Header */}
      <div className="mb-6 pb-4 border-b border-border/40">
        <h1 className="text-2xl font-bold text-foreground mb-1">{page.title}</h1>
        {page.updatedAt && (
          <p className="text-xs text-muted-foreground">
            Mise à jour : {page.updatedAt}
          </p>
        )}
      </div>

      {/* Sommaire */}
      {page.sections.length > 2 && (
        <nav
          aria-label="Sommaire"
          className="mb-8 p-4 rounded-xl bg-muted/30 border border-border/40"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Sommaire
          </p>
          <ol className="space-y-1">
            {page.sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Sections */}
      <div className="space-y-8">
        {page.sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-20">
            <h2 className="text-base font-semibold text-foreground mb-3 pb-1.5 border-b border-border/30">
              {section.title}
            </h2>
            <RenderContent text={section.content} />
          </section>
        ))}
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────
// LAYOUT WRAPPER
// ────────────────────────────────────────────────────────────
function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen gradient-hero">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Back nav */}
        <div className="mb-6 flex items-center gap-4">
          <Link
            to="/legal"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Centre légal
          </Link>
          <span className="text-border">|</span>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Accueil
          </Link>
        </div>

        <article className="prose-custom">{children}</article>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-border/40">
          <LegalFooterLinks />
          <p className="text-xs text-muted-foreground mt-4">
            © {new Date().getFullYear()} GENIE IA — {LEGAL_CONFIG.PUBLISHER_NAME} — {LEGAL_CONFIG.HOSTING_STATEMENT}
          </p>
        </footer>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// MAIN EXPORT — router-aware
// ────────────────────────────────────────────────────────────
export default function LegalCenter() {
  const { slug } = useParams<{ slug?: string }>();

  const content =
    slug === undefined ? (
      <LegalIndexPage />
    ) : slug === "subprocessors" ? (
      <SubprocessorsPage />
    ) : (
      <GenericLegalPage slug={slug} />
    );

  return <LegalLayout>{content}</LegalLayout>;
}
