import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock API hooks — mode state, the findings table, and run history all come entirely from these.
vi.mock("@api", () => ({
  useGetBugHunterSettingsQuery: vi.fn(),
  useUpdateBugHunterSettingsMutation: vi.fn(),
  useGetBugHuntRunsQuery: vi.fn(),
  useTriggerBugHuntSweepMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useGetBugHuntRunQuery: vi.fn(),
  useGetBugFindingsQuery: vi.fn(),
  useGetBugFindingQuery: vi.fn(),
  useApproveBugFindingMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useRejectBugFindingMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useAnswerBugFindingMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useStartBugFixSessionMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useReleaseBugFindingMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useCancelBugFixSessionMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useGetBugHunterNotificationsQuery: vi.fn(() => ({
    data: { items: [], unreadCount: 0 },
    isLoading: false,
  })),
  useMarkBugHunterNotificationReadMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useMarkAllBugHunterNotificationsReadMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
}));

vi.mock("@utils", () => ({
  formatDate: (d: string) => d,
  formatDateTime: (d: string) => d,
  formatTimestamp: (d: string) => d,
  hasFeature: (features: string[], key: string) => features.includes(key),
}));

// Holds the bug_hunter toggle by default, so every existing assertion below —
// none of which is about the read/act split — keeps seeing the full triage
// surface.
vi.mock("react-redux", () => ({
  useSelector: (selector: any) => selector({ user: { user: {}, features: ["bug_hunter"] } }),
}));

vi.mock("@assets", () => ({
  TooltipIcon: () => <svg data-testid="tooltip-icon" />,
}));

