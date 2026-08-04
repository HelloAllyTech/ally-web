import { RoleplayVolumeResponse } from "@types";

import { CONTEXT, ColorScale, PALETTE } from "./chartScales";

/**
 * Pure transforms for the lifetime roleplay-volume card. Kept out of the
 * component so the honesty rules they encode — that the zero band is a residual
 * rather than the lowest volume level, and that a share over a handful of
 * learners must not be stated at all — are unit-testable without a DOM.
 */

/** One band as the chart and table render it. */
export interface RoleplayVolumeBar {
  /** Band label, and the x-axis tick: "0", "1", "3–5", "51+". */
  label: string;
  /** Learners in the band. */
  learners: number;
  /** Share of the learner population, or null when shares must not be stated. */
  share: number | null;
  /** True for the residual "never completed one" band. */
  zero: boolean;
}

/** Band labels in axis order: the zero band first, then rising volume. */
export const bandLabels = (data: RoleplayVolumeResponse | undefined): string[] =>
  data ? [data.zeroBandLabel, ...data.bands.map(b => b.label)] : [];

/** The learner population every share on this chart is taken over. */
export const volumePopulation = (data: RoleplayVolumeResponse | undefined): number =>
  data?.registeredLearners ?? 0;

/**
 * True when the population is too small for a percentage to be published.
 *
 * "50% of learners have never completed a roleplay" over a population of two
 * names them to anyone who knows the org. Below the server's floor the counts
 * survive and the shares do not — a count of people is not an estimate of
 * anything and leaks nothing on its own.
 */
export const sharesSuppressed = (data: RoleplayVolumeResponse | undefined): boolean => {
  const population = volumePopulation(data);
  return !!data && population > 0 && population < data.minPopulationSize;
};

/**
 * The bars, zero band first.
 *
 * Counts, not shares, are what gets plotted: this is a histogram of people, its
 * axis starts at zero, and a reader comparing bar heights is comparing numbers of
 * learners. The shares ride along for the table and the takeaway, where a
 * percentage is readable next to the count it came from.
 */
export const buildRoleplayVolumeBars = (
  data: RoleplayVolumeResponse | undefined,
): RoleplayVolumeBar[] => {
  if (!data) return [];

  const population = volumePopulation(data);
  const suppressed = sharesSuppressed(data);
  const share = (learners: number): number | null =>
    population === 0 || suppressed ? null : Number(((learners / population) * 100).toFixed(1));

  return [
    {
      label: data.zeroBandLabel,
      learners: data.learnersWithNone,
      share: share(data.learnersWithNone),
      zero: true,
    },
    ...data.bands.map((band, i) => {
      const learners = data.learnersByBand[i] ?? 0;
      return { label: band.label, learners, share: share(learners), zero: false };
    }),
  ];
};

/** Carbon series for a categorical bar chart (x = `group`). */
export const buildRoleplayVolumeSeries = (
  bars: RoleplayVolumeBar[],
): { group: string; value: number }[] => bars.map(b => ({ group: b.label, value: b.learners }));

/**
 * Colours: one accent for every volume band, context grey for the zero band.
 *
 * The bands are already on the x-axis, so painting each one a different colour
 * would encode the same thing twice and rank nothing — a single measure gets a
 * single hue. The zero band is the one meaningful exception, and for the same
 * reason it is greyed on the usage-levels card beside this one: it is not the
 * lowest volume level, it is the absence of one, and it is a residual of the
 * population rather than something the session table was asked for. The
 * distinction is never carried by colour alone — the bar is labelled "0" on the
 * axis and called out in the note under the chart.
 */
export const buildRoleplayVolumeScale = (labels: string[]): ColorScale => {
  const [zeroLabel, ...volumeLabels] = labels;
  return {
    ...(zeroLabel ? { [zeroLabel]: CONTEXT.faint } : {}),
    ...volumeLabels.reduce<ColorScale>((scale, label) => {
      scale[label] = PALETTE.blue;
      return scale;
    }, {}),
  };
};

/** A median can land on a .5 with an even number of learners. */
const formatMedian = (median: number): string =>
  Number.isInteger(median) ? String(median) : median.toFixed(1);

/**
 * The one-sentence finding, computed from the data.
 *
 * Leads with the never-started share, because that is the bar the chart exists to
 * make unavoidable, and follows it with the median among the learners who have
 * practised — the depth question, which the zeros would otherwise swamp. Below the
 * share floor it states the two counts instead and says why there is no
 * percentage, rather than quietly dropping the sentence.
 */
export const roleplayVolumeTakeaway = (data: RoleplayVolumeResponse | undefined): string | null => {
  if (!data) return null;

  const population = volumePopulation(data);
  if (population === 0) return null;

  const median = data.medianAmongActiveLearners;
  const medianClause =
    median === null
      ? ""
      : ` The median among the ${data.learnersWithAny.toLocaleString()} who have is ${formatMedian(median)}.`;

  if (sharesSuppressed(data)) {
    return (
      `${data.learnersWithAny.toLocaleString()} of ${population.toLocaleString()} learners have ` +
      `completed at least one roleplay — too few learners to state a percentage.${medianClause}`
    );
  }

  const nonePct = (data.learnersWithNone / population) * 100;
  return (
    `${nonePct.toFixed(0)}% of ${population.toLocaleString()} learners have never completed a ` +
    `roleplay.${medianClause}`
  );
};

/**
 * The table behind the chart: the count and the share side by side.
 *
 * A share is only readable next to the number of people it is over, and the
 * suppressed case keeps its counts here rather than vanishing.
 */
export const buildRoleplayVolumeTable = (
  bars: RoleplayVolumeBar[],
): { columns: string[]; rows: (string | number | null)[][] } => ({
  columns: ["Roleplays completed (lifetime)", "Learners", "Share of learners (%)"],
  rows: bars.map(b => [b.zero ? `${b.label} (never started)` : b.label, b.learners, b.share]),
});
