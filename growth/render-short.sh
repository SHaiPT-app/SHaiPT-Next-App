#!/usr/bin/env bash
#
# growth/render-short.sh — assemble the 1080x1920 Short.
# ------------------------------------------------------------------
#   ./growth/render-short.sh [DATE]
#
# Inputs (produced by the earlier stages):
#   out/short-DATE.md           the approved script + beat list
#   out/voice-DATE.m4a          the voiceover          (make-voiceover.sh)
#   out/captions-DATE.ass       burned caption timings (make-voiceover.sh)
#   out/beats-DATE/manifest.json + media               (make-beats.sh)
#
# Output: out/shaipt-short-DATE.mp4  (1080x1920, H.264 + AAC, +faststart)
#
# ------------------------------------------------------------------
# WHY FFMPEG AND NOT REMOTION
# ------------------------------------------------------------------
# The medAI pipeline rendered Shorts with a Remotion composition, which
# meant a React project, its own node_modules, and `npx remotion render`.
# This repo is a Next.js app and the port is explicitly not allowed to add
# package.json dependencies, so a Remotion port was never on the table.
#
# ffmpeg covers what this channel actually needs — the hero asset here is
# real footage, not a motion-graphics composition — and it removes a whole
# class of failure (a stale node_modules, a peer-dep conflict with the
# app's React version) from a pipeline whose defining bug was an
# environment problem nobody noticed.
#
# The render is staged into discrete passes rather than one giant
# filter_complex. Staging costs a little disk and makes a failure legible:
# you can play the intermediate file and see exactly which pass broke.
# ------------------------------------------------------------------

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/common.sh"

GROWTH_LOG_PREFIX="RENDER"
GROWTH_RUN_TYPE="render"

RENDER_DATE="${1:-$DATE_TAG}"
SHORT_MD="$OUT_DIR/short-${RENDER_DATE}.md"
PENDING_JSON="$STATE_DIR/pending-${RENDER_DATE}.json"
VOICE_M4A="$OUT_DIR/voice-${RENDER_DATE}.m4a"
CAPTIONS_JSON="$OUT_DIR/captions-${RENDER_DATE}.json"
CAPTIONS_ASS="$OUT_DIR/captions-${RENDER_DATE}.ass"
BEATS_DIR="$OUT_DIR/beats-${RENDER_DATE}"
MANIFEST="$BEATS_DIR/manifest.json"
OUT_MP4="$OUT_DIR/shaipt-short-${RENDER_DATE}.mp4"

W=1080; H=1920; FPS=30

need_bin ffmpeg "brew install ffmpeg"
need_bin ffprobe "brew install ffmpeg"
need_bin jq
need_bin magick "brew install imagemagick"
need_file "$SHORT_MD" "the approved Short"

# ---- Approval gate ------------------------------------------------
# Checked BEFORE the input-file checks. An unapproved Short has no
# voiceover yet, so a file check first would report "missing voiceover"
# and send you off to generate one for something that must not be built
# at all. The gate is the real answer, so it speaks first.
[[ -f "$PENDING_JSON" ]] || fail "No review record for ${RENDER_DATE} — run ./growth/review-short.sh"
[[ "$(jq -r '.approved' "$PENDING_JSON")" == "true" ]] \
  || fail "Short ${RENDER_DATE} is not approved. Run: ./growth/review-short.sh ${RENDER_DATE}"

need_file "$VOICE_M4A" "the voiceover (run ./growth/make-voiceover.sh $RENDER_DATE)"

# All on-screen text is drawn by ImageMagick, which on this machine can
# only load fonts by absolute path (see resolve_font in lib/common.sh).
IM_FONT=()
if FONT_PATH="$(resolve_font)"; then
  IM_FONT=(-font "$FONT_PATH")
  log "font: $FONT_PATH"
else
  warn "no usable font found — captions, stamps and the title card will be skipped"
fi

