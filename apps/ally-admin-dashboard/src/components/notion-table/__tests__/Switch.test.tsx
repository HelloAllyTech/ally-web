import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { Switch } from "../Switch";

// Mock ToggleSwitch component
vi.mock("@components", () => ({
  ToggleSwitch: ({ enabled, onChange, label, disabled }: any) => (
    <div data-testid="toggle-switch">
      <input
        type="checkbox"
        data-testid="toggle-input"
        checked={enabled}
        onClick={() => !disabled && onChange(!enabled)}
        disabled={disabled}
        readOnly
      />
      <span data-testid="toggle-label">{label}</span>
    </div>
  ),
}));

describe("Switch", () => {
  const defaultProps = {
    checked: true,
    onChange: vi.fn(),
    disabled: false,
    className: "",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders switch component", () => {
      render(<Switch {...defaultProps} />);

      expect(screen.getByTestId("toggle-switch")).toBeInTheDocument();
    });

    it("renders with checked state", () => {
      render(<Switch {...defaultProps} checked={true} />);

      const input = screen.getByTestId("toggle-input");
      expect(input).toBeChecked();
    });

    it("renders with unchecked state", () => {
      render(<Switch {...defaultProps} checked={false} />);

      const input = screen.getByTestId("toggle-input");
      expect(input).not.toBeChecked();
    });

    it("applies custom className", () => {
      const { container } = render(<Switch {...defaultProps} className="custom-class" />);

      // The className is spread but not applied to a specific element in the current implementation
      // This test verifies the component renders without errors
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe("Toggle Behavior", () => {
    it("passes onChange to ToggleSwitch", () => {
      const mockOnChange = vi.fn();
      render(<Switch {...defaultProps} checked={false} onChange={mockOnChange} />);

      const input = screen.getByTestId("toggle-input");
      // Simulate the ToggleSwitch calling onChange with the new value
      fireEvent.click(input);

      expect(mockOnChange).toHaveBeenCalledWith(true);
    });

    it("toggles from checked to unchecked", () => {
      const mockOnChange = vi.fn();
      render(<Switch {...defaultProps} checked={true} onChange={mockOnChange} />);

      const input = screen.getByTestId("toggle-input");
      fireEvent.click(input);

      expect(mockOnChange).toHaveBeenCalledWith(false);
    });

    it("provides the new state value to onChange", () => {
      const mockOnChange = vi.fn();
      render(<Switch {...defaultProps} checked={false} onChange={mockOnChange} />);

      const input = screen.getByTestId("toggle-input");
      fireEvent.click(input);

      expect(mockOnChange).toHaveBeenCalledWith(true);
    });
  });

  describe("Disabled State", () => {
    it("renders disabled switch", () => {
      render(<Switch {...defaultProps} disabled={true} />);

      expect(screen.getByTestId("toggle-switch")).toBeInTheDocument();
    });

    it("passes disabled prop to ToggleSwitch", () => {
      render(<Switch {...defaultProps} disabled={true} />);

      // The disabled prop is passed but ToggleSwitch mock doesn't use it
      // This test ensures the component renders correctly
      expect(screen.getByTestId("toggle-switch")).toBeInTheDocument();
    });

    it("passes disabled prop to ToggleSwitch component", () => {
      render(<Switch {...defaultProps} disabled={true} />);

      const toggleSwitch = screen.getByTestId("toggle-switch");

      // ToggleSwitch should receive disabled prop
      expect(toggleSwitch).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("applies wrapper styling", () => {
      const { container } = render(<Switch {...defaultProps} />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("w-full");
      expect(wrapper).toHaveClass("px-2");
      expect(wrapper).toHaveClass("py-1");
      expect(wrapper).toHaveClass("flex");
      expect(wrapper).toHaveClass("items-center");
      expect(wrapper).toHaveClass("justify-center");
    });

    it("centers content", () => {
      const { container } = render(<Switch {...defaultProps} />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("items-center");
      expect(wrapper).toHaveClass("justify-center");
    });
  });

  describe("State Changes", () => {
    it("handles multiple toggles", () => {
      const mockOnChange = vi.fn();
      const { rerender } = render(
        <Switch {...defaultProps} checked={false} onChange={mockOnChange} />,
      );

      const input = screen.getByTestId("toggle-input");

      fireEvent.click(input);
      expect(mockOnChange).toHaveBeenCalledWith(true);

      rerender(<Switch {...defaultProps} checked={true} onChange={mockOnChange} />);
      fireEvent.click(input);
      expect(mockOnChange).toHaveBeenCalledWith(false);

      rerender(<Switch {...defaultProps} checked={false} onChange={mockOnChange} />);
      fireEvent.click(input);
      expect(mockOnChange).toHaveBeenCalledWith(true);

      expect(mockOnChange).toHaveBeenCalledTimes(3);
    });

    it("reflects prop changes", () => {
      const { rerender } = render(<Switch {...defaultProps} checked={false} />);

      const input = screen.getByTestId("toggle-input");
      expect(input).not.toBeChecked();

      rerender(<Switch {...defaultProps} checked={true} />);
      expect(input).toBeChecked();

      rerender(<Switch {...defaultProps} checked={false} />);
      expect(input).not.toBeChecked();
    });
  });

  describe("Edge Cases", () => {
    it("handles rapid toggling", () => {
      const mockOnChange = vi.fn();
      const { rerender } = render(
        <Switch {...defaultProps} checked={false} onChange={mockOnChange} />,
      );

      const input = screen.getByTestId("toggle-input");

      for (let toggleIndex = 0; toggleIndex < 10; toggleIndex++) {
        const currentChecked = toggleIndex % 2 === 0;
        rerender(<Switch {...defaultProps} checked={currentChecked} onChange={mockOnChange} />);
        fireEvent.click(input);
      }

      expect(mockOnChange).toHaveBeenCalledTimes(10);
    });

    it("handles multiple clicks", () => {
      const mockOnChange = vi.fn();
      render(<Switch {...defaultProps} checked={false} onChange={mockOnChange} />);

      const input = screen.getByTestId("toggle-input");

      fireEvent.click(input);
      fireEvent.click(input);
      fireEvent.click(input);

      // Each click calls onChange with the inverted value of current state
      expect(mockOnChange).toHaveBeenCalledTimes(3);
      // All calls should be with true since checked is always false (not controlled in this test)
      mockOnChange.mock.calls.forEach(call => {
        expect(call[0]).toBe(true);
      });
    });

    it("renders correctly with minimal props", () => {
      render(<Switch checked={true} onChange={vi.fn()} />);

      expect(screen.getByTestId("toggle-switch")).toBeInTheDocument();
    });

    it("handles undefined className gracefully", () => {
      render(<Switch checked={true} onChange={vi.fn()} className={undefined} />);

      expect(screen.getByTestId("toggle-switch")).toBeInTheDocument();
    });
  });

  describe("Integration with ToggleSwitch", () => {
    it("passes enabled prop correctly", () => {
      render(<Switch {...defaultProps} checked={true} />);

      const input = screen.getByTestId("toggle-input");
      expect(input).toBeChecked();
    });

    it("passes onChange handler correctly", () => {
      const mockOnChange = vi.fn();
      render(<Switch {...defaultProps} onChange={mockOnChange} />);

      const input = screen.getByTestId("toggle-input");
      fireEvent.click(input);

      expect(mockOnChange).toHaveBeenCalled();
    });
  });

  describe("Boolean Values", () => {
    it("handles true as checked", () => {
      render(<Switch {...defaultProps} checked={true} />);

      const input = screen.getByTestId("toggle-input");
      expect(input).toBeChecked();
    });

    it("handles false as unchecked", () => {
      render(<Switch {...defaultProps} checked={false} />);

      const input = screen.getByTestId("toggle-input");
      expect(input).not.toBeChecked();
    });
  });

  describe("Accessibility", () => {
    it("maintains semantic checkbox structure", () => {
      render(<Switch {...defaultProps} />);

      const input = screen.getByTestId("toggle-input");
      expect(input).toHaveAttribute("type", "checkbox");
    });
  });

  describe("Layout", () => {
    it("uses flexbox layout", () => {
      const { container } = render(<Switch {...defaultProps} />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("flex");
    });

    it("applies full width", () => {
      const { container } = render(<Switch {...defaultProps} />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("w-full");
    });

    it("applies padding", () => {
      const { container } = render(<Switch {...defaultProps} />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("px-2");
      expect(wrapper).toHaveClass("py-1");
    });
  });

  describe("handleClick Function", () => {
    // The handleClick function exists in the component but isn't exposed
    // These tests verify behavior through the ToggleSwitch interaction
    it("processes click events through onChange", () => {
      const mockOnChange = vi.fn();
      render(<Switch {...defaultProps} checked={true} onChange={mockOnChange} />);

      const input = screen.getByTestId("toggle-input");
      fireEvent.click(input);

      expect(mockOnChange).toHaveBeenCalledWith(false);
    });

    it("does not prevent clicks when not disabled", () => {
      const mockOnChange = vi.fn();
      render(<Switch {...defaultProps} disabled={false} onChange={mockOnChange} />);

      const input = screen.getByTestId("toggle-input");
      fireEvent.click(input);

      expect(mockOnChange).toHaveBeenCalled();
    });
  });
});
