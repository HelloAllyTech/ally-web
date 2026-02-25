import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { DropdownwithTag } from "../DropdownWithTag";

vi.mock("@assets", async importOriginal => {
  const actual = await importOriginal<typeof import("@assets")>();
  return {
    ...actual,
    ArrowSolid: () => <svg data-testid="arrow-solid" />,
    Close: () => <svg data-testid="close-icon" />,
  };
});

describe("DropdownwithTag", () => {
  const options = [
    { id: 1, value: "admin" },
    { id: 2, value: "viewer" },
    { id: 3, value: "editor" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders label and placeholder, and arrow icon", () => {
    render(
      <DropdownwithTag
        label="Roles"
        options={options}
        initialValue={[]}
        required={false}
        placeholder="Select roles"
      />,
    );

    expect(screen.getByText("Roles")).toBeInTheDocument();
    expect(screen.getByText("Select roles")).toBeInTheDocument();
    expect(screen.getByTestId("arrow-solid")).toBeInTheDocument();
  });

  it("opens the dropdown and shows options on click", () => {
    const { container } = render(
      <DropdownwithTag
        label="Roles"
        options={options}
        initialValue={[]}
        required={false}
        placeholder="Select roles"
      />,
    );

    const trigger = container.querySelector(".border.rounded-md") as HTMLElement;
    fireEvent.click(trigger);

    expect(screen.getByText(/admin/i)).toBeInTheDocument();
    expect(screen.getByText(/viewer/i)).toBeInTheDocument();
    expect(screen.getByText(/editor/i)).toBeInTheDocument();
  });

  it("selects and deselects options, calling onChange with updated values", () => {
    const onChange = vi.fn();
    const { container } = render(
      <DropdownwithTag
        label="Roles"
        options={options}
        initialValue={[]}
        onChange={onChange}
        required={false}
        placeholder="Select roles"
      />,
    );

    const trigger = container.querySelector(".border.rounded-md") as HTMLElement;
    const getDropdownPanel = () => document.body.querySelector(".fixed.bg-white") as HTMLElement;

    // Open and select "admin" (options are portaled to document.body)
    fireEvent.click(trigger);
    fireEvent.click(within(getDropdownPanel()).getByText(/admin/i));
    expect(onChange).toHaveBeenLastCalledWith(["admin"]);

    // Select "viewer"
    fireEvent.click(within(getDropdownPanel()).getByText(/viewer/i));
    expect(onChange).toHaveBeenLastCalledWith(["admin", "viewer"]);

    // Deselect "admin" (click option in dropdown, not the tag)
    fireEvent.click(within(getDropdownPanel()).getByText(/admin/i));
    expect(onChange).toHaveBeenLastCalledWith(["viewer"]);
  });

  it("renders tags for selected values and removes via close button", () => {
    const onChange = vi.fn();
    const { container, rerender } = render(
      <DropdownwithTag
        label="Roles"
        options={options}
        initialValue={["admin", "viewer"]}
        onChange={onChange}
        required={false}
        placeholder="Select roles"
      />,
    );

    // Selected tags visible (may appear in multiple places)
    expect(screen.getAllByText(/admin/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/viewer/i).length).toBeGreaterThan(0);

    // Click remove on first tag button
    const buttons = Array.from(container.querySelectorAll("button"));
    fireEvent.click(buttons[0]);
    expect(onChange).toHaveBeenCalled();

    // Rerender to reflect state update flow if consumer updates value
    rerender(
      <DropdownwithTag
        label="Roles"
        options={options}
        initialValue={["viewer"]}
        onChange={onChange}
        required={false}
        placeholder="Select roles"
      />,
    );
    expect(screen.queryByText(/admin/i)).toBeNull();
  });

  it("closes when clicking outside", () => {
    const { container } = render(
      <DropdownwithTag
        label="Roles"
        options={options}
        initialValue={[]}
        required={false}
        placeholder="Select roles"
      />,
    );

    const trigger = container.querySelector(".border.rounded-md") as HTMLElement;
    fireEvent.click(trigger);
    expect(screen.getByText(/admin/i)).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByText(/admin/i)).not.toBeInTheDocument();
  });
});
