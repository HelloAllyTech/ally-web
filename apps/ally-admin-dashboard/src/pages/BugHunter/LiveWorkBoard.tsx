import React, { FC, useEffect, useRef, useState } from "react";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { Button } from "@ally-ui-mono/ui-shared";
import { useGetBugHuntRunQuery, useGetBugHuntRunsQuery } from "@api";
import { AgentAvatar } from "@components/agent-avatar";
import { en } from "@constants";
import { BugFinding, BugFindingStatus, BugHuntRun, BugHuntRunStatus } from "@types";

import { BrailleSpinner } from "./BrailleSpinner";
import { BugFindingStatusBadge } from "./BugFindingStatusBadge";
import { BUG_HUNT_EVENT_STAGE_LABELS } from "./bugHuntEventLabels";
import { CARBON_MOTION, stillness } from "./carbonMotion";
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
 * ## What moves, and why each movement is a claim
 *
 * The brief for this section is that the tab should feel like an agentic system
 * moving and solving issues, and motion is most of the difference between a
 * board that reports work and one that shows it. Every animation here is
 * anchored to a real state change, and none of it is decoration:
 *
 * - **A row climbs** when its bug advances a stage, because rows are ordered by
 *   rail position. Nothing else reorders the board, so a row moving up means
 *   exactly one thing.
 * - **A row lands in place.** `WorkRow` is one component keyed on the bug's id
 *   rather than a separate in-flight and landed row, so the element you were
 *   watching being worked slides to the top of the board and its contents
 *   cross-fade into "Merged to master". See `WorkRow`'s own doc — this is the
 *   payoff animation, and getting it wrong meant one row blinking out and an
 *   unrelated one blinking in.
 * - **The rail's pulse travels** toward the next stage on in-flight rows only
 *   (`flowing`), which is a claim that work is heading somewhere, not just that
 *   it is somewhere.
 * - **A new sweep event slides in** over the one it replaces, so the agent's own
 *   log arrives in front of you rather than being different next time you look.
 *
 * Durations and curves come from `carbonMotion.ts`, which derives them from
 * `@carbon/motion` — so a row reordering here and a panel expanding elsewhere
 * in a Carbon app move at the same speed on the same curve, and "more motion"
 * does not mean each animation inventing its own numbers. Under
 * `prefers-reduced-motion` every one of them is off rather than slowed: the
 * board still reorders, lands and updates, it just stops narrating it.
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
  const shouldReduceMotion = useReducedMotion();
  const { data } = useGetBugHuntRunQuery(run.id, {
    pollingInterval: 10_000,
    skipPollingIfUnfocused: true,
  });
  const event = latestEvent(data?.events ?? []);

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-typography-900">
          <BrailleSpinner className="text-amber-600 mr-1.5" />
          {en.bugHunter.liveWorkSweeping.replace("{repo}", run.repo)}
        </p>

        {/* Keyed on the event's id, so a new one arriving slides in over the
            one it replaces rather than the text simply being different next
            time you look. This is the only place on the tab where the agent's
            own log lands in front of you as it happens. */}
        <AnimatePresence mode="wait" initial={false}>
          {event && (
            <motion.p
              key={event.id}
              className="text-xs text-typography-600 mt-1 truncate"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={shouldReduceMotion ? stillness : CARBON_MOTION.enter}
            >
              {/* Same treatment the drawer's timeline gives this exact label —
                  serif and medium, not a mono pseudo-code tag. */}
              <span className="font-medium text-typography-700">
                {BUG_HUNT_EVENT_STAGE_LABELS[event.stage]}
              </span>
              {` · ${event.summary}`}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      <LiveClock
        since={run.createdAt}
        mode="elapsed"
        srLabel={en.bugHunter.liveWorkSweepElapsedLabel}
      />
    </div>
  );
};

