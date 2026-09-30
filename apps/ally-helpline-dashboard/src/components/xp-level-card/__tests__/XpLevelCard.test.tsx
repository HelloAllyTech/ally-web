import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import XpLevelCard from "../XpLevelCard";

const SUMMARY = {
  level: 3,
  totalXp: 425,
  xpIntoLevel: 165,
  xpToNextLevel: 91,
  nextLevelXp: 516,
  progress: 0.64,
  isMaxLevel: false,
};

describe("XpLevelCard", () => {
  it("shows the level, what is left to the next one, and the lifetime total", () => {
    render(<XpLevelCard summary={SUMMARY} />);

    expect(screen.getByTestId("progress-hero")).toHaveTextContent("Level 3");
    expect(screen.getByTestId("progress-next-level")).toHaveTextContent("91 XP to level 4");
    expect(screen.getByTestId("progress-hero")).toHaveTextContent("425 XP earned in total");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "64");
  });

  it("offers no link to Progress unless the caller asks, so the Progress page has none", () => {
    render(<XpLevelCard summary={SUMMARY} />);

    expect(screen.queryByTestId("progress-hero-view")).toBeNull();
  });

  it("links through to Progress when given somewhere to go", async () => {
    const onViewProgress = vi.fn();
    render(<XpLevelCard summary={SUMMARY} onViewProgress={onViewProgress} />);

    await userEvent.click(screen.getByRole("button", { name: /see your progress/i }));

    expect(onViewProgress).toHaveBeenCalledTimes(1);
  });

  it("replaces the next-level target with a finished message at the top of the ladder", () => {
    render(
      <XpLevelCard
        summary={{ ...SUMMARY, isMaxLevel: true, xpToNextLevel: null, nextLevelXp: null }}
      />,
    );

    expect(screen.getByTestId("progress-next-level")).toHaveTextContent(
      "You've reached the top level",
    );
    expect(screen.getByTestId("progress-next-level")).not.toHaveTextContent("null");
  });
});
