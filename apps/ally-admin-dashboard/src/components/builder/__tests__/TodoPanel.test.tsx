import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// The spinner is the only Carbon import here, and it is what a finished run
// must stop rendering — so it is stubbed visibly rather than away.
vi.mock("@carbon/react", () => ({
  InlineLoading: () => <span data-testid="spinner" />,
}));

// eslint-disable-next-line import/first
import { TodoPanel } from "../TodoPanel";

/**
 * The checklist is agent-asserted: posted once from the plan, and re-sent as
 * work completes only if the agent remembers to. It frequently does not — the
 * first real build finished with two pull requests open while this panel still
 * read "0 of 7" with a spinner on item one.
 *
 * A finished run must therefore stop implying anything is in flight, without
 * inventing progress nobody reported.
 */
describe("TodoPanel", () => {
  const items = [
    { text: "First thing", status: "in_progress" as const },
    { text: "Second thing", status: "pending" as const },
  ];

  it("shows progress normally while the run is live", () => {
    render(<TodoPanel items={items} isLive />);
    expect(screen.getByText("0 of 2")).toBeInTheDocument();
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  /** The bug, stated as a test. */
  it("says the agent stopped reporting once the run has ended", () => {
    render(<TodoPanel items={items} isLive={false} />);

    expect(screen.getByText(/stopped reporting progress/)).toBeInTheDocument();
    expect(screen.queryByText("0 of 2")).toBeNull();
    // The spinner is the part that read as "still working" for half an hour.
    expect(screen.queryByTestId("spinner")).toBeNull();
  });

  /**
   * Inventing completion would be worse than losing track: it would claim work
   * was verified that nobody verified.
   */
  it("does not mark unreported items as done", () => {
    render(<TodoPanel items={items} isLive={false} />);
    expect(screen.getByText(/^0 of 2/)).toBeInTheDocument();
  });

  it("stays quiet when the list genuinely completed", () => {
    render(<TodoPanel items={[{ text: "Only thing", status: "done" as const }]} isLive={false} />);
    expect(screen.queryByText(/stopped reporting/)).toBeNull();
    expect(screen.getByText("1 of 1")).toBeInTheDocument();
  });

  it("renders nothing without a list", () => {
    const { container } = render(<TodoPanel items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
