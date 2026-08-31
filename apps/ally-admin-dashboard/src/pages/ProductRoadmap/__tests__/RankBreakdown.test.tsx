import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  RoadmapOpportunity,
  RoadmapOpportunityEffort,
  RoadmapOpportunitySource,
  RoadmapOpportunityStage,
  RoadmapOpportunityType,
} from "@types";

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Tooltip: ({ children, label }: any) => <span data-tooltip={label}>{children}</span>,
}));

import { RankBreakdownPanel, rankFactorSummary } from "../RankBreakdown";

const opportunity = (overrides: Partial<RoadmapOpportunity> = {}): RoadmapOpportunity =>
  ({
    id: "opp-1",
    code: "OPP-0001",
    description: "A thing",
    type: RoadmapOpportunityType.IDEA,
    stage: RoadmapOpportunityStage.NEW,
    productGoal: "Scribe",
    owner: null,
    ownerUserId: null,
    prd: null,
    claudePrompt: null,
    builderSessionId: null,
    queueRank: 1,
    releasedAt: null,
    plannedMonth: null,
    effort: RoadmapOpportunityEffort.M,
    boardPosition: 0,
    effectiveMonth: null,
    monthPinned: false,
    priorityScore: 40,
    compositeScore: 63.3,
    voterCount: 3,
    goalsHelped: 2,
    goalsAssessed: 4,
    goalsTotal: 4,
    myVotes: 0,
    commentCount: 0,
    source: RoadmapOpportunitySource.STAFF,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    creator: null,
    ...overrides,
  }) as RoadmapOpportunity;

describe("rankFactorSummary", () => {
  it("names all four factors, so a blended score can be argued with", () => {
    expect(rankFactorSummary(opportunity())).toEqual([
      "40 votes",
      "3 admins",
      // The shirt size verbatim from EFFORT_LABEL — the card has no room to spell it out.
      "M",
      "2/4 goals",
    ]);
  });

  it("says Unsized rather than omitting effort", () => {
    // Unsized scores at the neutral middle, not at zero. A reader comparing two cards has to
    // know which of them was never estimated, or the effort factor looks like a bad estimate.
    expect(rankFactorSummary(opportunity({ effort: null }))).toContain("Unsized");
  });

  it("omits goal coverage entirely when no strategy is set", () => {
    // "0/0 goals" would read as a failure rather than as an unasked question.
    const summary = rankFactorSummary(opportunity({ goalsTotal: 0, goalsHelped: 0 }));
    expect(summary.some(part => part.includes("goals"))).toBe(false);
  });

  it("singularises one vote and one admin", () => {
    expect(rankFactorSummary(opportunity({ priorityScore: 1, voterCount: 1 }))).toEqual(
      expect.arrayContaining(["1 vote", "1 admin"]),
    );
  });
});

describe("RankBreakdownPanel", () => {
  const renderPanel = (
    over: Partial<RoadmapOpportunity> = {},
    props: Partial<React.ComponentProps<typeof RankBreakdownPanel>> = {},
  ) =>
    render(
      <RankBreakdownPanel
        opportunity={opportunity(over)}
        verdicts={[]}
        isLoadingVerdicts={false}
        canManage
        isReassessing={false}
        onReassess={vi.fn()}
        {...props}
      />,
    );

  it("warns when the assessment predates a goal being added", () => {
    // Coverage divides by the LIVE goal count, so an under-assessed row scores low for a reason
    // that has nothing to do with its merit. That has to be visible, not inferred.
    renderPanel({ goalsAssessed: 2, goalsTotal: 4 });
    expect(screen.getByText(/Judged against 2 of 4 goals/)).toBeTruthy();
  });

  it("does not warn when every goal has a verdict", () => {
    renderPanel({ goalsAssessed: 4, goalsTotal: 4 });
    expect(screen.queryByText(/the strategy changed since/)).toBeNull();
  });

  it("states each verdict as a word, not a colour alone", () => {
    // The verdict must survive a monochrome render and a screen reader.
    renderPanel(
      {},
      {
        verdicts: [
          {
            goalName: "Ship faster",
            helped: true,
            reason: "Cuts a manual step",
            assessedAt: "2026-08-30T00:00:00.000Z",
          },
          {
            goalName: "Retain users",
            helped: false,
            reason: "No effect on retention",
            assessedAt: "2026-08-30T00:00:00.000Z",
          },
        ],
      },
    );
    expect(screen.getByText("Advances")).toBeTruthy();
    expect(screen.getByText("No effect")).toBeTruthy();
    // The negative reason is the one worth arguing with, so it is shown rather than hidden.
    expect(screen.getByText("No effect on retention")).toBeTruthy();
  });

  it("hides the reassess action from someone who cannot manage the board", () => {
    renderPanel({}, { canManage: false });
    expect(screen.queryByText("Reassess")).toBeNull();
  });

  it("says the score is unexplained rather than showing an empty list", () => {
    renderPanel({}, { verdicts: [] });
    expect(screen.getByText(/It ranks with no goal coverage until it is/)).toBeTruthy();
  });

  it("omits the goal section entirely when no strategy is set", () => {
    renderPanel({ goalsTotal: 0 });
    expect(screen.queryByText("Strategy goal assessment")).toBeNull();
    expect(screen.getByText("No strategy set")).toBeTruthy();
  });
});
