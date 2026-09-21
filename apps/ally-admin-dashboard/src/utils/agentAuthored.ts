/**
 * Coercion for values an LLM wrote into a typed document.
 *
 * Builder's PRD is patched by the agent with RFC-6902 operations against a
 * free-form `value`, so nothing between the model and the panel enforces that
 * a field the schema calls a string is one. `openQuestions` arriving as
 * `{ id, text }` rows instead of sentences is the shape that took the whole
 * Builder session page down in production: React throws on an object child
 * rather than skipping it, and the page-level boundary then hid the admin's
 * own transcript along with the panel that broke.
 *
 * These helpers are the render-side half of that fix — the backend normalises
 * on write, and this guarantees the console survives whatever is already
 * stored. Rendering the object's own words beats both crashing and showing
 * nothing: the agent did write a real sentence, it just filed it under a key.
 */

/**
 * Keys checked, in order, when an object turns up where text belongs. These
 * are the field names a model reaches for when it decides a list item needs
 * structure — `text` and `label` by far the most often.
 */
const TEXT_KEYS = [
  "text",
  "label",
  "title",
  "question",
  "prompt",
  "description",
  "name",
  "summary",
  "value",
] as const;

/** Anything at all → a string safe to render. Never returns an object. */
export const asAgentText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  // An array where one string belongs: read it as lines rather than dropping
  // all but the first, which is how a model writes a multi-part answer.
  if (Array.isArray(value)) return value.map(asAgentText).filter(Boolean).join("\n");
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of TEXT_KEYS) {
      const candidate = record[key];
      if (typeof candidate === "string" && candidate.trim()) return candidate;
    }
    // An object with nothing in it says nothing — rendering "{}" would put a
    // bullet in a list for a row the agent had not written yet.
    if (Object.keys(record).length === 0) return "";
    // Otherwise deliberately visible: an unreadable field should look wrong to
    // whoever is watching the document fill in, not look empty.
    return JSON.stringify(value);
  }
  return String(value);
};

/**
 * Anything at all → a list of renderable strings.
 *
 * A bare string where an array belongs becomes a one-item list rather than
 * `[]`: the agent wrote one open question instead of a list of them, and
 * dropping it would hide a blocker.
 */
export const asAgentTextList = (value: unknown): string[] => {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.map(asAgentText).filter(entry => entry.trim().length > 0);
  const single = asAgentText(value);
  return single.trim() ? [single] : [];
};
