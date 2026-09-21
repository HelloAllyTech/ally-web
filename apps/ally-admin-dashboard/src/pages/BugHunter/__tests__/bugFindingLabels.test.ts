import { describe, expect, it } from "vitest";

import { engineModelLabel } from "../bugFindingLabels";

describe("engineModelLabel", () => {
  it("labels claude-code as Claude", () => {
    expect(engineModelLabel("claude-code", "claude-sonnet-5")).toBe("Claude · claude-sonnet-5");
  });

  it("labels gemini as Gemini", () => {
    expect(engineModelLabel("gemini", "gemini-2.5-pro")).toBe("Gemini · gemini-2.5-pro");
  });

  it("falls back to the raw engine string for one this map doesn't know yet", () => {
    expect(engineModelLabel("codex", "gpt-5-codex")).toBe("codex · gpt-5-codex");
  });

  it("returns null when either half hasn't been reported yet", () => {
    expect(engineModelLabel(null, "claude-sonnet-5")).toBeNull();
    expect(engineModelLabel("claude-code", null)).toBeNull();
    expect(engineModelLabel(null, null)).toBeNull();
  });
});
