import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotebookPanel } from "../NotebookPanel";

const getMemory = vi.fn();
const addEntry = vi.fn();
const retireEntry = vi.fn();

vi.mock("@api", () => ({
  // SweepPanel is imported for its repo list; its hook and the store util the
  // API index exports have to exist on the mock even though nothing calls them.
  baseAPI: { util: { invalidateTags: vi.fn() } },
  useTriggerBugHuntSweepMutation: () => [vi.fn(), { isLoading: false }],
  useGetBugHunterMemoryQuery: (...args: unknown[]) => getMemory(...args),
  useAddBugHunterMemoryMutation: () => [addEntry, { isLoading: false }],
  useRetireBugHunterMemoryMutation: () => [retireEntry, { isLoading: false }],
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("@hooks", () => ({}));
vi.mock("@components", () => ({ cellTypes: {} }));
vi.mock("@utils", () => ({
  formatDate: (d: string) => d,
  formatDateTime: (d: string) => d,
  formatTimestamp: (d: string) => d,
}));
vi.mock("@assets", () => ({ TooltipIcon: () => <svg data-testid="tooltip-icon" /> }));
vi.mock("@components/agent-avatar", () => ({ AgentAvatar: () => <span data-testid="avatar" /> }));
vi.mock("@components/action-confirmation-popup", () => ({
  ActionConfirmationPopup: ({ title, primaryButton }: any) => (
    <div>
      <p>{title}</p>
      <button onClick={primaryButton.onClick}>{primaryButton.label}</button>
    </div>
  ),
}));
vi.mock("@ally-ui-mono/ui-shared", () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  Select: ({ id, labelText, value, onChange, children }: any) => (
    <label>
      {labelText}
      <select id={id} value={value} onChange={onChange}>
        {children}
      </select>
    </label>
  ),
  SelectItem: ({ value, text }: any) => <option value={value}>{text}</option>,
  TextArea: ({ id, labelText, value, onChange, invalid, invalidText }: any) => (
    <label>
      {labelText}
      <textarea id={id} value={value} onChange={onChange} />
      {invalid && <span>{invalidText}</span>}
    </label>
  ),
  Tooltip: ({ children }: any) => <>{children}</>,
}));

const entry = (overrides: Record<string, unknown> = {}) => ({
  id: "m-1",
  body: "ally-be: the scheduler suite is flaky under 3 Jest workers; rerun before filing.",
  tags: ["flaky-test"],
  repos: ["ally-be"],
  status: "active",
  pinned: false,
  sourceCount: 3,
  timesApplied: 1,
  timesContradicted: 0,
  runId: "run-1",
  findingId: null,
  createdBy: null,
  embeddingStatus: "success",
  createdAt: "2026-09-23",
  ...overrides,
});

const renderPanel = (items: any[], canTriage = true) => {
  getMemory.mockReturnValue({ data: { items }, isLoading: false, isError: false });
  render(<NotebookPanel canTriage={canTriage} />);
};

describe("NotebookPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    addEntry.mockReturnValue({ unwrap: () => Promise.resolve(entry()) });
    retireEntry.mockReturnValue({ unwrap: () => Promise.resolve(entry({ status: "retired" })) });
  });

  it("asks for the first sweepable repo's entries by default, and lists them", () => {
    renderPanel([entry()]);
    expect(getMemory).toHaveBeenCalledWith({ repo: "ally-be", limit: 100 });
    expect(screen.getByText(/scheduler suite is flaky/)).toBeInTheDocument();
    expect(screen.getByText("seen 3×")).toBeInTheDocument();
    expect(screen.getByText("flaky-test")).toBeInTheDocument();
  });

  it("says who wrote an entry — the agent, or an admin", () => {
    renderPanel([entry(), entry({ id: "m-2", createdBy: 42, body: "by hand" })]);
    expect(screen.getByText("written by me")).toBeInTheDocument();
    expect(screen.getByText("added by an admin")).toBeInTheDocument();
  });

  it("marks a pinned entry, and shows platform-wide scope when there is no repo", () => {
    renderPanel([entry({ pinned: true, repos: null })]);
    expect(screen.getByText("Pinned")).toBeInTheDocument();
    expect(screen.getByText("every repo")).toBeInTheDocument();
  });

  it("switching repo re-queries, and the platform-wide choice drops the repo filter", () => {
    renderPanel([]);
    fireEvent.change(document.getElementById("bug-hunter-notebook-repo")!, {
      target: { value: "__all__" },
    });
    expect(getMemory).toHaveBeenLastCalledWith({ limit: 100 });
  });

  it("shows an honest empty state rather than a blank box", () => {
    renderPanel([]);
    expect(screen.getByText(/Nothing written for this scope yet/)).toBeInTheDocument();
  });

  describe("adding an entry", () => {
    it("refuses an entry over 600 characters and says by how much", () => {
      renderPanel([]);
      fireEvent.change(document.getElementById("bug-hunter-notebook-body")!, {
        target: { value: "x".repeat(601) },
      });
      expect(
        screen.getByText("601 of 600 characters — trim it to the one lesson."),
      ).toBeInTheDocument();
      expect(screen.getByText("Add to notebook")).toBeDisabled();
    });

    it("sends the trimmed body, the chosen repo, split tags and the pin", async () => {
      renderPanel([]);
      fireEvent.change(document.getElementById("bug-hunter-notebook-body")!, {
        target: { value: "  A lesson.  " },
      });
      fireEvent.change(document.getElementById("bug-hunter-notebook-scope")!, {
        target: { value: "ally-web" },
      });
      fireEvent.change(screen.getByLabelText("Tags (optional, comma-separated)"), {
        target: { value: " flaky-test, ,jest " },
      });
      fireEvent.click(screen.getByLabelText("Pin it"));
      fireEvent.click(screen.getByText("Add to notebook"));

      await waitFor(() =>
        expect(addEntry).toHaveBeenCalledWith({
          body: "A lesson.",
          repos: ["ally-web"],
          tags: ["flaky-test", "jest"],
          pinned: true,
        }),
      );
    });

    it("sends an empty repos list for a platform-wide entry", async () => {
      renderPanel([]);
      fireEvent.change(document.getElementById("bug-hunter-notebook-body")!, {
        target: { value: "everywhere" },
      });
      fireEvent.change(document.getElementById("bug-hunter-notebook-scope")!, {
        target: { value: "__all__" },
      });
      fireEvent.click(screen.getByText("Add to notebook"));
      await waitFor(() =>
        expect(addEntry).toHaveBeenCalledWith(expect.objectContaining({ repos: [] })),
      );
    });
  });

  it("retires only after confirmation", async () => {
    renderPanel([entry()]);
    fireEvent.click(screen.getByText("Retire"));
    expect(retireEntry).not.toHaveBeenCalled();
    expect(screen.getByText("Retire this entry?")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Retire it"));
    await waitFor(() => expect(retireEntry).toHaveBeenCalledWith("m-1"));
  });

  it("is read-only without the toggle: no form, no retire button, and says why", () => {
    renderPanel([entry()], false);
    expect(screen.queryByText("Add to notebook")).not.toBeInTheDocument();
    expect(screen.queryByText("Retire")).not.toBeInTheDocument();
    expect(screen.getByText(/adding and retiring needs the Bug Hunter toggle/)).toBeInTheDocument();
  });
});
