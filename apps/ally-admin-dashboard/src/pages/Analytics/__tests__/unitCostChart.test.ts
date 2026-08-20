import { describe, expect, it } from "vitest";

import {
  QualityIndexCoverage,
  QualitySentimentPoint,
  QualitySentimentResponse,
  RoleplayCostPoint,
  RoleplayCostResponse,
} from "@types";

import {
  QUALITY_INDEX_DIMENSIONS,
  QUALITY_INDEX_DIMENSION_LABELS,
  QUALITY_INDEX_LABEL,
  attributableSharePct,
  buildCostByAreaSeries,
  buildCostByServiceSeries,
  buildProxyNpsSeries,
  buildQualityIndexAreaSeries,
  buildQualityIndexSeries,
  buildUnitCostSeries,
  correlationNote,
  formatUsd,
  isIndexFullyCalibrated,
  qualityIndexCoverageNotes,
  unpricedNote,
} from "../unitCostChart";

const costPoint = (overrides: Partial<RoleplayCostPoint> = {}): RoleplayCostPoint => ({
  bucket: "2024-05-01",
  practiceMinutes: 100,
  attributableCostUsd: 0.15,
  costPer10MinUsd: 0.015,
  breakdown: { roleplay: 0.1, feedback: 0.04, quiz: 0.01, llm: 0.14, stt: 0.01, tts: 0 },
  excludedCostUsd: 0.3,
  unpricedCalls: 0,
  ...overrides,
});

const costResponse = (
  overrides: Partial<RoleplayCostResponse> = {},
): RoleplayCostResponse => ({
  range: "all",
  bucket: "month",
  window: {
    from: "2024-01-01",
    to: "2024-06-12",
    label: "All time",
    days: 164,
    bucket: "month",
    allTime: true,
    inProgressBucket: "2024-06-01",
    computedAt: "2024-06-12T00:00:00.000Z",
  },
  perMinutes: 10,
  areas: ["roleplay", "feedback", "quiz"],
  areaLabels: {},
  points: [],
  overallCostPer10MinUsd: 0.015,
  totalAttributableCostUsd: 0.15,
  totalExcludedCostUsd: 0.3,
  totalPracticeMinutes: 100,
  totalUnpricedCalls: 0,
  estimateNote: "Estimated…",
  scoping: { tenantId: null, unscopedSections: ["points"] },
  computedAt: "2024-06-12T00:00:00.000Z",
  ...overrides,
});

describe("buildUnitCostSeries", () => {
  it("preserves a null ratio rather than plotting it at zero", () => {
    // A month with no practice has NO unit cost. Zeroing it would draw the
    // cheapest month the platform ever had out of a month where nothing happened.
    const series = buildUnitCostSeries([
      costPoint({ bucket: "2024-04-01", costPer10MinUsd: null, practiceMinutes: 0 }),
      costPoint({ bucket: "2024-05-01", costPer10MinUsd: 0.02 }),
    ]);

    expect(series[0].value).toBeNull();
    expect(series[1].value).toBe(0.02);
  });
});

describe("cost splits", () => {
  it("splits by area", () => {
    const series = buildCostByAreaSeries([costPoint()]);
    expect(series.map(d => d.group)).toEqual([
      "Live roleplay",
      "Feedback & summary",
      "Quiz grading",
    ]);
    expect(series.map(d => d.value)).toEqual([0.1, 0.04, 0.01]);
  });

  it("splits by service", () => {
    const series = buildCostByServiceSeries([costPoint()]);
    expect(series.map(d => d.group)).toEqual([
      "LLM",
      "Speech-to-text",
      "Text-to-speech",
    ]);
    expect(series.map(d => d.value)).toEqual([0.14, 0.01, 0]);
  });

  it("gives two splits of the same total, so a stack is exact either way", () => {
    const point = costPoint();
    const byArea = buildCostByAreaSeries([point]).reduce((s, d) => s + (d.value ?? 0), 0);
    const byService = buildCostByServiceSeries([point]).reduce(
      (s, d) => s + (d.value ?? 0),
      0,
    );

    expect(byArea).toBeCloseTo(byService, 6);
    expect(byArea).toBeCloseTo(point.attributableCostUsd, 6);
  });
});

