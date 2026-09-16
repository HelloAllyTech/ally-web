import { Children, isValidElement } from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BuilderBudgetState } from "@types";

// @constants reads off the @components barrel at module-eval time (see the
// BugHunter tests), so the barrel is stubbed rather than loaded for real.
vi.mock("@components", () => ({ cellTypes: {} }));

// NOTE: mocking the design system away is what let a real Carbon contract
// violation ship. The banner rendered a <Button> INSIDE an InlineNotification,
// which Carbon forbids and throws on — but the mock below accepted children
// happily, so every test passed while the live page hit an error boundary.
// The mock now mirrors the real components' shape: the actionable variant takes
// its button as a PROP, so a child passed to it would go nowhere here too.
vi.mock("@ally-ui-mono/ui-shared", () => ({
  Button: Object.assign(
    ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
    { rendersInteractive: true },
  ),
  InlineNotification: ({ title, subtitle, children }: any) => {
    // Carbon throws on INTERACTIVE children only — a plain <ul> of hints is a
    // legitimate child and is used elsewhere in this app. Mirroring the real
    // rule rather than a stricter one, so this mock cannot reject a valid use.
    const interactive = (node: any): boolean =>
      Children.toArray(node).some((child: any) => {
        if (!isValidElement(child)) return false;
        // Raw tags, and design-system components that render one — the real bug
        // passed a <Button>, whose type is a function, so a tag-name check alone
        // sails straight past it.
        if (["button", "a", "input", "select", "textarea"].includes(child.type as string))
          return true;
        if ((child.type as any)?.rendersInteractive) return true;
        return interactive((child.props as any)?.children);
      });
    if (interactive(children))
      throw new Error("InlineNotification must have no interactive child nodes");
    return (
      <div>
        <p>{title}</p>
        {subtitle && <p>{subtitle}</p>}
        {children}
      </div>
    );
  },
  ActionableNotification: ({ title, subtitle, actionButtonLabel, onActionButtonClick }: any) => (
    <div>
      <p>{title}</p>
      {subtitle && <p>{subtitle}</p>}
      {actionButtonLabel && <button onClick={onActionButtonClick}>{actionButtonLabel}</button>}
    </div>
  ),
  Tag: ({ children }: any) => <span>{children}</span>,
  Tile: ({ children }: any) => <div>{children}</div>,
}));

// The feed, rail and panels are exercised by their own tests; what is under
// test here is the budget banner and what it does.
vi.mock("../BuildActivityFeed", () => ({ BuildActivityFeed: () => <div /> }));
vi.mock("../PhaseRail", () => ({ PhaseRail: () => <div /> }));
vi.mock("../RunHistoryRail", () => ({ RunHistoryRail: () => <div /> }));
vi.mock("../TodoPanel", () => ({ TodoPanel: () => <div /> }));
vi.mock("../QuestionCard", () => ({ QuestionCard: () => <div /> }));
vi.mock("../RaiseBudgetDialog", () => ({
  RaiseBudgetDialog: ({ isOpen }: any) => (isOpen ? <div>raise-budget-dialog</div> : null),
}));

vi.mock("@hooks", () => ({
  useBuilderSocket: () => ({ connected: true, markSeen: () => undefined }),
}));

let budget: BuilderBudgetState | undefined;
const fetchEvents = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({ events: [] }) });

vi.mock("@api", () => ({
  useGetBuilderRunsQuery: () => ({ data: [] }),
  useGetBuilderPendingQuestionsQuery: () => ({ data: [] }),
  useGetBuilderPullRequestsQuery: () => ({ data: [] }),
  useMergeBuilderPullRequestMutation: () => [vi.fn(), { isLoading: false }],
  useGetBuilderSessionBudgetQuery: () => ({ data: budget, refetch: vi.fn() }),
  useLazyGetBuilderRunEventsQuery: () => [fetchEvents],
  useAnswerBuilderQuestionMutation: () => [vi.fn(), { isLoading: false }],
}));

