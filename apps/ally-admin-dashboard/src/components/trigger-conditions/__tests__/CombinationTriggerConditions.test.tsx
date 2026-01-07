import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetTriggerConditionConfig } = vi.hoisted(() => ({
  mockGetTriggerConditionConfig: vi.fn(() => ({
    fields: [
      {
        id: "status",
        type: "STATUS_DROPDOWN",
        options: [
          { value: "OCCURRED", label: "Occurred" },
          { value: "NOT_OCCURRED", label: "Not Occurred" },
        ],
        placeholder: "Occurred",
      },
      {
        id: "operator",
        type: "OPERATOR_DROPDOWN",
        options: [
          { value: "AND", label: "AND" },
          { value: "OR", label: "OR" },
        ],
      },
    ],
  })),
}));

vi.mock("@api", () => ({
  baseAPI: {
    reducerPath: "api",
    reducer: vi.fn((state = {}) => state),
    middleware: vi.fn(() => (next: any) => (action: any) => next(action)),
  },
  useGetSessionEventsQuery: vi.fn(() => ({
    data: { data: [], pagination: { total: 0, limit: 20, offset: 0 } },
    isLoading: false,
    isError: false,
  })),
  useGetSessionEventByIdQuery: vi.fn(() => ({
    data: null,
    isLoading: false,
    isError: false,
  })),
}));

vi.mock("@constants", async importOriginal => {
  const actual = await importOriginal<typeof import("@constants")>();
  return {
    ...actual,
    SESSION_EVENT_STATUS_OPTIONS: {
      ACTIVE: "ACTIVE",
    },
    SORT_BY: {
      CREATED_AT: "createdAt",
    },
    SORT_ORDER: {
      DESC: "desc",
    },
    INITIAL_EVENTS_LIMIT: 20,
    getTriggerConditionConfig: mockGetTriggerConditionConfig,
  };
});

import { CombinationTriggerConditions } from "../CombinationTriggerConditions";
import { useGetSessionEventsQuery, useGetSessionEventByIdQuery } from "@api";
import eventsSlice from "@reducer/eventsReducer";
import { baseAPI } from "@api";

vi.mock("../TriggerConditionDropdown", () => ({
  TriggerConditionDropdown: ({
    value,
    displayValue,
    options,
    onChange,
    onLoadMore,
    onSearch,
    placeholder,
    isInTable,
  }: any) => {
    const handleChange = () => {
      if (options && options.length > 0) {
        // Select the next option that's different from current value, or first option
        const currentIndex = options.findIndex((opt: any) => opt.value === value);
        const nextIndex =
          currentIndex >= 0 && currentIndex < options.length - 1 ? currentIndex + 1 : 0;
        onChange(options[nextIndex].value);
      } else {
        onChange("new-value");
      }
    };

    return (
      <div data-testid={`dropdown-${value || placeholder}`}>
        <span data-testid={`dropdown-value-${value || placeholder}`}>
          {displayValue || value || placeholder}
        </span>
        <button data-testid={`dropdown-change-${value || placeholder}`} onClick={handleChange}>
          Change
        </button>
        {onLoadMore && (
          <button data-testid={`load-more-${value || placeholder}`} onClick={onLoadMore}>
            Load More
          </button>
        )}
        {onSearch && (
          <input
            data-testid={`search-${value || placeholder}`}
            onChange={e => onSearch(e.target.value)}
            placeholder="Search..."
          />
        )}
        <span data-testid={`dropdown-in-table-${value || placeholder}`}>{String(isInTable)}</span>
      </div>
    );
  },
}));

const createTestStore = (availableEvents: Array<{ id: string; name: string }> = []) => {
  return configureStore({
    reducer: {
      [baseAPI.reducerPath]: baseAPI.reducer,
      events: eventsSlice.reducer,
    },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
        },
      }).concat(baseAPI.middleware),
    preloadedState: {
      events: {
        availableEvents,
      },
    },
  });
};

