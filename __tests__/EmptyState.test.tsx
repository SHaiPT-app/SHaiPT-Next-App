import { render, screen, fireEvent } from "@testing-library/react"
import EmptyState from "@/components/EmptyState"
import { Dumbbell, ClipboardList, Activity } from "lucide-react"

describe("EmptyState", () => {
  it("renders the title", () => {
    render(
      <EmptyState
        icon={Dumbbell}
        title="No workouts yet"
        description="Create your first workout"
      />
    )
    expect(screen.getByText("No workouts yet")).toBeInTheDocument()
  })

  it("renders the description", () => {
    render(
      <EmptyState
        icon={Dumbbell}
        title="No data"
        description="Start by creating something new"
      />
    )
    expect(screen.getByText("Start by creating something new")).toBeInTheDocument()
  })

  it("has the data-testid attribute", () => {
    render(
      <EmptyState
        icon={Activity}
        title="Empty"
        description="Nothing here"
      />
    )
    expect(screen.getByTestId("empty-state")).toBeInTheDocument()
  })

  it("renders the glass-panel class", () => {
    render(
      <EmptyState
        icon={Dumbbell}
        title="Empty"
        description="Nothing here"
      />
    )
    expect(screen.getByTestId("empty-state")).toHaveClass("glass-panel")
  })

  it("renders action button when action prop is provided", () => {
    const onClick = jest.fn()
    render(
      <EmptyState
        icon={ClipboardList}
        title="No plans"
        description="Create a plan"
        action={{ label: "+ New Plan", onClick }}
      />
    )
    const button = screen.getByText("+ New Plan")
    expect(button).toBeInTheDocument()
    expect(button.tagName).toBe("BUTTON")
  })

  it("calls action onClick when button is clicked", () => {
    const onClick = jest.fn()
    render(
      <EmptyState
        icon={ClipboardList}
        title="No plans"
        description="Create a plan"
        action={{ label: "Create", onClick }}
      />
    )
    fireEvent.click(screen.getByText("Create"))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("does not render action button when action prop is not provided", () => {
    render(
      <EmptyState
        icon={Dumbbell}
        title="Empty"
        description="Nothing here"
      />
    )
    const buttons = screen.queryAllByRole("button")
    expect(buttons).toHaveLength(0)
  })
})
