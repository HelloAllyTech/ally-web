import { render, screen, fireEvent } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { Simulation, SimulationStatus } from "@types";
import reportUploadReducer from "@reducer/reportUploadReducer";

import { SimulationList } from "../SimulationList";

const createTestStore = () =>
  configureStore({
    reducer: { reportUpload: reportUploadReducer.reducer },
    preloadedState: {
      reportUpload: { uploads: [], currentScenarioId: undefined },
    },
  });

const renderWithStore = (ui: React.ReactElement, store = createTestStore()) =>
  render(ui, {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  });

// Mock the assets
vi.mock("@assets", () => ({
  Add: () => <div data-testid="add-icon">Add</div>,
  Edit: () => <div data-testid="edit-icon">Edit</div>,
  Eye: () => <div data-testid="eye-icon">Eye</div>,
  Unpublish: () => <div data-testid="unpublish-icon">Unpublish</div>,
  Archive: () => <div data-testid="archive-icon">Archive</div>,
  Delete: () => <div data-testid="delete-icon">Delete</div>,
  Play: () => <div data-testid="play-icon">Play</div>,
  Unarchive: () => <div data-testid="unarchive-icon">Unarchive</div>,
  Copy: () => <div data-testid="copy-icon">Copy</div>,
}));

// Mock components
vi.mock("@components", () => ({
  DataList: ({ items, columns, actions, footer, thumbnailConfig, titleConfig }: any) => (
    <div className="overflow-x-auto overflow-y-scroll">
      <div className="group hover:shadow-sm">
        {columns.map((col: any) => (
          <div key={col.key}>{col.label}</div>
        ))}
        {items.map((item: any) => (
          <div key={item.id}>
            {thumbnailConfig && (
              <div
                onClick={() => {
                  if (thumbnailConfig.show && thumbnailConfig.show(item)) {
                    thumbnailConfig.onClick?.(item);
                  }
                }}
              >
                <img
                  src={item.coverImageUrl}
                  alt={item.title}
                  className="thumbnail"
                  data-testid="custom-image"
                />
              </div>
            )}
            {titleConfig && (
              <div
                onClick={() => {
                  if (thumbnailConfig?.show && thumbnailConfig.show(item)) {
                    titleConfig.onClick?.(item);
                  }
                }}
              >
                {item.title}
              </div>
            )}
            <div>{item.description}</div>
            {columns.map((col: any) => col.render && <div key={col.key}>{col.render(item)}</div>)}
            {actions.map(
              (action: any, idx: number) =>
                (!action.show || action.show(item)) && (
                  <button key={idx} onClick={() => action.onClick(item)}>
                    {action.icon}
                  </button>
                ),
            )}
          </div>
        ))}
        {footer}
      </div>
    </div>
  ),
  SimulationListSkeleton: () => <div data-testid="simulation-skeleton">Loading...</div>,
  EmptyState: ({ title, subtitle }: any) => (
    <div data-testid="empty-state">
      <h3>{title}</h3>
      <p>{subtitle}</p>
    </div>
  ),
}));

// Mock constants
vi.mock("@constants", () => ({
  en: {
    simulation: {
      simulation: "Simulation",
      createdBy: "Created By",
      lastModified: "Last Modified",
      status: "Status",
      usage: "Usage",
      edit: "Edit",
      unpublish: "Unpublish",
      archive: "Archive",
      unarchive: "Unarchive",
      delete: "Delete",
      preview: "Preview",
      duplicate: "Duplicate",
      createYourFirst: "Create your first",
      createSimulation: "Create simulation",
      newSimulationDescription: "Create a new simulation to get started",
      noResultFound: "No results found",
      adjustFilter: "Adjust your filters and try again",
      category: "Category",
      viewDetails: "View Details",
    },
    common: {
      delete: "Delete",
    },
  },
  SimulationStatus: {
    ACTIVE: "ACTIVE",
    DRAFT: "DRAFT",
    ARCHIVED: "ARCHIVED",
    PUBLISHED: "PUBLISHED",
  },
  getSimulationCategoryLabel: (category?: string | null) =>
    category
      ? { ORIGINALS: "Originals", DEMO: "Demo", PARTNER_SIM: "Partner Sim", OTHER: "Other" }[
          category
        ]
      : undefined,
}));

// Mock utils
vi.mock("@utils", () => ({
  formatDate: (date: string) => new Date(date).toLocaleDateString(),
  getStatusColor: (status: string) =>
    status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-typography-800",
  formatSimulationUsage: (usage: number) => `${usage} times`,
  formatCapitalizedEnum: (value: string) =>
    value.charAt(0).toUpperCase() + value.slice(1).toLowerCase(),
  isNonEmptyArray: (arr: unknown) => Array.isArray(arr) && arr.length > 0,
}));

