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
  ALLOWED_ATTR: [],
  ALLOW_DATA_ATTR: false,
  KEEP_CONTENT: true,
};

// Opt-in variant for editors that support inline images (track article
// builder). Only `img[src, alt]` is added on top of the default allowlist.
const PURIFY_CONFIG_WITH_IMAGES = {
  ...PURIFY_CONFIG,
  ALLOWED_TAGS: [...ALLOWED_TAGS, "img"],
  ALLOWED_ATTR: ["src", "alt"],
};

export interface SanitizeHtmlOptions {
  /** Allow `img[src, alt]` tags. Default false — existing callers unchanged. */
  allowImages?: boolean;
}

/**
 * Sanitize HTML content to allow only safe formatting tags.
 * Strips all attributes, scripts, images, links, iframes, and embeds
 * (images survive only when `allowImages` is set).
 */
export function sanitizeHtml(html: string, options?: SanitizeHtmlOptions): string {
  if (!html) return "";
  const config = options?.allowImages ? PURIFY_CONFIG_WITH_IMAGES : PURIFY_CONFIG;
  return DOMPurify.sanitize(html, config) as unknown as string;
}

/**
 * Check whether a string contains any HTML tags.
 * Used to detect legacy plain-text descriptions for backward compatibility.
 */
export function containsHtmlTags(content: string): boolean {
  if (!content) return false;
  return /<[a-z][\s\S]*>/i.test(content);
}

/**
 * Extract visible text length from HTML, ignoring tags.
 * Useful for character counting in the editor.
 */
export function getVisibleTextLength(html: string): number {
  if (!html) return 0;
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || div.innerText || "").length;
}
