# Maya — coach

**Role.** Coach. The numbers person: tempo, bar path, technique score. She loves the replay
because it settles arguments. When Marco is coached, it is by her.

**Age and energy.** Late 20s. Sharp, analytical, quick to the point. Not cold: she gets visibly
pleased when the data shows something the eye missed. On camera she is magnetic: strikingly
attractive, confident, a slight knowing smile with engaged eyes is her resting expression (Ali,
2026-09-12: "more attractive and charismatic").

**Who she is (fictional, never claimed on screen).** Trains early, coaches a small group, reads
bar-speed charts the way other people read box scores. No credentials are ever stated or
implied; her competence shows in what she notices, not in a title.

## How she talks

- Leads with the measurement, then the meaning: "Bottom of rep three, elbow at 62 degrees. That's inside the range. Rep four isn't."
- Short sentences. Numbers only when they come from a real 4Dcoach output on real footage.
- Second person about the product, never first person about outcomes.
- Says "look" and "watch this" before the walk-around angle.
- Light dry humour at the product's expense is fine ("it's pickier than I am").

Allowed lines: "Here's what 4Dcoach picks up on a squat this deep." / "Let's run this rep through it and see what the score says." / "Orbit to overhead. Now you can see it."

**Never says.** Anything in the voice of a user: "my squat", "I use this", "it fixed my". Any
medical or injury-prevention claim. Any number without a source in the script.

## Look

- South Asian heritage, medium-brown skin with a healthy natural glow and real texture, dark brown almond eyes, strong well-groomed straight brows, high cheekbones, a defined jawline, full lips, small straight nose.
- Resting expression: confident slight smile, bright engaged eyes straight into the lens. Never blank.
- Dark hair, pulled back into a low tight bun. Always the bun.
- Small gold stud earrings. Minimal makeup, a little mascara.
- Lean athletic upper body with defined shoulders; a strong, visibly developed lower body: muscular thighs and prominent, well-developed glutes, the build of someone who squats heavy. About 168 cm. (Ali, 2026-09-12: "legs and glutes more prominent and bigger".)
- Distinguishing marks: a small mole just above the left corner of her mouth.
- Red accent: a black watch with a red strap on the left wrist.

**Wardrobe.**
- A: fitted black tank top, fitted graphite-grey leggings, black trainers. (Leggings, not joggers, so the lower-body build reads on camera.)
- B: charcoal long-sleeve fitted training top, black leggings.
- C: black cropped hoodie over a graphite tank, black shorts.

**Signature.** Frames the thing she is describing with both hands, then points at the phone
screen. Carries the phone on a small tripod.

**Voice.** OpenAI TTS `sage`. Delivery: even pace, slight downward inflection at the end of a
finding, no filler words. Test against `nova` once; then it never changes.

## Prompt block (copy verbatim; change only the three slots)

```
Photorealistic [SHOT] of a strikingly attractive woman in her late twenties of South Asian heritage with magnetic camera presence, a confident slight smile and bright engaged eyes looking straight into the lens, medium-brown skin with a healthy natural glow and real skin texture, dark brown almond eyes, strong well-groomed straight brows, high cheekbones, a defined jawline, full lips, a small straight nose, a small mole just above the left corner of her mouth, dark hair pulled back into a sleek low tight bun, small gold stud earrings, minimal makeup with a little mascara. Lean athletic upper body with defined shoulders and a strong, visibly developed lower body with muscular thighs and prominent well-developed glutes, the build of someone who squats heavy, about 168 cm. Wearing [OUTFIT] and a black watch with a red strap on her left wrist. [ACTION]. Natural skin, no retouching, no logos, no readable text, no other people, no hats, no extra jewellery, no exaggerated musculature.
```

Slots: `[SHOT]` from the README sheet list (frames 1 to 9 add "soft even studio light, plain mid-grey seamless background, 85 mm look, shallow depth of field"; frame 10 and all video clips add the gym paragraph from README §6 and "vertical 9:16, eye level, phone-lens look, slight handheld movement"). `[OUTFIT]` is A, B or C above. `[ACTION]` is what she is doing, in one sentence.
