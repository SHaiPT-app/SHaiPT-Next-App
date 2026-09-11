#!/usr/bin/env bash
#
# growth/lib/common.sh
# ------------------------------------------------------------------
# Shared plumbing for every script in growth/. Source it, never run it:
#
#   source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"
#
# Provides:
#   GROWTH_DIR / OUT_DIR / STATE_DIR / LOG_FILE  — canonical paths
#   DATE_TAG / SLUG_FOR                          — naming
#   log / warn / fail / die_loud                 — logging
#   resolve_claude                               — ABSOLUTE path to the
#                                                  claude binary, verified
#                                                  to actually execute
#   need_bin / need_file / need_env              — defensive checks
#   section                                      — markdown "### X" extractor
#   json_escape / slugify                        — small helpers
#
# WHY THE CLAUDE RESOLVER EXISTS (read this before "simplifying" it):
# The medAI Times pipeline this was ported from died on 2026-07-29 and
# kept "running" — and failing — twice a day until 2026-09-11. Every
# single run failed with:
#
#     daily-ai-medical-run.sh: line 127: claude: command not found
#     rc=127
#
# The scripts called the bare word `claude` and relied on
# `export PATH=...:/opt/homebrew/bin:...` to find it. Under launchd the
# login shell's rc files never run, so whatever PATH entry actually held
# the binary (a node/pnpm/bun global bin, or ~/.claude) was absent. Worse:
# on this machine `claude` is currently not an executable anywhere at all
# — ~/.claude/downloads/claude-2.1.42-darwin-arm64 exists but is mode 644,
# so even a PATH fix would not have helped.
#
# So: we resolve an ABSOLUTE path, we verify it RUNS (not merely that the
# file exists — that is what catches the mode-644 case), and we fail loudly
# and early with instructions instead of burning three retries and a
# backoff on a binary that was never going to appear.
# ------------------------------------------------------------------

# Guard against double-sourcing.
[[ -n "${_GROWTH_COMMON_SOURCED:-}" ]] && return 0
_GROWTH_COMMON_SOURCED=1

set -euo pipefail

# ---- Canonical paths --------------------------------------------
# Resolve growth/ from this file's own location so the scripts work no
# matter what the caller's cwd is (launchd gives you "/", cron gives you
# $HOME, a human gives you anything).
GROWTH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export GROWTH_DIR
REPO_DIR="$(cd "$GROWTH_DIR/.." && pwd)"
export REPO_DIR

PROMPTS_DIR="$GROWTH_DIR/prompts"
OUT_DIR="$GROWTH_DIR/out"
STATE_DIR="$GROWTH_DIR/state"
ASSETS_DIR="$GROWTH_DIR/assets"
LOGS_DIR="$GROWTH_DIR/logs"
LOG_FILE="${GROWTH_LOG_FILE:-$LOGS_DIR/pipeline.log}"
STATUS_FILE="$STATE_DIR/status.md"
ASSET_REGISTRY="$ASSETS_DIR/registry.json"
export PROMPTS_DIR OUT_DIR STATE_DIR ASSETS_DIR LOGS_DIR LOG_FILE STATUS_FILE ASSET_REGISTRY

mkdir -p "$OUT_DIR" "$STATE_DIR" "$LOGS_DIR"

# ---- PATH -------------------------------------------------------
# A generous PATH so ffmpeg/jq/magick resolve under launchd too. Note
# this is a convenience for the *supporting* tools only; the claude
# binary is resolved by absolute path precisely because PATH cannot be
# trusted here (see the header).
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

# ---- Config -----------------------------------------------------
# growth/.env holds secrets and is gitignored by the repo's `.env*`
# rule. growth/env.example is the committed template.
GROWTH_ENV="${GROWTH_ENV_FILE:-$GROWTH_DIR/.env}"
if [[ -f "$GROWTH_ENV" ]]; then
  # `set -a` exports everything the file defines; `set +a` restores.
  set -a
  # shellcheck disable=SC1090
  source "$GROWTH_ENV"
  set +a
