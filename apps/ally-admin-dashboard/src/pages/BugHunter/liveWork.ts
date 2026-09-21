import { BugFinding, BugHuntEvent } from "@types";

import { bucketOfStatus, LifecycleBucket } from "./lifecycleBucket";
import { PIPELINE_STAGES, stageFromFindingStatus } from "./pipelineStage";

/**
 * The derivation behind `LiveWorkBoard` — which bugs Bug Hunter is moving right
 * now, in what order, and which ones finished moving while you were watching.
 *
 * ## Why this exists at all
 *
 * Every other section of the tab is a record: `NeedsYouQueue` is your blocked
 * work, `NotificationInbox` is what it has already told you, `BugFindingsTable`
 * is the inventory, `AgentScorecard` and `RunHistoryTable` are the ledger. None
 * of them is present tense. The agent's own work-in-progress had exactly one
 * page-level representation — the sentence "I'm working on 3 fixes right now" on
 * the profile card — and the only way to see *which* three and how far each had
 * got was to filter the table by the in-flight chip and open three drawers one
 * at a time. `PipelineRail`, the one component that shows forward motion, was
 * reachable only from inside a drawer, for one bug, if you went looking.
 *
 * So the board is the missing present tense, and this module is what it reads.
 *
 * ## Ordering: furthest along first, and it only changes when work does
 *
 * Rows are sorted by rail position descending, so a bug climbs the board as it
 * progresses and the board's top row is always the one closest to being in
 * front of users. That is deliberately *not* "most recently updated first",
 * which would reshuffle the list on every poll and make the movement mean
 * nothing — if rows move for a dozen reasons, a row moving stops being a
 * signal. Here the only thing that reorders the board is a bug actually
 * advancing a stage, which is exactly the event worth animating.
 *
 * Ties break on `updatedAt` (newest first) and then on `id`, so two bugs at the
 * same stage hold a stable order across polls rather than swapping places on
 * whatever order the API happened to return them in.
 *
 * ## "Landed" is observed, never inferred from a single response
 *
 * A completion is the payoff moment of the whole feature and it used to be
 * invisible: the row's status pill flashed for 1.5s in a table you may not have
 * been scrolled to, and the bug silently dropped out of the in-flight set. So
 * the board keeps a bug on screen for a few seconds after it stops being
 * in-flight, labelled with where it went.
 *
 * `landedSince` is the whole of that detection, and it is deliberately a
 * comparison between two observations rather than a property of one response:
 * "was in flight when I last looked, and is not now". A finding that is already
 * MERGED on first load has not landed *while you were watching* and must not be
 * announced as though it had — same discipline as the bugs table's
 * `freshIds`, which seeds on mount precisely so a first paint doesn't flash
 * twenty rows at once.
 *
 * Imports `@types` and two sibling derivation modules, and no `@constants` —
 * the copy for each landing lives in `LiveWorkBoard`, which is a component and
 * may read `en` freely. See `lifecycleBucket.ts` for why that line matters.
 */

/** How long a finished bug stays on the board after it stops being in flight. */
export const LIVE_WORK_LINGER_MS = 20_000;

/**
 * How many in-flight rows show before the rest collapse behind a "show all".
 *
 * Same number as `NeedsYouQueue`'s, for the same reason: three rows is what
 * fits under the card without pushing the bugs table off a 1000×600 viewport,
 * and a genuine pile-up of eleven concurrent fix sessions is a real state that
 * should not turn a live board back into a list to scroll.
 */
export const LIVE_WORK_COLLAPSED_LIMIT = 3;

/** Landed rows are capped harder than in-flight ones — they are transient news, not work. */
export const LIVE_WORK_LANDED_LIMIT = 3;

/** A bug that stopped being in flight while the reader was on the page. */
export interface LandedFinding {
  finding: BugFinding;
  /** `Date.now()` at the poll that observed the change — what the linger window is measured from. */
  observedAt: number;
}

/** Whether Bug Hunter is moving this bug under its own steam right now. */
export const isInFlight = (finding: BugFinding): boolean =>
  bucketOfStatus(finding.status) === "in_flight";

