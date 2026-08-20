import { act, render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { SimulationPage } from "../SimulationPage";
import { WARNING_THRESHOLD } from "../waveformConstants";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), warning: vi.fn(), success: vi.fn() },
}));

vi.mock("@livekit/components-react", () => ({
  RoomContext: { Provider: ({ children }: any) => children },
}));

vi.mock("../SimulationInterface", () => ({
  RoomStatus: { AGENT_JOINED: "AGENT_JOINED" },
  SimulationInterface: (props: any) => (
    <div data-testid="simulation-interface" data-max-time-seconds={props.maxTimeSeconds} />
  ),
}));

vi.mock("../SimulationControls", () => ({
  SimulationControls: () => <div data-testid="simulation-controls" />,
}));

// The client auto-end fires this long after the limit (SimulationTimer's grace).
const CLIENT_AUTO_END_GRACE_SECONDS = 15;
const START_TIME = "2024-01-01T10:00:00.000Z";

const renderPage = (overrides: Record<string, any> = {}) => {
  const onEndSimulation = vi.fn();
  const renderWarningDialog = vi.fn(() => null);

  render(
    <SimulationPage
      roomData={{ title: "Scenario" }}
      roomStatus="AGENT_JOINED"
      sessionId="session-1"
      isEndingSession={false}
      startTime={START_TIME}
      events={[]}
      detectedEventIds={[]}
      score={0}
      onEndSimulation={onEndSimulation}
      renderWarningDialog={renderWarningDialog}
      endSessionButtonRef={{ current: false }}
      {...(overrides as any)}
    />,
  );

  return { onEndSimulation, renderWarningDialog };
};

const advanceSeconds = (seconds: number) =>
  act(() => {
    vi.advanceTimersByTime(seconds * 1000);
  });

describe("SimulationPage session time limit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(START_TIME));
    vi.spyOn(window.HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    vi.spyOn(window.HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // Regression: the missing-timer fallback used to be 600000, a millisecond
  // value compared against elapsed SECONDS (~166 hours), so a scenario saved
  // with timerMode off had no client-side auto-end at all — a runaway call kept
  // the mic and the audio connection open indefinitely.
  it("auto-ends a scenario that has no configured time limit after the 10 minute fallback", () => {
    const { onEndSimulation, renderWarningDialog } = renderPage({
      roomData: { title: "Scenario", timerMode: false },
    });

    advanceSeconds(600 - WARNING_THRESHOLD);
    expect(renderWarningDialog).toHaveBeenCalledWith(expect.objectContaining({ isOpen: true }));

    expect(onEndSimulation).not.toHaveBeenCalled();

    advanceSeconds(WARNING_THRESHOLD + CLIENT_AUTO_END_GRACE_SECONDS + 1);
    expect(onEndSimulation).toHaveBeenCalled();
  });

  it("uses the scenario's configured limit when maxTimeValue is set", () => {
    const { onEndSimulation } = renderPage({
      roomData: { title: "Scenario", timerMode: true, maxTimeValue: "00:05:00" },
    });

    advanceSeconds(300 + CLIENT_AUTO_END_GRACE_SECONDS - 1);
    expect(onEndSimulation).not.toHaveBeenCalled();

    advanceSeconds(2);
    expect(onEndSimulation).toHaveBeenCalled();
  });
});
