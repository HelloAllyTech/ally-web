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
