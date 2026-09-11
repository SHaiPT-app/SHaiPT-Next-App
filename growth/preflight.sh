#!/usr/bin/env bash
#
# growth/preflight.sh — fail-fast environment check.
# ------------------------------------------------------------------
# Run this FIRST, always. Every pipeline script calls it; you should
# also run it by hand after any machine change (OS upgrade, node
# reinstall, homebrew cleanup) before trusting a scheduled run.
#
#   ./growth/preflight.sh          # check everything, human-readable
#   ./growth/preflight.sh --quiet  # exit code only, for script callers
#
# Exit codes:
#   0  everything required is present
#   1  a hard requirement is missing (pipeline cannot run)
#
# Optional-but-recommended items produce warnings, not failures, EXCEPT
# the alert channel: see the note under "Alerting" below.
#
# ------------------------------------------------------------------
# DESIGN NOTE — why this is a separate, loud, up-front script
# ------------------------------------------------------------------
# The medAI pipeline discovered its missing `claude` binary *inside* the
# generation stage, three retries and three minutes of backoff deep,
# where the only surfaced symptom was "rc=127" in a 3.8 MB cron.log. It
# had a YouTube OAuth precheck (good instinct) but no binary precheck,
# so the single most likely failure — a CLI that moved or was never
# installed — was the one thing it did not check for.
#
# This script checks the things that actually break, in the order they
# break, and refuses to let a run start on a broken machine.
# ------------------------------------------------------------------

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/common.sh"

GROWTH_LOG_PREFIX="PREFLIGHT"
QUIET=0
[[ "${1:-}" == "--quiet" ]] && QUIET=1

PROBLEMS=0
WARNINGS=0

say()  { [[ $QUIET -eq 1 ]] || echo "$*"; }
ok()   { say "  ok    $*"; }
bad()  { say "  FAIL  $*"; PROBLEMS=$((PROBLEMS + 1)); }
soft() { say "  warn  $*"; WARNINGS=$((WARNINGS + 1)); }

say ""
say "SHaiPT growth pipeline — preflight"
say "  repo:   $REPO_DIR"
say "  growth: $GROWTH_DIR"
say ""

# ---- 1. The Claude CLI (the medAI killer) ------------------------
say "Claude CLI"
if CLAUDE_BIN="$(resolve_claude)"; then
  CLAUDE_VER="$("$CLAUDE_BIN" --version 2>/dev/null | head -1 || echo '?')"
  ok "$CLAUDE_BIN ($CLAUDE_VER)"
  # An unpinned binary found only via PATH still works interactively but
  # is fragile under a scheduler — flag it now rather than at 06:00.
  if [[ -z "${GROWTH_CLAUDE_BIN:-}" ]]; then
    case "$CLAUDE_BIN" in
      "$HOME/.local/bin/claude"|/opt/homebrew/bin/claude|/usr/local/bin/claude) ;;
      *) soft "resolved via a non-standard location; pin it:"
         say  "        echo 'GROWTH_CLAUDE_BIN=$CLAUDE_BIN' >> $GROWTH_DIR/.env" ;;
    esac
  fi
else
  bad "no runnable claude binary found"
  say ""
  say "        Searched \$GROWTH_CLAUDE_BIN, ~/.local/bin, /opt/homebrew/bin,"
  say "        /usr/local/bin, ~/.claude/local, ~/Library/pnpm, ~/.bun/bin,"
  say "        ~/.npm-global/bin, ~/.volta/bin, ~/.claude/downloads/claude-*,"
  say "        and \$PATH."
  # Surface the specific trap this machine is currently in: a downloaded
  # binary that exists but is not executable.
  if compgen -G "$HOME/.claude/downloads/claude-*" >/dev/null 2>&1; then
    say ""
    say "        Non-executable candidate(s) present:"
    for f in "$HOME"/.claude/downloads/claude-*; do
      say "          $(ls -l "$f" | awk '{print $1, $NF}')"
    done
    say "        If one is the CLI:  chmod +x <path>  then pin GROWTH_CLAUDE_BIN."
  fi
  say ""
  say "        Otherwise install it:  npm i -g @anthropic-ai/claude-code"
fi
say ""

# ---- 2. Media tooling --------------------------------------------
say "Media tooling"
for pair in "ffmpeg:brew install ffmpeg" "ffprobe:brew install ffmpeg" \
            "jq:brew install jq" "curl:(system)" "magick:brew install imagemagick"; do
  bin="${pair%%:*}"; hint="${pair#*:}"
  if command -v "$bin" >/dev/null 2>&1; then
    ok "$bin ($(command -v "$bin"))"
  else
    bad "$bin missing — $hint"
  fi
done

