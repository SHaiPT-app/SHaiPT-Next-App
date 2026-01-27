import '@testing-library/jest-dom'

// Polyfill structuredClone for jsdom (required by Chakra UI v3)
if (typeof globalThis.structuredClone === 'undefined') {
    globalThis.structuredClone = <T>(val: T): T => {
        if (val === undefined) return undefined as T
        if (val === null) return null as T
        if (typeof val !== 'object') return val
        if (Array.isArray(val)) return val.map(item => globalThis.structuredClone(item)) as T
        const result: Record<string, unknown> = {}
        for (const key of Object.keys(val as Record<string, unknown>)) {
            result[key] = globalThis.structuredClone((val as Record<string, unknown>)[key])
        }
        return result as T
    }
}
