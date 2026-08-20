import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getBugFindings = vi.fn();
const approveFinding = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));
const rejectFinding = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));
const startFixSession = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));
const toastError = vi.fn();

vi.mock("@api", () => ({
  useGetBugFindingsQuery: (...args: unknown[]) => getBugFindings(...args),
  useApproveBugFindingMutation: () => [approveFinding, { isLoading: false }],
  useRejectBugFindingMutation: () => [rejectFinding, { isLoading: false }],
  useStartBugFixSessionMutation: () => [startFixSession, { isLoading: false }],
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: (m: string) => toastError(m) } }));

vi.mock("@utils", () => ({ formatDate: (d: string) => d, logger: { error: vi.fn() } }));

vi.mock("@components", () => ({
  cellTypes: {},
  EmptyState: ({ title }: any) => <div data-testid="empty-state">{title}</div>,
}));

vi.mock("@components/error-boundary", () => ({
  ErrorBoundary: ({ children }: any) => <>{children}</>,
}));

vi.mock("@components/action-confirmation-popup", () => ({
  ActionConfirmationPopup: ({ title, primaryButton }: any) => (
    <div role="dialog" aria-label={title}>
      <p>{title}</p>
      <button onClick={primaryButton.onClick}>{primaryButton.label}</button>
    </div>
  ),
}));

vi.mock("../BugFindingDrawer", () => ({
  BugFindingDrawer: ({ id }: { id: string }) => <div data-testid="drawer">{id}</div>,
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Search: ({ id, labelText, value, onChange, placeholder }: any) => (
    <input
      id={id}
      aria-label={labelText}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  ),
  Select: ({ id, children, value, onChange, labelText }: any) => (
    <select id={id} aria-label={labelText} value={value} onChange={onChange}>
      {children}
    </select>
  ),
  SelectItem: ({ value, text }: any) => <option value={value}>{text}</option>,
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  Tooltip: ({ children }: any) => <>{children}</>,
  Table: ({ children }: any) => <table>{children}</table>,
  TableHead: ({ children }: any) => <thead>{children}</thead>,
  TableHeader: ({ children, ...rest }: any) => <th {...rest}>{children}</th>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableRow: ({ children, ...rest }: any) => <tr {...rest}>{children}</tr>,
  TableCell: ({ children, ...rest }: any) => <td {...rest}>{children}</td>,
}));

vi.mock("framer-motion", () => ({
  motion: { span: ({ children, ...props }: any) => <span {...props}>{children}</span> },
  useReducedMotion: () => false,
}));

import { BugFinding, BugFindingSource, BugFindingStatus } from "@types";

import { BugFindingsTable } from "../BugFindingsTable";

const finding = (overrides: Partial<BugFinding> & { id: string }): BugFinding =>
  ({
    runId: null,
    repo: "ally-be",
    source: BugFindingSource.CODE_REVIEW,
    title: `Bug ${overrides.id}`,
    description: "",
    originalDescription: null,
    file: null,
    evidence: null,
    severity: null,
    proven: true,
    touchesGuardedPath: false,
    reportedBugId: null,
    status: BugFindingStatus.NEW,
    prUrl: null,
    createdAt: "2026-08-17T00:00:00.000Z",
    updatedAt: "2026-08-17T00:00:00.000Z",
    ...overrides,
  }) as unknown as BugFinding;

const onShowShortcuts = vi.fn();