fi

# ---- Naming -----------------------------------------------------
# Every artifact for a given piece of content shares one DATE_TAG so a
# half-finished run is trivially greppable and resumable.
DATE_TAG="${GROWTH_DATE:-$(date +%Y-%m-%d)}"
export DATE_TAG

# ---- Logging ----------------------------------------------------
# Everything goes to stderr AND the log file. stdout is reserved for a
# script's machine-readable result (a path, usually) so scripts compose.
_LOG_PREFIX="${GROWTH_LOG_PREFIX:-GROWTH}"

log() {
  local line="[$(date '+%Y-%m-%d %H:%M:%S')] [$_LOG_PREFIX] $*"
  echo "$line" >&2
  echo "$line" >> "$LOG_FILE" 2>/dev/null || true
}

warn() { log "WARN: $*"; }

fail() { log "ERROR: $*"; exit 1; }

# die_loud: for preflight failures that must be impossible to miss.
# Prints a boxed banner to stderr, logs it, and fires a notification
# through the real out-of-band channel if one is configured.
#
# This is the direct answer to the medAI failure mode. There, the run
# *did* append a "❌ failure" row to a markdown file and *did* call
# osascript — but osascript notifications from a launchd agent with no
# GUI session are silently discarded, and nobody opens a status file
# they are not prompted to open. 44 consecutive failures went unnoticed.
die_loud() {
  local headline="$1"; shift
  local detail="${*:-}"
  {
    echo ""
    echo "  ============================================================"
    echo "  GROWTH PIPELINE HALTED"
    echo "  ------------------------------------------------------------"
    echo "  $headline"
    [[ -n "$detail" ]] && echo "$detail" | sed 's/^/  /'
    echo "  ============================================================"
    echo ""
  } >&2
  log "HALT: $headline ${detail//$'\n'/ }"
  # Best-effort out-of-band alert; never let the notifier's failure mask
  # the original error.
  if [[ -x "$GROWTH_DIR/notify.sh" ]]; then
    "$GROWTH_DIR/notify.sh" failure "${GROWTH_RUN_TYPE:-pipeline}" "$DATE_TAG" "" "$headline" || true
  fi
  exit 1
}

# ---- Defensive checks -------------------------------------------
need_bin() {
  # need_bin <binary> [install hint]
  command -v "$1" >/dev/null 2>&1 \
    || die_loud "Required binary not found: $1" "${2:+Install it with: $2}"
}

need_file() {
  # need_file <path> [what it is]
  [[ -f "$1" ]] || die_loud "Required file missing: $1" "${2:-}"
}

need_env() {
  # need_env <VAR> [where to get it]
  local name="$1"
  [[ -n "${!name:-}" ]] \
    || die_loud "Required environment variable not set: $name" \
                "Add it to $GROWTH_DIR/.env (template: $GROWTH_DIR/env.example)${2:+ — $2}"
}

