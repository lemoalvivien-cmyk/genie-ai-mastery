import { useRef, useState, useCallback } from "react";
import Papa from "papaparse";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, FileText, AlertTriangle, CheckCircle2, X,
  AlertCircle, Users, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const REQUIRED_COLUMNS = ["email"] as const;
const EMAIL_RE = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CsvRow {
  email: string;
  full_name?: string;
  role?: string;
  [key: string]: string | undefined;
}

interface ParsedResult {
  rows: CsvRow[];
  duplicates: string[];
  invalidEmails: string[];
  missingColumns: string[];
  headers: string[];
}

interface ImportResult {
  success: number;
  skipped: number;
  errors: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  orgId: string;
  onComplete: () => void;
}

// ─── Helper: normalise CSV row to CsvRow ─────────────────────────────────────

function normaliseRow(raw: Record<string, string>): CsvRow {
  const lower = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k.trim().toLowerCase(), v?.trim() ?? ""])
  );
  return {
    email: (lower["email"] ?? lower["e-mail"] ?? lower["mail"] ?? "").toLowerCase(),
    full_name: lower["full_name"] ?? lower["nom"] ?? lower["name"] ?? lower["prénom"] ?? "",
    role: lower["role"] ?? lower["rôle"] ?? "",
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CsvImportDialog({ open, onClose, orgId, onComplete }: Props) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [dragOver, setDragOver] = useState(false);

  // ─── Reset state ──────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setFile(null);
    setParsed(null);
    setParseError(null);
    setImporting(false);
    setImportProgress(0);
    setImportResult(null);
    setStep("upload");
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const handleClose = () => { reset(); onClose(); };

  // ─── Parse CSV client-side ────────────────────────────────────────────────

  const processFile = useCallback((f: File) => {
    setParseError(null);
    setParsed(null);

    if (f.size > MAX_SIZE_BYTES) {
      setParseError(`Fichier trop volumineux (${(f.size / 1024 / 1024).toFixed(1)} MB). Maximum : 5 MB.`);
      return;
    }
    if (!f.name.toLowerCase().endsWith(".csv")) {
      setParseError("Format invalide. Seuls les fichiers .csv sont acceptés.");
      return;
    }

    setFile(f);

    Papa.parse<Record<string, string>>(f, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (results) => {
        const headers = results.meta.fields ?? [];

        // Check required columns
        const missingColumns = REQUIRED_COLUMNS.filter(
          (col) => !headers.some((h) => h.includes(col))
        );

        const rows: CsvRow[] = results.data.map(normaliseRow);
        const emails: string[] = [];
        const duplicates: string[] = [];
        const invalidEmails: string[] = [];

        rows.forEach((row, idx) => {
          const email = row.email;
          if (!email) {
            invalidEmails.push(`Ligne ${idx + 2} : email vide`);
            return;
          }
          if (!EMAIL_RE.test(email)) {
            invalidEmails.push(`Ligne ${idx + 2} : "${email}" invalide`);
            return;
          }
          if (emails.includes(email)) {
            duplicates.push(email);
          } else {
            emails.push(email);
          }
        });

        setParsed({ rows, duplicates, invalidEmails, missingColumns, headers });
        setStep("preview");
      },
      error: (err) => {
        setParseError(`Erreur de lecture : ${err.message}`);
      },
    });
  }, []);

  // ─── Drag & drop handlers ─────────────────────────────────────────────────

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) processFile(dropped);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  // ─── Server-side validation + import ─────────────────────────────────────

  const handleImport = async () => {
    if (!parsed || !orgId) return;

    const validRows = parsed.rows.filter((r) => {
      if (!r.email || !EMAIL_RE.test(r.email)) return false;
      // Exclude intra-list duplicates (keep first occurrence)
      const first = parsed.rows.findIndex((x) => x.email === r.email);
      return first === parsed.rows.indexOf(r);
    });

    if (validRows.length === 0) {
      toast({ title: "Aucune ligne valide à importer", variant: "destructive" });
      return;
    }

    setImporting(true);
    setImportProgress(0);

    const result: ImportResult = { success: 0, skipped: 0, errors: [] };

    // Call Edge Function validate-csv-import for server-side check
    let serverChecked: { allowed: string[]; blocked: string[]; reason: Record<string, string> } = {
      allowed: validRows.map((r) => r.email),
      blocked: [],
      reason: {},
    };

    try {
      const { data, error } = await supabase.functions.invoke("validate-csv-import", {
        body: { emails: validRows.map((r) => r.email), org_id: orgId },
      });
      if (!error && data) serverChecked = data;
    } catch {
      // Fail-open: proceed with client-side validated list
    }

    // Invite allowed rows via manager-invite
    const toInvite = validRows.filter((r) => serverChecked.allowed.includes(r.email));

    for (let i = 0; i < toInvite.length; i++) {
      const row = toInvite[i];
      try {
        const res = await supabase.functions.invoke("manager-invite", {
          body: { email: row.email, org_id: orgId, full_name: row.full_name || undefined },
        });
        if (res.error || res.data?.error) throw new Error(res.data?.error ?? res.error?.message ?? "Échec");
        result.success++;
      } catch (err) {
        result.errors.push(`${row.email} : ${err instanceof Error ? err.message : "Échec"}`);
        result.skipped++;
      }
      setImportProgress(Math.round(((i + 1) / toInvite.length) * 100));
    }

    // Add server-blocked as skipped
    serverChecked.blocked.forEach((email) => {
      result.skipped++;
      result.errors.push(`${email} : ${serverChecked.reason[email] ?? "Bloqué côté serveur"}`);
    });

    // Add intra-list duplicates as skipped
    parsed.duplicates.forEach((email) => {
      result.skipped++;
      result.errors.push(`${email} : doublon (déjà présent dans le fichier)`);
    });

    setImportResult(result);
    setImporting(false);
    setStep("done");

    toast({
      title: `${result.success} invitation(s) envoyée(s)`,
      description: result.skipped > 0 ? `${result.skipped} ignorée(s)` : undefined,
      variant: result.success > 0 ? "default" : "destructive",
    });
  };

  // ─── Render helpers ───────────────────────────────────────────────────────

  const canImport =
    parsed !== null &&
    parsed.missingColumns.length === 0 &&
    parsed.rows.length > 0 &&
    !importing;

  const validCount = parsed
    ? parsed.rows.filter((r) => r.email && EMAIL_RE.test(r.email)).length -
      parsed.duplicates.length
    : 0;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl bg-card border-border/60 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Importer des collaborateurs (CSV)
          </DialogTitle>
        </DialogHeader>

        {/* ── Step: Upload ── */}
        {step === "upload" && (
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/60"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              role="button"
              aria-label="Zone de dépôt de fichier CSV"
            >
              <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium">Glissez-déposez ou cliquez pour sélectionner</p>
              <p className="text-xs text-muted-foreground mt-1">Fichier .csv · max 5 MB</p>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileInput}
              />
            </div>

            {parseError && (
              <div className="flex items-start gap-2 p-3 rounded-lg border border-destructive/40 bg-destructive/8 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {parseError}
              </div>
            )}

            <div className="rounded-lg border border-border/40 bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Format attendu :</p>
              <p><span className="font-mono bg-background px-1 rounded">email</span> (obligatoire), <span className="font-mono bg-background px-1 rounded">full_name</span> (optionnel), <span className="font-mono bg-background px-1 rounded">role</span> (optionnel)</p>
              <p className="text-[11px]">Ex. : <span className="font-mono">marie@example.com,Marie Dupont,collaborateur</span></p>
            </div>
          </div>
        )}

        {/* ── Step: Preview ── */}
        {step === "preview" && parsed && (
          <div className="space-y-4">
            {/* Summary badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="gap-1.5 text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {validCount} valide{validCount > 1 ? "s" : ""}
              </Badge>
              {parsed.duplicates.length > 0 && (
                <Badge variant="outline" className="gap-1.5 text-orange-400 border-orange-500/30 bg-orange-500/10">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {parsed.duplicates.length} doublon{parsed.duplicates.length > 1 ? "s" : ""}
                </Badge>
              )}
              {parsed.invalidEmails.length > 0 && (
                <Badge variant="destructive" className="gap-1.5">
                  <X className="w-3.5 h-3.5" />
                  {parsed.invalidEmails.length} email{parsed.invalidEmails.length > 1 ? "s" : ""} invalide{parsed.invalidEmails.length > 1 ? "s" : ""}
                </Badge>
              )}
              {parsed.missingColumns.length > 0 && (
                <Badge variant="destructive" className="gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Colonne manquante : {parsed.missingColumns.join(", ")}
                </Badge>
              )}
            </div>

            {/* Column mapping info */}
            <div className="flex gap-2 flex-wrap text-xs text-muted-foreground">
              <span>Colonnes détectées :</span>
              {parsed.headers.map((h) => (
                <span key={h} className="font-mono bg-muted px-1.5 py-0.5 rounded">{h}</span>
              ))}
            </div>

            {/* Duplicate list */}
            {parsed.duplicates.length > 0 && (
              <details className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-3">
                <summary className="text-xs font-medium text-orange-400 cursor-pointer">
                  {parsed.duplicates.length} doublon(s) détecté(s) — sera ignoré(s)
                </summary>
                <ul className="mt-2 space-y-0.5">
                  {parsed.duplicates.map((e) => (
                    <li key={e} className="text-xs font-mono text-muted-foreground">{e}</li>
                  ))}
                </ul>
              </details>
            )}

            {/* Invalid emails */}
            {parsed.invalidEmails.length > 0 && (
              <details className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <summary className="text-xs font-medium text-destructive cursor-pointer">
                  {parsed.invalidEmails.length} email(s) invalide(s) — sera ignoré(s)
                </summary>
                <ul className="mt-2 space-y-0.5">
                  {parsed.invalidEmails.slice(0, 10).map((e, i) => (
                    <li key={i} className="text-xs font-mono text-muted-foreground">{e}</li>
                  ))}
                  {parsed.invalidEmails.length > 10 && (
                    <li className="text-xs text-muted-foreground">+{parsed.invalidEmails.length - 10} autres…</li>
                  )}
                </ul>
              </details>
            )}

            {/* Data preview table */}
            <div className="rounded-lg border border-border/40 overflow-hidden">
              <div className="px-3 py-2 bg-muted/40 text-xs font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                Aperçu (5 premières lignes valides)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/20">
                      <th className="text-left px-3 py-2 font-medium">Email</th>
                      <th className="text-left px-3 py-2 font-medium">Nom</th>
                      <th className="text-left px-3 py-2 font-medium">Rôle</th>
                      <th className="text-left px-3 py-2 font-medium">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.slice(0, 5).map((row, i) => {
                      const isDuplicate = parsed.duplicates.includes(row.email) && parsed.rows.indexOf(row) !== parsed.rows.findIndex((r) => r.email === row.email);
                      const isInvalid = !row.email || !EMAIL_RE.test(row.email);
                      return (
                        <tr key={i} className="border-b border-border/20 last:border-0 hover:bg-muted/20">
                          <td className="px-3 py-2 font-mono">{row.email || <span className="text-muted-foreground italic">vide</span>}</td>
                          <td className="px-3 py-2 text-muted-foreground">{row.full_name || "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground">{row.role || "—"}</td>
                          <td className="px-3 py-2">
                            {isInvalid ? (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Invalide</Badge>
                            ) : isDuplicate ? (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-orange-400 border-orange-500/40">Doublon</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-400 border-emerald-500/40">OK</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {parsed.rows.length > 5 && (
                <p className="px-3 py-2 text-xs text-muted-foreground bg-muted/10 border-t border-border/20">
                  … et {parsed.rows.length - 5} ligne(s) supplémentaire(s)
                </p>
              )}
            </div>

            {importing && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Import en cours…</span>
                  <span>{importProgress}%</span>
                </div>
                <Progress value={importProgress} className="h-1.5" />
              </div>
            )}
          </div>
        )}

        {/* ── Step: Done ── */}
        {step === "done" && importResult && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${importResult.success > 0 ? "bg-emerald-500/15" : "bg-destructive/15"}`}>
                {importResult.success > 0
                  ? <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  : <AlertCircle className="w-6 h-6 text-destructive" />}
              </div>
              <div>
                <p className="font-semibold">{importResult.success} invitation(s) envoyée(s)</p>
                {importResult.skipped > 0 && (
                  <p className="text-sm text-muted-foreground">{importResult.skipped} ligne(s) ignorée(s)</p>
                )}
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <details className="rounded-lg border border-border/40 bg-muted/20 p-3">
                <summary className="text-xs font-medium cursor-pointer text-muted-foreground">
                  Détail des erreurs ({importResult.errors.length})
                </summary>
                <ul className="mt-2 space-y-0.5">
                  {importResult.errors.slice(0, 15).map((e, i) => (
                    <li key={i} className="text-xs font-mono text-muted-foreground">{e}</li>
                  ))}
                  {importResult.errors.length > 15 && (
                    <li className="text-xs text-muted-foreground">+{importResult.errors.length - 15} autres…</li>
                  )}
                </ul>
              </details>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>Annuler</Button>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={reset} disabled={importing}>
                ← Changer de fichier
              </Button>
              <Button
                onClick={handleImport}
                disabled={!canImport}
                className="gradient-primary text-primary-foreground gap-2"
              >
                {importing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Import en cours…</>
                ) : (
                  <><Upload className="w-4 h-4" />Importer {validCount} collaborateur{validCount > 1 ? "s" : ""}</>
                )}
              </Button>
            </>
          )}
          {step === "done" && (
            <>
              <Button variant="outline" onClick={reset}>Nouvel import</Button>
              <Button
                onClick={() => { handleClose(); onComplete(); }}
                className="gradient-primary text-primary-foreground"
              >
                Fermer
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
