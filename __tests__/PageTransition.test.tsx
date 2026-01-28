import { render, screen } from "@testing-library/react"
import { PageTransition } from "@/components/PageTransition"
import { pageFade } from "@/lib/animations"

// Mock framer-motion to avoid animation side-effects in tests
jest.mock("framer-motion", () => ({
  motion: {
    div: (props: Record<string, unknown>) => {
      const {
        children,
        initial,
        animate,
        exit,
        variants: _variants,
        className,
        ...rest
      } = props
      return (
        <div
          data-testid="motion-div"
          data-initial={initial as string}
          data-animate={animate as string}
          data-exit={exit as string}
          className={className as string}
          {...rest}
        >
          {children as React.ReactNode}
        </div>
      )
    },
  },
}))

describe("PageTransition", () => {
  it("renders children", () => {
    render(
      <PageTransition>
        <p>Page Content</p>
      </PageTransition>
    )
    expect(screen.getByText("Page Content")).toBeInTheDocument()
  })

  it("wraps children in a motion.div", () => {
    render(
      <PageTransition>
        <p>Content</p>
      </PageTransition>
    )
    expect(screen.getByTestId("motion-div")).toBeInTheDocument()
  })

  it("uses initial/animate/exit animation states", () => {
    render(
      <PageTransition>
        <p>Content</p>
      </PageTransition>
    )
    const motionDiv = screen.getByTestId("motion-div")
    expect(motionDiv.getAttribute("data-initial")).toBe("initial")
    expect(motionDiv.getAttribute("data-animate")).toBe("animate")
    expect(motionDiv.getAttribute("data-exit")).toBe("exit")
  })

  it("accepts custom variants", () => {
    const { container } = render(
      <PageTransition variants={pageFade}>
        <p>Content</p>
      </PageTransition>
    )
    expect(container.firstChild).toBeTruthy()
  })

  it("passes className to the wrapper", () => {
    render(
      <PageTransition className="page-wrapper">
        <p>Content</p>
      </PageTransition>
    )
    const motionDiv = screen.getByTestId("motion-div")
    expect(motionDiv.className).toBe("page-wrapper")
  })
})
