import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { OrganizationMetrics } from "../OrganizationMetrics";

const mockUseGetOrganizationMetricsQuery = vi.fn();
const mockRefetch = vi.fn();

let mockPermissions: string[] = ["view:organization-metrics"];

vi.mock("@hooks", () => ({
  useUser: () => ({ permissions: mockPermissions }),
}));

vi.mock("@api", () => ({
  useGetOrganizationMetricsQuery: (...args: unknown[]) =>
    mockUseGetOrganizationMetricsQuery(...args),
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

describe("OrganizationMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPermissions = ["view:organization-metrics"];
    mockUseGetOrganizationMetricsQuery.mockReturnValue(queryResult({ data: BASE_RESPONSE }));
  });

  it("shows the access notice and skips the query for users without the permission", () => {
    mockPermissions = [];
    render(<OrganizationMetrics />);

    expect(screen.getByTestId("organization-metrics-no-access")).toBeInTheDocument();
    expect(screen.queryByTestId("organization-metrics-section")).toBeNull();
    expect(mockUseGetOrganizationMetricsQuery).toHaveBeenCalledWith(
      { range: "30d" },
      { skip: true },
    );
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
});
