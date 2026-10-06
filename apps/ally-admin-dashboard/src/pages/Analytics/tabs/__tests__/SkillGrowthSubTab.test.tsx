import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Carbon charts draw through d3, which captures requestAnimationFrame at
// import time — hoisted stub, same reason the sibling chart tests need one.
vi.hoisted(() => {
  if (typeof window !== "undefined") {
    window.requestAnimationFrame = (() => 0) as typeof window.requestAnimationFrame;
  }
});

import type {
  CompetencyMapResponse,
  SkillGrowthLearnersResponse,
  SkillGrowthResponse,
  SkillTrendThresholds,
} from "@types";

const growthMock = vi.fn();
const competencyMock = vi.fn();
const learnersMock = vi.fn();

const idleQuery = () => ({
  data: undefined,
  isLoading: false,
  isFetching: false,
  isUninitialized: false,
  isError: false,
  error: undefined,
  refetch: vi.fn(),
});

vi.mock("@api", () => ({
  useGetSkillGrowthQuery: (args: unknown) => growthMock(args),
  useGetCompetencyMapQuery: (args: unknown) => competencyMock(args),
  useGetSkillGrowthLearnersQuery: (args: unknown) => learnersMock(args),
}));

// The learner panel reaches past the barrel for its hook.
vi.mock("@api/analytics", () => ({
  useGetSkillGrowthLearnerSeriesQuery: () => idleQuery(),
}));

import { SKILL_GROWTH_RULER_NOTE, SkillGrowthSubTab } from "../SkillGrowthSubTab";

const thresholds: SkillTrendThresholds = {
  minSessions: 4,
  window: 2,
  flatBand: 0.31,
  cutNoiseSd: 0.112,
  bandZ: 1.96,
  bandRule: "k = the learner's scored cuts (at least 4); w = floor(k / 2).",
};

const scoping = { tenantId: null, unscopedSections: [] };
const provenance = { derivation: "R1 slices", note: "AI judge not validated against human raters." };

const growth: SkillGrowthResponse = {
  ordinals: [
    {
      ordinal: 1,
      all: { median: 2.1, p25: 1.8, p75: 2.4, n: 120 },
      experienced: { median: 2.05, p25: 1.8, p75: 2.3, n: 40 },
    },
    {
      ordinal: 2,
      all: { median: 2.35, p25: 2.0, p75: 2.6, n: 90 },
      experienced: { median: 2.3, p25: 2.0, p75: 2.6, n: 40 },
    },
  ],
  maxOrdinal: 12,
  experiencedMinSessions: 6,
  minSampleSize: 20,
  scoreDomain: [1, 4],
  rubricVersion: "fhs-text-v1",
  cutSizeLearnerChars: 5000,
  provenance,
  summary: {
    learners: 120,
    experiencedLearners: 40,
    evaluatedSessions: 812,
    firstOrdinalMedian: 2.1,
    lastComparableOrdinal: 2,
    lastComparableMedian: 2.35,
  },
  trendMix: {
    classifiedLearners: 10,
    insufficientLearners: 4,
    improving: 6,
    flat: 3,
    declining: 1,
    months: [{ month: "2026-08", improving: 6, flat: 3, declining: 1 }],
    thresholds,
  },
  scoping,
  computedAt: "2026-10-05T10:00:00.000Z",
};

const row = {
  learners: 30,
  scenarios: 3,
  taggedCuts: 60,
  scoreLearners: 18,
  belowFloor: false,
};

const competencyMap: CompetencyMapResponse = {
  competencies: [
    {
      ...row,
      competencyId: "c1",
      name: "Empathy, Warmth & Genuineness",
      completedSessions: 400,
      skill: "empathy",
      skillName: "Empathy, warmth and genuineness",
      score: 2.6,
      scoredCuts: 45,
      scoreUnavailable: null,
      medianScore: 2.6,
      evaluatedSessions: 45,
    },
    {
      ...row,
      competencyId: "c2",
      name: "Promote Realistic Hope",
      completedSessions: 90,
      skill: "hope",
      skillName: "Promote realistic hope for change",
      score: null,
      scoredCuts: 7,
      scoreUnavailable: "tooFewCuts",
      medianScore: null,
      evaluatedSessions: 7,
      belowFloor: true,
    },
    {
      ...row,
      competencyId: "c3",
      name: "Non-Verbal Communication",
      completedSessions: 60,
      skill: null,
      skillName: null,
      score: null,
      taggedCuts: 0,
      scoredCuts: 0,
      scoreLearners: 0,
      scoreUnavailable: "noRubricSkill",
      medianScore: null,
      evaluatedSessions: 0,
    },
  ],
  unattributed: { completedSessions: 0, scoredCuts: 0, evaluatedSessions: 0, label: "No competency tagged" },
  minSampleSize: 20,
  scoreDomain: [1, 4],
  rubricVersion: "fhs-text-v1",
  cutAttribution: { scoredCuts: 800, singleScenarioCuts: 500, singleScenarioPct: 62.5, untaggedCuts: 20 },
  summary: { competencies: 3, completedSessions: 550, evaluatedSessions: 500 },
  provenance,
  scoping,
  computedAt: "2026-10-05T10:00:00.000Z",
};

