#!/usr/bin/env bash
#
# growth/review-short.sh — the human gate. Nothing renders without it.
# ------------------------------------------------------------------
#   ./growth/review-short.sh [DATE]          # interactive review
#   ./growth/review-short.sh [DATE] --show   # print the draft, decide nothing
#
# Presents the hook scoring, the script, the asset plan and the
# content-rule checks, then asks for an explicit approval. On approval it
# stamps state/pending-DATE.json and appends to state/published-log.md so
# the next generation run deduplicates against it.
#
# Exit codes:
#   0  approved (or --show)
#   1  no draft to review, or a hard content-rule block
#   2  declined by the human
#
# ------------------------------------------------------------------
# WHY A HUMAN GATE EXISTS AT ALL
# ------------------------------------------------------------------
# The predecessor pipeline had no gate: generation flowed straight into
# TTS, render, thumbnail and an automatic public YouTube upload, ~6 times
# a week, unattended. That is how four months of content shipped without
# anyone deciding any of it was good. The quality bar was whatever the
# model produced that morning.
#
# The approval step is the single most important behavioural difference in
# this port. It is interactive on purpose and it has no --yes flag. If you
# find yourself wanting to automate past it, the thing to change is the
# cadence, not the gate.
# ------------------------------------------------------------------

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/common.sh"

GROWTH_LOG_PREFIX="REVIEW"
GROWTH_RUN_TYPE="short"

SHOW_ONLY=0
REVIEW_DATE="$DATE_TAG"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --show) SHOW_ONLY=1; shift ;;
    -h|--help) sed -n '3,12p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) fail "unknown flag: $1" ;;
    *) REVIEW_DATE="$1"; shift ;;
  esac
done

SHORT_MD="$OUT_DIR/short-${REVIEW_DATE}.md"
PENDING_JSON="$STATE_DIR/pending-${REVIEW_DATE}.json"
PUBLISHED_LOG="$STATE_DIR/published-log.md"

[[ -f "$SHORT_MD" ]] || fail "No draft for ${REVIEW_DATE}: $SHORT_MD
   Generate one first:  ./growth/new-short.sh"
[[ -f "$PENDING_JSON" ]] || fail "No review record for ${REVIEW_DATE}: $PENDING_JSON
   A NO-GO draft has no review record — there is nothing to approve."

VERDICT="$(jq -r '.verdict' "$PENDING_JSON")"
SCORE="$(jq -r '.score // ""' "$PENDING_JSON")"
TAG="$(jq -r '.inherited_tag' "$PENDING_JSON")"
AI_PRESENTER="$(jq -r '.ai_presenter // "no"' "$PENDING_JSON")"
BLOCKERS="$(jq -r '.blockers // "none"' "$PENDING_JSON")"
TESTIMONIAL_FLAG="$(jq -r '.testimonial_flag // 0' "$PENDING_JSON")"
ALREADY="$(jq -r '.approved' "$PENDING_JSON")"

# ---- Present ------------------------------------------------------
rule() { printf '%s\n' "------------------------------------------------------------"; }

echo ""
rule
echo "  SHaiPT 4Dcoach Short — review — ${REVIEW_DATE}"
rule
echo ""
echo "  Verdict:   $VERDICT ${SCORE:+($SCORE)}"
echo "  Tag:       $TAG"
echo "  Presenter: $([[ "$AI_PRESENTER" == "yes" ]] && echo "AI character (disclosure required)" || echo "real")"
echo "  Blockers:  ${BLOCKERS:-none}"
echo ""

echo "  HOOK CANDIDATES AND SCORING"
rule
section "$SHORT_MD" "Hook Candidates" | sed 's/^/  /'
echo ""

echo "  CHOSEN HOOK"
rule
section "$SHORT_MD" "Hook" | sed 's/^/  /'
echo ""

echo "  SCRIPT"
rule
section "$SHORT_MD" "Script" | fold -s -w 68 | sed 's/^/  /'
echo ""
WORDS="$(section "$SHORT_MD" "Script" | wc -w | tr -d ' ')"
EST_S="$(awk -v w="$WORDS" 'BEGIN { printf "%.0f", w / 165 * 60 }')"
echo "  ${WORDS} words ≈ ${EST_S}s at 165 wpm (target 30-45s)"
if [[ "$EST_S" -gt 50 ]]; then
  echo "  !! Over length — this will run long on Shorts."
elif [[ "$EST_S" -lt 25 ]]; then
  echo "  !! Under length — may feel abrupt."
fi
echo ""

echo "  BEATS"
rule
section "$SHORT_MD" "Beats" | sed 's/^/  /'
echo ""

echo "  ASSET PLAN"
rule
section "$SHORT_MD" "Asset Plan" | sed 's/^/  /'
echo ""

if [[ $SHOW_ONLY -eq 1 ]]; then
  echo "  (--show: nothing decided)"
  echo ""
  exit 0
fi

# ---- Hard content-rule checks ------------------------------------
# These block approval outright rather than asking. They are the two
# failure modes with legal consequence, and a tired reviewer at the end of
# a long read is exactly who would wave them through.
BLOCKED=0

echo "  CONTENT-RULE CHECKS"
rule

