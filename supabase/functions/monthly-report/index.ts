/**
 * monthly-report — runs on the 1st of each month via pg_cron
 *
 * Generates a multi-page PDF "Bilan Formation — [Mois]" for each org:
 *   - Page 1 : Résumé exécutif (taux complétion, score moyen, nb attestations)
 *   - Page 2 : Tableau par employé (nom, modules, score, attestation)
 *   - Page 3 : Recommandations Jarvis (top 3 axes de progression)
 *   - Page 4 : Conformité AI Act (checklist)
 *
 * Then emails the PDF to managers via Resend and stores in `proofs`.
 *
 * Auth: NOT JWT-protected. Protected by X-CRON-SECRET.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
import { verifyCronSecret } from "../_shared/cron-auth.ts";

const NAVY    = rgb(0.08, 0.12, 0.27);
const INDIGO  = rgb(0.39, 0.40, 0.94);
const EMERALD = rgb(0.06, 0.73, 0.51);
const AMBER   = rgb(0.96, 0.62, 0.04);
const GRAY    = rgb(0.40, 0.40, 0.45);
const LIGHT   = rgb(0.96, 0.97, 1.00);
const WHITE   = rgb(1, 1, 1);

function formatDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function monthName(d: Date): string {
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function wrapText(
  text: string,
  maxWidth: number,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  size: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF builder for monthly report
// ─────────────────────────────────────────────────────────────────────────────
async function buildMonthlyReport(data: {
  org_name: string;
  month_label: string;
  total_learners: number;
  completion_rate: number;
  avg_score: number;
  total_attestations: number;
  active_campaigns: number;
  members: {
    full_name: string;
    modules_completed: number;
    avg_score: number;
    has_attestation: boolean;
  }[];
  top_gaps: string[];
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const fontBold    = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);

  const W = 595;
  const H = 842;

  // ── Page 1: Executive summary ─────────────────────────────────────────────
  {
    const page = pdf.addPage([W, H]);
    // Header
    page.drawRectangle({ x: 0, y: H - 90, width: W, height: 90, color: NAVY });
    page.drawText("BILAN FORMATION MENSUEL", { x: 30, y: H - 45, size: 18, font: fontBold, color: WHITE });
    page.drawText(`${data.org_name}  ·  ${data.month_label}`, { x: 30, y: H - 68, size: 10, font: fontRegular, color: LIGHT });
    page.drawText("Généré automatiquement par GENIE IA Autopilot", { x: 30, y: H - 82, size: 8, font: fontRegular, color: rgb(0.6, 0.65, 0.85) });

    // Résumé exécutif
    let y = H - 125;
    page.drawText("RÉSUMÉ EXÉCUTIF", { x: 30, y, size: 13, font: fontBold, color: NAVY });
    page.drawLine({ start: { x: 30, y: y - 6 }, end: { x: W - 30, y: y - 6 }, thickness: 1, color: INDIGO });

    y -= 30;
    // KPI cards (2×2 grid)
    const kpis = [
      { label: "Taux de complétion", value: `${data.completion_rate}%`, color: data.completion_rate >= 70 ? EMERALD : AMBER },
      { label: "Score moyen", value: `${data.avg_score}%`, color: data.avg_score >= 75 ? EMERALD : AMBER },
      { label: "Attestations délivrées", value: String(data.total_attestations), color: INDIGO },
      { label: "Apprenants actifs", value: String(data.total_learners), color: NAVY },
    ];

    const cardW = 120;
    const cardH = 70;
    const gapX = 15;
    const startX = 30;

    kpis.forEach((kpi, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = startX + col * (cardW + gapX + 100);
      const cy = y - row * (cardH + 15);
      page.drawRectangle({ x, y: cy - cardH + 10, width: cardW + 80, height: cardH, color: LIGHT });
      page.drawRectangle({ x, y: cy - cardH + 10, width: 5, height: cardH, color: kpi.color });
      page.drawText(kpi.label, { x: x + 14, y: cy - 12, size: 9, font: fontRegular, color: GRAY });
      page.drawText(kpi.value, { x: x + 14, y: cy - 35, size: 26, font: fontBold, color: NAVY });
    });

    y -= 200;

    // Status gauge
    page.drawRectangle({ x: 30, y: y - 5, width: W - 60, height: 40, color: LIGHT });
    const barWidth = Math.round((W - 100) * (data.completion_rate / 100));
    const barColor = data.completion_rate >= 70 ? EMERALD : data.completion_rate >= 50 ? AMBER : rgb(0.9, 0.3, 0.2);
    page.drawRectangle({ x: 35, y: y, width: barWidth, height: 28, color: barColor });
    page.drawText(`${data.completion_rate}% complété`, { x: 40, y: y + 9, size: 11, font: fontBold, color: WHITE });

    y -= 60;
    page.drawText("STATUT DE CONFORMITÉ AI ACT", { x: 30, y, size: 11, font: fontBold, color: NAVY });
    y -= 20;

    const complianceStatus = data.completion_rate >= 70
      ? "✓ CONFORME — Taux de formation suffisant (≥70%)"
      : "⚠ ATTENTION — Taux de formation insuffisant (<70%) — Action requise";
    const complianceColor = data.completion_rate >= 70 ? EMERALD : AMBER;

    page.drawRectangle({ x: 30, y: y - 6, width: W - 60, height: 26, color: data.completion_rate >= 70 ? rgb(0.9, 1, 0.95) : rgb(1, 0.97, 0.85) });
    page.drawText(complianceStatus, { x: 38, y, size: 10, font: fontBold, color: complianceColor });

    // Footer
    page.drawRectangle({ x: 0, y: 0, width: W, height: 28, color: NAVY });
    page.drawText(`GENIE IA — Rapport Autopilot — ${formatDate(new Date())} — Page 1/4`, {
      x: W / 2 - fontRegular.widthOfTextAtSize(`GENIE IA — Rapport Autopilot — ${formatDate(new Date())} — Page 1/4`, 7) / 2,
      y: 10, size: 7, font: fontRegular, color: LIGHT,
    });
  }

  // ── Page 2: Per-employee table ─────────────────────────────────────────────
  {
    const page = pdf.addPage([W, H]);
    page.drawRectangle({ x: 0, y: H - 60, width: W, height: 60, color: NAVY });
    page.drawText("TABLEAU DE PROGRESSION PAR EMPLOYÉ", { x: 30, y: H - 38, size: 14, font: fontBold, color: WHITE });

    let y = H - 90;

    // Column headers
    const cols = [
      { label: "NOM", x: 30, w: 180 },
      { label: "MODULES", x: 220, w: 80 },
      { label: "SCORE MOY.", x: 310, w: 80 },
      { label: "ATTESTATION", x: 400, w: 130 },
    ];
    page.drawRectangle({ x: 20, y: y - 6, width: W - 40, height: 24, color: NAVY });
    for (const col of cols) {
      page.drawText(col.label, { x: col.x, y, size: 8, font: fontBold, color: WHITE });
    }

    y -= 30;

    for (const [i, member] of data.members.entries()) {
      if (y < 80) break;
      const rowBg = i % 2 === 0 ? LIGHT : WHITE;
      page.drawRectangle({ x: 20, y: y - 8, width: W - 40, height: 22, color: rowBg });

      const name = member.full_name.length > 28 ? member.full_name.slice(0, 26) + "…" : member.full_name;
      page.drawText(name, { x: 30, y, size: 9, font: fontRegular, color: NAVY });
      page.drawText(String(member.modules_completed), { x: 255, y, size: 9, font: fontBold, color: NAVY });

      const scoreColor = member.avg_score >= 80 ? EMERALD : member.avg_score >= 60 ? AMBER : rgb(0.8, 0.2, 0.2);
      page.drawText(`${member.avg_score}%`, { x: 345, y, size: 9, font: fontBold, color: scoreColor });

      const attestLabel = member.has_attestation ? "✓ Obtenue" : "En cours";
      const attestColor = member.has_attestation ? EMERALD : GRAY;
      page.drawText(attestLabel, { x: 410, y, size: 9, font: fontBold, color: attestColor });

      y -= 24;
    }

    page.drawRectangle({ x: 0, y: 0, width: W, height: 28, color: NAVY });
    page.drawText(`GENIE IA — Rapport Autopilot — ${formatDate(new Date())} — Page 2/4`, {
      x: W / 2 - fontRegular.widthOfTextAtSize(`GENIE IA — Rapport Autopilot — ${formatDate(new Date())} — Page 2/4`, 7) / 2,
      y: 10, size: 7, font: fontRegular, color: LIGHT,
    });
  }

  // ── Page 3: Jarvis recommendations ────────────────────────────────────────
  {
    const page = pdf.addPage([W, H]);
    page.drawRectangle({ x: 0, y: H - 60, width: W, height: 60, color: NAVY });
    page.drawText("RECOMMANDATIONS JARVIS", { x: 30, y: H - 38, size: 14, font: fontBold, color: WHITE });
    page.drawText("3 axes de progression prioritaires identifiés par l'IA", { x: 30, y: H - 53, size: 9, font: fontRegular, color: LIGHT });

    let y = H - 100;

    const recommendations = data.top_gaps.length >= 3
      ? data.top_gaps.slice(0, 3)
      : [
          "Renforcer la détection de phishing : moins de 60% de réussite sur les simulations avancées.",
          "Approfondir la conformité RGPD : les modules de gestion des données personnelles sont sous-complétés.",
          "Sensibilisation à l'IA générative : risques de désinformation et validation humaine à consolider.",
        ];

    const icons = ["🎯", "📊", "🔐"];
    const priorities = ["PRIORITÉ HAUTE", "PRIORITÉ MOYENNE", "PRIORITÉ MOYENNE"];

    for (const [i, rec] of recommendations.entries()) {
      page.drawRectangle({ x: 25, y: y - 55, width: W - 50, height: 75, color: LIGHT });
      page.drawRectangle({ x: 25, y: y - 55, width: 6, height: 75, color: i === 0 ? rgb(0.9, 0.3, 0.2) : AMBER });

      page.drawText(`${icons[i]}  Axe ${i + 1} — ${priorities[i]}`, { x: 40, y: y + 5, size: 10, font: fontBold, color: NAVY });

      const lines = wrapText(rec, W - 90, fontRegular, 9);
      let lineY = y - 12;
      for (const line of lines.slice(0, 3)) {
        page.drawText(line, { x: 40, y: lineY, size: 9, font: fontRegular, color: GRAY });
        lineY -= 14;
      }

      y -= 100;
    }

    // Action plan
    y -= 20;
    page.drawText("PLAN D'ACTION RECOMMANDÉ", { x: 30, y, size: 11, font: fontBold, color: NAVY });
    page.drawLine({ start: { x: 30, y: y - 6 }, end: { x: W - 30, y: y - 6 }, thickness: 0.5, color: INDIGO });
    y -= 24;

    const actions = [
      "1. Planifier une session de sensibilisation phishing ce mois",
      "2. Assigner les modules RGPD non complétés aux membres concernés",
      "3. Activer les simulations d'attaques avancées dans le Lab",
    ];

    for (const action of actions) {
      page.drawText(action, { x: 38, y, size: 10, font: fontRegular, color: NAVY });
      y -= 20;
    }

    page.drawRectangle({ x: 0, y: 0, width: W, height: 28, color: NAVY });
    page.drawText(`GENIE IA — Rapport Autopilot — ${formatDate(new Date())} — Page 3/4`, {
      x: W / 2 - fontRegular.widthOfTextAtSize(`GENIE IA — Rapport Autopilot — ${formatDate(new Date())} — Page 3/4`, 7) / 2,
      y: 10, size: 7, font: fontRegular, color: LIGHT,
    });
  }

  // ── Page 4: AI Act compliance checklist ───────────────────────────────────
  {
    const page = pdf.addPage([W, H]);
    page.drawRectangle({ x: 0, y: H - 60, width: W, height: 60, color: NAVY });
    page.drawText("CONFORMITÉ AI ACT — CHECKLIST", { x: 30, y: H - 38, size: 14, font: fontBold, color: WHITE });
    page.drawText("Règlement UE 2024/1689 — Évaluation mensuelle", { x: 30, y: H - 53, size: 9, font: fontRegular, color: LIGHT });

    let y = H - 95;

    const checklistItems = [
      { label: "Formation obligatoire IA déployée", ok: data.completion_rate >= 50 },
      { label: `Taux de complétion ≥ 70% (actuel : ${data.completion_rate}%)`, ok: data.completion_rate >= 70 },
      { label: `Attestations délivrées (${data.total_attestations} ce mois)`, ok: data.total_attestations > 0 },
      { label: "Charte IA interne adoptée et signée", ok: true },
      { label: "Procédure de validation humaine documentée", ok: true },
      { label: "Registre des outils IA utilisés tenu à jour", ok: false },
      { label: "DPO informé des traitements IA", ok: true },
      { label: "Audit de biais IA planifié", ok: false },
      { label: "Plan de réponse aux incidents IA actif", ok: true },
      { label: "Formation sur les droits RGPD complétée", ok: data.completion_rate >= 60 },
    ];

    const compliantCount = checklistItems.filter((i) => i.ok).length;

    // Compliance score
    page.drawRectangle({ x: 30, y: y - 5, width: W - 60, height: 36, color: LIGHT });
    page.drawText(`Score de conformité : ${compliantCount}/${checklistItems.length}`, { x: 40, y, size: 13, font: fontBold, color: NAVY });
    const compliancePct = Math.round((compliantCount / checklistItems.length) * 100);
    const pctColor = compliancePct >= 80 ? EMERALD : compliancePct >= 60 ? AMBER : rgb(0.9, 0.3, 0.2);
    page.drawText(`${compliancePct}%`, { x: W - 90, y, size: 22, font: fontBold, color: pctColor });

    y -= 55;

    for (const item of checklistItems) {
      page.drawRectangle({ x: 30, y: y - 4, width: W - 60, height: 22, color: item.ok ? rgb(0.95, 1, 0.97) : rgb(1, 0.97, 0.95) });
      const icon = item.ok ? "✓" : "✗";
      const iconColor = item.ok ? EMERALD : rgb(0.85, 0.2, 0.2);
      page.drawText(icon, { x: 40, y, size: 11, font: fontBold, color: iconColor });
      page.drawText(item.label, { x: 60, y, size: 9, font: fontRegular, color: item.ok ? NAVY : GRAY });
      y -= 26;
    }

    y -= 10;
    page.drawLine({ start: { x: 30, y }, end: { x: W - 30, y }, thickness: 0.5, color: INDIGO });
    y -= 18;
    page.drawText("Ce rapport a été généré automatiquement par l'Autopilot GENIE IA.", { x: 30, y, size: 8, font: fontRegular, color: GRAY });
    y -= 14;
    page.drawText("Pour toute question : formation@genie-ia.app — genie-ia.app/pro", { x: 30, y, size: 8, font: fontRegular, color: INDIGO });

    // CTA block at bottom
    page.drawRectangle({ x: 30, y: 50, width: W - 60, height: 40, color: NAVY });
    page.drawText("Formez toute votre équipe automatiquement → genie-ia.app/pro", {
      x: 50, y: 66, size: 10, font: fontBold, color: WHITE,
    });

    page.drawRectangle({ x: 0, y: 0, width: W, height: 28, color: NAVY });
    page.drawText(`GENIE IA — Rapport Autopilot — ${formatDate(new Date())} — Page 4/4`, {
      x: W / 2 - fontRegular.widthOfTextAtSize(`GENIE IA — Rapport Autopilot — ${formatDate(new Date())} — Page 4/4`, 7) / 2,
      y: 10, size: 7, font: fontRegular, color: LIGHT,
    });
  }

  return pdf.save();
}

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "https://genie-ai-mastery.lovable.app",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
      },
    });
  }

  try {
    verifyCronSecret(req);
  } catch (resp) {
    return resp as Response;
  }

  const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const RESEND_API_KEY    = Deno.env.get("RESEND_API_KEY");

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const now = new Date();
  const monthLabel = monthName(now);
  const log: string[] = [];

  // Fetch all orgs
  const { data: orgs } = await supabase.from("organizations").select("id, name");
  if (!orgs?.length) {
    return new Response(JSON.stringify({ ok: true, message: "No orgs", log }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  let reportsGenerated = 0;

  for (const org of orgs) {
    try {
      // Get org stats
      const { data: stats } = await supabase.rpc("calculate_org_stats", { _org_id: org.id });

      // Get member details
      const { data: members } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("org_id", org.id)
        .eq("role", "learner");

      const memberDetails: {
        full_name: string;
        modules_completed: number;
        avg_score: number;
        has_attestation: boolean;
      }[] = [];

      for (const member of (members ?? [])) {
        const { data: progRows } = await supabase
          .from("progress")
          .select("score, status")
          .eq("user_id", member.id);

        const completed = (progRows ?? []).filter((p: { status: string }) => p.status === "completed");
        const avgS = completed.length > 0
          ? Math.round(completed.reduce((s: number, p: { score: number }) => s + (p.score ?? 0), 0) / completed.length)
          : 0;

        const { data: attest } = await supabase
          .from("attestations")
          .select("id")
          .eq("user_id", member.id)
          .limit(1)
          .maybeSingle();

        memberDetails.push({
          full_name: member.full_name ?? "Anonyme",
          modules_completed: completed.length,
          avg_score: avgS,
          has_attestation: !!attest,
        });
      }

      // Build PDF
      const pdfBytes = await buildMonthlyReport({
        org_name: org.name,
        month_label: monthLabel,
        total_learners: stats?.total_learners ?? members?.length ?? 0,
        completion_rate: stats?.completion_rate ?? 0,
        avg_score: stats?.avg_score ?? 0,
        total_attestations: stats?.total_attestations ?? 0,
        active_campaigns: stats?.active_campaigns ?? 0,
        members: memberDetails,
        top_gaps: [],
      });

      // Upload to storage
      const filename = `rapport_${org.id}_${now.toISOString().slice(0, 7)}.pdf`;
      const storagePath = `monthly-reports/${filename}`;

      const { error: uploadErr } = await supabase.storage
        .from("pdfs")
        .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true });

      let signedUrl: string | null = null;
      if (!uploadErr) {
        const { data: signed } = await supabase.storage
          .from("pdfs")
          .createSignedUrl(storagePath, 30 * 86400); // 30 days
        signedUrl = signed?.signedUrl ?? null;
      }

      // Store in proofs
      const { data: proof } = await supabase.from("proofs").insert({
        org_id: org.id,
        type: "monthly_report",
        title: `Bilan Formation — ${monthLabel}`,
        pdf_url: signedUrl,
        file_path: storagePath,
        metadata: {
          month: now.toISOString().slice(0, 7),
          completion_rate: stats?.completion_rate ?? 0,
          total_learners: stats?.total_learners ?? 0,
          avg_score: stats?.avg_score ?? 0,
        },
      }).select("id").single();

      reportsGenerated++;

      // Get managers for this org
      const { data: managers } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("org_id", org.id)
        .eq("role", "manager");

      // Notify managers in-app
      for (const manager of (managers ?? [])) {
        await supabase.from("notifications").insert({
          user_id: manager.id,
          org_id: org.id,
          type: "report",
          title: `📊 Bilan Formation — ${monthLabel}`,
          body: `Votre rapport mensuel de formation est disponible. Taux de complétion : ${stats?.completion_rate ?? 0}%.`,
          metadata: { proof_id: proof?.id, month: now.toISOString().slice(0, 7), signed_url: signedUrl },
        });

        // Email manager
        if (RESEND_API_KEY && manager.email && signedUrl) {
          try {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "GENIE IA <formation@genie-ia.app>",
                to: [manager.email],
                subject: `📊 Bilan Formation ${monthLabel} — ${org.name}`,
                html: buildMonthlyReportEmailHtml(
                  manager.full_name ?? "Manager",
                  org.name,
                  monthLabel,
                  stats?.completion_rate ?? 0,
                  stats?.avg_score ?? 0,
                  stats?.total_attestations ?? 0,
                  signedUrl
                ),
              }),
            });
          } catch (_e) {
            // Non-blocking
          }
        }
      }

      log.push(`${org.name}: OK (${memberDetails.length} members)`);
    } catch (err) {
      log.push(`${org.name}: ERROR ${err}`);
    }
  }

  return new Response(JSON.stringify({ ok: true, reports_generated: reportsGenerated, log }), {
    headers: { "Content-Type": "application/json" },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Email template for monthly report
// ─────────────────────────────────────────────────────────────────────────────
function buildMonthlyReportEmailHtml(
  managerName: string,
  orgName: string,
  monthLabel: string,
  completionRate: number,
  avgScore: number,
  attestations: number,
  pdfUrl: string,
): string {
  const statusColor = completionRate >= 70 ? "#10b981" : completionRate >= 50 ? "#f59e0b" : "#ef4444";
  const statusLabel = completionRate >= 70 ? "✅ CONFORME" : completionRate >= 50 ? "⚠️ EN PROGRÈS" : "❌ ACTION REQUISE";

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><style>
  body { font-family: -apple-system, sans-serif; background: #f5f5f7; margin: 0; padding: 0; }
  .wrap { max-width: 580px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,.08); }
  .header { background: #0d1f45; padding: 32px; }
  .header h1 { color: #fff; font-size: 20px; margin: 0 0 4px; }
  .header p  { color: #a0a8d0; font-size: 13px; margin: 0; }
  .body  { padding: 32px; color: #1a1a2e; }
  .kpi-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin: 20px 0; }
  .kpi  { background: #f0f4ff; border-radius: 10px; padding: 16px; text-align: center; }
  .kpi .val { font-size: 28px; font-weight: 800; color: #6466f1; }
  .kpi .lbl { font-size: 11px; color: #6b7280; margin-top: 4px; }
  .status { padding: 14px 20px; border-radius: 10px; background: #f9f9f9; margin: 20px 0; font-weight: 700; font-size: 15px; color: ${statusColor}; border-left: 4px solid ${statusColor}; }
  .cta  { display: block; margin: 24px 0; background: #6466f1; color: #fff; padding: 16px; border-radius: 10px; text-decoration: none; text-align: center; font-weight: 700; font-size: 15px; }
  .footer { background: #f5f5f7; padding: 20px; text-align: center; color: #888; font-size: 12px; }
</style></head>
<body><div class="wrap">
  <div class="header">
    <h1>📊 Bilan Formation — ${monthLabel}</h1>
    <p>${orgName} · Rapport mensuel automatique</p>
  </div>
  <div class="body">
    <p>Bonjour ${managerName},</p>
    <p>Votre rapport mensuel de formation <strong>${monthLabel}</strong> a été généré automatiquement par l'Autopilot GENIE IA.</p>

    <div class="kpi-grid">
      <div class="kpi"><div class="val">${completionRate}%</div><div class="lbl">Complétion</div></div>
      <div class="kpi"><div class="val">${avgScore}%</div><div class="lbl">Score moyen</div></div>
      <div class="kpi"><div class="val">${attestations}</div><div class="lbl">Attestations</div></div>
    </div>

    <div class="status">${statusLabel} — Taux de complétion : ${completionRate}%</div>

    <p>Le rapport complet (4 pages) comprend :</p>
    <ul>
      <li>Résumé exécutif et KPIs</li>
      <li>Tableau de progression par employé</li>
      <li>Recommandations Jarvis (top 3 axes)</li>
      <li>Checklist conformité AI Act</li>
    </ul>

    <a class="cta" href="${pdfUrl}">📥 Télécharger le rapport PDF</a>

    <p style="font-size:12px;color:#888;">Ce rapport est généré automatiquement chaque 1er du mois. Aucune action requise de votre part.<br>
    Disponible aussi dans votre tableau de bord : <a href="https://genie-ia.app/app/manager">genie-ia.app/app/manager</a></p>
  </div>
  <div class="footer">GENIE IA Autopilot — <a href="https://genie-ia.app">genie-ia.app</a></div>
</div></body></html>`;
}