# ---- The claude resolver ----------------------------------------
# Echoes an absolute, verified-executable path to the Claude Code CLI.
# Returns non-zero (and echoes nothing) if it cannot find a working one,
# so callers can decide between "fail hard" and "degrade".
#
# Order of preference:
#   1. $GROWTH_CLAUDE_BIN     — explicit override, always wins
#   2. Well-known install locations, absolute
#   3. Newest versioned binary in ~/.claude/downloads
#   4. Whatever `command -v claude` finds (PATH), last because PATH is
#      exactly what cannot be trusted under a scheduler
#
# A candidate only counts if `<bin> --version` exits 0. Existence is not
# enough: the binary sitting in ~/.claude/downloads on this machine is
# mode 644 and would pass an `-e`/`-f` test while failing every run.
resolve_claude() {
  if [[ -n "${_GROWTH_CLAUDE_RESOLVED:-}" ]]; then
    echo "$_GROWTH_CLAUDE_RESOLVED"
    return 0
  fi

  local candidates=()
  [[ -n "${GROWTH_CLAUDE_BIN:-}" ]] && candidates+=("$GROWTH_CLAUDE_BIN")
  candidates+=(
    "$HOME/.local/bin/claude"
    "/opt/homebrew/bin/claude"
    "/usr/local/bin/claude"
    "$HOME/.claude/local/claude"
    "$HOME/Library/pnpm/claude"
    "$HOME/.bun/bin/claude"
    "$HOME/.npm-global/bin/claude"
    "$HOME/.volta/bin/claude"
    "$HOME/.nvm/versions/node/current/bin/claude"
  )

  # Versioned downloads, newest first.
  local dl
  while IFS= read -r dl; do
    [[ -n "$dl" ]] && candidates+=("$dl")
  done < <(ls -1t "$HOME/.claude/downloads/"claude-*-darwin-* 2>/dev/null || true)

  # PATH lookup last.
  local from_path
  from_path="$(command -v claude 2>/dev/null || true)"
  [[ -n "$from_path" ]] && candidates+=("$from_path")

  local c
  for c in "${candidates[@]}"; do
    [[ -n "$c" && -f "$c" && -x "$c" ]] || continue
    # The load-bearing check: does it actually RUN?
    if "$c" --version >/dev/null 2>&1; then
      _GROWTH_CLAUDE_RESOLVED="$c"
      export _GROWTH_CLAUDE_RESOLVED
      echo "$c"
      return 0
    fi
  done
  return 1
}

# require_claude: resolve or halt with a genuinely actionable message.
require_claude() {
  local bin
  if bin="$(resolve_claude)"; then
    echo "$bin"
    return 0
  fi

  # Build a diagnostic that says what we looked at and what to do. The
  # medAI version said only "claude: command not found", which is why it
  # was misdiagnosed as a PATH problem for weeks when the binary was in
  # fact not installed.
  local diag=""
  local probe="$HOME/.claude/downloads"
  if compgen -G "$probe/claude-*" >/dev/null 2>&1; then
    diag+=$'\n'"Found un-runnable candidate(s) in $probe:"
    local f
    for f in "$probe"/claude-*; do
      diag+=$'\n'"  $(ls -l "$f" | awk '{print $1, $NF}')"
    done
    diag+=$'\n'"If one of those is the CLI, make it executable and point at it:"
    diag+=$'\n'"  chmod +x <path>"
    diag+=$'\n'"  echo 'GROWTH_CLAUDE_BIN=<path>' >> $GROWTH_DIR/.env"
  fi

  die_loud "Claude Code CLI not found (or found but not executable)." \
"The pipeline cannot generate a script without it.

Searched, in order:
  \$GROWTH_CLAUDE_BIN, ~/.local/bin, /opt/homebrew/bin, /usr/local/bin,
  ~/.claude/local, ~/Library/pnpm, ~/.bun/bin, ~/.npm-global/bin,
  ~/.volta/bin, ~/.claude/downloads/claude-*, then \$PATH.
$diag

Fix, whichever applies:
  1. Install the CLI:      npm i -g @anthropic-ai/claude-code
  2. Then pin it here:     echo \"GROWTH_CLAUDE_BIN=\$(command -v claude)\" >> $GROWTH_DIR/.env
  3. Verify:               $GROWTH_DIR/preflight.sh

Never rely on PATH alone for a scheduled run — that is precisely how the
medAI Times pipeline failed 44 consecutive times without anyone noticing."
}

# ---- Markdown helpers -------------------------------------------
# section <file> <header>
# Prints the body under a "### <header>" heading, up to the next "###".
# Strips leading markdown decoration and blank-line runs. Header match is
# prefix-based so "### Hook (≈3 seconds)" is found by "Hook".
section() {
  local file="$1" hdr="$2"
  awk -v hdr="$hdr" '
    BEGIN { flag = 0 }
    /^### / {
      if (flag) exit
      # Match "### <hdr>" optionally followed by space/paren/colon.
      if ($0 ~ "^### " hdr "([[:space:](:].*)?$") { flag = 1; next }
    }
    flag { print }
  ' "$file" | sed -E 's/^[[:space:]>*_-]+//' | sed '/^$/N;/^\n$/D'
}

