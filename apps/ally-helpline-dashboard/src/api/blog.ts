import { ApiEndpoints, HttpMethod } from "@constants";

import { baseAPI } from "./baseAPI";

// Mirrors the ally-be BlogResponseDto (published posts only on these endpoints).
export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  tldr?: string | null;
  body?: string | null; // sanitized HTML
  tags: string[];
  category?: string | null;
  headerImageUrl?: string | null;
  status: "DRAFT" | "PUBLISHED";
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

type GetPublicBlogsResponse = { blogs: BlogPost[]; count: number };

const blogAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getPublicBlogs: builder.query<
      GetPublicBlogsResponse,
      { offset?: number; limit?: number; category?: string; tag?: string } | void
    >({
      query: (params = {}) => ({
        url: ApiEndpoints.BLOG.GET_PUBLIC_BLOGS,
        method: HttpMethod.GET,
        params: params || undefined,
      }),
    }),
    getPublicBlogBySlug: builder.query<BlogPost, { slug: string }>({
      query: ({ slug }) => ({
        url: ApiEndpoints.BLOG.GET_PUBLIC_BLOG_BY_SLUG(slug),
        method: HttpMethod.GET,
      }),
    }),
  }),
});

export const { useGetPublicBlogsQuery, useGetPublicBlogBySlugQuery } = blogAPI;
