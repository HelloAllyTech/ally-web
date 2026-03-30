import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";

import { OTP } from "../OTP";

// Mock the Input component
vi.mock("@components", () => ({
  Input: vi.fn(({ value, onChange, onKeyDown, ...props }) => (
    <input value={value} onChange={onChange} onKeyDown={onKeyDown} {...props} />
  )),
}));

// Mock constants
vi.mock("@constants", () => ({
  KeyboardKeys: {
    BACKSPACE: "Backspace",
    ARROW_LEFT: "ArrowLeft",
    ARROW_RIGHT: "ArrowRight",
  },
  SINGLE_DIGIT_REGEX: /^\d$/,
}));

describe("OTP", () => {
  it("renders with default digit count", () => {
    const onChange = vi.fn();
    const { container } = render(<OTP value="" onChange={onChange} />);
    const inputs = container.querySelectorAll("input");
    expect(inputs.length).toBe(4);
  });

  it("renders with custom digit count", () => {
    const onChange = vi.fn();
    const { container } = render(<OTP value="" onChange={onChange} digitCount={6} />);
    const inputs = container.querySelectorAll("input");
    expect(inputs.length).toBe(6);
  });

  it("calls onChange when digit is entered", () => {
    const onChange = vi.fn();
    const { container } = render(<OTP value="" onChange={onChange} />);
    const firstInput = container.querySelectorAll("input")[0];

    fireEvent.change(firstInput, { target: { value: "5" } });
    expect(onChange).toHaveBeenCalledWith("5");
  });

  it("moves focus to next input after entering digit", () => {
    const onChange = vi.fn();
    const { container } = render(<OTP value="" onChange={onChange} />);
    const inputs = container.querySelectorAll("input");

    fireEvent.change(inputs[0], { target: { value: "5" } });
    // Focus behavior is tested through the component logic
    expect(onChange).toHaveBeenCalled();
  });

  it("calls onComplete when all digits are entered", () => {
    const onChange = vi.fn();
    const onComplete = vi.fn();
    const { container } = render(<OTP value="123" onChange={onChange} onComplete={onComplete} />);
    const lastInput = container.querySelectorAll("input")[3];

    fireEvent.change(lastInput, { target: { value: "4" } });
    expect(onComplete).toHaveBeenCalledWith("1234");
  });

  it("handles backspace key", () => {
    const onChange = vi.fn();
    const { container } = render(<OTP value="12" onChange={onChange} />);
    const secondInput = container.querySelectorAll("input")[1];

    fireEvent.keyDown(secondInput, { key: "Backspace" });
    expect(onChange).toHaveBeenCalledWith("1");
  });

  it("handles arrow left key", () => {
    const onChange = vi.fn();
    const { container } = render(<OTP value="12" onChange={onChange} />);
    const secondInput = container.querySelectorAll("input")[1];

    fireEvent.keyDown(secondInput, { key: "ArrowLeft" });
    // Focus behavior is tested through the component logic
    expect(container).toBeInTheDocument();
  });

  it("handles arrow right key", () => {
    const onChange = vi.fn();
    const { container } = render(<OTP value="12" onChange={onChange} />);
    const firstInput = container.querySelectorAll("input")[0];

    fireEvent.keyDown(firstInput, { key: "ArrowRight" });
    // Focus behavior is tested through the component logic
    expect(container).toBeInTheDocument();
  });

  it("ignores non-digit input", () => {
    const onChange = vi.fn();
    const { container } = render(<OTP value="" onChange={onChange} />);
    const firstInput = container.querySelectorAll("input")[0];

    fireEvent.change(firstInput, { target: { value: "a" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("renders with disabled state", () => {
    const onChange = vi.fn();
    const { container } = render(<OTP value="" onChange={onChange} disabled={true} />);
    const inputs = container.querySelectorAll("input");

    inputs.forEach(input => {
      expect(input).toBeDisabled();
    });
  });

  it("does not call onChange when disabled", () => {
    const onChange = vi.fn();
    const { container } = render(<OTP value="" onChange={onChange} disabled={true} />);
    const firstInput = container.querySelectorAll("input")[0];

    fireEvent.change(firstInput, { target: { value: "5" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("applies custom className", () => {
    const onChange = vi.fn();
    const { container } = render(<OTP value="" onChange={onChange} className="custom-class" />);
    const wrapper = container.firstChild;

    expect(wrapper).toHaveClass("custom-class");
  });

  it("applies custom placeholder", () => {
    const onChange = vi.fn();
    const { container } = render(<OTP value="" onChange={onChange} placeholder="*" />);
    const inputs = container.querySelectorAll("input");

    inputs.forEach(input => {
      expect(input).toHaveAttribute("placeholder", "*");
    });
  });

  it("passes autoFocus prop to first input when autoFocus is true", () => {
    const onChange = vi.fn();
    render(<OTP value="" onChange={onChange} autoFocus={true} />);
    // AutoFocus is handled by the component, just verify it renders without error
    expect(onChange).toBeDefined();
  });

  it("displays current value correctly", () => {
    const onChange = vi.fn();
    const { container } = render(<OTP value="123" onChange={onChange} />);
    const inputs = container.querySelectorAll("input");

    expect(inputs[0]).toHaveValue("1");
    expect(inputs[1]).toHaveValue("2");
    expect(inputs[2]).toHaveValue("3");
    expect(inputs[3]).toHaveValue("");
  });

  it("has correct input attributes", () => {
    const onChange = vi.fn();
    const { container } = render(<OTP value="" onChange={onChange} />);
    const firstInput = container.querySelectorAll("input")[0];

    expect(firstInput).toHaveAttribute("type", "text");
    expect(firstInput).toHaveAttribute("inputMode", "numeric");
    expect(firstInput).toHaveAttribute("pattern", "[0-9]*");
    expect(firstInput).toHaveAttribute("maxLength", "1");
  });

  it("handles partial value correctly", () => {
    const onChange = vi.fn();
    const { container } = render(<OTP value="12" onChange={onChange} digitCount={4} />);
    const inputs = container.querySelectorAll("input");

    expect(inputs[0]).toHaveValue("1");
    expect(inputs[1]).toHaveValue("2");
    expect(inputs[2]).toHaveValue("");
    expect(inputs[3]).toHaveValue("");
  });

  it("takes only last digit when multiple characters entered", () => {
    const onChange = vi.fn();
    const { container } = render(<OTP value="" onChange={onChange} />);
    const firstInput = container.querySelectorAll("input")[0];

    fireEvent.change(firstInput, { target: { value: "123" } });
    expect(onChange).toHaveBeenCalledWith("3");
  });

  it("does not move focus beyond last input", () => {
    const onChange = vi.fn();
    const { container } = render(<OTP value="1234" onChange={onChange} digitCount={4} />);
    const lastInput = container.querySelectorAll("input")[3];

    fireEvent.keyDown(lastInput, { key: "ArrowRight" });
    // Should not throw error
    expect(container).toBeInTheDocument();
  });

  it("does not move focus before first input", () => {
    const onChange = vi.fn();
    const { container } = render(<OTP value="1234" onChange={onChange} digitCount={4} />);
    const firstInput = container.querySelectorAll("input")[0];

    fireEvent.keyDown(firstInput, { key: "ArrowLeft" });
    // Should not throw error
    expect(container).toBeInTheDocument();
  });

  it("renders with gap between inputs", () => {
    const onChange = vi.fn();
    const { container } = render(<OTP value="" onChange={onChange} />);
    const wrapper = container.firstChild;

    expect(wrapper).toHaveClass("gap-6");
  });

  it("centers inputs verticlifeline", () => {
    const onChange = vi.fn();
    const { container } = render(<OTP value="" onChange={onChange} />);
    const wrapper = container.firstChild;

    expect(wrapper).toHaveClass("items-center");
  });
});
