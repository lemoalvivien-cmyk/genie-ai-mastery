/**
 * GoLiveChecklist — Checklist de lancement commercial Formetoialia
 * Accessible admin uniquement : /admin/go-live
 */
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { CheckCircle2, Circle, AlertCircle, ExternalLink, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

type Status = "ok" | "warn" | "todo";

interface CheckItem {
  id: string;
  category: string;
  label: string;
  detail: string;
  status: Status;
  link?: string;
}

const CHECKLIST: CheckItem[] = [
  // ── Funnel ──────────────────────────────────────────────────────────────
  { id: "f1", category: "Funnel", label: "Landing page — hero et CTA testés", detail: "H1, sous-titre, CTA 'Essayer gratuitement' visible above the fold", status: "todo" },
  { id: "f2", category: "Funnel", label: "Page pricing — 59€ TTC, 25 membres, 14j sans carte", detail: "Wording exact vérifié, pas de contradiction avec le checkout", status: "todo" },
  { id: "f3", category: "Funnel", label: "Inscription → Onboarding → FirstVictory fonctionnel", detail: "Parcours complet testé avec email de test, vérifié < 3 min", status: "todo" },
  { id: "f4", category: "Funnel", label: "Checkout Stripe — session 14j trial + 59€/mois", detail: "Stripe test mode validé, succès → /app/dashboard?payment=success", status: "todo" },
  { id: "f5", category: "Funnel", label: "FAQ répond aux objections clés", detail: "Page blanche, prix, engagement, attestations, équipes", status: "todo" },

  // ── Analytics ────────────────────────────────────────────────────────────
  { id: "a1", category: "Analytics", label: "landing_viewed reçu dans analytics_events", detail: "Vérifier dans Supabase table analytics_events après visite anonyme", status: "todo", link: "https://supabase.com/dashboard" },
  { id: "a2", category: "Analytics", label: "register_started / signup tracké", detail: "Ouvrir /register → vérifier event register_started en DB", status: "todo" },
  { id: "a3", category: "Analytics", label: "onboarding_started / onboarding_completed tracké", detail: "Compléter onboarding de test → vérifier les 2 events", status: "todo" },
  { id: "a4", category: "Analytics", label: "mission_started / mission_completed tracké", detail: "Compléter une mission Today → vérifier les 2 events", status: "todo" },
  { id: "a5", category: "Analytics", label: "checkout_started tracké au clic Stripe", detail: "Cliquer 'Démarrer l'essai' → vérifier checkout_started", status: "todo" },
  { id: "a6", category: "Analytics", label: "manager_report_viewed tracké sur ManagerDashboard", detail: "Accès cockpit manager → vérifier l'event", status: "todo" },

  // ── Billing ──────────────────────────────────────────────────────────────
  { id: "b1", category: "Billing", label: "STRIPE_PRICE_59_TTC configuré en secret Edge", detail: "Vérifier dans Supabase Secrets que la valeur est correcte", status: "todo" },
  { id: "b2", category: "Billing", label: "Webhook Stripe configuré sur stripe-webhook", detail: "Endpoint actif, signature validée, events: checkout.completed, invoice.paid, customer.subscription.*", status: "todo" },
  { id: "b3", category: "Billing", label: "Downgrade auto en fin d'essai testé", detail: "Essai expiré → plan passe à 'free', accès Pro bloqué", status: "todo" },
  { id: "b4", category: "Billing", label: "Portail client Stripe fonctionnel", detail: "Bouton 'Gérer mon abonnement' → portail Stripe s'ouvre", status: "todo" },
  { id: "b5", category: "Billing", label: "Garantie 30j mentionnée dans pricing et FAQ", detail: "Vérifié sur /pricing et FAQ correspondante", status: "ok" },

  // ── Emails ───────────────────────────────────────────────────────────────
  { id: "e1", category: "Emails", label: "Email de confirmation d'inscription reçu", detail: "Supabase Auth → email de vérification arrive (pas dans spam)", status: "todo" },
  { id: "e2", category: "Emails", label: "Email welcome envoyé après activation compte", detail: "Via lifecycle edge function ou trigger Supabase", status: "todo" },
  { id: "e3", category: "Emails", label: "Email fin d'essai J-3 configuré", detail: "Trial ending → email de relance vers /pricing", status: "todo" },

  // ── Mobile ───────────────────────────────────────────────────────────────
  { id: "m1", category: "Mobile", label: "Landing page affichée correctement sur iOS/Android", detail: "Hero, CTA, stats, FAQ — pas de overflow horizontal", status: "todo" },
  { id: "m2", category: "Mobile", label: "Today + mission jouable sur mobile", detail: "Boutons accessibles 44px min, formulaire lisible", status: "todo" },
  { id: "m3", category: "Mobile", label: "Checkout Stripe OK sur mobile", detail: "Safari iOS + Chrome Android testés", status: "todo" },
  { id: "m4", category: "Mobile", label: "PWA installable (manifest.json complet)", detail: "Chrome mobile → 'Ajouter à l'écran d'accueil'", status: "ok" },

  // ── Crédibilité ───────────────────────────────────────────────────────────
  { id: "c1", category: "Crédibilité", label: "Logo Formetoialia visible partout", detail: "Header, auth pages, emails, onboarding", status: "ok" },
  { id: "c2", category: "Crédibilité", label: "Mentions légales, CGU, RGPD accessibles", detail: "Footer → /legal/cgu, /legal/confidentialite, /legal/dpa", status: "ok" },
  { id: "c3", category: "Crédibilité", label: "Wording 'JARVIS' purgé du front public", detail: "grep JARVIS dans les pages publiques — zéro occurrence", status: "ok" },
  { id: "c4", category: "Crédibilité", label: "OG tags mis à jour (titre, description, image)", detail: "Facebook Debugger / OpenGraph.xyz pour vérifier", status: "ok", link: "https://opengraph.xyz" },
  { id: "c5", category: "Crédibilité", label: "Pas de Lorem ipsum ou placeholder visible", detail: "Revue visuelle rapide des pages principales", status: "todo" },
];

const STATUS_CONFIG: Record<Status, { icon: typeof CheckCircle2; color: string; label: string }> = {
  ok: { icon: CheckCircle2, color: "text-emerald-400", label: "OK" },
  warn: { icon: AlertCircle, color: "text-amber-400", label: "À vérifier" },
  todo: { icon: Circle, color: "text-muted-foreground/40", label: "À faire" },
};

const CATEGORIES = [...new Set(CHECKLIST.map((c) => c.category))];

export default function GoLiveChecklist() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<CheckItem[]>(CHECKLIST);
  const [filter, setFilter] = useState<string>("Tous");

  if (!isAdmin) return <Navigate to="/app/dashboard" replace />;

  const toggle = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: item.status === "ok" ? "todo" : "ok" }
          : item
      )
    );
  };

  const filtered = filter === "Tous" ? items : items.filter((i) => i.category === filter);
  const doneCount = items.filter((i) => i.status === "ok").length;
  const totalCount = items.length;
  const pct = Math.round((doneCount / totalCount) * 100);

  const categories = ["Tous", ...CATEGORIES];

  return (
    <>
      <Helmet><title>Checklist Go-Live — Formetoialia</title></Helmet>

      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Header */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <h1 className="text-2xl font-black text-foreground">🚀 Checklist Go-Live</h1>
              <span className="text-sm font-bold text-primary">{doneCount}/{totalCount} ({pct}%)</span>
            </div>
            <p className="text-sm text-muted-foreground">Validez chaque point avant le lancement commercial.</p>

            {/* Progress bar */}
            <div className="mt-3 h-2.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--border))" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: pct >= 90
                    ? "hsl(142 71% 45%)"
                    : pct >= 60
                    ? "hsl(var(--primary))"
                    : "hsl(var(--accent))",
                }}
              />
            </div>
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  filter === cat
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="space-y-2">
            {filtered.map((item) => {
              const cfg = STATUS_CONFIG[item.status];
              const Icon = cfg.icon;
              return (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    item.status === "ok"
                      ? "border-emerald-500/20 bg-emerald-500/5"
                      : "border-border/50 bg-card/80 hover:border-primary/30 hover:bg-primary/3"
                  }`}
                  onClick={() => toggle(item.id)}
                >
                  <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${cfg.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                          item.status === "ok"
                            ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/8"
                            : "border-border/50 text-muted-foreground"
                        }`}
                      >
                        {item.category}
                      </span>
                      <p className={`text-sm font-semibold leading-snug ${item.status === "ok" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {item.label}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.detail}</p>
                  </div>
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>

          {/* Reset */}
          <button
            onClick={() => setItems(CHECKLIST.map((i) => ({ ...i, status: i.status })))}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
          >
            <RefreshCw className="w-3 h-3" />
            Réinitialiser les statuts
          </button>
        </div>
      </div>
    </>
  );
}
