import {
  FC,
  KeyboardEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { CodeActivityDay, useLazyGetPublicCodeActivityQuery } from "@api";

import {
  CODE_ACTIVITY_LEVEL_CLASSES,
  CODE_ACTIVITY_PAGE_DAYS,
  activityLevel,
  addDays,
  axisLabel,
  formatDay,
  formatLines,
  levelRangeLabel,
  mergeDays,
  sumChurn,
} from "./codeActivity";

type LoadState = "initial" | "ready" | "older" | "olderError" | "unavailable";

/**
 * Older days load once the reader has scrolled to within this share of a
 * viewport of the oldest cell — early enough that the next page is usually in
 * before they reach the edge.
 */
const LOAD_OLDER_WITHIN = 0.35;

/**
 * Exactly `CODE_ACTIVITY_PAGE_DAYS` columns fill the strip's visible width (the
 * 116px is the 29 gaps of 4px between them), never narrower than 20px — so a
 * desktop reader sees a month at a glance and a phone scrolls sooner. The
 * `100%` is the strip's own width; the columns past it overflow into the
 * scroller, which is what the reader scrolls through.
 */
const COLUMNS_CLASS = "[grid-auto-columns:max(20px,calc((100%-116px)/30))]";

const NAV_BUTTON_CLASS =
  "rounded px-1.5 py-0.5 text-gray-700 transition-colors hover:text-gray-900 disabled:cursor-default disabled:text-gray-500/50";

/**
 * Lines changed per day across Ally's code, as a one-row heatmap at the top of
 * the public changelog. The newest day sits at the right; scrolling left loads
 * older days a month at a time, back to the first commit.
 *
 * Totals only — the per-repo split lives on the admin ship-volume chart, and
 * so does the "output, not outcome" framing; here the caption says plainly
 * what is counted and nothing more.
 */
export const CodeActivityHeatmap: FC = () => {
  const [fetchPage] = useLazyGetPublicCodeActivityQuery();

  const [days, setDays] = useState<CodeActivityDay[]>([]);
  const [state, setState] = useState<LoadState>("initial");
  const [hasOlder, setHasOlder] = useState(false);
  const [incomplete, setIncomplete] = useState(false);
  const [recentTotal, setRecentTotal] = useState(0);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [atNewest, setAtNewest] = useState(true);
  const [atOldestLoaded, setAtOldestLoaded] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  // How far the view sat from the strip's right-hand (newest) end just before
  // older days were prepended — restored afterwards, so the cells the reader
  // is looking at do not jump. `null` means "show the newest day".
  const fromRightRef = useRef<number | null>(null);

  const load = useCallback(
    async (until?: string) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      if (until) setState("older");
      try {
        const page = await fetchPage({ until, days: CODE_ACTIVITY_PAGE_DAYS }, true).unwrap();
        // A first page with nothing readable at all is an outage, not a quiet
        // month — an all-grey strip would claim nobody shipped anything.
        if (!until && page.incomplete && sumChurn(page.days) === 0) {
          setState("unavailable");
          return;
        }
        const el = scrollerRef.current;
        fromRightRef.current = until && el ? el.scrollWidth - el.scrollLeft : null;
        setDays(prev => mergeDays(prev, page.days));
        setHasOlder(page.hasOlder);
        setIncomplete(prev => prev || page.incomplete);
        if (!until) setRecentTotal(sumChurn(page.days));
        setState("ready");
      } catch {
        setState(until ? "olderError" : "unavailable");
      } finally {
        loadingRef.current = false;
      }
    },
    [fetchPage],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const syncEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setAtNewest(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
    setAtOldestLoaded(el.scrollLeft <= 2);
  }, []);

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el || days.length === 0) return;
    const fromRight = fromRightRef.current;
    el.scrollLeft = fromRight === null ? el.scrollWidth : el.scrollWidth - fromRight;
    fromRightRef.current = null;
    syncEdges();
  }, [days, syncEdges]);

  const oldestDate = days[0]?.date;

  const maybeLoadOlder = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || !oldestDate || !hasOlder || state !== "ready") return;
    if (el.scrollLeft <= el.clientWidth * LOAD_OLDER_WITHIN) void load(addDays(oldestDate, -1));
  }, [hasOlder, load, oldestDate, state]);

  // Also runs after each page lands: at desktop width the first month exactly
  // fills the strip, so there is nothing to scroll until one more is loaded.
  useEffect(() => {
    maybeLoadOlder();
  }, [maybeLoadOlder, days]);

  const onScroll = () => {
    syncEdges();
    maybeLoadOlder();
  };

  const scrollByPage = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    el?.scrollBy?.({ left: direction * el.clientWidth, behavior: "smooth" });
  };

  const moveActive = (to: number) => {
    const next = days[Math.max(0, Math.min(days.length - 1, to))];
    if (!next) return;
    setActiveDate(next.date);
    scrollerRef.current
      ?.querySelector(`[data-date="${next.date}"]`)
      ?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = activeDate ? days.findIndex(day => day.date === activeDate) : days.length;
    const moves: Record<string, number> = {
      ArrowLeft: current - 1,
      ArrowRight: activeDate ? current + 1 : days.length - 1,
      Home: 0,
      End: days.length - 1,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    moveActive(moves[event.key]);
  };

  const active = activeDate ? days.find(day => day.date === activeDate) : undefined;

  return (
    <section aria-labelledby="code-activity-title" className="mb-8">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h2 id="code-activity-title" className="text-base text-gray-900">
            Lines of code changed
          </h2>
          <p className="text-xs text-gray-600">
            added plus removed, across all of Ally&rsquo;s code, per day (UTC)
          </p>
        </div>
        {state !== "unavailable" && <Legend />}
      </div>

      {state === "unavailable" ? (
        <p className="text-sm text-gray-700">Code activity isn&rsquo;t available right now.</p>
      ) : state === "initial" ? (
        <Skeleton />
      ) : (
        <>
          <div
            ref={scrollerRef}
            onScroll={onScroll}
            onKeyDown={onKeyDown}
            onMouseLeave={() => setActiveDate(null)}
            onBlur={() => setActiveDate(null)}
            tabIndex={0}
            aria-label="Lines changed per day. Use the arrow keys to move between days."
            className="overflow-x-auto pb-1 [scrollbar-width:thin] focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/30"
          >
            <ol className={`grid grid-flow-col gap-1 ${COLUMNS_CLASS}`}>
              {days.map((day, i) => (
                <DayCell
                  key={day.date}
                  day={day}
                  label={axisLabel(days, i)}
                  isActive={day.date === activeDate}
                  onActivate={() => setActiveDate(day.date)}
                />
              ))}
            </ol>
          </div>

          <div className="mt-1 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-sm">
            <p aria-live="polite" className="text-gray-700">
              {active ? (
                <>
                  <span className="text-gray-900">{formatDay(active.date)}</span>
                  {active.partial && " (today, so far)"} · {formatLines(active.churn)} lines changed
                  {active.churn > 0 && (
                    <span className="text-gray-500">
                      {" "}
                      (+{formatLines(active.added)} / −{formatLines(active.deleted)})
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="text-gray-900">{formatLines(recentTotal)}</span> lines changed in
                  the last {CODE_ACTIVITY_PAGE_DAYS} days
                  {incomplete && (
                    <span className="text-xs text-gray-500">
                      {" "}
                      · some code couldn&rsquo;t be read, so the real figure may be higher
                    </span>
                  )}
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              {state === "older" && <span className="text-gray-500">Loading older days…</span>}
              {state === "olderError" && (
                <span className="text-gray-700">
                  Couldn&rsquo;t load older days.{" "}
                  <button
                    type="button"
                    onClick={() => oldestDate && void load(addDays(oldestDate, -1))}
                    className="underline underline-offset-2 hover:text-gray-900"
                  >
                    Try again
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={() => scrollByPage(-1)}
                disabled={atOldestLoaded && !hasOlder}
                className={NAV_BUTTON_CLASS}
              >
                ← Older
              </button>
              <button
                type="button"
                onClick={() => scrollByPage(1)}
                disabled={atNewest}
                className={NAV_BUTTON_CLASS}
              >
                Newer →
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

const DayCell: FC<{
  day: CodeActivityDay;
  label: ReturnType<typeof axisLabel>;
  isActive: boolean;
  onActivate: () => void;
}> = ({ day, label, isActive, onActivate }) => {
  const ring = isActive
    ? "ring-2 ring-gray-900 ring-offset-1 ring-offset-gray-50"
    : day.partial
      ? "ring-1 ring-gray-500 ring-offset-1 ring-offset-gray-50"
      : "";

  return (
    <li
      data-date={day.date}
      aria-label={`${formatDay(day.date)}: ${formatLines(day.churn)} lines changed${day.partial ? " so far today" : ""}`}
      onMouseEnter={onActivate}
      onClick={onActivate}
      className="flex min-w-0 flex-col gap-1"
    >
      <span
        aria-hidden="true"
        data-testid="code-activity-cell"
        className={`h-5 w-full ${CODE_ACTIVITY_LEVEL_CLASSES[activityLevel(day.churn)]} ${ring}`}
      />
      <span
        aria-hidden="true"
        className={`h-3 whitespace-nowrap text-[10px] leading-3 text-gray-500 ${
          label?.kind === "day" ? "text-center" : ""
        }`}
      >
        {label?.text ?? ""}
      </span>
    </li>
  );
};

const Legend: FC = () => (
  <div className="flex items-center gap-1.5 text-xs text-gray-500">
    <span>Less</span>
    {CODE_ACTIVITY_LEVEL_CLASSES.map((levelClass, level) => (
      <span
        key={levelClass}
        title={levelRangeLabel(level)}
        aria-label={levelRangeLabel(level)}
        role="img"
        className={`h-2.5 w-2.5 ${levelClass}`}
      />
    ))}
    <span>More</span>
  </div>
);

const Skeleton: FC = () => (
  <div aria-label="Loading code activity" role="status" className="pb-1">
    <div className={`grid grid-flow-col gap-1 ${COLUMNS_CLASS}`}>
      {Array.from({ length: CODE_ACTIVITY_PAGE_DAYS }, (_, i) => (
        <div key={i} className="flex flex-col gap-1">
          <span className={`h-5 w-full animate-pulse ${CODE_ACTIVITY_LEVEL_CLASSES[0]}`} />
          <span className="h-3" />
        </div>
      ))}
    </div>
  </div>
);
