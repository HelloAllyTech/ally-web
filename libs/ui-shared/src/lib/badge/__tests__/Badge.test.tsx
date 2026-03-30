import React from "react";

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";

import { SearchVariant } from "../../../types";
import Badge from "../Badge";

describe("Badge", () => {
  it("renders with required props", () => {
    render(<Badge text="Test Badge" variant="outlined" />);
    expect(screen.getByText("Test Badge")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<Badge text="Test Badge" variant="outlined" className="custom-class" />);
    const badge = screen.getByText("Test Badge");
    expect(badge).toHaveClass("custom-class");
  });

  it("renders with different variants", () => {
    const { rerender } = render(<Badge text="Outlined" variant="outlined" />);
    expect(screen.getByText("Outlined")).toBeInTheDocument();

    rerender(<Badge text="Dark" variant={SearchVariant.DARK} />);
    expect(screen.getByText("Dark")).toBeInTheDocument();

    rerender(<Badge text="Light" variant={SearchVariant.LIGHT} />);
    expect(screen.getByText("Light")).toBeInTheDocument();
  });

  it("applies correct styles for outlined variant", () => {
    render(<Badge text="Outlined Badge" variant="outlined" />);
    const badge = screen.getByText("Outlined Badge");
    expect(badge).toHaveClass("bg-[#FDFDFD]", "text-[#616161]", "border", "border-[#D5D9EB]");
  });

  it("applies correct styles for dark variant", () => {
    render(<Badge text="Dark Badge" variant={SearchVariant.DARK} />);
    const badge = screen.getByText("Dark Badge");
    expect(badge).toHaveClass("bg-[#FDFDFD]", "text-[#1E2025]");
  });

  it("applies correct styles for light variant", () => {
    render(<Badge text="Light Badge" variant={SearchVariant.LIGHT} />);
    const badge = screen.getByText("Light Badge");
    expect(badge).toHaveClass("bg-[#ECECEC]", "text-[#535353]");
  });
});
