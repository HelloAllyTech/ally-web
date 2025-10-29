import React from "react";

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { StatusBadge } from "../StatusBadge";

// Stub @constants to avoid loading entire barrel and its transitive imports
vi.mock("@constants", () => ({
  userStatus: {
    ACTIVE: "ACTIVE",
    SUSPENDED: "SUSPENDED",
    INACTIVE: "INACTIVE",
    BLOCKED: "BLOCKED",
  },
}));

describe("StatusBadge", () => {
  it("renders ACTIVE status with correct styles and text", () => {
    const { container } = render(<StatusBadge status="ACTIVE" />);
    const text = screen.getByText("Active");
    const badge = text.closest("span")!;

    expect(badge.className).toContain("bg-[#E8F5E9]");
    expect(badge.className).toContain("text-black-700");

    const dot = badge.querySelector("span");
    expect(dot?.className).toContain("bg-[#66BB6A]");
  });

  it("falls back to ACTIVE styles for unknown status and formats text", () => {
    const { container } = render(<StatusBadge status="UNKNOWN" />);
    const text = screen.getByText("Unknown");
    const badge = text.closest("span")!;

    // Fallback styles should match ACTIVE mapping
    expect(badge.className).toContain("bg-[#E8F5E9]");
    expect(badge.className).toContain("text-black-700");

    const dot = badge.querySelector("span");
    expect(dot?.className).toContain("bg-[#66BB6A]");
  });
});
