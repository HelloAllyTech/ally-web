import "@testing-library/jest-dom";

import React from "react";

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import Dropdown from "../Dropdown";

describe("Dropdown", () => {
  it("filters options loclifeline by default", () => {
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

  it("calls onHandleSearch when provided and does not filter loclifeline", () => {
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
    // options still visible because not loclifeline filtered
    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.getByText("Two")).toBeInTheDocument();
  });

  it("invokes handleChange when option clicked", () => {
    const handleChange = vi.fn();
    render(<Dropdown options={["X"]} handleChange={handleChange} />);
    fireEvent.click(screen.getByText("X"));
    expect(handleChange).toHaveBeenCalledWith("X");
  });
});