TMPD="$(mktemp -d "${TMPDIR:-/tmp}/shaipt-render.XXXXXX")"
# Keep the staging directory on failure so a broken pass can be inspected.
cleanup() { [[ "${GROWTH_KEEP_TMP:-0}" == "1" ]] && { log "staging kept: $TMPD"; return; }; rm -rf "$TMPD"; }
trap cleanup EXIT

DURATION_S="$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$VOICE_M4A")"
log "Target duration: ${DURATION_S}s (from the voiceover)"

# ==================================================================
# PASS 1 — build the visual base, one segment per beat
# ==================================================================
# Each beat gets an equal slice of the voiceover. That is deliberately
# simple: the alternative (an LLM aligning beats to transcript segments,
# as the medAI align-segments.sh did) added an API call and a failure mode
# to buy sync that a 35-second Short does not need.
SEGMENTS=()
CLEAN_SEGMENTS=()   # pre-stamp segments, used for the thumbnail poster
BEAT_COUNT=0
if [[ -f "$MANIFEST" ]]; then
  BEAT_COUNT="$(jq '.beats | length' "$MANIFEST")"
fi

if [[ "$BEAT_COUNT" -eq 0 ]]; then
  warn "no beats available — rendering a plain branded background"
  SEG_DUR="$DURATION_S"
else
  SEG_DUR="$(awk -v d="$DURATION_S" -v n="$BEAT_COUNT" 'BEGIN { printf "%.3f", d / n }')"
fi
log "Beats: ${BEAT_COUNT} × ${SEG_DUR}s"

# A neutral branded fallback frame, generated once, used whenever a beat's
# media is missing. Guarantees the render always has something to show.
FALLBACK_PNG="$TMPD/fallback.png"
magick -size ${W}x${H} \
  gradient:'#12161c-#1e2630' \
  -fill '#2a333f' -draw "circle $((W/2)),$((H/2)) $((W/2)),$((H/2 - 260))" \
  "$FALLBACK_PNG" 2>/dev/null \
  || magick -size ${W}x${H} xc:'#12161c' "$FALLBACK_PNG"

# make_segment <index> <source-kind> <path> <outfile>
# Normalises anything (still image, footage clip, replay capture) into a
# 1080x1920 30fps silent segment of exactly SEG_DUR.
make_segment() {
  local idx="$1" kind="$2" path="$3" out="$4"
  local abs="$path"
  [[ -f "$abs" ]] || abs="$GROWTH_DIR/$path"

  if [[ ! -f "$abs" ]]; then
    warn "beat $idx: media missing ($path) — using fallback"
    kind="missing"
  fi

  case "$kind" in
    footage|replay)
      # Centre-crop to 9:16, loop if the clip is shorter than the slice.
      # -an: source audio is dropped here; the voiceover is the audio bed.
      # Footage audio can be mixed back in later if a Short ever wants it.
      ffmpeg -nostdin -y -loglevel error -stream_loop -1 -i "$abs" -t "$SEG_DUR" \
        -vf "scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=${FPS},setsar=1,format=yuv420p" \
        -an -c:v libx264 -preset veryfast -crf 20 "$out" 2>>"$LOG_FILE"
      ;;
    generated|character)
      # Slow Ken Burns push so a still does not read as a frozen frame.
      ffmpeg -nostdin -y -loglevel error -loop 1 -i "$abs" -t "$SEG_DUR" \
        -vf "scale=${W}*1.12:${H}*1.12:force_original_aspect_ratio=increase,crop=${W}*1.12:${H}*1.12,zoompan=z='min(zoom+0.0009,1.12)':d=$(awk -v s="$SEG_DUR" -v f="$FPS" 'BEGIN{printf "%d", s*f}'):s=${W}x${H}:fps=${FPS},setsar=1,format=yuv420p" \
        -an -c:v libx264 -preset veryfast -crf 20 "$out" 2>>"$LOG_FILE"
      ;;
    *)
      ffmpeg -nostdin -y -loglevel error -loop 1 -i "$FALLBACK_PNG" -t "$SEG_DUR" \
        -vf "scale=${W}:${H},fps=${FPS},setsar=1,format=yuv420p" \
        -an -c:v libx264 -preset veryfast -crf 20 "$out" 2>>"$LOG_FILE"
      ;;
  esac

  # Any pass that produces nothing falls back rather than failing the run.
  if [[ ! -s "$out" ]]; then
    warn "beat $idx: segment render failed — substituting fallback"
    ffmpeg -nostdin -y -loglevel error -loop 1 -i "$FALLBACK_PNG" -t "$SEG_DUR" \
      -vf "scale=${W}:${H},fps=${FPS},setsar=1,format=yuv420p" \
      -an -c:v libx264 -preset veryfast -crf 20 "$out" 2>>"$LOG_FILE" || return 1
  fi
  return 0
}

