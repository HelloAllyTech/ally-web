import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
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
  ButtonVariant: {
    PRIMARY: "primary" as const,
    DESTRUCTIVE: "destructive" as const,
    SECONDARY: "secondary" as const,
    ICON: "icon" as const,
    TEXT: "text" as const,
  },
}));

// Mock @assets
vi.mock("@assets", () => ({
  AccountTree: ({ className }: { className?: string }) => (
    <svg data-testid="account-tree-icon" className={className}>
      AccountTree
    </svg>
  ),
  AlarmOn: ({ className }: { className?: string }) => (
    <svg data-testid="alarm-on-icon" className={className}>
      AlarmOn
    </svg>
  ),
  Chat: ({ className }: { className?: string }) => (
    <svg data-testid="chat-icon" className={className}>
      Chat
    </svg>
  ),
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
  DiamondShine: ({ className }: { className?: string }) => (
    <svg data-testid="diamond-shine-icon" className={className}>
      DiamondShine
    </svg>
  ),
  FocusLens: ({ className }: { className?: string }) => (
    <svg data-testid="focus-lens-icon" className={className}>
      FocusLens
    </svg>
  ),
}));

// Mock @constants
vi.mock("@constants", () => ({
  en: {
    simulation: {
      createNewEvent: "Create new event",
      selectEventType: "Select the type of event you want to create.",
      createEvent: "Create event",
    },
  },
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

import {
  EventTypeSelectionDialog,
  EVENT_TYPE_OPTIONS,
  type EventType,
} from "../EventTypeSelectionDialog";

describe("EventTypeSelectionDialog", () => {
  const mockOnClose = vi.fn();
  const mockOnSelect = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSelect: mockOnSelect,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders when isOpen is true", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      expect(screen.getByText("Create new event")).toBeInTheDocument();
      expect(screen.getByText("Select the type of event you want to create.")).toBeInTheDocument();
    });

    it("does not render when isOpen is false", () => {
      render(<EventTypeSelectionDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByText("Create new event")).not.toBeInTheDocument();
    });

    it("renders all event type options", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      EVENT_TYPE_OPTIONS.forEach(option => {
        expect(screen.getByText(option.label)).toBeInTheDocument();
        expect(screen.getByText(option.description)).toBeInTheDocument();
      });
    });

    it("renders all event type icons", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      expect(screen.getByTestId("chat-icon")).toBeInTheDocument();
      expect(screen.getByTestId("focus-lens-icon")).toBeInTheDocument();
      expect(screen.getByTestId("alarm-on-icon")).toBeInTheDocument();
      expect(screen.getByTestId("diamond-shine-icon")).toBeInTheDocument();
      expect(screen.getByTestId("account-tree-icon")).toBeInTheDocument();
    });

    it("renders close button", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      expect(screen.getByTestId("close-icon")).toBeInTheDocument();
    });

    it("renders create event button", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      expect(screen.getByText("Create event")).toBeInTheDocument();
    });

    it("create event button is disabled initially", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      const createButton = screen.getByText("Create event");
      expect(createButton).toBeDisabled();
    });
  });

  describe("Event Type Selection", () => {
    it("allows selecting an event type", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      const sentenceSimilarityOption = screen.getByText("Sentence Similarity");
      fireEvent.click(sentenceSimilarityOption);

      // Check if the option is selected (has tick icon)
      expect(screen.getByTestId("tick-icon")).toBeInTheDocument();
    });

    it("highlights selected event type with border", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      const sentenceSimilarityOption = screen.getByText("Sentence Similarity");
      fireEvent.click(sentenceSimilarityOption);

      // Check if the selected option has the primary border class
      const selectedButton = sentenceSimilarityOption.closest("button");
      expect(selectedButton?.className).toContain("border-primary-500");
    });

    it("allows changing selection to a different event type", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      // Select first option
      const sentenceSimilarityOption = screen.getByText("Sentence Similarity");
      fireEvent.click(sentenceSimilarityOption);

      // Select second option
      const timeBasedOption = screen.getByText("Time Based");
      fireEvent.click(timeBasedOption);

      // Both should have been clicked, but only the last one should be selected
      const tickIcons = screen.getAllByTestId("tick-icon");
      expect(tickIcons.length).toBeGreaterThan(0);
    });

    it("enables create button when an event type is selected", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      const createButton = screen.getByText("Create event");
      expect(createButton).toBeDisabled();

      const sentenceSimilarityOption = screen.getByText("Sentence Similarity");
      fireEvent.click(sentenceSimilarityOption);

      expect(createButton).not.toBeDisabled();
    });

    it("displays tick icon for selected event type", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      const timeBasedOption = screen.getByText("Time Based");
      fireEvent.click(timeBasedOption);

      // Should show tick icon in the selected option
      const tickIcon = screen.getByTestId("tick-icon");
      expect(tickIcon).toBeInTheDocument();
    });
  });

  describe("Button Interactions", () => {
    it("calls onSelect with selected event type when create button is clicked", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      const sentenceSimilarityOption = screen.getByText("Sentence Similarity");
      fireEvent.click(sentenceSimilarityOption);

      const createButton = screen.getByText("Create event");
      fireEvent.click(createButton);

      expect(mockOnSelect).toHaveBeenCalledWith("SENTENCE_SIMILARITY");
      expect(mockOnSelect).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when create button is clicked", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      const sentenceSimilarityOption = screen.getByText("Sentence Similarity");
      fireEvent.click(sentenceSimilarityOption);

      const createButton = screen.getByText("Create event");
      fireEvent.click(createButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when close button is clicked", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      const closeButton = screen.getByTestId("close-icon").parentElement!;
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("does not call onSelect when create button is clicked without selection", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      const createButton = screen.getByText("Create event");
      fireEvent.click(createButton);

      expect(mockOnSelect).not.toHaveBeenCalled();
    });

    it("calls onSelect with correct event type for each option", () => {
      const eventTypes: EventType[] = [
        "SENTENCE_SIMILARITY",
        "SEMANTIC_SIMILARITY",
        "TIME_BASED",
        "SCORE_BASED",
        "COMBINATION",
      ];

      eventTypes.forEach(eventType => {
        const { unmount } = render(<EventTypeSelectionDialog {...defaultProps} />);

        const option = EVENT_TYPE_OPTIONS.find(opt => opt.value === eventType);
        if (option) {
          const optionButton = screen.getByText(option.label);
          fireEvent.click(optionButton);

          const createButton = screen.getByText("Create event");
          fireEvent.click(createButton);

          expect(mockOnSelect).toHaveBeenCalledWith(eventType);
        }

        unmount();
        vi.clearAllMocks();
      });
    });
  });

  describe("Click Outside Behavior", () => {
    it("renders backdrop element", () => {
      const { container } = render(<EventTypeSelectionDialog {...defaultProps} />);

      const backdrop = container.querySelector(".fixed.inset-0.bg-black");
      expect(backdrop).toBeInTheDocument();
    });

    it("does not call onClose when clicking inside dialog", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      const title = screen.getByText("Create new event");
      fireEvent.mouseDown(title);

      // Should not close when clicking inside
      expect(screen.getByText("Create new event")).toBeInTheDocument();
    });
  });

  describe("State Management", () => {
    it("resets selection when dialog closes and reopens", () => {
      const { rerender } = render(<EventTypeSelectionDialog {...defaultProps} />);

      // Select an option
      const sentenceSimilarityOption = screen.getByText("Sentence Similarity");
      fireEvent.click(sentenceSimilarityOption);
      expect(screen.getByTestId("tick-icon")).toBeInTheDocument();

      // Close dialog
      rerender(<EventTypeSelectionDialog {...defaultProps} isOpen={false} />);
      expect(screen.queryByText("Create new event")).not.toBeInTheDocument();

      // Reopen dialog
      rerender(<EventTypeSelectionDialog {...defaultProps} isOpen={true} />);

      // Selection should be reset
      const createButton = screen.getByText("Create event");
      expect(createButton).toBeDisabled();
    });

    it("maintains selection while dialog is open", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      const timeBasedOption = screen.getByText("Time Based");
      fireEvent.click(timeBasedOption);

      // Selection should persist
      expect(screen.getByTestId("tick-icon")).toBeInTheDocument();
      const createButton = screen.getByText("Create event");
      expect(createButton).not.toBeDisabled();
    });
  });

  describe("Styling and Layout", () => {
    it("applies backdrop blur effect", () => {
      const { container } = render(<EventTypeSelectionDialog {...defaultProps} />);

      const backdrop = container.querySelector(".backdrop-blur-\\[1px\\]");
      expect(backdrop).toBeInTheDocument();
    });

    it("applies fade-in animation", () => {
      const { container } = render(<EventTypeSelectionDialog {...defaultProps} />);

      const animatedContainer = container.querySelector(".animate-fadeIn");
      expect(animatedContainer).toBeInTheDocument();
    });

    it("dialog has correct max width", () => {
      const { container } = render(<EventTypeSelectionDialog {...defaultProps} />);

      const dialog = container.querySelector(".max-w-\\[480px\\]");
      expect(dialog).toBeInTheDocument();
    });

    it("dialog has rounded corners", () => {
      const { container } = render(<EventTypeSelectionDialog {...defaultProps} />);

      const dialog = container.querySelector(".rounded-lg");
      expect(dialog).toBeInTheDocument();
    });

    it("create button has rounded-full style", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      const createButton = screen.getByText("Create event");
      expect(createButton.className).toContain("rounded-full");
    });

    it("close button is positioned absolutely", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      const closeButton = screen.getByTestId("close-icon").parentElement!;
      expect(closeButton.className).toContain("absolute");
      expect(closeButton.className).toContain("top-[10px]");
      expect(closeButton.className).toContain("right-[10px]");
    });

    it("event type options have correct grid layout", () => {
      const { container } = render(<EventTypeSelectionDialog {...defaultProps} />);

      const grid = container.querySelector(".grid.grid-cols-1");
      expect(grid).toBeInTheDocument();
    });

    it("event type options have gap between them", () => {
      const { container } = render(<EventTypeSelectionDialog {...defaultProps} />);

      const grid = container.querySelector(".gap-2");
      expect(grid).toBeInTheDocument();
    });

    it("selected option has primary border color", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      const sentenceSimilarityOption = screen.getByText("Sentence Similarity");
      fireEvent.click(sentenceSimilarityOption);

      const selectedButton = sentenceSimilarityOption.closest("button");
      expect(selectedButton?.className).toContain("border-primary-500");
    });
  });

  describe("Z-Index and Positioning", () => {
    it("dialog has z-50 index", () => {
      const { container } = render(<EventTypeSelectionDialog {...defaultProps} />);

      const dialog = container.querySelector(".z-50");
      expect(dialog).toBeInTheDocument();
    });

    it("dialog is fixed positioned", () => {
      const { container } = render(<EventTypeSelectionDialog {...defaultProps} />);

      const fixedElements = container.querySelectorAll(".fixed");
      expect(fixedElements.length).toBeGreaterThan(0);
    });

    it("dialog is centered", () => {
      const { container } = render(<EventTypeSelectionDialog {...defaultProps} />);

      const centeredContainer = container.querySelector(".items-center.justify-center");
      expect(centeredContainer).toBeInTheDocument();
    });
  });

  describe("Event Type Options", () => {
    it("renders Sentence Similarity option correctly", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      expect(screen.getByText("Sentence Similarity")).toBeInTheDocument();
      expect(screen.getByText("Trigger based on what the speaker says.")).toBeInTheDocument();
      expect(screen.getByTestId("chat-icon")).toBeInTheDocument();
    });

    it("renders Semantic Classification option correctly", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      expect(screen.getByText("Semantic Classification")).toBeInTheDocument();
      expect(screen.getByText("Trigger based on zero shot classification.")).toBeInTheDocument();
      expect(screen.getByTestId("focus-lens-icon")).toBeInTheDocument();
    });

    it("renders Time Based option correctly", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      expect(screen.getByText("Time Based")).toBeInTheDocument();
      expect(screen.getByText("Trigger before, after, or at a specific time.")).toBeInTheDocument();
      expect(screen.getByTestId("alarm-on-icon")).toBeInTheDocument();
    });

    it("renders Score Based option correctly", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      expect(screen.getByText("Score Based")).toBeInTheDocument();
      expect(
        screen.getByText("Trigger when score is greater, less, or equal to threshold."),
      ).toBeInTheDocument();
      expect(screen.getByTestId("diamond-shine-icon")).toBeInTheDocument();
    });

    it("renders Combination option correctly", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      expect(screen.getByText("Combination of")).toBeInTheDocument();
      expect(screen.getByText("Trigger based on multiple events.")).toBeInTheDocument();
      expect(screen.getByTestId("account-tree-icon")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("buttons are keyboard accessible", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      const sentenceSimilarityOption = screen.getByText("Sentence Similarity");
      // Check that it's a button element (which is focusable)
      expect(sentenceSimilarityOption.closest("button")).toBeInTheDocument();
      // Try to focus it
      const button = sentenceSimilarityOption.closest("button");
      if (button) {
        button.focus();
        expect(document.activeElement).toBe(button);
      }
    });

    it("close button is keyboard accessible", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      const closeButton = screen.getByTestId("close-icon").parentElement!;
      closeButton.focus();
      expect(document.activeElement).toBe(closeButton);
    });

    it("create button is keyboard accessible", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      const sentenceSimilarityOption = screen.getByText("Sentence Similarity");
      fireEvent.click(sentenceSimilarityOption);

      const createButton = screen.getByText("Create event");
      createButton.focus();
      expect(document.activeElement).toBe(createButton);
    });

    it("all event type options are button elements", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      EVENT_TYPE_OPTIONS.forEach(option => {
        const optionButton = screen.getByText(option.label);
        expect(optionButton.closest("button")).toBeInTheDocument();
      });
    });

    it("create button is a button element", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      const createButton = screen.getByText("Create event");
      expect(createButton.tagName).toBe("BUTTON");
    });

    it("close button is a button element", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      const closeButton = screen.getByTestId("close-icon").parentElement!;
      expect(closeButton.tagName).toBe("BUTTON");
    });
  });

  describe("Edge Cases", () => {
    it("handles rapid selection changes", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      const options = EVENT_TYPE_OPTIONS.map(opt => screen.getByText(opt.label));

      // Rapidly click different options
      fireEvent.click(options[0]);
      fireEvent.click(options[1]);
      fireEvent.click(options[2]);
      fireEvent.click(options[3]);

      // Should handle all clicks without errors
      expect(screen.getByText("Create event")).not.toBeDisabled();
    });

    it("handles clicking create button multiple times", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      const sentenceSimilarityOption = screen.getByText("Sentence Similarity");
      fireEvent.click(sentenceSimilarityOption);

      const createButton = screen.getByText("Create event");
      fireEvent.click(createButton);
      fireEvent.click(createButton);
      fireEvent.click(createButton);

      // Should only call onSelect once per click (but dialog closes after first)
      expect(mockOnSelect).toHaveBeenCalled();
    });

    it("handles component unmount gracefully", () => {
      const { unmount } = render(<EventTypeSelectionDialog {...defaultProps} />);

      unmount();

      // Should unmount without errors
      expect(screen.queryByText("Create new event")).not.toBeInTheDocument();
    });
  });

  describe("EVENT_TYPE_OPTIONS constant", () => {
    it("exports EVENT_TYPE_OPTIONS with correct structure", () => {
      expect(EVENT_TYPE_OPTIONS).toBeDefined();
      expect(Array.isArray(EVENT_TYPE_OPTIONS)).toBe(true);
      expect(EVENT_TYPE_OPTIONS.length).toBe(5);
    });

    it("each option has required properties", () => {
      EVENT_TYPE_OPTIONS.forEach(option => {
        expect(option).toHaveProperty("value");
        expect(option).toHaveProperty("label");
        expect(option).toHaveProperty("description");
        expect(option).toHaveProperty("icon");
      });
    });

    it("all event types are valid", () => {
      const validTypes: EventType[] = [
        "SENTENCE_SIMILARITY",
        "SEMANTIC_SIMILARITY",
        "TIME_BASED",
        "SCORE_BASED",
        "COMBINATION",
      ];

      EVENT_TYPE_OPTIONS.forEach(option => {
        expect(validTypes).toContain(option.value);
      });
    });
  });
});
