import { FC, useEffect, useState } from "react";

import { ProductUpdateSurface, PublicProductUpdate, useGetPublicProductUpdatesQuery } from "@api";

import {
  KIND_LABELS,
  SURFACE_FILTERS,
  SURFACE_LABELS,
  formatDay,
  groupByDay,
} from "./productUpdateDays";

const PAGE_SIZE = 30;

const KIND_BADGE: Record<"new" | "improved", string> = {
  new: "bg-status-sageBg text-status-sageFg",
  improved: "bg-status-ochreBg text-status-ochreFg",
};

const UpdateCard: FC<{ update: PublicProductUpdate }> = ({ update }) => (
  <article id={update.slug} className="rounded-2xl border border-gray-900/10 bg-white p-5">
    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
      {update.kind !== "fixed" && (
        <span className={`rounded-full px-2.5 py-0.5 font-medium ${KIND_BADGE[update.kind]}`}>
          {KIND_LABELS[update.kind]}
        </span>
      )}
      {update.surfaces.map(surface => (
        <span
          key={surface}
          className="rounded-full border border-gray-900/15 px-2.5 py-0.5 text-gray-700"
        >
          {SURFACE_LABELS[surface]}
        </span>
      ))}
    </div>
    <h3 className="text-lg leading-snug text-gray-900">{update.title}</h3>
    <p className="mt-1.5 text-sm leading-relaxed text-gray-700">{update.summary}</p>
  </article>
);

/**
 * The public list of product updates: one entry per change a person would
 * recognise, grouped by the day it went live, newest first. New and improved
 * things get a card each; a day's fixes share one short list, so a busy day
 * of small repairs doesn't bury the day's real news.
 *
 * Everything here is already live in production — the backend only serves an
 * update once every change in it has shipped.
 */
export const ProductUpdatesFeed: FC = () => {
  const [surface, setSurface] = useState<ProductUpdateSurface | null>(null);
  const [offset, setOffset] = useState(0);
  const [updates, setUpdates] = useState<PublicProductUpdate[]>([]);

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
  const hasMore = updates.length < (data?.count ?? 0);
  const isInitialLoad = isFetching && offset === 0;
  const surfaceLabel = surface ? SURFACE_LABELS[surface] : null;

  return (
    <section aria-labelledby="product-updates-heading">
      <h2 id="product-updates-heading" className="sr-only">
        Product updates
      </h2>
      <div
        role="group"
        aria-label="Show updates for"
        className="mb-8 flex flex-wrap items-center gap-2 text-sm"
      >
        {SURFACE_FILTERS.map(filter => {
          const active = filter.value === surface;
          return (
            <button
              key={filter.label}
              type="button"
              aria-pressed={active}
              onClick={() => chooseSurface(filter.value)}
              className={`rounded-full border px-3 py-1 transition-colors ${
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
        <div className="flex flex-col gap-12">
          {groups.map(group => (
            <div key={group.key}>
              <h2 className="mb-4 text-xl">{formatDay(group.key)}</h2>
              {group.highlights.length > 0 && (
                <div className="flex flex-col gap-4">
                  {group.highlights.map(update => (
                    <UpdateCard key={update.id} update={update} />
                  ))}
                </div>
              )}
              {group.fixes.length > 0 && (
                <div className={group.highlights.length > 0 ? "mt-6" : undefined}>
                  <h3 className="mb-2 text-sm font-medium text-gray-900">Fixes</h3>
                  <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-700">
                    {group.fixes.map(update => (
                      <li key={update.id} id={update.slug}>
                        <span className="text-gray-900">{update.title}.</span> {update.summary}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
          {hasMore && (
            <button
              type="button"
              onClick={() => setOffset(prev => prev + PAGE_SIZE)}
              disabled={isFetching}
              className="self-center rounded-lg bg-gray-900/5 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-gray-900/10 disabled:opacity-50"
            >
              {isFetching ? "Loading..." : "View more"}
            </button>
          )}
        </div>
      )}
    </section>
  );
};
