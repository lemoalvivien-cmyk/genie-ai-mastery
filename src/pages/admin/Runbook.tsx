import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { CheckSquare, Database, RefreshCw, AlertTriangle, BookOpen, Server } from "lucide-react";

function Section({ id, icon: Icon, title, children }: {
  id: string;
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-12">
      <h2 className="flex items-center gap-2 text-lg font-bold text-foreground mb-4 pb-2 border-b border-border">
        <Icon className="w-5 h-5 text-primary" />
        {title}
      </h2>
      <div className="prose-sm space-y-4 text-foreground">{children}</div>
    </section>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="bg-muted rounded-xl p-4 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap border border-border">
      {children}
    </pre>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">{n}</div>
      <div className="text-sm text-foreground/90 flex-1">{children}</div>
    </div>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

function CheckItem({ done, children }: { done?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex items-start gap-2 cursor-pointer group">
      <input type="checkbox" defaultChecked={done} className="mt-0.5 rounded" />
      <span className="text-sm text-foreground/90">{children}</span>
    </label>
  );
}

export default function Runbook() {
  const toc = [
    { id: "export", label: "Export de la base de données" },
    { id: "restore", label: "Restauration" },
    { id: "checklist", label: "Checklist mensuelle" },
    { id: "restore-test", label: "Test de restauration (obligatoire)" },
    { id: "incidents", label: "Procédures incidents" },
  ];

  return (
    <>
      <Helmet><title>Runbook Ops – GENIE IA Admin</title></Helmet>
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8">

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-primary" />
                Runbook — Backup / Restore / Ops
              </h1>
              <Link to="/admin/ops" className="text-xs border border-border rounded-lg px-2.5 py-1 text-muted-foreground hover:text-foreground transition-colors">
                ← OPS Center
              </Link>
            </div>
            <p className="text-muted-foreground text-sm">
              Document opérationnel GENIE IA · Mis à jour : mars 2026 · Révision mensuelle obligatoire
            </p>
            <div className="mt-3 p-3 rounded-xl border border-primary/20 bg-primary/5 text-xs text-muted-foreground">
              <strong className="text-foreground">RTO cible :</strong> 4h · <strong className="text-foreground">RPO cible :</strong> 24h · <strong className="text-foreground">Backup fréquence :</strong> quotidien (Lovable Cloud auto)
            </div>
          </div>

          {/* TOC */}
          <nav className="rounded-xl border border-border bg-card p-4 mb-10">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Table des matières</p>
            <ol className="space-y-1">
              {toc.map((item, i) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} className="text-sm text-primary hover:underline">
                    {i + 1}. {item.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {/* ── 1. Export ─────────────────────────────────────────────────────── */}
          <Section id="export" icon={Database} title="1. Export de la base de données">
            <p className="text-sm text-muted-foreground">
              La base de données est hébergée sur Lovable Cloud (infrastructure Supabase). Deux méthodes d'export sont disponibles.
            </p>

            <h3 className="font-semibold text-foreground mt-4 mb-2">Méthode A — Export via l'interface Cloud (recommandé)</h3>
            <div className="space-y-2">
              <Step n={1}>Ouvrir le Backend Cloud depuis Settings → Lovable Cloud → View Backend.</Step>
              <Step n={2}>Aller dans <strong>Database → Backups</strong>.</Step>
              <Step n={3}>Cliquer sur <strong>"Download backup"</strong> pour le dernier backup quotidien automatique.</Step>
              <Step n={4}>Sauvegarder le fichier <code className="bg-muted px-1 rounded text-xs">.dump</code> dans un stockage externe sécurisé (S3, Drive chiffré, etc.).</Step>
            </div>

            <h3 className="font-semibold text-foreground mt-6 mb-2">Méthode B — pg_dump via CLI</h3>
            <Warn>Nécessite <code className="text-xs">psql</code> et l'accès à la connection string (Settings → Database → URI).</Warn>
            <Code>{`# Récupérer la connection string depuis les settings
# Format: postgresql://postgres.[ref]:[password]@[host]:5432/postgres

# Export complet (schéma + données)
pg_dump \\
  --clean \\
  --if-exists \\
  --quote-all-identifiers \\
  --no-owner \\
  --no-privileges \\
  -Fc \\
  "$DATABASE_URL" \\
  > backup_$(date +%Y%m%d_%H%M%S).dump

# Vérifier la taille (doit être > 0)
ls -lh backup_*.dump`}
            </Code>

            <h3 className="font-semibold text-foreground mt-6 mb-2">Données critiques à exporter séparément</h3>
            <Code>{`# Tables critiques (export CSV pour audit)
psql "$DATABASE_URL" -c "\\COPY profiles TO 'profiles_$(date +%Y%m%d).csv' CSV HEADER"
psql "$DATABASE_URL" -c "\\COPY progress TO 'progress_$(date +%Y%m%d).csv' CSV HEADER"
psql "$DATABASE_URL" -c "\\COPY attestations TO 'attestations_$(date +%Y%m%d).csv' CSV HEADER"
psql "$DATABASE_URL" -c "\\COPY organizations TO 'organizations_$(date +%Y%m%d).csv' CSV HEADER"`}
            </Code>

            <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground mt-4">
              📦 <strong>Lovable Cloud</strong> effectue des backups automatiques quotidiens avec rétention 7 jours. Pour une rétention plus longue, utilisez la Méthode B et stockez externement.
            </div>
          </Section>

          {/* ── 2. Restore ────────────────────────────────────────────────────── */}
          <Section id="restore" icon={RefreshCw} title="2. Restauration">
            <Warn>
              <strong>ATTENTION :</strong> La restauration écrase toutes les données existantes. Ne jamais restaurer en production sans avoir créé un backup préalable de l'état actuel.
            </Warn>

            <h3 className="font-semibold text-foreground mt-4 mb-2">Scénario A — Restauration via interface Cloud</h3>
            <div className="space-y-2">
              <Step n={1}>Ouvrir Backend Cloud → <strong>Database → Backups</strong>.</Step>
              <Step n={2}>Sélectionner le backup cible (date/heure).</Step>
              <Step n={3}>Cliquer <strong>"Restore"</strong> et confirmer. L'opération prend 5-15 minutes.</Step>
              <Step n={4}>Vérifier l'intégrité après restauration (voir section 4).</Step>
            </div>

            <h3 className="font-semibold text-foreground mt-6 mb-2">Scénario B — Restauration pg_restore (CLI)</h3>
            <Code>{`# 1. Créer un backup de l'état actuel avant restauration
pg_dump -Fc "$DATABASE_URL" > pre_restore_backup_$(date +%Y%m%d_%H%M%S).dump

# 2. Restaurer depuis le fichier de backup
pg_restore \\
  --clean \\
  --if-exists \\
  --no-owner \\
  --no-privileges \\
  -d "$DATABASE_URL" \\
  backup_YYYYMMDD.dump

# 3. Vérifier les erreurs (ignorer les warnings "does not exist")
echo "Exit code: $?"

# 4. Compter les enregistrements clés
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM profiles;"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM progress;"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM attestations;"`}
            </Code>

            <h3 className="font-semibold text-foreground mt-6 mb-2">Post-restauration obligatoire</h3>
            <div className="space-y-2">
              <Step n={1}>Vérifier que le kill switch IA est sur OFF : <code className="bg-muted px-1 rounded text-xs">SELECT value FROM app_settings WHERE key = 'ai_kill_switch'</code></Step>
              <Step n={2}>Vérifier les RLS policies : <code className="bg-muted px-1 rounded text-xs">SELECT tablename, policyname FROM pg_policies ORDER BY tablename</code></Step>
              <Step n={3}>Tester un login utilisateur dans l'app.</Step>
              <Step n={4}>Vérifier l'OPS Center (/admin/ops) — aucune erreur edge dans les 5 min suivantes.</Step>
            </div>
          </Section>

          {/* ── 3. Checklist mensuelle ───────────────────────────────────────── */}
          <Section id="checklist" icon={CheckSquare} title="3. Checklist mensuelle">
            <p className="text-sm text-muted-foreground mb-4">
              À effectuer le 1er de chaque mois. Cochez au fur et à mesure.
            </p>

            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">🔒 Sécurité</p>
                <div className="space-y-2">
                  <CheckItem>Vérifier les abuse_flags critiques et high de la période.</CheckItem>
                  <CheckItem>Contrôler les CSP reports — passer en enforce si 0 violation.</CheckItem>
                  <CheckItem>Vérifier que l'IP rate limit n'a pas bloqué des users légitimes.</CheckItem>
                  <CheckItem>Audit des user_roles — aucun role admin non autorisé.</CheckItem>
                  <CheckItem>Renouveler les API keys si &gt; 90 jours (OPENROUTER, STRIPE).</CheckItem>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">📊 Monitoring</p>
                <div className="space-y-2">
                  <CheckItem>Analyser la latence p95 des edge functions — seuil alerte 5s.</CheckItem>
                  <CheckItem>Vérifier le taux d'erreur edge — seuil alerte 1%.</CheckItem>
                  <CheckItem>Contrôler les logging_errors (app_metrics) — buffer vide.</CheckItem>
                  <CheckItem>Analyser les coûts IA du mois (Control Room).</CheckItem>
                  <CheckItem>Vérifier les budgets org — aucune dépassement non notifié.</CheckItem>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">💾 Backup</p>
                <div className="space-y-2">
                  <CheckItem>Vérifier que les backups automatiques Lovable Cloud sont actifs.</CheckItem>
                  <CheckItem>Effectuer un export manuel pg_dump + stocker externement.</CheckItem>
                  <CheckItem>Exporter les tables critiques en CSV (profiles, attestations).</CheckItem>
                  <CheckItem>Effectuer le test de restauration (section 4).</CheckItem>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">🚀 Fonctionnel</p>
                <div className="space-y-2">
                  <CheckItem>Tester un parcours complet : inscription → module → quiz → attestation.</CheckItem>
                  <CheckItem>Tester le chat IA (réponse &lt; 3s, contenu correct).</CheckItem>
                  <CheckItem>Tester la génération PDF d'attestation.</CheckItem>
                  <CheckItem>Vérifier que le Stripe webhook reçoit bien les événements.</CheckItem>
                  <CheckItem>Vérifier /verify/:id — attestation vérifiable publiquement.</CheckItem>
                </div>
              </div>
            </div>
          </Section>

          {/* ── 4. Test de restauration ──────────────────────────────────────── */}
          <Section id="restore-test" icon={Server} title="4. Test de restauration (OBLIGATOIRE)">
            <div className="rounded-xl border-2 border-destructive/30 bg-destructive/5 p-4 mb-4">
              <p className="text-sm font-semibold text-foreground">⚠️ Ce test est obligatoire une fois par mois.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Un backup qui n'a jamais été testé n'est pas un backup. L'objectif est de valider que la procédure fonctionne avant une urgence réelle.
              </p>
            </div>

            <h3 className="font-semibold text-foreground mb-2">Procédure de test (environnement staging)</h3>
            <div className="space-y-3">
              <Step n={1}>
                <strong>Créer un projet Supabase de staging</strong> (gratuit) dédié aux tests. Ne jamais tester sur la production.
              </Step>
              <Step n={2}>
                <strong>Télécharger le backup le plus récent</strong> depuis Lovable Cloud → Backend → Backups.
              </Step>
              <Step n={3}>
                <strong>Restaurer sur le staging :</strong>
                <Code>{`# Sur le projet staging
pg_restore \\
  --clean --if-exists --no-owner --no-privileges \\
  -d "$STAGING_DATABASE_URL" \\
  latest_backup.dump`}
                </Code>
              </Step>
              <Step n={4}>
                <strong>Vérifier les counts :</strong>
                <Code>{`psql "$STAGING_DATABASE_URL" << EOF
SELECT 'profiles' as table, COUNT(*) FROM profiles
UNION ALL
SELECT 'progress', COUNT(*) FROM progress
UNION ALL
SELECT 'attestations', COUNT(*) FROM attestations
UNION ALL
SELECT 'organizations', COUNT(*) FROM organizations;
EOF`}
                </Code>
              </Step>
              <Step n={5}>
                <strong>Comparer avec la production :</strong> Les counts doivent correspondre (± 5% pour les tables qui changent vite).
              </Step>
              <Step n={6}>
                <strong>Documenter le résultat</strong> dans le log de test ci-dessous et noter la date.
              </Step>
            </div>

            <div className="mt-6 rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">📋 Log des tests de restauration</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-muted-foreground font-medium pb-2 pr-4">Date</th>
                      <th className="text-left text-muted-foreground font-medium pb-2 pr-4">Backup utilisé</th>
                      <th className="text-left text-muted-foreground font-medium pb-2 pr-4">Résultat</th>
                      <th className="text-left text-muted-foreground font-medium pb-2">Opérateur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="py-2 pr-4 text-muted-foreground/50 italic">_/_ /2026</td>
                      <td className="py-2 pr-4 text-muted-foreground/50 italic">—</td>
                      <td className="py-2 pr-4 text-muted-foreground/50 italic">À compléter</td>
                      <td className="py-2 text-muted-foreground/50 italic">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground/60 mt-2">
                * Mettre à jour manuellement ce tableau après chaque test.
              </p>
            </div>
          </Section>

          {/* ── 5. Procédures incidents ──────────────────────────────────────── */}
          <Section id="incidents" icon={AlertTriangle} title="5. Procédures incidents">
            <div className="space-y-4">

              <div className="rounded-xl border border-border bg-card p-4">
                <p className="font-semibold text-sm text-foreground mb-2">🔴 IA en boucle / abus massif</p>
                <ol className="space-y-1 text-sm text-muted-foreground list-decimal list-inside">
                  <li>Activer le kill switch IA immédiatement : <Link to="/admin/control-room" className="text-primary hover:underline">Control Room → Couper l'IA</Link>.</li>
                  <li>Identifier le user_id dans abuse_flags (severity=critical).</li>
                  <li>Augmenter manuellement l'abuse_score à 100 + bloquer 24h dans profiles.</li>
                  <li>Analyser les logs edge pour comprendre le vecteur d'attaque.</li>
                  <li>Réactiver l'IA une fois l'abus stoppé.</li>
                </ol>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <p className="font-semibold text-sm text-foreground mb-2">🟡 Edge function en erreur répétée</p>
                <ol className="space-y-1 text-sm text-muted-foreground list-decimal list-inside">
                  <li>Vérifier les edge_errors dans <Link to="/admin/ops" className="text-primary hover:underline">OPS Center</Link> — identifier le message d'erreur.</li>
                  <li>Vérifier les secrets (OPENROUTER_API_KEY, STRIPE_SECRET_KEY) — ne pas expirer.</li>
                  <li>Vérifier les logs Lovable Cloud → Functions pour le stack trace complet.</li>
                  <li>Si l'erreur est un timeout : vérifier la disponibilité d'OpenRouter / Stripe.</li>
                  <li>Redéployer la fonction si nécessaire via un commit dans le code.</li>
                </ol>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <p className="font-semibold text-sm text-foreground mb-2">💾 Perte de données suspectée</p>
                <ol className="space-y-1 text-sm text-muted-foreground list-decimal list-inside">
                  <li>NE PAS écrire dans la DB avant d'avoir sécurisé l'état actuel.</li>
                  <li>Exporter immédiatement l'état actuel (pg_dump).</li>
                  <li>Comparer avec le dernier backup connu via counts de tables.</li>
                  <li>Si perte confirmée : contacter le support Lovable pour accès aux WAL.</li>
                  <li>Restaurer depuis le backup précédant l'incident.</li>
                </ol>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <p className="font-semibold text-sm text-foreground mb-2">💳 Webhook Stripe manqué</p>
                <ol className="space-y-1 text-sm text-muted-foreground list-decimal list-inside">
                  <li>Aller dans le Dashboard Stripe → Webhooks → Events.</li>
                  <li>Identifier les événements en échec (status failed).</li>
                  <li>Cliquer "Retry" sur les événements critiques (checkout.completed, subscription.*).</li>
                  <li>Vérifier que la function stripe-webhook est déployée et active.</li>
                  <li>Mettre à jour manuellement le plan de l'org si nécessaire.</li>
                </ol>
              </div>

            </div>
          </Section>

          {/* Footer */}
          <div className="border-t border-border pt-6 mt-8 text-xs text-muted-foreground flex items-center justify-between">
            <span>GENIE IA — Runbook v1.0 — Mars 2026</span>
            <div className="flex gap-4">
              <Link to="/admin/ops" className="text-primary hover:underline">OPS Center</Link>
              <Link to="/admin/control-room" className="text-primary hover:underline">Control Room</Link>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
