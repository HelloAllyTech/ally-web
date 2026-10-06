import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ScenarioCalibrationResponse,
  ScenarioProgressionResponse,
} from "../../scenarioCalibrationChart";
import type {
  ScenarioOpportunityCoverageResponse,
  ScenarioRepeatImprovementResponse,
  ScenarioRepeatRow,
} from "../../scenarioEffectivenessChart";

vi.hoisted(() => {
  if (typeof window !== "undefined") {
    window.requestAnimationFrame = (() => 0) as typeof window.requestAnimationFrame;
  }
});

const coverageMock = vi.fn();
const repeatMock = vi.fn();
const calibrationMock = vi.fn();
const progressionMock = vi.fn();
const prefsMock = vi.fn();

const result = <T,>(data: T | undefined, over: object = {}) => ({
  data,
  currentData: data,
  isLoading: false,
  isFetching: false,
  isUninitialized: false,
  isError: false,
  error: undefined,
  refetch: vi.fn(),
  ...over,
});

vi.mock("@api", () => ({
  useGetScenarioOpportunityCoverageQuery: (args: unknown) => coverageMock(args),
  useGetScenarioRepeatImprovementQuery: (args: unknown) => repeatMock(args),
  useGetScenarioCalibrationQuery: (args: unknown) => calibrationMock(args),
  useGetScenarioProgressionQuery: (args: unknown, opts: unknown) => progressionMock(args, opts),
  useGetChartPreferencesQuery: () => prefsMock(),
  useSaveChartPreferencesMutation: () => [vi.fn(), {}],
}));

import { ScenarioContentSection } from "../../ScenarioContentSection";

const scoping = { tenantId: null, unscopedSections: [] };
const provenance = { derivation: "derivation", note: "note" };

const coverage: ScenarioOpportunityCoverageResponse = {
  rubricVersion: "fhs-text-v1",
  minSampleSize: 20,
  skills: [
    { skill: "verbal", name: "Verbal communication", tier: "engage" },
    { skill: "feelings", name: "Exploring feelings", tier: "understand" },
    { skill: "hope", name: "Instilling hope", tier: "support" },
  ],
  scoredCuts: 200,
  singleScenarioCuts: 90,
  singleScenarioShare: 45,
  scenarios: [
    {
      scenarioId: 1,
      title: "Grieving parent",
      cuts: 40,
      learners: 18,
      sessionsPlayed: 220,
      taggedSkills: ["feelings", "hope"],
      untranslatableTags: [],
      customTags: 0,
      cells: [
        { skill: "verbal", tagged: false, opportunities: 36, opportunityPct: 90 },
        { skill: "feelings", tagged: true, opportunities: 30, opportunityPct: 75 },
        { skill: "hope", tagged: true, opportunities: 4, opportunityPct: 10 },
      ],
    },
  ],
  belowFloor: [{ scenarioId: 2, title: "New scenario", cuts: 12 }],
  tagGaps: [
    {
      scenarioId: 1,
      title: "Grieving parent",
      skill: "hope",
      opportunityPct: 10,
      cuts: 40,
      sessionsPlayed: 220,
    },
  ],
  thresholds: { maxOpportunityPct: 30, minCuts: 20 },
  provenance,
  scoping,
  computedAt: "2026-10-05T08:00:00.000Z",
};

const row = (over: Partial<ScenarioRepeatRow> = {}): ScenarioRepeatRow => ({
  scenarioId: 5,
  title: "Angry caller",
  versionId: "v-5-3",
  versionNumber: 3,
  repeaters: 30,
  pairs: 24,
  firstAvg: 42.5,
  latestAvg: 61,
  change: 18.5,
  changeCi: [9.2, 27.8],
  up: 18,
  down: 4,
  tied: 2,
  signP: 0.004,
  detectable: true,
  scoringChangedAt: "2026-09-03T10:00:00.000Z",
  pairsSpanningScoringChange: 6,
  ...over,
});

