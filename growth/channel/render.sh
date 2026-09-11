#!/usr/bin/env bash
#
# ══════════════════════════════════════════════════════════════════════════════
# SHaiPT YouTube channel art — SVG ➜ PNG/JPG at the sizes YouTube wants.
# ══════════════════════════════════════════════════════════════════════════════
#
#   ./render.sh                 render everything into ./out
#   ./render.sh --guides        same, but with the crop/safe-area guides drawn on
#                               top. QA only — never upload a guides render.
#   ./render.sh --stills        regenerate ./stills from public/hero/bench.mp4
#                               and stop. (The stills are committed, so a normal
#                               run does not need ffmpeg.)
#   ./render.sh --fonts         report whether the real brand faces are installed
#
# WHAT COMES OUT, and where it goes on YouTube:
#
#   banner-2560x1440.png/.jpg      Customise channel ▸ Branding ▸ Banner image
#                                  (2560x1440 recommended, 6 MB max)
#   avatar-800x800.png             Customise channel ▸ Branding ▸ Picture
#                                  (800x800 recommended, 4 MB max, shown at 48px)
#   thumb-*-1280x720.png/.jpg      video thumbnail (1280x720, 2 MB max)
#   thumb-*-1080x1920.png/.jpg     Shorts cover (9:16)
#   banner-safe-*, banner-desktop-*, avatar-48/98    QA crops, do not upload
#
# The two worked thumbnails are built from thumbnail-template.svg and
# thumbnail-template-shorts.svg by token substitution — the same approach as
# ~/KK/ai-ml-briefings/scripts/make-thumbnail.sh. To make a new thumbnail, add a
# row to the EXAMPLES block near the bottom.
#
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$HERE/out"
BUILD="$HERE/build"
STILLS="$HERE/stills"
SRC_VIDEO="$(cd "$HERE/../.." && pwd)/public/hero/bench.mp4"

GUIDES=0
MODE="all"
for arg in "$@"; do
  case "$arg" in
    --guides) GUIDES=1 ;;
    --stills) MODE="stills" ;;
    --fonts)  MODE="fonts" ;;
    -h|--help) sed -n '2,30p' "$0"; exit 0 ;;
    *) echo "unknown argument: $arg" >&2; exit 2 ;;
  esac
done

red()  { printf '\033[31m%s\033[0m\n' "$*"; }
grn()  { printf '\033[32m%s\033[0m\n' "$*"; }
dim()  { printf '\033[2m%s\033[0m\n' "$*"; }
warn() { printf '\033[33m%s\033[0m\n' "$*"; }

# ─────────────────────────────────────────────────────────────────────────────
# 1. Find an SVG renderer.
# ─────────────────────────────────────────────────────────────────────────────
IM=""
command -v magick >/dev/null 2>&1 && IM="magick"
[ -z "$IM" ] && command -v convert >/dev/null 2>&1 && IM="convert"

CHROME=""
for c in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
         "/Applications/Chromium.app/Contents/MacOS/Chromium" \
         "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
         "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"; do
  [ -x "$c" ] && { CHROME="$c"; break; }
done

# RENDERER may be forced from the environment, e.g.  RENDERER=inkscape ./render.sh
RENDERER="${RENDERER:-}"
if   [ -n "$RENDERER" ];                      then :
elif command -v rsvg-convert >/dev/null 2>&1; then RENDERER="rsvg"
elif command -v resvg        >/dev/null 2>&1; then RENDERER="resvg"
elif [ -n "$IM" ];                            then RENDERER="magick"
elif command -v inkscape     >/dev/null 2>&1; then RENDERER="inkscape"
elif [ -n "$CHROME" ];                        then RENDERER="chrome"
fi

if [ -z "$RENDERER" ]; then
  red "No SVG renderer found. Install ONE of these and re-run:"
  cat >&2 <<'EOF'

    brew install librsvg          # rsvg-convert  — fastest, best text metrics
    brew install imagemagick      # magick        — also needed for the crops below
    brew install resvg            # resvg
    brew install --cask inkscape  # inkscape      — heavyweight but exact

  Or install Google Chrome (headless screenshot fallback).
EOF
  exit 1
fi

# ImageMagick is used for cropping, downscaling and JPG encoding even when the
# SVG renderer is something else. Without it we can only emit the full-size PNGs.
if [ -z "$IM" ]; then
  warn "ImageMagick not found — the QA crops, the small avatars and the JPGs will"
  warn "be skipped. Install it with:  brew install imagemagick"
fi

dim "renderer: $RENDERER${IM:+   raster tools: $IM}"

