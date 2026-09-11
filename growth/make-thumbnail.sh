#!/usr/bin/env bash
#
# growth/make-thumbnail.sh — 1080x1920 custom thumbnail for a Short.
# ------------------------------------------------------------------
#   ./growth/make-thumbnail.sh [DATE]
#
# Output: out/thumb-DATE.jpg  (JPEG, under 2 MB — YouTube's limit)
#         override with GROWTH_THUMB_OUT for throwaway test renders so a
#         test never clobbers a real one.
#
# Background source, first that works:
#   1. a frame grabbed from the rendered Short (real footage beats a
#      generated scene on a channel whose whole pitch is real lifts)
#   2. the first generated beat image
#   3. a gpt-image scene from ### Thumbnail Image Prompt
#   4. a plain branded gradient
#
# Then composites: darkening scrim, headline (white top / accent punch),
# optional topic chip, and the SHaiPT wordmark.
#
# NON-FATAL: on failure YouTube auto-picks a frame, so this never blocks
# a publish. It exits non-zero only if it cannot write anything at all.
#
# Env:
#   GROWTH_THUMB_FRAME_S   seconds into the video to grab (default 1.2)
#   GROWTH_THUMB_GEN=0     disable the gpt-image fallback
# ------------------------------------------------------------------

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/common.sh"

GROWTH_LOG_PREFIX="THUMB"

THUMB_DATE="${1:-$DATE_TAG}"
SHORT_MD="$OUT_DIR/short-${THUMB_DATE}.md"
SHORT_MP4="$OUT_DIR/shaipt-short-${THUMB_DATE}.mp4"
BEATS_DIR="$OUT_DIR/beats-${THUMB_DATE}"
OUT_THUMB="${GROWTH_THUMB_OUT:-$OUT_DIR/thumb-${THUMB_DATE}.jpg}"

W=1080; H=1920
ACCENT="#d7ff3e"    # SHaiPT accent
INK="#12161c"       # near-black ground

need_bin magick "brew install imagemagick"
need_file "$SHORT_MD" "the Short markdown"

TMPD="$(mktemp -d "${TMPDIR:-/tmp}/shaipt-thumb.XXXXXX")"
trap 'rm -rf "$TMPD"' EXIT

# ImageMagick here resolves fonts by absolute path only — see
# resolve_font in lib/common.sh for why a font NAME does not work.
FONT_ARG=()
if FONT_PATH="$(resolve_font)"; then
  FONT_ARG=(-font "$FONT_PATH")
  log "font: $FONT_PATH"
else
  fail "no usable font found — cannot draw the thumbnail headline"
fi

# ---- 1. Headline --------------------------------------------------
HEADLINE="$(section_first "$SHORT_MD" "Thumbnail Headline" || true)"
[[ -n "$HEADLINE" ]] || HEADLINE="$(section_first "$SHORT_MD" "Title" || true)"
[[ -n "$HEADLINE" ]] || fail "no Thumbnail Headline or Title in $SHORT_MD"

