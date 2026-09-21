import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useVoicePreview } from "../useVoicePreview";

/**
 * The shared audition player. The behaviour worth pinning is the cache key:
 * the same voice is auditioned saying different lines, and the two players this
 * replaced cached per voice — which would have replayed the first line forever.
 */

const mocks = vi.hoisted(() => {
  const unwrap = vi.fn();
  const trigger = vi.fn(() => ({ unwrap }));
  return { trigger, unwrap };
});

vi.mock("@api", () => ({
  useLazyGetPreviewVoiceQuery: () => [mocks.trigger],
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const played: string[] = [];

beforeEach(() => {
  mocks.trigger.mockClear();
  mocks.unwrap.mockReset();
  mocks.unwrap.mockResolvedValue(new ArrayBuffer(8));
  played.length = 0;

  let counter = 0;
  globalThis.URL.createObjectURL = vi.fn(() => `blob:preview-${++counter}`);
  globalThis.URL.revokeObjectURL = vi.fn();
  // jsdom has no real audio pipeline.
  globalThis.Audio = vi.fn().mockImplementation((src: string) => ({
    play: vi.fn(() => {
      played.push(src);
      return Promise.resolve();
    }),
    pause: vi.fn(),
    onended: null,
    onerror: null,
  })) as unknown as typeof Audio;
});

describe("useVoicePreview", () => {
  it("passes the audition text through to the preview request", async () => {
    const { result } = renderHook(() => useVoicePreview());

    await act(() => result.current.play("voice-1", "I'm managing fine."));

    expect(mocks.trigger).toHaveBeenCalledWith({
      voiceId: "voice-1",
      text: "I'm managing fine.",
    });
    expect(result.current.playingVoiceId).toBe("voice-1");
  });

  it("re-fetches the same voice for a different line", async () => {
    const { result } = renderHook(() => useVoicePreview());

    await act(() => result.current.play("voice-1", "First line."));
    await act(() => result.current.pause());
    await act(() => result.current.play("voice-1", "A different line."));

    // Keyed per (voice, text): a per-voice cache would have replayed "First
    // line." while the label said otherwise.
    expect(mocks.trigger).toHaveBeenCalledTimes(2);
    expect(played).toEqual(["blob:preview-1", "blob:preview-2"]);
  });

  it("serves the same voice and line from cache", async () => {
    const { result } = renderHook(() => useVoicePreview());

    await act(() => result.current.play("voice-1", "Same line."));
    await act(() => result.current.pause());
    await act(() => result.current.play("voice-1", "Same line."));

    expect(mocks.trigger).toHaveBeenCalledTimes(1);
    expect(played).toEqual(["blob:preview-1", "blob:preview-1"]);
  });

  it("treats a click on the playing voice as a pause", async () => {
    const { result } = renderHook(() => useVoicePreview());

    await act(() => result.current.play("voice-1"));
    expect(result.current.playingVoiceId).toBe("voice-1");

    await act(() => result.current.play("voice-1"));

    expect(result.current.playingVoiceId).toBeNull();
    expect(mocks.trigger).toHaveBeenCalledTimes(1);
  });

  it("clears the row and warns when a preview fails", async () => {
    const { toast } = await import("sonner");
    mocks.unwrap.mockRejectedValue(new Error("500"));
    const { result } = renderHook(() => useVoicePreview());

    await act(() => result.current.play("voice-1"));

    // A provider outage (an expired Google credential, say) must not leave a
    // row stuck spinning.
    expect(result.current.playingVoiceId).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(toast.error).toHaveBeenCalled();
  });

  it("stops and releases its blobs on unmount", async () => {
    const { result, unmount } = renderHook(() => useVoicePreview());
    await act(() => result.current.play("voice-1"));

    unmount();

    // A side panel closed mid-preview would otherwise keep talking, and every
    // audition would leak a URL until reload.
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview-1");
  });

  it("forwards text verbatim, leaving the API layer to drop a blank one", async () => {
    const { result } = renderHook(() => useVoicePreview());

    await act(() => result.current.play("voice-1", "   "));

    // previewVoice.ts is what omits a blank `text` from the query string, so
    // the backend keeps choosing its per-language default sample.
    expect(mocks.trigger).toHaveBeenCalledWith({ voiceId: "voice-1", text: "   " });
  });
});
