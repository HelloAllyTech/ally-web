import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  CostPerImprovementResponse,
  EffectivenessFunnelResponse,
  FoundationalSkillsSegmentsResponse,
} from "../../effectivenessChart";

// Carbon charts draw through d3, which captures requestAnimationFrame at
// import time — hoisted stub, same reason the sibling chart tests need one.
vi.hoisted(() => {
  if (typeof window !== "undefined") {
    window.requestAnimationFrame = (() => 0) as typeof window.requestAnimationFrame;
  }
});

const activationMock = vi.fn();
const progressMock = vi.fn();
const courseImpactMock = vi.fn();
const competenceMock = vi.fn();
const funnelMock = vi.fn();
const segmentsMock = vi.fn();
const costMock = vi.fn();

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
const failed = () => result(undefined, { isError: true });

// Full replacement, not a partial spread: the real barrel reaches the store
// before a test store exists (see WeakPerformingMetricsTab.test.tsx).
vi.mock("@api", () => ({
  useGetActivationQuery: (args: unknown) => activationMock(args),
  useGetFoundationalSkillsProgressQuery: (args: unknown) => progressMock(args),
  useGetCourseImpactQuery: (args: unknown) => courseImpactMock(args),
  useGetFoundationalSkillsTimeToCompetenceQuery: (args: unknown) => competenceMock(args),
  useGetEffectivenessFunnelQuery: (args: unknown) => funnelMock(args),
  useGetFoundationalSkillsSegmentsQuery: (args: unknown) => segmentsMock(args),
  useGetEffectivenessCostPerImprovementQuery: (args: unknown, opts: unknown) =>
    costMock(args, opts),
  useGetTenantsQuery: () => ({
    data: {
      data: [
        { id: "t-alpha", name: "Alpha Care", isTestOrganization: false, deletedAt: null },
        { id: "t-qa", name: "QA sandbox", isTestOrganization: true, deletedAt: null },
      ],
    },
  }),
  useGetChartPreferencesQuery: () => ({
    data: { preferences: [] },
    isLoading: false,
    isUninitialized: false,
  }),
  useSaveChartPreferencesMutation: () => [vi.fn(), {}],
}));

import { EffectivenessSubTab } from "../EffectivenessSubTab";

/* -------------------------------------------------------------------------- */
/* Fixtures — only the fields each card reads                                 */
/* -------------------------------------------------------------------------- */

const activation = {
  summary: {
    latestCompleteBucket: "2026-09-28",
    latestPractisingLearners: 41,
    registeredLearners: 400,
    activatedLearners: 250,
    activationRatePct: 62.5,
    minPopulationSize: 20,
  },
  computedAt: "2026-10-05T08:00:00.000Z",
};

const composite = (over: object = {}) => ({
  n: 40,
  change: 0.04,
  ci: [-0.05, 0.13],
  up: 20,
  down: 18,
  tied: 2,
  signP: 0.8,
  detectable: false,
  ...over,
});

const progress = (over: object = {}) => ({
  minSampleSize: 20,
  measuredLearners: 120,
  thresholds: { trendMinCuts: 4 },
  depth: [
    { atLeast: 1, learners: 120 },
    { atLeast: 2, learners: 81 },
  ],
  summary: {
    cohortLearners: 40,
    earlyComposite: 2.1,
    lateComposite: 2.14,
    composite: composite(),
    unhelpful: {
      earlyPct: 30,
      latePct: 22,
      changePts: -8,
      ciPts: [-14, -2],
      stopped: 6,
      started: 3,
      persisted: 9,
      never: 22,
      signP: 0.03,
      detectable: true,
    },
  },
  trend: { improving: 5, steady: 25, declining: 2, tooEarly: 88 },
  safety: { selfHarm: { cutsFollowedUp: 18, cutsMissed: 6, cutsAmbiguous: 6 } },
  learnersScatter: null,
  doseResponse: {
    minLearners: 40,
    classifiedLearners: 12,
    measurable: false,
    learnersWithMinutes: null,
    fit: null,
    minutesFit: null,
    provenance: { derivation: "d", note: "n" },
  },
  computedAt: "2026-10-05T08:00:00.000Z",
  ...over,
});

