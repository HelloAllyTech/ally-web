import { render, screen, fireEvent, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock setup
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

// Mock cellTypes and other components to prevent SimulationCreator.ts and others from failing during import
vi.mock("@components", () => ({
  cellTypes: {
    editableText: "editableText",
    dropdown: "dropdown",
    dropdownSearchable: "dropdownSearchable",
    number: "number",
    select: "select",
    switch: "switch",
    emoji_select: "emoji_select",
    normalText: "normalText",
    triggerConditions: "triggerConditions",
    timeInput: "timeInput",
    score: "score",
  },
  TriggerConditionDropdown: ({
    value,
    displayValue,
    options,
    onChange,
    onLoadMore,
    onSearch,
    placeholder,
    isInTable,
    className,
  }: any) => (
    <div data-testid={`dropdown-${value || placeholder}`} className={className}>
      <span data-testid={`dropdown-value-${value || placeholder}`}>
        {displayValue || value || placeholder}
      </span>
      <button
        data-testid={`dropdown-change-${value || placeholder}`}
        onClick={() => {
          if (options && options.length > 0) {
            const nextOption = options.find((opt: any) => opt.value !== value) || options[0];
            onChange(nextOption.value, nextOption.label);
          } else {
            onChange("new-value", "New Value");
          }
        }}
      >
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
      <span data-testid={`in-table-${value || placeholder}`}>{String(isInTable)}</span>
    </div>
  ),
  GeneratedExpressionView: ({ node }: any) => (
    <div data-testid="generated-expression-view">Expression: {JSON.stringify(node)}</div>
  ),
}));

vi.mock("@constants", () => ({
  INITIAL_EVENTS_LIMIT: 5,
  getTriggerConditionConfig: mockGetTriggerConditionConfig,
  SESSION_EVENT_STATUS_OPTIONS: { ACTIVE: "ACTIVE" },
  SORT_BY: { CREATED_AT: "createdAt", UPDATED_AT: "updatedAt" },
  SORT_ORDER: { ASC: "ASC", DESC: "DESC" },
  EVENT_DETECTION_TYPES: {
    SENTENCE_SIMILARITY: "SENTENCE_SIMILARITY",
    TIME_BASED: "TIME_BASED",
    SCORE_BASED: "SCORE_BASED",
    COMBINATION: "COMBINATION",
    SEMANTIC_SIMILARITY: "SEMANTIC_SIMILARITY",
    BINARY_CLASSIFIER: "BINARY_CLASSIFIER",
  },
  en: {
    eventConfiguration: {
      selectEvent: "Select an event",
      searchEvents: "Search events...",
      occurred: "Occurred",
      if: "if",
      has: "has",
      more: "+more",
      addBase: "Add Branch",
    },
  },
}));

vi.mock("@api", () => ({
  // evaluatorAPI is wired into the store alongside baseAPI; stub it too so
  // store init (reducerPath/reducer/middleware) does not throw.
  evaluatorAPI: {
    reducerPath: "evaluatorAPI",
    reducer: (state = {}) => state,
    middleware: () => (next: any) => (action: any) => next(action),
    util: { resetApiState: () => ({ type: "reset" }) },
  },
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
}));

vi.mock("@assets", () => ({
  Delete: ({ className }: any) => <div className={className} data-testid="delete-icon" />,
  GroupBranch: ({ className }: any) => (
    <div className={className} data-testid="group-branch-icon" />
  ),
  AddBlue: ({ className }: any) => <div className={className} data-testid="add-blue-icon" />,
}));

import { useGetSessionEventsQuery } from "@api";
import { baseAPI } from "@api";
import eventsSlice from "@reducer/eventsReducer";
import { MultiLevelCombinationTriggerConditions } from "../MultiLevelCombinationTriggerConditions";
import { COMBINATION_OPERATOR, EVENT_STATUS } from "@types";

const createTestStore = () => {
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
  });
};

