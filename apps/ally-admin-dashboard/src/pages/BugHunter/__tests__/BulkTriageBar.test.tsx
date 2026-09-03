import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const approveFinding = vi.fn();
const rejectFinding = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock("@api", () => ({
  useApproveBugFindingMutation: () => [approveFinding, { isLoading: false }],
  useRejectBugFindingMutation: () => [rejectFinding, { isLoading: false }],
  // Stubbed because `@constants` reaches back for it at module-eval time —
  // the barrel cycle this repo's CLAUDE.md warns about, met from the test side.
  baseAPI: { injectEndpoints: () => ({}), reducerPath: "api" },
}));

vi.mock("@utils", () => ({
  formatDate: (d: string) => d,
  formatDateTime: (d: string) => d,
  formatTimestamp: (d: string) => d,
  logger: { error: vi.fn() },
}));

vi.mock("@components", () => ({ cellTypes: {} }));

vi.mock("sonner", () => ({
  toast: { success: (m: string) => toastSuccess(m), error: (m: string) => toastError(m) },
}));

vi.mock("@components/action-confirmation-popup", () => ({
  // Renders `children` and honours `disabled`, both of which the real popup
  // does — a decline now puts a required reason picker inside this dialog and
  // disables the confirm until one is chosen, so a mock that dropped either
  // would let these tests pass while the real flow was broken.
  ActionConfirmationPopup: ({ title, primaryButton, children }: any) => (
    <div role="dialog" aria-label={title}>
      <p>{title}</p>
      {children}
      <button onClick={primaryButton.onClick} disabled={primaryButton.disabled}>
        {primaryButton.label}
      </button>
    </div>
  ),
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  // Renders the label so the "why is this disabled" copy is assertable.
  Tooltip: ({ label, children }: any) => (
    <span>
      <span data-testid="tooltip">{label}</span>
      {children}
    </span>
  ),
  // The picker's optional note. Bare textarea: nothing here asserts Carbon's
  // label/invalid markup, only that a note typed into it reaches the request.
  TextArea: ({ id, labelText, value, onChange, placeholder }: any) => (
    <label htmlFor={id}>
      {labelText}
      <textarea id={id} value={value} placeholder={placeholder} onChange={onChange} />
    </label>
  ),
}));

import { BugFinding, BugFindingStatus } from "@types";

import { BulkTriageBar } from "../BulkTriageBar";

/**
 * Opens the reject dialog, answers the required reason, and confirms.
 *
 * Every decline now carries a reason — the confirm button is disabled without
 * one — so a test that only clicked "Reject them" would be asserting against a
 * dialog that never submitted. Bundled into a helper because the reason itself
 * is not what any of these cases are about; they are about how a batch's
 * successes and failures get reported.
 */
const declineBatch = (label: string) => {
  fireEvent.click(screen.getByText(label));
  fireEvent.click(screen.getByLabelText("It isn't a bug"));
  fireEvent.click(screen.getByText("Reject them"));
};

const finding = (id: string, status: BugFindingStatus, title = `Bug ${id}`): BugFinding =>
  ({ id, status, title, repo: "ally-be" }) as unknown as BugFinding;

const ok = () => ({ unwrap: () => Promise.resolve({}) });
const boom = () => ({ unwrap: () => Promise.reject(new Error("403")) });

const mount = (selected: BugFinding[]) => {
  const onSettled = vi.fn();
  render(<BulkTriageBar selected={selected} onClear={vi.fn()} onSettled={onSettled} />);
  return { onSettled };
};

