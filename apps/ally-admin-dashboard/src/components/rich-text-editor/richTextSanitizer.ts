import DOMPurify from "dompurify";

import { ARTICLE_QUESTION_MARKER_ATTR } from "./articleQuestionNode";

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

// Opt-in variant for the track article builder's inline questions. Adds only
// the empty `div[data-ally-question]` placeholder that anchors a question in
// the body — the question itself, options and answer key included, is stored
// outside the HTML and never passes through here.
const PURIFY_CONFIG_WITH_QUESTIONS = {
  ALLOWED_TAGS: [...ALLOWED_TAGS, "div"],
  ALLOWED_ATTR: [ARTICLE_QUESTION_MARKER_ATTR],
  ALLOW_DATA_ATTR: false,
  KEEP_CONTENT: true,
};

const PURIFY_CONFIG_WITH_IMAGES_AND_QUESTIONS = {
  ALLOWED_TAGS: [...ALLOWED_TAGS, "img", "div"],
  ALLOWED_ATTR: ["src", "alt", ARTICLE_QUESTION_MARKER_ATTR],
  ALLOW_DATA_ATTR: false,
  KEEP_CONTENT: true,
};

export interface SanitizeHtmlOptions {
  /** Allow `img[src, alt]` tags. Default false — existing callers unchanged. */
  allowImages?: boolean;
  /** Allow `div[data-ally-question]` question placeholders. Default false. */
  allowQuestions?: boolean;
}

/**
 * Sanitize HTML content to allow only safe formatting tags.
 * Strips all attributes, scripts, images, links, iframes, and embeds
 * (images survive only when `allowImages` is set, and question placeholders
 * only when `allowQuestions` is).
 */
export function sanitizeHtml(html: string, options?: SanitizeHtmlOptions): string {
  if (!html) return "";
  const { allowImages, allowQuestions } = options ?? {};
  let config = PURIFY_CONFIG;
  if (allowImages && allowQuestions) config = PURIFY_CONFIG_WITH_IMAGES_AND_QUESTIONS;
  else if (allowImages) config = PURIFY_CONFIG_WITH_IMAGES;
  else if (allowQuestions) config = PURIFY_CONFIG_WITH_QUESTIONS;
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
