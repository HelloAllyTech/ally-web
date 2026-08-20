import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CarbonDropdown as Dropdown } from "@ally-ui-mono/ui-shared";
import { useGetChartPreferencesQuery, useSaveChartPreferencesMutation } from "@api";
import { AnalyticsBucket, AnalyticsRange, ChartPreference } from "@types";

import { DEFAULT_GROUPING } from "./analyticsGrouping";

/**
 * Per-chart window and grain, saved per user.
 *
 * The Highlights tab carries no page-level date range: a leadership question is
 * about the whole history, and a reader who wants a narrower read wants it for
 * ONE chart — years of growth beside weeks of quality — not for every panel at
 * once. So the window lives on the chart, next to the grain, and both persist
 * per user so the choice survives a reload and follows the reader to another
 * machine.
 *
 * Why the pair travels together rather than as two hooks: they are two halves of
 * one question ("what period, at what resolution") and they are saved in one row.
 * Splitting them would mean two writes per change and two chances to disagree
 * about which chart a preference belonged to.
 */

export const RANGES: AnalyticsRange[] = ["30d", "90d", "12m", "all"];

/** Display name for a window. One table, used by the picker and the captions. */
export const RANGE_LABEL: Record<AnalyticsRange, string> = {
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "12m": "Last 12 months",
  all: "All time",
};

/** Short form for a provenance line, where the long label crowds the row. */
export const RANGE_SHORT: Record<AnalyticsRange, string> = {
  "30d": "30d",
  "90d": "90d",
  "12m": "12m",
  all: "all time",
};

/**
 * The window a chart on this tab opens on.
 *
 * All-time, matching the tab's premise. A narrower default would mean the first
 * thing a reader sees is a slice, and the slice would be mistaken for the whole
 * on a tab whose heading promises the platform picture.
 */
export const DEFAULT_RANGE: AnalyticsRange = "all";

/** One chart's controls. */
export interface ChartControls {
  range: AnalyticsRange;
  bucket: AnalyticsBucket;
}

export const RangePicker = ({
  id,
  value,
  onChange,
  options = RANGES,
}: {
  id: string;
  value: AnalyticsRange;
  onChange: (range: AnalyticsRange) => void;
  /** Restrict the offered windows where one of them is meaningless. */
  options?: AnalyticsRange[];
}) => {
  const items = options.map(r => ({ id: r, label: RANGE_LABEL[r] }));
  const selected = items.find(i => i.id === value) ?? items[items.length - 1];

  return (
    <div className="w-36 shrink-0">
      <Dropdown
        id={id}
        size="sm"
        titleText="Period"
        hideLabel
        label="Period"
        items={items}
        selectedItem={selected}
        itemToString={item => item?.label ?? ""}
        onChange={({ selectedItem }) => {
          if (selectedItem) onChange(selectedItem.id);
        }}
      />
    </div>
  );
};

/**
 * How long to wait after the last change before writing.
 *
 * A reader flicking through four windows to find the interesting one should
 * produce one write, not four. Short enough that navigating away a moment later
 * still saves.
 */
const SAVE_DEBOUNCE_MS = 800;

export interface ChartControlsState<K extends string> {
  /** The window and grain a given chart is currently read at. */
  controlsFor: (chart: K) => ChartControls;
  setRange: (chart: K, range: AnalyticsRange) => void;
  setBucket: (chart: K, bucket: AnalyticsBucket) => void;
  /**
   * True until the saved preferences have been read.
   *
   * Charts must not fire their first request before this clears, or every chart
   * fetches its default window and then immediately re-fetches the saved one —
   * two round trips per chart and a visible flash of the wrong period.
   */
  hydrating: boolean;
}

/**
 * Per-chart control state for a tab, hydrated from and written back to the
 * server.
 *
 * `namespace` prefixes every stored key (`highlights.practice`), so two tabs can
 * each own a chart called "practice" without colliding, and so a tab's
 * preferences can be recognised later without a registry.
 *
 * Saving is deliberately fire-and-forget: a failed write leaves the reader's
 * current selection working and simply un-saved. Blocking the UI on it, or
 * rolling the selection back, would punish the reader for an outage in a
 * convenience feature.
 */
