import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AddOpportunityDrawer } from "../AddOpportunityDrawer";

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
  readiness: vi.fn(),
};
const idle = { isLoading: false };

const CRITERIA = [
  { id: "problem_not_solution", label: "Describes a problem, not a solution", hint: "hint one" },
  { id: "specific", label: "Specific enough to act on", hint: "hint two" },
];

/** Every criterion green, which is what the gate demands, plus the size the same call proposes. */
const allPass = (effort: string | null = "m") => ({
  unwrap: () =>
    Promise.resolve({
      results: CRITERIA.map(c => ({ id: c.id, passed: true, reason: "Met." })),
      effort,
      effortReason: "About a sprint.",
    }),
});

vi.mock("@api", () => ({
  useCreateRoadmapOpportunityMutation: () => [mockCreate, idle],
  useRoadmapAiDuplicatesMutation: () => [stableTriggers.duplicates, idle],
  useCheckRoadmapReadinessMutation: () => [stableTriggers.readiness, idle],
  useGetRoadmapReadinessCriteriaQuery: () => ({
    data: { criteria: CRITERIA },
    isLoading: false,
  }),
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
vi.mock("@icons", () => ({
  Close: () => null,
  FailIcon: () => null,
  Minus: () => null,
  Tick: () => null,
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

const renderDrawer = (onClose = vi.fn()) =>
  render(<AddOpportunityDrawer goals={goals} onClose={onClose} onOpenExisting={vi.fn()} />);

describe("AddOpportunityDrawer", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * The point of the whole change: a bug can no longer be filed from here. If a Type control
   * ever comes back, one of the two ways to report a bug stops landing in Bug Hunter and
   * nothing else in the app would notice.
   */
  it("offers no way to file a bug", () => {
    renderDrawer();

    expect(screen.queryByLabelText(/^type$/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /^bug$/i })).not.toBeInTheDocument();
  });

  /**
   * The bug signpost was deliberately removed: it taxed everyone filing an idea with a
   * disclaimer aimed at the few who opened the wrong form, and the page header's two buttons
   * make the choice already. Asserted absent so it does not creep back as "helpful" copy.
   */
  it("dismisses from an unlabelled-by-text close glyph", () => {
    const onClose = vi.fn();
    renderDrawer(onClose);

    fireEvent.click(screen.getByRole("button", { name: /^close$/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("asks for an opportunity without mentioning bugs", () => {
    renderDrawer();

    expect(screen.queryByText(/report a bug/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/bug hunter/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/what is the opportunity/i)).toBeInTheDocument();
  });

  /**
   * Both AI buttons are deprecated. The duplicate check is the only assist left and it has no
   * control of its own — it runs off the description as you type.
   */
  it("offers no deprecated AI buttons", () => {
    renderDrawer();

    expect(screen.queryByRole("button", { name: /^review$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /improve wording/i })).not.toBeInTheDocument();
  });

  it("shows every checklist item, pending, before the check has run", () => {
    renderDrawer();

    CRITERIA.forEach(c => expect(screen.getByText(c.label)).toBeInTheDocument());
    // Pending rows carry the criterion's hint, so the panel is useful to write against.
    expect(screen.getByText("hint one")).toBeInTheDocument();
  });

  it("keeps filing disabled until the check has run", () => {
    renderDrawer();

    fireEvent.change(screen.getByLabelText(/what is the opportunity/i), {
      target: { value: "Coaches lose an hour a week assigning tracks one learner at a time" },
    });

    expect(screen.getByRole("button", { name: /file opportunity/i })).toBeDisabled();
  });

  it("keeps filing disabled when an item comes back red, and shows why", async () => {
    stableTriggers.readiness.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          results: [
            { id: "problem_not_solution", passed: true, reason: "Met." },
            { id: "specific", passed: false, reason: "Too broad — name the moment it happens." },
          ],
        }),
    });
    renderDrawer();

    fireEvent.change(screen.getByLabelText(/what is the opportunity/i), {
      target: { value: "The admin experience is bad" },
    });
    fireEvent.click(screen.getByRole("button", { name: /check readiness/i }));

    await screen.findByText(/name the moment it happens/i);
    expect(screen.getByRole("button", { name: /file opportunity/i })).toBeDisabled();
  });

  /**
   * The gate's load-bearing half. Verdicts describe the text they judged; editing after a pass
   * must close the gate again, or the check is bypassable by passing a throwaway sentence and
   * replacing it.
   */
  it("re-closes the gate when the text changes after a pass", async () => {
    stableTriggers.readiness.mockReturnValue(allPass());
    renderDrawer();

    const field = screen.getByLabelText(/what is the opportunity/i);
    fireEvent.change(field, { target: { value: "A well-formed opportunity, checked and green" } });
    fireEvent.click(screen.getByRole("button", { name: /check readiness/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /file opportunity/i })).toBeEnabled(),
    );

    fireEvent.change(field, { target: { value: "something else entirely" } });

    expect(screen.getByRole("button", { name: /file opportunity/i })).toBeDisabled();
    expect(screen.getByText(/edited since the last check/i)).toBeInTheDocument();
  });

  it("files an idea once every item is green", async () => {
    stableTriggers.readiness.mockReturnValue(allPass());
    mockCreate.mockReturnValue({ unwrap: () => Promise.resolve({ id: "o1" }) });
    const onClose = vi.fn();
    renderDrawer(onClose);

    fireEvent.change(screen.getByLabelText(/what is the opportunity/i), {
      target: { value: "Let coaches bulk-assign a track to a cohort" },
    });
    fireEvent.click(screen.getByRole("button", { name: /check readiness/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /file opportunity/i })).toBeEnabled(),
    );

    fireEvent.click(screen.getByRole("button", { name: /file opportunity/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    // The literal wire value, not the enum member: `@types` is another route into the
    // `@constants` barrel this file deliberately avoids, and "idea" is what the API sees.
    expect(mockCreate).toHaveBeenCalledWith({
      description: "Let coaches bulk-assign a track to a cohort",
      type: "idea",
      productGoal: "Reliability & Trust",
      // The size the check proposed, carried through to the filed row.
      effort: "m",
    });
  });

  /**
   * The exemption, and the reason it exists: a re-run recomputes the size, so if correcting it
   * forced one, the correction would be overwritten and a human could never override the model.
   */
  it("keeps the gate open when only the effort is corrected", async () => {
    stableTriggers.readiness.mockReturnValue(allPass("m"));
    mockCreate.mockReturnValue({ unwrap: () => Promise.resolve({ id: "o1" }) });
    renderDrawer();

    fireEvent.change(screen.getByLabelText(/what is the opportunity/i), {
      target: { value: "A well-formed opportunity, checked and green" },
    });
    fireEvent.click(screen.getByRole("button", { name: /check readiness/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /file opportunity/i })).toBeEnabled(),
    );

    fireEvent.click(screen.getByRole("combobox", { name: /effort/i }));
    fireEvent.click(screen.getByRole("option", { name: "XL" }));

    expect(screen.getByRole("button", { name: /file opportunity/i })).toBeEnabled();
    expect(screen.queryByText(/edited since the last check/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /file opportunity/i }));
    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ effort: "xl" })),
    );
  });

  /**
   * The docblock claims verdicts are bound to both the description AND the product goal, and
   * the gate re-closes on either changing (see the tests above and below). That's only true if
   * the goal is actually sent to the grader — otherwise a goal change forcing a re-check is
   * theatre: the same description would pass identically under any goal.
   */
  it("sends the product goal to the readiness check, not just the description", async () => {
    stableTriggers.readiness.mockReturnValue(allPass());
    renderDrawer();

    fireEvent.change(screen.getByLabelText(/what is the opportunity/i), {
      target: { value: "A well-formed opportunity, checked and green" },
    });
    fireEvent.click(screen.getByRole("combobox", { name: /product goal/i }));
    fireEvent.click(screen.getByRole("option", { name: "Learner Outcomes" }));
    fireEvent.click(screen.getByRole("button", { name: /check readiness/i }));

    await waitFor(() =>
      expect(stableTriggers.readiness).toHaveBeenCalledWith({
        description: "A well-formed opportunity, checked and green",
        productGoal: "Learner Outcomes",
      }),
    );
  });

  /** The product goal is an input the reader weighed, so changing it re-closes the gate. */
  it("re-closes the gate when the product goal changes", async () => {
    stableTriggers.readiness.mockReturnValue(allPass());
    renderDrawer();

    fireEvent.change(screen.getByLabelText(/what is the opportunity/i), {
      target: { value: "A well-formed opportunity, checked and green" },
    });
    fireEvent.click(screen.getByRole("button", { name: /check readiness/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /file opportunity/i })).toBeEnabled(),
    );

    fireEvent.click(screen.getByRole("combobox", { name: /product goal/i }));
    fireEvent.click(screen.getByRole("option", { name: "Learner Outcomes" }));

    expect(screen.getByRole("button", { name: /file opportunity/i })).toBeDisabled();
    expect(screen.getByText(/edited since the last check/i)).toBeInTheDocument();
  });
});
