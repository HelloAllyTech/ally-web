import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { configureStore } from "@reduxjs/toolkit";
import { baseAPI } from "@api";
import userSlice from "@reducer/userReducer";

// Hoist mocks to avoid initialization errors
const {
  mockToast,
  mockUseGetGuardrailsQuery,
  mockCreateGuardrail,
  mockUpdateGuardrail,
  mockDeleteGuardrail,
} = vi.hoisted(() => ({
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  mockUseGetGuardrailsQuery: vi.fn(),
  mockCreateGuardrail: vi.fn(),
  mockUpdateGuardrail: vi.fn(),
  mockDeleteGuardrail: vi.fn(),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: mockToast,
}));

// Mock API hooks
vi.mock("@api", async importOriginal => {
  const actual = await importOriginal<typeof import("@api")>();
  return {
    ...actual,
    useGetGuardrailsQuery: (...args: any[]) => mockUseGetGuardrailsQuery(...args),
    useCreateGuardrailMutation: () => [mockCreateGuardrail],
    useUpdateGuardrailMutation: () => [mockUpdateGuardrail],
  };
});

// Mock components
vi.mock("@components", () => ({
  cellTypes: {
    editableText: "editableText",
    switch: "switch",
    normalText: "normalText",
  },
  NotionTable: ({ tableData, onRowChange, onRowClick, tableFooter, onSelectionChange }: any) => (
    <div data-testid="notion-table">
      <div data-testid="table-data">
        {tableData.data.map((row: any, rowIndex: number) => (
          <div
            key={row.id?.value || rowIndex}
            data-testid={`table-row-${rowIndex}`}
            onClick={() => onRowClick(rowIndex)}
          >
            <span data-testid={`helper-dialogue-${rowIndex}`}>{row.helperDialogue?.value}</span>
            <span data-testid={`name-${rowIndex}`}>{row.name?.value}</span>
            <span data-testid={`actor-dialogue-${rowIndex}`}>{row.actorDialogue?.value}</span>
            <span data-testid={`active-status-${rowIndex}`}>
              {row.active?.value ? "Active" : "Inactive"}
            </span>
            <button
              data-testid={`select-row-${rowIndex}`}
              onClick={e => {
                e.stopPropagation();
                onSelectionChange([row]);
              }}
            >
              Select
            </button>
            <button
              data-testid={`toggle-active-${rowIndex}`}
              onClick={e => {
                e.stopPropagation();
                onRowChange({
                  columnId: "active",
                  value: !row.active?.value,
                  rowIndex,
                  rowId: row.id?.value,
                });
              }}
            >
              Toggle
            </button>
          </div>
        ))}
      </div>
      {tableFooter}
    </div>
  ),
  GuardrailSidePanel: ({
    selectedGuardrail,
    isOpen,
    onClose,
    onDelete,
    onUpdate,
    onCreate,
  }: any) =>
    isOpen ? (
      <div data-testid="guardrail-side-panel">
        <h2 data-testid="panel-helper-dialogue">{selectedGuardrail?.helperDialogue}</h2>
        <p data-testid="panel-actor-dialogue">{selectedGuardrail?.actorDialogue}</p>
        <button onClick={onClose} data-testid="close-side-panel">
          Close
        </button>
        {selectedGuardrail?.id && (
          <button onClick={() => onDelete(selectedGuardrail?.id)} data-testid="delete-from-panel">
            Delete
          </button>
        )}
        {selectedGuardrail?.id ? (
          <button
            onClick={() =>
              onUpdate(selectedGuardrail?.id, {
                ...selectedGuardrail,
                helperDialogue: "Updated from panel",
              })
            }
            data-testid="update-from-panel"
          >
            Update
          </button>
        ) : (
          <button
            onClick={() =>
              onCreate({
                ...selectedGuardrail,
                helperDialogue: "New Helper Content",
                actorDialogue: "New Actor Content",
                active: true,
              })
            }
            data-testid="create-from-panel"
          >
            Create
          </button>
        )}
      </div>
    ) : null,
  ListToolbar: ({ searchValue, onSearchChange, action }: any) => (
    <div data-testid="list-toolbar">
      <input
        data-testid="search-input"
        value={searchValue}
        onChange={e => onSearchChange(e.target.value)}
        placeholder="Search guardrails"
      />
      {action && (
        <button onClick={action.onClick} data-testid="toolbar-action" data-variant={action.variant}>
          {action.icon}
          {action.label}
        </button>
      )}
    </div>
  ),
  ActionConfirmationPopup: ({
    isOpen,
    onClose,
    title,
    description,
    primaryButton,
    secondaryButton,
  }: any) =>
    isOpen ? (
      <div data-testid="action-confirmation-popup">
        <h2>{title}</h2>
        <p>{description}</p>
        <button onClick={primaryButton.onClick} data-testid="confirm-action">
          {primaryButton.label}
        </button>
        <button onClick={secondaryButton.onClick} data-testid="cancel-action">
          {secondaryButton.label}
        </button>
      </div>
    ) : null,
}));

