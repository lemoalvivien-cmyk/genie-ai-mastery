import { useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Shield, Eye, KeyRound, AlertTriangle, CheckCircle2,
  ChevronRight, ChevronLeft, RotateCcw, Trophy, Download,
  Loader2, Lock, Zap, FileText, XCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Module = "phishing" | "password" | "incident";

// ─── MODULE A : Phishing Recognition ──────────────────────────────────────────

interface PhishingExample {
  id: string;
  subject: string;
  sender: string;
  senderEmail: string;
  preview: string;
  isPhishing: boolean;
  clues: { text: string; isRed: boolean }[];
  explanation: string;
}

const PHISHING_EXAMPLES: PhishingExample[] = [
  {
    id: "p1",
    subject: "🚨 Compte RH suspendu - Action requise sous 2h",
    sender: "DRH Externe",
    senderEmail: "rh-alerte@drh-externalisee.info",
    preview: "Suite à une anomalie détectée dans notre système de paie, votre accès a été temporairement suspendu...",
    isPhishing: true,
    clues: [
      { text: "Domaine non officiel : drh-externalisee.info", isRed: true },
      { text: "Urgence artificielle : 2h de délai", isRed: true },
      { text: "Menace de suspension de paie", isRed: true },
      { text: "Pas de signature nominative DRH", isRed: true },
    ],
    explanation: "Phishing RH classique. Le domaine 'drh-externalisee.info' n'est pas celui de votre entreprise. La pression temporelle et la menace sur la paie sont des leviers psychologiques pour vous faire agir sans réfléchir.",
  },
  {
    id: "p2",
    subject: "Votre réservation hôtel #REF-2847 confirmée",
    sender: "HotelDirecto Réservations",
    senderEmail: "reservations@hoteldirecto.com",
    preview: "Bonjour Jean-Marc, votre séjour du 15 au 18 mars au Grand Hôtel Lyon Centre est confirmé. Numéro de réservation : REF-2847...",
    isPhishing: false,
    clues: [
      { text: "Domaine officiel cohérent : hoteldirecto.com", isRed: false },
      { text: "Personnalisation : prénom + dates + hotel spécifique", isRed: false },
      { text: "Numéro de réservation précis", isRed: false },
      { text: "Aucune demande de mot de passe ou données bancaires", isRed: false },
    ],
    explanation: "Email légitime. La personnalisation précise (prénom, dates, hôtel nommé, numéro de réservation) est difficile à reproduire en masse. Le domaine correspond à l'expéditeur déclaré.",
  },
  {
    id: "p3",
    subject: "Microsoft 365 - Votre licence expire dans 3 jours",
    sender: "Microsoft Support",
    senderEmail: "no-reply@ms365-renewal.net",
    preview: "Cher utilisateur, votre abonnement Microsoft 365 Business arrive à expiration. Renouvelez maintenant pour éviter la perte de vos données...",
    isPhishing: true,
    clues: [
      { text: "Domaine ms365-renewal.net ≠ microsoft.com", isRed: true },
      { text: "'Cher utilisateur' : pas de personnalisation", isRed: true },
      { text: "Menace de perte de données", isRed: true },
      { text: "Pression temporelle : 3 jours", isRed: true },
    ],
    explanation: "Phishing Microsoft. Les emails officiels Microsoft viennent de @microsoft.com. L'absence de personnalisation et le domaine 'ms365-renewal.net' trahissent l'arnaque.",
  },
  {
    id: "p4",
    subject: "Action requise : Authentification MFA sur votre compte",
    sender: "SecureBank Pro",
    senderEmail: "securite@securebank-pro.eu",
    preview: "Bonjour, suite à une tentative de connexion depuis un nouvel appareil, nous demandons une vérification MFA. Cliquez ici pour confirmer...",
    isPhishing: true,
    clues: [
      { text: "securebank-pro.eu : domaine suspect (tiret)", isRed: true },
      { text: "Demande MFA par email = tactique de vol de code", isRed: true },
      { text: "Alerte connexion non demandée", isRed: true },
      { text: "Urgence implicite pour provoquer une réaction rapide", isRed: true },
    ],
    explanation: "Phishing MFA avancé. Les vraies banques ne demandent jamais votre code MFA par email. Cette technique (MFA fatigue) vise à vous faire entrer votre code sur un faux site.",
  },
  {
    id: "p5",
    subject: "Rapport mensuel partagé avec vous : KPIs Février 2025",
    sender: "DataViz Pro",
    senderEmail: "noreply@datavizpro.io",
    preview: "Sophie Durand a partagé un rapport avec vous. 'KPIs Marketing - Février 2025' est accessible dans votre espace DataViz Pro...",
    isPhishing: false,
    clues: [
      { text: "Domaine officiel cohérent : datavizpro.io", isRed: false },
      { text: "Nom de collègue spécifique : Sophie Durand", isRed: false },
      { text: "Titre de document précis et contextualisé", isRed: false },
      { text: "Pas de demande de credential ni d'urgence", isRed: false },
    ],
    explanation: "Email légitime. Un nom de collègue réel + un titre de document précis sont des marqueurs d'authenticité. Aucune demande de données sensibles.",
  },
];

// ─── MODULE B : Password Audit ────────────────────────────────────────────────

interface PasswordScore {
  total: number; // 0-100
  length: number;
  uppercase: number;
  lowercase: number;
  numbers: number;
  symbols: number;
  entropy: number;
  label: "Très faible" | "Faible" | "Moyen" | "Fort" | "Très fort";
  color: string;
  recommendation: string;
}

function calculateEntropy(password: string): number {
  const chars = new Set(password.split("")).size;
  return Math.log2(Math.pow(chars, password.length));
}

function scorePassword(password: string): PasswordScore {
  const len = password.length;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNum = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const entropy = calculateEntropy(password);

  let total = 0;
  const lengthScore = Math.min(30, len * 2);
  const upperScore = hasUpper ? 15 : 0;
  const lowerScore = hasLower ? 10 : 0;
  const numScore = hasNum ? 15 : 0;
  const symbolScore = hasSymbol ? 20 : 0;
  const entropyScore = Math.min(10, Math.round(entropy / 10));

  total = lengthScore + upperScore + lowerScore + numScore + symbolScore + entropyScore;
  total = Math.min(100, total);

  let label: PasswordScore["label"] = "Très faible";
  let color = "bg-destructive";
  let recommendation = "Ce mot de passe est dangereux. Utilisez au moins 12 caractères avec majuscules, chiffres et symboles.";

  if (total >= 80) {
    label = "Très fort";
    color = "bg-green-500";
    recommendation = "Excellent ! Conservez ce niveau de complexité. Pensez à utiliser un gestionnaire de mots de passe.";
  } else if (total >= 60) {
    label = "Fort";
    color = "bg-emerald-500";
    recommendation = "Bon mot de passe. Ajoutez des symboles spéciaux pour encore plus de sécurité.";
  } else if (total >= 40) {
    label = "Moyen";
    color = "bg-yellow-500";
    recommendation = "Passable mais améliorable. Allongez-le et ajoutez des symboles (!@#$%).";
  } else if (total >= 20) {
    label = "Faible";
    color = "bg-orange-500";
    recommendation = "Mot de passe insuffisant. Minimum 12 caractères avec majuscules, chiffres ET symboles.";
  }

  return {
    total,
    length: lengthScore,
    uppercase: upperScore,
    lowercase: lowerScore,
    numbers: numScore,
    symbols: symbolScore,
    entropy: entropyScore,
    label,
    color,
    recommendation,
  };
}

// K-anonymity breach check via HaveIBeenPwned API
async function checkBreached(password: string): Promise<number> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    const prefix = hashHex.slice(0, 5);
    const suffix = hashHex.slice(5);

    const resp = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
    });
    if (!resp.ok) return 0;
    const text = await resp.text();
    const lines = text.split("\n");
    for (const line of lines) {
      const [hash, count] = line.trim().split(":");
      if (hash === suffix) return parseInt(count, 10);
    }
    return 0;
  } catch {
    return -1; // API unavailable
  }
}

