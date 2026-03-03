import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getClientIp, hashIp, checkIpRateLimit, recordAbuse, SHIELD_CONFIG } from "../_shared/shield.ts";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Color palette ────────────────────────────────────────────────────────────
const NAVY    = rgb(0.08, 0.12, 0.27);
const INDIGO  = rgb(0.39, 0.40, 0.94);
const EMERALD = rgb(0.06, 0.73, 0.51);
const GRAY    = rgb(0.40, 0.40, 0.45);
const LIGHT   = rgb(0.96, 0.97, 1.00);
const WHITE   = rgb(1, 1, 1);

// ─── QR Code generator (pure Deno - no external service) ─────────────────────
// Generates a minimal QR-like pixel matrix for a URL
// We use a simplified approach: fetch a QR PNG from a public API
async function fetchQRCodeBytes(url: string): Promise<Uint8Array | null> {
  try {
    const encoded = encodeURIComponent(url);
    const resp = await fetch(
      `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encoded}&format=png&margin=2`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!resp.ok) return null;
    const buf = await resp.arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function wrapText(text: string, maxWidth: number, pdfFont: Awaited<ReturnType<PDFDocument["embedFont"]>>, size: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (pdfFont.widthOfTextAtSize(test, size) <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

// ─── PDF builders ─────────────────────────────────────────────────────────────

async function buildAttestation(data: {
  full_name: string;
  org_name?: string;
  modules: { title: string; score: number; completed_at: string }[];
  score_average: number;
  attestation_id: string;
  base_url: string;
  partner_name?: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const { width, height } = page.getSize();

  const fontBold    = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fontOblique = await pdf.embedFont(StandardFonts.HelveticaOblique);

  // Background
  page.drawRectangle({ x: 0, y: 0, width, height, color: WHITE });

  // Top border band (navy)
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: NAVY });

  // Bottom border band
  page.drawRectangle({ x: 0, y: 0, width, height: 50, color: NAVY });

  // Side accent lines (indigo)
  page.drawRectangle({ x: 0, y: 50, width: 6, height: height - 130, color: INDIGO });
  page.drawRectangle({ x: width - 6, y: 50, width: 6, height: height - 130, color: INDIGO });

  // Header: logo text
  page.drawText("GENIE IA", { x: 40, y: height - 50, size: 22, font: fontBold, color: WHITE });
  page.drawText("Plateforme de Formation Professionnelle", {
    x: 40, y: height - 66, size: 9, font: fontRegular, color: rgb(0.7, 0.75, 0.9),
  });

  // Main title
  const titleText = "ATTESTATION DE FORMATION";
  page.drawText(titleText, {
    x: width / 2 - fontBold.widthOfTextAtSize(titleText, 20) / 2,
    y: height - 128,
    size: 20, font: fontBold, color: NAVY,
  });

  // Decorative line under title
  page.drawLine({ start: { x: 50, y: height - 143 }, end: { x: width - 50, y: height - 143 }, thickness: 1, color: INDIGO });
  page.drawLine({ start: { x: 50, y: height - 146 }, end: { x: width - 50, y: height - 146 }, thickness: 0.3, color: INDIGO });

  // Certifying text
  let y = height - 183;
  page.drawText("Je soussigné(e), la plateforme GENIE IA, certifie que :", {
    x: 60, y, size: 11, font: fontOblique, color: GRAY,
  });

  y -= 40;
  // Name block
  page.drawRectangle({ x: 50, y: y - 15, width: width - 100, height: 50, color: LIGHT });
  page.drawText("Nom du bénéficiaire :", { x: 65, y: y + 18, size: 9, font: fontRegular, color: GRAY });
  page.drawText(data.full_name, { x: 65, y: y + 2, size: 16, font: fontBold, color: NAVY });
  if (data.org_name) {
    page.drawText(`Organisation : ${data.org_name}`, { x: 65, y: y - 12, size: 9, font: fontRegular, color: GRAY });
  }

  y -= 65;
  page.drawText("A complété avec succès les modules de formation suivants :", {
    x: 60, y, size: 11, font: fontBold, color: NAVY,
  });

  y -= 20;
  // Modules list
  for (const mod of data.modules) {
    const completedDate = new Date(mod.completed_at);
    page.drawRectangle({ x: 60, y: y - 6, width: 8, height: 8, color: EMERALD });
    page.drawText(mod.title, { x: 76, y, size: 10, font: fontBold, color: NAVY });
    page.drawText(`Score : ${mod.score}%  ·  ${formatDate(completedDate)}`, {
      x: 76, y: y - 13, size: 8, font: fontRegular, color: GRAY,
    });
    y -= 32;
  }

  y -= 10;
  page.drawLine({ start: { x: 60, y }, end: { x: width - 60, y }, thickness: 0.5, color: rgb(0.85, 0.87, 0.92) });

  y -= 25;
  // Score moyenne
  page.drawRectangle({ x: 60, y: y - 10, width: 200, height: 38, color: NAVY });
  page.drawText("Score moyen", { x: 75, y: y + 14, size: 8, font: fontRegular, color: rgb(0.7, 0.75, 0.9) });
  page.drawText(`${data.score_average}%`, { x: 75, y: y - 2, size: 18, font: fontBold, color: WHITE });

  const now = new Date();
  const validUntil = new Date(now);
  validUntil.setFullYear(validUntil.getFullYear() + 1);

  page.drawText(`Délivrée le : ${formatDate(now)}`, { x: 270, y: y + 8, size: 9, font: fontRegular, color: GRAY });
  page.drawText(`Valable jusqu'au : ${formatDate(validUntil)}`, { x: 270, y: y - 6, size: 9, font: fontRegular, color: GRAY });

  // ── QR Code + verification block ─────────────────────────────────────────
  y -= 75;
  const verifyUrl = `${data.base_url}/verify/${data.attestation_id}`;

  // Try to embed QR image
  const qrBytes = await fetchQRCodeBytes(verifyUrl);
  const blockH = 80;
  page.drawRectangle({ x: 55, y: y - 15, width: width - 110, height: blockH, color: LIGHT });

  if (qrBytes) {
    try {
      const qrImg = await pdf.embedPng(qrBytes);
      page.drawImage(qrImg, { x: 65, y: y - 10, width: 60, height: 60 });
      page.drawText("Vérifier l'authenticité :", { x: 138, y: y + 42, size: 9, font: fontBold, color: NAVY });
      page.drawText(verifyUrl, { x: 138, y: y + 28, size: 7.5, font: fontOblique, color: INDIGO });
      page.drawText(`N° : ${data.attestation_id}`, { x: 138, y: y + 14, size: 7, font: fontRegular, color: GRAY });
      page.drawText("Scanner le QR code pour valider ce document", { x: 138, y: y, size: 7.5, font: fontRegular, color: GRAY });
    } catch {
      // Fallback text
      page.drawText("Vérification en ligne :", { x: 75, y: y + 38, size: 9, font: fontBold, color: NAVY });
      page.drawText(verifyUrl, { x: 75, y: y + 24, size: 7.5, font: fontOblique, color: INDIGO });
      page.drawText(`N° : ${data.attestation_id}`, { x: 75, y: y + 10, size: 7, font: fontRegular, color: GRAY });
    }
  } else {
    page.drawText("Vérification en ligne :", { x: 75, y: y + 38, size: 9, font: fontBold, color: NAVY });
    page.drawText(verifyUrl, { x: 75, y: y + 24, size: 7.5, font: fontOblique, color: INDIGO });
    page.drawText(`N° : ${data.attestation_id}`, { x: 75, y: y + 10, size: 7, font: fontRegular, color: GRAY });
  }

  // Partner mention (if present)
  if (data.partner_name) {
    y -= 35;
    page.drawText(`En partenariat avec : ${data.partner_name}`, {
      x: 60, y, size: 8, font: fontOblique, color: INDIGO,
    });
  }

  // Footer
  const footerText = "GENIE IA — Plateforme de formation professionnelle en IA & Cybersécurité — genie-ia.app";
  page.drawText(footerText, {
    x: width / 2 - fontRegular.widthOfTextAtSize(footerText, 7) / 2,
    y: 20, size: 7, font: fontRegular, color: rgb(0.7, 0.75, 0.9),
  });

  return pdf.save();
}

async function buildCharte(data: {
  org_name: string;
  sections: { title: string; content: string }[];
  type_label: string;
  base_url: string;
  partner_name?: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const fontBold    = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);

  const addPage = () => {
    const p = pdf.addPage([595, 842]);
    p.drawRectangle({ x: 0, y: 0, width: 6, height: 842, color: INDIGO });
    return p;
  };

  let page = addPage();
  const { width, height } = page.getSize();
  let y = height - 60;

  // Header
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: NAVY });
  page.drawText(data.type_label, {
    x: 30, y: height - 48, size: 12, font: fontBold, color: WHITE,
  });
  page.drawText(data.org_name, { x: 30, y: height - 65, size: 10, font: fontRegular, color: LIGHT });

  y = height - 110;

  for (const section of data.sections) {
    if (y < 100) { page = addPage(); y = height - 40; }

    page.drawRectangle({ x: 20, y: y - 4, width: width - 40, height: 22, color: LIGHT });
    page.drawText(section.title, { x: 30, y: y + 3, size: 11, font: fontBold, color: NAVY });
    y -= 28;

    const lines = wrapText(section.content, width - 80, fontRegular, 9);
    for (const line of lines) {
      if (y < 80) { page = addPage(); y = height - 40; }
      page.drawText(line, { x: 30, y, size: 9, font: fontRegular, color: GRAY });
      y -= 14;
    }
    y -= 10;
  }

  // ── Viral footer on last page ──────────────────────────────────────────────
  const lastPage = pdf.getPages()[pdf.getPageCount() - 1];
  const lastH = lastPage.getSize().height;

  // Get QR code for landing page
  const landingQr = await fetchQRCodeBytes(data.base_url);
  lastPage.drawLine({ start: { x: 20, y: 78 }, end: { x: width - 20, y: 78 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.85) });

  if (landingQr) {
    try {
      const qrImg = await pdf.embedPng(landingQr);
      lastPage.drawImage(qrImg, { x: 25, y: 10, width: 50, height: 50 });
      lastPage.drawText("Formez votre équipe sur GENIE IA", { x: 85, y: 52, size: 9, font: fontBold, color: NAVY });
      lastPage.drawText(data.base_url, { x: 85, y: 38, size: 8, font: fontRegular, color: INDIGO });
      if (data.partner_name) {
        lastPage.drawText(`Programme partenaire : ${data.partner_name}`, { x: 85, y: 24, size: 7, font: fontRegular, color: INDIGO });
      }
      lastPage.drawText(`Généré par GENIE IA — ${formatDate(new Date())}`, { x: 85, y: 12, size: 7, font: fontRegular, color: GRAY });
    } catch {
      lastPage.drawText(`Formez votre équipe : ${data.base_url} — Généré par GENIE IA — ${formatDate(new Date())}`, {
        x: 30, y: 30, size: 7, font: fontRegular, color: GRAY,
      });
    }
  } else {
    lastPage.drawText(`Formez votre équipe : ${data.base_url} — Généré par GENIE IA — ${formatDate(new Date())}`, {
      x: 30, y: 42, size: 8, font: fontRegular, color: NAVY,
    });
    if (data.partner_name) {
      lastPage.drawText(`Programme partenaire : ${data.partner_name}`, { x: 30, y: 28, size: 7, font: fontRegular, color: INDIGO });
    }
    lastPage.drawText(`${formatDate(new Date())}`, { x: 30, y: 14, size: 7, font: fontRegular, color: GRAY });
  }

  return pdf.save();
}

async function buildChecklist(data: {
  title: string;
  items: string[];
  module_title: string;
  base_url: string;
  partner_name?: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const { width, height } = page.getSize();
  const fontBold    = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);

  page.drawRectangle({ x: 0, y: 0, width, height, color: WHITE });
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: NAVY });
  page.drawText(data.title, { x: 40, y: height - 50, size: 16, font: fontBold, color: WHITE });
  page.drawText(data.module_title, { x: 40, y: height - 68, size: 9, font: fontRegular, color: LIGHT });

  let y = height - 110;
  for (const item of data.items) {
    // Checkbox
    page.drawRectangle({ x: 40, y: y - 2, width: 14, height: 14, borderColor: NAVY, borderWidth: 1.5, color: WHITE });
    page.drawText(item, { x: 62, y, size: 10, font: fontRegular, color: NAVY });
    y -= 30;
    if (y < 100) break;
  }

  // ── Viral footer + QR ─────────────────────────────────────────────────────
  page.drawLine({ start: { x: 40, y: 90 }, end: { x: width - 40, y: 90 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.85) });

  const landingQr = await fetchQRCodeBytes(data.base_url);
  if (landingQr) {
    try {
      const qrImg = await pdf.embedPng(landingQr);
      page.drawImage(qrImg, { x: 40, y: 10, width: 60, height: 60 });
      page.drawText("Formez votre équipe à l'IA et la cybersécurité", { x: 115, y: 62, size: 9, font: fontBold, color: NAVY });
      page.drawText(data.base_url, { x: 115, y: 48, size: 8, font: fontRegular, color: INDIGO });
      if (data.partner_name) {
        page.drawText(`Programme partenaire : ${data.partner_name}`, { x: 115, y: 34, size: 7, font: fontRegular, color: INDIGO });
      }
      page.drawText("Généré par GENIE IA", { x: 115, y: 20, size: 7, font: fontRegular, color: GRAY });
    } catch {
      page.drawText(`Formez votre équipe sur ${data.base_url}`, { x: 40, y: 62, size: 8, font: fontRegular, color: INDIGO });
      page.drawText("Généré par GENIE IA", { x: 40, y: 48, size: 7, font: fontRegular, color: GRAY });
    }
  } else {
    page.drawText(`Formez votre équipe sur ${data.base_url}`, { x: 40, y: 70, size: 8, font: fontRegular, color: INDIGO });
    if (data.partner_name) {
      page.drawText(`Programme partenaire : ${data.partner_name}`, { x: 40, y: 56, size: 7, font: fontRegular, color: INDIGO });
    }
    page.drawText("Généré par GENIE IA", { x: 40, y: 42, size: 7, font: fontRegular, color: GRAY });
  }

  return pdf.save();
}

