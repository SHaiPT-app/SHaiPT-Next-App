#!/usr/bin/env bash
#
# growth/make-beats.sh — generate the illustrated cutaway beats.
# ------------------------------------------------------------------
#   ./growth/make-beats.sh [DATE]
#
# Reads ### Beats from the approved Short and generates one image per
# GENERATED / CHARACTER beat. FOOTAGE: and REPLAY beats are skipped — they
# are real media that Ali supplies.
#
# Output: out/beats-DATE/beat-NN.png  +  out/beats-DATE/manifest.json
#
# NON-FATAL BY DESIGN: if image generation is unavailable or fails, this
# exits 0 with whatever it managed to produce. render-short.sh holds the
# last frame of the previous beat over any gap. A missing cutaway should
# never cost you the Short.
#
# Env:
#   GROWTH_SKIP_BEATS=1       skip entirely
#   GROWTH_BEAT_MAX           max images (default 8)
#   GROWTH_BEAT_QUALITY       low | medium (default) | high
#   OPENAI_IMAGE_MODEL        default gpt-image-1.5
#
# Cost: ~8 images x ~$0.03 at quality=medium => well under $0.50 a Short.
# ------------------------------------------------------------------

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/common.sh"

GROWTH_LOG_PREFIX="BEATS"

BEAT_DATE="${1:-$DATE_TAG}"
SHORT_MD="$OUT_DIR/short-${BEAT_DATE}.md"
BEATS_DIR="$OUT_DIR/beats-${BEAT_DATE}"
MANIFEST="$BEATS_DIR/manifest.json"

MAX_BEATS="${GROWTH_BEAT_MAX:-8}"
QUALITY="${GROWTH_BEAT_QUALITY:-medium}"
IMG_MODEL="${OPENAI_IMAGE_MODEL:-gpt-image-1.5}"
IMG_KEY="${OPENAI_IMAGE_API_KEY:-${OPENAI_API_KEY:-}}"

if [[ "${GROWTH_SKIP_BEATS:-0}" == "1" ]]; then
  log "GROWTH_SKIP_BEATS=1 — skipping"
  exit 0
fi

need_bin jq
need_file "$SHORT_MD" "the approved Short"
mkdir -p "$BEATS_DIR"

# ---- House style --------------------------------------------------
# Held in the shell, not in the model's per-beat concept, so every image
# in every Short matches. Changing the look is a one-line edit here.
STYLE="Bold minimalist sports-science illustration: confident heavy ink linework, ONE clear focal subject, generous negative space, flat gouache washes with a subtle paper grain. Palette for THIS image: two or three harmonious colors drawn from deep slate blue, electric lime, warm graphite, bone white, and a single saturated accent — the palette may vary between images, the drawing style must not. Athletic, technical, calm. Avoid photorealism. Absolutely NO text, letters, numerals, or written words anywhere in the image."

LAYOUT="Vertical 9:16 composition for a phone screen: hero subject in the MIDDLE band of the frame, oversized and bold; keep the top 20 percent and the bottom 30 percent visually calm and uncluttered, because title and caption panels overlay there. No borders, no frames, no UI chrome."

# Used when a concept trips the provider's safety filter. Anatomy and
# body-position phrasing draws false positives constantly on a lifting
# channel, so a neutral retry keeps the beat rather than losing it.
SAFE_CONCEPT="an abstract arrangement of a barbell, a motion-path arc, and simple geometric timing bars floating over soft shapes"

# ---- Parse the beats ----------------------------------------------
# Line format:  - {SOURCE} | {visual} >> {STAMP or none}
BEATS_RAW="$(section "$SHORT_MD" "Beats")"
[[ -n "$BEATS_RAW" ]] || { log "no ### Beats section — nothing to do"; echo '{"beats":[]}' > "$MANIFEST"; exit 0; }

# ---- Image call ---------------------------------------------------
gen_image() {  # $1 = full prompt, $2 = outfile -> 0 on success
  local resp="$BEATS_DIR/.resp.json" http
  http="$(curl -sS -X POST https://api.openai.com/v1/images/generations \
      -H "Authorization: Bearer $IMG_KEY" \
      -H "Content-Type: application/json" \
      --connect-timeout 15 --max-time 180 \
      -d "$(jq -n --arg m "$IMG_MODEL" --arg p "$1" --arg q "$QUALITY" \
          '{model:$m, prompt:$p, n:1, size:"1024x1536", quality:$q}')" \
      -o "$resp" -w "%{http_code}" < /dev/null || echo "000")"

  if [[ "$http" == "400" ]] && grep -qi 'safety' "$resp" 2>/dev/null; then
    log "  safety filter tripped — retrying once with a neutral concept"
    http="$(curl -sS -X POST https://api.openai.com/v1/images/generations \
        -H "Authorization: Bearer $IMG_KEY" \
        -H "Content-Type: application/json" \
        --connect-timeout 15 --max-time 180 \
        -d "$(jq -n --arg m "$IMG_MODEL" --arg q "$QUALITY" \
              --arg p "${STYLE}

Scene: ${SAFE_CONCEPT}

${LAYOUT}" \
            '{model:$m, prompt:$p, n:1, size:"1024x1536", quality:$q}')" \
        -o "$resp" -w "%{http_code}" < /dev/null || echo "000")"
  fi

  if [[ "$http" != "200" ]]; then
    log "  image http=$http: $(jq -r '.error.message // "?"' "$resp" 2>/dev/null | head -1)"
    rm -f "$resp"
    return 1
  fi
  jq -r '.data[0].b64_json // empty' "$resp" | base64 -d > "$2" 2>/dev/null
  rm -f "$resp"
  [[ -s "$2" ]]
}

