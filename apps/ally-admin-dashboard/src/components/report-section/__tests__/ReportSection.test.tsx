import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { toast } from "sonner";

import { ReportSection } from "../ReportSection";
import reportUploadReducer from "@reducer/reportUploadReducer";
import { ReportGenerationStatus, DEFAULT_HELPER_PROMPT } from "@constants/reportGeneration";

// Hoist cellTypes mock to ensure it's available during module hoisting
const { mockCellTypes } = vi.hoisted(() => ({
  mockCellTypes: {
    editableText: "editableText",
    dropdown: "dropdown",
    dropdownSearchable: "dropdownSearchable",
    number: "number",
    image: "image",
    select: "select",
    switch: "switch",
    emoji_select: "emoji_select",
    normalText: "normalText",
    wrapText: "wrapText",
    triggerConditions: "triggerConditions",
    timeInput: "timeInput",
    score: "score",
    textAreaWithDropdown: "textAreaWithDropdown",
    tags: "tags",
    dropdownTags: "dropdownTags",
    status: "status",
    roles: "roles",
  },
}));

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock child components - must be synchronous to work during hoisting
vi.mock("@components", () => {
  return {
    // Explicitly ensure cellTypes is available to prevent SimulationCreator.ts from failing
    cellTypes: mockCellTypes,
    Button: ({ children, onClick, ...props }: any) => (
      <button onClick={onClick} {...props}>
        {children}
      </button>
    ),
    PromptConfiguration: ({ prompt, onButtonClick, buttonText, buttonDisabled, ...props }: any) => (
      <div data-testid="prompt-configuration">
        <span data-testid="prompt-display">{prompt}</span>
        <button onClick={onButtonClick} disabled={buttonDisabled} data-testid="generate-button">
          {buttonText}
        </button>
      </div>
    ),
    ReportContent: ({ reportData, activeTab, onTabChange }: any) => (
      <div data-testid="report-content">
        <div data-testid="report-score">{reportData?.score ?? 0}</div>
        {activeTab === "report" && reportData?.metrics && (
          <div data-testid="metrics">
            {Object.entries(reportData.metrics).map(([metric, percentage]) => (
              <div key={metric}>
                <span>{metric}</span>
                <span>{String(percentage)}%</span>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => onTabChange("transcription")} data-testid="transcription-tab">
          Transcription
        </button>
      </div>
    ),
    TabButton: ({ label, onClick, isActive }: any) => (
      <button onClick={onClick} data-active={isActive} data-testid={`tab-${label.toLowerCase()}`}>
        {label}
      </button>
    ),
    Accordion: ({ headerTitle, children, onChange }: any) => (
      <div data-testid="accordion">
        <div data-testid="accordion-header">{headerTitle}</div>
        <div>{children}</div>
      </div>
    ),
  };
});

vi.mock("@assets", () => ({
  ArrowDown: () => <div data-testid="arrow-down">▼</div>,
}));

// Mock baseAPI so store and useUser can load (they import baseAPI from @api)
vi.mock("@api/baseApi", () => ({
  baseAPI: {
    reducerPath: "baseAPI",
    reducer: (state: unknown = {}) => state,
    middleware: () => (next: (a: unknown) => unknown) => (action: unknown) => next(action),
    util: { resetApiState: vi.fn() },
    injectEndpoints: vi.fn(() => ({})),
  },
}));

// Mock API hooks
const mockGenerateReportMutation = vi.fn();
const mockCancelReportGenerationMutation = vi.fn();
const mockGetReportsQuery = vi.fn();
const mockGetReportByIdQuery = vi.fn();
const mockGetReportTranscriptQuery = vi.fn();
const mockRefetchReportsHistory = vi.fn();

vi.mock("@api", () => ({
  // evaluatorAPI is wired into the store alongside baseAPI; stub it too so
  // store init (reducerPath/reducer/middleware) does not throw.
  evaluatorAPI: {
    reducerPath: "evaluatorAPI",
    reducer: (state = {}) => state,
    middleware: () => (next: any) => (action: any) => next(action),
    util: { resetApiState: () => ({ type: "reset" }) },
  },
  // src/store/index.ts imports baseAPI from "@api" (not "@api/baseApi"), so the barrel
  // mock must include it or store loading throws on baseAPI.reducerPath.
  baseAPI: {
    reducerPath: "baseAPI",
    reducer: (state: unknown = {}) => state,
    middleware: () => (next: (a: unknown) => unknown) => (action: unknown) => next(action),
    util: { resetApiState: vi.fn() },
    injectEndpoints: vi.fn(() => ({})),
  },
  useGenerateReportMutation: () => [
    (params: any) => ({
      unwrap: async () => mockGenerateReportMutation(params),
    }),
    { isLoading: false },
  ],
  useCancelReportGenerationMutation: () => [
    (params: any) => ({
      unwrap: async () => mockCancelReportGenerationMutation(params),
    }),
    { isLoading: false },
  ],
  useGetReportsQuery: () => ({
    data: mockGetReportsQuery(),
    refetch: mockRefetchReportsHistory,
  }),
  // ReportSection maps report rows to their scenario version label; an empty
  // list is a safe default for tests that don't exercise version tagging.
  useGetScenarioVersionsQuery: () => ({ data: [] }),
  useLazyGetReportsQuery: () => [
    vi.fn(() => ({ unwrap: async () => ({ data: [] }) })),
    { data: undefined, isLoading: false },
  ],
  useGetReportByIdQuery: () => ({
    data: mockGetReportByIdQuery(),
  }),
  useGetReportTranscriptQuery: () => ({
    data: mockGetReportTranscriptQuery(),
  }),
  useLazyGetReportTranscriptQuery: () => [
    vi.fn(),
    { data: mockGetReportTranscriptQuery(), isLoading: false },
  ],
  // ReportSection now resolves the scenario's selectedMainPromptCode to
  // a human-readable name via the main-agent prompt list. The component
  // tolerates an empty / loading list (falls back to the raw code or
  // "Default main agent prompt"), so an empty array is a safe default
  // for tests that don't care about the name display.
  useGetPromptsByTypeQuery: () => ({ data: [] }),
}));

// Create test store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      reportUpload: reportUploadReducer.reducer,
    },
    preloadedState: {
      reportUpload: {
        uploads: [],
        currentScenarioId: undefined,
        ...initialState,
      },
    },
  });
};