// ─── Default content for templates ───────────────────────────────────────────
const DEFAULT_CHARTE_SECTIONS = [
  { title: "1. Objet et périmètre", content: "La présente charte définit les règles d'utilisation des outils d'intelligence artificielle au sein de l'organisation. Elle s'applique à l'ensemble des collaborateurs, prestataires et partenaires ayant accès aux systèmes informatiques de l'entreprise." },
  { title: "2. Outils IA autorisés", content: "Seuls les outils IA listés et approuvés par la direction des systèmes d'information sont autorisés. L'usage d'outils non référencés doit faire l'objet d'une demande préalable auprès du responsable sécurité." },
  { title: "3. Données : ce qui peut / ne peut pas être partagé", content: "Il est strictement interdit de partager avec une IA des données personnelles (RGPD), des données confidentielles clients, des secrets industriels, des informations stratégiques ou tout document marqué « confidentiel ». Les données anonymisées et les informations publiques peuvent être utilisées." },
  { title: "4. Validation humaine obligatoire", content: "Toute sortie d'une IA (texte, code, analyse, décision) doit être vérifiée par un être humain compétent avant utilisation. L'IA ne remplace pas le jugement professionnel. En cas de doute, ne pas utiliser le résultat." },
  { title: "5. Confidentialité et RGPD", content: "Les utilisateurs doivent s'assurer que l'outil IA utilisé est conforme au RGPD. En cas de traitement de données personnelles, un registre des traitements doit être mis à jour et une analyse d'impact (AIPD) peut être requise. Contacter le DPO pour toute question." },
  { title: "6. Responsabilités", content: "Chaque utilisateur est responsable de l'usage qu'il fait des outils IA dans le cadre de ses missions. L'organisation ne peut être tenue responsable des erreurs ou hallucinations des systèmes IA. La responsabilité finale incombe à l'utilisateur." },
  { title: "7. Sanctions", content: "Tout manquement aux présentes règles peut entraîner des sanctions disciplinaires, pouvant aller jusqu'au licenciement, ainsi que des poursuites judiciaires en cas de violation de la confidentialité ou de la réglementation." },
  { title: "8. Mise à jour et révision", content: "Cette charte sera révisée annuellement ou en cas d'évolution majeure de la réglementation ou des outils disponibles. La version en vigueur est disponible sur l'intranet de l'entreprise." },
];

