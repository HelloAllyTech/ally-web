import { OptionId } from "./sjtData";

export type BandTone = "good" | "mid" | "low";

export interface Band {
  name: string;
  tone: BandTone;
}

/** A complete ranking is all four options, best first. */
export const RANKING_LENGTH = 4;

export const isComplete = (order: OptionId[] | undefined): order is OptionId[] =>
  order?.length === RANKING_LENGTH;

/**
 * Scores one item against the panel consensus.
 *
 * Each option earns `max(0, 3 - |your rank - consensus rank|)`, so a near-miss
 * still scores — the point is how close the whole ordering is, not whether the
 * best option was spotted. Raw totals run 4 (fully reversed) to 12 (exact
 * match), normalised here to 0–100.
 */
export function scoreItem(order: OptionId[], key: OptionId[]) {
  let raw = 0;
  order.forEach((id, i) => {
    raw += Math.max(0, 3 - Math.abs(i - key.indexOf(id)));
  });
  const pct = Math.max(0, Math.round(((raw - 4) / 8) * 100));
  return { raw, pct };
}

/**
 * The four band names, as copy rather than constants: /SJT1/edit can reword
 * them, so `band` takes them as an argument. The defaults live here, next to
 * the thresholds they name, and are what the page renders unedited.
 */
export interface BandNames {
  closely: string;
  broadly: string;
  mixed: string;
  revisit: string;
}

export const DEFAULT_BAND_NAMES: BandNames = {
  closely: "Closely aligned",
  broadly: "Broadly aligned",
  mixed: "Mixed",
  revisit: "Worth revisiting",
};

export function band(pct: number, names: BandNames = DEFAULT_BAND_NAMES): Band {
  if (pct >= 85) return { name: names.closely, tone: "good" };
  if (pct >= 65) return { name: names.broadly, tone: "good" };
  if (pct >= 45) return { name: names.mixed, tone: "mid" };
  return { name: names.revisit, tone: "low" };
}
