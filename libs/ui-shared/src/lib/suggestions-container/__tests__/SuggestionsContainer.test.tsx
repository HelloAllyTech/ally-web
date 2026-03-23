import React from "react";

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import "@testing-library/jest-dom";

import SuggestionsContainer from "../SuggestionsContainer";

describe("SuggestionsContainer", () => {
  it("renders suggestions and header", () => {
    const onSelect = vi.fn();
    render(<SuggestionsContainer suggestions={["one", "two"]} onSelect={onSelect} />);
    expect(screen.getByText("Try now")).toBeInTheDocument();
    expect(screen.getByText("one")).toBeInTheDocument();
    expect(screen.getByText("two")).toBeInTheDocument();
  });

  it("calls onSelect when a suggestion is clicked", () => {
    const onSelect = vi.fn();
    render(<SuggestionsContainer suggestions={["alpha"]} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("alpha"));
    expect(onSelect).toHaveBeenCalledWith("alpha");
  });
});
