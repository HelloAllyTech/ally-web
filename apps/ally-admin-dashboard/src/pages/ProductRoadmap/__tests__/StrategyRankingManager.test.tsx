import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RoadmapRankWeights } from "@types";

import { StrategyRankingManager } from "../StrategyRankingManager";

const mockUpdateWeights = vi.fn();

const weights: RoadmapRankWeights = {
  votesWeight: 3,
  votersWeight: 3,
  effortWeight: 1,
  goalImpactWeight: 3,
};

vi.mock("@api", () => ({
  useGetRoadmapStrategyGoalsQuery: () => ({
    data: { goals: [], needingAssessment: 0 },
    isLoading: false,
  }),
  useGetRoadmapRankWeightsQuery: () => ({ data: weights, isLoading: false }),
  useCreateRoadmapStrategyGoalMutation: () => [vi.fn(), { isLoading: false }],
  useRenameRoadmapStrategyGoalMutation: () => [vi.fn()],
  useDeleteRoadmapStrategyGoalMutation: () => [vi.fn()],
  useUpdateRoadmapRankWeightsMutation: () => [mockUpdateWeights],
  useAssessMissingRoadmapGoalImpactMutation: () => [vi.fn(), { isLoading: false }],
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
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

describe("StrategyRankingManager", () => {
  /**
   * The bug: commitWeight silently returned on an out-of-range value with no toast, no
   * `invalid` prop, and no reset of the displayed value — an admin typing 15 into a 0-10 box
   * saw nothing telling them the change never saved, while the share % kept the old weighting.
   */
  it("marks the weight box invalid and never calls the API when the typed value is out of range", () => {
    render(<StrategyRankingManager onClose={vi.fn()} />);

    const votesInput = screen.getByLabelText("Vote count") as HTMLInputElement;
    fireEvent.change(votesInput, { target: { value: "15" } });
    fireEvent.blur(votesInput);

    expect(mockUpdateWeights).not.toHaveBeenCalled();
    expect(screen.getByText(/enter a whole number between 0 and 10/i)).toBeInTheDocument();
    expect(votesInput).toHaveValue(15);
  });
});
