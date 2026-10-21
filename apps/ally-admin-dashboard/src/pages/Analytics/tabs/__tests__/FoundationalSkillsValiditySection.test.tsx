import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  FeedbackUptakeResponse,
  FoundationalSkillsTransferResponse,
  JudgeAgreementResponse,
  MeasurementConvergenceResponse,
  PairedComparison,
} from "../../foundationalSkillsValidityChart";

// Carbon/d3 capture requestAnimationFrame at import time — hoisted stub, as the
// sibling chart tests do.
vi.hoisted(() => {
  if (typeof window !== "undefined") {
    window.requestAnimationFrame = (() => 0) as typeof window.requestAnimationFrame;
  }
});

const transferMock = vi.fn();
const uptakeMock = vi.fn();
const convergenceMock = vi.fn();
const judgeMock = vi.fn();

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
  useGetFoundationalSkillsTransferQuery: (args: unknown) => transferMock(args),
  useGetFoundationalSkillsFeedbackUptakeQuery: (args: unknown) => uptakeMock(args),
  useGetMeasurementConvergenceQuery: (args: unknown) => convergenceMock(args),
  useGetFoundationalSkillsJudgeAgreementQuery: (...args: unknown[]) => judgeMock(...args),
}));

import { FoundationalSkillsValiditySection } from "../../FoundationalSkillsValiditySection";

const provenance = { derivation: "derivation", note: "note" };
const computedAt = "2026-10-05T08:00:00.000Z";

const comparison = (over: Partial<PairedComparison> = {}): PairedComparison => ({
  n: 24,
  beforeAvg: 2.6,
  afterAvg: 2.41,
  change: -0.19,
  changeCi: [-0.31, -0.07],
  up: 6,
  down: 16,
  tied: 2,
  signP: 0.03,
  detectable: true,
  ...over,
});

const transfer = (
  over: Partial<FoundationalSkillsTransferResponse> = {},
): FoundationalSkillsTransferResponse => ({
  rubricVersion: "fhs-v3",
  minSampleSize: 20,
  minSingleScenarioCuts: 3,
  scoreDomain: [1, 4],
  learnersMeasured: 60,
  scoredCuts: 477,
  singleScenarioCuts: 310,
  singleScenarioSharePct: 65,
  learnersEligible: 40,
  learnersWithPair: 24,
  pairs: 31,
  comparison: comparison(),
  sameDifficulty: comparison({ n: 12, change: -0.05, changeCi: [-0.2, 0.1], detectable: false }),
  difficultyShift: { harder: 14, same: 12, easier: 3, untagged: 2 },
  learners: [{ learnerId: 7, before: 2.5, after: 2.2, change: -0.3, pairs: 2 }],
  provenance,
  scoping: { tenantId: null, unscopedSections: [] },
  computedAt,
  ...over,
});

const emptyDiff = {
  learners: 0,
  namedRosePct: null,
  unnamedRosePct: null,
  change: null,
  changeCi: null,
  up: 0,
  down: 0,
  tied: 0,
  signP: null,
  detectable: false,
};
const emptyArm = {
  learners: 0,
  observations: 0,
  rosePct: null,
  heldPct: null,
  fellPct: null,
  beforeLevelAvg: null,
};

const uptake = (mapped: number, pooledLearners = 0): FeedbackUptakeResponse => ({
  rubricVersion: "fhs-v3",
  mapperVersion: "map-v1",
  minSampleSize: 20,
  coverage: {
    debriefedSessions: 530,
    mappedSessions: mapped,
    skippedSessions: 0,
    failedSessions: 0,
    pendingSessions: 530 - mapped,
    improvements: 0,
    improvementsWithoutSkill: 0,
    sessionsPaired: 0,
    windows: 0,
    learnersPaired: 0,
    namedNotAssessable: 0,
  },
  pooled: {
    named: emptyArm,
    unnamed: emptyArm,
    difference: { ...emptyDiff, learners: pooledLearners },
  },
  skills: [],
  caveat: "Observational.",
  provenance,
  scoping: { tenantId: null, note: "both" },
  computedAt,
});

const convergence = (): MeasurementConvergenceResponse => ({
  rubricVersion: "fhs-v3",
  minPairs: 50,
  minSessionsForScoreZ: 20,
  cuts: { total: 477, singleScenario: 310, singleScenarioPct: 65 },
  rulers: [
    { key: "R1", label: "Helping skills", description: "Composite 1–4", cuts: 310 },
    { key: "R2", label: "Session score", description: "z within scenario", cuts: 280 },
    { key: "R6", label: "Rating", description: "1–5", cuts: 40 },
  ],
  pairs: [
    { a: "R1", b: "R2", n: 280, learners: 50, r: 0.42 },
    { a: "R1", b: "R6", n: 33, learners: 20, r: null },
    { a: "R2", b: "R6", n: 31, learners: 19, r: null },
  ],
  strongest: { a: "R1", b: "R2", n: 280, learners: 50, r: 0.42 },
  weakest: null,
  caveat: "Agreement is not validity.",
  scoping: { tenantId: null, unscopedSections: [] },
  provenance,
  computedAt,
});

const binary = {
  pairs: 0,
  cuts: 0,
  kappa: null,
  agreementPct: null,
  both: 0,
  onlyFirst: 0,
  onlySecond: 0,
  neither: 0,
};
const level = (over: object = {}) => ({
  pairs: 0,
  cuts: 0,
  kappa: null,
  weightedKappa: null,
  exactAgreementPct: null,
  meanDifference: null,
  confusion: [],
  ...over,
});

