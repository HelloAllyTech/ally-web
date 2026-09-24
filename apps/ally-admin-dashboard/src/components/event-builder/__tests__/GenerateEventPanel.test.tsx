import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GenerateEventPanel } from "../GenerateEventPanel";

/**
 * What this pins down is the panel's contract with the catalogue, not its
 * layout: nothing is persisted until Add event, Add event is unreachable
 * without a classification, and a failed create keeps the author's work on
 * screen. Those are the three ways this panel could quietly lose someone's
 * work or litter a shared, cross-tenant event library.
 */

const mocks = vi.hoisted(() => {
  const state: { responses: Record<string, unknown> } = { responses: {} };
  const trigger = vi.fn((body: Record<string, unknown>) => ({
    abort: vi.fn(),
    unwrap: async () => ({ field: body.field, value: state.responses[String(body.field)] }),
  }));
  return { state, trigger };
});

/**
 * Neither factory spreads `importOriginal()`. `@api` and `@hooks` are barrels
 * that reach `@store`, which reads `baseAPI.reducerPath` at module load — with
 * `@api` mid-mock that is undefined and the suite fails to collect. Only the
 * three members this subtree actually touches are stubbed: the generator, and
 * the two queries behind the tag selector and the branching dropdown.
 */
vi.mock("@api", () => ({
  useGenerateEventBuilderFieldMutation: () => [mocks.trigger],
  useGetSessionEventTagsQuery: () => ({ data: { data: [] }, isLoading: false }),
  useGetDynamicBranchingInstructionQuery: () => ({ data: undefined, isLoading: false }),
}));

vi.mock("@hooks", () => ({
  useClickOutside: () => undefined,
}));

/**
 * `Button` reaches `getButtonStyles` through the `@utils` barrel, and that
 * barrel runs into this app's pre-existing `@utils` <-> `@components` cycle —
 * entering from here collects a half-initialised `@components` and the suite
 * dies on an unrelated component's constants. Only the one export Button needs
 * is stubbed; the panel's own `@utils/eventBuilderApply` import is a deep path
 * and stays real, so the draft logic under test is untouched.
 */
vi.mock("@utils", () => ({
  getButtonStyles: () => "",
}));

/**
 * The four shared widgets the panel embeds are stubbed by their own module
 * paths. They are separately owned components with their own tests, and each
 * reaches a barrel (`@utils`, `@components`) that this app already has import
 * cycles through — rendering them from here collects a half-initialised
 * `@components` rather than testing anything about this panel.
 *
 * Nothing under test is weakened: every value asserted below comes from the
 * draft the panel owns, not from these widgets.
 */
vi.mock("../../notion-table/NumberInput", () => ({
  NumberInput: ({ value }: { value: number }) => <span data-testid="score">{value}</span>,
}));
vi.mock("../../notion-table/TextAreaWithDropdown", () => ({
  TextareaWithTriggerDropdown: ({ value }: { value: string }) => <span>{value}</span>,
}));
vi.mock("../../tag-selector/SimpleTagSelector", () => ({
  SimpleTagSelector: ({ tags }: { tags: string[] }) => <span>{tags.join(", ")}</span>,
}));
vi.mock("../../emoji-picker", () => ({
  EmojiPickerComponent: ({ buttonText }: { buttonText: string }) => <span>{buttonText}</span>,
}));

const BRIEF = "The counsellor asks an open-ended question.";

const typeBrief = (text = BRIEF) => {
  const textarea = screen.getByPlaceholderText(/counsellor asks an open-ended question that/i);
  fireEvent.change(textarea, { target: { value: text } });
};

beforeEach(() => {
  mocks.trigger.mockClear();
  mocks.state.responses = {
    classifier: { name: "Open-Ended Question", className: "Open-ended question" },
    tags: ["active-listening"],
    examples: {
      positiveExamples: [{ text: "What was that like for you?" }],
      negativeExamples: [{ text: "Are you okay?" }],
    },
    feedback: { message: "You gave them room to say more", emoji: "👏", score: 5 },
    branch_instruction: "You open up a little.",
  };
});

