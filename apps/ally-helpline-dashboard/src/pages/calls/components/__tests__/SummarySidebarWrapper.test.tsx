import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, vi, it } from "vitest";

import SummarySidebarWrapper from "../SummarySidebarWrapper";

vi.mock("@components", () => ({
  Drawer: ({ title, children, headerButtons, onClose }: any) => (
    <div>
      {" "}
      <div data-testid="drawer-title">{title}</div> <button onClick={onClose}>Close Drawer</button>
      {headerButtons?.map((btn: any, idx: number) => (
        <button key={idx} onClick={btn.onClick}>
          {btn.text}{" "}
        </button>
      ))}
      {children}{" "}
    </div>
  ),
}));

vi.mock("@assets", () => ({
  CharacterLibraryIcon: (props: any) => <svg {...props} data-testid="character-library-icon" />,
  ManageAccount: () => <svg data-testid="manage-account-icon" />,
  DataPolicy: () => <svg data-testid="data-policy-icon" />,
  Carousel1: "Carousel1",
  Carousel2: "Carousel2",
  Carousel3: "Carousel3",
  Carousel4: "Carousel4",
  EndSessionIllustration: "EndSessionIllustration",
  Focus: "Focus",
  PauseIcon: "PauseIcon",
  Warning: "Warning",
  Lock: "Lock",
  Enhance: "Enhance",
  Mindfulness: "Mindfulness",
  Flower: "Flower",
  LoginImage: "LoginImage",
  DefaultCallProfile: "DefaultCallProfile",
  NoResults: () => <div data-testid="no-results-icon">No Results</div>,
  CallIdIcon: () => <div data-testid="call-id-icon">Call ID</div>,
  DateIcon: () => <div data-testid="date-icon">Date</div>,
  TimerIcon: () => <div data-testid="timer-icon">Timer</div>,
  TagsIcon: () => <div data-testid="tags-icon">Tags</div>,
  ReviewIcon: () => <div data-testid="review-icon">Review</div>,
  SummaryGenerationIcon: () => <div data-testid="summary-generation-icon">Summary</div>,
  ScenarioIcon: () => <div data-testid="scenario-icon">Scenario</div>,
  SessionScoreIcon: () => <div data-testid="session-score-icon">Score</div>,
  InDoubt: () => <div data-testid="in-doubt-icon">In Doubt</div>,
  LearnIcon: () => <svg data-testid="learn-icon" />,
  Leaderboard: () => <svg data-testid="leaderboard-icon" />,
  ScribeIcon: () => <svg data-testid="scribe-icon" />,
  StatsIcon: () => <svg data-testid="stats-icon" />,
  SearchIcon: () => <svg data-testid="search-icon" />,
  NoBadges: () => <div data-testid="no-badges" />,
  Badge: () => <svg data-testid="badge-icon" />,
  ReviewNavIcon: () => <svg data-testid="review-nav-icon" />,
}));

describe("SummarySidebarWrapper", () => {
  const mockTabList = [
    { id: 1, label: "Tab One", content: <div>Content One</div> },
    { id: 2, label: "Tab Two", content: <div>Content Two</div> },
  ];

  it("renders drawer with title and default selected tab", () => {
    render(
      <SummarySidebarWrapper title="Test Sidebar" tabList={mockTabList} onSidebarClose={vi.fn()} />,
    );

    expect(screen.getByTestId("drawer-title")).toHaveTextContent("Test Sidebar");
    expect(screen.getByText("Tab One")).toBeInTheDocument();
    expect(screen.getByText("Content One")).toBeInTheDocument();
  });

  it("switches tabs when clicked", async () => {
    render(<SummarySidebarWrapper title="Test Sidebar" tabList={mockTabList} />);

    expect(screen.getByText("Content One")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Tab Two/i }));
    expect(screen.getByText("Content Two")).toBeInTheDocument();
  });

  it("calls onSidebarClose when drawer close button is clicked", async () => {
    const onClose = vi.fn();
    render(
      <SummarySidebarWrapper title="Test Sidebar" tabList={mockTabList} onSidebarClose={onClose} />,
    );

    await userEvent.click(screen.getByText("Close Drawer"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("hides the tab strip when there is only one tab", () => {
    // The roleplay drawer is down to a single Annotated Transcript tab, whose
    // own content already renders that heading — a one-item strip would just
    // repeat it, and there is nothing to switch to.
    render(
      <SummarySidebarWrapper
        title="Test Sidebar"
        tabList={[mockTabList[0]]}
        onSidebarClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Content One")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Tab One/i })).not.toBeInTheDocument();
  });

  it("resyncs the selected tab when tabList shrinks after data loads, instead of showing a blank panel", () => {
    // Mirrors real usage: before useGetSimulationSummaryQuery resolves, both
    // tabs default on and selectedTab initializes to tabList[0] (Debrief).
    // Once real scenario metadata loads and reveals Debrief is off, the
    // parent re-renders this component with a shrunk tabList.
    const { rerender } = render(
      <SummarySidebarWrapper title="Test Sidebar" tabList={mockTabList} onSidebarClose={vi.fn()} />,
    );

    expect(screen.getByText("Content One")).toBeInTheDocument();

    rerender(
      <SummarySidebarWrapper
        title="Test Sidebar"
        tabList={[mockTabList[1]]}
        onSidebarClose={vi.fn()}
      />,
    );

    // selectedTab must resync to the surviving tab rather than staying
    // pinned to the now-removed id, which would render nothing.
    expect(screen.getByText("Content Two")).toBeInTheDocument();
    expect(screen.queryByText("Content One")).not.toBeInTheDocument();
  });

  it("renders children content", () => {
    render(
      <SummarySidebarWrapper title="Test Sidebar" tabList={mockTabList}>
        {" "}
        <div>Extra Child</div>{" "}
      </SummarySidebarWrapper>,
    );

    expect(screen.getByText("Extra Child")).toBeInTheDocument();
  });
});
