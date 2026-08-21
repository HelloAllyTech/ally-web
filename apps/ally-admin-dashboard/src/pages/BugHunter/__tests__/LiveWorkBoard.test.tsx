import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const useGetBugHuntRunsQuery = vi.fn(() => ({ data: { items: [] } }));
const useGetBugHuntRunQuery = vi.fn(() => ({ data: { events: [] } }));

vi.mock("@api", () => ({
  useGetBugHuntRunsQuery: (...args: unknown[]) => useGetBugHuntRunsQuery(...(args as [])),
  useGetBugHuntRunQuery: (...args: unknown[]) => useGetBugHuntRunQuery(...(args as [])),
}));

// See NeedsYouQueue's note: @constants reads `cellTypes` off this barrel at
// module-eval time. The avatar is imported by its own path and stays real.
vi.mock("@components", () => ({ cellTypes: {} }));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}));

// Real motion timing isn't what these assertions are about, but `motion.div`
// has to exist: the dense rail every in-flight row draws is built from one.
// `initial`/`animate`/`transition` are dropped rather than spread — React warns
// about `initial={false}` on a real <div>, and the warning is the mock's, not
// the component's.
vi.mock("framer-motion", () => {
  // Defined inside the factory: `vi.mock` is hoisted above this file's own
  // declarations, so a helper referenced from out here would be in its TDZ by
  // the time the factory runs.
  const strip = ({ initial, animate, transition, ...rest }: any) => rest;
  return {
    motion: {
      div: (props: any) => <div {...strip(props)} />,
      span: (props: any) => <span {...strip(props)} />,
    },
    useReducedMotion: () => false,
  };
});

import {
  BugFinding,
  BugFindingSource,
  BugFindingStatus,
  BugHuntEventStage,
  BugHuntRunStatus,
} from "@types";

import { LiveWorkBoard } from "../LiveWorkBoard";
import { LIVE_WORK_LINGER_MS } from "../liveWork";

const finding = (overrides: Partial<BugFinding> & { id: string }): BugFinding =>
  ({
    runId: null,
    repo: "ally-be",
    source: BugFindingSource.CODE_REVIEW,
    title: `Bug ${overrides.id}`,
    description: "",
    status: BugFindingStatus.FIXING,
    createdAt: "2026-08-21T11:00:00.000Z",
    updatedAt: "2026-08-21T11:58:00.000Z",
    ...overrides,
  }) as unknown as BugFinding;