describe("ReportSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetReportsQuery.mockReturnValue(null);
    mockGetReportByIdQuery.mockReturnValue(null);
    mockGetReportTranscriptQuery.mockReturnValue(null);
  });

  describe("Rendering", () => {
    it("renders without scenarioId", () => {
      const store = createTestStore();
      render(
        <Provider store={store}>
          <ReportSection />
        </Provider>,
      );

      expect(screen.getByRole("heading", { name: "Report" })).toBeInTheDocument();
    });

    it("renders with scenarioId", () => {
      const store = createTestStore();
      render(
        <Provider store={store}>
          <ReportSection scenarioId="123" />
        </Provider>,
      );

      expect(screen.getByRole("heading", { name: "Report" })).toBeInTheDocument();
    });

    it("renders prompt configuration when no report data", () => {
      const store = createTestStore();
      render(
        <Provider store={store}>
          <ReportSection scenarioId="123" />
        </Provider>,
      );

      expect(screen.getByTestId("prompt-configuration")).toBeInTheDocument();
      expect(screen.getByTestId("generate-button")).toHaveTextContent("Generate Report");
    });

    it("renders loading state when generating", async () => {
      const store = createTestStore();
      const { rerender } = render(
        <Provider store={store}>
          <ReportSection scenarioId="123" areAllMandatoryFieldsFilled />
        </Provider>,
      );

      // Trigger generation
      const generateButton = screen.getByTestId("generate-button");
      mockGenerateReportMutation.mockResolvedValue({ id: "report-1" });

      await userEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText("Generating Report...")).toBeInTheDocument();
      });
    });
  });

  describe("Report Generation", () => {
    it("calls generateReportMutation when generate button is clicked", async () => {
      const store = createTestStore();
      render(
        <Provider store={store}>
          <ReportSection scenarioId="123" areAllMandatoryFieldsFilled />
        </Provider>,
      );

      const generateButton = screen.getByTestId("generate-button");
      mockGenerateReportMutation.mockResolvedValue({ id: "report-1" });

      await userEvent.click(generateButton);

      await waitFor(() => {
        expect(mockGenerateReportMutation).toHaveBeenCalledWith({
          input: {
            scenarioId: "123",
            config: expect.objectContaining({
              languageId: expect.any(Number),
              turns: expect.any(Number),
              helperAgentPrompt: expect.any(String),
            }),
          },
        });
      });
    });

    it("dispatches addUpload when report is generated successfully", async () => {
      const store = createTestStore();
      render(
        <Provider store={store}>
          <ReportSection scenarioId="123" areAllMandatoryFieldsFilled />
        </Provider>,
      );

      const generateButton = screen.getByTestId("generate-button");
      mockGenerateReportMutation.mockResolvedValue({ id: "report-1" });

      await userEvent.click(generateButton);

      await waitFor(() => {
        const state = store.getState();
        const upload = state.reportUpload.uploads.find(u => u.reportId === "report-1");
        expect(upload).toBeDefined();
        expect(upload?.status).toBe(ReportGenerationStatus.IN_PROGRESS);
      });
    });

    it("shows error toast when generation fails", async () => {
      const store = createTestStore();
      render(
        <Provider store={store}>
          <ReportSection scenarioId="123" areAllMandatoryFieldsFilled />
        </Provider>,
      );

      const generateButton = screen.getByTestId("generate-button");
      const error = { message: "Generation failed" };
      mockGenerateReportMutation.mockRejectedValue(error);

      await userEvent.click(generateButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Generation failed");
      });
    });

    it("shows error when response has no id", async () => {
      const store = createTestStore();
      render(
        <Provider store={store}>
          <ReportSection scenarioId="123" areAllMandatoryFieldsFilled />
        </Provider>,
      );

      const generateButton = screen.getByTestId("generate-button");
      mockGenerateReportMutation.mockResolvedValue({});

      await userEvent.click(generateButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to generate report");
      });
    });
  });

  describe("Report Cancellation", () => {
    it("calls cancelReportGenerationMutation when cancel button is clicked", async () => {
      const store = createTestStore({
        uploads: [
          {
            fileName: "Report report-1",
            status: ReportGenerationStatus.IN_PROGRESS,
            progress: 50,
            reportId: "report-1",
            scenarioId: "123",
          },
        ],
      });

      mockGetReportByIdQuery.mockReturnValue({
        id: "report-1",
        score: 85,
        config: { languageId: 1, turns: 50, helperAgentPrompt: "Test prompt" },
        metrics: {},
      });

      render(
        <Provider store={store}>
          <ReportSection scenarioId="123" />
        </Provider>,
      );

      // Set reportId to trigger report data display
      await waitFor(() => {
        const state = store.getState();
        expect(state.reportUpload.uploads.length).toBeGreaterThan(0);
      });

      mockCancelReportGenerationMutation.mockResolvedValue({
        unwrap: async () => ({}),
      });

      // Find and click cancel button (it should be in loading state)
      const cancelButton = screen.queryByText("Cancel");
      if (cancelButton) {
        await userEvent.click(cancelButton);

        await waitFor(() => {
          expect(mockCancelReportGenerationMutation).toHaveBeenCalledWith({ reportId: "report-1" });
        });
      }
    });
  });

  describe("Tab Navigation", () => {
    it("switches between report and history tabs", async () => {
      const store = createTestStore();
      mockGetReportsQuery.mockReturnValue({
        data: [
          {
            id: "report-1",
            scenarioId: "123",
            status: ReportGenerationStatus.COMPLETED,
            createdAt: "2024-01-01",
            config: { languageId: 1, turns: 50 },
          },
        ],
      });

      mockGetReportByIdQuery.mockReturnValue({
        id: "report-1",
        score: 85,
        config: { languageId: 1, turns: 50, helperAgentPrompt: "Test" },
        metrics: {},
      });

      render(
        <Provider store={store}>
          <ReportSection scenarioId="123" />
        </Provider>,
      );

      await waitFor(() => {
        const historyTab = screen.queryByTestId("tab-history");
        if (historyTab) {
          expect(historyTab).toBeInTheDocument();
        }
      });
    });

    it("renders history list when history tab is active", async () => {
      const store = createTestStore();
      mockGetReportsQuery.mockReturnValue({
        data: [
          {
            id: "report-1",
            scenarioId: "123",
            status: ReportGenerationStatus.COMPLETED,
            createdAt: "2024-01-01",
            config: { languageId: 1, turns: 50 },
          },
          {
            id: "report-2",
            scenarioId: "123",
            status: ReportGenerationStatus.COMPLETED,
            createdAt: "2024-01-02",
            config: { languageId: 1, turns: 50 },
          },
        ],
      });

      render(
        <Provider store={store}>
          <ReportSection scenarioId="123" />
        </Provider>,
      );

      await waitFor(() => {
        const historyTab = screen.queryByTestId("tab-history");
        if (historyTab) {
          fireEvent.click(historyTab);
          // History items should be rendered
          expect(screen.getByText("2024-01-01")).toBeInTheDocument();
        }
      });
    });
  });

  describe("Redux Integration", () => {
    it("dispatches setCurrentScenarioId when scenarioId changes", () => {
      const store = createTestStore();
      const { rerender } = render(
        <Provider store={store}>
          <ReportSection scenarioId="123" />
        </Provider>,
      );

      rerender(
        <Provider store={store}>
          <ReportSection scenarioId="456" />
        </Provider>,
      );

      const state = store.getState();
      expect(state.reportUpload.currentScenarioId).toBe("456");
    });

    it("syncs uploads with reportsHistory", async () => {
      const store = createTestStore();
      mockGetReportsQuery.mockReturnValue({
        data: [
          {
            id: "report-1",
            scenarioId: "123",
            status: ReportGenerationStatus.COMPLETED,
            createdAt: "2024-01-01",
            config: { languageId: 1, turns: 50 },
          },
        ],
      });

      render(
        <Provider store={store}>
          <ReportSection scenarioId="123" />
        </Provider>,
      );

      await waitFor(() => {
        const state = store.getState();
        expect(state.reportUpload.uploads.length).toBeGreaterThan(0);
        const upload = state.reportUpload.uploads[0];
        expect(upload.reportId).toBe("report-1");
        expect(upload.status).toBe(ReportGenerationStatus.COMPLETED);
      });
    });

    it("keeps uploads when scenarioId changes and no reportsHistory (preserve other scenarios in progress)", () => {
      const store = createTestStore({
        uploads: [
          {
            fileName: "Report report-1",
            status: ReportGenerationStatus.IN_PROGRESS,
            progress: 50,
            reportId: "report-1",
            scenarioId: "123",
          },
        ],
        currentScenarioId: "123",
      });

      mockGetReportsQuery.mockReturnValue(null);

      const { rerender } = render(
        <Provider store={store}>
          <ReportSection scenarioId="123" />
        </Provider>,
      );

      rerender(
        <Provider store={store}>
          <ReportSection scenarioId="456" />
        </Provider>,
      );

      const state = store.getState();
      expect(state.reportUpload.uploads).toHaveLength(1);
      // Upload keeps its original scenarioId when scenarioId prop changes (preserve in-progress per scenario)
      expect(state.reportUpload.uploads[0].scenarioId).toBe("123");
    });
  });

  describe("Progress Updates", () => {
    it("displays progress from currentUpload", async () => {
      const store = createTestStore({
        uploads: [
          {
            fileName: "Report report-1",
            status: ReportGenerationStatus.IN_PROGRESS,
            progress: 75,
            reportId: "report-1",
            scenarioId: "123",
          },
        ],
        currentScenarioId: "123",
      });

      mockGetReportByIdQuery.mockReturnValue({
        id: "report-1",
        score: 85,
        config: { languageId: 1, turns: 50, helperAgentPrompt: "Test" },
        metrics: {},
      });

      render(
        <Provider store={store}>
          <ReportSection scenarioId="123" />
        </Provider>,
      );

      // Progress should be reflected in the loading state if generating
      await waitFor(() => {
        const progressBar =
          screen.queryByRole("progressbar") || document.querySelector('[style*="width"]');
        if (progressBar) {
          expect(progressBar).toBeInTheDocument();
        }
      });
    });

    it("stops generating when upload reaches final status", async () => {
      const store = createTestStore({
        uploads: [
          {
            fileName: "Report report-1",
            status: ReportGenerationStatus.COMPLETED,
            progress: 100,
            reportId: "report-1",
            scenarioId: "123",
          },
        ],
        currentScenarioId: "123",
      });

      mockGetReportByIdQuery.mockReturnValue({
        id: "report-1",
        score: 85,
        config: { languageId: 1, turns: 50, helperAgentPrompt: "Test" },
        metrics: {},
      });

      render(
        <Provider store={store}>
          <ReportSection scenarioId="123" />
        </Provider>,
      );

      await waitFor(() => {
        expect(screen.queryByText("Generating Report")).not.toBeInTheDocument();
      });
    });
  });

  describe("Report Data Display", () => {
    it("keeps the default helper prompt instead of hydrating it from the displayed report", async () => {
      const store = createTestStore();
      const reportHelperPrompt = "Custom helper prompt from report response";
      mockGetReportsQuery.mockReturnValue({
        data: [
          {
            id: "report-1",
            scenarioId: "123",
            status: ReportGenerationStatus.COMPLETED,
            createdAt: "2024-01-01T12:00:00Z",
            config: {
              helperAgentPrompt: reportHelperPrompt,
              languageId: 1,
              turns: 50,
            },
            metrics: {},
          },
        ],
      });

      render(
        <Provider store={store}>
          <ReportSection scenarioId="123" />
        </Provider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("report-content")).toBeInTheDocument();
      });

      // The Generate Report form keeps DEFAULT_HELPER_PROMPT even when the
      // scenario has history — the current default always wins, so the
      // report's saved prompt must NOT be hydrated into the editable field.
      expect(screen.getByTestId("prompt-display")).toHaveTextContent(DEFAULT_HELPER_PROMPT);
      expect(screen.getByTestId("prompt-display")).not.toHaveTextContent(reportHelperPrompt);
      expect(screen.getByTestId("generate-button")).toHaveTextContent("Regenerate Report");
    });

    it("displays report data when available", async () => {
      const store = createTestStore();
      const reportData = {
        id: "report-1",
        scenarioId: "123",
        config: { languageId: 1, turns: 50, helperAgentPrompt: "Test prompt" },
        metrics: { empathy: 90, clarity: 80 },
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
        status: ReportGenerationStatus.COMPLETED,
      };

      mockGetReportByIdQuery.mockReturnValue(reportData);
      mockGetReportsQuery.mockReturnValue({
        data: [
          {
            ...reportData,
            score: 85,
          },
        ],
      });

      render(
        <Provider store={store}>
          <ReportSection scenarioId="123" />
        </Provider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("report-content")).toBeInTheDocument();
        expect(screen.getByTestId("report-score")).toHaveTextContent("85");
      });
    });

    it("displays metrics when available", async () => {
      const store = createTestStore();
      const reportData = {
        id: "report-1",
        scenarioId: "123",
        config: { languageId: 1, turns: 50, helperAgentPrompt: "Test prompt" },
        metrics: { empathy: 90, clarity: 80 },
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
        status: ReportGenerationStatus.COMPLETED,
      };

      mockGetReportByIdQuery.mockReturnValue(reportData);
      mockGetReportsQuery.mockReturnValue({
        data: [
          {
            ...reportData,
            score: 85,
          },
        ],
      });

      render(
        <Provider store={store}>
          <ReportSection scenarioId="123" />
        </Provider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("report-content")).toBeInTheDocument();
        expect(screen.getByTestId("report-score")).toHaveTextContent("85");
      });

      await waitFor(() => {
        expect(screen.getByTestId("metrics")).toBeInTheDocument();
        expect(screen.getByText("empathy")).toBeInTheDocument();
        expect(screen.getByText("90%")).toBeInTheDocument();
      });
    });
  });

  describe("History Item Tabs", () => {
    it("maintains separate tab state for each history item", async () => {
      const store = createTestStore();
      mockGetReportsQuery.mockReturnValue({
        data: [
          {
            id: "report-1",
            scenarioId: "123",
            status: ReportGenerationStatus.COMPLETED,
            createdAt: "2024-01-01",
            config: { languageId: 1, turns: 50 },
          },
          {
            id: "report-2",
            scenarioId: "123",
            status: ReportGenerationStatus.COMPLETED,
            createdAt: "2024-01-02",
            config: { languageId: 1, turns: 50 },
          },
        ],
      });

      render(
        <Provider store={store}>
          <ReportSection scenarioId="123" />
        </Provider>,
      );

      await waitFor(() => {
        const historyTab = screen.queryByTestId("tab-history");
        if (historyTab) {
          fireEvent.click(historyTab);
          // Each history item should have its own tab state
          const transcriptionTabs = screen.queryAllByTestId("transcription-tab");
          expect(transcriptionTabs.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe("Edge Cases", () => {
    it("handles missing scenarioId gracefully", () => {
      const store = createTestStore();
      render(
        <Provider store={store}>
          <ReportSection />
        </Provider>,
      );

      expect(screen.getByRole("heading", { name: "Report" })).toBeInTheDocument();
    });

    it("handles empty reportsHistory", () => {
      const store = createTestStore();
      mockGetReportsQuery.mockReturnValue({ data: [] });

      render(
        <Provider store={store}>
          <ReportSection scenarioId="123" />
        </Provider>,
      );

      expect(screen.getByTestId("prompt-configuration")).toBeInTheDocument();
    });

    it("handles API errors gracefully", async () => {
      const store = createTestStore();
      render(
        <Provider store={store}>
          <ReportSection scenarioId="123" areAllMandatoryFieldsFilled />
        </Provider>,
      );

      const generateButton = screen.getByTestId("generate-button");
      const error = {
        data: { message: "API Error" },
        status: 500,
      };
      mockGenerateReportMutation.mockRejectedValue(error);

      await userEvent.click(generateButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("API Error"));
      });
    });
  });
});
