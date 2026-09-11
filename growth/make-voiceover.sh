#!/usr/bin/env bash
#
# growth/make-voiceover.sh — TTS the approved script + get caption timings.
# ------------------------------------------------------------------
#   ./growth/make-voiceover.sh [DATE]
#
# 1. Reads ### Script from the approved Short.
# 2. OpenAI TTS  -> out/voice-DATE.m4a
# 3. OpenAI Whisper (word granularity) -> out/words-DATE.json
# 4. Word timings -> out/captions-DATE.ass  (burned in by render-short.sh)
#
# Refuses to run on an unapproved Short: TTS costs money and the render
# chain downstream costs more, so the approval gate is enforced here too
# rather than trusting callers to run the steps in order.
#
# Env:
#   GROWTH_TTS_VOICE   default "onyx"
#   GROWTH_TTS_MODEL   default "tts-1-hd"
# ------------------------------------------------------------------

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/common.sh"

GROWTH_LOG_PREFIX="VOICE"
GROWTH_RUN_TYPE="short"

VOICE_DATE="${1:-$DATE_TAG}"
SHORT_MD="$OUT_DIR/short-${VOICE_DATE}.md"
PENDING_JSON="$STATE_DIR/pending-${VOICE_DATE}.json"
VOICE_M4A="$OUT_DIR/voice-${VOICE_DATE}.m4a"
WORDS_JSON="$OUT_DIR/words-${VOICE_DATE}.json"
CAPTIONS_JSON="$OUT_DIR/captions-${VOICE_DATE}.json"
CAPTIONS_ASS="$OUT_DIR/captions-${VOICE_DATE}.ass"

VOICE="${GROWTH_TTS_VOICE:-onyx}"
TTS_MODEL="${GROWTH_TTS_MODEL:-tts-1-hd}"

need_bin curl
need_bin jq
need_bin ffmpeg "brew install ffmpeg"
need_bin ffprobe "brew install ffmpeg"
need_file "$SHORT_MD" "the approved Short"
need_env OPENAI_API_KEY

# ---- Approval gate ------------------------------------------------
[[ -f "$PENDING_JSON" ]] || fail "No review record for ${VOICE_DATE} — run ./growth/review-short.sh"
[[ "$(jq -r '.approved' "$PENDING_JSON")" == "true" ]] \
  || fail "Short ${VOICE_DATE} is not approved. Run: ./growth/review-short.sh ${VOICE_DATE}"

TMPD="$(mktemp -d "${TMPDIR:-/tmp}/shaipt-voice.XXXXXX")"
trap 'rm -rf "$TMPD"' EXIT

# ---- 1. Script text ----------------------------------------------
# Flatten to a single line: TTS reads verbatim, so a stray newline or
# markdown bullet becomes an audible artifact.
SCRIPT_TEXT="$(section "$SHORT_MD" "Script" | tr -s '[:space:]' ' ' | sed 's/^ *//; s/ *$//')"
[[ -n "$SCRIPT_TEXT" ]] || fail "### Script is empty in $SHORT_MD"

WORD_COUNT="$(echo "$SCRIPT_TEXT" | wc -w | tr -d ' ')"
log "Script: ${WORD_COUNT} words"
[[ "$WORD_COUNT" -gt 200 ]] && warn "script is long for a Short (${WORD_COUNT} words)"

# ---- 2. TTS -------------------------------------------------------
TTS_WAV="$TMPD/voice.wav"
log "TTS (model=$TTS_MODEL voice=$VOICE)"
curl -sS --fail-with-body \
    --connect-timeout 15 --max-time 120 \
    --retry 3 --retry-delay 5 --retry-connrefused \
    -X POST https://api.openai.com/v1/audio/speech \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg t "$SCRIPT_TEXT" --arg v "$VOICE" --arg m "$TTS_MODEL" \
        '{model:$m, input:$t, voice:$v, response_format:"wav"}')" \
    -o "$TTS_WAV" \
  || fail "OpenAI TTS request failed (timeout or HTTP error)"
[[ -s "$TTS_WAV" ]] || fail "TTS returned an empty file"

ffmpeg -nostdin -y -loglevel error -i "$TTS_WAV" \
    -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart "$VOICE_M4A" \
  || fail "ffmpeg AAC encode failed"

DURATION_S="$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$VOICE_M4A")"
log "Voiceover: $VOICE_M4A (${DURATION_S}s)"

# A Short that runs past ~60s gets truncated by the platform, so surface
# it now rather than after a render.
if awk -v d="$DURATION_S" 'BEGIN { exit !(d > 58) }'; then
  warn "voiceover is ${DURATION_S}s — over the Shorts sweet spot, consider trimming the script"
fi

