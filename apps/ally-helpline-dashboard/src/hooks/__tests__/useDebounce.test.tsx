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
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls after the specified delay", () => {
    const spy = vi.fn();

    const { getByText } = render(<TestComponent cb={spy} delay={200} />);

    act(() => {
      getByText("trigger").click();
    });

    expect(spy).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(spy).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("collapses multiple rapid calls into one", () => {
    const spy = vi.fn();

    const { getByText } = render(<TestComponent cb={spy} delay={100} />);

    act(() => {
      getByText("trigger").click();
      getByText("trigger").click();
      getByText("trigger").click();
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("ping");
  });

  it("cleans up timer on unmount", () => {
    const spy = vi.fn();

    const { getByText, unmount } = render(<TestComponent cb={spy} delay={300} />);

    act(() => {
      getByText("trigger").click();
    });
    unmount();

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(spy).not.toHaveBeenCalled();
  });
});
