import { FC, useEffect, useRef, useState } from "react";

import { Button } from "@ally-ui-mono/ui-shared";
import { useGetBugHuntRunQuery, useGetBugHuntRunsQuery } from "@api";
import { AgentAvatar } from "@components/agent-avatar";
import { en } from "@constants";
import { BugFinding, BugFindingStatus, BugHuntRun, BugHuntRunStatus } from "@types";

import { BrailleSpinner } from "./BrailleSpinner";
import { BugFindingStatusBadge } from "./BugFindingStatusBadge";
import { BUG_HUNT_EVENT_STAGE_LABELS } from "./bugHuntEventLabels";
import { LifecycleBucket } from "./lifecycleBucket";
import { LiveClock } from "./LiveClock";
import {
  inFlightIds,
  landedBucket,
  landedSince,
  LandedFinding,
  latestEvent,
  LIVE_WORK_COLLAPSED_LIMIT,
  LIVE_WORK_LINGER_MS,
  pruneLanded,
  sortedInFlight,
  visibleLanded,
} from "./liveWork";
import { PipelineRail } from "./PipelineRail";
import { stageFromFindingStatus } from "./pipelineStage";

/**
 * What Bug Hunter is doing right now — the tab's only present-tense section.
 *
 * ## The gap this fills
 *
 * Read the rest of the page and every section is a record. `NeedsYouQueue` is
 * your blocked work. `NotificationInbox` is what it has already told you.
 * `BugFindingsTable` is the inventory. `AgentScorecard` and `RunHistoryTable`
 * are the ledger. The agent's own work-in-progress had one page-level
 * representation — the profile card's sentence "I'm working on 3 fixes right
 * now" — and no way to see which three, how far each had got, or whether any of
 * them moved in the last minute without filtering the table by the in-flight
 * chip and opening three drawers one at a time.
 *
 * The result was a tab that reads as a well-kept filing system for an agent,
 * rather than as an agent working. Every ingredient for the second reading was
 * already built and none of it was on the page: `PipelineRail` (in a drawer,
 * one bug, on request), `BrailleSpinner` (a glyph beside a table cell),
 * `LiveClock` (one instance, describing a fetch). This section is those three
 * pointed at the in-flight set.
 *
 * ## It renders nothing when nothing is moving
 *
 * Same discipline as `NeedsYouQueue`, and it matters more here. A live board
 * that is present-but-empty on a quiet night — "0 in flight", an empty rail, a
 * spinner spinning over nothing — is a section that manufactures the
 * *appearance* of activity, which is the one thing `agentPersona.ts`'s third
 * voice rule forbids: it must never claim work it hasn't done. So on a quiet
 * night this is absent, the profile card says "Nothing on my desk", and the
 * page is honestly still. Everything that moves here moves because a real
 * status changed.
 *
 * ## Three kinds of row, and why each earns its place
 *
 * - **The sweep line**, when a run is live. The only row that carries a real
 *   event feed: at most one run is ever RUNNING, so one extra polled request
 *   buys the actual last thing the agent did ("Found — 3 candidates in
 *   apps/api/src/auth"), which is the single most convincing thing on the page.
 * - **In-flight rows**, one per bug Bug Hunter is moving, ordered furthest
 *   along first so a bug visibly climbs the board as it progresses. Each shows
 *   a dense `PipelineRail`, a first-person line for what that status means, and
 *   a duration that ticks. No status pill: the sentence already says it, and
 *   the rail already says where it is.
 * - **Landed rows**, for a few seconds after a bug leaves the in-flight set.
 *   These are the point of the whole section. A completion used to be a 1.5s
 *   pill flash in a table you may not have been scrolled to; now finishing is
 *   something you see happen, and the row says what happens next.
 *
 * Per-bug event feeds were considered for the in-flight rows and deliberately
 * left out: one request per row, polled, to replace a sentence derived from the
 * status with a sentence read from the timeline. The drawer already carries
 * that timeline in full for the bug you care about. The sweep line is the
 * exception because there is only ever one of it.
 */

