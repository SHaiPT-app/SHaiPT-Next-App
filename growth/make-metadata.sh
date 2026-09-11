#!/usr/bin/env bash
#
# growth/make-metadata.sh — publish-ready metadata for YouTube + Instagram.
# ------------------------------------------------------------------
#   ./growth/make-metadata.sh [DATE]
#
# Output: out/metadata-DATE.txt   human-readable, paste into the platform
#         out/metadata-DATE.json  machine-readable, for later automation
#
# The usage tag is reproduced at the TOP of both files, in the loudest
# form the format allows. That placement is deliberate: the moment the
# tag matters is the moment someone is about to boost a post, and it must
# be impossible to reach the caption without reading it.
# ------------------------------------------------------------------

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/common.sh"

GROWTH_LOG_PREFIX="METADATA"

META_DATE="${1:-$DATE_TAG}"
SHORT_MD="$OUT_DIR/short-${META_DATE}.md"
PENDING_JSON="$STATE_DIR/pending-${META_DATE}.json"
OUT_TXT="$OUT_DIR/metadata-${META_DATE}.txt"
OUT_JSON="$OUT_DIR/metadata-${META_DATE}.json"

need_bin jq
need_file "$SHORT_MD" "the approved Short"

TITLE="$(section_first "$SHORT_MD" "Title" || true)"
[[ -n "$TITLE" ]] || fail "no ### Title in $SHORT_MD"

DESCRIPTION="$(section "$SHORT_MD" "Description" | sed '/^$/d')"
HASHTAGS="$(section "$SHORT_MD" "Hashtags" | tr '\n' ' ' | sed 's/  */ /g; s/^ //; s/ $//')"
PINNED_Q="$(section_first "$SHORT_MD" "Pinned Comment Question" || true)"
HOOK="$(section_first "$SHORT_MD" "Hook" || true)"

# YouTube truncates titles at 100 chars.
if [[ ${#TITLE} -gt 100 ]]; then
  warn "title is ${#TITLE} chars — YouTube truncates at 100"
fi

# Usage tag and AI disclosure from the review record.
TAG="unknown"; AI_PRESENTER="no"
if [[ -f "$PENDING_JSON" ]]; then
  TAG="$(jq -r '.inherited_tag // "unknown"' "$PENDING_JSON")"
  AI_PRESENTER="$(jq -r '.ai_presenter // "no"' "$PENDING_JSON")"
fi

# ---- Usage banner -------------------------------------------------
case "$TAG" in
  ad-safe)
    BANNER="USAGE: AD-SAFE — cleared for organic posts AND paid ads."
    BANNER_NOTE="Every asset is Ali's own, a released friend, or an AI character."
    ;;
  organic-only)
    BANNER="USAGE: ORGANIC ONLY — NEVER BOOST, NEVER PUT BEHIND AD SPEND."
    BANNER_NOTE="Contains third-party likeness or footage. Using it in a paid ad
implies endorsement: that is a right-of-publicity exposure and Meta/Google
ad review rejects unlicensed public-figure likenesses. Organic post only."
    ;;
  *)
    BANNER="USAGE: UNKNOWN — DO NOT PUBLISH."
    BANNER_NOTE="No valid usage tag on the review record. Re-run
./growth/review-short.sh ${META_DATE} before publishing anything."
    ;;
esac

# ---- AI disclosure ------------------------------------------------
# Both YouTube and Meta require disclosure of realistic synthetic media.
# The line goes in the description as well as the platform toggle,
# because the toggle is easy to forget and the line is self-documenting.
AI_LINE=""
AI_TODO=""
if [[ "$AI_PRESENTER" == "yes" ]]; then
  AI_LINE="Presented by an AI-generated character."
  AI_TODO="  [ ] Tick YouTube's \"Altered or synthetic content\" disclosure
  [ ] Tick Meta's AI-content disclosure on the Reel"
fi

# ---- Compose ------------------------------------------------------
{
  echo "============================================================"
  echo "$BANNER"
  echo "------------------------------------------------------------"
  echo "$BANNER_NOTE"
  echo "============================================================"
  echo ""
  echo "=== TITLE (YouTube, <=100 chars; currently ${#TITLE}) ==="
  echo "$TITLE"
  echo ""
  echo "=== DESCRIPTION ==="
  echo "$DESCRIPTION"
  [[ -n "$AI_LINE" ]] && { echo ""; echo "$AI_LINE"; }
  echo ""
  echo "Film your own set: https://shaipt.com"
  echo ""
  echo "$HASHTAGS"
  echo ""
  echo "=== INSTAGRAM REELS CAPTION ==="
  # Instagram shows ~125 chars before "more", so lead with the hook and
  # push hashtags to the end.
  echo "$HOOK"
  echo ""
  echo "$DESCRIPTION"
  [[ -n "$AI_LINE" ]] && { echo ""; echo "$AI_LINE"; }
  echo ""
  echo "Link in bio."
  echo ""
  echo "$HASHTAGS"
  echo ""
  echo "=== PINNED COMMENT ==="
  echo "${PINNED_Q:-(none authored)}"
  echo ""
  echo "=== MANUAL PUBLISH CHECKLIST ==="
  echo "  [ ] Watch the render end to end, sound on"
  echo "  [ ] Captions track the voiceover and clear the platform UI"
  echo "  [ ] Every on-screen number is a real 4Dcoach output"
  echo "  [ ] Thumbnail matches what the video actually delivers"
  [[ -n "$AI_TODO" ]] && echo "$AI_TODO"
  if [[ "$TAG" == "organic-only" ]]; then
    echo "  [ ] NOT scheduled for any paid promotion"
    echo "  [ ] NOT added to an ad account's creative library"
  fi
  echo "  [ ] Upload, set the thumbnail, publish"
  echo "  [ ] Pin the comment above"
  echo ""
} > "$OUT_TXT"

jq -n \
  --arg date "$META_DATE" \
  --arg title "$TITLE" \
  --arg description "$DESCRIPTION" \
  --arg hashtags "$HASHTAGS" \
  --arg hook "$HOOK" \
  --arg pinned "$PINNED_Q" \
  --arg usage "$TAG" \
  --arg ai_presenter "$AI_PRESENTER" \
  --argjson ad_eligible "$([[ "$TAG" == "ad-safe" ]] && echo true || echo false)" \
  '{date:$date, title:$title, description:$description, hashtags:$hashtags,
    hook:$hook, pinned_comment:$pinned, usage:$usage,
    ai_presenter:($ai_presenter == "yes"), ad_eligible:$ad_eligible}' \
  > "$OUT_JSON"

log "metadata written: $OUT_TXT"

echo ""
echo "  $BANNER"
echo ""
echo "  $OUT_TXT"
echo "  $OUT_JSON"
echo ""

echo "$OUT_TXT"
