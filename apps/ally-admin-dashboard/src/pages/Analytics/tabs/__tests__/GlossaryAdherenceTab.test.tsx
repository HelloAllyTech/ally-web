import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

// Carbon charts draw through d3, which captures requestAnimationFrame at
// import time — hoisted stub, same reason the sibling chart tests need one.
vi.hoisted(() => {
  if (typeof window !== "undefined") {
    window.requestAnimationFrame = (() => 0) as typeof window.requestAnimationFrame;
  }
});

const overviewMock = vi.fn();
const perLanguageMock = vi.fn();
const backfillMock = vi.fn();
const scenarioLanguagesMock = vi.fn();

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// Full replacement (not a partial spread of the real module): the real
// `@api` barrel pulls in simulationStudio.ts's whole import graph, which
// reaches store/loggerWithRedux.ts before the test store exists. This tab
// only calls these four hooks, so a full mock avoids that load entirely.
vi.mock("@api", () => ({
  useGetGlossaryAdherenceOverviewQuery: () => overviewMock(),
  useGetGlossaryAdherenceQuery: (id: number, opts?: { skip?: boolean }) =>
    perLanguageMock(id, opts),
  useGetScenarioLanguagesQuery: () => scenarioLanguagesMock(),
  useBackfillGlossaryAdherenceMutation: () => [backfillMock, { isLoading: false }],
}));

import { GlossaryAdherenceTab } from "../GlossaryAdherenceTab";

const noop = () => {};

describe("GlossaryAdherenceTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Matches the REAL /v1/learn/scenario-languages response shape: the
    // numeric id comes back as `language_id` (snake_case), not `id` — a
    // component that only checks `.id` silently never resolves any
    // language. Deliberately omitting `id` here so a regression fails loud.
    scenarioLanguagesMock.mockReturnValue({
      data: [
        { language_id: 9, value: "ml-IN", label: "Malayalam (India)" },
        { language_id: 2, value: "hi-IN", label: "Hindi (India)" },
      ],
    });
  });

  describe("all-languages overview", () => {
    it("shows platform-wide KPIs and a clickable row per scanned language", () => {
      overviewMock.mockReturnValue({
        data: [
          {
            languageId: 9,
            languageLabel: "Malayalam (India)",
            languageValue: "ml-IN",
            sessionCount: 16,
            totalViolations: 44,
            avgViolationsPerSession: 2.75,
            cleanSessions: 5,
          },
        ],
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      });
      perLanguageMock.mockReturnValue({ data: undefined, isFetching: false, isError: false });

      const onSelectLanguage = vi.fn();
      render(
        <GlossaryAdherenceTab
          query={{ range: "all" }}
          language=""
          onSelectLanguage={onSelectLanguage}
        />,
      );

      expect(screen.getByText("Malayalam (India)")).toBeInTheDocument();
      // "44" appears both as the KPI tile value and the table row's cell.
      expect(screen.getAllByText("44").length).toBeGreaterThanOrEqual(2);

      fireEvent.click(screen.getByText("Malayalam (India)"));
      expect(onSelectLanguage).toHaveBeenCalledWith("ml-IN");
    });

    it("invites a rescan when nothing has been scanned yet", () => {
      overviewMock.mockReturnValue({
        data: [],
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      });
      perLanguageMock.mockReturnValue({ data: undefined, isFetching: false, isError: false });

      render(<GlossaryAdherenceTab query={{ range: "all" }} language="" onSelectLanguage={noop} />);

      expect(screen.getByText(/No language has been scanned yet/)).toBeInTheDocument();
    });
  });

  describe("single-language drill-in", () => {
    it("resolves the language value to an id and renders its top violated terms", () => {
      overviewMock.mockReturnValue({
        data: [],
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      });
      perLanguageMock.mockReturnValue({
        data: {
          sessionCount: 16,
          totalViolations: 44,
          avgViolationsPerSession: 2.75,
          cleanSessions: 5,
          topTerms: [
            { term: "ആശങ്ക", sectionCode: "core_style", count: 20 },
            { term: "വളരെ", sectionCode: "core_style", count: 18 },
          ],
        },
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      });

      render(
        <GlossaryAdherenceTab query={{ range: "all" }} language="ml-IN" onSelectLanguage={noop} />,
      );

      expect(perLanguageMock).toHaveBeenCalledWith(9, { skip: false });
      expect(screen.getByText("“ആശങ്ക”")).toBeInTheDocument();
      expect(screen.getAllByText("core_style")).toHaveLength(2);
    });

    it("triggers a rescan for the resolved languageId", async () => {
      overviewMock.mockReturnValue({
        data: [],
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      });
      perLanguageMock.mockReturnValue({
        data: {
          sessionCount: 0,
          totalViolations: 0,
          avgViolationsPerSession: 0,
          cleanSessions: 0,
          topTerms: [],
        },
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      });
      backfillMock.mockReturnValue({
        unwrap: () => Promise.resolve({ scanned: 3, reported: 2, skipped: 1 }),
      });

      render(
        <GlossaryAdherenceTab query={{ range: "all" }} language="ml-IN" onSelectLanguage={noop} />,
      );

      expect(screen.getByText(/Not scanned yet/)).toBeInTheDocument();

      fireEvent.click(screen.getByText("Rescan"));

      await waitFor(() => {
        expect(backfillMock).toHaveBeenCalledWith({ languageId: 9, sinceDays: 30 });
      });
    });
  });
});
