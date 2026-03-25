/**
 * GoLiveChecklist — Checklist de lancement commercial Formetoialia v2
 * Accessible admin uniquement : /admin/go-live
 * Mise à jour : consentement analytics, billing de vérité, fail-closed sécurité
 */
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { CheckCircle2, Circle, AlertCircle, ExternalLink, RefreshCw, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

type Status = "ok" | "warn" | "todo" | "blocant";

interface CheckItem {
  id: string;
  category: string;
  label: string;
  detail: string;
  status: Status;
  link?: string;
}

const CHECKLIST: CheckItem[] = [
  // ── Vérité produit ───────────────────────────────────────────────────────
  { id: "p1", category: "Produit", label: "H1 aligné : 'Transformez votre équipe avec l'IA'", detail: "Plus de 'Arrêtez les formations IA qui finissent en oubli' en H1 principal", status: "ok" },
  { id: "p2", category: "Produit", label: "Package.json name=formetoialia, version=1.0.0", detail: "Plus de vite_react_shadcn_ts ni 0.0.0", status: "ok" },
  { id: "p3", category: "Produit", label: "JARVIS absent du front public", detail: "grep JARVIS dans Index.tsx, Pricing.tsx, OnboardingUnlock.tsx — zéro occurrence", status: "ok" },
  { id: "p4", category: "Produit", label: "OnboardingUnlock : 'Jarvis — coach IA vocal' supprimé", detail: "Remplacé par 'Copilote KITT — 500 échanges/jour'", status: "ok" },
  { id: "p5", category: "Produit", label: ".env.example présent et documenté", detail: "Clés requises listées sans valeurs réelles — ne jamais committer .env.local", status: "ok" },

  // ── Billing de vérité ────────────────────────────────────────────────────
  { id: "b1", category: "Billing", label: "create-checkout : payment_method_collection=if_required", detail: "La carte n'est PAS demandée pendant l'essai — vérifier en Stripe Test Mode", status: "ok" },
  { id: "b2", category: "Billing", label: "end_behavior.missing_payment_method=cancel configuré", detail: "L'essai s'arrête proprement sans conversion silencieuse si aucune CB", status: "ok" },
  { id: "b3", category: "Billing", label: "Wording '14 jours sans carte' cohérent sur tous les points", detail: "Index.tsx, Pricing.tsx, OnboardingUnlock.tsx, FAQ — vérification visuelle", status: "todo" },
  { id: "b4", category: "Billing", label: "STRIPE_PRICE_59_TTC configuré dans les secrets Edge", detail: "Vérifier Lovable Cloud → Settings → Secrets", status: "todo" },
  { id: "b5", category: "Billing", label: "Webhook Stripe actif et signature validée", detail: "stripe-webhook → events: checkout.session.completed, customer.subscription.*", status: "todo" },
  { id: "b6", category: "Billing", label: "Portail client Stripe fonctionnel", detail: "create-portal-session → URL portail correcte", status: "todo" },
  { id: "b7", category: "Billing", label: "Garantie 30j visible dans pricing + FAQ", detail: "FAQ item 'Puis-je annuler' mentionne 30j remboursement", status: "ok" },

  // ── Analytics consentis ──────────────────────────────────────────────────
  { id: "a1", category: "Analytics", label: "landing_viewed : insertion directe anonyme (exempt consentement)", detail: "Code vérifié — insert direct sans cookie traceur, actor_user_id=null", status: "ok" },
  { id: "a2", category: "Analytics", label: "page_view / events non-essentiels bloqués sans consentement", detail: "useAnalytics.track() vérifie hasAnalyticsConsent() avant d'empiler", status: "ok" },
  { id: "a3", category: "Analytics", label: "register_started tracké à l'ouverture de /register", detail: "Register.tsx → useAnalytics().track('register_started') au mount", status: "todo" },
  { id: "a4", category: "Analytics", label: "checkout_started tracké au clic 'Démarrer l'essai'", detail: "Pricing.tsx handleCheckout → track('checkout_started') avant invoke", status: "ok" },
  { id: "a5", category: "Analytics", label: "manager_report_viewed tracké sur ManagerDashboard", detail: "useEffect mount → track('manager_report_viewed')", status: "todo" },
  { id: "a6", category: "Analytics", label: "flushQueue log structuré en cas d'erreur (plus de discard silencieux)", detail: "console.warn('[analytics] flush error:...) présent dans useAnalytics.ts", status: "ok" },

  // ── Sécurité fail-closed ──────────────────────────────────────────────────
  { id: "s1", category: "Sécurité", label: "rate-limit-login : mode dégradé tracé (pas fail-open total)", detail: "security.ts : catch → console.warn + return allowed:true avec log", status: "ok" },
  { id: "s2", category: "Sécurité", label: "rate-limit-login Edge Function : DB error → allowed:true logué", detail: "index.ts ligne ~82 : console.error('[rate-limit-login] DB error')", status: "ok" },
  { id: "s3", category: "Sécurité", label: "Edge Functions sensibles : JWT validé en code", detail: "create-checkout, create-portal-session, delete-account → auth.getUser(token)", status: "todo" },
  { id: "s4", category: "Sécurité", label: "Messages d'erreur client : pas de stack trace ni info technique", detail: "Vérifier les try/catch des Edge Functions — err.message mais pas err.stack", status: "todo" },

  // ── Funnel ──────────────────────────────────────────────────────────────
  { id: "f1", category: "Funnel", label: "Parcours inscription → onboarding → dashboard < 3 min", detail: "Test manuel avec email réel en mode preview", status: "todo" },
  { id: "f2", category: "Funnel", label: "Today accessible gratuit (1 mission/jour)", detail: "Utilisateur gratuit → Today accessible sans paywall bloquant", status: "todo" },
  { id: "f3", category: "Funnel", label: "Checkout Stripe test mode validé bout en bout", detail: "Carte test 4242... → succès → /app/dashboard?payment=success", status: "todo" },
  { id: "f4", category: "Funnel", label: "FAQ répond aux 7 objections clés", detail: "Prix, engagement, ChatGPT, débutants, équipes, labs, attestations", status: "ok" },

  // ── Mobile ───────────────────────────────────────────────────────────────
  { id: "m1", category: "Mobile", label: "Landing correcte sur iOS/Android (pas d'overflow)", detail: "Hero, CTA, stats, FAQ — viewport 390px", status: "todo" },
  { id: "m2", category: "Mobile", label: "Boutons CTA ≥ 44px touch target", detail: "Vérification CSS sur CTAPrimary et boutons checkout", status: "todo" },
  { id: "m3", category: "Mobile", label: "PWA installable (manifest.json aligné)", detail: "name=Formetoialia, description en ligne avec le positionnement", status: "ok" },

  // ── Crédibilité ───────────────────────────────────────────────────────────
  { id: "c1", category: "Crédibilité", label: "Aucun Lorem ipsum ou placeholder visible", detail: "Revue rapide des pages publiques principales", status: "todo" },
  { id: "c2", category: "Crédibilité", label: "Mentions légales, CGU, RGPD accessibles en footer", detail: "/legal/cgu, /legal/confidentialite, /legal/dpa", status: "ok" },
  { id: "c3", category: "Crédibilité", label: "OG image non générique (logo correct)", detail: "og:image → /logo-formetoialia.png, vérifier avec opengraph.xyz", status: "ok", link: "https://opengraph.xyz" },
  { id: "c4", category: "Crédibilité", label: "OpenClaw, GenieOS, NFT absents du front public", detail: "Routes /app/agent-jobs cachées derrière requirePro — OK", status: "ok" },
];

const STATUS_CONFIG: Record<Status, { icon: typeof CheckCircle2; color: string; label: string }> = {
  ok:      { icon: CheckCircle2, color: "text-emerald-400",            label: "OK" },
  warn:    { icon: AlertCircle,  color: "text-amber-400",              label: "À vérifier" },
  todo:    { icon: Circle,       color: "text-muted-foreground/40",    label: "À faire" },
  blocant: { icon: XCircle,      color: "text-destructive",            label: "BLOQUANT" },
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
  const doneCount  = items.filter((i) => i.status === "ok").length;
  const blocCount  = items.filter((i) => i.status === "blocant").length;
  const totalCount = items.length;
  const pct = Math.round((doneCount / totalCount) * 100);

  const verdict =
    blocCount > 0 ? { label: "NO-GO", color: "text-destructive" } :
    pct >= 90     ? { label: "GO commercial", color: "text-emerald-400" } :
    pct >= 70     ? { label: "GO bêta fermée", color: "text-amber-400" } :
                    { label: "Travaux en cours", color: "text-muted-foreground" };

  const categories = ["Tous", ...CATEGORIES];

  return (
    <>
      <Helmet><title>Checklist Go-Live — Formetoialia</title></Helmet>

      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Header */}
          <div>
            <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
              <h1 className="text-2xl font-black text-foreground">🚀 Checklist Go-Live</h1>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-primary">{doneCount}/{totalCount} ({pct}%)</span>
                <span className={`text-sm font-black ${verdict.color}`}>{verdict.label}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Validez chaque point avant le lancement commercial. Verdict automatique.</p>

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
                      : item.status === "blocant"
                      ? "border-destructive/30 bg-destructive/5"
                      : "border-border/50 bg-card/80 hover:border-primary/30"
                  }`}
                  onClick={() => toggle(item.id)}
                >
                  <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${cfg.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                          item.status === "ok"
                            ? "border-emerald-500/30 text-emerald-400"
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
            onClick={() => setItems(CHECKLIST.map((i) => ({ ...i })))}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
          >
            <RefreshCw className="w-3 h-3" />
            Réinitialiser les statuts
          </button>

          {/* Légende règle d'or */}
          <div className="rounded-xl border border-border/40 p-4 text-xs text-muted-foreground space-y-1">
            <p className="font-bold text-foreground">Règle d'or :</p>
            <p>Le verdict est <strong>NO-GO</strong> tant qu'un point BLOQUANT est non validé.</p>
            <p>Le verdict est <strong>GO bêta fermée</strong> à partir de 70% sans bloquant.</p>
            <p>Le verdict est <strong>GO commercial</strong> à partir de 90% sans bloquant.</p>
          </div>
        </div>
      </div>
    </>
  );
}
