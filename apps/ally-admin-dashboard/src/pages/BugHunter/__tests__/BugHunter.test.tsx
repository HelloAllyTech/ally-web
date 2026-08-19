import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  useGetBugHunterNotificationsQuery: vi.fn(() => ({
    data: { items: [], unreadCount: 0 },
    isLoading: false,
  })),
  useMarkBugHunterNotificationReadMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useMarkAllBugHunterNotificationsReadMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
}));

vi.mock("@utils", () => ({
  formatDate: (d: string) => d,
}));

vi.mock("@assets", () => ({
  TooltipIcon: () => <svg data-testid="tooltip-icon" />,
}));

// Carbon components stand in as their essential DOM shape — a real ContentSwitcher's
// exact markup isn't what this test verifies, only that the tab wires the right
// label/state/handler into it.
vi.mock("@ally-ui-mono/ui-shared", () => ({
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
  TableRow: ({ children, onClick }: any) => <tr onClick={onClick}>{children}</tr>,
  TableHeader: ({ children }: any) => <th>{children}</th>,
  TableCell: ({ children }: any) => <td>{children}</td>,
  Select: ({ value, onChange, children }: any) => (
    <select data-testid="status-filter" value={value} onChange={onChange}>
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
    render(<BugHunter />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Bug Hunter");
    expect(screen.getByText(/Software test engineer/)).toBeInTheDocument();
  });

  it("renders every About-me question, so a reader can find them before putting it on duty", () => {
    render(<BugHunter />);
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
    render(<BugHunter />);
    expect(screen.getByText(/Works solo \(AI mode\)/)).toBeInTheDocument();
    expect(screen.getByText(/Checks with you \(Manual mode\)/)).toBeInTheDocument();
  });

  // Position, not presence: while nobody has put Bug Hunter on duty there is
  // nothing in any of the tables, and the introduction is the most useful thing
  // on the page. Once it is working, eleven accordions above the work are noise.
  const aboutComesBeforeTheBugsTable = () => {
    const about = screen.getByText("About me");
    const bugs = screen.getByText("Bugs I'm tracking");
    return Boolean(about.compareDocumentPosition(bugs) & Node.DOCUMENT_POSITION_FOLLOWING);
  };

  it("puts About me directly under the card while it is off duty", () => {
    render(<BugHunter />);
    expect(aboutComesBeforeTheBugsTable()).toBe(true);
  });

  it("moves About me below the work once it is on duty", () => {
    mockSettingsQuery({
      data: { mode: BugHunterMode.AI, updatedBy: 7, updatedAt: "2026-08-01T00:00:00.000Z" },
    });
    render(<BugHunter />);
    expect(aboutComesBeforeTheBugsTable()).toBe(false);
  });

  it("shows the empty state for both the bugs table and the shift log when neither has data yet", () => {
    render(<BugHunter />);
    const emptyStates = screen.getAllByTestId("empty-state");
    expect(emptyStates.some(el => el.textContent?.includes("No bugs yet"))).toBe(true);
    expect(emptyStates.some(el => el.textContent?.includes("No shifts yet"))).toBe(true);
  });
});
