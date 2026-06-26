import "@testing-library/jest-dom";

import React from "react";

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import Dropdown from "../Dropdown";

describe("Dropdown", () => {
  it("filters options locally by default", () => {
    const handleChange = vi.fn();
    render(
      <Dropdown
        options={["Apple", "Banana", "Cherry"]}
        handleChange={handleChange}
        className=""
        style={{}}
      />,
    );

    const input = screen.getByPlaceholderText("Search");
    fireEvent.change(input, { target: { value: "ap" } });
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.queryByText("Banana")).not.toBeInTheDocument();
  });

  it("calls onHandleSearch when provided and does not filter locally", () => {
    const handleChange = vi.fn();
    const onHandleSearch = vi.fn();
    render(
      <Dropdown
        options={["One", "Two"]}
        handleChange={handleChange}
        onHandleSearch={onHandleSearch}
      />,
    );

    const input = screen.getByPlaceholderText("Search");
    fireEvent.change(input, { target: { value: "zzz" } });
    expect(onHandleSearch).toHaveBeenCalledWith("zzz");
    // options still visible because not locally filtered
    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.getByText("Two")).toBeInTheDocument();
  });

  it("invokes handleChange when option clicked", () => {
    const handleChange = vi.fn();
    render(<Dropdown options={["X"]} handleChange={handleChange} />);
    fireEvent.click(screen.getByText("X"));
    expect(handleChange).toHaveBeenCalledWith("X");
  });

  it("exposes listbox and option roles", () => {
    render(<Dropdown options={["Apple", "Banana"]} handleChange={vi.fn()} />);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("navigates options with arrow keys and selects with Enter", () => {
    const handleChange = vi.fn();
    render(<Dropdown options={["Apple", "Banana", "Cherry"]} handleChange={handleChange} />);

    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, { key: "ArrowDown" }); // highlight Apple
    fireEvent.keyDown(input, { key: "ArrowDown" }); // highlight Banana
    fireEvent.keyDown(input, { key: "Enter" });

    expect(handleChange).toHaveBeenCalledWith("Banana");
  });

  it("wraps highlight from last back to first", () => {
    const handleChange = vi.fn();
    render(<Dropdown options={["A", "B"]} handleChange={handleChange} />);

    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, { key: "ArrowUp" }); // wraps to last (B)
    fireEvent.keyDown(input, { key: "Enter" });

    expect(handleChange).toHaveBeenCalledWith("B");
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(<Dropdown options={["A"]} handleChange={vi.fn()} onClose={onClose} />);

    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows a No results message when nothing matches", () => {
    render(<Dropdown options={["Apple", "Banana"]} handleChange={vi.fn()} />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "zzz" } });
    expect(screen.getByText("No results")).toBeInTheDocument();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });
});