HL_TOP="$HEADLINE"; HL_BOT=""
if [[ "$HEADLINE" == *"|"* ]]; then
  HL_TOP="$(echo "${HEADLINE%%|*}" | sed 's/[[:space:]]*$//')"
  HL_BOT="$(echo "${HEADLINE#*|}"  | sed 's/^[[:space:]]*//')"
fi

# Topic chip from the first specific hashtag, skipping the generic ones.
KICKER="$(section "$SHORT_MD" "Hashtags" 2>/dev/null | grep -oE '#[A-Za-z0-9]+' \
  | grep -viE '^#(Shorts|SHaiPT|Fitness|Gym|GymTok|AI)$' | head -1 | tr -d '#' || true)"

log "headline='${HL_TOP}${HL_BOT:+ | $HL_BOT}' kicker='${KICKER:-none}'"

# ---- 2. Background ------------------------------------------------
BG_RAW=""

# (1) The clean poster frame render-short.sh exported BEFORE it burned in
# the title card and captions. Preferred: this channel's credibility is
# real footage, and a real frame guarantees the thumbnail matches the
# video — mismatch is punished by satisfaction-weighted ranking.
POSTER_PNG="$OUT_DIR/poster-${THUMB_DATE}.png"
if [[ -s "$POSTER_PNG" ]]; then
  BG_RAW="$POSTER_PNG"
  log "background: clean poster frame from the render"
fi

# (1b) Fall back to grabbing from the finished video. Note this frame
# already carries burned-in captions, so we deliberately seek past the
# title-card hold to avoid stacking two headlines on top of each other.
if [[ -z "$BG_RAW" && -s "$SHORT_MP4" ]] && command -v ffmpeg >/dev/null 2>&1; then
  FRAME_S="${GROWTH_THUMB_FRAME_S:-6.0}"
  if ffmpeg -nostdin -y -loglevel error -ss "$FRAME_S" -i "$SHORT_MP4" -frames:v 1 \
      "$TMPD/frame.png" 2>>"$LOG_FILE" && [[ -s "$TMPD/frame.png" ]]; then
    BG_RAW="$TMPD/frame.png"
    warn "no clean poster frame — using a captioned frame at ${FRAME_S}s"
  fi
fi

# (2) First generated beat image.
if [[ -z "$BG_RAW" ]]; then
  CAND="$(ls -1 "$BEATS_DIR"/beat-*.png 2>/dev/null | head -1 || true)"
  [[ -n "$CAND" && -s "$CAND" ]] && { BG_RAW="$CAND"; log "background: $CAND"; }
fi

# (3) gpt-image from the authored thumbnail prompt.
IMG_KEY="${OPENAI_IMAGE_API_KEY:-${OPENAI_API_KEY:-}}"
if [[ -z "$BG_RAW" && "${GROWTH_THUMB_GEN:-1}" == "1" && -n "$IMG_KEY" ]] \
   && command -v curl >/dev/null && command -v jq >/dev/null; then
  CONCEPT="$(section_first "$SHORT_MD" "Thumbnail Image Prompt" || true)"
  [[ -n "$CONCEPT" ]] || CONCEPT="$(section_first "$SHORT_MD" "Product Moment" || true)"
  if [[ -n "$CONCEPT" ]]; then
    log "background: generating a scene (gpt-image)"
    GP="Bold minimalist sports-science illustration, heavy confident ink linework, dramatic high-contrast flat gouache washes. Palette: deep slate blue and warm graphite ground with a single saturated electric-lime accent on the focal object. ONE dominant oversized hero subject, slightly off-center, strong silhouette. Vertical 9:16; keep the upper 18 percent and lower 30 percent visually calm and uncluttered. Editorial cover-art energy. Absolutely NO text, letters, numerals, or written words anywhere in the image.

Scene: ${CONCEPT}"
    HC="$(curl -sS -m 120 -o "$TMPD/gen.json" -w '%{http_code}' \
        -X POST https://api.openai.com/v1/images/generations \
        -H "Authorization: Bearer $IMG_KEY" -H "Content-Type: application/json" \
        -d "$(jq -n --arg m "${OPENAI_IMAGE_MODEL:-gpt-image-1.5}" --arg p "$GP" \
              '{model:$m, prompt:$p, n:1, size:"1024x1536", quality:"high"}')" \
        2>/dev/null || echo 000)"
    if [[ "$HC" == "200" ]]; then
      jq -r '.data[0].b64_json // empty' "$TMPD/gen.json" | base64 -d > "$TMPD/gen.png" 2>/dev/null || true
      [[ -s "$TMPD/gen.png" ]] && BG_RAW="$TMPD/gen.png"
    else
      warn "image gen http=$HC — falling through to the plain background"
    fi
  fi
fi

# (4) Plain branded gradient. Always available, so the script cannot
# fail for want of a background.
if [[ -z "$BG_RAW" ]]; then
  log "background: plain branded gradient"
  BG_RAW="$TMPD/plain.png"
  magick -size ${W}x${H} gradient:'#1e2630-#12161c' "$BG_RAW" \
    || magick -size ${W}x${H} xc:"$INK" "$BG_RAW"
fi

# ---- 3. Compose ---------------------------------------------------
# Cover-fill, slight punch to contrast, then legibility scrims: a light
# one at the top for the wordmark, a heavy one at the bottom for the
# headline.
magick "$BG_RAW" -resize ${W}x${H}^ -gravity center -extent ${W}x${H} \
  -modulate 94,112,100 "$TMPD/base.jpg" || fail "background resize failed"

magick -size ${W}x300  gradient:"#12161cC0-#12161c00" "$TMPD/top.png"
magick -size ${W}x1050 gradient:"#12161c00-#12161cF5" "$TMPD/bot.png"
magick "$TMPD/base.jpg" \
  \( -size ${W}x${H} xc:'#12161c30' \) -compose over -composite \
  "$TMPD/top.png" -gravity north -composite \
  "$TMPD/bot.png" -gravity south -composite \
  "$TMPD/bg.jpg" || fail "scrim composite failed"

mk_line() {  # $1=text $2=fill $3=boxheight $4=out
  magick -background none -fill "$2" "${FONT_ARG[@]}" \
    -size $((W - 140))x"$3" -gravity center "caption:$1" "$4" 2>/dev/null
}

LINES=()
mk_line "$HL_TOP" "white" 360 "$TMPD/l1.png" && LINES+=("$TMPD/l1.png")
if [[ -n "$HL_BOT" ]]; then
  mk_line "$HL_BOT" "$ACCENT" 220 "$TMPD/l2.png" && LINES+=("$TMPD/l2.png")
fi
[[ ${#LINES[@]} -gt 0 ]] || fail "headline render produced nothing"

magick "${LINES[@]}" -background none -gravity center -append "$TMPD/hl_raw.png"
magick "$TMPD/hl_raw.png" -trim +repage \
  \( +clone -background black -shadow 110x7+0+6 \) +swap \
  -background none -layers merge +repage "$TMPD/hl.png" \
  || cp "$TMPD/hl_raw.png" "$TMPD/hl.png"

# Optional topic chip above the headline.
if [[ -n "$KICKER" ]]; then
  magick -background "$ACCENT" -fill "$INK" "${FONT_ARG[@]}" -pointsize 42 \
    -gravity center "label: $(echo "$KICKER" | tr '[:lower:]' '[:upper:]') " \
    -bordercolor "$ACCENT" -border 18x11 "$TMPD/chip.png" 2>/dev/null || true
fi
if [[ -s "${TMPD}/chip.png" ]]; then
  magick "$TMPD/chip.png" "$TMPD/hl.png" -background none -gravity center -append \
    -splice 0x18 "$TMPD/lower.png" 2>/dev/null \
    || magick "$TMPD/chip.png" "$TMPD/hl.png" -background none -gravity center -append "$TMPD/lower.png"
else
  cp "$TMPD/hl.png" "$TMPD/lower.png"
fi

# Wordmark: "SH" white + "ai" accent + "PT" white.
magick \
  \( -background none -fill white    "${FONT_ARG[@]}" -pointsize 46 label:'SH' \) \
  \( -background none -fill "$ACCENT" "${FONT_ARG[@]}" -pointsize 46 label:'ai' \) \
  \( -background none -fill white    "${FONT_ARG[@]}" -pointsize 46 label:'PT' \) \
  +append \( +clone -background black -shadow 90x4+0+3 \) +swap \
  -background none -layers merge +repage "$TMPD/wordmark.png" 2>/dev/null || true

COMPOSE=("$TMPD/bg.jpg" "$TMPD/lower.png" -gravity south -geometry +0+200 -composite)
COMPOSE+=(\( -size 170x9 xc:"$ACCENT" \) -gravity south -geometry +0+140 -composite)
[[ -s "$TMPD/wordmark.png" ]] && COMPOSE+=("$TMPD/wordmark.png" -gravity northwest -geometry +56+54 -composite)

magick "${COMPOSE[@]}" -quality 90 -strip "$OUT_THUMB" || fail "final composite failed"
[[ -s "$OUT_THUMB" ]] || fail "thumbnail is empty: $OUT_THUMB"

# YouTube rejects custom thumbnails over 2 MB; step the quality down
# rather than handing back a file that will be refused at upload.
SZ_KB=$(( $(stat -f%z "$OUT_THUMB" 2>/dev/null || stat -c%s "$OUT_THUMB") / 1024 ))
if [[ "$SZ_KB" -gt 1950 ]]; then
  warn "thumbnail ${SZ_KB}KB exceeds YouTube's 2MB limit — recompressing"
  magick "$OUT_THUMB" -quality 78 -strip "$OUT_THUMB"
  SZ_KB=$(( $(stat -f%z "$OUT_THUMB" 2>/dev/null || stat -c%s "$OUT_THUMB") / 1024 ))
fi

log "wrote $OUT_THUMB (${SZ_KB} KB)"
echo "$OUT_THUMB"
