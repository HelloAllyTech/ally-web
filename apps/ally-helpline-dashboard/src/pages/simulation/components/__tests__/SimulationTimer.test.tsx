import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import SimulationTimer from "../SimulationTimer";

vi.mock("@pages/audio-call/utils", () => ({
  formatTime: (seconds: number) => `${seconds}s`,
}));

describe("SimulationTimer", () => {
  it("renders initial state (snapshot)", () => {
    vi.useFakeTimers();
    const base = new Date("2023-01-01T00:00:00.000Z");
    vi.setSystemTime(base);

    const { container } = render(
      <SimulationTimer
        isWarning={false}
        onTimeLimit={vi.fn()}
        onWarning={vi.fn()}
        startTime={base.toISOString()}
        timeLimit={60}
      />,
    );

    expect(container).toMatchSnapshot();
    vi.useRealTimers();
  });

  it("calls onWarning when reaching warning threshold", () => {
    vi.useFakeTimers();
    const base = new Date("2023-01-01T00:00:00.000Z");
    vi.setSystemTime(base);

    const onWarning = vi.fn();
    const onTimeLimit = vi.fn();

    render(
      <SimulationTimer
        isWarning={false}
        onTimeLimit={onTimeLimit}
        onWarning={onWarning}
        startTime={base.toISOString()}
        timeLimit={40}
      />,
    );

    // WARNING_THRESHOLD is 30; threshold when elapsed >= 10s for timeLimit=40
    vi.advanceTimersByTime(11000);

    expect(onWarning).toHaveBeenCalledTimes(1);
    expect(onTimeLimit).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("calls onTimeLimit when reaching time limit", () => {
    vi.useFakeTimers();
    const base = new Date("2023-01-01T00:00:00.000Z");
    vi.setSystemTime(base);

    const onWarning = vi.fn();
    const onTimeLimit = vi.fn();

    render(
      <SimulationTimer
        isWarning={false}
        onTimeLimit={onTimeLimit}
        onWarning={onWarning}
        startTime={base.toISOString()}
        timeLimit={3}
      />,
    );

    vi.advanceTimersByTime(3000);

    expect(onTimeLimit).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
