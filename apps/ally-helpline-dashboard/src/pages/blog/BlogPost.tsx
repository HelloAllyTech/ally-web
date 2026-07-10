import { FC } from "react";

import { Link, useParams } from "react-router-dom";

import { RichTextRenderer } from "@ally-ui-mono/ui-shared";
import { useGetPublicBlogBySlugQuery } from "@api";
import { Ally } from "@assets";

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

export const BlogPost: FC = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const {
    data: post,
    isFetching,
    isError,
  } = useGetPublicBlogBySlugQuery({ slug }, { skip: !slug });

  return (
    <div className="min-h-screen bg-white font-primary">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 flex items-center">
          <Ally />
        </div>

        <Link to="/blog" className="text-sm text-typography-500 hover:text-typography-800">
          ← Back to blog
        </Link>

        {isFetching ? (
          <p className="mt-6 text-typography-700">Loading…</p>
        ) : isError || !post ? (
          <p className="mt-6 text-typography-700">
            This post could not be found or is no longer available.
          </p>
        ) : (
          <article className="mt-6">
            <header className="mb-8">
              <div className="mb-3 flex items-center gap-2 text-sm text-typography-500">
                {post.category && (
                  <span className="rounded-full bg-background-secondary px-2 py-0.5 font-medium text-typography-700">
                    {post.category}
                  </span>
                )}
                <span>{formatDate(post.publishedAt ?? post.createdAt)}</span>
              </div>
              <h1 className="font-secondary text-3xl leading-tight text-typography-900">
                {post.title}
              </h1>
              {post.tldr && <p className="mt-4 text-lg text-typography-600">{post.tldr}</p>}
            </header>

            {post.headerImageUrl && (
              <img
                src={post.headerImageUrl}
                alt={post.title}
                className="mb-8 w-full rounded-xl object-cover"
              />
            )}

            <RichTextRenderer
              content={post.body}
              allowImages
              className="max-w-none text-typography-800 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:my-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:my-1.5 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:my-1 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2 [&_li]:my-0.5 [&_blockquote]:border-l-4 [&_blockquote]:border-primary-300 [&_blockquote]:pl-4 [&_blockquote]:my-2 [&_blockquote]:italic"
            />

            {post.tags?.length > 0 && (
              <div className="mt-10 flex flex-wrap gap-2 border-t border-border-light pt-6">
                {post.tags.map(tag => (
                  <span
                    key={tag}
                    className="rounded-full bg-background-secondary px-3 py-1 text-sm text-typography-600"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </article>
        )}
      </div>
    </div>
  );
};