# ---- Walk the beats -----------------------------------------------
ENTRIES='[]'
IDX=0
GEN_N=0
FAIL_N=0

while IFS= read -r line; do
  line="${line#- }"
  line="$(echo "$line" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')"
  [[ -z "$line" ]] && continue
  IDX=$((IDX + 1))

  # Split "{SOURCE} | {visual} >> {STAMP}"
  SRC="$(echo "$line" | awk -F'|' '{print $1}' | sed 's/[[:space:]]*$//')"
  REST="$(echo "$line" | cut -d'|' -f2-)"
  VISUAL="${REST%%>>*}"
  VISUAL="$(echo "$VISUAL" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')"
  STAMP=""
  if [[ "$REST" == *">>"* ]]; then
    STAMP="$(echo "${REST#*>>}" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')"
  fi
  case "$(echo "$STAMP" | tr '[:upper:]' '[:lower:]')" in none|null|"") STAMP="" ;; esac
  [[ ${#STAMP} -gt 20 ]] && { warn "beat $IDX stamp too long, dropping: $STAMP"; STAMP=""; }

  printf -v NN '%02d' "$IDX"
  BEAT_FILE=""

  case "$SRC" in
    FOOTAGE:*)
      CLIP="${SRC#FOOTAGE:}"
      # Registry enforcement also lives here, not only at review, so a
      # beat list edited by hand after approval cannot smuggle in an
      # unregistered clip.
      if TAGV="$("$GROWTH_DIR/assets.sh" check "$GROWTH_DIR/$CLIP" 2>/dev/null)"; then
        log "beat $NN: footage $CLIP [$TAGV]"
      else
        warn "beat $NN references unregistered footage: $CLIP — beat will be skipped at render"
      fi
      ENTRIES="$(echo "$ENTRIES" | jq --argjson i "$IDX" --arg s "footage" \
        --arg p "$CLIP" --arg st "$STAMP" \
        '. + [{index:$i, source:$s, path:$p, stamp:(if $st=="" then null else $st end)}]')"
      continue
      ;;
    REPLAY)
      # Ali screen-records the 4Dcoach replay. Named by convention so the
      # renderer finds it without another config file.
      EXPECTED="$BEATS_DIR/replay-${NN}.mp4"
      if [[ -s "$EXPECTED" ]]; then
        log "beat $NN: replay capture present"
      else
        warn "beat $NN needs a 4Dcoach replay capture at: ${EXPECTED#$GROWTH_DIR/}"
      fi
      ENTRIES="$(echo "$ENTRIES" | jq --argjson i "$IDX" --arg s "replay" \
        --arg p "${EXPECTED#$GROWTH_DIR/}" --arg st "$STAMP" \
        '. + [{index:$i, source:$s, path:$p, stamp:(if $st=="" then null else $st end)}]')"
      continue
      ;;
    GENERATED|CHARACTER)
      BEAT_FILE="$BEATS_DIR/beat-${NN}.png"
      ;;
    *)
      warn "beat $IDX has an unrecognised source '$SRC' — skipping"
      continue
      ;;
  esac

  # ---- generate ---------------------------------------------------
  if [[ -s "$BEAT_FILE" ]]; then
    log "beat $NN: reusing existing image"
  elif [[ -z "$IMG_KEY" ]]; then
    warn "beat $NN: no image API key — skipped"
    FAIL_N=$((FAIL_N + 1)); continue
  elif [[ "$GEN_N" -ge "$MAX_BEATS" ]]; then
    warn "beat $NN: image cap ($MAX_BEATS) reached — skipped"
    FAIL_N=$((FAIL_N + 1)); continue
  else
    # CHARACTER beats get an explicit presenter framing appended. This is
    # the image-side half of content-rules.md rule 2: a character may be
    # shown presenting, never shown as a customer describing results.
    EXTRA=""
    if [[ "$SRC" == "CHARACTER" ]]; then
      EXTRA=" The figure is a presenter addressing the camera or gesturing toward a display — never posed as a customer giving a testimonial, and never shown alongside before-and-after imagery."
    fi
    log "beat $NN ($SRC): ${VISUAL:0:64}"
    if ! gen_image "${STYLE}

Scene for this moment of a weightlifting technique Short: ${VISUAL}.${EXTRA}

${LAYOUT}" "$BEAT_FILE"; then
      warn "beat $NN image failed — the renderer will hold the previous beat"
      FAIL_N=$((FAIL_N + 1)); continue
    fi
    GEN_N=$((GEN_N + 1))
  fi

  ENTRIES="$(echo "$ENTRIES" | jq --argjson i "$IDX" \
    --arg s "$(echo "$SRC" | tr '[:upper:]' '[:lower:]')" \
    --arg p "${BEAT_FILE#$GROWTH_DIR/}" --arg st "$STAMP" \
    '. + [{index:$i, source:$s, path:$p, stamp:(if $st=="" then null else $st end)}]')"

done <<< "$BEATS_RAW"

echo "$ENTRIES" | jq '{beats: .}' > "$MANIFEST"

N_TOTAL="$(echo "$ENTRIES" | jq 'length')"
log "DONE. ${N_TOTAL} beats in manifest (${GEN_N} images generated, ${FAIL_N} unavailable)"
log "  manifest: $MANIFEST"
[[ "$GEN_N" -gt 0 ]] && log "  est. image cost ~\$$(awk -v n="$GEN_N" 'BEGIN {printf "%.2f", n * 0.03}')"

echo "$MANIFEST"