# section_first <file> <header> — just the first non-empty line.
section_first() {
  section "$1" "$2" | awk 'NF { print; exit }'
}

# ---- Font resolution --------------------------------------------
# Echoes an absolute path to a heavy display font file that ImageMagick
# can actually load. Returns non-zero if none works.
#
# WHY A PATH AND NOT A NAME: Homebrew's ImageMagick is built with
# freetype but WITHOUT fontconfig, so `-font Avenir-Next-Bold` fails with
# "unable to read font" and `magick -list font` is empty. Only a literal
# file path works. Every caption, stamp, headline and wordmark in this
# pipeline is drawn by ImageMagick, so getting this wrong silently loses
# all on-screen text — which on a Short is most of the design.
#
# Order favours condensed/heavy faces: on a 1080-wide vertical frame a
# condensed bold fits more headline at a legible size than a regular one.
resolve_font() {
  if [[ -n "${_GROWTH_FONT_RESOLVED:-}" ]]; then
    echo "$_GROWTH_FONT_RESOLVED"; return 0
  fi
  local candidates=()
  [[ -n "${GROWTH_FONT:-}" ]] && candidates+=("$GROWTH_FONT")
  candidates+=(
    "/System/Library/Fonts/Supplemental/DIN Condensed Bold.ttf"
    "/System/Library/Fonts/Supplemental/Arial Black.ttf"
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
    "/System/Library/Fonts/Supplemental/Impact.ttf"
    "/System/Library/Fonts/Supplemental/Tahoma Bold.ttf"
    "/System/Library/Fonts/Avenir Next.ttc"
    "/System/Library/Fonts/HelveticaNeue.ttc"
    "/System/Library/Fonts/Helvetica.ttc"
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
  )
  local f probe
  probe="$(mktemp -t growthfont).png"
  for f in "${candidates[@]}"; do
    [[ -f "$f" ]] || continue
    # Actually render with it — existence is not proof ImageMagick can
    # parse the face (a .ttc with an unusual face index can fail).
    if magick -background none -fill white -font "$f" -pointsize 40 \
         label:"Ag" "$probe" >/dev/null 2>&1 && [[ -s "$probe" ]]; then
      rm -f "$probe"
      _GROWTH_FONT_RESOLVED="$f"
      export _GROWTH_FONT_RESOLVED
      echo "$f"
      return 0
    fi
  done
  rm -f "$probe"
  return 1
}

# ---- Small helpers ----------------------------------------------
slugify() {
  echo "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//' \
    | cut -c1-60
}

# human_date YYYY-MM-DD -> "September 11, 2026" (BSD date, GNU fallback)
human_date() {
  date -j -f '%Y-%m-%d' "$1" '+%B %-d, %Y' 2>/dev/null \
    || date -d "$1" '+%B %-d, %Y' 2>/dev/null \
    || echo "$1"
}

# run_claude <prompt-text> <allowed-tools> [output-file]
# Thin wrapper so every call site gets the same absolute binary, the same
# flag ordering, and the same failure logging.
#
# NOTE ON FLAG ORDER (inherited from the medAI scripts, still true):
# --allowedTools MUST come AFTER the positional prompt. It is a variadic
# option, so commander.js greedily eats the prompt as another tool name
# when it comes first, and the CLI exits with "Input must be provided
# either through stdin or as a prompt argument".
run_claude() {
  local prompt="$1" tools="$2" outfile="${3:-}"
  local bin; bin="$(require_claude)"
  local rc=0
  if [[ -n "$outfile" ]]; then
    set +e
    "$bin" --print --permission-mode acceptEdits "$prompt" \
      --allowedTools "$tools" > "$outfile" 2>>"$LOG_FILE"
    rc=$?
    set -e
  else
    set +e
    "$bin" --print --permission-mode acceptEdits "$prompt" \
      --allowedTools "$tools" 2>>"$LOG_FILE"
    rc=$?
    set -e
  fi
  return $rc
}
