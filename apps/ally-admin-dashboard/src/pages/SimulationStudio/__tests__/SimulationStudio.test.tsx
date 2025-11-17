import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Hoist mocks to avoid initialization errors
const {
  mockNavigate,
  mockToast,
  mockUseGetSimulationsQuery,
  mockDeleteSimulation,
  mockUpdateSimulation,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  mockUseGetSimulationsQuery: vi.fn(),
  mockDeleteSimulation: vi.fn(),
  mockUpdateSimulation: vi.fn(),
}));

// Mock react-router-dom
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: mockToast,
}));

// Mock API hooks
vi.mock("@api", async importOriginal => {
  const actual = await importOriginal<typeof import("@api")>();
  return {
    ...actual,
    useGetSimulationsQuery: (...args: any[]) => mockUseGetSimulationsQuery(...args),
    useDeleteSimulationByIdMutation: () => [mockDeleteSimulation, {}],
    useUpdateSimulationByIdMutation: () => [mockUpdateSimulation, {}],
  };
});

// Mock components
vi.mock("@components", async importOriginal => {
  const actual = await importOriginal<typeof import("@components")>();
  return {
    ...actual,
    ActionConfirmationPopup: ({
      isOpen,
      onClose,
      primaryButton,
      secondaryButton,
      title,
      titleItalic,
      description,
    }: any) =>
      isOpen ? (
        <div data-testid="action-confirmation-popup">
          <h2>
            {title} {titleItalic}
          </h2>
          <p>{description}</p>
          <button onClick={primaryButton.onClick} data-testid="primary-button">
            {primaryButton.label}
          </button>
          <button onClick={secondaryButton.onClick} data-testid="secondary-button">
            {secondaryButton.label}
          </button>
          <button onClick={onClose} data-testid="close-button">
            Close
          </button>
        </div>
      ) : null,
    DeleteSimulationPopup: ({ isOpen, onClose, onConfirmDelete, simulation }: any) =>
      isOpen ? (
        <div data-testid="delete-simulation-popup">
          <h2>Delete {simulation?.title}?</h2>
          <button onClick={onConfirmDelete} data-testid="confirm-delete">
            Confirm Delete
          </button>
          <button onClick={onClose} data-testid="cancel-delete">
            Cancel
          </button>
        </div>
      ) : null,
    SimulationList: ({
      simulations,
      onEdit,
      onDelete,
      onPreview,
      onArchive,
      onUnpublish,
      onUnarchive,
      footer,
    }: any) => (
      <div data-testid="simulation-list">
        {simulations.map((simulation: any) => (
          <div key={simulation.id} data-testid={`simulation-${simulation.id}`}>
            <h3>{simulation.title}</h3>
            <span>Status: {simulation.status}</span>
            <button onClick={() => onEdit?.(simulation)} data-testid={`edit-${simulation.id}`}>
              Edit
            </button>
            <button onClick={() => onDelete?.(simulation)} data-testid={`delete-${simulation.id}`}>
              Delete
            </button>
            <button
              onClick={() => onPreview?.(simulation)}
              data-testid={`preview-${simulation.id}`}
            >
              Preview
            </button>
            <button
              onClick={() => onArchive?.(simulation)}
              data-testid={`archive-${simulation.id}`}
            >
              Archive
            </button>
            <button
              onClick={() => onUnpublish?.(simulation)}
              data-testid={`unpublish-${simulation.id}`}
            >
              Unpublish
            </button>
            <button
              onClick={() => onUnarchive?.(simulation)}
              data-testid={`unarchive-${simulation.id}`}
            >
              Unarchive
            </button>
          </div>
        ))}
        {footer}
      </div>
    ),
    SimulationListSkeleton: () => <div data-testid="simulation-skeleton">Loading...</div>,
    SimulationPreview: ({ simulation, isOpen, onClose }: any) =>
      isOpen ? (
        <div data-testid="simulation-preview">
          <h2>{simulation.title}</h2>
          <button onClick={onClose} data-testid="close-preview">
            Close Preview
          </button>
        </div>
      ) : null,
    FilterList: ({ isOpen, onClose, onApply, selectedFilters }: any) =>
      isOpen ? (
        <div data-testid="filter-list">
          <button
            onClick={() => onApply([{ id: "ACTIVE", label: "Active" }])}
            data-testid="apply-filter"
          >
            Apply Filter
          </button>
          <button onClick={onClose} data-testid="close-filter">
            Close
          </button>
        </div>
      ) : null,
    EmptyState: ({ title, subtitle }: any) => (
      <div data-testid="empty-state">
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
    ),
  };
});

