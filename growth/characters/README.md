# The cast — four recurring AI presenters for the SHaiPT channel

Decided with Ali on 2026-09-11. This folder is the single source of truth for who the
characters are, what they look like, how they sound, and how to generate a new clip of any of
them that matches every earlier clip. A future session, or a hired editor, should be able to
produce an on-model clip from this folder alone.

The rules they live under are in `growth/prompts/content-rules.md` (upstream on any conflict)
and `growth/channel/first-10-videos.md` § "The AI cast". This file does not restate them; it
adds what the cast decision implies.

---

## 1. The cast at a glance

| Slug | Name | Role | Age | Energy | Voice (OpenAI TTS) | Red accent |
|---|---|---|---|---|---|---|
| `maya` | Maya | Coach | late 20s | sharp, analytical, the numbers person | `sage` | red watch strap |
| `jake` | Jake | Coach | early 30s | calm, precise, unhurried | `onyx` | red silicone wristband |
| `jess` | Jess | Lifter | mid 20s | gym-native, quick, laughs easily | `nova` | red hair tie |
| `marco` | Marco | Lifter | mid 20s | confident intermediate, thinks his form is fine | `ash` | red lifting belt |

First names only, on screen and in scripts. No surnames, no social accounts of their own, no
credentials. A surname or a certificate makes a fictional presenter look like a real person, and
a real person is exactly what they must never be mistaken for.

**Pairing.** Any combination, with one fixed rule: **when Marco is coached, Maya coaches him.**
Jess can work with either coach. Coaches can appear together; lifters can appear together.

**Wardrobe.** Plain, unbranded gym clothes in graphite and black, one red accent per character
(the column above), never a logo. Photoreal, never stylised.

**Setting.** One commercial gym, reused everywhere. Specified in §6.

**Builds.** Athletic and realistic. Coaches look like people who train seriously; lifters look
like regular gym-goers. Nobody is competition-lean or bodybuilder-sized.

---

## 2. What "lifter" means for an AI character

The lifters are the audience's stand-in: they set up the phone, ask the questions a viewer
would ask, and react to what the replay shows. **They are never the person in footage that
gets a 4Dcoach score.** A generated clip of Marco squatting with a real score laid over it is a
fabricated result, which `content-rules.md` §4 bans, and § "The AI cast" bans outright
("appear to be the lifter in footage that is then scored"). So:

- Scored footage is always real: Ali's own sets, or a consenting friend with a release.
- A lifter character may be shown propping a phone against a plate, walking to a rack,
  chalking up, watching the replay, or reacting. Not performing the set that is then scored.
- Cuts must not imply the character is the person in the real footage. Different clothes from
  the real lifter, and a visible hand-off ("here's a real set") when the real footage arrives.

Coaches explain what is being measured. Lifters ask. The product is the proof.

---

## 3. The ten steps, and where each stands

| # | Step | Status |
|---|---|---|
| 1 | Bible per character (persona, speech, never-says) | written, awaiting Ali's approval |
| 2 | Look spec per character (face, body, hair, marks, wardrobe A/B/C) | written, awaiting Ali's approval |
| 3 | Identity sheet: ten reference frames per character, generated in Higgsfield, iterated to approval, then frozen | **Maya: done, committed in `maya/sheet/`.** **Jake: all ten generated and favourited in the Higgsfield account, not yet on disk** (see §10). Jess, Marco: not started |
| 4 | Lock: register the frozen sheet as a Higgsfield consistent character; the prompt block in each bible is copied verbatim from then on | not started |
| 5 | Voice: one fixed OpenAI TTS voice per character (proposed above); 30-second test of each, then never changed | not started |
| 6 | Motion tests: five short clips each (talk to camera, point at phone, react, walk in the gym, sit on a bench); check drift; tune the prompt block once | not started |
| 7 | Wardrobe variants: outfits B and C each get their own reference frame in the sheet | folded into step 3; done for Maya and Jake |
| 8 | QA checklist (§5) passed before any clip is registered `ad-safe` with `./growth/assets.sh add` | not started |
| 9 | Disclosure: on-screen "AI presenter" label, YouTube synthetic-content toggle, Meta's equivalent, no real-person resemblance | rules exist; per-clip |
| 10 | Repo: this folder, one subfolder per character, frozen sheets committed | this commit |

---

## 4. The consistency method

Consistency comes from three things, in this order of importance:

1. **The frozen identity sheet.** Ten frames per character, all generated from one prompt block
   under one lighting setup, chosen by Ali, then never regenerated. Every later image or video
   starts from these frames (Higgsfield's consistent-character feature; confirm its current name
   in the UI, it has been called Soul ID). If the tool loses the character, re-register it from
   the same frozen frames, never from a later output.
2. **The prompt block, verbatim.** Each bible has a block with three slots: `[SHOT]`, `[ACTION]`,
   `[OUTFIT]`. Only the slots change. Paraphrasing the block is how drift starts.
3. **The shared environment and camera language** (§6). Same gym, same light, same lens words.

