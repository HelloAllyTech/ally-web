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
  "a",
];

const PURIFY_CONFIG = {
  ALLOWED_TAGS,
  // Hyperlinks are permitted (e.g. the crisis-hotline link in the sign-in
  // consent). DOMPurify still strips dangerous href schemes (javascript:, etc.).
  ALLOWED_ATTR: ["href", "target", "rel"],
  ALLOW_DATA_ATTR: false,
  KEEP_CONTENT: true,
};

/**
 * Sanitize HTML content to allow only safe formatting tags plus hyperlinks.
 * Strips scripts, images, iframes, embeds, and unsafe attributes/schemes.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, PURIFY_CONFIG) as unknown as string;
}
