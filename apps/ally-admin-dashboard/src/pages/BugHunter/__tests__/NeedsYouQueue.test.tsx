import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const approve = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));
const reject = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));
const answer = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));

vi.mock("@api", () => ({
  useApproveBugFindingMutation: () => [approve, { isLoading: false }],
  useRejectBugFindingMutation: () => [reject, { isLoading: false }],
  useAnswerBugFindingMutation: () => [answer, { isLoading: false }],
}));

// See BugFindingsTable's note: @constants reads `cellTypes` off this barrel at
// module-eval time. The avatar is imported by its own path and stays real.
vi.mock("@components", () => ({ cellTypes: {} }));

vi.mock("@components/action-confirmation-popup", () => ({
  ActionConfirmationPopup: ({ isOpen, title, primaryButton, secondaryButton }: any) =>
    isOpen ? (
      <div data-testid="confirm-popup">
        <p>{title}</p>
        <button onClick={primaryButton.onClick}>{primaryButton.label}</button>
        <button onClick={secondaryButton.onClick}>{secondaryButton.label}</button>
      </div>
    ) : null,
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  TextArea: ({ id, labelText, value, onChange, placeholder }: any) => (
    <textarea
      id={id}
      aria-label={labelText}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  ),
}));

import { BugFinding, BugFindingSource, BugFindingStatus } from "@types";

import { NeedsYouQueue } from "../NeedsYouQueue";

const finding = (overrides: Partial<BugFinding> & { id: string }): BugFinding =>
  ({
    runId: null,
    repo: "ally-be",
    source: BugFindingSource.CODE_REVIEW,
    title: `Bug ${overrides.id}`,
    description: "…",
    file: null,
    evidence: null,
    severity: null,
    proven: false,
    touchesGuardedPath: false,
    reportedBugId: null,
    status: BugFindingStatus.PENDING_APPROVAL,
    prUrl: null,
    escalationQuestion: null,
    createdAt: "2026-08-17T00:00:00.000Z",
    updatedAt: "2026-08-17T00:00:00.000Z",
    ...overrides,
  }) as unknown as BugFinding;

/**
 * The queue exists because the old tab could state "4 bugs are waiting on your
 * call" in three places and offer no way to act on any of them. These tests are
 * mostly about that: the decision has to be reachable from here.
 */