/** The ids Bug Hunter is currently moving — the set `landedSince` compares against next poll. */
export const inFlightIds = (findings: BugFinding[]): Set<string> =>
  new Set(findings.filter(isInFlight).map(finding => finding.id));

/**
 * In-flight bugs, furthest along the rail first. See the module doc for why the
 * sort is by stage rather than by recency.
 */
export const sortedInFlight = (findings: BugFinding[]): BugFinding[] =>
  findings.filter(isInFlight).sort((a, b) => {
    const byStage =
      PIPELINE_STAGES.indexOf(stageFromFindingStatus(b.status)) -
      PIPELINE_STAGES.indexOf(stageFromFindingStatus(a.status));
    if (byStage !== 0) return byStage;

    const byUpdated = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    if (byUpdated !== 0) return byUpdated;

    return a.id.localeCompare(b.id);
  });

/**
 * Bugs that were in flight at the previous observation and are not now.
 *
 * Takes the previous in-flight *ids* rather than the previous findings array so
 * a caller only has to retain a `Set<string>` between polls, and so this stays
 * a pure comparison with no notion of "the last render".
 */
export const landedSince = (previousInFlight: Set<string>, findings: BugFinding[]): BugFinding[] =>
  findings.filter(finding => previousInFlight.has(finding.id) && !isInFlight(finding));

/**
 * Drops landed rows past the linger window, newest first, capped — and keeps
 * only the newest entry per bug.
 *
 * The dedupe is not defensive tidying: a bug can land twice inside one linger
 * window for real. A fix attempt goes red, an admin retries it from the drawer,
 * and the retry goes red again — two landings on the same bug, seconds apart,
 * and without this the board would show the same title twice under two
 * different snapshots and React would see a duplicate key.
 */
export const pruneLanded = (landed: LandedFinding[], now: number): LandedFinding[] => {
  const seen = new Set<string>();
  return landed
    .filter(item => now - item.observedAt < LIVE_WORK_LINGER_MS)
    .sort((a, b) => b.observedAt - a.observedAt)
    .filter(item => {
      if (seen.has(item.finding.id)) return false;
      seen.add(item.finding.id);
      return true;
    })
    .slice(0, LIVE_WORK_LANDED_LIMIT);
};

/**
 * Landed rows worth showing, given what is in flight right now.
 *
 * A bug can leave the in-flight set and come straight back into it: MERGED
 * lands it, and pressing "Release to production" moves it to RELEASING, which
 * is in-flight again. Inside the linger window that bug is in both lists, and
 * the board would show it twice — once as "merged, releasing is your call" and
 * once as a live row already releasing, which is the stale half contradicting
 * the live half. Work in progress wins: a bug Bug Hunter is moving *now* is
 * never also reported as finished.
 */
export const visibleLanded = (landed: LandedFinding[], inFlight: BugFinding[]): LandedFinding[] => {
  const moving = new Set(inFlight.map(finding => finding.id));
  return landed.filter(item => !moving.has(item.finding.id));
};

/**
 * Where a landed bug went, as one of the lifecycle buckets the rest of the page
 * already speaks in.
 *
 * No new taxonomy on purpose. A bug leaving flight can go to any of five
 * buckets — `in_review`, `shipped`, `needs_you`, `problem`, `closed` — and each
 * of those already has a colour, a chip and a meaning everywhere else on this
 * tab. Inventing a parallel set of outcome names here is how a board's green
 * ends up meaning something different to a chip's green.
 */
export const landedBucket = (finding: BugFinding): LifecycleBucket =>
  bucketOfStatus(finding.status);

/**
 * The newest event in a run's timeline.
 *
 * Sorted rather than trusting array order: the board prints this as "what I am
 * doing this second", and printing the wrong end of an unsorted array there is
 * a claim about live work that happens to be stale, which voice rule 3 in
 * `agentPersona.ts` exists to prevent.
 */
export const latestEvent = (events: BugHuntEvent[]): BugHuntEvent | null =>
  events.length === 0
    ? null
    : events.reduce((newest, event) =>
        new Date(event.createdAt).getTime() > new Date(newest.createdAt).getTime() ? event : newest,
      );
