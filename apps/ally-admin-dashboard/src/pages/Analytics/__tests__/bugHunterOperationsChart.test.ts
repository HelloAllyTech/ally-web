import { describe, expect, it } from "vitest";

import {
  BugFindingSource,
  BugHuntTrigger,
  BugHunterOperationsDay,
  BugHunterOperationsMetrics,
} from "@types";

import {
  BREADTH_GROUP,
  DIFFICULTY_LABELS,
  OUTCOME_ACCEPTED,
  OUTCOME_DECLINED,
  OUTCOME_UNDECIDED,
  SOURCE_SCALE,
  breadthStart,
  buildBreadthSeries,
  buildBreadthTable,
  buildDifficultyTable,
  buildFiledSeries,
  buildReporterBars,
  buildSourceSeries,
  buildSourceTable,
  difficultyTakeaway,
  filedTakeaway,
  presentSources,
  rangeToDays,
  sourceLabel,
  tokensPerLine,
} from "../bugHunterOperationsChart";

const tokens = (input = 0, output = 0, runs = 0, costUsd = 0) => ({
  runs,
  inputTokens: input,
  outputTokens: output,
  costUsd,
});
const outcomes = (filed = 0, accepted = 0, declined = 0, undecided = 0) => ({
  filed,
  accepted,
  declined,
  undecided,
});

const day = (date: string, over: Partial<BugHunterOperationsDay> = {}): BugHunterOperationsDay => ({
  date,
  filed: 0,
  accepted: 0,
  declined: 0,
  undecided: 0,
  bySource: {},
  byDifficulty: { easy: outcomes(), hard: outcomes(), reported: outcomes() },
  breadth: null,
  tokens: {
    [BugHuntTrigger.SCHEDULED]: tokens(),
    [BugHuntTrigger.MANUAL]: tokens(),
    [BugHuntTrigger.FIX_SESSION]: tokens(),
  },
  ...over,
});

const metrics = (over: Partial<BugHunterOperationsMetrics> = {}): BugHunterOperationsMetrics => ({
  windowDays: 30,
  since: "2026-08-29T00:00:00.000Z",
  days: [],
  bySource: [],
  byDifficulty: [
    { difficulty: "easy", ...outcomes() },
    { difficulty: "hard", ...outcomes() },
    { difficulty: "reported", ...outcomes() },
  ],
  breadth: null,
  byReporter: [],
  tokensByModel: [],
  totals: { ...outcomes(), inputTokens: 0, outputTokens: 0, costUsd: 0, runs: 0 },
  ...over,
});

describe("rangeToDays", () => {
  it("maps the page range onto the endpoint's day count, capping at its maximum", () => {
    expect(rangeToDays({ range: "30d" })).toBe(30);
    expect(rangeToDays({ range: "90d" })).toBe(90);
    expect(rangeToDays({ range: "12m" })).toBe(365);
    expect(rangeToDays({ range: "all" })).toBe(365);
    expect(rangeToDays({})).toBe(30);
  });

  it("reads a custom range as 'from that day until today', since the endpoint is anchored on now", () => {
    const now = new Date("2026-09-28T12:00:00.000Z");
    expect(rangeToDays({ from: "2026-09-21", to: "2026-09-25" }, now)).toBe(8);
    expect(rangeToDays({ from: "2020-01-01", to: "2020-02-01" }, now)).toBe(365);
  });
});

describe("filed series", () => {
  it("emits the three outcomes as stacked groups over every day, quiet days included", () => {
    const series = buildFiledSeries([
      day("2026-09-26"),
      day("2026-09-27", { filed: 6, accepted: 3, declined: 2, undecided: 1 }),
    ]);
    expect(series).toEqual([
      { group: OUTCOME_ACCEPTED, key: "2026-09-26", value: 0 },
      { group: OUTCOME_ACCEPTED, key: "2026-09-27", value: 3 },
      { group: OUTCOME_DECLINED, key: "2026-09-26", value: 0 },
      { group: OUTCOME_DECLINED, key: "2026-09-27", value: 2 },
      { group: OUTCOME_UNDECIDED, key: "2026-09-26", value: 0 },
      { group: OUTCOME_UNDECIDED, key: "2026-09-27", value: 1 },
    ]);
  });

  it("states the accepted share over what was ruled on, never over what was filed", () => {
    expect(
      filedTakeaway(metrics({ totals: { ...outcomes(8, 3, 2, 3), inputTokens: 0, outputTokens: 0, costUsd: 0, runs: 0 } })),
    ).toBe("8 filed · 60% of the 5 ruled on were accepted");
    expect(
      filedTakeaway(metrics({ totals: { ...outcomes(4, 0, 0, 4), inputTokens: 0, outputTokens: 0, costUsd: 0, runs: 0 } })),
    ).toBe("4 filed — none ruled on yet");
  });
});

