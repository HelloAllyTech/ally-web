import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import LevelIndicator from "../LevelIndicator";

describe("LevelIndicator", () => {
  it("renders the level number inside the ring", () => {
    render(<LevelIndicator level={4} progress={0.3} ariaLabel="Level 4" />);

    expect(screen.getByTestId("level-indicator")).toHaveTextContent("4");
  });

  it("carries the caption as an image label, since a ring and a bare number say nothing", () => {
    render(<LevelIndicator level={4} progress={0.3} ariaLabel="Your progress, level 4" />);

    expect(screen.getByRole("img", { name: "Your progress, level 4" })).toBeInTheDocument();
  });

  it("renders a compact pill instead of the ring in the collapsed rail", () => {
    render(<LevelIndicator level={7} progress={0.5} variant="pill" ariaLabel="Level 7" />);

    const el = screen.getByTestId("level-indicator");
    expect(el).toHaveTextContent("L7");
    // The pill must not draw a ring: a 30px ring in the rail's corner slot lands on top
    // of the 18px tab icon and hides it.
    expect(el.querySelector("svg")).toBeNull();
  });

  it("clamps a progress value outside 0..1 rather than drawing past the circle", () => {
    const { rerender } = render(<LevelIndicator level={1} progress={5} ariaLabel="Level 1" />);
    const arcOffset = () =>
      screen.getByTestId("level-indicator").querySelectorAll("circle")[1].getAttribute(
        "stroke-dashoffset",
      );

    expect(Number(arcOffset())).toBe(0);

    rerender(<LevelIndicator level={1} progress={-3} ariaLabel="Level 1" />);
    // A negative progress must read as empty, not as a full ring.
    expect(Number(arcOffset())).toBeGreaterThan(0);
  });

  it("survives a non-finite progress value without producing NaN geometry", () => {
    render(<LevelIndicator level={2} progress={Number.NaN} ariaLabel="Level 2" />);

    const offset = screen
      .getByTestId("level-indicator")
      .querySelectorAll("circle")[1]
      .getAttribute("stroke-dashoffset");
    expect(Number.isNaN(Number(offset))).toBe(false);
  });
});
