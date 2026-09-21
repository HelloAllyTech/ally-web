import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const takeTurn = vi.hoisted(() => vi.fn());
const createOpportunity = vi.hoisted(() => vi.fn());

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
  useRoadmapOpportunityInterviewTurnMutation: () => [
    (args: unknown) => ({ unwrap: () => takeTurn(args) }),
    { isLoading: false },
  ],
  useCreateRoadmapOpportunityMutation: () => [
    (args: unknown) => ({ unwrap: () => createOpportunity(args) }),
    { isLoading: false },
  ],
}));

import { OpportunityInterviewDrawer } from "../OpportunityInterviewDrawer";

const turn = (over: Record<string, unknown> = {}) => ({
  reply: "Who is this for?",
  gates: [
    { id: "who_it_affects", met: false, note: "No user group named yet." },
    { id: "outcome", met: false, note: "No outcome stated yet." },
  ],
  draft: null,
  readinessToken: null,
  ...over,
});

const readyTurn = turn({
  reply: "All covered — check the draft.",
  gates: [
    { id: "who_it_affects", met: true, note: "Counsellors." },
    { id: "outcome", met: true, note: "A minute saved per note." },
  ],
  draft: { description: "As a counsellor, …", productGoal: "Scribe", effort: "s" },
  readinessToken: "signed-token",
});

describe("OpportunityInterviewDrawer", () => {
  beforeEach(() => {
    takeTurn.mockReset();
    createOpportunity.mockReset();
  });

  it("opens the interview itself, with no transcript, so the agent writes the first question", async () => {
    // The alternative — a hardcoded greeting in the drawer — drifts from the prompt the moment
    // the interview's opening changes, and nobody notices because both look fine alone.
    takeTurn.mockResolvedValue(turn());
    render(<OpportunityInterviewDrawer onClose={vi.fn()} onCreated={vi.fn()} />);

    await waitFor(() => expect(takeTurn).toHaveBeenCalledWith({ messages: [] }));
    expect(await screen.findByText("Who is this for?")).toBeInTheDocument();
  });

  it("fires the opening turn exactly once", async () => {
    // React's development double-invoke would otherwise open two interviews, and the admin would
    // read two different first questions.
    takeTurn.mockResolvedValue(turn());
    render(<OpportunityInterviewDrawer onClose={vi.fn()} onCreated={vi.fn()} />);

    await waitFor(() => expect(takeTurn).toHaveBeenCalled());
    expect(takeTurn).toHaveBeenCalledTimes(1);
  });

  it("sends the whole transcript each turn, since the server keeps none of it", async () => {
    takeTurn.mockResolvedValue(turn());
    render(<OpportunityInterviewDrawer onClose={vi.fn()} onCreated={vi.fn()} />);
    await waitFor(() => expect(takeTurn).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByPlaceholderText("Type your answer…"), {
      target: { value: "Counsellors on the helpline." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() =>
      expect(takeTurn).toHaveBeenLastCalledWith({
        messages: [
          { role: "agent", content: "Who is this for?" },
          { role: "admin", content: "Counsellors on the helpline." },
        ],
      }),
    );
  });

  it("keeps the admin's words on screen when a turn fails, and retries the same transcript", async () => {
    // Re-typing an answer because the model timed out is the fastest way to lose someone.
    takeTurn.mockResolvedValueOnce(turn()).mockRejectedValueOnce(new Error("boom"));
    render(<OpportunityInterviewDrawer onClose={vi.fn()} onCreated={vi.fn()} />);
    await waitFor(() => expect(takeTurn).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByPlaceholderText("Type your answer…"), {
      target: { value: "Counsellors." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText(/did not go through/)).toBeInTheDocument();
    expect(screen.getByText("Counsellors.")).toBeInTheDocument();

    takeTurn.mockResolvedValueOnce(turn());
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() =>
      expect(takeTurn).toHaveBeenLastCalledWith({
        messages: [
          { role: "agent", content: "Who is this for?" },
          { role: "admin", content: "Counsellors." },
        ],
      }),
    );
  });

  it("shows each criterion's live verdict and how many are met", async () => {
    takeTurn.mockResolvedValue(readyTurn);
    render(<OpportunityInterviewDrawer onClose={vi.fn()} onCreated={vi.fn()} />);

    expect(await screen.findByText("2 of 2")).toBeInTheDocument();
    expect(screen.getAllByTestId("met")).toHaveLength(2);
    // The agent's note, not the static hint — mid-interview "Counsellors." is worth more.
    expect(screen.getByText("Counsellors.")).toBeInTheDocument();
  });

  it("files with the interview's own token and hands the id to the page", async () => {
    // The token is signed over this exact description, which is why the panel is read-only.
    takeTurn.mockResolvedValue(readyTurn);
    createOpportunity.mockResolvedValue({ id: "opp-1" });
    const onCreated = vi.fn();
    render(<OpportunityInterviewDrawer onClose={vi.fn()} onCreated={onCreated} />);

    fireEvent.click(await screen.findByRole("button", { name: "File and review" }));

    await waitFor(() =>
      expect(createOpportunity).toHaveBeenCalledWith({
        description: "As a counsellor, …",
        type: "idea",
        productGoal: "Scribe",
        effort: "s",
        readinessToken: "signed-token",
      }),
    );
    expect(onCreated).toHaveBeenCalledWith("opp-1");
  });

  it("asks before discarding answers, because nothing about the interview is saved", async () => {
    takeTurn.mockResolvedValue(turn());
    const onClose = vi.fn();
    render(<OpportunityInterviewDrawer onClose={onClose} onCreated={vi.fn()} />);
    await waitFor(() => expect(takeTurn).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByPlaceholderText("Type your answer…"), {
      target: { value: "Counsellors." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(takeTurn).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByLabelText("Close"));

    expect(screen.getByText("Leave this interview?")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("closes without asking when nothing has been answered", async () => {
    takeTurn.mockResolvedValue(turn());
    const onClose = vi.fn();
    render(<OpportunityInterviewDrawer onClose={onClose} onCreated={vi.fn()} />);
    await waitFor(() => expect(takeTurn).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByLabelText("Close"));

    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByText("Leave this interview?")).not.toBeInTheDocument();
  });
});
