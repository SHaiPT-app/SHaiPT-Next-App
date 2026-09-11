#!/usr/bin/env bash
#
# growth/watchdog.sh — deadman switch for the whole operation.
# ------------------------------------------------------------------
# Answers one question: "is this pipeline still alive?"
#
#   ./growth/watchdog.sh              # report + alert if stale
#   ./growth/watchdog.sh --check      # exit code only (0 fresh, 1 stale)
#
# Exit codes:
#   0  healthy — something shipped recently enough
#   1  stale   — nothing has shipped inside the staleness window
#   2  broken  — preflight itself fails (machine is misconfigured)
#
# Tunables (growth/.env):
#   GROWTH_STALE_AFTER_DAYS   default 10
#
# ------------------------------------------------------------------
# WHY THIS SCRIPT IS THE MOST IMPORTANT ONE IN THE DIRECTORY
# ------------------------------------------------------------------
# Per-run notifications only catch runs that HAPPEN. They cannot catch:
#   - a scheduler that was never loaded, or got unloaded
#   - a machine that was asleep at every scheduled time
#   - a run that dies before its notifier is wired up
#   - a laptop that simply stopped being opened on Fridays
#
# medAI Times had per-run notifications and still went six weeks without
# publishing, because every failing run dutifully reported failure to a
# file and the only human in the loop had no reason to look. The missing
# piece was never "more logging" — it was something that speaks up when
# NOTHING has happened.
#
# Run this on a schedule that is INDEPENDENT of the content schedule
# (e.g. weekly), so the watchdog surviving is not contingent on the
# pipeline surviving.
#
# NOTE: this script installs nothing. Wiring it to a scheduler is a
# deliberate manual step for Ali — see growth/README.md.
# ------------------------------------------------------------------

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/common.sh"

GROWTH_LOG_PREFIX="WATCHDOG"
GROWTH_RUN_TYPE="watchdog"
CHECK_ONLY=0
[[ "${1:-}" == "--check" ]] && CHECK_ONLY=1

STALE_DAYS="${GROWTH_STALE_AFTER_DAYS:-10}"
NOW_S="$(date +%s)"

say() { [[ $CHECK_ONLY -eq 1 ]] || echo "$*"; }

# epoch_of "YYYY-MM-DD HH:MM:SS" -> unix seconds (0 if unparseable)
epoch_of() {
  date -j -f '%Y-%m-%d %H:%M:%S' "$1" +%s 2>/dev/null \
    || date -d "$1" +%s 2>/dev/null \
    || echo 0
}

say ""
say "SHaiPT growth — watchdog"
say "  staleness window: ${STALE_DAYS} days"
say ""

# ---- 1. Is the machine even capable of running? ------------------
# A stale pipeline on a broken machine is a different problem from a
# stale pipeline on a healthy one, and deserves a different alert.
if ! "$GROWTH_DIR/preflight.sh" --quiet; then
  say "  MACHINE BROKEN — preflight fails."
  say "  Run ./growth/preflight.sh for the details."
  say ""
  "$GROWTH_DIR/notify.sh" blocked watchdog "$DATE_TAG" "" \
    "preflight fails — pipeline cannot run at all (run growth/preflight.sh)" || true
  exit 2
fi
say "  machine: preflight passes"

# ---- 2. When did anything last succeed? --------------------------
LAST_TS=""
LAST_WHAT=""
for f in "$STATE_DIR"/last-success-*.json; do
  [[ -f "$f" ]] || continue
  ts="$(jq -r '.timestamp // empty' "$f" 2>/dev/null || true)"
  [[ -n "$ts" ]] || continue
  if [[ -z "$LAST_TS" ]] || [[ "$(epoch_of "$ts")" -gt "$(epoch_of "$LAST_TS")" ]]; then
    LAST_TS="$ts"
    LAST_WHAT="$(jq -r '.run_type // "?"' "$f" 2>/dev/null || echo '?')"
  fi
done

# A never-run pipeline is not "stale" in the alarming sense — it is just
# new. Say so plainly instead of crying wolf on day one.
if [[ -z "$LAST_TS" ]]; then
  say "  history: no successful run recorded yet"
  say ""
  say "  Status: NEW (nothing shipped yet — this is expected on a fresh install)"
  say ""
  exit 0
fi

LAST_S="$(epoch_of "$LAST_TS")"
AGE_DAYS=$(( (NOW_S - LAST_S) / 86400 ))
say "  last success: $LAST_TS ($LAST_WHAT) — ${AGE_DAYS} day(s) ago"

# ---- 3. Consecutive failures since that success ------------------
# Reads the status table top-down; every row above the newest success is
# a failure that came after it.
CONSEC_FAIL=0
if [[ -f "$STATUS_FILE" ]]; then
  CONSEC_FAIL="$(awk -F'|' '
    /^\| [0-9]{4}-/ {
      st = $4
      gsub(/^[ \t]+|[ \t]+$/, "", st)
      if (st ~ /OK\] success/) exit
      if (st ~ /FAIL\]|BLOCKED\]/) n++
    }
    END { print n + 0 }
  ' "$STATUS_FILE")"
fi
[[ "$CONSEC_FAIL" -gt 0 ]] && say "  consecutive failures since: $CONSEC_FAIL"

say ""

# ---- 4. Verdict ---------------------------------------------------
if [[ "$AGE_DAYS" -gt "$STALE_DAYS" ]]; then
  DETAIL="nothing shipped in ${AGE_DAYS} days (window ${STALE_DAYS})"
  [[ "$CONSEC_FAIL" -gt 0 ]] && DETAIL="$DETAIL · ${CONSEC_FAIL} consecutive failures"
  say "  Status: STALE — $DETAIL"
  say ""
  say "  Check, in order:"
  say "    1. ./growth/preflight.sh            (machine still sane?)"
  say "    2. tail -50 $LOG_FILE"
  say "    3. $STATUS_FILE  (recent rows)"
  say ""
  "$GROWTH_DIR/notify.sh" failure watchdog "$DATE_TAG" "" "PIPELINE STALE: $DETAIL" || true
  exit 1
fi

say "  Status: HEALTHY"
say ""
exit 0
