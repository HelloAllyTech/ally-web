import { FC, useEffect, useState } from "react";

import { Link } from "react-router-dom";

import { ChangelogEntry, useGetPublicChangelogQuery } from "@api";
import { Ally } from "@assets";
import { ROUTES } from "@constants";

const PAGE_SIZE = 100;

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

const groupByDate = (entries: ChangelogEntry[]) => {
  const groups: { date: string; entries: ChangelogEntry[] }[] = [];
  entries.forEach(entry => {
    const date = formatDate(entry.mergedAt);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.date === date) {
      lastGroup.entries.push(entry);
    } else {
      groups.push({ date, entries: [entry] });
    }
  });
  return groups;
};

export const Changelog: FC = () => {
  const [offset, setOffset] = useState(0);
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  // `data` persists the previous page's result while a new offset is loading
  // (to avoid UI flicker) — using it here would append that stale page a
  // second time. `currentData` is undefined until the request for the
  // *current* args resolves, so it's the only field safe to accumulate from.
  const { data, currentData, isFetching, isError } = useGetPublicChangelogQuery({
    offset,
    limit: PAGE_SIZE,
  });

  // The feed only ever grows, so a plain single fetch silently truncates to the
  // most recent PAGE_SIZE entries. Accumulate pages locally rather than relying
  // on RTK Query's per-arg cache to merge them for us.
  useEffect(() => {
    if (!currentData) return;
    setEntries(prev => (offset === 0 ? currentData.entries : [...prev, ...currentData.entries]));
  }, [currentData, offset]);

  const groups = groupByDate(entries);
  const hasMore = entries.length < (data?.count ?? 0);
  const isInitialLoad = isFetching && offset === 0;

  return (
    <div className="min-h-dvh bg-white font-primary">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-center">
          <Ally />
        </div>
        <header className="mb-10">
          <Link
            to={ROUTES.BLOG}
            className="mb-4 inline-block text-sm text-typography-600 hover:text-typography-900"
          >
            ← Back to Blog
          </Link>
          <h1 className="font-secondary text-3xl text-typography-900">Changelog</h1>
          <p className="mt-2 text-typography-600">
            Every update we&apos;ve shipped, in plain language.
          </p>
        </header>

        {isInitialLoad ? (
          <p className="text-typography-700">Loading…</p>
        ) : isError ? (
          <p className="text-typography-700">
            Something went wrong loading the changelog. Please try again later.
          </p>
        ) : entries.length === 0 ? (
          <p className="text-typography-700">No updates yet. Check back soon!</p>
        ) : (
          <div className="flex flex-col gap-8">
            {groups.map(group => (
              <div key={group.date}>
                <h2 className="mb-3 font-secondary text-lg text-typography-900">{group.date}</h2>
                <ul className="list-disc space-y-2 pl-5">
                  {group.entries.map(entry => (
                    <li key={entry.id} className="text-sm text-typography-700">
                      {entry.releaseNoteText}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {hasMore && (
              <button
                type="button"
                onClick={() => setOffset(prev => prev + PAGE_SIZE)}
                disabled={isFetching}
                className="self-center text-sm font-medium text-primary-500 disabled:opacity-50"
              >
                {isFetching ? "Loading..." : "+ Load more"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
