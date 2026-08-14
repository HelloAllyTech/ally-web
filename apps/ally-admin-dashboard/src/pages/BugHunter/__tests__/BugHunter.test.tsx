import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock API hooks — mode state, the findings table, and run history all come entirely from these.
vi.mock("@api", () => ({
  useGetBugHunterSettingsQuery: vi.fn(),
  useUpdateBugHunterSettingsMutation: vi.fn(),
  useGetBugHuntRunsQuery: vi.fn(),
  useGetBugHuntRunQuery: vi.fn(),
  useGetBugFindingsQuery: vi.fn(),
  useGetBugFindingQuery: vi.fn(),
  useApproveBugFindingMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useRejectBugFindingMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useAnswerBugFindingMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
}));

vi.mock("@hooks", () => ({
  useBugHuntStream: vi.fn(() => ({ events: [], status: null, isConnected: false })),
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

describe("BugHunter", () => {
  const updateSettings = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));

  beforeEach(() => {
    vi.clearAllMocks();
    updateSettings.mockClear();
    mockSettingsQuery();
    mockRunsQuery();
    mockFindingsQuery();
    (api.useUpdateBugHunterSettingsMutation as any).mockReturnValue([
      updateSettings,
      { isLoading: false },
    ]);
    (api.useGetBugHuntRunQuery as any).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });
  });

  it("renders off by default", () => {
    render(<BugHunter />);
    expect(screen.getByTestId("mode-switcher")).toHaveAttribute("data-selected-index", "0");
  });

  it("renders every FAQ question so a reader can find them before switching modes", () => {
    render(<BugHunter />);
    expect(screen.getByText("What does this do?")).toBeInTheDocument();
    expect(screen.getByText("What's the difference between Manual and AI mode?")).toBeInTheDocument();
    expect(
      screen.getByText("What can it fix on its own vs. what does it just propose?"),
    ).toBeInTheDocument();
    expect(screen.getByText("How do I turn it off?")).toBeInTheDocument();
  });

  it("asks for confirmation before switching modes, and does not call the mutation until confirmed", () => {
    render(<BugHunter />);
    fireEvent.click(screen.getByText("Manual"));

    expect(screen.getByTestId("confirm-popup")).toHaveTextContent("Switch Bug Hunter to Manual?");
    expect(updateSettings).not.toHaveBeenCalled();
  });

  it("calls the mutation with the target mode only after the confirmation is accepted", async () => {
    render(<BugHunter />);
    fireEvent.click(screen.getByText("Manual"));
    fireEvent.click(screen.getByText("Switch"));

    await waitFor(() => expect(updateSettings).toHaveBeenCalledWith({ mode: BugHunterMode.MANUAL }));
  });

  it("cancelling the confirmation leaves the mode unchanged and calls no mutation", () => {
    render(<BugHunter />);
    fireEvent.click(screen.getByText("Manual"));
    fireEvent.click(screen.getByText("Cancel"));

    expect(screen.queryByTestId("confirm-popup")).not.toBeInTheDocument();
    expect(updateSettings).not.toHaveBeenCalled();
  });

  it("confirms switching to AI with different copy than switching to Manual", () => {
    mockSettingsQuery({
      data: { mode: BugHunterMode.MANUAL, updatedBy: 7, updatedAt: "2026-08-01T00:00:00.000Z" },
    });
    render(<BugHunter />);

    expect(screen.getByTestId("mode-switcher")).toHaveAttribute("data-selected-index", "1");
    fireEvent.click(screen.getByText("AI"));
    expect(screen.getByTestId("confirm-popup")).toHaveTextContent("Switch Bug Hunter to AI?");
  });

  it("shows the empty state for both the bugs table and the run history when neither has data yet", () => {
    render(<BugHunter />);
    const emptyStates = screen.getAllByTestId("empty-state");
    expect(emptyStates.some(el => el.textContent?.includes("No bugs yet"))).toBe(true);
    expect(emptyStates.some(el => el.textContent?.includes("No runs yet"))).toBe(true);
  });
});
