import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import ToggleButtonGroup from "../ToggleButtonGroup";

const cn = (...classes) => classes.filter(Boolean).join(" ");

const mockItems = [
  { value: "optionA", label: "Option A" },
  { value: "optionB", label: "Option B" },
  { value: "optionC", label: "Option C" },
];

describe("ToggleButtonGroup", () => {
  const mockOnValueChange = vi.fn();

  beforeEach(() => {
    mockOnValueChange.mockClear();
  });

  it("should match snapshot when rendered with default props", () => {
    const { asFragment } = render(
      <ToggleButtonGroup value="optionA" onValueChange={mockOnValueChange} items={mockItems} />,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it("should match snapshot when disabled", () => {
    const { asFragment } = render(
      <ToggleButtonGroup
        value="optionB"
        onValueChange={mockOnValueChange}
        items={mockItems}
        disabled={true}
      />,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it("should render all items and correctly select the initial value", () => {
    render(
      <ToggleButtonGroup value="optionB" onValueChange={mockOnValueChange} items={mockItems} />,
    );

    const optionA = screen.getByText("Option A");
    const optionB = screen.getByText("Option B");
    const optionC = screen.getByText("Option C");

    expect(optionA).toBeInTheDocument();
    expect(optionB).toBeInTheDocument();
    expect(optionC).toBeInTheDocument();

    // Carbon ContentSwitcher marks the active Switch with aria-checked="true".
    expect(optionB.closest("button")).toHaveAttribute("aria-checked", "true");
    expect(optionA.closest("button")).toHaveAttribute("aria-checked", "false");
  });

  it("should call onValueChange with the new value when an unselected button is clicked", () => {
    render(
      <ToggleButtonGroup value="optionA" onValueChange={mockOnValueChange} items={mockItems} />,
    );

    const optionC = screen.getByText("Option C");
    fireEvent.click(optionC);

    expect(mockOnValueChange).toHaveBeenCalledTimes(1);
    expect(mockOnValueChange).toHaveBeenCalledWith("optionC");
  });

  it("should NOT call onValueChange when the already selected button is clicked (exclusive mode null check)", () => {
    render(
      <ToggleButtonGroup value="optionA" onValueChange={mockOnValueChange} items={mockItems} />,
    );

    const optionA = screen.getByText("Option A");
    fireEvent.click(optionA);

    expect(mockOnValueChange).not.toHaveBeenCalled();
  });

  it("should NOT call onValueChange when clicking any button if disabled", () => {
    render(
      <ToggleButtonGroup
        value="optionA"
        onValueChange={mockOnValueChange}
        items={mockItems}
        disabled={true}
      />,
    );

    const optionC = screen.getByText("Option C");
    fireEvent.click(optionC);

    expect(mockOnValueChange).not.toHaveBeenCalled();
    expect(optionC.closest("button")).toBeDisabled();
  });

  it("marks the button matching the selected value as selected", () => {
    render(
      <ToggleButtonGroup value="optionB" onValueChange={mockOnValueChange} items={mockItems} />,
    );

    const selectedButton = screen.getByText("Option B").closest("button");
    expect(selectedButton).toHaveAttribute("aria-checked", "true");
  });

  it("only marks the button matching the current value as selected", () => {
    render(
      <ToggleButtonGroup value="optionA" onValueChange={mockOnValueChange} items={mockItems} />,
    );

    expect(screen.getByText("Option A").closest("button")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Option C").closest("button")).toHaveAttribute("aria-checked", "false");
  });
});