const learners: SkillGrowthLearnersResponse = {
  rows: [
    {
      learnerId: 7,
      name: "Asha",
      email: null,
      tenantId: null,
      evaluatedSessions: 8,
      firstWindowMean: 2.1,
      lastWindowMean: 2.5,
      delta: 0.4,
      band: 0.22,
      trend: "improving",
      lastSessionAt: "2026-09-30T10:00:00.000Z",
    },
  ],
  total: 1,
  limit: 20,
  offset: 0,
  thresholds,
  rubricVersion: "fhs-text-v1",
  provenance,
  scoping,
  computedAt: "2026-10-05T10:00:00.000Z",
};

const filters = { query: { range: "all" as const }, language: "", onSelectLanguage: vi.fn() };

describe("SkillGrowthSubTab — on the learner ruler", () => {
  beforeEach(() => {
    growthMock.mockReset().mockReturnValue({ ...idleQuery(), data: growth });
    competencyMock.mockReset().mockReturnValue({ ...idleQuery(), data: competencyMap });
    learnersMock.mockReset().mockReturnValue({ ...idleQuery(), data: learners });
  });

  it("says on its face that the charts used to show the AI client's score", () => {
    render(<SkillGrowthSubTab {...filters} />);

    expect(screen.getByText(SKILL_GROWTH_RULER_NOTE)).toBeInTheDocument();
    expect(SKILL_GROWTH_RULER_NOTE).toContain("Until October 2026");
    expect(SKILL_GROWTH_RULER_NOTE).toContain("AI client");
  });

  it("shows the note even before any data arrives", () => {
    growthMock.mockReturnValue({ ...idleQuery(), isLoading: true });
    competencyMock.mockReturnValue({ ...idleQuery(), isLoading: true });
    learnersMock.mockReturnValue({ ...idleQuery(), isLoading: true });
    render(<SkillGrowthSubTab {...filters} />);

    expect(screen.getByText(SKILL_GROWTH_RULER_NOTE)).toBeInTheDocument();
  });

  it("titles and labels every card in slices and the helping-skills score", () => {
    render(<SkillGrowthSubTab {...filters} />);

    // Card and (closed) detail modal both carry the title.
    expect(screen.getAllByText("Helping-skills score by Nth slice").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Competency map — practice volume against learner skill level").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Median first slice")).toBeInTheDocument();
    expect(screen.getByText("Scored slices")).toBeInTheDocument();
    // The first-slice median at the server's precision, on the 1–4 scale.
    expect(screen.getByText("2.10")).toBeInTheDocument();
    expect(screen.getByText(/0\.25 higher than at their 1st \(2\.10 → 2\.35 on the 1–4 scale\)/)).toBeInTheDocument();
    // Band copy from the response, sized to noise — never "± N points".
    expect(screen.getByText(/±0\.31 at 4 slices, narrower with more/)).toBeInTheDocument();
    expect(screen.queryByText(/points/)).not.toBeInTheDocument();
  });

  it("states how much practice the competency scores can be credited, and lists the unscored by reason", () => {
    render(<SkillGrowthSubTab {...filters} />);

    expect(
      screen.getByText(/62\.5% of scored slices ran a single scenario/),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No rubric skill (practice volume only): Non-Verbal Communication"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Too few slices to score (need 20): Promote Realistic Hope (n = 7)"),
    ).toBeInTheDocument();
  });

  it("lists each learner's own band beside their change", () => {
    render(<SkillGrowthSubTab {...filters} />);

    const learnerRow = screen.getByRole("button", { name: "Asha" }).closest("tr") as HTMLElement;
    expect(within(learnerRow).getByText("2.10 → 2.50")).toBeInTheDocument();
    expect(within(learnerRow).getByText("+0.4")).toBeInTheDocument();
    expect(within(learnerRow).getByText("±0.22")).toBeInTheDocument();
  });

  it("passes the page's org to every query", () => {
    render(<SkillGrowthSubTab {...filters} query={{ range: "all", tenantId: "t-1" }} />);

    expect(growthMock).toHaveBeenLastCalledWith({ tenantId: "t-1" });
    expect(competencyMock).toHaveBeenLastCalledWith({ tenantId: "t-1" });
    expect(learnersMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ tenantId: "t-1", sort: "delta", order: "desc", offset: 0 }),
    );
  });
});
