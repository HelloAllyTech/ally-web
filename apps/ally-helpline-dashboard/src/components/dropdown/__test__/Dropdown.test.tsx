import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import Dropdown from "../Dropdown";
import React from "react";
interface Option {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  minWidth?: number;
  sx?: any;
  placeholder?: string;
}

describe("Dropdown Component", () => {
  const options: Option[] = [
    { value: "A", label: "Option A" },
    { value: "B", label: "Option B" },
    { value: "C", label: "Option C" },
  ];

  let mockOnChange: ReturnType<typeof vi.fn>;

  const defaultProps: DropdownProps = {
    value: "A",
    options,
    onChange: () => {},
  };

  beforeEach(() => {
    mockOnChange = vi.fn();
  });

  const renderComponent = (props: Partial<DropdownProps> = {}) =>
    render(<Dropdown {...defaultProps} {...props} onChange={mockOnChange} />);

  // --- Snapshot Test ---
  it("should match snapshot with default props", () => {
    const { asFragment } = renderComponent();
    expect(asFragment()).toMatchSnapshot();
  });

  // --- Rendering Tests ---
  it("should render the correct initial value", () => {
    renderComponent({ value: "B" });
    const input = screen.getByRole("combobox") as HTMLInputElement;
    expect(input.value).toBe("Option B");
  });

  it("should render all options in dropdown when opened", () => {
    renderComponent();
    const input = screen.getByRole("combobox");

    // Open dropdown
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown" });

    options.forEach(option => {
      expect(screen.getByText(option.label)).toBeInTheDocument();
    });
  });

  // --- Interaction Test ---
  it("should call onChange with the new value when a selection is made", () => {
    renderComponent();
    const input = screen.getByRole("combobox");

    // Open dropdown
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown" });

    // Select "Option C"
    fireEvent.click(screen.getByText("Option C"));

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith("C");
  });

  // --- Placeholder Test ---
  it("should display the correct placeholder", () => {
    renderComponent({ placeholder: "Select an option" });
    const input = screen.getByPlaceholderText("Select an option");
    expect(input).toBeInTheDocument();
  });

  // --- Style Prop Tests ---
  it("should apply the custom minWidth style", () => {
    const { container } = renderComponent({ minWidth: 300 });
    const rootDiv = container.firstChild as HTMLElement;
    expect(rootDiv).toHaveStyle("min-width: 300px");
  });

  it("should apply the default minWidth when none is provided", () => {
    const { container } = renderComponent({ minWidth: undefined });
    const rootDiv = container.firstChild as HTMLElement;
    // Default in component is 200
    expect(rootDiv).toHaveStyle("min-width: 200px");
  });
});
