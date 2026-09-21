/**
 * The box is a four-line textarea asking what you want built, so people type a
 * paragraph — but `title` is capped at 200 characters server-side, and a longer
 * one is rejected with a 400 that used to surface as "Couldn't start a new
 * build." and nothing else.
 *
 * Capping the input would be the wrong fix: it would truncate what you are
 * telling the agent. The title is only a label — it seeds the branch slug and
 * the agent rewrites it once the PRD takes shape — so the label is shortened
 * here and the full text still travels as the opening message.
 *
 * Cut at a word boundary where there is one near the end, because "Add a filter
 * for individual liste" reads like a bug and "Add a filter for individual" reads
 * like a title.
 */
export const BUILDER_TITLE_MAX = 200;

export const sessionTitleFrom = (typed: string): string => {
  const text = typed.trim().replace(/\s+/g, " ");
  if (text.length <= BUILDER_TITLE_MAX) return text;
  const cut = text.slice(0, BUILDER_TITLE_MAX);
  const lastSpace = cut.lastIndexOf(" ");
  // Only honour a word boundary in the last quarter; otherwise a single very
  // long token would shrink the title to almost nothing.
  return lastSpace > BUILDER_TITLE_MAX * 0.75 ? cut.slice(0, lastSpace) : cut;
};

/**
 * What actually went wrong, when the server bothered to say.
 *
 * class-validator returns `message` as an array of field errors; Nest's own
 * exceptions return a string. Both are more useful than the generic fallback,
 * which is kept for the cases with nothing to show — a network drop, or a 500.
 */
export const startErrorMessage = (error: unknown, fallback: string): string => {
  const message = (error as { data?: { message?: unknown } })?.data?.message;
  if (Array.isArray(message) && message.length) return message.join(". ");
  if (typeof message === "string" && message.trim()) return message;
  return fallback;
};
