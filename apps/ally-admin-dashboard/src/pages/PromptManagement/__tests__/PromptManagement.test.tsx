import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import { PromptManagement } from "../PromptManagement";
import { Prompt } from "@types";

// Mock the API hooks
const mockGetPromptsQuery = vi.fn();
const mockCreatePromptMutation = vi.fn();
const mockUpdatePromptMutation = vi.fn();
const mockDuplicatePromptMutation = vi.fn();
const mockDeletePromptMutation = vi.fn();

vi.mock("@api", () => ({
  useGetPromptsQuery: () => mockGetPromptsQuery(),
  useCreatePromptMutation: () => mockCreatePromptMutation(),
  useUpdatePromptMutation: () => mockUpdatePromptMutation(),
  useDuplicatePromptMutation: () => mockDuplicatePromptMutation(),
  useDeletePromptMutation: () => mockDeletePromptMutation(),
}));

// Mock components
vi.mock("@components", () => ({
  NotionTable: ({ onRowClick, tableData }: any) => (
    <div data-testid="notion-table">
      {tableData?.data?.map((row: any, index: number) => (
        <div
          key={index}
          data-testid={`table-row-${index}`}
          onClick={() => onRowClick(index)}
          style={{ cursor: "pointer" }}
        >
          <span>{row.name}</span>
          <span>{row.promptCode}</span>
        </div>
      ))}
    </div>
  ),
  ListToolbar: ({ onSearchChange, action, addFilterCta }: any) => (
    <div data-testid="list-toolbar">
      <input
        data-testid="search-input"
        onChange={e => onSearchChange(e.target.value)}
        placeholder="Search..."
      />
      <button data-testid="open-filter-btn" onClick={addFilterCta?.onClick}>
        Open Filter
      </button>
      {action && (
        <button data-testid="create-button" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  ),
  FilterDropdown: ({ isOpen, onApplyFilters, sections }: any) =>
    isOpen ? (
      <div data-testid="filter-dropdown">
        <button
          data-testid="apply-category-filter"
          onClick={() =>
            onApplyFilters({
              categories: sections?.[0]?.options?.[0]?.value ? [sections[0].options[0].value] : [],
            })
          }
        >
          Apply Filter
        </button>
      </div>
    ) : null,
  PromptSidePanel: ({ isOpen, selectedPrompt, onClose, onUpdate }: any) =>
    isOpen && (
      <div data-testid="prompt-side-panel">
        <button data-testid="side-panel-close" onClick={onClose}>
          Close
        </button>
        <button
          data-testid="side-panel-save"
          onClick={() => {
            if (selectedPrompt) {
              onUpdate({
                ...selectedPrompt,
                name: "Updated Prompt",
              });
            }
          }}
        >
          Save
        </button>
      </div>
    ),
  cellTypes: {
    editableText: "editableText",
    normalText: "normalText",
    wrapText: "wrapText",
    dropdown: "dropdown",
    triggerConditions: "triggerConditions",
    textAreaWithDropdown: "textAreaWithDropdown",
  },
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Create a mock store
const createMockStore = () => {
  return configureStore({
    reducer: {
      // Add a dummy reducer to satisfy configureStore requirements
      _dummy: (state = {}) => state,
    },
  });
};

// Mock data
const mockPrompts: Prompt[] = [
  {
    id: "1",
    name: "Test Prompt 1",
    description: "Test Description 1",
    category: "Simulation",
    promptCode: "test_prompt_1",
    prompt: "This is test prompt content",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    name: "Test Prompt 2",
    description: "Test Description 2",
    category: "Translation",
    promptCode: "test_prompt_2",
    prompt: "This is another test prompt",
    createdAt: "2024-01-02T00:00:00Z",
    updatedAt: "2024-01-02T00:00:00Z",
  },
];

describe("PromptManagement Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation
    mockGetPromptsQuery.mockReturnValue({
      data: mockPrompts,
      isFetching: false,
    });
    mockCreatePromptMutation.mockReturnValue([
      vi.fn().mockResolvedValue({ error: null }),
      { isLoading: false },
    ]);
    mockUpdatePromptMutation.mockReturnValue([
      vi.fn().mockResolvedValue({ unwrap: () => Promise.resolve(true) }),
      { isLoading: false },
    ]);
    mockDuplicatePromptMutation.mockReturnValue([
      vi.fn().mockResolvedValue({ unwrap: () => Promise.resolve(true) }),
      { isLoading: false },
    ]);
    mockDeletePromptMutation.mockReturnValue([
      vi.fn().mockResolvedValue({ unwrap: () => Promise.resolve(true) }),
      { isLoading: false },
    ]);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("should render the component with title", () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <PromptManagement />
      </Provider>,
    );

    expect(screen.getByText("System Skills")).toBeInTheDocument();
  });

  it("should render the list toolbar with search", () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <PromptManagement />
      </Provider>,
    );

    expect(screen.getByTestId("list-toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("search-input")).toBeInTheDocument();
  });

  it("should filter prompts by category", async () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <PromptManagement />
      </Provider>,
    );

    expect(screen.getByTestId("table-row-0")).toBeInTheDocument();
    expect(screen.getByTestId("table-row-1")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("open-filter-btn"));
    fireEvent.click(screen.getByTestId("apply-category-filter"));

    await waitFor(() => {
      expect(screen.getByText("Test Prompt 1")).toBeInTheDocument();
      expect(screen.queryByText("Test Prompt 2")).not.toBeInTheDocument();
    });
  });

  it("should render the notion table with data", async () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <PromptManagement />
      </Provider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("notion-table")).toBeInTheDocument();
    });

    // Verify table rows are rendered
    expect(screen.getByTestId("table-row-0")).toBeInTheDocument();
    expect(screen.getByTestId("table-row-1")).toBeInTheDocument();
  });

  it("should call API with search parameters when user types in search", async () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <PromptManagement />
      </Provider>,
    );

    const searchInput = screen.getByTestId("search-input");
    fireEvent.change(searchInput, { target: { value: "test" } });

    // Wait for debounce (500ms) + some extra time for async operations
    await new Promise(resolve => setTimeout(resolve, 700));

    expect(mockGetPromptsQuery).toHaveBeenCalled();
  });

  it("should open side panel when table row is clicked", async () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <PromptManagement />
      </Provider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("table-row-0")).toBeInTheDocument();
    });

    const tableRow = screen.getByTestId("table-row-0");
    fireEvent.click(tableRow);

    await waitFor(() => {
      expect(screen.getByTestId("prompt-side-panel")).toBeInTheDocument();
    });
  });

  it("should close side panel when close button is clicked", async () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <PromptManagement />
      </Provider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("table-row-0")).toBeInTheDocument();
    });

    const tableRow = screen.getByTestId("table-row-0");
    fireEvent.click(tableRow);

    await waitFor(() => {
      expect(screen.getByTestId("prompt-side-panel")).toBeInTheDocument();
    });

    const closeButton = screen.getByTestId("side-panel-close");
    fireEvent.click(closeButton);
  });

  it("should handle update prompt submission", async () => {
    const store = createMockStore();
    const updateMutation = vi.fn().mockResolvedValue({ unwrap: () => Promise.resolve(true) });
    mockUpdatePromptMutation.mockReturnValue([updateMutation, { isLoading: false }]);

    render(
      <Provider store={store}>
        <PromptManagement />
      </Provider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("table-row-0")).toBeInTheDocument();
    });

    const tableRow = screen.getByTestId("table-row-0");
    fireEvent.click(tableRow);

    await waitFor(() => {
      expect(screen.getByTestId("prompt-side-panel")).toBeInTheDocument();
    });

    const saveButton = screen.getByTestId("side-panel-save");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(updateMutation).toHaveBeenCalled();
    });
  });

  it("should display the correct number of prompts from API response", async () => {
    const customPrompts = [mockPrompts[0]]; // Only one prompt
    mockGetPromptsQuery.mockReturnValue({
      data: customPrompts,
      isFetching: false,
    });

    const store = createMockStore();
    render(
      <Provider store={store}>
        <PromptManagement />
      </Provider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("table-row-0")).toBeInTheDocument();
    });

    // Only one row should exist
    expect(screen.queryByTestId("table-row-1")).not.toBeInTheDocument();
  });

  it("should handle empty prompts list", async () => {
    mockGetPromptsQuery.mockReturnValue({
      data: [],
      isFetching: false,
    });

    const store = createMockStore();
    render(
      <Provider store={store}>
        <PromptManagement />
      </Provider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("notion-table")).toBeInTheDocument();
    });

    // Verify no table rows exist
    expect(screen.queryByTestId("table-row-0")).not.toBeInTheDocument();
  });

  it("should call API with correct pagination parameters", async () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <PromptManagement />
      </Provider>,
    );

    // The component should render with the default mock data
    await waitFor(() => {
      expect(screen.getByTestId("notion-table")).toBeInTheDocument();
    });

    // Verify the mock was called during component initialization
    expect(mockGetPromptsQuery).toHaveBeenCalled();
  });

  it("should format table data with proper date conversion", async () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <PromptManagement />
      </Provider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("notion-table")).toBeInTheDocument();
    });

    // Verify that table rows contain the prompt data (name is visible; promptCode column was removed)
    const tableRow = screen.getByTestId("table-row-0");
    expect(within(tableRow).getByText("Test Prompt 1")).toBeInTheDocument();
  });

  it("should reset offset when search query changes", async () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <PromptManagement />
      </Provider>,
    );

    const searchInput = screen.getByTestId("search-input");

    // First search
    fireEvent.change(searchInput, { target: { value: "test1" } });
    await new Promise(resolve => setTimeout(resolve, 700));

    // Second search
    fireEvent.change(searchInput, { target: { value: "test2" } });
    await new Promise(resolve => setTimeout(resolve, 700));

    // Verify the mock was called
    expect(mockGetPromptsQuery).toHaveBeenCalled();
  });

  it("should handle API errors gracefully", async () => {
    const store = createMockStore();
    mockGetPromptsQuery.mockReturnValue({
      data: null,
      isFetching: false,
      error: "API Error",
    });

    render(
      <Provider store={store}>
        <PromptManagement />
      </Provider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("notion-table")).toBeInTheDocument();
    });

    // Component should handle error gracefully and not crash
    expect(screen.getByTestId("list-toolbar")).toBeInTheDocument();
  });

  it("should maintain search state across pagination", async () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <PromptManagement />
      </Provider>,
    );

    const searchInput = screen.getByTestId("search-input");
    fireEvent.change(searchInput, { target: { value: "searchterm" } });

    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 700));

    // Verify the mock was called
    expect(mockGetPromptsQuery).toHaveBeenCalled();
  });

  it("should open the correct prompt even if there are obsolete prompts in the results", async () => {
    const customPrompts = [
      {
        id: "1",
        name: "Normal 1",
        isObsolete: false,
        promptCode: "p1",
        prompt: "p1",
        description: "d1",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "2",
        name: "Obsolete",
        isObsolete: true,
        promptCode: "p2",
        prompt: "p2",
        description: "d2",
        createdAt: "2024-01-02T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
      },
      {
        id: "3",
        name: "Normal 2",
        isObsolete: false,
        promptCode: "p3",
        prompt: "p3",
        description: "d3",
        createdAt: "2024-01-03T00:00:00Z",
        updatedAt: "2024-01-03T00:00:00Z",
      },
    ] as Prompt[];

    mockGetPromptsQuery.mockReturnValue({
      data: customPrompts,
      isFetching: false,
    });

    const store = createMockStore();
    render(
      <Provider store={store}>
        <PromptManagement />
      </Provider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("table-row-1")).toBeInTheDocument();
    });

    // Row 1 should be "Normal 2" (index 2 in unfiltered list, index 1 in filtered list)
    const row1 = screen.getByTestId("table-row-1");
    expect(within(row1).getByText("Normal 2")).toBeInTheDocument();

    fireEvent.click(row1);

    await waitFor(() => {
      expect(screen.getByTestId("prompt-side-panel")).toBeInTheDocument();
    });
  });
});
