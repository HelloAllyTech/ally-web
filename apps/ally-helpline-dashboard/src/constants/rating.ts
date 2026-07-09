/**
 * Colours for the feedback rating stars (StarRating, SessionRatingTrigger).
 *
 * Kept in one place so the filled/empty pair can't drift apart — each rating
 * component previously hardcoded its own copy, and the empty colour churned
 * through near-invisible values (#ffffff, #E0E0E0). The StarYellowIcon paints
 * the whole star in the colour it is given, so the empty colour must stay
 * clearly visible against the light (white) feedback background.
 */
export const STAR_COLOR_FILLED = "#F9CC49"; // gold
export const STAR_COLOR_EMPTY = "#8D8D8D"; // Carbon gray-50 — visible on white
