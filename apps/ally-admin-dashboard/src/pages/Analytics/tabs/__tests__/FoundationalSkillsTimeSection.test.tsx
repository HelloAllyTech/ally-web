import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FoundationalSkillsSegmentsResponse } from "../../effectivenessChart";
import type {
  PracticeProgressionResponse,
  SkillRetentionResponse,
  TimeToCompetenceResponse,
} from "../../foundationalSkillsTimeChart";

// Carbon charts draw through d3, which captures requestAnimationFrame at
// import time — hoisted stub, same reason the sibling chart tests need one.
vi.hoisted(() => {
  if (typeof window !== "undefined") {
    window.requestAnimationFrame = (() => 0) as typeof window.requestAnimationFrame;
  }
});

const competenceMock = vi.fn();
const retentionMock = vi.fn();
const progressionMock = vi.fn();
const segmentsMock = vi.fn();

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

// Full replacement, not a partial spread: the real barrel reaches the store
// before a test store exists (see WeakPerformingMetricsTab.test.tsx).
vi.mock("@api", () => ({
  useGetFoundationalSkillsTimeToCompetenceQuery: (args: unknown) => competenceMock(args),
  useGetFoundationalSkillsRetentionQuery: (args: unknown) => retentionMock(args),
  useGetPracticeProgressionQuery: (args: unknown) => progressionMock(args),
  useGetFoundationalSkillsSegmentsQuery: (args: unknown) => segmentsMock(args),
}));

import { FoundationalSkillsTimeSection } from "../../FoundationalSkillsTimeSection";

const scoping = { tenantId: null, unscopedSections: [] };
const provenance = { derivation: "derivation", note: "note" };
const computedAt = "2026-10-05T08:00:00.000Z";

const tier = (over: object) => ({
  tier: "engage",
  skills: ["verbal", "feelings", "empathy"],
  skillsRequired: 2,
  points: [
    { cut: 1, atRisk: 74, reachedAtCut: 15, censoredAtCut: 2, reachedShare: 20.3 },
    { cut: 2, atRisk: 57, reachedAtCut: 20, censoredAtCut: 3, reachedShare: 48.2 },
    { cut: 3, atRisk: 34, reachedAtCut: 8, censoredAtCut: 4, reachedShare: 59.4 },
  ],
  reachedLearners: 43,
  notReachedLearners: 31,
  medianCuts: 3,
  notReachedByHalf: false,
  lastShownCut: 3,
  medianMinutes: 51.6,
  minutesLearners: 38,
  missing: { learners: 31, mostOftenMissing: null, skills: [] },
  ...over,
});

const competence = {
  rubricVersion: "fhs-text-v1",
  cutSizeLearnerChars: 5000,
  minSampleSize: 20,
  minCohortSize: 5,
  competenceLevel: 3,
  tierCompetenceSkills: { engage: 2, understand: 3, support: 2 },
  excludedSkills: [
    { skill: "rapport", reason: "capped" },
    { skill: "confidentiality", reason: "rare" },
    { skill: "harm", reason: "rare" },
    { skill: "family", reason: "capped" },
  ],
  learners: 74,
  learnersWithoutFirstCut: 0,
  maxCut: 3,
  tiers: [
    tier({}),
    tier({
      tier: "understand",
      skills: ["functioning", "explanation", "coping", "psychoeducation"],
      skillsRequired: 3,
      medianCuts: null,
      notReachedByHalf: true,
      medianMinutes: null,
    }),
  ],
  scoping,
  provenance,
  computedAt,
} as unknown as TimeToCompetenceResponse;

const rchange = (over: object = {}) => ({
  pairs: 60,
  learners: 25,
  measurable: true,
  change: 0.02,
  ci: [-0.04, 0.08],
  up: 12,
  down: 11,
  tied: 2,
  signP: 0.9,
  detectable: false,
  ...over,
});

const retention = {
  rubricVersion: "fhs-text-v1",
  cutSizeLearnerChars: 5000,
  minSampleSize: 20,
  minPairs: 20,
  minLearners: 10,
  bandDefs: [],
  learners: 40,
  pairs: {
    considered: 200,
    nonAdjacent: 4,
    sameSession: 30,
    missingTimes: 2,
    overlapping: 3,
    plotted: 164,
  },
  bands: [
    {
      band: "<7",
      label: "Under 7 days",
      minDays: 0,
      maxDays: 7,
      reference: true,
      medianGapDays: 1.5,
      composite: rchange(),
      unhelpful: rchange(),
    },
    {
      band: "30+",
      label: "30+ days",
      minDays: 30,
      maxDays: null,
      reference: false,
      medianGapDays: null,
      composite: rchange({
        pairs: 8,
        learners: 6,
        measurable: false,
        change: null,
        ci: null,
        signP: null,
      }),
      unhelpful: rchange({ measurable: false, change: null, ci: null }),
    },
  ],
  takeaway: {
    referenceBand: "<7",
    referenceChange: 0.02,
    referenceCi: [-0.04, 0.08],
    longBreakBand: "30+",
    longBreakChange: null,
    longBreakCi: null,
  },
  scoping,
  provenance,
  computedAt,
} as unknown as SkillRetentionResponse;

const cell = (sessions: number, shares: number[] | null) => ({
  sessions,
  counts: { EASY: 10, MEDIUM: 20, HARD: 5, untagged: 1 },
  shares: shares
    ? { EASY: shares[0], MEDIUM: shares[1], HARD: shares[2], untagged: shares[3] }
    : { EASY: null, MEDIUM: null, HARD: null, untagged: null },
});

