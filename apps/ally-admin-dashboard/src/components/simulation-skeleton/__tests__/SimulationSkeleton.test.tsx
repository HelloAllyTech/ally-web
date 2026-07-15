import React from "react";

import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { SimulationSkeleton, SimulationListSkeleton } from "../SimulationSkeleton";

describe("SimulationSkeleton", () => {
  it("renders base skeleton wrapper", () => {
    const { container } = render(<SimulationSkeleton />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("renders progress and participants placeholder blocks", () => {
    const { getByTestId } = render(<SimulationSkeleton />);
    expect(getByTestId("skeleton-progress")).toBeTruthy();
    expect(getByTestId("skeleton-participants")).toBeTruthy();
  });

  it("renders a rounded-full track placeholder for the progress bar", () => {
    const { getByTestId } = render(<SimulationSkeleton />);
    expect(getByTestId("skeleton-progress").querySelector(".rounded-full")).toBeTruthy();
  });
});

describe("SimulationListSkeleton", () => {
  it("renders header and 10 row skeletons", () => {
    const { container } = render(<SimulationListSkeleton />);
    const pulseBlocks = container.querySelectorAll(".animate-pulse");
    // Expect 1 header pulse + 10 row pulses = 11
    expect(pulseBlocks.length).toBe(11);
  });
});
