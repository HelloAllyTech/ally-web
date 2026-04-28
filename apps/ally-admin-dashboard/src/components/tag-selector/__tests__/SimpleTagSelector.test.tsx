import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { SimpleTagSelector } from "../SimpleTagSelector";

// Mock the assets
vi.mock("@assets", () => ({
  Close: () => <svg data-testid="close-icon" />,
  Plus: () => <svg data-testid="plus-icon" />,
}));

// Mock the hooks
vi.mock("@hooks", () => ({
  useClickOutside: vi.fn(),
}));

// Mock the API hook
const mockUseGetSessionEventTagsQuery = vi.fn();
vi.mock("@api", () => ({
  useGetSessionEventTagsQuery: (...args: any[]) => mockUseGetSessionEventTagsQuery(...args),
}));

describe("SimpleTagSelector", () => {
  const mockUpdateTags = vi.fn();

  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock response - no tags, not loading
    mockUseGetSessionEventTagsQuery.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      error: null,
    });
  });

  it("renders with no tags", () => {
    render(<SimpleTagSelector tags={[]} updateTags={mockUpdateTags} label="Tags" />);

    expect(screen.getByText("Tags")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Add")).toBeInTheDocument();
  });

  it("renders with existing tags", () => {
    const tags = ["tag1", "tag2", "tag3"];
    render(<SimpleTagSelector tags={tags} updateTags={mockUpdateTags} label="Tags" />);

    expect(screen.getByText("tag1")).toBeInTheDocument();
    expect(screen.getByText("tag2")).toBeInTheDocument();
    expect(screen.getByText("tag3")).toBeInTheDocument();
  });

  it("shows Add button", () => {
    render(<SimpleTagSelector tags={[]} updateTags={mockUpdateTags} label="Tags" />);

    const addButton = screen.getByPlaceholderText("Add").closest("div");
    expect(addButton).toBeInTheDocument();
  });

  it("allows removing tags", () => {
    const tags = ["tag1", "tag2"];
    render(<SimpleTagSelector tags={tags} updateTags={mockUpdateTags} label="Tags" />);

    const removeButtons = screen.getAllByTestId("close-icon");
    fireEvent.click(removeButtons[0]);

    expect(mockUpdateTags).toHaveBeenCalledWith(["tag2"]);
  });

  it("opens dropdown when Add button is clicked", () => {
    render(<SimpleTagSelector tags={[]} updateTags={mockUpdateTags} label="Tags" />);

    const addInput = screen.getByPlaceholderText("Add");
    fireEvent.click(addInput);

    // Dropdown should open and show search input
    const searchInput = screen.getByPlaceholderText("Search or create");
    expect(searchInput).toBeInTheDocument();
  });

  it("does not fetch tags when dropdown is closed", () => {
    render(<SimpleTagSelector tags={[]} updateTags={mockUpdateTags} label="Tags" />);

    // API should be called with skip: true initially
    expect(mockUseGetSessionEventTagsQuery).toHaveBeenCalledWith(undefined, {
      skip: true,
    });
  });

  it("fetches tags when dropdown is opened", () => {
    render(<SimpleTagSelector tags={[]} updateTags={mockUpdateTags} label="Tags" />);

    const addInput = screen.getByPlaceholderText("Add");
    fireEvent.click(addInput);

    // API should be called with skip: false when dropdown opens
    expect(mockUseGetSessionEventTagsQuery).toHaveBeenCalledWith(undefined, {
      skip: false,
    });
  });

  it("shows loading state while fetching tags", () => {
    mockUseGetSessionEventTagsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<SimpleTagSelector tags={[]} updateTags={mockUpdateTags} label="Tags" />);

    const addInput = screen.getByPlaceholderText("Add");
    fireEvent.click(addInput);

    expect(screen.getByText("Loading tags...")).toBeInTheDocument();
  });

  it("displays existing tags from API as suggestions", () => {
    mockUseGetSessionEventTagsQuery.mockReturnValue({
      data: { data: ["api-tag1", "api-tag2", "api-tag3"] },
      isLoading: false,
      error: null,
    });

    render(<SimpleTagSelector tags={[]} updateTags={mockUpdateTags} label="Tags" />);

    const addInput = screen.getByPlaceholderText("Add");
    fireEvent.click(addInput);

    expect(screen.getByText("api-tag1")).toBeInTheDocument();
    expect(screen.getByText("api-tag2")).toBeInTheDocument();
    expect(screen.getByText("api-tag3")).toBeInTheDocument();
  });

  it("filters out already selected tags from suggestions", () => {
    mockUseGetSessionEventTagsQuery.mockReturnValue({
      data: { data: ["tag1", "tag2", "tag3"] },
      isLoading: false,
      error: null,
    });

    render(<SimpleTagSelector tags={["tag1"]} updateTags={mockUpdateTags} label="Tags" />);

    const addInput = screen.getByPlaceholderText("Add");
    fireEvent.click(addInput);

    // tag1 should not appear in suggestions since it's already selected
    const allTags = screen.queryAllByText("tag1");
    // One instance in selected tags, none in dropdown
    expect(allTags.length).toBe(1);
    expect(screen.getByText("tag2")).toBeInTheDocument();
    expect(screen.getByText("tag3")).toBeInTheDocument();
  });

  it("allows selecting existing tag from API", () => {
    mockUseGetSessionEventTagsQuery.mockReturnValue({
      data: { data: ["existing-api-tag"] },
      isLoading: false,
      error: null,
    });

    render(<SimpleTagSelector tags={[]} updateTags={mockUpdateTags} label="Tags" />);

    const addInput = screen.getByPlaceholderText("Add");
    fireEvent.click(addInput);

    const apiTag = screen.getByText("existing-api-tag");
    fireEvent.click(apiTag);

    expect(mockUpdateTags).toHaveBeenCalledWith(["existing-api-tag"]);
  });

  it("shows create option when typing new tag", () => {
    render(<SimpleTagSelector tags={[]} updateTags={mockUpdateTags} label="Tags" />);

    // Open dropdown
    const addInput = screen.getByPlaceholderText("Add");
    fireEvent.click(addInput);

    // Type in search
    const searchInput = screen.getByPlaceholderText("Search or create");
    fireEvent.change(searchInput, { target: { value: "new-tag" } });

    // Should show create option
    expect(screen.getByText(/Create/)).toBeInTheDocument();
    expect(screen.getByText(/"new-tag"/)).toBeInTheDocument();
  });

  it("calls updateTags when creating a new tag", () => {
    render(<SimpleTagSelector tags={["existing"]} updateTags={mockUpdateTags} label="Tags" />);

    // Open dropdown
    const addInput = screen.getByPlaceholderText("Add");
    fireEvent.click(addInput);

    // Type in search
    const searchInput = screen.getByPlaceholderText("Search or create");
    fireEvent.change(searchInput, { target: { value: "new-tag" } });

    // Click create option
    const createButton = screen.getByText(/Create/).closest("div");
    fireEvent.click(createButton!);

    expect(mockUpdateTags).toHaveBeenCalledWith(["existing", "new-tag"]);
  });

  it("creates tag on Enter key press", () => {
    render(<SimpleTagSelector tags={[]} updateTags={mockUpdateTags} label="Tags" />);

    // Open dropdown
    const addInput = screen.getByPlaceholderText("Add");
    fireEvent.click(addInput);

    // Type and press Enter
    const searchInput = screen.getByPlaceholderText("Search or create");
    fireEvent.change(searchInput, { target: { value: "enter-tag" } });
    fireEvent.keyDown(searchInput, { key: "Enter" });

    expect(mockUpdateTags).toHaveBeenCalledWith(["enter-tag"]);
  });

  it("prevents duplicate tags (case insensitive)", () => {
    const tags = ["existing-tag"];
    render(<SimpleTagSelector tags={tags} updateTags={mockUpdateTags} label="Tags" />);

    // Open dropdown
    const addInput = screen.getByPlaceholderText("Add");
    fireEvent.click(addInput);

    // Try to add duplicate (different case)
    const searchInput = screen.getByPlaceholderText("Search or create");
    fireEvent.change(searchInput, { target: { value: "EXISTING-TAG" } });
    fireEvent.keyDown(searchInput, { key: "Enter" });

    // Should not call updateTags since it's a duplicate
    expect(mockUpdateTags).not.toHaveBeenCalled();
  });

  it("supports unlimited tags (no maxTags restriction)", () => {
    const manyTags = Array.from({ length: 10 }, (_, i) => `tag${i + 1}`);
    render(<SimpleTagSelector tags={manyTags} updateTags={mockUpdateTags} label="Tags" />);

    // Add button should still be visible even with 10 tags
    expect(screen.getByPlaceholderText("Add")).toBeInTheDocument();
  });

  it("respects maxTags limit when provided", () => {
    const tags = ["tag1", "tag2"];
    const { container } = render(
      <SimpleTagSelector tags={tags} updateTags={mockUpdateTags} label="Tags" maxTags={2} />,
    );

    // Add button should not be visible when maxTags is reached
    const addButton = container.querySelector('input[placeholder="Add"]');
    expect(addButton).not.toBeInTheDocument();
  });

  it("renders without label when label is empty", () => {
    const { container } = render(
      <SimpleTagSelector tags={[]} updateTags={mockUpdateTags} label="" />,
    );

    const label = container.querySelector("label");
    expect(label).not.toBeInTheDocument();
  });

  it("shows updated empty state message when dropdown is empty", () => {
    render(<SimpleTagSelector tags={[]} updateTags={mockUpdateTags} label="Tags" />);

    // Open dropdown
    const addInput = screen.getByPlaceholderText("Add");
    fireEvent.click(addInput);

    // Should show updated empty state
    expect(screen.getByText("Type to search or create a new tag")).toBeInTheDocument();
  });

  it("debounces search input", async () => {
    vi.useFakeTimers();

    render(<SimpleTagSelector tags={[]} updateTags={mockUpdateTags} label="Tags" />);

    const addInput = screen.getByPlaceholderText("Add");
    fireEvent.click(addInput);

    const searchInput = screen.getByPlaceholderText("Search or create");

    // Clear any existing calls
    mockUseGetSessionEventTagsQuery.mockClear();

    // Type multiple characters quickly
    fireEvent.change(searchInput, { target: { value: "t" } });
    fireEvent.change(searchInput, { target: { value: "te" } });
    fireEvent.change(searchInput, { target: { value: "tes" } });
    fireEvent.change(searchInput, { target: { value: "test" } });

    // Fast-forward time by 299ms (just before debounce completes)
    vi.advanceTimersByTime(299);

    // Verify search input has the value
    expect(searchInput).toHaveValue("test");

    // Fast-forward the remaining time to complete debounce
    vi.advanceTimersByTime(1);
    vi.runAllTimers();
  });

  it("does not show create option for existing API tags", () => {
    mockUseGetSessionEventTagsQuery.mockReturnValue({
      data: { data: ["existing-tag"] },
      isLoading: false,
      error: null,
    });

    render(<SimpleTagSelector tags={[]} updateTags={mockUpdateTags} label="Tags" />);

    const addInput = screen.getByPlaceholderText("Add");
    fireEvent.click(addInput);

    const searchInput = screen.getByPlaceholderText("Search or create");
    fireEvent.change(searchInput, { target: { value: "existing-tag" } });

    // Should not show create option since it matches an existing tag
    expect(screen.queryByText(/Create/)).not.toBeInTheDocument();
    // Should show the existing tag as a suggestion
    expect(screen.getByText("existing-tag")).toBeInTheDocument();
  });

  it("handles API error gracefully", () => {
    mockUseGetSessionEventTagsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: "API Error" },
    });

    render(<SimpleTagSelector tags={[]} updateTags={mockUpdateTags} label="Tags" />);

    const addInput = screen.getByPlaceholderText("Add");
    fireEvent.click(addInput);

    // Component should still render and allow creating tags
    const searchInput = screen.getByPlaceholderText("Search or create");
    fireEvent.change(searchInput, { target: { value: "new-tag" } });

    expect(screen.getByText(/Create/)).toBeInTheDocument();
  });

  it("closes dropdown after selecting a tag", () => {
    mockUseGetSessionEventTagsQuery.mockReturnValue({
      data: { data: ["api-tag"] },
      isLoading: false,
      error: null,
    });

    render(<SimpleTagSelector tags={[]} updateTags={mockUpdateTags} label="Tags" />);

    const addInput = screen.getByPlaceholderText("Add");
    fireEvent.click(addInput);

    const apiTag = screen.getByText("api-tag");
    fireEvent.click(apiTag);

    // Dropdown should close (search input should not be visible)
    expect(screen.queryByPlaceholderText("Search or create")).not.toBeInTheDocument();
  });

  it("clears search query when creating a tag", () => {
    render(<SimpleTagSelector tags={[]} updateTags={mockUpdateTags} label="Tags" />);

    const addInput = screen.getByPlaceholderText("Add");
    fireEvent.click(addInput);

    const searchInput = screen.getByPlaceholderText("Search or create");
    fireEvent.change(searchInput, { target: { value: "new-tag" } });

    // Create the tag
    fireEvent.keyDown(searchInput, { key: "Enter" });

    // Dropdown should close after creating tag
    expect(screen.queryByPlaceholderText("Search or create")).not.toBeInTheDocument();

    // Verify tag was added
    expect(mockUpdateTags).toHaveBeenCalledWith(["new-tag"]);
  });
});
