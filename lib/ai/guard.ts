/**
 * Keeps the intake interview an intake interview.
 *
 * The interview endpoint is the cheapest thing in the app to point at something else: it takes free
 * text, sends it to a model, and streams the answer back. Without a guard it is a free general
 * assistant for anyone with an account, billed to us.
 *
 * The caps in lib/ai/gateway (daily calls, daily tokens, monthly budget) limit the damage after the
 * fact. These limit it before the call is made: a screened-out answer costs nothing at all, which
 * is the only kind of rejection that actually helps.
 *
 * Two layers, deliberately:
 *   1. Length. A real intake answer is short — a name, a number, a sentence about a knee. Length is
 *      what abuse actually needs (a long prompt to work from), and it is the cap that cannot be
 *      argued with, so it is enforced on every user message, in history too.
 *   2. Intent. A small pattern list for the obvious cases — asking for code, essays, translations,
 *      or trying to talk past the system prompt. Kept tight on purpose: a false positive blocks a
 *      real client mid-signup, which is far worse than one cheap model call.
 *
 * The system prompt is the third layer and lives with the route. None of the three is sufficient
 * alone.
 */

/** Longest single answer. Comfortably fits an injury history; nowhere near enough to paste a task. */
export const MAX_ANSWER_CHARS = 500;

/** Longest the whole interview may run, in user messages. Seven topics do not need thirty answers. */
export const MAX_USER_MESSAGES = 30;

/** Total user-supplied characters across the interview. A second ceiling on context spend. */
export const MAX_TOTAL_USER_CHARS = 6_000;

export type Rejection =
    | { ok: true }
    | { ok: false; code: 'too_long' | 'too_many' | 'off_topic'; reply: string };

/**
 * Attempts to use the coach as a general-purpose assistant, or to talk past its instructions.
 *
 * Every pattern here has to be something that essentially cannot appear in an honest answer about
 * training history, equipment or injuries — that is the bar for adding one.
 */
const OFF_TOPIC = [
    // talking past the system prompt
    /\bignore (?:all |any )?(?:the )?(?:previous|prior|above|earlier)\b/i,
    /\bdisregard (?:all |any )?(?:the )?(?:previous|prior|above|earlier)\b/i,
    /\b(?:system|initial) prompt\b/i,
    /\byou are now\b/i,
    // "act as" and "pretend" only count as an instruction to the model — at the start of the
    // message or after please/can you. "I want to act as a training partner for my brother" is a
    // real answer, and blocking it would be worse than the abuse it looks like.
    /(?:^|[.!?]\s+|\bplease\s+|\bcan you\s+|\byou (?:should|will|must|can)\s+)(?:act as|pretend)\b/i,
    /\bjailbreak\b/i,
    // using it as a general assistant
    /\bwrite (?:me )?(?:a|an|the)? ?(?:essay|poem|story|article|email|letter|script|song)\b/i,
    /\btranslate\b.{0,20}\b(?:to|into)\b/i,
    /\b(?:write|generate|debug|fix|refactor|explain) (?:me )?(?:some |this |the )?code\b/i,
    /```/,
    /\b(?:SELECT|INSERT|UPDATE|DELETE)\s+.*\b(?:FROM|INTO|SET)\b/i,
    /\bdo my homework\b/i,
    /\bsolve (?:this|the following)\b/i,
];

const TOO_LONG_REPLY =
    `That is longer than I need. Keep answers under ${MAX_ANSWER_CHARS} characters — a sentence or two is plenty. What is the short version?`;

const OFF_TOPIC_REPLY =
    'I only handle your training intake here, so I cannot help with that. Let us get back to it — could you answer my last question?';

const TOO_MANY_REPLY =
    'We have gone well past what I need for your intake. Save what we have and I will build your plan from it.';

/**
 * Screens one answer before it costs anything.
 *
 * `reply` is what the coach says instead of the model's answer — the caller returns it as an
 * ordinary turn so the interview keeps its shape rather than dead-ending on an error.
 */
export function screenAnswer(text: string, userMessageCount = 0): Rejection {
    if (userMessageCount >= MAX_USER_MESSAGES) {
        return { ok: false, code: 'too_many', reply: TOO_MANY_REPLY };
    }
    if (text.length > MAX_ANSWER_CHARS) {
        return { ok: false, code: 'too_long', reply: TOO_LONG_REPLY };
    }
    for (const pattern of OFF_TOPIC) {
        if (pattern.test(text)) {
            return { ok: false, code: 'off_topic', reply: OFF_TOPIC_REPLY };
        }
    }
    return { ok: true };
}

export interface GuardedMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

/**
 * Truncates every user turn to the cap and drops the oldest once the transcript exceeds the total.
 *
 * Screening only the newest message would be pointless: the client sends the whole transcript on
 * every turn, so anything that got in once would be paid for on every turn after. Assistant turns
 * are ours and pass through.
 */
export function sanitizeHistory<T extends GuardedMessage>(messages: T[]): T[] {
    const capped = messages.map((m) =>
        m.role === 'user' && m.content.length > MAX_ANSWER_CHARS
            ? { ...m, content: m.content.slice(0, MAX_ANSWER_CHARS) }
            : m,
    );

    let total = 0;
    const kept: T[] = [];
    // Newest first, so the turns that survive a long transcript are the ones being answered.
    for (let i = capped.length - 1; i >= 0; i--) {
        const m = capped[i];
        if (m.role === 'user') {
            if (total + m.content.length > MAX_TOTAL_USER_CHARS) break;
            total += m.content.length;
        }
        kept.push(m);
    }
    return kept.reverse();
}
