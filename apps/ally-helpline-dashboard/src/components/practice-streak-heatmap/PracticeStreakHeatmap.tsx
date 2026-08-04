import { FC, useEffect, useMemo, useRef, useState } from "react";

import { format, parseISO } from "date-fns";
import { ChevronDown } from "lucide-react";
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

// Compact goal-ring geometry (header size).
const RING_SIZE = 52;
const RING_STROKE = 5;
const RING_RADIUS = 21;
const RING_CENTER = RING_SIZE / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// Mini timeline geometry — must match the dot size + gap below (w-3.5 + gap-1).
const DOT_STRIDE = 18; // 14px dot + 4px gap
const MIN_LABEL_GAP = 30; // drop month labels closer than this to avoid overlap

// How many recent cells the collapsed header previews (older ones clip off the left).
const PREVIEW_CELLS = 60;

const PracticeStreakHeatmap: FC<PracticeStreakHeatmapProps> = ({
  className,
  defaultGroupBy = PracticeStreakGroupBy.DAY,
}) => {
  const { t } = useTranslation();
  const [groupBy, setGroupBy] = useState<PracticeStreakGroupBy>(defaultGroupBy);
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isFetching, isError } = useGetPracticeStreakQuery({ groupBy });

  const cells = data?.cells ?? [];

  // Keep the most recent cells in view when the panel opens or the data/grouping changes.
  useEffect(() => {
    if (expanded && scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [cells.length, groupBy, expanded]);

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

  const currentStreak = data?.currentStreak ?? 0;
  const longestStreak = data?.longestStreak ?? 0;
  const totalMinutes = Math.round(data?.totalMinutes ?? 0);

  const renderRing = () => (
    <div
      className="relative shrink-0"
      style={{ width: RING_SIZE, height: RING_SIZE }}
      role="img"
      aria-label={`${currentPeriodMinutes} ${goalCaption}`}
    >
      <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
        <defs>
          <linearGradient id="practiceStreakRingCompact" x1="0" y1="0" x2="1" y2="1">
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
          stroke="url(#practiceStreakRingCompact)"
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
          transform={`rotate(-90 ${RING_CENTER} ${RING_CENTER})`}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-secondary text-[13px] leading-none tabular-nums text-typography-900">
        {currentPeriodMinutes}
      </span>
    </div>
  );

  // Compact recent-history strip shown in the collapsed header. The full,
  // scrollable timeline lives in the expandable panel below.
  const renderPreviewStrip = () => (
    <div
      className="hidden min-w-0 max-w-full flex-1 justify-end overflow-hidden md:flex"
      aria-hidden
    >
      <div className="flex gap-[3px]">
        {cells.slice(-PREVIEW_CELLS).map(cell => {
          const level = getHeatmapLevel(cell.minutes, groupBy);
          return (
            <span
              key={cell.periodStart}
              className={cn("h-3 w-3 shrink-0 rounded-[2px]", HEATMAP_LEVEL_CLASSES[level])}
            />
          );
        })}
      </div>
    </div>
  );

  const renderLegend = () => (
    <div className="mt-3 flex items-center gap-1.5 text-[10px] text-typography-500">
      <span>{t("practiceStreak.legend.less")}</span>
      {HEATMAP_LEVEL_CLASSES.map((cls, level) => (
        <span key={level} className={cn("h-3 w-3 rounded-[2px]", cls)} />
      ))}
      <span>{t("practiceStreak.legend.more")}</span>
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

  const renderHeader = () => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-3" aria-hidden>
          <div
            className="shrink-0 animate-pulse rounded-full bg-neutral-100"
            style={{ width: RING_SIZE, height: RING_SIZE }}
          />
          <div className="flex flex-col gap-2">
            <div className="h-5 w-28 animate-pulse rounded bg-neutral-100" />
            <div className="h-3 w-40 animate-pulse rounded bg-neutral-100" />
          </div>
          <div className="ml-auto hidden gap-[3px] md:flex">
            {Array.from({ length: 24 }).map((_, index) => (
              <div key={index} className="h-3 w-3 animate-pulse rounded-[2px] bg-neutral-100" />
            ))}
          </div>
        </div>
      );
    }

    if (isError) {
      return <div className="text-sm text-typography-600">{t("practiceStreak.error")}</div>;
    }

    if (!cells.length) {
      return (
        <div className="flex items-center gap-2 text-sm text-typography-600">
          <span aria-hidden>🔥</span>
          <span>{t("practiceStreak.empty")}</span>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        aria-expanded={expanded}
        aria-controls="practice-streak-detail"
        className="group flex min-w-0 flex-1 items-center gap-3 rounded-[2px] text-left outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
      >
        {renderRing()}

        <div className="flex min-w-0 flex-col">
          <div className="flex items-baseline gap-1.5">
            <span className="font-secondary text-[24px] leading-none tabular-nums text-typography-900">
              {currentStreak}
            </span>
            <span className="text-[13px] text-typography-700">
              {t("practiceStreak.stats.currentStreak")}
            </span>
            <span className="text-[14px] leading-none" aria-hidden>
              🔥
            </span>
          </div>
          <div className="mt-1 truncate text-[11px] text-typography-500">
            {t("practiceStreak.stats.longestStreak")} {longestStreak}{" "}
            {t("practiceStreak.units.days")}
            <span className="mx-1.5">·</span>
            {t("practiceStreak.stats.total")} {totalMinutes} {t("practiceStreak.units.min")}
          </div>
        </div>

        {renderPreviewStrip()}

        <ChevronDown
          className={cn(
            "ml-1 h-4 w-4 shrink-0 text-typography-500 transition-transform duration-200",
            expanded && "rotate-180",
          )}
          aria-hidden
        />
      </button>
    );
  };

  return (
    <section
      className={cn(
        "w-full rounded-[8px] border border-border-light bg-white px-4 py-3",
        className,
      )}
      aria-label={t("practiceStreak.title")}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        {renderHeader()}

        {!isError && (
          <ToggleButtonGroup
            value={groupBy}
            onValueChange={value => setGroupBy(value as PracticeStreakGroupBy)}
            items={groupByItems}
            disabled={isFetching || !cells.length}
            className="ml-auto shrink-0"
          />
        )}
      </div>

      {!!cells.length && (
        <div
          id="practice-streak-detail"
          className={cn(
            // grid-cols-[minmax(0,1fr)] caps the track to the container's own
            // width — without it, a grid track sizes to its content's
            // max-content width (the full, un-scrolled timeline can be
            // thousands of px wide), pushing the whole section past the
            // viewport instead of leaving the scroll to the inner
            // overflow-x-auto div.
            "grid w-full grid-cols-[minmax(0,1fr)] transition-[grid-template-rows] duration-300 ease-out",
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="min-h-0 min-w-0 overflow-hidden" aria-hidden={!expanded}>
            <div className="pt-4">
              {renderTimeline()}
              {renderLegend()}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default PracticeStreakHeatmap;
