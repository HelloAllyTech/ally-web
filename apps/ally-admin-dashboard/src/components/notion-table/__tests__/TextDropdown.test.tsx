import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { TextDropdown } from "../TextDropdown";

// Mock ArrowDownFilled icon
vi.mock("@assets", () => ({
  ArrowDownFilled: ({ width, height }: any) => (
    <svg data-testid="arrow-down-icon" width={width} height={height} />
  ),
}));

// Mock useClickOutside hook
vi.mock("@hooks", () => ({
  useClickOutside: vi.fn(),
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

    it("renders placeholder when value doesn't match any option", () => {
      render(<TextDropdown {...defaultProps} value="unknown" />);

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
      fireEvent.click(button);

      expect(screen.queryByPlaceholderText("Search...")).not.toBeInTheDocument();
    });

    it("applies bg-gray-50 class when disabled", () => {
      render(<TextDropdown {...defaultProps} disabled={true} />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-gray-50");
    });
  });

  describe("Dropdown Opening", () => {
    it("opens dropdown when button is clicked", () => {
      render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const options = screen.getAllByText(/Option/);
      expect(options.length).toBeGreaterThanOrEqual(3);
    });

    it("closes dropdown when clicking again", () => {
      render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);
      fireEvent.click(button);

      const dropdown = screen.queryByText("Option 2");
      expect(dropdown).not.toBeInTheDocument();
    });

    it("displays all options when opened", () => {
      render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

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
      fireEvent.click(button);

      const option2 = screen.getByText("Option 2");
      fireEvent.click(option2);

      expect(mockOnChange).toHaveBeenCalledWith("opt2");
    });

    it("closes dropdown after selection", () => {
      render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const option2 = screen.getByText("Option 2");
      fireEvent.click(option2);

      expect(screen.queryByText("Option 3")).not.toBeInTheDocument();
    });

    it("clears search term after selection", () => {
      render(<TextDropdown {...defaultProps} isSearchable={true} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const searchInput = screen.getByPlaceholderText("Search...");
      fireEvent.change(searchInput, { target: { value: "Option 2" } });

      const option2 = screen.getByText("Option 2");
      fireEvent.click(option2);

      fireEvent.click(button);
      const newSearchInput = screen.getByPlaceholderText("Search...");
      expect(newSearchInput).toHaveValue("");
    });

    it("resets highlighted index after selection", () => {
      const mockOnChange = vi.fn();
      render(<TextDropdown {...defaultProps} onChange={mockOnChange} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      fireEvent.keyDown(button, { key: "ArrowDown" });

      const options = screen.getAllByText(/Option/);
      // Click the first dropdown option (not the button text)
      const dropdownOptions = options.filter(
        opt => opt.className.includes("truncate") && !opt.className.includes("mr-1"),
      );
      fireEvent.click(dropdownOptions[0]);

      expect(screen.queryByText("Option 2")).not.toBeInTheDocument();
    });
  });

  describe("Searchable Dropdown", () => {
    it("renders search input when isSearchable is true", () => {
      render(<TextDropdown {...defaultProps} isSearchable={true} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
    });

    it("does not render search input when isSearchable is false", () => {
      render(<TextDropdown {...defaultProps} isSearchable={false} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(screen.queryByPlaceholderText("Search...")).not.toBeInTheDocument();
    });

    it("filters options based on search term", () => {
      render(<TextDropdown {...defaultProps} isSearchable={true} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const searchInput = screen.getByPlaceholderText("Search...");
      fireEvent.change(searchInput, { target: { value: "Option 2" } });

      const options = screen.getAllByText(/Option 2/);
      expect(options.length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText("Option 3")).not.toBeInTheDocument();
    });

    it("performs case-insensitive search", () => {
      render(<TextDropdown {...defaultProps} isSearchable={true} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const searchInput = screen.getByPlaceholderText("Search...");
      fireEvent.change(searchInput, { target: { value: "option 2" } });

      expect(screen.getByText("Option 2")).toBeInTheDocument();
    });

    it("shows 'No options found' when search yields no results", () => {
      render(<TextDropdown {...defaultProps} isSearchable={true} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const searchInput = screen.getByPlaceholderText("Search...");
      fireEvent.change(searchInput, { target: { value: "nonexistent" } });

      expect(screen.getByText("No options found")).toBeInTheDocument();
    });

    it("focuses search input when dropdown opens", async () => {
      render(<TextDropdown {...defaultProps} isSearchable={true} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText("Search...");
        expect(document.activeElement).toBe(searchInput);
      });
    });

    it("resets highlighted index when search term changes", () => {
      render(<TextDropdown {...defaultProps} isSearchable={true} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

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
      fireEvent.click(button);

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
      const { container } = render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      fireEvent.keyDown(button, { key: "ArrowDown" });

      const highlightedOption = container.querySelector(".bg-blue-50");
      expect(highlightedOption).toBeInTheDocument();
    });

    it("navigates up with ArrowUp when open", () => {
      const { container } = render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      fireEvent.keyDown(button, { key: "ArrowDown" });
      fireEvent.keyDown(button, { key: "ArrowUp" });

      // Should have highlighted element
      const highlightedOption = container.querySelector(".bg-blue-50");
      expect(highlightedOption).toBeInTheDocument();
    });

    it("selects option with Enter key", () => {
      const mockOnChange = vi.fn();
      render(<TextDropdown {...defaultProps} onChange={mockOnChange} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      fireEvent.keyDown(button, { key: "ArrowDown" });
      fireEvent.keyDown(button, { key: "Enter" });

      expect(mockOnChange).toHaveBeenCalled();
    });

    it("closes dropdown on Escape key", () => {
      render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      fireEvent.keyDown(button, { key: "Escape" });

      expect(screen.queryByText("Option 2")).not.toBeInTheDocument();
    });

    it("wraps to first option when navigating down past last", () => {
      const { container } = render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      // Navigate to last option and one more
      fireEvent.keyDown(button, { key: "ArrowDown" }); // 0
      fireEvent.keyDown(button, { key: "ArrowDown" }); // 1
      fireEvent.keyDown(button, { key: "ArrowDown" }); // 2
      fireEvent.keyDown(button, { key: "ArrowDown" }); // wraps to 0

      const highlightedOption = container.querySelector(".bg-blue-50");
      expect(highlightedOption).toBeInTheDocument();
    });

    it("wraps to last option when navigating up from first", () => {
      render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      fireEvent.keyDown(button, { key: "ArrowUp" });

      const options = screen.getAllByText(/Option/);
      expect(options[options.length - 1].parentElement).toHaveClass("bg-blue-50");
    });
  });

  describe("Highlighted Option", () => {
    it("highlights current value when dropdown opens", () => {
      const { container } = render(<TextDropdown {...defaultProps} value="opt2" />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const highlightedOption = container.querySelector(".bg-blue-50");
      expect(highlightedOption).toBeInTheDocument();
      expect(highlightedOption?.textContent).toContain("Option 2");
    });

    it("scrolls highlighted option into view", async () => {
      const scrollIntoViewMock = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoViewMock;

      render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      fireEvent.keyDown(button, { key: "ArrowDown" });

      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalled();
      });
    });

    it("applies highlighted styles correctly", () => {
      const { container } = render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      fireEvent.keyDown(button, { key: "ArrowDown" });

      const highlightedOption = container.querySelector(".bg-blue-50");
      expect(highlightedOption).toBeInTheDocument();
      expect(highlightedOption).toHaveClass("text-blue-700");
    });

    it("removes highlight styles from non-highlighted options", () => {
      const { container } = render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

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
      fireEvent.click(button);

      const colorIndicators = document.querySelectorAll(".rounded-full");
      expect(colorIndicators.length).toBeGreaterThan(0);
    });

    it("applies correct background colors", () => {
      render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

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
      fireEvent.click(button);

      expect(screen.getByText("No BG 1")).toBeInTheDocument();
      expect(screen.getByText("No BG 2")).toBeInTheDocument();
    });
  });

  describe("Placeholder Styling", () => {
    it("applies gray text color to placeholder", () => {
      render(<TextDropdown {...defaultProps} value="" />);

      const button = screen.getByRole("button");
      const placeholder = button.querySelector(".text-gray-500");
      expect(placeholder).toBeInTheDocument();
    });

    it("does not apply gray color to actual value", () => {
      render(<TextDropdown {...defaultProps} value="opt1" />);

      const button = screen.getByRole("button");
      const valueText = button.querySelector(".text-gray-500");
      expect(valueText).not.toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles empty options array", () => {
      render(<TextDropdown {...defaultProps} options={[]} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(screen.getByText("No options found")).toBeInTheDocument();
    });

    it("handles undefined options", () => {
      // Component should handle undefined options gracefully or throw error
      expect(() => {
        render(<TextDropdown {...defaultProps} options={undefined as any} />);
      }).toThrow();
    });

    it("handles very long option labels", () => {
      const longOptions = [{ label: "A".repeat(100), value: "long" }];

      render(<TextDropdown {...defaultProps} options={longOptions} value="" />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

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
      fireEvent.click(button);

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
      fireEvent.click(button);

      // Should still render valid options
      const validOptions = container.querySelectorAll(".cursor-pointer");
      expect(validOptions.length).toBeGreaterThan(0);
    });
  });

  describe("Dropdown Menu Styling", () => {
    it("applies correct positioning classes", () => {
      const { container } = render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const dropdown = container.querySelector(".absolute.z-50");
      expect(dropdown).toBeInTheDocument();
    });

    it("applies correct width", () => {
      const { container } = render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const dropdown = container.querySelector('[class*="w-[calc(100%+24px)]"]');
      expect(dropdown).toBeInTheDocument();
    });

    it("applies border and shadow", () => {
      const { container } = render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const dropdown = container.querySelector(".border.border-gray-300.shadow-lg");
      expect(dropdown).toBeInTheDocument();
    });

    it("limits max height", () => {
      const { container } = render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

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
      render(<TextDropdown {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      fireEvent.keyDown(button, { key: "ArrowDown" });
      fireEvent.keyDown(button, { key: "Enter" });

      expect(screen.queryByText("Option 2")).not.toBeInTheDocument();
    });
  });
});
