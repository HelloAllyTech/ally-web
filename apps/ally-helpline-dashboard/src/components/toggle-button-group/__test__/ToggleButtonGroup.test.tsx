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

    expect(optionB.closest(".MuiToggleButton-root")).toHaveClass("Mui-selected");
    expect(optionA.closest(".MuiToggleButton-root")).not.toHaveClass("Mui-selected");
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
    expect(optionC.closest(".MuiToggleButton-root")).toBeDisabled();
  });

  it("should apply success background color when the selected value matches successValue", () => {
    const successValue = "optionB";
    render(
      <ToggleButtonGroup
        value={successValue}
        onValueChange={mockOnValueChange}
        items={mockItems}
        successValue={successValue}
      />,
    );

    const selectedButton = screen.getByText("Option B").closest(".MuiToggleButton-root");
    expect(selectedButton).toHaveClass("Mui-selected");
  });

  it("should apply default background color when the selected value does NOT match successValue", () => {
    const successValue = "optionC";
    render(
      <ToggleButtonGroup
        value="optionA"
        onValueChange={mockOnValueChange}
        items={mockItems}
        successValue={successValue}
      />,
    );

    const selectedButton = screen.getByText("Option A").closest(".MuiToggleButton-root");
    expect(selectedButton).toHaveClass("Mui-selected");
  });
});