if [[ "$BEAT_COUNT" -eq 0 ]]; then
  SEG="$TMPD/seg-001.mp4"
  make_segment 1 missing "" "$SEG" || fail "fallback segment failed"
  SEGMENTS+=("$SEG")
  CLEAN_SEGMENTS+=("$SEG")
else
  while IFS=$'\t' read -r bidx bsrc bpath bstamp; do
    printf -v NN '%03d' "$bidx"
    SEG="$TMPD/seg-${NN}.mp4"
    make_segment "$bidx" "$bsrc" "$bpath" "$SEG" || fail "segment $bidx failed"
    # Remember the un-stamped segment: the thumbnail's poster frame must
    # come from imagery with NO burned-in text of any kind, or the
    # thumbnail stacks its headline on top of a stamp.
    CLEAN_SEGMENTS+=("$SEG")

    # ---- stamp overlay ------------------------------------------
    # Crisp type composited by ImageMagick, never drawn by the image
    # model: model-rendered text arrives misspelled.
    if [[ -n "$bstamp" && "$bstamp" != "null" ]]; then
      STAMP_PNG="$TMPD/stamp-${NN}.png"
      magick -background '#d7ff3e' -fill '#12161c' "${IM_FONT[@]}" -pointsize 58 \
        -gravity center "label:  ${bstamp}  " \
        -bordercolor '#d7ff3e' -border 14x10 "$STAMP_PNG" 2>/dev/null || true
      if [[ -s "$STAMP_PNG" ]]; then
        STAMPED="$TMPD/seg-${NN}-s.mp4"
        # -loop 1 -t is load-bearing. A bare `-i still.png` is a ONE-FRAME
        # stream living only at t=0, so `fade=t=in:st=0` evaluates that
        # single frame at alpha 0 and `overlay` then repeats the now fully
        # transparent frame for the whole segment — the stamp silently
        # never appears, and ffmpeg still exits 0. Looping the image into a
        # real timed stream is what makes both fades meaningful.
        S_IN=0.2
        S_OUT="$(awk -v s="$SEG_DUR" 'BEGIN{printf "%.2f", (s > 1.6 ? s - 0.7 : s * 0.6)}')"
        if ffmpeg -nostdin -y -loglevel error -i "$SEG" \
            -loop 1 -t "$SEG_DUR" -i "$STAMP_PNG" \
            -filter_complex "[1:v]format=rgba,fade=t=in:st=${S_IN}:d=0.25:alpha=1,fade=t=out:st=${S_OUT}:d=0.35:alpha=1[stamp];[0:v][stamp]overlay=(W-w)/2:H*0.60:format=auto:shortest=1[vout]" \
            -map "[vout]" -c:v libx264 -preset veryfast -crf 20 -an "$STAMPED" 2>>"$LOG_FILE" \
           && [[ -s "$STAMPED" ]]; then
          SEG="$STAMPED"
        else
          warn "beat $bidx: stamp overlay failed — continuing without it"
        fi
      fi
    fi
    SEGMENTS+=("$SEG")
  done < <(jq -r '.beats[] | [(.index|tostring), .source, (.path // ""), (.stamp // "")] | @tsv' "$MANIFEST")
fi

