import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SelfEfficacyResponse } from "../../perceptionChart";
import type { QualityDistributionResponse, SatisfactionByOrdinal } from "@types";

// Carbon/d3 capture requestAnimationFrame at import time — hoisted stub, as the
// sibling chart tests do.
vi.hoisted(() => {
  if (typeof window !== "undefined") {
    window.requestAnimationFrame = (() => 0) as typeof window.requestAnimationFrame;
  }
});

const efficacyMock = vi.fn();

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

// Full replacement: the section's only own query. The quality-distribution
// response arrives as a prop (the tab's query), so it is not mocked here.
vi.mock("@api", () => ({
  useGetFoundationalSkillsSelfEfficacyQuery: (args: unknown) => efficacyMock(args),
}));

import { PerceptionSection } from "../../PerceptionSection";

const cell = (ratings: number, avgRating: number | null, highSharePct: number | null = null) => ({
  ratings,
  avgRating,
  highSharePct,
});

const byOrdinal = (over: Partial<SatisfactionByOrdinal> = {}): SatisfactionByOrdinal => ({
  window: "all",
  maxOrdinal: 3,
  experiencedMinRatings: 3,
  minSampleSize: 20,
  ratedLearners: 60,
  experiencedLearners: 22,
  points: [
    { ordinal: 1, all: cell(60, 4.1, 78), experienced: cell(22, 4.0, 72.7) },
    { ordinal: 2, all: cell(41, 4.2, 80.5), experienced: cell(22, 4.1, 77.3) },
    { ordinal: 3, all: cell(25, 4.3, 84), experienced: cell(22, 4.3, 86.4) },
  ],
  ratingsBeyondLastOrdinal: 0,
  provenance: { derivation: "R6", note: "self-report" },
  ...over,
});

const distribution = (b?: SatisfactionByOrdinal) =>
  ({
    byOrdinal: b,
    ratingDomain: [1, 5],
    computedAt: "2026-10-05T08:00:00.000Z",
  }) as unknown as QualityDistributionResponse;

const none = {
  n: 0,
  beforeAvg: null,
  afterAvg: null,
  change: null,
  changeCi: null,
  up: 0,
  down: 0,
  tied: 0,
  signP: null,
  detectable: false,
};
const stats = {
  learners: 0,
  observations: 0,
  overConfident: 0,
  calibrated: 0,
  underConfident: 0,
  overConfidentPct: null,
  calibratedPct: null,
  underConfidentPct: null,
  meanGap: null,
  meanGapCi: null,
  spearmanR: null,
};

const selfEfficacy = (
  answered: number,
  over: Partial<SelfEfficacyResponse> = {},
): SelfEfficacyResponse => ({
  instrumentVersion: "v1",
  rubricVersion: "fhs-v3",
  minSampleSize: 20,
  minSpearmanPoints: 20,
  coverage: {
    learnersAsked: answered,
    learnersAnswered: answered,
    learnersWithTwoOrMore: 0,
    responses: 0,
    answeredResponses: 0,
    dismissedResponses: 0,
    byTrigger: { ONBOARDING: 0, CUTS: 0, COURSE: 0 },
    itemsAnswered: 0,
    matchedObservations: 0,
    unmatchedObservations: 0,
  },
  confidence: {
    learnersWithTwoOrMore: 0,
    selfDomain: [0, 10],
    levelDomain: [1, 4],
    tiers: (["engage", "understand", "support"] as const).map(t => ({
      tier: t,
      label: t[0].toUpperCase() + t.slice(1),
      skills: [],
      learners: 0,
      self: none,
      selfMatched: none,
      judge: none,
      medianDaysApart: null,
    })),
    skills: [],
  },
  calibration: {
    thresholds: { rescale: "1 + 3·r/10", band: 0.75, matchWindowDays: 30 },
    skills: [],
    overall: stats,
    points: [],
    pointsTotal: 0,
    pointsTruncated: false,
    pointCap: 2000,
    safetyFlag: {
      skill: "harm",
      name: "Assessing harm",
      learners: 0,
      overConfident: 0,
      overConfidentPct: null,
      internal: true,
      note: "Share only privately with partners.",
    },
  },
  caveat: "Poor self-assessors.",
  provenance: { derivation: "R1 + instrument", note: "note" },
  scoping: { tenantId: null, note: "by answer org" },
  computedAt: "2026-10-05T08:00:00.000Z",
  ...over,
});

