import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { NumberInput } from "../NumberInput";

// Mock ArrowDownFilled icon
vi.mock("@assets", () => ({
  ArrowDownFilled: ({ width, height, className }: any) => (
    <svg data-testid="arrow-down-icon" width={width} height={height} className={className} />
  ),
}));

// Mock utilities
vi.mock("@utils", () => ({
  isNumber: (value: any) => typeof value === "number" && !isNaN(value),
  isNonEmptyString: (value: any) => typeof value === "string" && value.trim().length > 0,
}));

describe("NumberInput", () => {
  const defaultProps = {
    value: 10,
    onChange: vi.fn(),
    min: 0,
    max: 100,
    step: 1,
    placeholder: "Enter number",
    disabled: false,
    className: "",
    inputClassName: "",
    spinnerClassName: "",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders with initial value", () => {
      render(<NumberInput {...defaultProps} />);

      const input = screen.getByPlaceholderText("Enter number");
      expect(input).toHaveValue("10");
    });

    it("renders with zero value", () => {
      render(<NumberInput {...defaultProps} value={0} />);

      const input = screen.getByPlaceholderText("Enter number");
      expect(input).toHaveValue("0");
    });

    it("renders with negative value", () => {
      render(<NumberInput {...defaultProps} value={-5} min={-10} />);

      const input = screen.getByPlaceholderText("Enter number");
      expect(input).toHaveValue("-5");
    });

    it("renders with decimal value", () => {
      render(<NumberInput {...defaultProps} value={3.14} />);

      const input = screen.getByPlaceholderText("Enter number");
      expect(input).toHaveValue("3.14");
    });

    it("renders placeholder when value is undefined", () => {
      render(<NumberInput {...defaultProps} value={undefined} />);

      const input = screen.getByPlaceholderText("Enter number");
      expect(input).toHaveValue(""); // Component shows empty string when value is undefined
    });

    it("renders increment and decrement buttons", () => {
      render(<NumberInput {...defaultProps} />);

      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(2);
    });

    it("renders arrow icons", () => {
      render(<NumberInput {...defaultProps} />);

      const arrows = screen.getAllByTestId("arrow-down-icon");
      expect(arrows).toHaveLength(2);
    });
  });

  describe("Input Changes", () => {
    it("updates value when typing", () => {
      render(<NumberInput {...defaultProps} />);

      const input = screen.getByPlaceholderText("Enter number");
      fireEvent.change(input, { target: { value: "25" } });

      expect(input).toHaveValue("25");
    });

    it("calls onChange when valid number is entered and blurred", () => {
      const mockOnChange = vi.fn();
      render(<NumberInput {...defaultProps} onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText("Enter number");
      fireEvent.change(input, { target: { value: "25" } });
      fireEvent.blur(input);

      expect(mockOnChange).toHaveBeenCalledWith(25);
    });

    it("does not call onChange for invalid input", () => {
      const mockOnChange = vi.fn();
      render(<NumberInput {...defaultProps} onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText("Enter number");
      mockOnChange.mockClear();

      fireEvent.change(input, { target: { value: "abc" } });

      expect(input).toHaveValue("abc");
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it("clamps value to max on blur", () => {
      const mockOnChange = vi.fn();
      render(<NumberInput {...defaultProps} max={50} onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText("Enter number");
      fireEvent.change(input, { target: { value: "100" } });
      fireEvent.blur(input);

      expect(mockOnChange).toHaveBeenCalledWith(50);
    });

    it("clamps value to min on blur", () => {
      const mockOnChange = vi.fn();
      render(<NumberInput {...defaultProps} min={20} onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText("Enter number");
      fireEvent.change(input, { target: { value: "5" } });
      fireEvent.blur(input);

      expect(mockOnChange).toHaveBeenCalledWith(20);
    });
  });

  describe("Blur Behavior", () => {
    it("reverts to normalized value on blur with invalid input", () => {
      render(<NumberInput {...defaultProps} value={10} />);

      const input = screen.getByPlaceholderText("Enter number");
      fireEvent.change(input, { target: { value: "invalid" } });
      fireEvent.blur(input);

      expect(input).toHaveValue("10");
    });

    it("clamps value on blur", () => {
      const mockOnChange = vi.fn();
      render(<NumberInput {...defaultProps} max={50} onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText("Enter number");
      fireEvent.change(input, { target: { value: "75" } });
      fireEvent.blur(input);

      expect(mockOnChange).toHaveBeenCalledWith(50);
      expect(input).toHaveValue("50");
    });

    it("sets focus state to false on blur", () => {
      render(<NumberInput {...defaultProps} />);

      const input = screen.getByPlaceholderText("Enter number");
      fireEvent.focus(input);
      fireEvent.blur(input);

      expect(document.activeElement).not.toBe(input);
    });
  });

  describe("Focus Behavior", () => {
    it("sets focus state on focus", () => {
      render(<NumberInput {...defaultProps} />);

      const input = screen.getByPlaceholderText("Enter number");
      input.focus();

      expect(document.activeElement).toBe(input);
    });
  });

  describe("Increment Button", () => {
    it("increments value by step when clicked", () => {
      const mockOnChange = vi.fn();
      render(<NumberInput {...defaultProps} value={10} step={5} onChange={mockOnChange} />);

      const buttons = screen.getAllByRole("button");
      const incrementButton = buttons[0];
      fireEvent.click(incrementButton);

      expect(mockOnChange).toHaveBeenCalledWith(15);
    });

    it("does not exceed max value", () => {
      const mockOnChange = vi.fn();
      render(
        <NumberInput {...defaultProps} value={95} max={100} step={10} onChange={mockOnChange} />,
      );

      const buttons = screen.getAllByRole("button");
      const incrementButton = buttons[0];
      fireEvent.click(incrementButton);

      expect(mockOnChange).toHaveBeenCalledWith(100);
    });

    it("is disabled when value is at max", () => {
      render(<NumberInput {...defaultProps} value={100} max={100} />);

      const buttons = screen.getAllByRole("button");
      const incrementButton = buttons[0];
      expect(incrementButton).toBeDisabled();
    });

    it("is disabled when input is disabled", () => {
      render(<NumberInput {...defaultProps} disabled={true} />);

      const buttons = screen.getAllByRole("button");
      const incrementButton = buttons[0];
      expect(incrementButton).toBeDisabled();
    });

    it("does not increment when disabled", () => {
      const mockOnChange = vi.fn();
      render(<NumberInput {...defaultProps} disabled={true} onChange={mockOnChange} />);

      const buttons = screen.getAllByRole("button");
      const incrementButton = buttons[0];
      fireEvent.click(incrementButton);

      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe("Decrement Button", () => {
    it("decrements value by step when clicked", () => {
      const mockOnChange = vi.fn();
      render(<NumberInput {...defaultProps} value={20} step={5} onChange={mockOnChange} />);

      const buttons = screen.getAllByRole("button");
      const decrementButton = buttons[1];
      fireEvent.click(decrementButton);

      expect(mockOnChange).toHaveBeenCalledWith(15);
    });

    it("does not go below min value", () => {
      const mockOnChange = vi.fn();
      render(<NumberInput {...defaultProps} value={5} min={0} step={10} onChange={mockOnChange} />);

      const buttons = screen.getAllByRole("button");
      const decrementButton = buttons[1];
      fireEvent.click(decrementButton);

      expect(mockOnChange).toHaveBeenCalledWith(0);
    });

    it("is disabled when value is at min", () => {
      render(<NumberInput {...defaultProps} value={0} min={0} />);

      const buttons = screen.getAllByRole("button");
      const decrementButton = buttons[1];
      expect(decrementButton).toBeDisabled();
    });

    it("is disabled when input is disabled", () => {
      render(<NumberInput {...defaultProps} disabled={true} />);

      const buttons = screen.getAllByRole("button");
      const decrementButton = buttons[1];
      expect(decrementButton).toBeDisabled();
    });

    it("does not decrement when disabled", () => {
      const mockOnChange = vi.fn();
      render(<NumberInput {...defaultProps} disabled={true} onChange={mockOnChange} />);

      const buttons = screen.getAllByRole("button");
      const decrementButton = buttons[1];
      fireEvent.click(decrementButton);

      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe("Keyboard Navigation", () => {
    it("increments on ArrowUp key", () => {
      const mockOnChange = vi.fn();
      render(<NumberInput {...defaultProps} value={10} onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText("Enter number");
      fireEvent.keyDown(input, { key: "ArrowUp" });

      expect(mockOnChange).toHaveBeenCalledWith(11);
    });

    it("decrements on ArrowDown key", () => {
      const mockOnChange = vi.fn();
      render(<NumberInput {...defaultProps} value={10} onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText("Enter number");
      fireEvent.keyDown(input, { key: "ArrowDown" });

      expect(mockOnChange).toHaveBeenCalledWith(9);
    });

    it("prevents default on ArrowUp", () => {
      render(<NumberInput {...defaultProps} />);

      const input = screen.getByPlaceholderText("Enter number");
      const event = new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true });
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");

      input.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it("prevents default on ArrowDown", () => {
      render(<NumberInput {...defaultProps} />);

      const input = screen.getByPlaceholderText("Enter number");
      const event = new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true });
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");

      input.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe("Disabled State", () => {
    it("disables input when disabled prop is true", () => {
      render(<NumberInput {...defaultProps} disabled={true} />);

      const input = screen.getByPlaceholderText("Enter number");
      expect(input).toBeDisabled();
    });

    it("disables both buttons when disabled", () => {
      render(<NumberInput {...defaultProps} disabled={true} />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it("applies disabled cursor class", () => {
      render(<NumberInput {...defaultProps} disabled={true} />);

      const input = screen.getByPlaceholderText("Enter number");
      expect(input).toHaveClass("disabled:cursor-not-allowed");
    });
  });

  describe("Styling", () => {
    it("applies custom className to container", () => {
      const { container } = render(<NumberInput {...defaultProps} className="custom-container" />);

      const customElement = container.querySelector(".custom-container");
      expect(customElement).toBeInTheDocument();
    });

    it("applies custom inputClassName", () => {
      render(<NumberInput {...defaultProps} inputClassName="custom-input" />);

      const input = screen.getByPlaceholderText("Enter number");
      expect(input).toHaveClass("custom-input");
    });

    it("applies custom spinnerClassName", () => {
      const { container } = render(
        <NumberInput {...defaultProps} spinnerClassName="custom-spinner" />,
      );

      const spinner = container.querySelector(".custom-spinner");
      expect(spinner).toBeInTheDocument();
    });
  });

  describe("Value Synchronization", () => {
    it("updates when value prop changes", async () => {
      const { rerender } = render(<NumberInput {...defaultProps} value={10} />);

      const input = screen.getByPlaceholderText("Enter number");
      expect(input).toHaveValue("10");

      rerender(<NumberInput {...defaultProps} value={20} />);

      await waitFor(() => {
        expect(input).toHaveValue("20");
      });
    });

    it("handles change from valid to invalid value", async () => {
      const { rerender } = render(<NumberInput {...defaultProps} value={10} />);

      rerender(<NumberInput {...defaultProps} value={NaN} />);

      await waitFor(() => {
        const input = screen.getByPlaceholderText("Enter number");
        expect(input).toHaveValue("0");
      });
    });

    it("handles change from number to undefined", async () => {
      const { rerender } = render(<NumberInput {...defaultProps} value={10} />);

      rerender(<NumberInput {...defaultProps} value={undefined} />);

      await waitFor(() => {
        const input = screen.getByPlaceholderText("Enter number");
        expect(input).toHaveValue(""); // Component shows empty string when value is undefined
      });
    });
  });

  describe("Edge Cases", () => {
    it("handles very large numbers", () => {
      const largeNumber = 999999999;
      render(<NumberInput {...defaultProps} value={largeNumber} max={Infinity} />);

      const input = screen.getByPlaceholderText("Enter number");
      expect(input).toHaveValue(String(largeNumber));
    });

    it("handles very small numbers", () => {
      const smallNumber = -999999999;
      render(<NumberInput {...defaultProps} value={smallNumber} min={-Infinity} />);

      const input = screen.getByPlaceholderText("Enter number");
      expect(input).toHaveValue(String(smallNumber));
    });

    it("handles decimal step values", () => {
      const mockOnChange = vi.fn();
      render(<NumberInput {...defaultProps} value={1.5} step={0.5} onChange={mockOnChange} />);

      const buttons = screen.getAllByRole("button");
      const incrementButton = buttons[0];
      fireEvent.click(incrementButton);

      expect(mockOnChange).toHaveBeenCalledWith(2.0);
    });

    it("respects maxLength attribute", () => {
      render(<NumberInput {...defaultProps} />);

      const input = screen.getByPlaceholderText("Enter number");
      expect(input).toHaveAttribute("maxLength", "7");
    });

    it("handles rapid increment clicks", () => {
      const mockOnChange = vi.fn();
      render(<NumberInput {...defaultProps} value={0} onChange={mockOnChange} />);

      const buttons = screen.getAllByRole("button");
      const incrementButton = buttons[0];

      fireEvent.click(incrementButton);
      fireEvent.click(incrementButton);
      fireEvent.click(incrementButton);

      expect(mockOnChange).toHaveBeenCalledTimes(3);
    });

    it("handles rapid decrement clicks", () => {
      const mockOnChange = vi.fn();
      render(<NumberInput {...defaultProps} value={10} onChange={mockOnChange} />);

      const buttons = screen.getAllByRole("button");
      const decrementButton = buttons[1];

      fireEvent.click(decrementButton);
      fireEvent.click(decrementButton);
      fireEvent.click(decrementButton);

      expect(mockOnChange).toHaveBeenCalledTimes(3);
    });

    it("handles negative min and max", () => {
      render(<NumberInput {...defaultProps} value={-5} min={-10} max={-1} />);

      const input = screen.getByPlaceholderText("Enter number");
      expect(input).toHaveValue("-5");
    });

    it("handles onChange being undefined", () => {
      render(<NumberInput {...defaultProps} onChange={undefined} />);

      const input = screen.getByPlaceholderText("Enter number");
      fireEvent.change(input, { target: { value: "20" } });

      expect(input).toHaveValue("20");
    });
  });

  describe("Default Props", () => {
    it("uses default placeholder when not provided", () => {
      render(<NumberInput value={10} />);

      const input = screen.getByPlaceholderText("0");
      expect(input).toBeInTheDocument();
    });

    it("uses default min value (-Infinity)", () => {
      const mockOnChange = vi.fn();
      render(<NumberInput value={0} onChange={mockOnChange} />);

      const buttons = screen.getAllByRole("button");
      const decrementButton = buttons[1];
      expect(decrementButton).not.toBeDisabled();
    });

    it("uses default max value (Infinity)", () => {
      const mockOnChange = vi.fn();
      render(<NumberInput value={1000000} onChange={mockOnChange} />);

      const buttons = screen.getAllByRole("button");
      const incrementButton = buttons[0];
      expect(incrementButton).not.toBeDisabled();
    });

    it("uses default step value (1)", () => {
      const mockOnChange = vi.fn();
      render(<NumberInput value={10} onChange={mockOnChange} />);

      const buttons = screen.getAllByRole("button");
      const incrementButton = buttons[0];
      fireEvent.click(incrementButton);

      expect(mockOnChange).toHaveBeenCalledWith(11);
    });
  });
});
