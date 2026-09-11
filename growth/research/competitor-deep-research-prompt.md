# Deep-research prompt: the market around 4Dcoach (3D reconstruction and form analysis)

Paste everything between the two horizontal rules into a fresh deep-research session
(Claude Research, ChatGPT Deep Research, or Gemini Deep Research). One prompt, one session;
do not build it up over several turns. If the tool shows a plan first, add anything missing
before it runs. When it finishes, put the report in `growth/research/` next to this file.

---

<context>
I am Ali, the solo founder of SHaiPT (shaipt.com), an AI personal-training web app that is
invite-only and building a waitlist in the US and Canada. The core feature is 4Dcoach. I need a
complete, evidence-based map of every product that overlaps with it, so I can position it
honestly, price it, and know who might partner with or acquire it. My whole budget is $400 a
month, so the report's recommendations must be things one person can act on cheaply.

What 4Dcoach does today (treat this as my claim, not as a verified fact; do not repeat it back
as if it were established):

- The user films one set of bench press, squat, deadlift, dumbbell lateral raise or barbell
  curl on a phone, from any angle, handheld. No wearable, no fixed camera, no hardware.
- Pose estimation runs in the browser on the phone (YOLO11n-pose for 2D joints, MediaPipe Pose
  for 3D limbs). The lift is rebuilt as an animated 3D avatar the user can orbit, scrub, slow
  down and loop, synced to the video with a landmark overlay. This is what "4D" means: 3D over
  time.
- From the video alone it produces rep count, eccentric and concentric time per rep, range of
  motion, bar path, a technique score out of 100, per-rep form warnings in plain language,
  reps-in-reserve estimated from concentric bar-speed loss, and load history per exercise.
- Optionally, a 20 to 30 second walk-around clip of the gym is turned into a 3D Gaussian Splat
  (COLMAP plus Brush) on the user's own laptop, and later sets are replayed inside that room.
  On iPhone the avatar can be placed on the real bench through AR Quick Look (USDZ).
- Lift analysis never leaves the device. The room and 3D-body extras go to the user's own
  laptop server, not a cloud.
- Not built yet: MP4 export, AI-written coaching text, a reference-lift "ghost", cloud
  processing.

What I already know, so the report should go beyond it rather than rediscover it: I have a
seed list of names across five categories (camera form-check apps, velocity-based training,
coach platforms, 3D-capture and spatial companies, and the research models 4Dcoach builds on).
The seed list is in the requirements below. The positioning I am testing is: "the only
phone-only product that turns a single video of a barbell lift into a measurable 3D replay,
with no wearable, no fixed camera and no hardware subscription." I want the evidence that
supports or breaks that sentence.
</context>

<research_question>
Which products on the market or credibly announced between 2022 and 2026 turn ordinary phone
video of a strength-training lift into form feedback, and which of those go further into 3D or
4D: monocular 3D pose, an orbitable avatar replay, or reconstruction of the room around the
lifter? For each one: what exactly it reconstructs, from what input, on what hardware, at what
price, how accurate it has been shown to be, and how it is doing commercially.

A successful answer lets me (a) name the three to five closest competitors and state, on
verifiable technical points, how 4Dcoach differs; (b) know what price this market actually
bears; (c) know which competitor claims are unproven; (d) list who might license a
"film your set" module or acquire the company; and (e) see the gaps nobody fills, ranked by
evidence of demand.
</research_question>

<scope>
- Domains: consumer fitness apps; online coaching platforms; velocity-based training (VBT);
  computer-vision sports technology; 3D reconstruction and spatial computing; academic and
  open-source work on 3D human pose and mesh recovery for sport, and on Gaussian splatting or
  NeRF for dynamic humans.
- Time frame: products and papers from 2022 to 2026. Older products only if still sold and
  updated.
- Geography: global products. Report availability and pricing for the US and Canada in USD.
- Source order: primary sources first (product websites, App Store and Google Play listings
  with version history and review counts, pricing pages, changelogs, developer documentation,
  demo videos, patents, funding databases such as Crunchbase or PitchBook summaries, press
  releases); then user evidence (App Store and Play 1-to-3-star reviews, Reddit r/weightroom,
  r/powerlifting, r/Fitness, r/bodybuilding, r/strength_training, YouTube reviews); then trade
  and general press; then peer-reviewed validation studies (PubMed, arXiv, CVPR, ICCV, ECCV,
  Journal of Strength and Conditioning Research, Sports Biomechanics).
- Exclude: wearable-only or bar-sensor-only VBT devices that have no camera product (list them
  in one table row each only if they have announced a camera tier); workout loggers with no
  video analysis; running, golf, yoga, cycling or physiotherapy apps unless their 3D-from-video
  technology is directly transferable to barbell lifts, in which case give them one paragraph
  in the 3D section; anything discontinued before 2022.
</scope>

<depth>
Before searching, write a short taxonomy of the category (input type, output type, processing
location, buyer) and use it to organise the search. Start with broad queries to see the whole
landscape, then narrow to each product.

Investigate these sub-questions:

1. Landscape. Every product that gives form feedback on strength-training lifts from a camera.
   For each: name, company, headquarters, year founded, funding and investors, platforms
   (iOS, Android, web, dedicated hardware), input (single handheld phone video, fixed phone,
   multiple cameras, depth or LiDAR sensor, hardware camera), exercises covered, processing
   location (on-device or cloud), output tier (2D skeleton overlay only; 3D joint positions;
   3D avatar or mesh replay; room or scene reconstruction; AR placement), price and model,
   stated users or downloads, review count and average, date of last update, and whether it
   is shipped, in beta, announced or demo-only.