describe("source series", () => {
  it("plots only sources present in the window, each in its fixed colour and in palette order", () => {
    const bySource = [
      { source: BugFindingSource.REPORTED_BUG, ...outcomes(9, 3, 1, 5) },
      { source: BugFindingSource.CODE_REVIEW, ...outcomes(44, 18, 16, 10) },
    ];
    const sources = presentSources(bySource);
    expect(sources).toEqual([BugFindingSource.CODE_REVIEW, BugFindingSource.REPORTED_BUG]);
    const series = buildSourceSeries(
      [day("2026-09-27", { bySource: { [BugFindingSource.CODE_REVIEW]: 5 } })],
      sources,
    );
    expect(series).toEqual([
      { group: sourceLabel(BugFindingSource.CODE_REVIEW), key: "2026-09-27", value: 5 },
      { group: sourceLabel(BugFindingSource.REPORTED_BUG), key: "2026-09-27", value: 0 },
    ]);
    // The colour is keyed by the label the series uses, so the legend matches the bars.
    expect(SOURCE_SCALE[sourceLabel(BugFindingSource.CODE_REVIEW)]).toBeDefined();
  });

  it("puts a dash, never 0%, beside a source nobody has ruled on", () => {
    const table = buildSourceTable([
      { source: BugFindingSource.UX_SIGNAL, ...outcomes(4, 0, 0, 4) },
      { source: BugFindingSource.TEST_FAILURE, ...outcomes(2, 2, 0, 0) },
    ]);
    expect(table.rows[0][5]).toBe("—");
    expect(table.rows[1][5]).toBe("100%");
  });
});

describe("difficulty", () => {
  it("lists all three buckets in a fixed order and compares hard against easy", () => {
    const data = metrics({
      byDifficulty: [
        { difficulty: "easy", ...outcomes(29, 22, 2, 5) },
        { difficulty: "hard", ...outcomes(44, 18, 16, 10) },
        { difficulty: "reported", ...outcomes() },
      ],
    });
    const table = buildDifficultyTable(data);
    expect(table.rows.map(r => r[0])).toEqual([
      DIFFICULTY_LABELS.easy,
      DIFFICULTY_LABELS.hard,
      DIFFICULTY_LABELS.reported,
    ]);
    expect(table.rows[2][5]).toBe("—");
    expect(difficultyTakeaway(data)).toBe(
      "44 hard-to-spot vs 29 easy — accepted 53% vs 92% of those ruled on",
    );
  });
});

describe("reporters", () => {
  it("always yields all three bars so a zero for consumers is visible", () => {
    expect(buildReporterBars([{ reporter: "agent", filed: 7, accepted: 3, declined: 2 }])).toEqual([
      { group: "Bug Hunter", value: 7 },
      { group: "Staff", value: 0 },
      { group: "Consumers", value: 0 },
    ]);
  });
});

describe("breadth", () => {
  const days = [
    day("2026-09-21", { tokens: { ...day("x").tokens, [BugHuntTrigger.SCHEDULED]: tokens(500_000, 50_000, 5) } }),
    day("2026-09-22"),
    day("2026-09-23", {
      breadth: { runs: 5, linesInScope: 4000, filesInScope: 60, commits: 7, deepRuns: 0 },
      tokens: {
        ...day("x").tokens,
        [BugHuntTrigger.SCHEDULED]: tokens(1_000_000, 200_000, 5),
        [BugHuntTrigger.FIX_SESSION]: tokens(900_000, 100_000, 2),
      },
    }),
    day("2026-09-24"),
  ];

  it("starts the plot on the first recorded day rather than drawing earlier days as zero", () => {
    expect(breadthStart(days)).toBe("2026-09-23");
    expect(buildBreadthSeries(days)).toEqual([
      { group: BREADTH_GROUP, key: "2026-09-23", value: 4000 },
      { group: BREADTH_GROUP, key: "2026-09-24", value: 0 },
    ]);
    expect(buildBreadthSeries([day("2026-09-21")])).toEqual([]);
  });

  it("marks unrecorded days in the table instead of printing zero lines", () => {
    const table = buildBreadthTable(days);
    expect(table.rows[0][1]).toBe("not recorded");
    expect(table.rows[2].slice(1, 3)).toEqual([4000, 60]);
  });

  it("computes tokens per line from sweep tokens only, over the measured days", () => {
    // 1.2M sweep tokens on the one measured day; the fix session's 1M and the
    // unmeasured day's 550k are both left out.
    expect(tokensPerLine(days)).toBe(300);
    expect(tokensPerLine([day("2026-09-21")])).toBeNull();
  });
});