const competence = {
  minSampleSize: 20,
  learners: 74,
  excludedSkills: [
    { skill: "rapport", reason: "capped" },
    { skill: "confidentiality", reason: "rare" },
    { skill: "harm", reason: "rare" },
    { skill: "family", reason: "capped" },
  ],
  tiers: [
    {
      tier: "engage",
      skills: ["verbal", "feelings", "empathy"],
      skillsRequired: 2,
      medianCuts: 4,
      notReachedByHalf: false,
      lastShownCut: 9,
      medianMinutes: 52,
      minutesLearners: 38,
    },
  ],
  computedAt: "2026-10-05T08:00:00.000Z",
};

const stage = (
  key: string,
  label: string,
  reached: number,
  ofEnteredPct: number | null,
  ofPreviousPct: number | null,
  terminal = false,
) => ({
  key,
  label,
  description: `${label} definition`,
  reached,
  ofEnteredPct,
  ofPreviousPct,
  terminal,
});

const funnel: EffectivenessFunnelResponse = {
  rubricVersion: "fhs-text-v1",
  minSampleSize: 20,
  minCohortSize: 5,
  trendMinCuts: 4,
  stages: [
    stage("signedUp", "Signed up", 400, 100, null),
    stage("firstSession", "First session", 250, 62.5, 62.5),
    stage("secondSession", "Second session", 180, 45, 72),
    stage("firstScoredCut", "First scored slice", 120, 30, 66.7),
    stage("measurable", "Measurable", 80, 20, 66.7),
    stage("classifiable", "Classifiable", 30, 7.5, 37.5),
    // Withheld by the server (fewer than 20 classifiable in the real rule). The
    // client would compute 4 ÷ 30 = 13.3% — it must print a dash instead.
    stage("improving", "Improving", 4, null, null, true),
  ],
  trend: {
    classifiable: 30,
    improving: 4,
    steady: 24,
    declining: 2,
    unclassified: 0,
    improvingPct: null,
    steadyPct: null,
    decliningPct: null,
  },
  clamp: { measuredLearners: 130, outsideFunnel: 10, notInPopulation: 7, fewerThanTwoSessions: 3 },
  helpingSkillsTrend: { improving: 5, steady: 25, declining: 2, tooEarly: 98 },
  cutNoiseSd: 0.2,
  provenance: { derivation: "d", note: "n" },
  scoping: { tenantId: null, note: "s" },
  computedAt: "2026-10-05T08:00:00.000Z",
};

const segChange = (over: object = {}) => ({
  learners: 50,
  earlyComposite: 2.1,
  lateComposite: 2.25,
  change: 0.15,
  ci: [0.02, 0.28] as [number, number],
  up: 25,
  down: 12,
  tied: 3,
  signP: 0.04,
  detectable: true,
  ...over,
});

const segments: FoundationalSkillsSegmentsResponse = {
  rubricVersion: "fhs-text-v1",
  minSampleSize: 20,
  minCohortSize: 5,
  scoreDomain: [1, 4],
  dimension: "language",
  dimensions: ["language", "workerType", "orgSize", "course", "difficulty", "difficultyTransition"],
  cuts: 4,
  windows: { early: [1, 2], late: [3, 4], from: 1 },
  cohortOptions: [{ cuts: 4, learners: 50 }],
  measuredLearners: 120,
  panelLearners: 50,
  overall: segChange(),
  segments: [{ ...segChange({ learners: 43 }), key: "en", label: "English" }],
  withheld: [{ key: "ta", label: "Tamil", learners: 7 }],
  provenance: { derivation: "d", note: "n" },
  scoping: { tenantId: null, note: "s" },
  computedAt: "2026-10-05T08:00:00.000Z",
};

const pooled = (over: object = {}) => ({
  learners: 12,
  beforeAvg: null,
  afterAvg: null,
  change: null,
  changeCi: null,
  up: 6,
  down: 5,
  tied: 1,
  signP: null,
  detectable: false,
  ...over,
});

const cost = (over: Partial<CostPerImprovementResponse> = {}): CostPerImprovementResponse => ({
  window: {
    from: "2025-01-01",
    to: "2026-10-05",
    label: "All time",
    days: 643,
    bucket: "month",
    allTime: true,
    inProgressBucket: null,
    computedAt: "2026-10-05T08:00:00.000Z",
  },
  spendUsd: 412.5,
  unpricedCalls: 0,
  improvedLearners: 22,
  classifiedLearners: 60,
  costPerImprovedLearnerUsd: 18.75,
  learnersWithSpend: 300,
  improvingAllTime: 22,
  classifiableAllTime: 60,
  measuredLearners: 130,
  cutNoiseSd: 0.2,
  minSampleSize: 20,
  rubricVersion: "fhs-text-v1",
  caveat: "c",
  scoping: { tenantId: null, unscopedSections: ["all"] },
  provenance: { derivation: "d", note: "n" },
  computedAt: "2026-10-05T08:00:00.000Z",
  ...over,
});

