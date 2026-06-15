import DOMPurify from "dompurify";

// Mirrors the allow-list used by the admin dashboard's rich text editor and the
// backend sanitizer, so content authored there renders consistently here.
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

/**
 * Sanitize HTML content to allow only safe formatting tags.
 * Strips all attributes, scripts, images, links, iframes, and embeds.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, PURIFY_CONFIG) as unknown as string;
}
