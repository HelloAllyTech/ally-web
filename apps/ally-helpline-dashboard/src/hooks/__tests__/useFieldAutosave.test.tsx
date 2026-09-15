import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useFieldAutosave } from "../useFieldAutosave";

// Fake timers are on, so RTL's waitFor (which polls on timers) would hang.
// Settling the promise chain by hand is enough: every state change here happens
// within a few microtask turns of the write resolving.
const settle = async (turns = 8) => {
  for (let i = 0; i < turns; i += 1) await Promise.resolve();
};

describe("useFieldAutosave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const deferred = () => {
    let resolve!: () => void;
    let reject!: (e?: unknown) => void;
    const promise = new Promise<void>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };

  it("writes only the edited keys, grouped by channel", async () => {
    const onPersist = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useFieldAutosave({ onPersist, delayMs: 500 }));

    act(() => {
      result.current.edit("summary", "keyConcerns", "typed");
      result.current.edit("custom", "cf-1", "value");
    });
    expect(onPersist).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(onPersist).toHaveBeenCalledTimes(1);
    expect(onPersist).toHaveBeenCalledWith({
      summary: { keyConcerns: "typed" },
      custom: { "cf-1": "value" },
    });
  });

  it("debounces so a burst of typing produces one write", async () => {
    const onPersist = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useFieldAutosave({ onPersist, delayMs: 500 }));

    act(() => {
      result.current.edit("summary", "keyConcerns", "a");
      vi.advanceTimersByTime(200);
      result.current.edit("summary", "keyConcerns", "ab");
      vi.advanceTimersByTime(200);
      result.current.edit("summary", "keyConcerns", "abc");
    });
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(onPersist).toHaveBeenCalledTimes(1);
    expect(onPersist).toHaveBeenCalledWith({ summary: { keyConcerns: "abc" } });
  });

  it("reports saved and clears dirty only after the write resolves", async () => {
    const gate = deferred();
    const onPersist = vi.fn().mockReturnValue(gate.promise);
    const { result } = renderHook(() => useFieldAutosave({ onPersist, delayMs: 100 }));

    act(() => {
      result.current.edit("summary", "keyConcerns", "typed");
    });
    expect(result.current.isDirty).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.saveState).toBe("saving");
    expect(result.current.isDirty).toBe(true);

    await act(async () => {
      gate.resolve();
      await gate.promise;
    });

    expect(result.current.saveState).toBe("saved");
    expect(result.current.isDirty).toBe(false);
  });

  it("keeps the edit pending and reports error when the write fails", async () => {
    const onPersist = vi.fn().mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useFieldAutosave({ onPersist, delayMs: 100 }));

    act(() => {
      result.current.edit("summary", "keyConcerns", "typed");
    });
    await act(async () => {
      vi.advanceTimersByTime(100);
      await settle();
    });

    expect(result.current.saveState).toBe("error");
    // The edit must still be there to retry — a failed write that also discards
    // the data is the exact silent-loss behaviour this replaces.
    expect(result.current.isDirty).toBe(true);
    expect(result.current.getPending()).toEqual({ summary: { keyConcerns: "typed" } });
  });

  it("retries a failed write on its own, without waiting for a new edit", async () => {
    // Mirrors Create Note's dictation flow: fields are filled once from the
    // transcript and flushed, then nothing else edits the form. If that one
    // write fails, "Couldn't save — we'll keep trying" is a lie unless a retry
    // actually fires without another edit ever arriving.
    const onPersist = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useFieldAutosave({ onPersist, delayMs: 100 }));

    act(() => {
      result.current.edit("summary", "keyConcerns", "typed");
    });
    await act(async () => {
      vi.advanceTimersByTime(100);
      await settle();
    });
    expect(result.current.saveState).toBe("error");
    expect(onPersist).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(100);
      await settle();
    });

    expect(onPersist).toHaveBeenCalledTimes(2);
    expect(result.current.saveState).toBe("saved");
    expect(result.current.isDirty).toBe(false);
  });

  it("does not drop a keystroke that lands while a write is in flight", async () => {
    const gate = deferred();
    const onPersist = vi.fn().mockReturnValueOnce(gate.promise).mockResolvedValue(undefined);
    const { result } = renderHook(() => useFieldAutosave({ onPersist, delayMs: 100 }));

    act(() => {
      result.current.edit("summary", "keyConcerns", "first");
    });
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(onPersist).toHaveBeenCalledWith({ summary: { keyConcerns: "first" } });

    // Typed during the request.
    act(() => {
      result.current.edit("summary", "keyConcerns", "second");
    });

    await act(async () => {
      gate.resolve();
      vi.advanceTimersByTime(100);
      await settle();
    });

    expect(onPersist).toHaveBeenCalledTimes(2);
    expect(onPersist).toHaveBeenLastCalledWith({ summary: { keyConcerns: "second" } });
    expect(result.current.isDirty).toBe(false);
  });

  it("does not leave the rerun write's rejection unhandled", async () => {
    // Mirrors: an edit lands while a write is in flight (queues a rerun), the
    // in-flight write settles, and the rerun write it triggers also fails. Every
    // other internal write() call is wrapped in .catch(() => {}); the rerun
    // continuation in write()'s own finally block is not, so a failure there
    // used to surface as an unhandled-promise-rejection console error.
    const unhandled: unknown[] = [];
    const onUnhandledRejection = (reason: unknown) => unhandled.push(reason);
    process.on("unhandledRejection", onUnhandledRejection);

    try {
      const gate = deferred();
      const onPersist = vi
        .fn()
        .mockReturnValueOnce(gate.promise)
        .mockRejectedValueOnce(new Error("rerun failed"))
        .mockResolvedValue(undefined);
      const { result } = renderHook(() => useFieldAutosave({ onPersist, delayMs: 100 }));

      act(() => {
        result.current.edit("summary", "keyConcerns", "first");
      });
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      expect(onPersist).toHaveBeenCalledTimes(1);

      // Lands while the first write is still in flight — queues a rerun.
      act(() => {
        result.current.edit("summary", "keyConcerns", "second");
      });
      await act(async () => {
        vi.advanceTimersByTime(100);
        await settle();
      });
      expect(onPersist).toHaveBeenCalledTimes(1);

      await act(async () => {
        gate.resolve();
        await settle(20);
      });

      expect(onPersist).toHaveBeenCalledTimes(2);
      expect(unhandled).toEqual([]);
    } finally {
      process.off("unhandledRejection", onUnhandledRejection);
    }
  });

  it("never runs two writes concurrently", async () => {
    const gate = deferred();
    let concurrent = 0;
    let maxConcurrent = 0;
    const onPersist = vi.fn().mockImplementation(async () => {
      concurrent += 1;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await gate.promise;
      concurrent -= 1;
    });
    const { result } = renderHook(() => useFieldAutosave({ onPersist, delayMs: 50 }));

    act(() => {
      result.current.edit("summary", "a", "1");
    });
    await act(async () => {
      vi.advanceTimersByTime(50);
    });
    act(() => {
      result.current.edit("summary", "b", "2");
    });
    void result.current.flush();

    await act(async () => {
      gate.resolve();
      await gate.promise;
    });

    expect(maxConcurrent).toBe(1);
  });

  it("flush writes immediately without waiting for the debounce", async () => {
    const onPersist = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useFieldAutosave({ onPersist, delayMs: 10_000 }));

    act(() => {
      result.current.edit("summary", "keyConcerns", "typed");
    });
    await act(async () => {
      await result.current.flush();
    });

    expect(onPersist).toHaveBeenCalledTimes(1);
  });

  it("flush is a no-op when there is nothing pending", async () => {
    const onPersist = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useFieldAutosave({ onPersist }));

    await act(async () => {
      await result.current.flush();
    });

    expect(onPersist).not.toHaveBeenCalled();
  });

  it("writes pending edits on unmount so the last keystroke is not lost", async () => {
    const onPersist = vi.fn().mockResolvedValue(undefined);
    const { result, unmount } = renderHook(() => useFieldAutosave({ onPersist, delayMs: 10_000 }));

    act(() => {
      result.current.edit("summary", "keyConcerns", "typed just before closing");
    });
    unmount();

    expect(onPersist).toHaveBeenCalledWith({
      summary: { keyConcerns: "typed just before closing" },
    });
  });

  it("does not fire a concurrent duplicate write on unmount when a save is already in flight", async () => {
    // Mirrors "never runs two writes concurrently", but for the unmount path:
    // closing the form the instant an earlier keystroke's autosave is still in
    // flight must queue behind it, not fire a second overlapping request that
    // could land out of order and clobber the newer edit.
    const gate = deferred();
    let concurrent = 0;
    let maxConcurrent = 0;
    const onPersist = vi.fn().mockImplementation(async () => {
      concurrent += 1;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await gate.promise;
      concurrent -= 1;
    });
    const { result, unmount } = renderHook(() => useFieldAutosave({ onPersist, delayMs: 100 }));

    act(() => {
      result.current.edit("summary", "keyConcerns", "first");
    });
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(onPersist).toHaveBeenCalledTimes(1);

    // Typed while the first request is still in flight.
    act(() => {
      result.current.edit("summary", "keyConcerns", "second");
    });

    unmount();

    expect(maxConcurrent).toBe(1);

    await act(async () => {
      gate.resolve();
      await settle();
    });

    // The newer edit still gets written, just after the first settles.
    expect(onPersist).toHaveBeenCalledTimes(2);
    expect(onPersist).toHaveBeenLastCalledWith({ summary: { keyConcerns: "second" } });
  });

  it("does not write on unmount when nothing is pending", () => {
    const onPersist = vi.fn().mockResolvedValue(undefined);
    const { unmount } = renderHook(() => useFieldAutosave({ onPersist }));

    unmount();

    expect(onPersist).not.toHaveBeenCalled();
  });

  it("reset discards pending edits instead of writing them", async () => {
    const onPersist = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useFieldAutosave({ onPersist, delayMs: 100 }));

    act(() => {
      result.current.edit("summary", "keyConcerns", "belongs to the previous session");
      result.current.reset();
    });
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(onPersist).not.toHaveBeenCalled();
    expect(result.current.isDirty).toBe(false);
    expect(result.current.saveState).toBe("idle");
  });

  it("tracks edits but never writes them when disabled", async () => {
    const onPersist = vi.fn().mockResolvedValue(undefined);
    const { result, unmount } = renderHook(() =>
      useFieldAutosave({ onPersist, delayMs: 100, enabled: false }),
    );

    act(() => {
      result.current.edit("summary", "keyConcerns", "typed");
    });
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(onPersist).not.toHaveBeenCalled();
    expect(result.current.isDirty).toBe(true);
    // Not even on unmount — a read-only viewer must not write.
    unmount();
    expect(onPersist).not.toHaveBeenCalled();
  });

  it("backs off exponentially instead of retrying at a fixed interval", async () => {
    // A form left open through an outage used to make a request every delayMs
    // for as long as the tab stayed up. The first retry still comes after the
    // normal delay; each one after that waits twice as long.
    const onPersist = vi.fn().mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useFieldAutosave({ onPersist, delayMs: 100 }));

    act(() => {
      result.current.edit("summary", "keyConcerns", "typed");
    });

    await act(async () => {
      vi.advanceTimersByTime(100);
      await settle();
    });
    expect(onPersist).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(100);
      await settle();
    });
    expect(onPersist).toHaveBeenCalledTimes(2);

    // Fixed-interval retrying would fire a third time here.
    await act(async () => {
      vi.advanceTimersByTime(100);
      await settle();
    });
    expect(onPersist).toHaveBeenCalledTimes(2);

    await act(async () => {
      vi.advanceTimersByTime(100);
      await settle();
    });
    expect(onPersist).toHaveBeenCalledTimes(3);
  });

  it("caps the backoff so retries keep coming through a long outage", async () => {
    const onPersist = vi.fn().mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useFieldAutosave({ onPersist, delayMs: 20_000 }));

    act(() => {
      result.current.edit("summary", "keyConcerns", "typed");
    });
    await act(async () => {
      vi.advanceTimersByTime(20_000);
      await settle();
    });
    await act(async () => {
      vi.advanceTimersByTime(20_000);
      await settle();
    });
    expect(onPersist).toHaveBeenCalledTimes(2);

    // Unchecked doubling would put the next attempt 40s out. The 30s ceiling is
    // what keeps "we'll keep trying" from degrading into "eventually, maybe".
    await act(async () => {
      vi.advanceTimersByTime(29_999);
      await settle();
    });
    expect(onPersist).toHaveBeenCalledTimes(2);

    await act(async () => {
      vi.advanceTimersByTime(1);
      await settle();
    });
    expect(onPersist).toHaveBeenCalledTimes(3);
  });

  it("does not let a keystroke pull the retry back to the base delay", async () => {
    // Typing through an outage is the case that hammers hardest: every
    // keystroke used to reschedule the write at delayMs, erasing the backoff.
    const onPersist = vi.fn().mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useFieldAutosave({ onPersist, delayMs: 100 }));

    act(() => {
      result.current.edit("summary", "keyConcerns", "a");
    });
    await act(async () => {
      vi.advanceTimersByTime(100);
      await settle();
    });
    await act(async () => {
      vi.advanceTimersByTime(100);
      await settle();
    });
    expect(onPersist).toHaveBeenCalledTimes(2);

    act(() => {
      result.current.edit("summary", "keyConcerns", "ab");
    });
    await act(async () => {
      vi.advanceTimersByTime(100);
      await settle();
    });
    expect(onPersist).toHaveBeenCalledTimes(2);

    // The pending retry still fires on its own schedule, carrying the newest value.
    await act(async () => {
      vi.advanceTimersByTime(100);
      await settle();
    });
    expect(onPersist).toHaveBeenCalledTimes(3);
    expect(onPersist).toHaveBeenLastCalledWith({ summary: { keyConcerns: "ab" } });
  });

  it("clears the backoff once a write lands", async () => {
    const onPersist = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(undefined)
      .mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useFieldAutosave({ onPersist, delayMs: 100 }));

    act(() => {
      result.current.edit("summary", "keyConcerns", "a");
    });
    await act(async () => {
      vi.advanceTimersByTime(100);
      await settle();
    });
    await act(async () => {
      vi.advanceTimersByTime(100);
      await settle();
    });
    await act(async () => {
      vi.advanceTimersByTime(200);
      await settle();
    });
    expect(onPersist).toHaveBeenCalledTimes(3);
    expect(result.current.saveState).toBe("saved");

    // A blip earlier in the session must not leave later writes crawling.
    act(() => {
      result.current.edit("summary", "keyConcerns", "b");
    });
    await act(async () => {
      vi.advanceTimersByTime(100);
      await settle();
    });
    expect(onPersist).toHaveBeenCalledTimes(4);
    await act(async () => {
      vi.advanceTimersByTime(100);
      await settle();
    });
    expect(onPersist).toHaveBeenCalledTimes(5);
  });

  it("flush tries straight away instead of waiting out a backoff", async () => {
    // Pressing Save is the counsellor's escape hatch when the indicator has
    // been sitting on "couldn't save" and they want to know now.
    const onPersist = vi.fn().mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useFieldAutosave({ onPersist, delayMs: 100 }));

    act(() => {
      result.current.edit("summary", "keyConcerns", "typed");
    });
    await act(async () => {
      vi.advanceTimersByTime(100);
      await settle();
    });
    await act(async () => {
      vi.advanceTimersByTime(100);
      await settle();
    });
    expect(onPersist).toHaveBeenCalledTimes(2);

    await act(async () => {
      await result.current.flush().catch(() => {});
      await settle();
    });
    expect(onPersist).toHaveBeenCalledTimes(3);
  });

  it("stops claiming 'saved' once a new edit arrives", async () => {
    const onPersist = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useFieldAutosave({ onPersist, delayMs: 100 }));

    act(() => {
      result.current.edit("summary", "a", "1");
    });
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.saveState).toBe("saved");

    act(() => {
      result.current.edit("summary", "a", "2");
    });
    expect(result.current.saveState).not.toBe("saved");
  });
});