describe("NeedsYouQueue", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders nothing at all when nothing is blocked", () => {
    const { container } = render(
      <NeedsYouQueue
        findings={[
          finding({ id: "a", status: BugFindingStatus.FIXING }),
          finding({ id: "b", status: BugFindingStatus.RELEASED }),
        ]}
        onOpen={vi.fn()}
      />,
    );

    // Not an empty state with a heading over it: a section that says "nothing"
    // trains a reader to skip the region where the urgent thing later appears.
    expect(container).toBeEmptyDOMElement();
  });

  it("shows only the bugs whose next move is a human's", () => {
    render(
      <NeedsYouQueue
        findings={[
          finding({ id: "waiting", status: BugFindingStatus.PENDING_APPROVAL }),
          finding({ id: "red", status: BugFindingStatus.FAILED }),
          finding({ id: "busy", status: BugFindingStatus.FIXING }),
          finding({ id: "blocked-on-itself", status: BugFindingStatus.BLOCKED }),
        ]}
        onOpen={vi.fn()}
      />,
    );

    expect(screen.getByText("Bug waiting")).toBeInTheDocument();
    expect(screen.getByText("Bug red")).toBeInTheDocument();
    expect(screen.queryByText("Bug busy")).not.toBeInTheDocument();
    // BLOCKED waits on an earlier repo in its own plan, not on a person.
    expect(screen.queryByText("Bug blocked-on-itself")).not.toBeInTheDocument();
  });

  it("approves from the card, behind the same confirmation the drawer uses", async () => {
    render(<NeedsYouQueue findings={[finding({ id: "a" })]} onOpen={vi.fn()} />);

    fireEvent.click(screen.getByText("Approve — go fix it"));
    // The guard stays. What this removes is the scroll, the row-hunt and the
    // drawer open that used to come before it — not the confirmation.
    expect(screen.getByTestId("confirm-popup")).toHaveTextContent(
      "Approve this bug for me to fix?",
    );
    expect(approve).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Confirm"));
    await waitFor(() => expect(approve).toHaveBeenCalledWith("a"));
  });

  it("cancelling a rejection changes nothing", () => {
    render(<NeedsYouQueue findings={[finding({ id: "a" })]} onOpen={vi.fn()} />);

    fireEvent.click(screen.getByText("Reject"));
    fireEvent.click(screen.getByText("Cancel"));

    expect(screen.queryByTestId("confirm-popup")).not.toBeInTheDocument();
    expect(reject).not.toHaveBeenCalled();
  });

  it("puts the question it is actually asking on the card, and answers it in place", async () => {
    render(
      <NeedsYouQueue
        findings={[
          finding({
            id: "a",
            status: BugFindingStatus.NEEDS_INPUT,
            escalationQuestion: "Should the retry back off, or fail fast?",
          }),
        ]}
        onOpen={vi.fn()}
      />,
    );

    // Reading the question is the whole task. Routing to a drawer to find out
    // what was even asked is what made "Needs input" easy to ignore.
    expect(screen.getByText("Should the retry back off, or fail fast?")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Answer"));
    fireEvent.change(screen.getByLabelText("Your answer"), {
      target: { value: "Back off, three tries." },
    });
    fireEvent.click(screen.getByText("Send answer"));

    await waitFor(() =>
      expect(answer).toHaveBeenCalledWith({ id: "a", answer: "Back off, three tries." }),
    );
  });

  it("will not send an empty answer", () => {
    render(
      <NeedsYouQueue
        findings={[
          finding({ id: "a", status: BugFindingStatus.NEEDS_INPUT, escalationQuestion: "Which?" }),
        ]}
        onOpen={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("Answer"));
    fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: "   " } });
    expect(screen.getByText("Send answer")).toBeDisabled();
  });

  it("sends a red job to the drawer rather than offering a one-click retry", () => {
    const onOpen = vi.fn();
    render(
      <NeedsYouQueue
        findings={[finding({ id: "a", status: BugFindingStatus.RELEASE_FAILED })]}
        onOpen={onOpen}
      />,
    );

    // Retrying a release deploys to production, and the facts that make it safe
    // (release target, blocked reason, which tag went red) only exist on the
    // detail record. A button here would have its consequences off-screen.
    expect(screen.queryByText("Retry release")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("See what happened"));
    expect(onOpen).toHaveBeenCalledWith("a");
  });

  it("collapses past three but always states the real total", () => {
    const findings = Array.from({ length: 5 }, (_, i) => finding({ id: `f-${i}` }));
    render(<NeedsYouQueue findings={findings} onOpen={vi.fn()} />);

    expect(screen.getAllByText(/^Bug f-/)).toHaveLength(3);
    // The collapse must never hide the size of the problem.
    expect(screen.getByText(/5 waiting on your call/)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Show 2 more"));
    expect(screen.getAllByText(/^Bug f-/)).toHaveLength(5);
  });

  it("says 'decide it' rather than 'decide them' for a single bug", () => {
    render(<NeedsYouQueue findings={[finding({ id: "a" })]} onOpen={vi.fn()} />);
    expect(
      screen.getByText("1 waiting on your call. Decide it and I'll carry on."),
    ).toBeInTheDocument();
  });

  /**
   * The header sentence directly above this queue counts only PENDING_APPROVAL
   * and NEEDS_INPUT. A single total here printed a different number for the same
   * page — "3 bugs are waiting on your call" over "I've stopped on 5 bugs" — and
   * two numbers twelve pixels apart read as a defect rather than a distinction.
   */
  it("counts the two kinds separately so it reconciles with the header sentence", () => {
    render(
      <NeedsYouQueue
        findings={[
          finding({ id: "a", status: BugFindingStatus.PENDING_APPROVAL }),
          finding({ id: "b", status: BugFindingStatus.NEEDS_INPUT }),
          finding({ id: "c", status: BugFindingStatus.FAILED }),
          finding({ id: "d", status: BugFindingStatus.RELEASE_FAILED }),
        ]}
        onOpen={vi.fn()}
      />,
    );

    expect(
      screen.getByText("2 waiting on your call, 2 went red. Decide them and I'll carry on."),
    ).toBeInTheDocument();
  });
});
