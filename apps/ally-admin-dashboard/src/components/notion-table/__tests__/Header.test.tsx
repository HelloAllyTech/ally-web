import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { Header } from "../Header";
import { HeaderProps } from "../types";

describe("Header", () => {
  const mockGetHeaderProps = vi.fn(() => ({
    key: "test-header-key",
    role: "columnheader",
    style: { width: "200px" },
  }));

  const mockGetResizerProps = vi.fn(() => ({
    role: "separator",
    "aria-orientation": "vertical",
  }));

  const defaultColumn = {
    label: "Test Column",
    getResizerProps: mockGetResizerProps,
    getHeaderProps: mockGetHeaderProps,
    headerIndex: 0,
  };

  const defaultProps: HeaderProps = {
    column: defaultColumn,
  };

  describe("Rendering", () => {
    it("renders header with label", () => {
      render(<Header {...defaultProps} />);

      expect(screen.getByText("Test Column")).toBeInTheDocument();
    });

    it("renders header with empty label", () => {
      const emptyLabelColumn = { ...defaultColumn, label: "" };
      render(<Header column={emptyLabelColumn} />);

      const header = screen.queryByText("Test Column");
      expect(header).not.toBeInTheDocument();
    });

    it("applies header props from getHeaderProps", () => {
      const { container } = render(<Header {...defaultProps} />);

      const headerElement = container.querySelector('[role="columnheader"]');
      expect(headerElement).toBeInTheDocument();
    });

    it("applies resizer props", () => {
      const { container } = render(<Header {...defaultProps} />);

      const resizerElement = container.querySelector('[role="separator"]');
      expect(resizerElement).toBeInTheDocument();
    });

    it("excludes key prop from spread", () => {
      const { container } = render(<Header {...defaultProps} />);

      const headerElement = container.querySelector('[role="columnheader"]');
      expect(headerElement).not.toHaveAttribute("key");
    });
  });

  describe("Styling", () => {
    it("applies base styling classes", () => {
      const { container } = render(<Header {...defaultProps} />);

      const headerElement = container.querySelector(".bg-white");
      expect(headerElement).toBeInTheDocument();
      expect(headerElement).toHaveClass("border-[1px]");
      expect(headerElement).toHaveClass("border-gray-200");
      expect(headerElement).toHaveClass("select-none");
    });

    it("applies left border for first column", () => {
      const { container } = render(<Header {...defaultProps} />);

      const headerElement = container.querySelector(".border-l-1");
      expect(headerElement).toBeInTheDocument();
    });

    it("removes left border for non-first columns", () => {
      const nonFirstColumn = { ...defaultColumn, headerIndex: 1 };
      const { container } = render(<Header column={nonFirstColumn} />);

      const headerElement = container.querySelector(".border-l-0");
      expect(headerElement).toBeInTheDocument();
    });

    it("applies hover styles", () => {
      const { container } = render(<Header {...defaultProps} />);

      const hoverElement = container.querySelector(".hover\\:bg-gray-100");
      expect(hoverElement).toBeInTheDocument();
    });

    it("applies cursor pointer style", () => {
      const { container } = render(<Header {...defaultProps} />);

      const cursorElement = container.querySelector(".cursor-pointer");
      expect(cursorElement).toBeInTheDocument();
    });
  });

  describe("Header Index", () => {
    it("handles headerIndex 0", () => {
      const { container } = render(<Header {...defaultProps} />);

      const headerElement = container.querySelector(".border-l-1");
      expect(headerElement).toBeInTheDocument();
    });

    it("handles headerIndex 1", () => {
      const column = { ...defaultColumn, headerIndex: 1 };
      const { container } = render(<Header column={column} />);

      const headerElement = container.querySelector(".border-l-0");
      expect(headerElement).toBeInTheDocument();
    });

    it("handles headerIndex 5", () => {
      const column = { ...defaultColumn, headerIndex: 5 };
      const { container } = render(<Header column={column} />);

      const headerElement = container.querySelector(".border-l-0");
      expect(headerElement).toBeInTheDocument();
    });
  });

  describe("Label Display", () => {
    it("displays text label correctly", () => {
      render(<Header {...defaultProps} />);

      const label = screen.getByText("Test Column");
      expect(label).toHaveClass("font-medium");
      expect(label).toHaveClass("text-gray-500");
      expect(label).toHaveClass("truncate");
    });

    it("truncates long labels", () => {
      const longLabel = "A".repeat(100);
      const longLabelColumn = { ...defaultColumn, label: longLabel };
      render(<Header column={longLabelColumn} />);

      const labelElement = screen.getByText(longLabel);
      expect(labelElement).toHaveClass("truncate");
    });

    it("handles special characters in label", () => {
      const specialLabel = "Test <>&\"'";
      const specialLabelColumn = { ...defaultColumn, label: specialLabel };
      render(<Header column={specialLabelColumn} />);

      expect(screen.getByText(specialLabel)).toBeInTheDocument();
    });
  });

  describe("Resizer", () => {
    it("renders resizer element", () => {
      const { container } = render(<Header {...defaultProps} />);

      const resizer = container.querySelector(".cursor-col-resize");
      expect(resizer).toBeInTheDocument();
    });

    it("positions resizer absolutely", () => {
      const { container } = render(<Header {...defaultProps} />);

      const resizer = container.querySelector(".absolute");
      expect(resizer).toHaveClass("right-0");
      expect(resizer).toHaveClass("top-0");
    });

    it("applies resizer dimensions", () => {
      const { container } = render(<Header {...defaultProps} />);

      const resizer = container.querySelector(".cursor-col-resize");
      expect(resizer).toHaveClass("w-1");
      expect(resizer).toHaveClass("h-full");
    });

    it("applies hover color to resizer", () => {
      const { container } = render(<Header {...defaultProps} />);

      const resizer = container.querySelector(".cursor-col-resize");
      expect(resizer).toHaveClass("hover:bg-blue-300");
    });

    it("calls getResizerProps", () => {
      render(<Header {...defaultProps} />);

      expect(mockGetResizerProps).toHaveBeenCalled();
    });
  });

  describe("Header Props", () => {
    it("calls getHeaderProps", () => {
      render(<Header {...defaultProps} />);

      expect(mockGetHeaderProps).toHaveBeenCalled();
    });

    it("spreads header props correctly", () => {
      const customGetHeaderProps = vi.fn(() => ({
        key: "custom-key",
        "data-testid": "custom-header",
        className: "custom-class",
      }));

      const customColumn = {
        ...defaultColumn,
        getHeaderProps: customGetHeaderProps,
      };

      const { container } = render(<Header column={customColumn} />);

      const headerElement = container.querySelector('[data-testid="custom-header"]');
      expect(headerElement).toBeInTheDocument();
    });
  });

  describe("Layout", () => {
    it("uses flex layout for inner content", () => {
      const { container } = render(<Header {...defaultProps} />);

      const flexElement = container.querySelector(".flex");
      expect(flexElement).toBeInTheDocument();
      expect(flexElement).toHaveClass("items-center");
    });

    it("applies padding to inner content", () => {
      const { container } = render(<Header {...defaultProps} />);

      const paddedElement = container.querySelector(".p-3");
      expect(paddedElement).toBeInTheDocument();
    });

    it("applies full width to inner content", () => {
      const { container } = render(<Header {...defaultProps} />);

      const innerContent = container.querySelector(".w-full");
      expect(innerContent).toBeInTheDocument();
    });
  });

  describe("Relative Positioning", () => {
    it("applies relative positioning to container", () => {
      const { container } = render(<Header {...defaultProps} />);

      const relativeElement = container.querySelector(".relative");
      expect(relativeElement).toBeInTheDocument();
    });
  });

  describe("Multiple Headers", () => {
    it("renders first header with left border", () => {
      const { container: container1 } = render(
        <Header column={{ ...defaultColumn, headerIndex: 0 }} />,
      );

      expect(container1.querySelector(".border-l-1")).toBeInTheDocument();
    });

    it("renders second header without left border", () => {
      const { container: container2 } = render(
        <Header column={{ ...defaultColumn, headerIndex: 1, label: "Second Column" }} />,
      );

      expect(container2.querySelector(".border-l-0")).toBeInTheDocument();
    });

    it("renders third header without left border", () => {
      const { container: container3 } = render(
        <Header column={{ ...defaultColumn, headerIndex: 2, label: "Third Column" }} />,
      );

      expect(container3.querySelector(".border-l-0")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles very long label gracefully", () => {
      const veryLongLabel = "Very Long Header Label ".repeat(20);
      const longLabelColumn = { ...defaultColumn, label: veryLongLabel };
      const { container } = render(<Header column={longLabelColumn} />);

      const truncatedElement = container.querySelector(".truncate");
      expect(truncatedElement).toBeInTheDocument();
      expect(truncatedElement?.textContent).toBe(veryLongLabel);
    });

    it("handles numeric labels", () => {
      const numericColumn = { ...defaultColumn, label: "123" };
      render(<Header column={numericColumn} />);

      expect(screen.getByText("123")).toBeInTheDocument();
    });

    it("handles labels with whitespace", () => {
      const whitespaceColumn = { ...defaultColumn, label: "  Spaces  " };
      render(<Header column={whitespaceColumn} />);

      expect(screen.getByText(/Spaces/)).toBeInTheDocument();
    });

    it("handles negative headerIndex", () => {
      const negativeIndexColumn = { ...defaultColumn, headerIndex: -1 };
      const { container } = render(<Header column={negativeIndexColumn} />);

      // Negative index should not equal 0, so border-l-0 should be applied
      expect(container.querySelector(".border-l-0")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("maintains semantic structure", () => {
      const { container } = render(<Header {...defaultProps} />);

      const headerElement = container.querySelector('[role="columnheader"]');
      expect(headerElement).toBeInTheDocument();
    });

    it("maintains separator role for resizer", () => {
      const { container } = render(<Header {...defaultProps} />);

      const separator = container.querySelector('[role="separator"]');
      expect(separator).toBeInTheDocument();
      expect(separator).toHaveAttribute("aria-orientation", "vertical");
    });
  });
});