const judge = (
  status: JudgeAgreementResponse["status"],
  verbal: object = {},
): JudgeAgreementResponse => ({
  status,
  rubricVersion: "fhs-v3",
  minSampleSize: 20,
  samplePerQuarter: 30,
  skills: [
    {
      skill: "verbal",
      name: "Verbal communication",
      tier: "engage",
      judgeVsHuman: { opportunity: binary, level: level(verbal) },
      humanVsHuman: { opportunity: binary, level: level() },
    },
  ],
  unhelpful: { judgeVsHuman: binary, humanVsHuman: binary },
  coverage: {
    quarters: 2,
    sampledCuts: 60,
    ratedCuts: status === "notYetMeasured" ? 0 : 24,
    ratedSampledCuts: 0,
    multiRatedCuts: 0,
    ratings: status === "notYetMeasured" ? 0 : 30,
    raters: status === "notYetMeasured" ? 0 : 2,
    excludedOtherRubricVersion: 0,
    excludedNoJudgement: 0,
    byQuarter: [],
  },
  provenance,
  computedAt,
});

const renderSection = (tenantId = "") =>
  render(<FoundationalSkillsValiditySection tenantId={tenantId} windowLabel="All time" />);

describe("FoundationalSkillsValiditySection", () => {
  beforeEach(() => {
    transferMock.mockReset().mockReturnValue(result(transfer()));
    uptakeMock.mockReset().mockReturnValue(result(uptake(0)));
    convergenceMock.mockReset().mockReturnValue(result(convergence()));
    judgeMock.mockReset().mockReturnValue(result(judge("notYetMeasured")));
  });

  it("narrows the three org-scoped queries to the tab's org; judge agreement takes none", () => {
    renderSection("t-alpha");
    expect(transferMock).toHaveBeenLastCalledWith({ tenantId: "t-alpha" });
    expect(uptakeMock).toHaveBeenLastCalledWith({ tenantId: "t-alpha" });
    expect(convergenceMock).toHaveBeenLastCalledWith({ tenantId: "t-alpha" });
    expect(judgeMock).toHaveBeenLastCalledWith();
  });

  it("sends no tenant at all for every org", () => {
    renderSection();
    expect(transferMock).toHaveBeenLastCalledWith({});
  });

  it("renders all four cards with their ids", () => {
    renderSection();
    for (const id of ["AAQ-220", "AAQ-221", "AAQ-222", "AAQ-223"]) {
      expect(screen.getByText(id)).toBeInTheDocument();
    }
  });

  it("says the feedback mapping is not switched on, rather than 'n = 0'", () => {
    renderSection();
    expect(
      screen.getByText(/Not yet measured — the feedback-to-skill mapping runs only when enabled/),
    ).toBeInTheDocument();
    expect(screen.getByText(/530 debriefed sessions are waiting/)).toBeInTheDocument();
  });

  it("says judge agreement is not yet measured, naming the quarterly sample", () => {
    renderSection();
    expect(
      screen.getByText(
        /Not yet measured — no human ratings yet\. Raters work from the quarterly sample \(30 slices\)\./,
      ),
    ).toBeInTheDocument();
  });

  it("states the transfer change and the difficulty tally", () => {
    renderSection();
    expect(screen.getByText(/a detectable drop/)).toBeInTheDocument();
    expect(screen.getByText(/14 of 31 new scenarios were harder/)).toBeInTheDocument();
    expect(screen.getByText("Familiar scenario")).toBeInTheDocument();
    expect(screen.getByText("New scenario")).toBeInTheDocument();
  });

  it("shows the thin state for a withheld transfer comparison, with its count", () => {
    transferMock.mockReturnValue(
      result(
        transfer({
          learnersWithPair: 7,
          learners: null,
          comparison: comparison({
            n: 7,
            beforeAvg: null,
            afterAvg: null,
            change: null,
            changeCi: null,
            signP: null,
            detectable: false,
          }),
        }),
      ),
    );
    renderSection();
    expect(screen.getByText(/n = 7 learners with a pair · need at least 20/)).toBeInTheDocument();
  });

  it("shows the uptake thin state once mapping runs but too few learners pair", () => {
    uptakeMock.mockReturnValue(result(uptake(400, 6)));
    renderSection();
    expect(screen.getByText(/n = 6 learners · need at least 20/)).toBeInTheDocument();
  });

  it("draws the ruler matrix: r where stated, n alone below the floor", () => {
    renderSection();
    expect(screen.getByText("r = 0.42")).toBeInTheDocument();
    expect(screen.getByText("n = 33")).toBeInTheDocument();
    expect(
      screen.getByText(/Strongest agreement: Helping skills and Session score/),
    ).toBeInTheDocument();
  });

  it("tables judge agreement once ratings exist, withheld cells as a dash", () => {
    judgeMock.mockReturnValue(
      result(
        judge("measured", { cuts: 24, weightedKappa: 0.71, kappa: 0.55, exactAgreementPct: 62.5 }),
      ),
    );
    renderSection();
    expect(screen.getByText("0.71")).toBeInTheDocument();
    expect(screen.getByText("62.5%")).toBeInTheDocument();
    expect(screen.getByText(/Judge vs human, weighted κ on 1 of 1 skills/)).toBeInTheDocument();
  });

  it("says collecting while ratings are below the floor", () => {
    judgeMock.mockReturnValue(result(judge("collecting", { cuts: 6 })));
    renderSection();
    expect(
      screen.getByText(/Collecting — 30 human ratings on 24 slices so far/),
    ).toBeInTheDocument();
  });

  it("shows a not-deployed error for an endpoint that does not answer", () => {
    transferMock.mockReturnValue(result(undefined, { isError: true }));
    renderSection();
    expect(screen.getByText(/The transfer endpoint did not respond/)).toBeInTheDocument();
  });
});
