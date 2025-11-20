import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { StandardTriggerConditions } from "../StandardTriggerConditions";

vi.mock("@components", () => ({
  EventType: {
    TIME_BASED: "TIME_BASED",
    SCORE_BASED: "SCORE_BASED",
    SENTENCE_SIMILARITY: "SENTENCE_SIMILARITY",
  },
}));

vi.mock("@constants", () => ({
  EVENT_DETECTION_TYPES: {
    TIME_BASED: "TIME_BASED",
    SCORE_BASED: "SCORE_BASED",
    SENTENCE_SIMILARITY: "SENTENCE_SIMILARITY",
  },
  TRIGGER_FIELD_TYPES: {
    NUMBER: "NUMBER",
    TIME: "TIME",
    SELECT: "SELECT",
    MULTILINE_TEXT: "MULTILINE_TEXT",
  },
  getTriggerConditionConfig: vi.fn((eventType: string) => {
    if (eventType === "TIME_BASED") {
      return {
        fields: [
          {
            id: "operator",
            type: "OPERATOR_DROPDOWN",
            options: [
              { value: "LESS_THAN", label: "Less than" },
              { value: "GREATER_THAN", label: "Greater than" },
            ],
          },
          {
            id: "value",
            type: "TIME",
            placeholder: "00:20:00",
          },
        ],
      };
    }
    if (eventType === "SCORE_BASED") {
      return {
        fields: [
          {
            id: "operator",
            type: "OPERATOR_DROPDOWN",
            options: [
              { value: "LESS_THAN", label: "Less than" },
              { value: "GREATER_THAN", label: "Greater than" },
            ],
          },
          {
            id: "value",
            type: "NUMBER",
            defaultValue: 0,
          },
          {
            id: "speaker",
            type: "SPEAKER_DROPDOWN",
            options: [
              { value: "CARE_GIVER", label: "Care Giver" },
              { value: "CARE_SEEKER", label: "Care Seeker" },
            ],
          },
        ],
      };
    }
    if (eventType === "SENTENCE_SIMILARITY") {
      return {
        fields: [
          {
            id: "speaker",
            type: "SPEAKER_DROPDOWN",
            options: [
              { value: "CARE_GIVER", label: "Care Giver" },
              { value: "CARE_SEEKER", label: "Care Seeker" },
            ],
          },
          {
            id: "sentences",
            type: "MULTILINE_TEXT",
            placeholder: "Enter sentences",
          },
        ],
      };
    }
    return null;
  }),
}));

vi.mock("../TriggerConditionField", () => ({
  TriggerConditionField: ({ field, value, onChange, isInTable, isFocused }: any) => (
    <div data-testid={`field-${field.id}`}>
      <span data-testid={`field-type-${field.id}`}>{field.type}</span>
      <span data-testid={`field-value-${field.id}`}>{String(value ?? "")}</span>
      <button
        data-testid={`field-change-${field.id}`}
        onClick={() => onChange(field.id, "new-value")}
      >
        Change
      </button>
      <span data-testid={`field-in-table-${field.id}`}>{String(isInTable)}</span>
      <span data-testid={`field-focused-${field.id}`}>{String(isFocused)}</span>
    </div>
  ),
}));

