import { describe, expect, it } from "vitest";

import { buildBuiltinFilterParams } from "./builtinFilters";

describe("buildBuiltinFilterParams", () => {
  it("maps date, duration (min->sec), and select groups", () => {
    const params = buildBuiltinFilterParams([
      { key: "dateAndTime", value: ["2026-01-01", "2026-02-01"] },
      { key: "duration", value: ["5", "10"] },
      { key: "mode", value: ["SCRIBE", "DICTATION"] },
      { key: "summaryStatus", value: ["SUCCESS", "FAILED"] },
      { key: "source", value: ["UPLOAD"] },
      { key: "tags", value: ["anxiety", "grief"] },
      { key: "callName", value: "hi" },
      { key: "cf_x", value: "ignored" },
    ]);
    expect(params).toEqual({
      startDate: "2026-01-01",
      endDate: "2026-02-01",
      minDuration: 300,
      maxDuration: 600,
      mode: "SCRIBE,DICTATION",
      status: "SUCCESS,FAILED",
      source: "UPLOAD",
      tags: "anxiety,grief",
    });
  });

  it("accepts the admin duration column key (callDuration)", () => {
    const params = buildBuiltinFilterParams([{ key: "callDuration", value: ["", "15"] }]);
    expect(params.minDuration).toBeUndefined();
    expect(params.maxDuration).toBe(900);
  });

  it("leaves unset params undefined", () => {
    const params = buildBuiltinFilterParams([{ key: "mode", value: [] }]);
    expect(params.mode).toBeUndefined();
    expect(params.status).toBeUndefined();
    expect(params.startDate).toBeUndefined();
  });
});
