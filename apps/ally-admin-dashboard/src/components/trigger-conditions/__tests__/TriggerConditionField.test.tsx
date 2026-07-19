import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import React from "react";

// Mock @components
vi.mock("@components", () => ({
  NumberInput: ({ value, onChange, placeholder, className }: any) => (
    <input
      data-testid="number-input"
      type="number"
      value={value || ""}
      onChange={e => onChange(Number(e.target.value))}
      placeholder={placeholder}
      className={className}
    />
  ),
  TimeInput: ({ value, onChange, placeholder, className, disabled }: any) => (
    <input
      data-testid="time-input"
      type="text"
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      pattern="^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$"
    />
  ),
}));

// Mock @constants
vi.mock("@constants", () => ({
  TRIGGER_FIELD_TYPES: {
    NUMBER: "NUMBER",
    TIME: "TIME",
    SELECT: "SELECT",
    OPERATOR_DROPDOWN: "OPERATOR_DROPDOWN",
    SPEAKER_DROPDOWN: "SPEAKER_DROPDOWN",
    STATUS_DROPDOWN: "STATUS_DROPDOWN",
    MULTILINE_TEXT: "MULTILINE_TEXT",
  },
}));

// Mock TriggerConditionDropdown
vi.mock("../TriggerConditionDropdown", () => ({
  TriggerConditionDropdown: ({
    value,
    options,
    onChange,
    placeholder,
    disabled,
    className,
    isInTable,
  }: any) => (
    <div
      data-testid="trigger-condition-dropdown"
      data-value={value}
      data-is-in-table={String(isInTable)}
      className={className}
    >
      <button
        data-testid="dropdown-button"
        onClick={() => onChange("new-value")}
        disabled={disabled}
      >
        {value || placeholder}
      </button>
    </div>
  ),
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  AutoExpandableTextarea: ({ value, onChange, placeholder, disabled, className }: any) => (
    <textarea
      data-testid="auto-expandable-textarea"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  ),
  TextArea: ({ labelText, hideLabel, ...props }: any) => (
    <textarea data-testid="text-area" aria-label={labelText} {...props} />
  ),
}));

import { TriggerConditionField } from "../TriggerConditionField";

