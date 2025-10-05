import { render, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { useDebounce } from "../useDebounce";

const TestComponent = ({ cb, delay }: { cb: (...args: any[]) => void; delay: number }) => {
  const debounced = useDebounce(cb, delay);
  return (
    <button onClick={() => debounced("ping")} type="button">
      trigger
    </button>
  );
};

describe("useDebounce", () => {
  it("calls after the specified delay", () => {
    vi.useFakeTimers();
    const spy = vi.fn();

    const { getByText } = render(<TestComponent cb={spy} delay={200} />);
    getByText("trigger").click();

    expect(spy).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(spy).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(spy).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it("collapses multiple rapid calls into one", () => {
    vi.useFakeTimers();
    const spy = vi.fn();

    const { getByText } = render(<TestComponent cb={spy} delay={100} />);

    getByText("trigger").click();
    getByText("trigger").click();
    getByText("trigger").click();

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("ping");

    vi.useRealTimers();
  });

  it("cleans up timer on unmount", () => {
    vi.useFakeTimers();
    const spy = vi.fn();

    const { getByText, unmount } = render(<TestComponent cb={spy} delay={300} />);

    getByText("trigger").click();
    unmount();

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(spy).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
