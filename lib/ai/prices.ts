/**
 * Gemini API prices, USD per one million tokens, paid tier, text input.
 * Read from https://ai.google.dev/gemini-api/docs/pricing on 2026-09-06. Re-read before trusting.
 *
 * Used only to estimate cost_usd in ai_usage / ai_budget; the real bill comes from Google Cloud.
 * Unknown models fall back to the most expensive row so the budget errs on the high side.
 */
export interface ModelPrice {
    input: number;
    output: number;
    cached: number;
    readAt: string;
}

export const PRICES: Record<string, ModelPrice> = {
    'gemini-2.5-flash-lite': { input: 0.10, output: 0.40, cached: 0.01, readAt: '2026-09-06' },
    'gemini-2.5-flash': { input: 0.30, output: 2.50, cached: 0.03, readAt: '2026-09-06' },
    'gemini-3.5-flash': { input: 1.50, output: 9.00, cached: 0.15, readAt: '2026-09-06' },
    'gemini-3.8-flash': { input: 0.75, output: 3.75, cached: 0.075, readAt: '2026-09-06' },
};

const FALLBACK: ModelPrice = PRICES['gemini-3.5-flash'];

export function priceFor(model: string): ModelPrice {
    return PRICES[model] ?? FALLBACK;
}

/** Cost in USD for one call. Cached prompt tokens are billed at the cached rate. */
export function estimateCost(model: string, inputTokens: number, outputTokens: number, cachedTokens = 0): number {
    const p = priceFor(model);
    const freshInput = Math.max(0, inputTokens - cachedTokens);
    const usd = (freshInput * p.input + cachedTokens * p.cached + outputTokens * p.output) / 1_000_000;
    return Math.round(usd * 1_000_000) / 1_000_000;
}
