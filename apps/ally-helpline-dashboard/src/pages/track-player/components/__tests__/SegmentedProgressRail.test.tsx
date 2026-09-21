import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TrackItemStatus, TrackItemType } from "@types";

import { FlatTrackItem } from "../../useTrackPlayerNavigation";
import { SegmentedProgressRail } from "../SegmentedProgressRail";

const buildSectionItems = (): FlatTrackItem[] => [
  {
    item: {
      id: "item-1",
      type: TrackItemType.ARTICLE,
      order: 0,
      title: "Completed item",
      description: null,
      scenarioId: null,
      caseId: null,
      completionCriteria: null,
      contentMeta: null,
      status: TrackItemStatus.COMPLETED,
      startedAt: null,
      completedAt: null,
      score: null,
      attemptCount: null,
      maxWatchedPct: null,
    },
    sectionId: "section-1",
    sectionTitle: "Section 1",
    indexInSection: 0,
    sectionItemCount: 2,
  },
  {
    item: {
      id: "item-2",
      type: TrackItemType.ARTICLE,
      order: 1,
      title: "Current item",
      description: null,
      scenarioId: null,
      caseId: null,
      completionCriteria: null,
      contentMeta: null,
      status: TrackItemStatus.UNLOCKED,
      startedAt: null,
      completedAt: null,
      score: null,
      attemptCount: null,
      maxWatchedPct: null,
    },
    sectionId: "section-1",
    sectionTitle: "Section 1",
    indexInSection: 1,
    sectionItemCount: 2,
  },
];

describe("SegmentedProgressRail", () => {
  it("jumps to a completed item's segment when clicked", async () => {
    const onSegmentClick = vi.fn();
    render(
      <SegmentedProgressRail
        sectionItems={buildSectionItems()}
        currentItemId="item-2"
        onSegmentClick={onSegmentClick}
      />,
    );

    // Before the fix, completed segments were plain non-interactive spans
    // with no click handler at all — a control that looks like a step
    // indicator but is genuinely dead on click.
    await userEvent.click(screen.getByRole("button", { name: "Review Completed item" }));

    expect(onSegmentClick).toHaveBeenCalledWith("item-1");
  });

  it("does not expose an in-progress segment as a clickable control", () => {
    render(
      <SegmentedProgressRail
        sectionItems={buildSectionItems()}
        currentItemId="item-2"
        onSegmentClick={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: /Current item/ })).not.toBeInTheDocument();
  });
});