// ─── MODULE C : Incident Checklist ────────────────────────────────────────────

interface ChecklistItem {
  id: string;
  text: string;
  priority: "high" | "medium" | "low";
  explanation: string;
}

const INCIDENT_CHECKLIST: ChecklistItem[] = [
  { id: "i1", priority: "high", text: "Déconnectez immédiatement le câble réseau / désactivez le Wi-Fi", explanation: "Isoler la machine coupe toute communication avec un éventuel attaquant C2 (Command & Control)." },
  { id: "i2", priority: "high", text: "NE PAS éteindre l'ordinateur", explanation: "La mémoire vive (RAM) contient des preuves forensiques volatiles qui seraient perdues à l'extinction." },
  { id: "i3", priority: "high", text: "Prenez une photo/screenshot de l'email ou du lien cliqué", explanation: "Cette preuve sera cruciale pour l'analyse ultérieure du vecteur d'attaque." },
  { id: "i4", priority: "high", text: "Alertez immédiatement votre responsable et/ou le DSI/RSSI", explanation: "La réponse à incident doit être coordinée. Ne gérez pas seul une potentielle compromission." },
  { id: "i5", priority: "high", text: "Changez vos mots de passe depuis un autre appareil sain", explanation: "Si un keylogger est actif, changer le MDP depuis la machine infectée serait inutile." },
  { id: "i6", priority: "medium", text: "Notez l'heure exacte du clic et les actions effectuées", explanation: "La timeline précise aide l'équipe de réponse à incident à comprendre l'étendue de la compromission." },
  { id: "i7", priority: "medium", text: "Vérifiez si vous avez entré des identifiants ou données sensibles", explanation: "Si oui, considérez tous les comptes associés comme compromis et agissez en priorité." },
  { id: "i8", priority: "medium", text: "Signalez le phishing sur votre messagerie (bouton 'Signaler')", explanation: "Protège vos collègues contre le même email et alerte les équipes de sécurité." },
  { id: "i9", priority: "low", text: "Conservez l'email original (ne le supprimez pas)", explanation: "L'email original contient des en-têtes techniques précieux pour l'investigation." },
  { id: "i10", priority: "low", text: "Documentez les symptômes observés (lenteur, pop-ups, etc.)", explanation: "Ces indicateurs comportementaux aident à classifier le type de malware potentiel." },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CyberLab() {
  const { profile } = useAuth();
  const [activeModule, setActiveModule] = useState<Module>("phishing");

  // Module A state
  const [phishingIndex, setPhishingIndex] = useState(0);
  const [phishingAnswers, setPhishingAnswers] = useState<Record<string, boolean>>({});
  const [phishingRevealed, setPhishingRevealed] = useState<Record<string, boolean>>({});
  const [phishingDone, setPhishingDone] = useState(false);

  // Module B state
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordScore, setPasswordScore] = useState<PasswordScore | null>(null);
  const [breachCount, setBreachCount] = useState<number | null>(null);
  const [breachChecking, setBreachChecking] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Module C state
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [incidentDone, setIncidentDone] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Proof saving
  const [savedProofs, setSavedProofs] = useState<Set<Module>>(new Set());

  // ── Module A logic ─────────────────────────────────────────────────────────

  const currentEmail = PHISHING_EXAMPLES[phishingIndex];

  const handlePhishingVerdict = (isPhishing: boolean) => {
    setPhishingAnswers((prev) => ({ ...prev, [currentEmail.id]: isPhishing }));
    setPhishingRevealed((prev) => ({ ...prev, [currentEmail.id]: true }));
  };

  const phishingScore = useCallback(() => {
    let correct = 0;
    PHISHING_EXAMPLES.forEach((e) => {
      if (phishingAnswers[e.id] === e.isPhishing) correct++;
    });
    return Math.round((correct / PHISHING_EXAMPLES.length) * 10);
  }, [phishingAnswers]);

  const finishPhishing = useCallback(async () => {
    if (savedProofs.has("phishing")) return;
    const score = phishingScore();
    setPhishingDone(true);
    try {
      await supabase.from("proofs").insert({
        user_id: profile!.id,
        type: "cyber_lab_phishing",
        score: score * 10,
        metadata: { module: "phishing_recon", answers: Object.keys(phishingAnswers).length, correct: score },
      });
      setSavedProofs((prev) => new Set([...prev, "phishing"]));
    } catch { /* ignore */ }
  }, [phishingAnswers, phishingScore, profile, savedProofs]);

  // ── Module B logic ─────────────────────────────────────────────────────────

  const handlePasswordAnalyze = useCallback(async () => {
    if (!passwordInput.trim()) return;
    const score = scorePassword(passwordInput);
    setPasswordScore(score);
    setBreachCount(null);
    setBreachChecking(true);
    const count = await checkBreached(passwordInput);
    setBreachCount(count);
    setBreachChecking(false);

    if (profile && !savedProofs.has("password")) {
      await supabase.from("proofs").insert({
        user_id: profile.id,
        type: "cyber_lab_password",
        score: score.total,
        metadata: { label: score.label, length: passwordInput.length },
      }).then(() => setSavedProofs((prev) => new Set([...prev, "password"])));
    }
  }, [passwordInput, profile, savedProofs]);

  // ── Module C logic ─────────────────────────────────────────────────────────

  const toggleItem = (id: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const incidentScore = Math.round((checkedItems.size / INCIDENT_CHECKLIST.length) * 100);

  const handleIncidentFinish = useCallback(async () => {
    if (savedProofs.has("incident")) return;
    setIncidentDone(true);
    try {
      await supabase.from("proofs").insert({
        user_id: profile!.id,
        type: "cyber_lab_incident",
        score: incidentScore,
        metadata: { items_checked: checkedItems.size, total: INCIDENT_CHECKLIST.length },
      });
      setSavedProofs((prev) => new Set([...prev, "incident"]));
    } catch { /* ignore */ }
  }, [incidentScore, checkedItems, profile, savedProofs]);

  const handleDownloadIncidentPdf = useCallback(async () => {
    if (downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-pdf`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: "checklist",
            artifact_title: "Rapport d'Incident Simulé — Cyber Lab",
            checklist_items: INCIDENT_CHECKLIST.map((item) => ({
              text: item.text,
              checked: checkedItems.has(item.id),
            })),
            score: incidentScore,
            full_name: profile?.full_name ?? "Utilisateur",
          }),
        }
      );
      const data = await resp.json();
      if (data.pdf_base64) {
        const bytes = Uint8Array.from(atob(data.pdf_base64), (c) => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "rapport-incident-simule.pdf";
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "PDF téléchargé !", description: "Votre rapport d'incident simulé est prêt." });
      }
      if (data.pdf_url && profile) {
        await supabase.from("proofs").update({ pdf_url: data.pdf_url }).eq("user_id", profile.id).eq("type", "cyber_lab_incident");
      }
    } catch {
      toast({ title: "Erreur", description: "Impossible de générer le PDF.", variant: "destructive" });
    }
    setDownloadingPdf(false);
  }, [checkedItems, downloadingPdf, incidentScore, profile]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const MODULES: { id: Module; label: string; icon: typeof Shield; desc: string }[] = [
    { id: "phishing", label: "Phishing Recon", icon: Eye, desc: "Reconnaître 5 emails suspects" },
    { id: "password", label: "Audit MDP", icon: KeyRound, desc: "Analyser la robustesse d'un mot de passe" },
    { id: "incident", label: "Plan d'Incident", icon: AlertTriangle, desc: "Checklist réponse à incident" },
  ];

  return (
    <>
      <Helmet>
        <title>Cyber Lab — Formetoialia</title>
        <meta name="description" content="3 exercices pratiques de cybersécurité : phishing, mots de passe, réponse à incident." />
      </Helmet>

      <div className="min-h-screen bg-background px-4 py-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Cyber Lab</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Entraînement Cybersécurité</h1>
          <p className="text-sm text-muted-foreground mt-1">3 modules pratiques · Preuve générée à chaque complétion</p>
        </div>

        {/* Module selector */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {MODULES.map((m) => {
            const Icon = m.icon;
            const done = savedProofs.has(m.id) ||
              (m.id === "phishing" && phishingDone) ||
              (m.id === "incident" && incidentDone);
            return (
              <button
                key={m.id}
                onClick={() => setActiveModule(m.id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                  activeModule === m.id
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "bg-card border-border/40 text-muted-foreground hover:border-border"
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {done && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-green-500 flex items-center justify-center">
                      <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-semibold leading-tight">{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── MODULE A: Phishing ── */}
        {activeModule === "phishing" && (
          <div className="space-y-4">
            {!phishingDone ? (
              <>
                {/* Progress */}
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Email {phishingIndex + 1} / {PHISHING_EXAMPLES.length}</span>
                  <span>{Object.keys(phishingAnswers).length} répondu(s)</span>
                </div>
                <Progress value={((phishingIndex) / PHISHING_EXAMPLES.length) * 100} className="h-1.5 mb-4" />

                {/* Email card */}
                <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
                  <div className="px-4 py-3 bg-muted/20 border-b border-border/40">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-foreground">{currentEmail.sender}</span>
                      <span className="text-xs text-muted-foreground font-mono">&lt;{currentEmail.senderEmail}&gt;</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{currentEmail.subject}</p>
                  </div>
                  <div className="px-4 py-4">
                    <p className="text-sm text-foreground/80 leading-relaxed italic mb-4">
                      "{currentEmail.preview}"
                    </p>

                    {/* Verdict buttons or result */}
                    {!phishingRevealed[currentEmail.id] ? (
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          className="flex-1 border-destructive/50 text-destructive hover:bg-destructive/10"
                          onClick={() => handlePhishingVerdict(true)}
                        >
                          <AlertTriangle className="w-4 h-4 mr-1.5" />
                          Phishing !
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 border-green-500/50 text-green-500 hover:bg-green-500/10"
                          onClick={() => handlePhishingVerdict(false)}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1.5" />
                          Légitime
                        </Button>
                      </div>
                    ) : (
                      <div className={`rounded-xl p-3 ${
                        phishingAnswers[currentEmail.id] === currentEmail.isPhishing
                          ? "bg-green-500/10 border border-green-500/30"
                          : "bg-destructive/10 border border-destructive/30"
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          {phishingAnswers[currentEmail.id] === currentEmail.isPhishing ? (
                            <><CheckCircle2 className="w-4 h-4 text-green-500" /><span className="text-sm font-semibold text-green-600 dark:text-green-400">Bonne réponse !</span></>
                          ) : (
                            <><XCircle className="w-4 h-4 text-destructive" /><span className="text-sm font-semibold text-destructive">Mauvaise réponse</span></>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto">
                            {currentEmail.isPhishing ? "⚠️ C'était un phishing" : "✅ C'était légitime"}
                          </span>
                        </div>
                        <p className="text-xs text-foreground/80 leading-relaxed mb-3">{currentEmail.explanation}</p>
                        <div className="space-y-1">
                          {currentEmail.clues.map((clue, i) => (
                            <div key={i} className={`flex items-start gap-1.5 text-xs ${clue.isRed ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
                              {clue.isRed ? <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> : <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />}
                              {clue.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={phishingIndex === 0}
                    onClick={() => setPhishingIndex((i) => i - 1)}
                    className="flex-1"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Précédent
                  </Button>
                  {phishingIndex < PHISHING_EXAMPLES.length - 1 ? (
                    <Button
                      size="sm"
                      onClick={() => setPhishingIndex((i) => i + 1)}
                      className="flex-1"
                    >
                      Suivant <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={finishPhishing}
                      disabled={Object.keys(phishingAnswers).length < PHISHING_EXAMPLES.length}
                      className="flex-1 bg-primary"
                    >
                      <Trophy className="w-4 h-4 mr-1" /> Voir mon score
                    </Button>
                  )}
                </div>
                {phishingIndex === PHISHING_EXAMPLES.length - 1 && Object.keys(phishingAnswers).length < PHISHING_EXAMPLES.length && (
                  <p className="text-xs text-center text-muted-foreground">Répondez à tous les emails pour voir votre score</p>
                )}
              </>
            ) : (
              /* Score screen */
              <div className="text-center space-y-4 py-4">
                <div className="w-20 h-20 rounded-full bg-primary/10 border-4 border-primary/30 flex items-center justify-center mx-auto">
                  <span className="text-3xl font-bold text-primary">{phishingScore()}/10</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-1">
                    {phishingScore() >= 8 ? "🎯 Expert Détection !" : phishingScore() >= 6 ? "👍 Bon travail !" : "📚 À améliorer"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {phishingScore() >= 8
                      ? "Vous avez l'œil pour repérer les tentatives de phishing."
                      : "Continuez à pratiquer — chaque email analysé renforce vos réflexes."}
                  </p>
                </div>
                <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
                  <p className="text-xs text-muted-foreground">✅ Preuve enregistrée dans votre profil</p>
                </div>
                <Button variant="outline" onClick={() => { setPhishingAnswers({}); setPhishingRevealed({}); setPhishingIndex(0); setPhishingDone(false); }}>
                  <RotateCcw className="w-4 h-4 mr-1.5" /> Recommencer
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── MODULE B: Password ── */}
        {activeModule === "password" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/50 bg-card p-5">
              <h2 className="text-base font-semibold text-foreground mb-1">🔑 Audit de Mot de Passe</h2>
              <p className="text-xs text-muted-foreground mb-4">
                Analyse 100% locale + vérification k-anonymity (seuls les 5 premiers caractères du hash SHA-1 sont envoyés).
              </p>

              {/* Input */}
              <div className="relative mb-4">
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordInput}
                  onChange={(e) => { setPasswordInput(e.target.value); setPasswordScore(null); setBreachCount(null); }}
                  placeholder="Entrez un mot de passe à tester..."
                  className="w-full h-11 rounded-xl border border-border/60 bg-input/50 px-4 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>

              <Button
                className="w-full"
                onClick={handlePasswordAnalyze}
                disabled={!passwordInput.trim() || breachChecking}
              >
                {breachChecking ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Vérification...</> : <><Zap className="w-4 h-4 mr-2" />Analyser</>}
              </Button>

              {passwordScore && (
                <div className="mt-5 space-y-4">
                  {/* Score gauge */}
                  <div className="flex items-center gap-3">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg ${passwordScore.color}`}>
                      {passwordScore.total}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{passwordScore.label}</p>
                      <p className="text-xs text-muted-foreground">Score de robustesse</p>
                    </div>
                  </div>

                  {/* Detail bars */}
                  <div className="space-y-2">
                    {[
                      { label: "Longueur", val: passwordScore.length, max: 30 },
                      { label: "Majuscules", val: passwordScore.uppercase, max: 15 },
                      { label: "Chiffres", val: passwordScore.numbers, max: 15 },
                      { label: "Symboles", val: passwordScore.symbols, max: 20 },
                      { label: "Entropie", val: passwordScore.entropy, max: 10 },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-20 shrink-0">{item.label}</span>
                        <Progress value={(item.val / item.max) * 100} className="h-1.5 flex-1" />
                        <span className="text-xs font-medium text-foreground w-8 text-right">{item.val}/{item.max}</span>
                      </div>
                    ))}
                  </div>

                  {/* Breach check result */}
                  {breachCount !== null && (
                    <div className={`rounded-xl p-3 text-sm ${
                      breachCount === 0
                        ? "bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400"
                        : breachCount > 0
                        ? "bg-destructive/10 border border-destructive/30 text-destructive"
                        : "bg-muted/50 border border-border/40 text-muted-foreground"
                    }`}>
                      {breachCount === 0 && "✅ Non trouvé dans les bases de données de fuites connues"}
                      {breachCount > 0 && `⚠️ Ce mot de passe apparaît dans ${breachCount.toLocaleString()} fuites de données ! Changez-le immédiatement.`}
                      {breachCount === -1 && "ℹ️ Vérification offline impossible (API indisponible)"}
                    </div>
                  )}

                  {/* Recommendation */}
                  <div className="rounded-xl bg-primary/5 border border-primary/20 p-3">
                    <p className="text-xs font-semibold text-primary mb-1">💡 Recommandation</p>
                    <p className="text-xs text-foreground/80">{passwordScore.recommendation}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MODULE C: Incident ── */}
        {activeModule === "incident" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
              <div className="bg-destructive/10 border-b border-destructive/20 px-5 py-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-semibold text-destructive">Scénario d'incident</span>
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed">
                  Vous avez cliqué sur un lien dans un email suspect. L'URL vous a redirigé vers une page de connexion qui ressemblait à votre messagerie professionnelle. <strong>Que faites-vous ?</strong>
                </p>
              </div>

              <div className="px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground">{checkedItems.size}/{INCIDENT_CHECKLIST.length} actions effectuées</span>
                  <span className="text-xs font-semibold text-foreground">{incidentScore}%</span>
                </div>
                <Progress value={incidentScore} className="h-1.5 mb-4" />

                <div className="space-y-2">
                  {INCIDENT_CHECKLIST.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-start gap-3 p-3 rounded-xl border border-border/40 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
                    >
                      <Checkbox
                        checked={checkedItems.has(item.id)}
                        onCheckedChange={() => toggleItem(item.id)}
                        className="mt-0.5 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {item.priority === "high" && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive border border-destructive/30">URGENT</span>}
                          {item.priority === "medium" && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-500 border border-orange-500/30">IMPORTANT</span>}
                        </div>
                        <p className={`text-sm text-foreground leading-snug ${checkedItems.has(item.id) ? "line-through text-muted-foreground" : ""}`}>{item.text}</p>
                        {checkedItems.has(item.id) && (
                          <p className="text-xs text-muted-foreground mt-1 italic">{item.explanation}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                <div className="flex gap-2 mt-4">
                  {!incidentDone ? (
                    <Button
                      className="flex-1"
                      onClick={handleIncidentFinish}
                      disabled={checkedItems.size < 4}
                    >
                      <Lock className="w-4 h-4 mr-1.5" />
                      Terminer l'exercice
                    </Button>
                  ) : (
                    <Button
                      className="flex-1"
                      onClick={handleDownloadIncidentPdf}
                      disabled={downloadingPdf}
                      variant="outline"
                    >
                      {downloadingPdf ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
                      {downloadingPdf ? "Génération..." : "Télécharger le Rapport PDF"}
                    </Button>
                  )}
                </div>

                {checkedItems.size < 4 && !incidentDone && (
                  <p className="text-xs text-center text-muted-foreground mt-2">Cochez au moins 4 actions pour terminer</p>
                )}

                {incidentDone && (
                  <div className="mt-3 rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
                    <p className="text-xs font-semibold text-primary mb-0.5">Score : {incidentScore}% — {incidentScore >= 70 ? "🏆 Excellent !" : "📚 Continuez à pratiquer"}</p>
                    <p className="text-xs text-muted-foreground">✅ Preuve enregistrée dans votre profil</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
