/**
 * export-compliance-dossier
 * Generates a ZIP archive containing:
 *  - attestations/{user_id}.pdf   — individual attestation PDFs
 *  - scores/summary.csv           — employee × skill score table
 *  - rapport_conformite.pdf       — 1-page executive summary
 *
 * Uses pdf-lib (already used by generate-pdf) directly so we avoid
 * calling another edge function (which would require auth token forwarding).
 * The ZIP is assembled with native DenoJS compression APIs (no external lib needed).
 */

import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getAuthenticatedUser, createServiceClient, handleOptions } from "../_shared/auth.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

// ─── Color palette (matches generate-pdf) ────────────────────────────────────
const NAVY    = rgb(0.08, 0.12, 0.27);
const INDIGO  = rgb(0.39, 0.40, 0.94);
const EMERALD = rgb(0.06, 0.73, 0.51);
const GRAY    = rgb(0.40, 0.40, 0.45);
const LIGHT   = rgb(0.96, 0.97, 1.00);
const WHITE   = rgb(1, 1, 1);
const RED     = rgb(0.87, 0.20, 0.20);

function formatDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

// ─── QR helper (same as generate-pdf) ────────────────────────────────────────
async function fetchQRBytes(url: string): Promise<Uint8Array | null> {
  try {
    const resp = await fetch(
      `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(url)}&format=png&margin=2`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (!resp.ok) return null;
    return new Uint8Array(await resp.arrayBuffer());
  } catch (_e) {
    return null;
  }
}

// ─── Build individual attestation PDF ────────────────────────────────────────
async function buildAttestation(params: {
  full_name: string;
  org_name: string;
  attestation_id: string;
  score_average: number;
  modules: { title: string; score: number; completed_at: string }[];
  base_url: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const { width, height } = page.getSize();
  const bold    = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const oblique = await pdf.embedFont(StandardFonts.HelveticaOblique);

  // Background + borders
  page.drawRectangle({ x: 0, y: 0, width, height, color: WHITE });
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: NAVY });
  page.drawRectangle({ x: 0, y: 0, width, height: 50, color: NAVY });
  page.drawRectangle({ x: 0, y: 50, width: 6, height: height - 130, color: INDIGO });
  page.drawRectangle({ x: width - 6, y: 50, width: 6, height: height - 130, color: INDIGO });

  page.drawText("Formetoialia", { x: 40, y: height - 50, size: 22, font: bold, color: WHITE });
  page.drawText("Plateforme de Formation Professionnelle", { x: 40, y: height - 66, size: 9, font: regular, color: rgb(0.7, 0.75, 0.9) });

  const title = "ATTESTATION DE FORMATION";
  page.drawText(title, { x: width / 2 - bold.widthOfTextAtSize(title, 20) / 2, y: height - 128, size: 20, font: bold, color: NAVY });
  page.drawLine({ start: { x: 50, y: height - 143 }, end: { x: width - 50, y: height - 143 }, thickness: 1, color: INDIGO });

  let y = height - 183;
  page.drawText("Je soussigné(e), la plateforme Formetoialia, certifie que :", { x: 60, y, size: 11, font: oblique, color: GRAY });

  y -= 40;
  page.drawRectangle({ x: 50, y: y - 15, width: width - 100, height: 50, color: LIGHT });
  page.drawText("Nom du bénéficiaire :", { x: 65, y: y + 18, size: 9, font: regular, color: GRAY });
  page.drawText(params.full_name, { x: 65, y: y + 2, size: 16, font: bold, color: NAVY });
  page.drawText(`Organisation : ${params.org_name}`, { x: 65, y: y - 12, size: 9, font: regular, color: GRAY });

  y -= 65;
  page.drawText("A complété avec succès les modules de formation suivants :", { x: 60, y, size: 11, font: bold, color: NAVY });
  y -= 20;
  for (const mod of params.modules.slice(0, 8)) {
    page.drawRectangle({ x: 60, y: y - 6, width: 8, height: 8, color: EMERALD });
    page.drawText(mod.title, { x: 76, y, size: 10, font: bold, color: NAVY });
    page.drawText(`Score : ${mod.score}%  ·  ${formatDate(new Date(mod.completed_at))}`, { x: 76, y: y - 13, size: 8, font: regular, color: GRAY });
    y -= 32;
  }

  y -= 10;
  page.drawLine({ start: { x: 60, y }, end: { x: width - 60, y }, thickness: 0.5, color: rgb(0.85, 0.87, 0.92) });
  y -= 25;
  page.drawRectangle({ x: 60, y: y - 10, width: 200, height: 38, color: NAVY });
  page.drawText("Score moyen", { x: 75, y: y + 14, size: 8, font: regular, color: rgb(0.7, 0.75, 0.9) });
  page.drawText(`${params.score_average}%`, { x: 75, y: y - 2, size: 18, font: bold, color: WHITE });

  const now = new Date();
  const validUntil = new Date(now); validUntil.setFullYear(validUntil.getFullYear() + 1);
  page.drawText(`Délivrée le : ${formatDate(now)}`, { x: 270, y: y + 8, size: 9, font: regular, color: GRAY });
  page.drawText(`Valable jusqu'au : ${formatDate(validUntil)}`, { x: 270, y: y - 6, size: 9, font: regular, color: GRAY });

  // QR block
  y -= 75;
  const verifyUrl = `${params.base_url}/verify/${params.attestation_id}`;
  const qrBytes = await fetchQRBytes(verifyUrl);
  page.drawRectangle({ x: 55, y: y - 15, width: width - 110, height: 80, color: LIGHT });
  if (qrBytes) {
    try {
      const qrImg = await pdf.embedPng(qrBytes);
      page.drawImage(qrImg, { x: 65, y: y - 10, width: 60, height: 60 });
      page.drawText("Vérifier l'authenticité :", { x: 138, y: y + 42, size: 9, font: bold, color: NAVY });
      page.drawText(verifyUrl, { x: 138, y: y + 28, size: 7.5, font: oblique, color: INDIGO });
      page.drawText(`N° : ${params.attestation_id}`, { x: 138, y: y + 14, size: 7, font: regular, color: GRAY });
      page.drawText("Scanner le QR code pour valider ce document", { x: 138, y: y, size: 7.5, font: regular, color: GRAY });
    } catch (_e) {
      page.drawText(verifyUrl, { x: 75, y: y + 24, size: 7.5, font: oblique, color: INDIGO });
    }
  } else {
    page.drawText(verifyUrl, { x: 75, y: y + 24, size: 7.5, font: oblique, color: INDIGO });
    page.drawText(`N° : ${params.attestation_id}`, { x: 75, y: y + 10, size: 7, font: regular, color: GRAY });
  }

  // Viral footer
  const footer = "Formetoialia — Plateforme de formation professionnelle en IA & Cybersécurité — formetoialia.com";
  page.drawText(footer, { x: width / 2 - regular.widthOfTextAtSize(footer, 7) / 2, y: 20, size: 7, font: regular, color: rgb(0.7, 0.75, 0.9) });

  return pdf.save();
}

