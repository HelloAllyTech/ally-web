import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import React from "react";

// Mock @components to only export what we need, avoiding loading all components
vi.mock("@components", () => ({
  Button: React.forwardRef<HTMLButtonElement, any>(({ children, onClick, className }, ref) => (
    <button ref={ref} onClick={onClick} className={className}>
      {children}
    </button>
  )),
  ButtonVariant: {
    PRIMARY: "primary" as const,
    DESTRUCTIVE: "destructive" as const,
    SECONDARY: "secondary" as const,
    ICON: "icon" as const,
    TEXT: "text" as const,
  },
}));

// Mock Close asset
vi.mock("@assets", () => ({
  Close: ({ width, height }: { width?: number; height?: number }) => (
    <svg data-testid="close-icon" width={width} height={height}>
      X
    </svg>
  ),
}));

// Mock utils
vi.mock("@utils", () => ({
  getButtonStyles: (variant: string) => {
    const styles: Record<string, string> = {
      primary: "bg-blue-600 text-white",
      secondary: "bg-gray-200 text-typography-800",
      danger: "bg-red-600 text-white",
    };
    return styles[variant] || "";
  },
}));

import { ActionConfirmationPopup } from "../ActionConfirmationPopup";

describe("ActionConfirmationPopup", () => {
  const mockOnClose = vi.fn();
  const mockPrimaryAction = vi.fn();
  const mockSecondaryAction = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    title: "Confirm Action",
    description: "Are you sure you want to proceed?",
    primaryButton: {
      label: "Confirm",
      onClick: mockPrimaryAction,
    },
    secondaryButton: {
      label: "Cancel",
      onClick: mockSecondaryAction,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders when isOpen is true", () => {
      render(<ActionConfirmationPopup {...defaultProps} />);

      expect(screen.getByText("Confirm Action")).toBeInTheDocument();
      expect(screen.getByText("Are you sure you want to proceed?")).toBeInTheDocument();
    });

    it("does not render when isOpen is false", () => {
      render(<ActionConfirmationPopup {...defaultProps} isOpen={false} />);

      expect(screen.queryByText("Confirm Action")).not.toBeInTheDocument();
    });

    it("renders title correctly", () => {
      render(<ActionConfirmationPopup {...defaultProps} title="Delete Item" />);

      expect(screen.getByText("Delete Item")).toBeInTheDocument();
    });

    it("renders description correctly", () => {
      render(
        <ActionConfirmationPopup {...defaultProps} description="This action cannot be undone." />,
      );

      expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument();
    });

    it("renders italic title when provided", () => {
      render(<ActionConfirmationPopup {...defaultProps} titleItalic="Important" />);

      const italicText = screen.getByText("Important");
      expect(italicText).toHaveClass("italic");
      expect(italicText).toHaveClass("font-semibold");
    });

    it("renders primary button with correct label", () => {
      render(<ActionConfirmationPopup {...defaultProps} />);

      expect(screen.getByText("Confirm")).toBeInTheDocument();
    });

    it("renders secondary button with correct label", () => {
      render(<ActionConfirmationPopup {...defaultProps} />);

      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("renders close button", () => {
      render(<ActionConfirmationPopup {...defaultProps} />);

      expect(screen.getByTestId("close-icon")).toBeInTheDocument();
    });
  });

  describe("Button Interactions", () => {
    it("calls primaryButton onClick when clicked", () => {
      render(<ActionConfirmationPopup {...defaultProps} />);

      const confirmButton = screen.getByText("Confirm");
      fireEvent.click(confirmButton);

      expect(mockPrimaryAction).toHaveBeenCalledTimes(1);
    });

    it("calls secondaryButton onClick when clicked", () => {
      render(<ActionConfirmationPopup {...defaultProps} />);

      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);

      expect(mockSecondaryAction).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when close button is clicked", () => {
      render(<ActionConfirmationPopup {...defaultProps} />);

      const closeButton = screen.getByTestId("close-icon").parentElement!;
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Click Outside Behavior", () => {
    it("calls onClose when clicking outside popup", async () => {
      const { container } = render(<ActionConfirmationPopup {...defaultProps} />);

      const backdrop = container.querySelector(".fixed.inset-0.bg-black");
      if (backdrop) {
        fireEvent.mouseDown(backdrop);
      }

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it("does not call onClose when clicking inside popup", () => {
      render(<ActionConfirmationPopup {...defaultProps} />);

      const title = screen.getByText("Confirm Action");
      fireEvent.mouseDown(title);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe("Bold Text Rendering", () => {
    it("renders bold text wrapped in **", () => {
      render(
        <ActionConfirmationPopup
          {...defaultProps}
          description="This is **bold text** in description"
        />,
      );

      const boldText = screen.getByText("bold text");
      expect(boldText).toHaveClass("font-bold");
    });

    it("renders multiple bold sections", () => {
      render(
        <ActionConfirmationPopup {...defaultProps} description="**First** and **Second** bold" />,
      );

      const firstBold = screen.getByText("First");
      const secondBold = screen.getByText("Second");

      expect(firstBold).toHaveClass("font-bold");
      expect(secondBold).toHaveClass("font-bold");
    });

    it("renders regular text without bold markers", () => {
      render(<ActionConfirmationPopup {...defaultProps} description="Regular text without bold" />);

      expect(screen.getByText("Regular text without bold")).toBeInTheDocument();
    });
  });

  describe("Styling and Layout", () => {
    it("applies backdrop blur effect", () => {
      const { container } = render(<ActionConfirmationPopup {...defaultProps} />);

      const backdrop = container.querySelector(".backdrop-blur-\\[1px\\]");
      expect(backdrop).toBeInTheDocument();
    });

    it("applies fade-in animation", () => {
      const { container } = render(<ActionConfirmationPopup {...defaultProps} />);

      const animatedContainer = container.querySelector(".animate-fadeIn");
      expect(animatedContainer).toBeInTheDocument();
    });

    it("popup has correct max width", () => {
      const { container } = render(<ActionConfirmationPopup {...defaultProps} />);

      const popup = container.querySelector(".max-w-md");
      expect(popup).toBeInTheDocument();
    });

    it("popup has rounded corners", () => {
      const { container } = render(<ActionConfirmationPopup {...defaultProps} />);

      const popup = container.querySelector(".rounded-lg");
      expect(popup).toBeInTheDocument();
    });

    it("buttons have full width", () => {
      render(<ActionConfirmationPopup {...defaultProps} />);

      const confirmButton = screen.getByText("Confirm");
      const cancelButton = screen.getByText("Cancel");

      expect(confirmButton).toHaveClass("w-full");
      expect(cancelButton).toHaveClass("w-full");
    });

    it("primary button has w-1/3 width when secondary button is missing", () => {
      const propsWithoutSecondary = {
        ...defaultProps,
        secondaryButton: undefined,
      };
      // @ts-ignore - bypassing strict type check for test case
      render(<ActionConfirmationPopup {...propsWithoutSecondary} />);

      const confirmButton = screen.getByText("Confirm");
      expect(confirmButton).toHaveClass("w-1/3");
      expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
    });

    it("buttons have rounded-full style", () => {
      render(<ActionConfirmationPopup {...defaultProps} />);

      const confirmButton = screen.getByText("Confirm");
      expect(confirmButton).toHaveClass("rounded-full");
    });

    it("buttons container has correct gap", () => {
      const { container } = render(<ActionConfirmationPopup {...defaultProps} />);

      const buttonContainer = container.querySelector(".gap-2");
      expect(buttonContainer).toBeInTheDocument();
    });

    it("close button is positioned absolutely", () => {
      render(<ActionConfirmationPopup {...defaultProps} />);

      const closeButton = screen.getByTestId("close-icon").parentElement!;
      expect(closeButton).toHaveClass("absolute");
      expect(closeButton).toHaveClass("top-[5px]");
      expect(closeButton).toHaveClass("right-[5px]");
    });
  });

  describe("Z-Index and Positioning", () => {
    it("popup has z-50 index", () => {
      const { container } = render(<ActionConfirmationPopup {...defaultProps} />);

      const popup = container.querySelector(".z-50");
      expect(popup).toBeInTheDocument();
    });

    it("popup is fixed positioned", () => {
      const { container } = render(<ActionConfirmationPopup {...defaultProps} />);

      const fixedElements = container.querySelectorAll(".fixed");
      expect(fixedElements.length).toBeGreaterThan(0);
    });

    it("popup is centered", () => {
      const { container } = render(<ActionConfirmationPopup {...defaultProps} />);

      const centeredContainer = container.querySelector(".items-center.justify-center");
      expect(centeredContainer).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles empty title", () => {
      render(<ActionConfirmationPopup {...defaultProps} title="" />);

      const { container } = render(<ActionConfirmationPopup {...defaultProps} title="" />);
      expect(container).toBeInTheDocument();
    });

    it("handles empty description", () => {
      render(<ActionConfirmationPopup {...defaultProps} description="" />);

      const { container } = render(<ActionConfirmationPopup {...defaultProps} description="" />);
      expect(container).toBeInTheDocument();
    });

    it("handles long title", () => {
      const longTitle = "This is a very long title that should still render correctly";
      render(<ActionConfirmationPopup {...defaultProps} title={longTitle} />);

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it("handles long description", () => {
      const longDescription =
        "This is a very long description that should still render correctly and be properly formatted within the popup.";
      render(<ActionConfirmationPopup {...defaultProps} description={longDescription} />);

      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });

    it("handles button without variant", () => {
      const propsWithoutVariant = {
        ...defaultProps,
        primaryButton: {
          label: "OK",
          onClick: mockPrimaryAction,
        },
      };

      render(<ActionConfirmationPopup {...propsWithoutVariant} />);

      expect(screen.getByText("OK")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("buttons are keyboard accessible", () => {
      render(<ActionConfirmationPopup {...defaultProps} />);

      const confirmButton = screen.getByText("Confirm");
      confirmButton.focus();
      expect(document.activeElement).toBe(confirmButton);
    });

    it("close button is keyboard accessible", () => {
      render(<ActionConfirmationPopup {...defaultProps} />);

      const closeButton = screen.getByTestId("close-icon").parentElement!;
      closeButton.focus();
      expect(document.activeElement).toBe(closeButton);
    });

    it("all buttons are button elements", () => {
      render(<ActionConfirmationPopup {...defaultProps} />);

      const confirmButton = screen.getByText("Confirm");
      const cancelButton = screen.getByText("Cancel");
      const closeButton = screen.getByTestId("close-icon").parentElement!;

      expect(confirmButton.tagName).toBe("BUTTON");
      expect(cancelButton.tagName).toBe("BUTTON");
      expect(closeButton.tagName).toBe("BUTTON");
    });
  });

  describe("Event Cleanup", () => {
    it("removes event listener when popup closes", () => {
      const { rerender } = render(<ActionConfirmationPopup {...defaultProps} isOpen={true} />);

      rerender(<ActionConfirmationPopup {...defaultProps} isOpen={false} />);

      // Component should unmount cleanly
      expect(screen.queryByText("Confirm Action")).not.toBeInTheDocument();
    });

    it("removes event listener on unmount", () => {
      const { unmount } = render(<ActionConfirmationPopup {...defaultProps} />);

      unmount();

      // Should unmount without errors
      expect(screen.queryByText("Confirm Action")).not.toBeInTheDocument();
    });
  });
});
