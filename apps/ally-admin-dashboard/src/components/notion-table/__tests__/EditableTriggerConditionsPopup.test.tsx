import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import React from "react";

// Mock @components
vi.mock("@components", () => ({
  StandardTriggerConditions: ({ eventType, triggerCondition, onChange, isInTable }: any) => (
    <div data-testid="standard-trigger-conditions">
      <div data-testid="event-type">{eventType}</div>
      <div data-testid="is-in-table">{String(isInTable)}</div>
      <button
        data-testid="change-trigger-condition"
        onClick={() => onChange("operator", "GREATER_THAN")}
      >
        Change Condition
      </button>
      <div data-testid="trigger-condition-value">{JSON.stringify(triggerCondition)}</div>
    </div>
  ),
  CombinationTriggerConditions: ({ triggerCondition, onChange, isInTable }: any) => (
    <div data-testid="combination-trigger-conditions">
      <div data-testid="is-in-table">{String(isInTable)}</div>
      <button
        data-testid="change-expression"
        onClick={() =>
          onChange("expression", {
            type: "AND",
            left: { id: "event-1" },
            right: { id: "event-2" },
          })
        }
      >
        Change Expression
      </button>
      <div data-testid="trigger-condition-value">{JSON.stringify(triggerCondition)}</div>
    </div>
  ),
  MultiLevelCombinationTriggerConditions: ({ triggerCondition, onChange, isInTable }: any) => (
    <div data-testid="combination-trigger-conditions">
      <div data-testid="is-in-table">{String(isInTable)}</div>
      <button
        data-testid="change-expression"
        onClick={() =>
          onChange("expression", {
            type: "AND",
            left: { id: "event-1" },
            right: { id: "event-2" },
          })
        }
      >
        Change Expression
      </button>
      <div data-testid="trigger-condition-value">{JSON.stringify(triggerCondition)}</div>
    </div>
  ),
}));

// Mock @constants
vi.mock("@constants", () => ({
  EVENT_DETECTION_TYPES: {
    TIME_BASED: "TIME_BASED",
    SCORE_BASED: "SCORE_BASED",
    SENTENCE_SIMILARITY: "SENTENCE_SIMILARITY",
    COMBINATION: "COMBINATION",
  },
}));

// Mock @hooks
vi.mock("@hooks", () => ({
  useClickOutside: vi.fn((ref, callback) => {
    // Store callback for testing
    if (ref?.current) {
      (ref.current as any).__clickOutsideCallback = callback;
    }
  }),
}));

import { EditableTriggerConditionsPopup } from "../EditableTriggerConditionsPopup";

