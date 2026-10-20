/**
 * Default prompt for Track settings → Generate cover image.
 *
 * The prompt is sent to the image model exactly as the trainer leaves it —
 * nothing is appended on the server — so the safety rules live here, in the
 * text the trainer can read and edit, rather than being added out of sight.
 */

/** Long enough to say what the course is about; the rest is noise to an image model. */
export const COVER_PROMPT_SUMMARY_MAX_CHARS = 300;

/** Mirrors ally-be's TRACK_COVER_PROMPT_MIN/MAX_LENGTH. */
export const COVER_PROMPT_MIN_LENGTH = 10;
export const COVER_PROMPT_MAX_LENGTH = 4000;

export const COVER_PROMPT_RULES =
  "Rules: no text, letters, numbers, captions, signs, logos or watermarks anywhere in the image. " +
  "No identifiable real person or celebrity. Nothing graphic, violent or distressing. " +
  "Wide 16:9 landscape composition with the main subject near the centre, so it still reads when cropped to a course card.";

/** The description is rich text; an image model wants one plain sentence or two. */
export const toPlainSummary = (html: string | null | undefined, maxChars: number): string => {
  if (!html) return "";
  // textContent runs adjacent blocks together ("…fixing.Reflect…"), so break
  // before every block boundary first.
  const spaced = html.replace(/<(\/(?:p|div|li|h[1-6]|blockquote|td)|br\s*\/?)>/gi, " <$1>");
  const text =
    typeof DOMParser !== "undefined"
      ? (new DOMParser().parseFromString(spaced, "text/html").body.textContent ?? "")
      : spaced.replace(/<[^>]*>/g, " ");
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxChars) return collapsed;
  const cut = collapsed.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxChars / 2 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:]+$/, "")}…`;
};

export const buildDefaultCoverPrompt = (
  title: string | null | undefined,
  descriptionHtml: string | null | undefined,
): string => {
  const cleanTitle = (title ?? "").trim();
  const summary = toPlainSummary(descriptionHtml, COVER_PROMPT_SUMMARY_MAX_CHARS);

  const subject = cleanTitle
    ? `A warm, realistic documentary-style photograph to use as the cover image for a training course titled "${cleanTitle}".`
    : "A warm, realistic documentary-style photograph to use as the cover image for a training course.";

  return [
    subject,
    summary ? `The course is about: ${summary}` : null,
    "Show a calm, everyday scene that captures the spirit of the course — for example people in conversation, listening or supporting one another — with natural light and soft, muted colours.",
    COVER_PROMPT_RULES,
  ]
    .filter(Boolean)
    .join("\n\n");
};
