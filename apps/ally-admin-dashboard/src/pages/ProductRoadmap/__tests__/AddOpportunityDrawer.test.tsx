import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  referenceImageUpload: vi.fn(),
};

/**
 * The checklist query's answer, swappable per test. A box rather than a `vi.fn`: the factory
 * below is hoisted above every `const`, so it may only READ this lazily — and the component
 * re-renders several times per test, which a `mockReturnValueOnce` would not survive.
 */
const criteriaResult: { current: unknown } = { current: null };
const idle = { isLoading: false };

const CRITERIA = [
  { id: "pain_or_gain", label: "Names a real pain or a real gain", hint: "hint one" },
  { id: "specific", label: "Narrow enough to act on", hint: "hint two" },
];

/** The server owns the size threshold too; the drawer must not hold its own copy. */
const FILEABLE = ["s", "m"];

/**
 * Every criterion green AND a fileable size, which is what the gate demands. `redraft` is null
 * here for the same reason the server sends null: there is nothing to fix.
 */
const allPass = (effort: string | null = "m") => ({
  unwrap: () =>
    Promise.resolve({
      results: CRITERIA.map(c => ({ id: c.id, passed: true, reason: "Met." })),
      effort,
      effortReason: "About a sprint.",
      redraft: null,
    }),
});