const mount = (items: BugFinding[], url = "/") => {
  getBugFindings.mockReturnValue({
    data: { items, count: items.length },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
  return render(
    <MemoryRouter initialEntries={[url]}>
      <BugFindingsTable onShowShortcuts={onShowShortcuts} />
    </MemoryRouter>,
  );
};

const press = (key: string, init: Partial<KeyboardEventInit> = {}) =>
  fireEvent.keyDown(document, { key, ...init });

const focusedLabel = () => document.activeElement?.getAttribute("aria-label");

/**
 * The keyboard is what removes the drawer from the triage loop, so these tests
 * cover the two things that would make it worse than nothing: a cursor that
 * lands on the wrong bug, and a shortcut that fires while somebody is typing.
 */
describe("BugFindingsTable — keyboard triage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("moves a real focus cursor down and up the rows", () => {
    mount([finding({ id: "a" }), finding({ id: "b" }), finding({ id: "c" })]);

    press("j");
    expect(focusedLabel()).toBe("Open bug: Bug a");
    press("j");
    expect(focusedLabel()).toBe("Open bug: Bug b");
    press("k");
    expect(focusedLabel()).toBe("Open bug: Bug a");
  });

  it("accepts the arrow keys as well as j and k", () => {
    mount([finding({ id: "a" }), finding({ id: "b" })]);
    press("ArrowDown");
    press("ArrowDown");
    expect(focusedLabel()).toBe("Open bug: Bug b");
    press("ArrowUp");
    expect(focusedLabel()).toBe("Open bug: Bug a");
  });

  /** From nothing, j starts at the top and k at the bottom rather than both at row one. */
  it("enters the list from whichever end you came at it from", () => {
    mount([finding({ id: "a" }), finding({ id: "b" }), finding({ id: "c" })]);
    press("k");
    expect(focusedLabel()).toBe("Open bug: Bug c");
  });

  it("stops at the ends rather than wrapping round", () => {
    mount([finding({ id: "a" }), finding({ id: "b" })]);
    press("j");
    press("j");
    press("j");
    expect(focusedLabel()).toBe("Open bug: Bug b");
    press("k");
    press("k");
    press("k");
    expect(focusedLabel()).toBe("Open bug: Bug a");
  });

  it("opens the bug under the cursor with o", () => {
    mount([finding({ id: "a" }), finding({ id: "b" })]);
    press("j");
    press("j");
    press("o");
    expect(screen.getByTestId("drawer")).toHaveTextContent("b");
  });

  /**
   * The cursor follows its bug rather than its row index. Re-sorting with an
   * index-keyed cursor would leave `a` and `r` aimed at whatever slid into that
   * slot — which is the one way this feature could do real damage.
   */
  it("keeps the cursor on the same bug when the table is re-sorted underneath it", () => {
    mount([finding({ id: "a", title: "Zebra" }), finding({ id: "b", title: "Alpha" })]);

    press("j");
    expect(focusedLabel()).toBe("Open bug: Zebra");

    // Sort A–Z, which puts Alpha first and moves Zebra to row two.
    fireEvent.click(screen.getByText("Bug"));
    press("o");
    expect(screen.getByTestId("drawer")).toHaveTextContent("a");
  });

  describe("decisions", () => {
    it("offers the approve confirmation for a bug that is pending approval", () => {
      mount([finding({ id: "a", status: BugFindingStatus.PENDING_APPROVAL })]);
      press("j");
      press("a");

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Approve this bug for me to fix?")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Approve it"));
      expect(approveFinding).toHaveBeenCalledWith("a");
    });

    /**
     * ally-be's `approve` throws from anything but PENDING_APPROVAL. Saying so
     * beats firing a request that 403s and reporting it as a failure.
     */
    it("refuses to approve a new bug, and says why instead of opening a dialog", () => {
      mount([finding({ id: "a", status: BugFindingStatus.NEW })]);
      press("j");
      press("a");

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(approveFinding).not.toHaveBeenCalled();
      expect(toastError).toHaveBeenCalledWith(
        "That doesn't apply to this bug from where it is.",
      );
    });

    it("offers the reject confirmation for a new bug, which ally-be does accept", () => {
      mount([finding({ id: "a", status: BugFindingStatus.NEW })]);
      press("j");
      press("r");

      expect(screen.getByText("Reject this bug?")).toBeInTheDocument();
      // Scoped to the dialog: the row's own button says "Reject" too, which is
      // exactly why the confirmation says something else.
      fireEvent.click(screen.getByText("Reject it"));
      expect(rejectFinding).toHaveBeenCalledWith("a");
    });

    /**
     * Both approve and reject are one-way doors in ally-be's transition map, so
     * a single keystroke must never spend one on its own. The bulk bar is where
     * that cost gets paid once instead of per bug.
     */
    it("never acts on a single keystroke alone", () => {
      mount([finding({ id: "a", status: BugFindingStatus.PENDING_APPROVAL })]);
      press("j");
      press("a");
      expect(approveFinding).not.toHaveBeenCalled();
    });

    it("does nothing at all when the cursor is on no row", () => {
      mount([finding({ id: "a", status: BugFindingStatus.PENDING_APPROVAL })]);
      press("a");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(toastError).not.toHaveBeenCalled();
    });
  });

  describe("selection", () => {
    it("ticks the row under the cursor with x and raises the bulk bar", () => {
      mount([finding({ id: "a" }), finding({ id: "b" })]);
      press("j");
      press("x");

      expect(screen.getByText("1 bug selected")).toBeInTheDocument();
    });

    it("takes the whole page with shift+X", () => {
      mount([finding({ id: "a" }), finding({ id: "b" }), finding({ id: "c" })]);
      press("X", { shiftKey: true });

      expect(screen.getByText("3 bugs selected")).toBeInTheDocument();
    });

    /**
     * Live testing in a headless browser delivered shift+x as `key: "x"` with
     * `shiftKey` set rather than as `"X"`. Reading only the capital made the
     * chord fall through to the plain-x case and *deselect* the row the cursor
     * was on — the exact opposite of "select the page".
     */
    it("takes the whole page when shift+x arrives lowercased, as synthesised events do", () => {
      mount([finding({ id: "a" }), finding({ id: "b" }), finding({ id: "c" })]);
      press("j");
      press("x");
      expect(screen.getByText("1 bug selected")).toBeInTheDocument();

      press("x", { shiftKey: true });
      expect(screen.getByText("3 bugs selected")).toBeInTheDocument();
    });

    it("drops the selection on Escape", () => {
      mount([finding({ id: "a" }), finding({ id: "b" })]);
      press("X", { shiftKey: true });
      expect(screen.getByText("2 bugs selected")).toBeInTheDocument();

      press("Escape");
      expect(screen.queryByText("2 bugs selected")).not.toBeInTheDocument();
    });

    /** Each button counts its own subset — approve's door is narrower than reject's. */
    it("counts each bulk action against the statuses it actually applies to", () => {
      mount([
        finding({ id: "a", status: BugFindingStatus.NEW }),
        finding({ id: "b", status: BugFindingStatus.PENDING_APPROVAL }),
        finding({ id: "c", status: BugFindingStatus.FIXING }),
      ]);
      press("X", { shiftKey: true });

      expect(screen.getByText("Approve 1")).toBeInTheDocument();
      expect(screen.getByText("Reject 2")).toBeInTheDocument();
    });
  });

  describe("keeping out of the way", () => {
    /** `/` in a search box has to be a slash, and `r` in one has to be an r. */
    it("ignores every shortcut while the reader is typing", () => {
      mount([finding({ id: "a", status: BugFindingStatus.NEW })]);
      const box = screen.getByLabelText("Search bugs");

      fireEvent.keyDown(box, { key: "j" });
      fireEvent.keyDown(box, { key: "r" });
      fireEvent.keyDown(box, { key: "?" });

      expect(document.activeElement).not.toHaveAttribute("aria-label", "Open bug: Bug a");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(onShowShortcuts).not.toHaveBeenCalled();
    });

    it("leaves browser and OS combinations alone", () => {
      mount([finding({ id: "a" }), finding({ id: "b" })]);
      press("j", { metaKey: true });
      press("j", { ctrlKey: true });
      press("j", { altKey: true });
      expect(focusedLabel()).not.toBe("Open bug: Bug a");
    });

    /** While the drawer is open the list underneath is not what the keyboard is addressing. */
    it("stands down while a drawer is open", () => {
      mount([finding({ id: "a" }), finding({ id: "b" })], "/?bug=a");
      press("j");
      expect(focusedLabel()).not.toBe("Open bug: Bug a");
    });

    it("raises the shortcut sheet on ?", () => {
      mount([finding({ id: "a" })]);
      press("?");
      expect(onShowShortcuts).toHaveBeenCalled();
    });

    /** Same synthesised-event split as shift+x: shift+/ can arrive as "/" with shiftKey. */
    it("raises the shortcut sheet when shift+/ arrives unshifted", () => {
      mount([finding({ id: "a" })]);
      press("/", { shiftKey: true });
      expect(onShowShortcuts).toHaveBeenCalled();
    });

    it("still sends a bare slash to the search box rather than the sheet", () => {
      mount([finding({ id: "a" })]);
      press("/");
      expect(onShowShortcuts).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(screen.getByLabelText("Search bugs"));
    });

    it("puts the cursor where a mouse-driven focus went, so the two never disagree", () => {
      mount([finding({ id: "a" }), finding({ id: "b" })]);

      // Focus row two directly, as Tab would.
      fireEvent.focus(screen.getByLabelText("Open bug: Bug b"));
      // One step down from there is the end of the list, not row two again.
      press("k");
      expect(focusedLabel()).toBe("Open bug: Bug a");
    });
  });
});
