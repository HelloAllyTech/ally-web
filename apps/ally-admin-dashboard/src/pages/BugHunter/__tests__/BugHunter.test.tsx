import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock API hooks — the toggle state and run history come entirely from these.
vi.mock("@api", () => ({
  useGetBugHunterSettingsQuery: vi.fn(),
  useUpdateBugHunterSettingsMutation: vi.fn(),
  useGetBugHuntRunsQuery: vi.fn(),
  useGetBugHuntRunQuery: vi.fn(),
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

// Carbon components stand in as their essential DOM shape — a real Toggle's
// exact markup isn't what this test verifies, only that the tab wires the
// right label/state/handler into it.
vi.mock("@ally-ui-mono/ui-shared", () => ({
  CarbonToggle: ({ labelA, labelB, toggled, onToggle, disabled }: any) => (
    <button
      data-testid="bug-hunter-toggle"
      disabled={disabled}
      onClick={onToggle}
      aria-pressed={toggled}
    >
      {toggled ? labelB : labelA}
    </button>
  ),
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
import { BugHunter } from "../BugHunter";

const mockSettingsQuery = (overrides: Record<string, unknown> = {}) => {
  (api.useGetBugHunterSettingsQuery as any).mockReturnValue({
    data: { enabled: false, updatedBy: null, updatedAt: "2026-08-01T00:00:00.000Z" },
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

describe("BugHunter", () => {
  const updateSettings = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));

  beforeEach(() => {
    vi.clearAllMocks();
    updateSettings.mockClear();
    mockSettingsQuery();
    mockRunsQuery();
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
    expect(screen.getByTestId("bug-hunter-toggle")).toHaveTextContent("Off");
    expect(screen.getByTestId("bug-hunter-toggle")).toHaveAttribute("aria-pressed", "false");
  });

  it("renders every FAQ question so a reader can find them before turning the switch on", () => {
    render(<BugHunter />);
    expect(screen.getByText("What does this do?")).toBeInTheDocument();
    expect(
      screen.getByText("What can it fix on its own vs. what does it just propose?"),
    ).toBeInTheDocument();
    expect(screen.getByText("How do I turn it off?")).toBeInTheDocument();
  });

  it("asks for confirmation before turning on, and does not call the mutation until confirmed", () => {
    render(<BugHunter />);
    fireEvent.click(screen.getByTestId("bug-hunter-toggle"));

    expect(screen.getByTestId("confirm-popup")).toHaveTextContent("Turn Bug Hunter on?");
    expect(updateSettings).not.toHaveBeenCalled();
  });

  it("calls the mutation with enabled:true only after the confirmation is accepted", async () => {
    render(<BugHunter />);
    fireEvent.click(screen.getByTestId("bug-hunter-toggle"));
    fireEvent.click(screen.getByText("Turn on"));

    await waitFor(() => expect(updateSettings).toHaveBeenCalledWith({ enabled: true }));
  });

  it("cancelling the confirmation leaves the switch off and calls no mutation", () => {
    render(<BugHunter />);
    fireEvent.click(screen.getByTestId("bug-hunter-toggle"));
    fireEvent.click(screen.getByText("Cancel"));

    expect(screen.queryByTestId("confirm-popup")).not.toBeInTheDocument();
    expect(updateSettings).not.toHaveBeenCalled();
  });

  it("confirms turning off with different copy than turning on", () => {
    mockSettingsQuery({
      data: { enabled: true, updatedBy: 7, updatedAt: "2026-08-01T00:00:00.000Z" },
    });
    render(<BugHunter />);

    expect(screen.getByTestId("bug-hunter-toggle")).toHaveTextContent("On");
    fireEvent.click(screen.getByTestId("bug-hunter-toggle"));
    expect(screen.getByTestId("confirm-popup")).toHaveTextContent("Turn Bug Hunter off?");
  });

  it("shows the empty state when there is no run history yet", () => {
    render(<BugHunter />);
    expect(screen.getByTestId("empty-state")).toHaveTextContent("No runs yet");
  });
});
