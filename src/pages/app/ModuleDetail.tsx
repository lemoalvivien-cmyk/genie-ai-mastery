import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Brain, Clock, ChevronLeft, Star, AlertTriangle, CheckCircle2,
  Lightbulb, BookOpen, ExternalLink, PlayCircle, Loader2, Download,
} from "lucide-react";
import { useModule, useModuleQuiz, useUserProgress, useSaveProgress } from "@/hooks/useModules";
import { QuizPlayer } from "@/components/modules/QuizPlayer";
import { PdfDownloadButton } from "@/components/pdf/PdfDownloadButton";
import { useUpsertUserSkills } from "@/hooks/useSkills";
import { supabase } from "@/integrations/supabase/client";
import { ELI10Button } from "@/components/jarvis/ELI10Button";
import { useSkillMastery } from "@/hooks/useSkillMastery";
import { DEMO_PLAYBOOKS, getPlaybookMeta as getPlaybookMetaData } from "@/data/playbooks";
import { useEffect, useRef } from "react";
import { toast } from "@/components/ui/use-toast";
import { AdversarialExerciseWidget } from "@/components/modules/AdversarialExerciseWidget";

const DOMAIN_CONFIG: Record<string, { label: string; cls: string }> = {
  ia_pro: { label: "IA Pro", cls: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" },
  ia_perso: { label: "IA Perso", cls: "bg-pink-500/20 text-pink-300 border-pink-500/30" },
  cyber: { label: "Cyber", cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  vibe_coding: { label: "Vibe Coding", cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
};
const LEVEL_CONFIG = {
  debutant: { label: "Débutant", cls: "bg-green-500/10 text-green-400 border-green-500/20" },
  intermediaire: { label: "Intermédiaire", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  avance: { label: "Avancé", cls: "bg-red-500/10 text-red-400 border-red-500/20" },
};

export default function ModuleDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [quizOpen, setQuizOpen] = useState(false);
  const [attestationUrl, setAttestationUrl] = useState<string | null>(null);
  const [generatingAttestation, setGeneratingAttestation] = useState(false);
  const attestationTriggeredRef = useRef(false);

  const { data: mod, isLoading, isError } = useModule(slug!);
  const { data: quiz } = useModuleQuiz(mod?.id ?? "");
  const { data: progressMap } = useUserProgress(mod?.id ? [mod.id] : undefined);
  const saveProgress = useSaveProgress();
  const upsertSkills = useUpsertUserSkills();

  // Extract skill_ids from module content_json
  const skillIds: string[] = mod
    ? ((mod.content_json as unknown as { skill_tags?: Array<{ skill_id: string }> })?.skill_tags ?? []).map((t) => t.skill_id)
    : [];

  const progress = mod ? progressMap?.[mod.id] : undefined;

  const { data: masteryList } = useSkillMastery(skillIds);
  const allMastered = skillIds.length > 0 && masteryList?.length === skillIds.length &&
    masteryList.every((m) => m.p_mastery >= 0.99);

  // Auto-trigger attestation when all skills mastered
  useEffect(() => {
    if (!allMastered || !mod || attestationTriggeredRef.current || generatingAttestation) return;
    if (progress?.status === "completed") return; // already done
    attestationTriggeredRef.current = true;
    setGeneratingAttestation(true);

    supabase.functions.invoke("generate-pdf", {
      body: {
        type: "attestation",
        module_id: mod.id,
        base_url: window.location.origin,
      },
    }).then(({ data, error }) => {
      if (error || !data?.success) {
        return;
      }
      if (data.signed_url) setAttestationUrl(data.signed_url);
      toast({
        title: "🎓 Maîtrise complète !",
        description: "Toutes les compétences du module sont maîtrisées. Votre attestation est prête.",
      });
    }).finally(() => setGeneratingAttestation(false));
  }, [allMastered, mod, progress?.status, generatingAttestation]);

  const domain = mod ? DOMAIN_CONFIG[mod.domain] : null;
  const level = mod ? LEVEL_CONFIG[mod.level] : null;

  const confidenceColor =
    !mod ? "" :
    mod.confidence_score >= 0.80 ? "bg-emerald text-emerald" :
    mod.confidence_score >= 0.60 ? "bg-amber-500 text-amber-500" :
    "bg-destructive text-destructive";

  const handleStartModule = async () => {
    if (!mod || progress?.status === "completed") return;
    await saveProgress.mutateAsync({ module_id: mod.id, status: "in_progress" });
  };

  if (isLoading) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (isError || !mod) return (
    <div className="flex min-h-screen items-center justify-center bg-background flex-col gap-4">
      <p className="text-muted-foreground">Playbook introuvable.</p>
      <Link to="/app/modules" className="text-primary hover:underline">← Retour aux playbooks</Link>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>{mod.title} – Formetoialia</title>
        <meta name="description" content={mod.description ?? mod.subtitle ?? ""} />
      </Helmet>

      {quizOpen && quiz && (
        <QuizPlayer
          quiz={quiz}
          module={mod}
          onClose={() => setQuizOpen(false)}
          onComplete={async (score, answers) => {
            await saveProgress.mutateAsync({
              module_id: mod.id,
              status: score >= quiz.passing_score ? "completed" : "failed",
              score,
              quiz_answers: answers,
            });
            // Upsert user_skills from module's skill_tags if present
            const skillTags: Array<{ skill_id: string; weight?: number }> =
              (mod.content_json as unknown as { skill_tags?: Array<{ skill_id: string; weight?: number }> })?.skill_tags ?? [];
            if (skillTags.length > 0) {
              // Score contribution proportional to quiz score * weight (default 1)
              const skillsToUpsert = skillTags.map((tag) => ({
                skill_id: tag.skill_id,
                score: Math.round(score * (tag.weight ?? 1)),
              }));
              await upsertSkills.mutateAsync(skillsToUpsert);
            } else {
              // Fallback: map module domain to domain skills via DB
              const { data: domainSkills } = await supabase
                .from("skills")
                .select("id")
                .eq("domain", mod.domain)
                .limit(3);
              if (domainSkills?.length) {
                await upsertSkills.mutateAsync(
                  domainSkills.map((s) => ({ skill_id: s.id, score }))
                );
              }
            }
            setQuizOpen(false);
          }}
        />
      )}

      <div className="min-h-screen gradient-hero">
        {/* Navbar */}
        <header className="border-b border-border/40 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/app/modules")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-4 h-4" /> Playbooks
            </button>
          </div>
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
              <Brain className="w-4 h-4 text-primary-foreground" />
            </div>
          </Link>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main content 65% */}
            <div className="flex-1 min-w-0">
              {/* Title block */}
              <div className="mb-6">
                <div className="flex flex-wrap gap-2 mb-3">
                  {domain && <span className={`px-2.5 py-1 rounded-full border text-xs font-medium ${domain.cls}`}>{domain.label}</span>}
                  {level && <span className={`px-2.5 py-1 rounded-full border text-xs ${level.cls}`}>{level.label}</span>}
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-border/50 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" /> {mod.duration_minutes} min
                  </span>
                  {mod.is_gold && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-xs text-amber-400">
                      <Star className="w-3 h-3" /> Gold
                    </span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">{mod.title}</h1>
                {mod.subtitle && <p className="text-muted-foreground text-lg">{mod.subtitle}</p>}

                {/* Confidence score */}
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Fiabilité :</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${confidenceColor.split(" ")[0]}`}
                        style={{ width: `${mod.confidence_score * 100}%` }}
                      />
                    </div>
                    <span className={`text-sm font-semibold font-mono ${confidenceColor.split(" ")[1]}`}>
                      {Math.round(mod.confidence_score * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Module content */}
              <div className="space-y-8">
                {mod.content_json.sections.map((section, idx) => (
                  <div key={idx} className="space-y-4">
                    <h2 className="text-xl font-bold text-foreground border-b border-border/40 pb-2">{section.title}</h2>

                    {/* Body text + ELI10 */}
                    <div className="text-muted-foreground leading-relaxed whitespace-pre-line">{section.body}</div>
                    <ELI10Button text={section.body} className="mt-2" />

                    {/* Examples */}
                    {section.examples?.map((ex, ei) => (
                      <div key={ei} className="rounded-xl border-l-4 border-primary bg-primary/5 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
                          <span className="text-sm font-semibold text-primary">{ex.title}</span>
                        </div>
                        <pre className="text-sm text-foreground/90 whitespace-pre-wrap font-mono leading-relaxed">{ex.content}</pre>
                      </div>
                    ))}

                    {/* Key points */}
                    {section.key_points && section.key_points.length > 0 && (
                      <div className="rounded-xl border-l-4 border-emerald bg-emerald/5 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle2 className="w-4 h-4 text-emerald flex-shrink-0" aria-hidden="true" />
                          <span className="text-sm font-semibold text-emerald">Points clés</span>
                        </div>
                        <ul className="space-y-1.5">
                          {section.key_points.map((kp, ki) => (
                            <li key={ki} className="flex items-start gap-2 text-sm text-foreground/90">
                              <span className="text-emerald mt-0.5 flex-shrink-0">✓</span>
                              <span>{kp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Warning */}
                    {section.warning && (
                      <div className="rounded-xl border-l-4 border-destructive bg-destructive/5 p-4">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" aria-hidden="true" />
                          <div>
                            <div className="text-sm font-semibold text-destructive mb-1">⚠ Attention</div>
                            <p className="text-sm text-foreground/90">{section.warning}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Sources */}
              {mod.sources && mod.sources.length > 0 && (
                <div className="mt-10 pt-6 border-t border-border/40">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Sources</h2>
                  <ul className="space-y-2">
                    {mod.sources.map((s, i) => (
                      <li key={i}>
                        <a href={s.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline">
                          <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                          {s.title} {s.date && <span className="text-muted-foreground">({s.date})</span>}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Quiz / Validation CTA */}
              {quiz && (
                <div className="mt-10 p-6 rounded-2xl border border-primary/30 bg-primary/5 text-center">
                  <h2 className="text-lg font-bold mb-1">Validez votre mise en pratique</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    {quiz.questions.length} questions · Score requis : {quiz.passing_score}%
                    {quiz.time_limit_seconds && ` · ${quiz.time_limit_seconds / 60} min`}
                  </p>
                  <button
                    onClick={() => { handleStartModule(); setQuizOpen(true); }}
                    className="inline-flex items-center gap-2 px-8 py-3 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-90 hover:scale-[1.02] transition-all duration-200"
                  >
                    <PlayCircle className="w-5 h-5" /> Valider mes acquis
                  </button>
                </div>
              )}
            </div>

            {/* Sidebar 35% */}
            <aside className="lg:w-80 xl:w-96 flex-shrink-0 space-y-4">
              {/* Progress card */}
              <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5 shadow-card">
                <h2 className="font-semibold mb-3">Votre progression</h2>
                {progress ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Statut</span>
                      <span className={`font-medium capitalize ${progress.status === "completed" ? "text-emerald" : "text-primary"}`}>
                        {progress.status === "completed" ? "✓ Terminé" : progress.status === "in_progress" ? "En cours" : "Non commencé"}
                      </span>
                    </div>
                    {progress.score !== null && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Score</span>
                        <span className="font-mono font-semibold text-foreground">{progress.score}%</span>
                      </div>
                    )}
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${progress.status === "completed" ? "bg-emerald" : "gradient-primary"}`}
                        style={{ width: progress.status === "completed" ? "100%" : progress.score != null ? `${Math.min(100, Math.max(10, progress.score))}%` : "10%" }} />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Pas encore commencé.</p>
                )}
              </div>

              {/* Auto-attestation from skill mastery */}
              {(attestationUrl || generatingAttestation) && (
                <div className="rounded-2xl border border-primary/40 bg-primary/5 p-5 shadow-card animate-fade-in">
                  <h2 className="font-semibold mb-1 flex items-center gap-2">
                    🎓 Attestation de maîtrise
                  </h2>
                  <p className="text-xs text-muted-foreground mb-3">
                    Toutes les compétences de ce playbook sont maîtrisées.
                  </p>
                  {generatingAttestation ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" /> Génération en cours…
                    </div>
                  ) : (
                    <a
                      href={attestationUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold shadow-glow hover:opacity-90 transition-all"
                    >
                      <Download className="w-4 h-4" /> Télécharger l'attestation
                    </a>
                  )}
                </div>
              )}

              {/* Next playbook recommendation (post-completion) */}
              {progress?.status === "completed" && (() => {
                const currentMeta = getPlaybookMetaData(mod.slug);
                const next = DEMO_PLAYBOOKS.find(
                  (p) => p.slug !== mod.slug &&
                    (currentMeta ? p.category === currentMeta.category : true)
                );
                if (!next) return null;
                return (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 shadow-card animate-fade-in">
                    <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
                      ✓ Livrable généré — prochain playbook
                    </p>
                    <Link
                      to={`/app/modules/${next.slug}`}
                      className="group flex items-start gap-3 hover:opacity-90 transition-opacity"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
                          {next.deliverable}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{next.problem}</p>
                        <p className="text-xs text-emerald-400 mt-1 font-medium">→ {next.result}</p>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-muted-foreground rotate-180 shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
                    </Link>
                  </div>
                );
              })()}

              {/* Adversarial Exercise */}
              <AdversarialExerciseWidget
                moduleTitle={mod.title}
                moduleDomain={mod.domain}
                moduleSlug={mod.slug}
              />

              {/* Deliverables */}
              {mod.deliverables.length > 0 && (
                <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5 shadow-card">
                  <h2 className="font-semibold mb-3">Livrables disponibles</h2>
                  <ul className="space-y-2">
                    {mod.deliverables.map((d, i) => (
                      <li key={i}>
                        <PdfDownloadButton
                          type={d.type as "checklist" | "charte" | "sop" | "attestation"}
                          label={d.title}
                          moduleId={mod.id}
                          locked={progress?.status !== "completed"}
                          disabled={progress?.status !== "completed"}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* KITT contextual assistant */}
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-card">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Brain className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <h2 className="font-semibold text-sm">Aide KITT sur ce playbook</h2>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Besoin d'aide pour reformuler, adapter le ton ou améliorer votre résultat ?
                </p>
                <a
                  href={`/app/chat?context=${encodeURIComponent(`playbook:${mod.slug}:${mod.title}`)}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/10 transition-all"
                >
                  <Brain className="w-4 h-4" />
                  Demander à KITT
                </a>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </>
  );
}
