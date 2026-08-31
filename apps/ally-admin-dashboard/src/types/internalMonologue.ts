/**
 * One turn of the client's internal monologue.
 *
 * Emitted by ai-learn's working memory after each turn commits
 * (`app/core/working_memory/monologue.py`) and delivered two ways, with the
 * same shape either way:
 *
 *  - LIVE, as a LiveKit data packet on the `internal-monologue` topic, for the
 *    Studio preview;
 *  - STORED, as an array on the session record, so an admin can revisit a
 *    session and work out what happened after the fact.
 *
 * This is a diagnostic surface for scenario authors, not a trust cue for
 * learners: it errs toward completeness. Everything here is data working memory
 * already derives for its own purposes, so rendering it costs no extra tokens.
 */
export interface InternalMonologueTurn {
  type: "monologue.turn";
  turn: number;

  /**
   * The exchange this turn's reasoning was derived from. Carried on the card
   * rather than joined against the transcript later: without it a stored record
   * is a list of assertions with nothing to explain them.
   */
  counsellorSaid: string | null;
  clientSaid: string | null;

  /** Present only on a transition; null when the client held its stance. */
  stanceFrom: string | null;
  /** The scenario state the client is in, as the author named it. */
  stanceTo: string | null;
  /** How many consecutive turns in this stance — a stuck arc shows up here. */
  turnsInStance: number;
  /** The scenario's own states, lowest band first. */
  arc: string[];
  /** Simulation score at this turn. Read for display only. */
  score: number | null;

  /** What the client feels now. */
  affect: string | null;
  /**
   * The client's PRIVATE reading of the counsellor's intent. Never sent to the
   * actor — it is scratchpad by design — which makes it the one genuinely
   * hidden thought in the system, and usually the answer to "why did she
   * close up?".
   */
  appraisal: string | null;
  /** How the client is speaking now (clipped, rambling, flat, warm). */
  register: string | null;

  /** Facts the client stated THIS turn. */
  disclosed: string[];
  /** Subjects newly not-yet-said, with how the client moves away from each. */
  withheld: Array<{ topic: string; deflection: string }>;
  /** Threads raised and left unfinished this turn. */
  threadsOpened: string[];
  /** Threads that genuinely closed this turn. */
  threadsClosed: string[];

  /** Backstory facts recalled into this turn's prompt. */
  recalled: string[];
  /** Cues the updater flagged to bring something back next turn. */
  retrieveCues: string[];
  /** Author-defined behaviours the counsellor was credited for. */
  events: Array<{ label: string; score: number | null }>;

  /**
   * The literal `{working_memory_*}` values the actor received, keyed without
   * the prefix. For prompt tuning this is the ground truth — everything else
   * describes the client's state, while this is the text that shaped the reply.
   */
  sections: Record<string, string>;

  /** True when this turn's update timed out and ran on stale memory. */
  missed: boolean;
  /** Running count of missed updates this session. */
  updatesMissed: number;
}

/** LiveKit data-channel topic carrying monologue turns. */
export const MONOLOGUE_TOPIC = "internal-monologue";

/**
 * A recorded admin-preview run.
 *
 * Previews are ephemeral everywhere else in the system — no session row, every
 * SQS processor drops `preview-%` — so these rows exist purely so a curator can
 * reopen a run and read the monologue after the fact rather than having to
 * catch it live while also playing the counsellor.
 */
export interface PreviewMonologueRunSummary {
  id: string;
  roomName: string;
  scenarioId: number;
  scenarioVersionId: string | null;
  languageId: number | null;
  startedByUserId: number | null;
  /** Resolved server-side; a bare user id tells the reader nothing. */
  startedByName: string | null;
  startedAt: string;
  /** Null when the run never reported a monologue at all. */
  endedAt: string | null;
  turnCount: number;
}

export interface PreviewMonologueRun extends PreviewMonologueRunSummary {
  turns: InternalMonologueTurn[];
}
