import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SegmentedToggle } from "../SegmentedToggle";

describe("SegmentedToggle", () => {
  const options = [
    { label: "Full View", value: "full" },
    { label: "Checklist View", value: "checklist" },
  ] as const;

  it("renders all options", () => {
    render(
      <SegmentedToggle
        label="Advanced settings view"
        value="full"
        options={options}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("tablist", { name: "Advanced settings view" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Full View" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Checklist View" })).toBeInTheDocument();
  });

  it("marks the selected option", () => {
    render(
      <SegmentedToggle
        value="checklist"
        options={options}
        onChange={vi.fn()}
        label="Advanced settings view"
      />,
    );

    expect(screen.getByRole("tab", { name: "Checklist View" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Full View" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("calls onChange with the selected value", () => {
    const onChange = vi.fn();

    render(
      <SegmentedToggle
        value="full"
        options={options}
        onChange={onChange}
        label="Advanced settings view"
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Checklist View" }));

    expect(onChange).toHaveBeenCalledWith("checklist");
  });
});
