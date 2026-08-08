import { FC, useEffect, useMemo, useRef, useState } from "react";

import { format, parseISO } from "date-fns";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useGetPracticeStreakQuery } from "@api";
import { PracticeStreakCell, PracticeStreakGroupBy, PracticeStreakSummary } from "@types";
import { cn } from "@utils";

import ToggleButtonGroup from "../toggle-button-group";
import { ACTIVE_DAY_MINUTES, getHeatmapLevel, HEATMAP_LEVEL_CLASSES } from "./constants";
import StreakRing from "./StreakRing";
import {
  deriveStreakState,
  hasDistinctDailyGoal,
  isPayloadStale,
  resolveRingTarget,
  StreakState,
} from "./streakState";
import { PracticeStreakHeatmapProps } from "./types";

const GROUP_BY_ORDER: PracticeStreakGroupBy[] = [
  PracticeStreakGroupBy.DAY,
  PracticeStreakGroupBy.WEEK,
  PracticeStreakGroupBy.MONTH,
];

// Mini timeline geometry — must match the dot size + gap below (w-3.5 + gap-1).
const DOT_STRIDE = 18; // 14px dot + 4px gap
const MIN_LABEL_GAP = 30; // drop month labels closer than this to avoid overlap

// How many recent cells the collapsed header previews (older ones clip off the left).
const PREVIEW_CELLS = 60;

/** Which states offer a call to action, and which label each one uses. */
const CTA_KEY_BY_STATE: Partial<Record<StreakState, string>> = {
  [StreakState.AT_RISK]: "practiceStreak.cta.keepItAlive",
  [StreakState.JUST_LOST]: "practiceStreak.cta.restart",
  [StreakState.NEVER_STARTED]: "practiceStreak.cta.start",
};

