# Test debt

`pnpm test` is **18 suites / 92 tests red**, out of 82 suites and 908 tests. 816 pass.

This file is the working list. Update the counts at the top of each section as they come down,
and delete a row when its suite goes green.

Last measured: 2026-09-11.

## What is actually wrong

Almost none of this is a broken product. The suite is asserting **a version of SHaiPT that no
longer exists** — it was written before the v2 rebrand and the landing rewrite, and was never
brought forward. The clearest single proof is in `animations.test.ts`:

```
Expected substring: "rgba(255, 102, 0"     <- the old neon orange
Received string:    "0 0 20px rgba(218, 0, 35, 0.4)"   <- --brand, #da0023
```

The code is right and the test is old. That pattern repeats: assertions on landing copy that was
rewritten ("Why SHaiPT?", "Ready to Transform Your Training?", "Choose Your Plan", "Most Popular"),
and `data-testid` hooks that the rewritten components no longer carry (`hero`, `view-form-btn`,
`tab-photos`, `tab-analytics`, `interview-chat`, `intake-form`).

So the work is mostly **re-pointing tests at the current UI**, not fixing bugs. Two caveats, and
they are why this cannot simply be bulk-deleted:

- A test asserting missing copy might be catching a real regression. Each one needs a look at the
  component before its expectation is rewritten.
- `AICoachChat` fails with *"Element type is invalid ... you might have mixed up default and named
  imports"*, which is a broken import or mock rather than stale copy. That one is a real defect in
  the test setup and is worth doing first — it is 24 tests across two files.

## Fixed so far

- [x] **`window.matchMedia is not a function`** — jsdom does not implement it, so any component
  asking about a media query (including framer-motion's `prefers-reduced-motion` check) threw on
  render. Polyfilled in `jest.setup.ts`. Occurrences went 4 -> 0. It did not flip a suite green on
  its own; `Home.test.tsx` still fails for other reasons.

## The list

Counts are failing tests per suite and total 92. Ordered by size, which is roughly the order
that clears the most red per hour.

| Suite | Fails | Likely cause |
|---|---:|---|
| `LoginForm.test.tsx` | 14 | Whole suite red, including tests unrelated to the sign-up form. Check the render/mock setup before the assertions. **Note: this suite was already 12/12 red before the age-gate field was added on 2026-09-11 — the new date-of-birth input is not what broke it, but it does mean the suite must be re-pointed at a form that now has an extra required field.** |
| `AICoachChat.test.tsx` | 13 | "Element type is invalid" — broken import or mock, not stale copy. Do this first. |
| `ai-coach/AICoachChat.test.tsx` | 11 | Same cause as above; the two files are near-duplicates and one of them should probably go. |
| `CoachSelectionPage.test.tsx` | 11 | Missing `data-testid="hero"` and friends. |
| `Dashboard.test.tsx` | 8 | Stale copy assertions. |
| `trainer-client-progress.test.tsx` | 7 | Missing `data-testid="tab-analytics"`, `tab-photos`. |
| `CoachInterviewPage.test.tsx` | 5 | Missing `data-testid="interview-chat"`. |
| `trainer-dashboard.test.tsx` | 5 | Stale copy / test ids. |
| `DirectMessageThread.test.tsx` | 3 | Looks for a "Send" control that has been renamed. |
| `DietitianInterview.test.tsx` | 3 | Stale copy. |
| `landing/Comparison.test.tsx` | 2 | Asserts "Why SHaiPT?" — the section was rewritten. |
| `Home.test.tsx` | 2 | Missing test ids. Was also hitting the matchMedia bug, now fixed. |
| `landing/Footer.test.tsx` | 2 | Stale copy. |
| `landing/Pricing.test.tsx` | 2 | Asserts "Choose Your Plan" / "Most Popular" — rewritten. |
| `IntakePhotoUpload.test.tsx` | 1 | Missing `data-testid="intake-form"`. |
| `workout-execution.test.tsx` | 1 | Assertion mismatch. |
| `seo-metadata.test.ts` | 1 | Assertion mismatch. |
| `animations.test.ts` | 1 | Asserts the retired neon-orange palette; should assert `--brand`. |

## Related, not counted here

- `npx tsc --noEmit` reports 4 type errors, all in `__tests__/` —
  `InterviewPlanView.test.tsx` (3, fixtures missing `exercise_id`, `fourd_id`, `primary_muscles`,
  `equipment` from `ResolvedExercise`) and `requireSubscription.test.ts` (1, a fixture missing
  `tester`). These are fixtures that drifted from their types, and they do not fail the suite.
- `pnpm db:rls-check` is green and should be kept that way — it is the only check that proves one
  user cannot read another's rows. It was green for months while asserting the opposite of what
  was wanted (see migration `0170`), so treat it as load-bearing and read what it asserts, not
  just its exit code.