const onOpen = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-21T12:00:00.000Z"));
  onOpen.mockClear();
  useGetBugHuntRunsQuery.mockReturnValue({ data: { items: [] } } as never);
  useGetBugHuntRunQuery.mockReturnValue({ data: { events: [] } } as never);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("LiveWorkBoard — quiet when nothing is moving", () => {
  /**
   * The property the whole section rests on. A live board that is
   * present-but-empty manufactures the appearance of activity, which is the one
   * thing `agentPersona.ts`'s third voice rule forbids: it must never claim
   * work it hasn't done.
   */
  it("renders nothing at all when no bug is in flight and no sweep is running", () => {
    const { container } = render(
      <LiveWorkBoard
        findings={[
          finding({ id: "merged", status: BugFindingStatus.MERGED }),
          finding({ id: "waiting", status: BugFindingStatus.NEEDS_INPUT }),
        ]}
        onOpen={onOpen}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for an empty findings list", () => {
    const { container } = render(<LiveWorkBoard findings={[]} onOpen={onOpen} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("LiveWorkBoard — in-flight rows", () => {
  it("says what it is doing, per status, in its own voice", () => {
    render(
      <LiveWorkBoard
        findings={[finding({ id: "a", status: BugFindingStatus.FIXING })]}
        onOpen={onOpen}
      />,
    );

    expect(screen.getByRole("heading", { name: "On it right now" })).toBeInTheDocument();
    expect(screen.getByText(/I'm writing the fix now/)).toBeInTheDocument();
  });

  it("distinguishes a queued session from one actually being written", () => {
    render(
      <LiveWorkBoard
        findings={[finding({ id: "a", status: BugFindingStatus.QUEUED })]}
        onOpen={onOpen}
      />,
    );

    expect(screen.getByText(/starts as soon as a runner frees up/)).toBeInTheDocument();
    expect(screen.queryByText(/I'm writing the fix now/)).not.toBeInTheDocument();
  });

  /**
   * The rail is the reason a row exists rather than being another status pill,
   * and in dense form it has no visible stage names — so its accessible name is
   * the only thing that states the position.
   */
  it("names each bug's rail position for a screen reader", () => {
    render(
      <LiveWorkBoard
        findings={[finding({ id: "a", status: BugFindingStatus.RELEASING })]}
        onOpen={onOpen}
      />,
    );

    expect(
      screen.getByRole("group", { name: "Pipeline stage: Ship, step 6 of 6" }),
    ).toBeInTheDocument();
  });

  it("orders rows furthest along the rail first", () => {
    render(
      <LiveWorkBoard
        findings={[
          finding({ id: "queued", title: "Queued bug", status: BugFindingStatus.QUEUED }),
          finding({ id: "releasing", title: "Releasing bug", status: BugFindingStatus.RELEASING }),
        ]}
        onOpen={onOpen}
      />,
    );

    const titles = screen.getAllByRole("button", { name: /^Open bug:/ }).map(b => b.textContent);
    expect(titles).toEqual(["Releasing bug", "Queued bug"]);
  });

  it("opens the bug's drawer from its title", () => {
    render(
      <LiveWorkBoard findings={[finding({ id: "a", title: "Broken login" })]} onOpen={onOpen} />,
    );

    act(() => {
      screen.getByRole("button", { name: "Open bug: Broken login" }).click();
    });
    expect(onOpen).toHaveBeenCalledWith("a");
  });

  it("collapses past three, and states how many are hidden", () => {
    render(
      <LiveWorkBoard
        findings={Array.from({ length: 5 }, (_, index) =>
          finding({ id: `bug-${index}`, title: `Bug ${index}` }),
        )}
        onOpen={onOpen}
      />,
    );

    expect(screen.getAllByRole("button", { name: /^Open bug:/ })).toHaveLength(3);

    act(() => {
      screen.getByRole("button", { name: "Show 2 more" }).click();
    });
    expect(screen.getAllByRole("button", { name: /^Open bug:/ })).toHaveLength(5);
  });

  it("ticks a duration off the bug's own last-updated stamp", () => {
    render(<LiveWorkBoard findings={[finding({ id: "a" })]} onOpen={onOpen} />);

    // Two minutes between the fixture's updatedAt and the frozen clock.
    expect(screen.getByLabelText("2m on this step")).toBeInTheDocument();
  });
});

describe("LiveWorkBoard — the live sweep", () => {
  const liveRun = {
    id: "run-1",
    repo: "ally-be",
    status: BugHuntRunStatus.RUNNING,
    createdAt: "2026-08-21T11:57:00.000Z",
  };

  it("shows the sweep even when no individual bug is in flight yet", () => {
    useGetBugHuntRunsQuery.mockReturnValue({ data: { items: [liveRun] } } as never);

    render(<LiveWorkBoard findings={[]} onOpen={onOpen} />);

    expect(screen.getByText("I'm sweeping ally-be.")).toBeInTheDocument();
    expect(screen.getByLabelText("Sweeping for 3m")).toBeInTheDocument();
  });

  /**
   * The one row carrying a real event feed, and the reason it earns an extra
   * polled request: this is the actual last thing the agent did.
   */
  it("prints the newest event from the run's own timeline", () => {
    useGetBugHuntRunsQuery.mockReturnValue({ data: { items: [liveRun] } } as never);
    useGetBugHuntRunQuery.mockReturnValue({
      data: {
        events: [
          {
            id: "e1",
            stage: BugHuntEventStage.VERIFY,
            summary: "older thing",
            createdAt: "2026-08-21T11:58:00.000Z",
          },
          {
            id: "e2",
            stage: BugHuntEventStage.FINDER_RESULT,
            summary: "3 candidates in apps/api/src/auth",
            createdAt: "2026-08-21T11:59:30.000Z",
          },
        ],
      },
    } as never);

    render(<LiveWorkBoard findings={[]} onOpen={onOpen} />);

    expect(screen.getByText("Found")).toBeInTheDocument();
    expect(screen.getByText(/3 candidates in apps\/api\/src\/auth/)).toBeInTheDocument();
    expect(screen.queryByText(/older thing/)).not.toBeInTheDocument();
  });

  it("says nothing rather than a placeholder while the run has logged nothing", () => {
    useGetBugHuntRunsQuery.mockReturnValue({ data: { items: [liveRun] } } as never);

    render(<LiveWorkBoard findings={[]} onOpen={onOpen} />);

    expect(screen.getByText("I'm sweeping ally-be.")).toBeInTheDocument();
    expect(screen.queryByText("Found")).not.toBeInTheDocument();
  });

  it("ignores a finished run", () => {
    useGetBugHuntRunsQuery.mockReturnValue({
      data: { items: [{ ...liveRun, status: BugHuntRunStatus.COMPLETED }] },
    } as never);

    const { container } = render(<LiveWorkBoard findings={[]} onOpen={onOpen} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("LiveWorkBoard — landings", () => {
  /**
   * The section's payoff, and the thing that was invisible before it: a
   * completion used to be a 1.5s pill flash in a table you may not have been
   * scrolled to.
   */
  it("keeps a bug on the board, labelled with where it went, after it stops moving", () => {
    const { rerender } = render(
      <LiveWorkBoard
        findings={[finding({ id: "a", title: "Broken login", status: BugFindingStatus.FIXING })]}
        onOpen={onOpen}
      />,
    );

    rerender(
      <LiveWorkBoard
        findings={[finding({ id: "a", title: "Broken login", status: BugFindingStatus.MERGED })]}
        onOpen={onOpen}
      />,
    );

    expect(
      screen.getByText(/Merged to master. Putting it in front of users is your call./),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open bug: Broken login" })).toBeInTheDocument();
  });

  it("says what happens next for a landing that went red, not just a happy one", () => {
    const { rerender } = render(
      <LiveWorkBoard
        findings={[finding({ id: "a", status: BugFindingStatus.FIXING })]}
        onOpen={onOpen}
      />,
    );

    rerender(
      <LiveWorkBoard
        findings={[finding({ id: "a", status: BugFindingStatus.FAILED })]}
        onOpen={onOpen}
      />,
    );

    expect(
      screen.getByText(/That attempt went red. Whether I try again is your call./),
    ).toBeInTheDocument();
  });

  it("drops the landed row once the linger window is up, leaving the board empty", () => {
    const { container, rerender } = render(
      <LiveWorkBoard
        findings={[finding({ id: "a", status: BugFindingStatus.FIXING })]}
        onOpen={onOpen}
      />,
    );

    rerender(
      <LiveWorkBoard
        findings={[finding({ id: "a", status: BugFindingStatus.MERGED })]}
        onOpen={onOpen}
      />,
    );
    expect(screen.getByText(/Merged to master/)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(LIVE_WORK_LINGER_MS + 1_000);
    });

    expect(container).toBeEmptyDOMElement();
  });

  /**
   * Opening the tab on a table full of already-merged bugs must announce none
   * of them — same discipline as the bugs table's `freshIds`, which seeds on
   * mount rather than flashing twenty rows at once.
   */
  it("announces nothing from the first observation", () => {
    const { container } = render(
      <LiveWorkBoard
        findings={[finding({ id: "a", status: BugFindingStatus.MERGED })]}
        onOpen={onOpen}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("hides a landed row for a bug that has started moving again", () => {
    const { rerender } = render(
      <LiveWorkBoard
        findings={[finding({ id: "a", status: BugFindingStatus.FIXING })]}
        onOpen={onOpen}
      />,
    );

    rerender(
      <LiveWorkBoard
        findings={[finding({ id: "a", status: BugFindingStatus.MERGED })]}
        onOpen={onOpen}
      />,
    );
    expect(screen.getByText(/Merged to master/)).toBeInTheDocument();

    // The admin pressed "Release to production": in flight again.
    rerender(
      <LiveWorkBoard
        findings={[finding({ id: "a", status: BugFindingStatus.RELEASING })]}
        onOpen={onOpen}
      />,
    );

    expect(screen.queryByText(/Merged to master/)).not.toBeInTheDocument();
    expect(screen.getByText(/The release is running/)).toBeInTheDocument();
  });
});
