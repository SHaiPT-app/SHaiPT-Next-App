import {
  fadeInUp,
  fadeInDown,
  fadeInLeft,
  fadeInRight,
  scaleIn,
  staggerContainer,
  pageTransition,
  pageFade,
  tapScale,
  hoverScale,
  hoverGlow,
  pulseVariant,
  shimmer,
  overlayVariant,
  modalVariant,
  springTransition,
  smoothTransition,
} from "@/lib/animations"

describe("Animation Variants", () => {
  // ─── Scroll-Triggered Reveal Variants ──────────────────────────────────────

  describe("fadeInUp", () => {
    it("has correct hidden state", () => {
      expect(fadeInUp.hidden).toEqual({ opacity: 0, y: 30 })
    })

    it("has correct visible state", () => {
      expect(fadeInUp.visible).toMatchObject({ opacity: 1, y: 0 })
    })
  })

  describe("fadeInDown", () => {
    it("has correct hidden state", () => {
      expect(fadeInDown.hidden).toEqual({ opacity: 0, y: -30 })
    })

    it("has correct visible state", () => {
      expect(fadeInDown.visible).toMatchObject({ opacity: 1, y: 0 })
    })
  })

  describe("fadeInLeft", () => {
    it("has correct hidden state", () => {
      expect(fadeInLeft.hidden).toEqual({ opacity: 0, x: -30 })
    })

    it("has correct visible state", () => {
      expect(fadeInLeft.visible).toMatchObject({ opacity: 1, x: 0 })
    })
  })

  describe("fadeInRight", () => {
    it("has correct hidden state", () => {
      expect(fadeInRight.hidden).toEqual({ opacity: 0, x: 30 })
    })

    it("has correct visible state", () => {
      expect(fadeInRight.visible).toMatchObject({ opacity: 1, x: 0 })
    })
  })

  describe("scaleIn", () => {
    it("has correct hidden state", () => {
      expect(scaleIn.hidden).toEqual({ opacity: 0, scale: 0.9 })
    })

    it("has correct visible state", () => {
      expect(scaleIn.visible).toMatchObject({ opacity: 1, scale: 1 })
    })
  })

  describe("staggerContainer", () => {
    it("has hidden state with opacity 0", () => {
      expect(staggerContainer.hidden).toEqual({ opacity: 0 })
    })

    it("has visible state with stagger children config", () => {
      const visible = staggerContainer.visible as Record<string, unknown>
      expect(visible.opacity).toBe(1)
      const transition = visible.transition as Record<string, unknown>
      expect(transition.staggerChildren).toBe(0.1)
      expect(transition.delayChildren).toBe(0.05)
    })
  })

  // ─── Page Transition Variants ──────────────────────────────────────────────

  describe("pageTransition", () => {
    it("has initial, animate, and exit states", () => {
      expect(pageTransition.initial).toBeDefined()
      expect(pageTransition.animate).toBeDefined()
      expect(pageTransition.exit).toBeDefined()
    })

    it("initial state starts invisible and offset", () => {
      expect(pageTransition.initial).toEqual({ opacity: 0, y: 12 })
    })

    it("animate state is fully visible", () => {
      expect(pageTransition.animate).toMatchObject({ opacity: 1, y: 0 })
    })

    it("exit state fades out with offset", () => {
      expect(pageTransition.exit).toMatchObject({ opacity: 0, y: -12 })
    })
  })

  describe("pageFade", () => {
    it("has all three states", () => {
      expect(pageFade.initial).toBeDefined()
      expect(pageFade.animate).toBeDefined()
      expect(pageFade.exit).toBeDefined()
    })

    it("transitions opacity only", () => {
      expect(pageFade.initial).toEqual({ opacity: 0 })
      expect(pageFade.animate).toMatchObject({ opacity: 1 })
      expect(pageFade.exit).toMatchObject({ opacity: 0 })
    })
  })

  // ─── Micro-Interaction Variants ────────────────────────────────────────────

  describe("tapScale", () => {
    it("scales down on tap", () => {
      expect(tapScale.whileTap.scale).toBe(0.96)
    })
  })

  describe("hoverScale", () => {
    it("scales up on hover", () => {
      expect(hoverScale.whileHover.scale).toBe(1.03)
    })
  })

  describe("hoverGlow", () => {
    it("applies neon blue glow on hover", () => {
      expect(hoverGlow.whileHover.boxShadow).toContain("rgba(0, 212, 255")
    })
  })

  describe("pulseVariant", () => {
    it("has idle and pulse states", () => {
      expect(pulseVariant.idle).toEqual({ scale: 1 })
      expect(pulseVariant.pulse).toMatchObject({
        scale: [1, 1.05, 1],
      })
    })
  })

  describe("shimmer", () => {
    it("has idle and shimmer states", () => {
      expect(shimmer.idle).toEqual({ opacity: 0.5 })
    })

    it("shimmer state repeats infinitely", () => {
      const shimmerState = shimmer.shimmer as Record<string, unknown>
      const transition = shimmerState.transition as Record<string, unknown>
      expect(transition.repeat).toBe(Infinity)
    })
  })

  // ─── Overlay / Modal Variants ──────────────────────────────────────────────

  describe("overlayVariant", () => {
    it("has hidden, visible, and exit states", () => {
      expect(overlayVariant.hidden).toEqual({ opacity: 0 })
      expect(overlayVariant.visible).toMatchObject({ opacity: 1 })
      expect(overlayVariant.exit).toMatchObject({ opacity: 0 })
    })
  })

  describe("modalVariant", () => {
    it("has hidden state with reduced scale", () => {
      expect(modalVariant.hidden).toMatchObject({
        opacity: 0,
        scale: 0.95,
        y: 10,
      })
    })

    it("has visible state at full scale", () => {
      expect(modalVariant.visible).toMatchObject({
        opacity: 1,
        scale: 1,
        y: 0,
      })
    })

    it("visible state uses spring transition", () => {
      const visible = modalVariant.visible as Record<string, unknown>
      const transition = visible.transition as Record<string, unknown>
      expect(transition.type).toBe("spring")
    })
  })

  // ─── Shared Transitions ────────────────────────────────────────────────────

  describe("springTransition", () => {
    it("is a spring type with stiffness and damping", () => {
      expect(springTransition).toEqual({
        type: "spring",
        stiffness: 300,
        damping: 30,
      })
    })
  })

  describe("smoothTransition", () => {
    it("is a tween with easeOut", () => {
      expect(smoothTransition).toEqual({
        type: "tween",
        ease: "easeOut",
        duration: 0.4,
      })
    })
  })
})
