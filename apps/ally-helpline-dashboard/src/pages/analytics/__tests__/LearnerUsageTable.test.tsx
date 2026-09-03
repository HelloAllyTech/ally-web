import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { LearnerUsageTable } from "../LearnerUsageTable";
import { LearnerUsageRow } from "@types";

const mockUseGetLearnerUsageTableQuery = vi.fn();

vi.mock("@api", () => ({
  useGetLearnerUsageTableQuery: (...args: unknown[]) =>
    mockUseGetLearnerUsageTableQuery(...args),
}));

/**
 * The real GenericTable is left in place — the point of these tests is what
 * the columns render, which a stub would erase. @assets and @components are
 * stubbed because they pull SVG and Carbon imports this suite doesn't need.
 */
vi.mock("@assets", () => ({
  Download: () => <span data-testid="download-icon" />,
  NoResults: () => <span data-testid="no-results-icon" />,
}));

vi.mock("@components", () => ({
  Button: ({ children, ...rest }: any) => <button {...rest}>{children}</button>,
  Chip: ({ config }: any) => <span data-testid="status-chip">{config.label}</span>,
  FallbackUI: ({ mainMessage }: any) => <div>{mainMessage}</div>,
}));

const row = (overrides: Partial<LearnerUsageRow> = {}): LearnerUsageRow => ({
  id: 1,
  name: "Asha Rao",
  email: "asha@example.com",
  signupDate: "2026-06-08T00:00:00.000Z",
  lastPracticeSessionAt: "2026-08-24T00:00:00.000Z",
  lastActivityAt: "2026-09-01T00:00:00.000Z",
  daysSinceLastActivity: 2,
  status: "active",
  roleplaySessionsStarted: 11,
  roleplaySessionsCompleted: 9,
  roleplayCompletionRatePct: 81.8,
  avgScore: 72.5,
  totalPracticeMinutes: 65.3,
  roleplayPointsPerMinute: 4,
  coursesAssigned: 3,
  coursesStarted: 3,
  coursesCompleted: 2,
  courseCompletionRatePct: 66.7,
  level: 4,
  totalXp: 1234,
  itemsTotal: 24,
  itemsCompleted: 18,
  itemsCompletedPct: 75,
  quizzesPassed: 8,
  quizzesAttempted: 11,
  avgQuizScorePct: 78.4,
  readWatchCompleted: 6,
  reflectionCompleted: 4,
  ...overrides,
});

const respondWith = (rows: LearnerUsageRow[]) => {
  mockUseGetLearnerUsageTableQuery.mockReturnValue({
    data: { range: "30d", data: rows, count: rows.length },
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  });
};

/** Rendered header order — several cell values collide as bare text. */
const COL = {
  name: 0,
  email: 1,
  status: 2,
  lastActive: 3,
  level: 4,
  xp: 5,
  roleplays: 6,
  practiceMinutes: 7,
  pointsPerMin: 8,
  courseItems: 9,
  quizzes: 10,
  readWatch: 11,
  reflection: 12,
  coursesCompleted: 13,
  signupDate: 14,
} as const;

/** Text of one cell in the single rendered row. */
const cell = (index: number): string => {
  const tds = document.querySelectorAll("tbody tr td");
  return (tds[index]?.textContent ?? "").trim();
};

describe("LearnerUsageTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders effort split by activity type, not just practice volume", () => {
    respondWith([row()]);
    render(<LearnerUsageTable range="30d" />);

    // Course items, quizzes (passed/attempted + avg of the latest attempt),
    // and the two non-graded groups each get their own cell. Asserted by
    // column index: several of these values collide as bare text.
    expect(cell(COL.level)).toBe("L4");
    expect(cell(COL.xp)).toBe("1,234");
    expect(cell(COL.pointsPerMin)).toBe("4");
    expect(cell(COL.courseItems)).toBe("18 / 24 (75%)");
    expect(cell(COL.quizzes)).toBe("8 / 11 (78.4%)");
    expect(cell(COL.readWatch)).toBe("6");
    expect(cell(COL.reflection)).toBe("4");
  });

  it("renders staleness as elapsed days rather than making the reader do date maths", () => {
    respondWith([row({ daysSinceLastActivity: 38, status: "dormant" })]);
    render(<LearnerUsageTable range="30d" />);

    expect(screen.getByText("38d ago")).toBeInTheDocument();
  });

  it('shows "Today" rather than "0d ago" for same-day activity', () => {
    respondWith([row({ daysSinceLastActivity: 0 })]);
    render(<LearnerUsageTable range="30d" />);

    expect(screen.getByText("Today")).toBeInTheDocument();
  });

  it("em-dashes a learner who has never done anything instead of showing a zero date", () => {
    respondWith([
      row({ daysSinceLastActivity: null, lastActivityAt: null, status: "never_started" }),
    ]);
    render(<LearnerUsageTable range="30d" />);

    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("distinguishes an unscored learner from one scoring zero", () => {
    respondWith([
      row({
        itemsTotal: 0,
        itemsCompleted: 0,
        itemsCompletedPct: null,
        quizzesAttempted: 0,
        quizzesPassed: 0,
        avgQuizScorePct: null,
      }),
    ]);
    render(<LearnerUsageTable range="30d" />);

    // Both effort cells must read "—", never "0", "0 / 0" or "0%".
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
    expect(screen.queryByText("0 / 0 (0%)")).not.toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
  });

  it("em-dashes points-per-minute when there is no measurable practice time", () => {
    respondWith([row({ totalPracticeMinutes: 0, roleplayPointsPerMinute: null })]);
    render(<LearnerUsageTable range="30d" />);

    // Asserted on the cell, not the document: 0 practice minutes legitimately
    // renders "0" one column to the left. "Nothing to rate" is not "rated 0".
    expect(cell(COL.pointsPerMin)).toBe("—");
  });

  it("renders a negative points-per-minute rather than hiding it", () => {
    // Roleplay composite scores go below zero, so the rate can too.
    respondWith([row({ roleplayPointsPerMinute: -2.4 })]);
    render(<LearnerUsageTable range="30d" />);

    expect(cell(COL.pointsPerMin)).toBe("-2.4");
  });

  it("does not render an avg roleplay score column", () => {
    respondWith([row({ avgScore: 72.5 })]);
    render(<LearnerUsageTable range="30d" />);

    expect(screen.queryByText("Avg roleplay score")).not.toBeInTheDocument();
    expect(screen.queryByText("72.5")).not.toBeInTheDocument();
  });

  it("offers every status as a facet and sorts by lastActivityAt by default", () => {
    respondWith([row()]);
    render(<LearnerUsageTable range="30d" />);

    // The query is what carries the facet: status has to filter server-side or
    // `count` would describe the unfiltered set.
    expect(mockUseGetLearnerUsageTableQuery).toHaveBeenCalledWith(
      expect.objectContaining({ range: "30d", sortBy: "lastActivityAt", order: "ASC" }),
      expect.anything(),
    );
  });

  it("no longer renders the tautological courses-started-of-assigned column", () => {
    respondWith([row({ coursesAssigned: 3, coursesStarted: 3 })]);
    render(<LearnerUsageTable range="30d" />);

    // Enrolling sets startedAt in the same transaction, so this column could
    // only ever read "3 / 3". It was dropped rather than shown.
    expect(screen.queryByText("Courses started / assigned")).not.toBeInTheDocument();
    expect(screen.queryByText("3 / 3")).not.toBeInTheDocument();
  });
});