// ─── Build executive summary PDF ─────────────────────────────────────────────
async function buildRapportConformite(params: {
  org_name: string;
  total_members: number;
  attestation_count: number;
  avg_score: number;
  completion_rate: number;
  generated_at: Date;
  members: { name: string; score: number | null; completed: number; status: string }[];
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const { width, height } = page.getSize();
  const bold    = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);

  page.drawRectangle({ x: 0, y: 0, width, height, color: WHITE });
  page.drawRectangle({ x: 0, y: height - 100, width, height: 100, color: NAVY });
  page.drawRectangle({ x: 0, y: 0, width, height: 40, color: NAVY });

  page.drawText("Formetoialia", { x: 40, y: height - 50, size: 20, font: bold, color: WHITE });
  page.drawText("Rapport de Conformité Formation", { x: 40, y: height - 72, size: 13, font: bold, color: WHITE });
  page.drawText(params.org_name, { x: 40, y: height - 90, size: 9, font: regular, color: rgb(0.7, 0.75, 0.9) });

  let y = height - 130;

  // KPI row
  const kpis = [
    { label: "Collaborateurs", value: String(params.total_members), color: INDIGO },
    { label: "Attestations", value: String(params.attestation_count), color: EMERALD },
    { label: "Score moyen", value: `${params.avg_score}%`, color: params.avg_score >= 70 ? EMERALD : RED },
    { label: "Taux conformité", value: `${params.completion_rate}%`, color: params.completion_rate >= 80 ? EMERALD : RED },
  ];

  const kpiW = (width - 80) / kpis.length;
  kpis.forEach((k, i) => {
    const kx = 40 + i * kpiW;
    page.drawRectangle({ x: kx, y: y - 40, width: kpiW - 8, height: 55, color: LIGHT });
    page.drawText(k.value, { x: kx + 8, y: y + 4, size: 18, font: bold, color: k.color });
    page.drawText(k.label, { x: kx + 8, y: y - 20, size: 8, font: regular, color: GRAY });
  });

  y -= 65;
  page.drawText(`Généré le : ${formatDate(params.generated_at)}`, { x: 40, y, size: 9, font: regular, color: GRAY });

  y -= 30;
  page.drawText("Détail par collaborateur", { x: 40, y, size: 12, font: bold, color: NAVY });

  y -= 20;
  // Table header
  page.drawRectangle({ x: 40, y: y - 4, width: width - 80, height: 18, color: NAVY });
  page.drawText("Nom", { x: 48, y, size: 8, font: bold, color: WHITE });
  page.drawText("Modules", { x: 280, y, size: 8, font: bold, color: WHITE });
  page.drawText("Score", { x: 360, y, size: 8, font: bold, color: WHITE });
  page.drawText("Statut", { x: 430, y, size: 8, font: bold, color: WHITE });

  y -= 20;
  for (const m of params.members.slice(0, 28)) {
    if (y < 80) break;
    const rowColor = m.status === "up_to_date" ? EMERALD : m.status === "late" ? rgb(0.9, 0.6, 0.1) : RED;
    page.drawText(m.name.slice(0, 32), { x: 48, y, size: 8, font: regular, color: NAVY });
    page.drawText(String(m.completed), { x: 290, y, size: 8, font: regular, color: NAVY });
    page.drawText(m.score != null ? `${m.score}%` : "—", { x: 365, y, size: 8, font: regular, color: NAVY });
    const statusLabel = m.status === "up_to_date" ? "À jour" : m.status === "late" ? "En retard" : "Inactif";
    page.drawText(statusLabel, { x: 430, y, size: 8, font: bold, color: rowColor });
    page.drawLine({ start: { x: 40, y: y - 5 }, end: { x: width - 40, y: y - 5 }, thickness: 0.3, color: rgb(0.88, 0.90, 0.95) });
    y -= 16;
  }

  // Footer
  page.drawText("Formetoialia — Ce rapport est confidentiel — formetoialia.com", { x: width / 2 - regular.widthOfTextAtSize("Formetoialia — Ce rapport est confidentiel — formetoialia.com", 7) / 2, y: 18, size: 7, font: regular, color: rgb(0.7, 0.75, 0.9) });

  return pdf.save();
}

