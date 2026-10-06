import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  EffectivenessOrgChange,
  EffectivenessOrgMetrics,
  EffectivenessOrgsResponse,
} from "../../orgEffectivenessChart";

vi.hoisted(() => {
  if (typeof window !== "undefined") {
    window.requestAnimationFrame = (() => 0) as typeof window.requestAnimationFrame;
  }
});

const orgsMock = vi.fn();

const result = <T,>(data: T | undefined, over: object = {}) => ({
  data,
  isLoading: false,
  isFetching: false,
  isUninitialized: false,
  isError: false,
  error: undefined,
  refetch: vi.fn(),
  ...over,
});

// Full replacement: the card's only query.
vi.mock("@api", () => ({
  useGetEffectivenessOrgsQuery: (args: unknown) => orgsMock(args),
}));

import { OrgEffectivenessCard } from "../../OrgEffectivenessCard";

const change = (over: Partial<EffectivenessOrgChange> = {}): EffectivenessOrgChange => ({
  learners: 31,
  earlyAvg: 2.3,
  lateAvg: 2.45,
  change: 0.15,
  ci: [0.04, 0.26],
  up: 20,
  down: 8,
  tied: 3,
  signP: 0.02,
  detectable: true,
  ...over,
});
const nullChange = (learners: number) =>
  change({ learners, earlyAvg: null, lateAvg: null, change: null, ci: null, detectable: false });

const metrics = (over: Partial<EffectivenessOrgMetrics> = {}): EffectivenessOrgMetrics => ({
  scoredLearners: 40,
  measurableLearners: 34,
  classifiableLearners: 31,
  scoredCuts: 260,
  belowFloor: false,
  composite: change(),
  trend: {
    classifiable: 31,
    improving: 9,
    steady: 19,
    declining: 3,
    unclassified: 0,
    improvingPct: 29,
    steadyPct: 61.3,
    decliningPct: 9.7,
  },
  unhelpful: change({ change: -8, ci: [-13.2, -2.9] }),
  courses: { learnersStarted: 25, started: 30, completed: 12, completionPct: 40 },
  selfHarm: {
    internal: true,
    learnersWithCue: 12,
    cutsWithCue: 18,
    cutsFollowedUp: 11,
    cutsMissed: 4,
    cutsAmbiguous: 0,
    followedUpPct: 73.3,
  },
  spark: [null, 2.4, 2.5, null, 2.6, 2.6],
  sparkCuts: [2, 7, 9, 3, 11, 6],
  ...over,
});

const below = () =>
  metrics({
    measurableLearners: 6,
    belowFloor: true,
    composite: nullChange(4),
    trend: {
      ...metrics().trend,
      classifiable: 4,
      improvingPct: null,
      steadyPct: null,
      decliningPct: null,
    },
    unhelpful: nullChange(4),
    courses: { learnersStarted: 3, started: 3, completed: 1, completionPct: null },
    selfHarm: { ...metrics().selfHarm, learnersWithCue: 2, followedUpPct: null },
    spark: [null, null, null, null, null, null],
  });

const response = (over: Partial<EffectivenessOrgsResponse> = {}): EffectivenessOrgsResponse => ({
  rubricVersion: "fhs-v3",
  minSampleSize: 20,
  minCohortSize: 5,
  thresholds: { trendMinCuts: 4, learnerBandZ: 1.96 },
  scoreDomain: [1, 4],
  cutNoiseSd: 0.42,
  sparkMonths: ["2026-05-01", "2026-06-01", "2026-07-01", "2026-08-01", "2026-09-01", "2026-10-01"],
  sparkMinCuts: 5,
  summary: {
    orgs: 12,
    orgsWithData: 2,
    orgsAboveFloor: 1,
    cutsUnattributed: 0,
    learnersUnattributed: 0,
  },
  platform: metrics({ measurableLearners: 40 }),
  orgs: [
    { ...metrics(), tenantId: "t-big", tenantName: "Big Org", code: "BIG" },
    { ...below(), tenantId: "t-small", tenantName: "Small Org", code: null },
  ],
  scoping: { tenantId: null, unscopedSections: [] },
  provenance: { derivation: "R1", note: "note" },
  computedAt: "2026-10-05T08:00:00.000Z",
  ...over,
});

describe("OrgEffectivenessCard (AAQ-232)", () => {
  beforeEach(() => {
    orgsMock.mockReset().mockReturnValue(result(response()));
  });

  it("asks for every org at once", () => {
    render(<OrgEffectivenessCard />);
    expect(orgsMock).toHaveBeenLastCalledWith({});
    expect(screen.getByText("AAQ-232")).toBeInTheDocument();
  });

  it("puts the platform row first, then orgs in the server's order", () => {
    render(<OrgEffectivenessCard />);
    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("All orgs (platform)")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Big Org")).toBeInTheDocument();
    expect(within(rows[2]).getByText("Small Org")).toBeInTheDocument();
  });

  it("keeps a below-floor row's counts and says withheld for every rate", () => {
    render(<OrgEffectivenessCard />);
    const small = screen.getAllByRole("row")[3];
    expect(within(small).getAllByText("withheld")).toHaveLength(5);
    expect(
      within(small).getByText(/under 20 measurable learners — rates withheld/),
    ).toBeInTheDocument();
    expect(within(small).getByText("6")).toBeInTheDocument();
  });

  it("marks self-harm follow-up as internal and states change with its interval", () => {
    render(<OrgEffectivenessCard />);
    expect(screen.getByText("Internal")).toBeInTheDocument();
    const big = screen.getAllByRole("row")[2];
    expect(within(big).getByText("+0.15")).toBeInTheDocument();
    expect(within(big).getByText("73.3%")).toBeInTheDocument();
    expect(screen.getByText(/1 of 2 orgs have 20\+ measurable learners/)).toBeInTheDocument();
  });

  it("opens the expanded view with the export only when asked", async () => {
    render(<OrgEffectivenessCard />);
    expect(screen.queryByRole("button", { name: /Export CSV/i })).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Expand Org effectiveness scorecard" }),
    );
    expect(screen.getByRole("button", { name: /Export CSV/i })).toBeInTheDocument();
  });

  it("shows an empty state when no org has data", () => {
    orgsMock.mockReturnValue(result(response({ orgs: [] })));
    render(<OrgEffectivenessCard />);
    expect(
      screen.getByText("No org has scored practice or a started course yet"),
    ).toBeInTheDocument();
  });

  it("shows a not-deployed error when the endpoint does not answer", () => {
    orgsMock.mockReturnValue(result(undefined, { isError: true }));
    render(<OrgEffectivenessCard />);
    expect(screen.getByText(/The org effectiveness endpoint did not respond/)).toBeInTheDocument();
  });
});
