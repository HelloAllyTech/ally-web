import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RoleplaySessionLogPanel } from "../RoleplaySessionLogPanel";

const mockUseGetSimulationSummaryQuery = vi.fn();

vi.mock("@api", () => ({
  useGetSimulationSummaryQuery: (args: any) => mockUseGetSimulationSummaryQuery(args),
  useGetAvailableLanguagesQuery: () => ({ data: undefined }),
}));

vi.mock("@components", () => ({
  DebriefTab: () => <div data-testid="debrief-tab">Debrief content</div>,
}));

vi.mock("@containers", () => ({
  useSimulationSummaryPolling: () => ({ summaryData: undefined, retryMaxReached: false }),
}));

vi.mock("../../../../calls/components", () => ({
  SimulationTranscriptTab: () => <div data-testid="transcript-tab">Transcript content</div>,
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Tabs: ({ items, activeId, onChange }: any) => (
    <div>
      {items.map((item: any) => (
        <button key={item.id} onClick={() => onChange(item.id)}>
          {item.label}
        </button>
      ))}
    </div>
  ),
}));

describe("RoleplaySessionLogPanel", () => {
  it("resyncs the selected tab once real data reveals Debrief is off, instead of showing a blank panel", () => {
    // Before useGetSimulationSummaryQuery resolves, `summary` is undefined, so
    // resolveFeedbackTabs(undefined) defaults both tabs on and selectedTab
    // initializes to the Debrief tab (tabList[0]).
    mockUseGetSimulationSummaryQuery.mockReturnValue({ data: undefined });

    const { rerender } = render(<RoleplaySessionLogPanel sessionId="session-1" />);

    expect(screen.getByTestId("debrief-tab")).toBeInTheDocument();

    // The real scenario metadata now loads and reveals Debrief was switched
    // off, so tabList shrinks to just Transcript.
    mockUseGetSimulationSummaryQuery.mockReturnValue({
      data: { scenario: { metadata: { feedbackTabs: { debrief: false, transcript: true } } } },
    });

    rerender(<RoleplaySessionLogPanel sessionId="session-1" />);

    // selectedTab must resync to the surviving tab rather than staying pinned
    // to the now-removed Debrief id, which would render nothing.
    expect(screen.getByTestId("transcript-tab")).toBeInTheDocument();
    expect(screen.queryByTestId("debrief-tab")).not.toBeInTheDocument();
  });
});
