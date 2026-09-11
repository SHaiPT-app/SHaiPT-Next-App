#!/usr/bin/env bash
#
# growth/run-short.sh — the orchestrator, in two halves.
# ------------------------------------------------------------------
#   ./growth/run-short.sh                 # half 1: generate + score, then STOP
#   ./growth/run-short.sh --topic "..."   # half 1 with an assigned angle
#   ./growth/run-short.sh --build [DATE]  # half 2: build an APPROVED Short
#
# HALF 1 (generate):  preflight -> new-short.sh -> stop at the gate
# HALF 2 (build):     voiceover -> beats -> render -> thumbnail -> metadata
#
# The halves are separate commands, not stages of one command, because the
# human approval between them is the point of this pipeline. There is no
# flag that runs both.
#
# ------------------------------------------------------------------
# WHAT THIS DELIBERATELY DOES NOT DO
# ------------------------------------------------------------------
# It does not upload, publish, post, or schedule anything. The final step
# is a rendered file and a metadata sheet on disk; a human publishes them.
#
# The predecessor pipeline ended in an automatic public YouTube upload and
# ran unattended ~6x/week. Removing that ending is most of the reason this
# port exists: the channel's problem was never throughput.
# ------------------------------------------------------------------

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/common.sh"

GROWTH_LOG_PREFIX="RUN"
GROWTH_RUN_TYPE="short"
export GROWTH_LOG_PREFIX GROWTH_RUN_TYPE

MODE="generate"
TOPIC=""
RUN_DATE="$DATE_TAG"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --build)   MODE="build"; shift
               # optional positional date
               [[ $# -gt 0 && "$1" != -* ]] && { RUN_DATE="$1"; shift; } ;;
    --topic)   TOPIC="${2:?--topic needs a value}"; shift 2 ;;
    -h|--help) sed -n '3,20p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *)         fail "unknown argument: $1" ;;
  esac
done

# ==================================================================
# HALF 1 — generate and score
# ==================================================================
if [[ "$MODE" == "generate" ]]; then
  log "=== GENERATE ${RUN_DATE} ==="

  if [[ -n "$TOPIC" ]]; then
    "$GROWTH_DIR/new-short.sh" --topic "$TOPIC"
  else
    "$GROWTH_DIR/new-short.sh"
  fi

  # new-short.sh has already printed the verdict and next step, and exits
  # 0 on NO-GO as well as on a draft. Nothing further to do here: the next
  # move belongs to a human.
  exit 0
fi

# ==================================================================
# HALF 2 — build an approved Short
# ==================================================================
log "=== BUILD ${RUN_DATE} ==="

PENDING_JSON="$STATE_DIR/pending-${RUN_DATE}.json"
[[ -f "$PENDING_JSON" ]] || fail "No draft for ${RUN_DATE}.
   Generate one first:  ./growth/run-short.sh"

if [[ "$(jq -r '.approved' "$PENDING_JSON")" != "true" ]]; then
  fail "Short ${RUN_DATE} has not been approved.
   Review it first:  ./growth/review-short.sh ${RUN_DATE}
   (There is no flag to skip this. That is deliberate — see the header.)"
fi

export GROWTH_DATE="$RUN_DATE"

# Each stage is fatal except the two that are genuinely cosmetic. A
# missing thumbnail costs you an auto-picked frame; a missing render
# costs you the Short.
log "[1/5] voiceover"
"$GROWTH_DIR/make-voiceover.sh" "$RUN_DATE" >/dev/null \
  || fail "voiceover stage failed (see $LOG_FILE)"

log "[2/5] beats"
"$GROWTH_DIR/make-beats.sh" "$RUN_DATE" >/dev/null \
  || warn "beats stage failed — render will fall back to held frames"

log "[3/5] render"
"$GROWTH_DIR/render-short.sh" "$RUN_DATE" >/dev/null \
  || fail "render stage failed (see $LOG_FILE)"

log "[4/5] thumbnail"
"$GROWTH_DIR/make-thumbnail.sh" "$RUN_DATE" >/dev/null \
  || warn "thumbnail stage failed (non-fatal; YouTube will auto-pick a frame)"

log "[5/5] metadata"
"$GROWTH_DIR/make-metadata.sh" "$RUN_DATE" >/dev/null \
  || fail "metadata stage failed (see $LOG_FILE)"

# ---- Summary ------------------------------------------------------
OUT_MP4="$OUT_DIR/shaipt-short-${RUN_DATE}.mp4"
OUT_THUMB="$OUT_DIR/thumb-${RUN_DATE}.jpg"
OUT_META="$OUT_DIR/metadata-${RUN_DATE}.txt"
TAG="$(jq -r '.inherited_tag' "$PENDING_JSON")"

echo ""
echo "  ============================================================"
echo "  BUILD COMPLETE — ${RUN_DATE}"
echo "  ============================================================"
echo ""
echo "    video:     $OUT_MP4"
[[ -s "$OUT_THUMB" ]] && echo "    thumbnail: $OUT_THUMB"
echo "    metadata:  $OUT_META"
echo ""
if [[ "$TAG" == "organic-only" ]]; then
  echo "    ORGANIC ONLY — do not put this behind ad spend."
else
  echo "    ad-safe — cleared for organic and paid."
fi
echo ""
echo "  Nothing has been uploaded. Publish by hand:"
echo "    open $OUT_META"
echo ""

"$GROWTH_DIR/notify.sh" success short "$RUN_DATE" "$OUT_MP4" \
  "build complete · $TAG · awaiting manual publish" || true
