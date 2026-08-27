import { FC, useEffect, useState } from "react";

import { Link } from "react-router-dom";

import { ChangelogEntry, useGetPublicChangelogQuery } from "@api";
import { Ally } from "@assets";
import { ROUTES } from "@constants";

import { BlogFooter } from "./BlogFooter";
import { CHANGELOG_DESCRIPTION, CHANGELOG_TITLE } from "./blogMeta";
import { usePageMeta } from "./usePageMeta";

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
  usePageMeta({
    title: CHANGELOG_TITLE,
    description: CHANGELOG_DESCRIPTION,
    url: "/blog/changelog",
  });

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
    <div className="blog-sans flex min-h-dvh flex-col bg-[#FAF9F5] text-[#141413]">
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <div className="mb-8 flex items-center">
          <Ally />
        </div>
        <header className="mb-12">
          <Link
            to={ROUTES.BLOG}
            className="mb-6 inline-block text-sm text-[#87867F] transition-colors hover:text-[#141413]"
          >
            ← Blog
          </Link>
          <h1 className="blog-serif text-4xl sm:text-5xl">Changelog</h1>
          <p className="mt-4 text-[#5E5D59]">{CHANGELOG_DESCRIPTION}</p>
        </header>

        {isInitialLoad ? (
          <p className="text-[#5E5D59]">Loading…</p>
        ) : isError ? (
          <p className="text-[#5E5D59]">
            Something went wrong loading the changelog. Please try again later.
          </p>
        ) : entries.length === 0 ? (
          <p className="text-[#5E5D59]">No updates yet. Check back soon!</p>
        ) : (
          <div className="flex flex-col gap-8">
            {groups.map(group => (
              <div key={group.date}>
                <h2 className="blog-serif mb-3 text-xl">{group.date}</h2>
                <ul className="list-disc space-y-2 pl-5">
                  {group.entries.map(entry => (
                    <li key={entry.id} className="text-sm leading-relaxed text-[#5E5D59]">
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
                className="self-center rounded-lg bg-[#141413]/5 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-[#141413]/10 disabled:opacity-50"
              >
                {isFetching ? "Loading..." : "View more"}
              </button>
            )}
          </div>
        )}
      </div>
      <BlogFooter />
    </div>
  );
};
