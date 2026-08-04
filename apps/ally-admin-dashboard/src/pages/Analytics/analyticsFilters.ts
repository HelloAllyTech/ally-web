import { AnalyticsWindowQuery } from "@api";
import { AnalyticsWindow } from "@types";

/**
 * Page-level filter state, passed to every analytics tab.
 *
 * `query` is spread straight into each RTK Query call, so a tab never has to
 * know which window params exist — adding one (a tenant filter, a custom range)
 * reaches every tab without touching them.
 */
export interface AnalyticsTabFilters {
  query: AnalyticsWindowQuery;
  language: string;
  /** Lets a tab drive the page-level language picker (e.g. a drill-in row). */
  onSelectLanguage: (language: string) => void;
}

/**
 * The window a response actually covered, for a chart's provenance line.
 *
 * Falls back to a neutral phrase rather than inventing a period: a source line
 * that guesses is worse than one that admits it does not know yet.
 */
export const windowLabel = (window?: AnalyticsWindow): string =>
  window ? `${window.label} (${window.from} → ${window.to})` : "window loading";

/**
 * Short "as of" stamp for a provenance line.
 *
 * Takes the timestamp rather than a window so the all-time endpoints — which
 * return a `computedAt` and no window, because their quantity is not a period —
 * can carry the same stamp as the windowed ones.
 */
export const asOfStamp = (computedAt?: string): string | undefined => {
  if (!computedAt) return undefined;
  const d = new Date(computedAt);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export const asOf = (window?: AnalyticsWindow): string | undefined => asOfStamp(window?.computedAt);

/**
 * True when a named response section could not honour the active tenant filter.
 * Consumers badge those panels rather than letting a platform-wide number read
 * as tenant-specific.
 */
export const isUnscoped = (
  section: string,
  scoping?: { tenantId: string | null; unscopedSections: string[] },
): boolean => Boolean(scoping?.tenantId && scoping.unscopedSections.includes(section));

/** Badge text for a panel that stayed platform-wide under a tenant filter. */
export const PLATFORM_WIDE_NOTE =
  "Platform-wide — this metric cannot be attributed to a single org";
