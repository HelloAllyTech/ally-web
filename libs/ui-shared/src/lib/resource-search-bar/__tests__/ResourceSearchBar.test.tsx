import React from "react";

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";

import ResourceSearchBar from "../ResourceSearchBar";

describe("ResourceSearchBar", () => {
  it("renders input with placeholder and calls onSearch on submit", () => {
    const onSearch = vi.fn();
    render(
      <ResourceSearchBar onSearch={onSearch} suggestions={["one", "two"]} initialValue="hi" />,
    );

    const input = screen.getByPlaceholderText("Need guidance? Search here..") as HTMLInputElement;
    expect(input.value).toBe("hi");

    fireEvent.change(input, { target: { value: "hello" } });
    fireEvent.submit(input.closest("form")!);

    expect(onSearch).toHaveBeenCalledWith("hello");
  });

  it("limits input length to 150 characters", () => {
    const onSearch = vi.fn();
    render(<ResourceSearchBar onSearch={onSearch} />);
    const input = screen.getByPlaceholderText("Need guidance? Search here..") as HTMLInputElement;

    const long = "a".repeat(200);
    fireEvent.change(input, { target: { value: long } });
    expect(input.value.length).toBeLessThanOrEqual(150);
  });
});
