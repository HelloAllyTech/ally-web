import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const runTurn = vi.hoisted(() => vi.fn());
const createOpportunity = vi.hoisted(() => vi.fn());
const checkDuplicates = vi.hoisted(() => vi.fn());
// One trigger for every render, as RTK Query's is: the drawer's duplicate effect depends on it,
// and a fresh function per render would re-run that effect on every render.
const duplicatesTrigger = vi.hoisted(() => (args: unknown) => ({
  unwrap: () => checkDuplicates(args),
}));

vi.mock("@icons", () => ({
  Close: () => <span>close</span>,
  Minus: () => <span data-testid="unmet">–</span>,
  Tick: () => <span data-testid="met">✓</span>,
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  SkeletonText: () => <div>loading</div>,
  TextArea: ({ id, value, onChange, onKeyDown, placeholder }: any) => (
    <textarea
      id={id}
      value={value}
      placeholder={placeholder}
      onChange={onChange}
      onKeyDown={onKeyDown}
    />
  ),
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

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// The stream itself is covered by useRoadmapCopilotStream's own tests; here `runTurn` is the
// seam, with the same contract — resolve with the turn and its lookups, or reject.
vi.mock("@hooks/useRoadmapCopilotStream", () => ({
  useRoadmapCopilotStream: () => ({ runTurn, activity: [], isThinking: false }),
}));

vi.mock("@api", () => ({
  useGetRoadmapReadinessCriteriaQuery: () => ({
    data: {
      criteria: [
        { id: "who_it_affects", label: "Names the user group it affects", hint: "" },
        { id: "outcome", label: "Says what changes for them", hint: "" },
      ],
      fileableEfforts: ["s", "m"],
    },
  }),
  useCreateRoadmapOpportunityMutation: () => [
    (args: unknown) => ({ unwrap: () => createOpportunity(args) }),
    { isLoading: false },
  ],
  useRoadmapAiDuplicatesMutation: () => [duplicatesTrigger, { isLoading: false }],
}));

import { OpportunityInterviewDrawer } from "../OpportunityInterviewDrawer";

const BRIEF = {
  strategicFit: [{ goal: "Cut time-to-first-value", why: "One less screen before practice." }],
  reach: { howMany: "~40 counsellors (analytics, 30 days)", howOften: "Every session" },
  evidence: [
    { source: "analytics", claim: "40 counsellors retyped names last month.", ref: "q: retypes" },
  ],
  successMetric: "Time from call end to saved note",
  assumptions: ["Retyping is the slow step, not finding the field."],
  alternativesDropped: ["A full CRM sync"],
  assessment: {
    rating: "promising",
    summary: "Clear and on-strategy; no baseline yet.",
    openRecommendations: ["Measure today's time-to-note."],
  },
};

const turn = (over: Record<string, unknown> = {}) => ({
  turn: {
    reply: "Who is this for?",
    gates: [
      { id: "who_it_affects", met: false, note: "No user group named yet." },
      { id: "outcome", met: false, note: "No outcome stated yet." },
    ],
    draft: null,
    readinessToken: null,
    brief: null,
    ...over,
  },
  activity: [],
});

const readyTurn = turn({
  reply: "All covered — you can file it. A baseline would make it stronger.",
  gates: [
    { id: "who_it_affects", met: true, note: "Counsellors." },
    { id: "outcome", met: true, note: "A minute saved per note." },
  ],
  draft: { description: "As a counsellor, …", productGoal: "Scribe", effort: "s" },
  readinessToken: "signed-token",
  brief: BRIEF,
});

const renderDrawer = (
  props: Partial<React.ComponentProps<typeof OpportunityInterviewDrawer>> = {},
) =>
  render(
    <OpportunityInterviewDrawer
      onClose={vi.fn()}
      onCreated={vi.fn()}
      onOpenExisting={vi.fn()}
      {...props}
    />,
  );

const answer = (text: string) => {
  fireEvent.change(screen.getByRole("textbox"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
};

describe("OpportunityInterviewDrawer", () => {
  beforeEach(() => {
    runTurn.mockReset();
    createOpportunity.mockReset();
    checkDuplicates.mockReset();
    checkDuplicates.mockResolvedValue({ matches: [] });
  });

  it("opens the conversation itself, with no transcript, so the copilot writes the first line", async () => {
    // A hardcoded greeting in the drawer would drift from the prompt the moment its opening
    // changed, and nobody would notice because both look fine alone.
    runTurn.mockResolvedValue(turn());
    renderDrawer();

    await waitFor(() => expect(runTurn).toHaveBeenCalledWith({ messages: [], brief: null }));
    expect(await screen.findByText("Who is this for?")).toBeInTheDocument();
  });

  it("fires the opening turn exactly once", async () => {
    runTurn.mockResolvedValue(turn());
    renderDrawer();

    await waitFor(() => expect(runTurn).toHaveBeenCalled());
    expect(runTurn).toHaveBeenCalledTimes(1);
  });

  it("sends the whole transcript and the last brief each turn, since the server keeps neither", async () => {
    runTurn.mockResolvedValueOnce(turn({ brief: BRIEF })).mockResolvedValueOnce(turn());
    renderDrawer();
    await waitFor(() => expect(runTurn).toHaveBeenCalledTimes(1));

    answer("Counsellors on the helpline.");

    await waitFor(() =>
      expect(runTurn).toHaveBeenLastCalledWith({
        messages: [
          { role: "agent", content: "Who is this for?" },
          { role: "admin", content: "Counsellors on the helpline." },
        ],
        brief: BRIEF,
      }),
    );
  });

  it("keeps the admin's words on screen when a turn fails, and retries the same transcript", async () => {
    runTurn
      .mockResolvedValueOnce(turn())
      .mockRejectedValueOnce(new Error("That answer did not go through."));
    renderDrawer();
    await waitFor(() => expect(runTurn).toHaveBeenCalledTimes(1));

    answer("Counsellors.");

    expect(await screen.findByText(/did not go through/)).toBeInTheDocument();
    expect(screen.getByText("Counsellors.")).toBeInTheDocument();

    runTurn.mockResolvedValueOnce(turn());
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() =>
      expect(runTurn).toHaveBeenLastCalledWith({
        messages: [
          { role: "agent", content: "Who is this for?" },
          { role: "admin", content: "Counsellors." },
        ],
        brief: null,
      }),
    );
  });

  it("shows each criterion's live verdict and how many are met", async () => {
    runTurn.mockResolvedValue(readyTurn);
    renderDrawer();

    expect(await screen.findByText("2 of 2")).toBeInTheDocument();
    expect(screen.getAllByTestId("met")).toHaveLength(2);
    expect(screen.getByText("Counsellors.")).toBeInTheDocument();
  });

  it("keeps what the copilot looked up with the answer it informed", async () => {
    runTurn.mockResolvedValue({
      ...turn({ reply: "OPP-0714 already covers this — what does it miss?" }),
      activity: [
        { id: "a", label: 'Searching the roadmap for "names"', summary: "2 related", ok: true },
        { id: "b", label: "Asking analytics: how many", summary: "Couldn't check", ok: false },
      ],
    });
    renderDrawer();

    expect(await screen.findByText("Looked at 2 things")).toBeInTheDocument();
    expect(screen.getByText('Searching the roadmap for "names"')).toBeInTheDocument();
  });

  it("shows the case so far: the copilot's assessment and what would make it stronger", async () => {
    runTurn.mockResolvedValue(readyTurn);
    renderDrawer();

    expect(await screen.findByText("Promising")).toBeInTheDocument();
    expect(screen.getByText("Ways to make it stronger")).toBeInTheDocument();
    expect(screen.getByText("Measure today's time-to-note.")).toBeInTheDocument();
    expect(screen.getByText("Cut time-to-first-value")).toBeInTheDocument();
  });

  /**
   * The copilot advises; it does not block. Once the five are met the draft is fileable whatever
   * the copilot rates it — and the conversation stays open, because it keeps suggesting.
   */
  it("lets the admin file a draft the copilot does not yet rate strong, or keep talking", async () => {
    runTurn.mockResolvedValue(readyTurn);
    renderDrawer();

    expect(await screen.findByRole("button", { name: "File and review" })).toBeEnabled();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByText(/Ready to file/)).toBeInTheDocument();
  });

  it("files with the copilot's own token and brief, and hands the id to the page", async () => {
    // Both are signed together, which is why neither is editable here.
    runTurn.mockResolvedValue(readyTurn);
    createOpportunity.mockResolvedValue({ id: "opp-1" });
    const onCreated = vi.fn();
    renderDrawer({ onCreated });

    fireEvent.click(await screen.findByRole("button", { name: "File and review" }));

    await waitFor(() =>
      expect(createOpportunity).toHaveBeenCalledWith({
        description: "As a counsellor, …",
        type: "idea",
        productGoal: "Scribe",
        effort: "s",
        readinessToken: "signed-token",
        brief: BRIEF,
        interviewTranscript: [
          {
            role: "agent",
            content: "All covered — you can file it. A baseline would make it stronger.",
          },
        ],
      }),
    );
    expect(onCreated).toHaveBeenCalledWith("opp-1");
  });

  /**
   * The conversation goes with the draft, so the Builder session opened from the opportunity
   * starts from what was decided here. A session handed only the description re-asked the
   * filer questions they had already answered.
   */
  it("files the whole conversation, in order, without the research trail", async () => {
    runTurn.mockResolvedValueOnce(turn()).mockResolvedValueOnce({
      ...readyTurn,
      activity: [{ id: "a1", label: "Searched the board", summary: "3 hits", ok: true }],
    });
    createOpportunity.mockResolvedValue({ id: "opp-1" });
    renderDrawer();
    await waitFor(() => expect(runTurn).toHaveBeenCalledTimes(1));

    answer("Counsellors writing notes.");
    fireEvent.click(await screen.findByRole("button", { name: "File and review" }));

    await waitFor(() => expect(createOpportunity).toHaveBeenCalled());
    expect(createOpportunity.mock.calls[0][0].interviewTranscript).toEqual([
      { role: "agent", content: "Who is this for?" },
      { role: "admin", content: "Counsellors writing notes." },
      {
        role: "agent",
        content: "All covered — you can file it. A baseline would make it stronger.",
      },
    ]);
  });

  it("files without a brief when the copilot produced none", async () => {
    runTurn.mockResolvedValue(turn({ ...readyTurn.turn, brief: null }));
    createOpportunity.mockResolvedValue({ id: "opp-1" });
    renderDrawer();

    fireEvent.click(await screen.findByRole("button", { name: "File and review" }));

    await waitFor(() => expect(createOpportunity).toHaveBeenCalled());
    expect(createOpportunity.mock.calls[0][0]).not.toHaveProperty("brief");
  });

  it("checks the draft for duplicates, and not the answers that led to it", async () => {
    runTurn.mockResolvedValueOnce(turn()).mockResolvedValueOnce(readyTurn);
    renderDrawer();
    await waitFor(() => expect(runTurn).toHaveBeenCalledTimes(1));
    expect(checkDuplicates).not.toHaveBeenCalled();

    answer("Counsellors.");

    await waitFor(() =>
      expect(checkDuplicates).toHaveBeenCalledWith({
        description: "As a counsellor, …",
        productGoal: "Scribe",
      }),
    );
    expect(checkDuplicates).toHaveBeenCalledTimes(1);
  });

  it("offers an existing match to upvote instead of filing a second copy", async () => {
    runTurn.mockResolvedValue(readyTurn);
    checkDuplicates.mockResolvedValue({
      matches: [
        {
          id: "opp-9",
          description: "Faster note-taking for counsellors",
          productGoal: "Scribe",
          stage: "new",
          reason: "Same user group and outcome.",
          similarity: 0.9,
        },
      ],
    });
    const onOpenExisting = vi.fn();
    renderDrawer({ onOpenExisting });

    expect(await screen.findByText("This may already exist")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Upvote this instead →" }));
    expect(onOpenExisting).toHaveBeenCalledWith("opp-9");
    expect(createOpportunity).not.toHaveBeenCalled();
  });

  it("still files when the duplicate check fails", async () => {
    runTurn.mockResolvedValue(readyTurn);
    checkDuplicates.mockRejectedValue(new Error("ally-ai down"));
    createOpportunity.mockResolvedValue({ id: "opp-1" });
    const onCreated = vi.fn();
    renderDrawer({ onCreated });

    await waitFor(() => expect(checkDuplicates).toHaveBeenCalled());
    expect(screen.queryByText("This may already exist")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "File and review" }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith("opp-1"));
  });

  it('is titled plainly "New opportunity" — it is the only way to file one', async () => {
    runTurn.mockResolvedValue(turn());
    renderDrawer();

    expect(screen.getByRole("heading", { name: "New opportunity" })).toBeInTheDocument();
    await waitFor(() => expect(runTurn).toHaveBeenCalled());
  });

  it("asks before discarding answers, because nothing about the conversation is saved", async () => {
    runTurn.mockResolvedValue(turn());
    const onClose = vi.fn();
    renderDrawer({ onClose });
    await waitFor(() => expect(runTurn).toHaveBeenCalledTimes(1));

    answer("Counsellors.");
    await waitFor(() => expect(runTurn).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByLabelText("Close"));
    expect(screen.getByText("Leave this conversation?")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("closes without asking when nothing has been answered", async () => {
    runTurn.mockResolvedValue(turn());
    const onClose = vi.fn();
    renderDrawer({ onClose });
    await waitFor(() => expect(runTurn).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByLabelText("Close"));

    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByText("Leave this conversation?")).not.toBeInTheDocument();
  });
});