export interface LiveWorkBoardProps {
  /** The same window the card, the queue and the bugs table read — one shared cache entry, no extra request. */
  findings: BugFinding[];
  onOpen: (id: string) => void;
}

/** Left rule per landing, in the colour that bucket already wears elsewhere on the tab. */
const LANDED_RULE: Record<LifecycleBucket, string> = {
  needs_you: "border-l-orange-400",
  problem: "border-l-destructive-400",
  queued: "border-l-neutral-300",
  in_flight: "border-l-amber-400",
  in_review: "border-l-blue-400",
  shipped: "border-l-green-500",
  closed: "border-l-neutral-300",
};

/**
 * What Bug Hunter is doing, per in-flight status, in its own voice.
 *
 * Read inside a function rather than hoisted to a module-level `Record`: this
 * file is imported by the page, and building an object off `@constants` at
 * module-eval time is the exact pattern that broke nine admin suites once
 * already (see the ally-web CLAUDE.md gotcha, and `agentPersona.ts`'s docblock
 * for the same note).
 */
const activityLine = (status: BugFindingStatus): string => {
  const strings = en.bugHunter;
  switch (status) {
    case BugFindingStatus.QUEUED:
      return strings.liveWorkQueued;
    case BugFindingStatus.FIXING:
      return strings.liveWorkFixing;
    case BugFindingStatus.COORDINATING:
      return strings.liveWorkCoordinating;
    case BugFindingStatus.RELEASING:
      return strings.liveWorkReleasing;
    default:
      return strings.liveWorkGeneric;
  }
};

/** Where a bug just got to, and what happens next — voice rule 4. */
const landedLine = (status: BugFindingStatus): string => {
  const strings = en.bugHunter;
  switch (status) {
    case BugFindingStatus.PR_OPENED:
      return strings.liveWorkLandedPrOpened;
    case BugFindingStatus.MERGED:
      return strings.liveWorkLandedMerged;
    case BugFindingStatus.RELEASED:
      return strings.liveWorkLandedReleased;
    case BugFindingStatus.RELEASE_FAILED:
      return strings.liveWorkLandedReleaseFailed;
    case BugFindingStatus.NEEDS_INPUT:
      return strings.liveWorkLandedNeedsInput;
    case BugFindingStatus.PENDING_APPROVAL:
      return strings.liveWorkLandedPendingApproval;
    case BugFindingStatus.FAILED:
      return strings.liveWorkLandedFailed;
    case BugFindingStatus.CANCELLED:
      return strings.liveWorkLandedCancelled;
    case BugFindingStatus.DISMISSED:
    case BugFindingStatus.REJECTED:
      return strings.liveWorkLandedClosed;
    default:
      return strings.liveWorkLandedRequeued;
  }
};

/**
 * Bugs that stopped being in flight while the reader was on the page.
 *
 * Seeds on the first observation and reports nothing from it, so opening the
 * tab on a table full of merged bugs announces none of them as having just
 * landed — the same reason `BugFindingsTable`'s `freshIds` seeds on mount
 * instead of flashing twenty rows at once. The detection itself is
 * `landedSince` in `liveWork.ts`; this hook is only the memory between polls
 * and the timer that forgets.
 */
