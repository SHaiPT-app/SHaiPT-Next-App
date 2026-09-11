#!/usr/bin/env bash
#
# growth/assets.sh — footage registry with usage-rights tagging.
# ------------------------------------------------------------------
# Every video asset the pipeline can put on screen must be registered
# here first, with an explicit usage tag. The renderer refuses to use an
# unregistered or untagged clip.
#
#   ./growth/assets.sh add <file> --usage ad-safe --subject "Ali" \
#                                 --release assets/releases/ali.pdf
#   ./growth/assets.sh add <file> --usage organic-only \
#                                 --subject "Ronnie Coleman" \
#                                 --source "https://instagram.com/p/..."
#   ./growth/assets.sh list [--usage ad-safe]
#   ./growth/assets.sh check <file>        # exit 0 if usable, 1 if not
#   ./growth/assets.sh audit               # registry health report
#
# ------------------------------------------------------------------
# THE TWO TAGS — this distinction is legal, not stylistic
# ------------------------------------------------------------------
# ad-safe       Usable in ORGANIC posts AND PAID ADS.
#               Only three things qualify:
#                 1. Ali's own footage
#                 2. A consenting friend WITH a signed release on file
#                 3. A fully AI-generated character (Higgsfield et al.)
#
# organic-only  Usable in organic posts ONLY. NEVER in a paid ad.
#               Chiefly: technique breakdowns of famous lifters'
#               publicly-posted lifts.
#
#               Commentary and criticism on an organic channel is one
#               thing. Putting a person's likeness behind ad spend is
#               a different thing: it implies endorsement, which is a
#               right-of-publicity exposure, and Meta/Google ad review
#               rejects unlicensed public-figure likenesses outright.
#               The tag is the enforcement point — there is no "just
#               this once" path through the renderer.
#
# A missing or unrecognised tag is treated as MORE restrictive than
# organic-only: unusable, full stop. Fail closed, never open.
# ------------------------------------------------------------------

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/common.sh"

GROWTH_LOG_PREFIX="ASSETS"
need_bin jq "brew install jq"

VALID_USAGE=("ad-safe" "organic-only")

usage() {
  sed -n '3,45p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

[[ $# -ge 1 ]] || usage 1
CMD="$1"; shift

# Registry is a JSON array. Create it empty on first use.
[[ -f "$ASSET_REGISTRY" ]] || echo '[]' > "$ASSET_REGISTRY"

# rel_path: store paths relative to growth/ so the registry survives the
# repo being moved or cloned elsewhere.
rel_path() {
  local p; p="$(cd "$(dirname "$1")" 2>/dev/null && pwd)/$(basename "$1")"
  echo "${p#"$GROWTH_DIR"/}"
}

case "$CMD" in

# ---- add ---------------------------------------------------------
add)
  FILE=""; USAGE=""; SUBJECT=""; RELEASE=""; SOURCE_URL=""; NOTES=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --usage)   USAGE="${2:?}";      shift 2 ;;
      --subject) SUBJECT="${2:?}";    shift 2 ;;
      --release) RELEASE="${2:?}";    shift 2 ;;
      --source)  SOURCE_URL="${2:?}"; shift 2 ;;
      --notes)   NOTES="${2:?}";      shift 2 ;;
      -h|--help) usage 0 ;;
      -*)        fail "unknown flag: $1" ;;
      *)         FILE="$1";           shift   ;;
    esac
  done

  [[ -n "$FILE" ]]   || fail "no file given"
  [[ -f "$FILE" ]]   || fail "file not found: $FILE"
  [[ -n "$USAGE" ]]  || fail "--usage is required (ad-safe | organic-only)"
  [[ " ${VALID_USAGE[*]} " == *" $USAGE "* ]] \
    || fail "invalid --usage '$USAGE' (expected: ${VALID_USAGE[*]})"
  [[ -n "$SUBJECT" ]] || fail "--subject is required (who is on screen)"

  # The ad-safe gate. Claiming ad-safe for a third party without a
  # release on disk is the single most expensive mistake available here,
  # so it is refused rather than warned about.
  if [[ "$USAGE" == "ad-safe" ]]; then
    if [[ -n "$RELEASE" ]]; then
      [[ -f "$RELEASE" ]] || fail "release file not found: $RELEASE"
    else
      # Self-shot and AI-character footage needs no third-party release,
      # but the claim must be made explicitly rather than by omission.
      case "$(echo "$SUBJECT" | tr '[:upper:]' '[:lower:]')" in
        ali|ali\ *|self|*ai\ character*|*higgsfield*|synthetic*) ;;
        *) fail "ad-safe requires --release <signed release file> for subject '$SUBJECT'
   Only Ali's own footage or an AI character may be ad-safe without one.
   If there is no signed release, register this as --usage organic-only." ;;
      esac
    fi
  fi

  REL="$(rel_path "$FILE")"
  jq -e --arg p "$REL" 'any(.[]; .path == $p)' "$ASSET_REGISTRY" >/dev/null 2>&1 \
    && fail "already registered: $REL (edit $ASSET_REGISTRY by hand to change it)"

  # Probe real media properties so the renderer can pick clips without
  # re-probing, and so a non-video file is caught at registration time.
  DUR=""; WIDTH=""; HEIGHT=""
  if command -v ffprobe >/dev/null 2>&1; then
    DUR="$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$FILE" 2>/dev/null || true)"
    read -r WIDTH HEIGHT < <(ffprobe -v error -select_streams v:0 \
      -show_entries stream=width,height -of csv=s=' ':p=0 "$FILE" 2>/dev/null || echo " ")
  fi
  [[ -n "${DUR:-}" ]] || warn "could not probe duration for $REL (not a video?)"

  TMP="$(mktemp)"
  jq --arg path "$REL" \
     --arg usage "$USAGE" \
     --arg subject "$SUBJECT" \
     --arg release "$RELEASE" \
     --arg source "$SOURCE_URL" \
     --arg notes "$NOTES" \
     --arg added "$(date '+%Y-%m-%d')" \
     --arg dur "${DUR:-}" \
     --arg w "${WIDTH:-}" --arg h "${HEIGHT:-}" \
     '. + [{
        path: $path, usage: $usage, subject: $subject,
        release: (if $release == "" then null else $release end),
        source_url: (if $source == "" then null else $source end),
        notes: (if $notes == "" then null else $notes end),
        duration_s: (if $dur == "" then null else ($dur | tonumber) end),
        width: (if $w == "" then null else ($w | tonumber) end),
        height: (if $h == "" then null else ($h | tonumber) end),
        added: $added
      }]' "$ASSET_REGISTRY" > "$TMP" && mv "$TMP" "$ASSET_REGISTRY"

  log "registered [$USAGE] $REL (subject: $SUBJECT)"
  echo "$REL"
  ;;

