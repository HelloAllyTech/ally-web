import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import StreakPill from "../StreakPill";

describe("StreakPill", () => {
  it("exposes the meaning through a label, not just a glyph and a number", () => {
    render(<StreakPill days={5} ariaLabel="5-day practice streak" />);

    expect(screen.getByRole("img", { name: "5-day practice streak" })).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("uses the theme's warning scale when the streak is at risk", () => {
    const { container } = render(
      <StreakPill days={4} atRisk ariaLabel="4-day practice streak, not counted today" />,
    );

    expect(container.firstElementChild?.className).toContain("bg-warning-50");
  });

  it("uses the primary scale when the streak is secure", () => {
    const { container } = render(<StreakPill days={4} ariaLabel="4-day practice streak" />);

    // Not red/pulsing: a healthy streak is a state, not an alert.
    expect(container.firstElementChild?.className).toContain("bg-primary-50");
    expect(container.firstElementChild?.className).not.toContain("animate-pulse");
  });

  it("renders a larger variant for the post-session moment", () => {
    const { container } = render(<StreakPill days={5} size="md" ariaLabel="5-day streak" />);

    expect(container.firstElementChild?.className).toContain("text-[13px]");
  });
});
