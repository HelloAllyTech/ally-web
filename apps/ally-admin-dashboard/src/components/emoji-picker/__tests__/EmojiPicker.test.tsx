import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { EmojiPickerComponent } from "../EmojiPicker";

// Mock emoji-picker-react
vi.mock("emoji-picker-react", () => ({
  default: ({ onEmojiClick }: any) => (
    <div data-testid="emoji-picker">
      <button
        data-testid="emoji-option-😊"
        onClick={() => onEmojiClick({ emoji: "😊", unified: "1f60a" })}
      >
        😊
      </button>
      <button
        data-testid="emoji-option-👍"
        onClick={() => onEmojiClick({ emoji: "👍", unified: "1f44d" })}
      >
        👍
      </button>
      <button
        data-testid="emoji-option-❤️"
        onClick={() => onEmojiClick({ emoji: "❤️", unified: "2764" })}
      >
        ❤️
      </button>
    </div>
  ),
  Theme: {
    LIGHT: "light",
    DARK: "dark",
    AUTO: "auto",
  },
}));

// Mock ArrowDownFilled asset
vi.mock("@assets", () => ({
  ArrowDownFilled: () => <svg data-testid="arrow-down-icon">▼</svg>,
}));

// Mock useClickOutside hook
const mockUseClickOutside = vi.fn();
vi.mock("@hooks", () => ({
  useClickOutside: (ref: any, callback: any) => {
    mockUseClickOutside(ref, callback);
    // Store callback for testing
    if (ref.current) {
      ref.current._closeCallback = callback;
    }
  },
}));

