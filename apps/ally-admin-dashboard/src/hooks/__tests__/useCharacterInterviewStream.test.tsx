import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { en } from "@constants";
import {
  mapServerMessagesToFeed,
  useCharacterInterviewStream,
} from "@hooks/useCharacterInterviewStream";

vi.mock("sonner", () => ({ toast: { warning: vi.fn(), error: vi.fn() } }));

describe("mapServerMessagesToFeed", () => {
  it("keeps a failed turn on screen after a reload", () => {
    // A turn that died left a row with no prose, which rendered as nothing at
    // all — so the admin's own message sat there answered by silence,
    // indistinguishable from the agent still thinking. That matters most on
    // the final turn, where the character draft is what went missing.
    const feed = mapServerMessagesToFeed([
      { id: "u1", seq: 1, role: "user", content: "Build her now." },
      {
        id: "a1",
        seq: 2,
        role: "assistant",
        content: null,
        metadata: { errored: true, errorMessage: "No character was created." },
      },
    ] as never);

    expect(feed).toHaveLength(2);
    expect(feed[1].error).toBe("No character was created.");
  });

  it("falls back to generic copy when the server sent no reason", () => {
    const feed = mapServerMessagesToFeed([
      { id: "a1", seq: 1, role: "assistant", content: null, metadata: { errored: true } },
    ] as never);

    expect(feed[0].error).toBe(en.characterInterview.streamFailed);
  });

  it("still drops a genuinely empty row that did not fail", () => {
    const feed = mapServerMessagesToFeed([
      { id: "a1", seq: 1, role: "assistant", content: "" },
    ] as never);

    expect(feed).toHaveLength(0);
  });
});

/** A response whose body streams `frames` as SSE, the way the server does. */
const sseResponse = (frames: string[]) =>
  ({
    ok: true,
    status: 200,
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        for (const frame of frames) controller.enqueue(encoder.encode(frame));
        controller.close();
      },
    }),
  }) as unknown as Response;

describe("useCharacterInterviewStream — a refused turn", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /**
   * The session's turn mutex was still held — an earlier turn whose stream the
   * admin had walked away from — so the server never read this message. It
   * used to be rendered as a failed turn: the answer sat in the feed under a
   * raw "another interview turn is already streaming for this session", the
   * question card stayed locked on it, and the only way on was to retype it in
   * the composer. Nothing of it exists server-side, so it should look as if it
   * had never been sent.
   */
  it("rolls the bubbles back and reports that nothing was sent", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          sseResponse([
            'event: error\ndata: {"code":"turn_in_progress","message":"Another interview turn is already streaming for this session"}\n\n',
          ]),
        ),
    );

    const { result } = renderHook(() => useCharacterInterviewStream({ sessionId: "sess-1" }));

    let delivered: boolean | undefined;
    await act(async () => {
      delivered = await result.current.sendMessage("Yes, create the character");
    });

    expect(delivered).toBe(false);
    await waitFor(() => expect(result.current.messages).toHaveLength(0));
  });

  it("keeps a turn the server did run", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          sseResponse([
            'event: token\ndata: {"delta":"Working on it"}\n\n',
            'event: done\ndata: {"messageSeq":2}\n\n',
          ]),
        ),
    );

    const { result } = renderHook(() => useCharacterInterviewStream({ sessionId: "sess-1" }));

    let delivered: boolean | undefined;
    await act(async () => {
      delivered = await result.current.sendMessage("Her name is Asha");
    });

    expect(delivered).toBe(true);
    await waitFor(() => expect(result.current.messages).toHaveLength(2));
  });
});