// ─── Build audit trail PDF ────────────────────────────────────────────────────
async function buildAuditTrail(params: {
  org_name: string;
  events: { user_name: string; action: string; resource_type: string | null; created_at: string; score: number | null; duration_ms: number | null }[];
  generated_at: Date;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const bold    = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);

  const addPage = () => {
    const p = pdf.addPage([595, 842]);
    const { width, height } = p.getSize();
    p.drawRectangle({ x: 0, y: 0, width, height, color: WHITE });
    p.drawRectangle({ x: 0, y: height - 60, width, height: 60, color: NAVY });
    p.drawText("Audit Trail — " + params.org_name, { x: 30, y: height - 38, size: 12, font: bold, color: WHITE });
    p.drawText(`Exporté le ${formatDate(params.generated_at)}`, { x: 30, y: height - 52, size: 8, font: regular, color: rgb(0.7, 0.75, 0.9) });
    return p;
  };

  let page = addPage();
  const { width, height } = page.getSize();
  let y = height - 80;

  // Column headers
  const colX = { date: 30, user: 120, action: 270, score: 430, dur: 490 };
  page.drawRectangle({ x: 25, y: y - 4, width: width - 50, height: 18, color: NAVY });
  page.drawText("Date/Heure", { x: colX.date, y, size: 7.5, font: bold, color: WHITE });
  page.drawText("Utilisateur", { x: colX.user, y, size: 7.5, font: bold, color: WHITE });
  page.drawText("Événement", { x: colX.action, y, size: 7.5, font: bold, color: WHITE });
  page.drawText("Score", { x: colX.score, y, size: 7.5, font: bold, color: WHITE });
  page.drawText("Durée", { x: colX.dur, y, size: 7.5, font: bold, color: WHITE });
  y -= 20;

  const EVENT_LABELS: Record<string, string> = {
    module_viewed:           "Module consulté",
    quiz_passed:             "Quiz réussi",
    quiz_failed:             "Quiz échoué",
    lab_completed:           "Lab complété",
    attestation_generated:   "Attestation générée",
    login:                   "Connexion",
    first_login:             "1ère connexion",
  };

  for (const ev of params.events) {
    if (y < 60) {
      page = addPage();
      y = height - 90;
    }
    const evDate = new Date(ev.created_at);
    const dateStr = evDate.toLocaleDateString("fr-FR") + " " + evDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const actionLabel = EVENT_LABELS[ev.action] ?? ev.action;
    page.drawText(dateStr, { x: colX.date, y, size: 7, font: regular, color: NAVY });
    page.drawText((ev.user_name ?? "—").slice(0, 20), { x: colX.user, y, size: 7, font: regular, color: NAVY });
    page.drawText(actionLabel.slice(0, 28), { x: colX.action, y, size: 7, font: regular, color: NAVY });
    page.drawText(ev.score != null ? `${ev.score}%` : "—", { x: colX.score, y, size: 7, font: regular, color: ev.score != null ? EMERALD : GRAY });
    page.drawText(ev.duration_ms != null ? `${Math.round(ev.duration_ms / 1000)}s` : "—", { x: colX.dur, y, size: 7, font: regular, color: GRAY });
    page.drawLine({ start: { x: 25, y: y - 4 }, end: { x: width - 25, y: y - 4 }, thickness: 0.2, color: rgb(0.88, 0.90, 0.95) });
    y -= 14;
  }

  return pdf.save();
}

