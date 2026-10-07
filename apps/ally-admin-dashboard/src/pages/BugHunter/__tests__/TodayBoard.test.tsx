import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@api", () => ({ useGetBugHunterTodayQuery: vi.fn() }));
// See BugFindingsTable's note: @constants reads `cellTypes` off this barrel at
// module-eval time, and the real barrel would pull the whole API layer in.
vi.mock("@components", () => ({ cellTypes: {} }));

import { useGetBugHunterTodayQuery } from "@api";
import { BugHunterToday } from "@types";

import { TodayBoard, TodayBoardView } from "../TodayBoard";

const repo = (over: Partial<BugHunterToday["repos"][number]>): BugHunterToday["repos"][number] => ({
  repo: "ally-web",
  sweeps: { completed: 0, failed: 0, skipped: 0, running: 0 },
  found: 0,
  verified: 0,
  refuted: 0,
  fixSessions: { byPerson: 0, byAgent: 0, running: 0, failed: 0 },
  fixesPassed: 0,
  fixesFailed: 0,
  prsOpen: 0,
  merged: 0,
  released: 0,
  spendUsd: 0,
  ...over,
});

const board: BugHunterToday = {
  date: "2026-10-07",
  timeZone: "Asia/Kolkata",
  since: "2026-10-06T18:30:00.000Z",
  repos: [
    repo({
      sweeps: { completed: 1, failed: 1, skipped: 0, running: 0 },
      found: 3,
      verified: 2,
      refuted: 1,
      fixSessions: { byPerson: 1, byAgent: 2, running: 1, failed: 0 },
      fixesPassed: 1,
      fixesFailed: 0,
      prsOpen: 2,
      merged: 1,
      spendUsd: 6.4,
    }),
    repo({ repo: "ally-be", sweeps: { completed: 0, failed: 0, skipped: 1, running: 0 } }),
  ],
  totals: {
    ...repo({}),
    sweeps: { completed: 1, failed: 1, skipped: 1, running: 0 },
    found: 3,
    verified: 2,
    refuted: 1,
    fixSessions: { byPerson: 1, byAgent: 2, running: 1, failed: 0 },
    fixesPassed: 1,
    prsOpen: 2,
    merged: 1,
    spendUsd: 6.4,
  },
};

describe("TodayBoardView", () => {
  it("shows one row per repo with the day's counts in words, and a totals row", () => {
    render(<TodayBoardView board={board} />);

    expect(screen.getByText("Today, by repo")).toBeInTheDocument();
    expect(screen.getByText("2026-10-07, since midnight India time")).toBeInTheDocument();

    const web = screen.getByTestId("today-ally-web");
    expect(web).toHaveTextContent("1 done · 1 failed");
    expect(web).toHaveTextContent("2 confirmed · 1 refuted");
    expect(web).toHaveTextContent("2 by me · 1 by you · 1 running");
    expect(web).toHaveTextContent("1 passed · 0 failed");
    expect(web).toHaveTextContent("$6.40");

    const be = screen.getByTestId("today-ally-be");
    expect(be).toHaveTextContent("1 skipped");
    // quiet cells read as a dash, not a zero
    expect(be.textContent?.match(/—/g)?.length).toBeGreaterThan(4);

    expect(screen.getByTestId("today-total")).toHaveTextContent("Total");
  });
});

describe("TodayBoard", () => {
  it("renders nothing until the first load lands, and polls once a minute in India time", () => {
    vi.mocked(useGetBugHunterTodayQuery).mockReturnValue({
      data: undefined,
      isError: false,
    } as never);
    const { container } = render(<TodayBoard />);
    expect(container).toBeEmptyDOMElement();
    expect(useGetBugHunterTodayQuery).toHaveBeenCalledWith(
      { timeZone: "Asia/Kolkata" },
      { pollingInterval: 60_000 },
    );
  });

  it("renders the board once data arrives", () => {
    vi.mocked(useGetBugHunterTodayQuery).mockReturnValue({ data: board, isError: false } as never);
    render(<TodayBoard />);
    expect(screen.getByTestId("today-board")).toBeInTheDocument();
  });
});
