/** Shared copy and helpers for the public blog's page metadata. */

export const BLOG_SITE_NAME = "Ally";

/** The blog's name — its wordmark in the header, and the browser-tab title. */
export const BLOG_NAME = "Building Ally";

export const BLOG_INDEX_TITLE = BLOG_NAME;

/** Meta description only — the index no longer renders a subtitle. */
export const BLOG_INDEX_DESCRIPTION = "Product updates, research and news from the Ally team.";

export const CHANGELOG_TITLE = `Changelog | ${BLOG_SITE_NAME}`;

export const CHANGELOG_DESCRIPTION = "Every update we've shipped, in plain language.";

export const blogPostTitle = (postTitle: string) => `${postTitle} | ${BLOG_NAME}`;

const MAX_EXCERPT_LENGTH = 200;

/**
 * Falls back to the opening of a post's body when it has no TLDR, so a shared
 * link still carries a real sentence instead of the generic blog description.
 * Parsed via DOMParser rather than a tag-stripping regex: the body is stored as
 * HTML, and only a parser reliably drops markup and decodes entities.
 */
export const excerptFromHtml = (html?: string | null): string | undefined => {
  if (!html) return undefined;

  const text = new DOMParser()
    .parseFromString(html, "text/html")
    .body.textContent?.replace(/\s+/g, " ")
    .trim();

  if (!text) return undefined;
  if (text.length <= MAX_EXCERPT_LENGTH) return text;

  const clipped = text.slice(0, MAX_EXCERPT_LENGTH);
  const lastSpace = clipped.lastIndexOf(" ");
  // Cut on a word boundary when there is one, so the excerpt doesn't end
  // mid-word; a single very long token falls back to the hard slice.
  return `${(lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped).replace(/[.,;:!?-]+$/, "")}…`;
};
