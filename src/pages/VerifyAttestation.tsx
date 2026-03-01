import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Brain, Loader2, ArrowRight, Calendar, Award } from "lucide-react";

interface AttestationDetail {
  id: string;
  user_id: string;
  score_average: number | null;
  modules_completed: { title: string; score: number; completed_at: string }[];
  generated_at: string | null;
  valid_until: string | null;
  profiles?: { full_name: string | null; email: string } | null;
  organizations?: { name: string } | null;
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function VerifyAttestation() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery<AttestationDetail | null>({
    queryKey: ["attestation-verify", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("attestations")
        .select(`
          id, user_id, score_average, modules_completed, generated_at, valid_until,
          profiles:user_id ( full_name, email ),
          organizations:org_id ( name )
        `)
        .eq("id", id)
        .maybeSingle();
      if (error) return null;
      return data as AttestationDetail | null;
    },
    enabled: !!id,
    retry: false,
  });

  const isValid = data && data.valid_until && new Date(data.valid_until) > new Date();

  return (
    <>
      <Helmet>
        <title>Vérification d'attestation – GENIE IA</title>
        <meta name="description" content="Vérifiez l'authenticité d'une attestation de formation GENIE IA." />
      </Helmet>

      <div className="min-h-screen gradient-hero flex flex-col">
        {/* Navbar */}
        <header className="border-b border-border/40 px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
              <Brain className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold">GENIE <span className="text-gradient">IA</span></span>
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-lg">
            {isLoading ? (
              <div className="flex flex-col items-center gap-4 p-12">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-muted-foreground text-sm">Vérification en cours…</p>
              </div>
            ) : !data || !isValid ? (
              /* ── Invalid / not found ── */
              <div className="rounded-2xl border border-destructive/30 bg-card/80 backdrop-blur-sm p-8 text-center shadow-card">
                <div className="w-16 h-16 rounded-full bg-destructive/10 border-2 border-destructive/30 flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8 text-destructive" />
                </div>
                <h1 className="text-xl font-bold mb-2 text-destructive">Attestation introuvable</h1>
                <p className="text-muted-foreground text-sm mb-6">
                  {!data
                    ? "Cette attestation n'existe pas ou l'identifiant est invalide."
                    : "Cette attestation a expiré."}
                </p>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold shadow-glow hover:opacity-90 transition-all"
                >
                  Commencer la formation gratuitement <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              /* ── Valid attestation ── */
              <div className="rounded-2xl border border-emerald/30 bg-card/80 backdrop-blur-sm overflow-hidden shadow-card">
                {/* Green header */}
                <div className="bg-emerald/10 border-b border-emerald/20 p-6 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-emerald/15 border-2 border-emerald/40 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-7 h-7 text-emerald" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-emerald">Attestation valide ✓</h1>
                    <p className="text-sm text-muted-foreground">Délivrée par GENIE IA</p>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                  {/* Beneficiary */}
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Bénéficiaire</p>
                    <p className="font-bold text-lg">{data.profiles?.full_name ?? "—"}</p>
                    {data.organizations?.name && (
                      <p className="text-sm text-muted-foreground">{data.organizations.name}</p>
                    )}
                  </div>

                  {/* Dates row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl bg-secondary/30">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Calendar className="w-3 h-3" /> Délivrée le
                      </div>
                      <p className="text-sm font-medium">{formatDate(data.generated_at)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary/30">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Calendar className="w-3 h-3" /> Valable jusqu'au
                      </div>
                      <p className="text-sm font-medium">{formatDate(data.valid_until)}</p>
                    </div>
                  </div>

                  {/* Score */}
                  {data.score_average !== null && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
                      <Award className="w-5 h-5 text-primary flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Score moyen</p>
                        <p className="font-bold text-xl font-mono text-gradient">{data.score_average}%</p>
                      </div>
                    </div>
                  )}

                  {/* Modules */}
                  {Array.isArray(data.modules_completed) && data.modules_completed.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Modules complétés</p>
                      <ul className="space-y-2">
                        {(data.modules_completed as { title: string; score: number; completed_at: string }[]).map((m, i) => (
                          <li key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-card/40 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-emerald">✓</span>
                              <span className="font-medium">{m.title}</span>
                            </div>
                            <span className="text-muted-foreground font-mono text-xs">{m.score}%</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Attestation ID */}
                  <p className="text-[10px] text-muted-foreground/60 font-mono break-all">
                    ID : {data.id}
                  </p>
                </div>

                {/* CTA footer */}
                <div className="border-t border-border/40 bg-secondary/20 px-6 py-4 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Formez aussi votre équipe à l'IA et à la cybersécurité
                  </p>
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold shadow-glow hover:opacity-90 transition-all"
                  >
                    Essai gratuit — Commencer maintenant <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
