import { useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert, CheckCircle2, XCircle, ChevronRight, ChevronLeft,
  Trophy, RotateCcw, Eye, AlertTriangle, Info, Mail,
  Paperclip, Star,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Clue {
  id: string;
  type: "sender" | "link" | "urgency" | "grammar" | "attachment" | "domain" | "generic";
  label: string;          // short label shown on hover
  explanation: string;    // shown after click
  isPhishing: boolean;    // true = red flag, false = legit element
}

interface SimEmail {
  id: string;
  subject: string;
  from_name: string;
  from_address: string;
  date: string;
  body_parts: Array<{
    id: string;
    text: string;
    clue_id?: string;     // if set, this span is a clue
  }>;
  clues: Clue[];
  is_phishing: boolean;   // overall verdict
  verdict_explanation: string;
}

// ─── 5 Simulated Emails — fictional brands only ───────────────────────────────

const EMAILS: SimEmail[] = [
  // ── EMAIL 1 — Phishing ──────────────────────────────────────────────────────
  {
    id: "email_1",
    is_phishing: true,
    subject: "⚠️ Votre compte ZoomBank a été suspendu — Action requise",
    from_name: "ZoomBank Sécurité",
    from_address: "securite@zoom-bank-alert.net",
    date: "Lun 24 fév. 2025, 02:47",
    verdict_explanation:
      "Cet email est un phishing ! ZoomBank n'existe pas, mais les vraies banques n'envoient jamais depuis un domaine tiers comme 'zoom-bank-alert.net'. L'urgence artificielle, la menace de suspension et la demande de clic immédiat sont des techniques classiques d'ingénierie sociale.",
    body_parts: [
      { id: "b1", text: "Cher(e) client(e),\n\nNous avons détecté une activité suspecte sur votre compte. Pour éviter la suspension définitive, vous devez " },
      { id: "b2", text: "vérifier votre identité dans les 24h", clue_id: "c1" },
      { id: "b3", text: " en cliquant sur le lien ci-dessous.\n\n" },
      { id: "b4", text: "👉 Vérifier mon compte maintenant →\nhttp://zoombank-secure-login.xyz/verify", clue_id: "c2" },
      { id: "b5", text: "\n\nAttention : " },
      { id: "b6", text: "tout retard entraînera le blocage définitif de vos fonds.", clue_id: "c3" },
      { id: "b7", text: "\n\nCordialement,\nL'équipe Sécurité ZoomBank\n\n" },
      { id: "b8", text: "securite@zoom-bank-alert.net", clue_id: "c4" },
    ],
    clues: [
      { id: "c1", type: "urgency", label: "Urgence artificielle", explanation: "Le délai de 24h est une pression psychologique pour te faire agir sans réfléchir. Les vraies banques donnent toujours plus de temps et proposent d'appeler.", isPhishing: true },
      { id: "c2", type: "link", label: "Lien suspect", explanation: "L'URL 'zoombank-secure-login.xyz' n'est PAS le site officiel de la banque. Le domaine .xyz est souvent utilisé pour les arnaques. Survole toujours un lien avant de cliquer.", isPhishing: true },
      { id: "c3", type: "urgency", label: "Menace de blocage", explanation: "Menacer de 'bloquer vos fonds' est une technique de peur (Fear). Les banques légitimes ne bloquent pas les fonds sans procédure officielle.", isPhishing: true },
      { id: "c4", type: "sender", label: "Domaine d'expéditeur suspect", explanation: "Un email de banque légitime viendrait de @zoombank.fr ou @zoombank.com — jamais d'un domaine externe comme 'zoom-bank-alert.net'.", isPhishing: true },
    ],
  },

  // ── EMAIL 2 — Légitime ──────────────────────────────────────────────────────
  {
    id: "email_2",
    is_phishing: false,
    subject: "Votre commande #48291 a été expédiée 🎉",
    from_name: "MercatoShop",
    from_address: "commandes@mercatoshop.fr",
    date: "Mar 25 fév. 2025, 09:15",
    verdict_explanation:
      "Cet email est légitime ! L'expéditeur utilise le domaine officiel de la boutique (@mercatoshop.fr), il n'y a aucune demande de mot de passe, aucune urgence artificielle, et les liens pointent vers le domaine officiel. La personnalisation (nom + numéro de commande) est un bon signe.",
    body_parts: [
      { id: "b1", text: "Bonjour Marie,\n\nVotre commande " },
      { id: "b2", text: "#48291", clue_id: "c1" },
      { id: "b3", text: " a été expédiée aujourd'hui et arrivera dans 2-3 jours ouvrés.\n\nSuivre ma livraison → https://mercatoshop.fr/suivi/48291\n\nMerci pour votre achat !\nL'équipe MercatoShop\n\n" },
      { id: "b4", text: "commandes@mercatoshop.fr", clue_id: "c2" },
    ],
    clues: [
      { id: "c1", type: "generic", label: "Numéro de commande personnalisé", explanation: "✅ Bon signe ! Un numéro de commande spécifique montre que l'email est personnalisé pour toi. Les phishings de masse n'ont pas ces détails précis.", isPhishing: false },
      { id: "c2", type: "sender", label: "Domaine officiel", explanation: "✅ 'commandes@mercatoshop.fr' correspond au domaine officiel de la boutique. Pas de redirection, pas de sous-domaine bizarre.", isPhishing: false },
    ],
  },

  // ── EMAIL 3 — Phishing ──────────────────────────────────────────────────────
  {
    id: "email_3",
    is_phishing: true,
    subject: "Votre abonnement VibeCloud expire — Renouvelez maintenant",
    from_name: "VibeCloud Support",
    from_address: "no-reply@vibecloud-billing.info",
    date: "Mer 26 fév. 2025, 14:03",
    verdict_explanation:
      "Phishing ! Même si l'email semble professionnel, plusieurs indices trahissent l'arnaque : le domaine 'vibecloud-billing.info' est différent du site officiel, la pièce jointe inattendue (.exe déguisé en PDF) est dangereuse, et la demande de re-saisir les coordonnées bancaires est un signal d'alarme absolu.",
    body_parts: [
      { id: "b1", text: "Bonjour,\n\nVotre abonnement VibeCloud Premium expire dans " },
      { id: "b2", text: "48 heures", clue_id: "c1" },
      { id: "b3", text: ". Pour continuer à utiliser nos services sans interruption, veuillez mettre à jour vos informations de paiement.\n\n" },
      { id: "b4", text: "📎 Facture_Renouvellement_2025.pdf.exe", clue_id: "c2" },
      { id: "b5", text: "\n\nOu mettez à jour directement : " },
      { id: "b6", text: "http://vibecloud-billing.info/update-payment", clue_id: "c3" },
      { id: "b7", text: "\n\nNe partagez votre mot de passe avec personne — " },
      { id: "b8", text: "sauf avec notre équipe de support si demandé.", clue_id: "c4" },
      { id: "b9", text: "\n\nCordialement,\nVibeCloud Billing" },
    ],
    clues: [
      { id: "c1", type: "urgency", label: "Compte à rebours de 48h", explanation: "La pression temporelle est une technique classique de phishing pour t'empêcher de vérifier l'authenticité de l'email.", isPhishing: true },
      { id: "c2", type: "attachment", label: "Pièce jointe .exe déguisée", explanation: "⚠️ DANGER EXTRÊME ! Un fichier '.pdf.exe' n'est PAS un PDF. C'est un programme malveillant. Les extensions doubles sont une technique pour tromper les utilisateurs.", isPhishing: true },
      { id: "c3", type: "domain", label: "Domaine de paiement suspect", explanation: "Une vraie entreprise traite les paiements sur son domaine officiel (vibecloud.com), pas sur 'vibecloud-billing.info'. Ce domaine a été créé spécifiquement pour cette arnaque.", isPhishing: true },
      { id: "c4", type: "generic", label: "Demande de mot de passe", explanation: "⚠️ RÈGLE D'OR : Aucune entreprise légitime ne demandera jamais votre mot de passe par email, même 'le support'. C'est toujours une arnaque.", isPhishing: true },
    ],
  },

  // ── EMAIL 4 — Phishing subtil ───────────────────────────────────────────────
  {
    id: "email_4",
    is_phishing: true,
    subject: "Confirmation : Réinitialisation de votre mot de passe Connecto",
    from_name: "Connecto",
    from_address: "noreply@connecto.support",
    date: "Jeu 27 fév. 2025, 11:22",
    verdict_explanation:
      "Phishing subtil ! Cet email est plus difficile à détecter. L'expéditeur utilise 'connecto.support' au lieu de 'connecto.com' — le domaine 'support' peut être enregistré par n'importe qui. De plus, tu n'as probablement pas demandé cette réinitialisation. La règle : si tu n'as pas demandé, ignore et signale.",
    body_parts: [
      { id: "b1", text: "Bonjour,\n\nNous avons reçu une demande de réinitialisation de mot de passe pour votre compte Connecto.\n\nSi vous êtes à l'origine de cette demande, cliquez ici :\n" },
      { id: "b2", text: "Réinitialiser mon mot de passe →\nhttp://connecto.support/reset?token=a7f2b9d1e4", clue_id: "c1" },
      { id: "b3", text: "\n\n" },
      { id: "b4", text: "Si vous n'avez pas fait cette demande, ignorez cet email.", clue_id: "c2" },
      { id: "b5", text: "\n\nCet email expire dans 15 minutes.\n\n" },
      { id: "b6", text: "noreply@connecto.support", clue_id: "c3" },
      { id: "b7", text: "\n\n— Connecto Security Team" },
    ],
    clues: [
      { id: "c1", type: "domain", label: "Sous-domaine trompeur", explanation: "'connecto.support' ≠ 'connecto.com'. Le domaine officiel serait connecto.com. N'importe qui peut acheter 'connecto.support' pour usurper l'identité d'une marque.", isPhishing: true },
      { id: "c2", type: "generic", label: "Demande non sollicitée", explanation: "Tu n'as pas demandé de réinitialisation ? C'est un signal d'alarme majeur. Cette technique force les utilisateurs stressés à 'confirmer leur innocence' en cliquant.", isPhishing: true },
      { id: "c3", type: "sender", label: "Expéditeur domaine tiers", explanation: "Même raisonnement : un email légitime de Connecto viendrait de @connecto.com, jamais de @connecto.support qui est un domaine distinct.", isPhishing: true },
    ],
  },

  // ── EMAIL 5 — Légitime avec indices légitimes ───────────────────────────────
  {
    id: "email_5",
    is_phishing: false,
    subject: "Nouveau message de votre équipe sur WorkHub",
    from_name: "WorkHub Notifications",
    from_address: "notifications@workhub.io",
    date: "Ven 28 fév. 2025, 16:45",
    verdict_explanation:
      "Email légitime ! WorkHub envoie depuis son domaine officiel (@workhub.io), le contenu est personnalisé (nom de collègue, nom de projet), il n'y a aucune urgence, aucune demande de mot de passe. Le seul lien mène vers le domaine officiel. Ce type d'email de notification est sûr.",
    body_parts: [
      { id: "b1", text: "Bonjour Lucas,\n\nThomas Petit vous a mentionné dans le projet " },
      { id: "b2", text: "\"Refonte Site Q2 2025\"", clue_id: "c1" },
      { id: "b3", text: " :\n\n💬 \"Lucas, tu peux jeter un œil à la maquette page d'accueil ?\"\n\nRépondre dans WorkHub → https://workhub.io/projects/refonte-q2/messages\n\n—\nVous recevez cet email car vous avez activé les notifications WorkHub.\n" },
      { id: "b4", text: "Se désabonner", clue_id: "c2" },
      { id: "b5", text: "\n\n" },
      { id: "b6", text: "notifications@workhub.io", clue_id: "c3" },
    ],
    clues: [
      { id: "c1", type: "generic", label: "Contexte personnalisé réel", explanation: "✅ Un nom de collègue ET un nom de projet spécifique dans le même message est difficile à falsifier en masse. C'est un signe d'authenticité.", isPhishing: false },
      { id: "c2", type: "generic", label: "Lien de désabonnement", explanation: "✅ La présence d'un vrai lien de désabonnement est requise par la loi (RGPD) pour les emails légitimes. Les phishings l'omettent souvent ou le faussent.", isPhishing: false },
      { id: "c3", type: "sender", label: "Domaine officiel cohérent", explanation: "✅ 'notifications@workhub.io' correspond exactement au domaine du service (workhub.io). Aucune anomalie.", isPhishing: false },
    ],
  },
];

// ─── Scoring ──────────────────────────────────────────────────────────────────

function computeScore(email: SimEmail, foundClueIds: Set<string>): number {
  const phishingClues = email.clues.filter((c) => c.isPhishing);
  const legitClues = email.clues.filter((c) => !c.isPhishing);

  if (!email.is_phishing) {
    // Legitimate email: reward for finding legit clues, penalize false positives
    const correctFound = legitClues.filter((c) => foundClueIds.has(c.id)).length;
    const wrongFound = phishingClues.filter((c) => foundClueIds.has(c.id)).length; // shouldn't happen but safe
    return Math.max(0, Math.min(100, Math.round((correctFound / Math.max(legitClues.length, 1)) * 100 - wrongFound * 20)));
  } else {
    // Phishing email: reward finding phishing clues
    const found = phishingClues.filter((c) => foundClueIds.has(c.id)).length;
    return Math.round((found / Math.max(phishingClues.length, 1)) * 100);
  }
}

// ─── Clue type icon + color ───────────────────────────────────────────────────

const CLUE_TYPE_CONFIG: Record<string, { color: string; label: string }> = {
  sender:     { color: "bg-orange-500/20 border-orange-500/50 text-orange-400", label: "Expéditeur" },
  link:       { color: "bg-red-500/20 border-red-500/50 text-red-400", label: "Lien" },
  urgency:    { color: "bg-yellow-500/20 border-yellow-500/50 text-yellow-400", label: "Urgence" },
  grammar:    { color: "bg-purple-500/20 border-purple-500/50 text-purple-400", label: "Faute" },
  attachment: { color: "bg-red-600/20 border-red-600/50 text-red-500", label: "Pièce jointe" },
  domain:     { color: "bg-orange-600/20 border-orange-600/50 text-orange-500", label: "Domaine" },
  generic:    { color: "bg-blue-500/20 border-blue-500/50 text-blue-400", label: "Indice" },
};

// ─── EmailViewer ──────────────────────────────────────────────────────────────

function EmailViewer({
  email,
  foundClues,
  revealed,
  onClueClick,
}: {
  email: SimEmail;
  foundClues: Set<string>;
  revealed: boolean;
  onClueClick: (clueId: string) => void;
}) {
  const [hoveredClue, setHoveredClue] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm">
      {/* Email header */}
      <div className="px-5 py-4 border-b border-border/40 bg-muted/20 space-y-1.5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center shrink-0 mt-0.5">
            <Mail className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground">{email.from_name}</span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded border font-mono ${
                  revealed && email.is_phishing
                    ? "bg-destructive/10 border-destructive/40 text-destructive"
                    : "bg-muted/50 border-border/40 text-muted-foreground"
                }`}
              >
                &lt;{email.from_address}&gt;
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{email.date}</p>
          </div>
        </div>
        <p className="text-sm font-semibold text-foreground">{email.subject}</p>
      </div>

      {/* Email body */}
      <div className="px-5 py-5 text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap font-mono">
        {email.body_parts.map((part) => {
          if (!part.clue_id) return <span key={part.id}>{part.text}</span>;

          const clue = email.clues.find((c) => c.id === part.clue_id)!;
          const isFound = foundClues.has(part.clue_id);
          const isHovered = hoveredClue === part.clue_id;

          const baseClass = "relative inline cursor-pointer rounded px-0.5 transition-all border-b-2";
          let colorClass = "border-dashed border-muted-foreground/40 hover:border-primary hover:bg-primary/10";

          if (revealed || isFound) {
            colorClass = clue.isPhishing
              ? "border-destructive bg-destructive/10 text-destructive"
              : "border-green-500 bg-green-500/10 text-green-600 dark:text-green-400";
          }

          return (
            <span
              key={part.id}
              className={`${baseClass} ${colorClass}`}
              onClick={() => !revealed && onClueClick(part.clue_id!)}
              onMouseEnter={() => setHoveredClue(part.clue_id!)}
              onMouseLeave={() => setHoveredClue(null)}
            >
              {part.text}
              {/* Tooltip */}
              {isHovered && !revealed && !isFound && (
                <span className="absolute bottom-full left-0 mb-1.5 w-max max-w-[220px] rounded-lg bg-popover border border-border shadow-lg px-3 py-2 text-xs text-popover-foreground z-10 pointer-events-none">
                  🔍 {clue.label}
                  <span className="block text-[10px] text-muted-foreground mt-0.5">Clique pour identifier</span>
                </span>
              )}
              {/* Found badge */}
              {isFound && !revealed && (
                <span className="ml-1 text-[10px] font-bold">✓</span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── ScoreBadge ───────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "text-emerald-500" : score >= 50 ? "text-yellow-500" : "text-destructive";
  const bg = score >= 80 ? "bg-emerald-500/10 border-emerald-500/30" : score >= 50 ? "bg-yellow-500/10 border-yellow-500/30" : "bg-destructive/10 border-destructive/30";
  const label = score >= 80 ? "Expert 🎯" : score >= 50 ? "Bien 👍" : "À améliorer 📚";
  return (
    <div className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl border ${bg}`}>
      <span className={`text-2xl font-black ${color}`}>{score}%</span>
      <span className={`text-[11px] font-semibold ${color}`}>{label}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PhishingLab() {
  const { profile } = useAuth();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [foundClues, setFoundClues] = useState<Map<string, Set<string>>>(new Map());
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [scores, setScores] = useState<Map<string, number>>(new Map());
  const [verdicts, setVerdicts] = useState<Map<string, boolean>>(new Map()); // emailId → is_phishing guess
  const [labFinished, setLabFinished] = useState(false);
  const [saving, setSaving] = useState(false);

  const email = EMAILS[currentIndex];
  const emailFoundClues = foundClues.get(email.id) ?? new Set<string>();
  const isRevealed = revealed.has(email.id);
  const emailScore = scores.get(email.id);

  const handleClueClick = useCallback((clueId: string) => {
    setFoundClues((prev) => {
      const next = new Map(prev);
      const existing = new Set(next.get(email.id) ?? []);
      existing.add(clueId);
      next.set(email.id, existing);
      return next;
    });

    const clue = email.clues.find((c) => c.id === clueId)!;
    toast({
      title: clue.isPhishing ? `🚨 Indice trouvé : ${clue.label}` : `✅ Bon signe identifié : ${clue.label}`,
      description: clue.explanation,
    });
  }, [email]);

  const handleReveal = useCallback(() => {
    const currentFoundClues = foundClues.get(email.id) ?? new Set<string>();
    const score = computeScore(email, currentFoundClues);

    setRevealed((prev) => new Set(prev).add(email.id));
    setScores((prev) => new Map(prev).set(email.id, score));
  }, [email, foundClues]);

  const handleVerdictGuess = useCallback((isPhishing: boolean) => {
    setVerdicts((prev) => new Map(prev).set(email.id, isPhishing));
  }, [email.id]);

  const handleNext = () => {
    if (currentIndex < EMAILS.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      finishLab();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const finishLab = async () => {
    setLabFinished(true);
    if (!profile?.id) return;

    setSaving(true);
    try {
      for (const em of EMAILS) {
        const fc = foundClues.get(em.id) ?? new Set<string>();
        const score = scores.get(em.id) ?? 0;
        await supabase.from("phishing_results").insert({
          user_id: profile.id,
          email_id: em.id,
          score,
          found_clues: Array.from(fc),
          total_clues: em.clues.filter((c) => c.isPhishing).length,
        });
      }
    } catch {
      // Phishing results save failure — non-blocking
    } finally {
      setSaving(false);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setFoundClues(new Map());
    setRevealed(new Set());
    setScores(new Map());
    setVerdicts(new Map());
    setLabFinished(false);
  };

  // ── Final score screen ────────────────────────────────────────────────────
  if (labFinished) {
    const allScores = EMAILS.map((e) => scores.get(e.id) ?? 0);
    const avg = Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length);
    const verdictCorrect = EMAILS.filter((e) => verdicts.get(e.id) === e.is_phishing).length;

    return (
      <>
        <Helmet><title>Résultats Lab Phishing – Formetoialia</title></Helmet>
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          {/* Trophy header */}
          <div className="text-center space-y-3 py-6">
            <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-4xl ${
              avg >= 80 ? "bg-green-500/20" : avg >= 50 ? "bg-yellow-500/20" : "bg-destructive/20"
            }`}>
              {avg >= 80 ? "🏆" : avg >= 50 ? "🎯" : "📚"}
            </div>
            <h1 className="text-2xl font-black text-foreground">
              {avg >= 80 ? "Excellent ! Tu es expert anti-phishing" : avg >= 50 ? "Bon travail !" : "Continue à t'entraîner !"}
            </h1>
            <p className="text-muted-foreground text-sm">
              Tu as identifié correctement {verdictCorrect}/{EMAILS.length} emails comme phishing ou légitime.
            </p>
          </div>

          {/* Score cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-border/50 bg-card/60 p-4 text-center space-y-1">
              <p className={`text-3xl font-black ${avg >= 80 ? "text-emerald-500" : avg >= 50 ? "text-yellow-500" : "text-destructive"}`}>{avg}%</p>
              <p className="text-xs text-muted-foreground">Score moyen</p>
            </div>
            <div className="rounded-2xl border border-border/50 bg-card/60 p-4 text-center space-y-1">
              <p className="text-3xl font-black text-primary">{verdictCorrect}/{EMAILS.length}</p>
              <p className="text-xs text-muted-foreground">Verdicts corrects</p>
            </div>
            <div className="rounded-2xl border border-border/50 bg-card/60 p-4 text-center space-y-1">
              <p className="text-3xl font-black text-accent">
                {Array.from(foundClues.values()).reduce((a, s) => a + s.size, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Indices trouvés</p>
            </div>
          </div>

          {/* Per-email breakdown */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Détail par email</h2>
            {EMAILS.map((em, i) => {
              const s = scores.get(em.id) ?? 0;
              const fc = foundClues.get(em.id)?.size ?? 0;
              const guessedRight = verdicts.get(em.id) === em.is_phishing;
              return (
                <div key={em.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card/40">
                  <span className="text-xs text-muted-foreground w-4 shrink-0">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{em.subject}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${
                        em.is_phishing
                          ? "bg-destructive/10 border-destructive/30 text-destructive"
                          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                      }`}>
                        {em.is_phishing ? "🚨 Phishing" : "✅ Légitime"}
                      </span>
                      {guessedRight
                        ? <span className="text-[10px] text-emerald-500">Verdict correct ✓</span>
                        : <span className="text-[10px] text-destructive">Verdict incorrect ✗</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${s >= 80 ? "text-emerald-500" : s >= 50 ? "text-yellow-500" : "text-destructive"}`}>{s}%</p>
                    <p className="text-[10px] text-muted-foreground">{fc} indice(s)</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Key lessons */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              Règles d'or anti-phishing
            </h3>
            {[
              "Vérifie toujours le domaine de l'expéditeur (partie après @)",
              "Survole les liens AVANT de cliquer — l'URL réelle s'affiche en bas",
              "Aucune entreprise légitime ne demande ton mot de passe par email",
              "L'urgence artificielle est le signe #1 d'une arnaque",
              "En cas de doute, contacte l'entreprise directement (site officiel, pas le lien du mail)",
            ].map((rule, i) => (
              <p key={i} className="text-xs text-foreground/80 flex items-start gap-2">
                <span className="text-primary font-bold shrink-0 mt-0.5">{i + 1}.</span>
                {rule}
              </p>
            ))}
          </div>

          <Button onClick={handleRestart} className="w-full gap-2" variant="outline">
            <RotateCcw className="w-4 h-4" />
            Recommencer le lab
          </Button>
        </div>
      </>
    );
  }

  // ── In-progress screen ────────────────────────────────────────────────────

  const phishingClues = email.clues.filter((c) => c.isPhishing);
  const foundPhishingClues = phishingClues.filter((c) => emailFoundClues.has(c.id));
  const userVerdictGuess = verdicts.get(email.id);

  return (
    <>
      <Helmet><title>Lab Phishing – GENIE IA</title></Helmet>
      <div className="max-w-3xl mx-auto p-4 lg:p-6 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-none">Lab Phishing</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Simulation 100% safe — aucun email n'est envoyé</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 bg-card/60 border border-border/40 rounded-full px-3 py-1.5">
            {EMAILS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i < currentIndex ? "bg-primary" : i === currentIndex ? "bg-primary animate-pulse" : "bg-border"
                }`}
              />
            ))}
            <span className="text-[10px] text-muted-foreground ml-1">{currentIndex + 1}/{EMAILS.length}</span>
          </div>
        </div>

        {/* Instructions banner */}
        {!isRevealed && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 flex items-center gap-2.5">
            <Eye className="w-4 h-4 text-primary shrink-0" />
            <p className="text-xs text-foreground/80">
              <strong>Mission :</strong> Lis cet email attentivement. Clique sur chaque élément suspect (liens, expéditeur, formulations...) puis donne ton verdict.
            </p>
          </div>
        )}

        {/* Email viewer */}
        <EmailViewer
          email={email}
          foundClues={emailFoundClues}
          revealed={isRevealed}
          onClueClick={handleClueClick}
        />

        {/* Progress on clues */}
        {!isRevealed && email.is_phishing && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
            <span>
              Indices suspects trouvés : <strong className="text-foreground">{foundPhishingClues.length}/{phishingClues.length}</strong>
            </span>
            {foundPhishingClues.length === phishingClues.length && (
              <span className="text-emerald-500 font-medium">— Tous trouvés ! 🎉</span>
            )}
          </div>
        )}

        {/* Verdict section */}
        {!isRevealed && (
          <div className="rounded-xl border border-border/50 bg-card/40 p-4 space-y-3">
            <p className="text-xs font-semibold text-foreground">Ton verdict :</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleVerdictGuess(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                  userVerdictGuess === true
                    ? "bg-destructive/20 border-destructive text-destructive"
                    : "border-border/50 text-muted-foreground hover:border-destructive/50 hover:text-destructive/80"
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                C'est un phishing !
              </button>
              <button
                onClick={() => handleVerdictGuess(false)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                  userVerdictGuess === false
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                    : "border-border/50 text-muted-foreground hover:border-emerald-500/50 hover:text-emerald-600/80"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                Email légitime
              </button>
            </div>
            <Button
              onClick={handleReveal}
              disabled={userVerdictGuess === undefined}
              className="w-full gradient-primary shadow-glow"
            >
              Révéler la solution
            </Button>
            {userVerdictGuess === undefined && (
              <p className="text-[10px] text-muted-foreground text-center">Donne d'abord ton verdict avant de révéler</p>
            )}
          </div>
        )}

        {/* Reveal panel */}
        {isRevealed && (
          <div className={`rounded-2xl border p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 ${
            email.is_phishing
              ? "border-destructive/30 bg-destructive/5"
              : "border-emerald-500/30 bg-emerald-500/5"
          }`}>
            {/* Verdict */}
            <div className="flex items-center gap-3">
              {email.is_phishing
                ? <ShieldAlert className="w-6 h-6 text-destructive shrink-0" />
                : <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />}
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">
                  {email.is_phishing ? "🚨 C'était un phishing !" : "✅ Email légitime !"}
                </p>
                {userVerdictGuess !== undefined && (
                  <p className={`text-xs mt-0.5 ${userVerdictGuess === email.is_phishing ? "text-emerald-500" : "text-destructive"}`}>
                    {userVerdictGuess === email.is_phishing ? "✓ Ton verdict était correct !" : "✗ Ton verdict était incorrect."}
                  </p>
                )}
              </div>
              {emailScore !== undefined && <ScoreBadge score={emailScore} />}
            </div>

            {/* Explanation */}
            <p className="text-xs text-foreground/80 leading-relaxed border-t border-current/10 pt-3">
              {email.verdict_explanation}
            </p>

            {/* Clue breakdown */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {email.clues.length} indice(s) dans cet email
              </p>
              {email.clues.map((clue) => {
                const found = emailFoundClues.has(clue.id);
                const cfg = CLUE_TYPE_CONFIG[clue.type];
                return (
                  <div
                    key={clue.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs ${
                      found ? cfg.color : "border-border/40 bg-card/30 opacity-60"
                    }`}
                  >
                    {found
                      ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      : <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground" />}
                    <div>
                      <p className="font-semibold">{clue.label}</p>
                      <p className="text-[11px] opacity-80 mt-0.5 leading-relaxed">{clue.explanation}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            Précédent
          </Button>
          <Button
            onClick={handleNext}
            disabled={!isRevealed}
            className="flex-1 gradient-primary shadow-glow gap-1.5"
          >
            {currentIndex < EMAILS.length - 1 ? (
              <>Email suivant <ChevronRight className="w-4 h-4" /></>
            ) : (
              <>Voir mes résultats <Trophy className="w-4 h-4" /></>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