const DEFAULT_SOP_SECTIONS = [
  { title: "1. Politique de mots de passe", content: "Minimum 12 caractères avec majuscules, minuscules, chiffres et caractères spéciaux. Changement obligatoire tous les 90 jours. Interdiction de réutiliser les 10 derniers mots de passe. Utilisation d'un gestionnaire de mots de passe approuvé (Bitwarden, 1Password)." },
  { title: "2. Authentification multi-facteurs (MFA)", content: "Le MFA est obligatoire pour tous les accès aux systèmes critiques, VPN, messagerie professionnelle et applications cloud. L'authenticator TOTP est privilégié (Google Authenticator, Authy). Les SMS sont déconseillés comme second facteur (SIM swapping)." },
  { title: "3. Politique de sauvegarde (règle 3-2-1)", content: "3 copies des données, sur 2 supports différents, dont 1 hors site. Les sauvegardes sont testées mensuellement. Durée de rétention : 30 jours minimum pour les données opérationnelles, 5 ans pour les données légales." },
  { title: "4. Utilisation du Wi-Fi et BYOD", content: "Interdiction d'utiliser les Wi-Fi publics sans VPN. Les appareils personnels (BYOD) doivent être enregistrés et respecter la politique de sécurité. Segmentation réseau obligatoire entre réseau entreprise et réseau invités." },
  { title: "5. Procédure en cas d'incident", content: "1) Isoler le système compromis du réseau. 2) Notifier immédiatement le RSSI ou responsable IT. 3) Documenter l'incident (date, heure, type, systèmes affectés). 4) Ne pas éteindre les machines avant l'intervention technique. 5) Conserver les preuves (logs, screenshots)." },
  { title: "6. Signalement de phishing", content: "En cas de réception d'un email suspect : ne pas cliquer sur les liens, ne pas ouvrir les pièces jointes, signaler via le bouton dédié ou à l'adresse securite@[votre-domaine]. En cas de doute sur une communication, vérifier par téléphone auprès de l'expéditeur présumé." },
  { title: "7. Contacts d'urgence", content: "RSSI / Responsable sécurité : [contact] | DSI : [contact] | ANSSI (incidents majeurs) : cert-fr.cert.ssi.gouv.fr | CNIL (violation de données) : cnil.fr | Police Cybercriminalité : 3018" },
];

