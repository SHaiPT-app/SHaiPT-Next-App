#!/usr/bin/env bash
#
# growth/new-short.sh — Stage 1: generate and score a Short. Renders nothing.
# ------------------------------------------------------------------
# Calls the Claude CLI with prompts/short-script-prompt.md, which produces
# three candidate hooks, scores them against prompts/hook-rubric.md, and
# either writes the full Short or returns NO-GO.
#
#   ./growth/new-short.sh                       # today's date
#   GROWTH_DATE=2026-09-14 ./growth/new-short.sh
#   ./growth/new-short.sh --topic "Ronnie Coleman 800lb deadlift depth"
#   GROWTH_FORCE_REGEN=1 ./growth/new-short.sh  # overwrite today's draft
#
# Output:
#   out/short-DATE.md        the generated Short (any verdict)
#   state/pending-DATE.json  review record, consumed by review-short.sh
#
# Exit codes:
#   0  a Short was generated (GO or BORDERLINE) OR the gate said NO-GO
#   1  the pipeline could not run (missing binary, claude failed, bad output)
#
# ------------------------------------------------------------------
# NO-GO IS A SUCCESSFUL RUN
# ------------------------------------------------------------------
# This script exits 0 when the hook gate rejects every candidate. That is
# deliberate and it is the whole point of the port. The predecessor
# pipeline treated "no episode today" as a failure to be retried away, and
# so it shipped 5-7 times a week for four months into an audience that
# never grew past 500. Here, a week with nothing good enough is a week that
# publishes nothing. Do not "fix" this by making NO-GO non-zero.
# ------------------------------------------------------------------

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/common.sh"

GROWTH_LOG_PREFIX="NEW-SHORT"
GROWTH_RUN_TYPE="short"
export GROWTH_LOG_PREFIX GROWTH_RUN_TYPE

TOPIC=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --topic) TOPIC="${2:?--topic needs a value}"; shift 2 ;;
    -h|--help) sed -n '3,25p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) fail "unknown argument: $1" ;;
  esac
done

SHORT_MD="$OUT_DIR/short-${DATE_TAG}.md"
PENDING_JSON="$STATE_DIR/pending-${DATE_TAG}.json"
PROMPT_FILE="$PROMPTS_DIR/short-script-prompt.md"

# ---- Preflight ---------------------------------------------------
# Runs BEFORE anything expensive and before any retry loop. The medAI
# pipeline discovered its missing binary three retries deep; this finds it
# in under a second, with an actionable message.
"$GROWTH_DIR/preflight.sh" --quiet || {
  "$GROWTH_DIR/preflight.sh" || true      # re-run verbosely to show why
  die_loud "Preflight failed — refusing to start a run on a broken machine."
}

need_file "$PROMPT_FILE" "the Short generation prompt"
need_file "$PROMPTS_DIR/hook-rubric.md" "the hook scoring rubric"
need_file "$PROMPTS_DIR/content-rules.md" "the content rules"

CLAUDE_BIN="$(require_claude)"
log "claude: $CLAUDE_BIN"

# ---- Idempotence -------------------------------------------------
if [[ -s "$SHORT_MD" ]] && [[ "${GROWTH_FORCE_REGEN:-0}" != "1" ]]; then
  log "Draft already exists: $SHORT_MD (GROWTH_FORCE_REGEN=1 to overwrite)"
  echo "$SHORT_MD"
  exit 0
fi

# ---- Assigned topic ----------------------------------------------
# A human-supplied angle. The generator still has to get it past the hook
# rubric — an assigned topic buys a subject, not a pass.
TOPIC_BLOCK=""
TOPIC_QUEUE="$STATE_DIR/topic-queue.md"
if [[ -n "$TOPIC" ]]; then
  TOPIC_BLOCK="

ASSIGNED TOPIC: build today's Short around this angle instead of choosing
your own: $TOPIC

The assigned topic does NOT exempt this Short from the hook rubric. Score it
honestly; if the best hook this topic supports is a NO-GO, return NO-GO."
elif [[ -s "$TOPIC_QUEUE" ]]; then
  log "Topic queue found — using the assigned topic"
  TOPIC_BLOCK="

ASSIGNED TOPIC: build today's Short around this angle instead of choosing
your own:

$(cat "$TOPIC_QUEUE")