const useRecentlyLanded = (findings: BugFinding[]): LandedFinding[] => {
  const [landed, setLanded] = useState<LandedFinding[]>([]);
  const previousInFlightRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    const current = inFlightIds(findings);

    if (previousInFlightRef.current === null) {
      previousInFlightRef.current = current;
      return;
    }

    const justLanded = landedSince(previousInFlightRef.current, findings);
    previousInFlightRef.current = current;
    if (justLanded.length === 0) return;

    const observedAt = Date.now();
    setLanded(items =>
      pruneLanded([...justLanded.map(finding => ({ finding, observedAt })), ...items], observedAt),
    );
  }, [findings]);

  // Self-rescheduling prune: one timer, set to when the oldest row expires,
  // rather than a once-a-second interval running whether or not anything has
  // landed.
  //
  // The identity guard is what stops it rescheduling forever. This effect
  // depends on `landed`, and `pruneLanded` always returns a fresh array — so
  // committing a prune that removed nothing would be a new reference, a new
  // effect run and a new timer, on repeat. Returning `items` unchanged when
  // nothing expired keeps the cycle terminating on the data rather than on the
  // timer happening to fire late enough.
  useEffect(() => {
    if (landed.length === 0) return undefined;
    const oldest = Math.min(...landed.map(item => item.observedAt));
    const timer = setTimeout(
      () =>
        setLanded(items => {
          const pruned = pruneLanded(items, Date.now());
          return pruned.length === items.length ? items : pruned;
        }),
      Math.max(0, oldest + LIVE_WORK_LINGER_MS - Date.now()) + 50,
    );
    return () => clearTimeout(timer);
  }, [landed]);

  return landed;
};

/**
 * The live sweep, with the last thing it actually did.
 *
 * A child component so the run-detail hook can be called unconditionally on a
 * `run` that is known to exist — the same shape `RunHistoryTable` uses for its
 * expanded row, and the reason there is no `skipToken` here.
 */
const LiveSweepLine: FC<{ run: BugHuntRun }> = ({ run }) => {
  const { data } = useGetBugHuntRunQuery(run.id, {
    pollingInterval: 10_000,
    skipPollingIfUnfocused: true,
  });
  const event = latestEvent(data?.events ?? []);

  return (
    <li className="border border-border-light border-l-4 border-l-amber-400 rounded-lg bg-white px-4 py-3 animate-fadeIn motion-reduce:animate-none">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-typography-900">
            <BrailleSpinner className="text-amber-600 mr-1.5" />
            {en.bugHunter.liveWorkSweeping.replace("{repo}", run.repo)}
          </p>
          {/* The genuine "this second" line. Absent rather than filled with a
              placeholder until the run has logged something — an agent that
              has started and not yet reported has nothing to report. */}
          {event && (
            <p className="text-xs text-typography-600 mt-1 truncate">
              <span className="font-mono uppercase tracking-wide text-typography-500">
                {BUG_HUNT_EVENT_STAGE_LABELS[event.stage]}
              </span>
              {` · ${event.summary}`}
            </p>
          )}
        </div>
        <LiveClock
          since={run.createdAt}
          mode="elapsed"
          srLabel={en.bugHunter.liveWorkSweepElapsedLabel}
        />
      </div>
    </li>
  );
};

/** One bug Bug Hunter is moving right now. */
const InFlightRow: FC<{ finding: BugFinding; onOpen: (id: string) => void }> = ({
  finding,
  onOpen,
}) => (
  <li className="border border-border-light border-l-4 border-l-amber-400 rounded-lg bg-white px-4 py-3 animate-fadeIn motion-reduce:animate-none">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => onOpen(finding.id)}
          aria-label={en.bugHunter.rowOpenLabel.replace("{title}", finding.title)}
          title={finding.title}
          className="block max-w-full truncate text-left text-sm font-medium text-typography-900 rounded cursor-pointer hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          {finding.title}
        </button>
        <p className="text-xs text-typography-600 mt-0.5 truncate">
          {finding.repo ?? en.bugHunter.liveWorkNoRepo}
        </p>
      </div>
      <LiveClock
        since={finding.updatedAt}
        mode="elapsed"
        srLabel={en.bugHunter.liveWorkStageElapsedLabel}
      />
    </div>

    {/* The rail is why this row exists rather than being another status pill:
        it is the one thing on the page that shows distance travelled, and it
        animates its fill when the stage advances. */}
    <div className="mt-3 max-w-md">
      <PipelineRail stage={stageFromFindingStatus(finding.status)} dense />
    </div>

    <p className="text-xs text-typography-700 mt-2">
      <BrailleSpinner className="text-amber-600 mr-1.5" />
      {activityLine(finding.status)}
    </p>
  </li>
);

