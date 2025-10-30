import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { SelectComponent } from "../SelectComponent";

describe("SelectComponent", () => {
  const defaultOptions = [
    { label: "Option 1", value: "opt1", backgroundColor: "#ff0000" },
    { label: "Option 2", value: "opt2", backgroundColor: "#00ff00" },
    { label: "Option 3", value: "opt3", backgroundColor: "#0000ff" },
  ];

  const defaultProps = {
    value: "opt1",
    options: defaultOptions,
    onChange: vi.fn(),
    onAddOption: vi.fn(),
    placeholder: "Select an option",
    className: "",
    disabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders with initial value", () => {
      render(<SelectComponent {...defaultProps} />);

      expect(screen.getByText("opt1")).toBeInTheDocument();
    });

    it("renders placeholder when value is empty", () => {
      render(<SelectComponent {...defaultProps} value="" />);

      expect(screen.getByText("Select an option")).toBeInTheDocument();
    });

    it("renders placeholder when value is not set", () => {
      render(<SelectComponent {...defaultProps} value={undefined as any} />);

      expect(screen.getByText("Select an option")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      const { container } = render(<SelectComponent {...defaultProps} className="custom-class" />);

      const customElement = container.querySelector(".custom-class");
      expect(customElement).toBeInTheDocument();
    });

    it("displays custom placeholder", () => {
      render(<SelectComponent {...defaultProps} value="" placeholder="Choose one" />);

      expect(screen.getByText("Choose one")).toBeInTheDocument();
    });
  });

  describe("Disabled State", () => {
    it("applies disabled cursor styles", () => {
      const { container } = render(<SelectComponent {...defaultProps} disabled={true} />);

      const disabledElement = container.querySelector(".cursor-not-allowed");
      expect(disabledElement).toBeInTheDocument();
    });

    it("does not open dropdown when disabled", () => {
      render(<SelectComponent {...defaultProps} disabled={true} />);

      const trigger = screen.getByText("opt1");
      fireEvent.click(trigger);

      const option2 = screen.queryByText("Option 2");
      expect(option2).not.toBeInTheDocument();
    });

    it("applies opacity when disabled", () => {
      const { container } = render(<SelectComponent {...defaultProps} disabled={true} />);

      const disabledElement = container.querySelector(".opacity-50");
      expect(disabledElement).toBeInTheDocument();
    });
  });

  describe("Dropdown Opening", () => {
    it("opens dropdown when clicked", () => {
      render(<SelectComponent {...defaultProps} />);

      const trigger = screen.getByText("opt1");
      fireEvent.click(trigger);

      expect(screen.getByText("Option 1")).toBeInTheDocument();
      expect(screen.getByText("Option 2")).toBeInTheDocument();
      expect(screen.getByText("Option 3")).toBeInTheDocument();
    });

    it("does not open when disabled", () => {
      render(<SelectComponent {...defaultProps} disabled={true} />);

      const trigger = screen.getByText("opt1");
      fireEvent.click(trigger);

      expect(screen.queryByText("Option 2")).not.toBeInTheDocument();
    });

    it("displays all options when opened", () => {
      render(<SelectComponent {...defaultProps} />);

      const trigger = screen.getByText("opt1");
      fireEvent.click(trigger);

      defaultOptions.forEach(option => {
        expect(screen.getByText(option.label)).toBeInTheDocument();
      });
    });
  });

  describe("Option Selection", () => {
    it("calls onChange when option is selected", () => {
      const mockOnChange = vi.fn();
      render(<SelectComponent {...defaultProps} onChange={mockOnChange} />);

      const trigger = screen.getByText("opt1");
      fireEvent.click(trigger);

      const option2 = screen.getByText("Option 2");
      fireEvent.click(option2);

      expect(mockOnChange).toHaveBeenCalledWith("Option 2");
    });

    it("closes dropdown after selection", () => {
      render(<SelectComponent {...defaultProps} />);

      const trigger = screen.getByText("opt1");
      fireEvent.click(trigger);

      const option2 = screen.getByText("Option 2");
      fireEvent.click(option2);

      expect(screen.queryByText("Option 3")).not.toBeInTheDocument();
    });

    it("selects different options correctly", () => {
      const mockOnChange = vi.fn();
      render(<SelectComponent {...defaultProps} onChange={mockOnChange} />);

      const trigger = screen.getByText("opt1");
      fireEvent.click(trigger);

      const option3 = screen.getByText("Option 3");
      fireEvent.click(option3);

      expect(mockOnChange).toHaveBeenCalledWith("Option 3");
    });
  });

  describe("Add Option Functionality", () => {
    it("displays add button", () => {
      render(<SelectComponent {...defaultProps} />);

      const trigger = screen.getByText("opt1");
      fireEvent.click(trigger);

      expect(screen.getByText("+")).toBeInTheDocument();
    });

    it("shows input field when add button is clicked", () => {
      render(<SelectComponent {...defaultProps} />);

      const trigger = screen.getByText("opt1");
      fireEvent.click(trigger);

      const addButton = screen.getByText("+");
      fireEvent.click(addButton);

      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
    });

    it("focuses input when add is clicked", async () => {
      render(<SelectComponent {...defaultProps} />);

      const trigger = screen.getByText("opt1");
      fireEvent.click(trigger);

      const addButton = screen.getByText("+");
      fireEvent.click(addButton);

      await waitFor(() => {
        const input = screen.getByRole("textbox");
        expect(document.activeElement).toBe(input);
      });
    });

    it("calls onAddOption when Enter is pressed", () => {
      const mockOnAddOption = vi.fn();
      render(<SelectComponent {...defaultProps} onAddOption={mockOnAddOption} />);

      const trigger = screen.getByText("opt1");
      fireEvent.click(trigger);

      const addButton = screen.getByText("+");
      fireEvent.click(addButton);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "New Option" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(mockOnAddOption).toHaveBeenCalledWith("New Option", "");
    });

    it("does not call onAddOption on Enter with empty value", () => {
      const mockOnAddOption = vi.fn();
      render(<SelectComponent {...defaultProps} onAddOption={mockOnAddOption} />);

      const trigger = screen.getByText("opt1");
      fireEvent.click(trigger);

      const addButton = screen.getByText("+");
      fireEvent.click(addButton);

      const input = screen.getByRole("textbox");
      fireEvent.keyDown(input, { key: "Enter" });

      expect(mockOnAddOption).not.toHaveBeenCalled();
    });

    it("hides input after adding option", () => {
      render(<SelectComponent {...defaultProps} />);

      const trigger = screen.getByText("opt1");
      fireEvent.click(trigger);

      const addButton = screen.getByText("+");
      fireEvent.click(addButton);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "New Option" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });

    it("calls onAddOption on blur with value", () => {
      const mockOnAddOption = vi.fn();
      render(<SelectComponent {...defaultProps} onAddOption={mockOnAddOption} />);

      const trigger = screen.getByText("opt1");
      fireEvent.click(trigger);

      const addButton = screen.getByText("+");
      fireEvent.click(addButton);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "Blurred Option" } });
      fireEvent.blur(input);

      expect(mockOnAddOption).toHaveBeenCalledWith("Blurred Option", "");
    });

    it("does not call onAddOption on blur with empty value", () => {
      const mockOnAddOption = vi.fn();
      render(<SelectComponent {...defaultProps} onAddOption={mockOnAddOption} />);

      const trigger = screen.getByText("opt1");
      fireEvent.click(trigger);

      const addButton = screen.getByText("+");
      fireEvent.click(addButton);

      const input = screen.getByRole("textbox");
      fireEvent.blur(input);

      expect(mockOnAddOption).not.toHaveBeenCalled();
    });

    it("handles onAddOption being undefined", () => {
      render(<SelectComponent {...defaultProps} onAddOption={undefined} />);

      const trigger = screen.getByText("opt1");
      fireEvent.click(trigger);

      const addButton = screen.getByText("+");
      fireEvent.click(addButton);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "New Option" } });

      expect(() => {
        fireEvent.keyDown(input, { key: "Enter" });
      }).not.toThrow();
    });
  });

  describe("Dropdown Closing", () => {
    it("closes dropdown when clicking outside overlay", () => {
      render(<SelectComponent {...defaultProps} />);

      const trigger = screen.getByText("opt1");
      fireEvent.click(trigger);

      expect(screen.getByText("Option 2")).toBeInTheDocument();

      const overlay = document.querySelector(".fixed.inset-0");
      if (overlay) {
        fireEvent.click(overlay);
      }

      expect(screen.queryByText("Option 2")).not.toBeInTheDocument();
    });

    it("renders overlay when dropdown is open", () => {
      const { container } = render(<SelectComponent {...defaultProps} />);

      const trigger = screen.getByText("opt1");
      fireEvent.click(trigger);

      const overlay = container.querySelector(".fixed.inset-0");
      expect(overlay).toBeInTheDocument();
    });

    it("does not render overlay when dropdown is closed", () => {
      const { container } = render(<SelectComponent {...defaultProps} />);

      const overlay = container.querySelector(".fixed.inset-0");
      expect(overlay).not.toBeInTheDocument();
    });
  });

  describe("Option Display", () => {
    it("displays all option labels", () => {
      render(<SelectComponent {...defaultProps} />);

      const trigger = screen.getByText("opt1");
      fireEvent.click(trigger);

      expect(screen.getByText("Option 1")).toBeInTheDocument();
      expect(screen.getByText("Option 2")).toBeInTheDocument();
      expect(screen.getByText("Option 3")).toBeInTheDocument();
    });

    it("handles options without backgroundColor", () => {
      const optionsWithoutBg = [
        { label: "No BG 1", value: "nobg1" },
        { label: "No BG 2", value: "nobg2" },
      ];

      render(<SelectComponent {...defaultProps} options={optionsWithoutBg} value="" />);

      const trigger = screen.getByText("Select an option");
      fireEvent.click(trigger);

      expect(screen.getByText("No BG 1")).toBeInTheDocument();
      expect(screen.getByText("No BG 2")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles empty options array", () => {
      render(<SelectComponent {...defaultProps} options={[]} />);

      const trigger = screen.getByText("opt1");
      fireEvent.click(trigger);

      expect(screen.getByText("+")).toBeInTheDocument();
    });

    it("handles single option", () => {
      const singleOption = [{ label: "Only One", value: "one" }];
      render(<SelectComponent {...defaultProps} options={singleOption} value="" />);

      const trigger = screen.getByText("Select an option");
      fireEvent.click(trigger);

      expect(screen.getByText("Only One")).toBeInTheDocument();
    });

    it("handles very long option labels", () => {
      const longOptions = [{ label: "A".repeat(100), value: "long" }];

      render(<SelectComponent {...defaultProps} options={longOptions} value="" />);

      const trigger = screen.getByText("Select an option");
      fireEvent.click(trigger);

      expect(screen.getByText("A".repeat(100))).toBeInTheDocument();
    });

    it("handles special characters in labels", () => {
      const specialOptions = [{ label: "Option <>&\"'", value: "special" }];

      render(<SelectComponent {...defaultProps} options={specialOptions} value="" />);

      const trigger = screen.getByText("Select an option");
      fireEvent.click(trigger);

      expect(screen.getByText("Option <>&\"'")).toBeInTheDocument();
    });

    it("handles rapid open/close", () => {
      render(<SelectComponent {...defaultProps} />);

      const trigger = screen.getByText("opt1");

      fireEvent.click(trigger);
      expect(screen.getByText("Option 2")).toBeInTheDocument();

      const overlay = document.querySelector(".fixed.inset-0");
      if (overlay) {
        fireEvent.click(overlay);
      }
      expect(screen.queryByText("Option 2")).not.toBeInTheDocument();

      fireEvent.click(trigger);
      expect(screen.getByText("Option 2")).toBeInTheDocument();
    });

    it("handles selecting the same option twice", () => {
      const mockOnChange = vi.fn();
      render(<SelectComponent {...defaultProps} onChange={mockOnChange} />);

      const trigger = screen.getByText("opt1");
      fireEvent.click(trigger);

      const option1 = screen.getByText("Option 1");
      fireEvent.click(option1);

      expect(mockOnChange).toHaveBeenCalledWith("Option 1");
    });
  });

  describe("Styling", () => {
    it("applies cursor pointer when not disabled", () => {
      const { container } = render(<SelectComponent {...defaultProps} />);

      const cursorElement = container.querySelector(".cursor-pointer");
      expect(cursorElement).toBeInTheDocument();
    });

    it("applies flex layout", () => {
      const { container } = render(<SelectComponent {...defaultProps} />);

      const flexElement = container.querySelector(".flex");
      expect(flexElement).toBeInTheDocument();
    });

    it("applies minimum height to trigger", () => {
      const { container } = render(<SelectComponent {...defaultProps} />);

      const minHeightElement = container.querySelector(".min-h-\\[40px\\]");
      expect(minHeightElement).toBeInTheDocument();
    });

    it("applies padding to trigger", () => {
      const { container } = render(<SelectComponent {...defaultProps} />);

      const paddedElement = container.querySelector(".p-2");
      expect(paddedElement).toBeInTheDocument();
    });
  });

  describe("Dropdown Styling", () => {
    it("applies correct dropdown styles", () => {
      const { container } = render(<SelectComponent {...defaultProps} />);

      const trigger = screen.getByText("opt1");
      fireEvent.click(trigger);

      const dropdown = container.querySelector(".bg-white.shadow-lg.rounded-md");
      expect(dropdown).toBeInTheDocument();
    });

    it("applies z-index to dropdown", () => {
      const { container } = render(<SelectComponent {...defaultProps} />);

      const trigger = screen.getByText("opt1");
      fireEvent.click(trigger);

      const dropdown = container.querySelector(".z-4");
      expect(dropdown).toBeInTheDocument();
    });

    it("applies correct width constraints", () => {
      const { container } = render(<SelectComponent {...defaultProps} />);

      const trigger = screen.getByText("opt1");
      fireEvent.click(trigger);

      const dropdown = container.querySelector(".min-w-\\[200px\\].max-w-\\[320px\\]");
      expect(dropdown).toBeInTheDocument();
    });
  });

  describe("Add Input Styling", () => {
    it("applies correct styling to add input", () => {
      const { container } = render(<SelectComponent {...defaultProps} />);

      const trigger = screen.getByText("opt1");
      fireEvent.click(trigger);

      const addButton = screen.getByText("+");
      fireEvent.click(addButton);

      const inputWrapper = container.querySelector(".bg-gray-200.rounded");
      expect(inputWrapper).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("renders clickable trigger", () => {
      render(<SelectComponent {...defaultProps} />);

      const trigger = screen.getByText("opt1");
      expect(trigger).toBeInTheDocument();
    });

    it("maintains keyboard accessibility for input", () => {
      render(<SelectComponent {...defaultProps} />);

      const trigger = screen.getByText("opt1");
      fireEvent.click(trigger);

      const addButton = screen.getByText("+");
      fireEvent.click(addButton);

      const input = screen.getByRole("textbox");
      input.focus();

      expect(document.activeElement).toBe(input);
    });
  });

  describe("Multiple Selections", () => {
    it("allows selecting different options sequentially", () => {
      const mockOnChange = vi.fn();
      render(<SelectComponent {...defaultProps} onChange={mockOnChange} />);

      // First selection
      const trigger = screen.getByText("opt1");
      fireEvent.click(trigger);
      const option2 = screen.getByText("Option 2");
      fireEvent.click(option2);

      expect(mockOnChange).toHaveBeenCalledWith("Option 2");

      // Second selection
      mockOnChange.mockClear();
      const newTrigger = screen.getByText("opt1"); // Value doesn't change in test
      fireEvent.click(newTrigger);
      const option3 = screen.getByText("Option 3");
      fireEvent.click(option3);

      expect(mockOnChange).toHaveBeenCalledWith("Option 3");
    });
  });
});
