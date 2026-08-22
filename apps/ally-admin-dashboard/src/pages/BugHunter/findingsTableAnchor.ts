/**
 * The bugs table's DOM anchor, so the shift log can scroll a reader up to it.
 *
 * ## Why this is its own module
 *
 * It is one string, and it belongs with the element that carries it — except
 * that `RunHistoryTable` is the only thing that needs to *read* it, and
 * importing it from `BugFindingsTable` would drag that module's whole import
 * graph (the drawer, the confirmation popup, four RTK mutation hooks) into the
 * shift log's test file for the sake of a constant. This repo's standing
 * hazard is exactly that: a module pulled in for one symbol evaluating things
 * at import time and taking the real store with it.
 *
 * So: a leaf with no imports at all, which both siblings can read for free.
 *
 * ## Why a DOM id and not a ref
 *
 * The two tables are siblings under `BugHunter` with a scorecard between them
 * and no other reason to know about each other. Threading a ref down the page
 * so one could point into the other's markup is more coupling than a scroll is
 * worth.
 *
 * It matters more than it sounds. The shift log sits at the bottom of a long
 * scrolling page, so clicking a count there re-scopes a table several screens
 * above the click — and without the scroll, the gesture reads as having done
 * nothing at all.
 */
export const BUG_FINDINGS_TABLE_ANCHOR_ID = "bug-findings-table";
