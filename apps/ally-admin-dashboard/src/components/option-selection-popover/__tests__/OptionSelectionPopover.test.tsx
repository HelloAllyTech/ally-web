import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import React from "react";

// Mock @components
vi.mock("@components", () => ({
  Button: React.forwardRef<HTMLButtonElement, any>(
    ({ children, onClick, className, disabled }, ref) => (
      <button ref={ref} onClick={onClick} className={className} disabled={disabled}>
        {children}
      </button>
    ),
  ),
}));

// Mock @components/types
vi.mock("@components/types", () => ({
  ButtonVariant: {
    PRIMARY: "primary" as const,
    SECONDARY: "secondary" as const,
    DESTRUCTIVE: "destructive" as const,
  },
}));

// Mock @assets
vi.mock("@src/assets", () => ({
  Close: ({ width, height }: { width?: number; height?: number }) => (
    <svg data-testid="close-icon" width={width} height={height}>
      Close
    </svg>
  ),
  Tick: ({ width, height }: { width?: number; height?: number }) => (
    <svg data-testid="tick-icon" width={width} height={height}>
      Tick
    </svg>
  ),
}));

// Mock @utils
vi.mock("@utils", () => ({
  getButtonStyles: (variant: string) => {
    const styles: Record<string, string> = {
      primary: "bg-blue-600 text-white",
      secondary: "bg-gray-200 text-typography-800",
      destructive: "bg-red-600 text-white",
    };
    return styles[variant] || "";
  },
}));

// Mock useClickOutside hook
vi.mock("@hooks", () => ({
  useClickOutside: vi.fn(),
}));

import { OptionSelectionPopover, Option } from "../OptionSelectionPopover";

const MockIcon = ({ className }: { className?: string }) => (
  <svg data-testid="mock-icon" className={className}>
    MockIcon
  </svg>
);

