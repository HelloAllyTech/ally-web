import { FC, useEffect, useRef, useState } from "react";

import { ProductUpdateSurface, PublicProductUpdate, useGetPublicProductUpdatesQuery } from "@api";

import {
  DayGroup,
  KIND_LABELS,
  SURFACE_FILTERS,
  SURFACE_LABELS,
  daySummary,
  formatDay,
  groupByDay,
} from "./productUpdateDays";

const PAGE_SIZE = 30;

const KIND_BADGE: Record<"new" | "improved", string> = {
  new: "bg-status-sageBg text-status-sageFg",
  improved: "bg-status-ochreBg text-status-ochreFg",
};

const updateUrl = (slug: string) => `${window.location.origin}/blog/changelog#${slug}`;

/**
 * Copies a link straight to one update. Shown on hover (and always on touch
 * screens, which have no hover) so a card at rest is just its words.
 */
const CopyLink: FC<{ slug: string }> = ({ slug }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(updateUrl(slug));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be blocked; fail silently, as ShareActions does.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={`ml-auto min-h-[40px] border border-transparent px-1.5 py-0.5 text-gray-600 md:min-h-0 transition-opacity hover:border-gray-900/15 hover:text-gray-900 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100 ${
        copied ? "opacity-100" : "opacity-0"
      }`}
    >
      {copied ? "Link copied" : "Copy link"}
    </button>
  );
};

const UpdateCard: FC<{ update: PublicProductUpdate }> = ({ update }) => (
  <article
    id={update.slug}
    className="group scroll-mt-24 border border-gray-900/10 bg-white px-5 py-4"
  >
    <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs">
      <span className="mr-1 uppercase tracking-wider text-gray-600">{update.area}</span>
      {update.kind !== "fixed" && (
        <span className={`px-2 py-0.5 font-medium ${KIND_BADGE[update.kind]}`}>
          {KIND_LABELS[update.kind]}
        </span>
      )}
      {update.surfaces.map(surface => (
        <span key={surface} className="border border-gray-900/15 px-2 py-0.5 text-gray-700">
          {SURFACE_LABELS[surface]}
        </span>
      ))}
      <CopyLink slug={update.slug} />
    </div>
    <h3 className="text-lg leading-snug text-gray-900">{update.title}</h3>
    <p className="mt-1.5 text-sm leading-relaxed text-gray-700">{update.summary}</p>
  </article>
);

const Chevron: FC<{ open: boolean }> = ({ open }) => (
  <svg
    className={`h-3.5 w-3.5 shrink-0 self-center text-gray-700 transition-transform motion-reduce:transition-none ${
      open ? "rotate-90" : ""
    }`}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    aria-hidden="true"
  >
    <path d="M6 3.5 10.5 8 6 12.5" />
  </svg>
);

/**
 * One day of the feed as a section that folds. The heading holds the toggle
 * button (the WAI-ARIA accordion pattern), so the day stays a level-2
 * heading for anyone navigating by headings.
 */
