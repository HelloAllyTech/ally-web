import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  RoadmapFacets,
  RoadmapOpportunitySource,
  RoadmapOpportunityStage,
  RoadmapOpportunityType,
} from "@types";

/**
 * Captures the props the filter bar hands the shared FilterDropdown, so these tests can assert the
 * contract between the two — which sections are offered, and what the bar does with a result —
 * without reimplementing the popover's two-panel interaction. The popover's own behaviour is
 * already covered by components/filters/__tests__/FilterDropdown.test.tsx, and the pure mapping by
 * filterSelection.test.ts.
 */
const captured = vi.hoisted(() => ({ dropdown: null as any }));

vi.mock("@icons", () => ({
  Close: () => <span>clear</span>,
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
}));

vi.mock("@components", () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  ListToolbar: () => null,
  FilterDropdown: (props: any) => {
    captured.dropdown = props;
    return props.isOpen ? <div data-testid="filter-popover" /> : null;
  },
}));

vi.mock("@components/types", () => ({
  ButtonVariant: { PRIMARY: "primary", SECONDARY: "secondary", TEXT: "text" },
}));

// Pulls in Carbon's DatePicker/NumberInput, which the range panel owns and these tests don't touch.
vi.mock("../RoadmapAdvancedFilters", () => ({
  RoadmapAdvancedFilters: () => null,
}));

import { RoadmapFilterBar } from "../RoadmapFilterBar";
import { EMPTY_ADVANCED_FILTERS } from "../utils/filters";

const facets: RoadmapFacets = {
  creators: [{ id: 7, email: "sandeep@helloally.ai", name: "Sandeep Malhotra" }],
  goals: ["Reliability & Trust"],
  owners: ["Ajey Gore", "Sandeep Malhotra"],
};

const renderBar = (overrides: Partial<React.ComponentProps<typeof RoadmapFilterBar>> = {}) => {
  const handlers = {
    onTypeFilterChange: vi.fn(),
    onStageFilterChange: vi.fn(),
    onSourceFilterChange: vi.fn(),
    onGoalFilterChange: vi.fn(),
    onOwnerFilterChange: vi.fn(),
    onAdvancedChange: vi.fn(),
  };

  render(
    <RoadmapFilterBar
      search=""
      onSearchChange={vi.fn()}
      typeFilter={[]}
      stageFilter={[]}
      sourceFilter={[]}
      goalFilter={[]}
      ownerFilter={[]}
      advanced={{ ...EMPTY_ADVANCED_FILTERS }}
      goals={[{ id: "g1", name: "Reliability & Trust", position: 0 }]}
      facets={facets}
      onManageGoals={vi.fn()}
      canVote
      canManage={false}
      onAddClick={vi.fn()}
      {...handlers}
      {...overrides}
    />,
  );

  return handlers;
};

describe("RoadmapFilterBar", () => {
  it("offers one Filter entry point, not a pill per option", () => {
    // The regression this replaces: Type/Stage/Source/Goal/Owner rendered all 19 of their options
    // permanently, wrapping to three lines and pushing the first table row off the fold.
    renderBar();

    expect(screen.getByRole("button", { name: "Filter" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Consumer" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "In development" })).not.toBeInTheDocument();
  });

  it("opens the popover with every loaded facet as a section", () => {
    renderBar();
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));

    expect(screen.getByTestId("filter-popover")).toBeInTheDocument();
    expect(captured.dropdown.sections.map((s: any) => s.label)).toEqual([
      "Type",
      "Stage",
      "Source",
      "Goal",
      "Owner",
      "Filed by",
    ]);
  });

  it("applies a source selection made in the popover", () => {
    // Replaces the old "click the Consumer pill" test: same behaviour, one level up.
    const handlers = renderBar();
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));

    captured.dropdown.onApplyFilters({ source: [RoadmapOpportunitySource.CONSUMER] });

    expect(handlers.onSourceFilterChange).toHaveBeenCalledWith([
      RoadmapOpportunitySource.CONSUMER,
    ]);
  });

  it("does not clear a facet the popover left out of its result", () => {
    // FilterDropdown reports only the sections it was given, so a result arriving while the owner
    // options are still loading omits `owner` entirely. Four production saved views are defined
    // ENTIRELY by ownerFilter — clearing it here would look like those tabs had stopped working.
    const handlers = renderBar({ ownerFilter: ["Ajey Gore"] });
    // Reads "Filter (1)" here — the owner filter is already counted.
    fireEvent.click(screen.getByRole("button", { name: /^Filter/ }));

    captured.dropdown.onApplyFilters({ type: [RoadmapOpportunityType.BUG] });

    expect(handlers.onOwnerFilterChange).toHaveBeenCalledWith(["Ajey Gore"]);
    expect(handlers.onTypeFilterChange).toHaveBeenCalledWith([RoadmapOpportunityType.BUG]);
  });

  it("keeps what is applied on screen as a chip, and counts the groups", () => {
    // The chips are what make the popover safe: a filter narrowing the list with nothing on screen
    // to say so is how someone concludes the board is broken.
    renderBar({
      stageFilter: [RoadmapOpportunityStage.UNDER_DEVELOPMENT],
      ownerFilter: ["Ajey Gore", "Sandeep Malhotra"],
    });

    expect(screen.getByRole("button", { name: "Filter (2)" })).toBeInTheDocument();
    expect(screen.getByText("Stage:")).toBeInTheDocument();
    expect(screen.getByText("In development")).toBeInTheDocument();
    expect(screen.getByText("Ajey Gore, Sandeep Malhotra")).toBeInTheDocument();
  });

  it("clears one facet from its chip without touching the others", () => {
    const handlers = renderBar({
      stageFilter: [RoadmapOpportunityStage.RELEASED],
      ownerFilter: ["Ajey Gore"],
    });

    fireEvent.click(screen.getByRole("button", { name: "Clear Stage filter" }));

    expect(handlers.onStageFilterChange).toHaveBeenCalledWith([]);
    expect(handlers.onOwnerFilterChange).toHaveBeenCalledWith(["Ajey Gore"]);
  });

  it("clears the collapsed range filters too", () => {
    // "Clear all" that leaves a hidden date range applied is the exact confusion the count badge
    // on the range disclosure exists to prevent.
    const handlers = renderBar({
      advanced: { ...EMPTY_ADVANCED_FILTERS, dateFrom: "2026-01-01", createdBy: [7] },
    });

    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));

    expect(handlers.onAdvancedChange).toHaveBeenCalledWith(EMPTY_ADVANCED_FILTERS);
  });

  it("shows no Clear all when nothing is applied", () => {
    renderBar();
    expect(screen.queryByRole("button", { name: "Clear all" })).not.toBeInTheDocument();
  });

  it("badges the range disclosure while it is collapsed", () => {
    // A range filter is invisible when the panel is shut; the count is the only thing explaining
    // why rows are missing.
    renderBar({ advanced: { ...EMPTY_ADVANCED_FILTERS, priorityMin: "0" } });
    expect(screen.getByRole("button", { name: /Dates & score \(1\)/ })).toBeInTheDocument();
  });
});