describe("formatUsd", () => {
  it("keeps four decimals on sub-cent amounts", () => {
    // Two decimals would render every model at $0.00 and hide real differences.
    expect(formatUsd(0.0023)).toBe("$0.0023");
  });

  it("uses cents above a cent", () => {
    expect(formatUsd(1.234)).toBe("$1.23");
  });

  it("prints a bare zero and an em dash for absent", () => {
    expect(formatUsd(0)).toBe("$0");
    expect(formatUsd(null)).toBe("—");
    expect(formatUsd(undefined)).toBe("—");
  });
});

describe("unpricedNote", () => {
  it("is silent when everything was priced", () => {
    expect(unpricedNote(costResponse({ totalUnpricedCalls: 0 }))).toBe("");
  });

  it("says the total is understated when calls went unpriced", () => {
    const note = unpricedNote(costResponse({ totalUnpricedCalls: 12 }));
    expect(note).toMatch(/12 calls/);
    expect(note).toMatch(/understated/);
  });

  it("agrees with itself on the singular", () => {
    expect(unpricedNote(costResponse({ totalUnpricedCalls: 1 }))).toMatch(/1 call had/);
  });
});

describe("attributableSharePct", () => {
  it("says what fraction of AI spend the unit cost actually covers", () => {
    expect(
      attributableSharePct(
        costResponse({ totalAttributableCostUsd: 25, totalExcludedCostUsd: 75 }),
      ),
    ).toBe(25);
  });

  it("is null when nothing was spent, rather than 0%", () => {
    expect(
      attributableSharePct(
        costResponse({ totalAttributableCostUsd: 0, totalExcludedCostUsd: 0 }),
      ),
    ).toBeNull();
    expect(attributableSharePct(undefined)).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */

const sentimentPoint = (
  overrides: Partial<QualitySentimentPoint> = {},
): QualitySentimentPoint => ({
  bucket: "2024-05-01",
  avgCompositeScore: 72,
  evaluatedSessions: 30,
  proxyNps: 40,
  avgRating: 4.2,
  responses: 20,
  promoters: 12,
  passives: 4,
  detractors: 4,
  qualityIndex: 68,
  indexContributions: {
    actorComposite: 20,
    driftRate: 18,
    languageErrors: 15,
    responseLatency: 15,
  },
  indexRaw: { actorComposite: 72, driftRate: 4, languageErrors: 8, responseLatency: 950 },
  indexSampleSizes: {
    actorComposite: 30,
    driftRate: 25,
    languageErrors: 22,
    responseLatency: 400,
  },
  indexMissing: [],
  ...overrides,
});

const dimensionCoverage = (
  overrides: Partial<QualityIndexCoverage> = {},
): QualityIndexCoverage => ({
  dimension: "actorComposite",
  label: QUALITY_INDEX_DIMENSION_LABELS.actorComposite,
  unit: "score",
  weight: 0.25,
  bucketsCovered: 10,
  bucketsTotal: 12,
  calibrated: true,
  target: 90,
  ceiling: 40,
  sampleSize: 300,
  measuredAt: "2024-06-01T00:00:00.000Z",
  ...overrides,
});

const sentimentResponse = (
  overrides: Partial<QualitySentimentResponse> = {},
): QualitySentimentResponse => ({
  range: "all",
  bucket: "month",
  window: {
    from: "2024-01-01",
    to: "2024-06-12",
    label: "All time",
    days: 164,
    bucket: "month",
    allTime: true,
    inProgressBucket: null,
    computedAt: "2024-06-12T00:00:00.000Z",
  },
  points: [],
  overallCompositeScore: 72,
  overallProxyNps: 40,
  totalEvaluatedSessions: 30,
  totalResponses: 20,
  minResponses: 5,
  correlation: null,
  pairedBuckets: 0,
  proxyNote: "Proxy NPS, not NPS…",
  indexVersion: "v1",
  indexCalibrated: true,
  indexCoverage: QUALITY_INDEX_DIMENSIONS.map(dimension => dimensionCoverage({ dimension })),
  scoping: { tenantId: null, unscopedSections: [] },
  computedAt: "2024-06-12T00:00:00.000Z",
  ...overrides,
});

describe("sentiment series", () => {
  it("labels the sentiment series as a proxy, since the label is what survives a screenshot", () => {
    const series = buildProxyNpsSeries([sentimentPoint()]);
    expect(series[0].group).toMatch(/proxy/i);
    expect(series[0].group).toMatch(/1–5/);
  });

  it("keeps nulls so a quiet period breaks the line", () => {
    const points = [
      sentimentPoint({ bucket: "2024-04-01", proxyNps: null }),
      sentimentPoint({ bucket: "2024-05-01" }),
    ];

    expect(buildProxyNpsSeries(points).map(d => d.value)).toEqual([null, 40]);
  });
});

describe("quality index series", () => {
  it("plots the index line as null when no dimension covered the period, not zero", () => {
    const points = [
      sentimentPoint({ bucket: "2024-04-01", qualityIndex: null, indexMissing: [...QUALITY_INDEX_DIMENSIONS] }),
      sentimentPoint({ bucket: "2024-05-01" }),
    ];

    const line = buildQualityIndexSeries(points);
    expect(line.map(d => d.value)).toEqual([null, 68]);
    expect(line.every(d => d.group === QUALITY_INDEX_LABEL)).toBe(true);
  });

  it("zero-fills a missing dimension's stack layer instead of leaving a gap", () => {
    // Unlike the index line, a missing contribution is a real zero: the
    // renormalisation already spent that weight elsewhere, so the layer
    // genuinely added nothing this period — it must not read as "no data".
    const point = sentimentPoint({
      indexContributions: { actorComposite: 30, driftRate: 25, languageErrors: 13 },
      indexMissing: ["responseLatency"],
    });

    const areas = buildQualityIndexAreaSeries([point]);
    const latencyLayer = areas.find(
      d => d.group === QUALITY_INDEX_DIMENSION_LABELS.responseLatency,
    );
    expect(latencyLayer?.value).toBe(0);
    expect(latencyLayer?.value).not.toBeNull();
  });

  it("emits one datum per dimension per bucket, in the fixed stack order", () => {
    const areas = buildQualityIndexAreaSeries([sentimentPoint()]);
    expect(areas).toHaveLength(QUALITY_INDEX_DIMENSIONS.length);
    expect(areas.map(d => d.group)).toEqual(
      QUALITY_INDEX_DIMENSIONS.map(d => QUALITY_INDEX_DIMENSION_LABELS[d]),
    );
  });
});

describe("quality index coverage", () => {
  it("is fully calibrated only when every dimension is measured", () => {
    const allMeasured = QUALITY_INDEX_DIMENSIONS.map(dimension =>
      dimensionCoverage({ dimension, calibrated: true }),
    );
    expect(isIndexFullyCalibrated(allMeasured)).toBe(true);

    const onePlaceholder = [
      dimensionCoverage({ dimension: "actorComposite", calibrated: true }),
      dimensionCoverage({ dimension: "driftRate", calibrated: false }),
    ];
    expect(isIndexFullyCalibrated(onePlaceholder)).toBe(false);
  });

  it("treats an empty coverage array as NOT calibrated", () => {
    expect(isIndexFullyCalibrated([])).toBe(false);
  });

  it("states each dimension's coverage fraction and calibration state", () => {
    const notes = qualityIndexCoverageNotes([
      dimensionCoverage({ bucketsCovered: 3, bucketsTotal: 24, calibrated: false }),
    ]);
    expect(notes[0]).toMatch(/3 of 24/);
    expect(notes[0]).toMatch(/PLACEHOLDER/);
  });
});

describe("correlationNote", () => {
  it("names the direction and refuses to imply cause", () => {
    const note = correlationNote(sentimentResponse({ correlation: 0.82, pairedBuckets: 6 }));
    expect(note).toMatch(/strongly together/);
    expect(note).toMatch(/6 periods/);
    expect(note).toMatch(/neither number causes the other/i);
  });

  it("reads a negative r as opposite directions", () => {
    expect(
      correlationNote(sentimentResponse({ correlation: -0.5, pairedBuckets: 4 })),
    ).toMatch(/moderately in opposite directions/);
  });

  it("hedges a weak relationship rather than dressing it up", () => {
    expect(
      correlationNote(sentimentResponse({ correlation: 0.1, pairedBuckets: 5 })),
    ).toMatch(/weakly together/);
  });

  it("says why there is no coefficient when periods overlap too little", () => {
    expect(
      correlationNote(sentimentResponse({ correlation: null, pairedBuckets: 2 })),
    ).toMatch(/Not enough overlapping periods/);
  });

  it("distinguishes 'too few' from 'none at all'", () => {
    expect(
      correlationNote(sentimentResponse({ correlation: null, pairedBuckets: 0 })),
    ).toMatch(/No period has both/);
  });
});