// ─── Main handler ─────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth check
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authErr } = await anonClient.auth.getClaims(token);
    if (authErr || !authData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = authData.claims.sub as string;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // ── Shield: IP rate limit ─────────────────────────────────────────────────
    const clientIp = getClientIp(req);
    const ipHash = await hashIp(clientIp);
    const ipCheck = await checkIpRateLimit(ipHash, "generate-pdf", 20, 24);
    if (!ipCheck.allowed) {
      recordAbuse(null, ipHash, "rate_exceeded", "low", { endpoint: "generate-pdf" });
      return new Response(JSON.stringify({ error: "Trop de requêtes. Réessayez plus tard." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "3600" },
      });
    }

    const body = await req.json();
    const { type, module_id, attestation_id, org_name, base_url = "https://genie-ia.app", referral_code } = body;

    // ── Quota check ───────────────────────────────────────────────────────────
    // Get user's org_id for quota calculation
    const { data: userProfile } = await supabaseAdmin
      .from("profiles").select("org_id, full_name").eq("id", userId).single();
    const orgId = userProfile?.org_id ?? null;

    const { data: quotaResult } = await supabaseAdmin.rpc("can_execute", {
      _user_id: userId,
      _org_id: orgId ?? "00000000-0000-0000-0000-000000000000",
      _kind: "pdf_generated",
    });

    if (quotaResult && quotaResult.allowed === false) {
      return new Response(JSON.stringify({
        error: "quota_exceeded",
        message: `Quota PDF atteint (${quotaResult.current_usage}/${quotaResult.limit} ce mois). Passez à GENIE Pro pour plus.`,
        quota: quotaResult,
      }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Resolve partner name if referral_code provided ────────────────────────
    let partnerName: string | undefined;
    if (referral_code) {
      const { data: referralData } = await supabaseAdmin.rpc("resolve_referral", { _code: referral_code });
      if (referralData?.found) {
        partnerName = referralData.partner_name as string;
      }
    }

    let pdfBytes: Uint8Array;
    let filename = "";
    let attestId = attestation_id;

    if (type === "attestation") {
      // Fetch org if needed
      let orgName: string | undefined;
      if (orgId) {
        const { data: org } = await supabaseAdmin
          .from("organizations").select("name").eq("id", orgId).single();
        orgName = org?.name;
      }

      // Fetch completed modules
      const { data: progRows } = await supabaseAdmin
        .from("progress")
        .select("score, completed_at, module_id, modules(title)")
        .eq("user_id", userId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false });

      const modules = (progRows ?? []).map((r: { score: number; completed_at: string; modules: { title: string } | null }) => ({
        title: r.modules?.title ?? "Module",
        score: r.score ?? 0,
        completed_at: r.completed_at,
      }));

      const avg = modules.length > 0
        ? Math.round(modules.reduce((s, m) => s + m.score, 0) / modules.length)
        : 0;

      // Upsert attestation record
      if (!attestId) {
        const { data: att } = await supabaseAdmin.from("attestations").insert({
          user_id: userId,
          org_id: orgId ?? null,
          modules_completed: modules,
          score_average: avg,
        }).select("id").single();
        attestId = att?.id;
      }

      pdfBytes = await buildAttestation({
        full_name: userProfile?.full_name ?? "Utilisateur",
        org_name: orgName ?? org_name,
        modules,
        score_average: avg,
        attestation_id: attestId,
        base_url,
        partner_name: partnerName,
      });
      filename = `attestation_${new Date().toISOString().slice(0, 10)}.pdf`;

    } else if (type === "charte") {
      pdfBytes = await buildCharte({
        org_name: org_name ?? "Votre Organisation",
        sections: DEFAULT_CHARTE_SECTIONS,
        type_label: "CHARTE D'UTILISATION DE L'INTELLIGENCE ARTIFICIELLE",
        base_url,
        partner_name: partnerName,
      });
      filename = "charte_ia_interne.pdf";

    } else if (type === "sop") {
      pdfBytes = await buildCharte({
        org_name: org_name ?? "Votre Organisation",
        sections: DEFAULT_SOP_SECTIONS,
        type_label: "SOP CYBERSÉCURITÉ — PROCÉDURES OPÉRATIONNELLES",
        base_url,
        partner_name: partnerName,
      });
      filename = "sop_cybersecurite.pdf";

    } else if (type === "checklist") {
      const { data: mod } = await supabaseAdmin
        .from("modules").select("title, deliverables").eq("id", module_id).single();

      const deliverables = (mod?.deliverables ?? []) as { type: string; items?: string[]; title: string }[];
      const checklistDel = deliverables.find((d) => d.type === "checklist");
      const items: string[] = checklistDel?.items ?? [
        "Identifier les outils IA utilisés dans mon organisation",
        "Vérifier les paramètres de confidentialité de chaque outil",
        "Former l'équipe aux bonnes pratiques IA",
        "Mettre en place une procédure de validation humaine",
        "Documenter les cas d'usage approuvés",
        "Auditer les accès et les droits des outils IA",
        "Mettre à jour la charte d'utilisation",
        "Sensibiliser aux risques de désinformation",
        "Vérifier la conformité RGPD",
        "Planifier une révision trimestrielle",
      ];

      pdfBytes = await buildChecklist({
        title: `Checklist — ${mod?.title ?? "Module"}`,
        items,
        module_title: mod?.title ?? "",
        base_url,
        partner_name: partnerName,
      });
      filename = `checklist_${mod?.title?.toLowerCase().replace(/\s+/g, "_") ?? "module"}.pdf`;

    } else {
      return new Response(JSON.stringify({ error: "Type de PDF non reconnu" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Increment quota counter ───────────────────────────────────────────────
    supabaseAdmin.rpc("increment_usage", {
      _user_id: userId,
      _org_id: orgId ?? "00000000-0000-0000-0000-000000000000",
      _kind: "pdf_generated",
      _amount: 1,
    }).then(() => {}).catch(() => {});

    // Upload to storage
    const storagePath = `${userId}/${Date.now()}_${filename}`;
    const { error: uploadErr } = await supabaseAdmin.storage
      .from("pdfs")
      .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true });

    if (uploadErr) {
      console.error("Storage upload error:", uploadErr);
    }

    // Generate signed URL (24h)
    let signedUrl: string | null = null;
    if (!uploadErr) {
      const { data: signed } = await supabaseAdmin.storage
        .from("pdfs")
        .createSignedUrl(storagePath, 86400);
      signedUrl = signed?.signedUrl ?? null;

      // Update attestation with pdf_url
      if (type === "attestation" && attestId && signedUrl) {
        await supabaseAdmin.from("attestations")
          .update({ pdf_url: signedUrl })
          .eq("id", attestId);
      }

      // Save artifact record
      const artifactTitles: Record<string, string> = {
        checklist: "Checklist — Module",
        charte: "Charte IA Interne",
        sop: "SOP Cybersécurité",
        attestation: "Attestation de Formation",
      };
      await supabaseAdmin.from("artifacts").insert({
        user_id: userId,
        org_id: orgId ?? null,
        type,
        title: body.artifact_title ?? artifactTitles[type] ?? filename,
        session_id: body.session_id ?? null,
        file_path: storagePath,
        signed_url: signedUrl,
      }).select().single();
    }

    // Always return PDF bytes as base64 for direct download fallback
    const base64 = btoa(String.fromCharCode(...pdfBytes));

    return new Response(JSON.stringify({
      success: true,
      filename,
      signed_url: signedUrl,
      pdf_base64: base64,
      attestation_id: attestId,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("generate-pdf error:", err);
    return new Response(JSON.stringify({
      error: err instanceof Error ? err.message : "Erreur lors de la génération du PDF",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
