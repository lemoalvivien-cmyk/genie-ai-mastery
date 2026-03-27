/**
 * Anti-Bullshit Enforcement Tests
 *
 * These tests fail if:
 * 1. A sensitive keyword appears on a public page without a truth matrix entry
 * 2. A "removed" claim reappears in public pages
 * 3. A "flagged" claim leaks into public pages
 * 4. The truth matrix has entries without proof
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  PRODUCT_TRUTH_MATRIX,
  getClaimsByStatus,
  getFlaggedClaims,
} from "@/config/product-truth-matrix";

// ── Helpers ────────────────────────────────────────────────────
function readSource(relativePath: string): string {
  try {
    return readFileSync(resolve(__dirname, "..", relativePath), "utf-8");
  } catch {
    return "";
  }
}

const PUBLIC_PAGES = [
  "pages/Index.tsx",
  "pages/Pricing.tsx",
  "pages/Demo.tsx",
  "components/ProFooter.tsx",
  "components/LandingStats.tsx",
];

function getAllPublicSource(): string {
  return PUBLIC_PAGES.map(readSource).join("\n");
}

// ── Sensitive keywords that MUST have a truth matrix entry ────
const SENSITIVE_PATTERNS = [
  { pattern: /temps\s+réel/gi, label: "temps réel" },
  { pattern: /\ben\s+direct\b/gi, label: "en direct" },
  { pattern: /\blive\b/gi, label: "live" },
  { pattern: /multi[\s-]?agent/gi, label: "multi-agent" },
  { pattern: /automati(que|sé|sation)/gi, label: "automatique/automatisé" },
  { pattern: /opérationnel/gi, label: "opérationnel" },
  { pattern: /analyse\s+avancée/gi, label: "analyse avancée" },
  { pattern: /rapport.*auto/gi, label: "rapport automatique" },
  { pattern: /intelligence\s+artificielle\s+avancée/gi, label: "IA avancée" },
];

// Allow-list: these exact contexts are proven/hedged in the matrix
const ALLOWED_CONTEXTS: RegExp[] = [
  // "opérationnel" used as adjective describing the outcome, not a feature claim
  /plus opérationnel à la fin/i,
  /rendre.*opérationnel/i,
  /équipe opérationnelle/i,
  // "automatiquement" for proven onboarding flow
  /construit automatiquement/i,
  /expirera automatiquement/i,
  /se fera automatiquement/i,
  // CSS/code comments
  /\/\/.*/,
];

function isAllowedContext(line: string): boolean {
  return ALLOWED_CONTEXTS.some((re) => re.test(line));
}

// ══════════════════════════════════════════════════════════════
//  TESTS
// ══════════════════════════════════════════════════════════════

describe("Product Truth Matrix — Integrity", () => {
  it("every entry has a non-empty proof field", () => {
    const missing = PRODUCT_TRUTH_MATRIX.filter((c) => !c.proof || c.proof.trim() === "");
    expect(missing, `Claims without proof: ${missing.map((c) => c.claim).join(", ")}`).toHaveLength(0);
  });

  it("every entry has a valid status", () => {
    const validStatuses = ["proven", "hedged", "flagged", "removed"];
    const invalid = PRODUCT_TRUTH_MATRIX.filter((c) => !validStatuses.includes(c.status));
    expect(invalid).toHaveLength(0);
  });

  it("no duplicate claims in the matrix", () => {
    const claims = PRODUCT_TRUTH_MATRIX.map((c) => c.claim.toLowerCase());
    const dupes = claims.filter((c, i) => claims.indexOf(c) !== i);
    expect(dupes, `Duplicate claims: ${dupes.join(", ")}`).toHaveLength(0);
  });
});

describe("Product Truth Matrix — Removed claims must stay removed", () => {
  const removed = getClaimsByStatus("removed");
  const publicSource = getAllPublicSource();

  removed.forEach((claim) => {
    it(`"${claim.claim}" must NOT appear on public pages`, () => {
      const searchTerms = claim.claim.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      // Check each significant word combination
      const found = searchTerms.every((term) =>
        publicSource.toLowerCase().includes(term)
      );
      // Only fail if ALL significant words appear together (proximity check)
      if (found && searchTerms.length >= 2) {
        // More precise: check if the exact phrase exists
        const exactMatch = publicSource.toLowerCase().includes(claim.claim.toLowerCase());
        expect(exactMatch, `Removed claim "${claim.claim}" found in public pages`).toBe(false);
      }
    });
  });
});