The assigned topic does NOT exempt this Short from the hook rubric. Score it
honestly; if the best hook this topic supports is a NO-GO, return NO-GO."
fi

# ---- Generate ----------------------------------------------------
# Retries cover a transient API hiccup only. A missing binary is already
# ruled out above, so a retry loop here can no longer mask a config error
# the way the medAI version's did.
MAX_ATTEMPTS="${GROWTH_CLAUDE_MAX_ATTEMPTS:-3}"
OK=0

cd "$GROWTH_DIR"

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  log "Generating Short (attempt $attempt/$MAX_ATTEMPTS)"
  : > "$SHORT_MD"

  set +e
  "$CLAUDE_BIN" --print --permission-mode acceptEdits \
    "$(cat "$PROMPT_FILE")${TOPIC_BLOCK}

Today is ${DATE_TAG}.
Working directory is ${GROWTH_DIR}; the files named in READ FIRST are
relative to the repository root one level above it.
Output the markdown document to stdout only. Write no files." \
    --allowedTools "Read Glob Grep WebSearch WebFetch" \
    > "$SHORT_MD" 2>>"$LOG_FILE"
  rc=$?
  set -e

  # A valid response always carries a Verdict. Everything else about the
  # document is conditional on that verdict, so it is the one header we
  # can insist on for any outcome.
  if [[ $rc -eq 0 ]] && [[ -s "$SHORT_MD" ]] && grep -q "^### Verdict" "$SHORT_MD"; then
    log "  generation succeeded on attempt $attempt"
    OK=1
    break
  fi

  log "  attempt $attempt failed (rc=$rc); first 300 bytes of output:"
  head -c 300 "$SHORT_MD" 2>/dev/null | sed 's/^/    /' >&2 || true
  if [[ $attempt -lt $MAX_ATTEMPTS ]]; then
    backoff=$((attempt * 30))
    log "  sleeping ${backoff}s before retry"
    sleep "$backoff"
  fi
done

if [[ $OK -ne 1 ]]; then
  "$GROWTH_DIR/notify.sh" failure short "$DATE_TAG" "" \
    "generation failed after $MAX_ATTEMPTS attempts (see $LOG_FILE)" || true
  fail "No valid Short produced after $MAX_ATTEMPTS attempts: $SHORT_MD"
fi

# ---- Parse the verdict -------------------------------------------
VERDICT_LINE="$(section_first "$SHORT_MD" "Verdict" || true)"
[[ -n "$VERDICT_LINE" ]] || fail "Could not read ### Verdict from $SHORT_MD"

# "GO — 2 — 17/20" / "NO-GO — ..." / "BORDERLINE — 1 — 14/20"
# Check NO-GO first: a naive match for "GO" also matches inside "NO-GO".
if [[ "$VERDICT_LINE" == NO-GO* || "$VERDICT_LINE" == *"NO-GO"* ]]; then
  VERDICT="NO-GO"
elif [[ "$VERDICT_LINE" == BORDERLINE* || "$VERDICT_LINE" == *"BORDERLINE"* ]]; then
  VERDICT="BORDERLINE"
elif [[ "$VERDICT_LINE" == GO* ]]; then
  VERDICT="GO"
else
  fail "Unrecognised verdict line: $VERDICT_LINE"
fi

# Score, if the line carries one (e.g. "17/20").
SCORE="$(echo "$VERDICT_LINE" | grep -oE '[0-9]{1,2}/20' | head -1 || true)"

log "Verdict: $VERDICT ${SCORE:+($SCORE)}"

# ---- NO-GO: stop here, cleanly -----------------------------------
if [[ "$VERDICT" == "NO-GO" ]]; then
  log "Hook gate returned NO-GO — nothing will be rendered."
  log "Reasoning is in $SHORT_MD"
  rm -f "$PENDING_JSON"
  "$GROWTH_DIR/notify.sh" warning short "$DATE_TAG" "$SHORT_MD" \
    "NO-GO: no hook cleared the bar — nothing to render (the gate working as designed)" || true
  echo ""
  echo "  NO-GO — no Short today."
  echo "  $SHORT_MD explains what footage or product moment would unlock a better hook."
  echo ""
  exit 0
fi

