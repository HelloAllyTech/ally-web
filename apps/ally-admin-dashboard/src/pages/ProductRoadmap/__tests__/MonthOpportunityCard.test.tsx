import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  RoadmapOpportunity,
  RoadmapOpportunitySource,
  RoadmapOpportunityStage,
  RoadmapOpportunityType,
} from "@types";

vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Translate: { toString: () => undefined } },
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
}));

vi.mock("../VoteButton", () => ({
  VoteButton: () => null,
}));

import { MonthOpportunityCard } from "../MonthOpportunityCard";

const opportunity = (priorityScore: number): RoadmapOpportunity => ({
  id: "opp-1",
  description: "Some opportunity",
  type: RoadmapOpportunityType.IDEA,
  stage: RoadmapOpportunityStage.NEW,
  productGoal: "Engagement & Usability",
  owner: null,
  prd: null,
  claudePrompt: null,
  releasedAt: null,
  priorityScore,
  myVotes: 0,
  commentCount: 0,
  source: RoadmapOpportunitySource.STAFF,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  creator: null,
});

const renderCard = (priorityScore: number, maxScore: number) => {
  const { container } = render(
    <MonthOpportunityCard
      opportunity={opportunity(priorityScore)}
      maxScore={maxScore}
      canVote={false}
      canDrag={false}
      onSetVotes={vi.fn()}
      onOpen={vi.fn()}
    />,
  );
  return container.querySelector(".bg-primary-500") as HTMLElement;
};

describe("MonthOpportunityCard priority bar", () => {
  it("fills the full width when the score matches the ceiling", () => {
    const bar = renderCard(10, 10);
    expect(bar).toHaveStyle({ width: "100%" });
  });

  it("clamps at 100% when a stale maxScore is lower than the card's own score", () => {
    // Mirrors utils/priorityColour.ts's clamp: an unfiltered maxScore fetched before a vote
    // burst can legitimately be smaller than a freshly-boosted score elsewhere on the page.
    const bar = renderCard(15, 10);
    expect(bar).toHaveStyle({ width: "100%" });
  });
});
