import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BuilderBudgetState } from "@types";

// @constants reads off the @components barrel at module-eval time (see the
// BugHunter tests), so the barrel is stubbed rather than loaded for real.
vi.mock("@components", () => ({ cellTypes: {} }));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  InlineNotification: ({ title, subtitle, children }: any) => (
    <div>
      <p>{title}</p>
      {subtitle && <p>{subtitle}</p>}
      {children}
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
});
