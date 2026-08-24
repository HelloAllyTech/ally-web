import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { AssignmentStatus, Simulation } from "@types";

import { SimulationsTab } from "../SimulationsTab";

// The cohort queries back the per-row group-targeting pill. Defaulted to an
// empty tenant here so these tests keep asserting the tab itself; the pill has
// its own test in CohortRestrictionCell.test.tsx.
const { mockUseGetSimulationsQuery, mockUseGetCohortsQuery, mockUseGetCohortRestrictionsQuery } = vi.hoisted(
  () => ({
    mockUseGetSimulationsQuery: vi.fn(),
    mockUseGetCohortsQuery: vi.fn(() => ({ data: undefined })),
    mockUseGetCohortRestrictionsQuery: vi.fn(() => ({ data: undefined })),
  }),
);

vi.mock("@api", () => ({
  useGetSimulationsQuery: mockUseGetSimulationsQuery,
  useGetCohortsQuery: mockUseGetCohortsQuery,
  useGetCohortRestrictionsQuery: mockUseGetCohortRestrictionsQuery,
  useSetCohortRestrictionsMutation: () => [vi.fn(), { isLoading: false }],
}));

vi.mock("@components", () => ({
  ListToolbar: ({ searchValue, onSearchChange, filter }: any) => (
    <div data-testid="list-toolbar">
      <input
        placeholder="Search"
        value={searchValue}
        onChange={e => onSearchChange(e.target.value)}
      />
      {filter}
    </div>
  ),
  EmptyState: ({ title }: any) => <div data-testid="empty-state">{title}</div>,
  EntityToggleCard: ({ entity, hasAccess, onToggleAccess }: any) => (
    <div data-testid={`entity-${entity.name}`}>
      <span>{entity.name}</span>
      <button
        data-testid={`toggle-${entity.name}`}
        data-enabled={hasAccess}
        onClick={() => onToggleAccess(!hasAccess)}
      >
        toggle
      </button>
    </div>
  ),
}));

vi.mock("@constants", () => ({
  en: {
    common: {
      search: "Search",
      loading: "Loading...",
      loadMore: "Load more",
    },
    userManagement: {
      simulations: "Simulations",
      access: "Access",
      all: "All",
      enabled: "Enabled",
      disabled: "Disabled",
      filterByAccess: "Filter by access",
    },
    simulation: {
      noResultFound: "No results found",
      adjustFilter: "Adjust filter",
    },
  },
  SORT_BY: { CREATED_AT: "createdAt", UPDATED_AT: "updatedAt" },
  SORT_ORDER: { ASC: "ASC", DESC: "DESC" },
}));

vi.mock("@utils", async () => vi.importActual("@src/utils/common"));

const makeSimulation = (id: number, isAssignedToTenant: boolean): Partial<Simulation> => ({
  id,
  title: `Sim ${id}`,
  description: `Description ${id}`,
  coverImageUrl: `https://example.com/${id}.jpg`,
  isAssignedToTenant,
});

const buildResponse = (simulations: Partial<Simulation>[]) => ({
  data: { data: simulations },
  isFetching: false,
  isLoading: false,
});

describe("SimulationsTab", () => {
  const defaultProps = {
    organizationId: "org-1",
    searchValue: "",
    onSearchChange: vi.fn(),
    onToggleAccess: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    defaultProps.onToggleAccess = vi.fn().mockResolvedValue(undefined);
    mockUseGetSimulationsQuery.mockReturnValue(
      buildResponse([makeSimulation(1, true), makeSimulation(2, false)]),
    );
  });

  it("requests all simulations by default (no assignmentStatus)", () => {
    render(<SimulationsTab {...defaultProps} />);

    expect(mockUseGetSimulationsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        tenantId: "org-1",
        offset: 0,
        assignmentStatus: undefined,
      }),
    );
    expect(screen.getByTestId("entity-Sim 1")).toBeInTheDocument();
    expect(screen.getByTestId("entity-Sim 2")).toBeInTheDocument();
  });

  it("requests assigned simulations when the Enabled filter is selected", async () => {
    const user = userEvent.setup();
    render(<SimulationsTab {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Enabled" }));

    expect(mockUseGetSimulationsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        assignmentStatus: AssignmentStatus.ASSIGNED,
        offset: 0,
      }),
    );
  });

  it("requests unassigned simulations when the Disabled filter is selected", async () => {
    const user = userEvent.setup();
    render(<SimulationsTab {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Disabled" }));

    expect(mockUseGetSimulationsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        assignmentStatus: AssignmentStatus.UNASSIGNED,
        offset: 0,
      }),
    );
  });

  it("clears the assignmentStatus when switching back to All", async () => {
    const user = userEvent.setup();
    render(<SimulationsTab {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Enabled" }));
    await user.click(screen.getByRole("button", { name: "All" }));

    expect(mockUseGetSimulationsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ assignmentStatus: undefined, offset: 0 }),
    );
  });

  it("combines the filter with an active search term", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<SimulationsTab {...defaultProps} searchValue="alpha" />);

    await user.click(screen.getByRole("button", { name: "Enabled" }));
    rerender(<SimulationsTab {...defaultProps} searchValue="alpha beta" />);

    expect(mockUseGetSimulationsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        search: "alpha beta",
        assignmentStatus: AssignmentStatus.ASSIGNED,
        offset: 0,
      }),
    );
  });

  it("resets pagination when the filter changes", async () => {
    const user = userEvent.setup();
    const fullPage = Array.from({ length: 30 }, (_, index) => makeSimulation(index + 1, true));
    mockUseGetSimulationsQuery.mockReturnValue(buildResponse(fullPage));

    render(<SimulationsTab {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /Load more/ }));
    expect(mockUseGetSimulationsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ offset: 30 }),
    );

    await user.click(screen.getByRole("button", { name: "Disabled" }));
    expect(mockUseGetSimulationsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        offset: 0,
        assignmentStatus: AssignmentStatus.UNASSIGNED,
      }),
    );
  });

  it("removes an item once it no longer matches the active filter", async () => {
    const user = userEvent.setup();
    render(<SimulationsTab {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Enabled" }));
    await user.click(screen.getByTestId("toggle-Sim 1"));

    expect(defaultProps.onToggleAccess).toHaveBeenCalledWith(1, false);
    await waitFor(() => {
      expect(screen.queryByTestId("entity-Sim 1")).not.toBeInTheDocument();
    });
  });

  it("keeps a toggled item visible when no filter is active", async () => {
    const user = userEvent.setup();
    render(<SimulationsTab {...defaultProps} />);

    await user.click(screen.getByTestId("toggle-Sim 1"));

    expect(defaultProps.onToggleAccess).toHaveBeenCalledWith(1, false);
    await waitFor(() => {
      expect(screen.getByTestId("toggle-Sim 1")).toHaveAttribute("data-enabled", "false");
    });
    expect(screen.getByTestId("entity-Sim 1")).toBeInTheDocument();
  });

  it("keeps the item and reverts the toggle when the request fails", async () => {
    const user = userEvent.setup();
    defaultProps.onToggleAccess = vi.fn().mockRejectedValue(new Error("failed"));
    render(<SimulationsTab {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Enabled" }));
    await user.click(screen.getByTestId("toggle-Sim 1"));

    await waitFor(() => {
      expect(screen.getByTestId("toggle-Sim 1")).toHaveAttribute("data-enabled", "true");
    });
    expect(screen.getByTestId("entity-Sim 1")).toBeInTheDocument();
  });
});