/**
 * One bug on the board, in whichever of its two phases it is in.
 *
 * ## Why this is one component and not two
 *
 * A bug being worked and the same bug having just finished used to be
 * `InFlightRow` and `LandedRow`. Rendering them as separate components meant
 * that at the moment a fix landed, React unmounted one row from the middle of
 * the list and mounted a different one at the top — so the single most
 * meaningful event in the whole feature, the thing the reader came to see, was
 * a row blinking out of existence and an unrelated row blinking in.
 *
 * Rendered as one component keyed on the bug's id, the same `<motion.li>`
 * survives the transition: it slides from where it was being worked up to the
 * top of the board and its contents cross-fade into "Merged to master". You
 * watch the bug you were following finish. That is the whole design brief in
 * one animation, and it costs a merged component rather than a new mechanism.
 */
const WorkRow: FC<{
  finding: BugFinding;
  phase: "in_flight" | "landed";
  onOpen: (id: string) => void;
}> = ({ finding, phase, onOpen }) => {
  const shouldReduceMotion = useReducedMotion();
  const landed = phase === "landed";

  return (
    <>
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
          {landed ? (
            <p className="text-xs text-typography-700 mt-1">{landedLine(finding.status)}</p>
          ) : (
            <p className="text-xs text-typography-600 mt-0.5 truncate">
              {finding.repo ?? en.bugHunter.liveWorkNoRepo}
            </p>
          )}
        </div>

        {landed ? (
          /* The one place a status pill belongs on this board: a landed row's
             whole subject is the status it landed on, and the pill is how the
             rest of the tab already spells that. */
          <span className="shrink-0">
            <BugFindingStatusBadge status={finding.status} />
          </span>
        ) : (
          <LiveClock
            since={finding.updatedAt}
            mode="elapsed"
            srLabel={en.bugHunter.liveWorkStageElapsedLabel}
          />
        )}
      </div>

      {/* The rail and the activity line are the working half of the row, and
          they animate out together as it lands — the row keeps its identity
          while what there is to say about it changes. */}
      <AnimatePresence initial={false}>
        {!landed && (
          <motion.div
            key="working"
            initial={shouldReduceMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={shouldReduceMotion ? stillness : CARBON_MOTION.exit}
            className="overflow-hidden"
          >
            <div className="mt-3 max-w-md">
              <PipelineRail stage={stageFromFindingStatus(finding.status)} dense flowing />
            </div>
            <p className="text-xs text-typography-700 mt-2">
              <BrailleSpinner className="text-amber-600 mr-1.5" />
              {activityLine(finding.status)}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/** Shared shell, so a row's box is the same box whatever is inside it. */
const BoardRow: FC<{ rule: string; children: React.ReactNode }> = ({ rule, children }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.li
      layout={shouldReduceMotion ? false : "position"}
      initial={shouldReduceMotion ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
      transition={shouldReduceMotion ? stillness : CARBON_MOTION.enter}
      className={`border border-border-light border-l-4 ${rule} rounded-lg bg-white px-4 py-3`}
    >
      {children}
    </motion.li>
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

      {/* `popLayout` takes a leaving row out of the flow at once, so the rows
          below it travel up under their own `layout` transition instead of
          waiting for a gap to finish collapsing. */}
      <ul className="flex flex-col gap-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {/* Landed first: it is the newest thing to have happened, and putting
              the payoff where the eye lands is the whole reason it lingers.
              These share the keyspace with the in-flight rows below, which is
              what lets a bug travel between the two groups as one element. */}
          {shown.map(item => (
            <BoardRow key={item.finding.id} rule={LANDED_RULE[landedBucket(item.finding)]}>
              <WorkRow finding={item.finding} phase="landed" onOpen={onOpen} />
            </BoardRow>
          ))}

          {liveRun && (
            <BoardRow key={liveRun.id} rule="border-l-amber-400">
              <LiveSweepLine run={liveRun} />
            </BoardRow>
          )}

          {visible.map(finding => (
            <BoardRow key={finding.id} rule="border-l-amber-400">
              <WorkRow finding={finding} phase="in_flight" onOpen={onOpen} />
            </BoardRow>
          ))}
        </AnimatePresence>
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