const DaySection: FC<{ group: DayGroup; open: boolean; onToggle: () => void }> = ({
  group,
  open,
  onToggle,
}) => {
  const panelId = `day-${group.key}`;
  return (
    <section>
      <h2 className="border-b border-gray-900/10">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="group/day flex w-full flex-wrap items-baseline gap-x-3 gap-y-1 py-3 text-left"
        >
          <Chevron open={open} />
          <span className="text-xl decoration-1 underline-offset-4 group-hover/day:underline">
            {formatDay(group.key)}
          </span>
          <span className="text-sm text-gray-600">{daySummary(group)}</span>
        </button>
      </h2>
      <div id={panelId} hidden={!open} className="pb-10 pt-5">
        {group.highlights.length > 0 && (
          <div className="flex flex-col gap-3">
            {group.highlights.map(update => (
              <UpdateCard key={update.id} update={update} />
            ))}
          </div>
        )}
        {group.fixes.length > 0 && (
          <div
            className={`border border-gray-900/10 bg-white ${
              group.highlights.length > 0 ? "mt-5" : ""
            }`}
          >
            <h3 className="border-b border-gray-900/10 px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-700">
              Fixes
            </h3>
            <ul className="divide-y divide-gray-900/10 text-sm leading-relaxed text-gray-700">
              {group.fixes.map(update => (
                <li key={update.id} id={update.slug} className="scroll-mt-24 px-5 py-3">
                  <span className="text-gray-900">{update.title}.</span> {update.summary}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
};

/**
 * The public list of product updates: one entry per change a person would
 * recognise, grouped by the day it went live, newest first. New and improved
 * things get a card each; a day's fixes share one short list, so a busy day
 * of small repairs doesn't bury the day's real news. Every day starts open and
 * can be folded away, one at a time or all at once.
 *
 * Everything here is already live in production — the backend only serves an
 * update once every change in it has shipped.
 */
export const ProductUpdatesFeed: FC = () => {
  const [surface, setSurface] = useState<ProductUpdateSurface | null>(null);
  const [offset, setOffset] = useState(0);
  const [updates, setUpdates] = useState<PublicProductUpdate[]>([]);
  // Days the reader has folded. Tracking the closed ones, not the open ones,
  // is what makes every day — including those a later page brings in — open
  // until someone closes it.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const scrolledToHash = useRef(false);

  // `currentData` is undefined until the request for the *current* args
  // resolves; accumulating from `data` would append the previous page twice.
  const { data, currentData, isFetching, isError } = useGetPublicProductUpdatesQuery({
    offset,
    limit: PAGE_SIZE,
    ...(surface ? { surface } : {}),
  });

  useEffect(() => {
    if (!currentData) return;
    setUpdates(prev => (offset === 0 ? currentData.updates : [...prev, ...currentData.updates]));
  }, [currentData, offset]);

  const chooseSurface = (next: ProductUpdateSurface | null) => {
    if (next === surface) return;
    setSurface(next);
    setOffset(0);
    setUpdates([]);
  };

  const groups = groupByDay(updates);

  // A copied link points at one update, but the feed arrives after the page
  // does, so the browser's own jump to `#slug` finds nothing. Make it once,
  // when the update is first on the page.
  useEffect(() => {
    const slug = decodeURIComponent(window.location.hash.slice(1));
    if (!slug || scrolledToHash.current) return;
    const target = document.getElementById(slug);
    if (!target) return;
    scrolledToHash.current = true;
    target.scrollIntoView({ block: "start" });
  }, [updates]);

  const toggleDay = (key: string) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const allOpen = groups.every(group => !collapsed.has(group.key));
  const toggleAll = () =>
    setCollapsed(allOpen ? new Set(groups.map(group => group.key)) : new Set());
  const hasMore = updates.length < (data?.count ?? 0);
  const isInitialLoad = isFetching && offset === 0;
  const surfaceLabel = surface ? SURFACE_LABELS[surface] : null;

  return (
    <section aria-labelledby="product-updates-heading">
      <h2 id="product-updates-heading" className="sr-only">
        Product updates
      </h2>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 text-sm">
        <div
          role="group"
          aria-label="Show updates for"
          className="flex flex-wrap items-center gap-2"
        >
          {SURFACE_FILTERS.map(filter => {
            const active = filter.value === surface;
            return (
              <button
                key={filter.label}
                type="button"
                aria-pressed={active}
                onClick={() => chooseSurface(filter.value)}
                className={`min-h-[40px] border px-3 py-1 transition-colors md:min-h-0 ${
                  active
                    ? "border-gray-900 bg-gray-900 text-gray-50"
                    : "border-gray-900/15 text-gray-700 hover:bg-gray-900/5"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
        {groups.length > 1 && (
          <button
            type="button"
            onClick={toggleAll}
            className="min-h-[40px] text-gray-700 underline underline-offset-2 hover:text-gray-900 md:min-h-0"
          >
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
        )}
      </div>

      {isInitialLoad ? (
        <p className="text-gray-700">Loading…</p>
      ) : isError ? (
        <p className="text-gray-700">
          Something went wrong loading the changelog. Please try again later.
        </p>
      ) : updates.length === 0 ? (
        surfaceLabel ? (
          <p className="text-gray-700">
            Nothing for the {surfaceLabel} yet.{" "}
            <button
              type="button"
              onClick={() => chooseSurface(null)}
              className="underline underline-offset-2 hover:text-gray-900"
            >
              See all updates
            </button>
          </p>
        ) : (
          <p className="text-gray-700">No updates yet. Check back soon!</p>
        )
      ) : (
        <div className="flex flex-col">
          {groups.map(group => (
            <DaySection
              key={group.key}
              group={group}
              open={!collapsed.has(group.key)}
              onToggle={() => toggleDay(group.key)}
            />
          ))}
          {hasMore && (
            <button
              type="button"
              onClick={() => setOffset(prev => prev + PAGE_SIZE)}
              disabled={isFetching}
              className="mt-8 self-center border border-gray-900/10 bg-gray-900/5 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-gray-900/10 disabled:opacity-50"
            >
              {isFetching ? "Loading..." : "View more"}
            </button>
          )}
        </div>
      )}
    </section>
  );
};
