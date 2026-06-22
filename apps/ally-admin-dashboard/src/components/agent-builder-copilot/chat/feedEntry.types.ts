/**
 * View-model for the Claude-Coding-style Copilot chat feed. Entries are
 * derived purely from a polled CopilotRun (its append-only `progressLog` +
 * `roundHistory`) plus the client-tracked full text of each typed turn.
 *
 * The derivation (see copilotFeedReducer.ts) is idempotent: the same run always
 * produces the same ordered feed, so re-polling never duplicates or re-sorts.
 */

export type FeedEntryStatus = "active" | "done" | "error";

export type FeedEntryTone = "default" | "success" | "error" | "info";

export interface FieldItem {
  fieldName: string;
  /** Human label (event label with the verb prefix stripped). */
  label: string;
  status: FeedEntryStatus;
}

interface BaseEntry {
  /** Stable, deterministic key — never random. */
  id: string;
  /** Monotonic ordering value (the source event's seq, or seq-0.5 for turns). */
  order: number;
  /** Conversation segment: 0 = original build, +1 per revise turn. */
  segment: number;
}

/** A bubble for the user's typed brief or revise instruction. */
export interface UserMessageEntry extends BaseEntry {
  kind: "user-message";
  text: string;
  turnKind: "brief" | "revise";
}

/** A single activity line (icon + label), optionally spinning while active. */
export interface StatusEntry extends BaseEntry {
  kind: "status";
  label: string;
  status: FeedEntryStatus;
  round: number;
  tone: FeedEntryTone;
  /** Header markers (round_started) render larger and never spin. */
  isHeader?: boolean;
  /** When set, the entry can open the side panel (live test conversation). */
  reportId?: string;
  /** Internal: lets the derivation resolve a stuck "active" evaluation line. */
  awaitScoreRound?: number;
}

/** A group of per-field generation sub-items (accordion-style). */
export interface FieldProgressEntry extends BaseEntry {
  kind: "field-progress";
  round: number;
  fields: FieldItem[];
}

/** A scored round — renders as an expandable accordion with a "View details" action. */
export interface RoundEntry extends BaseEntry {
  kind: "round";
  round: number;
  score: number | null;
  metrics?: Record<string, number>;
  reportId?: string;
  /** Enriched from roundHistory (matched by reportId). */
  reportMarkdown?: string;
}

/** A terminal banner (success / failure / cancelled). */
export interface TerminalEntry extends BaseEntry {
  kind: "terminal";
  outcome: "succeeded" | "failed" | "cancelled";
  score?: number | null;
  label: string;
  reason?: string;
}

export type FeedEntry =
  | UserMessageEntry
  | StatusEntry
  | FieldProgressEntry
  | RoundEntry
  | TerminalEntry;
