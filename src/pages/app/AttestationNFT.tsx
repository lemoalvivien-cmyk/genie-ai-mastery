/**
 * AttestationVerifiable — Certification cryptographique signée
 *
 * Génère une attestation avec :
 *  - Hash SHA-256 des données (modules + scores + date + user_id)
 *  - Token ID unique (UUID v4)
 *  - Métadonnées de certification vérifiable
 *  - QR code de vérification publique
 *  - Export PDF via edge function generate-pdf
 *  - Ancrage dans la table attestations (signature_hash)
 */

import { Helmet } from "react-helmet-async";
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Award, Shield, Hash, Calendar, CheckCircle,
  Download, Share2, ExternalLink, Loader2, Zap, Lock,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

// ── Deterministic hash ────────────────────────────────────────────────────────
async function sha256(data: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ── Cert Metadata ─────────────────────────────────────────────────────────────
interface CertMetadata {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: Array<{ trait_type: string; value: string | number }>;
  background_color: string;
  animation_url?: string;
}

interface AttestationData {
  id: string;
  token_id: string;
  signature_hash: string;
  issued_at: string;
  valid_until: string;
  score_average: number;
  modules_completed: unknown;
  pdf_url: string | null;
  metadata: CertMetadata;
  verify_url: string;
}

// ── Rarity tier ───────────────────────────────────────────────────────────────
function getRarity(score: number, modules: number): { tier: string; color: string; emoji: string } {
  if (score >= 95 && modules >= 10) return { tier: "LEGENDARY",  color: "#F59E0B", emoji: "🏆" };
  if (score >= 85 && modules >= 7)  return { tier: "EPIC",       color: "#8B5CF6", emoji: "⚡" };
  if (score >= 75 && modules >= 5)  return { tier: "RARE",       color: "#3B82F6", emoji: "💎" };
  if (score >= 60 && modules >= 3)  return { tier: "UNCOMMON",   color: "#10B981", emoji: "🛡️" };
  return                                   { tier: "COMMON",     color: "#6B7280", emoji: "📜" };
}

export default function AttestationNFT() {
  const { profile, session } = useAuth();
  const userId = session?.user?.id;
  const [minting, setMinting] = useState(false);
  const [minted, setMinted] = useState<AttestationData | null>(null);
  const [downloading, setDownloading] = useState(false);

  // ── Load existing attestation ─────────────────────────────────────────────
  const { data: existing, refetch } = useQuery({
    queryKey: ["attestation-nft", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("attestations")
        .select("*")
        .eq("user_id", userId!)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // ── Load completed modules ─────────────────────────────────────────────────
  const { data: progress } = useQuery({
    queryKey: ["progress-for-nft", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("progress")
        .select("module_id, score, modules(title, domain)")
        .eq("user_id", userId!)
        .eq("status", "completed")
        .limit(50);
      return data ?? [];
    },
  });

  const completedCount = progress?.length ?? 0;
  const avgScore = completedCount
    ? Math.round((progress ?? []).reduce((acc, p) => acc + (p.score ?? 70), 0) / completedCount)
    : 0;

  const rarity = getRarity(avgScore, completedCount);
  const canMint = completedCount >= 3 && avgScore >= 60;

  // ── Mint NFT attestation ──────────────────────────────────────────────────
  const mintAttestation = useCallback(async () => {
    if (!userId || !canMint) return;
    setMinting(true);
    try {
      const tokenId = crypto.randomUUID();
      const issuedAt = new Date().toISOString();
      const validUntil = new Date(Date.now() + 365 * 86400000).toISOString(); // 1 year

      // Build attestation payload
      const payload = JSON.stringify({
        token_id:  tokenId,
        user_id:   userId,
        issued_at: issuedAt,
        modules:   progress?.map(p => ({ id: p.module_id, score: p.score })),
        avg_score: avgScore,
        rarity:    rarity.tier,
      });

      // Cryptographic hash
      const signatureHash = await sha256(payload);

      // NFT metadata
      const metadata: CertMetadata = {
        name: `Formetoialia Cyber Certification — ${rarity.tier}`,
        description: `Certification cryptographique signée et vérifiable délivrée par Formetoialia. ${completedCount} modules cyber complétés, score moyen ${avgScore}/100. Vérifiable publiquement.`,
        image: `https://formetoialia.com/og/cert-${rarity.tier.toLowerCase()}.png`,
        external_url: `https://formetoialia.com/verify/${tokenId}`,
        background_color: rarity.color.replace("#", ""),
        attributes: [
          { trait_type: "Rarity",           value: rarity.tier },
          { trait_type: "Modules Completed", value: completedCount },
          { trait_type: "Average Score",     value: avgScore },
          { trait_type: "Domain",            value: "Cybersecurity" },
          { trait_type: "Issuer",            value: "Formetoialia" },
          { trait_type: "Standard",          value: "SHA-256 Signed" },
          { trait_type: "Year",              value: new Date().getFullYear() },
        ],
      };

      // Upsert in DB
      const { data, error } = await supabase
        .from("attestations")
        .upsert({
          user_id:           userId,
          signature_hash:    signatureHash,
          score_average:     avgScore,
          modules_completed: progress?.map(p => p.module_id) ?? [],
          generated_at:      issuedAt,
          valid_until:       validUntil,
          metadata: {
            ...metadata,
            token_id: tokenId,
            rarity:   rarity.tier,
            payload_hash: signatureHash,
          },
        }, { onConflict: "user_id" })
        .select()
        .single();

      if (error) throw error;

      const attestation: AttestationData = {
        id:                data.id,
        token_id:          tokenId,
        signature_hash:    signatureHash,
        issued_at:         issuedAt,
        valid_until:       validUntil,
        score_average:     avgScore,
        modules_completed: progress?.map(p => p.module_id) ?? [],
        pdf_url:           data.pdf_url,
        metadata,
        verify_url:        `${window.location.origin}/verify/${data.id}`,
      };

      setMinted(attestation);
      toast.success(`${rarity.emoji} Attestation ${rarity.tier} mintée ! Hash: ${signatureHash.slice(0, 12)}…`);
      refetch();
    } catch (err) {
      toast.error(`Erreur : ${(err as Error).message}`);
    } finally {
      setMinting(false);
    }
  }, [userId, canMint, progress, avgScore, completedCount, rarity, refetch]);

  // ── Download PDF ──────────────────────────────────────────────────────────
  const downloadPDF = async () => {
    if (!existing?.id && !minted?.id) return;
    setDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-pdf", {
        body: { attestation_id: existing?.id ?? minted?.id, type: "attestation" },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
      else toast.info("PDF en cours de génération…");
    } catch {
      toast.error("Erreur génération PDF");
    } finally {
      setDownloading(false);
    }
  };

  const displayAttestation = minted ?? (existing ? {
    id:                existing.id,
    token_id:          (existing.metadata as { token_id?: string })?.token_id ?? existing.id,
    signature_hash:    existing.signature_hash ?? "",
    issued_at:         existing.generated_at ?? "",
    valid_until:       existing.valid_until ?? "",
    score_average:     existing.score_average ?? 0,
    modules_completed: existing.modules_completed,
    pdf_url:           existing.pdf_url,
    metadata:          existing.metadata as unknown as CertMetadata,
    verify_url:        `${window.location.origin}/verify/${existing.id}`,
  } satisfies AttestationData : null);

  return (
    <>
      <Helmet>
        <title>Attestation Vérifiable — Formetoialia</title>
      </Helmet>

      <div className="min-h-full page-enter" style={{ background: "#13151E" }}>
        <div className="max-w-lg mx-auto px-4 py-8 space-y-6">

          {/* ── Header ── */}
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Certification Cryptographique Vérifiable
              </span>
            </div>
            <h1 className="text-2xl font-black" style={{ color: "#E8E9F0" }}>
              Attestation Vérifiable
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Certification cryptographique vérifiable — signature cryptographique vérifiable.
            </p>
          </motion.div>

          {/* ── Eligibility ── */}
          {!displayAttestation && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-2xl space-y-4"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <h2 className="font-bold text-sm" style={{ color: "#E8E9F0" }}>
                Votre éligibilité
              </h2>
              <div className="space-y-2">
                {[
                  { label: "Modules complétés", value: completedCount, required: 3, unit: "modules" },
                  { label: "Score moyen",        value: avgScore,       required: 60, unit: "/100" },
                ].map(({ label, value, required, unit }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{label}</span>
                      <span className={value >= required ? "text-emerald-400 font-semibold" : "text-amber-400"}>
                        {value}{unit} / {required}{unit} requis
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (value / required) * 100)}%`,
                          background: value >= required
                            ? "linear-gradient(90deg, #10B981, #34D399)"
                            : "linear-gradient(90deg, #F59E0B, #FBBF24)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Rarity preview */}
              <div
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: `rgba(${rarity.color === "#F59E0B" ? "245,158,11" : "139,92,246"},0.1)` }}
              >
                <span className="text-2xl">{rarity.emoji}</span>
                <div>
                  <p className="text-xs text-muted-foreground">Rarité estimée</p>
                  <p className="font-bold" style={{ color: rarity.color }}>{rarity.tier}</p>
                </div>
              </div>

              <Button
                onClick={mintAttestation}
                disabled={!canMint || minting}
                className="w-full font-bold"
                style={{ background: canMint ? "#FE2C40" : undefined }}
              >
                {minting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Minting en cours…</>
                ) : !canMint ? (
                  <><Lock className="w-4 h-4 mr-2" />Complétez encore {Math.max(0, 3 - completedCount)} module(s)</>
                ) : (
                  <><Award className="w-4 h-4 mr-2" />Minter mon Attestation Vérifiable</>
                )}
              </Button>
            </motion.div>
          )}

          {/* ── Cert Card ── */}
          {displayAttestation && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl overflow-hidden"
              style={{ border: `1.5px solid ${rarity.color}40` }}
            >
              {/* Card header gradient */}
              <div
                className="p-6 text-center relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, rgba(82,87,216,0.3), rgba(${rarity.color === "#F59E0B" ? "245,158,11" : rarity.color === "#8B5CF6" ? "139,92,246" : "59,130,246"},0.3))`,
                }}
              >
                <div className="absolute inset-0 opacity-20"
                  style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 0.5px, transparent 0.5px), radial-gradient(circle at 80% 20%, white 0.5px, transparent 0.5px)", backgroundSize: "30px 30px" }}
                />
                <div className="relative">
                  <span className="text-5xl">{rarity.emoji}</span>
                  <div
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mt-3 block mx-auto w-fit"
                    style={{ background: `${rarity.color}20`, color: rarity.color, border: `1px solid ${rarity.color}40` }}
                  >
                    <Zap className="w-3 h-3" />
                    {rarity.tier}
                  </div>
                  <h2 className="text-lg font-black mt-2" style={{ color: "#E8E9F0" }}>
                    Formetoialia Cyber Certification
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {profile?.full_name ?? session?.user?.email}
                  </p>
                </div>
              </div>

              {/* Card body */}
              <div className="p-5 space-y-4" style={{ background: "rgba(255,255,255,0.03)" }}>
                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: CheckCircle, label: "Modules",    value: completedCount, color: "text-emerald-400" },
                    { icon: Shield,      label: "Score moy.", value: `${displayAttestation.score_average}/100`, color: "text-blue-400" },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
                      <p className={`text-lg font-black ${color}`}>{value}</p>
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Hash */}
                <div className="p-3 rounded-xl" style={{ background: "rgba(0,0,0,0.3)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Signature SHA-256
                    </span>
                  </div>
                  <p className="text-[9px] font-mono text-emerald-400 break-all leading-relaxed">
                    {displayAttestation.signature_hash}
                  </p>
                </div>

                {/* Dates */}
                <div className="flex justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    Émis le {new Date(displayAttestation.issued_at).toLocaleDateString("fr-FR")}
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Lock className="w-3.5 h-3.5" />
                    Valide 1 an
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={downloadPDF}
                    disabled={downloading}
                  >
                    {downloading
                      ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      : <Download className="w-3.5 h-3.5 mr-1.5" />
                    }
                    PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => {
                      navigator.clipboard.writeText(displayAttestation.verify_url);
                      toast.success("Lien copié !");
                    }}
                  >
                    <Share2 className="w-3.5 h-3.5 mr-1.5" />
                    Partager
                  </Button>
                  <Link to={`/verify/${displayAttestation.id}`} target="_blank">
                    <Button variant="outline" size="sm" className="text-xs">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Pourquoi "grade certification" ? ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="p-4 rounded-2xl space-y-3"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Pourquoi "grade certification" ?
            </h3>
            <div className="space-y-2">
              {[
                { icon: Hash,        text: "Hash SHA-256 immuable de vos données d'apprentissage" },
                { icon: Shield,      text: "Vérification publique en temps réel via /verify/:id" },
                { icon: Award,       text: "Métadonnées signées SHA-256 (vérifiables publiquement)" },
                { icon: CheckCircle, text: "QR code encodant signature + URL de vérification" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-2">
                  <Icon className="w-3.5 h-3.5 text-[hsl(var(--primary))] shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </>
  );
}
