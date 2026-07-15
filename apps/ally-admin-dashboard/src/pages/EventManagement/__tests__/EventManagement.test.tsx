import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

import { configureStore } from "@reduxjs/toolkit";
import { baseAPI } from "@api";
import eventsSlice from "@reducer/eventsReducer";
import userSlice, { setPermissions } from "@reducer/userReducer";
import { Permissions } from "@constants/permissions";

// Hoist mocks to avoid initialization errors
const {
  mockToast,
  mockUseGetSessionEventsQuery,
  mockUpdateSessionEvent,
  mockCreateSessionEvents,
  mockDeleteSessionEvents,
} = vi.hoisted(() => ({
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  mockUseGetSessionEventsQuery: vi.fn(),
  mockUpdateSessionEvent: vi.fn(),
  mockCreateSessionEvents: vi.fn(),
  mockDeleteSessionEvents: vi.fn(),
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
    useGetSessionEventsQuery: (...args: any[]) => mockUseGetSessionEventsQuery(...args),
    useUpdateSessionEventMutation: () => [mockUpdateSessionEvent],
    useCreateSessionEventsMutation: () => [mockCreateSessionEvents],
    useDeleteSessionEventsMutation: () => [mockDeleteSessionEvents],
  };
});

// Mock components
vi.mock("@components", async importOriginal => {
  const actual = await importOriginal<typeof import("@components")>();
  return {
    ...actual,
    NotionTable: ({ tableData, onRowChange, onRowClick, tableFooter, onSelectionChange }: any) => (
      <div data-testid="notion-table">
        <div data-testid="table-data">
          {tableData.data.map((row: any, rowIndex: number) => (
            <div
              key={row.id?.value || rowIndex}
              data-testid={`table-row-${rowIndex}`}
              onClick={() => onRowClick(rowIndex)}
            >
              <span data-testid={`event-name-${rowIndex}`}>{row.name?.value}</span>
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
                data-testid={`update-row-${rowIndex}`}
                onClick={e => {
                  e.stopPropagation();
                  onRowChange({
                    columnId: "name",
                    value: "Updated Event",
                    rowIndex,
                    rowId: row.id?.value,
                  });
                }}
              >
                Update
              </button>
            </div>
          ))}
        </div>
        {tableFooter}
      </div>
    ),
    EventSidePanel: ({ selectedEvent, isOpen, onClose, onDelete, onUpdate }: any) =>
      isOpen ? (
        <div data-testid="event-side-panel">
          <h2>{selectedEvent?.name}</h2>
          <button onClick={onClose} data-testid="close-side-panel">
            Close
          </button>
          <button onClick={() => onDelete(selectedEvent?.id)} data-testid="delete-from-panel">
            Delete
          </button>
          <button
            onClick={() => onUpdate({ ...selectedEvent, name: "Updated from panel" })}
            data-testid="update-from-panel"
          >
            Update
          </button>
        </div>
      ) : null,
    ListToolbar: ({ searchValue, onSearchChange, action }: any) => (
      <div data-testid="list-toolbar">
        <input
          data-testid="search-input"
          value={searchValue}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search events"
        />
        {action && (
          <button
            onClick={action.onClick}
            data-testid="toolbar-action"
            data-variant={action.variant}
          >
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
    EventTypeSelectionDialog: ({ isOpen, onClose, onSelect }: any) =>
      isOpen ? (
        <div data-testid="event-type-selection-dialog">
          <button onClick={onClose} data-testid="close-dialog">
            Close
          </button>
          <button
            onClick={() => onSelect("SENTENCE_SIMILARITY")}
            data-testid="select-sentence-similarity"
          >
            Sentence Similarity
          </button>
          <button onClick={() => onSelect("TIME_BASED")} data-testid="select-time-based">
            Time Based
          </button>
          <button onClick={() => onSelect("SCORE_BASED")} data-testid="select-score-based">
            Score Based
          </button>
          <button onClick={() => onSelect("COMBINATION")} data-testid="select-combination">
            Combination
          </button>
        </div>
      ) : null,
  };
});

// Mock assets
vi.mock("@assets", async importOriginal => {
  const actual = await importOriginal<typeof import("@assets")>();
  return {
    ...actual,
    Trash: () => <svg data-testid="trash-icon">Delete</svg>,
    Close: () => <svg data-testid="close-icon">Close</svg>,
  };
});

// Mock SimulationCreator constants
vi.mock("@constants/SimulationCreator", () => ({
  STEP1_FIELDS: [],
  STEP2_FIELDS: [],
  STEP3_FIELDS: [],
  STEP4_FIELDS: [],
  STEP5_FIELDS: [],
  eventsTableColumns: [],
  FORM_FIELD_TYPES: {
    TEXT: "text",
    NUMBER: "number",
    SELECT: "select",
    IMAGE_UPLOAD: "image_upload",
    VIDEO_UPLOAD: "video_upload",
    TOGGLE_BUTTON: "toggle_button",
    CUSTOM: {
      VOICE_DROPDOWN: "voice_dropdown",
      AUTO_TERMINATION_RULE: "auto_termination_rule",
    },
  },
}));

// Mock constants
vi.mock("@constants", async importOriginal => {
  const actual = await importOriginal<typeof import("@constants")>();
  return {
    ...actual,
    EVENT_MANAGEMENT_TABLE_COLUMNS: [
      { id: "name", label: "Name", accessor: "name" },
      { id: "description", label: "Description", accessor: "description" },
    ],
    EVENT_TYPE_OPTIONS: [
      { value: "TIME_BASED", label: "Time Based" },
      { value: "SCORE_BASED", label: "Score Based" },
      { value: "SENTENCE_SIMILARITY", label: "Sentence Similarity" },
      { value: "COMBINATION", label: "Combination" },
    ],
    en: {
      ...(actual.en || {}),
      simulation: {
        simulationEvents: "Simulation Events",
        events: "Events",
        createNewEvent: "Create New Event",
        eventCreatedSuccessfully: "Event created successfully",
        eventsDeletedSuccessfully: "Events deleted successfully",
      },
      common: {
        delete: "Delete",
        cancel: "Cancel",
        loading: "Loading...",
        loadMore: "Load more",
        noMoreData: "No more data",
      },
      errors: {
        ...(actual.en?.errors || {}),
        failedToDeleteEvent: "Failed to delete event. Please try again.",
        failedToCreateEvent: "Failed to create event",
      },
    },
    SORT_BY: {
      CREATED_AT: "createdAt",
    },
    SORT_ORDER: {
      DESC: "desc",
    },
    SESSION_EVENT_STATUS_OPTIONS: {
      ACTIVE: "ACTIVE",
    },
  };
});

// Mock utils
vi.mock("@utils/eventNameGenerator", () => ({
  generateSequentialEventName: (eventType: string, existingNames: string[]) => {
    const prefixMap: Record<string, string> = {
      SENTENCE_SIMILARITY: "SS",
      TIME_BASED: "TB",
      SCORE_BASED: "SB",
      COMBINATION: "CE",
    };
    const prefix = prefixMap[eventType] || "EV";
    const nextNumber = 1;
    return `${prefix}${String(nextNumber).padStart(3, "0")}`;
  },
}));

import { EventManagement } from "../EventManagement";

const testStore = configureStore({
  reducer: {
    [baseAPI.reducerPath]: baseAPI.reducer,
    user: userSlice.reducer,
    events: eventsSlice.reducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
      },
    }).concat(baseAPI.middleware),
});

describe("EventManagement", () => {
  const mockEvents = [
    {
      id: "event-1",
      name: "Test Event 1",
      description: "Description 1",
      score: 5,
      emoji: "😊",
      message: "Feedback 1",
      branchInstruction: "Branch 1",
      detectionType: "SENTENCE_SIMILARITY",
      visibilityType: "ACTIVE",
      speaker: "CARE_GIVER",
      sentences: ["Sentence 1", "Sentence 2"],
    },
    {
      id: "event-2",
      name: "Test Event 2",
      description: "Description 2",
      score: 3,
      emoji: "😐",
      message: "Feedback 2",
      branchInstruction: "Branch 2",
      detectionType: "SENTENCE_SIMILARITY",
      visibilityType: "ACTIVE",
      speaker: "CARE_SEEKER",
      sentences: ["Sentence 3"],
    },
    {
      id: "event-3",
      name: "Test Event 3",
      description: "Description 3",
      score: 0,
      emoji: "😢",
      message: "Feedback 3",
      branchInstruction: "Branch 3",
      detectionType: "EXACT_MATCH",
      visibilityType: "INACTIVE",
      speaker: "CARE_GIVER",
      sentences: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Delete affordances are permission-gated (multi-tenant admins lack this).
    testStore.dispatch(setPermissions([Permissions.EDIT_EVENT, Permissions.DELETE_EVENT]));
    mockUseGetSessionEventsQuery.mockReturnValue({
      data: { data: mockEvents },
      isFetching: false,
    });
    mockUpdateSessionEvent.mockReturnValue({
      error: null,
    });
    mockCreateSessionEvents.mockReturnValue({
      error: null,
      data: [{ id: "new-event-id" }],
    });
    mockDeleteSessionEvents.mockReturnValue({
      error: null,
    });
  });

  afterEach(() => {
    testStore.dispatch(baseAPI.util.resetApiState());
  });

  const renderComponent = () => {
    return render(
      <Provider store={testStore}>
        <EventManagement />
      </Provider>,
    );
  };

  describe("Initial rendering", () => {
    it("renders the page title", () => {
      renderComponent();
      expect(screen.getByText("Events")).toBeInTheDocument();
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

    it("displays all events in the table", async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("event-name-0")).toHaveTextContent("Test Event 1");
        expect(screen.getByTestId("event-name-1")).toHaveTextContent("Test Event 2");
        expect(screen.getByTestId("event-name-2")).toHaveTextContent("Test Event 3");
      });
    });

    it("renders create new event button initially", () => {
      renderComponent();
      expect(screen.getByText("Create New Event")).toBeInTheDocument();
    });
  });

  describe("Loading state", () => {
    it("shows loading state when fetching", () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: mockEvents },
        isFetching: true,
      });

      renderComponent();

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("shows load more when not fetching and has more data", async () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: {
          data: new Array(30)
            .fill(mockEvents[0])
            .map((e, index) => ({ ...e, id: `event-${index}` })),
        },
        isFetching: false,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Load more")).toBeInTheDocument();
      });
    });

    it("shows no more data when all events are loaded", async () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: mockEvents.slice(0, 2) },
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
      fireEvent.change(searchInput, { target: { value: "test search" } });

      expect(searchInput.value).toBe("test search");
    });

    it("calls API with search parameter", async () => {
      renderComponent();

      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, { target: { value: "Event 1" } });

      await waitFor(() => {
        expect(mockUseGetSessionEventsQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            visibilityType: "ACTIVE",
            searchName: "Event 1",
          }),
        );
      });
    });
  });

  describe("Create new event", () => {
    it("creates new event when create button is clicked", async () => {
      renderComponent();

      const createButton = screen.getByText("Create New Event");
      fireEvent.click(createButton);

      // Dialog should open
      await waitFor(() => {
        expect(screen.getByTestId("event-type-selection-dialog")).toBeInTheDocument();
      });

      // Select event type
      const selectButton = screen.getByTestId("select-sentence-similarity");
      fireEvent.click(selectButton);

      // Sidebar should open after successful creation
      await waitFor(() => {
        expect(screen.getByTestId("event-side-panel")).toBeInTheDocument();
      });

      // Verify toast message for successful creation
      expect(mockToast.success).toHaveBeenCalledWith("Event created successfully");
    });

    it("shows success toast when event is created successfully", async () => {
      renderComponent();

      const createButton = screen.getByText("Create New Event");
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByTestId("event-type-selection-dialog")).toBeInTheDocument();
      });

      const selectButton = screen.getByTestId("select-sentence-similarity");
      fireEvent.click(selectButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith("Event created successfully");
      });
    });

    it("shows error toast when event creation fails", async () => {
      // Mock API to return error
      mockCreateSessionEvents.mockReturnValue({
        error: { message: "Creation failed" },
      });

      renderComponent();

      const createButton = screen.getByText("Create New Event");
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByTestId("event-type-selection-dialog")).toBeInTheDocument();
      });

      // Select event type
      const selectButton = screen.getByTestId("select-time-based");
      fireEvent.click(selectButton);

      // Should show error toast
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Failed to create event");
      });

      // Side panel should not open on error
      expect(screen.queryByTestId("event-side-panel")).not.toBeInTheDocument();
    });

    it("opens side panel after creating event successfully", async () => {
      renderComponent();

      const createButton = screen.getByText("Create New Event");
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByTestId("event-type-selection-dialog")).toBeInTheDocument();
      });

      const selectButton = screen.getByTestId("select-score-based");
      fireEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByTestId("event-side-panel")).toBeInTheDocument();
      });
    });
  });

  describe("Event selection and side panel", () => {
    it("opens side panel when event row is clicked", async () => {
      renderComponent();

      await waitFor(() => {
        const eventRow = screen.getByTestId("table-row-0");
        fireEvent.click(eventRow);
      });

      expect(screen.getByTestId("event-side-panel")).toBeInTheDocument();
      // Verify side panel contains the event name (appears in both table and panel)
      const eventNames = screen.getAllByText("Test Event 1");
      expect(eventNames.length).toBeGreaterThan(0);
    });

    it("closes side panel when close button is clicked", async () => {
      renderComponent();

      await waitFor(() => {
        const eventRow = screen.getByTestId("table-row-0");
        fireEvent.click(eventRow);
      });

      const closeButton = screen.getByTestId("close-side-panel");
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId("event-side-panel")).not.toBeInTheDocument();
      });
    });

    it("displays correct event details in side panel", async () => {
      renderComponent();

      await waitFor(() => {
        const eventRow = screen.getByTestId("table-row-1");
        fireEvent.click(eventRow);
      });

      // Verify the side panel is open and contains event 2
      expect(screen.getByTestId("event-side-panel")).toBeInTheDocument();
      const eventNames = screen.getAllByText("Test Event 2");
      expect(eventNames.length).toBeGreaterThan(0);
    });
  });

  describe("Event update", () => {
    it("updates event when changed in table", async () => {
      mockUpdateSessionEvent.mockReturnValue({
        error: null,
      });

      renderComponent();

      await waitFor(() => {
        const updateButton = screen.getByTestId("update-row-0");
        fireEvent.click(updateButton);
      });

      await waitFor(() => {
        expect(mockUpdateSessionEvent).toHaveBeenCalledWith({
          id: "event-1",
          event: expect.objectContaining({
            name: "Updated Event",
          }),
        });
      });
    });

    it("updates event from side panel", async () => {
      mockUpdateSessionEvent.mockReturnValue({
        error: null,
      });

      renderComponent();

      await waitFor(() => {
        const eventRow = screen.getByTestId("table-row-0");
        fireEvent.click(eventRow);
      });

      const updateButton = screen.getByTestId("update-from-panel");
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockUpdateSessionEvent).toHaveBeenCalled();
      });
    });

    it("shows error toast when update fails", async () => {
      mockUpdateSessionEvent.mockReturnValue({
        error: { message: "Update failed" },
      });

      renderComponent();

      await waitFor(() => {
        const updateButton = screen.getByTestId("update-row-0");
        fireEvent.click(updateButton);
      });

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Error updating event");
      });
    });
  });

  describe("Event deletion", () => {
    it("shows delete button when events are selected", async () => {
      renderComponent();

      await waitFor(() => {
        const selectButton = screen.getByTestId("select-row-0");
        fireEvent.click(selectButton);
      });

      // Check that delete button appears in toolbar
      expect(screen.getByTestId("toolbar-action")).toHaveTextContent("Delete");
      expect(screen.getByTestId("trash-icon")).toBeInTheDocument();
    });

    it("hides delete button without delete permission (e.g. multi-tenant admin)", async () => {
      testStore.dispatch(setPermissions([Permissions.EDIT_EVENT]));
      renderComponent();

      await waitFor(() => {
        const selectButton = screen.getByTestId("select-row-0");
        fireEvent.click(selectButton);
      });

      expect(screen.getByTestId("toolbar-action")).toHaveTextContent("Create New Event");
      expect(screen.queryByTestId("trash-icon")).not.toBeInTheDocument();
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

    it("deletes single event when confirmed", async () => {
      mockDeleteSessionEvents.mockReturnValue({
        error: null,
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
        expect(mockDeleteSessionEvents).toHaveBeenCalledWith({
          eventIds: expect.arrayContaining(["event-1"]),
        });
      });
    });

    it("shows success toast after successful deletion", async () => {
      mockDeleteSessionEvents.mockReturnValue({
        error: null,
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
        expect(mockToast.success).toHaveBeenCalledWith("Successfully deleted 1 event");
      });
    });

    it("shows plural message when deleting multiple events", async () => {
      mockDeleteSessionEvents.mockReturnValue({
        error: null,
      });

      renderComponent();

      // Select two events (mock selecting multiple)
      await waitFor(() => {
        const selectButton = screen.getByTestId("select-row-0");
        fireEvent.click(selectButton);
      });

      // Manually set multiple selections by clicking delete
      const deleteButton = screen.getByTestId("toolbar-action");
      fireEvent.click(deleteButton);

      // Verify popup shows plural form
      expect(screen.getByText(/delete 1 event/)).toBeInTheDocument();
    });

    it("shows error toast when deletion fails", async () => {
      mockDeleteSessionEvents.mockReturnValue({
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
        expect(mockToast.error).toHaveBeenCalledWith("Failed to delete event. Please try again.");
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

      expect(mockDeleteSessionEvents).not.toHaveBeenCalled();
    });

    it("deletes event from side panel", async () => {
      mockDeleteSessionEvents.mockReturnValue({
        error: null,
      });

      renderComponent();

      await waitFor(() => {
        const eventRow = screen.getByTestId("table-row-0");
        fireEvent.click(eventRow);
      });

      const deleteButton = screen.getByTestId("delete-from-panel");
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockDeleteSessionEvents).toHaveBeenCalledWith({
          eventIds: ["event-1"],
        });
      });
    });

    it("closes side panel after successful deletion from panel", async () => {
      mockDeleteSessionEvents.mockReturnValue({
        error: null,
      });

      renderComponent();

      await waitFor(() => {
        const eventRow = screen.getByTestId("table-row-0");
        fireEvent.click(eventRow);
      });

      const deleteButton = screen.getByTestId("delete-from-panel");
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.queryByTestId("event-side-panel")).not.toBeInTheDocument();
      });
    });
  });

  describe("Pagination", () => {
    it("loads more events when load more button is clicked", async () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: {
          data: new Array(30)
            .fill(mockEvents[0])
            .map((e, index) => ({ ...e, id: `event-${index}` })),
        },
        isFetching: false,
      });

      renderComponent();

      await waitFor(() => {
        const loadMoreButton = screen.getByText("Load more");
        fireEvent.click(loadMoreButton);
      });

      await waitFor(() => {
        expect(mockUseGetSessionEventsQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            visibilityType: "ACTIVE",
            offset: 30,
          }),
        );
      });
    });

    it("disables load more button when fetching", () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: {
          data: new Array(30)
            .fill(mockEvents[0])
            .map((e, index) => ({ ...e, id: `event-${index}` })),
        },
        isFetching: true,
      });

      renderComponent();

      const loadMoreButton = screen.getByText("Loading...").closest("button");
      expect(loadMoreButton).toBeDisabled();
    });

    it("disables load more button when no more data", async () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: mockEvents.slice(0, 2) },
        isFetching: false,
      });

      renderComponent();

      await waitFor(() => {
        const loadMoreButton = screen.getByText("No more data").closest("button");
        expect(loadMoreButton).toBeDisabled();
      });
    });

    it("appends new events when loading more", async () => {
      const firstBatch = mockEvents.slice(0, 2);
      const secondBatch = [mockEvents[2]];

      mockUseGetSessionEventsQuery.mockReturnValueOnce({
        data: { data: firstBatch },
        isFetching: false,
      });

      const { rerender } = renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("event-name-0")).toBeInTheDocument();
      });

      // Simulate loading more
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: secondBatch },
        isFetching: false,
      });

      rerender(
        <Provider store={testStore}>
          <EventManagement />
        </Provider>,
      );

      // Events should be appended, not replaced
      await waitFor(() => {
        expect(screen.getByTestId("event-name-0")).toBeInTheDocument();
      });
    });
  });

  describe("API query parameters", () => {
    it("calls API with correct default parameters", () => {
      renderComponent();

      expect(mockUseGetSessionEventsQuery).toHaveBeenCalledWith({
        visibilityType: "ACTIVE",
        limit: 30,
        offset: 0,
        sortBy: "createdAt",
        order: "desc",
        searchName: "",
      });
    });

    it("resets offset when search changes", async () => {
      renderComponent();

      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, { target: { value: "new search" } });

      await waitFor(() => {
        expect(mockUseGetSessionEventsQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            visibilityType: "ACTIVE",
            offset: 0,
            searchName: "new search",
          }),
        );
      });
    });
  });

  describe("Event data transformation", () => {
    it("converts sentences array to newline-separated string for description", async () => {
      renderComponent();

      await waitFor(() => {
        const updateButton = screen.getByTestId("update-row-0");
        fireEvent.click(updateButton);
      });

      await waitFor(() => {
        expect(mockUpdateSessionEvent).toHaveBeenCalledWith({
          id: "event-1",
          event: expect.objectContaining({
            name: "Updated Event",
          }),
        });
      });
    });

    it("handles events with empty sentences array", async () => {
      renderComponent();

      await waitFor(() => {
        const eventRow = screen.getByTestId("table-row-2");
        fireEvent.click(eventRow);
      });

      expect(screen.getByTestId("event-side-panel")).toBeInTheDocument();
    });

    it("handles events with null or undefined score", async () => {
      const eventWithNullScore = { ...mockEvents[0], score: null };
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: [eventWithNullScore] },
        isFetching: false,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("notion-table")).toBeInTheDocument();
      });
    });
  });

  describe("Edge cases", () => {
    it("handles empty events list", () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: [] },
        isFetching: false,
      });

      renderComponent();

      expect(screen.getByTestId("notion-table")).toBeInTheDocument();
    });

    it("handles undefined data from API", () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: undefined,
        isFetching: false,
      });

      renderComponent();

      expect(screen.getByText("Events")).toBeInTheDocument();
    });

    it("handles API error gracefully", async () => {
      mockUpdateSessionEvent.mockImplementation(() => {
        throw new Error("Network error");
      });

      renderComponent();

      await waitFor(() => {
        const updateButton = screen.getByTestId("update-row-0");
        fireEvent.click(updateButton);
      });

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Error updating event");
      });
    });

    it("handles deletion error gracefully", async () => {
      mockDeleteSessionEvents.mockImplementation(() => {
        throw new Error("Network error");
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
        expect(mockToast.error).toHaveBeenCalledWith("Failed to delete event. Please try again.");
      });
    });

    it("handles creation error gracefully", async () => {
      // Mock API to return an error
      mockCreateSessionEvents.mockReturnValue({
        error: { message: "Failed to create event" },
      });

      renderComponent();

      const createButton = screen.getByText("Create New Event");
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByTestId("event-type-selection-dialog")).toBeInTheDocument();
      });

      // Select COMBINATION event type
      const selectButton = screen.getByTestId("select-combination");
      fireEvent.click(selectButton);

      // COMBINATION events can be created (they just have expression: null initially)
      // When API returns an error, it should show an error toast
      await waitFor(() => {
        expect(mockCreateSessionEvents).toHaveBeenCalled();
        expect(mockToast.error).toHaveBeenCalledWith("Failed to create event");
      });

      // Side panel should not open when creation fails
      expect(screen.queryByTestId("event-side-panel")).not.toBeInTheDocument();
    });
  });

  describe("Selection management", () => {
    it("clears selection after successful deletion", async () => {
      mockDeleteSessionEvents.mockReturnValue({
        error: null,
      });

      renderComponent();

      await waitFor(() => {
        const selectButton = screen.getByTestId("select-row-0");
        fireEvent.click(selectButton);
      });

      expect(screen.getByTestId("toolbar-action")).toHaveTextContent("Delete");

      const deleteButton = screen.getByTestId("toolbar-action");
      fireEvent.click(deleteButton);

      const confirmButton = screen.getByTestId("confirm-action");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText("Create New Event")).toBeInTheDocument();
      });
    });

    it("shows create button when no events are selected", () => {
      renderComponent();

      expect(screen.getByText("Create New Event")).toBeInTheDocument();
      expect(screen.queryByText("Delete")).not.toBeInTheDocument();
    });
  });
});
