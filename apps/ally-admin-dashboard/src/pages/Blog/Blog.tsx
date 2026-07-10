import React, { useCallback, useMemo, useState } from "react";

import { toast } from "sonner";

import {
  BlogPost,
  BlogStatus,
  useCreateBlogMutation,
  useDeleteBlogMutation,
  useGetBlogsQuery,
  usePublishBlogMutation,
  useUnpublishBlogMutation,
  useUpdateBlogMutation,
} from "@api";
import { ActionConfirmationPopup, BlogSidePanel, Button, ListToolbar } from "@components";
import { BlogFormValues } from "@components/blog-side-panel/BlogSidePanel";
import { ButtonVariant } from "@components/types";

const LIMIT = 30;

type StatusFilter = "ALL" | BlogStatus;

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "PUBLISHED", label: "Published" },
  { id: "DRAFT", label: "Drafts" },
];

// Empty strings for optional fields become undefined so they are stored as null
// rather than "".
const emptyToUndefined = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

export const BlogManagement: React.FC = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [limit, setLimit] = useState(LIMIT);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState<BlogPost | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BlogPost | null>(null);

  // Grow the page size for "Load more" (offset stays 0) so the query stays a
  // single source of truth — no manual page accumulation to keep in sync.
  const { data, isFetching } = useGetBlogsQuery({
    search: search || undefined,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    limit,
    offset: 0,
    sortBy: "updatedAt",
    sortOrder: "desc",
  });

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setLimit(LIMIT);
  }, []);

  const handleStatusChange = useCallback((next: StatusFilter) => {
    setStatusFilter(next);
    setLimit(LIMIT);
  }, []);

  const [createBlog, { isLoading: isCreating }] = useCreateBlogMutation();
  const [updateBlog, { isLoading: isUpdating }] = useUpdateBlogMutation();
  const [publishBlog] = usePublishBlogMutation();
  const [unpublishBlog] = useUnpublishBlogMutation();
  const [deleteBlog] = useDeleteBlogMutation();

  const blogs = useMemo(() => data?.blogs ?? [], [data]);

  const openCreate = useCallback(() => {
    setSelectedBlog(null);
    setIsPanelOpen(true);
  }, []);

  const openEdit = useCallback((blog: BlogPost) => {
    setSelectedBlog(blog);
    setIsPanelOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
    setSelectedBlog(null);
  }, []);

  const handleSave = useCallback(
    async (values: BlogFormValues, publish: boolean) => {
      const payload = {
        title: values.title.trim(),
        slug: emptyToUndefined(values.slug),
        tldr: emptyToUndefined(values.tldr),
        body: emptyToUndefined(values.body),
        tags: values.tags,
        category: emptyToUndefined(values.category),
        authorName: emptyToUndefined(values.authorName),
        headerImageUrl: emptyToUndefined(values.headerImageUrl),
        status: (publish ? "PUBLISHED" : "DRAFT") as BlogStatus,
      };

      const result = selectedBlog
        ? await updateBlog({ id: selectedBlog.id, data: payload })
        : await createBlog(payload);

      if ("error" in result && result.error) {
        const status = (result.error as { status?: number })?.status;
        toast.error(
          status === 409 ? "A post with that slug already exists." : "Failed to save post.",
        );
        return;
      }

      toast.success(publish ? "Post published." : "Draft saved.");
      closePanel();
    },
    [selectedBlog, createBlog, updateBlog, closePanel],
  );

  const handleTogglePublish = useCallback(
    async (blog: BlogPost) => {
      const action = blog.status === "PUBLISHED" ? unpublishBlog : publishBlog;
      const result = await action(blog.id);
      if ("error" in result && result.error) {
        toast.error("Failed to update status.");
        return;
      }
      toast.success(blog.status === "PUBLISHED" ? "Post unpublished." : "Post published.");
    },
    [publishBlog, unpublishBlog],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    const result = await deleteBlog(pendingDelete.id);
    setPendingDelete(null);
    if ("error" in result && result.error) {
      toast.error("Failed to delete post.");
      return;
    }
    toast.success("Post deleted.");
  }, [pendingDelete, deleteBlog]);

  const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleDateString() : "—";

  return (
    <div className="py-[2px] font-primary relative">
      <h1 className="text-2xl text-typography-900 pb-6 font-secondary">Blog</h1>

      <ListToolbar
        searchValue={search}
        onSearchChange={handleSearchChange}
        placeholder="Search posts..."
        action={{ label: "New Post", onClick: openCreate, variant: ButtonVariant.PRIMARY }}
      />

      <div className="flex items-center gap-2 mt-4">
        {STATUS_FILTERS.map(filter => (
          <button
            key={filter.id}
            onClick={() => handleStatusChange(filter.id)}
            className={`text-sm px-3 py-1 rounded-full border transition-colors ${
              statusFilter === filter.id
                ? "bg-primary-500 text-white border-primary-500"
                : "bg-transparent text-typography-700 border-border-light hover:border-primary-300"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="mt-5 border border-border-light rounded-md overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-background-secondary text-typography-600">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Published</th>
              <th className="px-4 py-3 font-medium">Updated</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {blogs.map(blog => (
              <tr
                key={blog.id}
                className="border-t border-border-light hover:bg-background-secondary/50"
              >
                <td
                  className="px-4 py-3 text-typography-900 cursor-pointer"
                  onClick={() => openEdit(blog)}
                >
                  <div className="font-medium">{blog.title}</div>
                  {blog.tldr && (
                    <div className="text-xs text-typography-500 line-clamp-1 max-w-md">
                      {blog.tldr}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-typography-700">{blog.category || "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      blog.status === "PUBLISHED"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-typography-600"
                    }`}
                  >
                    {blog.status === "PUBLISHED" ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3 text-typography-600">{formatDate(blog.publishedAt)}</td>
                <td className="px-4 py-3 text-typography-600">{formatDate(blog.updatedAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => openEdit(blog)}
                      className="text-primary-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleTogglePublish(blog)}
                      className="text-typography-700 hover:underline"
                    >
                      {blog.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      onClick={() => setPendingDelete(blog)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!isFetching && blogs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-typography-500">
                  No posts yet. Create your first post to get started.
                </td>
              </tr>
            )}
            {isFetching && blogs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-typography-500">
                  Loading...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.count > blogs.length && limit < 100 && (
        <div className="flex justify-center py-4">
          <Button
            variant={ButtonVariant.SECONDARY}
            onClick={() => setLimit(prev => Math.min(prev + LIMIT, 100))}
            disabled={isFetching}
          >
            {isFetching ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}

      <BlogSidePanel
        selectedBlog={selectedBlog}
        isOpen={isPanelOpen}
        onClose={closePanel}
        onSave={handleSave}
        isSaving={isCreating || isUpdating}
      />

      <ActionConfirmationPopup
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Delete Post"
        description={`Are you sure you want to delete "${pendingDelete?.title ?? ""}"? This cannot be undone.`}
        primaryButton={{ label: "Delete", onClick: handleConfirmDelete }}
        secondaryButton={{ label: "Cancel", onClick: () => setPendingDelete(null) }}
      />
    </div>
  );
};