# ─────────────────────────────────────────────────────────────────────────────
# 2. Fonts. Instrument Serif and Geist Mono are the real brand faces (they are
#    loaded as webfonts in app/layout.tsx). If they are not installed locally the
#    SVGs fall back to Didot and Menlo, which is close but not identical.
# ─────────────────────────────────────────────────────────────────────────────
have_font() {
  if command -v fc-list >/dev/null 2>&1; then
    fc-list 2>/dev/null | grep -qi "$1" && return 0
  fi
  ls ~/Library/Fonts /Library/Fonts 2>/dev/null | grep -qi "$1"
}
font_report() {
  local missing=0
  for f in "Instrument" "Geist"; do
    if have_font "$f"; then grn "  font $f ............ installed"
    else warn "  font $f ............ MISSING (falling back)"; missing=1; fi
  done
  if [ "$missing" = 1 ]; then
    cat <<'EOF'

  The renders will use Didot (for Instrument Serif) and Menlo (for Geist Mono).
  That is a deliberate, close fallback — but to match the website exactly:

    brew install --cask font-instrument-serif font-geist-mono

  Then re-run ./render.sh. Nothing in the SVGs needs to change; the font stacks
  already name the real faces first.
EOF
  fi
}
font_report
[ "$MODE" = "fonts" ] && exit 0

# ─────────────────────────────────────────────────────────────────────────────
# 3. Stills. Cut from the landing page's own hero clip and graded the way the
#    site grades it (components/landing/ClosingBeat.tsx: grayscale(1)
#    contrast(1.12) brightness(0.42)). Committed, so this step is optional.
# ─────────────────────────────────────────────────────────────────────────────
make_stills() {
  if ! command -v ffmpeg >/dev/null 2>&1 || [ -z "$IM" ]; then
    red "--stills needs both ffmpeg and ImageMagick:  brew install ffmpeg imagemagick"
    exit 1
  fi
  [ -f "$SRC_VIDEO" ] || { red "source clip not found: $SRC_VIDEO"; exit 1; }
  mkdir -p "$STILLS"
  local tmp; tmp="$(mktemp -d)"

  # Banner plate: the whole 2560x1440 canvas, pushed right down so type can sit
  # on it. Vignette keeps the wings from competing with the safe area.
  ffmpeg -v error -ss 2.0 -i "$SRC_VIDEO" -frames:v 1 -q:v 2 "$tmp/b.png" -y
  $IM "$tmp/b.png" -colorspace Gray -resize 2916x1440^ -gravity center -extent 2560x1440 \
     -sigmoidal-contrast 5,48% -modulate 44,0,100 \
     \( +clone -fill black -colorize 100 -fill white \
        -draw "ellipse 1280,720 1150,700 0,360" -blur 0x180 -alpha off \) \
     -compose Multiply -composite -colorspace Gray \
     -attenuate 0.6 +noise Gaussian -colorspace Gray -quality 88 "$STILLS/banner-plate.jpg"

  # Thumbnail stills: 1600x900, brighter than the banner because a thumbnail has
  # to win a grid. Both templates slice from these.
  cut_still() { # <seconds> <name>
    ffmpeg -v error -ss "$1" -i "$SRC_VIDEO" -frames:v 1 -q:v 2 "$tmp/$2.png" -y
    $IM "$tmp/$2.png" -colorspace Gray -resize 1822x900^ -gravity center -extent 1600x900 \
       -sigmoidal-contrast 4,46% -modulate 68,0,100 \
       -attenuate 0.35 +noise Gaussian -colorspace Gray -quality 92 "$STILLS/$2.jpg"
  }
  cut_still 3.6 still-bench-bottom   # bar on the chest: where elbow angle is judged
  cut_still 2.0 still-bench-drive    # mid-press: where bar speed is read

  rm -rf "$tmp"
  grn "stills regenerated in $STILLS"
}
[ "$MODE" = "stills" ] && { make_stills; exit 0; }

for s in banner-plate.jpg still-bench-bottom.jpg still-bench-drive.jpg; do
  [ -f "$STILLS/$s" ] || { warn "missing $STILLS/$s — running --stills for you"; make_stills; break; }
done