// Carbon components stand in as their essential DOM shape — a real ContentSwitcher's
// exact markup isn't what this test verifies, only that the tab wires the right
// label/state/handler into it.
// Real motion timing isn't what a layout test is about.
vi.mock("framer-motion", () => {
  // Defined inside the factory: `vi.mock` is hoisted above this file's own
  // declarations, so a helper referenced from out here would be in its TDZ by
  // the time the factory runs.
  //
  // Motion-only props are dropped rather than spread onto real elements —
  // React warns about `initial={false}` or `layout="position"` on a <div>, and
  // that warning would be this mock's rather than the component's. `li`/`p`
  // exist because the live board's rows and its sweep event line are those.
  const strip = ({ initial, animate, exit, transition, layout, layoutId, ...rest }: any) => rest;
  return {
    motion: {
      div: (props: any) => <div {...strip(props)} />,
      span: (props: any) => <span {...strip(props)} />,
      li: (props: any) => <li {...strip(props)} />,
      p: (props: any) => <p {...strip(props)} />,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
    useReducedMotion: () => false,
  };
});

vi.mock("@ally-ui-mono/ui-shared", () => ({
  // Matches the real strip's `data-testid={`tab-${id}`}` so a test can address
  // a tab without going through its label — which matters here because the
  // About tab sits next to a heading of nearly the same name.
  Tabs: ({ items, activeId, onChange }: any) => (
    <div data-testid="tabs">
      {items.map((item: any) => (
        <button
          key={item.id}
          data-testid={`tab-${item.id}`}
          aria-pressed={activeId === item.id}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
  Search: ({ id, labelText, value, onChange, placeholder }: any) => (
    <input
      id={id}
      aria-label={labelText}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  ),
  ContentSwitcher: ({ selectedIndex, onChange, children }: any) => (
    <div data-testid="mode-switcher" data-selected-index={selectedIndex}>
      {children.map((child: any, index: number) => (
        <button key={index} onClick={() => onChange({ index })} disabled={child.props.disabled}>
          {child.props.text}
        </button>
      ))}
    </div>
  ),
  Switch: ({ text }: any) => <span>{text}</span>,
  Accordion: ({ children }: any) => <div>{children}</div>,
  AccordionItem: ({ title, children }: any) => (
    <div>
      <h3>{title}</h3>
      {children}
    </div>
  ),
  Tooltip: ({ children }: any) => <>{children}</>,
  Table: ({ children }: any) => <table>{children}</table>,
  TableHead: ({ children }: any) => <thead>{children}</thead>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableRow: ({ children, ...rest }: any) => <tr {...rest}>{children}</tr>,
  TableHeader: ({ children, ...rest }: any) => <th {...rest}>{children}</th>,
  TableCell: ({ children, ...rest }: any) => <td {...rest}>{children}</td>,
  Select: ({ id, value, onChange, children, labelText }: any) => (
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
  TextArea: ({ value, onChange, placeholder }: any) => (
    <textarea value={value} onChange={onChange} placeholder={placeholder} />
  ),
  SidePanel: ({ open, title, children }: any) =>
    open ? (
      <div data-testid="side-panel">
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
}));

// @components is a large barrel: @constants -> SimulationCreator.ts reads
// `cellTypes` from it at MODULE-EVAL time (unrelated to this page), and
// `Button` transitively drags in the real Redux store. Providing a plain
// `cellTypes` stub (rather than spreading the real barrel via importOriginal)
// satisfies that load without pulling the real store into this render.
vi.mock("@components", () => ({
  EmptyState: ({ title, subtitle }: any) => (
    <div data-testid="empty-state">
      <h3>{title}</h3>
      <p>{subtitle}</p>
    </div>
  ),
  cellTypes: {
    editableText: "editableText",
    dropdown: "dropdown",
    dropdownSearchable: "dropdownSearchable",
    number: "number",
    image: "image",
    select: "select",
    switch: "switch",
    emoji_select: "emoji_select",
    normalText: "normalText",
    wrapText: "wrapText",
    triggerConditions: "triggerConditions",
    timeInput: "timeInput",
    score: "score",
    textAreaWithDropdown: "textAreaWithDropdown",
    tags: "tags",
  },
}));

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

import * as api from "@api";
import { BugHunterMode } from "@types";
import { BugHunter } from "../BugHunter";

const mockSettingsQuery = (overrides: Record<string, unknown> = {}) => {
  (api.useGetBugHunterSettingsQuery as any).mockReturnValue({
    data: { mode: BugHunterMode.OFF, updatedBy: null, updatedAt: "2026-08-01T00:00:00.000Z" },
    isLoading: false,
    isError: false,
    ...overrides,
  });
};

const mockRunsQuery = (overrides: Record<string, unknown> = {}) => {
  (api.useGetBugHuntRunsQuery as any).mockReturnValue({
    data: { items: [] },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  });
};

const mockFindingsQuery = (overrides: Record<string, unknown> = {}) => {
  (api.useGetBugFindingsQuery as any).mockReturnValue({
    data: { items: [], count: 0 },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  });
};

/**
 * This file covers the page as a *layout*: who is at the top of it, what order
 * the surfaces come in, and which of them appear at all. The working-style
 * control moved onto the profile card and is tested in AgentProfileCard.test.
 */
describe("BugHunter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettingsQuery();
    mockRunsQuery();
    mockFindingsQuery();
    (api.useUpdateBugHunterSettingsMutation as any).mockReturnValue([
      vi.fn(() => ({ unwrap: () => Promise.resolve({}) })),
      { isLoading: false },
    ]);
    (api.useGetBugHuntRunQuery as any).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });
  });

  it("leads with the character rather than a page heading", () => {
    render(
      <MemoryRouter>
        <BugHunter />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Bug Hunter");
    expect(screen.getByText(/Software test engineer/)).toBeInTheDocument();
  });

  it("renders every About-me question, so a reader can find them before putting it on duty", () => {
    render(
      <MemoryRouter>
        <BugHunter />
      </MemoryRouter>,
    );
    expect(screen.getByText("What do you do?")).toBeInTheDocument();
    expect(
      screen.getByText("What's the difference between the two working styles?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("What do you fix on your own, and what do you just propose?"),
    ).toBeInTheDocument();
    expect(screen.getByText("How do I stop you?")).toBeInTheDocument();
  });

  it("names both old mode names in About me, so logs and docs still join up", () => {
    render(
      <MemoryRouter>
        <BugHunter />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Works solo \(AI mode\)/)).toBeInTheDocument();
    expect(screen.getByText(/Checks with you \(Manual mode\)/)).toBeInTheDocument();
  });

  const onDuty = () =>
    mockSettingsQuery({
      data: { mode: BugHunterMode.AI, updatedBy: 7, updatedAt: "2026-08-01T00:00:00.000Z" },
    });

  // Which tab you land on is the whole of the old "where does About me go"
  // rule, which used to render the same component in two different places
  // depending on the mode.
  it("lands on About while nobody has put it on duty", () => {
    render(
      <MemoryRouter>
        <BugHunter />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("tab-about")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "About me" })).toBeInTheDocument();
    // Nothing on the Work tab has anything in it yet, so it is not rendered.
    expect(screen.queryByText("Bugs I'm tracking")).not.toBeInTheDocument();
  });

  it("lands on the work once it is on duty, with About behind its own tab", () => {
    onDuty();
    render(
      <MemoryRouter>
        <BugHunter />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("tab-work")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Bugs I'm tracking")).toBeInTheDocument();
    // Eleven FAQ accordions under the table were three screens of scroll below
    // the work — the reason this page is tabbed at all.
    expect(screen.queryByRole("heading", { name: "About me" })).not.toBeInTheDocument();
  });

  /**
   * The scorecard and the shift log answer a governance question asked roughly
   * monthly, and used to render under the bugs table on every single visit.
   */
  it("keeps the governance sections off the work tab, one click away", () => {
    onDuty();
    render(
      <MemoryRouter>
        <BugHunter />
      </MemoryRouter>,
    );
    expect(screen.queryByText("How I'm doing")).not.toBeInTheDocument();
    expect(screen.queryByText("My shift log")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("tab-performance"));

    expect(screen.getByText("How I'm doing")).toBeInTheDocument();
    expect(screen.getByText("My shift log")).toBeInTheDocument();
    // And the work is not also on this tab — that would be the old page again.
    expect(screen.queryByText("Bugs I'm tracking")).not.toBeInTheDocument();
  });

  // The card is the page's heading and holds the kill switch, so it must be
  // reachable from every section rather than living on one of them.
  it("keeps the agent's card above the tabs, whichever section is open", () => {
    onDuty();
    render(
      <MemoryRouter>
        <BugHunter />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId("tab-performance"));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Bug Hunter");

    fireEvent.click(screen.getByTestId("tab-about"));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Bug Hunter");
  });

  it("reads the open section out of the address bar, so a section is linkable", () => {
    onDuty();
    render(
      <MemoryRouter initialEntries={["/?section=performance"]}>
        <BugHunter />
      </MemoryRouter>,
    );
    expect(screen.getByText("How I'm doing")).toBeInTheDocument();
  });

  it("falls back to the default section for a hand-edited one, rather than erroring", () => {
    onDuty();
    render(
      <MemoryRouter initialEntries={["/?section=telemetry"]}>
        <BugHunter />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("tab-work")).toHaveAttribute("aria-pressed", "true");
  });

  // The queue is the reason the page was re-ordered: the old layout could state
  // "4 bugs are waiting on your call" on the card and offer no way to act on any
  // of them, two screens above the table where those four were hiding.
  it("puts what it needs from you above the bugs table, once anything is blocked", () => {
    mockSettingsQuery({
      data: { mode: BugHunterMode.AI, updatedBy: 7, updatedAt: "2026-08-01T00:00:00.000Z" },
    });
    mockFindingsQuery({
      data: {
        items: [
          {
            id: "f-1",
            status: "pending_approval",
            title: "A bug awaiting your call",
            source: "code_review",
            repo: "ally-be",
            severity: null,
            escalationQuestion: null,
            createdAt: "2026-08-18",
          },
        ],
        count: 1,
      },
    });
    render(
      <MemoryRouter>
        <BugHunter />
      </MemoryRouter>,
    );

    const queue = screen.getByText("What I need from you");
    const bugs = screen.getByText("Bugs I'm tracking");
    expect(queue.compareDocumentPosition(bugs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("says nothing at all about decisions on a quiet day", () => {
    mockSettingsQuery({
      data: { mode: BugHunterMode.AI, updatedBy: 7, updatedAt: "2026-08-01T00:00:00.000Z" },
    });
    render(
      <MemoryRouter>
        <BugHunter />
      </MemoryRouter>,
    );

    // An always-present section headed "What I need from you" saying "nothing"
    // trains a reader to skip the region where the urgent thing later appears.
    expect(screen.queryByText("What I need from you")).not.toBeInTheDocument();
  });

  // The section the page was missing: every other surface here is a record of
  // something, and the agent's live work had no page-level home beyond one
  // sentence on the card.
  it("puts what it is doing right now between your blocked work and the bugs table", () => {
    mockSettingsQuery({
      data: { mode: BugHunterMode.AI, updatedBy: 7, updatedAt: "2026-08-01T00:00:00.000Z" },
    });
    mockFindingsQuery({
      data: {
        items: [
          {
            id: "f-1",
            status: "pending_approval",
            title: "A bug awaiting your call",
            source: "code_review",
            repo: "ally-be",
            severity: null,
            escalationQuestion: null,
            createdAt: "2026-08-18",
            updatedAt: "2026-08-18",
          },
          {
            id: "f-2",
            status: "fixing",
            title: "A bug being fixed right now",
            source: "test_failure",
            repo: "ally-web",
            severity: null,
            escalationQuestion: null,
            createdAt: "2026-08-18",
            updatedAt: "2026-08-18",
          },
        ],
        count: 2,
      },
    });
    render(
      <MemoryRouter>
        <BugHunter />
      </MemoryRouter>,
    );

    const queue = screen.getByText("What I need from you");
    const live = screen.getByText("On it right now");
    const bugs = screen.getByText("Bugs I'm tracking");

    expect(queue.compareDocumentPosition(live) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(live.compareDocumentPosition(bugs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("says nothing about live work on a quiet day, rather than showing an empty board", () => {
    mockSettingsQuery({
      data: { mode: BugHunterMode.AI, updatedBy: 7, updatedAt: "2026-08-01T00:00:00.000Z" },
    });
    render(
      <MemoryRouter>
        <BugHunter />
      </MemoryRouter>,
    );

    expect(screen.queryByText("On it right now")).not.toBeInTheDocument();
  });

  it("shows an empty state on each tab that has no data yet", () => {
    onDuty();
    render(
      <MemoryRouter>
        <BugHunter />
      </MemoryRouter>,
    );
    expect(
      screen.getAllByTestId("empty-state").some(el => el.textContent?.includes("No bugs yet")),
    ).toBe(true);

    fireEvent.click(screen.getByTestId("tab-performance"));
    expect(
      screen.getAllByTestId("empty-state").some(el => el.textContent?.includes("No shifts yet")),
    ).toBe(true);
  });
});
