import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AddOpportunityModal } from "../AddOpportunityModal";

const mockCreate = vi.fn();

/**
 * Each trigger is created ONCE, not per call.
 *
 * The duplicate-check effect lists `checkDuplicates` in its dependency array and calls
 * `setDuplicates([])` synchronously for short descriptions. Handing it a fresh `vi.fn()` on
 * every render makes that dependency change every render, so the effect re-runs, sets state,
 * re-renders — a loop that OOMs the worker rather than failing. Real RTK Query triggers are
 * referentially stable, so the fakes must be too.
 */
const stableTriggers = {
  duplicates: vi.fn(),
  enhance: vi.fn(),
  review: vi.fn(),
};
const idle = { isLoading: false };

vi.mock("@api", () => ({
  useCreateRoadmapOpportunityMutation: () => [mockCreate, idle],
  useRoadmapAiDuplicatesMutation: () => [stableTriggers.duplicates, idle],
  useRoadmapAiEnhanceMutation: () => [stableTriggers.enhance, idle],
  useRoadmapAiReviewMutation: () => [stableTriggers.review, idle],
}));

/**
 * Stubbed for module-graph reasons, not behaviour: the real `@components` barrel reaches
 * `@constants`, whose SimulationCreator reads `cellTypes` at module-load time and throws
 * mid-cycle. Importing `@constants` first fixes that but then drags in the real `@api` and
 * the whole store, which OOMs the worker. A plain button is all these assertions need.
 */
vi.mock("@components", () => ({
  Button: ({ children, ...props }: React.ComponentProps<"button">) => (
    <button {...props}>{children}</button>
  ),
}));
vi.mock("@components/types", () => ({
  ButtonVariant: { PRIMARY: "primary", SECONDARY: "secondary", TEXT: "text" },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const goals = [
  { id: "g1", name: "Reliability & Trust" },
  { id: "g2", name: "Learner Outcomes" },
];

const renderModal = (onClose = vi.fn()) =>
  render(<AddOpportunityModal goals={goals} onClose={onClose} onOpenExisting={vi.fn()} />);

describe("AddOpportunityModal", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * The point of the whole change: a bug can no longer be filed from here. If a Type control
   * ever comes back, one of the two ways to report a bug stops landing in Bug Hunter and
   * nothing else in the app would notice.
   */
  it("offers no way to file a bug", () => {
    renderModal();

    expect(screen.queryByLabelText(/^type$/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /^bug$/i })).not.toBeInTheDocument();
  });

  it("points anyone who came here to report a bug at the button that does it", () => {
    renderModal();

    expect(screen.getByText(/report a bug/i)).toBeInTheDocument();
  });

  it("always files an idea", async () => {
    mockCreate.mockReturnValue({ unwrap: () => Promise.resolve({ id: "o1" }) });
    const onClose = vi.fn();
    renderModal(onClose);

    fireEvent.change(screen.getByLabelText(/what is the problem or idea/i), {
      target: { value: "Let coaches bulk-assign a track to a cohort" },
    });
    fireEvent.click(screen.getByRole("button", { name: /file opportunity/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    // The literal wire value, not the enum member: `@types` is another route into the
    // `@constants` barrel this file deliberately avoids, and "idea" is what the API sees.
    expect(mockCreate).toHaveBeenCalledWith({
      description: "Let coaches bulk-assign a track to a cohort",
      type: "idea",
      productGoal: "Reliability & Trust",
    });
  });
});
