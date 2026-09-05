import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Capture what the RTK query hook is called with so the skip logic can be
// asserted without standing up a real store.
const mockDashboardsQuery = vi.fn();
let mockUserValue: { id: number } | null = { id: 1 };
let mockPermissions: string[] = [];

vi.mock("@api", () => ({
  useGetDashboardsQuery: (arg: unknown, opts: unknown) => mockDashboardsQuery(arg, opts),
}));

vi.mock("@constants", () => ({
  Permissions: {
    VIEW_ANALYTICS_DASHBOARD: "view:analytics:dashboard",
    VIEW_ORGANIZATION_METRICS: "view:organization-metrics",
  },
}));

vi.mock("@hooks", () => ({
  useUser: () => ({ user: mockUserValue, permissions: mockPermissions }),
}));

vi.mock("@utils", () => ({
  hasPermissions: (permissions: string[] | null | undefined, required: string) =>
    Array.isArray(permissions) && permissions.includes(required),
}));

import { useCanViewAnalytics } from "../useCanViewAnalytics";

describe("useCanViewAnalytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserValue = { id: 1 };
    mockPermissions = [];
    mockDashboardsQuery.mockReturnValue({ data: undefined, isLoading: false });
  });

  it("hides the tab when the user lacks the analytics permission", () => {
    mockPermissions = ["view:call:logs"];
    const { result } = renderHook(() => useCanViewAnalytics());

    expect(result.current.canView).toBe(false);
    expect(mockDashboardsQuery).toHaveBeenCalledWith(undefined, { skip: true });
  });

  it("hides the tab when the tenant has no dashboards registered", () => {
    // The regression this hook exists for: permission held, nothing to show.
    mockPermissions = ["view:analytics:dashboard"];
    mockDashboardsQuery.mockReturnValue({ data: [], isLoading: false });

    const { result } = renderHook(() => useCanViewAnalytics());

    expect(result.current.canView).toBe(false);
    expect(result.current.isGateLoading).toBe(false);
  });

  it("shows the tab when the tenant has at least one dashboard", () => {
    mockPermissions = ["view:analytics:dashboard"];
    mockDashboardsQuery.mockReturnValue({
      data: [{ id: "1", externalId: "e1", name: "Calls", analyticsType: "CALL_LOG_ANALYTICS" }],
      isLoading: false,
    });

    const { result } = renderHook(() => useCanViewAnalytics());

    expect(result.current.canView).toBe(true);
  });

  it("shows the tab for native org metrics without asking for dashboards", () => {
    // Organization Metrics is built from our own tables, so it renders for a
    // tenant that has never had a Metabase dashboard.
    mockPermissions = ["view:analytics:dashboard", "view:organization-metrics"];

    const { result } = renderHook(() => useCanViewAnalytics());

    expect(result.current.canView).toBe(true);
    expect(mockDashboardsQuery).toHaveBeenCalledWith(undefined, { skip: true });
  });

  it("reports the gate as loading while the dashboards query is in flight", () => {
    mockPermissions = ["view:analytics:dashboard"];
    mockDashboardsQuery.mockReturnValue({ data: undefined, isLoading: true });

    const { result } = renderHook(() => useCanViewAnalytics());

    expect(result.current.canView).toBe(false);
    expect(result.current.isGateLoading).toBe(true);
  });

  it("hides the tab and skips the query when there is no user yet", () => {
    mockUserValue = null;
    mockPermissions = ["view:analytics:dashboard"];

    const { result } = renderHook(() => useCanViewAnalytics());

    expect(result.current.canView).toBe(false);
    expect(mockDashboardsQuery).toHaveBeenCalledWith(undefined, { skip: true });
  });
});
