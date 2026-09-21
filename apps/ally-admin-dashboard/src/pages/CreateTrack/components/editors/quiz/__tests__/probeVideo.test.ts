import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { probeVideo } from "../questionMediaProbe";

/**
 * A `<video>` stub that fires whichever events the test wants — including
 * none at all, which is the case that matters: a container Chrome cannot
 * decode can sit at readyState 0 and never fire `loadeddata` *or* `error`.
 * Before the timeout existed, that left `probeVideo` pending forever and
 * the trainer's upload silently never started — no video, no message.
 */
const installVideoStub = (behaviour: "none" | "error" | "loaded") => {
  const realCreate = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
    if (tag !== "video") return realCreate(tag);
    const el: Record<string, unknown> = {
      preload: "",
      muted: false,
      playsInline: false,
      duration: NaN,
      videoWidth: 0,
      videoHeight: 0,
      onloadeddata: null,
      onerror: null,
      onseeked: null,
      currentTime: 0,
    };
    Object.defineProperty(el, "src", {
      set() {
        if (behaviour === "error") queueMicrotask(() => (el.onerror as () => void)?.());
        if (behaviour === "loaded") {
          el.duration = 12;
          el.videoWidth = 640;
          el.videoHeight = 360;
          queueMicrotask(() => (el.onloadeddata as () => void)?.());
        }
      },
    });
    return el;
  }) as typeof document.createElement);
};

describe("probeVideo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.URL.createObjectURL = vi.fn(() => "blob:stub");
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const file = () => new File([new Uint8Array([1, 2, 3])], "clip.webm", { type: "video/webm" });

  it("gives up and resolves when the browser never fires an event at all", async () => {
    installVideoStub("none");
    const pending = probeVideo(file());
    await vi.advanceTimersByTimeAsync(11_000);
    await expect(pending).resolves.toEqual({ durationSeconds: undefined });
  });

  it("resolves on a decode error instead of rejecting", async () => {
    installVideoStub("error");
    const pending = probeVideo(file());
    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toEqual({ durationSeconds: undefined });
  });

  it("reads the duration off a decodable clip", async () => {
    installVideoStub("loaded");
    const pending = probeVideo(file());
    await vi.advanceTimersByTimeAsync(11_000);
    await expect(pending).resolves.toMatchObject({ durationSeconds: 12 });
  });

  it("revokes the object URL on every path, so a probe never leaks one", async () => {
    installVideoStub("none");
    const pending = probeVideo(file());
    await vi.advanceTimersByTimeAsync(11_000);
    await pending;
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:stub");
  });
});
