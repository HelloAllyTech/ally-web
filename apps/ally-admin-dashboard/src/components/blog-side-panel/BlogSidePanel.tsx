import React, { useCallback, useEffect, useMemo, useState } from "react";

import axios from "axios";
import { toast } from "sonner";

import { TextArea, TextInput } from "@ally-ui-mono/ui-shared";
import { BlogPost, useGetBlogImageUploadUrlMutation } from "@api";
import { DoubleArrowRight } from "@assets";
import { ActionConfirmationPopup, Button } from "@components";
import { RichTextEditor } from "@components/rich-text-editor";
import { ButtonVariant } from "@components/types";

export interface BlogFormValues {
  title: string;
  slug: string;
  tldr: string;
  body: string;
  tags: string[];
  category: string;
  authorName: string;
  headerImageUrl: string;
}

interface BlogSidePanelProps {
  selectedBlog: BlogPost | null;
  isOpen: boolean;
  onClose: () => void;
  // Persist the post. `publish` decides the resulting status.
  onSave: (values: BlogFormValues, publish: boolean) => Promise<void>;
  isSaving?: boolean;
}

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/svg+xml",
];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // keep in sync with the backend cap

const EMPTY_FORM: BlogFormValues = {
  title: "",
  slug: "",
  tldr: "",
  body: "",
  tags: [],
  category: "",
  authorName: "",
  headerImageUrl: "",
};

const toForm = (blog: BlogPost | null): BlogFormValues =>
  blog
    ? {
        title: blog.title ?? "",
        slug: blog.slug ?? "",
        tldr: blog.tldr ?? "",
        body: blog.body ?? "",
        tags: blog.tags ?? [],
        category: blog.category ?? "",
        authorName: blog.authorName ?? "",
        headerImageUrl: blog.headerImageUrl ?? "",
      }
    : { ...EMPTY_FORM };

interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}

const Field: React.FC<FieldProps> = ({ label, required, children, hint }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium text-typography-800">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children}
    {hint && <span className="text-xs text-typography-400">{hint}</span>}
  </div>
);

