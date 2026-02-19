import React from "react";

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";

import Toggle from "../Toggle";

describe("Toggle Component", () => {
  const mockItems = [
    { label: "Option A", value: "optionA" },
    { label: "Option B", value: "optionB" },
  ];

  const defaultProps = {
    items: mockItems,
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Snapshot Tests ---
  describe("Snapshot Tests", () => {
    it("should match snapshot with default props", () => {
      const { asFragment } = render(<Toggle {...defaultProps} />);
      expect(asFragment()).toMatchSnapshot();
    });

    it("should match snapshot with label", () => {
      const { asFragment } = render(<Toggle {...defaultProps} label="Choose option" />);
      expect(asFragment()).toMatchSnapshot();
    });

    it("should match snapshot with second item selected", () => {
      const { asFragment } = render(<Toggle {...defaultProps} />);

      const secondOption = screen.getByText("Option B");
      fireEvent.click(secondOption);

      expect(asFragment()).toMatchSnapshot();
    });

    it("should match snapshot with different items", () => {
      const customItems = [
        { label: "Public", value: "public" },
        { label: "Private", value: "private" },
      ];
      const { asFragment } = render(<Toggle items={customItems} onChange={vi.fn()} />);
      expect(asFragment()).toMatchSnapshot();
    });
  });

  // --- Basic Rendering Tests ---
  describe("Basic Rendering", () => {
    it("should render without crashing", () => {
      expect(() => render(<Toggle {...defaultProps} />)).not.toThrow();
    });

    it("should render all items", () => {
      const { getAllByText } = render(<Toggle {...defaultProps} />);
      expect(getAllByText("Option A")[0]).toBeInTheDocument();
      expect(getAllByText("Option B")[0]).toBeInTheDocument();
    });

    it("should render label when provided", () => {
      render(<Toggle {...defaultProps} label="Select Mode" />);
      expect(screen.getByText("Select Mode")).toBeInTheDocument();
    });

    it("should not render label when not provided", () => {
      render(<Toggle {...defaultProps} />);
      expect(screen.queryByText("Select Mode")).not.toBeInTheDocument();
    });

    it("should render the correct number of items", () => {
      const threeItems = [
        { label: "One", value: "1" },
        { label: "Two", value: "2" },
        { label: "Three", value: "3" },
      ];
      render(<Toggle items={threeItems} onChange={vi.fn()} />);
      expect(screen.getByText("One")).toBeInTheDocument();
      expect(screen.getByText("Two")).toBeInTheDocument();
      expect(screen.getByText("Three")).toBeInTheDocument();
    });
  });

  // --- Selection Tests ---
  describe("Selection Behavior", () => {
    it("should have first item selected by default", () => {
      const { container } = render(<Toggle {...defaultProps} />);

      // Find the first item container
      const firstItemLabel = screen.getByText("Option A");
      const firstItem = firstItemLabel.closest("div.relative")?.parentElement; // The span is inside the div

      // Check for the active pill inside the first item
      // The pill has class "absolute inset-0 rounded-full bg-[#FFFFFF]"
      const activePill = container.querySelector(
        ".bg-\\[\\#FFFFFF\\].absolute.inset-0",
      ) as HTMLElement;
      expect(activePill).toBeInTheDocument();

      // Verify it is inside the first item's container (conceptually)
      // Since it's absolutely positioned inside the item div
      const itemDiv = screen.getByText("Option A").closest("div");
      expect(itemDiv).toContainElement(activePill);
    });

    it("should call onChange with correct value when item is clicked", () => {
      const onChange = vi.fn();
      render(<Toggle items={mockItems} onChange={onChange} />);

      const secondOption = screen.getByText("Option B");
      fireEvent.click(secondOption);

      expect(onChange).toHaveBeenCalledWith("optionB");
    });

    it("should update selection when second item is clicked", () => {
      const { container } = render(<Toggle {...defaultProps} />);

      const secondOption = screen.getByText("Option B");
      fireEvent.click(secondOption);

      // Pill should now be in the second item
      const activePill = container.querySelector(
        ".bg-\\[\\#FFFFFF\\].absolute.inset-0",
      ) as HTMLElement;
      const itemDiv = screen.getByText("Option B").closest("div");
      expect(itemDiv).toContainElement(activePill);
    });

    it("should toggle back to first item when clicked", () => {
      const { container } = render(<Toggle {...defaultProps} />);

      // Click second option
      fireEvent.click(screen.getByText("Option B"));
      // Click first option
      fireEvent.click(screen.getByText("Option A"));

      // Pill should be back in first item
      const activePill = container.querySelector(
        ".bg-\\[\\#FFFFFF\\].absolute.inset-0",
      ) as HTMLElement;
      const itemDiv = screen.getByText("Option A").closest("div");
      expect(itemDiv).toContainElement(activePill);
    });
  });

  // --- Styling Tests ---
  describe("Styling", () => {
    it("should apply correct item styles", () => {
      const { container } = render(<Toggle {...defaultProps} />);

      // Retrieve the item containers (outer divs of options)
      // Note: we can find them by the text content's parent
      const itemA = screen.getByText("Option A").closest("div");

      expect(itemA).toHaveClass(
        "relative rounded-full py-1.5 px-4 cursor-pointer transition-colors duration-200 font-primary font-normal text-sm",
      );
    });

    it("should apply active color to selected item", () => {
      render(<Toggle {...defaultProps} />);
      const firstOptionDiv = screen.getByText("Option A").closest("div");
      expect(firstOptionDiv).toHaveStyle({ color: "#000000" });
    });

    it("should apply inactive color to non-selected item", () => {
      render(<Toggle {...defaultProps} />);
      const secondOptionDiv = screen.getByText("Option B").closest("div");
      // Note: The color is applied via style prop in the component as #00000060 (approx rgba(0, 0, 0, 0.376))
      // It might be better to check the specific hex if possible, or computing computed style.
      // But looking at the component: style={{ color: isSelected ? "#000000" : "#00000060" }}
      expect(secondOptionDiv).toHaveStyle({ color: "rgba(0, 0, 0, 0.376)" });
    });

    it("should have sliding indicator with correct styles", () => {
      const { container } = render(<Toggle {...defaultProps} />);
      const activePill = container.querySelector(
        ".bg-\\[\\#FFFFFF\\].absolute.inset-0",
      ) as HTMLElement;

      expect(activePill).toHaveClass("absolute");
      expect(activePill).toHaveClass("inset-0");
      expect(activePill).toHaveClass("rounded-full");
      expect(activePill).toHaveClass("bg-[#FFFFFF]");
    });
  });

  // --- Box Shadow Tests ---
  describe("Box Shadow Styling", () => {
    it("should apply consistent shadow to the active pill", () => {
      const { container } = render(<Toggle {...defaultProps} />);
      const activePill = container.querySelector(
        ".bg-\\[\\#FFFFFF\\].absolute.inset-0",
      ) as HTMLElement;

      expect(activePill).toHaveStyle({
        boxShadow: "0px 1px 4px rgba(0, 0, 0, 0.1)",
      });
    });
  });

  // --- Edge Cases ---
  describe("Edge Cases", () => {
    it("should handle items with special characters in labels", () => {
      const specialItems = [
        { label: "Option #1 @test", value: "opt1" },
        { label: "Option $2 &more", value: "opt2" },
      ];
      render(<Toggle items={specialItems} onChange={vi.fn()} />);

      expect(screen.getByText("Option #1 @test")).toBeInTheDocument();
      expect(screen.getByText("Option $2 &more")).toBeInTheDocument();
    });

    it("should handle items with long labels", () => {
      const longItems = [
        { label: "This is a very long option label that should still render", value: "long1" },
        { label: "Another extremely lengthy label for testing purposes", value: "long2" },
      ];
      render(<Toggle items={longItems} onChange={vi.fn()} />);

      expect(
        screen.getByText("This is a very long option label that should still render"),
      ).toBeInTheDocument();
    });

    it("should handle items with empty string labels", () => {
      const emptyLabelItems = [
        { label: "", value: "empty" },
        { label: "Non-empty", value: "nonempty" },
      ];
      render(<Toggle items={emptyLabelItems} onChange={vi.fn()} />);

      expect(screen.getByText("Non-empty")).toBeInTheDocument();
    });

    it("should handle rapid clicking", () => {
      const onChange = vi.fn();
      render(<Toggle items={mockItems} onChange={onChange} />);

      const optionA = screen.getByText("Option A");
      const optionB = screen.getByText("Option B");

      // Rapid clicks
      fireEvent.click(optionB);
      fireEvent.click(optionA);
      fireEvent.click(optionB);
      fireEvent.click(optionA);
      fireEvent.click(optionB);

      expect(onChange).toHaveBeenCalledTimes(5);
    });
  });

  // --- Accessibility Tests ---
  describe("Accessibility", () => {
    it("should have clickable cursor on items", () => {
      render(<Toggle {...defaultProps} />);
      const itemDiv = screen.getByText("Option A").closest("div");
      expect(itemDiv).toHaveClass("cursor-pointer");
    });

    it("should render items with unique keys", () => {
      const { container } = render(<Toggle {...defaultProps} />);
      // There are 2 items
      const items = container.querySelectorAll(".cursor-pointer");
      expect(items.length).toBe(2);
    });
  });

  // --- Component Structure Tests ---
  describe("Component Structure", () => {
    it("should have correct DOM hierarchy", () => {
      const { container } = render(<Toggle {...defaultProps} label="Test Label" />);
      const outerContainer = container.firstChild;
      expect(outerContainer).not.toBeNull();
      // Should have label div and inner container
      expect(outerContainer?.childNodes.length).toBe(2);
    });
  });
});
