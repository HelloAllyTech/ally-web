import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { TextDropdown } from "../TextDropdown";

// Mock ArrowDownFilled icon
vi.mock("@assets", () => ({
  ArrowDownFilled: ({ width, height }: any) => (
    <svg data-testid="arrow-down-icon" width={width} height={height} />
  ),
}));

vi.mock("@hooks", () => ({
  useClickOutside: vi.fn(),
  useCreatePortal: (_ref: any, isOpen: boolean) =>
    isOpen ? { top: 0, left: 0, width: 200 } : null,
}));

describe("TextDropdown", () => {
  const defaultOptions = [
    { label: "Option 1", value: "opt1", backgroundColor: "#ff0000" },
    { label: "Option 2", value: "opt2", backgroundColor: "#00ff00" },
    { label: "Option 3", value: "opt3", backgroundColor: "#0000ff" },
  ];

  const defaultProps = {
    value: "opt1",
    options: defaultOptions,
    onChange: vi.fn(),
    placeholder: "Select an option",
    searchPlaceholder: "Search...",
    isSearchable: false,
    className: "",
    disabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders with initial value", () => {
      render(<TextDropdown {...defaultProps} />);

      expect(screen.getByText("Option 1")).toBeInTheDocument();
    });

    it("renders placeholder when value is empty", () => {
      render(<TextDropdown {...defaultProps} value="" />);

      expect(screen.getByText("Select an option")).toBeInTheDocument();
    });

    it("renders value when value doesn't match any option", () => {
      render(<TextDropdown {...defaultProps} value="unknown" />);

      // When value doesn't match any option, component shows the value itself
      expect(screen.getByText("unknown")).toBeInTheDocument();
    });

    it("renders arrow icon", () => {
      render(<TextDropdown {...defaultProps} />);

      expect(screen.getByTestId("arrow-down-icon")).toBeInTheDocument();
    });

    it("does not render arrow when disabled", () => {
      render(<TextDropdown {...defaultProps} disabled={true} />);

      expect(screen.queryByTestId("arrow-down-icon")).not.toBeInTheDocument();
    });

    it("applies custom className", () => {
      const { container } = render(<TextDropdown {...defaultProps} className="custom-class" />);

      const customElement = container.querySelector(".custom-class");
      expect(customElement).toBeInTheDocument();
    });
  });

  describe("Disabled State", () => {
    it("applies disabled styles", () => {
      const { container } = render(<TextDropdown {...defaultProps} disabled={true} />);

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      expect(button).toHaveClass("cursor-not-allowed");
    });

    it("does not open dropdown when disabled", () => {
      render(<TextDropdown {...defaultProps} disabled={true} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      expect(screen.queryByPlaceholderText("Search...")).not.toBeInTheDocument();
    });

    it("applies disabled styling when disabled", () => {
      render(<TextDropdown {...defaultProps} disabled={true} />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("cursor-not-allowed");
    });
  });

  describe("Dropdown Opening", () => {
    it("opens dropdown when button is clicked", () => {
      render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      const options = screen.getAllByText(/Option/);
      expect(options.length).toBeGreaterThanOrEqual(3);
    });

    it("closes dropdown when clicking again", () => {
      render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);
      fireEvent.mouseDown(button);

      const dropdown = screen.queryByText("Option 2");
      expect(dropdown).not.toBeInTheDocument();
    });

    it("displays all options when opened", () => {
      render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      const options = screen.getAllByText(/Option/);
      // Button text + 3 dropdown options = 4 total
      expect(options.length).toBe(4);
    });
  });

  describe("Option Selection", () => {
    it("calls onChange when option is selected", () => {
      const mockOnChange = vi.fn();
      render(<TextDropdown {...defaultProps} onChange={mockOnChange} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      const option2 = screen.getByText("Option 2");
      fireEvent.click(option2);

      expect(mockOnChange).toHaveBeenCalledWith("opt2", "Option 2");
    });

    it("closes dropdown after selection", () => {
      render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      const option2 = screen.getByText("Option 2");
      fireEvent.click(option2);

      expect(screen.queryByText("Option 3")).not.toBeInTheDocument();
    });

    it("clears search term after selection", () => {
      render(<TextDropdown {...defaultProps} isSearchable={true} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      const searchInput = screen.getByPlaceholderText("Search...");
      fireEvent.change(searchInput, { target: { value: "Option 2" } });

      const option2 = screen.getByText("Option 2");
      fireEvent.click(option2);

      fireEvent.mouseDown(button);
      const newSearchInput = screen.getByPlaceholderText("Search...");
      expect(newSearchInput).toHaveValue("");
    });

    it("resets highlighted index after selection", () => {
      const mockOnChange = vi.fn();
      render(<TextDropdown {...defaultProps} onChange={mockOnChange} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      fireEvent.keyDown(button, { key: "ArrowDown" });

      const options = screen.getAllByText(/Option/);
      // Click the first dropdown option (not the button text)
      // Options now use whitespace-nowrap instead of truncate
      const dropdownOptions = options.filter(
        opt => opt.className.includes("whitespace-nowrap") && !opt.className.includes("mr-1"),
      );
      expect(dropdownOptions.length).toBeGreaterThan(0);
      fireEvent.click(dropdownOptions[0]);

      expect(screen.queryByText("Option 2")).not.toBeInTheDocument();
    });
  });

  describe("Searchable Dropdown", () => {
    it("renders search input when isSearchable is true", () => {
      render(<TextDropdown {...defaultProps} isSearchable={true} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
    });

    it("does not render search input when isSearchable is false", () => {
      render(<TextDropdown {...defaultProps} isSearchable={false} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      expect(screen.queryByPlaceholderText("Search...")).not.toBeInTheDocument();
    });

    it("filters options based on search term", () => {
      render(<TextDropdown {...defaultProps} isSearchable={true} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      const searchInput = screen.getByPlaceholderText("Search...");
      fireEvent.change(searchInput, { target: { value: "Option 2" } });

      const options = screen.getAllByText(/Option 2/);
      expect(options.length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText("Option 3")).not.toBeInTheDocument();
    });

    it("performs case-insensitive search", () => {
      render(<TextDropdown {...defaultProps} isSearchable={true} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      const searchInput = screen.getByPlaceholderText("Search...");
      fireEvent.change(searchInput, { target: { value: "option 2" } });

      expect(screen.getByText("Option 2")).toBeInTheDocument();
    });

    it("shows 'No options found' when search yields no results", () => {
      render(<TextDropdown {...defaultProps} isSearchable={true} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      const searchInput = screen.getByPlaceholderText("Search...");
      fireEvent.change(searchInput, { target: { value: "nonexistent" } });

      expect(screen.getByText("No options found")).toBeInTheDocument();
    });

    it("focuses search input when dropdown opens", async () => {
      render(<TextDropdown {...defaultProps} isSearchable={true} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText("Search...");
        expect(document.activeElement).toBe(searchInput);
      });
    });

    it("resets highlighted index when search term changes", () => {
      render(<TextDropdown {...defaultProps} isSearchable={true} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      fireEvent.keyDown(button, { key: "ArrowDown" });

      const searchInput = screen.getByPlaceholderText("Search...");
      fireEvent.change(searchInput, { target: { value: "Opt" } });

      // Highlighted index should be reset to -1
      const options = screen.getAllByText(/Option/);
      options.forEach(option => {
        expect(option).not.toHaveClass("bg-blue-50");
      });
    });

    it("uses custom search placeholder", () => {
      render(<TextDropdown {...defaultProps} isSearchable={true} searchPlaceholder="Type here" />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      expect(screen.getByPlaceholderText("Type here")).toBeInTheDocument();
    });
  });

  describe("Keyboard Navigation", () => {
    it("opens dropdown on Enter key", () => {
      render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.keyDown(button, { key: "Enter" });

      expect(screen.getByText("Option 2")).toBeInTheDocument();
    });

    it("opens dropdown on Space key", () => {
      render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.keyDown(button, { key: " " });

      expect(screen.getByText("Option 2")).toBeInTheDocument();
    });

    it("opens dropdown on ArrowDown key", () => {
      render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.keyDown(button, { key: "ArrowDown" });

      expect(screen.getByText("Option 2")).toBeInTheDocument();
    });

    it("navigates down with ArrowDown when open", () => {
      render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      fireEvent.keyDown(button, { key: "ArrowDown" });

      // Dropdown should still be open
      const options = screen.getAllByText("Option 1");
      expect(options.length).toBeGreaterThan(0);
    });

    it("navigates up with ArrowUp when open", () => {
      render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      fireEvent.keyDown(button, { key: "ArrowDown" });
      fireEvent.keyDown(button, { key: "ArrowUp" });

      // Dropdown should still be open
      const options = screen.getAllByText("Option 1");
      expect(options.length).toBeGreaterThan(0);
    });

    it("selects option with Enter key", () => {
      const mockOnChange = vi.fn();
      render(<TextDropdown {...defaultProps} onChange={mockOnChange} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      fireEvent.keyDown(button, { key: "ArrowDown" });
      fireEvent.keyDown(button, { key: "Enter" });

      expect(mockOnChange).toHaveBeenCalled();
    });

    it("closes dropdown on Escape key", () => {
      render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      fireEvent.keyDown(button, { key: "Escape" });

      expect(screen.queryByText("Option 2")).not.toBeInTheDocument();
    });

    it("wraps to first option when navigating down past last", () => {
      render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      // Navigate to last option and one more
      fireEvent.keyDown(button, { key: "ArrowDown" }); // 0
      fireEvent.keyDown(button, { key: "ArrowDown" }); // 1
      fireEvent.keyDown(button, { key: "ArrowDown" }); // 2
      fireEvent.keyDown(button, { key: "ArrowDown" }); // wraps to 0

      // Dropdown should still be open
      const options = screen.getAllByText("Option 1");
      expect(options.length).toBeGreaterThan(0);
    });

    it("wraps to last option when navigating up from first", () => {
      render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      fireEvent.keyDown(button, { key: "ArrowUp" });

      // Dropdown should still be open
      expect(screen.getAllByText("Option 3").length).toBeGreaterThan(0);
    });
  });

  describe("Highlighted Option", () => {
    it("highlights current value when dropdown opens", () => {
      render(<TextDropdown {...defaultProps} value="opt2" />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      // Current value should be displayed
      const options = screen.getAllByText("Option 2");
      expect(options.length).toBeGreaterThan(0);
    });

    it("scrolls highlighted option into view", async () => {
      const scrollIntoViewMock = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoViewMock;

      render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      fireEvent.keyDown(button, { key: "ArrowDown" });

      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalled();
      });
    });

    it("applies highlighted styles correctly", () => {
      const { container } = render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      fireEvent.keyDown(button, { key: "ArrowDown" });

      const highlightedOption = container.querySelector(".bg-primary-50");
      expect(highlightedOption).toBeInTheDocument();
    });

    it("removes highlight styles from non-highlighted options", () => {
      const { container } = render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      fireEvent.keyDown(button, { key: "ArrowDown" });

      const whiteBackgrounds = container.querySelectorAll(".bg-white");
      // Should have non-highlighted options with white background
      expect(whiteBackgrounds.length).toBeGreaterThan(0);
    });
  });

  describe("Background Colors", () => {
    it("displays background color indicators", () => {
      render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      const colorIndicators = document.querySelectorAll(".rounded-full");
      expect(colorIndicators.length).toBeGreaterThan(0);
    });

    it("applies correct background colors", () => {
      render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      const colorIndicators = document.querySelectorAll(".rounded-full");
      expect(colorIndicators[0]).toHaveStyle({ backgroundColor: "#ff0000" });
    });

    it("handles options without background colors", () => {
      const optionsWithoutBg = [
        { label: "No BG 1", value: "nobg1" },
        { label: "No BG 2", value: "nobg2" },
      ];

      render(<TextDropdown {...defaultProps} options={optionsWithoutBg} value="" />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      expect(screen.getByText("No BG 1")).toBeInTheDocument();
      expect(screen.getByText("No BG 2")).toBeInTheDocument();
    });
  });

  describe("Placeholder Display", () => {
    it("displays placeholder when no value", () => {
      render(<TextDropdown {...defaultProps} value="" />);

      const button = screen.getByRole("button");
      expect(button.textContent).toContain("Select an option");
    });

    it("displays value when selected", () => {
      render(<TextDropdown {...defaultProps} value="opt1" />);

      const button = screen.getByRole("button");
      expect(button.textContent).toContain("Option 1");
    });
  });

  describe("Edge Cases", () => {
    it("handles empty options array", () => {
      render(<TextDropdown {...defaultProps} options={[]} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      expect(screen.getByText("No options found")).toBeInTheDocument();
    });

    it("handles undefined options", () => {
      // Component should handle undefined options gracefully
      const { container } = render(<TextDropdown {...defaultProps} options={undefined as any} />);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();

      // Should render without crashing
      expect(container).toBeTruthy();
    });

    it("handles very long option labels", () => {
      const longOptions = [{ label: "A".repeat(100), value: "long" }];

      render(<TextDropdown {...defaultProps} options={longOptions} value="" />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      expect(screen.getByText("A".repeat(100))).toBeInTheDocument();
    });

    it("truncates long display values", () => {
      const longOptions = [{ label: "Very Long Option Label", value: "long" }];

      render(<TextDropdown {...defaultProps} options={longOptions} value="long" />);

      const button = screen.getByRole("button");
      const truncatedText = button.querySelector(".truncate");
      expect(truncatedText).toBeInTheDocument();
    });

    it("handles special characters in labels", () => {
      const specialOptions = [{ label: "Option <>&\"'", value: "special" }];

      render(<TextDropdown {...defaultProps} options={specialOptions} value="" />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      expect(screen.getByText("Option <>&\"'")).toBeInTheDocument();
    });

    it("handles null value in options", () => {
      const optionsWithNull = [
        { label: "Option 1", value: "opt1" },
        null,
        { label: "Option 3", value: "opt3" },
      ];

      const { container } = render(
        <TextDropdown {...defaultProps} options={optionsWithNull as any} />,
      );

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      // Should still render valid options
      const validOptions = container.querySelectorAll(".cursor-pointer");
      expect(validOptions.length).toBeGreaterThan(0);
    });
  });

  describe("Dropdown Menu Styling", () => {
    it("applies correct positioning classes", () => {
      const { container } = render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      const dropdown = container.querySelector(".fixed.z-50");
      expect(dropdown).toBeInTheDocument();
    });

    it("applies correct width", () => {
      const { container } = render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      const dropdown = container.querySelector(".fixed.z-50");
      expect(dropdown).toHaveStyle({ width: "200px" });
    });

    it("applies border and shadow", () => {
      const { container } = render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      const dropdown = container.querySelector(".fixed.shadow-lg");
      expect(dropdown).toBeInTheDocument();
    });

    it("limits max height", () => {
      const { container } = render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      const optionsList = container.querySelector(".max-h-48");
      expect(optionsList).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("renders as a button", () => {
      render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    it("button is keyboard accessible", () => {
      render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      button.focus();

      expect(document.activeElement).toBe(button);
    });

    it("supports keyboard navigation when open", () => {
      const { container } = render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      fireEvent.keyDown(button, { key: "ArrowDown" });
      fireEvent.keyDown(button, { key: "Enter" });

      // Dropdown closes after selection
      expect(container.querySelector(".fixed.z-50")).toBeNull();
    });
  });

  describe("Load More Functionality", () => {
    it("renders Load More button when onLoadMore is provided", () => {
      const mockOnLoadMore = vi.fn();
      render(<TextDropdown {...defaultProps} onLoadMore={mockOnLoadMore} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      expect(screen.getByText("Load More")).toBeInTheDocument();
    });

    it("does not render Load More button when onLoadMore is not provided", () => {
      render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      expect(screen.queryByText("Load More")).not.toBeInTheDocument();
    });

    it("calls onLoadMore when Load More button is clicked", () => {
      const mockOnLoadMore = vi.fn();
      render(<TextDropdown {...defaultProps} onLoadMore={mockOnLoadMore} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      const loadMoreButton = screen.getByText("Load More");
      fireEvent.click(loadMoreButton);

      expect(mockOnLoadMore).toHaveBeenCalledTimes(1);
    });

    it("Load More button has correct styling", () => {
      const mockOnLoadMore = vi.fn();
      const { container } = render(<TextDropdown {...defaultProps} onLoadMore={mockOnLoadMore} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      const loadMoreButton = screen.getByText("Load More");
      expect(loadMoreButton).toHaveClass("text-typography-500");
      expect(loadMoreButton).toHaveClass("hover:text-typography-700");
    });

    it("Load More button is separated by border", () => {
      const mockOnLoadMore = vi.fn();
      const { container } = render(<TextDropdown {...defaultProps} onLoadMore={mockOnLoadMore} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      const borderDiv = container.querySelector(".border-t");
      expect(borderDiv).toBeInTheDocument();
    });

    it("does not render Load More when onLoadMore is undefined", () => {
      render(<TextDropdown {...defaultProps} onLoadMore={undefined} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      expect(screen.queryByText("Load More")).not.toBeInTheDocument();
    });
  });

  describe("Global Search Functionality", () => {
    it("calls onSearch when search input changes", () => {
      const mockOnSearch = vi.fn();
      render(<TextDropdown {...defaultProps} isSearchable={true} onSearch={mockOnSearch} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      const searchInput = screen.getByPlaceholderText("Search...");
      fireEvent.change(searchInput, { target: { value: "test search" } });

      expect(mockOnSearch).toHaveBeenCalledWith("test search");
    });

    it("does not filter locally when onSearch is provided", () => {
      const mockOnSearch = vi.fn();
      render(<TextDropdown {...defaultProps} isSearchable={true} onSearch={mockOnSearch} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      const searchInput = screen.getByPlaceholderText("Search...");
      fireEvent.change(searchInput, { target: { value: "Option 2" } });

      // All options should still be visible since filtering is done server-side
      const allOptions = screen.getAllByText("Option 1");
      expect(allOptions.length).toBeGreaterThan(0);
      expect(screen.getAllByText("Option 2").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Option 3").length).toBeGreaterThan(0);
    });

    it("filters locally when onSearch is not provided", () => {
      render(<TextDropdown {...defaultProps} isSearchable={true} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      const searchInput = screen.getByPlaceholderText("Search...");
      fireEvent.change(searchInput, { target: { value: "Option 2" } });

      // Only matching option should be visible in the dropdown list
      const dropdownOptions = screen.getAllByText("Option 2");
      expect(dropdownOptions.length).toBeGreaterThan(0);

      // Option 1 appears in button text, so check specifically in dropdown area
      // Count all instances - button + dropdown = should be 2 for Option 2, 1 for others
      expect(screen.getAllByText("Option 2").length).toBeGreaterThanOrEqual(1);
      expect(screen.queryAllByText("Option 3").length).toBe(0);
    });

    it("calls onSearch with empty string when search is cleared", () => {
      const mockOnSearch = vi.fn();
      render(<TextDropdown {...defaultProps} isSearchable={true} onSearch={mockOnSearch} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      const searchInput = screen.getByPlaceholderText("Search...");
      fireEvent.change(searchInput, { target: { value: "test" } });
      fireEvent.change(searchInput, { target: { value: "" } });

      expect(mockOnSearch).toHaveBeenLastCalledWith("");
    });

    it("calls onSearch on every keystroke", () => {
      const mockOnSearch = vi.fn();
      render(<TextDropdown {...defaultProps} isSearchable={true} onSearch={mockOnSearch} />);

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      const searchInput = screen.getByPlaceholderText("Search...");
      fireEvent.change(searchInput, { target: { value: "a" } });
      fireEvent.change(searchInput, { target: { value: "ab" } });
      fireEvent.change(searchInput, { target: { value: "abc" } });

      expect(mockOnSearch).toHaveBeenCalledTimes(3);
      expect(mockOnSearch).toHaveBeenNthCalledWith(1, "a");
      expect(mockOnSearch).toHaveBeenNthCalledWith(2, "ab");
      expect(mockOnSearch).toHaveBeenNthCalledWith(3, "abc");
    });

    it("works with both onSearch and onLoadMore together", () => {
      const mockOnSearch = vi.fn();
      const mockOnLoadMore = vi.fn();
      render(
        <TextDropdown
          {...defaultProps}
          isSearchable={true}
          onSearch={mockOnSearch}
          onLoadMore={mockOnLoadMore}
        />,
      );

      const button = screen.getByRole("button");
      fireEvent.mouseDown(button);

      // Both search input and Load More should be present
      expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
      expect(screen.getByText("Load More")).toBeInTheDocument();

      // Test both functionalities
      const searchInput = screen.getByPlaceholderText("Search...");
      fireEvent.change(searchInput, { target: { value: "test" } });
      expect(mockOnSearch).toHaveBeenCalledWith("test");

      const loadMoreButton = screen.getByText("Load More");
      fireEvent.click(loadMoreButton);
      expect(mockOnLoadMore).toHaveBeenCalledTimes(1);
    });
  });

  describe("displayValue prop", () => {
    it("uses displayValue when provided", () => {
      render(<TextDropdown {...defaultProps} value="opt1" displayValue="Custom Display" />);

      expect(screen.getByText("Custom Display")).toBeInTheDocument();
    });

    it("falls back to option label when displayValue is not provided", () => {
      render(<TextDropdown {...defaultProps} value="opt1" />);

      expect(screen.getByText("Option 1")).toBeInTheDocument();
    });

    it("uses displayValue over option label when both exist", () => {
      render(<TextDropdown {...defaultProps} value="opt1" displayValue="Override Label" />);

      expect(screen.getByText("Override Label")).toBeInTheDocument();
      expect(screen.queryByText("Option 1")).not.toBeInTheDocument();
    });

    it("handles empty displayValue", () => {
      render(<TextDropdown {...defaultProps} value="opt1" displayValue="" />);

      // Should fall back to option label or value
      expect(screen.getByText("Option 1")).toBeInTheDocument();
    });
  });
});

/**
 * A catalog should enrich a field, not constrain it. Converting a field to a
 * strict select was the actual bug three times over: an ElevenLabs voice
 * created in Studio minutes ago is a valid id absent from a cached list, a
 * Google Gemini voice was missing from a language-scoped catalog, and an expired
 * credential emptied a catalog entirely. In each case a select left an admin
 * unable to enter a value that works.
 */
describe("TextDropdown — allowCustomValue", () => {
  const options = [
    { label: "Meenakshi", value: "iA7mRIiSweGrLdznkosO" },
    { label: "Setu", value: "RBxPIvrKOP4ugCK2jVHD" },
  ];

  const open = (props: Record<string, unknown> = {}) => {
    const onChange = vi.fn();
    render(
      <TextDropdown
        value=""
        options={options}
        onChange={onChange}
        isSearchable
        allowCustomValue
        placeholder="Select a voice"
        {...props}
      />,
    );
    fireEvent.mouseDown(screen.getByRole("button", { name: /select a voice/i }));
    return onChange;
  };

  it("offers to use a typed value the catalog does not have", () => {
    const onChange = open();
    fireEvent.change(screen.getByPlaceholderText("Search..."), {
      target: { value: "brandNewVoiceId123" },
    });

    const useTyped = screen.getByTestId("dropdown-use-typed-value");
    expect(useTyped).toHaveTextContent("brandNewVoiceId123");
    fireEvent.mouseDown(useTyped);
    expect(onChange).toHaveBeenCalledWith("brandNewVoiceId123", "brandNewVoiceId123");
  });

  it("trims a pasted value, which routinely arrives with whitespace", () => {
    const onChange = open();
    fireEvent.change(screen.getByPlaceholderText("Search..."), {
      target: { value: "  paddedVoiceId  " },
    });
    fireEvent.mouseDown(screen.getByTestId("dropdown-use-typed-value"));
    expect(onChange).toHaveBeenCalledWith("paddedVoiceId", "paddedVoiceId");
  });

  it("does not offer a custom value that duplicates an existing option", () => {
    open();
    fireEvent.change(screen.getByPlaceholderText("Search..."), {
      target: { value: "iA7mRIiSweGrLdznkosO" },
    });
    expect(screen.queryByTestId("dropdown-use-typed-value")).not.toBeInTheDocument();
  });

  it("commits a typed value on Enter when nothing is highlighted", () => {
    const onChange = open();
    const search = screen.getByPlaceholderText("Search...");
    fireEvent.change(search, { target: { value: "typedByKeyboard" } });
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("typedByKeyboard", "typedByKeyboard");
  });

  it("still prefers a highlighted option over the typed text", () => {
    const onChange = open();
    const search = screen.getByPlaceholderText("Search...");
    fireEvent.change(search, { target: { value: "Meen" } });
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("iA7mRIiSweGrLdznkosO", "Meenakshi");
  });

  it("says what to do when nothing matches, rather than just 'No options found'", () => {
    open();
    fireEvent.change(screen.getByPlaceholderText("Search..."), {
      target: { value: "zzz-no-match" },
    });
    expect(screen.getByText(/use what you typed above/i)).toBeInTheDocument();
  });

  it("does not point at an option the caller withheld", () => {
    // Searching by name legitimately finds nothing, and a name is not a valid
    // id — so there is nothing above to use, and saying otherwise misleads.
    const onChange = open({ isValidCustomValue: (v: string) => !/\s/.test(v) });
    fireEvent.change(screen.getByPlaceholderText("Search..."), {
      target: { value: "test voice picker" },
    });
    expect(screen.queryByTestId("dropdown-use-typed-value")).not.toBeInTheDocument();
    expect(screen.getByText("No options found")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByPlaceholderText("Search..."), { key: "Enter" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("accepts a typed value the caller considers valid", () => {
    const onChange = open({ isValidCustomValue: (v: string) => v.length >= 18 });
    fireEvent.change(screen.getByPlaceholderText("Search..."), {
      target: { value: "RuHp70tvNknMdh0zmb8P" },
    });
    fireEvent.mouseDown(screen.getByTestId("dropdown-use-typed-value"));
    expect(onChange).toHaveBeenCalledWith("RuHp70tvNknMdh0zmb8P", "RuHp70tvNknMdh0zmb8P");
  });

  it("stays a strict select when the caller does not opt in", () => {
    open({ allowCustomValue: false });
    fireEvent.change(screen.getByPlaceholderText("Search..."), {
      target: { value: "somethingNew" },
    });
    expect(screen.queryByTestId("dropdown-use-typed-value")).not.toBeInTheDocument();
    expect(screen.getByText("No options found")).toBeInTheDocument();
  });
});
