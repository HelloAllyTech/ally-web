/**
 * Analytics colour system — the single source of truth for what a colour MEANS
 * on the analytics dashboard.
 *
 * Why this file exists: colour was previously assigned per chart, so the same
 * dimension got different colours in adjacent tiles ("Live (streamed)" was teal
 * in one Scribe donut and magenta two cards later) and 14 charts passed no scale
 * at all and fell through to Carbon's default palette, where a colour's meaning
 * changes with the data. Both break the house rule that "the same series is the
 * same colour on every chart" (wiki: product/data-visualisation.md §7) and
 * §15.5 of the chart principles (consistent encodings across tiles).
 *
 * Rules encoded here:
 *  - A colour distinction must be meaningful. Never colour-by-identity on a
 *    single-measure chart — use `single()` from chartKit instead (§8.1).
 *  - Grey is for structure and context, never for the subject of the chart
 *    (§8.2). Context series (historical backfill, cumulative totals, "all
 *    other") take a CONTEXT grey so the focal series can lead.
 *  - Ordered categories get a same-hue ramp where saturation maps to magnitude
 *    (§8.3), not a rainbow (which implies a ranking that isn't there).
 *  - Meaning is never carried by colour alone (house rule 7) — every consumer
 *    pairs these with a label, sign or arrow so the chart survives greyscale
 *    and colour-blindness.
 */

/**
 * Named hexes. Brand navy plus IBM Carbon 30–70 tokens. Reuse these instead of
 * inline hex literals — an inline hex is a colour whose meaning nobody can look
 * up.
 */
export const PALETTE = {
  blue: "#264D8E",
  cyan: "#33b1ff",
  teal: "#08bdba",
  green: "#42be65",
  purple: "#8a3ffc",
  indigo: "#6929c4",
  magenta: "#9f1853",
  red: "#fa4d56",
  darkRed: "#a2191f",
  orange: "#ff832b",
  gold: "#d2a106",
  gray: "#8d8d8d",
  // Reconciled in from the old TOKEN_PALETTE, which was a second divergent
  // 12-colour list living in tokenChart.ts.
  lightBlue: "#1192e8",
  darkTeal: "#005d5d",
};

export type ColorScale = Record<string, string>;

/**
 * Grey ramp for context and structure (§8.2). `CONTEXT.line` is the default for
 * any series that supports the point without being the point.
 */
export const CONTEXT = {
  faint: "#c6c6c6",
  line: "#8d8d8d",
  strong: "#525252",
};

/**
 * Percentile ramp — one hue, darker = worse tail (§8.3). p50/avg/p95 are the
 * same measure at different points of one distribution, so they belong to one
 * colour family; four unrelated hues (the old Latency scale) implied four
 * unrelated things.
 */
export const STAT = {
  p50: "#a6c8ff",
  avg: "#4589ff",
  p95: "#0043ce",
};

/** Session / summary outcome. Green good, red bad, gold pending, grey n/a. */
export const OUTCOME_SCALE: ColorScale = {
  // Scribe summary states
  Summarised: PALETTE.green,
  Failed: PALETTE.red,
  Processing: PALETTE.gold,
  "No audio": CONTEXT.line,
  // Roleplay session states
  Completed: PALETTE.green,
  "No conversation": PALETTE.red,
  "In progress": PALETTE.gold,
};

/**
 * How audio was captured. One definition for every chart that slices by capture
 * method — Scribe previously contradicted itself across two donuts on the same
 * tab.
 */
export const CAPTURE_SCALE: ColorScale = {
  "Live (streamed)": PALETTE.teal,
  "Upload (file)": PALETTE.purple,
  Unknown: CONTEXT.line,
};

/** Note authoring mode. Distinct from CAPTURE_SCALE — a different dimension
 *  must not reuse its colours, or purple silently means two things. */
export const NOTE_MODE_SCALE: ColorScale = {
  Dictation: PALETTE.indigo,
  Scribe: PALETTE.cyan,
  Unknown: CONTEXT.line,
};

/**
 * Data provenance: live pipeline runs vs backfilled history. Live is the
 * subject, history is context (§9.2 emphasise + isolate).
 */
export const SOURCE_SCALE: ColorScale = {
  Live: PALETTE.blue,
  Historical: CONTEXT.line,
  Unknown: CONTEXT.faint,
};

/**
 * Error severity, ordered minor → critical with rising saturation. Used by BOTH
 * the stacked severity chart and the evidence-table tags, so one severity has
 * one colour on the whole page (there used to be four different maps).
 */
export const SEVERITY_SCALE: ColorScale = {
  minor: PALETTE.gold,
  major: PALETTE.orange,
  critical: PALETTE.darkRed,
};

/** Tailwind-ish inline styles for severity tags, derived from SEVERITY_SCALE so
 *  the table and the chart cannot drift apart. */
export const severityTagStyle = (severity: string) => {
  const color = SEVERITY_SCALE[severity.toLowerCase()] ?? CONTEXT.line;
  return { color, borderColor: color, backgroundColor: `${color}1a` };
};

/**
 * Root-cause families: LLM causes cool, STT causes warm. Grouped by family so
 * the reader sees two camps without reading the caption (§8.3 grouped data →
 * similar colours).
 */
export const ROOT_CAUSE_SCALE: ColorScale = {
  "LLM: off-topic": PALETTE.blue,
  "LLM: incoherent": PALETTE.purple,
  "STT: garbled input": PALETTE.orange,
  "STT: error": PALETTE.darkRed,
};