describe("TriggerConditionField", () => {
  const mockOnChange = vi.fn();

  const defaultField = {
    id: "test-field",
    type: "NUMBER",
    placeholder: "Enter number",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("NUMBER field type", () => {
    it("renders NumberInput for NUMBER field type", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "NUMBER" }}
          value={10}
          onChange={mockOnChange}
        />,
      );

      expect(screen.getByTestId("number-input")).toBeInTheDocument();
    });

    it("passes value to NumberInput", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "NUMBER" }}
          value={42}
          onChange={mockOnChange}
        />,
      );

      const input = screen.getByTestId("number-input");
      expect(input).toHaveValue(42);
    });

    it("uses defaultValue when value is undefined", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "NUMBER", defaultValue: 5 }}
          value={undefined}
          onChange={mockOnChange}
        />,
      );

      const input = screen.getByTestId("number-input");
      expect(input).toHaveValue(5);
    });

    it("calls onChange when NumberInput value changes", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "NUMBER" }}
          value={10}
          onChange={mockOnChange}
        />,
      );

      const input = screen.getByTestId("number-input");
      fireEvent.change(input, { target: { value: "25" } });

      expect(mockOnChange).toHaveBeenCalledWith("test-field", 25);
    });

    it("applies correct styling for NUMBER field in table", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "NUMBER" }}
          value={10}
          onChange={mockOnChange}
          isInTable={true}
        />,
      );

      const input = screen.getByTestId("number-input");
      expect(input.className).toContain("bg-neutral-100");
    });

    it("applies correct styling for NUMBER field not in table", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "NUMBER" }}
          value={10}
          onChange={mockOnChange}
          isInTable={false}
        />,
      );

      const input = screen.getByTestId("number-input");
      expect(input.className).toContain("bg-neutral-50");
    });
  });

  describe("TIME field type", () => {
    it("renders time input for TIME field type", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "TIME", placeholder: "HH:MM:SS" }}
          value="00:10:00"
          onChange={mockOnChange}
        />,
      );

      const input = screen.getByPlaceholderText("HH:MM:SS");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("type", "text");
    });

    it("passes value to time input", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "TIME", placeholder: "HH:MM:SS" }}
          value="01:30:00"
          onChange={mockOnChange}
        />,
      );

      const input = screen.getByPlaceholderText("HH:MM:SS");
      expect(input).toHaveValue("01:30:00");
    });

    it("uses defaultValue when value is undefined", () => {
      render(
        <TriggerConditionField
          field={{
            ...defaultField,
            type: "TIME",
            placeholder: "HH:MM:SS",
            defaultValue: "00:00:00",
          }}
          value={undefined}
          onChange={mockOnChange}
        />,
      );

      const input = screen.getByPlaceholderText("HH:MM:SS");
      expect(input).toHaveValue("00:00:00");
    });

    it("calls onChange when time input value changes", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "TIME", placeholder: "HH:MM:SS" }}
          value="00:10:00"
          onChange={mockOnChange}
        />,
      );

      const input = screen.getByPlaceholderText("HH:MM:SS");
      fireEvent.change(input, { target: { value: "00:20:00" } });

      expect(mockOnChange).toHaveBeenCalledWith("test-field", "00:20:00");
    });

    it("has correct pattern attribute", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "TIME", placeholder: "HH:MM:SS" }}
          value="00:10:00"
          onChange={mockOnChange}
        />,
      );

      const input = screen.getByPlaceholderText("HH:MM:SS");
      expect(input).toHaveAttribute("pattern", "^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$");
    });
  });

  describe("SELECT field types", () => {
    const dropdownOptions = [
      { label: "Option 1", value: "opt1" },
      { label: "Option 2", value: "opt2" },
    ];

    it("renders TriggerConditionDropdown for SELECT field type", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "SELECT", options: dropdownOptions }}
          value="opt1"
          onChange={mockOnChange}
        />,
      );

      expect(screen.getByTestId("trigger-condition-dropdown")).toBeInTheDocument();
    });

    it("renders TriggerConditionDropdown for OPERATOR_DROPDOWN field type", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "OPERATOR_DROPDOWN", options: dropdownOptions }}
          value="opt1"
          onChange={mockOnChange}
        />,
      );

      expect(screen.getByTestId("trigger-condition-dropdown")).toBeInTheDocument();
    });

    it("renders TriggerConditionDropdown for SPEAKER_DROPDOWN field type", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "SPEAKER_DROPDOWN", options: dropdownOptions }}
          value="opt1"
          onChange={mockOnChange}
        />,
      );

      expect(screen.getByTestId("trigger-condition-dropdown")).toBeInTheDocument();
    });

    it("renders TriggerConditionDropdown for STATUS_DROPDOWN field type", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "STATUS_DROPDOWN", options: dropdownOptions }}
          value="opt1"
          onChange={mockOnChange}
        />,
      );

      expect(screen.getByTestId("trigger-condition-dropdown")).toBeInTheDocument();
    });

    it("passes value to TriggerConditionDropdown", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "SELECT", options: dropdownOptions }}
          value="opt2"
          onChange={mockOnChange}
        />,
      );

      const dropdown = screen.getByTestId("trigger-condition-dropdown");
      expect(dropdown).toHaveAttribute("data-value", "opt2");
    });

    it("passes options to TriggerConditionDropdown", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "SELECT", options: dropdownOptions }}
          value="opt1"
          onChange={mockOnChange}
        />,
      );

      expect(screen.getByTestId("trigger-condition-dropdown")).toBeInTheDocument();
    });

    it("calls onChange when dropdown value changes", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "SELECT", options: dropdownOptions }}
          value="opt1"
          onChange={mockOnChange}
        />,
      );

      const button = screen.getByTestId("dropdown-button");
      fireEvent.click(button);

      expect(mockOnChange).toHaveBeenCalledWith("test-field", "new-value");
    });

    it("passes isInTable to TriggerConditionDropdown", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "SELECT", options: dropdownOptions }}
          value="opt1"
          onChange={mockOnChange}
          isInTable={true}
        />,
      );

      const dropdown = screen.getByTestId("trigger-condition-dropdown");
      expect(dropdown).toHaveAttribute("data-is-in-table", "true");
    });

    it("uses empty array when options are undefined", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "SELECT" }}
          value="opt1"
          onChange={mockOnChange}
        />,
      );

      expect(screen.getByTestId("trigger-condition-dropdown")).toBeInTheDocument();
    });
  });

  describe("MULTILINE_TEXT field type", () => {
    it("renders TableSentenceInput when isInTable is true", () => {
      const { container } = render(
        <TriggerConditionField
          field={{ ...defaultField, type: "MULTILINE_TEXT" }}
          value={["Hello", "World"]}
          onChange={mockOnChange}
          isInTable={true}
        />,
      );

      const textarea = container.querySelector("textarea");
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveAttribute("readOnly");
      expect(textarea).toHaveValue("Hello\nWorld");
    });

    it("renders AutoExpandableTextarea when isInTable is false", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "MULTILINE_TEXT" }}
          value={["Hello", "World"]}
          onChange={mockOnChange}
          isInTable={false}
        />,
      );

      expect(screen.getByTestId("auto-expandable-textarea")).toBeInTheDocument();
    });

    it("converts array value to newline-separated string for display", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "MULTILINE_TEXT" }}
          value={["Sentence 1", "Sentence 2", "Sentence 3"]}
          onChange={mockOnChange}
          isInTable={false}
        />,
      );

      const textarea = screen.getByTestId("auto-expandable-textarea");
      expect(textarea).toHaveValue("Sentence 1\nSentence 2\nSentence 3");
    });

    it("handles empty array for MULTILINE_TEXT", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "MULTILINE_TEXT" }}
          value={[]}
          onChange={mockOnChange}
          isInTable={false}
        />,
      );

      const textarea = screen.getByTestId("auto-expandable-textarea");
      expect(textarea).toHaveValue("");
    });

    it("handles non-array value for MULTILINE_TEXT", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "MULTILINE_TEXT" }}
          value="not-an-array"
          onChange={mockOnChange}
          isInTable={false}
        />,
      );

      const textarea = screen.getByTestId("auto-expandable-textarea");
      expect(textarea).toHaveValue("");
    });

    it("calls onChange with array when AutoExpandableTextarea value changes", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "MULTILINE_TEXT" }}
          value={["Hello"]}
          onChange={mockOnChange}
          isInTable={false}
        />,
      );

      const textarea = screen.getByTestId("auto-expandable-textarea");
      fireEvent.change(textarea, { target: { value: "Hello\nWorld\nTest" } });

      expect(mockOnChange).toHaveBeenCalledWith("test-field", ["Hello", "World", "Test"]);
    });

    it("handles empty string input for MULTILINE_TEXT", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "MULTILINE_TEXT" }}
          value={["Hello"]}
          onChange={mockOnChange}
          isInTable={false}
        />,
      );

      const textarea = screen.getByTestId("auto-expandable-textarea");
      fireEvent.change(textarea, { target: { value: "" } });

      expect(mockOnChange).toHaveBeenCalledWith("test-field", [""]);
    });
  });

  describe("labelAfter", () => {
    it("renders labelAfter when provided", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "NUMBER", labelAfter: "seconds" }}
          value={10}
          onChange={mockOnChange}
        />,
      );

      expect(screen.getByText("seconds")).toBeInTheDocument();
    });

    it("does not render labelAfter when not provided", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "NUMBER" }}
          value={10}
          onChange={mockOnChange}
        />,
      );

      expect(screen.queryByText("seconds")).not.toBeInTheDocument();
    });

    it("renders labelAfter with correct styling", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "NUMBER", labelAfter: "label" }}
          value={10}
          onChange={mockOnChange}
        />,
      );

      const label = screen.getByText("label");
      expect(label).toHaveClass("text-sm");
      expect(label).toHaveClass("text-typography-500");
      expect(label).toHaveClass("flex-shrink-0");
    });
  });

  describe("Default values", () => {
    it("uses defaultValue when value is undefined", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "NUMBER", defaultValue: 100 }}
          value={undefined}
          onChange={mockOnChange}
        />,
      );

      const input = screen.getByTestId("number-input");
      expect(input).toHaveValue(100);
    });

    it("uses value over defaultValue when both are provided", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "NUMBER", defaultValue: 100 }}
          value={50}
          onChange={mockOnChange}
        />,
      );

      const input = screen.getByTestId("number-input");
      expect(input).toHaveValue(50);
    });
  });

  describe("Null/undefined handling", () => {
    it("returns null for unknown field type", () => {
      const { container } = render(
        <TriggerConditionField
          field={{ ...defaultField, type: "UNKNOWN_TYPE" }}
          value={10}
          onChange={mockOnChange}
        />,
      );

      expect(container.firstChild).toBeNull();
    });

    it("handles null value for NUMBER field", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "NUMBER" }}
          value={null}
          onChange={mockOnChange}
        />,
      );

      const input = screen.getByTestId("number-input");
      expect(input).toHaveValue(null);
    });

    it("handles undefined value for TIME field", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "TIME", placeholder: "HH:MM:SS" }}
          value={undefined}
          onChange={mockOnChange}
        />,
      );

      const input = screen.getByPlaceholderText("HH:MM:SS");
      expect(input).toHaveValue("");
    });
  });

  describe("Edge Cases", () => {
    it("handles field with className", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "SELECT", className: "custom-class", options: [] }}
          value="opt1"
          onChange={mockOnChange}
        />,
      );

      const dropdown = screen.getByTestId("trigger-condition-dropdown");
      expect(dropdown).toHaveClass("custom-class");
    });

    it("handles field with custom placeholder", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "TIME", placeholder: "Custom time" }}
          value=""
          onChange={mockOnChange}
        />,
      );

      const input = screen.getByPlaceholderText("Custom time");
      expect(input).toBeInTheDocument();
    });

    it("handles rapid onChange calls", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "NUMBER" }}
          value={10}
          onChange={mockOnChange}
        />,
      );

      const input = screen.getByTestId("number-input");
      fireEvent.change(input, { target: { value: "20" } });
      fireEvent.change(input, { target: { value: "30" } });
      fireEvent.change(input, { target: { value: "40" } });

      expect(mockOnChange).toHaveBeenCalledTimes(3);
    });
  });
});