// eslint-disable-next-line import/first
import { BuildView } from "../BuildView";

const held: BuilderBudgetState = {
  budgetUsd: 15,
  spentUsd: 16.7668,
  remainingUsd: 0,
  exceeded: true,
  holdSeconds: 1200,
  pollSeconds: 15,
  hold: {
    runId: "run-3",
    heldAt: new Date().toISOString(),
    // Deliberately a live clock: the countdown is computed against `now`, and a
    // fixed past timestamp would render the expiry copy instead.
    holdUntil: new Date(Date.now() + 18 * 60_000).toISOString(),
  },
};

const renderView = () =>
  render(<BuildView sessionId="session-1" status="BUILDING" currentStage="CODING" />);

describe("BuildView budget banner", () => {
  beforeEach(() => {
    budget = undefined;
  });

  it("offers the raise where the hold is, with the deadline attached", () => {
    budget = held;
    renderView();

    expect(screen.getByText("Paused — this build has spent its budget")).toBeTruthy();
    expect(screen.getByText(/About 18 minutes left/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Raise budget" })).toBeTruthy();
  });

  it("opens the raise dialog from the banner", () => {
    budget = held;
    renderView();

    fireEvent.click(screen.getByRole("button", { name: "Raise budget" }));

    expect(screen.getByText("raise-budget-dialog")).toBeTruthy();
  });

  it("warns one phase early — past the ceiling but still coding", () => {
    budget = { ...held, hold: null };
    renderView();

    expect(screen.getByText("Spend is past the ceiling")).toBeTruthy();
    expect(screen.getByText(/pause at the end of the current phase/)).toBeTruthy();
  });

  it("says the work is already gone once the window has closed", () => {
    budget = {
      ...held,
      hold: { ...held.hold!, holdUntil: new Date(Date.now() - 60_000).toISOString() },
    };
    renderView();

    expect(screen.getByText(/the work in progress is gone/)).toBeTruthy();
  });

  it("stays out of the way while the build is inside its budget", () => {
    budget = { ...held, spentUsd: 4, budgetUsd: 15, remainingUsd: 11, exceeded: false, hold: null };
    renderView();

    expect(screen.queryByText("Paused — this build has spent its budget")).toBeNull();
    expect(screen.queryByText("Spend is past the ceiling")).toBeNull();
  });

  it("drops a stale held banner once the run has ended on its own", () => {
    // The budget query stops polling once the session goes terminal, so a
    // FAILED/CANCELLED/expired-hold session can still be sitting on a cached
    // response whose `hold` is truthy from before it stopped. A hold is a live
    // thing — a run counting down on the ceiling — so that one is stale.
    budget = held;
    render(<BuildView sessionId="session-1" status="FAILED" currentStage="CODING" />);

    expect(screen.queryByText("Paused — this build has spent its budget")).toBeNull();
  });

  /**
   * The state this was actually found in.
   *
   * A session stopped over its ceiling with a question still unanswered: the
   * raise is the only way to answer it, restart anything, or even see what was
   * spent. Hiding the control here hid every route out of the session behind
   * the thing that was blocking it. `exceeded` is a durable fact, not a live
   * one, and `raiseBudget` has no status guard on the server for this reason.
   */
  it("still offers the raise on a session stopped over its ceiling", () => {
    budget = { ...held, hold: null };
    render(<BuildView sessionId="session-1" status="FAILED" currentStage="CODING" />);

    expect(screen.getByRole("button", { name: "Raise budget" })).toBeInTheDocument();
  });

  /** A raise cannot unblock a session that has nothing left to do. */
  it("stops offering it once the session is finished", () => {
    budget = { ...held, hold: null };
    render(<BuildView sessionId="session-1" status="COMPLETED" currentStage="CODING" />);

    expect(screen.queryByRole("button", { name: "Raise budget" })).toBeNull();
  });
});
