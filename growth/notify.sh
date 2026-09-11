#!/usr/bin/env bash
#
# growth/notify.sh — run-status notifier.
# ------------------------------------------------------------------
# Called at the end of every run (success OR failure) and by die_loud()
# on any preflight halt, so a failure is never silent.
#
# Usage:
#   notify.sh STATUS RUN_TYPE DATE [URL_OR_PATH] [DETAIL]
#     STATUS    : success | failure | warning | blocked
#     RUN_TYPE  : short | thumbnail | render | watchdog | pipeline
#     DATE      : YYYY-MM-DD
#     URL_OR_PATH : optional artifact path or URL
#     DETAIL    : optional one-line detail
#
# Channels, in order of reliability:
#   1. growth/state/status.md     — always written, newest row on top
#   2. GROWTH_ALERT_WEBHOOK       — Slack/Discord/ntfy-style POST. THE
#                                   ONE THAT ACTUALLY REACHES A HUMAN.
#   3. GROWTH_ALERT_EMAIL         — via `mail`, if present
#   4. macOS notification         — best-effort, cosmetic only
#
# ------------------------------------------------------------------
# WHY CHANNEL 2 EXISTS
# ------------------------------------------------------------------
# The medAI pipeline had channels 1 and 4 only, and that is exactly why
# it rotted for six weeks. Its notify.sh faithfully appended
# "❌ failure" to medai-status.md on every one of 44 dead runs, and
# faithfully called osascript each time. But:
#
#   - osascript notifications raised from a launchd agent with no
#     Aqua session are discarded without error, and
#   - a status markdown file is a pull channel: it only informs someone
#     who already suspects a problem and goes looking.
#
# The result was a pipeline that was loudly reporting its own death into
# a void. A push channel that leaves the machine is the only kind that
# closes that loop, so this script warns when none is configured rather
# than pretending the status file is a notification.
# ------------------------------------------------------------------

set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/common.sh"

STATUS="${1:?STATUS required (success|failure|warning|blocked)}"
RUN_TYPE="${2:?RUN_TYPE required}"
NOTIFY_DATE="${3:?DATE required}"
URL="${4:-}"
DETAIL="${5:-}"

TS="$(date '+%Y-%m-%d %H:%M:%S')"

case "$STATUS" in
  success) ICON="[OK]"      ;;
  warning) ICON="[WARN]"    ;;
  blocked) ICON="[BLOCKED]" ;;
  failure) ICON="[FAIL]"    ;;
  *)       ICON="[INFO]"    ;;
esac

TITLE="SHaiPT growth · ${RUN_TYPE} · ${NOTIFY_DATE} ${ICON}"
BODY_PARTS=()
[[ -n "$URL"    ]] && BODY_PARTS+=("$URL")
[[ -n "$DETAIL" ]] && BODY_PARTS+=("$DETAIL")
BODY="${BODY_PARTS[*]:-(no detail)}"

# ---- 1. Status file (always) -------------------------------------
if [[ ! -f "$STATUS_FILE" ]]; then
  cat > "$STATUS_FILE" <<'EOF'
# SHaiPT Growth — Pipeline Status

Auto-written by `growth/notify.sh` at the end of every run. Newest row
on top.

A `[FAIL]` or `[BLOCKED]` row means nothing shipped for that slot.

**This file is a record, not an alert.** Set `GROWTH_ALERT_WEBHOOK` in
`growth/.env` so failures actually reach you — and run
`growth/watchdog.sh` on a schedule so a *silent* pipeline (one that
stops running at all) is caught too.

| Timestamp | Type | Status | Artifact | Detail |
|-----------|------|--------|----------|--------|
EOF
fi

# Escape pipes so a detail string can't break the table.
esc() { printf '%s' "${1:-—}" | sed 's/|/\\|/g'; }
LINE="| ${TS} | ${RUN_TYPE} | ${ICON} ${STATUS} | $(esc "$URL") | $(esc "$DETAIL") |"

TMP="$(mktemp)"
awk -v line="$LINE" '
  /^\|-----------/ { print; print line; inserted = 1; next }
  { print }
  END { if (!inserted) print line }
' "$STATUS_FILE" > "$TMP" && mv "$TMP" "$STATUS_FILE"

# Machine-readable last-run record, used by watchdog.sh to detect a
# pipeline that has gone quiet.
jq -n \
  --arg ts "$TS" --arg status "$STATUS" --arg type "$RUN_TYPE" \
  --arg date "$NOTIFY_DATE" --arg url "$URL" --arg detail "$DETAIL" \
  '{timestamp:$ts, status:$status, run_type:$type, date:$date, artifact:$url, detail:$detail}' \
  > "$STATE_DIR/last-run-${RUN_TYPE}.json" 2>/dev/null || true

if [[ "$STATUS" == "success" ]]; then
  jq -n --arg ts "$TS" --arg type "$RUN_TYPE" --arg url "$URL" \
    '{timestamp:$ts, run_type:$type, artifact:$url}' \
    > "$STATE_DIR/last-success-${RUN_TYPE}.json" 2>/dev/null || true
fi

# ---- 2. Webhook (the channel that leaves the machine) ------------
# Accepts a Slack incoming-webhook, a Discord webhook, or any endpoint
# that takes JSON. We send BOTH `text` and `content` keys so Slack and
# Discord each find the one they want without per-service config.
if [[ -n "${GROWTH_ALERT_WEBHOOK:-}" ]]; then
  PAYLOAD="$(jq -n --arg t "$TITLE"$'\n'"$BODY" '{text:$t, content:$t}')"
  # Never let a webhook outage fail the caller — but DO record it, so a
  # broken alert channel is itself visible in the log.
  if ! curl -sS --fail-with-body \
        --connect-timeout 10 --max-time 20 --retry 2 --retry-delay 3 \
        -H 'Content-Type: application/json' \
        -d "$PAYLOAD" "$GROWTH_ALERT_WEBHOOK" >/dev/null 2>&1; then
    log "WARN: alert webhook POST failed — the alert channel itself is down"
  fi
elif [[ "$STATUS" == "failure" || "$STATUS" == "blocked" ]]; then
  # Do not let this go by quietly: a failure with no push channel is the
  # medAI failure mode reproducing itself.
  log "WARN: $STATUS recorded but GROWTH_ALERT_WEBHOOK is unset — this alert reached nobody."
fi

# ---- 3. Email (optional) -----------------------------------------
if [[ -n "${GROWTH_ALERT_EMAIL:-}" ]] && command -v mail >/dev/null 2>&1; then
  printf '%s\n' "$BODY" | mail -s "$TITLE" "$GROWTH_ALERT_EMAIL" 2>/dev/null || true
fi

# ---- 4. macOS notification (cosmetic; unreliable under launchd) ---
if command -v osascript >/dev/null 2>&1; then
  osascript -e "display notification \"${BODY//\"/\\\"}\" with title \"${TITLE//\"/\\\"}\"" \
    >/dev/null 2>&1 || true
fi

log "notify: $STATUS $RUN_TYPE $NOTIFY_DATE ${DETAIL:+— $DETAIL}"
