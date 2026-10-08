import React from "react";

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import "@testing-library/jest-dom";

import DropdownField from "../DropdownField";

// Mock internal Dropdown to avoid portal/positioning issues
vi.mock("../Dropdown", () => ({
  default: ({ options, handleChange, onHandleSearch }: any) => (
    <div>
      <input
        aria-label="search"
        onChange={e => onHandleSearch && onHandleSearch((e.target as HTMLInputElement).value)}
      />
      {options.map((o: string) => (
        <button key={o} onClick={() => handleChange(o)}>
          {o}
        </button>
      ))}
    </div>
  ),
}));

describe("DropdownField", () => {
  it("toggles dropdown open and selects option", () => {
    const onChange = vi.fn();
    render(
      <DropdownField
        disabled={false}
        label="Label"
        value="Value"
        onChange={onChange}
        options={["A", "B"]}
      />,
    );

    // open via arrow
    fireEvent.click(screen.getByText("Value")); // clicking value won't open
    // click the arrow by role is not present; click parent can open by simulating arrow via label
    // simulate by toggling isOpen through clicking PlayArrow container
    const container = screen.getByText("Value").closest("div")?.parentElement as HTMLElement;
    fireEvent.click(container.querySelector(".cursor-pointer") as HTMLElement);

    fireEvent.click(screen.getByText("A"));
    expect(onChange).toHaveBeenCalledWith("A");
  });

  it("does not show arrow when disabled", () => {
    render(
      <DropdownField disabled label="Label" value="Value" onChange={vi.fn()} options={["A"]} />,
    );
    expect(document.querySelector(".cursor-pointer")).not.toBeInTheDocument();
  });

  it("portals the list out of a clipping container and still selects", () => {
    const onChange = vi.fn();
    const { container } = render(
      <div style={{ overflow: "auto", maxHeight: 40 }}>
        <DropdownField portal value="Value" onChange={onChange} options={["A", "B"]} />
      </div>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Toggle options" }));

    const option = screen.getByText("B");
    // Rendered on document.body, so no ancestor of the trigger can clip it.
    expect(container.contains(option)).toBe(false);
    expect(option.closest("div[style]")).toHaveStyle({ position: "fixed" });

    // The outside-click handler listens on mousedown; the portaled panel is
    // outside the trigger's DOM, so pressing an option must not close it.
    fireEvent.mouseDown(option);
    fireEvent.click(option);
    expect(onChange).toHaveBeenCalledWith("B");
  });

  it("closes a portaled list on a click outside it", () => {
    render(<DropdownField portal value="Value" onChange={vi.fn()} options={["A"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Toggle options" }));
    expect(screen.getByText("A")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByText("A")).not.toBeInTheDocument();
  });

  it("keeps a portaled list readable and on screen when the trigger is narrow at the edge", () => {
    // The scribe drawer leaves "Name of Institution:" a ~30px trigger near the
    // window's right edge; a list sized to that was cut off at the edge.
    const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      left: window.innerWidth - 40,
      right: window.innerWidth - 10,
      width: 30,
      top: 100,
      bottom: 120,
      height: 20,
      x: window.innerWidth - 40,
      y: 100,
      toJSON: () => ({}),
    } as DOMRect);

    render(<DropdownField portal value="Value" onChange={vi.fn()} options={["A"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Toggle options" }));

    const wrapper = screen.getByText("A").closest("div[style]") as HTMLElement;
    expect(wrapper.style.width).toBe("280px");
    expect(wrapper.style.left).toBe(`${window.innerWidth - 280 - 8}px`);
    rect.mockRestore();
  });
});
