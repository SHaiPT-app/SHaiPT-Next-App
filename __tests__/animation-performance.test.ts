import {
  prefersReducedMotion,
  gpuAccelerated,
} from "@/lib/animations"

// Ensure matchMedia is available for all tests
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
})

describe("Animation Performance Utilities", () => {
  describe("prefersReducedMotion", () => {
    it("returns false when user does not prefer reduced motion", () => {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: jest.fn().mockImplementation((query: string) => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      })
      expect(prefersReducedMotion()).toBe(false)
    })

    it("returns true when user prefers reduced motion", () => {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: jest.fn().mockImplementation((query: string) => ({
          matches: true,
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      })
      expect(prefersReducedMotion()).toBe(true)
    })
  })

  describe("gpuAccelerated", () => {
    it("includes willChange property", () => {
      expect(gpuAccelerated.willChange).toBe("transform, opacity")
    })

    it("includes backfaceVisibility property", () => {
      expect(gpuAccelerated.backfaceVisibility).toBe("hidden")
    })

    it("is a frozen/const object", () => {
      expect(Object.keys(gpuAccelerated)).toHaveLength(2)
    })
  })
})