// Mock assets
vi.mock("@assets", () => ({
  Add: () => <svg data-testid="add-icon">+</svg>,
  Close: () => <svg data-testid="close-icon">×</svg>,
  Filter: () => <svg data-testid="filter-icon">Filter</svg>,
}));

// Mock SimulationCreator constants
vi.mock("@constants/SimulationCreator", () => ({
  STEP1_FIELDS: [],
  STEP2_FIELDS: [],
  STEP3_FIELDS: [],
  STEP4_FIELDS: [],
  STEP5_FIELDS: [],
  eventsTableColumns: [],
}));

// Mock constants
vi.mock("@constants", async importOriginal => {
  const actual = await importOriginal<typeof import("@constants")>();
  return {
    ...actual,
    en: {
      ...(actual.en || {}),
      simulation: {
        simulationstudio: "Simulation Studio",
        newSimulation: "New Simulation",
        createSimulation: "Create Simulation",
        createYourFirstSimulation: "Create your first",
        simulation: "simulation",
        newSimulationDescription: "Get started by creating a new simulation scenario",
        unpublish: "Unpublish",
        unpublishDescription: "Are you sure you want to unpublish this simulation?",
        archive: "Archive",
        archiveDescription: "Are you sure you want to archive this simulation?",
        unarchive: "Unarchive",
        unarchiveDescription: "Are you sure you want to unarchive this simulation?",
        edit: "Edit",
        editDescription: "Editing will create a new version",
        cancel: "Cancel",
        noResultFound: "No results found",
        adjustFilter: "Try adjusting your filters",
      },
      common: {
        loading: "Loading...",
        loadMore: "Load more",
      },
    },
    ROUTES: {
      CREATE_SIMULATION: "/create-simulation",
      EDIT_SIMULATION: (id: string) => `/edit-simulation/${id}`,
    },
    SimulationStatus: {
      ACTIVE: "ACTIVE",
      DRAFT: "DRAFT",
      ARCHIVED: "ARCHIVED",
      PUBLISHED: "PUBLISHED",
    },
    SORT_BY: {
      UPDATED_AT: "updatedAt",
    },
    SORT_ORDER: {
      DESC: "desc",
    },
  };
});

import { SimulationStatus } from "@types";

import { SimulationStudio } from "../SimulationStudio";

