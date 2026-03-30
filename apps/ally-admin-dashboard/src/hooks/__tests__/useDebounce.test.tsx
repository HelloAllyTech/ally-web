import { render, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { useDebounce } from "../useDebounce";

const TestComponent = ({ cb, delay }: { cb: (...args: any[]) => void; delay: number }) => {
  const debounced = useDebounce(cb, delay);
  return (
    <button onClick={() => debounced("test-arg")} data-testid="trigger" type="button">
      Trigger
    </button>
  );
};

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("Basic Functionality", () => {
    it("delays callback execution", () => {
      const spy = vi.fn();
      const { getByTestId } = render(<TestComponent cb={spy} delay={200} />);

      getByTestId("trigger").click();

      expect(spy).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith("test-arg");
    });

    it("does not call callback before delay expires", () => {
      const spy = vi.fn();
      const { getByTestId } = render(<TestComponent cb={spy} delay={500} />);

      getByTestId("trigger").click();

      act(() => {
        vi.advanceTimersByTime(499);
      });

      expect(spy).not.toHaveBeenCalled();
    });

    it("calls callback exactly once after delay", () => {
      const spy = vi.fn();
      const { getByTestId } = render(<TestComponent cb={spy} delay={300} />);

      getByTestId("trigger").click();

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(spy).toHaveBeenCalledTimes(1);

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe("Debouncing Behavior", () => {
    it("collapses multiple rapid calls into one", () => {
      const spy = vi.fn();
      const { getByTestId } = render(<TestComponent cb={spy} delay={100} />);

      getByTestId("trigger").click();
      getByTestId("trigger").click();
      getByTestId("trigger").click();

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith("test-arg");
    });

    it("resets timer on each call", () => {
      const spy = vi.fn();
      const { getByTestId } = render(<TestComponent cb={spy} delay={200} />);

      getByTestId("trigger").click();

      act(() => {
        vi.advanceTimersByTime(100);
      });

      getByTestId("trigger").click();

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(spy).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("handles rapid successive calls correctly", () => {
      const spy = vi.fn();
      const { getByTestId } = render(<TestComponent cb={spy} delay={150} />);

      for (let i = 0; i < 10; i++) {
        getByTestId("trigger").click();
        act(() => {
          vi.advanceTimersByTime(50);
        });
      }

      expect(spy).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("allows separate calls after debounce period", () => {
      const spy = vi.fn();
      const { getByTestId } = render(<TestComponent cb={spy} delay={100} />);

      getByTestId("trigger").click();

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(spy).toHaveBeenCalledTimes(1);

      getByTestId("trigger").click();

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe("Cleanup", () => {
    it("cleans up timer on unmount", () => {
      const spy = vi.fn();
      const { getByTestId, unmount } = render(<TestComponent cb={spy} delay={300} />);

      getByTestId("trigger").click();
      unmount();

      act(() => {
        vi.runOnlyPendingTimers();
      });

      expect(spy).not.toHaveBeenCalled();
    });

    it("clears pending timeout on unmount", () => {
      const spy = vi.fn();
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

      const { getByTestId, unmount } = render(<TestComponent cb={spy} delay={200} />);

      getByTestId("trigger").click();
      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });

    it("does not call callback after unmount even if timer expires", () => {
      const spy = vi.fn();
      const { getByTestId, unmount } = render(<TestComponent cb={spy} delay={100} />);

      getByTestId("trigger").click();

      act(() => {
        vi.advanceTimersByTime(50);
      });

      unmount();

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("Argument Handling", () => {
    it("passes single argument correctly", () => {
      const spy = vi.fn();
      const TestWithArg = ({ cb, delay }: { cb: (arg: string) => void; delay: number }) => {
        const debounced = useDebounce(cb, delay);
        return (
          <button onClick={() => debounced("hello")} data-testid="trigger">
            Click
          </button>
        );
      };

      const { getByTestId } = render(<TestWithArg cb={spy} delay={100} />);

      getByTestId("trigger").click();

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(spy).toHaveBeenCalledWith("hello");
    });

    it("passes multiple arguments correctly", () => {
      const spy = vi.fn();
      const TestWithMultipleArgs = ({
        cb,
        delay,
      }: {
        cb: (...args: any[]) => void;
        delay: number;
      }) => {
        const debounced = useDebounce(cb, delay);
        return (
          <button onClick={() => debounced("arg1", 42, { key: "value" })} data-testid="trigger">
            Click
          </button>
        );
      };

      const { getByTestId } = render(<TestWithMultipleArgs cb={spy} delay={100} />);

      getByTestId("trigger").click();

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(spy).toHaveBeenCalledWith("arg1", 42, { key: "value" });
    });

    it("uses last call's arguments when debouncing", () => {
      const spy = vi.fn();
      const TestWithDynamicArgs = ({ cb, delay }: { cb: (arg: number) => void; delay: number }) => {
        const debounced = useDebounce(cb, delay);
        return (
          <div>
            <button onClick={() => debounced(1)} data-testid="btn1">
              1
            </button>
            <button onClick={() => debounced(2)} data-testid="btn2">
              2
            </button>
            <button onClick={() => debounced(3)} data-testid="btn3">
              3
            </button>
          </div>
        );
      };

      const { getByTestId } = render(<TestWithDynamicArgs cb={spy} delay={100} />);

      getByTestId("btn1").click();
      getByTestId("btn2").click();
      getByTestId("btn3").click();

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(3);
    });

    it("handles no arguments", () => {
      const spy = vi.fn();
      const TestNoArgs = ({ cb, delay }: { cb: () => void; delay: number }) => {
        const debounced = useDebounce(cb, delay);
        return (
          <button onClick={() => debounced()} data-testid="trigger">
            Click
          </button>
        );
      };

      const { getByTestId } = render(<TestNoArgs cb={spy} delay={100} />);

      getByTestId("trigger").click();

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(spy).toHaveBeenCalledWith();
    });
  });

  describe("Delay Variations", () => {
    it("works with zero delay", () => {
      const spy = vi.fn();
      const { getByTestId } = render(<TestComponent cb={spy} delay={0} />);

      getByTestId("trigger").click();

      act(() => {
        vi.advanceTimersByTime(0);
      });

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("works with very short delay", () => {
      const spy = vi.fn();
      const { getByTestId } = render(<TestComponent cb={spy} delay={1} />);

      getByTestId("trigger").click();

      act(() => {
        vi.advanceTimersByTime(1);
      });

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("works with long delay", () => {
      const spy = vi.fn();
      const { getByTestId } = render(<TestComponent cb={spy} delay={5000} />);

      getByTestId("trigger").click();

      act(() => {
        vi.advanceTimersByTime(4999);
      });

      expect(spy).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(1);
      });

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("handles delay change", () => {
      const spy = vi.fn();
      const { getByTestId, rerender } = render(<TestComponent cb={spy} delay={100} />);

      getByTestId("trigger").click();

      rerender(<TestComponent cb={spy} delay={200} />);

      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Should still use the original delay for the pending call
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe("Callback Updates", () => {
    it("uses callback from when debounced function was created", () => {
      const spy1 = vi.fn();
      const spy2 = vi.fn();

      const { getByTestId, rerender } = render(<TestComponent cb={spy1} delay={100} />);

      getByTestId("trigger").click();

      rerender(<TestComponent cb={spy2} delay={100} />);

      act(() => {
        vi.advanceTimersByTime(100);
      });

      // The debounced function uses the callback from when it was triggered
      expect(spy1).toHaveBeenCalledTimes(1);
      expect(spy2).not.toHaveBeenCalled();
    });
  });

  describe("Real-world Scenarios", () => {
    it("simulates search input debouncing", () => {
      const searchSpy = vi.fn();
      const TestSearch = ({
        onSearch,
        delay,
      }: {
        onSearch: (query: string) => void;
        delay: number;
      }) => {
        const debouncedSearch = useDebounce(onSearch, delay);

        return (
          <div>
            <button onClick={() => debouncedSearch("h")} data-testid="type-h">
              h
            </button>
            <button onClick={() => debouncedSearch("he")} data-testid="type-he">
              he
            </button>
            <button onClick={() => debouncedSearch("hello")} data-testid="type-hello">
              hello
            </button>
          </div>
        );
      };

      const { getByTestId } = render(<TestSearch onSearch={searchSpy} delay={300} />);

      // Simulate typing "hello" rapidly
      getByTestId("type-h").click();

      act(() => {
        vi.advanceTimersByTime(100);
      });

      getByTestId("type-he").click();

      act(() => {
        vi.advanceTimersByTime(100);
      });

      getByTestId("type-hello").click();

      expect(searchSpy).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(searchSpy).toHaveBeenCalledTimes(1);
      expect(searchSpy).toHaveBeenCalledWith("hello");
    });

    it("simulates window resize debouncing", () => {
      const resizeSpy = vi.fn();
      const TestResize = ({ onResize, delay }: { onResize: () => void; delay: number }) => {
        const debouncedResize = useDebounce(onResize, delay);

        return (
          <button onClick={() => debouncedResize()} data-testid="resize">
            Resize
          </button>
        );
      };

      const { getByTestId } = render(<TestResize onResize={resizeSpy} delay={250} />);

      // Simulate multiple resize events
      for (let i = 0; i < 20; i++) {
        getByTestId("resize").click();
        act(() => {
          vi.advanceTimersByTime(50);
        });
      }

      expect(resizeSpy).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(250);
      });

      expect(resizeSpy).toHaveBeenCalledTimes(1);
    });

    it("simulates form validation debouncing", () => {
      const validateSpy = vi.fn();
      const TestValidation = ({
        onValidate,
        delay,
      }: {
        onValidate: (value: string) => void;
        delay: number;
      }) => {
        const debouncedValidate = useDebounce(onValidate, delay);

        return (
          <div>
            <button onClick={() => debouncedValidate("test@")} data-testid="val-1">
              test@
            </button>
            <button onClick={() => debouncedValidate("test@example")} data-testid="val-2">
              test@example
            </button>
            <button onClick={() => debouncedValidate("test@example.com")} data-testid="val-3">
              test@example.com
            </button>
          </div>
        );
      };

      const { getByTestId } = render(<TestValidation onValidate={validateSpy} delay={500} />);

      getByTestId("val-1").click();

      act(() => {
        vi.advanceTimersByTime(200);
      });

      getByTestId("val-2").click();

      act(() => {
        vi.advanceTimersByTime(200);
      });

      getByTestId("val-3").click();

      expect(validateSpy).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(validateSpy).toHaveBeenCalledTimes(1);
      expect(validateSpy).toHaveBeenCalledWith("test@example.com");
    });
  });

  describe("Edge Cases", () => {
    it("handles callback that throws error", async () => {
      const errorCallback = vi.fn(() => {
        throw new Error("Test error");
      });

      // Capture the promise returned by the debounced function so we can assert rejection
      const TestWithPromise = ({ cb, delay, onPromise }: any) => {
        const debounced = useDebounce(cb, delay);
        return (
          <button
            onClick={() => onPromise(debounced("test-arg"))}
            data-testid="trigger"
            type="button"
          >
            Trigger
          </button>
        );
      };

      let promise: Promise<any> | undefined;
      const { getByTestId } = render(
        <TestWithPromise
          cb={errorCallback}
          delay={100}
          onPromise={(p: Promise<any>) => (promise = p)}
        />,
      );

      getByTestId("trigger").click();

      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Ensure the debounced call actulifeline happened
      expect(errorCallback).toHaveBeenCalledTimes(1);

      // Assert the returned promise rejects with the thrown error
      await expect(promise).rejects.toThrow("Test error");
    });

    it("handles async callback", async () => {
      const asyncCallback = vi.fn(async () => {
        return Promise.resolve("done");
      });

      const { getByTestId } = render(<TestComponent cb={asyncCallback} delay={100} />);

      getByTestId("trigger").click();

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(asyncCallback).toHaveBeenCalledTimes(1);
    });

    it("handles multiple debounced functions in same component", () => {
      const spy1 = vi.fn();
      const spy2 = vi.fn();

      const TestMultiple = ({
        cb1,
        cb2,
        delay,
      }: {
        cb1: () => void;
        cb2: () => void;
        delay: number;
      }) => {
        const debounced1 = useDebounce(cb1, delay);
        const debounced2 = useDebounce(cb2, delay);

        return (
          <div>
            <button onClick={() => debounced1()} data-testid="btn1">
              Button 1
            </button>
            <button onClick={() => debounced2()} data-testid="btn2">
              Button 2
            </button>
          </div>
        );
      };

      const { getByTestId } = render(<TestMultiple cb1={spy1} cb2={spy2} delay={100} />);

      getByTestId("btn1").click();
      getByTestId("btn2").click();

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(spy1).toHaveBeenCalledTimes(1);
      expect(spy2).toHaveBeenCalledTimes(1);
    });
  });
});
