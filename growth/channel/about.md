# SHaiPT — YouTube channel setup

Everything here is text to paste into YouTube Studio. Nothing in this file touches
YouTube; whoever applies it should work top to bottom.

## Files in this folder

| File | What it is |
|---|---|
| `about.md` | this file — every field to paste into YouTube Studio |
| `first-10-videos.md` | the ten video concepts, their hooks, and the hard rules |
| `banner.svg` | channel art source, 2560×1440, safe-area aware |
| `avatar.svg` | channel avatar source, 800×800 |
| `thumbnail-template.svg` | reusable 16:9 thumbnail, token slots |
| `thumbnail-template-shorts.svg` | the 9:16 twin, same token names |
| `render.sh` | renders all of the above to the PNG/JPG sizes YouTube wants |
| `stills/` | film plates cut from `public/hero/bench.mp4` (committed) |
| `out/` | **the files to upload.** Regenerate with `./render.sh` |
| `build/` | intermediate filled SVGs, gitignored, safe to delete |

Run `./render.sh` to rebuild `out/`, `./render.sh --guides` to see the crop guides
drawn on top (QA only — never upload a guides render).

---

The channel's subject is **4Dcoach**: film one set on a phone camera, get a 4D replay
you can walk around, with reps, tempo and a technique score. Real lifting footage is
the hero. Format is 2–3 Shorts a week.

---

## 1. Channel name

**`SHaiPT — 4Dcoach`**

Set at: *Customise channel ▸ Basic info ▸ Name.*

SHaiPT on its own means nothing to a stranger on day one, and a brand-new channel
cannot afford a name that carries no information. `4Dcoach` at least gestures at what
the videos contain, and it is the term the videos will teach people to search for.
Drop the suffix and go to plain `SHaiPT` once the brand is doing the work — the name
is changeable at any time and changing it breaks nothing.

Avoid putting a tagline in the name ("SHaiPT — AI form check for lifters"). The name
is rendered small and truncated in the Shorts player and in comments.

---

## 2. Handle

Three candidates, best first. **Take `@shaipt`.**

| | Handle | Chars | Why | Why not |
|---|---|---|---|---|
| 1 | `@shaipt` | 6 | Matches shaipt.com exactly, so the handle and the domain are one thing to remember. Coined word, so a collision is unlikely. Survives any future pivot away from 4Dcoach. | Carries no meaning to a first-time viewer. |
| 2 | `@4dcoach` | 7 | Product-first and descriptive; the strongest option if the channel is meant to be *about the product* rather than *by the company*. | Generic enough that someone else may hold it. Locks the channel to one product. |
| 3 | `@shaipt4d` | 8 | Brand plus product, and the obvious fallback if `@shaipt` is gone. | Slightly awkward to say out loud. |

Further fallbacks if all three are taken: `@shaiptapp`, `@shaipt.4d`, `@getshaipt`.

**Plausibility — read this before choosing.** All five candidates satisfy YouTube's
handle rules (3–30 characters; letters, numbers, underscores, hyphens and periods
only; no spaces). Availability cannot be checked from here and has not been checked.
Verify each by loading `youtube.com/@shaipt` in a browser: a 404 means it is free, a
channel page means it is taken. Do that for all three before claiming one.

A handle can be changed later, but every link, mention and embed that used the old one
breaks. Pick once.

---

## 3. Channel description

Set at: *Customise channel ▸ Basic info ▸ Description.* Limit 1000 characters.
The text below is **892 characters** — paste it exactly as it is.

The first two lines are the only part that shows in search results and in the channel
preview card, so the hook and the product noun are both in the first sentence.

```
Film one set on your phone. Get it back in 4D — a replay you can walk around, with reps, tempo and a technique score.

4Dcoach is the centre of SHaiPT, an AI personal trainer. It turns one handheld phone video of a lift into a measurable 3D replay. No wearable, no fixed camera, no gym sensors.

Film a bench press, squat, deadlift, lateral raise or curl from any angle and get back:

— reps counted, with the eccentric and concentric seconds of every rep
— reps in reserve, read from how much the bar slowed across the set
— a technique score out of 100, and per-rep form warnings that name the rep, the joint and the number
— an animated avatar of your own set you can orbit, scrub and slow down

Pose tracking, rep counting and the form check all run in the browser on your phone — that analysis never leaves the device.

2–3 Shorts a week. Real lifting footage.

shaipt.com — early access at shaipt.com/waitlist
```

**Search terms deliberately carried in that prose**, so they are indexed without the
description reading like a keyword dump: *form check, phone video, 3D replay, reps,
tempo, technique score, bench press, squat, deadlift, lateral raise, curl, reps in
reserve, AI personal trainer, no wearable*.

**Do not add** claims the app cannot yet back: no "clinically validated", no
"measured in 3D" as a blanket statement (the measured-3D path is not shipped), no AR
promise (not yet confirmed on a physical iPhone). See `first-10-videos.md` §"Not yet
filmable".

