import { en } from "@constants";
import { BugFinding, BugFindingStatus, BugHunterMode, BugHuntRun, BugHuntRunStatus } from "@types";

/**
 * Who Bug Hunter is, and how it speaks.
 *
 * This tab is the one place on the platform where an agent is presented as a
 * colleague rather than a pipeline — a software test engineer whose work you
 * check in on. That framing is a product decision, not decoration: an admin
 * who reads "I'm stuck on ally-be, here's the question" acts on it, where the
 * same fact as a row in an events table gets scrolled past.
 *
 * ## Voice rules — apply to every string it "says", here and in ally-be
 *
 * 1. **First person.** It is the one speaking. Never "Bug Hunter is stuck" in
 *    a message *from* Bug Hunter; that is someone else narrating it.
 * 2. **Plain and calm.** No jokes, no emoji, no exclamation marks. It reports
 *    on production systems; a chirpy tone next to a failed release is wrong.
 * 3. **Never claims work it hasn't done.** "I've opened a PR" only once one is
 *    open. A dispatched release is "running", not "released" — the outcome
 *    lands minutes later (see the release reconciliation in ally-be).
 * 4. **Always says what happens next.** Every message ends with the next step,
 *    or with what it's waiting on. A status with no next action is a dead end.
 *
 * The strings themselves live in `en.bugHunter` rather than being hoisted into
 * a constant here: this module is imported by page components, and building an
 * object off `@constants` at module-eval time is the exact pattern that broke
 * nine admin test suites once already (see the ally-web CLAUDE.md gotcha).
 * Read them inside the function that needs them.
 */

/**
 * What the character is doing, as a colleague's presence would report it.
 * Ordered by precedence — `deriveAgentStatus` picks the first that applies.
 */
export type AgentStatusKind =
  /** The kill switch is off: it isn't picking anything up at all. */
  | "off_duty"
  /** It has stopped and cannot continue without a human decision. */
  | "waiting_on_you"
  /** A job of its own went red. */
  | "problem"
  /** Actively sweeping or fixing something right now. */
  | "working"
  /** On duty, nothing outstanding. */
  | "on_shift";

export interface AgentStatus {
  kind: AgentStatusKind;
  /** The pill: two or three words. */
  label: string;
  /** One line under the name, in its own voice. */
  detail: string;
}

/** Findings that have stopped and are waiting on a person. */
const WAITING_ON_YOU_STATUSES: BugFindingStatus[] = [
  BugFindingStatus.PENDING_APPROVAL,
  BugFindingStatus.NEEDS_INPUT,
];

/** Findings whose last job went red. */
const PROBLEM_STATUSES: BugFindingStatus[] = [
  BugFindingStatus.FAILED,
  BugFindingStatus.RELEASE_FAILED,
];

/** Findings it is actively moving right now. */
const IN_FLIGHT_STATUSES: BugFindingStatus[] = [
  BugFindingStatus.QUEUED,
  BugFindingStatus.FIXING,
  BugFindingStatus.COORDINATING,
  BugFindingStatus.RELEASING,
];

/** Merged or in review — done with, but not yet in front of users. */
const IN_REVIEW_STATUSES: BugFindingStatus[] = [
  BugFindingStatus.PR_OPENED,
  BugFindingStatus.MERGED,
];

const countOf = (findings: BugFinding[], statuses: BugFindingStatus[]) =>
  findings.filter(finding => statuses.includes(finding.status)).length;

/** Picks the singular or plural string and substitutes the count into it. */
const plural = (count: number, one: string, many: string) =>
  (count === 1 ? one : many).replace("{count}", String(count));

export interface DeriveAgentStatusInput {
  /** Undefined while the settings request is in flight. */
  mode?: BugHunterMode;
  findings: BugFinding[];
  /** The run currently in progress, if any. */
  liveRun?: BugHuntRun | null;
}

/**
 * Turns the page's raw data into one line about what the character is doing.
 *
 * Everything except `off_duty` is derived from **finding state, never from
 * whether a notification has been read**. An unread PROBLEM message from three
 * nights ago would otherwise pin the status red until someone cleared the
 * inbox, where a RELEASE_FAILED finding stops counting the moment the release
 * is retried — the status then describes the work, which is what it claims to
 * describe.
 */
export const deriveAgentStatus = ({
  mode,
  findings,
  liveRun,
}: DeriveAgentStatusInput): AgentStatus => {
  const strings = en.bugHunter;

  if (mode === BugHunterMode.OFF) {
    return {
      kind: "off_duty",
      label: strings.agentStatusOffDuty,
      detail: strings.agentStatusOffDutyDetail,
    };
  }

  const waiting = countOf(findings, WAITING_ON_YOU_STATUSES);
  if (waiting > 0) {
    return {
      kind: "waiting_on_you",
      label: strings.agentStatusWaiting,
      detail: plural(
        waiting,
        strings.agentStatusWaitingDetailOne,
        strings.agentStatusWaitingDetail,
      ),
    };
  }

  const problems = countOf(findings, PROBLEM_STATUSES);
  if (problems > 0) {
    return {
      kind: "problem",
      label: strings.agentStatusProblem,
      detail: plural(
        problems,
        strings.agentStatusProblemDetailOne,
        strings.agentStatusProblemDetail,
      ),
    };
  }

  const inFlight = countOf(findings, IN_FLIGHT_STATUSES);
  const isSweeping = liveRun?.status === BugHuntRunStatus.RUNNING;
  if (isSweeping || inFlight > 0) {
    return {
      kind: "working",
      label: strings.agentStatusWorking,
      // The sweep is the more specific thing to say — it names a repo — so it
      // wins the line when both are true.
      detail: isSweeping
        ? strings.agentStatusWorkingSweeping.replace("{repo}", liveRun?.repo ?? "")
        : plural(inFlight, strings.agentStatusWorkingDetailOne, strings.agentStatusWorkingDetail),
    };
  }

  return {
    kind: "on_shift",
    label: strings.agentStatusOnShift,
    detail:
      mode === BugHunterMode.MANUAL
        ? strings.agentStatusOnShiftDetailManual
        : strings.agentStatusOnShiftDetail,
  };
};

export interface AgentWorkload {
  /** Bugs it is moving right now. */
  inFlight: number;
  /** Bugs stopped on a human decision. */
  waitingOnYou: number;
  /** Fixes written and awaiting review, or merged and awaiting release. */
  inReview: number;
  /** Fixes that reached production inside the window. */
  shipped: number;
}

/** How far back "shipped" looks. A week is the span of a standup answer. */
export const SHIPPED_WINDOW_DAYS = 7;

/**
 * The four numbers on the character's desk.
 *
 * Counted client-side from the findings the page has already loaded rather
 * than from a new endpoint — which means they describe the most recent 100
 * findings (`BugFindingsTable`'s existing cap), not all history. That is the
 * right window for "what's on your plate this week" and wrong for anything
 * cumulative, so nothing here is labelled as a lifetime total.
 */
export const summariseWorkload = (
  findings: BugFinding[],
  now: Date = new Date(),
): AgentWorkload => {
  const since = now.getTime() - SHIPPED_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  return {
    inFlight: countOf(findings, IN_FLIGHT_STATUSES),
    waitingOnYou: countOf(findings, WAITING_ON_YOU_STATUSES),
    inReview: countOf(findings, IN_REVIEW_STATUSES),
    shipped: findings.filter(
      finding =>
        finding.status === BugFindingStatus.RELEASED &&
        finding.releasedAt != null &&
        new Date(finding.releasedAt).getTime() >= since,
    ).length,
  };
};
