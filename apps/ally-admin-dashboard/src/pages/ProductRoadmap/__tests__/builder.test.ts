import { describe, expect, it } from "vitest";

import { seedForHandle } from "../utils/builder";

describe("seedForHandle", () => {
  it("seeds a session this press created", () => {
    expect(
      seedForHandle({ sessionId: "s1", created: true, seedMessage: "## Opportunity\nFix it" }),
    ).toBe("## Opportunity\nFix it");
  });

  it("does NOT re-seed a resumed session", () => {
    // The transcript already opens with the brief. Sending it again shows the same paragraph
    // twice and has the agent answer the repeat.
    expect(
      seedForHandle({ sessionId: "s1", created: false, seedMessage: "## Opportunity\nFix it" }),
    ).toBeNull();
  });

  it("tolerates a created session with no message rather than sending undefined", () => {
    expect(seedForHandle({ sessionId: "s1", created: true, seedMessage: null })).toBeNull();
  });
});