The ten frames of a sheet, in order:

| # | Frame | Purpose |
|---|---|---|
| 1 | Front headshot, neutral | the anchor face |
| 2 | Front headshot, natural smile | expression range |
| 3 | Three-quarter left headshot | face geometry |
| 4 | Right profile | nose, jaw, hairline |
| 5 | Full body, front, standing relaxed, outfit A | proportions |
| 6 | Full body, three-quarter, mid-gesture, outfit A | how they move |
| 7 | Phone-selfie framing, arm extended, outfit A | the UGC frame |
| 8 | Full body, outfit B | wardrobe lock |
| 9 | Full body, outfit C | wardrobe lock |
| 10 | Medium shot in the gym (§6), outfit A | environment lock |

Frames 1 to 9 on a plain mid-grey background under soft even light. Frame 10 is the only one
in the gym. Save them as `sheet/01-front-neutral.png` and so on, in the character's folder.

**Negative list, always in the prompt:** no logos, no readable text, no other people, no
mirrors showing a camera, no exaggerated musculature, no beauty-filter skin, no jewellery
beyond what the bible lists, no hats.

**Real-person check.** If a generated face resembles a known athlete, influencer or actor,
discard it and regenerate. Never put a real person's name in a prompt, not even as a style
reference. Higgsfield's terms and both ad platforms treat a look-alike as that person.

---

## 5. QA checklist, per clip

Before `./growth/assets.sh add <clip> --usage ad-safe --subject "<Name> (AI presenter)"`:

- [ ] Face matches sheet frames 1 to 4: eyes, brows, nose, jaw, hairline, skin tone, marks.
- [ ] Body matches frame 5: height relative to the rack, shoulder width, build.
- [ ] Hair matches: colour, length, style (Maya bun, Jess ponytail, Jake fade, Marco pushed back).
- [ ] Outfit is A, B or C exactly, with the character's red accent and nothing branded.
- [ ] Hands: five fingers, phone held plausibly, no floating props.
- [ ] Voice is the character's fixed TTS voice; lip-sync clips use that audio, not a tool's own voice.
- [ ] Nothing in the clip has the character lifting in a way that could be read as the scored set.
- [ ] No first-person results language (the `new-short.sh` check catches it; read it anyway).
- [ ] "AI presenter" label is planned for the character's first appearance in the video.

---

## 6. The gym

One environment, described the same way every time:

> A modern commercial gym, early morning, nobody else in frame. Black rubber flooring, matte
> black power racks and plate trees, graphite-grey walls, cool white LED strip lighting from
> above with a soft fill, one thin red accent stripe along the far wall at shoulder height.
> Clean, not glossy. No mirrors facing the camera, no logos, no signage.

Camera language for UGC-style clips: vertical 9:16, eye level, phone-lens look (26 mm
equivalent), slight handheld movement, natural exposure, no cinematic grade. For identity
sheets: 85 mm look, shallow depth of field, soft even studio light, mid-grey seamless.

---

## 7. Disclosure, per video

- The first appearance of any character carries an on-screen `AI presenter` label.
- YouTube upload: *Altered or synthetic content* toggle on.
- Meta: the AI-generated disclosure at ad creation and on organic posts where the character
  appears realistically.
- `### Asset Plan` in the script sets `AI presenter: yes`.

---

## 8. Folder layout

```
growth/characters/
  README.md            this file
  cast.json            machine-readable: slug, name, role, voice, accent, pairing rule
  maya/  bible.md  sheet/   (ten frozen frames once approved)
  jake/  bible.md  sheet/
  jess/  bible.md  sheet/
  marco/ bible.md  sheet/
```

---

## 9. Open for Ali

1. Approve or edit the four names and the four looks (each `bible.md`, § "Look").
2. Run the 30-second voice test for the four proposed TTS voices and confirm or swap.
3. Generate the identity sheets in Higgsfield from each bible's prompt block. Approve one set
   per character. Commit the ten frames to `sheet/`.

---

## 10. Session log

**2026-09-12.** Anchors are made with Soul 2.0 from the bible's prompt block, four candidates,
one picked (Ali picked Maya's from the phone; Maya was then regenerated once for "more
attractive and charismatic", and her full-body frames once more for a stronger lower body).
The other nine frames are made with Nano Banana Pro at 2K with the anchor attached via the
tile's own **Reference** button, two candidates per frame, the pick marked with the tile's
heart so the **Favorites** view holds exactly the sheet. Identity held on every frame for both
characters without a single re-roll for drift.

**Getting files out.** The first ten-image archive downloaded fine from Favorites → select all
→ Download. After that, Chrome stopped saving anything from higgsfield.ai (bulk and single),
which is the browser's automatic-downloads block, not a Higgsfield fault. Fix on the Mac:
Chrome → Settings → Privacy and security → Site settings → Automatic downloads → allow
`higgsfield.ai`, or click Allow on the bubble by the address bar. Then Favorites → select the
ten → Download works again. Jake's ten are the newest ten in Favorites.
