import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { TriggerConditionField } from "../TriggerConditionField";

vi.mock("@components", () => ({
  AutoExpandableTextarea: ({ value, onChange, placeholder, className, onBlur, onKeyDown }: any) => (
    <textarea
      data-testid="auto-textarea"
      value={value}
      placeholder={placeholder}
      className={className}
      onChange={e => onChange?.(e.target.value)}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    />
  ),
  NumberInput: ({ value, onChange, className }: any) => (
    <div data-testid="number-input">
      <input
        type="number"
        data-testid="number-input-field"
        value={value}
        onChange={e => onChange?.(Number(e.target.value))}
        className={className}
      />
    </div>
  ),
}));

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

vi.mock("../TriggerConditionDropdown", () => ({
  TriggerConditionDropdown: ({ value, options, onChange, placeholder, isInTable }: any) => (
    <div data-testid="trigger-dropdown">
      <span data-testid="dropdown-value">{value || placeholder}</span>
      <button
        data-testid="dropdown-change"
        onClick={() => {
          if (options && options.length > 0) {
            onChange(options[0].value);
          } else {
            onChange("new-value");
          }
        }}
      >
        Change
      </button>
      <span data-testid="dropdown-in-table">{String(isInTable)}</span>
    </div>
  ),
}));

describe("TriggerConditionField", () => {
  const defaultField = {
    id: "test-field",
    type: "SELECT",
    options: [
      { value: "option-1", label: "Option 1" },
      { value: "option-2", label: "Option 2" },
    ],
    placeholder: "Select option",
  };

  const defaultOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("returns null for unknown field type", () => {
      const { container } = render(
        <TriggerConditionField
          field={{ ...defaultField, type: "UNKNOWN" }}
          value=""
          onChange={defaultOnChange}
        />,
      );
      expect(container.firstChild).toBeNull();
    });

    it("renders SELECT field type", () => {
      render(
        <TriggerConditionField field={defaultField} value="option-1" onChange={defaultOnChange} />,
      );

      expect(screen.getByTestId("trigger-dropdown")).toBeInTheDocument();
      expect(screen.getByTestId("dropdown-value")).toHaveTextContent("option-1");
    });

    it("renders NUMBER field type", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "NUMBER" }}
          value={5}
          onChange={defaultOnChange}
        />,
      );

      expect(screen.getByTestId("number-input")).toBeInTheDocument();
      expect(screen.getByTestId("number-input-field")).toHaveValue(5);
    });

    it("renders TIME field type", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "TIME", placeholder: "00:20:00" }}
          value="00:30:00"
          onChange={defaultOnChange}
        />,
      );

      const input = screen.getByDisplayValue("00:30:00");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("type", "text");
    });

    it("renders MULTILINE_TEXT field type", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "MULTILINE_TEXT", placeholder: "Enter text" }}
          value={["Line 1", "Line 2"]}
          onChange={defaultOnChange}
        />,
      );

      expect(screen.getByTestId("auto-textarea")).toBeInTheDocument();
      expect(screen.getByTestId("auto-textarea")).toHaveValue("Line 1\nLine 2");
    });
  });

  describe("Field values", () => {
    it("uses defaultValue when value is undefined", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, defaultValue: "default-value" }}
          value={undefined}
          onChange={defaultOnChange}
        />,
      );

      expect(screen.getByTestId("dropdown-value")).toHaveTextContent("default-value");
    });

    it("uses value when provided", () => {
      render(
        <TriggerConditionField
          field={defaultField}
          value="provided-value"
          onChange={defaultOnChange}
        />,
      );

      expect(screen.getByTestId("dropdown-value")).toHaveTextContent("provided-value");
    });

    it("handles empty array for MULTILINE_TEXT", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "MULTILINE_TEXT" }}
          value={[]}
          onChange={defaultOnChange}
        />,
      );

      expect(screen.getByTestId("auto-textarea")).toHaveValue("");
    });

    it("handles non-array value for MULTILINE_TEXT", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "MULTILINE_TEXT" }}
          value="not-an-array"
          onChange={defaultOnChange}
        />,
      );

      expect(screen.getByTestId("auto-textarea")).toHaveValue("");
    });
  });

  describe("Event handling", () => {
    it("calls onChange when SELECT value changes", () => {
      const onChange = vi.fn();
      render(<TriggerConditionField field={defaultField} value="option-1" onChange={onChange} />);

      fireEvent.click(screen.getByTestId("dropdown-change"));
      expect(onChange).toHaveBeenCalledWith("test-field", "option-1");
    });

    it("calls onChange when NUMBER value changes", () => {
      const onChange = vi.fn();
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "NUMBER" }}
          value={5}
          onChange={onChange}
        />,
      );

      fireEvent.change(screen.getByTestId("number-input-field"), { target: { value: "10" } });
      expect(onChange).toHaveBeenCalledWith("test-field", 10);
    });

    it("calls onChange when TIME value changes", () => {
      const onChange = vi.fn();
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "TIME" }}
          value="00:20:00"
          onChange={onChange}
        />,
      );

      const input = screen.getByDisplayValue("00:20:00");
      fireEvent.change(input, { target: { value: "00:30:00" } });
      expect(onChange).toHaveBeenCalledWith("test-field", "00:30:00");
    });

    it("calls onChange when MULTILINE_TEXT value changes", () => {
      const onChange = vi.fn();
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "MULTILINE_TEXT" }}
          value={["Line 1"]}
          onChange={onChange}
        />,
      );

      const textarea = screen.getByTestId("auto-textarea");
      fireEvent.change(textarea, { target: { value: "Line 1\nLine 2" } });
      expect(onChange).toHaveBeenCalledWith("test-field", ["Line 1", "Line 2"]);
    });
  });

  describe("isInTable prop", () => {
    it("passes isInTable to dropdown when true", () => {
      render(
        <TriggerConditionField
          field={defaultField}
          value="option-1"
          onChange={defaultOnChange}
          isInTable={true}
        />,
      );

      expect(screen.getByTestId("dropdown-in-table")).toHaveTextContent("true");
    });

    it("passes isInTable to dropdown when false", () => {
      render(
        <TriggerConditionField
          field={defaultField}
          value="option-1"
          onChange={defaultOnChange}
          isInTable={false}
        />,
      );

      expect(screen.getByTestId("dropdown-in-table")).toHaveTextContent("false");
    });
  });

  describe("isFocused prop", () => {
    it("renders collapsed view when isFocused is false in table mode", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "MULTILINE_TEXT" }}
          value={["Line 1"]}
          onChange={defaultOnChange}
          isInTable={true}
          isFocused={false}
        />,
      );

      const textarea = screen.getByDisplayValue("Line 1");
      expect(textarea).toHaveAttribute("readOnly");
    });

    it("renders expanded view when isFocused is true in table mode", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "MULTILINE_TEXT" }}
          value={["Line 1"]}
          onChange={defaultOnChange}
          isInTable={true}
          isFocused={true}
        />,
      );

      expect(screen.getByTestId("auto-textarea")).toBeInTheDocument();
    });
  });

  describe("labelAfter prop", () => {
    it("renders labelAfter when provided", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, labelAfter: "seconds" }}
          value="option-1"
          onChange={defaultOnChange}
        />,
      );

      expect(screen.getByText("seconds")).toBeInTheDocument();
    });

    it("does not render labelAfter when not provided", () => {
      render(
        <TriggerConditionField field={defaultField} value="option-1" onChange={defaultOnChange} />,
      );

      expect(screen.queryByText("seconds")).not.toBeInTheDocument();
    });
  });

  describe("Dropdown field types", () => {
    it("renders OPERATOR_DROPDOWN field type", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "OPERATOR_DROPDOWN" }}
          value="option-1"
          onChange={defaultOnChange}
        />,
      );

      expect(screen.getByTestId("trigger-dropdown")).toBeInTheDocument();
    });

    it("renders SPEAKER_DROPDOWN field type", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "SPEAKER_DROPDOWN" }}
          value="option-1"
          onChange={defaultOnChange}
        />,
      );

      expect(screen.getByTestId("trigger-dropdown")).toBeInTheDocument();
    });

    it("renders STATUS_DROPDOWN field type", () => {
      render(
        <TriggerConditionField
          field={{ ...defaultField, type: "STATUS_DROPDOWN" }}
          value="option-1"
          onChange={defaultOnChange}
        />,
      );

      expect(screen.getByTestId("trigger-dropdown")).toBeInTheDocument();
    });
  });
});
