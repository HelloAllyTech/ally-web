import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@api", () => ({
  useGetBugHunterSettingsQuery: vi.fn(),
  useUpdateBugHunterSettingsMutation: vi.fn(),
  useGetBugFindingsQuery: vi.fn(),
  useGetBugHuntRunsQuery: vi.fn(),
}));

vi.mock("@assets", () => ({
  TooltipIcon: () => <svg data-testid="tooltip-icon" />,
}));

// See BugFindingsTable's note: @constants reads `cellTypes` off this barrel at
// module-eval time, so it is stubbed rather than loaded for real. The avatar is
// imported by its own path and stays real.
vi.mock("@components", () => ({ cellTypes: {} }));

vi.mock("@components/action-confirmation-popup", () => ({
  ActionConfirmationPopup: ({ isOpen, title, description, primaryButton, secondaryButton }: any) =>
    isOpen ? (
      <div data-testid="confirm-popup">
        <p>{title}</p>
        <p>{description}</p>
        <button onClick={primaryButton.onClick}>{primaryButton.label}</button>
        <button onClick={secondaryButton.onClick}>{secondaryButton.label}</button>
      </div>
    ) : null,
}));

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
  Tooltip: ({ children }: any) => <>{children}</>,
}));

import * as api from "@api";
import { BugFinding, BugFindingStatus, BugHunterMode, BugHuntRunStatus } from "@types";

import { AgentProfileCard } from "../AgentProfileCard";

const updateSettings = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));

const mockSettings = (mode = BugHunterMode.OFF, overrides: Record<string, unknown> = {}) => {
  (api.useGetBugHunterSettingsQuery as any).mockReturnValue({
    data: { mode, updatedBy: null, updatedAt: "2026-08-01T00:00:00.000Z" },
    isLoading: false,
    isError: false,
    ...overrides,
  });
};

const mockFindings = (items: Partial<BugFinding>[] = []) => {
  (api.useGetBugFindingsQuery as any).mockReturnValue({
    data: { items, count: items.length },
    isLoading: false,
    isError: false,
  });
};

const mockRuns = (items: Record<string, unknown>[] = []) => {
  (api.useGetBugHuntRunsQuery as any).mockReturnValue({
    data: { items },
    isLoading: false,
    isError: false,
  });
};

describe("AgentProfileCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettings();
    mockFindings();
    mockRuns();
    (api.useUpdateBugHunterSettingsMutation as any).mockReturnValue([
      updateSettings,
      { isLoading: false },
    ]);
  });

  it("introduces Bug Hunter as a person with a job, not a feature", () => {
    render(<AgentProfileCard />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Bug Hunter");
    expect(screen.getByText(/Software test engineer/)).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /Bug Hunter, Software test engineer/ }),
    ).toBeInTheDocument();
  });

  it("says what it is doing, in its own voice, from the state of the work", () => {
    mockSettings(BugHunterMode.AI);
    mockFindings([{ id: "f-1", status: BugFindingStatus.NEEDS_INPUT }]);
    render(<AgentProfileCard />);

    expect(screen.getByText("Waiting on you")).toBeInTheDocument();
    expect(screen.getByText(/One bug is waiting on your call/)).toBeInTheDocument();
  });

  it("reports a live sweep by name", () => {
    mockSettings(BugHunterMode.AI);
    mockRuns([{ id: "run-1", repo: "ally-be", status: BugHuntRunStatus.RUNNING }]);
    render(<AgentProfileCard />);

    expect(screen.getByText("Working")).toBeInTheDocument();
    expect(screen.getByText("I'm sweeping ally-be right now.")).toBeInTheDocument();
  });

  it("shows what is on the desk once there is anything on it, and nothing before that", () => {
    const { unmount } = render(<AgentProfileCard />);
    expect(screen.queryByText("Waiting on your call")).not.toBeInTheDocument();
    unmount();

    mockSettings(BugHunterMode.AI);
    mockFindings([
      { id: "f-1", status: BugFindingStatus.FIXING },
      { id: "f-2", status: BugFindingStatus.PR_OPENED },
    ]);
    render(<AgentProfileCard />);

    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("In review")).toBeInTheDocument();
    expect(screen.getByText(/From my 2 most recent bugs/)).toBeInTheDocument();
  });

  it("starts on the mode the backend actually has", () => {
    mockSettings(BugHunterMode.MANUAL);
    render(<AgentProfileCard />);
    expect(screen.getByTestId("mode-switcher")).toHaveAttribute("data-selected-index", "1");
  });

  it("asks before changing the working style, and changes nothing until confirmed", () => {
    render(<AgentProfileCard />);
    fireEvent.click(screen.getByText("Checks with you"));

    expect(screen.getByTestId("confirm-popup")).toHaveTextContent(
      "Ask Bug Hunter to check with you first?",
    );
    expect(updateSettings).not.toHaveBeenCalled();
  });

  it("sends the new working style once confirmed", async () => {
    render(<AgentProfileCard />);
    fireEvent.click(screen.getByText("Checks with you"));
    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() =>
      expect(updateSettings).toHaveBeenCalledWith({ mode: BugHunterMode.MANUAL }),
    );
  });

  it("cancelling leaves the working style alone", () => {
    render(<AgentProfileCard />);
    fireEvent.click(screen.getByText("Works solo"));
    fireEvent.click(screen.getByText("Cancel"));

    expect(screen.queryByTestId("confirm-popup")).not.toBeInTheDocument();
    expect(updateSettings).not.toHaveBeenCalled();
  });

  // Each mode has its own consequence, so each gets its own sentence rather
  // than one template with the mode's name dropped into it.
  it("explains each working style in its own words", () => {
    mockSettings(BugHunterMode.MANUAL);
    render(<AgentProfileCard />);

    fireEvent.click(screen.getByText("Works solo"));
    expect(screen.getByTestId("confirm-popup")).toHaveTextContent("Let Bug Hunter work solo?");
    expect(screen.getByTestId("confirm-popup")).toHaveTextContent("This is AI mode.");

    fireEvent.click(screen.getByText("Cancel"));
    fireEvent.click(screen.getByText("Off duty"));
    expect(screen.getByTestId("confirm-popup")).toHaveTextContent("Send Bug Hunter off duty?");
  });

  it("hides the working-style control rather than guessing at it when settings fail to load", () => {
    mockSettings(BugHunterMode.OFF, { data: undefined, isError: true });
    render(<AgentProfileCard />);

    expect(screen.queryByTestId("mode-switcher")).not.toBeInTheDocument();
  });
});