# ---- 3. Whisper word timings -------------------------------------
COMPRESSED="$TMPD/compressed.m4a"
ffmpeg -nostdin -y -loglevel error -i "$VOICE_M4A" -c:a aac -b:a 64k -ac 1 -ar 16000 "$COMPRESSED" \
  || fail "ffmpeg compress for Whisper failed"

log "Whisper word-level transcription"
HTTP="$(curl -sS -X POST https://api.openai.com/v1/audio/transcriptions \
    --connect-timeout 15 --max-time 180 \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -F "file=@${COMPRESSED}" \
    -F "model=whisper-1" \
    -F "response_format=verbose_json" \
    -F "timestamp_granularities[]=word" \
    -F "timestamp_granularities[]=segment" \
    -o "$WORDS_JSON" -w "%{http_code}")"
if [[ "$HTTP" != "200" ]]; then
  head -c 500 "$WORDS_JSON" >&2 || true
  fail "Whisper returned http=$HTTP"
fi
N_WORDS="$(jq '.words | length' "$WORDS_JSON")"
log "Whisper: ${N_WORDS} words timed"

# ---- 4. Build burned-in captions ---------------------------------
# Word timings are grouped into short phrases. Single-word karaoke reads
# as jittery on a 9:16 crop; 3-word groups track the voice without
# strobing. Positioned in the lower third, clear of the platform UI.
#
# TWO ARTIFACTS, because ffmpeg text support cannot be assumed:
#   captions-DATE.json  chunk list — always usable, rendered to PNGs and
#                       composited by the renderer via `overlay`
#   captions-DATE.ass   libass subtitle file — better typography, used
#                       only when the local ffmpeg actually has libass
#
# Homebrew's current ffmpeg on this machine ships with NEITHER libass nor
# libfreetype, so `subtitles` and `drawtext` both fail. The JSON path
# needs only `overlay` and ImageMagick, which are always present, so
# captions survive an ffmpeg build that cannot draw text at all.
log "Building caption files"

# Chunked caption list (the portable path).
jq --argjson group 3 '
  [.words[] | {w: (.word | ltrimstr(" ")), s: .start, e: .end}] as $ws
  | {chunks: [range(0; ($ws | length); $group)
      | $ws[.:(. + $group)] as $c
      | {start: $c[0].s, end: $c[-1].e,
         text: ([$c[].w] | join(" ") | ascii_upcase)}]}
' "$WORDS_JSON" > "$CAPTIONS_JSON" || fail "caption chunking failed"
log "Captions: $(jq '.chunks | length' "$CAPTIONS_JSON") chunks -> $CAPTIONS_JSON"
jq -r --argjson group 3 '
  def esc: gsub("\\{"; "(") | gsub("\\}"; ")") | gsub("\\\\"; "/");
  def ts(t): (t | floor) as $s
    | ($s / 3600 | floor) as $h
    | (($s % 3600) / 60 | floor) as $m
    | ($s % 60) as $sec
    | ((t - $s) * 100 | floor) as $cs
    | "\($h):\(if $m < 10 then "0" else "" end)\($m):\(if $sec < 10 then "0" else "" end)\($sec).\(if $cs < 10 then "0" else "" end)\($cs)";
  [.words[] | {w: .word, s: .start, e: .end}] as $ws
  | [range(0; ($ws | length); $group)
     | $ws[.:(. + $group)] as $chunk
     | "Dialogue: 0,\(ts($chunk[0].s)),\(ts($chunk[-1].e)),Caption,,0,0,0,,"
       + ([$chunk[].w] | join(" ") | ltrimstr(" ") | esc | ascii_upcase)]
  | .[]
' "$WORDS_JSON" > "$TMPD/dialogue.txt" || fail "caption timing transform failed"

cat > "$CAPTIONS_ASS" <<'ASSHEAD'
[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Avenir Next,74,&H00FFFFFF,&H00FFFFFF,&H00101010,&H80000000,-1,0,0,0,100,100,0,0,1,7,3,2,90,90,430,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
ASSHEAD
cat "$TMPD/dialogue.txt" >> "$CAPTIONS_ASS"

N_LINES="$(grep -c '^Dialogue:' "$CAPTIONS_ASS" || echo 0)"
log "ASS subtitle file: ${N_LINES} lines -> $CAPTIONS_ASS (used only if ffmpeg has libass)"

# Record duration for the renderer so it does not re-probe.
jq -n --arg d "$DURATION_S" --arg v "$VOICE_M4A" \
      --arg c "$CAPTIONS_JSON" --arg a "$CAPTIONS_ASS" \
  '{duration_s: ($d | tonumber), voice: $v, captions_json: $c, captions_ass: $a}' \
  > "$STATE_DIR/voice-${VOICE_DATE}.json"

echo "$VOICE_M4A"
