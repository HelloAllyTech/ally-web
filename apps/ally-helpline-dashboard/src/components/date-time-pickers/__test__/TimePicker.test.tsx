import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import dayjs, { Dayjs } from "dayjs";

import TimePicker from "../TimePicker";
import { TimePickerProps } from "../types";

// --- Mocks Setup ---

// Mock @mui/x-date-pickers TimePicker
vi.mock("@mui/x-date-pickers/TimePicker", () => ({
  TimePicker: vi.fn(({ value, onChange, disabled, maxTime, minTime, slotProps, ...props }) => {
    // Create a simple input that simulates the time picker
    return (
      <div
        data-testid="mui-time-picker"
        data-disabled={disabled}
        data-max-time={maxTime ? maxTime.format("HH:mm") : undefined}
        data-min-time={minTime ? minTime.format("HH:mm") : undefined}
        {...props}
      >
        <input
          data-testid="time-input"
          type="text"
          value={value ? value.format("HH:mm") : ""}
          onChange={e => {
            // Simple mock: parse the input as a time
            const inputValue = e.target.value;
            if (inputValue && onChange) {
              const parsed = dayjs(inputValue, "HH:mm");
              if (parsed.isValid()) {
                onChange(parsed);
              } else {
                onChange(null);
              }
            } else if (onChange) {
              onChange(null);
            }
          }}
          placeholder="HH:mm"
          disabled={disabled}
        />
      </div>
    );
  }),
}));

// --- Test Setup ---

const mockOnChange = vi.fn();

const getDefaultProps = (): TimePickerProps => ({
  value: null,
  onChange: mockOnChange,
});

const renderComponent = (props: Partial<TimePickerProps> = {}) => {
  const defaultProps = getDefaultProps();
  return render(<TimePicker {...defaultProps} {...props} />);
};

describe("TimePicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Snapshot Tests ---

  it("should match snapshot when fully rendered", () => {
    const { asFragment } = renderComponent();
    expect(asFragment()).toMatchSnapshot();
  });

  it("should match snapshot with value", () => {
    const time = dayjs("14:30", "HH:mm");
    const { asFragment } = renderComponent({ value: time });
    expect(asFragment()).toMatchSnapshot();
  });

  it("should match snapshot when disabled", () => {
    const { asFragment } = renderComponent({ disabled: true });
    expect(asFragment()).toMatchSnapshot();
  });

  // --- Rendering Tests ---

  it("should render the time picker component", () => {
    renderComponent();
    expect(screen.getByTestId("mui-time-picker")).toBeInTheDocument();
    expect(screen.getByTestId("time-input")).toBeInTheDocument();
  });

  it("should render with null value", () => {
    renderComponent({ value: null });
    const input = screen.getByTestId("time-input");
    expect(input).toHaveValue("");
  });

  // --- Props Tests ---

  it("should pass disabled prop to MUI TimePicker", () => {
    renderComponent({ disabled: true });
    const picker = screen.getByTestId("mui-time-picker");
    const input = screen.getByTestId("time-input");
    expect(picker).toHaveAttribute("data-disabled", "true");
    expect(input).toBeDisabled();
  });

  it("should pass disabled as false when not provided", () => {
    renderComponent({ disabled: false });
    const picker = screen.getByTestId("mui-time-picker");
    const input = screen.getByTestId("time-input");
    expect(picker).toHaveAttribute("data-disabled", "false");
    expect(input).not.toBeDisabled();
  });

  it("should not be disabled by default", () => {
    renderComponent();
    const input = screen.getByTestId("time-input");
    expect(input).not.toBeDisabled();
  });

  it("should not set maxTime when not provided", () => {
    renderComponent();
    const picker = screen.getByTestId("mui-time-picker");
    expect(picker).not.toHaveAttribute("data-max-time");
  });

  it("should not set minTime when not provided", () => {
    renderComponent();
    const picker = screen.getByTestId("mui-time-picker");
    expect(picker).not.toHaveAttribute("data-min-time");
  });

  it("should call onChange with null when input is cleared", () => {
    const time = dayjs("14:30", "HH:mm");
    renderComponent({ value: time });
    const input = screen.getByTestId("time-input");

    fireEvent.change(input, { target: { value: "" } });

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith(null);
  });

  it("should call onChange with null when invalid time is entered", () => {
    renderComponent();
    const input = screen.getByTestId("time-input");

    fireEvent.change(input, { target: { value: "invalid-time" } });

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith(null);
  });

  it("should handle multiple onChange calls", () => {
    renderComponent();
    const input = screen.getByTestId("time-input");

    fireEvent.change(input, { target: { value: "09:00" } });
    fireEvent.change(input, { target: { value: "12:30" } });
    fireEvent.change(input, { target: { value: "18:45" } });

    expect(mockOnChange).toHaveBeenCalledTimes(3);
  });

  it("should preserve onChange handler across rerenders", () => {
    const { rerender } = renderComponent();
    const input = screen.getByTestId("time-input");

    fireEvent.change(input, { target: { value: "14:30" } });
    expect(mockOnChange).toHaveBeenCalledTimes(1);

    rerender(<TimePicker value={dayjs("14:30", "HH:mm")} onChange={mockOnChange} />);
    fireEvent.change(input, { target: { value: "16:45" } });
    expect(mockOnChange).toHaveBeenCalledTimes(2);
  });

  it("should handle disabled state changing", () => {
    const { rerender } = renderComponent({ disabled: false });
    let input = screen.getByTestId("time-input");
    expect(input).not.toBeDisabled();

    rerender(<TimePicker value={null} onChange={mockOnChange} disabled={true} />);
    input = screen.getByTestId("time-input");
    expect(input).toBeDisabled();
  });
});
