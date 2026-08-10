import { render, screen } from "@testing-library/react";
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
};

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
