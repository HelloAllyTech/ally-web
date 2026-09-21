import { describe, expect, it } from "vitest";

import { CodingAgentCostPoint, CodingAgentModelBreakdown } from "@types";

import {
  CODING_AGENT_GROUPS,
  buildCodingAgentTrend,
  buildModelBreakdown,
} from "../codingAgentChart";

const point = (over: Partial<CodingAgentCostPoint> = {}): CodingAgentCostPoint => ({
  bucket: "2024-06-10",
  costUsd: { "bug-hunter": 0, builder: 0 },
  calls: { "bug-hunter": 0, builder: 0 },
  ...over,
});

const row = (over: Partial<CodingAgentModelBreakdown> = {}): CodingAgentModelBreakdown => ({
  agent: "bug-hunter",
  model: "claude-sonnet-5",
  costUsd: 0,
  calls: 0,
  priced: true,
  ...over,
});

describe("buildCodingAgentTrend", () => {
  it("emits one datum per agent per bucket, even when one agent spent nothing", () => {
    const series = buildCodingAgentTrend([
      point({ bucket: "2024-06-10", costUsd: { "bug-hunter": 3, builder: 0 } }),
    ]);

    expect(series).toEqual([
      { group: CODING_AGENT_GROUPS["bug-hunter"], key: "2024-06-10", value: 3 },
      { group: CODING_AGENT_GROUPS.builder, key: "2024-06-10", value: 0 },
    ]);
  });

  it("keeps every bucket's pair, so a gap-filled zero-spend day still shows both series", () => {
    const series = buildCodingAgentTrend([point({ bucket: "2024-06-10" }), point({ bucket: "2024-06-11" })]);

    expect(series).toHaveLength(4);
  });
});

describe("buildModelBreakdown", () => {
  it("keeps only the requested agent's rows", () => {
    const rows = [
      row({ agent: "bug-hunter", model: "claude-sonnet-5", costUsd: 1 }),
      row({ agent: "builder", model: "claude-opus-5", costUsd: 2 }),
    ];

    expect(buildModelBreakdown(rows, "bug-hunter")).toEqual([
      { group: "claude-sonnet-5", value: 1 },
    ]);
  });

  it("sorts most expensive model first", () => {
    const rows = [
      row({ agent: "bug-hunter", model: "claude-haiku-4-5", costUsd: 1 }),
      row({ agent: "bug-hunter", model: "claude-opus-5", costUsd: 9 }),
    ];

    expect(buildModelBreakdown(rows, "bug-hunter").map(d => d.group)).toEqual([
      "claude-opus-5",
      "claude-haiku-4-5",
    ]);
  });
});
