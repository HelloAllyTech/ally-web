import { FC, useEffect, useMemo, useRef, useState } from "react";

import { format, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";

import { useGetPracticeStreakQuery } from "@api";
import { PracticeStreakCell, PracticeStreakGroupBy } from "@types";
import { cn } from "@utils";

import ToggleButtonGroup from "../toggle-button-group";
import { getHeatmapLevel, HEATMAP_LEVEL_CLASSES } from "./constants";
import { PracticeStreakHeatmapProps } from "./types";

const GROUP_BY_ORDER: PracticeStreakGroupBy[] = [
  PracticeStreakGroupBy.DAY,
  PracticeStreakGroupBy.WEEK,
  PracticeStreakGroupBy.MONTH,
];

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

  const cellLabel = (cell: PracticeStreakCell): string => {
    const start = parseISO(cell.periodStart);
    switch (groupBy) {
      case PracticeStreakGroupBy.MONTH:
        return format(start, "MMM");
      case PracticeStreakGroupBy.WEEK:
      case PracticeStreakGroupBy.DAY:
      default:
        return format(start, "MMM d");
    }
  };

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

  const renderStrip = () => {
    if (isLoading) {
      return (
        <div className="flex gap-[6px]" aria-hidden>
          {Array.from({ length: 14 }).map((_, index) => (
            <div
              key={index}
              className="h-[52px] w-[52px] shrink-0 animate-pulse rounded-[4px] bg-neutral-100"
            />
          ))}
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
      <div
        ref={scrollRef}
        className="flex gap-[6px] overflow-x-auto pb-2 custom-scrollbar"
        role="list"
        aria-label={t("practiceStreak.ariaLabel")}
      >
        {cells.map(cell => {
          const level = getHeatmapLevel(cell.minutes, groupBy);
          return (
            <div
              key={cell.periodStart}
              role="listitem"
              className="flex shrink-0 flex-col items-center gap-1"
            >
              <div
                title={cellTooltip(cell)}
                className={cn(
                  "flex h-[52px] w-[52px] items-center justify-center rounded-[4px] text-sm font-semibold tabular-nums transition-colors",
                  HEATMAP_LEVEL_CLASSES[level],
                )}
              >
                {Math.round(cell.minutes)}
              </div>
              <span className="text-[10px] leading-none text-typography-500">
                {cellLabel(cell)}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderLegend = () => (
    <div className="flex items-center gap-1 text-[10px] text-typography-500">
      <span>{t("practiceStreak.legend.less")}</span>
      {HEATMAP_LEVEL_CLASSES.map((levelClass, index) => (
        <span key={index} className={cn("h-3 w-3 rounded-[2px]", levelClass)} />
      ))}
      <span>{t("practiceStreak.legend.more")}</span>
    </div>
  );

  return (
    <section
      className={cn("w-full rounded-[8px] border border-border-light bg-white p-4", className)}
      aria-label={t("practiceStreak.title")}
    >
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="font-secondary text-lg text-typography-900">
            {t("practiceStreak.title")}
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-typography-600">
            <span>
              🔥{" "}
              <span className="font-semibold text-typography-900">{data?.currentStreak ?? 0}</span>{" "}
              {t("practiceStreak.stats.currentStreak")}
            </span>
            <span>
              {t("practiceStreak.stats.longestStreak")}:{" "}
              <span className="font-semibold text-typography-900">{data?.longestStreak ?? 0}</span>
            </span>
            <span>
              {t("practiceStreak.stats.total")}:{" "}
              <span className="font-semibold text-typography-900">
                {t("practiceStreak.minutesValue", {
                  count: Math.round(data?.totalMinutes ?? 0),
                })}
              </span>
            </span>
          </div>
        </div>

        <ToggleButtonGroup
          value={groupBy}
          onValueChange={value => setGroupBy(value as PracticeStreakGroupBy)}
          items={groupByItems}
          disabled={isFetching}
          className="self-start sm:self-auto"
        />
      </div>

      {renderStrip()}

      {!!cells.length && !isError && <div className="mt-1 flex justify-end">{renderLegend()}</div>}
    </section>
  );
};

export default PracticeStreakHeatmap;
