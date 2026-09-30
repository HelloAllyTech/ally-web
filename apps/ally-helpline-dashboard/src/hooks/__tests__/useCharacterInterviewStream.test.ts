import "@constants";

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { characterInterviewStrings } from "@constants";

import {
  mapServerMessagesToFeed,
  useCharacterInterviewStream,
} from "../useCharacterInterviewStream";

describe("mapServerMessagesToFeed", () => {
  it("shows a turn that failed mid-flight instead of rendering it as silence", () => {
    const feed = mapServerMessagesToFeed([
      { id: "u1", seq: 1, role: "user", content: "Looks right — create the character" },
      { id: "a1", seq: 2, role: "assistant", content: "", metadata: { errored: true } },
    ]);

    expect(feed).toHaveLength(2);
    expect(feed[1]).toMatchObject({
      id: "a1",
      role: "assistant",
      error: characterInterviewStrings.streamFailed,
    });
  });

  it("uses the server's own error message when it recorded one", () => {
    const feed = mapServerMessagesToFeed([
      {
        id: "a1",
        role: "assistant",
        content: "",
        metadata: { errored: true, errorMessage: "The draft was too long to finish." },
      },
    ]);

    expect(feed[0].error).toBe("The draft was too long to finish.");
  });

  it("still skips an empty assistant row that did not fail", () => {
    expect(mapServerMessagesToFeed([{ id: "a1", role: "assistant", content: "" }])).toEqual([]);
  });
});

describe("useCharacterInterviewStream — a broken connection", () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const failOnce = () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("network error"));
  };

  it("shows no failure when the caller finds the turn completed server-side", async () => {
    failOnce();
    const onStreamFailed = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() =>
      useCharacterInterviewStream({ sessionId: "s1", onStreamFailed }),
    );

    await act(async () => {
      await result.current.sendMessage("Looks right — create the character");
    });

    expect(onStreamFailed).toHaveBeenCalledTimes(1);
    expect(result.current.messages.some(message => message.error)).toBe(false);
  });

  it("still shows the failure when nothing was completed", async () => {
    failOnce();
    const { result } = renderHook(() =>
      useCharacterInterviewStream({
        sessionId: "s1",
        onStreamFailed: vi.fn().mockResolvedValue(false),
      }),
    );

    await act(async () => {
      await result.current.sendMessage("Looks right — create the character");
    });

    expect(result.current.messages.at(-1)?.error).toBe(characterInterviewStrings.streamFailed);
  });
});