export const BlogSidePanel: React.FC<BlogSidePanelProps> = ({
  selectedBlog,
  isOpen,
  onClose,
  onSave,
  isSaving = false,
}) => {
  const [form, setForm] = useState<BlogFormValues>(EMPTY_FORM);
  const [tagInput, setTagInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const [getUploadUrl] = useGetBlogImageUploadUrlMutation();

  useEffect(() => {
    if (!isOpen) return;
    setForm(toForm(selectedBlog));
    setTagInput("");
  }, [selectedBlog, isOpen]);

  const isEditing = !!selectedBlog?.id;

  const setField = useCallback(
    <K extends keyof BlogFormValues>(key: K, value: BlogFormValues[K]) => {
      setForm(prev => ({ ...prev, [key]: value }));
    },
    [],
  );

  const isValid = useMemo(() => form.title.trim().length > 0, [form.title]);

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(toForm(selectedBlog)),
    [form, selectedBlog],
  );

  const commitTag = useCallback(() => {
    const value = tagInput.trim();
    if (!value) return;
    setForm(prev => (prev.tags.includes(value) ? prev : { ...prev, tags: [...prev.tags, value] }));
    setTagInput("");
  }, [tagInput]);

  const removeTag = useCallback((tag: string) => {
    setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  }, []);

  const handleHeaderImage = useCallback(
    async (file: File) => {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast.error("Unsupported image type. Use JPG, PNG, WEBP or SVG.");
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error("Image must be 5 MB or smaller.");
        return;
      }
      setIsUploading(true);
      try {
        const { presignedUrl, imageUrl } = await getUploadUrl({
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type,
        }).unwrap();
        await axios.put(presignedUrl, file, { headers: { "Content-Type": file.type } });
        setField("headerImageUrl", imageUrl);
        toast.success("Header image uploaded.");
      } catch {
        toast.error("Failed to upload image.");
      } finally {
        setIsUploading(false);
      }
    },
    [getUploadUrl, setField],
  );

  // Upload handler for inline images inside the rich-text body.
  const handleBodyImageUpload = useCallback(
    async (file: File): Promise<string | null> => {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
        toast.error("Image must be JPG/PNG/WEBP/SVG and 5 MB or smaller.");
        return null;
      }
      try {
        const { presignedUrl, imageUrl } = await getUploadUrl({
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type,
        }).unwrap();
        await axios.put(presignedUrl, file, { headers: { "Content-Type": file.type } });
        return imageUrl;
      } catch {
        toast.error("Failed to upload image.");
        return null;
      }
    },
    [getUploadUrl],
  );

  const handleClose = useCallback(() => {
    if (isDirty) setShowConfirmClose(true);
    else onClose();
  }, [isDirty, onClose]);

  const handleSave = useCallback(
    (publish: boolean) => {
      if (!isValid) return;
      void onSave(form, publish);
    },
    [form, isValid, onSave],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black bg-opacity-50" onClick={handleClose} />
      <div className="w-[55%] min-w-[720px] bg-white shadow-xl border-l border-border-light flex flex-col">
        <div className="flex items-center justify-between p-6">
          <button
            onClick={handleClose}
            className="flex flex-row items-center gap-2 text-typography-600 hover:text-neutral-800"
          >
            <DoubleArrowRight width={14} height={14} />
            <span className="text-base font-tertiary font-[500]">
              {isEditing ? "Edit Post" : "New Post"}
            </span>
          </button>
          {selectedBlog && (
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                selectedBlog.status === "PUBLISHED"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-typography-600"
              }`}
            >
              {selectedBlog.status === "PUBLISHED" ? "Published" : "Draft"}
            </span>
          )}
        </div>

        <div className="flex-1 min-h-0 px-10 pt-2 overflow-y-auto custom-scrollbar space-y-4">
          <div>
            <input
              type="text"
              value={form.title}
              onChange={e => setField("title", e.target.value)}
              placeholder="Post title"
              className="border-none focus:outline-none text-2xl font-light w-full"
            />
          </div>

          <Field label="Slug" hint="Leave blank to auto-generate from the title.">
            <TextInput
              id="blog-slug"
              labelText="Slug"
              hideLabel
              value={form.slug}
              onChange={e => setField("slug", e.target.value)}
              placeholder="my-post-slug"
              className="w-full"
            />
          </Field>

          <Field label="Category">
            <TextInput
              id="blog-category"
              labelText="Category"
              hideLabel
              value={form.category}
              onChange={e => setField("category", e.target.value)}
              placeholder="e.g. Product Updates"
              className="w-full"
            />
          </Field>

          <Field label="Author name" hint="Shown as the byline on the public post.">
            <TextInput
              id="blog-author-name"
              labelText="Author name"
              hideLabel
              value={form.authorName}
              onChange={e => setField("authorName", e.target.value)}
              placeholder="e.g. Jane Doe"
              className="w-full"
            />
          </Field>

          <Field label="TL;DR" hint="Short summary shown in the blog listing.">
            <TextArea
              id="blog-tldr"
              labelText="TL;DR"
              hideLabel
              value={form.tldr}
              onChange={e => setField("tldr", e.target.value)}
              placeholder="A one or two line summary..."
              rows={3}
            />
          </Field>

          <Field label="Tags" hint="Press Enter or comma to add a tag.">
            <div>
              <TextInput
                id="blog-tags"
                labelText="Tags"
                hideLabel
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    commitTag();
                  }
                }}
                onBlur={commitTag}
                placeholder="Add a tag..."
                className="w-full"
              />
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.tags.map(tag => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 text-sm bg-primary-50 text-primary-700 border border-primary-200 rounded-full px-2 py-0.5"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-primary-500 hover:text-primary-800"
                        aria-label={`Remove ${tag}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Field>

          <Field label="Header image">
            <div className="flex items-center gap-4">
              {form.headerImageUrl ? (
                <img
                  src={form.headerImageUrl}
                  alt="Header preview"
                  className="h-20 w-32 object-cover rounded-md border border-border-light"
                />
              ) : (
                <div className="h-20 w-32 rounded-md border border-dashed border-border-light flex items-center justify-center text-xs text-typography-400">
                  No image
                </div>
              )}
              <div className="flex flex-col gap-2">
                <label className="cursor-pointer text-sm text-primary-600 hover:underline">
                  {isUploading ? "Uploading..." : "Upload image"}
                  <input
                    type="file"
                    accept={ACCEPTED_IMAGE_TYPES.join(",")}
                    className="hidden"
                    disabled={isUploading}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) void handleHeaderImage(file);
                      e.target.value = "";
                    }}
                  />
                </label>
                {form.headerImageUrl && (
                  <button
                    type="button"
                    onClick={() => setField("headerImageUrl", "")}
                    className="text-sm text-typography-500 hover:text-red-600 text-left"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </Field>

          <Field label="Body">
            <RichTextEditor
              value={form.body}
              onChange={html => setField("body", html)}
              placeholder="Write the post..."
              allowImages
              onImageUpload={handleBodyImageUpload}
            />
          </Field>

          <div className="flex gap-3 mt-6 pb-8 justify-end">
            <Button variant={ButtonVariant.SECONDARY} onClick={handleClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              variant={ButtonVariant.SECONDARY}
              onClick={() => handleSave(false)}
              disabled={!isValid || isSaving || isUploading}
            >
              Save as draft
            </Button>
            <Button
              variant={ButtonVariant.PRIMARY}
              onClick={() => handleSave(true)}
              disabled={!isValid || isSaving || isUploading}
            >
              {selectedBlog?.status === "PUBLISHED" ? "Update & keep published" : "Publish"}
            </Button>
          </div>
        </div>
      </div>

      <ActionConfirmationPopup
        isOpen={showConfirmClose}
        onClose={() => setShowConfirmClose(false)}
        title="Unsaved Changes"
        description="You have unsaved changes. Are you sure you want to close?"
        primaryButton={{
          label: "Close Anyway",
          onClick: () => {
            setShowConfirmClose(false);
            onClose();
          },
        }}
        secondaryButton={{ label: "Keep Editing", onClick: () => setShowConfirmClose(false) }}
      />
    </div>
  );
};
