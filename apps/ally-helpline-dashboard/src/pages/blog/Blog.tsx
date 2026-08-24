import { FC, useMemo, useState } from "react";

import { Link } from "react-router-dom";

import { BlogPost, useGetPublicBlogsQuery } from "@api";
import { Ally } from "@assets";
import { ROUTES } from "@constants";

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

const BlogCard: FC<{ post: BlogPost }> = ({ post }) => (
  <Link
    to={`/blog/${post.slug}`}
    className="group flex flex-col overflow-hidden rounded-xl border border-border-light bg-white transition-shadow hover:shadow-md"
  >
    {post.headerImageUrl ? (
      <img src={post.headerImageUrl} alt={post.title} className="h-44 w-full object-cover" />
    ) : (
      <div className="h-44 w-full bg-background-secondary" />
    )}
    <div className="flex flex-1 flex-col p-5">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-typography-500">
        {post.category && (
          <span className="rounded-full bg-background-secondary px-2 py-0.5 font-medium text-typography-700">
            {post.category}
          </span>
        )}
        <span>{formatDate(post.publishedAt ?? post.createdAt)}</span>
        {post.authorName && <span>· {post.authorName}</span>}
      </div>
      <h2 className="mb-2 font-secondary text-xl text-typography-900 group-hover:text-typography-700">
        {post.title}
      </h2>
      {post.tldr && <p className="line-clamp-3 flex-1 text-sm text-typography-600">{post.tldr}</p>}
    </div>
  </Link>
);

export const Blog: FC = () => {
  const { data, isFetching, isError } = useGetPublicBlogsQuery();
  const posts = data?.blogs ?? [];

  const [search, setSearch] = useState("");

  const filteredPosts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return posts;
    return posts.filter(post =>
      [post.title, post.tldr, post.category, ...(post.tags ?? [])]
        .filter(Boolean)
        .some(field => field!.toLowerCase().includes(query)),
    );
  }, [posts, search]);

  return (
    <div className="min-h-dvh bg-white font-primary">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-center">
          <Ally />
        </div>
        <header className="mb-10 flex items-start justify-between">
          <div>
            <h1 className="font-secondary text-3xl text-typography-900">Blog</h1>
            <p className="mt-2 text-typography-600">
              Product updates, research and news from the Ally team.
            </p>
          </div>
          <Link
            to={ROUTES.CHANGELOG}
            aria-label="View changelog"
            title="Changelog"
            className="text-typography-400 transition-colors hover:text-typography-700"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" />
            </svg>
          </Link>
        </header>

        {isFetching ? (
          <p className="text-typography-700">Loading…</p>
        ) : isError ? (
          <p className="text-typography-700">
            Something went wrong loading posts. Please try again later.
          </p>
        ) : posts.length === 0 ? (
          <p className="text-typography-700">No posts published yet. Check back soon!</p>
        ) : (
          <>
            <div className="relative mb-8 max-w-md">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-typography-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="search"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search posts…"
                aria-label="Search posts"
                className="w-full rounded-lg border border-border-light bg-white py-2.5 pl-10 pr-3 text-sm text-typography-900 placeholder:text-typography-400 focus:border-typography-400 focus:outline-none"
              />
            </div>

            {filteredPosts.length === 0 ? (
              <p className="text-typography-700">No posts match your search.</p>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredPosts.map(post => (
                  <BlogCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
