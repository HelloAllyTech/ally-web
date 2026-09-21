import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  RoadmapOpportunity,
  RoadmapOpportunitySource,
  RoadmapOpportunityStage,
  RoadmapOpportunityType,
} from "@types";

import { MergeOpportunitiesPanel } from "../MergeOpportunitiesPanel";

const mockMerge = vi.fn();

/** Reassigned mid-test so the mocked search hook can return a different result set per search. */
let searchResults: RoadmapOpportunity[] = [];

vi.mock("@api", () => ({
  useGetRoadmapOpportunitiesQuery: () => ({ data: { items: searchResults }, isFetching: false }),
  useMergeRoadmapOpportunitiesMutation: () => [mockMerge, { isLoading: false }],
}));

vi.mock("@components", () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock("@components/types", () => ({
  ButtonVariant: { PRIMARY: "primary", SECONDARY: "secondary", TEXT: "text" },
}));

vi.mock("@icons", () => ({
  Add: () => null,
  Close: () => null,
  Search: () => null,
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  TextArea: ({ value, onChange, labelText }: any) => (
    <label>
      {labelText}
      <textarea aria-label={labelText} value={value} onChange={onChange} />
    </label>
  ),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const opportunity = (
  id: string,
  code: string,
  priorityScore: number,
  description: string,
): RoadmapOpportunity =>
  ({
    id,
    description,
    type: RoadmapOpportunityType.IDEA,
    stage: RoadmapOpportunityStage.NEW,
    productGoal: "Engagement & Usability",
    owner: null,
    prd: null,
    claudePrompt: null,
    releasedAt: null,
    code,
    queueRank: null,
    builderSessionId: null,
    plannedMonth: null,
    boardPosition: 0,
    effectiveMonth: null,
    monthPinned: false,
    priorityScore,
    myVotes: 0,
    commentCount: 0,
    source: RoadmapOpportunitySource.STAFF,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    creator: null,
  }) as RoadmapOpportunity;

describe("MergeOpportunitiesPanel", () => {
  /**
   * The bug: the docblock and add()'s own comment both claim the primary "defaults to the
   * highest-scoring pick," but add() only ever sets primaryId on the very first pick. Finding
   * the low-vote duplicate before the popular original silently keeps the low-vote one's OPP
   * code, comments and shareable link unless the manager notices and manually flips the radio.
   */
  it("defaults the primary to the highest-scoring pick, even when a low-vote duplicate is added first", () => {
    const lowVote = opportunity("low", "OPP-0001", 3, "Low vote duplicate");
    const popular = opportunity("popular", "OPP-0002", 250, "The popular original");

    searchResults = [lowVote];
    render(<MergeOpportunitiesPanel onMerged={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/search opportunities to merge/i), {
      target: { value: "low" },
    });
    fireEvent.click(screen.getByRole("button", { name: /OPP-0001/ }));

    fireEvent.click(screen.getByText(/add another/i));
    searchResults = [popular];
    fireEvent.change(screen.getByLabelText(/search opportunities to merge/i), {
      target: { value: "popular" },
    });
    fireEvent.click(screen.getByRole("button", { name: /OPP-0002/ }));

    expect(
      screen.getByLabelText(`Keep ${popular.code} as the surviving opportunity`),
    ).toBeChecked();
    expect(
      screen.getByLabelText(`Keep ${lowVote.code} as the surviving opportunity`),
    ).not.toBeChecked();
  });
});
