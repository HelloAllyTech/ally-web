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
});
