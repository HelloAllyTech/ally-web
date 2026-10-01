import { FC, useMemo, useState } from "react";

import { Link, useSearchParams } from "react-router-dom";

import { BlogPost, useGetPublicBlogTagsQuery, useGetPublicBlogsQuery } from "@api";

import { BlogFooter } from "./BlogFooter";
import { BlogHeader } from "./BlogHeader";
import { BLOG_INDEX_DESCRIPTION, BLOG_INDEX_TITLE, BLOG_NAME } from "./blogMeta";
import { usePageMeta } from "./usePageMeta";

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

// Matches the column default in ally-be, for a post served before it had one.
const DEFAULT_COVER_COLOR = "#8B9A6D";

// The API's ceiling. Search runs over the loaded posts, so one page of the
// largest size keeps it covering the whole blog for as long as that fits.
const POSTS_PAGE_SIZE = 100;

// A card shows its first few tags; the post page lists them all.
const CARD_TAG_LIMIT = 3;

const TAG_PARAM = "tag";

const postDate = (post: BlogPost) => post.publishedAt ?? post.createdAt;

const CardCover: FC<{ post: BlogPost; className?: string }> = ({ post, className = "" }) =>
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
      style={{ backgroundColor: post.coverColor || DEFAULT_COVER_COLOR }}
    />
  );

const BlogCard: FC<{ post: BlogPost }> = ({ post }) => (
  <Link
    to={`/blog/${post.slug}`}
    className="group flex flex-col overflow-hidden border border-[#29261f]/10 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(20,20,19,0.08)]"
  >
    <CardCover post={post} className="aspect-[16/10]" />
    <div className="flex flex-1 flex-col p-5">
      <p className="text-xs text-[#928b7c]">{formatDate(postDate(post))}</p>
      <h3 className="mt-2 text-xl leading-snug text-[#29261f]">{post.title}</h3>
      {post.tags?.length > 0 && (
        <p className="mt-auto flex items-center gap-1.5 pt-6 text-xs text-[#928b7c]">
          <svg
            className="h-3.5 w-3.5 shrink-0"
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
          <span className="truncate">{post.tags.slice(0, CARD_TAG_LIMIT).join(" · ")}</span>
        </p>
      )}
    </div>
  </Link>
);

const FeaturedCard: FC<{ post: BlogPost }> = ({ post }) => (
  <Link
    to={`/blog/${post.slug}`}
    className="group grid overflow-hidden border border-[#29261f]/10 bg-white transition-shadow hover:shadow-[0_8px_24px_rgba(20,20,19,0.08)] md:grid-cols-2"
  >
    <div className="flex flex-col p-8 sm:p-10">
      <p className="text-sm text-[#928b7c]">{formatDate(postDate(post))}</p>
      <h2 className="mt-4 text-3xl leading-tight text-[#29261f] sm:text-4xl">{post.title}</h2>
      {post.tldr && <p className="mt-4 line-clamp-3 leading-relaxed text-[#565045]">{post.tldr}</p>}
      <span className="mt-8 w-fit rounded-lg bg-[#29261f] px-4 py-2 text-sm font-medium text-[#FAF9F5] transition-colors group-hover:bg-[#3d3a34]">
        Read more
      </span>
    </div>
    <CardCover post={post} className="h-full min-h-[240px]" />
  </Link>
);

const TagChip: FC<{ label: string; isActive: boolean; onClick: () => void }> = ({
  label,
  isActive,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={isActive}
    className={`shrink-0 rounded-full border px-3.5 py-1 text-sm transition-colors ${
      isActive
        ? "border-[#29261f] bg-[#29261f] text-[#FAF9F5]"
        : "border-[#29261f]/15 bg-white text-[#565045] hover:border-[#29261f]/40 hover:text-[#29261f]"
    }`}
  >
    {label}
  </button>
);

export const Blog: FC = () => {
  usePageMeta({
    title: BLOG_INDEX_TITLE,
    description: BLOG_INDEX_DESCRIPTION,
    url: "/blog",
  });

  // The active tag lives in the URL so a filtered view can be shared, and so a
  // tag on a post page can link straight to it.
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTag = searchParams.get(TAG_PARAM);
  const setActiveTag = (tag: string | null) =>
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev);
        if (tag) next.set(TAG_PARAM, tag);
        else next.delete(TAG_PARAM);
        return next;
      },
      { replace: true },
    );

  const [search, setSearch] = useState("");

  const { data, isLoading, isFetching, isError } = useGetPublicBlogsQuery({
    limit: POSTS_PAGE_SIZE,
    ...(activeTag ? { tag: activeTag } : {}),
  });
  const { data: tagData } = useGetPublicBlogTagsQuery();
  const tags = tagData?.tags ?? [];

  const posts = useMemo(
    () =>
      [...(data?.blogs ?? [])].sort(
        (a, b) => new Date(postDate(b)).getTime() - new Date(postDate(a)).getTime(),
      ),
    [data],
  );

  const filteredPosts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return posts.filter(post => {
      // The server already filters by tag; repeating it here keeps the previous
      // tag's posts from showing while the new request is in flight.
      if (activeTag && !post.tags?.includes(activeTag)) return false;
      if (!query) return true;
      return [post.title, post.tldr, ...(post.tags ?? [])]
        .filter(Boolean)
        .some(field => field!.toLowerCase().includes(query));
    });
  }, [posts, search, activeTag]);

  // The featured slot only makes sense on the unfiltered view — once the
  // reader is searching or filtering, every match ranks equally.
  const isFiltering = Boolean(search.trim() || activeTag);
  const featuredPost = !isFiltering && filteredPosts.length > 0 ? filteredPosts[0] : null;
  const gridPosts = featuredPost ? filteredPosts.slice(1) : filteredPosts;

  const emptyMessage = search.trim()
    ? `No posts match “${search.trim()}”.`
    : "No posts with this tag yet.";

  return (
    <div className="blog-serif flex min-h-dvh flex-col bg-[#FAF9F5] text-[#29261f]">
      <BlogHeader search={{ value: search, onChange: setSearch }} />
      {/* The wordmark is an image, so the page's heading is carried here. */}
      <h1 className="sr-only">{BLOG_NAME}</h1>

      <div className="mx-auto w-full max-w-6xl flex-1 px-6 pb-16 pt-6">
        {tags.length > 0 && (
          <nav aria-label="Filter posts by tag" className="mb-8 flex flex-wrap gap-2">
            <TagChip label="All" isActive={!activeTag} onClick={() => setActiveTag(null)} />
            {tags.map(({ tag }) => (
              <TagChip
                key={tag}
                label={tag}
                isActive={activeTag === tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              />
            ))}
          </nav>
        )}

        {isLoading ? (
          <p className="text-[#565045]">Loading…</p>
        ) : isError ? (
          <p className="text-[#565045]">
            Something went wrong loading posts. Please try again later.
          </p>
        ) : posts.length === 0 && !activeTag ? (
          <p className="text-[#565045]">No posts published yet. Check back soon!</p>
        ) : filteredPosts.length === 0 ? (
          <p className="text-[#565045]">{isFetching ? "Loading…" : emptyMessage}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {featuredPost && <FeaturedCard post={featuredPost} />}
            {gridPosts.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {gridPosts.map(post => (
                  <BlogCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <BlogFooter />
    </div>
  );
};
