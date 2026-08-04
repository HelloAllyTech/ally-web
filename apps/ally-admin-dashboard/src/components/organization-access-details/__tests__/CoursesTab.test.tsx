import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { AssignmentStatus, SimulationStatus, TrackListItem } from "@types";

import { CoursesTab } from "../CoursesTab";

const { mockUseGetTracksQuery } = vi.hoisted(() => ({
  mockUseGetTracksQuery: vi.fn(),
}));

vi.mock("@api", () => ({
  useGetTracksQuery: mockUseGetTracksQuery,
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
      courses: "Courses",
      access: "Access",
      all: "All",
      enabled: "Enabled",
      disabled: "Disabled",
      global: "Global",
      globalCourseHint: "Published to every organization from the course settings.",
      filterByAccess: "Filter by access",
      toggleAccess: (title: string) => `Toggle access for ${title}`,
    },
    simulation: {
      noResultFound: "No results found",
      adjustFilter: "Adjust filter",
    },
  },
}));

vi.mock("@utils", async () => vi.importActual("@src/utils/common"));

const makeCourse = (id: string, isAssignedToTenant: boolean, isGlobal = false): TrackListItem => ({
  id,
  title: `Course ${id}`,
  description: `Description ${id}`,
  coverImageUrl: `https://example.com/${id}.jpg`,
  status: SimulationStatus.ACTIVE,
  isGlobal,
  totalItems: 4,
  isAssignedToTenant,
  updatedAt: "2024-01-01T10:00:00Z",
});

describe("CoursesTab", () => {
  const defaultProps = {
    organizationId: "org-1",
    searchValue: "",
    onSearchChange: vi.fn(),
    onToggleAccess: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    defaultProps.onToggleAccess = vi.fn().mockResolvedValue(undefined);
    mockUseGetTracksQuery.mockReturnValue({
      data: { data: [makeCourse("track-1", true), makeCourse("track-2", false)] },
      isFetching: false,
      isLoading: false,
    });
  });

  it("requests active courses for the tenant by default (no assignmentStatus)", () => {
    render(<CoursesTab {...defaultProps} />);

    expect(mockUseGetTracksQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        tenantId: "org-1",
        status: SimulationStatus.ACTIVE,
        offset: 0,
        assignmentStatus: undefined,
      }),
    );
    expect(screen.getByText("Course track-1")).toBeInTheDocument();
    expect(screen.getByText("Course track-2")).toBeInTheDocument();
  });

  it("requests assigned courses with pagination reset when Enabled is selected", async () => {
    const user = userEvent.setup();
    render(<CoursesTab {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Enabled" }));

    expect(mockUseGetTracksQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        assignmentStatus: AssignmentStatus.ASSIGNED,
        offset: 0,
      }),
    );
  });

  it("combines the Disabled filter with an active search term", async () => {
    const user = userEvent.setup();
    render(<CoursesTab {...defaultProps} searchValue="alpha" />);

    await user.click(screen.getByRole("button", { name: "Disabled" }));

    expect(mockUseGetTracksQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        search: "alpha",
        assignmentStatus: AssignmentStatus.UNASSIGNED,
        offset: 0,
      }),
    );
  });

  it("marks global courses so the org-level toggle reads as inherited", () => {
    mockUseGetTracksQuery.mockReturnValue({
      data: { data: [makeCourse("track-1", true, true), makeCourse("track-2", false)] },
      isFetching: false,
      isLoading: false,
    });

    render(<CoursesTab {...defaultProps} />);

    expect(screen.getAllByText("Global")).toHaveLength(1);
  });

  it("removes a course once it no longer matches the active filter", async () => {
    const user = userEvent.setup();
    render(<CoursesTab {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Enabled" }));
    await user.click(screen.getByTestId("Toggle access for Course track-1"));

    expect(defaultProps.onToggleAccess).toHaveBeenCalledWith("track-1", false);
    await waitFor(() => {
      expect(screen.queryByText("Course track-1")).not.toBeInTheDocument();
    });
  });

  it("keeps the course and reverts the toggle when the request fails", async () => {
    const user = userEvent.setup();
    defaultProps.onToggleAccess = vi.fn().mockRejectedValue(new Error("failed"));
    render(<CoursesTab {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Enabled" }));
    await user.click(screen.getByTestId("Toggle access for Course track-1"));

    await waitFor(() => {
      expect(screen.getByTestId("Toggle access for Course track-1")).toHaveAttribute(
        "data-enabled",
        "true",
      );
    });
    expect(screen.getByText("Course track-1")).toBeInTheDocument();
  });
});
