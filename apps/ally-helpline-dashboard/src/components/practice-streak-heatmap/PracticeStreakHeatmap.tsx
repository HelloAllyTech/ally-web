import { FC, useEffect, useMemo, useRef, useState } from "react";

import { format, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";

import { useGetPracticeStreakQuery } from "@api";
import { PracticeStreakCell, PracticeStreakGroupBy } from "@types";
import { cn } from "@utils";

import ToggleButtonGroup from "../toggle-button-group";
import { getHeatmapLevel, HEATMAP_LEVEL_CLASSES, PRACTICE_GOAL_MINUTES } from "./constants";
import { PracticeStreakHeatmapProps } from "./types";

const GROUP_BY_ORDER: PracticeStreakGroupBy[] = [
  PracticeStreakGroupBy.DAY,
  PracticeStreakGroupBy.WEEK,
  PracticeStreakGroupBy.MONTH,
];

// Progress-ring geometry.
const RING_SIZE = 124;
const RING_RADIUS = 54;
const RING_STROKE = 11;
const RING_CENTER = RING_SIZE / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// Mini timeline geometry — must match the dot size + gap below (w-3.5 + gap-1).
const DOT_STRIDE = 18; // 14px dot + 4px gap
const MIN_LABEL_GAP = 30; // drop month labels closer than this to avoid overlap

const PracticeStreakHeatmap: FC<PracticeStreakHeatmapProps> = ({
  className,
  defaultGroupBy = PracticeStreakGroupBy.DAY,
}) => {
  const { t } = useTranslation();
  const [groupBy, setGroupBy] = useState<PracticeStreakGroupBy>(defaultGroupBy);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isFetching, isError } = useGetPracticeStreakQuery({ groupBy });

  const cells = data?.cells ?? [];

  // Keep the most recent cells in view when the data or grouping changes.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [cells.length, groupBy]);

  const groupByItems = useMemo(
    () =>
      GROUP_BY_ORDER.map(value => ({
        value,
        label: t(`practiceStreak.groupBy.${value.toLowerCase()}` as const),
      })),
    [t],
  );

  // Month markers for the mini timeline, positioned by index and de-duplicated
  // so dense groupings (e.g. Month) don't overlap their labels.
  const monthMarkers = useMemo(() => {
    const markers: { x: number; label: string }[] = [];
    let lastKey = -1;
    let lastX = -Infinity;
    cells.forEach((cell, index) => {
      const start = parseISO(cell.periodStart);
      const key = start.getFullYear() * 12 + start.getMonth();
      if (key === lastKey) return;
      lastKey = key;
      const x = index * DOT_STRIDE;
      if (x - lastX < MIN_LABEL_GAP) return;
      markers.push({ x, label: format(start, "MMM") });
      lastX = x;
    });
    return markers;
  }, [cells]);

  const cellTooltip = (cell: PracticeStreakCell): string => {
    const start = parseISO(cell.periodStart);
    const end = parseISO(cell.periodEnd);
    const minutes = t("practiceStreak.minutesValue", {
      count: Math.round(cell.minutes),
    });
    switch (groupBy) {
      case PracticeStreakGroupBy.MONTH:
        return `${format(start, "MMMM yyyy")} · ${minutes}`;
      case PracticeStreakGroupBy.WEEK:
        return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")} · ${minutes}`;
      case PracticeStreakGroupBy.DAY:
      default:
        return `${format(start, "PP")} · ${minutes}`;
    }
  };

  // Current (most recent) period drives the progress ring.
  const currentPeriodMinutes = cells.length ? Math.round(cells[cells.length - 1].minutes) : 0;
  const goalMinutes = PRACTICE_GOAL_MINUTES[groupBy];
  const progress = goalMinutes > 0 ? Math.min(currentPeriodMinutes / goalMinutes, 1) : 0;
  const goalCaption = t(`practiceStreak.goal.${groupBy.toLowerCase()}` as const, {
    count: goalMinutes,
  });

  const renderRing = () => (
    <div
      className="relative shrink-0"
      style={{ width: RING_SIZE, height: RING_SIZE }}
      role="img"
      aria-label={`${currentPeriodMinutes} ${goalCaption}`}
    >
      <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
        <defs>
          <linearGradient id="practiceStreakRing" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgb(var(--color-primary-500))" />
            <stop offset="100%" stopColor="rgb(var(--color-primary-300))" />
          </linearGradient>
        </defs>
        <circle
          cx={RING_CENTER}
          cy={RING_CENTER}
          r={RING_RADIUS}
          fill="none"
          stroke="rgb(var(--color-primary-50))"
          strokeWidth={RING_STROKE}
        />
        <circle
          cx={RING_CENTER}
          cy={RING_CENTER}
          r={RING_RADIUS}
          fill="none"
          stroke="url(#practiceStreakRing)"
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
          transform={`rotate(-90 ${RING_CENTER} ${RING_CENTER})`}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
        <span className="font-secondary text-[26px] leading-none tabular-nums text-typography-900">
          {currentPeriodMinutes}
        </span>
        <span className="mt-1 max-w-[84px] text-center text-[10px] leading-tight text-typography-500">
          {goalCaption}
        </span>
      </div>
    </div>
  );

  const renderStat = (value: number, label: string, unit?: string, emoji?: string) => (
    <div>
      <div className="flex items-baseline gap-1 font-secondary text-[20px] leading-none tabular-nums text-typography-900">
        <span>{value}</span>
        {unit && <span className="text-[12px] font-normal text-typography-600">{unit}</span>}
        {emoji && <span className="text-[15px] leading-none">{emoji}</span>}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-typography-500">{label}</div>
    </div>
  );

  const renderStats = () => (
    <div className="flex flex-wrap gap-x-8 gap-y-3">
      {renderStat(
        data?.currentStreak ?? 0,
        t("practiceStreak.stats.currentStreak"),
        undefined,
        "🔥",
      )}
      {renderStat(
        data?.longestStreak ?? 0,
        t("practiceStreak.stats.longestStreak"),
        t("practiceStreak.units.days"),
      )}
      {renderStat(
        Math.round(data?.totalMinutes ?? 0),
        t("practiceStreak.stats.total"),
        t("practiceStreak.units.min"),
      )}
    </div>
  );

  const renderTimeline = () => (
    <div ref={scrollRef} className="overflow-x-auto pb-1 custom-scrollbar">
      <div className="inline-flex flex-col gap-2">
        <div className="flex gap-1" role="list" aria-label={t("practiceStreak.ariaLabel")}>
          {cells.map(cell => {
            const level = getHeatmapLevel(cell.minutes, groupBy);
            return (
              <div
                key={cell.periodStart}
                role="listitem"
                title={cellTooltip(cell)}
                className={cn(
                  "h-3.5 w-3.5 shrink-0 rounded-[3px] transition-colors",
                  HEATMAP_LEVEL_CLASSES[level],
                )}
              />
            );
          })}
        </div>
        <div className="relative h-3">
          {monthMarkers.map(marker => (
            <span
              key={marker.label + marker.x}
              className="absolute text-[9px] leading-none text-typography-500"
              style={{ left: marker.x }}
            >
              {marker.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center" aria-hidden>
          <div
            className="shrink-0 animate-pulse rounded-full bg-neutral-100"
            style={{ width: RING_SIZE, height: RING_SIZE }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex flex-col gap-2">
                  <div className="h-5 w-10 animate-pulse rounded bg-neutral-100" />
                  <div className="h-2 w-14 animate-pulse rounded bg-neutral-100" />
                </div>
              ))}
            </div>
            <div className="mt-5 flex gap-1">
              {Array.from({ length: 20 }).map((_, index) => (
                <div
                  key={index}
                  className="h-3.5 w-3.5 animate-pulse rounded-[3px] bg-neutral-100"
                />
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (isError) {
      return <div className="py-4 text-sm text-typography-600">{t("practiceStreak.error")}</div>;
    }

    if (!cells.length) {
      return <div className="py-4 text-sm text-typography-600">{t("practiceStreak.empty")}</div>;
    }

    return (
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        {renderRing()}
        <div className="min-w-0 flex-1">
          {renderStats()}
          <div className="mt-5">{renderTimeline()}</div>
        </div>
      </div>
    );
  };

  return (
    <section
      className={cn("w-full rounded-[8px] border border-border-light bg-white p-4", className)}
      aria-label={t("practiceStreak.title")}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-secondary text-lg text-typography-900">{t("practiceStreak.title")}</h2>

        <ToggleButtonGroup
          value={groupBy}
          onValueChange={value => setGroupBy(value as PracticeStreakGroupBy)}
          items={groupByItems}
          disabled={isFetching}
          className="self-start sm:self-auto"
        />
      </div>

      {renderBody()}
    </section>
  );
};

export default PracticeStreakHeatmap;
