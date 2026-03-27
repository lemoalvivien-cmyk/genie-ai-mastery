/**
 * SupportWidget — Point de contact support minimal intégré dans le produit.
 *
 * Affiche :
 * - Un bouton flottant "Aide" (ou contextuel si props.inline)
 * - Une mini FAQ contextuelle basée sur le contexte (billing, access, general)
 * - Un lien de contact direct
 * - Messages clairs pour chaque situation de blocage
 */
import { useState } from "react";
import { HelpCircle, X, MessageSquare, CreditCard, Lock, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { cn } from "@/lib/utils";

// ── Types ───────────────────────────────────────────────────────────────────
type SupportContext = "general" | "billing" | "access" | "payment_failed";

interface SupportWidgetProps {
  context?: SupportContext;
  inline?: boolean;          // true = afficher inline (pas flottant)
  className?: string;
}

// ── FAQ par contexte ─────────────────────────────────────────────────────────
const FAQ: Record<SupportContext, { q: string; a: string }[]> = {
  general: [
    {
      q: "Comment fonctionne l'essai gratuit ?",
      a: "14 jours d'accès complet à Formetoialia Pro, sans CB requise. À la fin de l'essai, votre compte passe automatiquement en version gratuite (5 messages KITT/jour, modules limités).",
    },
    {
      q: "Comment accéder aux missions du jour ?",
      a: "Cliquez sur \"Aujourd'hui\" dans le menu. Une nouvelle mission adaptée à votre profil vous attend chaque jour. La compléter vous rapporte de l'XP et maintient votre série.",
    },
    {
      q: "Je ne reçois pas les emails de confirmation.",
      a: "Vérifiez vos spams ou indésirables. L'email provient de noreply@formetoialia.com. Si vous ne le trouvez pas après 5 minutes, contactez-nous.",
    },
    {
      q: "Comment exporter mes artefacts ?",
      a: "Dans la Bibliothèque (/app/library), chaque artefact dispose d'un bouton de copie. Pour les PDF, utilisez l'icône téléchargement si disponible.",
    },
  ],
  billing: [
    {
      q: "Comment annuler mon abonnement ?",
      a: "Allez dans Paramètres → Abonnement → \"Gérer l'abonnement\". Vous accédez à votre espace facturation sécurisé pour annuler. Vous conservez l'accès Pro jusqu'à la fin de la période payée.",
    },
    {
      q: "Je veux changer de moyen de paiement.",
      a: "Paramètres → Abonnement → \"Gérer l'abonnement\". Dans votre espace facturation, cliquez sur \"Mettre à jour le paiement\".",
    },
    {
      q: "Puis-je obtenir une facture ?",
      a: "Oui. Dans votre espace facturation (Paramètres → Gérer l'abonnement), toutes vos factures sont téléchargeables en PDF.",
    },
    {
      q: "Mon équipe peut-elle bénéficier de tarifs groupés ?",
      a: "Oui. Le plan Team Pro inclut jusqu'à 25 sièges. Contactez-nous pour des besoins spécifiques ou un devis sur mesure.",
    },
  ],
  access: [
    {
      q: "Pourquoi je ne peux plus accéder à certains modules ?",
      a: "Si votre essai a expiré ou votre abonnement a été annulé, votre compte est repassé en version gratuite. Pour retrouver l'accès complet, abonnez-vous depuis /pricing.",
    },
    {
      q: "Mon code d'accès ne fonctionne pas.",
      a: "Vérifiez que le code est saisi exactement (majuscules/minuscules). Les codes ont une durée de validité limitée. Si le problème persiste, contactez-nous.",
    },
    {
      q: "Je vois un message \"Accès restreint\" sur une page.",
      a: "Cette fonctionnalité est réservée aux membres Pro. Cliquez sur \"Voir les offres\" pour débloquer l'accès complet avec 14 jours d'essai gratuit.",
    },
  ],
  payment_failed: [
    {
      q: "Pourquoi mon paiement a-t-il échoué ?",
      a: "Les raisons les plus fréquentes : fonds insuffisants, carte expirée, ou vérification 3D Secure échouée. Votre accès Pro est maintenu 3 jours après un échec pour vous laisser le temps de corriger.",
    },
    {
      q: "Comment régulariser ma situation ?",
      a: "Allez dans Paramètres → Abonnement → \"Gérer l'abonnement\". Mettez à jour votre carte ou changez de moyen de paiement. Le prochain prélèvement se fera automatiquement.",
    },
    {
      q: "Mon accès sera-t-il coupé ?",
      a: "Vous avez 3 jours après un échec de paiement avant la restriction d'accès. Vous recevrez un email de rappel. Si vous régularisez dans ce délai, rien n'est interrompu.",
    },
  ],
};

// ── Messages de blocage ──────────────────────────────────────────────────────
export const BLOCKING_MESSAGES: Record<string, { title: string; body: string; cta: string; href: string }> = {
  payment_failed: {
    title: "⚠️ Paiement non abouti",
    body: "Votre dernier prélèvement a échoué. Vous avez encore accès à Pro pendant 3 jours. Régularisez maintenant pour éviter toute interruption.",
    cta: "Mettre à jour mon paiement →",
    href: "/app/settings",
  },
  access_restricted: {
    title: "🔒 Accès restreint",
    body: "Cette fonctionnalité est disponible uniquement avec un abonnement Pro actif. Essayez 14 jours gratuitement pour débloquer tout le contenu.",
    cta: "Débloquer l'accès Pro →",
    href: "/pricing",
  },
  trial_ended: {
    title: "⏱️ Votre essai est terminé",
    body: "Vous avez profité de 14 jours d'accès complet. Pour continuer avec tous les playbooks, KITT (500 échanges/jour) et les attestations, passez à Pro.",
    cta: "Continuer avec Pro →",
    href: "/pricing",
  },
  subscription_cancelled: {
    title: "Abonnement annulé",
    body: "Votre abonnement a été annulé. Vous conservez l'accès jusqu'à la fin de la période payée. Réactivez à tout moment pour continuer votre progression.",
    cta: "Réactiver mon abonnement →",
    href: "/pricing",
  },
};

// ── Composant FAQ accordion ──────────────────────────────────────────────────
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border-b last:border-0"
      style={{ borderColor: "rgba(255,255,255,0.06)" }}
    >
      <button
        className="w-full flex items-center justify-between gap-3 py-3 text-left text-sm font-medium transition-colors hover:text-foreground"
        style={{ color: open ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="flex-1 leading-snug">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
      </button>
      {open && (
        <p className="pb-3 text-sm leading-relaxed" style={{ color: "hsl(var(--muted-foreground))" }}>
          {a}
        </p>
      )}
    </div>
  );
}

// ── Composant principal ──────────────────────────────────────────────────────
export default function SupportWidget({ context = "general", inline = false, className }: SupportWidgetProps) {
  const [open, setOpen] = useState(false);
  const { track } = useAnalytics();
  const faq = FAQ[context];

  const handleOpen = () => {
    setOpen(true);
    track("support_opened", { context });
  };

  const handleContactClick = () => {
    track("support_contact_clicked", { context });
  };

  const panel = (
    <div
      className={cn(
        "rounded-2xl overflow-hidden",
        inline ? "" : "shadow-2xl w-80 max-h-[80vh] flex flex-col",
      )}
      style={{
        background: "#1A1D2E",
        border: "1px solid rgba(82,87,216,0.25)",
        boxShadow: inline ? undefined : "0 20px 60px rgba(0,0,0,0.5)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(82,87,216,0.08)" }}
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4" style={{ color: "#5257D8" }} />
          <span className="text-sm font-semibold" style={{ color: "#E8E9F0" }}>
            Aide & Support
          </span>
        </div>
        {!inline && (
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Context-specific alert */}
      {context === "payment_failed" && (
        <div
          className="mx-4 mt-4 p-3 rounded-xl text-sm"
          style={{ background: "hsl(var(--destructive)/0.12)", border: "1px solid hsl(var(--destructive)/0.35)", color: "hsl(var(--destructive))" }}
        >
          <p className="font-semibold mb-1">⚠️ Paiement en échec</p>
          <p style={{ color: "hsl(var(--muted-foreground))" }}>
            Régularisez dans Paramètres → Abonnement. Votre accès Pro est maintenu 3 jours.
          </p>
        </div>
      )}
      {context === "access" && (
        <div
          className="mx-4 mt-4 p-3 rounded-xl text-sm"
          style={{ background: "rgba(82,87,216,0.08)", border: "1px solid rgba(82,87,216,0.25)" }}
        >
          <p className="font-semibold mb-1" style={{ color: "#E8E9F0" }}>🔒 Accès restreint</p>
          <p style={{ color: "hsl(var(--muted-foreground))" }}>
            Cette fonctionnalité nécessite un abonnement Pro actif.{" "}
            <a href="/pricing" className="underline font-medium" style={{ color: "#5257D8" }}>
              Voir les offres →
            </a>
          </p>
        </div>
      )}

      {/* FAQ */}
      <div className="flex-1 overflow-y-auto px-4 pb-2">
        <p className="text-xs font-semibold uppercase tracking-wider mt-4 mb-2" style={{ color: "hsl(var(--muted-foreground))" }}>
          Questions fréquentes
        </p>
        {faq.map((item) => (
          <FAQItem key={item.q} q={item.q} a={item.a} />
        ))}
      </div>

      {/* Footer — contact */}
      <div
        className="px-4 py-3 space-y-2"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <p className="text-xs text-muted-foreground">Vous ne trouvez pas votre réponse ?</p>
        <div className="flex gap-2">
          <a
            href="mailto:support@formetoialia.com"
            onClick={handleContactClick}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
            style={{ background: "rgba(82,87,216,0.15)", color: "#5257D8", border: "1px solid rgba(82,87,216,0.3)" }}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Écrire au support
          </a>
          <a
            href="https://formetoialia.com/legal/cgu"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <ExternalLink className="w-3 h-3" />
            CGU
          </a>
        </div>
      </div>
    </div>
  );

  // ── Inline mode ────────────────────────────────────────────────────────────
  if (inline) {
    return <div className={className}>{panel}</div>;
  }

  // ── Floating button mode ───────────────────────────────────────────────────
  return (
    <div className={cn("fixed bottom-20 right-4 z-50 lg:bottom-6 lg:right-6", className)}>
      {open && (
        <div className="mb-3 animate-in slide-in-from-bottom-2 fade-in duration-200">
          {panel}
        </div>
      )}
      <button
        onClick={open ? () => setOpen(false) : handleOpen}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm shadow-lg transition-all hover:scale-105 active:scale-95"
        style={{
          background: open ? "#1A1D2E" : "linear-gradient(135deg, #5257D8, #7B5EA7)",
          color: "#fff",
          border: "1px solid rgba(82,87,216,0.4)",
          boxShadow: "0 4px 20px rgba(82,87,216,0.3)",
        }}
        aria-label="Aide et support"
      >
        {open ? <X className="w-4 h-4" /> : <HelpCircle className="w-4 h-4" />}
        {!open && <span>Aide</span>}
      </button>
    </div>
  );
}

// ── Export des icônes utilitaires pour réutilisation ─────────────────────────
export { CreditCard, Lock };
