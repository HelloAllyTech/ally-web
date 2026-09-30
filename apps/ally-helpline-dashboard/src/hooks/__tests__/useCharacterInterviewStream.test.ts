import "@constants";

import { describe, expect, it } from "vitest";

import { characterInterviewStrings } from "@constants";

import { mapServerMessagesToFeed } from "../useCharacterInterviewStream";

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