2. The 3D tier in detail. Who recovers 3D pose or a 3D body mesh from a single phone video of
   a lift? Who lets the user orbit or scrub a replay? Who reconstructs the environment
   (Gaussian splatting, NeRF, photogrammetry) around a person? Who places a replay in AR? Where
   the method is disclosed, name it (MediaPipe, MoveNet, SMPL or HMR-based mesh recovery,
   SAM 3D Body, multi-view triangulation, depth sensor) and cite the disclosure.
3. Metrics and validation. Who computes rep count, tempo, range of motion, bar path, bar
   velocity or reps-in-reserve from video alone? What accuracy do they claim, and has anyone
   validated them against a linear position transducer or marker-based motion capture? Cite
   the studies, sample sizes and error figures.
4. Pricing and business models. Monthly and annual prices, free-tier contents, hardware
   bundles, coach or team pricing, and any disclosed retention, churn, LTV or CAC figures.
5. Voice of the customer. The recurring complaints and requests in low-star reviews and forum
   threads: setup friction, camera placement, accuracy, false form flags, battery, privacy,
   price. Quote and link.
6. Coach platforms. Whether TrueCoach, Trainerize, Everfit, Hevy, Strong, Fitbod and similar
   platforms offer video review or form analysis, any roadmap signals, and any partnerships or
   acquisitions in this space from 2022 to 2026.
7. Adjacent entrants and acquirers. VBT companies adding camera tiers; Apple, Google and Meta
   fitness efforts; Peloton, Tonal and Tempo; 3D-capture companies (Luma AI, Polycam,
   Scaniverse, Kiri Engine); markerless motion-capture companies (Move.ai, Uplift Labs,
   Sportsbox AI, DARI Motion, Physimax). Every sports-technology or fitness-app acquisition
   from 2022 to 2026 with a disclosed price, and the multiples if reported.
8. Licensing constraints on a paid product built from open models: Ultralytics YOLO11 (AGPL
   and the enterprise licence), MediaPipe (Apache 2.0), Meta SAM 3 and SAM 3D Body (their
   specific licence terms and gating), Brush and COLMAP. Where competitors disclose how they
   handle this, say so.
9. Claims, privacy and regulation. How competitors word accuracy and safety claims; any FTC
   actions, app-store rejections or advertising-policy issues in this category; whether each
   product processes video on-device or uploads it, and what its privacy policy says about
   video retention.
10. Gaps. What nobody does yet, ranked by evidence of demand: search volume where obtainable,
    forum requests, reviews asking for it.

Compare throughout: 2D overlay versus 3D reconstruction; on-device versus cloud; consumer
versus coach-facing; hardware versus phone-only. Quantify wherever a number exists.
</depth>

<output_structure>
1. Executive summary: at most ten bullets, the five closest competitors, and a one-sentence
   verdict on whether the evidence supports the positioning sentence in the context.
2. Landscape table: one row per product with the fields from sub-question 1. Expect 15 to 40
   rows. Every cell that is a vendor claim is marked as such.
3. The 3D and 4D tier: a profile of every product that does 3D pose, avatar replay, scene
   reconstruction or AR placement, then a side-by-side against 4Dcoach on those technical
   points only, with links to demos or screenshots.
4. Metric accuracy and validation evidence.
5. Pricing and business-model table with observations.
6. Voice of the customer: complaints and requests with quotes and links.
7. Coach platforms and B2B demand signals.
8. Potential partners and acquirers, with the reason for each and any relevant deal.
9. Licensing, claims, privacy and regulatory constraints.
10. Gaps and opportunities, ranked, with the evidence for each.
11. Limitations, unverified items and a confidence level per section.
12. Recommended next steps for a solo founder with $400 a month.
Appendix: the full source list with URLs and access dates, and the search queries used.
</output_structure>

<requirements>
- Cite every factual claim with a URL. Mark a claim [UNVERIFIED] when the only source is the
  vendor. Mark [CONFLICTING] where sources disagree, present both, and say which is more
  credible and why.
- Distinguish shipped from announced from demo-only, and check whether each product still
  exists: last app-store update, last blog post, whether the site resolves.
- If a number cannot be found, say so. No estimates unless labelled with the method.
- Be thorough and comprehensive. Aim to find every product in the category, not a top five.
  Go beyond the basics: read the changelogs, the low-star reviews and the papers, not just
  the home pages.
- Search terms to start from, then widen: "AI form check app", "barbell form analysis app",
  "computer vision weightlifting app", "3D pose estimation weightlifting", "monocular 3D human
  mesh recovery sport", "bar path tracking app", "bar speed from video app", "velocity based
  training camera", "markerless motion capture phone", "gaussian splatting fitness",
  "4D human reconstruction", "MediaPipe pose fitness app", "SAM 3D Body sport", "AR workout
  replay", "lifting technique score app".
- Seed names to check (verify each still exists; add every other name you find): Onform,
  Asensei, Kemtai, Zenia, Tempo, Tonal, Peloton Guide, Apple Fitness+, GymAware, Flex by
  GymAware, Vitruve, RepOne, Metric VBT, Perch, Vmaxpro, WL Analysis, Iron Path, Hudl
  Technique, Exer Labs, Sency, Kaia Health, Vay, Wondercise, Freeletics, Fitbod, Hevy, Strong,
  TrueCoach, Trainerize, Everfit, Luma AI, Polycam, Scaniverse, Kiri Engine, Move.ai, Uplift
  Labs, Sportsbox AI, Mustard, Physimax, DARI Motion, Meta SAM 3D Body.
- Do not treat the 4Dcoach description as verified. Report what competitors do; I will make
  the comparison honestly myself.
- Audience is one technical founder. Plain, factual tone, no marketing language, USD
  throughout, Markdown with tables where the structure above asks for them.
</requirements>

---
