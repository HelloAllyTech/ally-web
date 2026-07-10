import { logger } from "@ally-ui-mono/ui-shared";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION;

export const INITIAL_FETCH_LIMIT = 10;

// TODO: make the params in object
const fetchReferenceDocuments = async (
  query: string,
  category?: string,
  limit: number = INITIAL_FETCH_LIMIT,
  excludedIds?: string[],
) => {
  try {
    let filters = undefined;
    if (category) {
      filters = { category };
    }
    const response = await fetch(
      `${API_BASE_URL}/api/${API_VERSION}/reference-document/search/public`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, limit, filters, excludedIds }),
      },
    );
    return response.json();
  } catch (error) {
    logger.info(`Error in fetchReferenceDocuments: ${error}`);
    throw error;
  }
};

const fetchCategories = async () => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/${API_VERSION}/reference-document/categories`,
      {
        method: "GET",
      },
    );
    return response.json();
  } catch (error) {
    logger.info(`Error in fetchCategories: ${error}`);
    throw error;
  }
};

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  tldr?: string | null;
  body?: string | null;
  tags: string[];
  category?: string | null;
  headerImageUrl?: string | null;
  status: "DRAFT" | "PUBLISHED";
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublishedBlogsResponse {
  blogs: BlogPost[];
  count: number;
}

// Public (ungated) list of published posts for app.helloally.ai/blog.
const fetchPublishedPosts = async (
  category?: string,
  limit = 30,
  offset = 0,
): Promise<PublishedBlogsResponse> => {
  try {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    params.set("limit", String(limit));
    params.set("offset", String(offset));

    const response = await fetch(
      `${API_BASE_URL}/api/${API_VERSION}/blog/public?${params.toString()}`,
      { method: "GET", next: { revalidate: 60 } },
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch posts: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    logger.info(`Error in fetchPublishedPosts: ${error}`);
    throw error;
  }
};

// Public (ungated) single published post by slug. Returns null when not found.
const fetchPostBySlug = async (slug: string): Promise<BlogPost | null> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/${API_VERSION}/blog/public/${encodeURIComponent(slug)}`,
      { method: "GET", next: { revalidate: 60 } },
    );
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Failed to fetch post: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    logger.info(`Error in fetchPostBySlug: ${error}`);
    throw error;
  }
};

export { fetchReferenceDocuments, fetchCategories, fetchPublishedPosts, fetchPostBySlug };
