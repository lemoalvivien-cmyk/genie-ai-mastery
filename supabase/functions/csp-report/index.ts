/**
 * Edge function: csp-report
 * Receives CSP violation reports from browsers and stores them in csp_reports table.
 * Note: this endpoint intentionally accepts reports from any browser origin
 * (browsers cannot control the Origin header for CSP reports).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = {
    ...getCorsHeaders(req.headers.get("origin")),
    "Access-Control-Allow-Origin": "*", // CSP reports come from browsers without Origin
  };

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(null, { status: 405, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Parse body — browsers send either application/csp-report or application/json
    let reportBody: Record<string, unknown> = {};
    try {
      const text = await req.text();
      if (text) {
        const parsed = JSON.parse(text);
        // Standard CSP report wraps data in "csp-report" key
        reportBody = parsed["csp-report"] ?? parsed;
      }
    } catch (_e) {
      // Malformed report — still return 204 to avoid browser retries
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Extract standard CSP violation fields
    const row = {
      document_uri:        String(reportBody["document-uri"]        ?? reportBody["documentURI"]        ?? ""),
      violated_directive:  String(reportBody["violated-directive"]   ?? reportBody["violatedDirective"]  ?? ""),
      effective_directive: String(reportBody["effective-directive"]  ?? reportBody["effectiveDirective"] ?? ""),
      blocked_uri:         String(reportBody["blocked-uri"]          ?? reportBody["blockedURI"]         ?? ""),
      original_policy:     String(reportBody["original-policy"]      ?? reportBody["originalPolicy"]     ?? ""),
      disposition:         String(reportBody["disposition"]          ?? "enforce"),
      status_code:         Number(reportBody["status-code"]          ?? reportBody["statusCode"]         ?? 0)  || null,
      source_file:         String(reportBody["source-file"]          ?? reportBody["sourceFile"]         ?? "") || null,
      line_number:         Number(reportBody["line-number"]          ?? reportBody["lineNumber"]         ?? 0)  || null,
      column_number:       Number(reportBody["column-number"]        ?? reportBody["columnNumber"]       ?? 0)  || null,
      user_agent:          req.headers.get("user-agent") ?? null,
      ip_address:          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    };

    // Skip noisy browser extension noise
    const NOISE_PREFIXES = ["chrome-extension://", "moz-extension://", "safari-extension://", "about:"];
    if (NOISE_PREFIXES.some((p) => row.blocked_uri.startsWith(p))) {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Skip empty reports
    if (!row.violated_directive && !row.blocked_uri) {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Insert — fire and forget style, never block the browser response
    await supabase.from("csp_reports").insert(row);

    // Log for edge function logs visibility
    console.log(`[CSP] ${row.disposition} | ${row.violated_directive} | ${row.blocked_uri}`);

    // Always 204 — browsers expect no body
    return new Response(null, { status: 204, headers: corsHeaders });

  } catch (err) {
    console.error("[CSP] Error storing report:", err);
    // Still return 204 — browser should not retry on errors
    return new Response(null, { status: 204, headers: corsHeaders });
  }
});
