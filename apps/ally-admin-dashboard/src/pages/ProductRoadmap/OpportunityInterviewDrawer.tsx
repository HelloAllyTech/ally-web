import React, { useEffect, useMemo, useRef, useState } from "react";

import { Close, Minus, Tick } from "@icons";
import { toast } from "sonner";

import { SkeletonText, TextArea } from "@ally-ui-mono/ui-shared";
import {
  useCreateRoadmapOpportunityMutation,
  useGetRoadmapReadinessCriteriaQuery,
  useRoadmapAiDuplicatesMutation,
} from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { useRoadmapCopilotStream } from "@hooks/useRoadmapCopilotStream";
import {
  RoadmapCopilotActivity,
  RoadmapDuplicateMatch,
  RoadmapInterviewDraft,
  RoadmapInterviewGate,
  RoadmapInterviewMessage,
  RoadmapOpportunityBrief,
  RoadmapOpportunityType,
} from "@types";

import { CopilotBrief } from "./CopilotBrief";
import { EFFORT_LABEL } from "./utils/stages";

interface OpportunityInterviewDrawerProps {
  onClose: () => void;
  /** Hands the filed opportunity to the page, which opens the normal drawer on it. */
  onCreated: (id: string) => void;
  /** "Upvote this instead" — closes this and opens the existing opportunity's drawer. */
  onOpenExisting: (id: string) => void;
}

/** A transcript row plus what the copilot looked up before writing it. Display-only. */
type FeedMessage = RoadmapInterviewMessage & { activity?: RoadmapCopilotActivity[] };

/** The transcript as the server takes it — the activity is ours, not the model's. */
const toWire = (feed: FeedMessage[]): RoadmapInterviewMessage[] =>
  feed.map(({ role, content }) => ({ role, content }));

const ActivityList: React.FC<{ items: RoadmapCopilotActivity[] }> = ({ items }) => (
  <ul className="flex flex-col gap-1">
    {items.map(item => (
      <li key={item.id} className="flex items-start gap-2 text-xs">
        <span
          className={
            item.ok === null
              ? "text-typography-secondary animate-pulse"
              : item.ok
                ? "text-green-700"
                : "text-typography-secondary"
          }
        >
          {item.ok ? <Tick size={14} /> : <Minus size={14} />}
        </span>
        <span className="min-w-0">
          <span className="text-typography-700">{item.label}</span>
          {item.summary && (
            <span className="text-typography-secondary block break-words">{item.summary}</span>
          )}
        </span>
      </li>
    ))}
  </ul>
);

/**
 * "New opportunity" — the ONLY way to file one from the board: a conversation with the
 * opportunity copilot, which researches as it goes and hands over a draft plus the case for it.
 *
 * WHY AN INTERVIEW RATHER THAN A FORM. The blank form this replaced was a text box plus a
 * checklist you ran yourself — it told you what was wrong after you had written something. Most
 * half-formed ideas fail the same few ways (no named user, a theme rather than a moment, a build
 * with no stated benefit, a solution standing in for an outcome), and this surface does the
 * reframing in conversation, one question per turn.
 *
 * WHY A COPILOT RATHER THAN AN INTERVIEWER. The interview could make an idea clear but not tell
 * whether it was worth doing. The copilot reads the Vision & strategy page, searches the board,
 * the user-interview notes, analytics, UX signals, open bugs and the code, and pushes back with
 * what it found — this idea is already OPP-0714, this collides with a non-goal, twelve people a
 * month hit that screen. Each lookup shows in the feed as it runs: a turn can take a minute, and
 * a minute of "Thinking…" with no sign of what it is doing is how people give up on a surface.
 *
 * IT ADVISES; IT DOES NOT BLOCK. The checklist is still `GET ai/readiness/criteria` — the same
 * five items `POST /opportunities` enforces — and the moment those are met there is a draft and
 * a File button, whatever the copilot thinks of the case. Its assessment and the
 * recommendations it has left are filed with the opportunity (signed into the readiness token,
 * so the filer cannot edit them), which is where a voter weighs them. The composer stays open
 * after the draft lands, because the copilot keeps suggesting how to make it stronger.
 *
 * THE DRAFT IS READ-ONLY HERE, because the readiness token is signed over that exact text and
 * brief. Editing happens in the opportunity drawer that opens next, which autosaves.
 *
 * STATE IS EPHEMERAL: no session table, no resume. The transcript and the working brief ride on
 * every turn, which is why closing mid-interview asks first.
 */