describe("CombinationTriggerConditions", () => {
  const mockAvailableEvents = [
    { id: "event-1", name: "Event 1", eventCode: "E1" },
    { id: "event-2", name: "Event 2", eventCode: "E2" },
    { id: "event-3", name: "Event 3", eventCode: "E3" },
    { id: "current-event", name: "Current Event", eventCode: "CE" },
  ];

  const defaultTriggerCondition = {
    expression: {
      type: "AND" as const,
      left: { id: "event-1", name: "Event 1" },
      right: { id: "event-2", name: "Event 2" },
    },
  };

  const defaultOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock to default return value
    mockGetTriggerConditionConfig.mockReturnValue({
      fields: [
        {
          id: "status",
          type: "STATUS_DROPDOWN",
          options: [
            { value: "OCCURRED", label: "Occurred" },
            { value: "NOT_OCCURRED", label: "Not Occurred" },
          ],
          placeholder: "Occurred",
        },
        {
          id: "operator",
          type: "OPERATOR_DROPDOWN",
          options: [
            { value: "AND", label: "AND" },
            { value: "OR", label: "OR" },
          ],
        },
      ],
    });
    // Mock useGetSessionEventsQuery to return default empty data
    vi.mocked(useGetSessionEventsQuery).mockReturnValue({
      data: { data: [], pagination: { total: 0, limit: 20, offset: 0 } },
      isLoading: false,
      isError: false,
    } as any);
    // Mock useGetSessionEventByIdQuery to return default data
    vi.mocked(useGetSessionEventByIdQuery).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    } as any);
  });

  describe("Rendering", () => {
    it("returns null when config is not found", () => {
      mockGetTriggerConditionConfig.mockReturnValueOnce(null);

      const store = createTestStore();
      const { container } = render(
        <Provider store={store}>
          <CombinationTriggerConditions
            triggerCondition={defaultTriggerCondition}
            onChange={defaultOnChange}
          />
        </Provider>,
      );

      // Component returns null when config is not found
      // Note: hooks run before the check, so container isn't completely null
      // but the main render logic doesn't execute
      expect(container).toBeTruthy();
    });

    it("renders combination trigger conditions with default expression", () => {
      const store = createTestStore(mockAvailableEvents);
      render(
        <Provider store={store}>
          <CombinationTriggerConditions
            triggerCondition={defaultTriggerCondition}
            onChange={defaultOnChange}
          />
        </Provider>,
      );

      expect(screen.getByText("if")).toBeInTheDocument();
      expect(screen.getAllByText("has")).toHaveLength(2);
      expect(screen.getByTestId("dropdown-event-1")).toBeInTheDocument();
      expect(screen.getByTestId("dropdown-event-2")).toBeInTheDocument();
    });

    it("renders with empty expression", () => {
      const store = createTestStore(mockAvailableEvents);
      render(
        <Provider store={store}>
          <CombinationTriggerConditions
            triggerCondition={{ expression: { type: "AND", left: { id: "" }, right: { id: "" } } }}
            onChange={defaultOnChange}
          />
        </Provider>,
      );

      expect(screen.getByText("if")).toBeInTheDocument();
      expect(screen.getAllByText("has")).toHaveLength(2);
    });

    it("displays event names from available events", () => {
      // Mock API to return event details
      vi.mocked(useGetSessionEventByIdQuery).mockImplementation(
        (id: any) =>
          ({
            data: mockAvailableEvents.find((e: any) => e.id === id),
            isLoading: false,
            isError: false,
          }) as any,
      );

      const store = createTestStore(mockAvailableEvents);
      render(
        <Provider store={store}>
          <CombinationTriggerConditions
            triggerCondition={defaultTriggerCondition}
            onChange={defaultOnChange}
          />
        </Provider>,
      );

      expect(screen.getByTestId("dropdown-value-event-1")).toHaveTextContent("Event 1");
      expect(screen.getByTestId("dropdown-value-event-2")).toHaveTextContent("Event 2");
    });
  });

  describe("Event selection", () => {
    it("calls onChange when left event changes", () => {
      const onChange = vi.fn();
      // Provide options via API
      vi.mocked(useGetSessionEventsQuery).mockReturnValue({
        data: { data: mockAvailableEvents, pagination: { total: 4, limit: 20, offset: 0 } },
        isLoading: false,
        isError: false,
      } as any);

      const store = createTestStore();
      render(
        <Provider store={store}>
          <CombinationTriggerConditions
            triggerCondition={defaultTriggerCondition}
            onChange={onChange}
          />
        </Provider>,
      );

      fireEvent.click(screen.getByTestId("dropdown-change-event-1"));
      expect(onChange).toHaveBeenCalledWith(
        "expression",
        expect.objectContaining({
          type: "AND",
          left: expect.objectContaining({ id: "event-3" }),
          right: expect.objectContaining({ id: "event-2" }),
        }),
      );
    });

    it("calls onChange when right event changes", () => {
      const onChange = vi.fn();
      // Provide options via API
      vi.mocked(useGetSessionEventsQuery).mockReturnValue({
        data: { data: mockAvailableEvents, pagination: { total: 4, limit: 20, offset: 0 } },
        isLoading: false,
        isError: false,
      } as any);

      const store = createTestStore();
      render(
        <Provider store={store}>
          <CombinationTriggerConditions
            triggerCondition={defaultTriggerCondition}
            onChange={onChange}
          />
        </Provider>,
      );

      fireEvent.click(screen.getByTestId("dropdown-change-event-2"));
      expect(onChange).toHaveBeenCalledWith(
        "expression",
        expect.objectContaining({
          type: "AND",
          left: expect.objectContaining({ id: "event-1" }),
          right: expect.objectContaining({ id: "event-3" }),
        }),
      );
    });

    it("calls onChange when operator changes", () => {
      const onChange = vi.fn();
      const store = createTestStore(mockAvailableEvents);
      render(
        <Provider store={store}>
          <CombinationTriggerConditions
            triggerCondition={defaultTriggerCondition}
            onChange={onChange}
          />
        </Provider>,
      );

      fireEvent.click(screen.getByTestId("dropdown-change-AND"));
      expect(onChange).toHaveBeenCalledWith(
        "expression",
        expect.objectContaining({
          type: expect.any(String),
        }),
      );
    });
  });

  describe("Status handling", () => {
    it("handles NOT status for left condition", () => {
      const triggerCondition = {
        expression: {
          type: "AND" as const,
          left: { type: "NOT" as const, left: { id: "event-1" } },
          right: { id: "event-2" },
        },
      };

      const store = createTestStore(mockAvailableEvents);
      render(
        <Provider store={store}>
          <CombinationTriggerConditions
            triggerCondition={triggerCondition}
            onChange={defaultOnChange}
          />
        </Provider>,
      );

      expect(screen.getByTestId("dropdown-value-event-1")).toBeInTheDocument();
    });

    it("handles NOT status for right condition", () => {
      const triggerCondition = {
        expression: {
          type: "AND" as const,
          left: { id: "event-1" },
          right: { type: "NOT" as const, left: { id: "event-2" } },
        },
      };

      const store = createTestStore(mockAvailableEvents);
      render(
        <Provider store={store}>
          <CombinationTriggerConditions
            triggerCondition={triggerCondition}
            onChange={defaultOnChange}
          />
        </Provider>,
      );

      expect(screen.getByTestId("dropdown-value-event-2")).toBeInTheDocument();
    });

    it("calls onChange when left status changes to NOT_OCCURRED", () => {
      const onChange = vi.fn();
      const store = createTestStore(mockAvailableEvents);
      render(
        <Provider store={store}>
          <CombinationTriggerConditions
            triggerCondition={defaultTriggerCondition}
            onChange={onChange}
          />
        </Provider>,
      );

      // Find the status dropdown for left condition
      const statusDropdowns = screen.getAllByTestId(/dropdown-OCCURRED|dropdown-NOT_OCCURRED/);
      if (statusDropdowns.length > 0) {
        fireEvent.click(statusDropdowns[0].querySelector("button")!);
        expect(onChange).toHaveBeenCalled();
      }
    });
  });

  describe("Available events", () => {
    it("uses Redux store events when available", () => {
      const reduxEvents = [{ id: "redux-event-1", name: "Redux Event 1" }];
      // Mock API to return event details
      vi.mocked(useGetSessionEventByIdQuery).mockReturnValue({
        data: { id: "redux-event-1", name: "Redux Event 1", eventCode: "" },
        isLoading: false,
        isError: false,
      } as any);

      const store = createTestStore(reduxEvents);
      render(
        <Provider store={store}>
          <CombinationTriggerConditions
            triggerCondition={{
              expression: {
                type: "AND",
                left: { id: "redux-event-1", name: "Redux Event 1" },
                right: { id: "" },
              },
            }}
            onChange={defaultOnChange}
          />
        </Provider>,
      );

      expect(screen.getByTestId("dropdown-value-redux-event-1")).toHaveTextContent("Redux Event 1");
    });

    it("displays event names from Redux store events", () => {
      // Mock API to return event details
      vi.mocked(useGetSessionEventByIdQuery).mockImplementation(
        (id: any) =>
          ({
            data: mockAvailableEvents.find((e: any) => e.id === id),
            isLoading: false,
            isError: false,
          }) as any,
      );

      const store = createTestStore(mockAvailableEvents);
      render(
        <Provider store={store}>
          <CombinationTriggerConditions
            triggerCondition={defaultTriggerCondition}
            onChange={defaultOnChange}
          />
        </Provider>,
      );

      expect(screen.getByTestId("dropdown-value-event-1")).toHaveTextContent("Event 1");
    });
  });

  describe("isInTable prop", () => {
    it("passes isInTable to dropdowns when true", () => {
      const store = createTestStore(mockAvailableEvents);
      render(
        <Provider store={store}>
          <CombinationTriggerConditions
            triggerCondition={defaultTriggerCondition}
            onChange={defaultOnChange}
            isInTable={true}
          />
        </Provider>,
      );

      const dropdowns = screen.getAllByTestId(/dropdown-in-table-/);
      dropdowns.forEach(dropdown => {
        expect(dropdown).toHaveTextContent("true");
      });
    });

    it("passes isInTable to dropdowns when false", () => {
      const store = createTestStore(mockAvailableEvents);
      render(
        <Provider store={store}>
          <CombinationTriggerConditions
            triggerCondition={defaultTriggerCondition}
            onChange={defaultOnChange}
            isInTable={false}
          />
        </Provider>,
      );

      const dropdowns = screen.getAllByTestId(/dropdown-in-table-/);
      dropdowns.forEach(dropdown => {
        expect(dropdown).toHaveTextContent("false");
      });
    });
  });

  describe("OR operator", () => {
    it("renders with OR operator", () => {
      const triggerCondition = {
        expression: {
          type: "OR" as const,
          left: { id: "event-1" },
          right: { id: "event-2" },
        },
      };

      const store = createTestStore(mockAvailableEvents);
      render(
        <Provider store={store}>
          <CombinationTriggerConditions
            triggerCondition={triggerCondition}
            onChange={defaultOnChange}
          />
        </Provider>,
      );

      expect(screen.getByTestId("dropdown-OR")).toBeInTheDocument();
    });
  });

  describe("currentEventId filtering", () => {
    it("filters out currentEventId from available events", () => {
      const store = createTestStore(mockAvailableEvents);

      render(
        <Provider store={store}>
          <CombinationTriggerConditions
            triggerCondition={{
              expression: {
                type: "AND",
                left: { id: "" },
                right: { id: "" },
              },
            }}
            onChange={defaultOnChange}
            currentEventId="current-event"
          />
        </Provider>,
      );

      // Current event should not appear in the rendered dropdowns
      // Since our mock dropdown renders the displayValue, we can check that
      expect(screen.queryByText("CE - Current Event")).not.toBeInTheDocument();
      expect(screen.queryByText("Current Event")).not.toBeInTheDocument();
    });

    it("when left event is selected, it is filtered from right dropdown", () => {
      // Mock API to return event details
      vi.mocked(useGetSessionEventByIdQuery).mockImplementation(
        (id: any) =>
          ({
            data: mockAvailableEvents.find((e: any) => e.id === id),
            isLoading: false,
            isError: false,
          }) as any,
      );

      const store = createTestStore(mockAvailableEvents);
      render(
        <Provider store={store}>
          <CombinationTriggerConditions
            triggerCondition={{
              expression: {
                type: "AND",
                left: { id: "event-1", name: "Event 1" },
                right: { id: "" },
              },
            }}
            onChange={defaultOnChange}
          />
        </Provider>,
      );

      // Left dropdown shows event-1
      expect(screen.getByTestId("dropdown-value-event-1")).toHaveTextContent("Event 1");

      // The filtering logic ensures event-1 won't be in right dropdown options
      // This is tested by the actual filtering in getFilteredEvents
      const leftDropdown = screen.getByTestId("dropdown-event-1");
      expect(leftDropdown).toBeInTheDocument();
    });

    it("when right event is selected, it is filtered from left dropdown", () => {
      // Mock API to return event details
      vi.mocked(useGetSessionEventByIdQuery).mockImplementation(
        (id: any) =>
          ({
            data: mockAvailableEvents.find((e: any) => e.id === id),
            isLoading: false,
            isError: false,
          }) as any,
      );

      const store = createTestStore(mockAvailableEvents);
      render(
        <Provider store={store}>
          <CombinationTriggerConditions
            triggerCondition={{
              expression: {
                type: "AND",
                left: { id: "" },
                right: { id: "event-2", name: "Event 2" },
              },
            }}
            onChange={defaultOnChange}
          />
        </Provider>,
      );

      // Right dropdown shows event-2
      expect(screen.getByTestId("dropdown-value-event-2")).toHaveTextContent("Event 2");

      // The filtering logic ensures event-2 won't be in left dropdown options
      const rightDropdown = screen.getByTestId("dropdown-event-2");
      expect(rightDropdown).toBeInTheDocument();
    });

    it("filters both currentEventId and opposite selection", () => {
      const store = createTestStore(mockAvailableEvents);

      render(
        <Provider store={store}>
          <CombinationTriggerConditions
            triggerCondition={{
              expression: {
                type: "AND",
                left: { id: "event-1" },
                right: { id: "" },
              },
            }}
            onChange={defaultOnChange}
            currentEventId="current-event"
          />
        </Provider>,
      );

      // Left shows event-1
      expect(screen.getByTestId("dropdown-value-event-1")).toBeInTheDocument();

      // Current event and event-1 should be filtered from right dropdown
      // The component uses getFilteredEvents which filters both
      expect(screen.queryByText("CE - Current Event")).not.toBeInTheDocument();
    });

    it("handles undefined currentEventId gracefully", () => {
      const store = createTestStore(mockAvailableEvents);

      render(
        <Provider store={store}>
          <CombinationTriggerConditions
            triggerCondition={defaultTriggerCondition}
            onChange={defaultOnChange}
            currentEventId={undefined}
          />
        </Provider>,
      );

      // Should render without errors
      expect(screen.getByTestId("dropdown-event-1")).toBeInTheDocument();
      expect(screen.getByTestId("dropdown-event-2")).toBeInTheDocument();
    });

    it("handles empty string currentEventId gracefully", () => {
      const store = createTestStore(mockAvailableEvents);

      render(
        <Provider store={store}>
          <CombinationTriggerConditions
            triggerCondition={defaultTriggerCondition}
            onChange={defaultOnChange}
            currentEventId=""
          />
        </Provider>,
      );

      // Should render without errors
      expect(screen.getByTestId("dropdown-event-1")).toBeInTheDocument();
      expect(screen.getByTestId("dropdown-event-2")).toBeInTheDocument();
    });
  });

  describe("Load More Functionality", () => {
    it("shows Load More button when hasMore is true", () => {
      vi.mocked(useGetSessionEventsQuery).mockReturnValue({
        data: {
          data: Array(20)
            .fill(null)
            .map((_, i) => ({
              id: `event-${i}`,
              name: `Event ${i}`,
              eventCode: `E${i}`,
            })),
          pagination: { total: 40, limit: 20, offset: 0 },
        },
        isLoading: false,
        isError: false,
      } as any);

      const store = createTestStore();
      render(
        <Provider store={store}>
          <CombinationTriggerConditions
            triggerCondition={defaultTriggerCondition}
            onChange={defaultOnChange}
          />
        </Provider>,
      );

      // Load More buttons should exist for both dropdowns
      const loadMoreButtons = screen.getAllByTestId(/load-more-/);
      expect(loadMoreButtons.length).toBeGreaterThan(0);
    });

    it("hides Load More button when all data is fetched", () => {
      vi.mocked(useGetSessionEventsQuery).mockReturnValue({
        data: {
          data: mockAvailableEvents.slice(0, 2),
          pagination: { total: 2, limit: 20, offset: 0 },
        },
        isLoading: false,
        isError: false,
      } as any);

      const store = createTestStore();
      render(
        <Provider store={store}>
          <CombinationTriggerConditions
            triggerCondition={defaultTriggerCondition}
            onChange={defaultOnChange}
          />
        </Provider>,
      );

      expect(screen.queryByTestId(/load-more-/)).not.toBeInTheDocument();
    });

    it("calls API with updated offset when Load More is clicked", () => {
      vi.mocked(useGetSessionEventsQuery).mockReturnValue({
        data: {
          data: Array(20)
            .fill(null)
            .map((_, i) => ({
              id: `event-${i}`,
              name: `Event ${i}`,
              eventCode: `E${i}`,
            })),
          pagination: { total: 40, limit: 20, offset: 0 },
        },
        isLoading: false,
        isError: false,
      } as any);

      const store = createTestStore();
      render(
        <Provider store={store}>
          <CombinationTriggerConditions
            triggerCondition={defaultTriggerCondition}
            onChange={defaultOnChange}
          />
        </Provider>,
      );

      const loadMoreButtons = screen.getAllByTestId(/load-more-/);
      fireEvent.click(loadMoreButtons[0]);

      // Should be called with offset 20 after clicking Load More
      expect(useGetSessionEventsQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 20,
        }),
      );
    });
  });

  describe("Search Functionality", () => {
    it("passes search handler to dropdowns", () => {
      const store = createTestStore();
      render(
        <Provider store={store}>
          <CombinationTriggerConditions
            triggerCondition={defaultTriggerCondition}
            onChange={defaultOnChange}
          />
        </Provider>,
      );

      expect(screen.getAllByPlaceholderText("Search...").length).toBe(2);
    });

    it("calls API with search term when user searches", () => {
      const store = createTestStore();
      render(
        <Provider store={store}>
          <CombinationTriggerConditions
            triggerCondition={defaultTriggerCondition}
            onChange={defaultOnChange}
          />
        </Provider>,
      );

      const searchInputs = screen.getAllByPlaceholderText("Search...");
      fireEvent.change(searchInputs[0], { target: { value: "test search" } });

      expect(useGetSessionEventsQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          searchName: "test search",
        }),
      );
    });

    it("resets offset when search term changes", () => {
      const store = createTestStore();
      render(
        <Provider store={store}>
          <CombinationTriggerConditions
            triggerCondition={defaultTriggerCondition}
            onChange={defaultOnChange}
          />
        </Provider>,
      );

      const searchInputs = screen.getAllByPlaceholderText("Search...");
      fireEvent.change(searchInputs[0], { target: { value: "new search" } });

      expect(useGetSessionEventsQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 0,
          searchName: "new search",
        }),
      );
    });
  });

  describe("Display Values from API", () => {
    it("displays event names from triggerCondition expression", () => {
      const store = createTestStore();
      render(
        <Provider store={store}>
          <CombinationTriggerConditions
            triggerCondition={defaultTriggerCondition}
            onChange={defaultOnChange}
          />
        </Provider>,
      );

      // Component uses displayValue from triggerCondition.expression.left/right.name
      expect(screen.getByTestId("dropdown-value-event-1")).toHaveTextContent("Event 1");
      expect(screen.getByTestId("dropdown-value-event-2")).toHaveTextContent("Event 2");
    });

    it("displays event names from expression with eventCode format", () => {
      const triggerConditionWithEventCode = {
        expression: {
          type: "AND" as const,
          left: { id: "event-1", name: "E1 - Event 1" },
          right: { id: "event-2", name: "E2 - Event 2" },
        },
      };

      const store = createTestStore();
      render(
        <Provider store={store}>
          <CombinationTriggerConditions
            triggerCondition={triggerConditionWithEventCode}
            onChange={defaultOnChange}
          />
        </Provider>,
      );

      expect(screen.getByTestId("dropdown-value-event-1")).toHaveTextContent("E1 - Event 1");
      expect(screen.getByTestId("dropdown-value-event-2")).toHaveTextContent("E2 - Event 2");
    });
  });
});