describe("BulkTriageBar", () => {
  beforeEach(() => vi.clearAllMocks());

  it("counts the selection, and each action's own subset of it", () => {
    mount([
      finding("a", BugFindingStatus.NEW),
      finding("b", BugFindingStatus.PENDING_APPROVAL),
      finding("c", BugFindingStatus.FIXING),
    ]);

    expect(screen.getByText("3 bugs selected")).toBeInTheDocument();
    // Approve's door is PENDING_APPROVAL only; reject also takes NEW.
    expect(screen.getByText("Approve 1")).toBeInTheDocument();
    expect(screen.getByText("Reject 2")).toBeInTheDocument();
  });

  it("says one bug rather than '1 bugs'", () => {
    mount([finding("a", BugFindingStatus.NEW)]);
    expect(screen.getByText("1 bug selected")).toBeInTheDocument();
  });

  /**
   * A bar offering "Approve 3" over three NEW findings would fire three requests
   * and fail all of them — so the button is disabled and the tooltip explains
   * the door rather than leaving the reader to guess.
   */
  it("disables an action nothing in the selection is eligible for, and says why", () => {
    mount([finding("a", BugFindingStatus.NEW), finding("b", BugFindingStatus.NEW)]);

    expect(screen.getByText("Approve 0")).toBeDisabled();
    expect(screen.getByText("Reject 2")).not.toBeDisabled();
    expect(
      screen.getByText("Approving only applies to bugs pending your approval. None of these are."),
    ).toBeInTheDocument();
  });

  it("applies the action to every eligible bug behind one confirmation", async () => {
    approveFinding.mockImplementation(ok);
    const { onSettled } = mount([
      finding("a", BugFindingStatus.PENDING_APPROVAL),
      finding("b", BugFindingStatus.PENDING_APPROVAL),
      // Not eligible, so it must not be touched.
      finding("c", BugFindingStatus.FIXING),
    ]);

    fireEvent.click(screen.getByText("Approve 2"));
    expect(screen.getByText("Approve 2 bugs for me to fix?")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Approve them"));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Approved 2 bugs."));
    expect(approveFinding).toHaveBeenCalledTimes(2);
    expect(approveFinding).toHaveBeenCalledWith("a");
    expect(approveFinding).toHaveBeenCalledWith("b");
    expect(onSettled).toHaveBeenCalledWith(["a", "b"]);
  });

  /**
   * Partial failure is the ordinary case, not the exception: a selection made
   * fifteen seconds ago can hold a bug the nightly sweep has since moved on. A
   * summary reporting only successes would leave a reader believing all of them
   * landed.
   */
  it("reports both halves when some of the batch fails, and names the failures", async () => {
    // The reject mutation now takes `{id, reason, note}`, so a per-id stub has
    // to read the id off the object rather than the argument itself.
    rejectFinding.mockImplementation(({ id }: { id: string }) => (id === "b" ? boom() : ok()));
    mount([
      finding("a", BugFindingStatus.NEW, "Terms link"),
      finding("b", BugFindingStatus.NEW, "Stale cache"),
      finding("c", BugFindingStatus.NEW, "Broken avatar"),
    ]);

    declineBatch("Reject 3");

    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith("2 done. 1 didn't go through: Stale cache."),
    );
  });

  it("counts rather than names once the failure list gets long", async () => {
    rejectFinding.mockImplementation(({ id }: { id: string }) => (id === "keep" ? ok() : boom()));
    mount([
      finding("keep", BugFindingStatus.NEW, "Survivor"),
      finding("f1", BugFindingStatus.NEW, "One"),
      finding("f2", BugFindingStatus.NEW, "Two"),
      finding("f3", BugFindingStatus.NEW, "Three"),
      finding("f4", BugFindingStatus.NEW, "Four"),
      finding("f5", BugFindingStatus.NEW, "Five"),
    ]);

    declineBatch("Reject 6");

    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith(
        "1 done. 5 didn't go through: One, Two, Three, and 2 more.",
      ),
    );
  });

  /** Nothing landed, so the reader pressed a button and the world did not change. */
  it("reports a batch where nothing landed as a failure, not as neutral news", async () => {
    rejectFinding.mockImplementation(boom);
    mount([finding("a", BugFindingStatus.NEW), finding("b", BugFindingStatus.NEW)]);

    declineBatch("Reject 2");

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("None of those went through, so nothing changed."),
    );
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("does nothing at all until the confirmation is accepted", () => {
    mount([finding("a", BugFindingStatus.NEW)]);
    fireEvent.click(screen.getByText("Reject 1"));
    expect(rejectFinding).not.toHaveBeenCalled();
  });
});
