import { describe, expect, it } from "vitest";

import { FillerQualityPoint } from "@types";

import {
  FILLER_CONFIG_GROUP,
  FILLER_DIVERSITY_GROUPS,
  FILLER_FINDING_GROUPS,
  buildFillerDiversitySeries,
  buildFillerFindingSeries,
  buildFillerUnconfiguredSeries,
  countJudgedFillers,
  unconfiguredPer100,
} from "../fillerQualityChart";

const point = (over: Partial<FillerQualityPoint>): FillerQualityPoint => ({
  bucket: "2026-08-10",
  fillersJudged: 100,
  characterFitPer100: null,
  contextFitPer100: null,
  safetyPer100: null,
  unconfiguredStylePer100: null,
  repeatedPct: null,
  distinctPhraseRatio: null,
  ...over,
});

describe("buildFillerFindingSeries", () => {
  it("emits one line per dimension over the judged buckets", () => {
    const series = buildFillerFindingSeries([
      point({
        bucket: "2026-08-10",
        characterFitPer100: 4.5,
        contextFitPer100: 2,
        safetyPer100: 0.5,
      }),
    ]);

    expect(series).toEqual([
      { group: FILLER_FINDING_GROUPS.character, key: "2026-08-10", value: 4.5 },
      { group: FILLER_FINDING_GROUPS.context, key: "2026-08-10", value: 2 },
      { group: FILLER_FINDING_GROUPS.safety, key: "2026-08-10", value: 0.5 },
    ]);
  });

  it("drops a bucket that judged nothing rather than drawing it at zero", () => {
    // Zero findings per 100 reads as "judged, and clean". A bucket with no
    // judged fillers has no rate at all, and the two must not look alike.
    const series = buildFillerFindingSeries([
      point({ bucket: "2026-08-10", fillersJudged: 0, characterFitPer100: null }),
      point({ bucket: "2026-08-11", characterFitPer100: 3 }),
    ]);

    expect(series.map(d => d.key)).toEqual(["2026-08-11", "2026-08-11", "2026-08-11"]);
  });

  it("keeps a null rate as null so the line breaks over it", () => {
    // Carbon breaks a path on null. Substituting 0 would draw a confident
    // plunge to "no findings" across a gap in judging.
    const series = buildFillerFindingSeries([
      point({ characterFitPer100: null, contextFitPer100: 1 }),
    ]);
    const character = series.find(d => d.group === FILLER_FINDING_GROUPS.character);

    expect(character?.value).toBeNull();
  });

  it("returns nothing when the judge has not run", () => {
    expect(buildFillerFindingSeries(undefined)).toEqual([]);
    expect(buildFillerFindingSeries([])).toEqual([]);
  });
});

describe("buildFillerDiversitySeries", () => {
  it("converts the distinct-phrase ratio to a percentage", () => {
    // Stored 0-1, shown next to a percentage — one axis, so one unit.
    const series = buildFillerDiversitySeries([
      point({ repeatedPct: 12, distinctPhraseRatio: 0.625 }),
    ]);
    const distinct = series.find(d => d.group === FILLER_DIVERSITY_GROUPS.distinct);
    const repeated = series.find(d => d.group === FILLER_DIVERSITY_GROUPS.repeated);

    expect(distinct?.value).toBe(62.5);
    expect(repeated?.value).toBe(12);
  });

  it("leaves a missing ratio null rather than reading it as zero distinct", () => {
    // 0% distinct would mean every filler was a repeat — the worst possible
    // reading — for a bucket that simply did not record the ratio.
    const series = buildFillerDiversitySeries([
      point({ repeatedPct: 5, distinctPhraseRatio: null }),
    ]);
    const distinct = series.find(d => d.group === FILLER_DIVERSITY_GROUPS.distinct);

    expect(distinct?.value).toBeNull();
  });
});

describe("buildFillerUnconfiguredSeries", () => {
  it("keeps the configuration gap on its own line", () => {
    const series = buildFillerUnconfiguredSeries([point({ unconfiguredStylePer100: 30 })]);

    expect(series).toEqual([{ group: FILLER_CONFIG_GROUP, key: "2026-08-10", value: 30 }]);
  });
});

describe("countJudgedFillers", () => {
  it("counts played fillers, not buckets and not sessions", () => {
    // This is the n every one of these charts quotes, and it has to match the
    // denominator the rates were computed against.
    expect(countJudgedFillers([point({ fillersJudged: 40 }), point({ fillersJudged: 2 })])).toBe(
      42,
    );
  });

  it("is zero, not NaN, before the judge has run", () => {
    expect(countJudgedFillers(undefined)).toBe(0);
  });
});

describe("unconfiguredPer100", () => {
  it("weights each bucket by its own played-filler count", () => {
    // A mean of per-bucket rates would let a bucket with two fillers count as
    // much as one with two hundred — here it would give 25 instead of 20.
    const rate = unconfiguredPer100([
      point({ fillersJudged: 200, unconfiguredStylePer100: 10 }),
      point({ fillersJudged: 100, unconfiguredStylePer100: 40 }),
    ]);

    // 20 findings + 40 findings over 300 played fillers, per 100.
    expect(rate).toBe(20);
  });

  it("is a finding RATE, not the share of fillers that went unjudged", () => {
    // The two are not the same and the distinction is load-bearing: a filler on
    // an unconfigured character that drew no finding contributes nothing here,
    // so reading this as "x% could not be judged" understates the gap. A rate
    // per 100 can also exceed 100, which a share never could.
    expect(unconfiguredPer100([point({ fillersJudged: 10, unconfiguredStylePer100: 150 })])).toBe(
      150,
    );
  });

  it("has no share to state when nothing was judged", () => {
    expect(unconfiguredPer100([point({ fillersJudged: 0 })])).toBeNull();
    expect(unconfiguredPer100(undefined)).toBeNull();
  });

  it("treats a bucket with no conditioned-out findings as zero of them", () => {
    // Distinct from the case above: fillers WERE judged here, and none of them
    // hit the configuration gap. That is a real 0%.
    expect(unconfiguredPer100([point({ fillersJudged: 50, unconfiguredStylePer100: null })])).toBe(
      0,
    );
  });
});
