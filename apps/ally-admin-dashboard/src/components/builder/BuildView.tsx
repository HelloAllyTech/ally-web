import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { toast } from "sonner";

import { Button, InlineNotification, Tag, Tile } from "@ally-ui-mono/ui-shared";
import {
  useAnswerBuilderQuestionMutation,
  useGetBuilderPendingQuestionsQuery,
  useGetBuilderPullRequestsQuery,
  useGetBuilderRunsQuery,
  useGetBuilderSessionBudgetQuery,
  useLazyGetBuilderRunEventsQuery,
} from "@api";
import { en } from "@constants";
import { useBuilderSocket } from "@hooks";
import { BuilderBuildEvent, BuilderSessionStatus, BuilderStage, BuilderTodoItem } from "@types";

import { BuildActivityFeed } from "./BuildActivityFeed";
import { PhaseRail } from "./PhaseRail";
import { BuilderAnswerPayload, QuestionCard } from "./QuestionCard";
import { RaiseBudgetDialog } from "./RaiseBudgetDialog";
import { RunHistoryRail } from "./RunHistoryRail";
import { TodoPanel } from "./TodoPanel";

/** Statuses in which the build is still moving on its own. */
const LIVE_STATUSES: BuilderSessionStatus[] = ["BUILDING"];

/**
 * Poll cadences. The socket is the primary channel; polling is the safety
 * net, so it slows right down while pushing works and speeds back up when it
 * does not. A build whose socket died quietly must not look like a build that
 * stopped working.
 */
const POLL_WITH_SOCKET_MS = 20000;
const POLL_WITHOUT_SOCKET_MS = 4000;

/**
 * How often the held-budget banner re-reads the clock. The countdown it draws
 * is in whole minutes, so anything finer would repaint for nothing.
 */
const BUDGET_COUNTDOWN_TICK_MS = 20000;

interface BuildViewProps {
  sessionId: string;
  status: BuilderSessionStatus;
  currentStage: BuilderStage | null;
}