const repeat: ScenarioRepeatImprovementResponse = {
  minSampleSize: 20,
  thresholds: { minSpanHours: 24, pickerSize: 10 },
  repeatGroups: 50,
  scenarios: [row(), row({ scenarioId: 9, title: "Quiet teen", versionId: null, versionNumber: null, pairs: 4, change: null, changeCi: null, firstAvg: null, latestAvg: null, pairsSpanningScoringChange: 0 })],
  pooled: { pairs: 28, learners: 26, up: 18, down: 6, tied: 2, improvingPct: 75, signP: 0.02 },
  selected: {
    scenarioId: 5,
    title: "Angry caller",
    versionId: "v-5-3",
    versionNumber: 3,
    repeaters: 30,
    pairs: 24,
    learners: [
      {
        learnerId: 11,
        first: 30,
        latest: 55,
        change: 25,
        firstAt: "2026-08-01T10:00:00.000Z",
        latestAt: "2026-09-10T10:00:00.000Z",
        plays: 3,
      },
      {
        learnerId: 12,
        first: 50,
        latest: 45,
        change: -5,
        firstAt: "2026-08-02T10:00:00.000Z",
        latestAt: "2026-09-12T10:00:00.000Z",
        plays: 2,
      },
    ],
  },
  picker: [
    { scenarioId: 5, title: "Angry caller", versionId: "v-5-3", pairs: 24 },
    { scenarioId: 9, title: "Quiet teen", versionId: null, pairs: 4 },
  ],
  provenance,
  scoping,
  computedAt: "2026-10-05T08:00:00.000Z",
};

const derivedDefs = [
  { key: "below0", label: "< 0" },
  { key: "pct0to25", label: "0–25%" },
  { key: "pct25to50", label: "25–50%" },
  { key: "pct50to75", label: "50–75%" },
  { key: "pct75to100", label: "75–100%" },
  { key: "over100", label: "> 100%" },
];
const rawDefs = [
  { key: "below0", label: "< 0" },
  { key: "raw0to49", label: "0–49" },
  { key: "raw50to99", label: "50–99" },
  { key: "raw100plus", label: "100+" },
];

const calibration: ScenarioCalibrationResponse = {
  minSampleSize: 20,
  rows: [
    {
      scenarioId: 5,
      versionId: "v-5-3",
      versionNumber: 3,
      title: "Angry caller",
      difficultyLevel: "HARD",
      sessions: 120,
      bandedSessions: 100,
      rangeSource: "derived",
      rangeReason: null,
      attainableMax: 80,
      attainableMin: 0,
      ceilingIsHard: true,
      uncappedContributors: 0,
      configStableSince: "2026-08-01T00:00:00.000Z",
      bands: derivedDefs.map((d, i) => ({ ...d, count: [0, 2, 3, 10, 85, 0][i], pct: [0, 2, 3, 10, 85, 0][i] })),
      medianScore: 68,
      flag: "tooEasy",
      rangeSuspect: false,
    },
  ],
  belowFloor: [{ scenarioId: 9, versionId: null, versionNumber: null, title: "Quiet teen", sessions: 7 }],
  totals: { sessions: 127, unresolvedExcluded: 4, rows: 1, derivedRows: 1, tooEasy: 1, tooHard: 0 },
  bandDefinitions: { derived: derivedDefs, raw: rawDefs },
  thresholds: { tooEasyTopBandPct: 80, tooHardBelowZeroPct: 50 },
  provenance,
  scoping,
  computedAt: "2026-10-05T08:00:00.000Z",
};

const counts = {
  sessions: 40,
  reachedTerminal: 10,
  advanced: 18,
  neverAdvanced: 12,
  reachedTerminalPct: 25,
  advancedPct: 45,
  neverAdvancedPct: 30,
  fellBackOnly: 2,
  untracked: 5,
};

const progression: ScenarioProgressionResponse = {
  minSampleSize: 20,
  window: {
    from: "2025-10-05",
    to: "2026-10-05",
    label: "Last 12 months",
    days: 365,
    bucket: "month",
    allTime: false,
    inProgressBucket: null,
    computedAt: "2026-10-05T08:00:00.000Z",
  },
  points: [{ ...counts, bucket: "2026-09-01" }],
  totals: {
    ...counts,
    untracked: 5,
    untrackedByReason: { noStateMetadata: 5, branchingMode: 0, noRoomToAdvance: 0 },
  },
  byScenario: [{ ...counts, scenarioId: 5, title: "Angry caller" }],
  provenance,
  scoping,
  computedAt: "2026-10-05T08:00:00.000Z",
};