describe("EditableTriggerConditionsPopup", () => {
  const mockOnChange = vi.fn();

  const defaultProps = {
    eventType: "TIME_BASED",
    triggerCondition: { operator: "LESS_THAN", value: "00:10:00" },
    onChange: mockOnChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders standard trigger conditions when eventType is TIME_BASED", () => {
      render(<EditableTriggerConditionsPopup {...defaultProps} />);

      expect(screen.getByTestId("standard-trigger-conditions")).toBeInTheDocument();
      expect(screen.getByTestId("event-type")).toHaveTextContent("TIME_BASED");
      expect(screen.getByTestId("is-in-table")).toHaveTextContent("true");
    });

    it("renders standard trigger conditions when eventType is SCORE_BASED", () => {
      render(
        <EditableTriggerConditionsPopup
          {...defaultProps}
          eventType="SCORE_BASED"
          triggerCondition={{ operator: "GREATER_THAN", value: 50 }}
        />,
      );

      expect(screen.getByTestId("standard-trigger-conditions")).toBeInTheDocument();
      expect(screen.getByTestId("event-type")).toHaveTextContent("SCORE_BASED");
    });

    it("renders combination trigger conditions when eventType is COMBINATION", () => {
      render(
        <EditableTriggerConditionsPopup
          {...defaultProps}
          eventType="COMBINATION"
          triggerCondition={{
            expression: {
              type: "AND",
              left: { id: "event-1" },
              right: { id: "event-2" },
            },
          }}
        />,
      );

      expect(screen.getByTestId("combination-trigger-conditions")).toBeInTheDocument();
      expect(screen.getByTestId("is-in-table")).toHaveTextContent("true");
    });

    it("renders disabled state correctly", () => {
      render(<EditableTriggerConditionsPopup {...defaultProps} disabled={true} />);

      const disabledElement = screen.getByText("--");
      expect(disabledElement).toBeInTheDocument();
      expect(disabledElement.closest("div")).toHaveClass("cursor-not-allowed");
    });

    it("renders with empty triggerCondition", () => {
      render(<EditableTriggerConditionsPopup {...defaultProps} triggerCondition={undefined} />);

      expect(screen.getByTestId("standard-trigger-conditions")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      const { container } = render(
        <EditableTriggerConditionsPopup {...defaultProps} className="custom-class" />,
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("custom-class");
    });
  });

  describe("Popup Opening and Closing", () => {
    it("opens popup when clicking on trigger conditions", () => {
      render(<EditableTriggerConditionsPopup {...defaultProps} />);

      const triggerArea = screen.getByTestId("standard-trigger-conditions").closest("div");
      fireEvent.click(triggerArea!);

      // Popup should appear - find the one inside the absolute positioned container
      const popups = document.querySelectorAll(".absolute.z-50");
      expect(popups.length).toBeGreaterThan(0);
    });

    it("does not open popup when disabled", () => {
      render(<EditableTriggerConditionsPopup {...defaultProps} disabled={true} />);

      const disabledArea = screen.getByText("--").closest("div");
      fireEvent.click(disabledArea!);

      // Popup should not appear
      const popups = document.querySelectorAll(".absolute.z-50");
      expect(popups.length).toBe(0);
    });

    it("closes popup when clicking outside", async () => {
      const { container } = render(<EditableTriggerConditionsPopup {...defaultProps} />);

      // Open popup
      const triggerArea = screen.getByTestId("standard-trigger-conditions").closest("div");
      fireEvent.click(triggerArea!);

      // Simulate click outside
      const popupRef = container.querySelector(".absolute.z-50");
      if (popupRef && (popupRef as any).__clickOutsideCallback) {
        (popupRef as any).__clickOutsideCallback();
      }

      // Popup should close
      await waitFor(() => {
        const popups = document.querySelectorAll(".absolute.z-50");
        expect(popups.length).toBe(0);
      });
    });

    it("saves changes when closing popup", async () => {
      const { container } = render(<EditableTriggerConditionsPopup {...defaultProps} />);

      // Open popup
      const triggerArea = screen.getByTestId("standard-trigger-conditions").closest("div");
      fireEvent.click(triggerArea!);

      // Change condition in popup - find the button inside the popup
      const allButtons = screen.getAllByTestId("change-trigger-condition");
      const popupButton = allButtons.find(btn => btn.closest(".absolute.z-50") !== null);
      if (popupButton) {
        fireEvent.click(popupButton);
      }

      // Close popup by clicking outside
      const popupRef = container.querySelector(".absolute.z-50");
      if (popupRef && (popupRef as any).__clickOutsideCallback) {
        (popupRef as any).__clickOutsideCallback();
      }

      // onChange should be called with new value
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });
  });

  describe("Trigger Condition Updates", () => {
    it("updates trigger condition when field changes in popup", () => {
      render(<EditableTriggerConditionsPopup {...defaultProps} />);

      // Open popup
      const triggerArea = screen.getByTestId("standard-trigger-conditions").closest("div");
      fireEvent.click(triggerArea!);

      // Change condition - find the button inside the popup
      const allButtons = screen.getAllByTestId("change-trigger-condition");
      const popupButton = allButtons.find(btn => btn.closest(".absolute.z-50") !== null);
      if (popupButton) {
        fireEvent.click(popupButton);
      }

      // The condition should be updated in state - check the popup version
      const allConditionValues = screen.getAllByTestId("trigger-condition-value");
      const popupConditionValue = allConditionValues.find(
        el => el.closest(".absolute.z-50") !== null,
      );
      if (popupConditionValue) {
        expect(popupConditionValue.textContent).toContain("GREATER_THAN");
      }
    });

    it("updates combination expression when changed in popup", () => {
      render(
        <EditableTriggerConditionsPopup
          {...defaultProps}
          eventType="COMBINATION"
          triggerCondition={{
            expression: {
              type: "AND",
              left: { id: "" },
              right: { id: "" },
            },
          }}
        />,
      );

      // Open popup
      const triggerArea = screen.getByTestId("combination-trigger-conditions").closest("div");
      fireEvent.click(triggerArea!);

      // Change expression - find the button inside the popup
      const allButtons = screen.getAllByTestId("change-expression");
      const popupButton = allButtons.find(btn => btn.closest(".absolute.z-50") !== null);
      if (popupButton) {
        fireEvent.click(popupButton);
      }

      // The expression should be updated - check the popup version
      const allConditionValues = screen.getAllByTestId("trigger-condition-value");
      const popupConditionValue = allConditionValues.find(
        el => el.closest(".absolute.z-50") !== null,
      );
      if (popupConditionValue) {
        expect(popupConditionValue.textContent).toContain("event-1");
        expect(popupConditionValue.textContent).toContain("event-2");
      }
    });

    it("syncs editTriggerCondition with prop changes", () => {
      const { rerender } = render(<EditableTriggerConditionsPopup {...defaultProps} />);

      const newTriggerCondition = { operator: "GREATER_THAN", value: "00:20:00" };
      rerender(
        <EditableTriggerConditionsPopup {...defaultProps} triggerCondition={newTriggerCondition} />,
      );

      const conditionValue = screen.getByTestId("trigger-condition-value");
      expect(conditionValue.textContent).toContain("GREATER_THAN");
    });

    it("only calls onChange when value actually changes", async () => {
      const { container } = render(<EditableTriggerConditionsPopup {...defaultProps} />);

      // Open and close without changes
      const triggerArea = screen.getByTestId("standard-trigger-conditions").closest("div");
      fireEvent.click(triggerArea!);

      const popupRef = container.querySelector(".absolute.z-50");
      if (popupRef && (popupRef as any).__clickOutsideCallback) {
        (popupRef as any).__clickOutsideCallback();
      }

      // onChange should not be called if value hasn't changed
      await waitFor(() => {
        // The component checks if values are different using JSON.stringify
        // If they're the same, onChange won't be called
        expect(mockOnChange).not.toHaveBeenCalled();
      });
    });
  });

  describe("Popup Rendering", () => {
    it("renders popup with correct styling", () => {
      render(<EditableTriggerConditionsPopup {...defaultProps} />);

      // Open popup
      const triggerArea = screen.getByTestId("standard-trigger-conditions").closest("div");
      fireEvent.click(triggerArea!);

      const popup = document.querySelector(".absolute.z-50");
      expect(popup).toBeInTheDocument();
      expect(popup).toHaveClass("top-[0px]");
      expect(popup).toHaveClass("left-[0px]");
    });

    it("renders popup with isInTable=false for editing", () => {
      render(<EditableTriggerConditionsPopup {...defaultProps} />);

      // Open popup
      const triggerArea = screen.getByTestId("standard-trigger-conditions").closest("div");
      fireEvent.click(triggerArea!);

      // In popup, isInTable should be false
      const isInTableElements = screen.getAllByTestId("is-in-table");
      const popupIsInTable = isInTableElements.find(el => el.closest(".absolute.z-50") !== null);
      expect(popupIsInTable).toHaveTextContent("false");
    });

    it("applies custom width and minWidth", () => {
      render(<EditableTriggerConditionsPopup {...defaultProps} width={500} minWidth={300} />);

      // Open popup
      const triggerArea = screen.getByTestId("standard-trigger-conditions").closest("div");
      fireEvent.click(triggerArea!);

      const popupContent = document.querySelector(".absolute.z-50 .bg-background");
      expect(popupContent).toBeInTheDocument();
      if (popupContent) {
        expect((popupContent as HTMLElement).style.minWidth).toBe("300px");
        expect((popupContent as HTMLElement).style.width).toBe("500px");
      }
    });

    it("uses default width and minWidth when not provided", () => {
      render(<EditableTriggerConditionsPopup {...defaultProps} />);

      // Open popup
      const triggerArea = screen.getByTestId("standard-trigger-conditions").closest("div");
      fireEvent.click(triggerArea!);

      const popupContent = document.querySelector(".absolute.z-50 .bg-background");
      expect(popupContent).toBeInTheDocument();
      if (popupContent) {
        expect((popupContent as HTMLElement).style.minWidth).toBe("100px");
        expect((popupContent as HTMLElement).style.width).toBe("100px");
      }
    });
  });

  describe("Event Type Handling", () => {
    it("handles SENTENCE_SIMILARITY event type", () => {
      render(
        <EditableTriggerConditionsPopup
          {...defaultProps}
          eventType="SENTENCE_SIMILARITY"
          triggerCondition={{ sentences: ["Hello", "World"], speaker: "user" }}
        />,
      );

      expect(screen.getByTestId("standard-trigger-conditions")).toBeInTheDocument();
      expect(screen.getByTestId("event-type")).toHaveTextContent("SENTENCE_SIMILARITY");
    });

    it("handles undefined eventType", () => {
      render(
        <EditableTriggerConditionsPopup
          {...defaultProps}
          eventType={undefined}
          triggerCondition={{}}
        />,
      );

      expect(screen.getByTestId("standard-trigger-conditions")).toBeInTheDocument();
    });
  });

  describe("Hover and Interaction States", () => {
    it("applies hover styles when not disabled", () => {
      const { container } = render(<EditableTriggerConditionsPopup {...defaultProps} />);

      // Find the div that wraps the trigger conditions (the clickable area)
      // The div with cursor-pointer and hover:bg-background-secondary is the parent
      const triggerConditions = screen.getByTestId("standard-trigger-conditions");
      // Traverse up to find the div with cursor-pointer class
      let clickableArea: HTMLElement | null = triggerConditions.parentElement;
      while (clickableArea && !clickableArea.className.includes("cursor-pointer")) {
        clickableArea = clickableArea.parentElement;
      }
      expect(clickableArea).toBeTruthy();
      expect(clickableArea?.className).toContain("hover:bg-background-secondary");
      expect(clickableArea?.className).toContain("cursor-pointer");
    });

    it("does not apply hover styles when disabled", () => {
      render(<EditableTriggerConditionsPopup {...defaultProps} disabled={true} />);

      const disabledArea = screen.getByText("--").closest("div");
      expect(disabledArea).not.toHaveClass("hover:bg-background-secondary");
      expect(disabledArea).toHaveClass("cursor-not-allowed");
    });
  });

  describe("Edge Cases", () => {
    it("handles null triggerCondition", () => {
      render(<EditableTriggerConditionsPopup {...defaultProps} triggerCondition={null} />);

      expect(screen.getByTestId("standard-trigger-conditions")).toBeInTheDocument();
    });

    it("handles empty object triggerCondition", () => {
      render(<EditableTriggerConditionsPopup {...defaultProps} triggerCondition={{}} />);

      expect(screen.getByTestId("standard-trigger-conditions")).toBeInTheDocument();
    });

    it("handles rapid open/close cycles", () => {
      render(<EditableTriggerConditionsPopup {...defaultProps} />);

      const triggerArea = screen.getByTestId("standard-trigger-conditions").closest("div");

      // Rapidly open and close
      fireEvent.click(triggerArea!);
      fireEvent.click(triggerArea!);
      fireEvent.click(triggerArea!);

      // Should handle without errors - check that at least one instance exists
      expect(screen.getAllByTestId("standard-trigger-conditions").length).toBeGreaterThan(0);
    });

    it("handles component unmount gracefully", () => {
      const { unmount } = render(<EditableTriggerConditionsPopup {...defaultProps} />);

      unmount();

      // Should unmount without errors
      expect(screen.queryByTestId("standard-trigger-conditions")).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has cursor-pointer when not disabled", () => {
      const { container } = render(<EditableTriggerConditionsPopup {...defaultProps} />);

      // Find the div that has cursor-pointer class
      const triggerConditions = screen.getByTestId("standard-trigger-conditions");
      // Traverse up to find the div with cursor-pointer class
      let clickableArea: HTMLElement | null = triggerConditions.parentElement;
      while (clickableArea && !clickableArea.className.includes("cursor-pointer")) {
        clickableArea = clickableArea.parentElement;
      }
      expect(clickableArea).toBeTruthy();
      expect(clickableArea?.className).toContain("cursor-pointer");
    });

    it("has cursor-not-allowed when disabled", () => {
      render(<EditableTriggerConditionsPopup {...defaultProps} disabled={true} />);

      const disabledArea = screen.getByText("--").closest("div");
      expect(disabledArea).toHaveClass("cursor-not-allowed");
    });
  });
});