/** A bug that finished moving in the last few seconds. */
const LandedRow: FC<{ item: LandedFinding; onOpen: (id: string) => void }> = ({ item, onOpen }) => {
  const { finding } = item;

  return (
    <li
      className={`border border-border-light border-l-4 ${
        LANDED_RULE[landedBucket(finding)]
      } rounded-lg bg-white px-4 py-3 animate-fadeIn motion-reduce:animate-none`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => onOpen(finding.id)}
            aria-label={en.bugHunter.rowOpenLabel.replace("{title}", finding.title)}
            title={finding.title}
            className="block max-w-full truncate text-left text-sm font-medium text-typography-900 rounded cursor-pointer hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            {finding.title}
          </button>
          <p className="text-xs text-typography-700 mt-1">{landedLine(finding.status)}</p>
        </div>
        {/* The one place a status pill belongs on this board: a landed row's
            whole subject is the status it landed on, and the pill is how the
            rest of the tab already spells that. */}
        <span className="shrink-0">
          <BugFindingStatusBadge status={finding.status} />
        </span>
      </div>
    </li>
  );
};

export const LiveWorkBoard: FC<LiveWorkBoardProps> = ({ findings, onOpen }) => {
  // Same args as the profile card's, so this reads that cache entry rather than
  // adding a request.
  const { data: runsData } = useGetBugHuntRunsQuery(undefined, { pollingInterval: 10_000 });
  const [expanded, setExpanded] = useState(false);

  const landed = useRecentlyLanded(findings);

  const inFlight = sortedInFlight(findings);
  const shown = visibleLanded(landed, inFlight);
  const liveRun = (runsData?.items ?? []).find(run => run.status === BugHuntRunStatus.RUNNING);

  // Nothing is moving, so there is no present tense to report. See the module
  // doc: an empty live board is worse than no live board.
  if (inFlight.length === 0 && shown.length === 0 && !liveRun) return null;

  const visible = expanded ? inFlight : inFlight.slice(0, LIVE_WORK_COLLAPSED_LIMIT);
  const hiddenCount = inFlight.length - visible.length;

  return (
    <section aria-labelledby="live-work-heading">
      <div className="flex items-center gap-3 mb-3">
        <AgentAvatar size="sm" presence="working" animate label={en.bugHunter.agentName} />
        <div className="min-w-0">
          <h2 id="live-work-heading" className="text-sm font-semibold text-typography-900">
            {en.bugHunter.liveWorkTitle}
          </h2>
          {/* States that this region wants nothing from you — the one thing
              that distinguishes it at a glance from the queue above it, which
              is the section that does. */}
          <p className="text-xs text-typography-600">{en.bugHunter.liveWorkSubtitle}</p>
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {/* Landed first: it is the newest thing to have happened, and putting
            the payoff where the eye lands is the whole reason it lingers. */}
        {shown.map(item => (
          <LandedRow key={item.finding.id} item={item} onOpen={onOpen} />
        ))}
        {liveRun && <LiveSweepLine key={liveRun.id} run={liveRun} />}
        {visible.map(finding => (
          <InFlightRow key={finding.id} finding={finding} onOpen={onOpen} />
        ))}
      </ul>

      {(hiddenCount > 0 || expanded) && (
        <div className="mt-2">
          <Button size="sm" kind="ghost" onClick={() => setExpanded(value => !value)}>
            {expanded
              ? en.bugHunter.liveWorkShowFewer
              : en.bugHunter.liveWorkShowAll.replace("{count}", String(hiddenCount))}
          </Button>
        </div>
      )}
    </section>
  );
};