describe("StandardTriggerConditions", () => {
  const defaultOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("returns null when config is not found", () => {
      const { container } = render(
        <StandardTriggerConditions
          eventType="UNKNOWN_TYPE"
          triggerCondition={{}}
          onChange={defaultOnChange}
        />,
      );
      expect(container.firstChild).toBeNull();
    });

    it("renders TIME_BASED trigger conditions", () => {
      render(
        <StandardTriggerConditions
          eventType="TIME_BASED"
          triggerCondition={{ operator: "LESS_THAN", value: "00:20:00" }}
          onChange={defaultOnChange}
        />,
      );

      expect(screen.getByTestId("field-operator")).toBeInTheDocument();
      expect(screen.getByTestId("field-value")).toBeInTheDocument();
      expect(screen.getByText("if")).toBeInTheDocument();
      expect(screen.getByText("Time")).toBeInTheDocument();
    });

    it("renders SCORE_BASED trigger conditions", () => {
      render(
        <StandardTriggerConditions
          eventType="SCORE_BASED"
          triggerCondition={{ operator: "GREATER_THAN", value: 5, speaker: "CARE_GIVER" }}
          onChange={defaultOnChange}
        />,
      );

      expect(screen.getByTestId("field-operator")).toBeInTheDocument();
      expect(screen.getByTestId("field-value")).toBeInTheDocument();
      expect(screen.getByTestId("field-speaker")).toBeInTheDocument();
      expect(screen.getByText("if")).toBeInTheDocument();
    });

    it("renders SENTENCE_SIMILARITY trigger conditions", () => {
      render(
        <StandardTriggerConditions
          eventType="SENTENCE_SIMILARITY"
          triggerCondition={{ speaker: "CARE_GIVER", sentences: ["Sentence 1"] }}
          onChange={defaultOnChange}
        />,
      );

      expect(screen.getByTestId("field-speaker")).toBeInTheDocument();
      expect(screen.getByTestId("field-sentences")).toBeInTheDocument();
      expect(screen.getByText("if")).toBeInTheDocument();
    });
  });

  describe("Field values", () => {
    it("passes correct values to fields", () => {
      render(
        <StandardTriggerConditions
          eventType="TIME_BASED"
          triggerCondition={{ operator: "LESS_THAN", value: "00:30:00" }}
          onChange={defaultOnChange}
        />,
      );

      expect(screen.getByTestId("field-value-operator")).toHaveTextContent("LESS_THAN");
      expect(screen.getByTestId("field-value-value")).toHaveTextContent("00:30:00");
    });

    it("handles undefined trigger condition values", () => {
      render(
        <StandardTriggerConditions
          eventType="TIME_BASED"
          triggerCondition={{}}
          onChange={defaultOnChange}
        />,
      );

      expect(screen.getByTestId("field-operator")).toBeInTheDocument();
      expect(screen.getByTestId("field-value")).toBeInTheDocument();
    });
  });

  describe("Event handling", () => {
    it("calls onChange when field value changes", () => {
      const onChange = vi.fn();
      render(
        <StandardTriggerConditions
          eventType="TIME_BASED"
          triggerCondition={{ operator: "LESS_THAN", value: "00:20:00" }}
          onChange={onChange}
        />,
      );

      fireEvent.click(screen.getByTestId("field-change-operator"));
      expect(onChange).toHaveBeenCalledWith("operator", "new-value");
    });
  });

  describe("isInTable prop", () => {
    it("passes isInTable to fields when true", () => {
      render(
        <StandardTriggerConditions
          eventType="TIME_BASED"
          triggerCondition={{ operator: "LESS_THAN", value: "00:20:00" }}
          onChange={defaultOnChange}
          isInTable={true}
        />,
      );

      expect(screen.getByTestId("field-in-table-operator")).toHaveTextContent("true");
      expect(screen.getByTestId("field-in-table-value")).toHaveTextContent("true");
    });

    it("passes isInTable to fields when false", () => {
      render(
        <StandardTriggerConditions
          eventType="TIME_BASED"
          triggerCondition={{ operator: "LESS_THAN", value: "00:20:00" }}
          onChange={defaultOnChange}
          isInTable={false}
        />,
      );

      expect(screen.getByTestId("field-in-table-operator")).toHaveTextContent("false");
      expect(screen.getByTestId("field-in-table-value")).toHaveTextContent("false");
    });
  });

  describe("isFocused prop", () => {
    it("passes isFocused to fields when true", () => {
      render(
        <StandardTriggerConditions
          eventType="SENTENCE_SIMILARITY"
          triggerCondition={{ speaker: "CARE_GIVER", sentences: [] }}
          onChange={defaultOnChange}
          isFocused={true}
        />,
      );

      expect(screen.getByTestId("field-focused-sentences")).toHaveTextContent("true");
    });

    it("passes isFocused to fields when false", () => {
      render(
        <StandardTriggerConditions
          eventType="SENTENCE_SIMILARITY"
          triggerCondition={{ speaker: "CARE_GIVER", sentences: [] }}
          onChange={defaultOnChange}
          isFocused={false}
        />,
      );

      expect(screen.getByTestId("field-focused-sentences")).toHaveTextContent("false");
    });
  });

  describe("SENTENCE_SIMILARITY layout", () => {
    it("renders speaker field before sentences field", () => {
      const { container } = render(
        <StandardTriggerConditions
          eventType="SENTENCE_SIMILARITY"
          triggerCondition={{ speaker: "CARE_GIVER", sentences: [] }}
          onChange={defaultOnChange}
        />,
      );

      const fields = container.querySelectorAll('[data-testid^="field-"]');
      const speakerIndex = Array.from(fields).findIndex(
        el => el.getAttribute("data-testid") === "field-speaker",
      );
      const sentencesIndex = Array.from(fields).findIndex(
        el => el.getAttribute("data-testid") === "field-sentences",
      );

      expect(speakerIndex).toBeLessThan(sentencesIndex);
    });
  });
});
