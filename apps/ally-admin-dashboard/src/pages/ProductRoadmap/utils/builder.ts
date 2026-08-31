import { RoadmapBuilderSessionHandle } from "@types";

/**
 * The opening turn to send for a freshly-opened Builder session, or null.
 *
 * THE WHOLE RULE: seed only what this press created. `POST .../builder-session` is idempotent,
 * so pressing "Open in Builder Agent" on an opportunity that already has a session returns that
 * session with `created: false` — its transcript already opens with the brief. Sending it again
 * would put the same paragraph in twice and have the agent respond to the repeat, which reads as
 * the agent losing track of the conversation.
 *
 * Extracted from the drawer wiring rather than inlined so the rule has a test of its own: it is
 * one ternary, and it is the only thing standing between a resume and a duplicated brief.
 */
export const seedForHandle = (handle: RoadmapBuilderSessionHandle): string | null =>
  handle.created ? (handle.seedMessage ?? null) : null;
