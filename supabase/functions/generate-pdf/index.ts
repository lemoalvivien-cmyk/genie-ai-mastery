import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getClientIp, hashIp, checkIpRateLimit, recordAbuse, SHIELD_CONFIG } from "../_shared/shield.ts";
import { PDFDocument, rgb, StandardFonts, degrees } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Color palette ────────────────────────────────────────────────────────────
const NAVY   = rgb(0.08, 0.12, 0.27);
const INDIGO = rgb(0.39, 0.40, 0.94);
const EMERALD = rgb(0.06, 0.73, 0.51);
const GRAY   = rgb(0.40, 0.40, 0.45);
const LIGHT  = rgb(0.96, 0.97, 1.00);
const WHITE  = rgb(1, 1, 1);
const AMBER  = rgb(0.96, 0.62, 0.04);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function wrapText(text: string, maxWidth: number, font: typeof StandardFonts, size: number, pdfFont: Awaited<ReturnType<PDFDocument["embedFont"]>>): string[] {
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

  // Side accent line (indigo)
  page.drawRectangle({ x: 0, y: 50, width: 6, height: height - 130, color: INDIGO });
  page.drawRectangle({ x: width - 6, y: 50, width: 6, height: height - 130, color: INDIGO });

  // Header: logo text
  page.drawText("⚡ GENIE IA", { x: 40, y: height - 52, size: 22, font: fontBold, color: WHITE });
  page.drawText("Plateforme de Formation Professionnelle", {
    x: 40, y: height - 70, size: 9, font: fontRegular, color: rgb(0.7, 0.75, 0.9),
  });

  // Main title
  page.drawText("ATTESTATION DE FORMATION", {
    x: width / 2 - fontBold.widthOfTextAtSize("ATTESTATION DE FORMATION", 20) / 2,
    y: height - 130,
    size: 20, font: fontBold, color: NAVY,
  });

  // Decorative line under title
  page.drawLine({ start: { x: 50, y: height - 145 }, end: { x: width - 50, y: height - 145 }, thickness: 1, color: INDIGO });
  page.drawLine({ start: { x: 50, y: height - 148 }, end: { x: width - 50, y: height - 148 }, thickness: 0.3, color: INDIGO });

  // Certifying text
  let y = height - 185;
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
  // Decorative separator
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

  // QR-like visual block (simplified — points to verify URL)
  y -= 60;
  const verifyUrl = `${data.base_url}/verify/${data.attestation_id}`;
  page.drawRectangle({ x: 60, y: y - 15, width: width - 120, height: 55, color: LIGHT });
  page.drawText("🔍 Vérification en ligne :", { x: 75, y: y + 22, size: 9, font: fontBold, color: NAVY });
  page.drawText(verifyUrl, { x: 75, y: y + 8, size: 8, font: fontOblique, color: INDIGO });
  page.drawText(`N° attestation : ${data.attestation_id}`, { x: 75, y: y - 6, size: 7, font: fontRegular, color: GRAY });

  // Footer
  page.drawText("GENIE IA — Plateforme de formation professionnelle en IA & Cybersécurité", {
    x: width / 2 - fontRegular.widthOfTextAtSize("GENIE IA — Plateforme de formation professionnelle en IA & Cybersécurité", 8) / 2,
    y: 20, size: 8, font: fontRegular, color: rgb(0.7, 0.75, 0.9),
  });

  return pdf.save();
}

async function buildCharte(data: { org_name: string; sections: { title: string; content: string }[] }): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const fontBold    = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);

  const addPage = () => {
    const p = pdf.addPage([595, 842]);
    // Side accent
    p.drawRectangle({ x: 0, y: 0, width: 6, height: 842, color: INDIGO });
    return p;
  };

  let page = addPage();
  const { width, height } = page.getSize();
  let y = height - 60;

  // Header
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: NAVY });
  page.drawText("CHARTE D'UTILISATION DE L'INTELLIGENCE ARTIFICIELLE", {
    x: 30, y: height - 48, size: 12, font: fontBold, color: WHITE,
  });
  page.drawText(data.org_name, { x: 30, y: height - 65, size: 10, font: fontRegular, color: LIGHT });

  y = height - 110;

  for (const section of data.sections) {
    if (y < 100) { page = addPage(); y = height - 40; }

    page.drawRectangle({ x: 20, y: y - 4, width: width - 40, height: 22, color: LIGHT });
    page.drawText(section.title, { x: 30, y: y + 3, size: 11, font: fontBold, color: NAVY });
    y -= 28;

    const lines = wrapText(section.content, width - 80, StandardFonts.Helvetica, 9, fontRegular);
    for (const line of lines) {
      if (y < 60) { page = addPage(); y = height - 40; }
      page.drawText(line, { x: 30, y, size: 9, font: fontRegular, color: GRAY });
      y -= 14;
    }
    y -= 10;
  }

  // Footer
  const lastPage = pdf.getPages()[pdf.getPageCount() - 1];
  lastPage.drawText(`Généré par GENIE IA — ${formatDate(new Date())} — À faire valider par votre DPO/juriste`, {
    x: 30, y: 20, size: 7, font: fontRegular, color: GRAY,
  });

  return pdf.save();
}

