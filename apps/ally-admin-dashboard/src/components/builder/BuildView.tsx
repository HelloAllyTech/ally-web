import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { toast } from "sonner";

import { Button, InlineNotification, Tag, Tile } from "@ally-ui-mono/ui-shared";
import {
  useAnswerBuilderQuestionMutation,
  useGetBuilderPendingQuestionsQuery,
  useGetBuilderPullRequestsQuery,
  useGetBuilderRunsQuery,
  useLazyGetBuilderRunEventsQuery,
} from "@api";
import { en } from "@constants";
import { useBuilderSocket } from "@hooks";
import { BuilderBuildEvent, BuilderSessionStatus, BuilderStage, BuilderTodoItem } from "@types";

import { BuildActivityFeed } from "./BuildActivityFeed";
import { PhaseRail } from "./PhaseRail";
import { BuilderAnswerPayload, QuestionCard } from "./QuestionCard";
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

interface BuildViewProps {
  sessionId: string;
  status: BuilderSessionStatus;
  currentStage: BuilderStage | null;
}

export const BuildView: React.FC<BuildViewProps> = ({ sessionId, status, currentStage }) => {
  const strings = en.builder.build;

  const [events, setEvents] = useState<BuilderBuildEvent[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const lastSeqRef = useRef(0);

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

  // Follow the newest run. A resume creates a new one, and the feed should
  // move with it rather than stay pinned to the run that paused.
  const newestRun = useMemo(() => runs?.[runs.length - 1] ?? null, [runs]);

  useEffect(() => {
    if (!newestRun || newestRun.id === activeRunId) return;
    setActiveRunId(newestRun.id);
    setEvents([]);
    lastSeqRef.current = 0;
  }, [newestRun, activeRunId]);

  const appendEvents = useCallback((incoming: BuilderBuildEvent[]) => {
    if (!incoming.length) return;
    setEvents(previous => {
      const seen = new Set(previous.map(event => event.seq));
      const fresh = incoming.filter(event => !seen.has(event.seq));
      if (!fresh.length) return previous;
      const next = [...previous, ...fresh].sort((a, b) => a.seq - b.seq);
      lastSeqRef.current = Math.max(lastSeqRef.current, next[next.length - 1].seq);
      return next;
    });
  }, []);

  const pullNewEvents = useCallback(async () => {
    if (!activeRunId) return;
    try {
      const result = await fetchEvents({
        runId: activeRunId,
        afterSeq: lastSeqRef.current,
      }).unwrap();
      appendEvents(result.events);
      markSeenRef.current?.(result.events);
    } catch {
      // The next tick tries again; a transient fetch failure is not worth
      // telling anyone about while a build is running.
    }
  }, [activeRunId, appendEvents, fetchEvents]);

  const { connected, markSeen } = useBuilderSocket({
    sessionId: isLive || isWaiting ? sessionId : null,
    onEvents: appendEvents,
    // Anything emitted while the socket was down was never queued, so the gap
    // is closed by a cursor fetch rather than hoped away.
    onMissedWindow: () => void pullNewEvents(),
  });

  const markSeenRef = useRef(markSeen);
  useEffect(() => {
    markSeenRef.current = markSeen;
  }, [markSeen]);

  // Backfill on mount and on run change, then poll as a fallback.
  useEffect(() => {
    if (!activeRunId) return undefined;
    void pullNewEvents();

    if (!isLive && !isWaiting) return undefined;
    const interval = window.setInterval(
      () => void pullNewEvents(),
      connected ? POLL_WITH_SOCKET_MS : POLL_WITHOUT_SOCKET_MS,
    );
    return () => window.clearInterval(interval);
  }, [activeRunId, connected, isLive, isWaiting, pullNewEvents]);

  /** The newest todo snapshot — the agent replaces the list wholesale. */
  const todoItems: BuilderTodoItem[] = useMemo(() => {
    for (let index = events.length - 1; index >= 0; index--) {
      const event = events[index];
      if (event.type === "todo" && Array.isArray(event.payload?.items)) {
        return event.payload.items as BuilderTodoItem[];
      }
    }
    return [];
  }, [events]);

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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PhaseRail currentStage={currentStage} active={isLive} />

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

      <BuildActivityFeed events={events} isLive={isLive} />

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

      {newestRun?.error && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title={newestRun.error}
          className="m-3"
        />
      )}

      {newestRun?.githubRunUrl && (
        <div className="border-t border-neutral-200 px-4 py-2">
          <Button
            kind="ghost"
            size="sm"
            onClick={() => window.open(newestRun.githubRunUrl!, "_blank")}
          >
            {strings.watchOnGithub}
          </Button>
        </div>
      )}
    </div>
  );
};
