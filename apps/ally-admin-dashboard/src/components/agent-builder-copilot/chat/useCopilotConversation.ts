import { useMemo, useState } from "react";

import { toast } from "sonner";

import {
  COPILOT_TERMINAL_STATUSES,
  useCancelCopilotRunMutation,
  useGetCopilotRunQuery,
  useReviseCopilotRunMutation,
  useStartCopilotRunMutation,
} from "@api";
import { en } from "@constants";

import { deriveFeed } from "./copilotFeedReducer";
import type { FeedEntry } from "./feedEntry.types";

const POLL_INTERVAL_MS = 2500;

export type ConversationPhase = "idle" | "running" | "terminal";

export interface SubmitOptions {
  skillPromptCode?: string;
  model?: string;
}

const copy = en.simulation.agentBuilder;

/**
 * Owns the multi-turn Copilot conversation: the active run id, the full text of
 * each typed turn, the 2.5s poll, and the derived chat feed. Exposes submit
 * (start a build), revise (re-run on the same draft), and cancel.
 */
export const useCopilotConversation = () => {
  const [startCopilotRun, { isLoading: isStarting }] = useStartCopilotRunMutation();
  const [reviseCopilotRun, { isLoading: isRevising }] = useReviseCopilotRunMutation();
  const [cancelCopilotRun, { isLoading: isCancelling }] = useCancelCopilotRunMutation();

  const [runId, setRunId] = useState<string | null>(null);
  // Full instruction text per revise turn (index 0 = segment 1). Lets the feed
  // show the complete typed text rather than the truncated server label.
  const [reviseTexts, setReviseTexts] = useState<string[]>([]);
  // Optimistic bubble shown immediately on submit, before the run is polled.
  const [pending, setPending] = useState<{ text: string; turnKind: "brief" | "revise" } | null>(null);

  const { data: run } = useGetCopilotRunQuery(runId ?? "", {
    skip: !runId,
    pollingInterval: POLL_INTERVAL_MS,
  });

  const isTerminal = !!run && COPILOT_TERMINAL_STATUSES.includes(run.status);
  // "running" covers the gap between firing the mutation and the first poll.
  const isRunning = isStarting || isRevising || (!!runId && (!run || !isTerminal));
  const phase: ConversationPhase = !runId && !isRunning ? "idle" : isRunning ? "running" : "terminal";

  const feed = useMemo<FeedEntry[]>(() => deriveFeed(run, reviseTexts), [run, reviseTexts]);

  // Show the optimistic bubble until the run that backs it has loaded.
  const pendingMessage = pending && (!run || run.id !== runId) ? pending : null;

  const submit = async (text: string, opts: SubmitOptions = {}): Promise<boolean> => {
    const trimmed = text.trim();
    if (!trimmed || isRunning) return false;
    setPending({ text: trimmed, turnKind: "brief" });
    try {
      const { runId: newRunId } = await startCopilotRun({
        brief: trimmed,
        skillPromptCode: opts.skillPromptCode,
        model: opts.model,
      }).unwrap();
      setReviseTexts([]);
      setRunId(newRunId);
      return true;
    } catch {
      setPending(null);
      toast.error(copy.failedToStart);
      return false;
    }
  };

  const revise = async (text: string): Promise<boolean> => {
    const trimmed = text.trim();
    if (!trimmed || !runId || isRunning) return false;
    setPending({ text: trimmed, turnKind: "revise" });
    try {
      const { runId: newRunId } = await reviseCopilotRun({ runId, instruction: trimmed }).unwrap();
      setReviseTexts(prev => [...prev, trimmed]);
      setRunId(newRunId);
      return true;
    } catch {
      setPending(null);
      toast.error(copy.failedToRevise);
      return false;
    }
  };

  const cancel = async (): Promise<void> => {
    if (!runId) return;
    try {
      await cancelCopilotRun(runId).unwrap();
    } catch {
      // Best-effort: the poll will reflect the eventual state.
    }
  };

  return {
    run,
    feed,
    phase,
    isRunning,
    isCancelling,
    pendingMessage,
    submit,
    revise,
    cancel,
  };
};
