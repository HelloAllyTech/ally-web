import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// See BuildView.budget.test.tsx for why the barrel and the design system are
// stubbed rather than loaded.
vi.mock("@components", () => ({ cellTypes: {} }));
vi.mock("@ally-ui-mono/ui-shared", () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  InlineNotification: ({ title }: any) => <div data-testid="inline-notification">{title}</div>,
  ActionableNotification: ({ title }: any) => <div>{title}</div>,
  Tag: ({ children }: any) => <span>{children}</span>,
  Tile: ({ children }: any) => <div>{children}</div>,
}));

// The feed is stubbed to report what it was HANDED. What this file tests is the
// wiring — that the failure reaches the feed at all, and which of the two
// accounts of it becomes the headline. How it then renders is
// BuildActivityFeed.failure.test.tsx's job.
const received: { title: string; detail?: string | null }[] = [];
vi.mock("../BuildActivityFeed", () => ({
  BuildActivityFeed: ({ failure }: any) => {
    if (failure) received.push(failure);
    return <div data-testid="feed" />;
  },
}));
vi.mock("../PhaseRail", () => ({ PhaseRail: () => <div /> }));
vi.mock("../RunHistoryRail", () => ({ RunHistoryRail: () => <div /> }));
vi.mock("../TodoPanel", () => ({ TodoPanel: () => <div /> }));
vi.mock("../QuestionCard", () => ({ QuestionCard: () => <div /> }));
vi.mock("../RaiseBudgetDialog", () => ({ RaiseBudgetDialog: () => null }));

vi.mock("@hooks", () => ({
  useBuilderSocket: () => ({ connected: true, markSeen: () => undefined }),
}));

const RUNNER_ERROR = "The build runner failed. See the workflow log.";

vi.mock("@api", () => ({
  useGetBuilderRunsQuery: () => ({
    data: [
      { id: "run-1", status: "FAILED", error: RUNNER_ERROR, createdAt: new Date().toISOString() },
    ],
  }),
  useGetBuilderPendingQuestionsQuery: () => ({ data: [] }),
  useGetBuilderPullRequestsQuery: () => ({ data: [] }),
  useMergeBuilderPullRequestMutation: () => [vi.fn(), { isLoading: false }],
  useGetBuilderSessionBudgetQuery: () => ({ data: undefined, refetch: vi.fn() }),
  useLazyGetBuilderRunEventsQuery: () => [
    vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({ events: [] }) }),
  ],
  useAnswerBuilderQuestionMutation: () => [vi.fn(), { isLoading: false }],
}));

// eslint-disable-next-line import/first
import { BuildView } from "../BuildView";

const SESSION_ERROR =
  "The change did not pass the test gate and independent review within the attempt limit.";

const renderFailed = (sessionError: string | null = SESSION_ERROR) => {
  received.length = 0;
  return render(
    <BuildView
      sessionId="session-1"
      status="FAILED"
      currentStage="GATE"
      sessionError={sessionError}
    />,
  );
};

describe("BuildView failure", () => {
  it("hands the failure to the feed instead of banner-ing it", () => {
    renderFailed();
    expect(received.at(-1)?.title).toBe(SESSION_ERROR);
  });

  /**
   * The regression this replaces: the same failure rendered as a banner under
   * the page header AND a second banner below the pull request list, so a
   * failed build put two red blocks around a transcript that already described
   * what happened.
   */
  it("renders no notification banner for it", () => {
    renderFailed();
    expect(screen.queryAllByTestId("inline-notification")).toHaveLength(0);
  });

  it("keeps the runner's own error as detail, not a second headline", () => {
    renderFailed();
    expect(received.at(-1)?.detail).toBe(RUNNER_ERROR);
  });

  it("promotes the run's error when the session carries none", () => {
    renderFailed(null);
    expect(received.at(-1)?.title).toBe(RUNNER_ERROR);
    // Nothing to expand — there is only one account of this failure, and an
    // expander onto a copy of the line above it is a control that does nothing.
    expect(received.at(-1)?.detail).toBeNull();
  });
});