async function buildChecklist(data: { title: string; items: string[]; module_title: string; base_url: string }): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const { width, height } = page.getSize();
  const fontBold    = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);

  page.drawRectangle({ x: 0, y: 0, width, height, color: WHITE });
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: NAVY });
  page.drawText("✓ " + data.title, { x: 40, y: height - 50, size: 18, font: fontBold, color: WHITE });
  page.drawText(data.module_title, { x: 40, y: height - 68, size: 9, font: fontRegular, color: LIGHT });

  let y = height - 110;
  for (const item of data.items) {
    // Checkbox
    page.drawRectangle({ x: 40, y: y - 2, width: 14, height: 14, borderColor: NAVY, borderWidth: 1.5, color: WHITE });
    page.drawText(item, { x: 62, y, size: 10, font: fontRegular, color: NAVY });
    y -= 30;
    if (y < 100) break;
  }

  // Footer QR-like
  page.drawLine({ start: { x: 40, y: 75 }, end: { x: width - 40, y: 75 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.85) });
  page.drawText(`Formez votre équipe sur ${data.base_url}`, {
    x: 40, y: 55, size: 8, font: fontRegular, color: INDIGO,
  });
  page.drawText("Généré par GENIE IA", { x: 40, y: 40, size: 7, font: fontRegular, color: GRAY });

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

    // ── Shield: IP rate limit for demo PDF generation ─────────────────────────
    const clientIp = getClientIp(req);
    const ipHash = await hashIp(clientIp);
    const ipCheck = await checkIpRateLimit(ipHash, "demo", SHIELD_CONFIG.demo.maxRequests, SHIELD_CONFIG.demo.windowHours);
    if (!ipCheck.allowed) {
      recordAbuse(null, ipHash, "rate_exceeded", "low", { endpoint: "generate-pdf" });
      return new Response(JSON.stringify({ error: "Limite atteinte : 1 PDF gratuit par IP par 24h. Créez un compte pour continuer." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "3600" },
      });
    }

    const body = await req.json();
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { type, module_id, attestation_id, org_name, base_url = "https://genie-ia.app" } = body;

    let pdfBytes: Uint8Array;
    let filename = "";
    let attestId = attestation_id;

    if (type === "attestation") {
      // Fetch user profile
      const { data: profile } = await serviceClient
        .from("profiles").select("full_name, org_id").eq("id", userId).single();
      
      // Fetch org if needed
      let orgName: string | undefined;
      if (profile?.org_id) {
        const { data: org } = await serviceClient
          .from("organizations").select("name").eq("id", profile.org_id).single();
        orgName = org?.name;
      }

      // Fetch completed modules
      const { data: progRows } = await serviceClient
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
        const { data: att } = await serviceClient.from("attestations").insert({
          user_id: userId,
          org_id: profile?.org_id ?? null,
          modules_completed: modules,
          score_average: avg,
        }).select("id").single();
        attestId = att?.id;
      }

      pdfBytes = await buildAttestation({
        full_name: profile?.full_name ?? "Utilisateur",
        org_name: orgName ?? org_name,
        modules,
        score_average: avg,
        attestation_id: attestId,
        base_url,
      });
      filename = `attestation_${new Date().toISOString().slice(0, 10)}.pdf`;

    } else if (type === "charte") {
      pdfBytes = await buildCharte({
        org_name: org_name ?? "Votre Organisation",
        sections: DEFAULT_CHARTE_SECTIONS,
      });
      filename = "charte_ia_interne.pdf";

    } else if (type === "sop") {
      pdfBytes = await buildCharte({
        org_name: org_name ?? "Votre Organisation",
        sections: DEFAULT_SOP_SECTIONS,
      });
      filename = "sop_cybersecurite.pdf";

    } else if (type === "checklist") {
      // Fetch module deliverables for checklist items
      const { data: mod } = await serviceClient
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
      });
      filename = `checklist_${mod?.title?.toLowerCase().replace(/\s+/g, "_") ?? "module"}.pdf`;

    } else {
      return new Response(JSON.stringify({ error: "Type de PDF non reconnu" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upload to storage
    const storagePath = `${userId}/${Date.now()}_${filename}`;
    const { error: uploadErr } = await serviceClient.storage
      .from("pdfs")
      .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true });

    if (uploadErr) {
      console.error("Storage upload error:", uploadErr);
      // Fall back to direct download even if storage fails
    }

    // Generate signed URL (24h)
    let signedUrl: string | null = null;
    if (!uploadErr) {
      const { data: signed } = await serviceClient.storage
        .from("pdfs")
        .createSignedUrl(storagePath, 86400);
      signedUrl = signed?.signedUrl ?? null;

    // Update attestation with pdf_url
      if (type === "attestation" && attestId && signedUrl) {
        await serviceClient.from("attestations")
          .update({ pdf_url: signedUrl })
          .eq("id", attestId);
      }

      // Save artifact record for Artifact Forge history
      const artifactTitles: Record<string, string> = {
        checklist: "Checklist — Module",
        charte: "Charte IA Interne",
        sop: "SOP Cybersécurité",
        attestation: "Attestation de Formation",
        memo_vibe: "Mémo Vibe Coding",
      };
      const { data: profileForOrg } = await serviceClient
        .from("profiles").select("org_id").eq("id", userId).single();
      await serviceClient.from("artifacts").insert({
        user_id: userId,
        org_id: profileForOrg?.org_id ?? null,
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
