import { RoadmapReferenceImage } from "@types";

/**
 * Whether two reference-image lists are the same.
 *
 * Extracted and tested on its own because getting it wrong has a specific, nasty failure mode.
 * OpportunityDrawer autosaves on a debounce that re-arms whenever `isDirty` is true, and every
 * keystroke in a caption rebuilds the array — so an identity comparison (`a !== b`) would report
 * the drawer dirty forever, and the autosave effect would PATCH every 800ms for as long as the
 * drawer stayed open. The same shape as the `saveFailed` guard documented there: the loop is the
 * thing to design against, not the comparison.
 *
 * JSON is sufficient rather than lazy. Both sides are plain `{ url, caption? }` objects, the
 * order is meaningful (so it must NOT be normalised away), and the server writes the key set:
 * `normaliseReferenceImages` drops a blank caption entirely instead of storing `''` or `null`, so
 * a round trip returns the same key order it was given. Two lists that mean the same thing
 * therefore stringify the same way.
 */
export const sameReferenceImages = (
  a: RoadmapReferenceImage[],
  b: RoadmapReferenceImage[],
): boolean => JSON.stringify(a) === JSON.stringify(b);
