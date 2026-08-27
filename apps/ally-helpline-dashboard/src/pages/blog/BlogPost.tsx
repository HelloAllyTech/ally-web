import { FC } from "react";

import { Link, useParams } from "react-router-dom";

import { RichTextRenderer } from "@ally-ui-mono/ui-shared";
import { useGetPublicBlogBySlugQuery } from "@api";
import { Ally } from "@assets";
import { ALLY_URL } from "@constants";

import { BlogFooter } from "./BlogFooter";
import {
  BLOG_INDEX_DESCRIPTION,
  BLOG_INDEX_TITLE,
  blogPostTitle,
  excerptFromHtml,
} from "./blogMeta";
import { ShareActions } from "./ShareActions";
import { usePageMeta } from "./usePageMeta";

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

  // These tags are set client-side, which is enough for the browser tab and for
  // crawlers that render JS. Link-preview scrapers (WhatsApp, Slack, LinkedIn)
  // read the raw HTML and never run the bundle, so they still see index.html's
  // defaults — giving them per-post tags needs server-rendered HTML for
  // /blog/:slug. See usePageMeta for the full note.
  usePageMeta({
    title: post ? blogPostTitle(post.title) : BLOG_INDEX_TITLE,
    // `||` not `??`: tldr is a nullable text column, so a post saved with an
    // empty one should still fall through to an excerpt of the body.
    description: post ? post.tldr || excerptFromHtml(post.body) : BLOG_INDEX_DESCRIPTION,
    image: post?.headerImageUrl,
    url: `/blog/${slug}`,
    type: post ? "article" : "website",
    publishedTime: post?.publishedAt ?? post?.createdAt,
  });

  return (
    <div className="blog-sans flex min-h-dvh flex-col bg-[#FAF9F5] text-[#141413]">
      <div className="mx-auto w-full max-w-6xl px-6 pt-8">
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
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 px-6 pb-16 pt-12">
        <Link to="/blog" className="text-sm text-[#87867F] transition-colors hover:text-[#141413]">
          ← Blog
        </Link>

        {isFetching ? (
          <p className="mt-8 text-[#5E5D59]">Loading…</p>
        ) : isError || !post ? (
          <p className="mt-8 text-[#5E5D59]">
            This post could not be found or is no longer available.
          </p>
        ) : (
          <article className="mt-8">
            <header>
              <p className="text-sm text-[#87867F]">
                {post.category && <span>{post.category} · </span>}
                {formatDate(post.publishedAt ?? post.createdAt)}
              </p>
              <h1 className="blog-serif mt-4 text-4xl leading-[1.15] sm:text-5xl">{post.title}</h1>
              {post.tldr && <p className="mt-6 text-xl leading-8 text-[#5E5D59]">{post.tldr}</p>}
              {post.authorName && (
                <p className="mt-6 text-sm text-[#87867F]">By {post.authorName}</p>
              )}
              <div className="mt-8 flex items-center gap-3 border-t border-[#141413]/10 pt-5">
                <span className="text-sm text-[#87867F]">Share</span>
                <ShareActions slug={post.slug} title={post.title} />
              </div>
            </header>

            {post.headerImageUrl && (
              <img
                src={post.headerImageUrl}
                alt={post.title}
                className="mb-10 mt-8 w-full rounded-2xl object-cover"
              />
            )}

            <RichTextRenderer
              content={post.body}
              allowImages
              className="mt-8 max-w-none text-[17px] leading-[1.75] text-[#33322F] [&_h1]:font-secondary [&_h1]:text-3xl [&_h1]:text-[#141413] [&_h1]:mt-10 [&_h1]:mb-4 [&_h2]:font-secondary [&_h2]:text-2xl [&_h2]:text-[#141413] [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-secondary [&_h3]:text-xl [&_h3]:text-[#141413] [&_h3]:mt-8 [&_h3]:mb-2 [&_p]:my-4 [&_a]:underline [&_a]:underline-offset-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-4 [&_li]:my-1 [&_blockquote]:border-l-2 [&_blockquote]:border-[#D97757] [&_blockquote]:pl-5 [&_blockquote]:my-6 [&_blockquote]:font-secondary [&_blockquote]:text-lg [&_blockquote]:text-[#5E5D59] [&_img]:rounded-xl"
            />

            {post.tags?.length > 0 && (
              <div className="mt-12 flex flex-wrap gap-2 border-t border-[#141413]/10 pt-6">
                {post.tags.map(tag => (
                  <span
                    key={tag}
                    className="rounded-full border border-[#141413]/10 bg-white px-3 py-1 text-sm text-[#5E5D59]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </article>
        )}
      </div>
      <BlogFooter containerClassName="max-w-2xl" />
    </div>
  );
};