const state = (data?: QualityDistributionResponse, over: object = {}) => ({
  data,
  loading: false,
  error: false,
  onRetry: vi.fn(),
  ...over,
});

describe("PerceptionSection", () => {
  beforeEach(() => {
    efficacyMock.mockReset().mockReturnValue(result(selfEfficacy(0)));
  });

  it("follows the page's org filter, and sends nothing for every org", () => {
    const { rerender } = render(
      <PerceptionSection tenantId="t-alpha" distribution={state(distribution(byOrdinal()))} />,
    );
    expect(efficacyMock).toHaveBeenLastCalledWith({ tenantId: "t-alpha" });
    rerender(<PerceptionSection distribution={state(distribution(byOrdinal()))} />);
    expect(efficacyMock).toHaveBeenLastCalledWith({});
  });

  it("says both confidence cards are not yet measured when nobody has answered", () => {
    render(<PerceptionSection distribution={state(distribution(byOrdinal()))} />);
    expect(screen.getByText("AAQ-230")).toBeInTheDocument();
    expect(screen.getByText("AAQ-231")).toBeInTheDocument();
    expect(
      screen.getAllByText(
        /Not yet measured — the learner self-rating prompt has not shipped yet; the API is ready\./,
      ),
    ).toHaveLength(2);
  });

  it("states satisfaction by ordinal from the tab's response, all time", () => {
    render(<PerceptionSection distribution={state(distribution(byOrdinal()))} />);
    expect(screen.getByText("AAQ-229")).toBeInTheDocument();
    expect(screen.getByText(/All time, whatever the window above/)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Experienced panel \(22 learners\): mean rating 4\.00 at the 1st rated session/,
      ),
    ).toBeInTheDocument();
  });

  it("shows the thin state under the ratings floor", () => {
    render(
      <PerceptionSection distribution={state(distribution(byOrdinal({ ratedLearners: 8 })))} />,
    );
    expect(screen.getByText(/n = 8 learners with a rating · need at least 20/)).toBeInTheDocument();
  });

  it("treats a response without the ordinal block as a backend not yet deployed", () => {
    render(<PerceptionSection distribution={state(distribution(undefined))} />);
    expect(
      screen.getByText(/The satisfaction-by-ordinal endpoint did not respond/),
    ).toBeInTheDocument();
  });

  it("reads confidence beside the judge, and flags harm over-confidence as internal", () => {
    const s = selfEfficacy(35);
    s.confidence = {
      ...s.confidence,
      learnersWithTwoOrMore: 24,
      tiers: s.confidence.tiers.map(t => ({
        ...t,
        learners: 24,
        self: { ...none, n: 24, change: 1.2, changeCi: [0.6, 1.8], detectable: true },
        judge: { ...none, n: 21, change: 0.1, changeCi: [-0.05, 0.25] },
      })),
    };
    s.calibration = {
      ...s.calibration,
      overall: { ...stats, learners: 30, overConfident: 14, calibrated: 12, underConfident: 4 },
      points: [{ skill: "verbal", selfRating: 8, level: 2 }],
      safetyFlag: {
        ...s.calibration.safetyFlag,
        learners: 22,
        overConfident: 9,
        overConfidentPct: 40.9,
      },
    };
    efficacyMock.mockReturnValue(result(s));
    render(<PerceptionSection distribution={state(distribution(byOrdinal()))} />);

    expect(
      screen.getByText(/Self-rated confidence \(0–10\), first → latest answer: Engage \+1\.2/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/14 over-confident, 12 calibrated, 4 under-confident/),
    ).toBeInTheDocument();
    expect(screen.getByText("Internal")).toBeInTheDocument();
    expect(
      screen.getByText(/Assessing harm: 9 of 22 learners over-confident \(40\.9%\)/),
    ).toBeInTheDocument();
  });

  it("shows a not-deployed error when the self-efficacy endpoint does not answer", () => {
    efficacyMock.mockReturnValue(result(undefined, { isError: true }));
    render(<PerceptionSection distribution={state(distribution(byOrdinal()))} />);
    expect(screen.getAllByText(/The self-efficacy endpoint did not respond/)).toHaveLength(2);
  });
});
