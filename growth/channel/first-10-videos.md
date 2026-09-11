# The first ten videos

Priority order. Every concept below is grounded in something 4Dcoach actually does
today — the source for each claim is cited so nobody has to take it on trust. Nothing
here describes a feature that does not exist; the things that *don't* exist yet are
listed at the bottom under **Not yet filmable**, and they are there to stay out of
the scripts.

Sources referenced:
`lib/landing/faq.ts` (the FAQ, which is the public promise),
`~/SHaiPT/SHaiPT_simple/4Dcoach/README.md` (the engineering truth, §4 measurement,
§5 technology, §6 verified / in progress / not built),
`HANDOFF-scrollcraft-ar.md`, `lib/exerciseLibrary.ts`.

The ordering rule: **(1)** does it show the one thing nobody else does, **(2)** can it
be filmed this week with footage that already exists, **(3)** does the hook land in
two seconds with the sound off.

---

## 1. One set. One phone. A replay you can walk around.

**Hook (0–2s):** "This is one bench set, filmed on a phone leaning against a plate."

**On screen:** the raw vertical phone clip → hard cut to the same set as a 3D avatar,
orbiting → the stat tiles appearing one at a time.

**What it rests on:** the whole product. One handheld phone video becomes an animated
3D avatar you can orbit, scrub, slow down and loop, synced to the video with a
landmark overlay (4Dcoach README §1). Verified on the founder's own clips and sample
clips (§6, "Verified": mesh avatar on all five gym exercises, rep detection, tempo,
RIR, scoring).

**Why first:** it is the only video that has to exist. Everything else is a detail of
this. It is also the channel trailer.

**CTA:** shaipt.com/waitlist

**Flags:** paid-ad safe. Say "phone video" not "phone scan" — nothing is scanned.

---

## 2. It named the rep, the joint and the number.

**Hook:** "It doesn't say 'nice form'. It says: rep 4, elbow to torso, 91 degrees."

**On screen:** reps ticking up → the warning line appearing in plain English → the
flagged rep in the replay with the offending body part coloured.

**What it rests on:** the bench rules are written down and checkable — elbow-to-torso
between 30° and 80° at the bottom, smallest elbow joint angle in the rep between 85°
and 95°, concentric at least half a second (FAQ, "How is the technique score made?";
README §4). Every rep is checked against them and the warning names the rep, the joint
and the number. The avatar colours flagged body parts (README §5, "Avatar").

**Why second:** this is the line that separates 4Dcoach from every skeleton-overlay
app. "A number, on a named rep, on a named joint" is a specific, falsifiable promise.

**Flags:** paid-ad safe. Use a genuinely scored clip; never paste a number onto a
frame the app did not score.

---

## 3. How many reps did you actually have left?

**Hook:** "No wearable, no bar clip. The bar slowed down — that's the whole
measurement."

**On screen:** a set to near failure → the concentric times falling rep by rep → the
reps-in-reserve tile.

**What it rests on:** RIR is derived from concentric velocity loss across the set,
the same principle velocity-based-training devices use (README §4).

**Why third:** it reaches past form-check viewers into the VBT and powerlifting
audience, which is a bigger and more technical crowd, and the hook is a question
lifters argue about constantly.

**Flags:** paid-ad safe **with one restriction** — do not claim equivalence with a
GymAware, Vitruve, RepOne or Perch reading. It is the same principle, not a validated
match; validating RIR against a bar-speed device is listed as still-to-do (README §9).
Say "the same principle as a bar-speed device", never "as accurate as".

---

## 4. Was that rep actually deep enough?

**Hook:** "Depth is the argument that never ends. Here's a measurement instead."

**On screen:** a squat set → the depth check per rep → the per-rep table with the reps
that passed and the ones that did not.

