import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import OTP from "../OTP";

// Mock the Input component
vi.mock("@components", () => ({
  Input: vi.fn(({ className, ...props }: any) => <input className={className} {...props} />),
}));

// Mock the cn utility
vi.mock("@utils", () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));

// Mock constants
vi.mock("@constants", () => ({
  SINGLE_DIGIT_REGEX: /^[0-9]$/,
  KeyboardKeys: {
    BACKSPACE: "Backspace",
    ARROW_LEFT: "ArrowLeft",
    ARROW_RIGHT: "ArrowRight",
  },
}));

describe("OTP Component", () => {
  const mockOnChange = vi.fn();
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders with default 4 digit inputs", () => {
      render(<OTP />);

      const inputs = screen.getAllByRole("textbox");
      expect(inputs).toHaveLength(4);
    });

    it("renders with custom digit count", () => {
      render(<OTP digitCount={6} />);

      const inputs = screen.getAllByRole("textbox");
      expect(inputs).toHaveLength(6);
    });

    it("renders with custom placeholder", () => {
      render(<OTP placeholder="*" />);

      const inputs = screen.getAllByRole("textbox");
      inputs.forEach(input => {
        expect(input).toHaveAttribute("placeholder", "*");
      });
    });

    it("renders with default underscore placeholder", () => {
      render(<OTP />);

      const inputs = screen.getAllByRole("textbox");
      inputs.forEach(input => {
        expect(input).toHaveAttribute("placeholder", "_");
      });
    });

    it("applies custom className to wrapper div", () => {
      const { container } = render(<OTP className="custom-wrapper" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain("custom-wrapper");
    });

    it("applies custom inputClassName to all inputs", () => {
      render(<OTP inputClassName="custom-input" />);

      const inputs = screen.getAllByRole("textbox");
      inputs.forEach(input => {
        expect(input.className).toContain("custom-input");
      });
    });
  });

  describe("Input Attributes", () => {
    it("sets correct input attributes", () => {
      render(<OTP />);

      const inputs = screen.getAllByRole("textbox");
      inputs.forEach(input => {
        expect(input).toHaveAttribute("type", "text");
        expect(input).toHaveAttribute("inputMode", "numeric");
        expect(input).toHaveAttribute("pattern", "[0-9]*");
        expect(input).toHaveAttribute("maxLength", "1");
      });
    });

    it("sets disabled attribute when disabled prop is true", () => {
      render(<OTP disabled />);

      const inputs = screen.getAllByRole("textbox");
      inputs.forEach(input => {
        expect(input).toBeDisabled();
      });
    });

    it("does not set disabled attribute when disabled prop is false", () => {
      render(<OTP disabled={false} />);

      const inputs = screen.getAllByRole("textbox");
      inputs.forEach(input => {
        expect(input).not.toBeDisabled();
      });
    });

    it("does not autofocus when autoFocus is false", () => {
      render(<OTP autoFocus={false} />);

      const inputs = screen.getAllByRole("textbox");
      inputs.forEach(input => {
        expect(input).not.toHaveAttribute("autoFocus");
      });
    });
  });

  describe("Value Display", () => {
    it("displays provided value correctly", () => {
      render(<OTP value="1234" />);

      const inputs = screen.getAllByRole("textbox") as HTMLInputElement[];
      expect(inputs[0].value).toBe("1");
      expect(inputs[1].value).toBe("2");
      expect(inputs[2].value).toBe("3");
      expect(inputs[3].value).toBe("4");
    });

    it("displays partial value correctly", () => {
      render(<OTP value="12" />);

      const inputs = screen.getAllByRole("textbox") as HTMLInputElement[];
      expect(inputs[0].value).toBe("1");
      expect(inputs[1].value).toBe("2");
      expect(inputs[2].value).toBe("");
      expect(inputs[3].value).toBe("");
    });

    it("displays empty value correctly", () => {
      render(<OTP value="" />);

      const inputs = screen.getAllByRole("textbox") as HTMLInputElement[];
      inputs.forEach(input => {
        expect(input.value).toBe("");
      });
    });

    it("handles value longer than digitCount", () => {
      render(<OTP value="123456" digitCount={4} />);

      const inputs = screen.getAllByRole("textbox") as HTMLInputElement[];
      expect(inputs[0].value).toBe("1");
      expect(inputs[1].value).toBe("2");
      expect(inputs[2].value).toBe("3");
      expect(inputs[3].value).toBe("4");
    });
  });

  describe("Input Change Handling", () => {
    it("calls onChange with new digit when valid digit is entered", () => {
      render(<OTP onChange={mockOnChange} />);

      const inputs = screen.getAllByRole("textbox");
      fireEvent.change(inputs[0], { target: { value: "5" } });

      expect(mockOnChange).toHaveBeenCalledWith("5");
    });

    it("does not call onChange for non-numeric input", () => {
      render(<OTP onChange={mockOnChange} />);

      const inputs = screen.getAllByRole("textbox");
      fireEvent.change(inputs[0], { target: { value: "a" } });

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it("does not call onChange for special characters", () => {
      render(<OTP onChange={mockOnChange} />);

      const inputs = screen.getAllByRole("textbox");
      fireEvent.change(inputs[0], { target: { value: "@" } });

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it("takes only the last character if multiple characters are entered", () => {
      render(<OTP value="1" onChange={mockOnChange} />);

      const inputs = screen.getAllByRole("textbox");
      fireEvent.change(inputs[1], { target: { value: "234" } });

      expect(mockOnChange).toHaveBeenCalledWith("14");
    });

    it("does not call onChange when disabled", () => {
      render(<OTP disabled onChange={mockOnChange} />);

      const inputs = screen.getAllByRole("textbox");
      fireEvent.change(inputs[0], { target: { value: "5" } });

      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe("onComplete Callback", () => {
    it("calls onComplete when all digits are entered", () => {
      render(
        <OTP value="123" onChange={mockOnChange} onComplete={mockOnComplete} digitCount={4} />,
      );

      const inputs = screen.getAllByRole("textbox");
      fireEvent.change(inputs[3], { target: { value: "4" } });

      expect(mockOnComplete).toHaveBeenCalledWith("1234");
    });

    it("does not call onComplete when OTP is incomplete", () => {
      render(<OTP value="12" onChange={mockOnChange} onComplete={mockOnComplete} digitCount={4} />);

      const inputs = screen.getAllByRole("textbox");
      fireEvent.change(inputs[2], { target: { value: "3" } });

      expect(mockOnComplete).not.toHaveBeenCalled();
    });

    it("calls onComplete with custom digitCount", () => {
      render(
        <OTP value="12345" onChange={mockOnChange} onComplete={mockOnComplete} digitCount={6} />,
      );

      const inputs = screen.getAllByRole("textbox");
      fireEvent.change(inputs[5], { target: { value: "6" } });

      expect(mockOnComplete).toHaveBeenCalledWith("123456");
    });
  });

  describe("Arrow Key Navigation", () => {
    it("does not move before first input on ArrowLeft", () => {
      render(<OTP />);

      const inputs = screen.getAllByRole("textbox");
      inputs[0].focus();
      fireEvent.keyDown(inputs[0], { key: "ArrowLeft" });

      expect(document.activeElement).toBe(inputs[0]);
    });

    it("does not move past last input on ArrowRight", () => {
      render(<OTP digitCount={4} />);

      const inputs = screen.getAllByRole("textbox");
      inputs[3].focus();
      fireEvent.keyDown(inputs[3], { key: "ArrowRight" });

      expect(document.activeElement).toBe(inputs[3]);
    });

    it("does not navigate with arrow keys when disabled", () => {
      render(<OTP disabled />);

      const inputs = screen.getAllByRole("textbox");
      inputs[1].focus();
      const initialFocus = document.activeElement;

      fireEvent.keyDown(inputs[1], { key: "ArrowLeft" });

      expect(document.activeElement).toBe(initialFocus);
    });
  });

  describe("Edge Cases", () => {
    it("handles rapid sequential input", () => {
      render(<OTP onChange={mockOnChange} />);

      const inputs = screen.getAllByRole("textbox");

      fireEvent.change(inputs[0], { target: { value: "1" } });
      fireEvent.change(inputs[1], { target: { value: "2" } });
      fireEvent.change(inputs[2], { target: { value: "3" } });

      expect(mockOnChange).toHaveBeenCalledTimes(3);
    });

    it("handles value prop changes", () => {
      const { rerender } = render(<OTP value="12" />);

      let inputs = screen.getAllByRole("textbox") as HTMLInputElement[];
      expect(inputs[0].value).toBe("1");
      expect(inputs[1].value).toBe("2");

      rerender(<OTP value="34" />);

      inputs = screen.getAllByRole("textbox") as HTMLInputElement[];
      expect(inputs[0].value).toBe("3");
      expect(inputs[1].value).toBe("4");
    });

    it("handles digitCount changes", () => {
      const { rerender } = render(<OTP digitCount={4} />);

      let inputs = screen.getAllByRole("textbox");
      expect(inputs).toHaveLength(4);

      rerender(<OTP digitCount={6} />);

      inputs = screen.getAllByRole("textbox");
      expect(inputs).toHaveLength(6);
    });

    it("accepts additional HTML div attributes", () => {
      const { container } = render(<OTP data-testid="otp-wrapper" role="group" />);

      const wrapper = container.querySelector('[data-testid="otp-wrapper"]');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toHaveAttribute("role", "group");
    });
  });

  describe("Default Styling", () => {
    it("applies default wrapper classes", () => {
      const { container } = render(<OTP />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain("flex");
      expect(wrapper.className).toContain("gap-6");
      expect(wrapper.className).toContain("items-center");
    });

    it("applies default input classes", () => {
      render(<OTP />);

      const inputs = screen.getAllByRole("textbox");
      inputs.forEach(input => {
        expect(input.className).toContain("w-[64px]");
        expect(input.className).toContain("h-[64px]");
        expect(input.className).toContain("bg-[#F5F5F5]");
        expect(input.className).toContain("rounded-[12px]");
        expect(input.className).toContain("text-center");
      });
    });
  });

  describe("Input Validation", () => {
    it("accepts single digit 0-9", () => {
      render(<OTP onChange={mockOnChange} />);

      const inputs = screen.getAllByRole("textbox");
      const digits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

      digits.forEach((digit, index) => {
        vi.clearAllMocks();
        fireEvent.change(inputs[0], { target: { value: digit } });
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it("rejects alphabetic characters", () => {
      render(<OTP onChange={mockOnChange} />);

      const inputs = screen.getAllByRole("textbox");
      const letters = ["a", "z", "A", "Z"];

      letters.forEach(letter => {
        vi.clearAllMocks();
        fireEvent.change(inputs[0], { target: { value: letter } });
        expect(mockOnChange).not.toHaveBeenCalled();
      });
    });

    it("rejects spaces", () => {
      render(<OTP onChange={mockOnChange} />);

      const inputs = screen.getAllByRole("textbox");
      fireEvent.change(inputs[0], { target: { value: " " } });

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it("rejects empty string input", () => {
      render(<OTP onChange={mockOnChange} />);

      const inputs = screen.getAllByRole("textbox");
      fireEvent.change(inputs[0], { target: { value: "" } });

      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });
});
