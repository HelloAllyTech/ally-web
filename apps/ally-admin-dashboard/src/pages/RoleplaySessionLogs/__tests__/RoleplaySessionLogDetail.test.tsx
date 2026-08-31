import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ id: "sess-1" }),
}));

vi.mock("@components", () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}));

vi.mock("@components/types", () => ({
  ButtonVariant: { PRIMARY: "primary", SECONDARY: "secondary", TEXT: "text" },
}));

vi.mock("@constants", () => ({
  ROUTES: { ROLEPLAY_SESSION_LOGS: "/roleplay-session-logs" },
}));

vi.mock("@utils", () => ({
  formatDate: (d: string) => d,
}));

const getQueryMock = vi.fn();
vi.mock("@api", () => ({
  useGetRoleplaySessionLogQuery: (...args: unknown[]) => getQueryMock(...args),
  useGetI18nTranslationsQuery: () => ({ data: undefined }),
}));

import { RoleplaySessionLogDetail } from "../RoleplaySessionLogDetail";

/** Minimal detail fixture — every card besides the one under test is nulled
 * out or emptied so the component renders without touching unrelated logic. */
const baseDetail = {
  id: "sess-1",
  counselorId: 42,
  counselorName: "Alice",
  counselorEmail: "alice@org.com",
  tenantId: "t-1",
  orgName: "Org One",
  scenarioId: 7,
  scenarioTitle: "Explaining confidentiality",
  status: "ENDED",
  startedAt: "2026-08-05T10:00:00Z",
  endedAt: "2026-08-05T10:05:00Z",
  durationSeconds: 300,
  score: 88,
  platform: "web",
  language: "Malayalam",
  createdAt: "2026-08-05T10:00:00Z",
  totalTokens: null,
  estimatedCostUsd: null,
  costPriced: true,
  isV2VTest: false,
  summary: null,
  scenarioVersionId: null,
  voiceId: null,
  totalPausedMs: null,
  usage: null,
  models: null,
  latency: null,
  recording: null,
  feedback: null,
  actorEvaluation: null,
  runConfig: null,
  agentTestCases: [],
  events: [],
  lifecycle: [],
  suspectedFreeze: false,
  transcript: [],
  languageQuality: null,
  drift: null,
  languageGlossary: null,
  weakMetrics: null,
};

describe("RoleplaySessionLogDetail — summary card", () => {
  it("shows the session id alongside the other identifying fields", () => {
    getQueryMock.mockReturnValue({ data: baseDetail, isLoading: false, isError: false });
    render(<RoleplaySessionLogDetail />);
    expect(screen.getByText("Session ID")).toBeInTheDocument();
    expect(screen.getByText(baseDetail.id)).toBeInTheDocument();
  });
});

describe("RoleplaySessionLogDetail — transcript audio seeking", () => {
  it("seeks the audio when a seekable transcript turn is activated with the keyboard", () => {
    getQueryMock.mockReturnValue({
      data: {
        ...baseDetail,
        recording: { storageKey: "rec-1", egressId: "eg-1", url: "https://example.com/rec.mp3" },
        transcript: [
          {
            id: 1,
            senderId: 42,
            content: "Hello there",
            startSeconds: 12,
            endSeconds: 14,
            createdAt: baseDetail.createdAt,
          },
        ],
      },
      isLoading: false,
      isError: false,
    });

    render(<RoleplaySessionLogDetail />);

    const turnButton = screen.getByText("Hello there").closest('[role="button"]');
    expect(turnButton).toBeTruthy();

    const audio = document.querySelector("audio") as HTMLAudioElement;
    fireEvent.keyDown(turnButton as HTMLElement, { key: "Enter" });

    expect(audio.currentTime).toBe(12);
  });
});