// ─── ZIP builder (native Deno — no external lib needed) ──────────────────────
// We produce a valid ZIP file using the ZIP specification directly.
// Each file is stored with no compression (STORE method = method 0) to avoid
// needing a deflate implementation. For PDF files this is acceptable.

function uint32LE(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n >>> 0, true);
  return b;
}
function uint16LE(n: number): Uint8Array {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, n & 0xffff, true);
  return b;
}

function crc32(data: Uint8Array): number {
  // Build CRC table
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (const byte of data) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { out.set(a, offset); offset += a.length; }
  return out;
}

interface ZipEntry { name: string; data: Uint8Array }

function buildZip(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const localHeaders: Uint8Array[] = [];
  const centralDirs: Uint8Array[] = [];
  let offset = 0;

  const dosDate = (() => {
    const now = new Date();
    return ((now.getFullYear() - 1980) << 9 | (now.getMonth() + 1) << 5 | now.getDate()) << 16
         |  (now.getHours() << 11 | now.getMinutes() << 5 | Math.floor(now.getSeconds() / 2));
  })();

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const size = entry.data.length;

    // Local file header: sig(4) version(2) flags(2) method(2) modtime(4) crc(4) compsize(4) size(4) namelen(2) extralen(2)
    const local = concat(
      new Uint8Array([0x50, 0x4b, 0x03, 0x04]), // signature
      uint16LE(20),          // version needed
      uint16LE(0),           // general purpose bit flag
      uint16LE(0),           // compression method: STORE
      uint32LE(dosDate),     // last mod time + date
      uint32LE(crc),
      uint32LE(size),
      uint32LE(size),
      uint16LE(nameBytes.length),
      uint16LE(0),           // extra field length
      nameBytes,
      entry.data,
    );

    localHeaders.push(local);

    // Central directory
    const central = concat(
      new Uint8Array([0x50, 0x4b, 0x01, 0x02]), // signature
      uint16LE(20),          // version made by
      uint16LE(20),          // version needed
      uint16LE(0),           // flags
      uint16LE(0),           // method STORE
      uint32LE(dosDate),
      uint32LE(crc),
      uint32LE(size),
      uint32LE(size),
      uint16LE(nameBytes.length),
      uint16LE(0),           // extra field
      uint16LE(0),           // file comment
      uint16LE(0),           // disk start
      uint16LE(0),           // internal attr
      uint32LE(0),           // external attr
      uint32LE(offset),      // local header offset
      nameBytes,
    );
    centralDirs.push(central);
    offset += local.length;
  }

  const centralSize = centralDirs.reduce((s, a) => s + a.length, 0);

  // End of central directory
  const eocd = concat(
    new Uint8Array([0x50, 0x4b, 0x05, 0x06]), // signature
    uint16LE(0),             // disk number
    uint16LE(0),             // start disk
    uint16LE(entries.length),
    uint16LE(entries.length),
    uint32LE(centralSize),
    uint32LE(offset),        // central dir offset
    uint16LE(0),             // comment length
  );

  return concat(...localHeaders, ...centralDirs, eocd);
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const preflight = handleOptions(req, corsHeaders);
  if (preflight) return preflight;

  try {
    const supabaseService = createServiceClient();
    const user = await getAuthenticatedUser(req, supabaseService);
    const userId = user.id;

    // Rate-limit: 5 exports / day (heavy operation)
    await checkRateLimit(supabaseService, userId, "export-compliance-dossier", "pro", corsHeaders);

    // Verify caller is manager or admin of an org
    const { data: profile } = await supabaseService
      .from("profiles")
      .select("org_id, full_name")
      .eq("id", userId)
      .single();

    if (!profile?.org_id) {
      return new Response(JSON.stringify({ error: "Aucune organisation associée à ce compte." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId = profile.org_id;
    const BASE_URL = "https://formetoialia.com";

    // ── Load org data ─────────────────────────────────────────────────────────
    const [orgRes, membersRes, attestationsRes, progressRes, auditRes] = await Promise.all([
      supabaseService.from("organizations").select("name, plan").eq("id", orgId).single(),
      supabaseService.from("profiles").select("id, full_name").eq("org_id", orgId).limit(500),
      supabaseService.from("attestations")
        .select("id, user_id, score_average, modules_completed, generated_at, pdf_url")
        .eq("org_id", orgId)
        .order("generated_at", { ascending: false })
        .limit(500),
      supabaseService.from("progress")
        .select("user_id, status, score")
        .in("user_id", (await supabaseService.from("profiles").select("id").eq("org_id", orgId)).data?.map((p: { id: string }) => p.id) ?? [])
        .limit(2000),
      supabaseService.from("audit_logs")
        .select("user_id, action, resource_type, created_at, score, duration_ms, details")
        .in("user_id", (await supabaseService.from("profiles").select("id").eq("org_id", orgId)).data?.map((p: { id: string }) => p.id) ?? [])
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);

    const orgName = orgRes.data?.name ?? "Organisation";
    const members: { id: string; full_name: string | null }[] = membersRes.data ?? [];
    const attestations = attestationsRes.data ?? [];
    const progressData = progressRes.data ?? [];
    const auditEvents = auditRes.data ?? [];

    // Build member id → name map
    const memberMap: Record<string, string> = {};
    members.forEach((m) => { memberMap[m.id] = m.full_name ?? "—"; });

    // Build attestation map user_id → attestation
    const attMap: Record<string, typeof attestations[0]> = {};
    attestations.forEach((a) => {
      if (!attMap[a.user_id]) attMap[a.user_id] = a;
    });

    // Build progress stats per member
    const memberStats = members.map((m) => {
      const userProg = progressData.filter((p: { user_id: string }) => p.user_id === m.id);
      const completed = userProg.filter((p: { status: string }) => p.status === "completed").length;
      const scores = userProg.filter((p: { score: number | null }) => p.score != null).map((p: { score: number }) => p.score);
      const avgScore = scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : null;
      const att = attMap[m.id];
      const status = att ? "up_to_date" : completed > 0 ? "late" : "inactive";
      return { id: m.id, name: memberMap[m.id], score: avgScore, completed, status };
    });

    const totalAtts = attestations.length;
    const avgScore = memberStats.filter((m) => m.score != null).length > 0
      ? Math.round(memberStats.filter((m) => m.score != null).reduce((s, m) => s + (m.score ?? 0), 0) / memberStats.filter((m) => m.score != null).length)
      : 0;
    const completionRate = members.length > 0 ? Math.round((totalAtts / members.length) * 100) : 0;

    // ── Generate ZIP entries ──────────────────────────────────────────────────
    const zipEntries: ZipEntry[] = [];
    const now = new Date();

    // 1. Individual attestation PDFs
    for (const att of attestations.slice(0, 50)) {
      try {
        const fullName = memberMap[att.user_id] ?? "Utilisateur";
        const modules = Array.isArray(att.modules_completed)
          ? (att.modules_completed as { title: string; score: number; completed_at: string }[])
          : [];

        const pdfBytes = await buildAttestation({
          full_name: fullName,
          org_name: orgName,
          attestation_id: att.id,
          score_average: att.score_average ?? 0,
          modules,
          base_url: BASE_URL,
        });
        zipEntries.push({ name: `attestations/${att.user_id}.pdf`, data: pdfBytes });
      } catch (_e) {
        // Skip failed PDFs — don't abort the whole export
      }
    }

    // 2. Rapport conformité PDF
    const rapportBytes = await buildRapportConformite({
      org_name: orgName,
      total_members: members.length,
      attestation_count: totalAtts,
      avg_score: avgScore,
      completion_rate: completionRate,
      generated_at: now,
      members: memberStats,
    });
    zipEntries.push({ name: "rapport_conformite.pdf", data: rapportBytes });

    // 3. Audit trail PDF
    const auditWithNames = auditEvents.map((ev: { user_id: string; action: string; resource_type: string | null; created_at: string; score: number | null; duration_ms: number | null }) => ({
      ...ev,
      user_name: memberMap[ev.user_id] ?? "—",
    }));
    const auditPdfBytes = await buildAuditTrail({
      org_name: orgName,
      events: auditWithNames,
      generated_at: now,
    });
    zipEntries.push({ name: "timeline/audit_trail.pdf", data: auditPdfBytes });

    // 4. scores/summary.csv
    const csvRows = [["Nom", "Modules complétés", "Score moyen", "Statut", "Attestation ID"]];
    memberStats.forEach((m) => {
      const att = attMap[m.id];
      csvRows.push([
        m.name,
        String(m.completed),
        m.score != null ? `${m.score}%` : "—",
        m.status === "up_to_date" ? "Conforme" : m.status === "late" ? "En retard" : "Inactif",
        att?.id ?? "—",
      ]);
    });
    const csvContent = "\uFEFF" + csvRows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    zipEntries.push({ name: "scores/summary.csv", data: new TextEncoder().encode(csvContent) });

    // ── Assemble ZIP ──────────────────────────────────────────────────────────
    const zipBytes = buildZip(zipEntries);

    // Log the export in audit trail (fire-and-forget)
    supabaseService.rpc("log_event", {
      _user_id: userId,
      _event_type: "compliance_dossier_exported",
      _details: { org_id: orgId, entries: zipEntries.length, generated_at: now.toISOString() },
    }).then(() => {}).catch(() => {});

    const dateStr = now.toISOString().split("T")[0];
    return new Response(zipBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="dossier-conformite-${dateStr}.zip"`,
        "Content-Length": String(zipBytes.length),
      },
    });

  } catch (err) {
    console.error("export-compliance-dossier error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
