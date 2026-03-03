#!/usr/bin/env bash
# =============================================================================
# GENIE IA – k6 load test runner
# =============================================================================
# Usage:
#   ./tests/load/run.sh smoke             → 30s smoke test (all scenarios)
#   ./tests/load/run.sh full              → full 10-15 min test (all scenarios)
#   ./tests/load/run.sh smoke chat        → smoke, chat only
#   ./tests/load/run.sh full pdf          → full, pdf only
#   ./tests/load/run.sh full reads        → full, supabase reads only
#
# Required env vars (export before running or put in .env.load):
#   SUPABASE_URL   – https://xpzvbsfrwnabnwwfsnnc.supabase.co
#   BEARER_TOKEN   – valid user JWT (get from browser DevTools → Supabase session)
#   ANON_KEY       – Supabase anon key (for DB reads scenario)
# =============================================================================

set -e

MODE="${1:-full}"
SCENARIO="${2:-all}"

# ── Load local env if available ───────────────────────────────────────────────
if [ -f ".env.load" ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env.load | xargs)
  echo "✅ Loaded .env.load"
fi

# ── Validate required vars ────────────────────────────────────────────────────
if [ -z "$SUPABASE_URL" ] || [ -z "$BEARER_TOKEN" ]; then
  echo ""
  echo "❌  Missing required environment variables."
  echo ""
  echo "   Set them in .env.load (copy from .env.load.example) or export:"
  echo "   export SUPABASE_URL=https://xpzvbsfrwnabnwwfsnnc.supabase.co"
  echo "   export BEARER_TOKEN=eyJ..."
  echo "   export ANON_KEY=eyJ..."
  echo ""
  exit 1
fi

if ! command -v k6 &> /dev/null; then
  echo ""
  echo "❌  k6 not found. Install it:"
  echo "   macOS:   brew install k6"
  echo "   Linux:   sudo snap install k6"
  echo "   Docker:  docker run --rm -i grafana/k6 run -"
  echo "   Docs:    https://k6.io/docs/get-started/installation/"
  echo ""
  exit 1
fi

# ── Create results dir ────────────────────────────────────────────────────────
mkdir -p tests/load/results

K6_COMMON_FLAGS="-e SUPABASE_URL=$SUPABASE_URL -e BEARER_TOKEN=$BEARER_TOKEN -e ANON_KEY=${ANON_KEY:-$BEARER_TOKEN} -e MODE=$MODE"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  GENIE IA Load Tests — MODE: ${MODE^^}           ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

run_scenario() {
  local name="$1"
  local file="$2"
  echo "▶  Starting: ${name} ..."
  echo ""
  # shellcheck disable=SC2086
  k6 run $K6_COMMON_FLAGS "$file"
  echo ""
  echo "✅  Done: ${name}"
  echo ""
}

case "$SCENARIO" in
  chat)
    run_scenario "Chat Completion" "tests/load/scenarios/chat-completion.js"
    ;;
  pdf)
    run_scenario "Generate PDF" "tests/load/scenarios/generate-pdf.js"
    ;;
  reads)
    run_scenario "Supabase DB Reads" "tests/load/scenarios/supabase-reads.js"
    ;;
  all)
    run_scenario "Chat Completion"   "tests/load/scenarios/chat-completion.js"
    run_scenario "Generate PDF"      "tests/load/scenarios/generate-pdf.js"
    run_scenario "Supabase DB Reads" "tests/load/scenarios/supabase-reads.js"
    ;;
  *)
    echo "Unknown scenario: $SCENARIO. Choose: chat | pdf | reads | all"
    exit 1
    ;;
esac

echo ""
echo "📊 Results saved in tests/load/results/"
echo "   Open JSON files for full k6 metrics (p95, p99, counters, histograms)."
echo ""
