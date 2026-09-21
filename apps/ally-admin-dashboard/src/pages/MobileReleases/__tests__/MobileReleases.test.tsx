import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Control the data/loading state the page renders from.
vi.mock("../useMobileReleases", () => ({
  useMobileReleases: vi.fn(),
}));

// The page also calls a handful of @api hooks directly (min-version fields,
// release/promotion/review mutations) — stub them so the real @api slice
// isn't pulled into this isolated page test.
vi.mock("@api", () => ({
  useGetMinimumIosVersionQuery: () => ({ data: undefined, isLoading: false }),
  useGetMinimumAndroidVersionQuery: () => ({ data: undefined, isLoading: false }),
  useUpdateMinimumAppVersionMutation: () => [vi.fn(), { isLoading: false }],
  useTriggerMobileReleaseMutation: () => [vi.fn(), { isLoading: false }],
  useTriggerAndroidPromotionMutation: () => [vi.fn(), { isLoading: false }],
  useSubmitIosAppStoreReviewMutation: () => [vi.fn(), { isLoading: false }],
  useLazyGetIosWhatsNewSuggestionQuery: () => [vi.fn(), { isFetching: false }],
  useLazyGetAndroidWhatsNewSuggestionQuery: () => [vi.fn(), { isFetching: false }],
}));

vi.mock("@components", () => ({
  ActionConfirmationPopup: () => null,
}));

vi.mock("@constants", () => ({
  en: { common: { cancel: "Cancel" } },
}));

// @utils' barrel pulls in the Redux store (for loggerWithRedux), which in
// turn needs the real @api slice — stub it so this isolated page test
// doesn't have to construct a full store.
vi.mock("@utils", () => ({
  formatDateTime: (dateString: string) => dateString,
}));

// The history tabs (rendered eagerly for the selected tab index) pull in
// RunsTable and its own icon/component/util dependencies — irrelevant to the
// overview panel this test covers, so stub them out.
vi.mock("../tabs/AndroidReleasesTab", () => ({ AndroidReleasesTab: () => null }));
vi.mock("../tabs/IosTestflightTab", () => ({ IosTestflightTab: () => null }));
vi.mock("../tabs/AppStoreSubmissionsTab", () => ({ AppStoreSubmissionsTab: () => null }));
vi.mock("../tabs/ReleaseHistoryTab", () => ({ ReleaseHistoryTab: () => null }));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  Tag: ({ children }: any) => <span>{children}</span>,
  CarbonTabs: ({ children }: any) => <div>{children}</div>,
  Tab: ({ children }: any) => <div>{children}</div>,
  TabList: ({ children }: any) => <div>{children}</div>,
  TabPanel: ({ children }: any) => <div>{children}</div>,
  TabPanels: ({ children }: any) => <div>{children}</div>,
  InlineLoading: ({ description }: any) => <div>{description}</div>,
  NumberInput: () => null,
  TextArea: () => null,
  TextInput: () => null,
  Tooltip: ({ children }: any) => <>{children}</>,
}));

import { useMobileReleases } from "../useMobileReleases";
import { MobileReleases } from "../MobileReleases";

const androidBuildRun = {
  id: "run-1",
  workflowName: "Android Build" as const,
  status: "completed" as const,
  conclusion: "success" as const,
  htmlUrl: "https://github.com/example/run-1",
  actor: "github-actions[bot]",
  headSha: "abc123",
  headCommitMessage: "Bump version",
  createdAt: "2026-08-30T10:00:00Z",
  updatedAt: "2026-08-30T10:05:00Z",
  runStartedAt: "2026-08-30T10:00:00Z",
};

const makeState = (overrides: Record<string, unknown> = {}) => ({
  runs: [],
  isRunsLoading: false,
  isRunsFetching: false,
  isRunsError: false,
  versions: {
    android: { versionName: "1.23.16", versionCode: 42 },
    ios: { marketingVersion: "1.23.16" },
    nextEligibleCheckAt: null,
  },
  isVersionsLoading: false,
  isVersionsError: false,
  testflightStatus: undefined,
  isTestflightStatusLoading: false,
  isTestflightStatusError: false,
  testflightHistory: [],
  isTestflightHistoryLoading: false,
  isTestflightHistoryError: false,
  appStoreReviewHistory: [],
  isAppStoreReviewHistoryLoading: false,
  isAppStoreReviewHistoryError: false,
  androidProductionStatus: undefined,
  isAndroidProductionStatusLoading: false,
  isAndroidProductionStatusError: false,
  ...overrides,
});

describe("MobileReleases page — Android pipeline panel gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not show the 'no successful build' placeholder while the run history is still loading", () => {
    (useMobileReleases as any).mockReturnValue(makeState({ runs: [], isRunsLoading: true }));
    render(<MobileReleases />);

    // The version card above already shows a build exists — the pipeline
    // panel below must not contradict it just because the separate runs
    // query hasn't resolved yet.
    expect(screen.queryByText(/No successful Android build yet/i)).not.toBeInTheDocument();
  });

  it("does not show the 'no successful build' placeholder when the run history failed to load", () => {
    (useMobileReleases as any).mockReturnValue(makeState({ runs: [], isRunsError: true }));
    render(<MobileReleases />);

    expect(screen.queryByText(/No successful Android build yet/i)).not.toBeInTheDocument();
  });

  it("shows the real pipeline once the run history has loaded with a successful build", () => {
    (useMobileReleases as any).mockReturnValue(makeState({ runs: [androidBuildRun] }));
    render(<MobileReleases />);

    expect(screen.getByText("Current Android build's pipeline")).toBeInTheDocument();
    expect(screen.queryByText(/No successful Android build yet/i)).not.toBeInTheDocument();
  });
});