# Caption rendering. The renderer prefers libass, and falls back to
# compositing ImageMagick-rendered PNGs with `overlay` — so a build
# without libass still gets captions. Report which path will be taken;
# only a missing `overlay` is actually a problem.
if command -v ffmpeg >/dev/null 2>&1; then
  if ffmpeg -hide_banner -filters 2>/dev/null | grep -qE '^[[:space:]]*[A-Z.]+[[:space:]]+subtitles[[:space:]]'; then
    ok "ffmpeg has libass — captions via the subtitles filter"
  elif ffmpeg -hide_banner -filters 2>/dev/null | grep -qE '^[[:space:]]*[A-Z.]+[[:space:]]+overlay[[:space:]]'; then
    ok "ffmpeg lacks libass — captions via the ImageMagick overlay path"
  else
    bad "ffmpeg has neither the subtitles nor the overlay filter — cannot render"
  fi
fi
say ""

# ---- 3. Credentials ----------------------------------------------
say "Credentials"
if [[ -f "$GROWTH_ENV" ]]; then
  ok "growth/.env present"
else
  soft "growth/.env missing — copy growth/env.example to growth/.env"
fi

if [[ -n "${OPENAI_API_KEY:-}" ]]; then
  ok "OPENAI_API_KEY set (TTS + captions + b-roll images)"
else
  bad "OPENAI_API_KEY not set — needed for voiceover, captions and b-roll"
fi

if [[ -n "${OPENAI_IMAGE_API_KEY:-}" ]]; then
  ok "OPENAI_IMAGE_API_KEY set (separate image key)"
else
  say "  ·     OPENAI_IMAGE_API_KEY unset — falling back to OPENAI_API_KEY for images"
fi
say ""

# ---- 4. Alerting -------------------------------------------------
# Deliberately a WARNING rather than a hard failure: a human running a
# render by hand does not need a webhook. But the text is emphatic
# because an unattended run without a push channel is precisely how the
# predecessor pipeline died unnoticed.
say "Alerting"
if [[ -n "${GROWTH_ALERT_WEBHOOK:-}" ]]; then
  ok "GROWTH_ALERT_WEBHOOK set — failures will reach you off-machine"
else
  soft "GROWTH_ALERT_WEBHOOK unset"
  say  "        Fine for hand-run work. NOT fine once anything is scheduled:"
  say  "        medAI Times logged 44 consecutive failures to a status file"
  say  "        that nobody opened. Set a Slack/Discord/ntfy webhook before"
  say  "        you wire up any scheduler."
fi
if [[ -n "${GROWTH_ALERT_EMAIL:-}" ]]; then
  command -v mail >/dev/null 2>&1 \
    && ok "GROWTH_ALERT_EMAIL set and \`mail\` present" \
    || soft "GROWTH_ALERT_EMAIL set but \`mail\` is not installed"
fi
say ""

# ---- 5. Prompts and layout ---------------------------------------
say "Prompts and layout"
for p in short-script-prompt.md beats-prompt.md hook-rubric.md content-rules.md; do
  if [[ -f "$PROMPTS_DIR/$p" ]]; then ok "prompts/$p"; else bad "prompts/$p missing"; fi
done
for d in "$OUT_DIR" "$STATE_DIR" "$ASSETS_DIR/footage" "$LOGS_DIR"; do
  [[ -d "$d" ]] && ok "${d#$GROWTH_DIR/}/" || soft "${d#$GROWTH_DIR/}/ missing (will be created)"
done
say ""

# ---- 6. Footage ---------------------------------------------------
# Real lifting footage is the hero asset for this channel, so an empty
# footage library is worth flagging even though the pipeline can render
# an all-generated Short without it.
say "Assets"
FOOTAGE_N=$(find "$ASSETS_DIR/footage" -type f \
  \( -iname '*.mov' -o -iname '*.mp4' -o -iname '*.m4v' \) 2>/dev/null | wc -l | tr -d ' ')
if [[ "$FOOTAGE_N" -gt 0 ]]; then
  ok "$FOOTAGE_N clip(s) in assets/footage/"
else
  soft "no footage in assets/footage/ — real lifts are the hero asset here"
fi
if [[ -f "$ASSET_REGISTRY" ]]; then
  REG_N=$(jq 'length' "$ASSET_REGISTRY" 2>/dev/null || echo 0)
  UNTAGGED=$(jq '[.[] | select((.usage // "") | IN("organic-only","ad-safe") | not)] | length' \
             "$ASSET_REGISTRY" 2>/dev/null || echo 0)
  ok "asset registry: $REG_N entries"
  [[ "$UNTAGGED" -gt 0 ]] && bad "$UNTAGGED registry entries lack an organic-only/ad-safe tag"
else
  soft "no asset registry yet — create entries with ./growth/assets.sh add"
fi
say ""

# ---- Verdict ------------------------------------------------------
if [[ $PROBLEMS -gt 0 ]]; then
  if [[ $QUIET -eq 0 ]]; then
    echo "============================================================"
    echo "PREFLIGHT FAILED — $PROBLEMS problem(s), $WARNINGS warning(s)"
    echo "Fix the FAIL lines above before running the pipeline."
    echo "============================================================"
    echo ""
  fi
  exit 1
fi

say "============================================================"
say "PREFLIGHT PASSED — $WARNINGS warning(s)"
say "============================================================"
say ""
exit 0
