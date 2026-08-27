import { FC, useMemo, useState } from "react";

import { Link } from "react-router-dom";

import { BlogPost, useGetPublicBlogsQuery } from "@api";
import { Ally } from "@assets";
import { ALLY_URL } from "@constants";

import { BlogFooter } from "./BlogFooter";
import { BLOG_INDEX_DESCRIPTION, BLOG_INDEX_TITLE } from "./blogMeta";
import { usePageMeta } from "./usePageMeta";

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

// Muted cover colours cycled for posts without a header image, so the grid
// keeps its rhythm instead of collapsing into grey blocks.
const COVER_COLORS = ["#8B9A6D", "#C9CCE2", "#7C96CE", "#E4D7BC"];

const postDate = (post: BlogPost) => post.publishedAt ?? post.createdAt;

const CardCover: FC<{ post: BlogPost; index: number; className?: string }> = ({
  post,
  index,
  className = "",
}) =>
  post.headerImageUrl ? (
    <img
      src={post.headerImageUrl}
      alt=""
      aria-hidden="true"
      className={`w-full object-cover ${className}`}
    />
  ) : (
    <div
      aria-hidden="true"
      className={`w-full ${className}`}
      style={{ backgroundColor: COVER_COLORS[index % COVER_COLORS.length] }}
    />
  );

const BlogCard: FC<{ post: BlogPost; index: number }> = ({ post, index }) => (
  <Link
    to={`/blog/${post.slug}`}
    className="group flex flex-col overflow-hidden rounded-2xl border border-[#141413]/10 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(20,20,19,0.08)]"
  >
    <CardCover post={post} index={index} className="aspect-[16/10]" />
    <div className="flex flex-1 flex-col p-5">
      <p className="text-xs text-[#87867F]">{formatDate(postDate(post))}</p>
      <h3 className="blog-serif mt-2 text-xl leading-snug text-[#141413]">{post.title}</h3>
      {post.category && (
        <p className="mt-auto flex items-center gap-1.5 pt-6 text-xs text-[#87867F]">
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24H4a1 1 0 0 0-1 1v5.59a2 2 0 0 0 .59 1.41l9.58 9.59a2 2 0 0 0 2.83 0l4.59-4.59a2 2 0 0 0 0-2.83Z" />
            <circle cx="7.5" cy="7.5" r="0.5" fill="currentColor" />
          </svg>
          {post.category}
        </p>
      )}
    </div>
  </Link>
);

const FeaturedCard: FC<{ post: BlogPost }> = ({ post }) => (
  <Link
    to={`/blog/${post.slug}`}
    className="group grid overflow-hidden rounded-2xl border border-[#141413]/10 bg-white transition-shadow hover:shadow-[0_8px_24px_rgba(20,20,19,0.08)] md:grid-cols-2"
  >
    <div className="flex flex-col p-8 sm:p-10">
      <p className="text-sm text-[#87867F]">
        {post.category && <span>{post.category} · </span>}
        {formatDate(postDate(post))}
      </p>
      <h2 className="blog-serif mt-4 text-3xl leading-tight text-[#141413] sm:text-4xl">
        {post.title}
      </h2>
      {post.tldr && <p className="mt-4 line-clamp-3 leading-relaxed text-[#5E5D59]">{post.tldr}</p>}
      <span className="mt-8 w-fit rounded-lg bg-[#141413] px-4 py-2 text-sm font-medium text-[#FAF9F5] transition-colors group-hover:bg-[#3D3D3A]">
        Read more
      </span>
    </div>
    <CardCover post={post} index={0} className="h-full min-h-[240px]" />
  </Link>
);

