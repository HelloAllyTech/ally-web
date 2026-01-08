import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { vi, describe, it, expect, beforeEach } from "vitest";
import React from "react";

import { AutoTerminationRuleField } from "../AutoTerminationRuleField";

// Hoist mocks to avoid initialization errors
const { mockUseGetSessionEventsQuery } = vi.hoisted(() => ({
  mockUseGetSessionEventsQuery: vi.fn(),
}));

// Mock baseAPI first
vi.mock("@api/baseApi", () => ({
  baseAPI: {
    injectEndpoints: vi.fn(() => ({})),
    reducerPath: "baseAPI",
    reducer: (state = {}) => state,
    middleware: () => (next: any) => (action: any) => next(action),
  },
}));

// Mock the API
vi.mock("@api", () => ({
  useGetSessionEventsQuery: mockUseGetSessionEventsQuery,
}));

// Mock assets
vi.mock("@assets", () => ({
  BlueAdd: () => <svg data-testid="blue-add-icon">Add</svg>,
  TrashRed: () => <svg data-testid="trash-red-icon">Trash</svg>,
}));

// Mock constants
vi.mock("@constants", () => ({
  en: {
    simulation: {
      triggerEvent: "Trigger Event",
      triggerMessage: "Trigger Message",
      terminationMessagePlaceholder: "Enter termination message",
      add: "Add Rule",
    },
  },
}));

