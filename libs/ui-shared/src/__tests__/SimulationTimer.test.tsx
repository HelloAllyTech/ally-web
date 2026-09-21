import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { SimulationTimer } from '../lib/simulation/SimulationTimer';

describe('SimulationTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should call onWarning when the warning threshold is reached', () => {
    const onWarningMock = vi.fn();
    const onTimeLimitMock = vi.fn();
    const startTime = new Date(Date.now() - (60 - 0.5) * 1000).toISOString(); // 59.5 seconds ago

    act(() => {
      render(
        <SimulationTimer
          onWarning={onWarningMock}
          onTimeLimit={onTimeLimitMock}
          startTime={startTime}
          timeLimit={60} // 1 minute in seconds
        />
      );
    });

    act(() => {
      vi.advanceTimersByTime(1000); // Advance by 1 second
    });
    expect(onWarningMock).toHaveBeenCalledTimes(1);
    expect(onTimeLimitMock).not.toHaveBeenCalled();
  });

  it('should call onTimeLimit when the time limit is reached', () => {
    const onWarningMock = vi.fn();
    const onTimeLimitMock = vi.fn();
    const startTime = new Date(Date.now() - (60 + 10) * 1000).toISOString(); // 70 seconds ago

    act(() => {
      render(
        <SimulationTimer
          onWarning={onWarningMock}
          onTimeLimit={onTimeLimitMock}
          startTime={startTime}
          timeLimit={60} // 1 minute in seconds
        />
      );
    });

    act(() => {
      vi.advanceTimersByTime(16000); // Advance past the 15-second grace period (70 + 16 = 86 seconds total)
    });
    expect(onTimeLimitMock).toHaveBeenCalledTimes(1);
    expect(onWarningMock).toHaveBeenCalledTimes(1); // Warning should have been called before
  });
});
