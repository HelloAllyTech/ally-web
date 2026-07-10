import { FC } from "react";

import { Link } from "react-router-dom";

import { BlogPost, useGetPublicBlogsQuery } from "@api";
import { Ally } from "@assets";

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
      <div className="mb-2 flex items-center gap-2 text-xs text-typography-500">
        {post.category && (
          <span className="rounded-full bg-background-secondary px-2 py-0.5 font-medium text-typography-700">
            {post.category}
          </span>
        )}
        <span>{formatDate(post.publishedAt ?? post.createdAt)}</span>
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

  return (
    <div className="min-h-screen bg-white font-primary">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-center">
          <Ally />
        </div>
        <header className="mb-10">
          <h1 className="font-secondary text-3xl text-typography-900">Blog</h1>
          <p className="mt-2 text-typography-600">
            Product updates, release announcements and news from the Ally team.
          </p>
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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map(post => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
