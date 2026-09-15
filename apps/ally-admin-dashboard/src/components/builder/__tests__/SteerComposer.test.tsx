import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// @constants reads off the @components barrel at module-eval time, so the
// barrel is stubbed rather than loaded for real.
vi.mock("@components", () => ({ cellTypes: {} }));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  AutoExpandableTextarea: ({ value, onChange, placeholder, onKeyDown }: any) => (
    <textarea
      aria-label="steer"
      value={value}
      placeholder={placeholder}
      onKeyDown={onKeyDown}
      onChange={event => onChange(event.target.value)}
    />
  ),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: { success: (m: string) => toastSuccess(m), error: (m: string) => toastError(m) },
}));

const steer = vi.fn();
let steers: unknown[] = [];
vi.mock("@api", () => ({
  useGetBuilderSteersQuery: () => ({ data: steers }),
  useSteerBuilderSessionMutation: () => [steer, { isLoading: false }],
}));

import { SteerComposer } from "../SteerComposer";

/**
 * Redirecting a build instead of cancelling it.
 *
 * The property that matters most is honesty about delivery. A note reaches a
 * run at a phase boundary and "delivered" means a run put it in a prompt —
 * never that the agent complied. This is a control someone reaches for when a
 * build is already going wrong, so overpromising here is worse than promising
 * nothing.
 */
describe("SteerComposer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    steers = [];
    steer.mockReturnValue({
      unwrap: () => Promise.resolve({ id: "s1", status: "pending", delivery: "ok" }),
    });
  });

  const type = (text: string) =>
    fireEvent.change(screen.getByLabelText("steer"), { target: { value: text } });

  it("will not send an empty note", () => {
    render(<SteerComposer sessionId="s1" live />);
    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
  });

  it("will not send whitespace either", () => {
    render(<SteerComposer sessionId="s1" live />);
    type("   ");
    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
  });

  it("sends the trimmed note", async () => {
    render(<SteerComposer sessionId="s1" live />);
    type("  use the existing repository  ");
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() =>
      expect(steer).toHaveBeenCalledWith({
        id: "s1",
        note: "use the existing repository",
      }),
    );
  });

  /**
   * The server knows whether anything is running and says when the note will
   * arrive; echoing that beats the component guessing.
   */
  it("shows the server's own delivery promise", async () => {
    steer.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          id: "s1",
          status: "pending",
          delivery: "The build will read this when its current phase finishes.",
        }),
    });
    render(<SteerComposer sessionId="s1" live />);
    type("stop adding a second column");
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith(
        "The build will read this when its current phase finishes.",
      ),
    );
  });

  it("refuses a note longer than a correction", () => {
    render(<SteerComposer sessionId="s1" live />);
    type("x".repeat(2001));
    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
    expect(screen.getByText(/change to the PRD/i)).toBeInTheDocument();
  });

  it("reports a send that failed rather than clearing the box", async () => {
    steer.mockReturnValue({ unwrap: () => Promise.reject(new Error("500")) });
    render(<SteerComposer sessionId="s1" live />);
    type("keep this");
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(screen.getByLabelText("steer")).toHaveValue("keep this");
  });

  /**
   * `delivered` is not `complied`, and `superseded` is not `delivered` — the
   * whole status vocabulary exists to keep those apart for whoever sent it.
   */
  it("distinguishes read, waiting and never-read notes", () => {
    steers = [
      { id: "1", note: "first", status: "delivered", deliveredAtPhase: "gate" },
      { id: "2", note: "second", status: "pending", deliveredAtPhase: null },
      { id: "3", note: "third", status: "superseded", deliveredAtPhase: null },
    ];
    render(<SteerComposer sessionId="s1" live />);

    expect(screen.getByText(/Read at gate/)).toBeInTheDocument();
    expect(screen.getByText(/Waiting/)).toBeInTheDocument();
    expect(screen.getByText(/Never read/)).toBeInTheDocument();
  });

  it("says a note will be read by the next build when nothing is running", () => {
    render(<SteerComposer sessionId="s1" live={false} />);
    expect(screen.getByText(/next build on this session/i)).toBeInTheDocument();
  });
});
