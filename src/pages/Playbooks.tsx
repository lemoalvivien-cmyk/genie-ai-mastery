/**
 * Page publique — Bibliothèque de playbooks FormetoiAlia
 */
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, BookOpen, Mail, TrendingUp, Users,
  BarChart2, Zap, Headphones, Briefcase, Layout,
  Clock, FileText,
} from "lucide-react";
import { DEMO_PLAYBOOKS, DELIVERABLE_COLORS, type PlaybookMeta } from "@/data/playbooks";
import { ProFooter } from "@/components/ProFooter";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  communication: Mail,
  vente: TrendingUp,
  rh: Users,
  productivite: Zap,
  analyse: BarChart2,
  presentation: Layout,
  support: Headphones,
  direction: Briefcase,
};

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  rapide: { label: "⚡ Rapide", color: "text-emerald-400" },
  guidé: { label: "📘 Guidé", color: "text-primary" },
  approfondi: { label: "🔬 Approfondi", color: "text-amber-400" },
};

function PlaybookCard({ pb, index }: { pb: PlaybookMeta; index: number }) {
  const Icon = CATEGORY_ICONS[pb.category] ?? BookOpen;
  const del = DELIVERABLE_COLORS[pb.deliverable_type];
  const diff = DIFFICULTY_LABELS[pb.difficulty];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="rounded-2xl border border-border p-5 flex flex-col h-full hover:border-primary/30 transition-all group"
      style={{ background: "hsl(var(--card))" }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "hsl(var(--primary)/0.1)" }}
        >
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${del.bg} ${del.text}`}
        >
          {del.label}
        </span>
      </div>

      <h3 className="font-bold text-sm text-foreground mb-1 group-hover:text-primary transition-colors capitalize">
        {pb.slug.replace(/-/g, " ")}
      </h3>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3 flex-1">
        {pb.problem}
      </p>

      {/* Aperçu étapes */}
      <ul className="space-y-1 mb-4">
        {pb.steps.slice(0, 3).map((step, i) => (
          <li key={i} className="text-[11px] text-muted-foreground/80 flex items-start gap-1.5">
            <span className="text-primary/50 font-mono text-[10px] mt-px">{i + 1}.</span>
            {step}
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className={diff.color}>{diff.label}</span>
          <span className="flex items-center gap-0.5">
            <Clock className="w-3 h-3" /> {pb.estimated_minutes} min
          </span>
        </div>
      </div>

      <Link
        to="/register"
        className="mt-3 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border border-primary/40 text-primary hover:bg-primary/10 transition-all"
      >
        Accéder au playbook complet <ArrowRight className="w-3 h-3" />
      </Link>
    </motion.div>
  );
}

export default function PlaybooksPage() {
  // Show 9 playbooks
  const displayed = DEMO_PLAYBOOKS.slice(0, 9);

  return (
    <>
      <Helmet>
        <title>Playbooks FormetoiAlia — Exécutions guidées par l'IA pour équipes</title>
        <meta
          name="description"
          content="Bibliothèque de playbooks métier FormetoiAlia. Rédaction d'emails, préparation de présentations, analyse de documents, gestion d'équipe — des exécutions guidées étape par étape avec l'IA."
        />
        <link rel="canonical" href="https://formetoialia.com/playbooks" />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="border-b border-border/50 px-4 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link to="/" className="text-lg font-black text-primary">
              FormetoiAlia
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all"
              style={{
                background: "hsl(var(--accent))",
                color: "hsl(var(--accent-foreground))",
              }}
            >
              Essai gratuit 14 jours <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </header>

        {/* Hero */}
        <section className="py-16 sm:py-24 px-4 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold mb-5 border border-primary/20 text-primary" style={{ background: "hsl(var(--primary)/0.07)" }}>
            <BookOpen className="w-3 h-3" /> Bibliothèque de playbooks
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-foreground mb-4">
            Des exécutions guidées,{" "}
            <span className="text-primary">pas des templates vides.</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-2">
            Chaque playbook est une mission structurée avec un livrable concret à la clé.
            Choisissez, exécutez, obtenez un résultat.
          </p>
          <p className="text-xs text-muted-foreground/60">
            Accès complet avec un compte FormetoiAlia · Essai gratuit 14 jours
          </p>
        </section>

        {/* Grid */}
        <section className="px-4 pb-20 max-w-6xl mx-auto" aria-label="Liste des playbooks">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayed.map((pb, i) => (
              <PlaybookCard key={pb.slug} pb={pb} index={i} />
            ))}
          </div>

          <div className="text-center mt-12 space-y-4">
            <p className="text-sm text-muted-foreground">
              <FileText className="w-4 h-4 inline mr-1" />
              {DEMO_PLAYBOOKS.length} playbooks disponibles · Nouveaux ajouts chaque semaine
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm transition-all"
              style={{
                background: "hsl(var(--accent))",
                color: "hsl(var(--accent-foreground))",
                boxShadow: "0 0 22px hsl(var(--accent)/0.3)",
              }}
            >
              <Zap className="w-4 h-4" />
              Créer un compte — Essai gratuit 14 jours
              <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-xs text-muted-foreground/50">
              Sans carte bancaire · Résiliation libre
            </p>
          </div>
        </section>

        <ProFooter />
      </div>
    </>
  );
}
