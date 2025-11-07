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
  it("renders ACTIVE status with correct text", () => {
    render(<StatusBadge status="ACTIVE" />);
    const text = screen.getByText("Active");
    expect(text).toBeInTheDocument();
  });

  it("falls back to ACTIVE styles for unknown status and formats text", () => {
    render(<StatusBadge status="UNKNOWN" />);
    const text = screen.getByText("Unknown");
    expect(text).toBeInTheDocument();
  });
});
