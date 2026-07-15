import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import dayjs from "dayjs";

import DatePicker from "../DatePicker";
import { DatePickerProps } from "../types";

// --- Test Setup ---

const mockOnChange = vi.fn();

const getDefaultProps = (): DatePickerProps => ({
  value: null,
  onChange: mockOnChange,
});

const renderComponent = (props: Partial<DatePickerProps> = {}) => {
  const defaultProps = getDefaultProps();
  return render(<DatePicker {...defaultProps} {...props} />);
};

// Carbon's DatePicker wraps flatpickr; it parses typed input and emits its
// onChange on blur/change.
const typeDate = (value: string) => {
  const input = screen.getByRole("textbox");
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
};

describe("DatePicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Snapshot Tests ---

  it("should match snapshot when fully rendered", () => {
    const { asFragment } = renderComponent();
    expect(asFragment()).toMatchSnapshot();
  });

  it("should match snapshot with value", () => {
    const date = dayjs("2024-01-15");
    const { asFragment } = renderComponent({ value: date });
    expect(asFragment()).toMatchSnapshot();
  });

  it("should match snapshot with disableFuture", () => {
    const { asFragment } = renderComponent({ disableFuture: true });
    expect(asFragment()).toMatchSnapshot();
  });

  // --- Rendering Tests ---

  it("should render the date picker input", () => {
    renderComponent();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("dd/mm/yyyy")).toBeInTheDocument();
  });

  it("should render with null value", () => {
    renderComponent({ value: null });
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("should render with date value", () => {
    renderComponent({ value: dayjs("2024-01-15") });
    expect(screen.getByRole("textbox")).toHaveValue("15/01/2024");
  });

  it("should format the value as DD/MM/YYYY", () => {
    renderComponent({ value: dayjs("2024-12-25") });
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("25/12/2024");
    expect(input).toHaveAttribute("placeholder", "dd/mm/yyyy");
  });

  // --- onChange Tests ---

  it("should call onChange with the parsed date when a date is entered", () => {
    renderComponent();
    typeDate("15/06/2024");

    expect(mockOnChange).toHaveBeenCalled();
    const lastArg = mockOnChange.mock.calls.at(-1)?.[0];
    expect(lastArg).not.toBeNull();
    expect(dayjs(lastArg).format("DD/MM/YYYY")).toBe("15/06/2024");
  });

  it("should call onChange with null when input is cleared", () => {
    renderComponent({ value: dayjs("2024-01-15") });
    typeDate("");

    expect(mockOnChange).toHaveBeenCalledWith(null);
  });

  // --- Range Tests ---

  it("should reject a date after maxDate and accept one within range", () => {
    renderComponent({ maxDate: dayjs("2024-12-31") });

    typeDate("01/01/2030");
    expect(mockOnChange).toHaveBeenLastCalledWith(null);

    mockOnChange.mockClear();
    typeDate("15/06/2024");
    const lastArg = mockOnChange.mock.calls.at(-1)?.[0];
    expect(dayjs(lastArg).format("DD/MM/YYYY")).toBe("15/06/2024");
  });

  it("should reject a future date when disableFuture is set", () => {
    renderComponent({ disableFuture: true });

    typeDate("01/01/2100");
    expect(mockOnChange).toHaveBeenLastCalledWith(null);
  });

  // --- Edge Cases ---

  it("should handle different date values across rerenders", () => {
    const { rerender } = renderComponent({ value: dayjs("2024-01-01") });
    expect(screen.getByRole("textbox")).toHaveValue("01/01/2024");

    rerender(<DatePicker value={dayjs("2024-12-31")} onChange={mockOnChange} />);
    expect(screen.getByRole("textbox")).toHaveValue("31/12/2024");
  });

  it("should handle value changing from null to date", () => {
    const { rerender } = renderComponent({ value: null });
    expect(screen.getByRole("textbox")).toHaveValue("");

    rerender(<DatePicker value={dayjs("2024-06-15")} onChange={mockOnChange} />);
    expect(screen.getByRole("textbox")).toHaveValue("15/06/2024");
  });

  it("should handle value changing from date to null", () => {
    const { rerender } = renderComponent({ value: dayjs("2024-06-15") });
    expect(screen.getByRole("textbox")).toHaveValue("15/06/2024");

    rerender(<DatePicker value={null} onChange={mockOnChange} />);
    expect(screen.getByRole("textbox")).toHaveValue("");
  });
});