# 1. Every referenced clip must be registered and validly tagged.
CLIPS="$(section "$SHORT_MD" "Beats" | grep -oE 'FOOTAGE:[^ |]+' | sed 's/^FOOTAGE://' | sort -u || true)"
if [[ -n "$CLIPS" ]]; then
  while IFS= read -r clip; do
    [[ -z "$clip" ]] && continue
    CLIP_PATH="$GROWTH_DIR/$clip"
    [[ -f "$CLIP_PATH" ]] || CLIP_PATH="$clip"
    if CLIP_TAG="$("$GROWTH_DIR/assets.sh" check "$CLIP_PATH" 2>/dev/null)"; then
      echo "  ok    $clip [$CLIP_TAG]"
      # The inherited tag must be the MOST restrictive of its clips. An
      # organic-only clip in an "ad-safe" video is the expensive mistake.
      if [[ "$CLIP_TAG" == "organic-only" && "$TAG" == "ad-safe" ]]; then
        echo "  FAIL  $clip is organic-only but the Short claims ad-safe"
        BLOCKED=1
      fi
    else
      echo "  FAIL  $clip is not registered (./growth/assets.sh add ...)"
      BLOCKED=1
    fi
  done <<< "$CLIPS"
else
  echo "  ·     no registry footage referenced (REPLAY/GENERATED only)"
fi

# 2. Synthetic testimonial check.
if [[ "$TESTIMONIAL_FLAG" == "1" ]]; then
  echo "  FAIL  AI presenter + first-person results language in the script."
  echo "        That is a fabricated endorsement under FTC 16 CFR 465."
  echo "        Rewrite the line, or put Ali on camera saying it."
  BLOCKED=1
else
  echo "  ok    no synthetic-testimonial language detected"
fi

# 3. Medical-claim check.
if section "$SHORT_MD" "Script" \
   | grep -qiE "\b(prevent|prevents|cure|cures|heal|heals|treat|treats|diagnos)[a-z]* (your |an? )?(injur|acl|tear|pain|strain|hernia)"; then
  echo "  FAIL  possible medical/injury-prevention claim in the script"
  BLOCKED=1
else
  echo "  ok    no medical claims detected"
fi

# 4. Blockers must be cleared before a render can succeed.
if [[ -n "$BLOCKERS" && "$(echo "$BLOCKERS" | tr '[:upper:]' '[:lower:]')" != "none" ]]; then
  echo "  warn  unresolved blockers: $BLOCKERS"
fi
echo ""

if [[ $BLOCKED -eq 1 ]]; then
  rule
  echo "  APPROVAL BLOCKED — fix the FAIL lines above, then regenerate:"
  echo "    GROWTH_FORCE_REGEN=1 ./growth/new-short.sh"
  rule
  echo ""
  "$GROWTH_DIR/notify.sh" blocked short "$REVIEW_DATE" "$SHORT_MD" \
    "approval blocked by content-rule check" || true
  exit 1
fi

if [[ "$ALREADY" == "true" ]]; then
  echo "  Already approved at $(jq -r '.approved_at' "$PENDING_JSON")."
  echo "  Render with:  ./growth/render-short.sh $REVIEW_DATE"
  echo ""
  exit 0
fi

# ---- Ask -----------------------------------------------------------
rule
if [[ "$VERDICT" == "BORDERLINE" ]]; then
  echo "  This is BORDERLINE. The honest default is no."
  echo "  Shipping a borderline hook to fill a slot is the habit this"
  echo "  pipeline exists to break."
else
  echo "  Approve this Short for render?"
fi
rule
echo ""

# No --yes flag, by design. If this is not interactive, decline.
if [[ ! -t 0 ]]; then
  echo "  Not an interactive terminal — declining by default."
  echo "  Approval is a human step; run this from a real shell."
  echo ""
  exit 2
fi

printf "  Type 'approve' to proceed, anything else to decline: "
read -r ANSWER

if [[ "$ANSWER" != "approve" ]]; then
  echo ""
  echo "  Declined. Nothing rendered."
  echo "  Regenerate with:  GROWTH_FORCE_REGEN=1 ./growth/new-short.sh"
  echo ""
  log "Review declined for $REVIEW_DATE"
  "$GROWTH_DIR/notify.sh" warning short "$REVIEW_DATE" "$SHORT_MD" \
    "declined at human review" || true
  exit 2
fi

# ---- Approve -------------------------------------------------------
APPROVED_AT="$(date '+%Y-%m-%d %H:%M:%S')"
TMP="$(mktemp)"
jq --arg at "$APPROVED_AT" '.approved = true | .approved_at = $at' \
  "$PENDING_JSON" > "$TMP" && mv "$TMP" "$PENDING_JSON"

# Append to the published log ONLY now — at approval, never at generation.
# A rejected draft must not poison the dedup history against ideas that
# were never actually used.
if [[ ! -f "$PUBLISHED_LOG" ]]; then
  cat > "$PUBLISHED_LOG" <<'EOF'
# SHaiPT 4Dcoach — approved Shorts log

Appended by `growth/review-short.sh` at approval time. The generation
prompt reads this to avoid repeating a hook pattern, a lift, or an angle
used in the last three Shorts.

Rejected and NO-GO drafts are deliberately absent: they were never used,
so they must not block the ideas in them from being reused.

EOF
fi

{
  echo "## ${REVIEW_DATE} — $(section_first "$SHORT_MD" "Title")"
  echo ""
  echo "- Hook: $(section_first "$SHORT_MD" "Hook")"
  echo "- Product moment: $(section_first "$SHORT_MD" "Product Moment")"
  echo "- Verdict: $VERDICT ${SCORE:+$SCORE}"
  echo "- Tag: $TAG · AI presenter: $AI_PRESENTER"
  echo "- Approved: $APPROVED_AT"
  echo ""
} >> "$PUBLISHED_LOG"

log "Approved $REVIEW_DATE"
"$GROWTH_DIR/notify.sh" success short "$REVIEW_DATE" "$SHORT_MD" \
  "approved for render ($VERDICT ${SCORE:-})" || true

echo ""
echo "  Approved."
echo ""
echo "  Next:"
echo "    ./growth/make-voiceover.sh $REVIEW_DATE    # TTS + caption timings"
echo "    ./growth/render-short.sh   $REVIEW_DATE    # assemble the video"
echo ""
exit 0
