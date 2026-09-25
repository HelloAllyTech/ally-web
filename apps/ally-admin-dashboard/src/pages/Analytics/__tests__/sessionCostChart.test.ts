import { describe, expect, it } from "vitest";

import { RoleplaySessionCostPoint, SessionCostComponentDef } from "@types";

import {
  buildPerMinuteStack,
  componentScale,
  coverageCaption,
  formatMinutes,
  periodKey,
  sessionUnpricedNote,
  tableColumns,
  tableRow,
} from "../sessionCostChart";

const COMPONENTS: SessionCostComponentDef[] = [
  { key: "dialogue", label: "Live dialogue", description: "" },
  { key: "stt", label: "Speech-to-text", description: "" },
  { key: "tts", label: "Text-to-speech", description: "" },
  { key: "fillers", label: "Fillers & holding", description: "" },
  { key: "events", label: "Events & rules", description: "" },
  { key: "coaching", label: "Live coaching", description: "" },
  { key: "debrief", label: "Debrief & memory", description: "" },
];

const components = (v: number | null) => ({
  dialogue: v,
  stt: v,
  tts: v,
  fillers: v,
  events: v,
  coaching: v,
  debrief: v,
});

const point = (over: Partial<RoleplaySessionCostPoint> = {}): RoleplaySessionCostPoint => ({
  bucket: "2026-08-01",
  partial: false,
  sessions: 4,
  minutes: 40,
  costUsd: 0.28,
  costPerMinuteUsd: 0.007,
  costPerSessionUsd: 0.07,
  costByComponent: components(0.04),
  perMinuteByComponent: components(0.001),
  excludedCostUsd: 0.01,
  unpricedCalls: 0,
  ...over,
});

describe("sessionCostChart", () => {
  it("stacks one datum per component per period, marking partial periods on the axis", () => {
    const series = buildPerMinuteStack(
      [point({ bucket: "2026-07-01", partial: true }), point()],
      COMPONENTS,
    );
    expect(series).toHaveLength(14);
    expect(new Set(series.map(d => d.key))).toEqual(new Set(["2026-07-01 *", "2026-08-01"]));
    expect(series[0]).toEqual({ group: "Live dialogue", key: "2026-07-01 *", value: 0.001 });
  });

  it("keeps a period with no minutes on the axis without drawing it as free", () => {
    const series = buildPerMinuteStack(
      [point({ minutes: 0, perMinuteByComponent: components(null) })],
      COMPONENTS,
    );
    expect(series).toEqual([{ group: "Live dialogue", key: "2026-08-01", value: null }]);
  });

  it("never prints a few seconds as zero minutes", () => {
    expect(formatMinutes(0)).toBe(0);
    expect(formatMinutes(0.005)).toBe("<0.1");
    expect(formatMinutes(12.34)).toBe(12.3);
  });

  it("colours components by fixed position, not by what has spend", () => {
    const scale = componentScale(COMPONENTS);
    expect(Object.keys(scale)).toEqual(COMPONENTS.map(c => c.label));
    expect(new Set(Object.values(scale)).size).toBe(COMPONENTS.length);
  });

  it("says full logging has not started when there is no cutover yet", () => {
    const caption = coverageCaption({ fullCoverageFrom: null, points: [] }, [
      point({ partial: true }),
    ]);
    expect(caption).toMatch(/has not started yet/);
  });

  it("names the cutover date when some plotted periods predate it", () => {
    const caption = coverageCaption({ fullCoverageFrom: "2026-09-26T08:00:00.000Z", points: [] }, [
      point({ partial: true }),
      point(),
    ]);
    expect(caption).toMatch(/2026-09-26/);
    expect(caption).toMatch(/understated/);
  });

  it("says nothing about coverage once every plotted period is complete", () => {
    expect(
      coverageCaption({ fullCoverageFrom: "2026-01-01T00:00:00.000Z", points: [] }, [point()]),
    ).toBe("");
  });

  it("flags unpriced calls, and only when there are some", () => {
    const withCalls = { overall: { ...point(), unpricedCalls: 3 } };
    expect(sessionUnpricedNote(withCalls)).toMatch(/3 calls had no price entry/);
    expect(sessionUnpricedNote({ overall: point() })).toBe("");
  });

  it("keeps table rows aligned with their columns", () => {
    const cols = tableColumns("Month", COMPONENTS);
    const row = tableRow(point({ partial: true }), COMPONENTS, true);
    expect(row).toHaveLength(cols.length);
    expect(row[0]).toBe("2026-08-01 (in progress)");
    expect(row[row.length - 1]).toBe("Partial");
  });

  it("marks only partial periods", () => {
    expect(periodKey({ bucket: "2026-08-01", partial: false })).toBe("2026-08-01");
    expect(periodKey({ bucket: "2026-08-01", partial: true })).toBe("2026-08-01 *");
  });
});
