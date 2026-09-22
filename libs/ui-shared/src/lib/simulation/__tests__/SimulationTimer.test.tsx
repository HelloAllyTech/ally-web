import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { SimulationTimer } from "../SimulationTimer";

const mockOnTimeLimit = vi.fn();
const mockOnWarning = vi.fn();

const props = {
  onTimeLimit: mockOnTimeLimit,
  onWarning: mockOnWarning,
  startTime: new Date().toISOString(),
  timeLimit: 600,
  translations: { sessionDuration: "Session Duration:" },
};

describe("SimulationTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should render the timer with the correct initial time", () => {
    render(<SimulationTimer {...props} />);
    const timerValue = screen.getByTestId("simulation-timer-value");
    expect(timerValue.textContent).toBe("00:00");
  });

  it("should call onWarning when the time limit is approaching", async () => {
    render(<SimulationTimer {...props} timeLimit={60} />);
    await vi.advanceTimersByTimeAsync(31 * 1000);
    expect(mockOnWarning).toHaveBeenCalled();
  });

  it("should call onTimeLimit when the time limit is reached", async () => {
    render(<SimulationTimer {...props} timeLimit={60} />);
    await vi.advanceTimersByTimeAsync(76 * 1000);
    expect(mockOnTimeLimit).toHaveBeenCalled();
  });

  it("should not call onWarning or onTimeLimit when paused", async () => {
    render(<SimulationTimer {...props} timeLimit={60} isPaused />);
    await vi.advanceTimersByTimeAsync(76 * 1000);
    expect(mockOnWarning).not.toHaveBeenCalled();
    expect(mockOnTimeLimit).not.toHaveBeenCalled();
  });

  it("does not reset the interval when parent re-renders", async () => {
    const onWarning = vi.fn();
    const onTimeLimit = vi.fn();
    const timeLimit = 10;
    const startTime = new Date().toISOString();

    const { rerender } = render(
      <SimulationTimer
        startTime={startTime}
        timeLimit={timeLimit}
        onWarning={onWarning}
        onTimeLimit={onTimeLimit}
      />,
    );

    // Re-render every 500ms for 12 seconds to simulate the parent component
    // re-rendering frequently, creating new functions for the callbacks.
    // The key is that `onWarning` and `onTimeLimit` are new function instances
    // on each render.
    for (let i = 0; i < 24; i++) {
      await vi.advanceTimersByTimeAsync(500);
      rerender(
        <SimulationTimer
          startTime={startTime}
          timeLimit={timeLimit}
          onWarning={() => onWarning()}
          onTimeLimit={() => onTimeLimit()}
        />,
      );
    }
    
    // Total time advanced in loop is 12 seconds.
    // The warning should have been triggered when `timeLimit - timeElapsed <= 30`,
    // which is `10 - timeElapsed <= 30`, which is true for any positive elapsed time.
    // So the warning should be called on the first successful 1-second interval.
    expect(onWarning).toHaveBeenCalled();

    // The time limit callback should be triggered when `timeElapsed >= timeLimit + 15`,
    // which is `timeElapsed >= 25`.
    // We need to advance the clock further.
    await vi.advanceTimersByTimeAsync(15 * 1000);
    expect(onTimeLimit).toHaveBeenCalled();
  });
});