# ─────────────────────────────────────────────────────────────────────────────
# 4. The renderer shim.  render <in.svg> <out.png> <w> <h>
#    Every SVG here is authored at its exact output size, so this is 1:1.
# ─────────────────────────────────────────────────────────────────────────────
render() {
  local in="$1" out="$2" w="$3" h="$4"
  case "$RENDERER" in
    rsvg)  rsvg-convert -w "$w" -h "$h" -o "$out" "$in" ;;
    resvg) resvg -w "$w" -h "$h" "$in" "$out" ;;
    magick)
      # -density scales librsvg's rasterisation; 96 dpi is 1:1 for our canvases.
      ( cd "$(dirname "$in")" && $IM -background none -density 96 "$(basename "$in")" \
          -resize "${w}x${h}!" PNG32:"$out" ) ;;
    inkscape)
      inkscape "$in" -o "$out" -w "$w" -h "$h" --export-background-opacity=0 >/dev/null 2>&1 ;;
    chrome)
      local html="${in%.svg}.wrap.html"
      {
        printf '<style>html,body{margin:0;padding:0;background:transparent}svg{display:block}</style>'
        cat "$in"
      } > "$html"
      "$CHROME" --headless --disable-gpu --hide-scrollbars \
        --default-background-color=00000000 \
        --window-size="$w,$h" --screenshot="$out" "file://$html" >/dev/null 2>&1
      rm -f "$html" ;;
  esac
  [ -s "$out" ] || { red "render failed: $in"; exit 1; }
}

# Copy an SVG into build/, resolving relative image paths and optionally turning
# the QA guide layer on.
stage() { # <src.svg> <dest-name>
  local src="$1" dest="$BUILD/$2"
  sed -e "s|href=\"stills/|href=\"$STILLS/|g" "$src" > "$dest"
  if [ "$GUIDES" = 1 ]; then
    sed -i '' -e 's|id="crop-guides" display="none"|id="crop-guides" display="inline"|' "$dest" 2>/dev/null \
      || sed -i -e 's|id="crop-guides" display="none"|id="crop-guides" display="inline"|' "$dest"
  fi
  printf '%s' "$dest"
}

rm -rf "$OUT" "$BUILD"; mkdir -p "$OUT" "$BUILD"
[ "$GUIDES" = 1 ] && warn "GUIDES ON — these renders are for QA, do not upload them"

# ─────────────────────────────────────────────────────────────────────────────
# 5. Banner + the crops that prove it survives them.
# ─────────────────────────────────────────────────────────────────────────────
echo; dim "banner…"
B="$(stage "$HERE/banner.svg" banner.svg)"
render "$B" "$OUT/banner-2560x1440.png" 2560 1440
if [ -n "$IM" ]; then
  $IM "$OUT/banner-2560x1440.png" -quality 92 "$OUT/banner-2560x1440.jpg"
  # The three crops YouTube actually applies.
  $IM "$OUT/banner-2560x1440.png" -crop 1546x423+507+509 +repage "$OUT/banner-safe-1546x423.png"
  $IM "$OUT/banner-2560x1440.png" -crop 1855x423+353+509 +repage "$OUT/banner-tablet-1855x423.png"
  $IM "$OUT/banner-2560x1440.png" -crop 2560x423+0+509   +repage "$OUT/banner-desktop-2560x423.png"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 6. Avatar, plus the two sizes YouTube shows it at.
# ─────────────────────────────────────────────────────────────────────────────
dim "avatar…"
A="$(stage "$HERE/avatar.svg" avatar.svg)"
render "$A" "$OUT/avatar-800x800.png" 800 800
if [ -n "$IM" ]; then
  $IM "$OUT/avatar-800x800.png" -resize 98x98 "$OUT/avatar-98x98.png"
  $IM "$OUT/avatar-800x800.png" -resize 48x48 "$OUT/avatar-48x48.png"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 7. Thumbnails. One row per video; both aspect ratios from the same tokens.
