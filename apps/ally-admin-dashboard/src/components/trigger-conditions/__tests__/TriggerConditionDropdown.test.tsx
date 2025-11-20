import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { TriggerConditionDropdown } from "../TriggerConditionDropdown";

vi.mock("@components/notion-table", () => ({
  TextDropdown: ({
    value,
    displayValue,
    options,
    onChange,
    placeholder,
    searchPlaceholder,
    isSearchable,
    disabled,
    className,
  }: any) => (
    <div data-testid="text-dropdown">
      <button
        data-testid="dropdown-button"
        onClick={() => onChange("option-1")}
        disabled={disabled}
      >
        <span data-testid="dropdown-value">{displayValue || value || placeholder}</span>
      </button>
      <div data-testid="dropdown-options">
        {options?.map((option: any) => (
          <div key={option.value} data-testid={`option-${option.value}`}>
            {option.label}
          </div>
        ))}
      </div>
      <div data-testid="dropdown-props">
        <span data-testid="is-searchable">{String(isSearchable)}</span>
        <span data-testid="search-placeholder">{searchPlaceholder}</span>
        <span data-testid="dropdown-classname">{className}</span>
      </div>
    </div>
  ),
}));

vi.mock("@constants", () => ({
  en: {
    common: {
      select: "Select",
    },
  },
}));

describe("TriggerConditionDropdown", () => {
  const defaultProps = {
    value: "option-1",
    options: [
      { value: "option-1", label: "Option 1" },
      { value: "option-2", label: "Option 2" },
    ],
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders with value", () => {
      render(<TriggerConditionDropdown {...defaultProps} />);
      expect(screen.getByTestId("text-dropdown")).toBeInTheDocument();
    });

    it("passes value to TextDropdown", () => {
      render(<TriggerConditionDropdown {...defaultProps} value="option-2" />);
      expect(screen.getByTestId("dropdown-value")).toHaveTextContent("option-2");
    });

    it("passes displayValue to TextDropdown when provided", () => {
      render(<TriggerConditionDropdown {...defaultProps} displayValue="Display Value" />);
      expect(screen.getByTestId("dropdown-value")).toHaveTextContent("Display Value");
    });

    it("passes options to TextDropdown", () => {
      render(<TriggerConditionDropdown {...defaultProps} />);
      expect(screen.getByTestId("option-option-1")).toHaveTextContent("Option 1");
      expect(screen.getByTestId("option-option-2")).toHaveTextContent("Option 2");
    });

    it("uses default placeholder when not provided", () => {
      render(<TriggerConditionDropdown {...defaultProps} value="" />);
      expect(screen.getByTestId("dropdown-value")).toHaveTextContent("Select");
    });
  });

  describe("Props forwarding", () => {
    it("forwards isSearchable prop", () => {
      render(<TriggerConditionDropdown {...defaultProps} isSearchable={true} />);
      expect(screen.getByTestId("is-searchable")).toHaveTextContent("true");
    });

    it("forwards searchPlaceholder prop", () => {
      render(<TriggerConditionDropdown {...defaultProps} searchPlaceholder="Search here..." />);
      expect(screen.getByTestId("search-placeholder")).toHaveTextContent("Search here...");
    });

    it("forwards disabled prop", () => {
      render(<TriggerConditionDropdown {...defaultProps} disabled={true} />);
      const button = screen.getByTestId("dropdown-button");
      expect(button).toBeDisabled();
    });
  });

  describe("Event handling", () => {
    it("calls onChange when value changes", () => {
      const onChange = vi.fn();
      render(<TriggerConditionDropdown {...defaultProps} onChange={onChange} />);

      fireEvent.click(screen.getByTestId("dropdown-button"));
      expect(onChange).toHaveBeenCalledWith("option-1");
    });
  });

  describe("isInTable prop", () => {
    it("renders correctly when isInTable is true", () => {
      const { container } = render(<TriggerConditionDropdown {...defaultProps} isInTable={true} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it("renders correctly when isInTable is false", () => {
      const { container } = render(
        <TriggerConditionDropdown {...defaultProps} isInTable={false} />,
      );
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