# ---- GO / BORDERLINE: require the full document ------------------
for required in Hook Script Beats "Asset Plan" Title; do
  section_first "$SHORT_MD" "$required" >/dev/null 2>&1 \
    || fail "Verdict is $VERDICT but '### $required' is missing from $SHORT_MD"
done

# ---- Content-rule spot checks ------------------------------------
# Cheap, mechanical guards. They do not replace the human review — they
# catch the specific mistakes that are expensive and easy to miss in a
# skim, so review time goes to judgement instead of proofreading.
ASSET_PLAN="$(section "$SHORT_MD" "Asset Plan")"
INHERITED_TAG="$(echo "$ASSET_PLAN" | grep -i '^Inherited tag:' | sed 's/^[Ii]nherited tag:[[:space:]]*//' | tr -d ' ' || true)"
AI_PRESENTER="$(echo "$ASSET_PLAN" | grep -i '^AI presenter:' | sed 's/^[Aa][Ii] presenter:[[:space:]]*//' | tr -d ' ' || true)"
BLOCKERS="$(echo "$ASSET_PLAN" | grep -i '^Blockers:' | sed 's/^[Bb]lockers:[[:space:]]*//' || true)"

case "$INHERITED_TAG" in
  ad-safe|organic-only) log "Inherited tag: $INHERITED_TAG" ;;
  *) fail "### Asset Plan has no valid 'Inherited tag:' (got '${INHERITED_TAG:-<empty>}').
   Every Short must declare ad-safe or organic-only — see prompts/content-rules.md." ;;
esac

# Testimonial-shaped language in a script fronted by an AI character is the
# FTC 16 CFR 465 exposure. Flag it hard; the reviewer decides.
SCRIPT_TEXT="$(section "$SHORT_MD" "Script" | tr '\n' ' ')"
TESTIMONIAL_FLAG=0
if [[ "$(echo "$AI_PRESENTER" | tr '[:upper:]' '[:lower:]')" == "yes" ]]; then
  if echo "$SCRIPT_TEXT" | grep -qiE "\b(I (added|gained|lost|fixed|went from|used|tried)|my (squat|bench|deadlift|form|results|progress)|helped me|changed my|since I started)\b"; then
    TESTIMONIAL_FLAG=1
    warn "AI presenter + first-person results language detected in the script."
    warn "  This reads as a synthetic testimonial (FTC 16 CFR 465). Review closely."
  fi
fi

# ---- Write the review record -------------------------------------
jq -n \
  --arg date "$DATE_TAG" \
  --arg verdict "$VERDICT" \
  --arg score "${SCORE:-}" \
  --arg file "$SHORT_MD" \
  --arg hook "$(section_first "$SHORT_MD" "Hook")" \
  --arg title "$(section_first "$SHORT_MD" "Title")" \
  --arg tag "$INHERITED_TAG" \
  --arg ai "$AI_PRESENTER" \
  --arg blockers "$BLOCKERS" \
  --argjson testimonial_flag "$TESTIMONIAL_FLAG" \
  --arg generated "$(date '+%Y-%m-%d %H:%M:%S')" \
  '{date:$date, verdict:$verdict, score:$score, file:$file, hook:$hook,
    title:$title, inherited_tag:$tag, ai_presenter:$ai, blockers:$blockers,
    testimonial_flag:$testimonial_flag, generated:$generated,
    approved:false, approved_at:null}' \
  > "$PENDING_JSON"

"$GROWTH_DIR/notify.sh" success short "$DATE_TAG" "$SHORT_MD" \
  "$VERDICT ${SCORE:-} — awaiting human review" || true

echo ""
echo "  $VERDICT ${SCORE:+($SCORE)} — draft written."
echo ""
echo "    Short:  $SHORT_MD"
echo "    Hook:   $(section_first "$SHORT_MD" "Hook")"
echo "    Tag:    $INHERITED_TAG"
[[ -n "$BLOCKERS" && "$(echo "$BLOCKERS" | tr '[:upper:]' '[:lower:]')" != "none" ]] \
  && echo "    Blocks: $BLOCKERS"
[[ "$TESTIMONIAL_FLAG" -eq 1 ]] \
  && echo "    !! Possible synthetic testimonial — read the script carefully."
echo ""
echo "  Nothing renders until you approve it:"
echo "    ./growth/review-short.sh $DATE_TAG"
echo ""

echo "$SHORT_MD"
