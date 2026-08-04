import { describe, expect, it } from "vitest";

import {
  CAPTURE_SCALE,
  CATEGORICAL,
  MAX_CATEGORICAL,
  NOTE_MODE_SCALE,
  SEVERITY_SCALE,
  contextScale,
  formatDelta,
  languageScale,
  sequentialScale,
  severityTagStyle,
  stableScale,
} from "../chartScales";
import { buildSource, formatN, isThinSample, single } from "../chartKit";

describe("stableScale", () => {
  it("gives a name the SAME colour regardless of what else is present", () => {
    // The previous implementation assigned by sorted index of the current result
    // set, so a service changed colour whenever the group set changed — flipping
    // a breakdown toggle, changing the range, a new provider appearing.
    const alone = stableScale(["gpt-4o"]);
    const crowded = stableScale(["aardvark-model", "gpt-4o", "zzz-model"]);

    expect(crowded["gpt-4o"]).toBe(alone["gpt-4o"]);
  });

  it("pins the dimensions we know the value set of", () => {
    const scale = stableScale(["llm", "stt", "tts"]);

    expect(new Set(Object.values(scale)).size).toBe(3);
    // Case-insensitive, so LLM and llm are one colour, not two.
    expect(stableScale(["LLM"]).LLM).toBe(scale.llm);
  });

  it("assigns a colour to every distinct name and dedupes", () => {
    const scale = stableScale(["a", "b", "a"]);

    expect(Object.keys(scale)).toEqual(["a", "b"]);
    expect(Object.values(scale).every(c => CATEGORICAL.includes(c))).toBe(true);
  });

  it("stays within the distinguishable palette even for many names", () => {
    const names = Array.from({ length: 40 }, (_, i) => `model-${i}`);
    const colours = new Set(Object.values(stableScale(names)));

    expect(colours.size).toBeLessThanOrEqual(MAX_CATEGORICAL);
  });
});

describe("languageScale", () => {
  it("gives a language one colour across charts, whatever the row order", () => {
    const first = languageScale(["en", "hi-IN", "kn"]);
    const reordered = languageScale(["kn", "en"]);

    expect(reordered.en).toBe(first.en);
    expect(reordered.kn).toBe(first.kn);
  });
});

describe("sequentialScale", () => {
  it("ramps ordered categories from light to dark", () => {
    const scale = sequentialScale(["low", "mid", "high"]);
    const values = Object.values(scale);

    expect(Object.keys(scale)).toEqual(["low", "mid", "high"]);
    expect(new Set(values).size).toBe(3);
    // Darkest step is always used, whatever the category count.
    expect(values[values.length - 1]).toBe("#002d9c");
  });

  it("handles a single category and an empty list", () => {
    expect(Object.values(sequentialScale(["only"]))).toEqual(["#002d9c"]);
    expect(sequentialScale([])).toEqual({});
  });
});

describe("severity has ONE definition", () => {
  it("derives the tag style from the same hex as the chart scale", () => {
    // There used to be four different severity palettes on one page — gold in the
    // chart, yellow-100 in the table two panels down.
    expect(severityTagStyle("critical").color).toBe(SEVERITY_SCALE.critical);
    expect(severityTagStyle("MAJOR").color).toBe(SEVERITY_SCALE.major);
  });

  it("falls back to a neutral grey for an unknown severity", () => {
    expect(severityTagStyle("unheard-of").color).toBe("#8d8d8d");
  });
});

describe("dimension scales do not collide", () => {
  it("keeps capture method and note mode on different colours", () => {
    // Purple used to mean "Upload (file)" in one donut and "Dictation" two cards
    // later, so the reader built a relationship that did not exist.
    const capture = new Set(Object.values(CAPTURE_SCALE));
    const noteMode = new Set(
      Object.entries(NOTE_MODE_SCALE)
        .filter(([k]) => k !== "Unknown")
        .map(([, v]) => v),
    );

    for (const colour of noteMode) {
      expect(capture.has(colour)).toBe(false);
    }
  });
});

describe("formatDelta", () => {
  it("carries an arrow as well as a colour, so direction survives greyscale", () => {
    const up = formatDelta(3.2);

    expect(up).toMatchObject({ arrow: "↑", direction: "up", label: "+3.2" });
  });

  it("uses a minus sign, not a hyphen, for a decrease", () => {
    expect(formatDelta(-1.5)?.label).toBe("−1.5");
    expect(formatDelta(-1.5)?.arrow).toBe("↓");
  });

  it("treats a rise as GOOD by default and BAD when higherIsBetter is false", () => {
    // Cost, latency and error rates all rise badly; the old chips hardcoded
    // "positive = red", which was wrong for every score metric.
    const score = formatDelta(5, { higherIsBetter: true });
    const cost = formatDelta(5, { higherIsBetter: false });

    expect(score?.color).not.toBe(cost?.color);
    expect(score?.arrow).toBe(cost?.arrow); // direction is the same...
  });

  it("reports a flat change distinctly from a missing one", () => {
    expect(formatDelta(0)).toMatchObject({ direction: "flat", arrow: "→" });
    expect(formatDelta(null)).toBeNull();
    expect(formatDelta(undefined)).toBeNull();
    expect(formatDelta(NaN)).toBeNull();
  });

  it("rounds to the requested precision and appends a suffix", () => {
    expect(formatDelta(2.349, { decimals: 2 })?.label).toBe("+2.35");
    expect(formatDelta(4, { suffix: "pp" })?.label).toBe("+4.0pp");
  });
});

describe("contextScale", () => {
  it("greys every listed series so none competes with the subject", () => {
    expect(contextScale(["Historical", "Total"])).toEqual({
      Historical: "#8d8d8d",
      Total: "#8d8d8d",
    });
  });
});

describe("single", () => {
  it("gives a one-measure chart one accent instead of colour-by-identity", () => {
    expect(Object.keys(single("Sessions"))).toEqual(["Sessions"]);
  });
});

describe("formatN", () => {
  it("spells out the denominator with its unit", () => {
    expect(formatN(1234, "sessions")).toBe("n = 1,234 sessions");
    expect(formatN(5)).toBe("n = 5");
  });

  it("returns undefined when there is no n to state", () => {
    expect(formatN(null)).toBeUndefined();
    expect(formatN(undefined)).toBeUndefined();
  });
});

describe("isThinSample", () => {
  it("flags a sample below the documented minimum", () => {
    expect(isThinSample(4, 20)).toBe(true);
    expect(isThinSample(20, 20)).toBe(false);
    expect(isThinSample(100, 20)).toBe(false);
  });

  it("does not flag an unknown n — absent is not the same as small", () => {
    expect(isThinSample(null, 20)).toBe(false);
    expect(isThinSample(undefined, 20)).toBe(false);
  });
});

describe("buildSource", () => {
  it("assembles derivation, window, n and as-of into one provenance line", () => {
    expect(
      buildSource({
        derivation: "Mean composite score",
        window: "Last 30 days (2024-05-14 → 2024-06-12)",
        n: 412,
        nUnit: "sessions",
        asOf: "12 Jun 2024, 12:00",
      }),
    ).toBe(
      "Mean composite score · Last 30 days (2024-05-14 → 2024-06-12) · n = 412 sessions · as of 12 Jun 2024, 12:00",
    );
  });

  it("omits the parts it does not have rather than leaving empty separators", () => {
    expect(buildSource({ derivation: "Session counts" })).toBe("Session counts");
    expect(buildSource({ derivation: "Session counts", n: 3 })).toBe("Session counts · n = 3");
  });
});