export function useChartControls<K extends string>(
  namespace: string,
  defaults: Record<K, ChartControls>,
): ChartControlsState<K> {
  const { data, isLoading, isUninitialized } = useGetChartPreferencesQuery();
  const [saveChartPreferences] = useSaveChartPreferencesMutation();

  const [byChart, setByChart] = useState<Record<K, ChartControls>>(defaults);
  const hydrated = useRef(false);
  const pending = useRef(new Map<K, ChartControls>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const key = useCallback((chart: K) => `${namespace}.${chart}`, [namespace]);

  /* ------------------------------- hydration ------------------------------- */
  //
  // Once, on the first response. Re-applying on every render would fight the
  // reader: their click updates local state, the (still cached) response then
  // overwrites it, and the control appears to spring back.
  useEffect(() => {
    if (hydrated.current || !data) return;
    hydrated.current = true;

    const saved = new Map(data.preferences.map(p => [p.chartId, p]));
    setByChart(prev => {
      const next = { ...prev };
      (Object.keys(prev) as K[]).forEach(chart => {
        const pref = saved.get(`${namespace}.${chart}`);
        if (!pref) return;
        next[chart] = {
          // A saved value that no longer exists comes back null from the server;
          // fall through to the chart's own default rather than to a global one,
          // because a chart's default is a statement about that metric.
          range: pref.range ?? prev[chart].range,
          bucket: pref.bucket ?? prev[chart].bucket,
        };
      });
      return next;
    });
  }, [data, namespace]);

  /* -------------------------------- saving --------------------------------- */

  const flush = useCallback(() => {
    timer.current = null;
    if (pending.current.size === 0) return;

    const batch: ChartPreference[] = [...pending.current.entries()].map(([chart, controls]) => ({
      chartId: key(chart),
      range: controls.range,
      bucket: controls.bucket,
    }));
    pending.current.clear();
    // Fire-and-forget: see the hook doc. `.unwrap()` is deliberately not called,
    // so a rejected write cannot surface as an unhandled rejection.
    void saveChartPreferences(batch);
  }, [key, saveChartPreferences]);

  const queueSave = useCallback(
    (chart: K, controls: ChartControls) => {
      pending.current.set(chart, controls);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DEBOUNCE_MS);
    },
    [flush],
  );

  // Write whatever is still queued when the tab goes away, so a reader who
  // changes a window and immediately navigates does not lose it.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      flush();
    },
    [flush],
  );

  const update = useCallback(
    (chart: K, patch: Partial<ChartControls>) => {
      setByChart(prev => {
        const next = { ...prev[chart], ...patch };
        queueSave(chart, next);
        return { ...prev, [chart]: next };
      });
    },
    [queueSave],
  );

  const setRange = useCallback(
    (chart: K, range: AnalyticsRange) => update(chart, { range }),
    [update],
  );

  const setBucket = useCallback(
    (chart: K, bucket: AnalyticsBucket) => update(chart, { bucket }),
    [update],
  );

  const controlsFor = useCallback(
    (chart: K) => byChart[chart] ?? { range: DEFAULT_RANGE, bucket: DEFAULT_GROUPING },
    [byChart],
  );

  return useMemo(
    () => ({
      controlsFor,
      setRange,
      setBucket,
      hydrating: (isLoading || isUninitialized) && !hydrated.current,
    }),
    [controlsFor, setRange, setBucket, isLoading, isUninitialized],
  );
}

/**
 * Uniform defaults for a set of charts, so a tab declares its chart list once.
 *
 * Per-chart overrides are the exception rather than the rule: a chart wants its
 * own default only when its metric needs a different resolution to be readable
 * (a unit cost is unstable on a daily axis; a count is not).
 */
export const defaultControlsFor = <K extends string>(
  charts: readonly K[],
  overrides: Partial<Record<K, Partial<ChartControls>>> = {},
): Record<K, ChartControls> =>
  Object.fromEntries(
    charts.map(chart => [
      chart,
      {
        range: DEFAULT_RANGE,
        bucket: DEFAULT_GROUPING,
        ...(overrides[chart] ?? {}),
      },
    ]),
  ) as Record<K, ChartControls>;
