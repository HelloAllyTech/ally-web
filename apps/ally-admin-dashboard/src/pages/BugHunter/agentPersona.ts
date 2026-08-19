import { en } from "@constants";
import { BugFinding, BugFindingStatus, BugHunterMode, BugHuntRun, BugHuntRunStatus } from "@types";

import { IN_FLIGHT_STATUSES, PROBLEM_STATUSES, WAITING_ON_YOU_STATUSES } from "./lifecycleBucket";

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

/**
 * The status groups these functions classify by now live in
 * `lifecycleBucket.ts`, which the bugs table and the workload strip read the
 * same definitions from. They used to be four private arrays in this file, and
 * a second copy grew next to the table's filter — which is how a status pill
 * and a workload tile end up disagreeing about the same number.
 */

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

/**
 * The four-number workload summary that used to live here (`summariseWorkload`,
 * `AgentWorkload`, `SHIPPED_WINDOW_DAYS`) is gone. `countByBucket` in
 * `lifecycleBucket.ts` replaced it.
 *
 * The difference is not just where it lives. The old summary counted four
 * groups that between them did not cover all seventeen statuses, so its four
 * tiles summed to less than the list they were drawn from — hence the footnote
 * conceding it was "a picture of this week, not an all-time total". The bucket
 * counts partition every finding into exactly one group, so the chip row sums
 * to the total and can be read as a breakdown.
 *
 * The one thing genuinely lost is the seven-day window on "shipped": the chip
 * counts every RELEASED finding in the loaded window rather than only those
 * released in the last week. That window is what made the old tile
 * un-sum-able, and "Live" is a fact about a bug that does not expire after
 * seven days.
 */