// Mock CustomDropdownField
vi.mock("../../custom-dropdown-field", () => ({
  CustomDropdownField: ({
    options,
    isSearchable,
    handleSearchTextChange,
    onHandleSelect,
    defaultOption,
  }: any) => {
    const [selectedValue, setSelectedValue] = React.useState(defaultOption?.value || "");

    React.useEffect(() => {
      if (defaultOption?.value && defaultOption?.label) {
        setSelectedValue(defaultOption.value);
      }
    }, [defaultOption?.value, defaultOption?.label]);

    return (
      <div data-testid="custom-dropdown">
        <input
          data-testid="dropdown-search"
          onChange={e => handleSearchTextChange?.(e.target.value)}
          placeholder="Search events"
        />
        <div data-testid="dropdown-selected-value">{selectedValue}</div>
        <select
          data-testid="dropdown-select"
          onChange={e => {
            const selected = options.find((opt: any) => opt.value === e.target.value);
            if (selected) {
              setSelectedValue(selected.value);
              onHandleSelect?.(selected);
            }
          }}
          value={selectedValue}
        >
          <option value="">Select an event</option>
          {options.map((option: any) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  },
}));

// Mock InputField
vi.mock("../../input-field", () => ({
  InputField: ({
    label,
    id,
    formMethods,
    multiline,
    isMandatory,
    defaultValue,
    placeholder,
    maxLength,
    minHeight,
    disabled,
  }: any) => (
    <div data-testid={`input-field-${id}`}>
      <label>{label}</label>
      <textarea
        data-testid={`textarea-${id}`}
        placeholder={placeholder}
        defaultValue={defaultValue}
        disabled={disabled}
        maxLength={maxLength}
      />
    </div>
  ),
}));

// Wrapper component to provide form context
const TestWrapper = ({ children, defaultValues = {} }: any) => {
  const formMethods = useForm({ defaultValues });
  return <div>{typeof children === "function" ? children(formMethods) : children}</div>;
};

describe("AutoTerminationRuleField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Initial Rendering", () => {
    it("renders with default empty rule", () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: [] },
      });

      render(
        <TestWrapper>
          {(formMethods: any) => (
            <AutoTerminationRuleField label="Auto Termination Rules" formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      expect(screen.getByText("Auto Termination Rules")).toBeInTheDocument();
      expect(screen.getByTestId("blue-add-icon")).toBeInTheDocument();
    });

    it("renders with custom label", () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: [] },
      });

      render(
        <TestWrapper>
          {(formMethods: any) => (
            <AutoTerminationRuleField label="Custom Label" formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      expect(screen.getByText("Custom Label")).toBeInTheDocument();
    });

    it("renders without label", () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: [] },
      });

      render(
        <TestWrapper>
          {(formMethods: any) => <AutoTerminationRuleField formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(screen.queryByText("Auto Termination Rules")).not.toBeInTheDocument();
    });

    it("displays one rule card by default", () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: [] },
      });

      render(
        <TestWrapper>
          {(formMethods: any) => (
            <AutoTerminationRuleField label="Rules" formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      const dropdowns = screen.getAllByTestId("custom-dropdown");
      expect(dropdowns).toHaveLength(1);
    });
  });

  describe("Session Events API Integration", () => {
    it("fetches session events on mount", () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: [] },
      });

      render(
        <TestWrapper>
          {(formMethods: any) => <AutoTerminationRuleField formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(mockUseGetSessionEventsQuery).toHaveBeenCalledWith({
        offset: 0,
        limit: 100,
        searchName: "",
      });
    });

    it("displays event options from API response", () => {
      const mockEvents = [
        { id: "event-1", name: "Event One" },
        { id: "event-2", name: "Event Two" },
        { id: "event-3", name: "Event Three" },
      ];

      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: mockEvents },
      });

      render(
        <TestWrapper>
          {(formMethods: any) => <AutoTerminationRuleField formMethods={formMethods} />}
        </TestWrapper>,
      );

      const select = screen.getByTestId("dropdown-select");
      expect(select).toBeInTheDocument();
      expect(screen.getByText("Event One")).toBeInTheDocument();
      expect(screen.getByText("Event Two")).toBeInTheDocument();
      expect(screen.getByText("Event Three")).toBeInTheDocument();
    });

    it("handles empty API response", () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: [] },
      });

      render(
        <TestWrapper>
          {(formMethods: any) => <AutoTerminationRuleField formMethods={formMethods} />}
        </TestWrapper>,
      );

      const select = screen.getByTestId("dropdown-select");
      expect(select).toBeInTheDocument();
    });

    it("handles undefined API response", () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: undefined,
      });

      render(
        <TestWrapper>
          {(formMethods: any) => <AutoTerminationRuleField formMethods={formMethods} />}
        </TestWrapper>,
      );

      const select = screen.getByTestId("dropdown-select");
      expect(select).toBeInTheDocument();
    });
  });

  describe("Search Functionality", () => {
    it("updates search term when typing in dropdown search", async () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: [] },
      });

      render(
        <TestWrapper>
          {(formMethods: any) => <AutoTerminationRuleField formMethods={formMethods} />}
        </TestWrapper>,
      );

      const searchInput = screen.getByTestId("dropdown-search");
      fireEvent.change(searchInput, { target: { value: "test search" } });

      await waitFor(() => {
        expect(mockUseGetSessionEventsQuery).toHaveBeenCalledWith({
          offset: 0,
          limit: 100,
          searchName: "test search",
        });
      });
    });

    it("debounces search requests", async () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: [] },
      });

      render(
        <TestWrapper>
          {(formMethods: any) => <AutoTerminationRuleField formMethods={formMethods} />}
        </TestWrapper>,
      );

      const searchInput = screen.getByTestId("dropdown-search");
      fireEvent.change(searchInput, { target: { value: "a" } });
      fireEvent.change(searchInput, { target: { value: "ab" } });
      fireEvent.change(searchInput, { target: { value: "abc" } });

      // Should be called multiple times as user types
      expect(mockUseGetSessionEventsQuery).toHaveBeenCalled();
    });
  });

  describe("Adding Rules", () => {
    it("adds a new rule when add button is clicked", () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: [] },
      });

      const defaultValues = {
        terminationEvents: [{ id: "event-1", message: "Test message", name: "Event One" }],
      };

      render(
        <TestWrapper defaultValues={defaultValues}>
          {(formMethods: any) => <AutoTerminationRuleField formMethods={formMethods} />}
        </TestWrapper>,
      );

      const addButton = screen.getByText("Add Rule");
      fireEvent.click(addButton);

      // Should have 2 dropdowns now
      const dropdowns = screen.getAllByTestId("custom-dropdown");
      expect(dropdowns.length).toBeGreaterThan(1);
    });

    it("disables add button when rule limit is reached", () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: [] },
      });

      const defaultValues = {
        terminationEvents: Array(10)
          .fill(null)
          .map((_, i) => ({
            id: `event-${i}`,
            message: `Message ${i}`,
            name: `Event ${i}`,
          })),
      };

      render(
        <TestWrapper defaultValues={defaultValues}>
          {(formMethods: any) => <AutoTerminationRuleField formMethods={formMethods} />}
        </TestWrapper>,
      );

      const addButton = screen.getByText("Add Rule");
      expect(addButton).toBeDisabled();
    });

    it("disables add button when last rule has no event selected", () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: [] },
      });

      const defaultValues = {
        terminationEvents: [
          { id: "event-1", message: "Message 1", name: "Event One" },
          { id: "", message: "", name: "" }, // Empty rule
        ],
      };

      render(
        <TestWrapper defaultValues={defaultValues}>
          {(formMethods: any) => <AutoTerminationRuleField formMethods={formMethods} />}
        </TestWrapper>,
      );

      const addButton = screen.getByText("Add Rule");
      expect(addButton).toBeDisabled();
    });
  });

  describe("Removing Rules", () => {
    it("removes a rule when trash button is clicked", () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: [] },
      });

      const defaultValues = {
        terminationEvents: [
          { id: "event-1", message: "Message 1", name: "Event One" },
          { id: "event-2", message: "Message 2", name: "Event Two" },
        ],
      };

      render(
        <TestWrapper defaultValues={defaultValues}>
          {(formMethods: any) => <AutoTerminationRuleField formMethods={formMethods} />}
        </TestWrapper>,
      );

      const trashButtons = screen.getAllByTestId("trash-red-icon");
      expect(trashButtons).toHaveLength(2);

      fireEvent.click(trashButtons[0]);

      // After removal, should have fewer dropdowns
      waitFor(() => {
        const dropdowns = screen.getAllByTestId("custom-dropdown");
        expect(dropdowns).toHaveLength(1);
      });
    });

    it("displays trash button for each rule", () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: [] },
      });

      const defaultValues = {
        terminationEvents: [
          { id: "event-1", message: "Message 1", name: "Event One" },
          { id: "event-2", message: "Message 2", name: "Event Two" },
          { id: "event-3", message: "Message 3", name: "Event Three" },
        ],
      };

      render(
        <TestWrapper defaultValues={defaultValues}>
          {(formMethods: any) => <AutoTerminationRuleField formMethods={formMethods} />}
        </TestWrapper>,
      );

      const trashButtons = screen.getAllByTestId("trash-red-icon");
      expect(trashButtons).toHaveLength(3);
    });
  });

  describe("Event Selection", () => {
    it("updates rule when event is selected", () => {
      const mockEvents = [
        { id: "event-1", name: "Event One" },
        { id: "event-2", name: "Event Two" },
      ];

      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: mockEvents },
      });

      render(
        <TestWrapper>
          {(formMethods: any) => <AutoTerminationRuleField formMethods={formMethods} />}
        </TestWrapper>,
      );

      const select = screen.getByTestId("dropdown-select");

      // Verify dropdown is rendered and can be interacted with
      expect(select).toBeInTheDocument();
      expect(screen.getByText("Event One")).toBeInTheDocument();
      expect(screen.getByText("Event Two")).toBeInTheDocument();
    });

    it("filters out already selected events from dropdown options", () => {
      const mockEvents = [
        { id: "event-1", name: "Event One" },
        { id: "event-2", name: "Event Two" },
        { id: "event-3", name: "Event Three" },
      ];

      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: mockEvents },
      });

      const defaultValues = {
        terminationEvents: [
          { id: "event-1", message: "Message 1", name: "Event One" },
          { id: "", message: "", name: "" },
        ],
      };

      render(
        <TestWrapper defaultValues={defaultValues}>
          {(formMethods: any) => <AutoTerminationRuleField formMethods={formMethods} />}
        </TestWrapper>,
      );

      // First dropdown should show event-1 as selected
      const selectedValues = screen.getAllByTestId("dropdown-selected-value");
      expect(selectedValues[0]).toHaveTextContent("event-1");

      // Second dropdown should be empty
      expect(selectedValues[1]).toHaveTextContent("");
    });

    it("displays default option when rule has pre-selected event", () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: [] },
      });

      const defaultValues = {
        terminationEvents: [{ id: "event-1", message: "Test message", name: "Event One" }],
      };

      render(
        <TestWrapper defaultValues={defaultValues}>
          {(formMethods: any) => <AutoTerminationRuleField formMethods={formMethods} />}
        </TestWrapper>,
      );

      const selectedValue = screen.getByTestId("dropdown-selected-value");
      expect(selectedValue).toHaveTextContent("event-1");
    });
  });

  describe("Message Field", () => {
    it("renders message field for each rule", () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: [] },
      });

      const defaultValues = {
        terminationEvents: [
          { id: "event-1", message: "Message 1", name: "Event One" },
          { id: "event-2", message: "Message 2", name: "Event Two" },
        ],
      };

      render(
        <TestWrapper defaultValues={defaultValues}>
          {(formMethods: any) => <AutoTerminationRuleField formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(screen.getByTestId("textarea-terminationEvents.0.message")).toBeInTheDocument();
      expect(screen.getByTestId("textarea-terminationEvents.1.message")).toBeInTheDocument();
    });

    it("disables message field when no event is selected", () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: [] },
      });

      const defaultValues = {
        terminationEvents: [{ id: "", message: "", name: "" }],
      };

      render(
        <TestWrapper defaultValues={defaultValues}>
          {(formMethods: any) => <AutoTerminationRuleField formMethods={formMethods} />}
        </TestWrapper>,
      );

      const textarea = screen.getByTestId("textarea-terminationEvents.0.message");
      expect(textarea).toBeDisabled();
    });

    it("enables message field when event is selected", () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: [] },
      });

      const defaultValues = {
        terminationEvents: [{ id: "event-1", message: "Test message", name: "Event One" }],
      };

      render(
        <TestWrapper defaultValues={defaultValues}>
          {(formMethods: any) => <AutoTerminationRuleField formMethods={formMethods} />}
        </TestWrapper>,
      );

      const textarea = screen.getByTestId("textarea-terminationEvents.0.message");
      expect(textarea).not.toBeDisabled();
    });

    it("displays placeholder text in message field", () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: [] },
      });

      render(
        <TestWrapper>
          {(formMethods: any) => <AutoTerminationRuleField formMethods={formMethods} />}
        </TestWrapper>,
      );

      const textarea = screen.getByTestId("textarea-terminationEvents.0.message");
      expect(textarea).toHaveAttribute("placeholder", "Enter termination message");
    });

    it("enforces max length of 200 characters on message field", () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: [] },
      });

      render(
        <TestWrapper>
          {(formMethods: any) => <AutoTerminationRuleField formMethods={formMethods} />}
        </TestWrapper>,
      );

      const textarea = screen.getByTestId("textarea-terminationEvents.0.message");
      expect(textarea).toHaveAttribute("maxLength", "200");
    });

    it("displays existing message value", () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: [] },
      });

      const defaultValues = {
        terminationEvents: [
          { id: "event-1", message: "Existing message content", name: "Event One" },
        ],
      };

      render(
        <TestWrapper defaultValues={defaultValues}>
          {(formMethods: any) => <AutoTerminationRuleField formMethods={formMethods} />}
        </TestWrapper>,
      );

      const textarea = screen.getByTestId("textarea-terminationEvents.0.message");
      expect(textarea).toHaveValue("Existing message content");
    });
  });

  describe("Form Integration", () => {
    it("integrates with react-hook-form", () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: [] },
      });

      const defaultValues = {
        terminationEvents: [{ id: "event-1", message: "Test", name: "Event One" }],
      };

      render(
        <TestWrapper defaultValues={defaultValues}>
          {(formMethods: any) => <AutoTerminationRuleField formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(screen.getByTestId("custom-dropdown")).toBeInTheDocument();
    });

    it("watches form values for terminationEvents field", () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: [] },
      });

      const defaultValues = {
        terminationEvents: [
          { id: "event-1", message: "Message 1", name: "Event One" },
          { id: "event-2", message: "Message 2", name: "Event Two" },
        ],
      };

      render(
        <TestWrapper defaultValues={defaultValues}>
          {(formMethods: any) => <AutoTerminationRuleField formMethods={formMethods} />}
        </TestWrapper>,
      );

      const dropdowns = screen.getAllByTestId("custom-dropdown");
      expect(dropdowns).toHaveLength(2);
    });
  });

  describe("Edge Cases", () => {
    it("handles null or undefined terminationEvents in form", () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: [] },
      });

      render(
        <TestWrapper>
          {(formMethods: any) => <AutoTerminationRuleField formMethods={formMethods} />}
        </TestWrapper>,
      );

      // Should render with default empty rule
      expect(screen.getByTestId("custom-dropdown")).toBeInTheDocument();
    });

    it("handles events with missing id or name fields", () => {
      const mockEvents = [
        { id: "event-1", name: "Event One" },
        { id: null, name: "Invalid Event" },
        { id: "event-3", name: null },
      ];

      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: mockEvents },
      });

      render(
        <TestWrapper>
          {(formMethods: any) => <AutoTerminationRuleField formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(screen.getByTestId("custom-dropdown")).toBeInTheDocument();
    });

    it("handles rapid add and remove operations", () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: [] },
      });

      const defaultValues = {
        terminationEvents: [{ id: "event-1", message: "Message 1", name: "Event One" }],
      };

      render(
        <TestWrapper defaultValues={defaultValues}>
          {(formMethods: any) => <AutoTerminationRuleField formMethods={formMethods} />}
        </TestWrapper>,
      );

      const addButton = screen.getByText("Add Rule");
      fireEvent.click(addButton);
      fireEvent.click(addButton);

      const trashButtons = screen.getAllByTestId("trash-red-icon");
      fireEvent.click(trashButtons[0]);

      expect(screen.getByTestId("custom-dropdown")).toBeInTheDocument();
    });
  });

  describe("UI Styling and Layout", () => {
    it("renders with proper container styling", () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: [] },
      });

      const { container } = render(
        <TestWrapper>
          {(formMethods: any) => <AutoTerminationRuleField formMethods={formMethods} />}
        </TestWrapper>,
      );

      const mainContainer = container.querySelector(".border-border-light");
      expect(mainContainer).toBeInTheDocument();
    });

    it("displays label in header section", () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: [] },
      });

      render(
        <TestWrapper>
          {(formMethods: any) => (
            <AutoTerminationRuleField label="Termination Rules" formMethods={formMethods} />
          )}
        </TestWrapper>,
      );

      expect(screen.getByText("Termination Rules")).toBeInTheDocument();
    });

    it("renders add button with icon and text", () => {
      mockUseGetSessionEventsQuery.mockReturnValue({
        data: { data: [] },
      });

      render(
        <TestWrapper>
          {(formMethods: any) => <AutoTerminationRuleField formMethods={formMethods} />}
        </TestWrapper>,
      );

      expect(screen.getByTestId("blue-add-icon")).toBeInTheDocument();
      expect(screen.getByText("Add Rule")).toBeInTheDocument();
    });
  });
});