export const BuildView: React.FC<BuildViewProps> = ({ sessionId, status, currentStage }) => {
  const strings = en.builder.build;

  // One transcript per run, keyed by run id, so switching back to an older
  // run — after a resume or a retry created a new one — shows what actually
  // happened in it rather than an empty feed. The live run keeps accumulating
  // in the background in its own slot regardless of which one is on screen.
  const [eventsByRun, setEventsByRun] = useState<Record<string, BuilderBuildEvent[]>>({});
  const lastSeqByRunRef = useRef<Record<string, number>>({});
  const backfilledRunsRef = useRef<Set<string>>(new Set());

  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  // True until the reader picks an older run on purpose — selection then
  // stays put through a resume rather than being yanked back to the new run
  // mid-read. Picking the newest run again (including via a fresh mount)
  // re-arms it.
  const [followLive, setFollowLive] = useState(true);
  const newestRunIdRef = useRef<string | null>(null);
  const prevNewestIdRef = useRef<string | null>(null);

  const isLive = LIVE_STATUSES.includes(status);
  const isWaiting = status === "WAITING_FOR_INPUT";

  const { data: runs } = useGetBuilderRunsQuery(sessionId, {
    pollingInterval: isLive || isWaiting ? POLL_WITHOUT_SOCKET_MS : 0,
    skipPollingIfUnfocused: true,
  });
  const { data: pendingQuestions } = useGetBuilderPendingQuestionsQuery(sessionId, {
    pollingInterval: isWaiting ? POLL_WITHOUT_SOCKET_MS : 0,
    skipPollingIfUnfocused: true,
  });
  const { data: pullRequests } = useGetBuilderPullRequestsQuery(sessionId, {
    pollingInterval: isLive ? POLL_WITH_SOCKET_MS : 0,
    skipPollingIfUnfocused: true,
  });
  const [fetchEvents] = useLazyGetBuilderRunEventsQuery();
  const [answerQuestion] = useAnswerBuilderQuestionMutation();

  /**
   * Live spend against the ceiling. Polled rather than read off the session:
   * the session detail is fetched once per mount and this number moves every
   * phase — which is the whole reason a build can hit the ceiling while
   * somebody is looking at a page that says it had headroom.
   */
  const { data: budget, refetch: refetchBudget } = useGetBuilderSessionBudgetQuery(sessionId, {
    pollingInterval: isLive || isWaiting ? POLL_WITH_SOCKET_MS : 0,
    skipPollingIfUnfocused: true,
  });
  const [showRaiseBudget, setShowRaiseBudget] = useState(false);
  const [countdownNow, setCountdownNow] = useState(() => Date.now());

  // The hold expires on its own, so the banner has to keep counting even
  // though nothing new arrives from the server while it waits.
  const holdUntil = budget?.hold?.holdUntil ?? null;
  useEffect(() => {
    if (!holdUntil) return undefined;
    const interval = window.setInterval(
      () => setCountdownNow(Date.now()),
      BUDGET_COUNTDOWN_TICK_MS,
    );
    return () => window.clearInterval(interval);
  }, [holdUntil]);

  const holdMinutesLeft = useMemo(() => {
    if (!holdUntil) return null;
    const until = new Date(holdUntil).getTime();
    if (!Number.isFinite(until)) return null;
    return Math.max(0, Math.ceil((until - countdownNow) / 60000));
  }, [holdUntil, countdownNow]);

  const newestRun = useMemo(() => runs?.[runs.length - 1] ?? null, [runs]);
  const selectedRun = useMemo(
    () => runs?.find(run => run.id === selectedRunId) ?? null,
    [runs, selectedRunId],
  );
  const isViewingLive = selectedRunId !== null && selectedRunId === newestRun?.id;

  // Merge a batch of events into whichever run each one belongs to — the
  // socket and the polling fallback both deliver events already carrying
  // their own `runId`, so this is what actually keeps two runs' transcripts
  // apart rather than the caller having to know which run is "current".
  const appendEvents = useCallback((incoming: BuilderBuildEvent[]) => {
    if (!incoming.length) return;
    setEventsByRun(previous => {
      const grouped = new Map<string, BuilderBuildEvent[]>();
      for (const event of incoming) {
        const bucket = grouped.get(event.runId);
        if (bucket) bucket.push(event);
        else grouped.set(event.runId, [event]);
      }

      let changed = false;
      const next = { ...previous };
      for (const [runId, events] of grouped) {
        const existing = next[runId] ?? [];
        const seen = new Set(existing.map(event => event.seq));
        const fresh = events.filter(event => !seen.has(event.seq));
        if (!fresh.length) continue;
        changed = true;
        const merged = [...existing, ...fresh].sort((a, b) => a.seq - b.seq);
        next[runId] = merged;
        lastSeqByRunRef.current[runId] = Math.max(
          lastSeqByRunRef.current[runId] ?? 0,
          merged[merged.length - 1].seq,
        );
      }
      return changed ? next : previous;
    });
  }, []);

  const markSeenRef = useRef<((events: BuilderBuildEvent[]) => void) | null>(null);

  /**
   * Cursor-fetches one run's new events. Only ever marks them "seen" on the
   * socket's dedup set when the run being fetched is the live one — the
   * socket's own dedup is keyed by seq alone (see `useBuilderSocket`), and
   * seq numbers restart per run, so feeding it a historical run's seqs would
   * make it wrongly suppress the live run's next events at the same numbers.
   */
  const fetchRunEvents = useCallback(
    async (runId: string) => {
      try {
        const afterSeq = lastSeqByRunRef.current[runId] ?? 0;
        const result = await fetchEvents({ runId, afterSeq }).unwrap();
        appendEvents(result.events);
        if (runId === newestRunIdRef.current) markSeenRef.current?.(result.events);
      } catch {
        // The next tick (for the live run) or the next selection (for a
        // historical one) tries again; a transient fetch failure isn't worth
        // telling anyone about.
      }
    },
    [fetchEvents, appendEvents],
  );

  const { connected, markSeen } = useBuilderSocket({
    sessionId: isLive || isWaiting ? sessionId : null,
    onEvents: appendEvents,
    // Anything emitted while the socket was down was never queued, so the gap
    // is closed by a cursor fetch on the live run rather than hoped away.
    onMissedWindow: () => {
      if (newestRunIdRef.current) void fetchRunEvents(newestRunIdRef.current);
    },
  });

  useEffect(() => {
    markSeenRef.current = markSeen;
  }, [markSeen]);

  // Track the newest run and, while following live, keep the selection moving
  // with it — a resume creates a new run and the feed should move to it
  // rather than stay pinned to the one that just paused. Once the reader has
  // picked an older run on purpose (`followLive` false), this leaves the
  // selection alone.
  useEffect(() => {
    if (!newestRun) return;
    newestRunIdRef.current = newestRun.id;
    const isNewRun = prevNewestIdRef.current !== null && prevNewestIdRef.current !== newestRun.id;
    prevNewestIdRef.current = newestRun.id;

    setSelectedRunId(previous => {
      if (previous === null) return newestRun.id;
      if (isNewRun && followLive) return newestRun.id;
      return previous;
    });
  }, [newestRun, followLive]);

  const handleSelectRun = useCallback((runId: string) => {
    setSelectedRunId(runId);
    setFollowLive(runId === newestRunIdRef.current);
  }, []);

  // Backfill each run's transcript exactly once, the first time it's
  // selected — after that the live loop below (for the newest run) or the
  // cache itself (for a historical one, which never grows again) is enough.
  useEffect(() => {
    if (!selectedRunId || backfilledRunsRef.current.has(selectedRunId)) return;
    backfilledRunsRef.current.add(selectedRunId);
    void fetchRunEvents(selectedRunId);
  }, [selectedRunId, fetchRunEvents]);

  // Keep pulling the NEWEST run's events regardless of what's on screen —
  // this is what lets the transcript being read stay put while the live one
  // still moves underneath it.
  useEffect(() => {
    const runId = newestRun?.id;
    if (!runId) return undefined;
    void fetchRunEvents(runId);

    if (!isLive && !isWaiting) return undefined;
    const interval = window.setInterval(
      () => void fetchRunEvents(runId),
      connected ? POLL_WITH_SOCKET_MS : POLL_WITHOUT_SOCKET_MS,
    );
    return () => window.clearInterval(interval);
  }, [newestRun?.id, connected, isLive, isWaiting, fetchRunEvents]);

  const displayedEvents = selectedRunId ? (eventsByRun[selectedRunId] ?? []) : [];

  /** The newest todo snapshot from the LIVE run — the agent replaces the list
   *  wholesale, and the checklist is current-progress, not a transcript, so it
   *  does not follow the reader to an older run the way the feed does. */
  const todoItems: BuilderTodoItem[] = useMemo(() => {
    const liveEvents = newestRun ? (eventsByRun[newestRun.id] ?? []) : [];
    for (let index = liveEvents.length - 1; index >= 0; index--) {
      const event = liveEvents[index];
      if (event.type === "todo" && Array.isArray(event.payload?.items)) {
        return event.payload.items as BuilderTodoItem[];
      }
    }
    return [];
  }, [eventsByRun, newestRun]);

  const handleAnswer = async (payload: BuilderAnswerPayload) => {
    try {
      const result = await answerQuestion({
        id: sessionId,
        questionId: payload.questionId,
        message: payload.message,
        answer: payload.answer as Record<string, unknown> | undefined,
      }).unwrap();
      if (result.resumed) {
        toast.success(strings.resumed);
      }
    } catch {
      toast.error(strings.answerFailed);
    }
  };

  const budgetStrings = en.builder.budget;
  const money = (value: number | null | undefined) =>
    value === null || value === undefined ? "—" : `$${value.toFixed(2)}`;

  /**
   * Two states, one control. A held run is the urgent one — its work is intact
   * but only until the window closes — and the "past the ceiling but still
   * coding" state is the warning that precedes it by one phase. Both are shown
   * above the phase rail because they are the only thing on this page a person
   * can act on to change the outcome.
   */
  const budgetHeld = Boolean(budget?.hold) && (isLive || isWaiting);
  const budgetOver = Boolean(budget?.exceeded) && (isLive || isWaiting);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {(budgetHeld || budgetOver) && budget && (
        <InlineNotification
          kind={budgetHeld ? "error" : "warning"}
          lowContrast
          hideCloseButton
          title={budgetHeld ? budgetStrings.heldTitle : budgetStrings.overTitle}
          subtitle={
            budgetHeld
              ? holdMinutesLeft !== null && holdMinutesLeft <= 0
                ? budgetStrings.heldBodyExpiring
                : budgetStrings.heldBody(
                    money(budget.spentUsd),
                    money(budget.budgetUsd),
                    budgetStrings.minutesLeft(holdMinutesLeft ?? 0),
                  )
              : budgetStrings.overBody(money(budget.spentUsd), money(budget.budgetUsd))
          }
          className="m-3"
        >
          <Button
            kind="primary"
            size="sm"
            className="mt-2"
            onClick={() => setShowRaiseBudget(true)}
          >
            {budgetStrings.raise}
          </Button>
        </InlineNotification>
      )}

      <PhaseRail currentStage={currentStage} active={isLive} />

      <RunHistoryRail runs={runs ?? []} selectedRunId={selectedRunId} onSelect={handleSelectRun} />

      {isWaiting && pendingQuestions?.length ? (
        <section className="border-y border-primary-200 bg-primary-50/40 px-4 py-3">
          <h2 className="text-sm font-semibold text-typography-900">{strings.waitingHeading}</h2>
          <p className="mt-0.5 text-xs text-typography-600">{strings.waitingBody}</p>
          <div className="mt-3 flex flex-col gap-3">
            {pendingQuestions.map(pending => (
              <QuestionCard
                key={pending.id}
                question={{ ...pending.question, id: pending.id }}
                onAnswer={handleAnswer}
                emphasised
              />
            ))}
          </div>
        </section>
      ) : null}

      <TodoPanel items={todoItems} />

      <BuildActivityFeed events={displayedEvents} isLive={isLive && isViewingLive} />

      {pullRequests && pullRequests.length > 0 && (
        <section className="border-t border-neutral-200 px-4 py-3">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-typography-500">
            {strings.pullRequestsHeading}
          </h2>
          <div className="flex flex-col gap-2">
            {pullRequests.map(pullRequest => (
              <Tile key={pullRequest.id} className="flex items-center gap-2 text-sm">
                <Tag type={pullRequest.merged ? "green" : "blue"} size="sm">
                  {pullRequest.merged ? strings.prMerged : strings.prOpen}
                </Tag>
                <a
                  href={pullRequest.prUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1 truncate text-primary-600 hover:underline"
                >
                  {pullRequest.repo} #{pullRequest.prNumber}
                  {pullRequest.title ? ` — ${pullRequest.title}` : ""}
                </a>
              </Tile>
            ))}
          </div>
        </section>
      )}

      {selectedRun?.error && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title={selectedRun.error}
          className="m-3"
        />
      )}

      {selectedRun?.githubRunUrl && (
        <div className="border-t border-neutral-200 px-4 py-2">
          <Button
            kind="ghost"
            size="sm"
            onClick={() => window.open(selectedRun.githubRunUrl!, "_blank")}
          >
            {strings.watchOnGithub}
          </Button>
        </div>
      )}

      {budget && (
        <RaiseBudgetDialog
          isOpen={showRaiseBudget}
          onClose={() => setShowRaiseBudget(false)}
          sessionId={sessionId}
          budget={budget}
          // The banner is driven by this query, so it has to re-read rather
          // than wait for the next 20s tick to stop saying "paused".
          onRaised={() => void refetchBudget()}
        />
      )}
    </div>
  );
};
