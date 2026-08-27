import { describe, expect, it, vi } from "vitest";

import { en } from "@constants";
import { mapServerMessagesToFeed } from "@hooks/useCharacterInterviewStream";

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