**Corrected 2026-09-11 — the upload claim.** This line originally read "Nothing is
uploaded", which is not true as an absolute and is the most dangerous kind of claim to
get wrong, because it is a privacy representation on a public page feeding paid ads.
4Dcoach's README is precise: all processing *of the lift itself* is in-browser (`README.md:26`)
— so pose, reps, tempo, RIR and the technique score genuinely never leave the phone,
and that is the strong claim worth making. But `SPEC.md:36-38` shows the environment
clip and the set clip being uploaded for the Gaussian-splat scene, and the server
exposes `/uploads/{name}/frames`, `/body3d` and `/bodyscan` (`server/main.py`). The
wording now scopes the promise to the analysis, which is both true and still the
impressive part. Keep this sentence in step with whatever `growth/legal/privacy-policy.md`
ends up saying — if the two disagree, the policy is the one that has to be right.

---

## 4. Channel keywords

Set at: *Settings ▸ Channel ▸ Basic info ▸ Keywords.* Limit 500 characters.
Multi-word phrases must be quoted or YouTube splits them on the space.

The text below is **452 characters**:

```
"form check", "bench press form", "squat form", "squat depth", "deadlift form", "lifting form analysis", "AI form check", "AI personal trainer", "rep counter", "tempo training", "reps in reserve", "velocity based training", "bar speed", "3D pose estimation", "phone camera form check", "gym form", "powerlifting technique", "strength training app", "workout app", "AI fitness app", "bench press technique", "form check app", "gym tech", 4Dcoach, SHaiPT
```

Ordering matters a little: the earliest terms are the ones the channel should be
recommended alongside. The first six are what a lifter actually types.

---

## 5. Links

Set at: *Customise channel ▸ Basic info ▸ Links.* Up to five; the first is the one
overlaid on the banner.

| Order | Label | URL |
|---|---|---|
| 1 (banner link) | `Early access` | `https://www.shaipt.com/waitlist?utm_source=youtube&utm_medium=social&utm_campaign=channel-link` |
| 2 | `SHaiPT` | `https://www.shaipt.com/?utm_source=youtube&utm_medium=social&utm_campaign=channel-link` |

The waitlist goes first, not the homepage: the waitlist page is built as a single-
promise page with no way out except the form (`components/waitlist/WaitlistPage.tsx`),
so it converts a curious viewer far better than the marketing site does.

The UTM parameters are not decoration — `WaitlistPage.tsx` captures `utm_source`,
`utm_medium`, `utm_campaign`, `utm_content`, `utm_term` on mount and posts them with
the signup, so YouTube-sourced signups will be attributable in the waitlist table
without any extra work. Use `utm_campaign=video-<slug>` in video descriptions so
individual videos can be told apart from the channel link.

---

## 6. The rest of the setup

**Profile picture** — `out/avatar-800x800.png`.
*Customise channel ▸ Branding ▸ Picture.* 800×800 recommended, 4 MB max.

**Banner image** — `out/banner-2560x1440.png` (or the `.jpg` if the PNG is refused).
*Customise channel ▸ Branding ▸ Banner image.* 2560×1440, 6 MB max. YouTube will show
the crop preview; the art is built so the 1546×423 all-devices crop carries everything
that matters — see `out/banner-safe-1546x423.png` for exactly what a phone shows.

**Video watermark** — skip it. It fights the corner brackets in the thumbnails and is
invisible on Shorts, which is the whole format.

**Contact email** — *Settings ▸ Channel ▸ Advanced ▸ Business enquiries.* Use a role
address on the domain (for example `hello@shaipt.com`), not a personal mailbox. This
field is publicly visible behind a captcha.

**Made for kids** — *Settings ▸ Channel ▸ Advanced.* "No, set this channel as not made
for kids." Per-video default: not made for kids.

**Altered or synthetic content** — this channel uses recurring AI-generated
(Higgsfield) presenters. Any video where one of them appears realistically must have
the *Altered or synthetic content* toggle switched on at upload, and should carry an
on-screen "AI presenter" label the first time a character appears. The rules governing
what those characters may and may not say are in `first-10-videos.md` §"The AI cast".

**Channel trailer / featured video** — set the trailer for unsubscribed visitors to
video 1 from `first-10-videos.md` (the core demo) once it exists. Leave both empty
until then; an empty slot reads better than a placeholder.

---

## 7. What this channel must never do

These are hard rules, not preferences. They apply to every video, every thumbnail,
every description and every pinned comment.

1. **Never imply a real person endorses SHaiPT.** No real lifter, coach, athlete or
   public figure may be shown, quoted or captioned in a way that suggests they use the
   app, like it, or recommend it — including by juxtaposition.
2. **Videos analysing famous lifters' publicly posted footage are organic-only.**
   They may run on this channel. They may **never** be used as creative in a paid ad,
   a boosted post, or any Google/Meta campaign. Full rules in `first-10-videos.md`.
3. **AI characters present and demo. They are never customers.** They never report
   results, never give a testimonial, and never appear to be the lifter in footage
   that is then scored as a real set.
4. **Every number on screen came out of the app.** No mocked-up scores, no invented
   rep counts, no staged before/after.
5. **No claim the product cannot back today.** The technique rules encode common
   coaching practice and the founder's own lifting — they are not a validated study,
   and the channel must not suggest otherwise.
