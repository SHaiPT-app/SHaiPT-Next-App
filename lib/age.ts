/**
 * The minimum age to hold a SHaiPT account, in one place so the form, the database trigger and
 * the terms of service cannot drift apart.
 *
 * WHY 18. It is a judgement call, not a legal constant, and lowering it is a one-line change here
 * plus the matching line in supabase/migrations/0180_age_gate_and_media_cleanup.sql. Three things
 * pushed it to 18 rather than the 13 that COPPA alone would require:
 *   - the app stores progress photos and videos of people's bodies,
 *   - it sells subscriptions, and a minor cannot form that contract,
 *   - it prescribes barbell training, where bad advice injures people.
 * A lower bar (16 is the common alternative) is defensible, but it brings parental-consent
 * questions with it, so it should be a decision Ali makes deliberately rather than inherits.
 */
export const MINIMUM_AGE = 18;

/** Whole years between `dob` and `now`, or null when the date is missing or unparseable. */
export function ageInYears(dob: string | null | undefined, now: Date = new Date()): number | null {
    if (!dob) return null;
    const born = new Date(dob);
    if (Number.isNaN(born.getTime())) return null;
    if (born > now) return null;

    let age = now.getFullYear() - born.getFullYear();
    const monthDelta = now.getMonth() - born.getMonth();
    // Birthday not reached yet this year.
    if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < born.getDate())) age -= 1;
    return age;
}

/** True when `dob` is a real date that puts the person at or over MINIMUM_AGE. */
export function meetsMinimumAge(dob: string | null | undefined, now: Date = new Date()): boolean {
    const age = ageInYears(dob, now);
    return age !== null && age >= MINIMUM_AGE;
}

/** The latest date of birth that still qualifies — for a date input's `max` attribute. */
export function latestQualifyingDob(now: Date = new Date()): string {
    const d = new Date(now);
    d.setFullYear(d.getFullYear() - MINIMUM_AGE);
    return d.toISOString().slice(0, 10);
}
