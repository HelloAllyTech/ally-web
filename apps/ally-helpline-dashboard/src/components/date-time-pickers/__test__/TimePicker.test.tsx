import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import dayjs from "dayjs";

import TimePicker from "../TimePicker";
import { TimePickerProps } from "../types";

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
    const time = dayjs("2024-01-01T14:30");
    const { asFragment } = renderComponent({ value: time });
    expect(asFragment()).toMatchSnapshot();
  });

  it("should match snapshot when disabled", () => {
    const { asFragment } = renderComponent({ disabled: true });
    expect(asFragment()).toMatchSnapshot();
  });

  // --- Rendering Tests ---

  it("should render the time picker input", () => {
    renderComponent();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("hh:mm")).toBeInTheDocument();
  });

  it("should render with null value", () => {
    renderComponent({ value: null });
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("should render the formatted value", () => {
    renderComponent({ value: dayjs("2024-01-01T14:30") });
    expect(screen.getByRole("textbox")).toHaveValue("14:30");
  });

  // --- Props Tests ---

  it("should disable the input when disabled is true", () => {
    renderComponent({ disabled: true });
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("should not disable the input when disabled is false", () => {
    renderComponent({ disabled: false });
    expect(screen.getByRole("textbox")).not.toBeDisabled();
  });

  it("should not be disabled by default", () => {
    renderComponent();
    expect(screen.getByRole("textbox")).not.toBeDisabled();
  });

  it("should clamp to maxTime when a later time is entered", () => {
    // Clamping compares full datetimes, so anchor value/maxTime to the same day.
    const value = dayjs("2024-01-01T12:00");
    const maxTime = dayjs("2024-01-01T18:00");
    renderComponent({ value, maxTime });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "23:00" } });

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith(maxTime);
  });

  it("should clamp to minTime when an earlier time is entered", () => {
    const value = dayjs("2024-01-01T12:00");
    const minTime = dayjs("2024-01-01T06:00");
    renderComponent({ value, minTime });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "01:00" } });

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith(minTime);
  });

  it("should call onChange with null when input is cleared", () => {
    const time = dayjs("2024-01-01T14:30");
    renderComponent({ value: time });

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "" } });

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith(null);
  });

  it("should not call onChange when an invalid time is entered", () => {
    renderComponent();

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "invalid-time" } });

    // The component ignores input that does not match the HH:mm pattern.
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it("should call onChange for each valid time entry", () => {
    renderComponent();
    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "09:00" } });
    fireEvent.change(input, { target: { value: "12:30" } });
    fireEvent.change(input, { target: { value: "18:45" } });

    expect(mockOnChange).toHaveBeenCalledTimes(3);
  });

  it("should preserve onChange handler across rerenders", () => {
    const { rerender } = renderComponent();
    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "14:30" } });
    expect(mockOnChange).toHaveBeenCalledTimes(1);

    rerender(<TimePicker value={dayjs("2024-01-01T14:30")} onChange={mockOnChange} />);
    fireEvent.change(input, { target: { value: "16:45" } });
    expect(mockOnChange).toHaveBeenCalledTimes(2);
  });

  it("should handle disabled state changing", () => {
    const { rerender } = renderComponent({ disabled: false });
    expect(screen.getByRole("textbox")).not.toBeDisabled();

    rerender(<TimePicker value={null} onChange={mockOnChange} disabled={true} />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });
});
