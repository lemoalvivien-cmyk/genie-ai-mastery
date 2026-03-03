import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle2, XCircle, Brain, Loader2, ArrowRight,
  Calendar, Award, Shield, Users, BookOpen, Zap,
} from "lucide-react";

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

const LANDING_URL = "https://genie-ia.app";
const APP_NAME = "GENIE IA";

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
  const holderName = data?.profiles?.full_name ?? "Apprenant";
  const orgName = data?.organizations?.name;
  const moduleCount = Array.isArray(data?.modules_completed) ? data.modules_completed.length : 0;

  // JSON-LD structured data
  const jsonLd = isValid ? {
    "@context": "https://schema.org",
    "@type": "EducationalOccupationalCredential",
    "name": `Attestation de Formation ${APP_NAME}`,
    "description": `Attestation de formation en IA et Cybersécurité délivrée par ${APP_NAME} à ${holderName}`,
    "credentialCategory": "Certificate",
    "educationalLevel": "Professional",
    "recognizedBy": {
      "@type": "Organization",
      "name": APP_NAME,
      "url": LANDING_URL,
    },
    "validFrom": data?.generated_at ?? undefined,
    "validUntil": data?.valid_until ?? undefined,
    "about": {
      "@type": "Person",
      "name": holderName,
      ...(orgName ? { "worksFor": { "@type": "Organization", "name": orgName } } : {}),
    },
  } : null;

  return (
    <>
      <Helmet>
        <title>
          {isValid
            ? `Attestation validée — ${holderName} | ${APP_NAME}`
            : `Vérification d'attestation | ${APP_NAME}`}
        </title>
        <meta
          name="description"
          content={isValid
            ? `Attestation de formation en IA & Cybersécurité de ${holderName} — vérifiée et authentique. Délivrée par ${APP_NAME}.`
            : `Vérifiez l'authenticité d'une attestation de formation ${APP_NAME} en IA et cybersécurité.`}
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`${LANDING_URL}/verify/${id}`} />
        {/* OG */}
        <meta property="og:title" content={isValid ? `Attestation de ${holderName} — ${APP_NAME}` : `Vérification | ${APP_NAME}`} />
        <meta property="og:description" content={`Formation IA & Cybersécurité — ${moduleCount} module(s) complété(s), score moyen ${data?.score_average ?? "—"}%`} />
        <meta property="og:type" content="article" />
        {jsonLd && (
          <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        )}
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        {/* Minimal navbar */}
        <header className="border-b border-border/40 px-4 sm:px-6 py-4 flex items-center justify-between bg-card/80 backdrop-blur-sm">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
              <Brain className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">
              {APP_NAME} <span className="text-gradient">IA</span>
            </span>
          </Link>
          <Link
            to="/register"
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold shadow-glow hover:opacity-90 transition-all"
          >
            Essai gratuit <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </header>

        <main className="flex-1 flex flex-col items-center justify-start px-4 py-10 sm:py-16">
          <div className="w-full max-w-xl">

            {/* Loading */}
            {isLoading && (
              <div className="flex flex-col items-center gap-4 py-20">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-muted-foreground text-sm">Vérification en cours…</p>
              </div>
            )}

            {/* Invalid / not found */}
            {!isLoading && (!data || !isValid) && (
              <div className="rounded-2xl border border-destructive/30 bg-card/80 backdrop-blur-sm p-8 text-center shadow-card">
                <div className="w-16 h-16 rounded-full bg-destructive/10 border-2 border-destructive/30 flex items-center justify-center mx-auto mb-5">
                  <XCircle className="w-8 h-8 text-destructive" />
                </div>
                <h1 className="text-xl font-bold mb-2 text-destructive">Attestation introuvable</h1>
                <p className="text-muted-foreground text-sm mb-8">
                  {!data
                    ? "Cette attestation n'existe pas ou l'identifiant est invalide."
                    : "Cette attestation a expiré."}
                </p>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold shadow-glow hover:opacity-90 transition-all"
                >
                  Commencer la formation gratuitement <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            {/* Valid attestation */}
            {!isLoading && data && isValid && (
              <div className="space-y-4">

                {/* ── Status badge ── */}
                <div className="rounded-2xl border border-emerald/30 bg-card/90 backdrop-blur-sm overflow-hidden shadow-card">
                  {/* Green header */}
                  <div className="bg-emerald/10 border-b border-emerald/20 px-6 py-5 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-emerald/15 border-2 border-emerald/40 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-7 h-7 text-emerald" />
                    </div>
                    <div>
                      <h1 className="text-lg font-bold text-emerald">Attestation valide ✓</h1>
                      <p className="text-sm text-muted-foreground">Authentifiée par {APP_NAME}</p>
                    </div>
                    <div className="ml-auto flex-shrink-0">
                      <Shield className="w-6 h-6 text-emerald/60" />
                    </div>
                  </div>

                  {/* Body */}
                  <div className="px-6 py-5 space-y-5">
                    {/* Beneficiary */}
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Bénéficiaire</p>
                      <p className="font-bold text-xl">{holderName}</p>
                      {orgName && (
                        <p className="text-sm text-muted-foreground mt-0.5">{orgName}</p>
                      )}
                    </div>

                    {/* Dates row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-secondary/30">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <Calendar className="w-3 h-3" /> Délivrée le
                        </div>
                        <p className="text-sm font-medium">{formatDate(data.generated_at)}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-secondary/30">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <Calendar className="w-3 h-3" /> Valide jusqu'au
                        </div>
                        <p className="text-sm font-medium">{formatDate(data.valid_until)}</p>
                      </div>
                    </div>

                    {/* Score */}
                    {data.score_average !== null && (
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                        <Award className="w-6 h-6 text-primary flex-shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Score moyen obtenu</p>
                          <p className="font-bold text-2xl font-mono text-gradient">{data.score_average}%</p>
                        </div>
                        <div className="ml-auto text-right">
                          <p className="text-xs text-muted-foreground">Modules</p>
                          <p className="font-bold text-lg">{moduleCount}</p>
                        </div>
                      </div>
                    )}

                    {/* Modules */}
                    {moduleCount > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Modules complétés</p>
                        <ul className="space-y-2">
                          {(data.modules_completed as { title: string; score: number; completed_at: string }[]).map((m, i) => (
                            <li key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-card/40 text-sm">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald flex-shrink-0" />
                                <span className="font-medium">{m.title}</span>
                              </div>
                              <span className="text-muted-foreground font-mono text-xs font-semibold">{m.score}%</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Attestation ID */}
                    <p className="text-[10px] text-muted-foreground/50 font-mono break-all border-t border-border/30 pt-3">
                      ID : {data.id}
                    </p>
                  </div>
                </div>

                {/* ── Viral CTA card ── */}
                <div className="rounded-2xl border border-primary/20 bg-card/80 backdrop-blur-sm overflow-hidden shadow-card">
                  <div className="gradient-primary px-6 py-5">
                    <h2 className="text-lg font-bold text-primary-foreground mb-1">
                      Formez votre équipe à l'IA & Cybersécurité
                    </h2>
                    <p className="text-primary-foreground/80 text-sm">
                      {holderName} s'est formé(e) sur {APP_NAME}. Rejoignez +2 000 professionnels.
                    </p>
                  </div>

                  {/* Social proof stats */}
                  <div className="grid grid-cols-3 divide-x divide-border/40 border-b border-border/40">
                    {[
                      { icon: Users, label: "Apprenants", value: "2 000+" },
                      { icon: BookOpen, label: "Modules", value: "20+" },
                      { icon: Zap, label: "Certifications", value: "500+" },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="px-3 py-4 text-center">
                        <Icon className="w-4 h-4 text-primary mx-auto mb-1" />
                        <p className="font-bold text-sm">{value}</p>
                        <p className="text-xs text-muted-foreground">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* CTA buttons */}
                  <div className="px-6 py-5 flex flex-col sm:flex-row gap-3">
                    <Link
                      to="/register"
                      className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-90 hover:scale-[1.02] transition-all duration-200 text-sm"
                    >
                      Créer mon compte gratuitement <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                      to="/pricing"
                      className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border/50 hover:border-primary/40 hover:bg-card/60 text-sm font-medium transition-all duration-200"
                    >
                      Voir les tarifs
                    </Link>
                  </div>
                </div>

              </div>
            )}

          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border/40 px-6 py-4 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {APP_NAME} — Plateforme de formation professionnelle en IA & Cybersécurité
            {" · "}
            <Link to="/cgu" className="hover:text-foreground transition-colors">CGU</Link>
            {" · "}
            <Link to="/confidentialite" className="hover:text-foreground transition-colors">Confidentialité</Link>
          </p>
        </footer>
      </div>
    </>
  );
}
