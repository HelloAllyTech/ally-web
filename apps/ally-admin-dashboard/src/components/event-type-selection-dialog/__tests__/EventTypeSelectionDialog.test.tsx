import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import React from "react";

// Mock OptionSelectionPopover
const mockOptionSelectionPopover = vi.fn();

vi.mock("@components", () => ({
  OptionSelectionPopover: (props: any) => {
    mockOptionSelectionPopover(props);
    if (!props.isOpen) return null;
    return (
      <div data-testid="option-selection-popover">
        <div data-testid="popover-title">{props.title}</div>
        <div data-testid="popover-description">{props.description}</div>
        <div data-testid="popover-button-text">{props.buttonText}</div>
        <button data-testid="close-button" onClick={props.onClose}>
          Close
        </button>
        <div data-testid="options-container">
          {props.options?.map((option: any) => (
            <button
              key={option.value}
              data-testid={`option-${option.value}`}
              onClick={() => props.onSelect(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    );
  },
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

import {
  EventTypeSelectionDialog,
  EVENT_TYPE_POPUP_OPTIONS,
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
    mockOptionSelectionPopover.mockClear();
  });

  describe("Rendering", () => {
    it("renders OptionSelectionPopover when isOpen is true", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      expect(screen.getByTestId("option-selection-popover")).toBeInTheDocument();
    });

    it("does not render OptionSelectionPopover when isOpen is false", () => {
      render(<EventTypeSelectionDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByTestId("option-selection-popover")).not.toBeInTheDocument();
    });
  });

  describe("Props Passing", () => {
    it("passes isOpen prop to OptionSelectionPopover", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      expect(mockOptionSelectionPopover).toHaveBeenCalledWith(
        expect.objectContaining({
          isOpen: true,
        }),
      );
    });

    it("passes onClose prop to OptionSelectionPopover", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      expect(mockOptionSelectionPopover).toHaveBeenCalledWith(
        expect.objectContaining({
          onClose: mockOnClose,
        }),
      );
    });

    it("passes onSelect prop to OptionSelectionPopover", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      expect(mockOptionSelectionPopover).toHaveBeenCalledWith(
        expect.objectContaining({
          onSelect: mockOnSelect,
        }),
      );
    });

    it("passes correct title to OptionSelectionPopover", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      expect(screen.getByTestId("popover-title")).toHaveTextContent("Create new event");
    });

    it("passes correct description to OptionSelectionPopover", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      expect(screen.getByTestId("popover-description")).toHaveTextContent(
        "Select the type of event you want to create.",
      );
    });

    it("passes correct buttonText to OptionSelectionPopover", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      expect(screen.getByTestId("popover-button-text")).toHaveTextContent("Create event");
    });

    it("passes EVENT_TYPE_POPUP_OPTIONS to OptionSelectionPopover", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      expect(mockOptionSelectionPopover).toHaveBeenCalledWith(
        expect.objectContaining({
          options: EVENT_TYPE_POPUP_OPTIONS,
        }),
      );
    });
  });

  describe("Callback Handling", () => {
    it("calls onClose when OptionSelectionPopover triggers onClose", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      const closeButton = screen.getByTestId("close-button");
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("calls onSelect when OptionSelectionPopover triggers onSelect with correct event type", () => {
      render(<EventTypeSelectionDialog {...defaultProps} />);

      const option = screen.getByTestId("option-SENTENCE_SIMILARITY");
      fireEvent.click(option);

      expect(mockOnSelect).toHaveBeenCalledWith("SENTENCE_SIMILARITY");
    });

    it("calls onSelect with each event type correctly", () => {
      const eventTypes: EventType[] = [
        "SENTENCE_SIMILARITY",
        "SEMANTIC_SIMILARITY",
        "BINARY_CLASSIFICATION",
        "TIME_BASED",
        "SCORE_BASED",
        "COMBINATION",
      ];

      eventTypes.forEach(eventType => {
        const { unmount } = render(<EventTypeSelectionDialog {...defaultProps} />);

        const option = screen.getByTestId(`option-${eventType}`);
        fireEvent.click(option);

        expect(mockOnSelect).toHaveBeenCalledWith(eventType);

        unmount();
        vi.clearAllMocks();
      });
    });
  });

  describe("EVENT_TYPE_POPUP_OPTIONS constant", () => {
    it("exports EVENT_TYPE_POPUP_OPTIONS with correct structure", () => {
      expect(EVENT_TYPE_POPUP_OPTIONS).toBeDefined();
      expect(Array.isArray(EVENT_TYPE_POPUP_OPTIONS)).toBe(true);
      expect(EVENT_TYPE_POPUP_OPTIONS.length).toBe(6);
    });

    it("each option has required properties", () => {
      EVENT_TYPE_POPUP_OPTIONS.forEach(option => {
        expect(option).toHaveProperty("value");
        expect(option).toHaveProperty("label");
        expect(option).toHaveProperty("description");
        expect(option).toHaveProperty("icon");
      });
    });

    it("contains all expected event types", () => {
      const expectedTypes: EventType[] = [
        "SENTENCE_SIMILARITY",
        "SEMANTIC_SIMILARITY",
        "BINARY_CLASSIFICATION",
        "TIME_BASED",
        "SCORE_BASED",
        "COMBINATION",
      ];

      const actualTypes = EVENT_TYPE_POPUP_OPTIONS.map(opt => opt.value);

      expectedTypes.forEach(type => {
        expect(actualTypes).toContain(type);
      });
    });

    it("has correct labels for each event type", () => {
      const expectedLabels: Record<EventType, string> = {
        SENTENCE_SIMILARITY: "Sentence Similarity",
        SEMANTIC_SIMILARITY: "Semantic Similarity",
        BINARY_CLASSIFICATION: "Binary Classification (Zero-shot)",
        TIME_BASED: "Time Based",
        SCORE_BASED: "Score Based",
        COMBINATION: "Combination of",
      };

      EVENT_TYPE_POPUP_OPTIONS.forEach(option => {
        expect(option.label).toBe(expectedLabels[option.value]);
      });
    });

    it("has correct descriptions for each event type", () => {
      const expectedDescriptions: Record<EventType, string> = {
        SENTENCE_SIMILARITY: "Trigger based on what the speaker says.",
        SEMANTIC_SIMILARITY: "Trigger based on similar meaning.",
        BINARY_CLASSIFICATION: "Trigger based on binary classification.",
        TIME_BASED: "Trigger before, after, or at a specific time.",
        SCORE_BASED: "Trigger when score is greater, less, or equal to threshold.",
        COMBINATION: "Trigger based on multiple events.",
      };

      EVENT_TYPE_POPUP_OPTIONS.forEach(option => {
        expect(option.description).toBe(expectedDescriptions[option.value]);
      });
    });

    it("each option has an icon component", () => {
      EVENT_TYPE_POPUP_OPTIONS.forEach(option => {
        expect(typeof option.icon).toBe("function");
      });
    });
  });

  describe("EventType type", () => {
    it("all event types are valid EventType", () => {
      const validTypes: EventType[] = [
        "SENTENCE_SIMILARITY",
        "SEMANTIC_SIMILARITY",
        "BINARY_CLASSIFICATION",
        "TIME_BASED",
        "SCORE_BASED",
        "COMBINATION",
      ];

      EVENT_TYPE_POPUP_OPTIONS.forEach(option => {
        expect(validTypes).toContain(option.value);
      });
    });
  });
});
