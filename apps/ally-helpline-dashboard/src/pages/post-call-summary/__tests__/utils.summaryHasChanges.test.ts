import { describe, it, expect } from "vitest";

import { summaryHasChanges } from "../utils";

describe("summaryHasChanges", () => {
  it("returns false when there is no edited data yet", () => {
    expect(summaryHasChanges(undefined as never, null)).toBe(false);
  });

  describe("failed/timed-out session (no original summary)", () => {
    it("returns false when nothing has been entered", () => {
      // What the component seeds for a FAILED session with no generated summary.
      expect(summaryHasChanges(undefined as never, { tags: "" })).toBe(false);
    });

    it("returns true once the counsellor fills in any field", () => {
      // This is the bug fix: previously a missing original summary always
      // returned false, so the report could never be saved.
      expect(
        summaryHasChanges(undefined as never, {
          tags: "",
          sessionSummary: "manually entered",
        }),
      ).toBe(true);
    });

    it("returns true when only tags are entered", () => {
      expect(summaryHasChanges(undefined as never, { tags: "anxiety" })).toBe(true);
    });
  });

  describe("successful session (original summary present)", () => {
    const original = { sessionSummary: "auto summary", tags: [{ tag: "anxiety" }] };

    it("returns false when the data matches the original", () => {
      expect(
        summaryHasChanges(original, {
          sessionSummary: "auto summary",
          tags: "anxiety",
        }),
      ).toBe(false);
    });

    it("returns true when a field was edited", () => {
      expect(
        summaryHasChanges(original, {
          sessionSummary: "edited summary",
          tags: "anxiety",
        }),
      ).toBe(true);
    });
  });
});
