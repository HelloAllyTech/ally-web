import * as React from "react";

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Import the component to be tested
import Dropdown from "../Dropdown";

// --- Mock Types (Inferred from component usage) ---

interface DropdownProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  minWidth?: number;
  sx?: any; // Simple placeholder for MUI styles
}

// --- Mock External Dependencies (MUI Components) ---

// We mock MUI components entirely within the vi.mock factory to avoid the
// Temporal Dead Zone (TDZ) hoisting issues. We use simple HTML elements
// and data attributes for verification.
vi.mock("@mui/material", () => {
  // Mock FormControl: Used to set minWidth
  const MockFormControl = ({ children, size, sx }: any) => (
    <div data-testid="mock-form-control" data-min-width={sx?.minWidth || "none"} data-size={size}>
      {children}
    </div>
  );

  // Mock Select: Simulates the main select element and SelectChangeEvent
  const MockSelect = ({ value, onChange, children }: any) => (
    <select
      data-testid="mock-select"
      value={value}
      // Simulate the SelectChangeEvent structure expected by the component's handleChange
      onChange={e => onChange({ target: { value: e.target.value } })}
    >
      {children}
    </select>
  );

  // Mock MenuItem: Simulates the option elements
  const MockMenuItem = ({ value, children }: any) => <option value={value}>{children}</option>;

  return {
    FormControl: MockFormControl,
    Select: MockSelect,
    MenuItem: MockMenuItem,
  };
});

// --- Test Setup ---

describe("Dropdown Component", () => {
  const mockOnChange = vi.fn();
  const options = ["Option A", "Option B", "Option C"];

  const defaultProps: DropdownProps = {
    value: options[0],
    options: options,
    onChange: mockOnChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<DropdownProps> = {}) => {
    return render(<Dropdown {...defaultProps} {...props} />);
  };

  // --- Snapshot Test ---

  it("should match snapshot with default props", () => {
    const { asFragment } = renderComponent();
    expect(asFragment()).toMatchSnapshot();
  });

  // --- Rendering Tests ---

  it("should render all options correctly", () => {
    renderComponent();
    // Check that all options are rendered as <option> elements (MockMenuItem)
    expect(screen.getAllByRole("option")).toHaveLength(3);
    expect(screen.getByRole("option", { name: "Option A" })).toHaveValue("Option A");
    expect(screen.getByRole("option", { name: "Option C" })).toHaveValue("Option C");
  });

  it("should display the correct initial value", () => {
    renderComponent({ value: "Option B" });
    const select = screen.getByTestId("mock-select");
    expect(select).toHaveValue("Option B");
  });

  // --- Interaction Test ---

  it("should call onChange with the new value when a selection is made", () => {
    renderComponent();
    const select = screen.getByTestId("mock-select");

    // Simulate selecting "Option C"
    fireEvent.change(select, { target: { value: "Option C" } });

    // Verify the component's internal handleChange was called, which in turn calls the prop onChange
    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith("Option C");
  });

  // --- Prop Tests ---

  it("should apply the minWidth to the FormControl wrapper", () => {
    renderComponent({ minWidth: 350 });
    const formControl = screen.getByTestId("mock-form-control");
    // The component passes minWidth via the sx prop of FormControl
    expect(formControl).toHaveAttribute("data-min-width", "350");
  });

  it("should use the default minWidth when none is provided", () => {
    renderComponent({ minWidth: undefined });
    const formControl = screen.getByTestId("mock-form-control");
    // The default minWidth is 200, as defined in the component's default prop
    expect(formControl).toHaveAttribute("data-min-width", "200");
  });

  it("should pass size='small' to FormControl", () => {
    renderComponent();
    const formControl = screen.getByTestId("mock-form-control");
    expect(formControl).toHaveAttribute("data-size", "small");
  });
});
