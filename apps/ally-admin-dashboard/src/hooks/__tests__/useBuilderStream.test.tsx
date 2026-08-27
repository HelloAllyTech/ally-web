import { describe, expect, it, vi } from "vitest";

import { en } from "@constants";
import { mapServerMessagesToFeed } from "@hooks/useBuilderStream";
import { BuilderServerMessage } from "@types";

vi.mock("sonner", () => ({ toast: { warning: vi.fn(), error: vi.fn() } }));

const message = (overrides: Partial<BuilderServerMessage>): BuilderServerMessage => ({
  id: "m1",
  seq: 1,
  role: "assistant",
  content: null,
  createdAt: "2026-08-27T00:00:00.000Z",
  ...overrides,
});

describe("mapServerMessagesToFeed", () => {
  it("keeps a failed turn on screen after a reload", () => {
    // The bug this guards: a turn that died left a row with no prose and no
    // tool results, which rendered as nothing at all — so the admin's own
    // message sat there answered by silence, indistinguishable from the agent
    // still thinking.
    const feed = mapServerMessagesToFeed([
      message({ id: "u1", role: "user", content: "complete the PRD" }),
      message({
        id: "a1",
        metadata: { errored: true, errorMessage: "That turn ran past the response limit." },
      }),
    ]);

    expect(feed).toHaveLength(2);
    expect(feed[1].error).toBe("That turn ran past the response limit.");
  });

  it("falls back to generic copy when the server sent no reason", () => {
    const feed = mapServerMessagesToFeed([message({ metadata: { errored: true } })]);

    expect(feed[0].error).toBe(en.builder.chat.streamFailed);
  });

  it("still drops a genuinely empty row that did not fail", () => {
    const feed = mapServerMessagesToFeed([message({ content: "" })]);

    expect(feed).toHaveLength(0);
  });
});