vi.mock("@api", () => ({
  useCreateRoadmapOpportunityMutation: () => [mockCreate, idle],
  useRoadmapAiDuplicatesMutation: () => [stableTriggers.duplicates, idle],
  useCheckRoadmapReadinessMutation: () => [stableTriggers.readiness, idle],
  useGetRoadmapReadinessCriteriaQuery: () => criteriaResult.current,
  useGetRoadmapReferenceImageUploadUrlMutation: () => [stableTriggers.referenceImageUpload, idle],
  useGetRoadmapEligibleOwnersQuery: () => ({
    data: [
      { id: 7, name: "Ada Admin", email: "ada@helloally.ai" },
      { id: 9, name: "", email: "pat@helloally.ai" },
    ],
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
  TooltipIcon: () => null,
  UploadImage: () => null,
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

/**
 * `canManage` defaults to FALSE — the tier most people filing are on. Every assertion about
 * the payload therefore describes what a plain filer sends, and the owner field has to be
 * asked for explicitly to appear at all.
 */
const renderDrawer = (onClose = vi.fn(), canManage = false) =>
  render(
    <AddOpportunityDrawer
      goals={goals}
      canManage={canManage}
      onClose={onClose}
      onOpenExisting={vi.fn()}
    />,
  );

/** Green checklist, description typed, gate open — the shared preamble of the owner tests. */
const fileableDraft = async (text: string) => {
  fireEvent.change(screen.getByLabelText(/what is the opportunity/i), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole("button", { name: /check readiness/i }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: /file opportunity/i })).toBeEnabled(),
  );
};

describe("AddOpportunityDrawer", () => {
  beforeEach(() => {
    criteriaResult.current = {
      data: { criteria: CRITERIA, fileableEfforts: FILEABLE },
      isLoading: false,
    };
  });

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
            { id: "pain_or_gain", passed: true, reason: "Met." },
            { id: "specific", passed: false, reason: "Too broad — name the moment it happens." },
          ],
          effort: "m",
          effortReason: "About a sprint.",
          redraft: null,
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
      // Always sent, empty or not — see the note on the create call.
      referenceImages: [],
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
    fireEvent.click(screen.getByRole("option", { name: "S" }));

    expect(screen.getByRole("button", { name: /file opportunity/i })).toBeEnabled();
    expect(screen.queryByText(/edited since the last check/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /file opportunity/i }));
    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ effort: "s" })),
    );
  });

  /**
   * The size gate. An L or larger is a SET of opportunities, and filing one puts something on
   * the board no single slice of work can finish — so every criterion being green is no longer
   * enough on its own.
   */
  it("blocks filing when the draft is sized above what may be filed", async () => {
    stableTriggers.readiness.mockReturnValue(allPass("xl"));
    renderDrawer();

    fireEvent.change(screen.getByLabelText(/what is the opportunity/i), {
      target: { value: "Rebuild the whole learner experience" },
    });
    fireEvent.click(screen.getByRole("button", { name: /check readiness/i }));

    await screen.findByText(/a set of opportunities rather than one/i);
    expect(screen.getByRole("button", { name: /file opportunity/i })).toBeDisabled();
  });

  /**
   * The size row reads the CURRENT effort, not the checked one, so the filer who knows the
   * model sized it wrong can answer the row directly. Without this the gate is unanswerable,
   * and an unanswerable gate gets routed around by writing vaguer drafts.
   */
  it("opens the gate when the size is corrected down to a fileable one", async () => {
    stableTriggers.readiness.mockReturnValue(allPass("l"));
    renderDrawer();

    fireEvent.change(screen.getByLabelText(/what is the opportunity/i), {
      target: { value: "A well-formed opportunity the model over-sized" },
    });
    fireEvent.click(screen.getByRole("button", { name: /check readiness/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /file opportunity/i })).toBeDisabled(),
    );

    fireEvent.click(screen.getByRole("combobox", { name: /effort/i }));
    fireEvent.click(screen.getByRole("option", { name: "M" }));

    expect(screen.getByRole("button", { name: /file opportunity/i })).toBeEnabled();
  });

  /**
   * Deploy skew: this bundle can reach a server that does not serve `fileableEfforts` yet. The
   * size row is hidden then, and a HIDDEN rule that disables filing outright is worse than not
   * checking the size at all — so the gate falls back to the five criteria rather than to "no".
   */
  it("does not gate on size when the server declares no threshold", async () => {
    criteriaResult.current = { data: { criteria: CRITERIA }, isLoading: false };
    stableTriggers.readiness.mockReturnValue(allPass("xxl"));
    renderDrawer();

    fireEvent.change(screen.getByLabelText(/what is the opportunity/i), {
      target: { value: "A well-formed opportunity, checked and green" },
    });
    fireEvent.click(screen.getByRole("button", { name: /check readiness/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /file opportunity/i })).toBeEnabled(),
    );
    expect(screen.queryByText(/small enough to ship/i)).not.toBeInTheDocument();
  });

  /** "Not sized" is a fail, not a shrug: it is exactly the state a vague draft lands in. */
  it("blocks filing when the check could not size the draft", async () => {
    stableTriggers.readiness.mockReturnValue(allPass(null));
    renderDrawer();

    fireEvent.change(screen.getByLabelText(/what is the opportunity/i), {
      target: { value: "Make the product better somehow" },
    });
    fireEvent.click(screen.getByRole("button", { name: /check readiness/i }));

    await screen.findByText(/not sized/i);
    expect(screen.getByRole("button", { name: /file opportunity/i })).toBeDisabled();
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

  /**
   * The redraft's whole safety property: it is a PROPOSAL. The old "Improve wording" button
   * rewrote in place and silently replaced the filer's own words — which are what everyone
   * voting on the card later reads. If this ever lands in the field without a click, that
   * regression is back and nothing else in the app would notice.
   */
  it("shows the proposed rewrite without touching the draft, until it is accepted", async () => {
    stableTriggers.readiness.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          results: [
            { id: "pain_or_gain", passed: false, reason: "No benefit stated." },
            { id: "specific", passed: true, reason: "Met." },
          ],
          effort: "m",
          effortReason: "About a sprint.",
          redraft: "As a counsellor, [what is the pain?] — so that [what changes?].",
        }),
    });
    renderDrawer();

    const field = screen.getByLabelText(/what is the opportunity/i);
    fireEvent.change(field, { target: { value: "Add a dashboard" } });
    fireEvent.click(screen.getByRole("button", { name: /check readiness/i }));

    await screen.findByText(/suggested rewrite/i);
    expect(field).toHaveValue("Add a dashboard");

    fireEvent.click(screen.getByRole("button", { name: /use this draft/i }));

    expect(field).toHaveValue("As a counsellor, [what is the pain?] — so that [what changes?].");
    // Accepting is an edit like any other: the verdicts described the OLD text, so the gate
    // re-closes and the accepted wording is graded on its own merits before it can be filed.
    expect(screen.getByRole("button", { name: /file opportunity/i })).toBeDisabled();
    expect(screen.getByText(/edited since the last check/i)).toBeInTheDocument();
  });

  /** Offering a rewrite of a draft that already passed trains people to replace good words. */
  it("offers no rewrite when the draft is ready", async () => {
    stableTriggers.readiness.mockReturnValue(allPass());
    renderDrawer();

    fireEvent.change(screen.getByLabelText(/what is the opportunity/i), {
      target: { value: "A well-formed opportunity, checked and green" },
    });
    fireEvent.click(screen.getByRole("button", { name: /check readiness/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /file opportunity/i })).toBeEnabled(),
    );
    expect(screen.queryByText(/suggested rewrite/i)).not.toBeInTheDocument();
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

  // ── the owner picker ────────────────────────────────────────────────────────

  /**
   * Filing sits on the vote tier and assigning does not, so most people who open this drawer
   * must not see the control at all — hidden, not disabled. The backend refuses the field from
   * them too (403), so this is the visible half of one rule rather than the whole of it.
   */
  it("hides the owner picker from a filer who cannot manage the roadmap", () => {
    renderDrawer();

    expect(screen.queryByRole("combobox", { name: /owner/i })).not.toBeInTheDocument();
  });

  it("offers the owner picker to a manager, unassigned to begin with", () => {
    renderDrawer(vi.fn(), true);

    expect(screen.getByRole("combobox", { name: /owner/i })).toHaveTextContent(/unassigned/i);
  });

  it("files with the picked owner", async () => {
    stableTriggers.readiness.mockReturnValue(allPass());
    mockCreate.mockReturnValue({ unwrap: () => Promise.resolve({ id: "o1" }) });
    renderDrawer(vi.fn(), true);

    await fileableDraft("Let coaches bulk-assign a track to a cohort");

    fireEvent.click(screen.getByRole("combobox", { name: /owner/i }));
    fireEvent.click(screen.getByRole("option", { name: "Ada Admin" }));
    // Picking an owner is not one of the inputs the check read, so it must not re-close the
    // gate — see the effort exemption for the same reasoning.
    expect(screen.getByRole("button", { name: /file opportunity/i })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: /file opportunity/i }));

    await waitFor(() =>
      // A number, not the string the dropdown carries: the API takes an Ally user id.
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ ownerUserId: 7 })),
    );
  });

  /**
   * Unassigned is a normal way to file — triage is what the board is for — so a manager who
   * leaves it alone files an unowned row rather than being nudged into naming someone.
   */
  it("files unassigned when a manager leaves the owner alone", async () => {
    stableTriggers.readiness.mockReturnValue(allPass());
    mockCreate.mockReturnValue({ unwrap: () => Promise.resolve({ id: "o1" }) });
    renderDrawer(vi.fn(), true);

    await fileableDraft("Let coaches bulk-assign a track to a cohort");
    fireEvent.click(screen.getByRole("button", { name: /file opportunity/i }));

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ ownerUserId: null })),
    );
  });

  /** An account with no display name still has to be pickable by something. */
  it("falls back to the email when an eligible owner has no name", () => {
    renderDrawer(vi.fn(), true);

    fireEvent.click(screen.getByRole("combobox", { name: /owner/i }));

    expect(screen.getByRole("option", { name: "pat@helloally.ai" })).toBeInTheDocument();
  });
});
