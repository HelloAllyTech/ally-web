import { ReactNode } from "react";

import { act, fireEvent, render, screen } from "@testing-library/react";
import { toast } from "sonner";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { OrganizationMetrics } from "../OrganizationMetrics";

const mockUseGetOrganizationMetricsQuery = vi.fn();
const mockUseGetUserPreferencesQuery = vi.fn();
const mockUpdateUserPreferences = vi.fn();
const mockRefetch = vi.fn();

let mockPermissions: string[] = ["view:organization-metrics"];
let capturedOnDragEnd:
  | ((event: { active: { id: string }; over: { id: string } | null }) => void | Promise<void>)
  | undefined;

vi.mock("@hooks", () => ({
  useUser: () => ({ permissions: mockPermissions }),
}));

// dnd-kit drives its sortable context off real PointerEvent sequences, which
// jsdom can't simulate reliably — the same reason ally-admin-dashboard's
// Sidebar/reorderSidebar (the identical pattern this mirrors) isn't
// drag-tested that way either. Instead, `DndContext` is mocked just enough to
// capture the `onDragEnd` handler so the reorder test below can invoke it
// directly, the same way dnd-kit would after a real drag gesture.
vi.mock("@dnd-kit/core", async () => {
  const actual = await vi.importActual<typeof import("@dnd-kit/core")>("@dnd-kit/core");
  return {
    ...actual,
    DndContext: ({
      children,
      onDragEnd,
    }: {
      children: ReactNode;
      onDragEnd: typeof capturedOnDragEnd;
    }) => {
      capturedOnDragEnd = onDragEnd;
      return children;
    },
  };
});

