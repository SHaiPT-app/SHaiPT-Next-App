/**
 * OpenAI API prices, USD per one million tokens, standard tier, text.
 * Read from https://developers.openai.com/api/docs/pricing on 2026-09-07. Re-read before trusting.
 *
 * Used only to estimate cost_usd in ai_usage / ai_budget; the real bill comes from the OpenAI
 * dashboard. Unknown models fall back to the flagship row so the budget errs on the high side.
 */
export interface ModelPrice {
    input: number;
    output: number;
    cached: number;
    readAt: string;
}

export const PRICES: Record<string, ModelPrice> = {
    'gpt-5-nano': { input: 0.05, output: 0.40, cached: 0.005, readAt: '2026-09-07' },
    'gpt-5-mini': { input: 0.25, output: 2.00, cached: 0.025, readAt: '2026-09-07' },
    'gpt-5': { input: 1.25, output: 10.00, cached: 0.125, readAt: '2026-09-07' },
    'gpt-5.4-nano': { input: 0.20, output: 1.25, cached: 0.02, readAt: '2026-09-07' },
    'gpt-5.4-mini': { input: 0.75, output: 4.50, cached: 0.075, readAt: '2026-09-07' },
    'gpt-5.5': { input: 5.00, output: 30.00, cached: 0.50, readAt: '2026-09-07' },
    'gpt-4o-mini': { input: 0.15, output: 0.60, cached: 0.075, readAt: '2026-09-07' },
};

const FALLBACK: ModelPrice = PRICES['gpt-5.5'];

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
