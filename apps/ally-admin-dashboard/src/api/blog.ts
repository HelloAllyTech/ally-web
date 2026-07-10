import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";

import { baseAPI } from "./baseApi";

export type BlogStatus = "DRAFT" | "PUBLISHED";

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  tldr?: string | null;
  body?: string | null;
  tags: string[];
  category?: string | null;
  headerImageUrl?: string | null;
  status: BlogStatus;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetBlogsResponse {
  blogs: BlogPost[];
  count: number;
}

export interface GetBlogsQuery {
  search?: string;
  status?: BlogStatus;
  category?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface UpsertBlogRequest {
  title: string;
  slug?: string;
  tldr?: string;
  body?: string;
  tags?: string[];
  category?: string;
  headerImageUrl?: string;
  status?: BlogStatus;
}

export interface BlogImageUploadRequest {
  fileName: string;
  fileSize: number;
  contentType: string;
}

export interface BlogImageUploadResponse {
  presignedUrl: string;
  imageUrl: string;
}

export const blogAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getBlogs: builder.query<GetBlogsResponse, GetBlogsQuery | void>({
      query: params => ({
        url: ApiEndpoints.BLOG.GET_BLOGS,
        method: HttpMethod.GET,
        params: params || undefined,
      }),
      providesTags: [TAG_TYPES.BLOGS],
    }),
    getBlog: builder.query<BlogPost, string>({
      query: id => ({
        url: ApiEndpoints.BLOG.GET_BLOG(id),
        method: HttpMethod.GET,
      }),
      providesTags: (_result, _error, id) => [{ type: TAG_TYPES.BLOGS, id }],
    }),
    createBlog: builder.mutation<BlogPost, UpsertBlogRequest>({
      query: body => ({
        url: ApiEndpoints.BLOG.CREATE_BLOG,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.BLOGS],
    }),
    updateBlog: builder.mutation<BlogPost, { id: string; data: Partial<UpsertBlogRequest> }>({
      query: ({ id, data }) => ({
        url: ApiEndpoints.BLOG.UPDATE_BLOG(id),
        method: HttpMethod.PATCH,
        body: data,
      }),
      invalidatesTags: [TAG_TYPES.BLOGS],
    }),
    publishBlog: builder.mutation<BlogPost, string>({
      query: id => ({
        url: ApiEndpoints.BLOG.PUBLISH_BLOG(id),
        method: HttpMethod.POST,
      }),
      invalidatesTags: [TAG_TYPES.BLOGS],
    }),
    unpublishBlog: builder.mutation<BlogPost, string>({
      query: id => ({
        url: ApiEndpoints.BLOG.UNPUBLISH_BLOG(id),
        method: HttpMethod.POST,
      }),
      invalidatesTags: [TAG_TYPES.BLOGS],
    }),
    deleteBlog: builder.mutation<{ success: boolean }, string>({
      query: id => ({
        url: ApiEndpoints.BLOG.DELETE_BLOG(id),
        method: HttpMethod.DELETE,
      }),
      invalidatesTags: [TAG_TYPES.BLOGS],
    }),
    getBlogImageUploadUrl: builder.mutation<BlogImageUploadResponse, BlogImageUploadRequest>({
      query: body => ({
        url: ApiEndpoints.BLOG.UPLOAD_IMAGE_URL,
        method: HttpMethod.POST,
        body,
      }),
    }),
  }),
});

export const {
  useGetBlogsQuery,
  useGetBlogQuery,
  useCreateBlogMutation,
  useUpdateBlogMutation,
  usePublishBlogMutation,
  useUnpublishBlogMutation,
  useDeleteBlogMutation,
  useGetBlogImageUploadUrlMutation,
} = blogAPI;
