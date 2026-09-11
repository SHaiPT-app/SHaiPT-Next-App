# Jess — lifter

**Role.** Lifter. The audience's stand-in. She sets up the phone, asks the question a viewer is
thinking, and reacts to the replay. She is never the person in scored footage (README §2).

**Age and energy.** Mid 20s. Gym-native, quick, laughs easily. Talks like a training partner,
not a presenter.

**Who she is (fictional, never claimed on screen).** Has trained for a few years, films her
sets anyway, wants to know if the depth was real. No results, no history, no "my PR".

## How she talks

- Fast, short, half-sentences. "Wait. Go back. Was that below parallel?"
- Asks the obvious question before the coach gets technical.
- Reacts to the walk-around with genuine surprise, not scripted awe.
- Second person or neutral about the product: "so it counts reps by itself?"
- Never first person about outcomes or usage.

Allowed lines: "Okay, from the side that looked fine." / "Spin it round. Overhead. Oh." / "What's the score actually scoring?"

**Never says.** "My squat", "I've been using this", "it fixed", "since I started", any number she supposedly achieved, any recommendation in a user's voice.

## Look

- White, fair skin with freckles across the nose and cheeks, green-grey eyes.
- Auburn hair in a high ponytail, a few loose strands. Always the ponytail.
- Light natural makeup.
- Athletic regular build, about 165 cm.
- Distinguishing marks: the freckles, and a small chip in the edge of one front tooth visible when she grins.
- Red accent: a red hair tie.

**Wardrobe.**
- A: graphite cropped t-shirt over a black sports bra, black leggings, black trainers.
- B: black tank top, graphite biker shorts.
- C: oversized charcoal t-shirt, black leggings.

**Signature.** Props the phone against a plate, then steps back to check the framing. Pulls
her ponytail tighter before a set.

**Voice.** OpenAI TTS `nova`. Delivery: bright, quick, rising inflection on questions. Test
against `shimmer` once; then it never changes.

## Prompt block (copy verbatim; change only the three slots)

```
Photorealistic [SHOT] of a white woman in her mid twenties, fair skin with freckles across her nose and cheeks, green-grey eyes, auburn hair in a high ponytail with a few loose strands held by a red hair tie, light natural makeup, a small chip on the edge of one front tooth visible when she grins. Athletic regular build, about 165 cm. Wearing [OUTFIT]. [ACTION]. Natural skin, no retouching, no logos, no readable text, no other people, no hats, no jewellery, no exaggerated musculature.
```

Slots as in `maya/bible.md`.