const query = { range: "all" as const };

describe("ScenarioContentSection", () => {
  beforeEach(() => {
    coverageMock.mockReset();
    repeatMock.mockReset();
    coverageMock.mockReturnValue(result(coverage));
    repeatMock.mockReturnValue(result(repeat));
    calibrationMock.mockReset();
    progressionMock.mockReset();
    prefsMock.mockReset();
    calibrationMock.mockReturnValue(result(calibration));
    progressionMock.mockReturnValue(result(progression));
    prefsMock.mockReturnValue(result({ preferences: [] }));
  });

  it("asks for all time with no range, and the tab's org when it has one", () => {
    const { unmount } = render(<ScenarioContentSection query={query} />);
    expect(coverageMock).toHaveBeenLastCalledWith({});
    expect(repeatMock).toHaveBeenLastCalledWith({});
    unmount();

    render(<ScenarioContentSection query={{ range: "all", tenantId: "t-alpha" }} />);
    expect(coverageMock).toHaveBeenLastCalledWith({ tenantId: "t-alpha" });
    expect(repeatMock).toHaveBeenLastCalledWith({ tenantId: "t-alpha" });
    expect(calibrationMock).toHaveBeenLastCalledWith({ tenantId: "t-alpha" });
    // The one calendar card asks for its own window and grain, never the page's.
    expect(progressionMock).toHaveBeenLastCalledWith(
      { tenantId: "t-alpha", range: "12m", bucket: "month" },
      { skip: false },
    );
  });

  it("bands each version beside its authored label and names the flagged ones", () => {
    render(<ScenarioContentSection query={query} />);
    expect(
      screen.getByText(
        "1 of 1 scenario version with 20+ scored sessions to check: Angry caller v3, labelled hard (too easy).",
      ),
    ).toBeTruthy();
    expect(screen.getAllByText("Labelled hard").length).toBeGreaterThan(0);
    expect(screen.getAllByText("too easy: 85% of sessions in the top band").length).toBeGreaterThan(0);
    expect(
      screen.getByText("Under 20 scored sessions, so not banded: Quiet teen unversioned (n = 7)."),
    ).toBeTruthy();
    // No raw rows, so no raw-points legend.
    expect(screen.queryByText("Raw points (no usable range):")).toBeNull();
  });

  it("states state progression and counts the sessions it cannot place", () => {
    render(<ScenarioContentSection query={query} />);
    expect(
      screen.getByText(
        "25% of 40 tracked sessions reached the scenario's last state; 30% never got past the opening state.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "5 sessions not plotted: 5 carry no state (older builds or stateless scenarios).",
      ),
    ).toBeTruthy();
    for (const id of ["AAQ-214", "AAQ-215", "AAQ-216", "AAQ-227", "AAQ-228"]) {
      expect(screen.getByText(id)).toBeTruthy();
    }
  });

  it("draws the heatmap with tagged cells and says when it covers a minority of practice", () => {
    render(<ScenarioContentSection query={query} />);
    expect(screen.getAllByText("Grieving parent").length).toBeGreaterThan(0);
    // Short skill headers grouped under tier headings.
    expect(screen.getAllByText("Verbal").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Support").length).toBeGreaterThan(0);
    const hope = screen.getAllByTitle(/^Instilling hope: a chance in 4 of 40 slices/)[0];
    expect(hope.textContent).toBe("10");
    expect(hope.getAttribute("style")).toContain("inset 0 0 0 2px");
    expect(
      screen.getAllByText(/Restricted to single-scenario slices: only 45% of scored slices/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(/1 more scenario has fewer than 20 single-scenario slices: New scenario \(n = 12\)/),
    ).toBeTruthy();
  });

  it("lists the tag gaps as a fix list, most-played first", () => {
    render(<ScenarioContentSection query={query} />);
    expect(
      screen.getByText(
        "Fix first: Grieving parent. It is tagged with Instilling hope, but gives a chance at it in 10% of 40 slices, across 220 sessions played.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Instilling hope")).toBeTruthy();
  });

  it("draws the selected scenario's slopes, the pooled share and the scoring-edit warning", () => {
    render(<ScenarioContentSection query={query} />);
    expect(
      screen.getByText(/^Across every scenario, 75% of 26 learners who replayed one scored higher on balance/),
    ).toBeTruthy();
    expect(screen.getAllByRole("img", { name: /for 2 learners who replayed this scenario/ }).length).toBeGreaterThan(0);
    expect(
      screen.getByText("6 of these 24 pairs straddle a scoring edit on 2026-09-03 — read the change with care."),
    ).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Scenario" })).toHaveTextContent(
      "Angry caller · 24 pairs",
    );
  });

  it("asks for the picked scenario", async () => {
    render(<ScenarioContentSection query={query} />);
    await userEvent.click(screen.getByRole("combobox", { name: "Scenario" }));
    await userEvent.click(screen.getByRole("option", { name: "Quiet teen · 4 pairs" }));
    expect(repeatMock).toHaveBeenLastCalledWith({ scenarioId: 9 });
  });

  it("shows counts, not slopes, below the floor", () => {
    repeatMock.mockReturnValue(
      result({
        ...repeat,
        selected: { ...repeat.selected!, scenarioId: 9, title: "Quiet teen", pairs: 4, learners: null },
      }),
    );
    render(<ScenarioContentSection query={query} />);
    expect(screen.getByText("Not enough data to show a trend")).toBeTruthy();
    expect(screen.getByText(/n = 4 paired learners · need at least 20/)).toBeTruthy();
  });

  it("names what is missing when nothing qualifies", () => {
    coverageMock.mockReturnValue(
      result({ ...coverage, scenarios: [], tagGaps: [], belowFloor: [{ scenarioId: 2, title: "New scenario", cuts: 12 }] }),
    );
    repeatMock.mockReturnValue(
      result({ ...repeat, scenarios: [], selected: null, picker: [], repeatGroups: 3, pooled: { ...repeat.pooled, learners: 0 } }),
    );
    calibrationMock.mockReturnValue(result({ ...calibration, rows: [] }));
    progressionMock.mockReturnValue(
      result({
        ...progression,
        points: [],
        totals: { ...progression.totals, sessions: 0, untracked: 6 },
      }),
    );
    render(<ScenarioContentSection query={query} />);
    expect(
      screen.getByText(
        "No scenario version has 20 scored sessions yet — 1 has fewer: Quiet teen unversioned (n = 7)",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText("No session in the period carries a simulation state (6 ran without one)"),
    ).toBeTruthy();
    expect(
      screen.getAllByText("No scenario has 20 single-scenario slices yet — 1 has fewer (the most is 12)")
        .length,
    ).toBe(2);
    expect(
      screen.getByText("3 learners have replayed a scenario, but none a day or more after their first play yet"),
    ).toBeTruthy();
  });

  it("shows the not-deployed error with a retry", () => {
    coverageMock.mockReturnValue(result(undefined, { isError: true }));
    repeatMock.mockReturnValue(result(undefined, { isError: true }));
    calibrationMock.mockReturnValue(result(undefined, { isError: true }));
    progressionMock.mockReturnValue(result(undefined, { isError: true }));
    render(<ScenarioContentSection query={query} />);
    expect(
      screen.getByText("The calibration endpoint did not respond — it may not be deployed yet."),
    ).toBeTruthy();
    expect(
      screen.getByText("The progression endpoint did not respond — it may not be deployed yet."),
    ).toBeTruthy();
    expect(
      screen.getAllByText(
        "The opportunity-coverage endpoint did not respond — it may not be deployed yet.",
      ).length,
    ).toBe(2);
    expect(
      screen.getByText("The repeat-improvement endpoint did not respond — it may not be deployed yet."),
    ).toBeTruthy();
  });
});
