# SHaiPT growth — the 4Dcoach Shorts pipeline

Scripts and prompts for producing **2–3 Shorts a week** about 4Dcoach: film
one set on a phone, get back a 4D replay you can walk around, with reps,
tempo and a technique score.

This is a port of the medAI Times pipeline (`~/KK/ai-ml-briefings`), rebuilt
around a different channel and — more importantly — around the reason that
channel failed. Read [Deliberately dropped](#deliberately-dropped) before
you add anything back.

It touches no app code and adds no `package.json` dependencies.

**Nothing here uploads, posts, or schedules anything.** The pipeline ends
with a rendered file and a metadata sheet on disk. You publish.

---

## The two things that matter

**1. The hook is the gate, not the cadence.** medAI Times published 5–7×/week
for four months and finished under 500 subscribers. Volume was the strategy
and it lost. Here the generator writes three candidate hooks, scores them
against a rubric, and can return **NO-GO** — which exits 0, because a week
that publishes nothing is a working week, not a failed one. Then a human
approves before a single frame renders.

**2. Failure is loud.** The medAI pipeline died on 2026-07-29 and kept
failing twice a day until 2026-09-11 — 44 consecutive runs, every one
`claude: command not found`, rc=127 — with nobody told. See
[The silent death](#the-silent-death).

---

## Quick start

```bash
cp growth/env.example growth/.env     # then fill in OPENAI_API_KEY
./growth/preflight.sh                 # fix every FAIL line before continuing

# register footage before anything can use it
./growth/assets.sh add growth/assets/footage/squat-01.mov \
    --usage ad-safe --subject "Ali"

./growth/run-short.sh                 # generate + score, then STOP
./growth/review-short.sh 2026-09-14   # read it, approve or decline
./growth/run-short.sh --build 2026-09-14   # voiceover, beats, render, thumb, metadata
```

Then publish by hand from `growth/out/metadata-DATE.txt`, which carries the
checklist.

---

## The scripts

Run everything from the repo root.

### Pipeline

| Script | What it does |
|---|---|
| `preflight.sh` | Fail-fast environment check. Resolves the `claude` binary by absolute path and **verifies it runs**; checks ffmpeg/jq/magick, keys, prompts, fonts, the alert channel and the asset registry. Every pipeline script calls it. Run it by hand after any machine change. |
| `run-short.sh` | Orchestrator, in two halves. No flag runs both — the human approval between them is the point. |
| `new-short.sh` | **Stage 1.** Claude writes three candidate hooks, scores them against `prompts/hook-rubric.md`, and either writes the full Short or returns NO-GO. Renders nothing. Also runs mechanical content-rule checks (usage tag present, synthetic-testimonial language). |
| `review-short.sh` | **The human gate.** Prints the scoring, script, beats and asset plan; runs the hard content-rule checks; asks for an explicit `approve`. No `--yes` flag, and it declines automatically when stdin is not a terminal. |
| `make-voiceover.sh` | OpenAI TTS → `voice-DATE.m4a`; Whisper word timings → caption chunks (`.json`) and a libass subtitle file (`.ass`). |
| `make-beats.sh` | Generates images for `GENERATED`/`CHARACTER` beats only. `FOOTAGE:`/`REPLAY` beats are real media you supply. Non-fatal: a missing cutaway never costs you the Short. |
| `render-short.sh` | Assembles 1080×1920 H.264/AAC with ffmpeg in five staged passes: segments → concat → hook title card → captions → audio mux. Also exports a clean poster frame for the thumbnail. |
| `make-thumbnail.sh` | 1080×1920 JPEG under YouTube's 2 MB limit. Prefers the clean poster frame, then a beat image, then a generated scene, then a branded gradient. |
| `make-metadata.sh` | YouTube + Instagram copy, plus the usage banner and the manual publish checklist. Writes `.txt` (paste) and `.json` (later automation). |

### Operations

| Script | What it does |
|---|---|
| `assets.sh` | The footage registry. `add` / `list` / `check` / `audit`. Enforces `ad-safe` vs `organic-only` — see below. |
| `notify.sh` | Run-status notifier: status file, **webhook**, optional email, macOS notification. |
| `watchdog.sh` | **Deadman switch.** Alerts when nothing has shipped inside the staleness window (default 10 days). The single most important script here — see below. |
| `lib/common.sh` | Shared plumbing: paths, logging, the claude resolver, the font resolver, markdown section extraction. Source it, never run it. |

### Prompts

| File | What it is |
|---|---|
| `prompts/short-script-prompt.md` | The generator. Replaces medAI's `shorts-prompt.md`. |
| `prompts/hook-rubric.md` | Five dimensions, 0–4 each. 16+ GO, 13–15 BORDERLINE, ≤12 NO-GO. A 0 on visual proof is NO-GO regardless of total. |
| `prompts/content-rules.md` | The bright lines: asset tagging, the AI-character testimonial ban, subject-matter accuracy, no invented numbers. Injected into every generation prompt. **Upstream of `ads/policy-limits.md`** — if they disagree, this one wins. |
| `prompts/beats-prompt.md` | Turns approved beats into image prompts for generated cutaways only. |

Sibling folders `ads/` and `channel/` are separate work (paid acquisition and
channel branding) and are not driven by these scripts.

---

## The silent death

The medAI pipeline's LaunchAgents fired on schedule for six weeks after it
stopped working. Every run:

```
daily-ai-medical-run.sh: line 127: claude: command not found
Stage 1 attempt 1 failed (claude rc=127) ... sleeping 60s
Stage 1 attempt 2 failed (claude rc=127) ... sleeping 120s
Stage 1 attempt 3 failed (claude rc=127)
```

It called the bare word `claude` and trusted `export PATH=...` to find it.
Under launchd the login shell's rc files never run, so the PATH entry holding
the binary was absent. On this machine the binary is not runnable *anywhere*:
`~/.claude/downloads/claude-2.1.42-darwin-arm64` exists at mode 644.

It was not silent for lack of reporting. `notify.sh` faithfully wrote
`❌ failure` to `medai-status.md` 44 times and called `osascript` 44 times.
But osascript notifications from a launchd agent with no GUI session are
discarded, and a status file is a pull channel — it only informs someone who
already suspects a problem.

**Four fixes, all in this port:**

1. **Absolute-path resolution with an execution test.** `resolve_claude()`
   searches nine known locations plus `~/.claude/downloads/claude-*`, and a
   candidate only counts if `--version` exits 0. Existence is not enough —
   that is exactly what the mode-644 binary would have passed.
2. **Preflight before any work.** Failures surface in under a second with an
   actionable message, not three retries and three minutes of backoff deep.
   A retry loop can no longer mask a configuration error.
3. **A push alert channel.** `GROWTH_ALERT_WEBHOOK` sends failures off the
   machine. When it is unset, `notify.sh` logs *"this alert reached nobody"*
   rather than pretending the status file counts.
4. **A watchdog.** Per-run notifications only catch runs that happen. They
   cannot catch a scheduler that was never loaded, a laptop that was asleep,
   or a habit that quietly stopped. `watchdog.sh` speaks up when **nothing**
   has happened. Run it on a schedule independent of the content schedule.

---

## Content and ads separation

Every clip is registered with exactly one tag, and the renderer refuses
unregistered footage.

| Tag | What qualifies | Where it may run |
|---|---|---|
| `ad-safe` | Ali's own footage; a consenting friend **with a signed release on file**; a fully AI-generated character | Organic **and** paid |
| `organic-only` | Famous lifters' publicly-posted lifts; anything with a bystander, gym logo or third-party music | Organic **only** |

**A video inherits the most restrictive tag of any asset in it.** Claiming
`ad-safe` for a third party without a release file is refused at registration,
not warned about. `review-short.sh` blocks approval if an `organic-only` clip
appears in a Short claiming `ad-safe`, and the usage banner is the first thing
in the metadata sheet.

Breakdowns of famous lifters are fine on the organic channel — that is
commentary. The same clip behind ad spend implies endorsement: a
right-of-publicity exposure, and Meta and Google reject unlicensed
public-figure likenesses on sight.

**AI characters are presenters, never customers.** They may host, demo and
narrate. They may never give a testimonial, report a result, or be framed as
a real user. A testimonial from a person who does not exist is a fabricated
endorsement under the FTC's Rule on Consumer Reviews and Testimonials
(16 CFR Part 465, in force since October 2024). `new-short.sh` flags
first-person results language when the presenter is an AI character, and
`review-short.sh` blocks on it. Any AI-presenter Short sets
`AI presenter: yes`, and the metadata sheet adds the YouTube and Meta
synthetic-content disclosure steps.

---

## What you must do by hand

Deliberately manual. None of it is a gap to be automated later without a
decision.

- **Approve every Short.** `review-short.sh`. There is no bypass flag.
- **Shoot the footage.** Real lifts are the hero asset. Register each clip
  with `assets.sh add` before a script can plan around it.
- **Capture the 4Dcoach replays.** A `REPLAY` beat expects a screen recording
  at `out/beats-DATE/replay-NN.mp4`. `make-beats.sh` tells you which are
  missing; it cannot record them.
- **Collect signed releases** before registering anyone else's footage as
  `ad-safe`. Keep the file; `assets.sh audit` checks it still exists.
- **Publish.** Upload, set the thumbnail, tick the disclosures, pin the
  comment. The checklist is in `metadata-DATE.txt`.
- **Wire the schedule yourself.** No LaunchAgent, cron job or scheduler is
  installed. If you add one: pin `GROWTH_CLAUDE_BIN`, set
  `GROWTH_ALERT_WEBHOOK`, and schedule `watchdog.sh` separately from the
  content job.

---

## What you must supply

| Thing | Why | Status on this machine |
|---|---|---|
| **Claude Code CLI** | Script generation | **Missing.** Not runnable anywhere; `~/.claude/downloads/claude-2.1.42-darwin-arm64` is mode 644. `npm i -g @anthropic-ai/claude-code`, then pin `GROWTH_CLAUDE_BIN`. |
| **`OPENAI_API_KEY`** | TTS, Whisper captions, b-roll images | Not set in `growth/.env`. |
| **`GROWTH_ALERT_WEBHOOK`** | The only channel that leaves the machine | Not set. Optional for hand-run work, **required before scheduling**. |
| **Lifting footage** | The hero asset | `assets/footage/` is empty. |
| **4Dcoach replay captures** | The payoff shot | Per-Short, as the beat list asks. |
| **Signed releases** | `ad-safe` for anyone but Ali | Only if you register third-party footage as ad-safe. |
| `ffmpeg`, `jq`, `magick` | Render, parse, typeset | All present. |

Per-Short API cost is roughly **$0.30–0.60** (TTS + Whisper + up to 8 images
at `quality=medium`). At 2–3 Shorts a week that is a few dollars a month.

---

## Deliberately dropped

Each of these was in the medAI pipeline and is **not** here. The reasons are
the port, not oversights.

| Dropped | Why |
|---|---|
| **Automatic YouTube upload** (`.youtube/`, `youtube-upload.py`, OAuth precheck, token refresh, upload receipts) | It is what let four months of unreviewed content ship ~6×/week. Publishing is now the human's move. The tooling still exists in `~/KK/ai-ml-briefings/` if you ever want it back — but add it *after* the hook gate has proven itself, and put it behind the approval record, not before. Dropping it also removed the entire OAuth-expiry failure class. |
| **LaunchAgents / any scheduler** | Out of scope by instruction, and a scheduler was load-bearing in the failure. Wire it by hand once preflight passes and the webhook is set. |
| **The daily cadence itself** | The core lesson. 2–3/week gated on hook quality replaces 5–7/week gated on nothing. |
| **Remotion renderer** | Needs a React project and its own `node_modules`; this port may not add dependencies. ffmpeg covers a real-footage channel and removes a peer-dependency conflict class from the app's React version. |
| **`align-segments.sh`** (GPT-4o aligning beats to transcript segments) | An API call and a failure mode to buy sync a 35-second Short does not need. Beats now split the duration evenly. |
| **NotebookLM podcast chain** (`briefing-to-podcast.sh`, `compose-podcast.sh`, `prerender-intro-outro.sh`, `audio-to-video.sh`) | Long-form audio for a news channel. This channel is short-form visual demonstration; a podcast of it would show nothing. |
| **Long-form briefing** (`briefing-prompt.md`, weekly wrap, evergreen mode) | News-cycle machinery with no analogue here. 4Dcoach is not a news beat. |
| **`fetch-source-images.sh` / screenshot capture** | Screenshotting a source article. There are no source articles; the source is footage. |
| **Competitor recon + channel health** (`competitor-recon-run.sh`, `channel-health-run.sh`, `channel-stats.py`) | Both need the YouTube Data API, which went with the upload tooling, and both are analytics for a channel with history. Worth porting once there is something to analyse. |
| **Comment-reply agent** | Same API dependency. At 2–3 Shorts a week the comment volume is answerable by hand, and early comments are the best audience research available — automating them away first would be a mistake. |
| **`make-thumbnail-split.sh`, `make-background.sh`, `make-avatar-intro.py`, clips tooling** | Long-form-specific or superseded. Channel branding lives in `channel/`. |

**Kept and re-tailored:** the defensive shell idiom (strict mode, staged
fallbacks, `log`/`fail`, non-fatal cosmetic steps), the markdown-section
contract between prompt and script, TTS + Whisper word-level captions,
beat-driven b-roll with the safety-filter retry, ImageMagick-composited text
over model-generated imagery, the thumbnail fallback ladder, and the
status-notification idea — rebuilt around a push channel and a watchdog.

---

## Troubleshooting

```bash
./growth/preflight.sh              # is the machine sane?
./growth/watchdog.sh               # has anything shipped lately?
./growth/assets.sh audit           # registry health, missing releases
tail -50 growth/logs/pipeline.log  # what the last run actually did
cat growth/state/status.md         # run history, newest first
```

**A render looks wrong.** `GROWTH_KEEP_TMP=1 ./growth/render-short.sh DATE`
keeps the staging directory; each pass leaves a playable intermediate
(`seg-*.mp4`, `base.mp4`, `titled.mp4`, `captioned.mp4`), so you can see
exactly which pass broke it.

**No text on screen.** Homebrew's ImageMagick is built without fontconfig, so
it resolves fonts by **absolute path only** — a font *name* fails. All text is
drawn by ImageMagick, so this loses captions, stamps, the title card and the
wordmark at once. `resolve_font()` handles it; override with `GROWTH_FONT`.

**Captions missing.** Homebrew's ffmpeg currently ships without libass *and*
without libfreetype, so `subtitles` and `drawtext` both fail. The renderer
falls back to compositing ImageMagick-rendered PNGs with `overlay`, which
always works. Preflight reports which path will be taken.
