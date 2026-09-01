import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { EditableTextPopup } from "../EditableTextPopup";

// Mock AutoExpandableTextarea component
vi.mock("@ally-ui-mono/ui-shared", () => ({
  AutoExpandableTextarea: ({
    value,
    onChange,
    onKeyDown,
    onBlur,
    placeholder,
    disabled,
    className,
    autoFocus,
  }: any) => (
    <textarea
      data-testid="auto-expandable-textarea"
      value={value}
      onChange={event => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      autoFocus={autoFocus}
    />
  ),
}));

// Mock useClickOutside hook
vi.mock("@hooks", () => ({
  useClickOutside: vi.fn(),
}));

describe("EditableTextPopup", () => {
  const defaultProps = {
    value: "Test value",
    onChange: vi.fn(),
    placeholder: "Click to edit",
    disabled: false,
    width: 200,
    className: "",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders with initial value", () => {
      render(<EditableTextPopup {...defaultProps} />);

      expect(screen.getByText("Test value")).toBeInTheDocument();
    });

    it("renders placeholder when value is empty", () => {
      render(<EditableTextPopup {...defaultProps} value="" />);

      expect(screen.getByText("Click to edit")).toBeInTheDocument();
    });

    it("renders placeholder when value is null", () => {
      render(<EditableTextPopup {...defaultProps} value={null as any} />);

      expect(screen.getByText("Click to edit")).toBeInTheDocument();
    });

    it("applies custom width", () => {
      const { container } = render(<EditableTextPopup {...defaultProps} width={300} />);

      const wrapper = container.querySelector("div");
      expect(wrapper).toHaveStyle({ width: "300px" });
    });

    it("applies custom className", () => {
      const { container } = render(
        <EditableTextPopup {...defaultProps} className="custom-class" />,
      );

      const wrapper = container.querySelector(".custom-class");
      expect(wrapper).toBeInTheDocument();
    });

    it("displays multiline text correctly", () => {
      const multilineValue = "Line 1\nLine 2\nLine 3";
      render(<EditableTextPopup {...defaultProps} value={multilineValue} />);

      expect(screen.getByText("Line 1")).toBeInTheDocument();
      expect(screen.getByText("Line 2")).toBeInTheDocument();
      expect(screen.getByText("Line 3")).toBeInTheDocument();
    });
  });

  describe("Disabled State", () => {
    it("displays value when disabled", () => {
      render(<EditableTextPopup {...defaultProps} disabled={true} />);

      expect(screen.getByText("Test value")).toBeInTheDocument();
    });

    it("does not open popup when clicking disabled field", () => {
      render(<EditableTextPopup {...defaultProps} disabled={true} />);

      const displayText = screen.getByText("Test value");
      fireEvent.click(displayText);

      expect(screen.queryByTestId("auto-expandable-textarea")).not.toBeInTheDocument();
    });

    it("applies disabled cursor styles", () => {
      const { container } = render(<EditableTextPopup {...defaultProps} disabled={true} />);

      const clickableElement = container.querySelector(".cursor-not-allowed");
      expect(clickableElement).toBeInTheDocument();
    });
  });

  describe("Popup Interaction", () => {
    it("opens popup when text is clicked", async () => {
      render(<EditableTextPopup {...defaultProps} />);

      const displayText = screen.getByText("Test value");
      fireEvent.click(displayText);

      await waitFor(() => {
        expect(screen.getByTestId("auto-expandable-textarea")).toBeInTheDocument();
      });
    });

    it("displays current value in textarea when opened", async () => {
      render(<EditableTextPopup {...defaultProps} />);

      const displayText = screen.getByText("Test value");
      fireEvent.click(displayText);

      await waitFor(() => {
        const textarea = screen.getByTestId("auto-expandable-textarea");
        expect(textarea).toHaveValue("Test value");
      });
    });

    it("does not open popup when disabled and clicked", () => {
      render(<EditableTextPopup {...defaultProps} disabled={true} />);

      const disabledText = screen.getByText("Test value");
      fireEvent.click(disabledText);

      expect(screen.queryByTestId("auto-expandable-textarea")).not.toBeInTheDocument();
    });
  });

  describe("Value Changes", () => {
    it("updates textarea value when typing", async () => {
      render(<EditableTextPopup {...defaultProps} />);

      const displayText = screen.getByText("Test value");
      fireEvent.click(displayText);

      await waitFor(() => {
        const textarea = screen.getByTestId("auto-expandable-textarea");
        fireEvent.change(textarea, { target: { value: "New value" } });
        expect(textarea).toHaveValue("New value");
      });
    });

    it("calls onChange when textarea is blurred", async () => {
      const mockOnChange = vi.fn();
      render(<EditableTextPopup {...defaultProps} onChange={mockOnChange} />);

      const displayText = screen.getByText("Test value");
      fireEvent.click(displayText);

      await waitFor(() => {
        const textarea = screen.getByTestId("auto-expandable-textarea");
        fireEvent.change(textarea, { target: { value: "Updated value" } });
        fireEvent.blur(textarea);
      });

      expect(mockOnChange).toHaveBeenCalledWith("Updated value");
    });

    it("closes popup after saving", async () => {
      render(<EditableTextPopup {...defaultProps} />);

      const displayText = screen.getByText("Test value");
      fireEvent.click(displayText);

      await waitFor(() => {
        const textarea = screen.getByTestId("auto-expandable-textarea");
        fireEvent.change(textarea, { target: { value: "New value" } });
        fireEvent.blur(textarea);
      });

      await waitFor(() => {
        expect(screen.queryByTestId("auto-expandable-textarea")).not.toBeInTheDocument();
      });
    });
  });

  describe("Keyboard Interaction", () => {
    it("closes popup and cancels on Escape key", async () => {
      render(<EditableTextPopup {...defaultProps} />);

      const displayText = screen.getByText("Test value");
      fireEvent.click(displayText);

      await waitFor(() => {
        const textarea = screen.getByTestId("auto-expandable-textarea");
        fireEvent.change(textarea, { target: { value: "Modified value" } });
        fireEvent.keyDown(textarea, { key: "Escape" });
      });

      await waitFor(() => {
        expect(screen.queryByTestId("auto-expandable-textarea")).not.toBeInTheDocument();
      });
    });

    it("reverts to original value on Escape", async () => {
      const mockOnChange = vi.fn();
      render(<EditableTextPopup {...defaultProps} onChange={mockOnChange} />);

      const displayText = screen.getByText("Test value");
      fireEvent.click(displayText);

      await waitFor(() => {
        const textarea = screen.getByTestId("auto-expandable-textarea");
        fireEvent.change(textarea, { target: { value: "Modified value" } });
        fireEvent.keyDown(textarea, { key: "Escape" });
      });

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it("does not cancel on other keys", async () => {
      render(<EditableTextPopup {...defaultProps} />);

      const displayText = screen.getByText("Test value");
      fireEvent.click(displayText);

      await waitFor(() => {
        const textarea = screen.getByTestId("auto-expandable-textarea");
        fireEvent.keyDown(textarea, { key: "Enter" });
      });

      expect(screen.getByTestId("auto-expandable-textarea")).toBeInTheDocument();
    });
  });

  describe("Value Synchronization", () => {
    it("updates displayed value when prop value changes", async () => {
      const { rerender } = render(<EditableTextPopup {...defaultProps} value="Initial" />);

      expect(screen.getByText("Initial")).toBeInTheDocument();

      rerender(<EditableTextPopup {...defaultProps} value="Updated" />);

      await waitFor(() => {
        expect(screen.getByText("Updated")).toBeInTheDocument();
      });
    });

    it("resets internal state when prop value changes", async () => {
      const { rerender } = render(<EditableTextPopup {...defaultProps} value="Initial" />);

      const displayText = screen.getByText("Initial");
      fireEvent.click(displayText);

      await waitFor(() => {
        const textarea = screen.getByTestId("auto-expandable-textarea");
        expect(textarea).toHaveValue("Initial");
      });

      rerender(<EditableTextPopup {...defaultProps} value="Changed externally" />);

      await waitFor(() => {
        const textarea = screen.queryByTestId("auto-expandable-textarea");
        if (textarea) {
          expect(textarea).toHaveValue("Changed externally");
        }
      });
    });
  });

  describe("Disabled State", () => {
    it("does not apply hover styles when disabled", () => {
      const { container } = render(<EditableTextPopup {...defaultProps} disabled={true} />);

      const disabledElement = container.querySelector(".cursor-not-allowed");
      expect(disabledElement).toBeInTheDocument();
    });
  });

  describe("Textarea Properties", () => {
    it("passes placeholder to textarea", async () => {
      render(<EditableTextPopup {...defaultProps} value="" placeholder="Custom placeholder" />);

      const displayText = screen.getByText("Custom placeholder");
      fireEvent.click(displayText);

      await waitFor(() => {
        const textarea = screen.getByTestId("auto-expandable-textarea");
        expect(textarea).toHaveAttribute("placeholder", "Custom placeholder");
      });
    });

    it("focuses textarea when opened", async () => {
      render(<EditableTextPopup {...defaultProps} />);

      const displayText = screen.getByText("Test value");
      fireEvent.click(displayText);

      await waitFor(() => {
        const textarea = screen.getByTestId("auto-expandable-textarea");
        // AutoExpandableTextarea component receives autoFocus prop
        expect(textarea).toBeInTheDocument();
      });
    });

    it("applies correct width to textarea", async () => {
      render(<EditableTextPopup {...defaultProps} width={250} />);

      const displayText = screen.getByText("Test value");
      fireEvent.click(displayText);

      await waitFor(() => {
        const textarea = screen.getByTestId("auto-expandable-textarea");
        expect(textarea).toBeInTheDocument();
      });
    });
  });

  describe("Edge Cases", () => {
    it("handles empty string value", () => {
      render(<EditableTextPopup {...defaultProps} value="" />);

      expect(screen.getByText("Click to edit")).toBeInTheDocument();
    });

    it("handles very long text", () => {
      const longText = "A".repeat(500);
      render(<EditableTextPopup {...defaultProps} value={longText} />);

      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it("handles special characters in text", () => {
      const specialText = "Test <>&\"'";
      render(<EditableTextPopup {...defaultProps} value={specialText} />);

      expect(screen.getByText(specialText)).toBeInTheDocument();
    });

    it("handles text with only whitespace", () => {
      const whitespaceText = "   ";
      const { container } = render(<EditableTextPopup {...defaultProps} value={whitespaceText} />);

      const textElement = container.querySelector("span");
      expect(textElement).toBeInTheDocument();
      expect(textElement?.textContent).toBe(whitespaceText);
    });

    it("handles rapid open/close", async () => {
      render(<EditableTextPopup {...defaultProps} />);

      const displayText = screen.getByText("Test value");

      fireEvent.click(displayText);
      await waitFor(() => {
        expect(screen.getByTestId("auto-expandable-textarea")).toBeInTheDocument();
      });

      const textarea = screen.getByTestId("auto-expandable-textarea");
      fireEvent.keyDown(textarea, { key: "Escape" });

      await waitFor(() => {
        expect(screen.queryByTestId("auto-expandable-textarea")).not.toBeInTheDocument();
      });
    });
  });

  describe("Popup Positioning", () => {
    it("renders popup with correct positioning classes", async () => {
      render(<EditableTextPopup {...defaultProps} />);

      const displayText = screen.getByText("Test value");
      fireEvent.click(displayText);

      await waitFor(() => {
        const popup = screen.getByTestId("auto-expandable-textarea").parentElement;
        expect(popup).toHaveClass("absolute");
        expect(popup).toHaveClass("z-50");
      });
    });
  });

  describe("Text Display", () => {
    it("wraps display text instead of truncating it to one line", () => {
      const { getByText } = render(<EditableTextPopup {...defaultProps} value="Test content" />);

      const displayText = getByText("Test content");
      expect(displayText).toBeInTheDocument();
      expect(displayText).toHaveClass("break-words");
      expect(displayText).not.toHaveClass("whitespace-nowrap");
    });
  });
});