const progression = {
  maxOrdinal: 12,
  minSampleSize: 20,
  experiencedMinSessions: 12,
  levels: ["EASY", "MEDIUM", "HARD", "untagged"],
  learners: 120,
  experiencedLearners: 14,
  ordinals: [
    { ordinal: 1, ...cell(120, [30, 60, 8, 2]), experienced: cell(14, null) },
    { ordinal: 2, ...cell(80, [25, 55, 18, 2]), experienced: cell(14, null) },
  ],
  scoping,
  provenance,
  computedAt,
} as unknown as PracticeProgressionResponse;

const difficulty = (segments: FoundationalSkillsSegmentsResponse["segments"]) =>
  ({
    rubricVersion: "fhs-text-v1",
    minSampleSize: 20,
    minCohortSize: 5,
    scoreDomain: [1, 4],
    dimension: "difficultyTransition",
    dimensions: ["language", "difficultyTransition"],
    cuts: 4,
    windows: { early: [1, 2], late: [3, 4], from: 1 },
    cohortOptions: [],
    measuredLearners: 120,
    panelLearners: 30,
    overall: {
      learners: 30,
      earlyComposite: 2.1,
      lateComposite: 2.2,
      change: 0.1,
      ci: [-0.02, 0.22],
      up: 16,
      down: 12,
      tied: 2,
      signP: 0.5,
      detectable: false,
    },
    segments,
    withheld: [
      { key: "MEDIUM→MEDIUM", label: "Medium → Medium", learners: 14 },
      { key: "EASY→HARD", label: "Easy → Hard", learners: 6 },
    ],
    provenance,
    scoping: { tenantId: null, note: "s" },
    computedAt,
  }) as FoundationalSkillsSegmentsResponse;

const lastArgs = (mock: ReturnType<typeof vi.fn>) => mock.mock.calls.at(-1)?.[0];

describe("FoundationalSkillsTimeSection", () => {
  beforeEach(() => {
    competenceMock.mockReset().mockReturnValue(result(competence));
    retentionMock.mockReset().mockReturnValue(result(retention));
    progressionMock.mockReset().mockReturnValue(result(progression));
    segmentsMock.mockReset().mockReturnValue(result(difficulty([])));
  });

  it("follows the tab's org filter on all four queries", () => {
    render(
      <FoundationalSkillsTimeSection tenantId="t-alpha" windowLabel="All time · Alpha only" />,
    );
    expect(lastArgs(competenceMock)).toEqual({ tenantId: "t-alpha" });
    expect(lastArgs(retentionMock)).toEqual({ tenantId: "t-alpha" });
    expect(lastArgs(progressionMock)).toEqual({ tenantId: "t-alpha" });
    expect(lastArgs(segmentsMock)).toEqual({
      dimension: "difficultyTransition",
      tenantId: "t-alpha",
    });
  });

  it("asks for every org when the tab has no filter", () => {
    render(<FoundationalSkillsTimeSection tenantId="" />);
    expect(lastArgs(competenceMock)).toEqual({});
    expect(lastArgs(segmentsMock)).toEqual({ dimension: "difficultyTransition" });
  });

  it("headlines time to competence per tier and names the excluded skills", () => {
    render(<FoundationalSkillsTimeSection tenantId="" />);
    expect(
      screen.getByText(
        "Engage: median 3 slices, 52 min of practice among those who got there · Understand: not reached by half by slice 3.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(
        /Left out of every tier: rapport and family \(capped at level 2 by the rubric\)/,
      ).length,
    ).toBeGreaterThan(0);
  });

  it("reads retention against the reference and lists a withheld band by its counts", () => {
    render(<FoundationalSkillsTimeSection tenantId="" />);
    expect(
      screen.getByText(/Too few learners have come back after 30\+ days to compare yet\./),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Reference: no real break/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("8 pairs from 6 learners").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/too few pairs \(n = 6\)/).length).toBeGreaterThan(0);
  });

  it("toggles the difficulty mix to the experienced panel, with its own empty state", async () => {
    render(<FoundationalSkillsTimeSection tenantId="" />);
    expect(
      screen.getByText("Hard scenarios: 8% of session 1s, 18% of session 2s (all learners)."),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("combobox", { name: "Learners" }));
    await userEvent.click(screen.getByRole("option", { name: "Learners with 12+ sessions" }));
    expect(
      screen.getByText("Too few learners with 12+ sessions to state a mix yet"),
    ).toBeInTheDocument();
  });

  it("gates the within-difficulty card until one path clears the floor", () => {
    render(<FoundationalSkillsTimeSection tenantId="" />);
    expect(
      screen.getByText("Not yet measurable: n = 14 of 20 needed in any cell"),
    ).toBeInTheDocument();
  });

  it("draws the within-difficulty whiskers once a path is measurable", () => {
    segmentsMock.mockReturnValue(
      result(
        difficulty([
          {
            key: "EASY→EASY",
            label: "Easy → Easy",
            learners: 22,
            earlyComposite: 2.0,
            lateComposite: 2.1,
            change: 0.1,
            ci: [-0.05, 0.25],
            up: 12,
            down: 8,
            tied: 2,
            signP: 0.5,
            detectable: false,
          },
        ]),
      ),
    );
    render(<FoundationalSkillsTimeSection tenantId="" />);
    expect(screen.getAllByText("Easy → Easy").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Medium → Medium \(n = 14\), Easy → Hard \(n = 6\)/).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText(/Not yet measurable/)).toBeNull();
  });

  it("says an endpoint that fails may not be deployed yet, without blanking the others", () => {
    retentionMock.mockReturnValue(result(undefined, { isError: true }));
    render(<FoundationalSkillsTimeSection tenantId="" />);
    expect(
      screen.getByText("The retention endpoint did not respond — it may not be deployed yet."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Hard scenarios: 8% of session 1s, 18% of session 2s (all learners)."),
    ).toBeInTheDocument();
  });
});
