/**
 * Star colours for the feedback rating (StarRating + its SessionRatingTrigger
 * wrapper).
 *
 * Each star is drawn as an inline SVG with BOTH a fill and a stroke, so the
 * star shape is always visible — an empty star renders as a light-grey outline
 * and can never disappear into the background. The previous single-fill icon
 * painted the whole star in one inherited colour, so it went invisible whenever
 * that colour resolved to white/transparent (it churned through #ffffff /
 * #E0E0E0), which is why the stars only showed up "sometimes".
 */

// Legacy — kept for the standalone StarYellowIcon asset (@assets) and its test.
export const STAR_COLOR_FILLED = "#F9CC49"; // gold
export const STAR_COLOR_EMPTY = "#8D8D8D"; // Carbon gray-50

// Fill + stroke pairs used by the inline-SVG StarRating.
export const STAR_PALETTE = {
  filled: { fill: "#F9CC49", stroke: "#E6B31E" }, // committed selection — gold
  hover: { fill: "#FCE29A", stroke: "#F0BE2E" }, // live hover preview — soft gold
  empty: { fill: "#EDEDED", stroke: "#BDBDBD" }, // always-visible grey outline
} as const;

export type StarState = keyof typeof STAR_PALETTE;
