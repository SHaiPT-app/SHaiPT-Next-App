# Content rules — SHaiPT 4Dcoach channel

These rules are **non-negotiable** and are injected into every generation
prompt in this pipeline. They are not style preferences. Rules 1 and 2 are
legal exposure; rule 3 is the reason the channel exists at all.

---

## 1. Every asset is either `ad-safe` or `organic-only`

Each piece of footage carries exactly one tag, recorded in
`growth/assets/registry.json`. Every script you write must state, in its
`### Asset Plan` section, which tag the finished video inherits. **A video
inherits the most restrictive tag of any asset in it.**

| Tag | What qualifies | Where it may run |
|---|---|---|
| `ad-safe` | Ali's own footage; a consenting friend **with a signed release on file**; a fully AI-generated character | Organic posts **and** paid ads |
| `organic-only` | Technique breakdowns of famous lifters' publicly-posted lifts; anything with a bystander, a gym logo, or third-party music | Organic posts **only** |

**Never put an `organic-only` video behind ad spend.** Commentary on a
public figure's publicly-posted lift is defensible editorial content on an
organic channel. The same clip in a paid ad implies that person endorses
SHaiPT — that is a right-of-publicity claim, and Meta and Google ad review
reject unlicensed public-figure likenesses on sight. There is no version of
this that is worth the risk to a paid account.

When a script analyses a famous lifter, say so plainly in `### Asset Plan`
and tag the video `organic-only`. Do not hedge and do not propose "we could
blur it" — the tag is the decision.

---

## 2. AI characters are presenters, never customers

The channel uses recurring AI-generated characters (Higgsfield) as hosts.

**They may:** host a segment, introduce a topic, narrate a breakdown, demo
the app on screen, react to a lift, ask the questions a viewer would ask.

**They may never:** give a testimonial, report a personal result, claim to
be a SHaiPT user, describe a transformation, say a number they supposedly
achieved, or appear in any framing where a viewer could reasonably read
them as a real customer describing real outcomes.

This is not caution, it is a bright line. Under the FTC's Rule on Consumer
Reviews and Testimonials (16 CFR Part 465, in force since October 2024),
a testimonial from a person who does not exist is a fabricated endorsement,
and the rule explicitly reaches AI-generated reviewers. Civil penalties
attach per violation. Meta's ad review rejects synthetic testimonials
independently of that.

Concretely, for an AI character:

- ALLOWED: "Here's what 4Dcoach picks up on a squat this deep."
- ALLOWED: "Let's run this rep through it and see what the score says."
- BANNED: "I added 40 pounds to my squat with this."
- BANNED: "As someone who's used SHaiPT for six months…"
- BANNED: "This fixed my depth problem."

If a script needs a results claim, it comes from Ali on camera or from a
real, consenting, releasable user — never from a character, and never from
a voiceover written to sound like a user.

**Disclosure:** any video whose presenter is an AI character must set
`AI presenter: yes` in `### Asset Plan`, so the publisher ticks YouTube's
altered-or-synthetic-content disclosure and Meta's equivalent. Do not write
a script that depends on the audience believing the character is real.

---

## 3. The subject is 4Dcoach, and it is a demonstration channel

This channel is **not** a news channel and **not** a general fitness-tips
channel. Its entire job is to show one thing working:

> Film one set on your phone. Get back a 4D replay you can walk around,
> with reps, tempo and a technique score.

Real footage of real lifts is the hero asset. The 4D replay is the payoff.
Every Short must show the product doing something a viewer cannot do with
their phone's camera alone — the walk-around angle change, the tempo
breakdown, the score landing on a rep that looked fine at full speed.

A script that could have been written without 4Dcoach existing is a script
this channel should not publish.

**Accuracy:** describe only what the product actually does — replay you can
orbit, rep count, tempo, technique score, live rep counter, AR. Pose
tracking runs on-device. Do not invent features, do not promise a number
the app does not output, and do not imply medical, diagnostic, or
injury-prevention claims. "Your knee is caving" is a technique observation;
"this will prevent your ACL tear" is a medical claim and is banned.

---

## 4. No fabricated numbers, ever

If a number appears on screen or in the voiceover, it must come from one of:

- a real 4Dcoach output on real footage,
- a cited published study, named in the script, or
- Ali's own logged training data.

If you cannot source a number, write the line without it. An invented
"87% of lifters" is worse than no statistic, both legally and because this
audience checks.
