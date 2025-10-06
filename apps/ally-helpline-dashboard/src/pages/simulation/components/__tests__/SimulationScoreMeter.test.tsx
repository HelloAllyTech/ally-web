import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import SimulationScoreMeter from "../SimulationScoreMeter";

describe("SimulationScoreMeter", () => {
  it("renders with default score (snapshot)", () => {
    const { container } = render(<SimulationScoreMeter />);
    expect(container).toMatchSnapshot();
  });

  it("positions indicator for negative score", async () => {
    render(<SimulationScoreMeter score={-50} />);
    const indicator = await screen.findByLabelText("score-indicator");
    expect(indicator).toBeInTheDocument();
  });

  it("positions indicator for positive score", async () => {
    render(<SimulationScoreMeter score={75} />);
    const indicator = await screen.findByLabelText("score-indicator");
    expect(indicator).toBeInTheDocument();
  });
});
