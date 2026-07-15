import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { AssignmentStatus, ScenarioPath } from "@types";

import { CasesTab } from "../CasesTab";

const { mockUseGetScenarioCasesQuery } = vi.hoisted(() => ({
  mockUseGetScenarioCasesQuery: vi.fn(),
}));

vi.mock("@api", () => ({
  useGetScenarioCasesQuery: mockUseGetScenarioCasesQuery,
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  CustomImage: ({ alt }: any) => <img alt={alt} />,
}));

vi.mock("@assets", () => ({
  BookWhite: () => <svg data-testid="book-icon" />,
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
  ToggleSwitch: ({ enabled, onChange, label }: any) => (
    <button data-testid={label} data-enabled={enabled} onClick={() => onChange(!enabled)}>
      {label}
    </button>
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
      cases: "Cases",
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
}));

vi.mock("@utils", async () => vi.importActual("@src/utils/common"));

const makeCase = (id: number, isAssignedToTenant: boolean): Partial<ScenarioPath> => ({
  id,
  title: `Case ${id}`,
  description: `Description ${id}`,
  coverImageUrl: `https://example.com/${id}.jpg`,
  totalScenarios: 3,
  isAssignedToTenant,
});

describe("CasesTab", () => {
  const defaultProps = {
    organizationId: "org-1",
    searchValue: "",
    onSearchChange: vi.fn(),
    onToggleAccess: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    defaultProps.onToggleAccess = vi.fn().mockResolvedValue(undefined);
    mockUseGetScenarioCasesQuery.mockReturnValue({
      data: { data: [makeCase(1, true), makeCase(2, false)] },
      isFetching: false,
      isLoading: false,
    });
  });

  it("requests all cases by default (no assignmentStatus)", () => {
    render(<CasesTab {...defaultProps} />);

    expect(mockUseGetScenarioCasesQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        tenantId: "org-1",
        offset: 0,
        assignmentStatus: undefined,
      }),
    );
    expect(screen.getByText("Case 1")).toBeInTheDocument();
    expect(screen.getByText("Case 2")).toBeInTheDocument();
  });

  it("requests assigned cases with pagination reset when Enabled is selected", async () => {
    const user = userEvent.setup();
    render(<CasesTab {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Enabled" }));

    expect(mockUseGetScenarioCasesQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        assignmentStatus: AssignmentStatus.ASSIGNED,
        offset: 0,
      }),
    );
  });

  it("combines the Disabled filter with an active search term", async () => {
    const user = userEvent.setup();
    render(<CasesTab {...defaultProps} searchValue="alpha" />);

    await user.click(screen.getByRole("button", { name: "Disabled" }));

    expect(mockUseGetScenarioCasesQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        search: "alpha",
        assignmentStatus: AssignmentStatus.UNASSIGNED,
        offset: 0,
      }),
    );
  });

  it("removes a case once it no longer matches the active filter", async () => {
    const user = userEvent.setup();
    render(<CasesTab {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Enabled" }));
    await user.click(screen.getByTestId("Toggle access for Case 1"));

    expect(defaultProps.onToggleAccess).toHaveBeenCalledWith(1, false);
    await waitFor(() => {
      expect(screen.queryByText("Case 1")).not.toBeInTheDocument();
    });
  });

  it("keeps the case and reverts the toggle when the request fails", async () => {
    const user = userEvent.setup();
    defaultProps.onToggleAccess = vi.fn().mockRejectedValue(new Error("failed"));
    render(<CasesTab {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Enabled" }));
    await user.click(screen.getByTestId("Toggle access for Case 1"));

    await waitFor(() => {
      expect(screen.getByTestId("Toggle access for Case 1")).toHaveAttribute(
        "data-enabled",
        "true",
      );
    });
    expect(screen.getByText("Case 1")).toBeInTheDocument();
  });
});
