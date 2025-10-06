import React from "react";

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import "@testing-library/jest-dom";

import DateFilterUI from "../DateFilterUI";

// Mock react-calendar so we don't depend on its DOM
vi.mock("react-calendar", () => ({
  Calendar: ({ onChange }: any) => (
    <button onClick={() => onChange([new Date("2024-01-02"), new Date("2024-01-03")])}>
      calendar-range
    </button>
  ),
}));

describe("DateFilterUI", () => {
  it("applies quick preset and calls onChange", () => {
    const onChange = vi.fn();
    render(<DateFilterUI selectedValues={[]} onChange={onChange} />);
    fireEvent.click(screen.getByText("Today"));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("shows calendar for Custom preset and updates via calendar", () => {
    const onChange = vi.fn();
    render(<DateFilterUI selectedValues={[]} onChange={onChange} />);

    fireEvent.click(screen.getByText("Custom"));
    fireEvent.click(screen.getByText("calendar-range"));
    expect(onChange).toHaveBeenCalled();
  });

  it("enables Save only when a range is selected and calls onDateSelect", () => {
    const onChange = vi.fn();
    const onDateSelect = vi.fn();
    render(<DateFilterUI selectedValues={[]} onChange={onChange} onDateSelect={onDateSelect} />);

    // initially disabled
    expect(screen.getByText("Save")).toBeDisabled();

    // pick a preset with a full range
    fireEvent.click(screen.getByText("This week"));
    expect(screen.getByText("Save")).toBeEnabled();
    fireEvent.click(screen.getByText("Save"));
    expect(onDateSelect).toHaveBeenCalled();
  });
});
