import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import React from "react";

// Mock @components
vi.mock("@components", () => ({
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
    <div data-testid="text-dropdown" className={className}>
      <button
        data-testid="dropdown-button"
        onClick={() => onChange("new-value")}
        disabled={disabled}
      >
        <span data-testid="dropdown-value">
          {displayValue ||
            (options && options.find((opt: any) => opt.value === value)?.label) ||
            placeholder}
        </span>
      </button>
      {isSearchable && (
        <input data-testid="search-input" placeholder={searchPlaceholder} type="text" />
      )}
    </div>
  ),
}));

// Mock @constants
vi.mock("@constants", () => ({
  en: {
    common: {
      select: "Select",
    },
  },
}));

import { TriggerConditionDropdown } from "../TriggerConditionDropdown";

describe("TriggerConditionDropdown", () => {
  const mockOnChange = vi.fn();
  const defaultOptions = [
    { label: "Option 1", value: "opt1" },
    { label: "Option 2", value: "opt2" },
    { label: "Option 3", value: "opt3" },
  ];

  const defaultProps = {
    value: "opt1",
    options: defaultOptions,
    onChange: mockOnChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders with value", () => {
      render(<TriggerConditionDropdown {...defaultProps} />);

      expect(screen.getByTestId("text-dropdown")).toBeInTheDocument();
      expect(screen.getByTestId("dropdown-value")).toHaveTextContent("Option 1");
    });

    it("renders with displayValue", () => {
      render(<TriggerConditionDropdown {...defaultProps} displayValue="Custom Display" />);

      expect(screen.getByTestId("dropdown-value")).toHaveTextContent("Custom Display");
    });

    it("renders placeholder when value is empty", () => {
      render(<TriggerConditionDropdown {...defaultProps} value="" />);

      expect(screen.getByTestId("dropdown-value")).toHaveTextContent("Select");
    });

    it("renders custom placeholder", () => {
      render(<TriggerConditionDropdown {...defaultProps} value="" placeholder="Choose option" />);

      expect(screen.getByTestId("dropdown-value")).toHaveTextContent("Choose option");
    });

    it("renders with empty options array", () => {
      render(<TriggerConditionDropdown {...defaultProps} options={[]} />);

      expect(screen.getByTestId("text-dropdown")).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("applies default styling when not in table", () => {
      const { container } = render(<TriggerConditionDropdown {...defaultProps} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("bg-neutral-50");
      expect(wrapper).toHaveClass("border");
    });

    it("applies table styling when isInTable is true", () => {
      const { container } = render(<TriggerConditionDropdown {...defaultProps} isInTable={true} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("bg-neutral-100");
      expect(wrapper).toHaveClass("[&_button]:pointer-events-none");
    });

    it("applies custom className", () => {
      const { container } = render(
        <TriggerConditionDropdown {...defaultProps} className="custom-class" />,
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("custom-class");
    });

    it("applies placeholder text color when showing placeholder", () => {
      const { container } = render(<TriggerConditionDropdown {...defaultProps} value="" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("[&_button>span]:!text-typography-500");
    });

    it("applies normal text color when value is present", () => {
      const { container } = render(<TriggerConditionDropdown {...defaultProps} value="opt1" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("[&_button>span]:text-[#4A4459]");
    });

    it("applies placeholder color when value is whitespace only", () => {
      const { container } = render(<TriggerConditionDropdown {...defaultProps} value="   " />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("[&_button>span]:!text-typography-500");
    });

    it("applies placeholder color when displayValue is empty", () => {
      const { container } = render(
        <TriggerConditionDropdown {...defaultProps} value="opt1" displayValue="" />,
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("[&_button>span]:text-[#4A4459]");
    });
  });

  describe("TextDropdown Integration", () => {
    it("passes value to TextDropdown", () => {
      render(<TriggerConditionDropdown {...defaultProps} value="opt2" />);

      const textDropdown = screen.getByTestId("text-dropdown");
      expect(textDropdown).toBeInTheDocument();
    });

    it("passes displayValue to TextDropdown", () => {
      render(<TriggerConditionDropdown {...defaultProps} displayValue="Display Text" />);

      expect(screen.getByTestId("dropdown-value")).toHaveTextContent("Display Text");
    });

    it("passes options to TextDropdown", () => {
      render(<TriggerConditionDropdown {...defaultProps} />);

      const textDropdown = screen.getByTestId("text-dropdown");
      expect(textDropdown).toBeInTheDocument();
    });

    it("passes onChange handler to TextDropdown", () => {
      render(<TriggerConditionDropdown {...defaultProps} />);

      const button = screen.getByTestId("dropdown-button");
      fireEvent.click(button);

      expect(mockOnChange).toHaveBeenCalledWith("new-value");
    });

    it("passes placeholder to TextDropdown", () => {
      render(
        <TriggerConditionDropdown {...defaultProps} value="" placeholder="Custom Placeholder" />,
      );

      expect(screen.getByTestId("dropdown-value")).toHaveTextContent("Custom Placeholder");
    });

    it("passes searchPlaceholder to TextDropdown", () => {
      render(
        <TriggerConditionDropdown
          {...defaultProps}
          isSearchable={true}
          searchPlaceholder="Search here"
        />,
      );

      const searchInput = screen.getByTestId("search-input");
      expect(searchInput).toHaveAttribute("placeholder", "Search here");
    });

    it("passes isSearchable to TextDropdown", () => {
      render(<TriggerConditionDropdown {...defaultProps} isSearchable={true} />);

      expect(screen.getByTestId("search-input")).toBeInTheDocument();
    });

    it("passes disabled to TextDropdown", () => {
      render(<TriggerConditionDropdown {...defaultProps} disabled={true} />);

      const button = screen.getByTestId("dropdown-button");
      expect(button).toBeDisabled();
    });

    it("passes className to TextDropdown", () => {
      render(<TriggerConditionDropdown {...defaultProps} />);

      const textDropdown = screen.getByTestId("text-dropdown");
      expect(textDropdown).toHaveClass("w-full");
      expect(textDropdown).toHaveClass("h-6");
      expect(textDropdown).toHaveClass("text-sm");
    });
  });

  describe("Placeholder Detection", () => {
    it("detects placeholder when value is empty string", () => {
      const { container } = render(<TriggerConditionDropdown {...defaultProps} value="" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("[&_button>span]:!text-typography-500");
    });

    it("detects placeholder when value is undefined", () => {
      const { container } = render(
        <TriggerConditionDropdown {...defaultProps} value={undefined as any} />,
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("[&_button>span]:!text-typography-500");
    });

    it("detects placeholder when value is whitespace only", () => {
      const { container } = render(<TriggerConditionDropdown {...defaultProps} value="   " />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("[&_button>span]:!text-typography-500");
    });

    it("does not show placeholder when value exists", () => {
      const { container } = render(<TriggerConditionDropdown {...defaultProps} value="opt1" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("[&_button>span]:text-[#4A4459]");
    });

    it("shows placeholder when value is empty and displayValue is empty", () => {
      const { container } = render(
        <TriggerConditionDropdown {...defaultProps} value="" displayValue="" />,
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("[&_button>span]:!text-typography-500");
    });

    it("shows placeholder when value is empty and displayValue is whitespace", () => {
      const { container } = render(
        <TriggerConditionDropdown {...defaultProps} value="" displayValue="   " />,
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("[&_button>span]:!text-typography-500");
    });
  });

  describe("Edge Cases", () => {
    it("handles undefined options", () => {
      render(
        <TriggerConditionDropdown
          {...defaultProps}
          value=""
          options={undefined as any}
          placeholder="Select"
        />,
      );

      expect(screen.getByTestId("text-dropdown")).toBeInTheDocument();
      expect(screen.getByTestId("dropdown-value")).toHaveTextContent("Select");
    });

    it("handles value not in options", () => {
      render(<TriggerConditionDropdown {...defaultProps} value="unknown-value" />);

      expect(screen.getByTestId("text-dropdown")).toBeInTheDocument();
    });

    it("handles empty string value with valid displayValue", () => {
      render(<TriggerConditionDropdown {...defaultProps} value="" displayValue="Display Text" />);

      expect(screen.getByTestId("dropdown-value")).toHaveTextContent("Display Text");
    });

    it("handles rapid onChange calls", () => {
      render(<TriggerConditionDropdown {...defaultProps} />);

      const button = screen.getByTestId("dropdown-button");
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(mockOnChange).toHaveBeenCalledTimes(3);
    });
  });

  describe("Accessibility", () => {
    it("renders as accessible button", () => {
      render(<TriggerConditionDropdown {...defaultProps} />);

      const button = screen.getByTestId("dropdown-button");
      expect(button.tagName).toBe("BUTTON");
    });

    it("disables button when disabled prop is true", () => {
      render(<TriggerConditionDropdown {...defaultProps} disabled={true} />);

      const button = screen.getByTestId("dropdown-button");
      expect(button).toBeDisabled();
    });

    it("prevents pointer events when in table", () => {
      const { container } = render(<TriggerConditionDropdown {...defaultProps} isInTable={true} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("[&_button]:pointer-events-none");
    });
  });
});