describe("RoleplaySessionLogDetail — language glossary card", () => {
  it("renders nothing for a genuine non-glossary session", () => {
    getQueryMock.mockReturnValue({ data: baseDetail, isLoading: false, isError: false });
    render(<RoleplaySessionLogDetail />);
    expect(screen.queryByText("Language glossary")).not.toBeInTheDocument();
  });

  it("shows delivery, retrieval, and adherence when the glossary was served", () => {
    getQueryMock.mockReturnValue({
      data: {
        ...baseDetail,
        languageGlossary: {
          active: true,
          tier0Chars: 1147,
          tier0Tokens: 381,
          tier1SectionsShipped: 3,
          versions: { core_style: 1, emotions: 1 },
          totalTurns: 4,
          turnsWithGlossaryRetrieval: 3,
          sectionHitCounts: [{ sectionCode: "emotions", count: 3 }],
          adherence: {
            agentMessageCount: 4,
            totalViolations: 1,
            violations: [
              {
                term: "ആശങ്ക",
                sectionCode: "core_style",
                count: 1,
                examples: ["…എനിക്ക് ആശങ്ക ഉണ്ട്…"],
              },
            ],
          },
        },
      },
      isLoading: false,
      isError: false,
    });

    render(<RoleplaySessionLogDetail />);

    expect(screen.getByText("Language glossary")).toBeInTheDocument();
    expect(screen.getByText("Delivered")).toBeInTheDocument();
    expect(screen.getByText("1,147")).toBeInTheDocument(); // Tier 0 char count
    expect(screen.getByText("emotions: 3")).toBeInTheDocument();
    expect(screen.getByText("“ആശങ്ക”")).toBeInTheDocument();
  });

  it("shows adherence scanned from the transcript even when delivery wasn't recorded", () => {
    getQueryMock.mockReturnValue({
      data: {
        ...baseDetail,
        languageGlossary: {
          active: false,
          tier0Chars: null,
          tier0Tokens: null,
          tier1SectionsShipped: null,
          versions: null,
          totalTurns: 0,
          turnsWithGlossaryRetrieval: 0,
          sectionHitCounts: [],
          adherence: { agentMessageCount: 2, totalViolations: 0, violations: [] },
        },
      },
      isLoading: false,
      isError: false,
    });

    render(<RoleplaySessionLogDetail />);

    expect(screen.getByText("Language glossary")).toBeInTheDocument();
    expect(screen.getByText(/Not delivered this session/)).toBeInTheDocument();
  });
});

describe("RoleplaySessionLogDetail — actor evaluation applicability", () => {
  // Agent test cases are configured globally, so a session is scored against
  // goals its scenario may never exercise. Showing the judge's number for one
  // of those reads as a failure the actor had no chance to avoid.
  it("renders an inapplicable goal as N/A rather than its score", () => {
    getQueryMock.mockReturnValue({
      data: {
        ...baseDetail,
        actorEvaluation: {
          compositeScore: 90,
          metrics: { "Build rapport": 90, "De-escalate acute risk": 10 },
          notApplicableGoals: ["De-escalate acute risk"],
          markdown: null,
          status: "COMPLETED",
          evaluatedAt: "2026-08-14",
          passThreshold: 70,
          pass: true,
        },
      },
      isLoading: false,
      isError: false,
    });

    render(<RoleplaySessionLogDetail />);

    expect(screen.getByText("N/A")).toBeInTheDocument();
    // The applicable goal keeps its bar (90 appears twice: composite + bar),
    // while the inapplicable goal's 10 must not be rendered anywhere.
    expect(screen.getAllByText("90").length).toBeGreaterThan(0);
    expect(screen.queryByText("10")).not.toBeInTheDocument();
    expect(
      screen.getByText(/1 of 2 goals were not applicable to this session/),
    ).toBeInTheDocument();
  });

  // Rows judged before applicability existed send an empty list, and every goal
  // renders as scored — which is how they were in fact scored.
  it("renders every goal as scored when nothing was marked inapplicable", () => {
    getQueryMock.mockReturnValue({
      data: {
        ...baseDetail,
        actorEvaluation: {
          compositeScore: 50,
          metrics: { "Build rapport": 90, "De-escalate acute risk": 10 },
          notApplicableGoals: [],
          markdown: null,
          status: "COMPLETED",
          evaluatedAt: "2026-08-14",
          passThreshold: 70,
          pass: false,
        },
      },
      isLoading: false,
      isError: false,
    });

    render(<RoleplaySessionLogDetail />);

    expect(screen.queryByText("N/A")).not.toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.queryByText(/goals were not applicable/)).not.toBeInTheDocument();
  });
});

describe("RoleplaySessionLogDetail — transcript playback highlight", () => {
  // A turn with unknown timing (startSeconds: null) must never win the
  // "currently playing" highlight — its real position in the audio isn't
  // known, so treating it as if it starts at 0:00 would highlight it the
  // instant playback begins, before the audio has actually reached it.
  it("does not highlight an early turn with unknown timing as active at playback start", () => {
    getQueryMock.mockReturnValue({
      data: {
        ...baseDetail,
        transcript: [
          {
            id: 1,
            senderId: -1,
            content: "Hello",
            startSeconds: null,
            endSeconds: null,
            createdAt: "",
          },
          {
            id: 2,
            senderId: 42,
            content: "Hi there",
            startSeconds: 5,
            endSeconds: 6,
            createdAt: "",
          },
        ],
      },
      isLoading: false,
      isError: false,
    });

    render(<RoleplaySessionLogDetail />);

    const firstTurn = screen.getByText("Hello").closest("div.max-w-\\[80\\%\\]");
    expect(firstTurn).not.toBeNull();
    expect(firstTurn).not.toHaveClass("border-primary-500");
  });
});

