# 30-second pitch — "One set. One phone."

For two jobs at once: the paid ad (Meta and YouTube, 9:16) and the thing you send to
anyone who asks what SHaiPT is (16:9, same timeline). One edit, two crops.

It is video 1 from `growth/channel/first-10-videos.md` with the cast and the app added,
because video 1 is the only video that has to exist and this is its trailer form.

**Status:** script and shot list final pending Ali. Production is blocked on one asset,
the same one that blocks the first Short: **a real bench press set through 4Dcoach**
(shot 1, 2 and 4 below). Everything else can be made now.

---

## The promise, in the words the waitlist page already uses

> Film one set. SHaiPT gives back a 4D replay you can walk around — reps, tempo and a
> technique score.

The ad and the destination must read as one thing. No claim below goes past that page.

---

## Timeline (30.0 s)

| # | Time | Source | Picture | Voice | On screen |
|---|---|---|---|---|---|
| 1 | 0.0–2.5 | **REAL** Ali's phone clip | Raw vertical phone video of a bench set, phone leaning against a plate, full body in frame | **Maya:** "This is one bench set, filmed on a phone leaning on a plate." | Hook text, same words, top third |
| 2 | 2.5–6.0 | **REAL** 4Dcoach replay | Hard cut to the same set as the 4D avatar; the camera orbits from the side up to overhead | **Maya:** "And this is the same set, from an angle no camera in the gym can give you." | `Real set · real replay` small, bottom left |
| 3 | 6.0–9.0 | **CHARACTER** Maya | Medium shot in the gym, she frames the phone with both hands then points at it | **Maya:** "Reps. Tempo. A technique score. Per set, from one phone." | `AI presenter` label, first appearance |
| 4 | 9.0–14.0 | **REAL** 4Dcoach stat tiles + warning | Tiles land one at a time: reps, tempo, technique score; then the plain-English warning line for the flagged rep | **Jake:** "It doesn't say nice form. It names the rep, the joint, and the number." | The warning line exactly as the app printed it `[FROM APP]` |
| 5 | 14.0–18.5 | **CHARACTER** Jess | Selfie framing; she props a phone against a plate, checks the frame, steps out of shot | **Jess:** "Prop it anywhere it can see you. Press record. Lift." | `AI presenter` label, first appearance |
| 6 | 18.5–24.0 | **REAL** app screen recording | SHaiPT: the coach interview → the generated program → an exercise with the form-check link | **Maya:** "Inside SHaiPT an AI coach interviews you and builds the program. The form check runs on thirty-six of the lifts in it." | `876 exercises · 36 with form check` |
| 7 | 24.0–27.0 | **CHARACTER** Marco | At the rack in the red belt, watching the replay on the phone, laughs and shakes his head | **Marco:** "I'd have sworn those elbows were tucked." | `AI presenter` label, first appearance |
| 8 | 27.0–30.0 | **CARD** | SHaiPT wordmark on graphite; one red rule | **Jake:** "SHaiPT. Invite-only early access. Join the waitlist." | `shaipt.com/waitlist` |

Voice total: 78 words. At presenter pace that is 27–29 seconds with the natural gaps.

**The hand-off rule (shots 5 → 4/2).** Jess props the phone and leaves the frame. The
person who lifts in every real shot is Ali, in different clothes, with the
`Real set · real replay` credit on screen. No cut may let a viewer read a character as
the lifter being scored. Marco in shot 7 watches a phone; the replay on it is Ali's set.

---

## What each source needs

### REAL (shots 1, 2, 4, 6)

- **Shots 1, 2, 4 — the bench set.** One set, five to eight reps, phone leaning against
  a plate about 45° off the side of the bench, whole body and bar in frame, normal gym
  light, no one else in shot. Run it through 4Dcoach. Screen-record the replay orbiting
  side-to-overhead at the bottom of a rep, then the stat tiles appearing, then the
  warning line. Register the raw clip and the recording with
  `./growth/assets.sh add <file> --usage ad-safe --subject "Ali"`.
- **Shot 6 — the app.** A screen recording of the real product: coach interview, program,
  an exercise page with the form-check link. Can be captured now on a test account.

### CHARACTER (shots 3, 5, 7)

Three clips, four to five seconds each, generated in Higgsfield from the locked identity
sheets in `growth/characters/`. Version 1 uses **voice-over, not lip-sync**: the
characters are doing something (framing, propping, watching), not mouthing lines, so the
voice can sit over the picture the way most feed video does. Lip-sync is a version 2
decision once the first clips exist.

- Maya: gym, outfit A, medium shot, frames with both hands then points at the phone.
- Jess: gym, outfit A, selfie framing, props the phone against a plate, steps out.
- Marco: gym, outfit A plus red belt, watches a phone at the rack, laughs, shakes head.

Voices: OpenAI TTS with each character's fixed voice (`cast.json`). One render each of
their lines; the pipeline's `make-voiceover.sh` already does this for one voice, and
the per-character mapping is a small change to make there.

### CARD (shot 8)

Rendered from the channel art tokens (`growth/channel/render.sh`) so the wordmark and
red match the site exactly.

---

## Rules check (against `growth/prompts/content-rules.md`)

- **Asset plan:** every source is `ad-safe`: Ali's own footage, the app, and fully
  AI-generated characters. The video inherits `ad-safe`. `AI presenter: yes`.
- **No testimonial, no result, no first person about outcomes.** Maya and Jake describe
  the product in second person. Jess gives instructions. Marco reacts to someone else's
  set; his line is about what the replay shows, not about himself.
- **Every number came out of the app.** The warning line in shot 4 is pasted from the
  real output or the shot is cut. The 876 / 36 figures are verified in the codebase and
  in `first-10-videos.md`. No other numbers.
- **Not claimed, on purpose:** AR placement, 3D body measurement, validated scoring,
  gym scanning, Android AR, plate detection (all in "Not yet filmable"). "Phone video",
  never "phone scan". "Same principle as a bar-speed device" is not used because RIR is
  not in this cut.
- **No before/after imagery.** None.
- **Disclosure at publish:** YouTube "altered or synthetic content" toggle; Meta's
  AI-generated disclosure; the on-screen `AI presenter` label at each character's first
  appearance, kept as a small persistent credit for the rest of the cut.

---

## Two crops from one timeline

- **9:16** is the master: ad placements, Shorts, Reels. Hook text top third, credits
  bottom left, safe margins for platform UI.
- **16:9** for sending to people: same cuts; the replay and the app recording are the
  only shots that need re-framing, and both exist at full resolution.

---

## Open for Ali

1. Approve or edit the lines. Each character's line is in their voice on purpose; if a
   line reads wrong for them, the bible is the reference.
2. Shoot the bench set (spec above). It unblocks this video and the first Short at once.
3. Decide whether Marco's reaction line stays. It is the one moment of personality in the
   cut; it is also the one line closest to the edge, and it is written to stay on the
   right side of it.