export const OpportunityInterviewDrawer: React.FC<OpportunityInterviewDrawerProps> = ({
  onClose,
  onCreated,
  onOpenExisting,
}) => {
  const [messages, setMessages] = useState<FeedMessage[]>([]);
  const [gates, setGates] = useState<RoadmapInterviewGate[]>([]);
  const [draft, setDraft] = useState<RoadmapInterviewDraft | null>(null);
  const [brief, setBrief] = useState<RoadmapOpportunityBrief | null>(null);
  const [readinessToken, setReadinessToken] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [turnFailed, setTurnFailed] = useState<string | null>(null);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [duplicates, setDuplicates] = useState<RoadmapDuplicateMatch[]>([]);

  const { data: checklist } = useGetRoadmapReadinessCriteriaQuery();
  const { runTurn, activity, isThinking } = useRoadmapCopilotStream();
  const [createOpportunity, { isLoading: isFiling }] = useCreateRoadmapOpportunityMutation();
  const [checkDuplicates, { isLoading: isCheckingDuplicates }] = useRoadmapAiDuplicatesMutation();

  const feedRef = useRef<HTMLDivElement>(null);
  /**
   * The opening turn must fire exactly once. A ref rather than a `messages.length === 0` guard:
   * that condition is still true while the first request is in flight, so in React's development
   * double-invoke it opens two interviews and the admin reads two different first questions.
   */
  const openedRef = useRef(false);
  /**
   * Request-id guard: a later turn can replace the draft while the previous draft's duplicate
   * check is still in flight, and the older, slower answer must not land on the newer draft.
   */
  const duplicateRequestId = useRef(0);

  /** One turn: send the transcript as it will be on the server, then fold the answer in. */
  const takeTurn = async (next: FeedMessage[]) => {
    setTurnFailed(null);
    setMessages(next);
    try {
      const { turn, activity: trail } = await runTurn({ messages: toWire(next), brief });
      setMessages([...next, { role: "agent", content: turn.reply, activity: trail }]);
      setGates(turn.gates);
      setDraft(turn.draft);
      // An older backend answers without a brief; keep what we had rather than wiping it.
      if (turn.brief !== undefined) setBrief(turn.brief);
      setReadinessToken(turn.readinessToken);
    } catch (error) {
      // The admin's own words stay on screen — they are the expensive half of this exchange, and
      // re-typing an answer because the model timed out is the fastest way to lose someone. The
      // retry re-sends exactly `next`.
      setTurnFailed((error as Error)?.message || "That answer did not go through.");
    }
  };

  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    void takeTurn([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Keep the newest turn in view; a question that arrives below the fold reads as no answer.
   * `scrollTo?.` because this runs in a passive effect, and jsdom has no scrollTo.
   */
  useEffect(() => {
    feedRef.current?.scrollTo?.({ top: feedRef.current.scrollHeight });
  }, [messages, isThinking, activity, turnFailed]);

  /** Check the draft — and only the draft — against what is already on the board. */
  useEffect(() => {
    const id = ++duplicateRequestId.current;
    setDuplicates(current => (current.length ? [] : current));
    if (!draft) return;
    checkDuplicates({
      description: draft.description,
      productGoal: draft.productGoal ?? undefined,
    })
      .unwrap()
      .then(result => {
        if (id === duplicateRequestId.current) setDuplicates(result.matches ?? []);
      })
      .catch(() => {
        // Best-effort by contract: a failed duplicate check must not interrupt filing.
      });
  }, [draft, checkDuplicates]);

  const send = () => {
    const trimmed = input.trim();
    if (!trimmed || isThinking) return;
    setInput("");
    void takeTurn([...messages, { role: "admin", content: trimmed }]);
  };

  const retry = () => void takeTurn(messages);

  const file = async () => {
    if (!draft) return;
    try {
      const created = await createOpportunity({
        description: draft.description,
        type: RoadmapOpportunityType.IDEA,
        productGoal: draft.productGoal ?? undefined,
        effort: draft.effort ?? null,
        // Minted over this exact text AND this exact brief — which is why neither is editable
        // here. Editing the description happens in the drawer that opens next.
        readinessToken: readinessToken ?? undefined,
        ...(brief ? { brief } : {}),
        // The conversation itself, so the Builder session opened from this opportunity starts
        // from what was decided here rather than asking it all again.
        interviewTranscript: toWire(messages),
      }).unwrap();
      onCreated(created.id);
    } catch (error) {
      const message = (error as { data?: { message?: string | string[] } })?.data?.message;
      toast.error(
        (Array.isArray(message) ? message[0] : message) || "Could not file that opportunity.",
      );
    }
  };

  const answered = messages.some(message => message.role === "admin");
  const closeSafely = () => {
    if (answered) {
      setConfirmingClose(true);
      return;
    }
    onClose();
  };

  const byId = useMemo(() => new Map(gates.map(gate => [gate.id, gate])), [gates]);
  const metCount = gates.filter(gate => gate.met).length;
  const isStrong = brief?.assessment?.rating === "strong";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={closeSafely}>
      <aside
        className="bg-white relative flex h-full w-[64rem] max-w-full flex-col"
        onClick={event => event.stopPropagation()}
      >
        <header className="border-border-light flex items-start justify-between gap-3 border-b p-4">
          <div className="min-w-0">
            <h2 className="text-typography-primary text-lg">New opportunity</h2>
            <p className="text-typography-700 text-xs">
              Start with a rough thought. The copilot checks it against the strategy, the board and
              the data, then helps you sharpen it. Nothing is filed until you say so.
            </p>
          </div>
          <button
            type="button"
            onClick={closeSafely}
            aria-label="Close"
            className="text-typography-secondary hover:text-typography-900 -m-2 inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center md:m-0 md:block md:h-auto md:w-auto"
          >
            <Close />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/*
            THE SIDE PANEL: what this needs, and the case so far. Beside the conversation on a
            wide screen so the checklist and the brief stay in view while the admin answers; above
            it, height-capped, on a phone so the keyboard cannot crowd the conversation out.
          */}
          <section
            aria-label="Draft and brief"
            className="border-border-light bg-background-secondary order-1 flex max-h-[35dvh] flex-col gap-4 overflow-y-auto border-b p-4 md:order-2 md:max-h-none md:w-[26rem] md:shrink-0 md:border-b-0 md:border-l"
          >
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="text-typography-primary text-sm">What this needs to be filed</h3>
                <span className="text-typography-700 text-xs tabular-nums">
                  {metCount} of {checklist?.criteria.length ?? 5}
                </span>
              </div>
              {!checklist ? (
                <SkeletonText paragraph lineCount={3} />
              ) : (
                <ul className="flex flex-col gap-1">
                  {checklist.criteria.map(criterion => {
                    const gate = byId.get(criterion.id);
                    const met = !!gate?.met;
                    return (
                      <li key={criterion.id} className="flex items-start gap-2">
                        <span className={met ? "text-green-700" : "text-typography-secondary"}>
                          {met ? <Tick size={16} /> : <Minus size={16} />}
                        </span>
                        <span className="min-w-0">
                          <span
                            className={`text-xs ${met ? "text-typography-900" : "text-typography-700"}`}
                          >
                            {criterion.label}
                          </span>
                          {!!gate?.note && (
                            <span className="text-typography-secondary block text-xs">
                              {gate.note}
                            </span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* The draft first once it exists — it is the thing being filed. */}
            {!!draft && (
              <div className="border-primary-500 bg-white flex flex-col gap-2 border p-3">
                <h3 className="text-typography-primary text-sm">The draft</h3>
                <p className="text-typography-900 text-sm whitespace-pre-wrap break-words">
                  {draft.description}
                </p>
                <dl className="text-typography-700 flex flex-wrap gap-x-6 gap-y-1 text-xs">
                  <div className="flex gap-1">
                    <dt>Goal:</dt>
                    <dd className="text-typography-900">{draft.productGoal ?? "none proposed"}</dd>
                  </div>
                  <div className="flex gap-1">
                    <dt>Effort:</dt>
                    <dd className="text-typography-900">
                      {draft.effort ? (EFFORT_LABEL[draft.effort] ?? draft.effort) : "not sized"}
                    </dd>
                  </div>
                </dl>
                <p className="text-typography-secondary text-xs">
                  Filing opens it for review, where every edit saves itself.
                </p>
              </div>
            )}

            {!!draft && isCheckingDuplicates && (
              <p className="text-typography-secondary text-xs">checking for duplicates…</p>
            )}

            {/* Directly under the draft: the last thing seen before filing a second copy of an
                idea should be the first copy. */}
            {!!draft && duplicates.length > 0 && (
              <div className="border-border-light bg-white flex flex-col gap-2 border p-3">
                <h3 className="text-typography-primary text-sm">This may already exist</h3>
                <ul className="flex flex-col gap-2">
                  {duplicates.map(match => (
                    <li key={match.id} className="text-sm">
                      <div className="text-typography-900">{match.description}</div>
                      <div className="text-typography-secondary text-xs">{match.reason}</div>
                      <Button variant={ButtonVariant.TEXT} onClick={() => onOpenExisting(match.id)}>
                        Upvote this instead →
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h3 className="text-typography-primary mb-2 text-sm">The case so far</h3>
              {brief ? (
                <CopilotBrief brief={brief} variant="live" />
              ) : (
                <p className="text-typography-secondary text-xs">
                  As you talk, the copilot records why this matters: the strategy it serves, who it
                  reaches, the evidence behind it and what would have to be true.
                </p>
              )}
            </div>
          </section>

          <div className="order-2 flex min-h-0 flex-1 flex-col md:order-1">
            <div ref={feedRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
              {messages.map((message, index) => (
                <div
                  // Index is a safe key here: the transcript is append-only and never reordered.
                  key={index}
                  className={
                    message.role === "admin"
                      ? "flex justify-end"
                      : "flex flex-col items-start gap-1"
                  }
                >
                  {/* What it looked at, kept with the answer it informed — collapsed, because the
                      answer is what people read and the trail is for when they doubt it. */}
                  {message.role === "agent" && !!message.activity?.length && (
                    <details className="text-xs">
                      <summary className="text-typography-secondary cursor-pointer">
                        Looked at {message.activity.length}{" "}
                        {message.activity.length === 1 ? "thing" : "things"}
                      </summary>
                      <div className="mt-1 pl-1">
                        <ActivityList items={message.activity} />
                      </div>
                    </details>
                  )}
                  <p
                    className={
                      message.role === "admin"
                        ? "bg-primary-50 text-typography-900 max-w-[85%] rounded-2xl rounded-br-sm px-3 py-2 text-sm whitespace-pre-wrap break-words"
                        : "text-typography-900 max-w-[95%] text-sm whitespace-pre-wrap break-words"
                    }
                  >
                    {message.content}
                  </p>
                </div>
              ))}

              {isThinking && (
                <div className="flex flex-col gap-1" aria-live="polite">
                  <p className="text-typography-secondary text-xs">
                    {activity.length ? "Looking into it…" : "Thinking…"}
                  </p>
                  {activity.length > 0 && <ActivityList items={activity} />}
                </div>
              )}

              {turnFailed && (
                <div className="border-border-light flex items-center justify-between gap-2 border p-2">
                  <p className="text-typography-700 text-xs">
                    {turnFailed} Your words are still here.
                  </p>
                  <Button variant={ButtonVariant.TEXT} onClick={retry}>
                    Try again
                  </Button>
                </div>
              )}
            </div>

            <footer className="border-border-light flex flex-col gap-2 border-t p-4">
              {!!draft && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-typography-700 min-w-0 flex-1 text-xs">
                    {isStrong
                      ? "The copilot rates this strong. File it, or keep refining."
                      : "Ready to file. Or keep going — the copilot's suggestions are in the brief."}
                  </p>
                  <Button onClick={file} disabled={isFiling || isThinking}>
                    {isFiling ? "Filing…" : "File and review"}
                  </Button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <TextArea
                    id="roadmap-interview-composer"
                    labelText="Your answer"
                    hideLabel
                    rows={2}
                    placeholder={draft ? "Answer, push back, or add detail…" : "Type your answer…"}
                    value={input}
                    onChange={event => setInput(event.target.value)}
                    onKeyDown={event => {
                      // Enter sends, Shift+Enter newlines — the same contract as the character
                      // interview composer.
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        send();
                      }
                    }}
                  />
                </div>
                <Button
                  variant={draft ? ButtonVariant.SECONDARY : ButtonVariant.PRIMARY}
                  onClick={send}
                  disabled={!input.trim() || isThinking}
                >
                  Send
                </Button>
              </div>
            </footer>
          </div>
        </div>

        {confirmingClose && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 p-6">
            <div className="bg-white flex max-w-sm flex-col gap-3 p-4">
              <h3 className="text-typography-primary text-sm">Leave this conversation?</h3>
              <p className="text-typography-700 text-xs">
                Nothing has been filed yet, and the conversation is not saved anywhere — closing
                loses your answers and the copilot's brief.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant={ButtonVariant.SECONDARY} onClick={() => setConfirmingClose(false)}>
                  Keep going
                </Button>
                <Button onClick={onClose}>Discard</Button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};