describe("SimulationList", () => {
  const mockSimulations: Simulation[] = [
    {
      id: 1,
      title: "Test Simulation 1",
      description: "Description for simulation 1",
      coverImageUrl: "https://example.com/image1.jpg",
      createdBy: "John Doe",
      createdByUserId: 1,
      updatedAt: "2024-01-15T10:00:00Z",
      status: SimulationStatus.ACTIVE,
      usage: "10",
      isPreviewEnabled: true,
      isAssignedToTenant: true,
    },
    {
      id: 2,
      title: "Test Simulation 2",
      description: "Description for simulation 2",
      coverImageUrl: "https://example.com/image2.jpg",
      createdBy: "Jane Smith",
      createdByUserId: 2,
      updatedAt: "2024-01-20T15:30:00Z",
      status: SimulationStatus.DRAFT,
      usage: "0",
      isPreviewEnabled: false,
      isAssignedToTenant: false,
    },
    {
      id: 3,
      title: "Test Simulation 3",
      description: "Description for simulation 3",
      coverImageUrl: "https://example.com/image3.jpg",
      createdBy: "Bob Johnson",
      createdByUserId: 3,
      updatedAt: "2024-02-01T08:45:00Z",
      status: SimulationStatus.ARCHIVED,
      usage: "25",
      isPreviewEnabled: false,
      isAssignedToTenant: true,
    },
  ];

  const mockCallbacks = {
    onEdit: vi.fn(),
    onView: vi.fn(),
    onDelete: vi.fn(),
    onPreview: vi.fn(),
    onArchive: vi.fn(),
    onUnpublish: vi.fn(),
    onUnarchive: vi.fn(),
    isSuperAdmin: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders table header correctly", () => {
      renderWithStore(<SimulationList simulations={mockSimulations} {...mockCallbacks} />);

      expect(screen.getByText("Simulation")).toBeInTheDocument();
      expect(screen.getByText("Created By")).toBeInTheDocument();
      expect(screen.getByText("Last Modified")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
      expect(screen.getByText("Usage")).toBeInTheDocument();
    });

    it("renders all simulations", () => {
      renderWithStore(<SimulationList simulations={mockSimulations} {...mockCallbacks} />);

      expect(screen.getByText("Test Simulation 1")).toBeInTheDocument();
      expect(screen.getByText("Test Simulation 2")).toBeInTheDocument();
      expect(screen.getByText("Test Simulation 3")).toBeInTheDocument();
    });

    it("renders simulation images", () => {
      renderWithStore(<SimulationList simulations={mockSimulations} {...mockCallbacks} />);

      const images = screen.getAllByTestId("custom-image");
      expect(images).toHaveLength(3);
      expect(images[0]).toHaveAttribute("src", "https://example.com/image1.jpg");
      expect(images[0]).toHaveAttribute("alt", "Test Simulation 1");
    });

    it("renders simulation descriptions", () => {
      renderWithStore(<SimulationList simulations={mockSimulations} {...mockCallbacks} />);

      expect(screen.getByText("Description for simulation 1")).toBeInTheDocument();
      expect(screen.getByText("Description for simulation 2")).toBeInTheDocument();
      expect(screen.getByText("Description for simulation 3")).toBeInTheDocument();
    });

    it("renders footer when provided", () => {
      const footer = <div data-testid="custom-footer">Custom Footer</div>;
      renderWithStore(
        <SimulationList simulations={mockSimulations} footer={footer} {...mockCallbacks} />,
      );

      expect(screen.getByTestId("custom-footer")).toBeInTheDocument();
      expect(screen.getByText("Custom Footer")).toBeInTheDocument();
    });

    it("renders empty list when no simulations", () => {
      const onCreateSimulation = vi.fn();
      renderWithStore(
        <SimulationList
          simulations={[]}
          onCreateSimulation={onCreateSimulation}
          {...mockCallbacks}
        />,
      );

      expect(screen.queryByText("Test Simulation 1")).not.toBeInTheDocument();
      expect(screen.getByText("Create your first")).toBeInTheDocument();
      expect(screen.getByText("Simulation")).toBeInTheDocument();
    });
  });

  describe("Status Display", () => {
    it("displays correct status for ACTIVE simulations", () => {
      renderWithStore(<SimulationList simulations={[mockSimulations[0]]} {...mockCallbacks} />);

      expect(screen.getByText("Published")).toBeInTheDocument();
    });

    it("displays correct status for DRAFT simulations", () => {
      renderWithStore(<SimulationList simulations={[mockSimulations[1]]} {...mockCallbacks} />);

      expect(screen.getByText("Draft")).toBeInTheDocument();
    });

    it("displays correct status for ARCHIVED simulations", () => {
      renderWithStore(<SimulationList simulations={[mockSimulations[2]]} {...mockCallbacks} />);

      expect(screen.getByText("Archived")).toBeInTheDocument();
    });
  });

  describe("Action Buttons", () => {
    it("renders edit button for all simulations", () => {
      renderWithStore(<SimulationList simulations={mockSimulations} {...mockCallbacks} />);

      const editButtons = screen.getAllByTestId("edit-icon");
      expect(editButtons).toHaveLength(3);
    });

    it("calls onEdit when edit button is clicked", () => {
      renderWithStore(<SimulationList simulations={[mockSimulations[0]]} {...mockCallbacks} />);

      const editButton = screen.getByTestId("edit-icon");
      fireEvent.click(editButton);

      expect(mockCallbacks.onEdit).toHaveBeenCalledTimes(1);
      expect(mockCallbacks.onEdit).toHaveBeenCalledWith(mockSimulations[0]);
    });

    it("calls onDelete when delete button is clicked", () => {
      renderWithStore(<SimulationList simulations={[mockSimulations[0]]} {...mockCallbacks} />);

      const deleteButton = screen.getByTestId("delete-icon");
      fireEvent.click(deleteButton);

      expect(mockCallbacks.onDelete).toHaveBeenCalledTimes(1);
      expect(mockCallbacks.onDelete).toHaveBeenCalledWith(mockSimulations[0]);
    });

    it("renders unpublish button for ACTIVE simulations", () => {
      renderWithStore(<SimulationList simulations={[mockSimulations[0]]} {...mockCallbacks} />);

      expect(screen.getByTestId("unpublish-icon")).toBeInTheDocument();
    });

    it("does not render unpublish button for DRAFT simulations", () => {
      renderWithStore(<SimulationList simulations={[mockSimulations[1]]} {...mockCallbacks} />);

      expect(screen.queryByTestId("unpublish-icon")).not.toBeInTheDocument();
    });

    it("renders view-details button for ACTIVE simulations", () => {
      renderWithStore(<SimulationList simulations={[mockSimulations[0]]} {...mockCallbacks} />);

      expect(screen.getByTestId("eye-icon")).toBeInTheDocument();
    });

    it("renders view-details button for ARCHIVED simulations", () => {
      renderWithStore(<SimulationList simulations={[mockSimulations[2]]} {...mockCallbacks} />);

      expect(screen.getByTestId("eye-icon")).toBeInTheDocument();
    });

    it("does not render view-details button for DRAFT simulations", () => {
      renderWithStore(<SimulationList simulations={[mockSimulations[1]]} {...mockCallbacks} />);

      expect(screen.queryByTestId("eye-icon")).not.toBeInTheDocument();
    });

    it("calls onView when view-details button is clicked", () => {
      renderWithStore(<SimulationList simulations={[mockSimulations[0]]} {...mockCallbacks} />);

      fireEvent.click(screen.getByTestId("eye-icon"));
      expect(mockCallbacks.onView).toHaveBeenCalledTimes(1);
      expect(mockCallbacks.onView).toHaveBeenCalledWith(mockSimulations[0]);
    });

    it("calls onUnpublish when unpublish button is clicked", () => {
      renderWithStore(<SimulationList simulations={[mockSimulations[0]]} {...mockCallbacks} />);

      const unpublishButton = screen.getByTestId("unpublish-icon");
      fireEvent.click(unpublishButton);

      expect(mockCallbacks.onUnpublish).toHaveBeenCalledTimes(1);
      expect(mockCallbacks.onUnpublish).toHaveBeenCalledWith(mockSimulations[0]);
    });

    it("renders archive button for ACTIVE simulations", () => {
      renderWithStore(<SimulationList simulations={[mockSimulations[0]]} {...mockCallbacks} />);

      expect(screen.getByTestId("archive-icon")).toBeInTheDocument();
    });

    it("renders unarchive button for ARCHIVED simulations", () => {
      renderWithStore(<SimulationList simulations={[mockSimulations[2]]} {...mockCallbacks} />);

      expect(screen.getByTestId("unarchive-icon")).toBeInTheDocument();
    });

    it("calls onArchive when archive button is clicked for ACTIVE simulation", () => {
      renderWithStore(<SimulationList simulations={[mockSimulations[0]]} {...mockCallbacks} />);

      const archiveButton = screen.getByTestId("archive-icon");
      fireEvent.click(archiveButton);

      expect(mockCallbacks.onArchive).toHaveBeenCalledTimes(1);
      expect(mockCallbacks.onArchive).toHaveBeenCalledWith(mockSimulations[0]);
    });

    it("calls onUnarchive when unarchive button is clicked for ARCHIVED simulation", () => {
      renderWithStore(<SimulationList simulations={[mockSimulations[2]]} {...mockCallbacks} />);

      const unarchiveButton = screen.getByTestId("unarchive-icon");
      fireEvent.click(unarchiveButton);

      expect(mockCallbacks.onUnarchive).toHaveBeenCalledTimes(1);
      expect(mockCallbacks.onUnarchive).toHaveBeenCalledWith(mockSimulations[2]);
    });

    it("does not render archive/unarchive buttons for DRAFT simulations", () => {
      renderWithStore(<SimulationList simulations={[mockSimulations[1]]} {...mockCallbacks} />);

      expect(screen.queryByTestId("archive-icon")).not.toBeInTheDocument();
      expect(screen.queryByTestId("unarchive-icon")).not.toBeInTheDocument();
    });
  });

  describe("Action Visibility Restrictions", () => {
    const creatorUser = { id: 101, userId: 101 };
    const otherUser = { id: 102, userId: 102 };
    const superAdminUser = { id: 1, userId: 1 };
    const simulation = { ...mockSimulations[0], createdBy: "101", createdByUserId: 101 };

    it("shows all actions for the creator", () => {
      renderWithStore(
        <SimulationList
          simulations={[simulation]}
          {...mockCallbacks}
          currentUser={creatorUser}
          isSuperAdmin={false}
        />,
      );

      expect(screen.getByTestId("edit-icon")).toBeInTheDocument();
      expect(screen.getByTestId("unpublish-icon")).toBeInTheDocument();
      expect(screen.getByTestId("archive-icon")).toBeInTheDocument();
      expect(screen.getByTestId("delete-icon")).toBeInTheDocument();
      expect(screen.getByTestId("copy-icon")).toBeInTheDocument();
    });

    it("hides management actions for non-creators", () => {
      renderWithStore(
        <SimulationList
          simulations={[simulation]}
          {...mockCallbacks}
          currentUser={otherUser}
          isSuperAdmin={false}
        />,
      );

      expect(screen.queryByTestId("edit-icon")).not.toBeInTheDocument();
      expect(screen.queryByTestId("unpublish-icon")).not.toBeInTheDocument();
      expect(screen.queryByTestId("archive-icon")).not.toBeInTheDocument();
      expect(screen.queryByTestId("delete-icon")).not.toBeInTheDocument();
      // Duplicate should still be visible
      expect(screen.getByTestId("copy-icon")).toBeInTheDocument();
    });

    it("shows all actions for super admins even if not creator", () => {
      renderWithStore(
        <SimulationList
          simulations={[simulation]}
          {...mockCallbacks}
          currentUser={otherUser}
          isSuperAdmin={true}
        />,
      );

      expect(screen.getByTestId("edit-icon")).toBeInTheDocument();
      expect(screen.getByTestId("unpublish-icon")).toBeInTheDocument();
      expect(screen.getByTestId("archive-icon")).toBeInTheDocument();
      expect(screen.getByTestId("delete-icon")).toBeInTheDocument();
      expect(screen.getByTestId("copy-icon")).toBeInTheDocument();
    });
  });

  describe("Preview Functionality", () => {
    it("renders preview button for ACTIVE simulations", () => {
      renderWithStore(<SimulationList simulations={[mockSimulations[0]]} {...mockCallbacks} />);

      expect(screen.getByText("Preview")).toBeInTheDocument();
      expect(screen.getByTestId("play-icon")).toBeInTheDocument();
    });

    it("does not render preview button for DRAFT simulations", () => {
      renderWithStore(<SimulationList simulations={[mockSimulations[1]]} {...mockCallbacks} />);

      expect(screen.queryByText("Preview")).not.toBeInTheDocument();
      // Both the preview and the (empty) category cells render a "-".
      expect(screen.getAllByText("-").length).toBeGreaterThan(0);
    });

    it("calls onPreview when preview button is clicked", () => {
      renderWithStore(<SimulationList simulations={[mockSimulations[0]]} {...mockCallbacks} />);

      const previewButton = screen.getByText("Preview");
      fireEvent.click(previewButton);

      expect(mockCallbacks.onPreview).toHaveBeenCalledTimes(1);
      expect(mockCallbacks.onPreview).toHaveBeenCalledWith(mockSimulations[0]);
    });

    it("calls onPreview when clicking on simulation image for ACTIVE simulation", () => {
      renderWithStore(<SimulationList simulations={[mockSimulations[0]]} {...mockCallbacks} />);

      const images = screen.getAllByTestId("custom-image");
      fireEvent.click(images[0].parentElement!);

      expect(mockCallbacks.onPreview).toHaveBeenCalledTimes(1);
      expect(mockCallbacks.onPreview).toHaveBeenCalledWith(mockSimulations[0]);
    });

    it("does not call onPreview when clicking on DRAFT simulation image", () => {
      renderWithStore(<SimulationList simulations={[mockSimulations[1]]} {...mockCallbacks} />);

      const images = screen.getAllByTestId("custom-image");
      fireEvent.click(images[0].parentElement!);

      expect(mockCallbacks.onPreview).not.toHaveBeenCalled();
    });
  });

  describe("Data Formatting", () => {
    it("formats dates correctly", () => {
      renderWithStore(<SimulationList simulations={[mockSimulations[0]]} {...mockCallbacks} />);

      const formattedDate = new Date("2024-01-15T10:00:00Z").toLocaleDateString();
      expect(screen.getByText(formattedDate)).toBeInTheDocument();
    });

    it("formats usage correctly", () => {
      renderWithStore(<SimulationList simulations={[mockSimulations[0]]} {...mockCallbacks} />);

      expect(screen.getByText("10 times")).toBeInTheDocument();
    });

    it("displays created by information", () => {
      renderWithStore(<SimulationList simulations={[mockSimulations[0]]} {...mockCallbacks} />);

      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("displays -- for missing created by information", () => {
      const simulationWithoutCreator = {
        ...mockSimulations[0],
        createdBy: "",
      };
      renderWithStore(
        <SimulationList simulations={[simulationWithoutCreator]} {...mockCallbacks} />,
      );

      expect(screen.getByText("--")).toBeInTheDocument();
    });
  });

  describe("Styling and Layout", () => {
    it("applies hover styles to simulation rows", () => {
      const { container } = renderWithStore(
        <SimulationList simulations={[mockSimulations[0]]} {...mockCallbacks} />,
      );

      const row = container.querySelector(".hover\\:shadow-sm");
      expect(row).toBeInTheDocument();
    });

    it("applies correct styling to simulation cards", () => {
      const { container } = renderWithStore(
        <SimulationList simulations={[mockSimulations[0]]} {...mockCallbacks} />,
      );

      const card = container.querySelector(".group");
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass("hover:shadow-sm");
    });

    it("applies correct overflow styles", () => {
      const { container } = renderWithStore(
        <SimulationList simulations={mockSimulations} {...mockCallbacks} />,
      );

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass("overflow-x-auto");
      expect(mainContainer).toHaveClass("overflow-y-scroll");
    });
  });

  describe("Edge Cases", () => {
    it("handles simulations with missing optional data", () => {
      const simulationWithMissingData: Simulation = {
        id: 4,
        title: "Minimal Simulation",
        description: "",
        coverImageUrl: "",
        createdBy: "",
        createdByUserId: 0,
        updatedAt: "2024-01-01T00:00:00Z",
        status: SimulationStatus.DRAFT,
        usage: "0",
        isPreviewEnabled: false,
        isAssignedToTenant: false,
      };

      renderWithStore(
        <SimulationList simulations={[simulationWithMissingData]} {...mockCallbacks} />,
      );

      expect(screen.getByText("Minimal Simulation")).toBeInTheDocument();
      expect(screen.getByText("--")).toBeInTheDocument();
    });

    it("handles callbacks being undefined", () => {
      renderWithStore(<SimulationList simulations={[mockSimulations[0]]} isSuperAdmin={true} />);

      const editButton = screen.getByTestId("edit-icon");
      expect(() => fireEvent.click(editButton)).not.toThrow();
    });

    it("renders correctly with single simulation", () => {
      renderWithStore(<SimulationList simulations={[mockSimulations[0]]} {...mockCallbacks} />);

      expect(screen.getByText("Test Simulation 1")).toBeInTheDocument();
      expect(screen.queryByText("Test Simulation 2")).not.toBeInTheDocument();
    });

    it("renders correctly with many simulations", () => {
      const manySimulations = Array.from({ length: 20 }, (_, i) => ({
        ...mockSimulations[0],
        id: i,
        title: `Simulation ${i}`,
      }));

      renderWithStore(<SimulationList simulations={manySimulations} {...mockCallbacks} />);

      expect(screen.getByText("Simulation 0")).toBeInTheDocument();
      expect(screen.getByText("Simulation 19")).toBeInTheDocument();
    });
  });
});