export const Blog: FC = () => {
  const { data, isFetching, isError } = useGetPublicBlogsQuery();

  usePageMeta({
    title: BLOG_INDEX_TITLE,
    description: BLOG_INDEX_DESCRIPTION,
    url: "/blog",
  });

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const posts = useMemo(
    () =>
      [...(data?.blogs ?? [])].sort(
        (a, b) => new Date(postDate(b)).getTime() - new Date(postDate(a)).getTime(),
      ),
    [data],
  );

  // Category links in the hero, most-published first, capped so the display
  // type stays a short list rather than a directory.
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    posts.forEach(post => {
      if (post.category) counts.set(post.category, (counts.get(post.category) ?? 0) + 1);
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category]) => category);
  }, [posts]);

  const filteredPosts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return posts.filter(post => {
      if (activeCategory && post.category !== activeCategory) return false;
      if (!query) return true;
      return [post.title, post.tldr, post.category, ...(post.tags ?? [])]
        .filter(Boolean)
        .some(field => field!.toLowerCase().includes(query));
    });
  }, [posts, search, activeCategory]);

  // The featured slot only makes sense on the unfiltered view — once the
  // reader is searching or filtering, every match ranks equally.
  const isFiltering = Boolean(search.trim() || activeCategory);
  const featuredPost = !isFiltering && filteredPosts.length > 0 ? filteredPosts[0] : null;
  const gridPosts = featuredPost ? filteredPosts.slice(1) : filteredPosts;

  return (
    <div className="blog-sans flex min-h-dvh flex-col bg-[#FAF9F5] text-[#141413]">
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 pb-28 pt-8">
        <div className="flex items-center justify-between">
          <Ally />
          <a
            href={ALLY_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-[#141413] px-4 py-2 text-sm font-medium text-[#FAF9F5] transition-colors hover:bg-[#3D3D3A]"
          >
            Try Ally
          </a>
        </div>

        <header className="grid gap-10 py-14 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <div>
            <h1 className="text-lg font-semibold">Blog</h1>
            <p className="mt-5 max-w-xs leading-relaxed text-[#5E5D59]">{BLOG_INDEX_DESCRIPTION}</p>
          </div>
          {categories.length > 0 && (
            <nav aria-label="Post categories" className="flex flex-col items-start gap-1">
              {categories.map(category => {
                const isActive = activeCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(isActive ? null : category)}
                    className={`blog-serif group flex items-baseline gap-3 text-left text-4xl leading-tight transition-colors sm:text-5xl ${
                      isActive ? "text-[#D97757]" : "text-[#141413] hover:text-[#5E5D59]"
                    }`}
                  >
                    {category}
                    <span
                      aria-hidden="true"
                      className="text-3xl text-[#87867F] transition-transform group-hover:translate-x-1 sm:text-4xl"
                    >
                      →
                    </span>
                  </button>
                );
              })}
            </nav>
          )}
        </header>

        {isFetching ? (
          <p className="text-[#5E5D59]">Loading…</p>
        ) : isError ? (
          <p className="text-[#5E5D59]">
            Something went wrong loading posts. Please try again later.
          </p>
        ) : posts.length === 0 ? (
          <p className="text-[#5E5D59]">No posts published yet. Check back soon!</p>
        ) : (
          <>
            {activeCategory && (
              <div className="mb-6 flex items-center gap-3 text-sm text-[#5E5D59]">
                <span>
                  Showing <span className="font-medium text-[#141413]">{activeCategory}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveCategory(null)}
                  className="rounded-full border border-[#141413]/15 px-3 py-0.5 transition-colors hover:bg-[#141413]/5"
                >
                  Clear ×
                </button>
              </div>
            )}

            {filteredPosts.length === 0 ? (
              <p className="text-[#5E5D59]">No posts match your search.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {featuredPost && <FeaturedCard post={featuredPost} />}
                {gridPosts.length > 0 && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {gridPosts.map((post, index) => (
                      <BlogCard key={post.id} post={post} index={index} />
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="pointer-events-none fixed inset-x-0 bottom-6 z-10 px-6">
              <div className="pointer-events-auto relative mx-auto w-full max-w-md">
                <svg
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#87867F]"
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
                  placeholder="Search posts"
                  aria-label="Search posts"
                  className="w-full rounded-xl border border-[#141413]/15 bg-white/90 py-3 pl-11 pr-4 text-sm text-[#141413] shadow-[0_8px_30px_rgba(20,20,19,0.12)] backdrop-blur placeholder:text-[#87867F] focus:border-[#141413]/40 focus:outline-none"
                />
              </div>
            </div>
          </>
        )}
      </div>
      {/* The search bar floats over the bottom of the viewport, so the footer
          needs room underneath its own content or the bar covers those links. */}
      <BlogFooter className="pb-28" />
    </div>
  );
};
