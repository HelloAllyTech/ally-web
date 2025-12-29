import React from "react";

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import "@testing-library/jest-dom";

import SkeletonLoader from "../SkeletonLoader";

describe("SkeletonLoader", () => {
  it("renders loading indicator and skeleton elements", () => {
    const { container } = render(<SkeletonLoader />);
    expect(screen.getByText("Loading resources...")).toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });
});
