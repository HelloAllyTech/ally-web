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

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The Sunday, 00:00 UTC, that starts the week `iso` falls in.
 *
 * UTC and Sunday-anchored on purpose: the code-activity heatmap above the
 * feed buckets days in UTC, and the admin ship-volume chart uses Sunday UTC
 * weeks, so all three agree at a week boundary.
 */
export const weekStartUtc = (iso: string): Date => {
  const date = new Date(iso);
  const midnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return new Date(midnight - date.getUTCDay() * DAY_MS);
};

export type WeekGroup = {
  key: string;
  weekStart: Date;
  /** New before improved: what people can now do leads, what got better follows. */
  highlights: PublicProductUpdate[];
  /** A week's fixes are listed together rather than given a card each. */
  fixes: PublicProductUpdate[];
};

const KIND_ORDER: Record<ProductUpdateKind, number> = { new: 0, improved: 1, fixed: 2 };

/**
 * Groups a newest-first feed into weeks, newest week first. Within a week
 * the feed's own order (newest live date first) is kept inside each kind.
 */
export const groupByWeek = (updates: PublicProductUpdate[]): WeekGroup[] => {
  const groups = new Map<string, WeekGroup>();
  for (const update of updates) {
    const weekStart = weekStartUtc(update.liveAt);
    const key = weekStart.toISOString().slice(0, 10);
    const group = groups.get(key) ?? { key, weekStart, highlights: [], fixes: [] };
    if (update.kind === "fixed") group.fixes.push(update);
    else group.highlights.push(update);
    groups.set(key, group);
  }
  return [...groups.values()]
    .sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime())
    .map(group => ({
      ...group,
      highlights: [...group.highlights].sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]),
    }));
};

export const formatWeek = (weekStart: Date): string =>
  `Week of ${weekStart.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })}`;