// Mock assets
vi.mock("@assets", async importOriginal => {
  const actual = await importOriginal<typeof import("@assets")>();
  return {
    ...actual,
    Trash: () => <svg data-testid="trash-icon">Delete</svg>,
  };
});

// Mock constants
vi.mock("@constants", () => ({
  en: {
    common: {
      delete: "Delete",
      cancel: "Cancel",
      loading: "Loading...",
      loadMore: "Load more",
      noMoreData: "No more data",
    },
    simulation: {
      guardrails: "Guardrails",
    },
  },
  SORT_BY: {
    CREATED_AT: "createdAt",
  },
  SORT_ORDER: {
    DESC: "desc",
  },
  TAG_TYPES: {
    CONVERSATIONAL_GUARDRAILS: "ConversationalGuardrails",
  },
  GUARDRAILS_TABLE_COLUMNS: [],
}));

import { GuardrailsManagement } from "../GuardrailsManagement";

describe("GuardrailsManagement", () => {
  const mockGuardrails = [
    {
      id: "guardrail-1",
      name: "Guardrail 1",
      helperDialogue: "rude",
      actorDialogue: "Please be respectful",
      active: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "guardrail-2",
      helperDialogue: "interrupting",
      actorDialogue: "Please let me finish",
      active: true,
      createdAt: "2026-01-02T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
    },
    {
      id: "guardrail-3",
      helperDialogue: "dismissive",
      actorDialogue: "I feel like you're not listening",
      active: false,
      createdAt: "2026-01-03T00:00:00Z",
      updatedAt: "2026-01-03T00:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGetGuardrailsQuery.mockReturnValue({
      data: mockGuardrails,
      isFetching: false,
    });
    mockCreateGuardrail.mockReturnValue({
      error: null,
      data: { id: "new-guardrail-id" },
    });
    mockUpdateGuardrail.mockReturnValue({
      error: null,
    });
  });

  const createTestStore = () => {
    return configureStore({
      reducer: {
        [baseAPI.reducerPath]: baseAPI.reducer,
        user: userSlice.reducer,
      },
      middleware: getDefaultMiddleware =>
        getDefaultMiddleware({
          serializableCheck: {
            ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
          },
        }).concat(baseAPI.middleware),
    });
  };

  const renderComponent = () => {
    const store = createTestStore();
    return render(
      <Provider store={store}>
        <GuardrailsManagement />
      </Provider>,
    );
  };

  describe("Initial rendering", () => {
    it("renders the page title", () => {
      renderComponent();
      expect(screen.getByText("Guardrails")).toBeInTheDocument();
    });

    it("renders the search toolbar", () => {
      renderComponent();
      expect(screen.getByTestId("list-toolbar")).toBeInTheDocument();
      expect(screen.getByTestId("search-input")).toBeInTheDocument();
    });

    it("renders the notion table", async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("notion-table")).toBeInTheDocument();
      });
    });

    it("displays all guardrails in the table", async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("helper-dialogue-0")).toHaveTextContent("rude");
        expect(screen.getByTestId("helper-dialogue-1")).toHaveTextContent("interrupting");
        expect(screen.getByTestId("helper-dialogue-2")).toHaveTextContent("dismissive");
      });
    });

    it("displays name for each guardrail", async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Guardrail 1")).toBeInTheDocument();
      });
    });

    it("renders create new guardrail button initially", () => {
      renderComponent();
      expect(screen.getByText("Create new guardrail")).toBeInTheDocument();
    });

    it("displays actor dialogue for each guardrail", async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("actor-dialogue-0")).toHaveTextContent("Please be respectful");
        expect(screen.getByTestId("actor-dialogue-1")).toHaveTextContent("Please let me finish");
      });
    });
  });

  describe("Loading state", () => {
    it("shows loading state when fetching", () => {
      mockUseGetGuardrailsQuery.mockReturnValue({
        data: mockGuardrails,
        isFetching: true,
      });

      renderComponent();

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("shows load more when not fetching and has more data", async () => {
      mockUseGetGuardrailsQuery.mockReturnValue({
        data: new Array(30)
          .fill(mockGuardrails[0])
          .map((g, index) => ({ ...g, id: `guardrail-${index}` })),
        isFetching: false,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Load more")).toBeInTheDocument();
      });
    });

    it("shows no more data when all guardrails are loaded", async () => {
      mockUseGetGuardrailsQuery.mockReturnValue({
        data: mockGuardrails.slice(0, 2),
        isFetching: false,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("No more data")).toBeInTheDocument();
      });
    });
  });

  describe("Search functionality", () => {
    it("updates search value when typing in search input", () => {
      renderComponent();

      const searchInput = screen.getByTestId("search-input") as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: "rude" } });

      expect(searchInput.value).toBe("rude");
    });

    it("calls API with search parameter", async () => {
      renderComponent();

      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, { target: { value: "rude" } });

      await waitFor(() => {
        expect(mockUseGetGuardrailsQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            search: "rude",
          }),
        );
      });
    });
  });

  describe("Create new guardrail", () => {
    it("opens side panel when create button is clicked", async () => {
      renderComponent();

      const createButton = screen.getByText("Create new guardrail");
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByTestId("guardrail-side-panel")).toBeInTheDocument();
        expect(screen.getByTestId("create-from-panel")).toBeInTheDocument();
      });
    });

    it("creates newly guardrail when create button in panel is clicked", async () => {
      renderComponent();

      const createButton = screen.getByText("Create new guardrail");
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByTestId("guardrail-side-panel")).toBeInTheDocument();
      });

      const panelCreateButton = screen.getByTestId("create-from-panel");
      fireEvent.click(panelCreateButton);

      await waitFor(() => {
        expect(mockCreateGuardrail).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "",
            helperDialogue: "New Helper Content",
            actorDialogue: "New Actor Content",
            active: true,
          }),
        );
      });
    });

    it("shows success toast and closes panel upon success", async () => {
      renderComponent();

      // Open panel
      fireEvent.click(screen.getByText("Create new guardrail"));
      await waitFor(() => screen.getByTestId("guardrail-side-panel"));

      // Click create
      fireEvent.click(screen.getByTestId("create-from-panel"));

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith("Guardrail created successfully");
        expect(screen.queryByTestId("guardrail-side-panel")).not.toBeInTheDocument();
      });
    });

    it("shows error toast when creation fails", async () => {
      mockCreateGuardrail.mockReturnValue({
        error: { message: "Creation failed" },
      });

      renderComponent();

      // Open panel
      fireEvent.click(screen.getByText("Create new guardrail"));
      await waitFor(() => screen.getByTestId("guardrail-side-panel"));

      // Click create
      fireEvent.click(screen.getByTestId("create-from-panel"));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Failed to create guardrail");
      });
    });
  });

  describe("Guardrail selection and side panel", () => {
    it("opens side panel when guardrail row is clicked", async () => {
      renderComponent();

      await waitFor(() => {
        const guardrailRow = screen.getByTestId("table-row-0");
        fireEvent.click(guardrailRow);
      });

      expect(screen.getByTestId("guardrail-side-panel")).toBeInTheDocument();
      expect(screen.getByTestId("panel-helper-dialogue")).toHaveTextContent("rude");
    });

    it("closes side panel when close button is clicked", async () => {
      renderComponent();

      await waitFor(() => {
        const guardrailRow = screen.getByTestId("table-row-0");
        fireEvent.click(guardrailRow);
      });

      const closeButton = screen.getByTestId("close-side-panel");
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId("guardrail-side-panel")).not.toBeInTheDocument();
      });
    });

    it("displays correct guardrail details in side panel", async () => {
      renderComponent();

      await waitFor(() => {
        const guardrailRow = screen.getByTestId("table-row-1");
        fireEvent.click(guardrailRow);
      });

      expect(screen.getByTestId("guardrail-side-panel")).toBeInTheDocument();
      expect(screen.getByTestId("panel-helper-dialogue")).toHaveTextContent("interrupting");
      expect(screen.getByTestId("panel-actor-dialogue")).toHaveTextContent("Please let me finish");
    });
  });

  describe("Guardrail update", () => {
    it("updates guardrail active status when toggled", async () => {
      renderComponent();

      await waitFor(() => {
        const toggleButton = screen.getByTestId("toggle-active-0");
        fireEvent.click(toggleButton);
      });

      await waitFor(() => {
        expect(mockUpdateGuardrail).toHaveBeenCalledWith({
          id: "guardrail-1",
          guardrail: expect.objectContaining({
            active: false,
          }),
        });
      });
    });

    it("updates guardrail from side panel", async () => {
      renderComponent();

      await waitFor(() => {
        const guardrailRow = screen.getByTestId("table-row-0");
        fireEvent.click(guardrailRow);
      });

      const updateButton = screen.getByTestId("update-from-panel");
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockUpdateGuardrail).toHaveBeenCalled();
      });
    });
  });

  describe("Guardrail deletion", () => {
    it("shows delete button when guardrails are selected", async () => {
      renderComponent();

      await waitFor(() => {
        const selectButton = screen.getByTestId("select-row-0");
        fireEvent.click(selectButton);
      });

      expect(screen.getByTestId("toolbar-action")).toHaveTextContent("Delete");
      expect(screen.getByTestId("trash-icon")).toBeInTheDocument();
    });

    it("opens confirmation popup when delete button is clicked", async () => {
      renderComponent();

      await waitFor(() => {
        const selectButton = screen.getByTestId("select-row-0");
        fireEvent.click(selectButton);
      });

      const deleteButton = screen.getByTestId("toolbar-action");
      fireEvent.click(deleteButton);

      expect(screen.getByTestId("action-confirmation-popup")).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
    });

    it("deletes guardrail when confirmed", async () => {
      renderComponent();

      await waitFor(() => {
        const selectButton = screen.getByTestId("select-row-0");
        fireEvent.click(selectButton);
      });

      const deleteButton = screen.getByTestId("toolbar-action");
      fireEvent.click(deleteButton);

      const confirmButton = screen.getByTestId("confirm-action");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockUpdateGuardrail).toHaveBeenCalledWith({
          id: "guardrail-1",
          guardrail: { active: false },
        });
      });
    });

    it("shows success toast after successful deletion", async () => {
      renderComponent();

      await waitFor(() => {
        const selectButton = screen.getByTestId("select-row-0");
        fireEvent.click(selectButton);
      });

      const deleteButton = screen.getByTestId("toolbar-action");
      fireEvent.click(deleteButton);

      const confirmButton = screen.getByTestId("confirm-action");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          expect.stringContaining("Successfully deleted"),
        );
      });
    });

    it("shows error toast when deletion fails", async () => {
      mockUpdateGuardrail.mockReturnValue({
        error: { message: "Delete failed" },
      });

      renderComponent();

      await waitFor(() => {
        const selectButton = screen.getByTestId("select-row-0");
        fireEvent.click(selectButton);
      });

      const deleteButton = screen.getByTestId("toolbar-action");
      fireEvent.click(deleteButton);

      const confirmButton = screen.getByTestId("confirm-action");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Failed to delete some guardrails");
      });
    });

    it("cancels deletion when cancel button is clicked", async () => {
      renderComponent();

      await waitFor(() => {
        const selectButton = screen.getByTestId("select-row-0");
        fireEvent.click(selectButton);
      });

      const deleteButton = screen.getByTestId("toolbar-action");
      fireEvent.click(deleteButton);

      const cancelButton = screen.getByTestId("cancel-action");
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByTestId("action-confirmation-popup")).not.toBeInTheDocument();
      });

      expect(mockUpdateGuardrail).not.toHaveBeenCalled();
    });
  });

  describe("Active status display", () => {
    it("displays active status correctly for each guardrail", async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("active-status-0")).toHaveTextContent("Active");
        expect(screen.getByTestId("active-status-1")).toHaveTextContent("Active");
        expect(screen.getByTestId("active-status-2")).toHaveTextContent("Inactive");
      });
    });
  });
});