vi.mock("@api", () => ({
  useGetOrganizationMetricsQuery: (...args: unknown[]) =>
    mockUseGetOrganizationMetricsQuery(...args),
  useGetUserPreferencesQuery: (...args: unknown[]) => mockUseGetUserPreferencesQuery(...args),
  useUpdateUserPreferencesMutation: () => [
    (...args: unknown[]) => ({
      unwrap: () => mockUpdateUserPreferences(...args),
    }),
  ],
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

// OrganizationMetrics renders the learner and course usage tables as
// children. Both pull in GenericTable, @assets and several @components this
// suite deliberately doesn't mock, so stub them out — these tests are about
// the KPI tiles, the ranked list and the trend charts, not the tables.
vi.mock("../LearnerUsageTable", () => ({
  LearnerUsageTable: () => <div data-testid="learner-usage-table" />,
}));

vi.mock("../CourseUsageTable", () => ({
  CourseUsageTable: () => <div data-testid="course-usage-table" />,
}));

vi.mock("@components", () => ({
  ToggleButtonGroup: ({ value, onValueChange, items }: any) => (
    <div data-testid="toggle-button-group">
      <div data-testid="toggle-value">{value}</div>
      {items?.map((item: any) => (
        <button
          key={item.value}
          data-testid={`toggle-${item.value}`}
          onClick={() => onValueChange?.(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("@carbon/charts-react", () => ({
  LineChart: () => <div data-testid="line-chart" />,
  SimpleBarChart: () => <div data-testid="bar-chart" />,
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Tile: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SkeletonText: () => <div data-testid="skeleton-text" />,
  SkeletonPlaceholder: ({ className }: any) => (
    <div data-testid="skeleton-placeholder" className={className} />
  ),
  InlineNotification: ({ title, subtitle }: any) => (
    <div data-testid="inline-notification">
      {title}
      {subtitle}
    </div>
  ),
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  logger: { info: vi.fn() },
}));

const BASE_RESPONSE = {
  range: "30d" as const,
  bucket: "day" as const,
  summary: {
    simulationsCompleted: 42,
    activeUsers: 7,
    newLearnersOnboarded: 3,
    totalRegisteredLearners: 25,
    avgSessionsPerActiveLearner: 2.5,
    avgPracticeMinutesPerLearner: 18.4,
    avgDaysToFirstSession: 1.2,
    learnersWithFirstSessionCount: 3,
  },
  simulationsCompletedTrend: [{ bucket: "2026-07-01", count: 10 }],
  activeUsersTrend: [{ bucket: "2026-07-01", count: 4 }],
  newLearnersOnboardedTrend: [{ bucket: "2026-07-01", count: 2 }],
  mostUsedSimulations: [
    { scenarioId: 1, title: "Difficult Conversation", sessionCount: 12 },
    { scenarioId: 2, title: "De-escalation", sessionCount: 5 },
  ],
};

const queryResult = (overrides: Partial<Record<string, unknown>> = {}) => ({
  data: undefined,
  isFetching: false,
  isError: false,
  refetch: mockRefetch,
  ...overrides,
});

// useGetUserPreferencesQuery has no transformResponse (see api/user.ts), so
// its RTK-Query-level `.data` is the raw server envelope `{ data: UserPreferences }`
// verbatim — the same double `data` unwrap useScenarioLanguages.ts relies on
// for `default_language_id`. Mocking the hook's return value therefore needs
// both layers.
const preferencesResult = (org_metrics_layout?: string[]) => ({
  data: { data: { org_metrics_layout } },
});

describe("OrganizationMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPermissions = ["view:organization-metrics"];
    capturedOnDragEnd = undefined;
    mockUseGetOrganizationMetricsQuery.mockReturnValue(queryResult({ data: BASE_RESPONSE }));
    mockUseGetUserPreferencesQuery.mockReturnValue({ data: undefined });
  });

  it("shows the access notice and skips both queries for users without the permission", () => {
    mockPermissions = [];
    render(<OrganizationMetrics />);

    expect(screen.getByTestId("organization-metrics-no-access")).toBeInTheDocument();
    expect(screen.queryByTestId("organization-metrics-section")).toBeNull();
    expect(mockUseGetOrganizationMetricsQuery).toHaveBeenCalledWith(
      { range: "30d" },
      { skip: true },
    );
    expect(mockUseGetUserPreferencesQuery).toHaveBeenCalledWith(undefined, { skip: true });
  });

  it("shows a skeleton for every KPI tile while loading", () => {
    mockUseGetOrganizationMetricsQuery.mockReturnValue(
      queryResult({ data: undefined, isFetching: true }),
    );
    render(<OrganizationMetrics />);

    expect(screen.getAllByTestId("skeleton-text")).toHaveLength(7);
  });

  it("renders every KPI tile's value once data has loaded", () => {
    render(<OrganizationMetrics />);

    expect(screen.getByTestId("organization-metrics-kpi-simulationsCompleted")).toHaveTextContent(
      "42",
    );
    expect(screen.getByTestId("organization-metrics-kpi-activeUsers")).toHaveTextContent("7");
    expect(screen.getByTestId("organization-metrics-kpi-newLearnersOnboarded")).toHaveTextContent(
      "3",
    );
    expect(
      screen.getByTestId("organization-metrics-kpi-totalRegisteredLearners"),
    ).toHaveTextContent("25");
    expect(
      screen.getByTestId("organization-metrics-kpi-avgSessionsPerActiveLearner"),
    ).toHaveTextContent("2.5");
    expect(
      screen.getByTestId("organization-metrics-kpi-avgPracticeMinutesPerLearner"),
    ).toHaveTextContent("18.4");
    expect(screen.getByTestId("organization-metrics-kpi-avgDaysToFirstSession")).toHaveTextContent(
      "1.2",
    );
  });

  it('renders "not enough data" instead of 0/NaN when a per-learner average has no denominator', () => {
    mockUseGetOrganizationMetricsQuery.mockReturnValue(
      queryResult({
        data: {
          ...BASE_RESPONSE,
          summary: {
            ...BASE_RESPONSE.summary,
            avgSessionsPerActiveLearner: null,
            avgPracticeMinutesPerLearner: null,
            avgDaysToFirstSession: null,
            learnersWithFirstSessionCount: 0,
          },
        },
      }),
    );
    render(<OrganizationMetrics />);

    expect(
      screen.getByTestId("organization-metrics-kpi-avgSessionsPerActiveLearner-not-enough-data"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("organization-metrics-kpi-avgPracticeMinutesPerLearner-not-enough-data"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("organization-metrics-kpi-avgDaysToFirstSession-not-enough-data"),
    ).toBeInTheDocument();
  });

  it("renders the most-used-simulations ranked list with rank, title, and session count", () => {
    render(<OrganizationMetrics />);

    const list = screen.getByTestId("organization-metrics-most-used-list");
    expect(list).toHaveTextContent("Difficult Conversation");
    expect(list).toHaveTextContent("De-escalation");
    expect(list.querySelectorAll("li")).toHaveLength(2);
  });

  it("shows the empty state for the ranked list when there is no usage data", () => {
    mockUseGetOrganizationMetricsQuery.mockReturnValue(
      queryResult({ data: { ...BASE_RESPONSE, mostUsedSimulations: [] } }),
    );
    render(<OrganizationMetrics />);

    expect(screen.queryByTestId("organization-metrics-most-used-list")).toBeNull();
  });

  it("offers an all-time range and queries it when picked", () => {
    render(<OrganizationMetrics />);

    expect(screen.getByTestId("toggle-all")).toHaveTextContent("All time");
    expect(screen.getByTestId("toggle-value")).toHaveTextContent("30d");

    fireEvent.click(screen.getByTestId("toggle-all"));

    expect(screen.getByTestId("toggle-value")).toHaveTextContent("all");
    expect(mockUseGetOrganizationMetricsQuery).toHaveBeenLastCalledWith(
      { range: "all" },
      { skip: false },
    );
  });

  it("renders a trend chart for simulations, active users, and new learners", () => {
    render(<OrganizationMetrics />);

    expect(screen.getAllByTestId("bar-chart")).toHaveLength(2); // simulations + new learners
    expect(screen.getAllByTestId("line-chart")).toHaveLength(1); // active users
  });

  const blockOrder = () =>
    screen
      .getAllByTestId(/^sortable-metric-block-/)
      .map(el => el.getAttribute("data-testid")?.replace("sortable-metric-block-", ""));

  it("renders the 6 chart/table blocks in the default order when no layout is saved", () => {
    render(<OrganizationMetrics />);

    expect(blockOrder()).toEqual([
      "simulationsTrend",
      "activeUsersTrend",
      "newLearnersTrend",
      "mostUsedSimulations",
      "learnerUsage",
      "courseUsage",
    ]);
  });

  it("renders blocks in the user's saved order", () => {
    mockUseGetUserPreferencesQuery.mockReturnValue(
      preferencesResult([
        "courseUsage",
        "learnerUsage",
        "mostUsedSimulations",
        "newLearnersTrend",
        "activeUsersTrend",
        "simulationsTrend",
      ]),
    );
    render(<OrganizationMetrics />);

    expect(blockOrder()).toEqual([
      "courseUsage",
      "learnerUsage",
      "mostUsedSimulations",
      "newLearnersTrend",
      "activeUsersTrend",
      "simulationsTrend",
    ]);
  });

  it("drops unknown/stale saved ids and appends any block missing from a saved layout", () => {
    mockUseGetUserPreferencesQuery.mockReturnValue(
      preferencesResult(["aRemovedBlock", "courseUsage"]),
    );
    render(<OrganizationMetrics />);

    // "courseUsage" keeps its saved position first; "aRemovedBlock" is
    // dropped entirely; every other block appends in default order.
    expect(blockOrder()).toEqual([
      "courseUsage",
      "simulationsTrend",
      "activeUsersTrend",
      "newLearnersTrend",
      "mostUsedSimulations",
      "learnerUsage",
    ]);
  });

  it("renders a drag handle for every block, labelled for assistive tech", () => {
    render(<OrganizationMetrics />);

    expect(screen.getAllByLabelText("Drag to reorder")).toHaveLength(6);
  });

  const drop = async (activeId: string, overId: string) => {
    expect(capturedOnDragEnd).toBeDefined();
    await act(async () => {
      await capturedOnDragEnd?.({ active: { id: activeId }, over: { id: overId } });
    });
  };

  const REORDERED = [
    "simulationsTrend",
    "newLearnersTrend",
    "activeUsersTrend",
    "mostUsedSimulations",
    "learnerUsage",
    "courseUsage",
  ];

  it("moves the block and saves the new order when a drag is dropped", async () => {
    mockUseGetUserPreferencesQuery.mockReturnValue(preferencesResult());
    mockUpdateUserPreferences.mockResolvedValue({ success: true });
    render(<OrganizationMetrics />);

    await drop("activeUsersTrend", "newLearnersTrend");

    expect(blockOrder()).toEqual(REORDERED);
    expect(mockUpdateUserPreferences).toHaveBeenCalledWith({ org_metrics_layout: REORDERED });
  });

  it("still moves the block when the user has no saved preferences at all", async () => {
    // GET /users/me/preferences answers `null` for a user with no preferences
    // row yet, so there is no `{ data }` envelope to read a layout out of —
    // the drop must still land, which it didn't while the rendered order came
    // only from that query's cache.
    mockUseGetUserPreferencesQuery.mockReturnValue({ data: null });
    mockUpdateUserPreferences.mockResolvedValue({ success: true });
    render(<OrganizationMetrics />);

    await drop("activeUsersTrend", "newLearnersTrend");

    expect(blockOrder()).toEqual(REORDERED);
    expect(mockUpdateUserPreferences).toHaveBeenCalledWith({ org_metrics_layout: REORDERED });
  });

  it("still saves the reorder when the drag finishes before getUserPreferences resolves", async () => {
    // The draggable blocks render regardless of that query's status.
    mockUseGetUserPreferencesQuery.mockReturnValue({ data: undefined });
    mockUpdateUserPreferences.mockResolvedValue({ success: true });
    render(<OrganizationMetrics />);

    await drop("activeUsersTrend", "newLearnersTrend");

    expect(mockUpdateUserPreferences).toHaveBeenCalledWith({ org_metrics_layout: REORDERED });
  });

  it("puts the blocks back and warns when the save fails", async () => {
    mockUseGetUserPreferencesQuery.mockReturnValue(preferencesResult());
    mockUpdateUserPreferences.mockRejectedValue(new Error("500"));
    render(<OrganizationMetrics />);

    await drop("activeUsersTrend", "newLearnersTrend");

    expect(blockOrder()).toEqual([
      "simulationsTrend",
      "activeUsersTrend",
      "newLearnersTrend",
      "mostUsedSimulations",
      "learnerUsage",
      "courseUsage",
    ]);
    expect(toast.error).toHaveBeenCalledWith("Couldn't save the new layout");
  });
});
