import Link from "next/link";
import { notFound } from "next/navigation";

import { RichTextRenderer, logger } from "@ally-ui-mono/ui-shared";

import { fetchPostBySlug } from "../../api";

export const revalidate = 60;

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  try {
    const post = await fetchPostBySlug(params.slug);
    if (!post) return { title: "Ally.ai - Blog" };
    return {
      title: `${post.title} - Ally.ai Blog`,
      description: post.tldr ?? undefined,
    };
  } catch {
    return { title: "Ally.ai - Blog" };
  }
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await (async () => {
    try {
      return await fetchPostBySlug(params.slug);
    } catch (error) {
      logger.info(`Error in BlogPostPage: ${error}`);
      return null;
    }
  })();

  if (!post) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <Link href="/blog" className="text-sm text-gray-500 hover:text-gray-800">
        ← Back to blog
      </Link>

      <article className="mt-6">
        <header className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-sm text-gray-500">
            {post.category && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700">
                {post.category}
              </span>
            )}
            <span>{formatDate(post.publishedAt ?? post.createdAt)}</span>
          </div>
          <h1 className="font-serif text-4xl font-bold leading-tight text-gray-900">
            {post.title}
          </h1>
          {post.tldr && <p className="mt-4 text-lg text-gray-600">{post.tldr}</p>}
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
          className="prose prose-lg max-w-none text-gray-800"
        />

        {post.tags?.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2 border-t border-gray-100 pt-6">
            {post.tags.map(tag => (
              <span key={tag} className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </article>
    </main>
  );
}