# ---- list --------------------------------------------------------
list)
  FILTER=""
  [[ "${1:-}" == "--usage" ]] && FILTER="${2:?}"
  if [[ -n "$FILTER" ]]; then
    jq -r --arg u "$FILTER" \
      '.[] | select(.usage == $u)
       | "\(.usage)\t\(.subject)\t\(.path)"' "$ASSET_REGISTRY"
  else
    jq -r '.[] | "\(.usage)\t\(.subject)\t\(.path)"' "$ASSET_REGISTRY"
  fi | column -t -s $'\t'
  ;;

# ---- check -------------------------------------------------------
# Used by the renderer. Prints the usage tag on stdout and exits 0 when
# the clip is registered and validly tagged; exits 1 otherwise.
check)
  FILE="${1:?usage: assets.sh check <file>}"
  REL="$(rel_path "$FILE")"
  FOUND="$(jq -r --arg p "$REL" \
    '(.[] | select(.path == $p) | .usage) // empty' "$ASSET_REGISTRY" 2>/dev/null || true)"
  if [[ -z "$FOUND" ]]; then
    log "UNREGISTERED asset: $REL — register it with ./growth/assets.sh add"
    exit 1
  fi
  if [[ " ${VALID_USAGE[*]} " != *" $FOUND "* ]]; then
    # Fail closed on a garbage tag rather than guessing intent.
    log "asset $REL has invalid usage tag '$FOUND' — treating as unusable"
    exit 1
  fi
  echo "$FOUND"
  ;;

# ---- audit -------------------------------------------------------
audit)
  echo ""
  echo "Asset registry audit — $ASSET_REGISTRY"
  echo ""
  TOTAL="$(jq 'length' "$ASSET_REGISTRY")"
  AD="$(jq '[.[] | select(.usage == "ad-safe")] | length' "$ASSET_REGISTRY")"
  ORG="$(jq '[.[] | select(.usage == "organic-only")] | length' "$ASSET_REGISTRY")"
  BAD="$(jq --argjson v '["ad-safe","organic-only"]' \
          '[.[] | select(.usage as $u | $v | index($u) | not)] | length' "$ASSET_REGISTRY")"
  echo "  total:        $TOTAL"
  echo "  ad-safe:      $AD"
  echo "  organic-only: $ORG"
  echo "  invalid tag:  $BAD"
  echo ""

  # Missing files: registry entries whose clip has been moved or deleted.
  MISSING=0
  while IFS= read -r p; do
    [[ -z "$p" ]] && continue
    if [[ ! -f "$GROWTH_DIR/$p" ]]; then
      echo "  MISSING FILE: $p"
      MISSING=$((MISSING + 1))
    fi
  done < <(jq -r '.[].path' "$ASSET_REGISTRY")

  # ad-safe entries claiming a release whose file is gone. This is the
  # audit that matters before any ad spend.
  while IFS=$'\t' read -r p r; do
    [[ -z "$r" || "$r" == "null" ]] && continue
    if [[ ! -f "$GROWTH_DIR/$r" && ! -f "$r" ]]; then
      echo "  BROKEN RELEASE: $p -> $r"
      MISSING=$((MISSING + 1))
    fi
  done < <(jq -r '.[] | select(.usage == "ad-safe") | [.path, (.release // "")] | @tsv' "$ASSET_REGISTRY")

  echo ""
  if [[ "$BAD" -gt 0 || "$MISSING" -gt 0 ]]; then
    echo "  AUDIT FAILED — fix the entries above before using these assets."
    echo ""
    exit 1
  fi
  echo "  Audit clean."
  echo ""
  ;;

-h|--help|help) usage 0 ;;
*) echo "unknown command: $CMD" >&2; usage 1 ;;
esac