describe("SimulationStudio", () => {
  const mockSimulations = [
    {
      id: "sim-1",
      title: "Test Simulation 1",
      description: "Description 1",
      coverImageUrl: "http://example.com/image1.jpg",
      createdBy: "user1",
      updatedAt: "2024-01-01T00:00:00Z",
      status: SimulationStatus.DRAFT,
      isPreviewEnabled: true,
      usage: 10,
    },
    {
      id: "sim-2",
      title: "Test Simulation 2",
      description: "Description 2",
      coverImageUrl: "http://example.com/image2.jpg",
      createdBy: "user2",
      updatedAt: "2024-01-02T00:00:00Z",
      status: SimulationStatus.PUBLISHED,
      isPreviewEnabled: true,
      usage: 20,
    },
    {
      id: "sim-3",
      title: "Test Simulation 3",
      description: "Description 3",
      coverImageUrl: "http://example.com/image3.jpg",
      createdBy: "user3",
      updatedAt: "2024-01-03T00:00:00Z",
      status: SimulationStatus.ARCHIVED,
      isPreviewEnabled: false,
      usage: 5,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGetSimulationsQuery.mockReturnValue({
      data: { data: mockSimulations, count: 3 },
      isFetching: false,
      isLoading: false,
    });
    mockDeleteSimulation.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    });
    mockUpdateSimulation.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    });
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <SimulationStudio />
      </BrowserRouter>,
    );
  };

  describe("Initial rendering", () => {
    it("renders the page title", () => {
      renderComponent();
      expect(screen.getByText("Simulation Studio")).toBeInTheDocument();
    });

    it("renders the new simulation button", () => {
      renderComponent();
      expect(screen.getByText("New Simulation")).toBeInTheDocument();
    });

    it("renders filter button", () => {
      renderComponent();
      expect(screen.getByTestId("filter-icon")).toBeInTheDocument();
    });

    it("renders simulation list when data is available", async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("simulation-list")).toBeInTheDocument();
      });
    });

    it("displays all simulations", async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Test Simulation 1")).toBeInTheDocument();
        expect(screen.getByText("Test Simulation 2")).toBeInTheDocument();
        expect(screen.getByText("Test Simulation 3")).toBeInTheDocument();
      });
    });
  });

  describe("Loading state", () => {
    it("shows skeleton loader when fetching initial data", () => {
      mockUseGetSimulationsQuery.mockReturnValue({
        data: undefined,
        isFetching: false,
        isLoading: true,
      });

      renderComponent();
      expect(screen.getByTestId("simulation-skeleton")).toBeInTheDocument();
    });

    it("does not show skeleton when loading more data", async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.queryByTestId("simulation-skeleton")).not.toBeInTheDocument();
      });
    });
  });

  describe("Empty states", () => {
    it("shows empty state when no simulations exist", async () => {
      mockUseGetSimulationsQuery.mockReturnValue({
        data: { data: [], count: 0 },
        isFetching: false,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Create your first")).toBeInTheDocument();
        expect(screen.getByText("simulation")).toBeInTheDocument();
      });
    });

    it("shows create simulation button in empty state", async () => {
      mockUseGetSimulationsQuery.mockReturnValue({
        data: { data: [], count: 0 },
        isFetching: false,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Create Simulation")).toBeInTheDocument();
      });
    });

    it("shows filtered empty state when filters are applied with no results", async () => {
      mockUseGetSimulationsQuery.mockReturnValue({
        data: { data: [], count: 0 },
        isFetching: false,
      });

      renderComponent();

      // Apply filter first
      const filterButton = screen.getByTestId("filter-icon").closest("button");
      if (filterButton) fireEvent.click(filterButton);

      await waitFor(() => {
        const applyFilterButton = screen.getByTestId("apply-filter");
        fireEvent.click(applyFilterButton);
      });

      // Wait for empty state with filters
      mockUseGetSimulationsQuery.mockReturnValue({
        data: { data: [], count: 0 },
        isFetching: false,
      });

      await waitFor(() => {
        expect(screen.getByText("No results found")).toBeInTheDocument();
        expect(screen.getByText("Try adjusting your filters")).toBeInTheDocument();
      });
    });
  });

  describe("Navigation", () => {
    it("navigates to create simulation when new simulation button is clicked", () => {
      renderComponent();

      const newSimButton = screen.getByText("New Simulation");
      fireEvent.click(newSimButton);

      expect(mockNavigate).toHaveBeenCalledWith("/create-simulation");
    });

    it("navigates to create simulation from empty state", async () => {
      mockUseGetSimulationsQuery.mockReturnValue({
        data: { data: [], count: 0 },
        isFetching: false,
      });

      renderComponent();

      await waitFor(() => {
        const createButton = screen.getByText("Create Simulation");
        fireEvent.click(createButton);
      });

      expect(mockNavigate).toHaveBeenCalledWith("/create-simulation");
    });

    it("navigates to edit simulation for draft status", async () => {
      renderComponent();

      await waitFor(() => {
        const editButton = screen.getByTestId("edit-sim-1");
        fireEvent.click(editButton);
      });

      expect(mockNavigate).toHaveBeenCalledWith("/edit-simulation/sim-1");
    });

    it("shows edit confirmation popup for published simulation", async () => {
      renderComponent();

      await waitFor(() => {
        const editButton = screen.getByTestId("edit-sim-2");
        fireEvent.click(editButton);
      });

      expect(screen.getByTestId("action-confirmation-popup")).toBeInTheDocument();
      expect(screen.getByText("Edit simulation")).toBeInTheDocument();
    });

    it("navigates to edit when confirming edit for published simulation", async () => {
      renderComponent();

      await waitFor(() => {
        const editButton = screen.getByTestId("edit-sim-2");
        fireEvent.click(editButton);
      });

      const confirmButton = screen.getByTestId("primary-button");
      fireEvent.click(confirmButton);

      expect(mockNavigate).toHaveBeenCalledWith("/edit-simulation/sim-2");
    });
  });

  describe("Filter functionality", () => {
    it("opens filter list when filter button is clicked", async () => {
      renderComponent();

      const filterButton = screen.getByTestId("filter-icon").closest("button");
      if (filterButton) fireEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByTestId("filter-list")).toBeInTheDocument();
      });
    });

    it("closes filter list when close is clicked", async () => {
      renderComponent();

      const filterButton = screen.getByTestId("filter-icon").closest("button");
      if (filterButton) fireEvent.click(filterButton);

      await waitFor(() => {
        const closeButton = screen.getByTestId("close-filter");
        fireEvent.click(closeButton);
      });

      expect(screen.queryByTestId("filter-list")).not.toBeInTheDocument();
    });

    it("applies filters and displays filter chips", async () => {
      renderComponent();

      const filterButton = screen.getByTestId("filter-icon").closest("button");
      if (filterButton) fireEvent.click(filterButton);

      await waitFor(() => {
        const applyButton = screen.getByTestId("apply-filter");
        fireEvent.click(applyButton);
      });

      await waitFor(() => {
        expect(screen.getByText("Active")).toBeInTheDocument();
      });
    });

    it("removes filter chip when close icon is clicked", async () => {
      renderComponent();

      const filterButton = screen.getByTestId("filter-icon").closest("button");
      if (filterButton) fireEvent.click(filterButton);

      await waitFor(() => {
        const applyButton = screen.getByTestId("apply-filter");
        fireEvent.click(applyButton);
      });

      await waitFor(() => {
        const filterChip = screen.getByText("Active");
        expect(filterChip).toBeInTheDocument();

        const closeButton = filterChip.parentElement?.querySelector("button");
        if (closeButton) fireEvent.click(closeButton);
      });

      await waitFor(() => {
        expect(screen.queryByText("Active")).not.toBeInTheDocument();
      });
    });
  });

  describe("Simulation actions", () => {
    it("opens preview when preview button is clicked", async () => {
      renderComponent();

      await waitFor(() => {
        const previewButton = screen.getByTestId("preview-sim-1");
        fireEvent.click(previewButton);
      });

      expect(screen.getByTestId("simulation-preview")).toBeInTheDocument();
      // Use getAllByText since the simulation title appears in both list and preview
      const titles = screen.getAllByText("Test Simulation 1");
      expect(titles.length).toBeGreaterThan(0);
    });

    it("closes preview when close is clicked", async () => {
      renderComponent();

      await waitFor(() => {
        const previewButton = screen.getByTestId("preview-sim-1");
        fireEvent.click(previewButton);
      });

      const closeButton = screen.getByTestId("close-preview");
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId("simulation-preview")).not.toBeInTheDocument();
      });
    });

    it("opens delete popup when delete button is clicked", async () => {
      renderComponent();

      await waitFor(() => {
        const deleteButton = screen.getByTestId("delete-sim-1");
        fireEvent.click(deleteButton);
      });

      expect(screen.getByTestId("delete-simulation-popup")).toBeInTheDocument();
    });

    it("deletes simulation and shows success toast", async () => {
      renderComponent();

      await waitFor(() => {
        const deleteButton = screen.getByTestId("delete-sim-1");
        fireEvent.click(deleteButton);
      });

      const confirmButton = screen.getByTestId("confirm-delete");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockDeleteSimulation).toHaveBeenCalledWith("sim-1");
        expect(mockToast.success).toHaveBeenCalledWith("Simulation deleted successfully");
      });
    });

    it("shows error toast when delete fails", async () => {
      mockDeleteSimulation.mockReturnValue({
        unwrap: vi.fn().mockRejectedValue(new Error("Delete failed")),
      });

      renderComponent();

      await waitFor(() => {
        const deleteButton = screen.getByTestId("delete-sim-1");
        fireEvent.click(deleteButton);
      });

      const confirmButton = screen.getByTestId("confirm-delete");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Failed to delete simulation");
      });
    });
  });

  describe("Archive functionality", () => {
    it("opens archive popup when archive button is clicked", async () => {
      renderComponent();

      await waitFor(() => {
        const archiveButton = screen.getByTestId("archive-sim-1");
        fireEvent.click(archiveButton);
      });

      expect(screen.getByTestId("action-confirmation-popup")).toBeInTheDocument();
      expect(screen.getByText("Archive simulation?")).toBeInTheDocument();
    });

    it("archives simulation successfully", async () => {
      renderComponent();

      await waitFor(() => {
        const archiveButton = screen.getByTestId("archive-sim-1");
        fireEvent.click(archiveButton);
      });

      const confirmButton = screen.getByTestId("primary-button");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockUpdateSimulation).toHaveBeenCalledWith({
          id: "sim-1",
          simulation: { status: "ARCHIVED", title: "Test Simulation 1" },
        });
        expect(mockToast.success).toHaveBeenCalledWith("Updated simulation status to ARCHIVED");
      });
    });

    it("opens unarchive popup when unarchive button is clicked", async () => {
      renderComponent();

      await waitFor(() => {
        const unarchiveButton = screen.getByTestId("unarchive-sim-3");
        fireEvent.click(unarchiveButton);
      });

      expect(screen.getByTestId("action-confirmation-popup")).toBeInTheDocument();
      expect(screen.getByText("Unarchive simulation?")).toBeInTheDocument();
    });

    it("unarchives simulation successfully", async () => {
      renderComponent();

      await waitFor(() => {
        const unarchiveButton = screen.getByTestId("unarchive-sim-3");
        fireEvent.click(unarchiveButton);
      });

      const confirmButton = screen.getByTestId("primary-button");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockUpdateSimulation).toHaveBeenCalledWith({
          id: "sim-3",
          simulation: { status: "DRAFT", title: "Test Simulation 3" },
        });
      });
    });
  });

  describe("Unpublish functionality", () => {
    it("opens unpublish popup when unpublish button is clicked", async () => {
      renderComponent();

      await waitFor(() => {
        const unpublishButton = screen.getByTestId("unpublish-sim-2");
        fireEvent.click(unpublishButton);
      });

      expect(screen.getByTestId("action-confirmation-popup")).toBeInTheDocument();
      expect(screen.getByText("Unpublish simulation?")).toBeInTheDocument();
    });

    it("unpublishes simulation successfully", async () => {
      renderComponent();

      await waitFor(() => {
        const unpublishButton = screen.getByTestId("unpublish-sim-2");
        fireEvent.click(unpublishButton);
      });

      const confirmButton = screen.getByTestId("primary-button");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockUpdateSimulation).toHaveBeenCalledWith({
          id: "sim-2",
          simulation: { status: "DRAFT", title: "Test Simulation 2" },
        });
        expect(mockToast.success).toHaveBeenCalledWith("Updated simulation status to DRAFT");
      });
    });

    it("shows error toast when status update fails", async () => {
      mockUpdateSimulation.mockReturnValue({
        unwrap: vi.fn().mockRejectedValue(new Error("Update failed")),
      });

      renderComponent();

      await waitFor(() => {
        const unpublishButton = screen.getByTestId("unpublish-sim-2");
        fireEvent.click(unpublishButton);
      });

      const confirmButton = screen.getByTestId("primary-button");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Failed to change simulation status");
      });
    });
  });

  describe("Pagination", () => {
    it("shows load more button when there are more simulations", async () => {
      // Create exactly 30 simulations to trigger "load more" button
      const thirtySimulations = new Array(30).fill(null).map((_, index) => ({
        ...mockSimulations[0],
        id: `sim-${index}`,
        title: `Simulation ${index}`,
      }));

      mockUseGetSimulationsQuery.mockReturnValue({
        data: { data: thirtySimulations, count: 30 },
        isFetching: false,
      });

      renderComponent();

      await waitFor(
        () => {
          // Check for the "+" character that precedes "Load more"
          expect(screen.getByText(/Load more/i)).toBeInTheDocument();
        },
        { timeout: 2000 },
      );
    });

    it("does not show load more button when all simulations are loaded", async () => {
      mockUseGetSimulationsQuery.mockReturnValue({
        data: { data: mockSimulations.slice(0, 2), count: 2 },
        isFetching: false,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.queryByText("Load more")).not.toBeInTheDocument();
      });
    });

    it("shows loading text when fetching more data", async () => {
      const thirtySimulations = new Array(30).fill(null).map((_, index) => ({
        ...mockSimulations[0],
        id: `sim-${index}`,
        title: `Simulation ${index}`,
      }));

      mockUseGetSimulationsQuery.mockReturnValue({
        data: { data: thirtySimulations, count: 30 },
        isFetching: true,
      });

      renderComponent();

      await waitFor(
        () => {
          expect(screen.getByText(/Loading\.\.\./i)).toBeInTheDocument();
        },
        { timeout: 2000 },
      );
    });
  });

  describe("Popup interactions", () => {
    it("closes archive popup when cancel is clicked", async () => {
      renderComponent();

      await waitFor(() => {
        const archiveButton = screen.getByTestId("archive-sim-1");
        fireEvent.click(archiveButton);
      });

      const cancelButton = screen.getByTestId("secondary-button");
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText("Archive simulation?")).not.toBeInTheDocument();
      });
    });

    it("closes unpublish popup when cancel is clicked", async () => {
      renderComponent();

      await waitFor(() => {
        const unpublishButton = screen.getByTestId("unpublish-sim-2");
        fireEvent.click(unpublishButton);
      });

      const cancelButton = screen.getByTestId("secondary-button");
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText("Unpublish simulation?")).not.toBeInTheDocument();
      });
    });

    it("closes delete popup when cancel is clicked", async () => {
      renderComponent();

      await waitFor(() => {
        const deleteButton = screen.getByTestId("delete-sim-1");
        fireEvent.click(deleteButton);
      });

      const cancelButton = screen.getByTestId("cancel-delete");
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByTestId("delete-simulation-popup")).not.toBeInTheDocument();
      });
    });

    it("closes edit popup when cancel is clicked", async () => {
      renderComponent();

      await waitFor(() => {
        const editButton = screen.getByTestId("edit-sim-2");
        fireEvent.click(editButton);
      });

      const cancelButton = screen.getByTestId("secondary-button");
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText("Edit simulation")).not.toBeInTheDocument();
      });
    });
  });

  describe("API query parameters", () => {
    it("calls API with correct default parameters", () => {
      renderComponent();

      expect(mockUseGetSimulationsQuery).toHaveBeenCalledWith({
        limit: 30,
        offset: 0,
        sortBy: "updatedAt",
        order: "desc",
        status: undefined,
      });
    });

    it("includes filter status in API call when filters are applied", async () => {
      renderComponent();

      const filterButton = screen.getByTestId("filter-icon").closest("button");
      if (filterButton) fireEvent.click(filterButton);

      await waitFor(() => {
        const applyButton = screen.getByTestId("apply-filter");
        fireEvent.click(applyButton);
      });

      await waitFor(() => {
        expect(mockUseGetSimulationsQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "ACTIVE",
          }),
        );
      });
    });

    it("resets offset when filters change", async () => {
      renderComponent();

      // First verify initial offset is 0
      expect(mockUseGetSimulationsQuery).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 0 }),
      );

      const filterButton = screen.getByTestId("filter-icon").closest("button");
      if (filterButton) fireEvent.click(filterButton);

      await waitFor(() => {
        const applyButton = screen.getByTestId("apply-filter");
        fireEvent.click(applyButton);
      });

      // After filter change, offset should reset to 0
      await waitFor(() => {
        expect(mockUseGetSimulationsQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            offset: 0,
            status: "ACTIVE",
          }),
        );
      });
    });
  });
});