# ─────────────────────────────────────────────────────────────────────────────
# thumb <slug> <still> <kicker> <head1> <head2> <score> <metric1> <metric2> <tag>
thumb() {
  local slug="$1" still="$2" kicker="$3" h1="$4" h2="$5" score="$6" m1="$7" m2="$8" tag="$9"
  # Arc length for each ring: score/100 * circumference.  r=98 ➜ 615.752,  r=82 ➜ 515.221
  local dash dashs
  dash=$(awk -v s="$score" 'BEGIN{printf "%.2f", s/100*615.752}')
  dashs=$(awk -v s="$score" 'BEGIN{printf "%.2f", s/100*515.221}')

  fill() { # <template> <out> <dash-token> <dash-value>
    sed -e "s|{{STILL}}|$STILLS/$still|g" \
        -e "s|{{KICKER}}|$kicker|g" \
        -e "s|{{HEADLINE_1}}|$h1|g" \
        -e "s|{{HEADLINE_2}}|$h2|g" \
        -e "s|{{SCORE}}|$score|g" \
        -e "s|{{$3}}|$4|g" \
        -e "s|{{METRIC_1}}|$m1|g" \
        -e "s|{{METRIC_2}}|$m2|g" \
        -e "s|{{TAG}}|$tag|g" "$1" > "$2"
    if [ "$GUIDES" = 1 ]; then
      sed -i '' -e 's|id="crop-guides" display="none"|id="crop-guides" display="inline"|' "$2" 2>/dev/null \
        || sed -i -e 's|id="crop-guides" display="none"|id="crop-guides" display="inline"|' "$2"
    fi
  }

  dim "thumbnail $slug…"
  fill "$HERE/thumbnail-template.svg"        "$BUILD/$slug-16x9.svg"  SCORE_DASH   "$dash"
  fill "$HERE/thumbnail-template-shorts.svg" "$BUILD/$slug-9x16.svg"  SCORE_DASH_S "$dashs"
  render "$BUILD/$slug-16x9.svg" "$OUT/thumb-$slug-1280x720.png"  1280  720
  render "$BUILD/$slug-9x16.svg" "$OUT/thumb-$slug-1080x1920.png" 1080 1920
  if [ -n "$IM" ]; then
    $IM "$OUT/thumb-$slug-1280x720.png"  -quality 90 "$OUT/thumb-$slug-1280x720.jpg"
    $IM "$OUT/thumb-$slug-1080x1920.png" -quality 90 "$OUT/thumb-$slug-1080x1920.jpg"
  fi
}

# ── EXAMPLES ────────────────────────────────────────────────────────────────
# Both hooks are things 4Dcoach genuinely reports. The bench rule it checks is
# elbow-to-torso 30–80° at the bottom, so "91°, cap is 80°" is the shape of a
# real warning. RIR comes from concentric velocity loss across the set.
#
# Both use bench stills because public/hero/bench.mp4 is the only real footage
# in this repo. Swap {{STILL}} for a squat or deadlift frame before shipping a
# squat or deadlift video — never label a bench still as another lift.
thumb elbow-flare still-bench-bottom.jpg "BENCH PRESS" \
      "Rep 4: elbows at" "91°. Cap is 80°." 74 \
      "8 REPS" "2.1S DOWN · 0.9S UP" "SHAIPT.COM"

thumb reps-left   still-bench-drive.jpg  "BENCH PRESS" \
      "The bar slowed." "2 reps left." 88 \
      "6 REPS · RIR 2" "1.8S DOWN · 1.1S UP" "SHAIPT.COM"

# ─────────────────────────────────────────────────────────────────────────────
# 8. Verify. Every file is checked against the size YouTube expects and the
#    upload cap it enforces.
# ─────────────────────────────────────────────────────────────────────────────
echo
printf '%-38s %-12s %10s   %s\n' FILE DIMENSIONS SIZE CHECK
printf '%s\n' "────────────────────────────────────────────────────────────────────────────"
fails=0
check() { # <file> <expect-wxh> <max-bytes-or-0>
  local f="$OUT/$1" want="$2" cap="$3" got size note="ok"
  [ -f "$f" ] || { printf '%-38s %-12s %10s   %s\n' "$1" "-" "-" "MISSING"; fails=$((fails+1)); return; }
  if [ -n "$IM" ]; then got="$($IM identify -format '%wx%h' "$f")"; else got="$want (unverified)"; fi
  size=$(wc -c < "$f" | tr -d ' ')
  [ "$got" = "$want" ] || { note="WRONG SIZE, want $want"; fails=$((fails+1)); }
  if [ "$cap" != 0 ] && [ "$size" -gt "$cap" ]; then
    note="OVER YOUTUBE CAP — upload the .jpg instead"; fails=$((fails+1))
  fi
  printf '%-38s %-12s %9sK   %s\n' "$1" "$got" "$((size/1024))" "$note"
}
check banner-2560x1440.png        2560x1440 6291456
check banner-2560x1440.jpg        2560x1440 6291456
check banner-safe-1546x423.png    1546x423  0
check banner-tablet-1855x423.png  1855x423  0
check banner-desktop-2560x423.png 2560x423  0
check avatar-800x800.png          800x800   4194304
check avatar-98x98.png            98x98     0
check avatar-48x48.png            48x48     0
for s in elbow-flare reps-left; do
  check "thumb-$s-1280x720.png"  1280x720  2097152
  check "thumb-$s-1280x720.jpg"  1280x720  2097152
  check "thumb-$s-1080x1920.png" 1080x1920 2097152
  check "thumb-$s-1080x1920.jpg" 1080x1920 2097152
done
echo
if [ "$fails" = 0 ]; then grn "all outputs correct → $OUT"
else warn "$fails check(s) flagged above. PNGs over the cap are fine to ignore if"
     warn "you upload the matching .jpg, which is what the caps are sized for."
fi
