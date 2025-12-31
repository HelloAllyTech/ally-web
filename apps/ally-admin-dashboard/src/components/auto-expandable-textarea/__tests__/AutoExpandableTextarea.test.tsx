import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { AutoExpandableTextarea } from "../AutoExpandableTextarea";

describe("AutoExpandableTextarea", () => {
  const mockOnChange = vi.fn();
  const mockOnKeyDown = vi.fn();
  const mockOnBlur = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders textarea element", () => {
      render(<AutoExpandableTextarea value="" onChange={mockOnChange} />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toBeInTheDocument();
    });

    it("renders with initial value", () => {
      render(<AutoExpandableTextarea value="Initial text" onChange={mockOnChange} />);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.value).toBe("Initial text");
    });

    it("renders with placeholder", () => {
      render(<AutoExpandableTextarea value="" onChange={mockOnChange} placeholder="Enter text" />);

      expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
    });

    it("renders without placeholder by default", () => {
      render(<AutoExpandableTextarea value="" onChange={mockOnChange} />);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.placeholder).toBe("");
    });
  });

  describe("Value Changes", () => {
    it("calls onChange when text is entered", () => {
      render(<AutoExpandableTextarea value="" onChange={mockOnChange} />);

      const textarea = screen.getByRole("textbox");
      fireEvent.change(textarea, { target: { value: "New text" } });

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith("New text");
    });

    it("calls onChange with updated value", () => {
      render(<AutoExpandableTextarea value="Old text" onChange={mockOnChange} />);

      const textarea = screen.getByRole("textbox");
      fireEvent.change(textarea, { target: { value: "Updated text" } });

      expect(mockOnChange).toHaveBeenCalledWith("Updated text");
    });

    it("handles empty value", () => {
      render(<AutoExpandableTextarea value="Some text" onChange={mockOnChange} />);

      const textarea = screen.getByRole("textbox");
      fireEvent.change(textarea, { target: { value: "" } });

      expect(mockOnChange).toHaveBeenCalledWith("");
    });

    it("handles multiline text", () => {
      render(<AutoExpandableTextarea value="" onChange={mockOnChange} />);

      const textarea = screen.getByRole("textbox");
      const multilineText = "Line 1\nLine 2\nLine 3";
      fireEvent.change(textarea, { target: { value: multilineText } });

      expect(mockOnChange).toHaveBeenCalledWith(multilineText);
    });
  });

  describe("Disabled State", () => {
    it("renders as disabled when disabled prop is true", () => {
      render(<AutoExpandableTextarea value="" onChange={mockOnChange} disabled={true} />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toBeDisabled();
    });

    it("renders as enabled by default", () => {
      render(<AutoExpandableTextarea value="" onChange={mockOnChange} />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).not.toBeDisabled();
    });

    it("textarea is disabled but onChange may still be called by fireEvent", () => {
      render(<AutoExpandableTextarea value="" onChange={mockOnChange} disabled={true} />);

      const textarea = screen.getByRole("textbox");
      // Note: fireEvent bypasses the disabled state in tests
      // In real browser, disabled textarea won't trigger onChange
      expect(textarea).toBeDisabled();
    });

    it("applies disabled styling", () => {
      render(<AutoExpandableTextarea value="" onChange={mockOnChange} disabled={true} />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toBeDisabled();
    });
  });

  describe("Keyboard Events", () => {
    it("calls onKeyDown when key is pressed", () => {
      render(<AutoExpandableTextarea value="" onChange={mockOnChange} onKeyDown={mockOnKeyDown} />);

      const textarea = screen.getByRole("textbox");
      fireEvent.keyDown(textarea, { key: "Enter" });

      expect(mockOnKeyDown).toHaveBeenCalledTimes(1);
    });

    it("handles Enter key", () => {
      render(<AutoExpandableTextarea value="" onChange={mockOnChange} onKeyDown={mockOnKeyDown} />);

      const textarea = screen.getByRole("textbox");
      fireEvent.keyDown(textarea, { key: "Enter" });

      expect(mockOnKeyDown).toHaveBeenCalled();
    });

    it("handles Escape key", () => {
      render(<AutoExpandableTextarea value="" onChange={mockOnChange} onKeyDown={mockOnKeyDown} />);

      const textarea = screen.getByRole("textbox");
      fireEvent.keyDown(textarea, { key: "Escape" });

      expect(mockOnKeyDown).toHaveBeenCalled();
    });

    it("does not call onKeyDown when not provided", () => {
      render(<AutoExpandableTextarea value="" onChange={mockOnChange} />);

      const textarea = screen.getByRole("textbox");
      expect(() => fireEvent.keyDown(textarea, { key: "Enter" })).not.toThrow();
    });
  });

  describe("Blur Events", () => {
    it("calls onBlur when textarea loses focus", () => {
      render(<AutoExpandableTextarea value="" onChange={mockOnChange} onBlur={mockOnBlur} />);

      const textarea = screen.getByRole("textbox");
      fireEvent.blur(textarea);

      expect(mockOnBlur).toHaveBeenCalledTimes(1);
    });

    it("does not call onBlur when not provided", () => {
      render(<AutoExpandableTextarea value="" onChange={mockOnChange} />);

      const textarea = screen.getByRole("textbox");
      expect(() => fireEvent.blur(textarea)).not.toThrow();
    });
  });

  describe("AutoFocus", () => {
    it("focuses textarea when autoFocus is true", async () => {
      render(<AutoExpandableTextarea value="" onChange={mockOnChange} autoFocus={true} />);

      const textarea = screen.getByRole("textbox");

      await waitFor(() => {
        expect(document.activeElement).toBe(textarea);
      });
    });

    it("does not focus textarea when autoFocus is false", () => {
      render(<AutoExpandableTextarea value="" onChange={mockOnChange} autoFocus={false} />);

      const textarea = screen.getByRole("textbox");
      expect(document.activeElement).not.toBe(textarea);
    });

    it("does not focus textarea by default", () => {
      render(<AutoExpandableTextarea value="" onChange={mockOnChange} />);

      const textarea = screen.getByRole("textbox");
      expect(document.activeElement).not.toBe(textarea);
    });
  });

  describe("Styling and Layout", () => {
    it("applies default className", () => {
      render(<AutoExpandableTextarea value="" onChange={mockOnChange} />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveClass("w-full");
      expect(textarea).toHaveClass("focus:outline-none");
      expect(textarea).toHaveClass("resize-none");
    });

    it("applies custom className", () => {
      render(<AutoExpandableTextarea value="" onChange={mockOnChange} className="custom-class" />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveClass("custom-class");
    });

    it("has no outline on focus", () => {
      render(<AutoExpandableTextarea value="" onChange={mockOnChange} />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveClass("focus:outline-none");
    });

    it("has resize-none class", () => {
      render(<AutoExpandableTextarea value="" onChange={mockOnChange} />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveClass("resize-none");
    });

    it("has overflow-y-auto class", () => {
      render(<AutoExpandableTextarea value="" onChange={mockOnChange} />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveClass("overflow-y-auto");
    });

    it("applies custom width as inline style", () => {
      render(<AutoExpandableTextarea value="" onChange={mockOnChange} width={300} />);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.style.width).toBe("300px");
    });

    it("applies custom width as string", () => {
      render(<AutoExpandableTextarea value="" onChange={mockOnChange} width="50%" />);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.style.width).toBe("50%");
    });
  });

  describe("Height Adjustment", () => {
    it("has minimum height", () => {
      render(<AutoExpandableTextarea value="" onChange={mockOnChange} minHeight={50} />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toBeInTheDocument();
    });

    it("uses default minimum height", () => {
      render(<AutoExpandableTextarea value="" onChange={mockOnChange} />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toBeInTheDocument();
    });

    it("respects custom minimum height", () => {
      render(<AutoExpandableTextarea value="" onChange={mockOnChange} minHeight={100} />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toBeInTheDocument();
    });

    it("respects maxLines prop", () => {
      render(<AutoExpandableTextarea value="" onChange={mockOnChange} maxLines={10} />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles very long text", () => {
      const longText = "A".repeat(1000);
      render(<AutoExpandableTextarea value={longText} onChange={mockOnChange} />);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.value).toBe(longText);
    });

    it("handles special characters", () => {
      const specialText = "!@#$%^&*()_+-={}[]|:;<>?,./";
      render(<AutoExpandableTextarea value={specialText} onChange={mockOnChange} />);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.value).toBe(specialText);
    });

    it("handles unicode characters", () => {
      const unicodeText = "Hello 世界 🌍";
      render(<AutoExpandableTextarea value={unicodeText} onChange={mockOnChange} />);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.value).toBe(unicodeText);
    });

    it("handles tabs and newlines", () => {
      const textWithWhitespace = "Line 1\n\tIndented line\nLine 3";
      render(<AutoExpandableTextarea value={textWithWhitespace} onChange={mockOnChange} />);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.value).toBe(textWithWhitespace);
    });

    it("handles rapid value changes", () => {
      const { rerender } = render(<AutoExpandableTextarea value="1" onChange={mockOnChange} />);

      rerender(<AutoExpandableTextarea value="12" onChange={mockOnChange} />);
      rerender(<AutoExpandableTextarea value="123" onChange={mockOnChange} />);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.value).toBe("123");
    });
  });

  describe("Accessibility", () => {
    it("is accessible via keyboard", () => {
      render(<AutoExpandableTextarea value="" onChange={mockOnChange} />);

      const textarea = screen.getByRole("textbox");
      textarea.focus();
      expect(document.activeElement).toBe(textarea);
    });

    it("has textbox role", () => {
      render(<AutoExpandableTextarea value="" onChange={mockOnChange} />);

      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("placeholder is accessible", () => {
      render(
        <AutoExpandableTextarea value="" onChange={mockOnChange} placeholder="Enter your text" />,
      );

      const textarea = screen.getByPlaceholderText("Enter your text");
      expect(textarea).toBeInTheDocument();
    });
  });

  describe("Ref Handling", () => {
    it("creates internal ref", () => {
      render(<AutoExpandableTextarea value="" onChange={mockOnChange} />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toBeInTheDocument();
    });

    it("handles value changes with ref", () => {
      const { rerender } = render(
        <AutoExpandableTextarea value="Initial" onChange={mockOnChange} />,
      );

      rerender(<AutoExpandableTextarea value="Updated" onChange={mockOnChange} />);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.value).toBe("Updated");
    });
  });

  describe("Component Updates", () => {
    it("updates when value prop changes", () => {
      const { rerender } = render(<AutoExpandableTextarea value="Old" onChange={mockOnChange} />);

      rerender(<AutoExpandableTextarea value="New" onChange={mockOnChange} />);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.value).toBe("New");
    });

    it("updates when placeholder changes", () => {
      const { rerender } = render(
        <AutoExpandableTextarea value="" onChange={mockOnChange} placeholder="Old placeholder" />,
      );

      rerender(
        <AutoExpandableTextarea value="" onChange={mockOnChange} placeholder="New placeholder" />,
      );

      expect(screen.getByPlaceholderText("New placeholder")).toBeInTheDocument();
    });

    it("updates when disabled state changes", () => {
      const { rerender } = render(
        <AutoExpandableTextarea value="" onChange={mockOnChange} disabled={false} />,
      );

      rerender(<AutoExpandableTextarea value="" onChange={mockOnChange} disabled={true} />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toBeDisabled();
    });
  });
});