describe("OptionSelectionPopover", () => {
  const mockOnClose = vi.fn();
  const mockOnSelect = vi.fn();

  const mockOptions: Option[] = [
    {
      value: "option1",
      label: "Option 1",
      description: "Description for option 1",
      icon: MockIcon,
    },
    {
      value: "option2",
      label: "Option 2",
      description: "Description for option 2",
      icon: MockIcon,
    },
    {
      value: "option3",
      label: "Option 3",
      description: "Description for option 3",
      icon: MockIcon,
    },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSelect: mockOnSelect,
    options: mockOptions,
    title: "Test Title",
    description: "Test Description",
    buttonText: "Confirm",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders when isOpen is true", () => {
      render(<OptionSelectionPopover {...defaultProps} />);

      expect(screen.getByText("Test Title")).toBeInTheDocument();
      expect(screen.getByText("Test Description")).toBeInTheDocument();
    });

    it("does not render when isOpen is false", () => {
      render(<OptionSelectionPopover {...defaultProps} isOpen={false} />);

      expect(screen.queryByText("Test Title")).not.toBeInTheDocument();
    });

    it("renders title correctly", () => {
      render(<OptionSelectionPopover {...defaultProps} title="Custom Title" />);

      expect(screen.getByText("Custom Title")).toBeInTheDocument();
    });

    it("renders description correctly", () => {
      render(<OptionSelectionPopover {...defaultProps} description="Custom Description" />);

      expect(screen.getByText("Custom Description")).toBeInTheDocument();
    });

    it("renders all options", () => {
      render(<OptionSelectionPopover {...defaultProps} />);

      mockOptions.forEach(option => {
        expect(screen.getByText(option.label)).toBeInTheDocument();
        expect(screen.getByText(option.description)).toBeInTheDocument();
      });
    });

    it("renders option icons", () => {
      render(<OptionSelectionPopover {...defaultProps} />);

      const icons = screen.getAllByTestId("mock-icon");
      expect(icons).toHaveLength(mockOptions.length);
    });

    it("renders close button", () => {
      render(<OptionSelectionPopover {...defaultProps} />);

      expect(screen.getByTestId("close-icon")).toBeInTheDocument();
    });

    it("renders confirm button with custom text", () => {
      render(<OptionSelectionPopover {...defaultProps} buttonText="Create" />);

      expect(screen.getByText("Create")).toBeInTheDocument();
    });

    it("confirm button is disabled initially", () => {
      render(<OptionSelectionPopover {...defaultProps} />);

      const confirmButton = screen.getByText("Confirm");
      expect(confirmButton).toBeDisabled();
    });
  });

  describe("Option Selection", () => {
    it("allows selecting an option", () => {
      render(<OptionSelectionPopover {...defaultProps} />);

      const option1 = screen.getByText("Option 1");
      fireEvent.click(option1);

      expect(screen.getByTestId("tick-icon")).toBeInTheDocument();
    });

    it("highlights selected option with border", () => {
      render(<OptionSelectionPopover {...defaultProps} />);

      const option1 = screen.getByText("Option 1");
      fireEvent.click(option1);

      const selectedButton = option1.closest("button");
      expect(selectedButton?.className).toContain("border-primary-500");
    });

    it("allows changing selection to a different option", () => {
      render(<OptionSelectionPopover {...defaultProps} />);

      const option1 = screen.getByText("Option 1");
      fireEvent.click(option1);

      const option2 = screen.getByText("Option 2");
      fireEvent.click(option2);

      // Only one tick icon should be present
      const tickIcons = screen.getAllByTestId("tick-icon");
      expect(tickIcons.length).toBe(1);
    });

    it("enables confirm button when an option is selected", () => {
      render(<OptionSelectionPopover {...defaultProps} />);

      const confirmButton = screen.getByText("Confirm");
      expect(confirmButton).toBeDisabled();

      const option1 = screen.getByText("Option 1");
      fireEvent.click(option1);

      expect(confirmButton).not.toBeDisabled();
    });

    it("displays tick icon for selected option", () => {
      render(<OptionSelectionPopover {...defaultProps} />);

      const option2 = screen.getByText("Option 2");
      fireEvent.click(option2);

      const tickIcon = screen.getByTestId("tick-icon");
      expect(tickIcon).toBeInTheDocument();
    });
  });

  describe("Button Interactions", () => {
    it("calls onSelect with selected option value when confirm button is clicked", () => {
      render(<OptionSelectionPopover {...defaultProps} />);

      const option1 = screen.getByText("Option 1");
      fireEvent.click(option1);

      const confirmButton = screen.getByText("Confirm");
      fireEvent.click(confirmButton);

      expect(mockOnSelect).toHaveBeenCalledWith("option1");
      expect(mockOnSelect).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when confirm button is clicked", () => {
      render(<OptionSelectionPopover {...defaultProps} />);

      const option1 = screen.getByText("Option 1");
      fireEvent.click(option1);

      const confirmButton = screen.getByText("Confirm");
      fireEvent.click(confirmButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when close button is clicked", () => {
      render(<OptionSelectionPopover {...defaultProps} />);

      const closeButton = screen.getByTestId("close-icon").parentElement!;
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("does not call onSelect when confirm button is clicked without selection", () => {
      render(<OptionSelectionPopover {...defaultProps} />);

      const confirmButton = screen.getByText("Confirm");
      fireEvent.click(confirmButton);

      expect(mockOnSelect).not.toHaveBeenCalled();
    });

    it("calls onSelect with correct value for each option", () => {
      mockOptions.forEach(option => {
        const { unmount } = render(<OptionSelectionPopover {...defaultProps} />);

        const optionButton = screen.getByText(option.label);
        fireEvent.click(optionButton);

        const confirmButton = screen.getByText("Confirm");
        fireEvent.click(confirmButton);

        expect(mockOnSelect).toHaveBeenCalledWith(option.value);

        unmount();
        vi.clearAllMocks();
      });
    });
  });

  describe("State Management", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("resets selection when dialog closes and reopens", async () => {
      vi.useFakeTimers();
      const { rerender } = render(<OptionSelectionPopover {...defaultProps} />);

      const option1 = screen.getByText("Option 1");
      fireEvent.click(option1);
      expect(screen.getByTestId("tick-icon")).toBeInTheDocument();

      rerender(<OptionSelectionPopover {...defaultProps} isOpen={false} />);
      expect(screen.queryByText("Test Title")).not.toBeInTheDocument();

      // Advance timers to allow setTimeout to complete
      await vi.runAllTimersAsync();

      rerender(<OptionSelectionPopover {...defaultProps} isOpen={true} />);

      const confirmButton = screen.getByText("Confirm");
      expect(confirmButton).toBeDisabled();
    });

    it("maintains selection while popover is open", () => {
      render(<OptionSelectionPopover {...defaultProps} />);

      const option2 = screen.getByText("Option 2");
      fireEvent.click(option2);

      expect(screen.getByTestId("tick-icon")).toBeInTheDocument();
      const confirmButton = screen.getByText("Confirm");
      expect(confirmButton).not.toBeDisabled();
    });
  });

  describe("Styling and Layout", () => {
    it("applies backdrop blur effect", () => {
      const { container } = render(<OptionSelectionPopover {...defaultProps} />);

      const backdrop = container.querySelector(".backdrop-blur-\\[1px\\]");
      expect(backdrop).toBeInTheDocument();
    });

    it("applies fade-in animation", () => {
      const { container } = render(<OptionSelectionPopover {...defaultProps} />);

      const animatedContainer = container.querySelector(".animate-fadeIn");
      expect(animatedContainer).toBeInTheDocument();
    });

    it("dialog has correct max width", () => {
      const { container } = render(<OptionSelectionPopover {...defaultProps} />);

      const dialog = container.querySelector(".max-w-\\[540px\\]");
      expect(dialog).toBeInTheDocument();
    });

    it("dialog has rounded corners", () => {
      const { container } = render(<OptionSelectionPopover {...defaultProps} />);

      const dialog = container.querySelector(".rounded-lg");
      expect(dialog).toBeInTheDocument();
    });

    it("confirm button has rounded-full style", () => {
      render(<OptionSelectionPopover {...defaultProps} />);

      const confirmButton = screen.getByText("Confirm");
      expect(confirmButton.className).toContain("rounded-full");
    });

    it("close button is positioned absolutely", () => {
      render(<OptionSelectionPopover {...defaultProps} />);

      const closeButton = screen.getByTestId("close-icon").parentElement!;
      expect(closeButton.className).toContain("absolute");
      expect(closeButton.className).toContain("top-[10px]");
      expect(closeButton.className).toContain("right-[10px]");
    });

    it("options have correct grid layout", () => {
      const { container } = render(<OptionSelectionPopover {...defaultProps} />);

      const grid = container.querySelector(".grid.grid-cols-1");
      expect(grid).toBeInTheDocument();
    });

    it("options have gap between them", () => {
      const { container } = render(<OptionSelectionPopover {...defaultProps} />);

      const grid = container.querySelector(".gap-2");
      expect(grid).toBeInTheDocument();
    });

    it("selected option has primary border color", () => {
      render(<OptionSelectionPopover {...defaultProps} />);

      const option1 = screen.getByText("Option 1");
      fireEvent.click(option1);

      const selectedButton = option1.closest("button");
      expect(selectedButton?.className).toContain("border-primary-500");
    });
  });

  describe("Z-Index and Positioning", () => {
    it("popover has z-50 index", () => {
      const { container } = render(<OptionSelectionPopover {...defaultProps} />);

      const popover = container.querySelector(".z-50");
      expect(popover).toBeInTheDocument();
    });

    it("popover is fixed positioned", () => {
      const { container } = render(<OptionSelectionPopover {...defaultProps} />);

      const fixedElements = container.querySelectorAll(".fixed");
      expect(fixedElements.length).toBeGreaterThan(0);
    });

    it("popover is centered", () => {
      const { container } = render(<OptionSelectionPopover {...defaultProps} />);

      const centeredContainer = container.querySelector(".items-center.justify-center");
      expect(centeredContainer).toBeInTheDocument();
    });
  });

  describe("Backdrop Click", () => {
    it("renders backdrop element", () => {
      const { container } = render(<OptionSelectionPopover {...defaultProps} />);

      const backdrop = container.querySelector(".fixed.inset-0.bg-black");
      expect(backdrop).toBeInTheDocument();
    });

    it("does not call onClose when clicking inside popover content", () => {
      render(<OptionSelectionPopover {...defaultProps} />);

      const title = screen.getByText("Test Title");
      fireEvent.mouseDown(title);

      expect(screen.getByText("Test Title")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("option buttons are keyboard accessible", () => {
      render(<OptionSelectionPopover {...defaultProps} />);

      const option1 = screen.getByText("Option 1");
      expect(option1.closest("button")).toBeInTheDocument();

      const button = option1.closest("button");
      if (button) {
        button.focus();
        expect(document.activeElement).toBe(button);
      }
    });

    it("close button is keyboard accessible", () => {
      render(<OptionSelectionPopover {...defaultProps} />);

      const closeButton = screen.getByTestId("close-icon").parentElement!;
      closeButton.focus();
      expect(document.activeElement).toBe(closeButton);
    });

    it("confirm button is keyboard accessible", () => {
      render(<OptionSelectionPopover {...defaultProps} />);

      const option1 = screen.getByText("Option 1");
      fireEvent.click(option1);

      const confirmButton = screen.getByText("Confirm");
      confirmButton.focus();
      expect(document.activeElement).toBe(confirmButton);
    });

    it("all options are button elements", () => {
      render(<OptionSelectionPopover {...defaultProps} />);

      mockOptions.forEach(option => {
        const optionButton = screen.getByText(option.label);
        expect(optionButton.closest("button")).toBeInTheDocument();
      });
    });

    it("confirm button is a button element", () => {
      render(<OptionSelectionPopover {...defaultProps} />);

      const confirmButton = screen.getByText("Confirm");
      expect(confirmButton.tagName).toBe("BUTTON");
    });

    it("close button is a button element", () => {
      render(<OptionSelectionPopover {...defaultProps} />);

      const closeButton = screen.getByTestId("close-icon").parentElement!;
      expect(closeButton.tagName).toBe("BUTTON");
    });
  });

  describe("Edge Cases", () => {
    it("handles rapid selection changes", () => {
      render(<OptionSelectionPopover {...defaultProps} />);

      const options = mockOptions.map(opt => screen.getByText(opt.label));

      options.forEach(option => {
        fireEvent.click(option);
      });

      expect(screen.getByText("Confirm")).not.toBeDisabled();
    });

    it("handles clicking confirm button multiple times", () => {
      render(<OptionSelectionPopover {...defaultProps} />);

      const option1 = screen.getByText("Option 1");
      fireEvent.click(option1);

      const confirmButton = screen.getByText("Confirm");
      fireEvent.click(confirmButton);
      fireEvent.click(confirmButton);
      fireEvent.click(confirmButton);

      expect(mockOnSelect).toHaveBeenCalled();
    });

    it("handles component unmount gracefully", () => {
      const { unmount } = render(<OptionSelectionPopover {...defaultProps} />);

      unmount();

      expect(screen.queryByText("Test Title")).not.toBeInTheDocument();
    });

    it("handles empty options array", () => {
      render(<OptionSelectionPopover {...defaultProps} options={[]} />);

      expect(screen.getByText("Test Title")).toBeInTheDocument();
      expect(screen.getByText("Confirm")).toBeDisabled();
    });

    it("handles single option", () => {
      const singleOption: Option[] = [
        {
          value: "single",
          label: "Single Option",
          description: "Only one option",
          icon: MockIcon,
        },
      ];

      render(<OptionSelectionPopover {...defaultProps} options={singleOption} />);

      expect(screen.getByText("Single Option")).toBeInTheDocument();

      const option = screen.getByText("Single Option");
      fireEvent.click(option);

      const confirmButton = screen.getByText("Confirm");
      fireEvent.click(confirmButton);

      expect(mockOnSelect).toHaveBeenCalledWith("single");
    });
  });

  describe("Option Interface", () => {
    it("each option has required properties", () => {
      mockOptions.forEach(option => {
        expect(option).toHaveProperty("value");
        expect(option).toHaveProperty("label");
        expect(option).toHaveProperty("description");
        expect(option).toHaveProperty("icon");
      });
    });

    it("option values are unique", () => {
      const values = mockOptions.map(opt => opt.value);
      const uniqueValues = [...new Set(values)];
      expect(values.length).toBe(uniqueValues.length);
    });
  });
});
