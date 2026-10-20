import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ImageGenerationJob } from "@types";

import {
  IMAGE_GENERATION_FAILED_MESSAGE,
  ImageGenerationError,
  useImageGenerationJob,
  waitForImageJob,
} from "../useImageGenerationJob";

const job = (overrides: Partial<ImageGenerationJob> = {}): ImageGenerationJob => ({
  jobId: "job-1",
  status: "running",
  startedAt: "2026-10-20T00:00:00Z",
  ...overrides,
});

/** A clock that advances only when the poller sleeps. */
const fakeClock = () => {
  let t = 0;
  return {
    now: () => t,
    sleep: vi.fn(async (ms: number) => {
      t += ms;
    }),
  };
};

describe("waitForImageJob", () => {
  it("polls a running job until it succeeds and returns the image", async () => {
    const clock = fakeClock();
    const poll = vi
      .fn()
      .mockResolvedValueOnce(job())
      .mockResolvedValueOnce(job({ status: "succeeded", imageUrl: "https://cdn/a.png" }));

    const url = await waitForImageJob(job(), { poll, isCancelled: () => false, ...clock });

    expect(url).toBe("https://cdn/a.png");
    expect(poll).toHaveBeenCalledTimes(2);
    expect(poll).toHaveBeenCalledWith("job-1");
    expect(clock.sleep).toHaveBeenCalledTimes(2);
  });

  it("returns at once for a job that already finished", async () => {
    const poll = vi.fn();
    const url = await waitForImageJob(job({ status: "succeeded", imageUrl: "https://cdn/b.png" }), {
      poll,
      isCancelled: () => false,
    });
    expect(url).toBe("https://cdn/b.png");
    expect(poll).not.toHaveBeenCalled();
  });

  it("rejects with the job's own wording when it fails", async () => {
    const poll = vi.fn().mockResolvedValue(job({ status: "failed", error: "Try rewording it." }));
    await expect(
      waitForImageJob(job(), { poll, isCancelled: () => false, ...fakeClock() }),
    ).rejects.toEqual(new ImageGenerationError("Try rewording it."));
  });

  it("rides out a dropped poll or two (a deploy, a blip)", async () => {
    const poll = vi
      .fn()
      .mockRejectedValueOnce({ status: 502 })
      .mockRejectedValueOnce({ status: "FETCH_ERROR" })
      .mockResolvedValueOnce(job({ status: "succeeded", imageUrl: "https://cdn/c.png" }));

    await expect(
      waitForImageJob(job(), { poll, isCancelled: () => false, ...fakeClock() }),
    ).resolves.toBe("https://cdn/c.png");
  });

  it("gives up after three failed polls in a row", async () => {
    const poll = vi.fn().mockRejectedValue({ status: 502 });
    await expect(
      waitForImageJob(job(), { poll, isCancelled: () => false, ...fakeClock() }),
    ).rejects.toEqual(new ImageGenerationError(IMAGE_GENERATION_FAILED_MESSAGE));
    expect(poll).toHaveBeenCalledTimes(3);
  });

  it("stops at once on a 404 — an expired job won't come back", async () => {
    const poll = vi.fn().mockRejectedValue({
      status: 404,
      data: { message: "That image request has expired. Generate a new one." },
    });
    await expect(
      waitForImageJob(job(), { poll, isCancelled: () => false, ...fakeClock() }),
    ).rejects.toEqual(
      new ImageGenerationError("That image request has expired. Generate a new one."),
    );
    expect(poll).toHaveBeenCalledTimes(1);
  });

  it("stops waiting past the cap even if polls keep saying running", async () => {
    const poll = vi.fn().mockResolvedValue(job());
    await expect(
      waitForImageJob(job(), {
        poll,
        isCancelled: () => false,
        intervalMs: 1_000,
        maxWaitMs: 5_000,
        ...fakeClock(),
      }),
    ).rejects.toBeInstanceOf(ImageGenerationError);
    expect(poll.mock.calls.length).toBeLessThanOrEqual(5);
  });

  it("returns null without polling further once the caller has gone", async () => {
    let cancelled = false;
    const poll = vi.fn().mockImplementation(async () => {
      cancelled = true;
      return job();
    });
    await expect(
      waitForImageJob(job(), { poll, isCancelled: () => cancelled, ...fakeClock() }),
    ).resolves.toBeNull();
    expect(poll).toHaveBeenCalledTimes(1);
  });
});

describe("useImageGenerationJob", () => {
  it("is busy from the click until the image arrives", async () => {
    let resolveStart!: (value: ImageGenerationJob) => void;
    const start = vi.fn(
      () =>
        new Promise<ImageGenerationJob>(resolve => {
          resolveStart = resolve;
        }),
    );
    const { result } = renderHook(() => useImageGenerationJob(start, vi.fn()));

    let pending!: Promise<string | null>;
    act(() => {
      pending = result.current.generate({ prompt: "a bench" });
    });
    expect(result.current.isGenerating).toBe(true);
    expect(start).toHaveBeenCalledWith({ prompt: "a bench" });

    await act(async () => {
      resolveStart(job({ status: "succeeded", imageUrl: "https://cdn/d.png" }));
      await expect(pending).resolves.toBe("https://cdn/d.png");
    });
    expect(result.current.isGenerating).toBe(false);
  });

  it("turns a refused start into a sentence, never a raw validation array", async () => {
    const start = vi.fn().mockRejectedValue({
      status: 400,
      data: { message: ["prompt must be shorter than or equal to 4000 characters"] },
    });
    const { result } = renderHook(() => useImageGenerationJob(start, vi.fn()));

    await act(async () => {
      await expect(result.current.generate({})).rejects.toEqual(
        new ImageGenerationError(IMAGE_GENERATION_FAILED_MESSAGE),
      );
    });
    expect(result.current.isGenerating).toBe(false);
  });

  it("passes the backend's sentence through when the start is refused with one", async () => {
    const start = vi.fn().mockRejectedValue({
      status: 503,
      data: { message: "Image generation isn't set up on this environment." },
    });
    const { result } = renderHook(() => useImageGenerationJob(start, vi.fn()));

    await act(async () => {
      await expect(result.current.generate({})).rejects.toEqual(
        new ImageGenerationError("Image generation isn't set up on this environment."),
      );
    });
  });
});