[[ ${#SEGMENTS[@]} -gt 0 ]] || fail "no segments were produced"
log "Segments built: ${#SEGMENTS[@]}"

# ==================================================================
# PASS 2 — concatenate
# ==================================================================
CONCAT_LIST="$TMPD/concat.txt"
: > "$CONCAT_LIST"
for s in "${SEGMENTS[@]}"; do
  printf "file '%s'\n" "$s" >> "$CONCAT_LIST"
done

BASE_MP4="$TMPD/base.mp4"
log "Concatenating"
ffmpeg -nostdin -y -loglevel error -f concat -safe 0 -i "$CONCAT_LIST" \
  -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p -r "$FPS" -an "$BASE_MP4" \
  2>>"$LOG_FILE" || fail "concat failed"
[[ -s "$BASE_MP4" ]] || fail "concat produced an empty file"

# ---- Clean poster frame for the thumbnail -------------------------
# Exported HERE, before the title card and captions are burned in.
# A thumbnail built from the finished video inherits that burned-in text
# and then stacks its own headline on top of it, so the card reads as
# doubled and unreadable at feed size. This is the only point in the
# pipeline where a clean, fully-composed frame exists.
# Pull it from an UN-STAMPED segment rather than from the concatenated
# base, because stamps are burned in per segment before the concat.
POSTER_PNG="$OUT_DIR/poster-${RENDER_DATE}.png"
POSTER_IDX=$(( ${#CLEAN_SEGMENTS[@]} / 2 ))
[[ $POSTER_IDX -ge ${#CLEAN_SEGMENTS[@]} ]] && POSTER_IDX=$(( ${#CLEAN_SEGMENTS[@]} - 1 ))
POSTER_SRC="${CLEAN_SEGMENTS[$POSTER_IDX]}"
POSTER_AT="$(awk -v d="$SEG_DUR" 'BEGIN { printf "%.2f", d * 0.5 }')"
if ffmpeg -nostdin -y -loglevel error -ss "$POSTER_AT" -i "$POSTER_SRC" \
     -frames:v 1 "$POSTER_PNG" 2>>"$LOG_FILE" && [[ -s "$POSTER_PNG" ]]; then
  log "Clean poster frame from segment $((POSTER_IDX + 1)) -> ${POSTER_PNG#$GROWTH_DIR/}"
else
  warn "could not export a clean poster frame — the thumbnail will fall back"
  rm -f "$POSTER_PNG"
fi

# ==================================================================
# PASS 3 — hook title card over the opening beat
# ==================================================================
HOOK_TEXT="$(section_first "$SHORT_MD" "Thumbnail Headline" || true)"
[[ -n "$HOOK_TEXT" ]] || HOOK_TEXT="$(section_first "$SHORT_MD" "Title" || true)"
TITLED_MP4="$TMPD/titled.mp4"

if [[ -n "$HOOK_TEXT" ]]; then
  # "|" splits the headline into a white top line and an accent punch line.
  HL_TOP="${HOOK_TEXT%%|*}"
  HL_BOT=""
  [[ "$HOOK_TEXT" == *"|"* ]] && HL_BOT="$(echo "${HOOK_TEXT#*|}" | sed 's/^[[:space:]]*//')"
  HL_TOP="$(echo "$HL_TOP" | sed 's/[[:space:]]*$//')"

  TITLE_PNG="$TMPD/title.png"
  mk_line() {  # $1=text $2=fill $3=out
    magick -background none -fill "$2" "${IM_FONT[@]}" -pointsize 92 \
      -size $((W - 160))x -gravity center "caption:$1" "$3" 2>/dev/null
  }
  mk_line "$HL_TOP" "white" "$TMPD/t1.png" || true
  if [[ -n "$HL_BOT" ]]; then
    mk_line "$HL_BOT" "#d7ff3e" "$TMPD/t2.png" || true
    magick "$TMPD/t1.png" "$TMPD/t2.png" -background none -gravity center -append \
      "$TMPD/t-raw.png" 2>/dev/null || cp "$TMPD/t1.png" "$TMPD/t-raw.png"
  else
    cp "$TMPD/t1.png" "$TMPD/t-raw.png" 2>/dev/null || true
  fi
  # Drop shadow for legibility over arbitrary footage.
  if [[ -s "$TMPD/t-raw.png" ]]; then
    magick "$TMPD/t-raw.png" -trim +repage \
      \( +clone -background black -shadow 110x8+0+5 \) +swap \
      -background none -layers merge +repage "$TITLE_PNG" 2>/dev/null \
      || cp "$TMPD/t-raw.png" "$TITLE_PNG"
  fi

  HOLD="${GROWTH_TITLE_HOLD_S:-3.2}"
  if [[ -s "$TITLE_PNG" ]] && ffmpeg -nostdin -y -loglevel error -i "$BASE_MP4" -i "$TITLE_PNG" \
      -filter_complex "[1:v]format=rgba,fade=t=out:st=${HOLD}:d=0.4:alpha=1[t];[0:v][t]overlay=(W-w)/2:H*0.20:enable='lte(t,$(awk -v h="$HOLD" 'BEGIN{printf "%.2f", h+0.4}'))':format=auto" \
      -c:v libx264 -preset veryfast -crf 20 -an "$TITLED_MP4" 2>>"$LOG_FILE" \
     && [[ -s "$TITLED_MP4" ]]; then
    log "Hook title card overlaid (${HOLD}s hold)"
  else
    warn "title overlay failed — continuing without it"
    cp "$BASE_MP4" "$TITLED_MP4"
  fi
else
  warn "no headline found — skipping the title card"
  cp "$BASE_MP4" "$TITLED_MP4"
fi

# ==================================================================
# PASS 4 — burn captions
# ==================================================================
# Two paths. libass gives better typography but cannot be assumed:
# Homebrew's current ffmpeg ships without libass AND without libfreetype,
# so both `subtitles` and `drawtext` are unavailable on this machine.
# The portable path renders each caption chunk to a PNG with ImageMagick
# and composites it with `overlay`, which every ffmpeg build has.
CAPTIONED_MP4="$TMPD/captioned.mp4"
HAVE_LIBASS=0
ffmpeg -hide_banner -filters 2>/dev/null | grep -qE '^[[:space:]]*[A-Z.]+[[:space:]]+subtitles[[:space:]]' \
  && HAVE_LIBASS=1

burn_captions_libass() {
  [[ -s "$CAPTIONS_ASS" ]] || return 1
  cp "$CAPTIONS_ASS" "$TMPD/subs.ass"
  # The subtitles filter resolves paths relative to cwd, so run from the
  # staging dir to keep the filter string free of awkward characters.
  ( cd "$TMPD" && ffmpeg -nostdin -y -loglevel error -i "titled.mp4" \
      -vf "subtitles=subs.ass:fontsdir=/System/Library/Fonts" \
      -c:v libx264 -preset veryfast -crf 20 -an "captioned.mp4" 2>>"$LOG_FILE" ) \
    && [[ -s "$CAPTIONED_MP4" ]]
}

burn_captions_overlay() {
  [[ -s "$CAPTIONS_JSON" ]] || return 1
  local n; n="$(jq '.chunks | length' "$CAPTIONS_JSON")"
  [[ "$n" -gt 0 ]] || return 1

  # Render each chunk to a transparent PNG: heavy white type with a dark
  # outline and shadow, sized to the safe width.
  local i=0 inputs=() filter="" prev="0:v"
  while IFS=$'\t' read -r cstart cend ctext; do
    i=$((i + 1))
    printf -v CN '%03d' "$i"
    local png="$TMPD/cap-${CN}.png"
    magick -background none -fill white "${IM_FONT[@]}" -pointsize 76 \
      -stroke '#101010' -strokewidth 8 \
      -size $((W - 180))x -gravity center "caption:${ctext}" \
      "$TMPD/cap-raw-${CN}.png" 2>/dev/null || continue
    # Re-draw unstroked on top so the stroke sits behind the glyphs.
    magick -background none -fill white "${IM_FONT[@]}" -pointsize 76 \
      -size $((W - 180))x -gravity center "caption:${ctext}" \
      "$TMPD/cap-fg-${CN}.png" 2>/dev/null || continue
    magick "$TMPD/cap-raw-${CN}.png" "$TMPD/cap-fg-${CN}.png" \
      -gravity center -composite \
      \( +clone -background black -shadow 90x5+0+4 \) +swap \
      -background none -layers merge +repage "$png" 2>/dev/null \
      || cp "$TMPD/cap-fg-${CN}.png" "$png"
    [[ -s "$png" ]] || continue

    inputs+=(-i "$png")
    local label="v${i}"
    # Caption band at 74% height: below the hook card, above the
    # platform's own UI furniture.
    filter+="[${prev}][${i}:v]overlay=(W-w)/2:H*0.74:enable='between(t,${cstart},${cend})'[${label}];"
    prev="$label"
  done < <(jq -r '.chunks[] | [(.start|tostring), (.end|tostring), .text] | @tsv' "$CAPTIONS_JSON")

  [[ ${#inputs[@]} -gt 0 ]] || return 1
  # Strip the trailing ";" and name the final link.
  filter="${filter%;}"
  filter="${filter%\[$prev\]}[vout]"

  ffmpeg -nostdin -y -loglevel error -i "$TITLED_MP4" "${inputs[@]}" \
    -filter_complex "$filter" -map "[vout]" \
    -c:v libx264 -preset veryfast -crf 20 -an "$CAPTIONED_MP4" 2>>"$LOG_FILE" \
    && [[ -s "$CAPTIONED_MP4" ]]
}

if [[ "$HAVE_LIBASS" -eq 1 ]] && burn_captions_libass; then
  log "Captions burned (libass)"
elif burn_captions_overlay; then
  log "Captions burned (ImageMagick overlay path)"
else
  warn "no captions burned — shipping without them"
  cp "$TITLED_MP4" "$CAPTIONED_MP4"
fi

# ==================================================================
# PASS 5 — mux the voiceover
# ==================================================================
log "Muxing audio"
ffmpeg -nostdin -y -loglevel error -i "$CAPTIONED_MP4" -i "$VOICE_M4A" \
  -map 0:v:0 -map 1:a:0 \
  -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 \
  -shortest -movflags +faststart "$OUT_MP4" \
  2>>"$LOG_FILE" || fail "audio mux failed"

[[ -s "$OUT_MP4" ]] || fail "output mp4 is empty"

# ---- Verify -------------------------------------------------------
OUT_DUR="$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$OUT_MP4")"
OUT_RES="$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$OUT_MP4")"
OUT_MB="$(awk -v b="$(stat -f%z "$OUT_MP4" 2>/dev/null || stat -c%s "$OUT_MP4")" 'BEGIN{printf "%.1f", b/1048576}')"

[[ "$OUT_RES" == "${W}x${H}" ]] || warn "unexpected resolution: $OUT_RES (wanted ${W}x${H})"

TAG="$(jq -r '.inherited_tag' "$PENDING_JSON")"

log "DONE. $OUT_MP4 (${OUT_DUR}s, $OUT_RES, ${OUT_MB} MB)"
"$GROWTH_DIR/notify.sh" success render "$RENDER_DATE" "$OUT_MP4" \
  "${OUT_DUR}s ${OUT_RES} ${OUT_MB}MB · $TAG" || true

echo ""
echo "  Rendered:  $OUT_MP4"
echo "  Duration:  ${OUT_DUR}s · $OUT_RES · ${OUT_MB} MB"
echo "  Usage tag: $TAG"
if [[ "$TAG" == "organic-only" ]]; then
  echo ""
  echo "  ORGANIC ONLY — do not put this video behind ad spend."
fi
echo ""
echo "  Next:  ./growth/make-thumbnail.sh $RENDER_DATE"
echo "         ./growth/make-metadata.sh  $RENDER_DATE"
echo "  Then publish by hand — see growth/README.md."
echo ""

echo "$OUT_MP4"
