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

/**
 * Polyfill matchMedia for jsdom.
 *
 * jsdom does not implement it, and any component that asks about a media query — a responsive
 * hook, or a `prefers-reduced-motion` check, which is how framer-motion decides whether to
 * animate — throws "window.matchMedia is not a function" the moment it renders. That takes the
 * whole suite down on render, so the failure never looks like what it is.
 *
 * Everything reports as not matching, which is the right default: tests then see the desktop
 * layout and motion enabled, the same as the CI browser would. A test that needs a query to match
 * should spy on this rather than rely on a global.
 */
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: (query: string): MediaQueryList => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: () => {},      // deprecated, still called by older libraries
            removeListener: () => {},   // deprecated
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
        } as MediaQueryList),
    })
}