**What it rests on:** squat scoring checks trunk-versus-shin lean, depth and knee gap
(README §4). Squat is one of the five gym lifts the score covers (FAQ, "Which lifts
does it score?").

**Flags:** paid-ad safe. Do not film this with bench footage and relabel it — the
kicker on the thumbnail must match the lift on screen.

---

## 5. Nothing leaves your phone.

**Hook:** "Airplane mode. Now film the set." *(then it analyses anyway)*

**On screen:** toggle airplane mode on camera → film → the analysis runs → reps, tempo
and score appear with no network.

**What it rests on:** pose tracking, rep counting and the form check run in the browser
on the phone; the standard analysis uploads nothing (FAQ, "Is my video uploaded?").

**The exception that must be on screen:** two optional features do send the clip
somewhere — the 3D body scan and the reconstruction of your real room — and they go to
**a server you run yourself**, not a cloud. Say it in the video. A privacy claim with
a quiet exception is worse than no claim.

**Why fifth:** privacy hooks travel further than feature hooks, and this one is
genuinely differentiated against every camera-based competitor.

**Flags:** paid-ad safe *only* with the exception stated. Never say "nothing ever
leaves your phone" flatly.

---

## 6. Worst angle in the gym. Handheld. Two people walking through.

**Hook:** "Bad angle, handheld, strangers in frame. It still counted eight."

**On screen:** the deliberately awful clip → the tracker locking onto the lifter while
bystanders move through → the rep count, correct.

**What it rests on:** any phone, propped against a plate or held by a friend, from any
angle in normal gym light; the lifter is tracked, not the room, and bystanders are
ignored (FAQ, "Do I need a wearable or a fixed camera?"). On one six-rep deadlift clip
with bystanders, the temporal stabiliser repaired 62 left/right swaps and 47
single-frame jumps without changing the rep count (README §6).

**Flags:** paid-ad safe. The 62/47 figures are from **one clip** — say "on this clip",
never "always". This video kills the single biggest objection ("I'd have to set up a
tripod"), so it earns its slot.

---

## 7. I scanned my gym in 30 seconds and put my lift inside it.

**Hook:** "Walk around the room once. Every set after that replays inside it."

**On screen:** the 20–30s walk-around → the reconstructed room → the avatar lifting
inside the real gym, camera orbiting.

**What it rests on:** a walk-around clip becomes a 3D Gaussian Splat of the room
(ffmpeg → COLMAP → Brush, roughly six minutes on an M3), the lift is registered into
the same reconstruction, and the splat is rendered in the browser. Rooms are saved and
reused: a later set in the same gym needs only a ~30s registration (README §1, §5).
Verified on a synthetic walk-around within 2% camera height/distance and 3° body yaw,
and on two real gym clips fully posed (README §6).

**The caveat that must be on screen:** the room reconstruction runs on **a laptop you
run**, not in the cloud and not on the phone (README §6, "Not built / known limits").

**Why seventh and not first:** it is by far the most spectacular thing the product
does, which is exactly why it must not be the first impression — it is also the most
conditional, and leading with it sets an expectation the phone alone cannot meet.

**Flags:** paid-ad safe with the caveat on screen. Never imply it happens on the phone.

---

## 8. It refused to score my elbows. That's the feature.

**Hook:** "I filmed from the foot of the bench. It left the elbow angles blank instead
of guessing."

**On screen:** foot-end clip → blank fields where the elbow numbers should be → cut to
the side-on clip of the same lift → the numbers fill in.

**What it rests on:** angles measured in 2D depend on the camera angle, so the scorer
knows which view it has; from the foot end of a bench, elbow angles cannot be read and
are left blank rather than penalised or guessed (FAQ, "Which lifts does it score?";
README §4, "View awareness").

**Why eighth:** it is the single best trust-builder available, and it is the kind of
thing a competitor cannot copy without admitting their own numbers are guesses. It
also generates a genuinely good comment section.

**Flags:** paid-ad safe. Pair it with the honest framing that the technique rules
encode common coaching practice and the founder's own lifting, not a published study
(README §6).

---

## 9. More weight. Worse form. It said so.

**Hook:** "I added ten kilos. The score dropped ten points. It told me to go back."

**On screen:** two consecutive real sessions side by side → the progress card → the
advice line in the app's own words.

**What it rests on:** load per session and per-exercise history are paired with the
technique score, so "more weight, worse form" is visible and the app says so
explicitly — e.g. "more load but the score dropped 10 points: go back to the previous
weight" (README §2, §4).

**Why ninth:** it is the retention argument rather than the wow argument, and it needs
two real sessions a week apart, so it takes the longest to have footage for. Start
recording the pair now.

**Flags:** paid-ad safe. Both sessions must be real and consecutive. Do not stage a
bad set to manufacture the drop.

---

## 10. I scored a lift from a video they posted themselves.

**Hook:** "This is a set [lifter] posted publicly. Here is what the rules say about
it — and what they refuse to say."

**On screen:** their publicly posted clip, credited → the landmark overlay → the score
and the named warnings → the fields the view angle leaves blank.

**What it rests on:** exactly the same scoring rules as every other video. Nothing
special is claimed; it is the same measurement pointed at footage the channel did not
shoot.

**Why last, despite being the biggest reach:** a channel whose first videos are
reactions to other people's lifting reads as a commentary channel, not a product. Run
this only once videos 1–3 exist, so the measurement has already been shown working on
the channel's own footage.

### ⚠ ORGANIC ONLY — this concept may never appear in a paid ad

This is a hard line, not a preference.

- **Never** as creative in a Google Ads, YouTube Ads or Meta campaign.
- **Never** as a boosted post or a promoted Short.
- **Never** repurposed into a landing-page hero or an ad-account asset library.

Two separate reasons: using a person's likeness in advertising engages right-of-
publicity law in most jurisdictions even when the underlying commentary is fair use;
and placing a named lifter inside an ad implies endorsement, which the channel is
forbidden from doing under any circumstances.

### Rules for making one at all

1. Publicly posted footage only. Never a private individual, never a DM'd clip, never
   anything behind a paywall or a private account.
2. Credit the lifter and link the original, in the video and in the description.
3. The commentary is about the technique and about the measurement. Never about the
   person, their body, or their character. No "X's form is trash" framing.
4. Never state or imply that they use SHaiPT, have heard of SHaiPT, or endorse it.
   No side-by-side with a SHaiPT call-to-action in the same frame as their face.
5. Show the limits honestly — the blank fields the camera angle forces, and the fact
   that the rules are coaching practice rather than a validated study.
6. Honour any takedown or objection immediately and without argument.
7. Keep a note of the source URL and the date for each one.

---

## Reserve bench (film these when 1–10 are out)

- **The five gym lifts and the six at home.** 4Dcoach covers bench press, barbell
  squat, deadlift, lateral raise and biceps curl in the gym, plus bodyweight squat,
  push-up, crunch, plank, pull-up and hip thrust at home (`lib/exerciseLibrary.ts`,
  `FOURD_LABELS`). The live coach counts reps from the selfie camera *without
  recording*, calls the rest and the next set (FAQ).
- **The bar finds itself.** A fine-tuned gym detector locates the barbell and its
  height replaces the wrists as the rep signal: seen in 69% of frames on bench, 98% on
  squat, 99% on deadlift (README §5, §6). Good nerd-bait; state the numbers as measured
  on the test clips, not as a guarantee.
- **Your avatar, your body.** A 10–20s T-stand rotation clip in front of a fixed phone
  produces a personal mesh saved to the profile and used in every replay (README §5).
- **876 exercises, 36 of them wired to the form check.** The SHaiPT app's library links
  straight into 4Dcoach for the mapped lifts (`README.md`, `lib/exerciseLibrary.ts`).

---

## The AI cast

Recurring AI-generated (Higgsfield) characters present and demo. They are the
continuity between videos. They are not people, and the channel never pretends they
are.

**They may:**
- introduce a video, narrate it, and explain what is being measured;
- walk through the app on screen;
- react to real footage;
- appear as a recognisable recurring character with a name.

**They may never:**
- claim to be a customer, a user, a beta tester or a client;
- report results — no "I gained", no "my score went from", no "this changed my
  training";
- give a testimonial, a rating, or a recommendation in the voice of a user;
- appear to be the lifter in footage that is then scored as if it were a real set;
- be presented, captioned or credited as a real person;
- be paired with a real person's name, likeness or voice.

**Always:**
- the lifting footage is real; the AI character never substitutes for the proof;
- switch on YouTube's *Altered or synthetic content* toggle at upload for any video
  where a character appears realistically;
- put an on-screen "AI presenter" label the first time a character appears in a video.

The reason for the "never a customer" rule is not squeamishness: a fabricated consumer
testimonial is deceptive advertising regardless of whether the speaker is real, and a
synthetic presenter does not change that. Presenters are fine in paid ads. Synthetic
customers are not, anywhere.

---

## Not yet filmable

Do not script, thumbnail or tease any of these until the underlying thing is verified.
Each is listed with what would have to be true first.

| Concept | Why not yet | Unblocked when |
|---|---|---|
| "Put the replay on your real bench in AR" | The AR Quick Look link has never been confirmed on a physical iPhone (4Dcoach README §6; `HANDOFF-scrollcraft-ar.md`). The USDZ structure validates on the Mac; that is not the same as it opening on a phone. | Ali confirms AR Quick Look opens the animated USDZ on a real iPhone. |
| "Your body, measured in 3D" | The SAM 3D Body path is code-complete but waiting on a gated checkpoint download; the shipped avatar is a *driven* anthropometric model, not a measurement of your body (README §5, §6). | The checkpoint lands and a real clip runs through it. |
| "Scientifically validated form scoring" | The rules encode common coaching practice and the founder's own lifting. Not a study (README §6). | Never, without an actual study. Do not imply it. |
| "Scan your gym from your phone" | The room reconstruction needs a laptop running the server; it is not a cloud service (README §6). | It becomes a hosted service. Until then, video 7 states the laptop requirement. |
| "Works on Android in AR" | AR placement is iPhone-only; there is no WebXR path (FAQ; README §6). The replay, reps and form check do work in any modern browser. | A WebXR path exists. |
| Dumbbell and plate detection | The detector is weak on plates and dumbbells and needs real labelled data (README §6). | The detector is retrained and measured. |

---

## Production notes

- **Cadence:** 2–3 Shorts a week, not daily. A missed week costs less than a week of
  thin videos.
- **One hook per video.** Every concept above has exactly one claim. Do not merge two.
- **The first two seconds carry it.** Hook on screen as text *and* spoken, because most
  of the feed is muted.
- **Thumbnails:** `./render.sh` builds both the 16:9 tile and the 9:16 cover from one
  set of tokens. Add a row to the `EXAMPLES` block at the bottom of the script. The two
  worked examples already there use the hooks from videos 2 and 3.
- **Description UTM:** tag each video's link `utm_campaign=video-<slug>` so the waitlist
  table can tell videos apart — `components/waitlist/WaitlistPage.tsx` already captures
  and stores it.
- **Every number on screen came out of the app.** If a shot needs a number the app did
  not produce, the shot is wrong, not the number.