describe("EmojiPickerComponent", () => {
  const mockOnEmojiClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders with default emoji button", () => {
      render(<EmojiPickerComponent />);

      expect(screen.getByText("😀")).toBeInTheDocument();
    });

    it("renders with custom button text", () => {
      render(<EmojiPickerComponent buttonText="🎉" />);

      expect(screen.getByText("🎉")).toBeInTheDocument();
    });

    it("renders arrow down icon", () => {
      render(<EmojiPickerComponent />);

      expect(screen.getByTestId("arrow-down-icon")).toBeInTheDocument();
    });

    it("does not render picker initially", () => {
      render(<EmojiPickerComponent />);

      expect(screen.queryByTestId("emoji-picker")).not.toBeInTheDocument();
    });

    it("applies custom className", () => {
      const { container } = render(<EmojiPickerComponent className="custom-class" />);

      const wrapper = container.querySelector(".custom-class");
      expect(wrapper).toBeInTheDocument();
    });

    it("applies custom buttonClassName", () => {
      render(<EmojiPickerComponent buttonClassName="custom-button-class" />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("custom-button-class");
    });

    it("button has flex layout", () => {
      render(<EmojiPickerComponent />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("flex");
      expect(button).toHaveClass("items-center");
      expect(button).toHaveClass("justify-center");
    });

    it("emoji has correct text size", () => {
      const { container } = render(<EmojiPickerComponent />);

      const emojiSpan = container.querySelector(".text-xl");
      expect(emojiSpan).toBeInTheDocument();
    });
  });

  describe("Opening and Closing Picker", () => {
    it("opens picker when button is clicked", () => {
      render(<EmojiPickerComponent />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(screen.getByTestId("emoji-picker")).toBeInTheDocument();
    });

    it("closes picker when button is clicked again", () => {
      render(<EmojiPickerComponent />);

      const button = screen.getByRole("button");

      fireEvent.click(button);
      expect(screen.getByTestId("emoji-picker")).toBeInTheDocument();

      fireEvent.click(button);
      expect(screen.queryByTestId("emoji-picker")).not.toBeInTheDocument();
    });

    it("toggles picker state correctly", () => {
      render(<EmojiPickerComponent />);

      const button = screen.getByRole("button");

      fireEvent.click(button);
      expect(screen.getByTestId("emoji-picker")).toBeInTheDocument();

      fireEvent.click(button);
      expect(screen.queryByTestId("emoji-picker")).not.toBeInTheDocument();

      fireEvent.click(button);
      expect(screen.getByTestId("emoji-picker")).toBeInTheDocument();
    });

    it("registers click outside handler", () => {
      render(<EmojiPickerComponent />);

      expect(mockUseClickOutside).toHaveBeenCalled();
    });

    it("closes picker when clicking outside", () => {
      const { container } = render(<EmojiPickerComponent />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(screen.getByTestId("emoji-picker")).toBeInTheDocument();

      // Simulate click outside
      const pickerRef = container.querySelector(".relative");
      if (pickerRef && (pickerRef as any)._closeCallback) {
        (pickerRef as any)._closeCallback();
      }

      waitFor(() => {
        expect(screen.queryByTestId("emoji-picker")).not.toBeInTheDocument();
      });
    });
  });

  describe("Emoji Selection", () => {
    it("calls onEmojiClick when emoji is selected", () => {
      render(<EmojiPickerComponent onEmojiClick={mockOnEmojiClick} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const emojiOption = screen.getByTestId("emoji-option-😊");
      fireEvent.click(emojiOption);

      expect(mockOnEmojiClick).toHaveBeenCalledWith("😊");
    });

    it("updates button with selected emoji", () => {
      render(<EmojiPickerComponent onEmojiClick={mockOnEmojiClick} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const emojiOption = screen.getByTestId("emoji-option-👍");
      fireEvent.click(emojiOption);

      expect(screen.getByText("👍")).toBeInTheDocument();
    });

    it("closes picker after emoji selection", () => {
      render(<EmojiPickerComponent onEmojiClick={mockOnEmojiClick} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const emojiOption = screen.getByTestId("emoji-option-❤️");
      fireEvent.click(emojiOption);

      expect(screen.queryByTestId("emoji-picker")).not.toBeInTheDocument();
    });

    it("handles multiple emoji selections", () => {
      render(<EmojiPickerComponent onEmojiClick={mockOnEmojiClick} />);

      const button = screen.getByRole("button");

      // First selection
      fireEvent.click(button);
      fireEvent.click(screen.getByTestId("emoji-option-😊"));
      expect(mockOnEmojiClick).toHaveBeenCalledWith("😊");

      // Second selection
      fireEvent.click(button);
      fireEvent.click(screen.getByTestId("emoji-option-👍"));
      expect(mockOnEmojiClick).toHaveBeenCalledWith("👍");

      expect(mockOnEmojiClick).toHaveBeenCalledTimes(2);
    });

    it("works without onEmojiClick callback", () => {
      render(<EmojiPickerComponent />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const emojiOption = screen.getByTestId("emoji-option-😊");
      expect(() => fireEvent.click(emojiOption)).not.toThrow();
    });
  });

  describe("Disabled State", () => {
    it("renders disabled button", () => {
      render(<EmojiPickerComponent disabled={true} />);

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    it("has disabled styling", () => {
      render(<EmojiPickerComponent disabled={true} />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("cursor-not-allowed");
      expect(button).toHaveClass("opacity-50");
    });

    it("does not open picker when disabled", () => {
      render(<EmojiPickerComponent disabled={true} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(screen.queryByTestId("emoji-picker")).not.toBeInTheDocument();
    });

    it("does not show picker when disabled prop is true", () => {
      const { rerender } = render(<EmojiPickerComponent />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(screen.getByTestId("emoji-picker")).toBeInTheDocument();

      rerender(<EmojiPickerComponent disabled={true} />);

      expect(screen.queryByTestId("emoji-picker")).not.toBeInTheDocument();
    });
  });

  describe("Picker Positioning", () => {
    beforeEach(() => {
      // Mock getBoundingClientRect
      Element.prototype.getBoundingClientRect = vi.fn(() => ({
        bottom: 100,
        height: 40,
        left: 0,
        right: 100,
        top: 60,
        width: 100,
        x: 0,
        y: 60,
        toJSON: () => {},
      }));

      // Mock window.innerHeight
      Object.defineProperty(window, "innerHeight", {
        writable: true,
        configurable: true,
        value: 800,
      });
    });

    it("positions picker below button by default", () => {
      const { container } = render(<EmojiPickerComponent />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const picker = container.querySelector(".top-full");
      expect(picker).toBeInTheDocument();
    });

    it("positions picker above button when insufficient space below", () => {
      // Mock insufficient space below
      Element.prototype.getBoundingClientRect = vi.fn(() => ({
        bottom: 750,
        height: 40,
        left: 0,
        right: 100,
        top: 710,
        width: 100,
        x: 0,
        y: 710,
        toJSON: () => {},
      }));

      const { container } = render(<EmojiPickerComponent height={450} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const picker = container.querySelector(".bottom-full");
      expect(picker).toBeInTheDocument();
    });

    it("applies custom width", () => {
      const { container } = render(<EmojiPickerComponent width={400} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const picker = container.querySelector("[style*='width']");
      expect(picker).toHaveStyle({ width: "400px" });
    });

    it("applies custom height", () => {
      const { container } = render(<EmojiPickerComponent height={500} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const picker = container.querySelector("[style*='height']");
      expect(picker).toHaveStyle({ height: "500px" });
    });

    it("picker has correct z-index", () => {
      const { container } = render(<EmojiPickerComponent />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const picker = container.querySelector(".z-50");
      expect(picker).toBeInTheDocument();
    });

    it("picker has shadow and rounded corners", () => {
      const { container } = render(<EmojiPickerComponent />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const picker = container.querySelector(".shadow-lg.rounded-lg");
      expect(picker).toBeInTheDocument();
    });

    it("picker is positioned absolutely", () => {
      const { container } = render(<EmojiPickerComponent />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const picker = container.querySelector(".absolute");
      expect(picker).toBeInTheDocument();
    });

    it("picker is aligned to the right", () => {
      const { container } = render(<EmojiPickerComponent />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const picker = container.querySelector(".right-0");
      expect(picker).toBeInTheDocument();
    });
  });

  describe("Button Text Updates", () => {
    it("updates emoji when buttonText prop changes", () => {
      const { rerender } = render(<EmojiPickerComponent buttonText="😀" />);

      expect(screen.getByText("😀")).toBeInTheDocument();

      rerender(<EmojiPickerComponent buttonText="🎉" />);

      expect(screen.getByText("🎉")).toBeInTheDocument();
    });

    it("updates emoji when buttonText prop changes after selection", () => {
      const { rerender } = render(<EmojiPickerComponent buttonText="😀" />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const emojiOption = screen.getByTestId("emoji-option-😊");
      fireEvent.click(emojiOption);

      expect(screen.getByText("😊")).toBeInTheDocument();

      // When buttonText prop changes, it should update due to useEffect
      rerender(<EmojiPickerComponent buttonText="🎉" />);

      expect(screen.getByText("🎉")).toBeInTheDocument();
    });
  });

  describe("Container Structure", () => {
    it("has relative positioning", () => {
      const { container } = render(<EmojiPickerComponent />);

      const wrapper = container.querySelector(".relative");
      expect(wrapper).toBeInTheDocument();
    });

    it("has full width", () => {
      const { container } = render(<EmojiPickerComponent />);

      const wrapper = container.querySelector(".w-full");
      expect(wrapper).toBeInTheDocument();
    });

    it("button has full width", () => {
      render(<EmojiPickerComponent />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("w-full");
    });

    it("button has gap between emoji and arrow", () => {
      render(<EmojiPickerComponent />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("gap-2");
    });
  });

  describe("Accessibility", () => {
    it("button is keyboard accessible", () => {
      render(<EmojiPickerComponent />);

      const button = screen.getByRole("button");
      button.focus();
      expect(document.activeElement).toBe(button);
    });

    it("button has proper role", () => {
      render(<EmojiPickerComponent />);

      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("disabled button is not clickable", () => {
      render(<EmojiPickerComponent disabled={true} onEmojiClick={mockOnEmojiClick} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(mockOnEmojiClick).not.toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("handles rapid clicking", () => {
      render(<EmojiPickerComponent />);

      const button = screen.getByRole("button");

      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(screen.queryByTestId("emoji-picker")).not.toBeInTheDocument();
    });

    it("handles emoji selection without closing callback", () => {
      render(<EmojiPickerComponent />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const emojiOption = screen.getByTestId("emoji-option-😊");
      expect(() => fireEvent.click(emojiOption)).not.toThrow();
    });

    it("handles string width and height", () => {
      const { container } = render(<EmojiPickerComponent width="400px" height="500px" />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const picker = container.querySelector("[style*='width']");
      expect(picker).toHaveStyle({ width: "400px" });
    });

    it("handles numeric width and height", () => {
      const { container } = render(<EmojiPickerComponent width={400} height={500} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const picker = container.querySelector("[style*='width']");
      expect(picker).toHaveStyle({ width: "400px" });
    });

    it("maintains state across re-renders", () => {
      const { rerender } = render(<EmojiPickerComponent />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(screen.getByTestId("emoji-picker")).toBeInTheDocument();

      rerender(<EmojiPickerComponent />);

      expect(screen.getByTestId("emoji-picker")).toBeInTheDocument();
    });
  });

  describe("Styling Details", () => {
    it("arrow icon container has correct size", () => {
      const { container } = render(<EmojiPickerComponent />);

      const arrowContainer = container.querySelector(".w-2.h-2");
      expect(arrowContainer).toBeInTheDocument();
    });

    it("emoji span has minimum width", () => {
      const { container } = render(<EmojiPickerComponent />);

      const emojiSpan = container.querySelector(".min-w-\\[20px\\]");
      expect(emojiSpan).toBeInTheDocument();
    });

    it("picker has overflow hidden", () => {
      const { container } = render(<EmojiPickerComponent />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const picker = container.querySelector(".overflow-hidden");
      expect(picker).toBeInTheDocument();
    });

    it("picker below has margin top", () => {
      const { container } = render(<EmojiPickerComponent />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const picker = container.querySelector(".mt-2");
      expect(picker).toBeInTheDocument();
    });
  });

  describe("Component Integration", () => {
    it("integrates with useClickOutside hook", () => {
      render(<EmojiPickerComponent />);

      expect(mockUseClickOutside).toHaveBeenCalledTimes(1);
      expect(mockUseClickOutside.mock.calls[0][0]).toBeDefined();
      expect(typeof mockUseClickOutside.mock.calls[0][1]).toBe("function");
    });

    it("passes emoji data correctly", () => {
      render(<EmojiPickerComponent onEmojiClick={mockOnEmojiClick} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const emojiOption = screen.getByTestId("emoji-option-😊");
      fireEvent.click(emojiOption);

      expect(mockOnEmojiClick).toHaveBeenCalledWith("😊");
      expect(mockOnEmojiClick).toHaveBeenCalledTimes(1);
    });

    it("handles emoji picker library integration", () => {
      render(<EmojiPickerComponent />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(screen.getByTestId("emoji-picker")).toBeInTheDocument();
    });
  });

  describe("State Management", () => {
    it("maintains isOpen state correctly", () => {
      render(<EmojiPickerComponent />);

      const button = screen.getByRole("button");

      expect(screen.queryByTestId("emoji-picker")).not.toBeInTheDocument();

      fireEvent.click(button);
      expect(screen.getByTestId("emoji-picker")).toBeInTheDocument();

      fireEvent.click(button);
      expect(screen.queryByTestId("emoji-picker")).not.toBeInTheDocument();
    });

    it("maintains selectedEmoji state correctly", () => {
      render(<EmojiPickerComponent buttonText="😀" />);

      expect(screen.getByText("😀")).toBeInTheDocument();

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const emojiOption = screen.getByTestId("emoji-option-😊");
      fireEvent.click(emojiOption);

      expect(screen.getByText("😊")).toBeInTheDocument();
    });

    it("resets to buttonText when prop changes", () => {
      const { rerender } = render(<EmojiPickerComponent buttonText="😀" />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const emojiOption = screen.getByTestId("emoji-option-😊");
      fireEvent.click(emojiOption);

      expect(screen.getByText("😊")).toBeInTheDocument();

      rerender(<EmojiPickerComponent buttonText="🎉" />);

      expect(screen.getByText("🎉")).toBeInTheDocument();
    });
  });
});
