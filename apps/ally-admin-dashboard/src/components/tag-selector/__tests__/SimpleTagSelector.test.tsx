import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

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

describe("SimpleTagSelector", () => {
  const mockUpdateTags = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
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

  it("renders without label when label is empty", () => {
    const { container } = render(
      <SimpleTagSelector tags={[]} updateTags={mockUpdateTags} label="" />,
    );

    const label = container.querySelector("label");
    expect(label).not.toBeInTheDocument();
  });

  it("shows empty state message when dropdown is empty", () => {
    render(<SimpleTagSelector tags={[]} updateTags={mockUpdateTags} label="Tags" />);

    // Open dropdown
    const addInput = screen.getByPlaceholderText("Add");
    fireEvent.click(addInput);

    // Should show empty state
    expect(screen.getByText("Type to create a new tag")).toBeInTheDocument();
  });
});
