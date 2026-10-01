import type { ProductUpdateKind, ProductUpdateSurface, PublicProductUpdate } from "@api";

export const SURFACE_LABELS: Record<ProductUpdateSurface, string> = {
  web_app: "Web app",
  mobile_app: "Mobile app",
  admin_console: "Admin console",
  whatsapp: "WhatsApp",
};

/** The filter row: everything, or one place an update shows up. */
export const SURFACE_FILTERS: { value: ProductUpdateSurface | null; label: string }[] = [
  { value: null, label: "All updates" },
  { value: "web_app", label: SURFACE_LABELS.web_app },
  { value: "mobile_app", label: SURFACE_LABELS.mobile_app },
  { value: "admin_console", label: SURFACE_LABELS.admin_console },
  { value: "whatsapp", label: SURFACE_LABELS.whatsapp },
];

export const KIND_LABELS: Record<ProductUpdateKind, string> = {
  new: "New",
  improved: "Improved",
  fixed: "Fixed",
};

/**
 * The UTC calendar day `iso` falls in, as `YYYY-MM-DD`.
 *
 * UTC on purpose: the code-activity heatmap above the feed buckets days in
 * UTC, so a day heading here and a cell there always mean the same day.
 */
export const dayKeyUtc = (iso: string): string => new Date(iso).toISOString().slice(0, 10);

export type DayGroup = {
  /** `YYYY-MM-DD`, UTC. */
  key: string;
  /** New before improved: what people can now do leads, what got better follows. */
  highlights: PublicProductUpdate[];
  /** A day's fixes are listed together rather than given a card each. */
  fixes: PublicProductUpdate[];
};

const KIND_ORDER: Record<ProductUpdateKind, number> = { new: 0, improved: 1, fixed: 2 };

/**
 * Groups a newest-first feed by the day each update went live, newest day
 * first. Within a day the feed's own order (newest live time first) is kept
 * inside each kind.
 */
export const groupByDay = (updates: PublicProductUpdate[]): DayGroup[] => {
  const groups = new Map<string, DayGroup>();
  for (const update of updates) {
    const key = dayKeyUtc(update.liveAt);
    const group = groups.get(key) ?? { key, highlights: [], fixes: [] };
    if (update.kind === "fixed") group.fixes.push(update);
    else group.highlights.push(update);
    groups.set(key, group);
  }
  return [...groups.values()]
    .sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0))
    .map(group => ({
      ...group,
      highlights: [...group.highlights].sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]),
    }));
};

/** "30 September 2026" (in the reader's locale), for a `YYYY-MM-DD` UTC day key. */
export const formatDay = (key: string): string =>
  new Date(`${key}T00:00:00Z`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
