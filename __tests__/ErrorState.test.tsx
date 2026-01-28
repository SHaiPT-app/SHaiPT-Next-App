import { render, screen, fireEvent } from "@testing-library/react"
import ErrorState from "@/components/ErrorState"

describe("ErrorState", () => {
  it("renders the default title", () => {
    render(<ErrorState message="An error occurred" />)
    expect(screen.getByText("Something went wrong")).toBeInTheDocument()
  })

  it("renders a custom title", () => {
    render(<ErrorState title="Load failed" message="Could not fetch data" />)
    expect(screen.getByText("Load failed")).toBeInTheDocument()
  })

  it("renders the error message", () => {
    render(<ErrorState message="Network connection lost" />)
    expect(screen.getByText("Network connection lost")).toBeInTheDocument()
  })

  it("has the data-testid attribute", () => {
    render(<ErrorState message="Error" />)
    expect(screen.getByTestId("error-state")).toBeInTheDocument()
  })

  it("renders retry button when onRetry is provided", () => {
    const onRetry = jest.fn()
    render(<ErrorState message="Failed" onRetry={onRetry} />)
    const button = screen.getByText("Try Again")
    expect(button).toBeInTheDocument()
  })

  it("calls onRetry when retry button is clicked", () => {
    const onRetry = jest.fn()
    render(<ErrorState message="Failed" onRetry={onRetry} />)
    fireEvent.click(screen.getByText("Try Again"))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it("does not render retry button when onRetry is not provided", () => {
    render(<ErrorState message="Failed" />)
    expect(screen.queryByText("Try Again")).not.toBeInTheDocument()
  })
})