describe("GenerateEventPanel", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <GenerateEventPanel isOpen={false} onClose={vi.fn()} onCreate={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("does not call the generator until there is a brief", () => {
    render(<GenerateEventPanel isOpen onClose={vi.fn()} onCreate={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Generate" })).toBeDisabled();
    expect(mocks.trigger).not.toHaveBeenCalled();
  });

  it("blocks Add event until there is a classification", async () => {
    // Without a className the runtime cannot evaluate the event at all — it
    // logs the miss and the event silently never fires.
    const onCreate = vi.fn();
    render(<GenerateEventPanel isOpen onClose={vi.fn()} onCreate={onCreate} />);

    expect(screen.getByRole("button", { name: "Add event" })).toBeDisabled();

    typeBrief();
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    await waitFor(
      () => expect(screen.getByRole("button", { name: "Add event" })).toBeEnabled(),
      { timeout: 4000 },
    );
  });

  it("persists nothing while generating", async () => {
    const onCreate = vi.fn();
    render(<GenerateEventPanel isOpen onClose={vi.fn()} onCreate={onCreate} />);

    typeBrief();
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Add event" })).toBeEnabled());
    // The event catalogue is global; an abandoned generation must leave no row.
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("paints generated values into editable inputs", async () => {
    render(<GenerateEventPanel isOpen onClose={vi.fn()} onCreate={vi.fn()} />);

    typeBrief();
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    await waitFor(() =>
      expect(screen.getByDisplayValue("Open-Ended Question")).toBeInTheDocument(),
    );
    // Examples are ordinary editable fields, not a read-only preview to accept.
    const example = await screen.findByDisplayValue("What was that like for you?");
    fireEvent.change(example, { target: { value: "Tell me more." } });
    expect(screen.getByDisplayValue("Tell me more.")).toBeInTheDocument();
  });

  it("submits the edited draft, not the generated one", async () => {
    const onCreate = vi.fn().mockResolvedValue(true);
    const onClose = vi.fn();
    render(<GenerateEventPanel isOpen onClose={onClose} onCreate={onCreate} />);

    typeBrief();
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Add event" })).toBeEnabled());

    fireEvent.change(await screen.findByDisplayValue("Open-ended question"), {
      target: { value: "Reflective summary" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add event" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalled());
    expect(onCreate.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        className: "Reflective summary",
        name: "Open-Ended Question",
        positiveExamples: [{ text: "What was that like for you?" }],
        negativeExamples: [{ text: "Are you okay?" }],
        score: 5,
        tags: ["active-listening"],
      }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("keeps the panel open when the create fails", async () => {
    // Closing here would discard a brief and a full review pass over something
    // the author cannot get back.
    const onCreate = vi.fn().mockResolvedValue(false);
    const onClose = vi.fn();
    render(<GenerateEventPanel isOpen onClose={onClose} onCreate={onCreate} />);

    typeBrief();
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Add event" })).toBeEnabled());

    fireEvent.click(screen.getByRole("button", { name: "Add event" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("Open-Ended Question")).toBeInTheDocument();
  });

  it("shows the caller's latency warning above the actions", () => {
    // Generation makes adding events nearly free, which is exactly what pushes
    // a scenario through the runtime's latency ceiling — so the warning belongs
    // at the moment one more is being added, not only on the step.
    const { rerender } = render(<GenerateEventPanel isOpen onClose={vi.fn()} onCreate={vi.fn()} />);
    expect(screen.queryByText(/increase response latency/i)).not.toBeInTheDocument();

    rerender(
      <GenerateEventPanel
        isOpen
        onClose={vi.fn()}
        onCreate={vi.fn()}
        latencyWarning="Heads up: 11 advanced events are selected for this simulation. Selecting more than 10 can increase response latency during a session."
      />,
    );
    expect(screen.getByText(/increase response latency/i)).toBeInTheDocument();
  });

  it("names a field that generated nothing instead of failing silently", async () => {
    mocks.state.responses.examples = { positiveExamples: [], negativeExamples: [] };
    render(<GenerateEventPanel isOpen onClose={vi.fn()} onCreate={vi.fn()} />);

    typeBrief();
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    expect(
      await screen.findByText(/nothing generated — write this one yourself/i),
    ).toBeInTheDocument();
  });

  it("forwards the simulation context so wording fits the scenario", async () => {
    render(
      <GenerateEventPanel
        isOpen
        onClose={vi.fn()}
        onCreate={vi.fn()}
        simulationContext="Supporting a caregiver after a diagnosis"
        competency="Active listening"
      />,
    );

    typeBrief();
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    await waitFor(() => expect(mocks.trigger).toHaveBeenCalled());
    expect(mocks.trigger.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        eventDescription: BRIEF,
        simulationContext: "Supporting a caregiver after a diagnosis",
        competency: "Active listening",
      }),
    );
  });
});