/**
 * Threshold verdicts for objective metrics (WER, script fidelity). Paired with
 * a text label at every call site — never colour alone.
 */
export const VERDICT_SCALE: ColorScale = {
  good: PALETTE.green,
  warn: PALETTE.orange,
  critical: PALETTE.darkRed,
};

/**
 * Categorical palette for genuinely unordered dimensions with an unknown value
 * set (services, providers, models). Capped at 8 usable hues because people
 * cannot reliably tell more than ~8 apart (§2.3); past that, callers must group
 * into an "Other" bucket rather than adding colours.
 */
export const CATEGORICAL = [
  PALETTE.blue,
  PALETTE.purple,
  PALETTE.teal,
  PALETTE.orange,
  PALETTE.lightBlue,
  PALETTE.magenta,
  PALETTE.green,
  PALETTE.gold,
];

/** How many distinct categorical colours a reader can actually separate (§2.3). */
export const MAX_CATEGORICAL = CATEGORICAL.length;

/** Deterministic small hash → stable palette slot for an arbitrary name. */
const hashIndex = (name: string, modulo: number): number => {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % modulo;
};

/** Canonical colours for dimensions we know the value set of, so a service or
 *  provider keeps its colour everywhere it appears. */
const KNOWN_NAMES: ColorScale = {
  llm: PALETTE.blue,
  stt: PALETTE.teal,
  tts: PALETTE.purple,
  openai: PALETTE.blue,
  anthropic: PALETTE.orange,
  gemini: PALETTE.lightBlue,
  google: PALETTE.lightBlue,
  sarvam: PALETTE.teal,
  deepgram: PALETTE.magenta,
  elevenlabs: PALETTE.purple,
};

/**
 * Stable colour per name, independent of which other names are present.
 *
 * The previous implementation assigned by sorted index of the groups in the
 * current response, so a service changed colour whenever the group set changed
 * (switching the breakdown toggle, changing the range, a new provider
 * appearing) — the exact "meaningless colour coupling" §8.4 warns about, since
 * the reader builds cohesion from a colour that means nothing stable. Hashing
 * the name keeps a group's colour fixed for its lifetime.
 *
 * Hash collisions are possible; two same-coloured segments in one stack are a
 * legibility cost, not a correctness one, and `KNOWN_NAMES` pins the dimensions
 * we actually care about.
 */
export const stableScale = (names: string[]): ColorScale => {
  const scale: ColorScale = {};
  for (const name of Array.from(new Set(names))) {
    const known = KNOWN_NAMES[name.toLowerCase()];
    scale[name] = known ?? CATEGORICAL[hashIndex(name, CATEGORICAL.length)];
  }
  return scale;
};

/**
 * Stable colour per language code, so a language is the same colour in the avg
 * chart and the p95 chart sitting next to it (they previously got independent
 * Carbon default assignments, making the pair impossible to read across).
 */
export const languageScale = (languages: string[]): ColorScale => stableScale(languages);

/**
 * Same-hue ramp for ORDERED categories: low → high maps to low → high
 * saturation (§8.3). Use for ordered things (garble severity, score bands);
 * never for unordered categories, where a ramp invents a ranking.
 */
export const sequentialScale = (keysInOrder: string[]): ColorScale => {
  const ramp = ["#d0e2ff", "#a6c8ff", "#78a9ff", "#4589ff", "#0f62fe", "#0043ce", "#002d9c"];
  const n = Math.max(keysInOrder.length, 1);
  return keysInOrder.reduce<ColorScale>((scale, key, i) => {
    // Spread the requested keys across the full ramp so the darkest step is
    // always used, whatever the category count.
    const idx = n === 1 ? ramp.length - 1 : Math.round((i / (n - 1)) * (ramp.length - 1));
    scale[key] = ramp[idx];
    return scale;
  }, {});
};

/**
 * Paint every listed series as context grey — for the "all other" group and for
 * backfilled/derived series that must not compete with the subject (§9.2).
 */
export const contextScale = (labels: string[]): ColorScale =>
  labels.reduce<ColorScale>((scale, label) => {
    scale[label] = CONTEXT.line;
    return scale;
  }, {});

/**
 * Direction-aware delta formatting. Returns the arrow, the sign-carrying label
 * and the colour — colour is redundant with the arrow on purpose, so the
 * meaning survives greyscale and colour-blindness (house rule 7).
 *
 * `higherIsBetter` matters: a rise in avg score is good, a rise in error rate is
 * bad. The old delta chips hardcoded "positive = red", which was wrong for
 * every score metric.
 */
export const formatDelta = (
  delta: number | null | undefined,
  {
    higherIsBetter = true,
    decimals = 1,
    suffix = "",
  }: {
    higherIsBetter?: boolean;
    decimals?: number;
    suffix?: string;
  } = {},
): { label: string; arrow: string; color: string; direction: "up" | "down" | "flat" } | null => {
  if (delta === null || delta === undefined || Number.isNaN(delta)) return null;
  const rounded = Number(delta.toFixed(decimals));
  if (rounded === 0) {
    return { label: `0${suffix}`, arrow: "→", color: CONTEXT.strong, direction: "flat" };
  }
  const up = rounded > 0;
  const good = up === higherIsBetter;
  return {
    label: `${up ? "+" : "−"}${Math.abs(rounded).toFixed(decimals)}${suffix}`,
    arrow: up ? "↑" : "↓",
    color: good ? PALETTE.green : PALETTE.red,
    direction: up ? "up" : "down",
  };
};
