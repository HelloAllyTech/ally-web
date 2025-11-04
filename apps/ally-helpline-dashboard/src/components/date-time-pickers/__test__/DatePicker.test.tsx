import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import dayjs, { Dayjs } from "dayjs";

import DatePicker from "../DatePicker";
import { DatePickerProps } from "../types";

// --- Mocks Setup ---

// Mock @mui/x-date-pickers DatePicker
vi.mock("@mui/x-date-pickers/DatePicker", () => ({
  DatePicker: vi.fn(({ value, onChange, disableFuture, maxDate, format, slotProps, ...props }) => {
    // Create a simple input that simulates the date picker
    return (
      <div data-testid="mui-date-picker" data-disable-future={disableFuture} {...props}>
        <input
          data-testid="date-input"
          type="text"
          value={value ? value.format(format || "DD/MM/YYYY") : ""}
          onChange={e => {
            // Simple mock: parse the input as a date
            const inputValue = e.target.value;
            if (inputValue && onChange) {
              const parsed = dayjs(inputValue, format || "DD/MM/YYYY");
              if (parsed.isValid()) {
                onChange(parsed);
              } else {
                onChange(null);
              }
            } else if (onChange) {
              onChange(null);
            }
          }}
          placeholder={format || "DD/MM/YYYY"}
          readOnly={disableFuture}
          data-max-date={maxDate ? maxDate.format("YYYY-MM-DD") : undefined}
        />
      </div>
    );
  }),
}));

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

  it("should render the date picker component", () => {
    renderComponent();
    expect(screen.getByTestId("mui-date-picker")).toBeInTheDocument();
    expect(screen.getByTestId("date-input")).toBeInTheDocument();
  });

  it("should render with null value", () => {
    renderComponent({ value: null });
    const input = screen.getByTestId("date-input");
    expect(input).toHaveValue("");
  });

  it("should render with date value", () => {
    const date = dayjs("2024-01-15");
    renderComponent({ value: date });
    const input = screen.getByTestId("date-input");
    expect(input).toHaveValue("15/01/2024");
  });

  it("should apply format DD/MM/YYYY", () => {
    const date = dayjs("2024-12-25");
    renderComponent({ value: date });
    const input = screen.getByTestId("date-input");
    expect(input).toHaveValue("25/12/2024");
    expect(input).toHaveAttribute("placeholder", "DD/MM/YYYY");
  });

  // --- Props Tests ---

  it("should pass disableFuture prop to MUI DatePicker", () => {
    renderComponent({ disableFuture: true });
    const picker = screen.getByTestId("mui-date-picker");
    expect(picker).toHaveAttribute("data-disable-future", "true");
  });

  it("should pass disableFuture as false when not provided", () => {
    renderComponent({ disableFuture: false });
    const picker = screen.getByTestId("mui-date-picker");
    expect(picker).toHaveAttribute("data-disable-future", "false");
  });

  it("should pass maxDate prop to MUI DatePicker", () => {
    const maxDate = dayjs("2024-12-31");
    renderComponent({ maxDate });
    const input = screen.getByTestId("date-input");
    expect(input).toHaveAttribute("data-max-date", "2024-12-31");
  });

  it("should not set maxDate when not provided", () => {
    renderComponent();
    const input = screen.getByTestId("date-input");
    expect(input).not.toHaveAttribute("data-max-date");
  });

  it("should call onChange with null when input is cleared", () => {
    const date = dayjs("2024-01-15");
    renderComponent({ value: date });
    const input = screen.getByTestId("date-input");

    fireEvent.change(input, { target: { value: "" } });

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith(null);
  });

  it("should call onChange with null when invalid date is entered", () => {
    renderComponent();
    const input = screen.getByTestId("date-input");

    fireEvent.change(input, { target: { value: "invalid-date" } });

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith(null);
  });

  // --- Edge Cases ---

  it("should handle different date values", () => {
    const date1 = dayjs("2024-01-01");
    const { rerender } = renderComponent({ value: date1 });
    expect(screen.getByTestId("date-input")).toHaveValue("01/01/2024");

    const date2 = dayjs("2024-12-31");
    rerender(<DatePicker value={date2} onChange={mockOnChange} />);
    expect(screen.getByTestId("date-input")).toHaveValue("31/12/2024");
  });

  it("should handle value changing from null to date", () => {
    const { rerender } = renderComponent({ value: null });
    expect(screen.getByTestId("date-input")).toHaveValue("");

    const date = dayjs("2024-06-15");
    rerender(<DatePicker value={date} onChange={mockOnChange} />);
    expect(screen.getByTestId("date-input")).toHaveValue("15/06/2024");
  });

  it("should handle value changing from date to null", () => {
    const date = dayjs("2024-06-15");
    const { rerender } = renderComponent({ value: date });
    expect(screen.getByTestId("date-input")).toHaveValue("15/06/2024");

    rerender(<DatePicker value={null} onChange={mockOnChange} />);
    expect(screen.getByTestId("date-input")).toHaveValue("");
  });

  it("should handle multiple onChange calls", () => {
    renderComponent();
    const input = screen.getByTestId("date-input");

    fireEvent.change(input, { target: { value: "01/01/2024" } });
    fireEvent.change(input, { target: { value: "15/06/2024" } });
    fireEvent.change(input, { target: { value: "31/12/2024" } });

    expect(mockOnChange).toHaveBeenCalledTimes(3);
  });

  it("should handle disableFuture and maxDate together", () => {
    const maxDate = dayjs("2024-12-31");
    renderComponent({ disableFuture: true, maxDate });
    const picker = screen.getByTestId("mui-date-picker");
    const input = screen.getByTestId("date-input");

    expect(picker).toHaveAttribute("data-disable-future", "true");
    expect(input).toHaveAttribute("data-max-date", "2024-12-31");
  });

  it("should preserve onChange handler across rerenders", () => {
    const { rerender } = renderComponent();
    const input = screen.getByTestId("date-input");

    fireEvent.change(input, { target: { value: "15/01/2024" } });
    expect(mockOnChange).toHaveBeenCalledTimes(1);

    rerender(<DatePicker value={dayjs("2024-01-15")} onChange={mockOnChange} />);
    fireEvent.change(input, { target: { value: "20/01/2024" } });
    expect(mockOnChange).toHaveBeenCalledTimes(2);
  });
});
