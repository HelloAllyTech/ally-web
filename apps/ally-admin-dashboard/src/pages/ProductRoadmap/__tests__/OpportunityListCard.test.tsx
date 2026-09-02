import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  RoadmapOpportunity,
  RoadmapOpportunityEffort,
  RoadmapOpportunitySource,
  RoadmapOpportunityStage,
  RoadmapOpportunityType,
} from "@types";

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
}));

vi.mock("../VoteButton", () => ({
  VoteButton: () => null,
}));

import { OpportunityListCard } from "../OpportunityListCard";

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
    queueRank: 3,
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

describe("OpportunityListCard queue rank tooltip", () => {
  it("does not claim the rank is by total votes now that it is a composite", () => {
    // Rank ordering switched to `sortBy: "composite"` (see utils/queueSort.ts), so the tooltip
    // must not tell the reader it's "total votes" — that contradicts the RankScore breakdown
    // rendered directly beneath it.
    const { container } = render(
      <OpportunityListCard
        opportunity={opportunity()}
        maxScore={100}
        isQueue
        canVote={false}
        onSetVotes={vi.fn()}
        onOpen={vi.fn()}
      />,
    );

    const rankBadge = container.querySelector("[title]") as HTMLElement;
    expect(rankBadge.getAttribute("title")).not.toMatch(/total votes/i);
  });
});