const PracticeStreakHeatmap: FC<PracticeStreakHeatmapProps> = ({
  className,
  defaultGroupBy = PracticeStreakGroupBy.DAY,
  onStartPractice,
}) => {
  const { t } = useTranslation();
  const [groupBy, setGroupBy] = useState<PracticeStreakGroupBy>(defaultGroupBy);
  const [expanded, setExpanded] = useState(false);
  const [readout, setReadout] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isFetching, isError, refetch } = useGetPracticeStreakQuery(
    { groupBy },
    {
      // The bar unmounts while a simulation runs, so remounting on return to
      // /learn is the natural moment to pick up the session's practice.
      refetchOnMountOrArgChange: 30,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    },
  );

  const cells = data?.cells ?? [];

  // Keep the most recent cells in view when the panel opens or the data/grouping changes.
  useEffect(() => {
    if (expanded && scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [cells.length, groupBy, expanded]);

  // /learn is the landing route and this bar never unmounts, so a tab left open
  // across midnight in the business timezone would keep rendering yesterday's
  // "secured" as if it were today's. Refetch rather than render a stale state.
  useEffect(() => {
    if (data && isPayloadStale(data)) {
      refetch();
    }
  }, [data, refetch]);

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

  const cellLabel = (cell: PracticeStreakCell): string => {
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

  const totalMinutes = Math.round(data?.totalMinutes ?? 0);

  /**
   * Everything below reads from `summary`, which is the same shape the
   * lightweight /summary endpoint returns — so the bar, the nav pill and the
   * post-session moment all derive their state from identical fields.
   */
  const summary: PracticeStreakSummary | undefined = data;
  const state = summary ? deriveStreakState(summary) : StreakState.NEVER_STARTED;
  const ring = summary
    ? resolveRingTarget(summary)
    : { target: 0, progress: 0, beyondTarget: false };

  const renderHeadline = () => {
    if (!summary) return null;

    switch (state) {
      case StreakState.SECURED:
        return {
          headline: t("practiceStreak.state.secured.headline", {
            count: summary.currentStreak,
          }),
          sub: t("practiceStreak.state.secured.sub"),
        };
      case StreakState.AT_RISK:
        return {
          headline: t("practiceStreak.state.atRisk.headline", {
            count: summary.currentStreak,
          }),
          // Quotes the real rule (the active-day minimum), not the daily goal.
          sub: t("practiceStreak.state.atRisk.sub", { count: ACTIVE_DAY_MINUTES }),
        };
      case StreakState.JUST_LOST:
        return {
          headline: t("practiceStreak.state.justLost.headline"),
          // Anchors to the personal best rather than showing a bare zero.
          sub: t("practiceStreak.state.justLost.sub", {
            count: Math.max(summary.longestStreak, summary.previousRun?.days ?? 0),
          }),
        };
      case StreakState.NEVER_STARTED:
      default:
        return {
          headline: t("practiceStreak.state.neverStarted.headline"),
          sub: t("practiceStreak.state.neverStarted.sub", { count: ACTIVE_DAY_MINUTES }),
        };
    }
  };

  const ringAriaLabel = () => {
    if (!summary) return "";
    if (ring.beyondTarget) {
      return t("practiceStreak.a11y.ringLabelComplete", { current: summary.currentStreak });
    }
    return t("practiceStreak.a11y.ringLabel", {
      current: summary.currentStreak,
      remaining: Math.max(0, ring.target - summary.currentStreak),
      count: Math.max(0, ring.target - summary.currentStreak),
      target: ring.target,
    });
  };

  const renderMilestone = () => {
    if (!summary) return null;

    if (ring.beyondTarget && summary.currentStreak > 0) {
      return t("practiceStreak.milestone.newPersonalBest");
    }
    if (summary.nextMilestone && summary.nextMilestone.days > summary.currentStreak) {
      return t("practiceStreak.milestone.nextBadge", {
        count: summary.nextMilestone.daysRemaining,
        badge: summary.nextMilestone.badgeName,
      });
    }
    if (summary.longestStreak > summary.currentStreak) {
      return t("practiceStreak.milestone.toPersonalBest", {
        count: summary.longestStreak - summary.currentStreak,
      });
    }
    return null;
  };

  const renderTodayChip = () => {
    if (!summary) return null;

    const secured = summary.streakSecuredToday;
    return (
      <span
        className={cn(
          "shrink-0 rounded-full px-2 py-0.5 text-[11px] leading-tight",
          secured ? "bg-primary-50 text-primary-700" : "bg-neutral-100 text-typography-700",
        )}
        // The headline already says whether the streak is secured or at risk, so
        // this is reinforcement, not information — first thing to drop when
        // space is tight.
        data-testid="streak-today-chip"
      >
        {secured ? t("practiceStreak.today.secured") : t("practiceStreak.today.notSecured")}
      </span>
    );
  };

  // Only rendered when a tenant has configured a goal above the active-day
  // minimum. Otherwise "1 of 1 min daily goal" is noise, and the goal is not a
  // concept that exists for that tenant.
  const renderGoalLine = () => {
    if (!summary || !hasDistinctDailyGoal(summary, ACTIVE_DAY_MINUTES)) return null;

    return (
      <div className="mt-0.5 text-[11px] text-typography-500">
        {t("practiceStreak.today.goal", {
          done: Math.round(summary.minutesToday),
          goal: Math.round(summary.dailyGoalMinutes),
        })}
      </div>
    );
  };

  const renderCta = () => {
    const key = CTA_KEY_BY_STATE[state];
    if (!key || !onStartPractice) return null;

    return (
      <button
        type="button"
        onClick={event => {
          // The header is itself a disclosure button; don't toggle the panel.
          event.stopPropagation();
          onStartPractice();
        }}
        className="shrink-0 rounded-[4px] bg-primary-500 px-2.5 py-1 text-[12px] font-medium text-white outline-none transition-colors hover:bg-primary-600 focus-visible:ring-2 focus-visible:ring-primary-300"
      >
        {t(key)}
      </button>
    );
  };

  const activePreviewCount = cells.slice(-PREVIEW_CELLS).filter(cell => cell.minutes > 0).length;

  // Decorative, and the last thing that should win width — the state copy is the
  // point of this bar. `shrink` with no `flex-1` lets the text column keep its
  // room; only appears once there is genuinely space for it.
  const renderPreviewStrip = () => (
    <div
      className="hidden min-w-0 max-w-[220px] shrink justify-end overflow-hidden xl:flex"
      role="img"
      aria-label={t("practiceStreak.a11y.previewLabel", {
        active: activePreviewCount,
        total: Math.min(cells.length, PREVIEW_CELLS),
      })}
    >
      <div className="flex gap-[3px]">
        {cells.slice(-PREVIEW_CELLS).map(cell => {
          const level = getHeatmapLevel(cell.minutes, groupBy);
          return (
            <span
              key={cell.periodStart}
              aria-hidden
              className={cn("h-3 w-3 shrink-0 rounded-[2px]", HEATMAP_LEVEL_CLASSES[level])}
            />
          );
        })}
      </div>
    </div>
  );

  const renderLegend = () => (
    <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] text-typography-500">
      <span>{t("practiceStreak.legend.less")}</span>
      {HEATMAP_LEVEL_CLASSES.map((cls, level) => (
        <span key={level} className={cn("h-3 w-3 rounded-[2px]", cls)} />
      ))}
      <span>{t("practiceStreak.legend.more")}</span>
      <span className="ml-2">{t("practiceStreak.legend.threshold")}</span>
    </div>
  );

  const renderTimeline = () => (
    <div ref={scrollRef} className="overflow-x-auto pb-1 custom-scrollbar">
      <div className="inline-flex flex-col gap-2">
        <div className="flex gap-1" role="list" aria-label={t("practiceStreak.ariaLabel")}>
          {cells.map(cell => {
            const level = getHeatmapLevel(cell.minutes, groupBy);
            const label = cellLabel(cell);
            return (
              <div
                key={cell.periodStart}
                role="listitem"
                tabIndex={0}
                aria-label={label}
                title={label}
                onPointerEnter={() => setReadout(label)}
                onFocus={() => setReadout(label)}
                onPointerLeave={() => setReadout(null)}
                onBlur={() => setReadout(null)}
                className={cn(
                  "h-3.5 w-3.5 shrink-0 rounded-[3px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary-300",
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

  /**
   * One shared readout instead of a tooltip per cell. A grouping can render up
   * to 365 cells inside a horizontal scroller, and the shared Carbon tooltip is
   * not portaled — that many would both cost a lot and get clipped by the
   * scroll container.
   */
  const renderReadout = () => (
    <div className="mt-2 min-h-[1rem] text-[11px] text-typography-600" aria-live="polite">
      {readout ?? t("practiceStreak.a11y.readoutEmpty")}
    </div>
  );

  const renderHeader = () => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-3" aria-hidden>
          <div className="h-[52px] w-[52px] shrink-0 animate-pulse rounded-full bg-neutral-100" />
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
      return (
        <div className="flex flex-wrap items-center gap-2 text-sm text-typography-600">
          <span>{t("practiceStreak.error")}</span>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-[4px] border border-border-medium px-2 py-0.5 text-[12px] text-typography-800 outline-none transition-colors hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-primary-300"
          >
            {t("practiceStreak.retry")}
          </button>
        </div>
      );
    }

    const copy = renderHeadline();
    const milestone = renderMilestone();
    const hasTimeline = cells.length > 0;

    return (
      // Wraps rather than compresses: below sm the ring + copy take a full row of
      // their own and the chip/CTA drop beneath, instead of every element
      // shrinking until the state copy is three ellipsised characters.
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
        {/* The disclosure button wraps only the ring + copy, so the CTA inside
            the header is not nested inside another button. */}
        <button
          type="button"
          onClick={() => hasTimeline && setExpanded(prev => !prev)}
          aria-expanded={hasTimeline ? expanded : undefined}
          aria-controls={hasTimeline ? "practice-streak-detail" : undefined}
          aria-label={
            hasTimeline
              ? expanded
                ? t("practiceStreak.a11y.collapse")
                : t("practiceStreak.a11y.expand")
              : undefined
          }
          disabled={!hasTimeline}
          className="group flex min-w-0 flex-1 basis-full items-center gap-3 rounded-[2px] text-left outline-none focus-visible:ring-2 focus-visible:ring-primary-300 disabled:cursor-default sm:basis-auto"
        >
          <StreakRing
            currentStreak={summary?.currentStreak ?? 0}
            progress={ring.progress}
            state={state}
            ariaLabel={ringAriaLabel()}
          />

          <div className="flex min-w-0 flex-col">
            <div
              className="truncate font-secondary text-[16px] leading-tight text-typography-900"
              aria-live="polite"
            >
              {copy?.headline}
            </div>
            <div className="mt-0.5 truncate text-[11px] text-typography-600">{copy?.sub}</div>
            {renderGoalLine()}
            <div className="mt-1 truncate text-[11px] text-typography-500">
              {milestone && <span>{milestone}</span>}
              {milestone && <span className="mx-1.5">·</span>}
              {t("practiceStreak.stats.personalBest", {
                count: summary?.longestStreak ?? 0,
              })}
              <span className="mx-1.5">·</span>
              {t("practiceStreak.stats.totalMinutes", { count: totalMinutes })}
            </div>
          </div>
        </button>

        {renderTodayChip()}
        {renderPreviewStrip()}
        {renderCta()}

        {hasTimeline && (
          <ChevronDown
            className={cn(
              "ml-1 h-4 w-4 shrink-0 text-typography-500 transition-transform duration-200",
              expanded && "rotate-180",
            )}
            aria-hidden
          />
        )}
      </div>
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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">{renderHeader()}</div>

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
              {/* The grouping control lives with the timeline it controls. In the
                  header it competed with the state copy for width and offered a
                  setting for content that is collapsed by default. */}
              <ToggleButtonGroup
                value={groupBy}
                onValueChange={value => setGroupBy(value as PracticeStreakGroupBy)}
                items={groupByItems}
                disabled={isFetching || !cells.length}
                className="mb-3"
              />
              {renderTimeline()}
              {renderReadout()}
              {renderLegend()}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default PracticeStreakHeatmap;