describe("MultiLevelCombinationTriggerConditions - Core Logic Tests", () => {
  const mockEvents = [
    { id: "event-1", name: "Event 1", eventCode: "E1" },
    { id: "event-2", name: "Event 2", eventCode: "E2" },
    { id: "event-3", name: "Event 3", eventCode: "E3" },
    { id: "event-4", name: "Event 4", eventCode: "E4" },
    { id: "event-5", name: "Event 5", eventCode: "E5" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
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
    vi.mocked(useGetSessionEventsQuery).mockReturnValue({
      data: { data: mockEvents, pagination: { total: mockEvents.length, limit: 20, offset: 0 } },
      isLoading: false,
      isError: false,
    } as any);
  });

  describe("1. Multi-level Nested Expression Tree Rendering", () => {
    it("renders deeply nested expression tree with multiple levels correctly", () => {
      const nestedExpression = {
        type: COMBINATION_OPERATOR.AND,
        left: {
          type: COMBINATION_OPERATOR.OR,
          left: { id: "event-1", name: "Event 1" },
          right: { id: "event-2", name: "Event 2" },
        },
        right: {
          type: COMBINATION_OPERATOR.AND,
          left: { id: "event-3", name: "Event 3" },
          right: { id: "event-4", name: "Event 4" },
        },
      };

      const onChange = vi.fn();
      const store = createTestStore();

      render(
        <Provider store={store}>
          <MultiLevelCombinationTriggerConditions
            triggerCondition={{ expression: nestedExpression }}
            onChange={onChange}
          />
        </Provider>,
      );

      // Should render all 4 events
      expect(screen.getByTestId("dropdown-event-1")).toBeInTheDocument();
      expect(screen.getByTestId("dropdown-event-2")).toBeInTheDocument();
      expect(screen.getByTestId("dropdown-event-3")).toBeInTheDocument();
      expect(screen.getByTestId("dropdown-event-4")).toBeInTheDocument();

      // Should render 3 operators (2 nested groups + 1 root)
      expect(screen.getByTestId("dropdown-OR")).toBeInTheDocument();
      expect(screen.getAllByTestId("dropdown-AND")).toHaveLength(2);

      // Should have grouped sections (bordered divs for nested levels)
      const borderedDivs = document.querySelectorAll(".border-\\[1px\\]");
      expect(borderedDivs.length).toBeGreaterThan(0);
    });
  });

  describe("2. Dynamic Path-based Node Updates", () => {
    it("updates deeply nested node using path navigation correctly", () => {
      const nestedExpression = {
        type: COMBINATION_OPERATOR.AND,
        left: {
          type: COMBINATION_OPERATOR.OR,
          left: { id: "event-1", name: "Event 1" },
          right: { id: "event-2", name: "Event 2" },
        },
        right: { id: "event-3", name: "Event 3" },
      };

      const onChange = vi.fn();
      const store = createTestStore();

      render(
        <Provider store={store}>
          <MultiLevelCombinationTriggerConditions
            triggerCondition={{ expression: nestedExpression }}
            onChange={onChange}
          />
        </Provider>,
      );

      // Change event at path root.left.right (event-2)
      const event2Dropdown = screen.getByTestId("dropdown-event-2");
      const changeButton = within(event2Dropdown).getByTestId("dropdown-change-event-2");
      fireEvent.click(changeButton);

      expect(onChange).toHaveBeenCalledWith(
        "expression",
        expect.objectContaining({
          type: COMBINATION_OPERATOR.AND,
          left: expect.objectContaining({
            type: COMBINATION_OPERATOR.OR,
            right: expect.objectContaining({
              id: "event-4",
            }),
          }),
        }),
      );
    });
  });

  describe("3. Sibling Addition with Tree Restructuring", () => {
    it("adds sibling to leaf node creating new operator subtree", () => {
      const simpleExpression = {
        type: COMBINATION_OPERATOR.AND,
        left: { id: "event-1", name: "Event 1" },
        right: { id: "event-2", name: "Event 2" },
      };

      const onChange = vi.fn();
      const store = createTestStore();

      render(
        <Provider store={store}>
          <MultiLevelCombinationTriggerConditions
            triggerCondition={{ expression: simpleExpression }}
            onChange={onChange}
          />
        </Provider>,
      );

      // Find and click the Add Leaf button for event-1
      const addLeafButtons = screen.getAllByTestId("add-blue-icon");
      fireEvent.click(addLeafButtons[0].parentElement!);

      expect(onChange).toHaveBeenCalledWith(
        "expression",
        expect.objectContaining({
          type: COMBINATION_OPERATOR.AND,
          left: expect.objectContaining({
            type: COMBINATION_OPERATOR.AND,
            left: expect.objectContaining({ id: "event-1" }),
            right: expect.objectContaining({ id: "" }),
          }),
          right: expect.objectContaining({ id: "event-2" }),
        }),
      );
    });
  });

  describe("4. Node Deletion with Sibling Promotion", () => {
    it("deletes node and promotes sibling correctly in nested tree", () => {
      const nestedExpression = {
        type: COMBINATION_OPERATOR.AND,
        left: {
          type: COMBINATION_OPERATOR.OR,
          left: { id: "event-1", name: "Event 1" },
          right: { id: "event-2", name: "Event 2" },
        },
        right: { id: "event-3", name: "Event 3" },
      };

      const onChange = vi.fn();
      const store = createTestStore();

      render(
        <Provider store={store}>
          <MultiLevelCombinationTriggerConditions
            triggerCondition={{ expression: nestedExpression }}
            onChange={onChange}
          />
        </Provider>,
      );

      // Delete event-1 (left child of OR group)
      const deleteButtons = screen.getAllByTestId("delete-icon");
      fireEvent.click(deleteButtons[0].parentElement!);

      // Should promote event-2 to replace the OR group
      expect(onChange).toHaveBeenCalledWith(
        "expression",
        expect.objectContaining({
          type: COMBINATION_OPERATOR.AND,
          left: expect.objectContaining({ id: "event-2" }),
          right: expect.objectContaining({ id: "event-3" }),
        }),
      );
    });
  });

  describe("5. Operator Change Propagation in Nested Groups", () => {
    it("changes operator in nested group without affecting other parts of tree", () => {
      const nestedExpression = {
        type: COMBINATION_OPERATOR.AND,
        left: {
          type: COMBINATION_OPERATOR.OR,
          left: { id: "event-1", name: "Event 1" },
          right: { id: "event-2", name: "Event 2" },
        },
        right: { id: "event-3", name: "Event 3" },
      };

      const onChange = vi.fn();
      const store = createTestStore();

      render(
        <Provider store={store}>
          <MultiLevelCombinationTriggerConditions
            triggerCondition={{ expression: nestedExpression }}
            onChange={onChange}
          />
        </Provider>,
      );

      // Change the OR operator to AND
      const orDropdown = screen.getByTestId("dropdown-OR");
      const changeButton = within(orDropdown).getByTestId("dropdown-change-OR");
      fireEvent.click(changeButton);

      expect(onChange).toHaveBeenCalledWith(
        "expression",
        expect.objectContaining({
          type: COMBINATION_OPERATOR.AND,
          left: expect.objectContaining({
            type: COMBINATION_OPERATOR.AND, // Changed from OR
            left: expect.objectContaining({ id: "event-1" }),
            right: expect.objectContaining({ id: "event-2" }),
          }),
          right: expect.objectContaining({ id: "event-3" }),
        }),
      );
    });
  });

  describe("6. NOT Status Handling in Nested Conditions", () => {
    it("toggles NOT status while preserving tree structure", () => {
      const expressionWithNot = {
        type: COMBINATION_OPERATOR.AND,
        left: {
          type: "NOT" as const,
          left: { id: "event-1", name: "Event 1" },
        },
        right: { id: "event-2", name: "Event 2" },
      };

      const onChange = vi.fn();
      const store = createTestStore();

      render(
        <Provider store={store}>
          <MultiLevelCombinationTriggerConditions
            triggerCondition={{ expression: expressionWithNot }}
            onChange={onChange}
          />
        </Provider>,
      );

      // Should render with NOT_OCCURRED status
      expect(screen.getByTestId("dropdown-NOT_OCCURRED")).toBeInTheDocument();

      // Change status from NOT_OCCURRED to OCCURRED
      const statusDropdown = screen.getByTestId("dropdown-NOT_OCCURRED");
      const changeButton = within(statusDropdown).getByTestId("dropdown-change-NOT_OCCURRED");
      fireEvent.click(changeButton);

      expect(onChange).toHaveBeenCalledWith(
        "expression",
        expect.objectContaining({
          type: COMBINATION_OPERATOR.AND,
          left: expect.objectContaining({ id: "event-1" }), // NOT wrapper removed
          right: expect.objectContaining({ id: "event-2" }),
        }),
      );
    });
  });

  describe("7. Event Filtering Across Multi-level Tree", () => {
    it("filters used events from all levels when selecting new event", () => {
      const nestedExpression = {
        type: COMBINATION_OPERATOR.AND,
        left: {
          type: COMBINATION_OPERATOR.OR,
          left: { id: "event-1", name: "Event 1" },
          right: { id: "event-2", name: "Event 2" },
        },
        right: { id: "", name: "" }, // Empty slot
      };

      const onChange = vi.fn();
      const store = createTestStore();

      render(
        <Provider store={store}>
          <MultiLevelCombinationTriggerConditions
            triggerCondition={{ expression: nestedExpression }}
            onChange={onChange}
            currentEventId="event-4"
          />
        </Provider>,
      );

      // The empty dropdown should not have event-1, event-2, or event-4 in options
      const emptyDropdown = screen.getByTestId("dropdown-Select an event");
      const changeButton = within(emptyDropdown).getByTestId("dropdown-change-Select an event");
      fireEvent.click(changeButton);

      // Should select event-3 (the only available one)
      expect(onChange).toHaveBeenCalledWith(
        "expression",
        expect.objectContaining({
          right: expect.objectContaining({
            id: "event-3",
          }),
        }),
      );
    });
  });

  describe("8. Table View Simplification", () => {
    it("renders only first condition in table mode with 'more' indicator", () => {
      const complexExpression = {
        type: COMBINATION_OPERATOR.AND,
        left: {
          type: COMBINATION_OPERATOR.OR,
          left: { id: "event-1", name: "Event 1" },
          right: { id: "event-2", name: "Event 2" },
        },
        right: { id: "event-3", name: "Event 3" },
      };

      const onChange = vi.fn();
      const store = createTestStore();

      render(
        <Provider store={store}>
          <MultiLevelCombinationTriggerConditions
            triggerCondition={{ expression: complexExpression }}
            onChange={onChange}
            isInTable={true}
          />
        </Provider>,
      );

      // Should show only first event
      expect(screen.getByTestId("dropdown-event-1")).toBeInTheDocument();
      expect(screen.queryByTestId("dropdown-event-2")).not.toBeInTheDocument();
      expect(screen.queryByTestId("dropdown-event-3")).not.toBeInTheDocument();

      // Should show "+more" indicator
      expect(screen.getByText("+more")).toBeInTheDocument();

      // All dropdowns should have isInTable=true
      expect(screen.getByTestId("in-table-event-1")).toHaveTextContent("true");
    });
  });

  describe("9. Pagination and Search State Management", () => {
    it("loads more events and maintains state across multiple loads", () => {
      const firstBatch = mockEvents.slice(0, 2);
      const secondBatch = mockEvents.slice(2, 4);

      vi.mocked(useGetSessionEventsQuery).mockReturnValueOnce({
        data: { data: firstBatch, pagination: { total: 4, limit: 2, offset: 0 } },
        isLoading: false,
        isError: false,
      } as any);

      const onChange = vi.fn();
      const store = createTestStore();

      const { rerender } = render(
        <Provider store={store}>
          <MultiLevelCombinationTriggerConditions
            triggerCondition={{
              expression: {
                type: COMBINATION_OPERATOR.AND,
                left: { id: "" },
                right: { id: "" },
              },
            }}
            onChange={onChange}
          />
        </Provider>,
      );

      // Click load more
      const loadMoreButtons = screen.getAllByTestId(/load-more/);
      fireEvent.click(loadMoreButtons[0]);

      // Mock returns second batch
      vi.mocked(useGetSessionEventsQuery).mockReturnValueOnce({
        data: { data: secondBatch, pagination: { total: 4, limit: 2, offset: 2 } },
        isLoading: false,
        isError: false,
      } as any);

      rerender(
        <Provider store={store}>
          <MultiLevelCombinationTriggerConditions
            triggerCondition={{
              expression: {
                type: COMBINATION_OPERATOR.AND,
                left: { id: "" },
                right: { id: "" },
              },
            }}
            onChange={onChange}
          />
        </Provider>,
      );

      // Should have called with updated offset
      expect(useGetSessionEventsQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 5,
        }),
      );
    });

    it("resets offset and events when search term changes", () => {
      const onChange = vi.fn();
      const store = createTestStore();

      render(
        <Provider store={store}>
          <MultiLevelCombinationTriggerConditions
            triggerCondition={{
              expression: {
                type: COMBINATION_OPERATOR.AND,
                left: { id: "" },
                right: { id: "" },
              },
            }}
            onChange={onChange}
          />
        </Provider>,
      );

      // Perform search
      const searchInputs = screen.getAllByPlaceholderText("Search...");
      fireEvent.change(searchInputs[0], { target: { value: "test search" } });

      // Should call with offset 0 and new search term
      expect(useGetSessionEventsQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 0,
          searchName: "test search",
        }),
      );
    });
  });

  describe("10. Empty Expression Initialization", () => {
    it("creates first condition when expression is completely empty", () => {
      const onChange = vi.fn();
      const store = createTestStore();

      render(
        <Provider store={store}>
          <MultiLevelCombinationTriggerConditions
            triggerCondition={{
              expression: {
                type: COMBINATION_OPERATOR.AND,
                left: { id: "" },
                right: { id: "" },
              },
            }}
            onChange={onChange}
          />
        </Provider>,
      );

      // Click "Add Base" button
      const addButton = screen.getByLabelText(/add new condition branch/);
      fireEvent.click(addButton);

      // Should create new root-level condition
      expect(onChange).toHaveBeenCalledWith(
        "expression",
        expect.objectContaining({
          type: COMBINATION_OPERATOR.AND,
          left: expect.any(Object),
          right: expect.objectContaining({ id: "" }),
        }),
      );
    });
  });

  describe("11. Complex Tree Traversal for Event Name Display", () => {
    it("correctly displays event names from nested NOT nodes", () => {
      const complexExpression = {
        type: COMBINATION_OPERATOR.AND,
        left: {
          type: "NOT" as const,
          left: { id: "event-1", name: "Event 1" },
        },
        right: {
          type: COMBINATION_OPERATOR.OR,
          left: {
            type: "NOT" as const,
            left: { id: "event-2", name: "Event 2" },
          },
          right: { id: "event-3", name: "Event 3" },
        },
      };

      const onChange = vi.fn();
      const store = createTestStore();

      render(
        <Provider store={store}>
          <MultiLevelCombinationTriggerConditions
            triggerCondition={{ expression: complexExpression }}
            onChange={onChange}
          />
        </Provider>,
      );

      // All event names should be displayed correctly
      expect(screen.getByTestId("dropdown-value-event-1")).toHaveTextContent(/Event 1/);
      expect(screen.getByTestId("dropdown-value-event-2")).toHaveTextContent(/Event 2/);
      expect(screen.getByTestId("dropdown-value-event-3")).toHaveTextContent(/Event 3/);
    });
  });

  describe("12. Root Level Addition Creates Proper AND Structure", () => {
    it("adds condition at root when no specific path provided", () => {
      const simpleExpression = {
        type: COMBINATION_OPERATOR.OR,
        left: { id: "event-1", name: "Event 1" },
        right: { id: "event-2", name: "Event 2" },
      };

      const onChange = vi.fn();
      const store = createTestStore();

      render(
        <Provider store={store}>
          <MultiLevelCombinationTriggerConditions
            triggerCondition={{ expression: simpleExpression }}
            onChange={onChange}
          />
        </Provider>,
      );

      // Click "Add Base" button (adds at root)
      const addButton = screen.getByLabelText(/add new condition branch/i);
      fireEvent.click(addButton);

      // Should wrap entire expression in new AND with empty right node
      expect(onChange).toHaveBeenCalledWith(
        "expression",
        expect.objectContaining({
          type: COMBINATION_OPERATOR.AND,
          left: expect.objectContaining({
            type: COMBINATION_OPERATOR.OR,
          }),
          right: expect.objectContaining({ id: "" }),
        }),
      );
    });
  });

  describe("13. Visual Grouping Based on Tree Depth", () => {
    it("applies border styling only to nested groups (depth > 0)", () => {
      const nestedExpression = {
        type: COMBINATION_OPERATOR.AND,
        left: {
          type: COMBINATION_OPERATOR.OR,
          left: { id: "event-1", name: "Event 1" },
          right: { id: "event-2", name: "Event 2" },
        },
        right: { id: "event-3", name: "Event 3" },
      };

      const onChange = vi.fn();
      const store = createTestStore();

      const { container } = render(
        <Provider store={store}>
          <MultiLevelCombinationTriggerConditions
            triggerCondition={{ expression: nestedExpression }}
            onChange={onChange}
          />
        </Provider>,
      );

      // Nested OR group should have border
      const borderedDivs = container.querySelectorAll(".border-\\[1px\\]");
      expect(borderedDivs.length).toBeGreaterThan(0);

      // Each bordered div should have padding
      borderedDivs.forEach(div => {
        expect(div.className).toContain("p-4");
      });
    });
  });

  describe("14. Event Name Preservation During Updates", () => {
    it("preserves event names when changing status", () => {
      const expression = {
        type: COMBINATION_OPERATOR.AND,
        left: { id: "event-1", name: "Custom Event Name 1" },
        right: { id: "event-2", name: "Custom Event Name 2" },
      };

      const onChange = vi.fn();
      const store = createTestStore();

      render(
        <Provider store={store}>
          <MultiLevelCombinationTriggerConditions
            triggerCondition={{ expression }}
            onChange={onChange}
          />
        </Provider>,
      );

      // Change status of first event
      const statusDropdowns = screen.getAllByTestId(/dropdown-OCCURRED/);
      const changeButton = within(statusDropdowns[0]).getByTestId("dropdown-change-OCCURRED");
      fireEvent.click(changeButton);

      // Should preserve custom event name
      expect(onChange).toHaveBeenCalledWith(
        "expression",
        expect.objectContaining({
          left: expect.objectContaining({
            type: "NOT",
            left: expect.objectContaining({
              id: "event-1",
              name: "Custom Event Name 1",
            }),
          }),
        }),
      );
    });
  });

  describe("15. Recursive Rendering with Direction Mapping", () => {
    it("correctly maps left and right directions in deeply nested tree", () => {
      const deepExpression = {
        type: COMBINATION_OPERATOR.AND,
        left: {
          type: COMBINATION_OPERATOR.OR,
          left: {
            type: COMBINATION_OPERATOR.AND,
            left: { id: "event-1", name: "Event 1" },
            right: { id: "event-2", name: "Event 2" },
          },
          right: { id: "event-3", name: "Event 3" },
        },
        right: { id: "event-4", name: "Event 4" },
      };

      const onChange = vi.fn();
      const store = createTestStore();

      render(
        <Provider store={store}>
          <MultiLevelCombinationTriggerConditions
            triggerCondition={{ expression: deepExpression }}
            onChange={onChange}
          />
        </Provider>,
      );

      // All 4 events should render
      expect(screen.getByTestId("dropdown-event-1")).toBeInTheDocument();
      expect(screen.getByTestId("dropdown-event-2")).toBeInTheDocument();
      expect(screen.getByTestId("dropdown-event-3")).toBeInTheDocument();
      expect(screen.getByTestId("dropdown-event-4")).toBeInTheDocument();

      // Change deepest nested event (event-1 at root.left.left.left)
      const event1Dropdown = screen.getByTestId("dropdown-event-1");
      const changeButton = within(event1Dropdown).getByTestId("dropdown-change-event-1");
      fireEvent.click(changeButton);

      // Should update only that specific node
      expect(onChange).toHaveBeenCalledWith(
        "expression",
        expect.objectContaining({
          left: expect.objectContaining({
            left: expect.objectContaining({
              left: expect.objectContaining({
                id: "event-5",
                name: "E5 - Event 5",
              }),
            }),
          }),
        }),
      );
    });
  });
});
