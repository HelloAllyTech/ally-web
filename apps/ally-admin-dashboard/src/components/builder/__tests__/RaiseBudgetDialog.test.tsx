import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BuilderBudgetState } from "@types";

// @constants reads off the @components barrel at module-eval time (see the
// BugHunter tests), so the barrel is stubbed rather than loaded for real.
vi.mock("@components", () => ({ cellTypes: {} }));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  ComposedModal: ({ open, children }: any) => (open ? <div>{children}</div> : null),
  ModalBody: ({ children }: any) => <div>{children}</div>,
  NumberInput: ({ label, value, onChange }: any) => (
    <input
      aria-label={label}
      value={value}
      onChange={event => onChange(undefined, { value: event.target.value })}
    />
  ),
}));

const success = vi.fn();
const error = vi.fn();
vi.mock("sonner", () => ({ toast: { success: (m: string) => success(m), error: (m: string) => error(m) } }));

const raiseBudget = vi.fn();
vi.mock("@api", () => ({
  useRaiseBuilderSessionBudgetMutation: () => [raiseBudget, { isLoading: false }],
}));

// eslint-disable-next-line import/first
import { RaiseBudgetDialog, suggestNewCeiling } from "../RaiseBudgetDialog";

const heldBudget: BuilderBudgetState = {
  budgetUsd: 15,
  spentUsd: 16.7668,
  remainingUsd: 0,
  exceeded: true,
  holdSeconds: 1200,
  pollSeconds: 15,
  hold: {
    runId: "run-3",
    heldAt: "2026-08-28T10:00:00.000Z",
    holdUntil: "2026-08-28T10:20:00.000Z",
  },
};

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  sessionId: "session-1",
  budget: heldBudget,
};

describe("suggestNewCeiling", () => {
  // The failure this guards: seeding from the old ceiling on a session that
  // has overspent hands back the exact figure that just stopped the build, and
  // the server refuses it.
  it("clears the spend, never the ceiling that was just exceeded", () => {
    expect(suggestNewCeiling(16.7668, 15)).toBeGreaterThan(16.7668);
    expect(suggestNewCeiling(16.7668, 15)).toBe(30);
  });

  it("still suggests something on a session with no ceiling and no spend", () => {
    expect(suggestNewCeiling(0, null)).toBe(10);
  });
});

describe("RaiseBudgetDialog", () => {
  beforeEach(() => {
    raiseBudget.mockReset();
    raiseBudget.mockReturnValue({ unwrap: () => Promise.resolve({ released: true }) });
    success.mockClear();
    error.mockClear();
  });

  it("says the build carries on rather than restarts, since that is the whole point", () => {
    render(<RaiseBudgetDialog {...baseProps} />);

    expect(
      screen.getByText(/picks up from there — no retry, nothing re-run/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Raise and continue" })).toBeInTheDocument();
  });

  it("shows the spend and the ceiling that stopped it", () => {
    render(<RaiseBudgetDialog {...baseProps} />);

    expect(screen.getByText("$16.77")).toBeInTheDocument();
    expect(screen.getByText("$15.00")).toBeInTheDocument();
  });

  it("submits the new ceiling and reports that a held run was released", async () => {
    render(<RaiseBudgetDialog {...baseProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Raise and continue" }));

    await vi.waitFor(() => {
      expect(raiseBudget).toHaveBeenCalledWith({ id: "session-1", budgetUsd: 30 });
      expect(success).toHaveBeenCalledWith(
        "Budget raised — the build is carrying on from where it stopped.",
      );
    });
  });

  it("does not claim the build carried on when nothing was waiting on the raise", async () => {
    raiseBudget.mockReturnValue({ unwrap: () => Promise.resolve({ released: false }) });
    render(<RaiseBudgetDialog {...baseProps} budget={{ ...heldBudget, hold: null }} />);

    fireEvent.click(screen.getByRole("button", { name: "Raise budget" }));

    await vi.waitFor(() => expect(success).toHaveBeenCalledWith("Budget raised."));
  });

  it("does not submit a zero-budget removal when the field is cleared", async () => {
    render(<RaiseBudgetDialog {...baseProps} />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Raise and continue" }));

    await new Promise(resolve => setTimeout(resolve, 0));
    expect(raiseBudget).not.toHaveBeenCalled();
  });

  it("surfaces the server's own refusal, which names the figure it wanted", async () => {
    raiseBudget.mockReturnValue({
      unwrap: () =>
        Promise.reject({ data: { message: "This session has already spent $16.77…" } }),
    });
    render(<RaiseBudgetDialog {...baseProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Raise and continue" }));

    await vi.waitFor(() =>
      expect(error).toHaveBeenCalledWith("This session has already spent $16.77…"),
    );
  });
});
