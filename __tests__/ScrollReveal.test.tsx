import { render, screen } from "@testing-library/react"
import { ScrollReveal } from "@/components/ScrollReveal"
import { fadeInLeft } from "@/lib/animations"

// Mock framer-motion to avoid animation side-effects in tests
jest.mock("framer-motion", () => ({
  motion: {
    div: (props: Record<string, unknown>) => {
      const {
        children,
        initial,
        whileInView,
        viewport,
        variants: _variants,
        className,
        ...rest
      } = props
      const vp = viewport as { once?: boolean; amount?: number } | undefined
      return (
        <div
          data-testid="motion-div"
          data-initial={initial as string}
          data-while-in-view={whileInView as string}
          data-viewport-once={vp?.once?.toString()}
          data-viewport-amount={vp?.amount?.toString()}
          className={className as string}
          {...rest}
        >
          {children as React.ReactNode}
        </div>
      )
    },
  },
}))

describe("ScrollReveal", () => {
  it("renders children", () => {
    render(
      <ScrollReveal>
        <p>Hello World</p>
      </ScrollReveal>
    )
    expect(screen.getByText("Hello World")).toBeInTheDocument()
  })

  it("wraps children in a motion.div", () => {
    render(
      <ScrollReveal>
        <p>Content</p>
      </ScrollReveal>
    )
    expect(screen.getByTestId("motion-div")).toBeInTheDocument()
  })

  it("uses hidden/visible animation states", () => {
    render(
      <ScrollReveal>
        <p>Content</p>
      </ScrollReveal>
    )
    const motionDiv = screen.getByTestId("motion-div")
    expect(motionDiv.getAttribute("data-initial")).toBe("hidden")
    expect(motionDiv.getAttribute("data-while-in-view")).toBe("visible")
  })

  it("defaults to once=true and amount=0.2", () => {
    render(
      <ScrollReveal>
        <p>Content</p>
      </ScrollReveal>
    )
    const motionDiv = screen.getByTestId("motion-div")
    expect(motionDiv.getAttribute("data-viewport-once")).toBe("true")
    expect(motionDiv.getAttribute("data-viewport-amount")).toBe("0.2")
  })

  it("accepts custom viewport props", () => {
    render(
      <ScrollReveal once={false} amount={0.5}>
        <p>Content</p>
      </ScrollReveal>
    )
    const motionDiv = screen.getByTestId("motion-div")
    expect(motionDiv.getAttribute("data-viewport-once")).toBe("false")
    expect(motionDiv.getAttribute("data-viewport-amount")).toBe("0.5")
  })

  it("accepts custom variants", () => {
    const { container } = render(
      <ScrollReveal variants={fadeInLeft}>
        <p>Content</p>
      </ScrollReveal>
    )
    // Component renders without error with custom variants
    expect(container.firstChild).toBeTruthy()
  })

  it("passes className to the wrapper", () => {
    render(
      <ScrollReveal className="custom-class">
        <p>Content</p>
      </ScrollReveal>
    )
    const motionDiv = screen.getByTestId("motion-div")
    expect(motionDiv.className).toBe("custom-class")
  })
})