describe("Product Truth Matrix — Flagged claims must not leak", () => {
  const flagged = getFlaggedClaims();
  const publicSource = getAllPublicSource();

  // Check that flagged feature names don't appear as visible user text
  it("no 'Palantir' in public pages", () => {
    // Exclude comments and imports
    const lines = publicSource.split("\n").filter(
      (l) => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.includes("import")
    );
    const userFacing = lines.join("\n");
    expect(userFacing.toLowerCase()).not.toContain("palantir");
  });

  it("no 'multi-agent' in public pages", () => {
    const lines = publicSource.split("\n").filter(
      (l) => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.includes("import")
    );
    const userFacing = lines.join("\n");
    expect(userFacing.toLowerCase()).not.toMatch(/multi[\s-]?agent/);
  });

  it("no 'OpenClaw' in public pages", () => {
    const lines = publicSource.split("\n").filter(
      (l) => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.includes("import")
    );
    const userFacing = lines.join("\n");
    expect(userFacing.toLowerCase()).not.toContain("openclaw");
  });
});

describe("Product Truth Matrix — Sensitive keywords audit", () => {
  const publicSource = getAllPublicSource();
  const lines = publicSource.split("\n");

  SENSITIVE_PATTERNS.forEach(({ pattern, label }) => {
    it(`every "${label}" occurrence is covered by truth matrix or allowed context`, () => {
      const violations: string[] = [];

      lines.forEach((line, idx) => {
        // Skip comments, imports, type definitions
        const trimmed = line.trim();
        if (
          trimmed.startsWith("//") ||
          trimmed.startsWith("*") ||
          trimmed.startsWith("import") ||
          trimmed.startsWith("export type") ||
          trimmed.startsWith("export interface")
        ) return;

        if (pattern.test(line)) {
          pattern.lastIndex = 0; // Reset regex
          if (!isAllowedContext(line)) {
            violations.push(`Line ${idx + 1}: ${trimmed.substring(0, 120)}`);
          }
        }
      });

      if (violations.length > 0) {
        // Check if there's a matrix entry covering this
        const hasCoverage = PRODUCT_TRUTH_MATRIX.some(
          (c) =>
            (c.status === "proven" || c.status === "hedged") &&
            (c.claim.toLowerCase().includes(label.split("/")[0]) ||
              c.note?.toLowerCase().includes(label.split("/")[0]))
        );
        if (!hasCoverage) {
          expect.fail(
            `Sensitive keyword "${label}" found without truth matrix coverage:\n${violations.join("\n")}`
          );
        }
      }
    });
  });
});

describe("Product Truth Matrix — Business-critical invariants", () => {
  it("price 59€ is in the matrix as proven", () => {
    const price = PRODUCT_TRUTH_MATRIX.find((c) => c.claim.includes("59€"));
    expect(price).toBeDefined();
    expect(price!.status).toBe("proven");
  });

  it("14-day trial is in the matrix as proven", () => {
    const trial = PRODUCT_TRUTH_MATRIX.find((c) => c.claim.includes("14 jours"));
    expect(trial).toBeDefined();
    expect(trial!.status).toBe("proven");
  });

  it("voice mode is proven and behind feature flag", () => {
    const voice = PRODUCT_TRUTH_MATRIX.find((c) => c.category === "voice" && c.status === "proven");
    expect(voice).toBeDefined();
    expect(voice!.proof).toContain("voiceMode");
  });

  it("no claim has status 'proven' without a proof string > 10 chars", () => {
    const weak = PRODUCT_TRUTH_MATRIX.filter(
      (c) => c.status === "proven" && c.proof.length < 10
    );
    expect(weak, `Weak proofs: ${weak.map((c) => c.claim).join(", ")}`).toHaveLength(0);
  });
});