/** The KPI tile whose label is `label` — every tile is a Carbon Tile with this class. */
const tile = (label: string) => {
  const el = screen.getByText(label).closest(".analytics-kpi");
  if (!el) throw new Error(`no tile labelled ${label}`);
  return within(el as HTMLElement);
};

const lastArgs = (mock: ReturnType<typeof vi.fn>) => mock.mock.calls.at(-1)?.[0];

describe("EffectivenessSubTab", () => {
  beforeEach(() => {
    activationMock.mockReset().mockReturnValue(result(activation));
    progressMock.mockReset().mockReturnValue(result(progress()));
    courseImpactMock.mockReset().mockReturnValue(result({ minSampleSize: 20, pooled: pooled() }));
    competenceMock.mockReset().mockReturnValue(result(competence));
    funnelMock.mockReset().mockReturnValue(result(funnel));
    segmentsMock.mockReset().mockReturnValue(result(segments));
    costMock.mockReset().mockReturnValue(result(cost()));
  });

  it("loads each tile on its own query: one failing leaves the rest of the chain readable", () => {
    courseImpactMock.mockReturnValue(failed());
    render(<EffectivenessSubTab />);

    expect(tile("Course lift").getByText("Couldn't load")).toBeInTheDocument();
    expect(tile("Course lift").getByRole("button", { name: "Retry" })).toBeInTheDocument();
    // Only that tile failed.
    expect(screen.getAllByText("Couldn't load")).toHaveLength(1);

    expect(tile("Activated learners").getByText("250")).toBeInTheDocument();
    expect(tile("Measurable learners").getByText("81")).toBeInTheDocument();
    expect(tile("Helping skills, start → now").getByText("+0.04")).toBeInTheDocument();
    expect(
      tile("Helping skills, start → now").getByText(/^No detectable change: the 95% interval/),
    ).toBeInTheDocument();
    expect(tile("Learners beyond noise").getByText("5 up · 2 down")).toBeInTheDocument();
    expect(tile("Unhelpful behaviour, start → now").getByText("−8 pts")).toBeInTheDocument();
    expect(tile("Self-harm cues followed up").getByText("75%")).toBeInTheDocument();
    expect(tile("Self-harm cues followed up").getByText(/Internal/)).toBeInTheDocument();
    expect(tile("Practice to Engage competence").getByText("4 slices")).toBeInTheDocument();
  });

  it("says a failure on a new endpoint may just be an undeployed backend", () => {
    competenceMock.mockReturnValue(failed());
    render(<EffectivenessSubTab />);
    expect(
      tile("Practice to Engage competence").getByText(/it may not be deployed yet/),
    ).toBeInTheDocument();
  });

  it("shows a withheld number as n / need N, never as a value", () => {
    progressMock.mockReturnValue(
      result(
        progress({
          summary: {
            ...progress().summary,
            composite: composite({ n: 12, change: null, ci: null }),
          },
        }),
      ),
    );
    render(<EffectivenessSubTab />);

    expect(tile("Helping skills, start → now").getByText("Not enough data")).toBeInTheDocument();
    expect(
      tile("Helping skills, start → now").getByText("n = 12 learners · need 20"),
    ).toBeInTheDocument();
    // The pooled course comparison is under its floor too.
    expect(tile("Course lift").getByText("n = 12 learners · need 20")).toBeInTheDocument();
  });

  it("draws the funnel with the server's shares, a withheld one as a dash", () => {
    render(<EffectivenessSubTab />);

    // getAll: the closed expanded view (a Carbon modal) keeps a second copy in the DOM.
    expect(screen.getAllByText("100% of learners").length).toBeGreaterThan(0);
    expect(screen.getAllByText("72% of previous").length).toBeGreaterThan(0);
    expect(screen.getAllByText("37.5% of previous").length).toBeGreaterThan(0);
    // 4 of 30 would be 13.3% if the client recomputed it; the server said withhold.
    expect(screen.queryByText(/13\.3%/)).toBeNull();
    expect(screen.getByText("Of 30 classifiable learners")).toBeInTheDocument();
    expect(
      screen.getAllByText(/10 of 130 measured learners sit outside this funnel/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/a learner with fewer than 4 slices cannot be classified/).length,
    ).toBeGreaterThan(0);
  });

  it("splits by segment, lists withheld ones with their n, and switches dimension", async () => {
    render(<EffectivenessSubTab />);

    expect(screen.getAllByText("Everyone in the panel").length).toBeGreaterThan(0);
    expect(screen.getAllByText("English").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Too few learners to read \(under 20\): Tamil \(n = 7\)/),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(
        /Segments overlap; a gap between two is a hypothesis to check, not a finding\./,
      ).length,
    ).toBeGreaterThan(0);
    expect(lastArgs(segmentsMock)).toEqual({ dimension: "language" });

    await userEvent.click(screen.getByRole("combobox", { name: "Split by" }));
    const options = screen.getAllByRole("option").map(o => o.textContent);
    expect(options).not.toContain("Difficulty, start → now");
    await userEvent.click(screen.getByRole("option", { name: "Worker type" }));
    expect(lastArgs(segmentsMock)).toEqual({ dimension: "workerType" });
  });

  it("narrows every all-time query to the picked org; the cost tile stays platform-wide", async () => {
    render(<EffectivenessSubTab />);

    await userEvent.click(screen.getByRole("combobox", { name: "Org" }));
    await userEvent.click(screen.getByRole("option", { name: "Alpha Care" }));

    expect(lastArgs(activationMock)).toEqual({ range: "90d", bucket: "week", tenantId: "t-alpha" });
    expect(lastArgs(progressMock)).toEqual({ baselineFrom: 1, tenantId: "t-alpha" });
    expect(lastArgs(courseImpactMock)).toEqual({ tenantId: "t-alpha" });
    expect(lastArgs(competenceMock)).toEqual({ tenantId: "t-alpha" });
    expect(lastArgs(funnelMock)).toEqual({ tenantId: "t-alpha" });
    expect(lastArgs(segmentsMock)).toEqual({ dimension: "language", tenantId: "t-alpha" });
    expect(lastArgs(costMock)).toEqual({ range: "all" });
    expect(screen.getByText(/Platform-wide whatever the org filter/)).toBeInTheDocument();
  });

  it("gates dose–response on the server's count instead of drawing a thin scatter", () => {
    render(<EffectivenessSubTab />);
    expect(screen.getByText("Not yet measurable — n = 12 of 40 needed")).toBeInTheDocument();
  });

  it("draws dose–response with the slope and its interval once measurable", () => {
    progressMock.mockReturnValue(
      result(
        progress({
          learnersScatter: [
            { learnerId: 1, cuts: 4, practiceMinutes: 90, change: 0.3, trend: "improving" },
            { learnerId: 2, cuts: 12, practiceMinutes: 300, change: -0.1, trend: "steady" },
          ],
          doseResponse: {
            ...progress().doseResponse,
            classifiedLearners: 44,
            measurable: true,
            fit: {
              x: "cuts",
              n: 44,
              slope: 0.012,
              slopeCi: [-0.004, 0.028],
              intercept: -0.05,
              detectable: false,
              xMin: 4,
              xMax: 12,
            },
          },
        }),
      ),
    );
    render(<EffectivenessSubTab />);
    expect(
      screen.getByText(
        "Each extra scored slice is associated with +0.012 on a learner's own change (95% CI −0.004 to +0.028; n = 44): no detectable association.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/More practice is self-selected; people who improve may keep going\./)
        .length,
    ).toBeGreaterThan(0);
  });

  it("states cost per improved learner with both halves of the ratio, and withholds it below the floor", () => {
    const { unmount } = render(<EffectivenessSubTab />);
    const costTile = tile("USD per improved learner · All time");
    expect(costTile.getByText("$18.75")).toBeInTheDocument();
    expect(
      costTile.getByText(/\$412\.50 learner-caused AI spend ÷ 22 learners/),
    ).toBeInTheDocument();
    expect(costTile.getByText(/A ceiling, not a unit price/)).toBeInTheDocument();
    unmount();

    costMock.mockReturnValue(
      result(cost({ improvedLearners: 9, costPerImprovedLearnerUsd: null })),
    );
    render(<EffectivenessSubTab />);
    expect(
      tile("USD per improved learner · All time").getByText("n = 9 improved learners · need 20"),
    ).toBeInTheDocument();
  });
});
