/**
 * Extract visible text from a (possibly HTML) description so list cells and
 * compact previews show readable text instead of raw tags.
 *
 * Implementation notes:
 * - <script> and <style> bodies are dropped entirely so their source code
 *   never surfaces as visible text.
 * - All remaining tags are replaced with spaces before parsing so adjacent
 *   block elements (e.g. <p>a</p><p>b</p>) don't merge into "ab".
 * - DOMParser is then used purely to decode HTML entities (e.g. &amp; -> &).
 *   It does not execute scripts and does not fire <img onerror> handlers.
 * - Falls back to a regex strip when DOMParser is unavailable (SSR/tests).
 */
export function htmlToPlainText(value: string | undefined | null): string {
  if (!value) return "";

  const stripped = value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ");

  if (typeof DOMParser === "undefined") {
    return stripped.replace(/\s+/g, " ").trim();
  }

  const doc = new DOMParser().parseFromString(stripped, "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
}
