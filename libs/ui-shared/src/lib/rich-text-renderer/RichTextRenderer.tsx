"use client";

import { FC, useMemo } from "react";

import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "p",
  "strong",
  "em",
  "u",
  "s",
  "h1",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "blockquote",
  "hr",
  "br",
];

const PURIFY_CONFIG = {
  ALLOWED_TAGS,
  ALLOWED_ATTR: [] as string[],
  ALLOW_DATA_ATTR: false,
  KEEP_CONTENT: true,
};

// Opt-in image support (Track 2.0 articles). Existing consumers keep the
// stricter default config unchanged.
const PURIFY_CONFIG_WITH_IMAGES = {
  ...PURIFY_CONFIG,
  ALLOWED_TAGS: [...ALLOWED_TAGS, "img"],
  ALLOWED_ATTR: ["src", "alt"],
};

function containsHtmlTags(content: string): boolean {
  if (!content) return false;
  return /<[a-z][\s\S]*>/i.test(content);
}

interface RichTextRendererProps {
  content: string | undefined | null;
  className?: string;
  /** Allow img[src,alt] through the sanitizer. Default false. */
  allowImages?: boolean;
}

/**
 * Renders HTML content safely using DOMPurify sanitization.
 * Handles backward compatibility: plain text strings are wrapped in <p> tags.
 */
export const RichTextRenderer: FC<RichTextRendererProps> = ({
  content,
  className = "",
  allowImages = false,
}) => {
  const sanitizedHtml = useMemo(() => {
    if (!content || content.trim().length === 0) return "";

    const normalizedContent = containsHtmlTags(content) ? content : `<p>${content}</p>`;

    return DOMPurify.sanitize(
      normalizedContent,
      allowImages ? PURIFY_CONFIG_WITH_IMAGES : PURIFY_CONFIG,
    ) as unknown as string;
  }, [content, allowImages]);

  if (!sanitizedHtml) return null;

  return (
    <div
      className={`rich-text-content prose prose-sm max-w-none text-typography-800 leading-relaxed [&_h1]:text-xl [&_h1]:font-bold [&_h1]:my-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:my-1.5 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:my-1 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-1 [&_li]:my-0.5 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:my-2 [&_blockquote]:text-typography-600 [&_blockquote]:italic [&_hr]:my-3 [&_hr]:border-gray-200 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-md [&_img]:my-2 ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      data-testid="rich-text-renderer"
    />
  );
};