describe("RoleplaySessionLogDetail — weak performing metrics card", () => {
  const metric = (o: Record<string, unknown> = {}) => ({
    id: "role_inversion",
    label: "Turns where the actor took the counsellor’s chair",
    group: "clienthood",
    numerator: 2,
    denominator: 20,
    value: 0.1,
    unit: "percent",
    state: "measured",
    detail: null,
    ...o,
  });

  const withMetrics = (metrics: unknown[], judged = true) => ({
    data: {
      ...baseDetail,
      weakMetrics: { metricsVersion: "v1", judged, metrics },
    },
    isLoading: false,
    isError: false,
  });

  it("renders nothing when the session carries no panel", () => {
    getQueryMock.mockReturnValue({
      data: baseDetail,
      isLoading: false,
      isError: false,
    });
    render(<RoleplaySessionLogDetail />);
    expect(screen.queryByText("Actor quality metrics")).not.toBeInTheDocument();
  });

  it("groups metrics under their metric heading", () => {
    getQueryMock.mockReturnValue(
      withMetrics([
        metric(),
        metric({
          id: "repetition_turns",
          group: "progression",
          label: "Turns repeating an earlier turn",
        }),
      ]),
    );
    render(<RoleplaySessionLogDetail />);
    expect(screen.getByText("Actor quality metrics")).toBeInTheDocument();
    expect(screen.getByText("Actor clienthood")).toBeInTheDocument();
    expect(screen.getByText("Conversational progression")).toBeInTheDocument();
  });

  it("shows the raw counts beside the rate, because n matters on one session", () => {
    getQueryMock.mockReturnValue(withMetrics([metric()]));
    render(<RoleplaySessionLogDetail />);
    expect(screen.getByText("10.0%")).toBeInTheDocument();
    // "2 of 20" is what tells the reader whether 10% is worth acting on.
    expect(screen.getByText("2 of 20")).toBeInTheDocument();
  });

  it("renders a count metric as n-of-ceiling, not as a percentage", () => {
    getQueryMock.mockReturnValue(
      withMetrics([
        metric({
          id: "over_compliance",
          label: "Solutions the actor offered for its own problem",
          unit: "count",
          numerator: 4,
          denominator: 2,
          value: 2,
        }),
      ]),
    );
    render(<RoleplaySessionLogDetail />);
    // 4 solutions against a ceiling of 2 — rendering "200%" would be nonsense.
    expect(screen.getByText("4 of 2")).toBeInTheDocument();
    expect(screen.queryByText("200.0%")).not.toBeInTheDocument();
  });

  it("says no data rather than 0% when the denominator is empty", () => {
    getQueryMock.mockReturnValue(
      withMetrics([metric({ numerator: 0, denominator: 0, value: null })]),
    );
    render(<RoleplaySessionLogDetail />);
    expect(screen.getByText("no data")).toBeInTheDocument();
    expect(screen.queryByText("0.00%")).not.toBeInTheDocument();
  });

  it("shows a dash, not 0%, for an unmeasured metric", () => {
    // Regression: barge-in rendered "not measured · 0.00% · 0 of 2". The badge
    // said one thing and the number said the opposite.
    getQueryMock.mockReturnValue(
      withMetrics([
        metric({
          id: "barge_in",
          label: "Turns interrupted by the learner",
          state: "none",
          numerator: 0,
          denominator: 2,
          value: 0,
        }),
      ]),
    );
    render(<RoleplaySessionLogDetail />);
    expect(screen.queryByText("0.00%")).not.toBeInTheDocument();
    expect(screen.queryByText("0 of 2")).not.toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("badges a not-measured line so an empty value is not read as clean", () => {
    getQueryMock.mockReturnValue(
      withMetrics([
        metric({
          id: "barge_in",
          label: "Turns interrupted by the learner",
          state: "none",
          numerator: 0,
          denominator: 0,
          value: null,
          detail: "Not instrumented — the flag is never written",
        }),
      ]),
    );
    render(<RoleplaySessionLogDetail />);
    expect(screen.getByText("not measured")).toBeInTheDocument();
    expect(screen.getByText(/Not instrumented/)).toBeInTheDocument();
  });

  it("warns when the session was never judged", () => {
    getQueryMock.mockReturnValue(withMetrics([metric()], false));
    render(<RoleplaySessionLogDetail />);
    expect(screen.getByText(/never judged/)).toBeInTheDocument();
  });

  it("renders a ratio without multiplying it by a hundred", () => {
    getQueryMock.mockReturnValue(
      withMetrics([
        metric({
          id: "criticism_ratio",
          label: "Criticisms per compliment",
          unit: "ratio",
          numerator: 3,
          denominator: 2,
          value: 1.5,
        }),
      ]),
    );
    render(<RoleplaySessionLogDetail />);
    expect(screen.getByText("1.50×")).toBeInTheDocument();
  });
});
