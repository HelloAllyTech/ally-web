import Link from "next/link";

import { logger } from "@ally-ui-mono/ui-shared";

import { BlogPost, fetchPublishedPosts } from "../api";

export const metadata = {
  title: "Ally.ai - Blog",
  description: "Product updates, release announcements and news from the Ally team.",
};

// Public blog is driven by server-rendered data; revalidate periodically.
export const revalidate = 60;

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md"
    >
      {post.headerImageUrl ? (
        <img src={post.headerImageUrl} alt={post.title} className="h-48 w-full object-cover" />
      ) : (
        <div className="h-48 w-full bg-gradient-to-br from-gray-100 to-gray-200" />
      )}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
          {post.category && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700">
              {post.category}
            </span>
          )}
          <span>{formatDate(post.publishedAt ?? post.createdAt)}</span>
        </div>
        <h2 className="mb-2 font-serif text-xl font-semibold text-gray-900 group-hover:text-gray-700">
          {post.title}
        </h2>
        {post.tldr && <p className="line-clamp-3 flex-1 text-sm text-gray-600">{post.tldr}</p>}
        {post.tags?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {post.tags.slice(0, 4).map(tag => (
              <span key={tag} className="text-xs text-gray-400">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

export default async function BlogListPage() {
  let posts: BlogPost[] = [];
  let loadError = false;

  try {
    const { blogs } = await fetchPublishedPosts();
    posts = blogs;
  } catch (error) {
    logger.info(`Error in BlogListPage: ${error}`);
    loadError = true;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-10 text-center">
        <h1 className="font-serif text-4xl font-bold text-gray-900">Blog</h1>
        <p className="mt-3 text-lg text-gray-600">
          Product updates, release announcements and news from the Ally team.
        </p>
      </header>

      {loadError ? (
        <p className="text-center text-gray-500">
          Something went wrong loading posts. Please try again later.
        </p>
      ) : posts.length === 0 ? (
        <p className="text-center text-gray-500">No posts published yet. Check back soon!</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map(post => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </main>
  );
}
