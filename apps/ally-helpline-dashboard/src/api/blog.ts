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
  coverColor: string; // #RRGGBB, shown when there is no header image
  authorName?: string | null;
  headerImageUrl?: string | null;
  status: "DRAFT" | "PUBLISHED";
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

type GetPublicBlogsResponse = { blogs: BlogPost[]; count: number };

/** A tag used on at least one published post, with how many carry it. */
export type BlogTagCount = { tag: string; count: number };

const blogAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getPublicBlogs: builder.query<
      GetPublicBlogsResponse,
      { offset?: number; limit?: number; tag?: string } | void
    >({
      query: (params = {}) => ({
        url: ApiEndpoints.BLOG.GET_PUBLIC_BLOGS,
        method: HttpMethod.GET,
        params: params || undefined,
      }),
    }),
    getPublicBlogTags: builder.query<{ tags: BlogTagCount[] }, void>({
      query: () => ({
        url: ApiEndpoints.BLOG.GET_PUBLIC_BLOG_TAGS,
        method: HttpMethod.GET,
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

export const { useGetPublicBlogsQuery, useGetPublicBlogTagsQuery, useGetPublicBlogBySlugQuery } =
  blogAPI;
