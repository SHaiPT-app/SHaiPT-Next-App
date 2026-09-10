/** @jest-environment node */
/**
 * The response_format schema boundary.
 *
 * `json_schema` requires an object at the root. SplitsSchema is an array, so every call to
 * recommend_splits came back as
 *   400 Invalid schema for response_format 'result': schema must be a JSON Schema of
 *   'type: "object"', got 'type: "array"'
 * and plan generation was dead in production. These guard the envelope that fixes it.
 */
import { z } from 'zod';
import { responseSchema, unwrapEnvelope } from '@/lib/ai/gateway';
import { SplitsSchema, PlanSchema } from '@/lib/ai/plans';

describe('responseSchema', () => {
    it('passes an object schema through untouched at the root', () => {
        const json = responseSchema(z.object({ a: z.string() }));
        expect(json.type).toBe('object');
        expect(json.properties).toHaveProperty('a');
    });

    it('strips $schema, which the API rejects', () => {
        expect(responseSchema(z.object({ a: z.string() }))).not.toHaveProperty('$schema');
        expect(responseSchema(z.array(z.string()))).not.toHaveProperty('$schema');
    });

    it('wraps an array root in an object envelope', () => {
        const json = responseSchema(z.array(z.string())) as {
            type: string;
            properties: { items: { type: string } };
            required: string[];
        };
        expect(json.type).toBe('object');
        expect(json.properties.items.type).toBe('array');
        expect(json.required).toEqual(['items']);
    });

    it('gives every real schema an object root — the thing the API actually checks', () => {
        for (const schema of [SplitsSchema, PlanSchema]) {
            expect(responseSchema(schema).type).toBe('object');
        }
    });
});

describe('unwrapEnvelope', () => {
    it('takes the envelope off an array schema', () => {
        expect(unwrapEnvelope(z.array(z.string()), { items: ['a', 'b'] })).toEqual(['a', 'b']);
    });

    it('leaves object schemas alone', () => {
        const value = { items: ['a'] };
        expect(unwrapEnvelope(z.object({ items: z.array(z.string()) }), value)).toBe(value);
    });

    it('passes a bare array through, for a model that ignored the envelope', () => {
        expect(unwrapEnvelope(z.array(z.string()), ['a'])).toEqual(['a']);
    });

    it('round-trips the real splits payload back into SplitsSchema', () => {
        const splits = [
            { id: 'full_body', name: 'Full Body', description: 'x', days_per_week: 3, recommended: true },
            { id: 'upper_lower', name: 'Upper/Lower', description: 'y', days_per_week: 4, recommended: false },
        ];
        expect(() => SplitsSchema.parse(unwrapEnvelope(SplitsSchema, { items: splits }))).not.toThrow();
    });
});
