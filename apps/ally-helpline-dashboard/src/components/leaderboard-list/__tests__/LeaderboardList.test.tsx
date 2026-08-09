import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LeaderboardList, LeaderboardUser } from "../LeaderboardList";

const user = (overrides: Partial<LeaderboardUser> = {}): LeaderboardUser => ({
  userId: 1,
  rank: 1,
  name: "Learner One",
  minutesPlayed: 120,
  badgeCount: 3,
  currentStreak: 5,
  ...overrides,
});

describe("LeaderboardList", () => {
  it("renders a streak column header", () => {
    render(<LeaderboardList data={[user()]} />);

    expect(screen.getByText("Streak")).toBeInTheDocument();
  });

  it("renders the streak as a labelled pill", () => {
    render(<LeaderboardList data={[user({ currentStreak: 5 })]} />);

    expect(screen.getByRole("img", { name: "5d streak" })).toBeInTheDocument();
  });

  it("shows a dash rather than a zero for a user with no live streak", () => {
    render(<LeaderboardList data={[user({ currentStreak: 0 })]} />);

    expect(screen.queryByRole("img", { name: /streak/ })).not.toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("does not render NaN when the API has not shipped the field yet", () => {
    const legacy = user();
    delete (legacy as Partial<LeaderboardUser>).currentStreak;

    render(<LeaderboardList data={[legacy]} />);

    expect(screen.queryByText("NaN")).not.toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("keeps the hidden columns' figures available on narrow screens", () => {
    // Below sm the duration/streak/badge columns are hidden, so the same
    // numbers move into a meta line under the name rather than disappearing.
    render(<LeaderboardList data={[user({ currentStreak: 5, badgeCount: 3 })]} />);

    const meta = document.querySelector(".sm\\:hidden");
    expect(meta).not.toBeNull();
    expect(within(meta as HTMLElement).getByText(/5d streak/)).toBeInTheDocument();
    expect(within(meta as HTMLElement).getByText(/3 badges/)).toBeInTheDocument();
  });

  it("hides the rank column when ranks are hidden for the tenant", () => {
    render(<LeaderboardList data={[user()]} hideRank />);

    expect(screen.queryByText("Rank")).not.toBeInTheDocument();
  });
});
