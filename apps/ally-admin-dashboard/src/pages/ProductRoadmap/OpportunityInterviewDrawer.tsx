import React, { useEffect, useMemo, useRef, useState } from "react";

import { Close, Minus, Tick } from "@icons";
import { toast } from "sonner";

import { SkeletonText, TextArea } from "@ally-ui-mono/ui-shared";
import {
  useCreateRoadmapOpportunityMutation,
  useGetRoadmapReadinessCriteriaQuery,
  useRoadmapOpportunityInterviewTurnMutation,
} from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import {
  RoadmapInterviewDraft,
  RoadmapInterviewGate,
  RoadmapInterviewMessage,
  RoadmapOpportunityType,
} from "@types";

import { EFFORT_LABEL } from "./utils/stages";

interface OpportunityInterviewDrawerProps {
  onClose: () => void;
  /** Hands the filed opportunity to the page, which opens the normal drawer on it. */
  onCreated: (id: string) => void;
}

/**
 * The GUIDED way to file an opportunity: an interview that asks one question at a time, then
 * hands over a draft.
 *
 * WHY THIS EXISTS ALONGSIDE AddOpportunityDrawer. That drawer is a blank box plus a checklist you
 * run yourself — it tells you what is wrong after you have written something. Most half-formed
 * ideas fail the same four ways (no named user, a theme rather than a moment, a build with no
 * stated benefit, a solution standing in for an outcome), and a checklist that reports those
 * after the fact asks the filer to do the reframing alone. This surface does the reframing in
 * conversation, one question per turn.
 *
 * IT GRADES THE FILING GATE'S OWN CRITERIA. The checklist below is `GET ai/readiness/criteria` —
 * the same five items the blank form grades and `POST /opportunities` enforces — so a completed
 * interview cannot produce a draft the gate then refuses. See RoadmapAiService.interviewTurn.
 *
 * STATE IS EPHEMERAL, by design for an experiment: no session table, no resume. The transcript
 * lives here and rides on every turn, which is why closing mid-interview asks first.
 *
 * The chat bubbles are local rather than the shared `components/character-interview` ones: those
 * carry structured question cards and their own string bundle for a widget-driven interview, and
 * three other surfaces render them. This interview is plain prose both ways, so borrowing them
 * would mean widening a component used elsewhere to gain nothing here.
 */
export const OpportunityInterviewDrawer: React.FC<OpportunityInterviewDrawerProps> = ({
  onClose,
  onCreated,
}) => {
  const [messages, setMessages] = useState<RoadmapInterviewMessage[]>([]);
  const [gates, setGates] = useState<RoadmapInterviewGate[]>([]);
  const [draft, setDraft] = useState<RoadmapInterviewDraft | null>(null);
  const [readinessToken, setReadinessToken] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [turnFailed, setTurnFailed] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);

  const { data: checklist } = useGetRoadmapReadinessCriteriaQuery();
  const [takeTurn, { isLoading: isThinking }] = useRoadmapOpportunityInterviewTurnMutation();
  const [createOpportunity, { isLoading: isFiling }] = useCreateRoadmapOpportunityMutation();

  const feedRef = useRef<HTMLDivElement>(null);
  /**
   * The opening turn must fire exactly once. A ref rather than a `messages.length === 0` guard:
   * that condition is still true while the first request is in flight, so in React's development
   * double-invoke it opens two interviews and the admin reads two different first questions.
   */
  const openedRef = useRef(false);

  /** One turn: send the transcript as it will be on the server, then fold the answer in. */
  const runTurn = async (next: RoadmapInterviewMessage[]) => {
    setTurnFailed(false);
    try {
      const turn = await takeTurn({ messages: next }).unwrap();
      setMessages([...next, { role: "agent", content: turn.reply }]);
      setGates(turn.gates);
      setDraft(turn.draft);
      setReadinessToken(turn.readinessToken);
    } catch {
      // The admin's own words stay on screen — they are the expensive half of this exchange, and
      // re-typing an answer because the model timed out is the fastest way to lose someone. The
      // retry re-sends exactly `next`.
      setMessages(next);
      setTurnFailed(true);
    }
  };

  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    void runTurn([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Keep the newest turn in view; a question that arrives below the fold reads as no answer.
   *
   * `scrollTo?.` because this runs in a passive effect: an environment without it (jsdom, and
   * anything else stubbing the DOM) would throw there, and an exception in a passive effect
   * takes the whole drawer down over a scroll position.
   */
  useEffect(() => {
    feedRef.current?.scrollTo?.({ top: feedRef.current.scrollHeight });
  }, [messages, isThinking, draft]);

  const send = () => {
    const trimmed = input.trim();
    if (!trimmed || isThinking) return;
    setInput("");
    void runTurn([...messages, { role: "admin", content: trimmed }]);
  };

  const retry = () => void runTurn(messages);

  const file = async () => {
    if (!draft) return;
    try {
      const created = await createOpportunity({
        description: draft.description,
        type: RoadmapOpportunityType.IDEA,
        productGoal: draft.productGoal ?? undefined,
        effort: draft.effort ?? null,
        // The interview graded the five criteria, so it minted the token for this exact text.
        // Editing the draft here would invalidate it — which is why this panel is read-only and
        // the editing happens in the opportunity drawer, after filing.
        readinessToken: readinessToken ?? undefined,
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
    if (answered && !draft) {
      setConfirmingClose(true);
      return;
    }
    onClose();
  };

  const byId = useMemo(() => new Map(gates.map(gate => [gate.id, gate])), [gates]);
  const metCount = gates.filter(gate => gate.met).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={closeSafely}>
      <aside
        className="bg-white relative flex h-full w-[34rem] max-w-full flex-col"
        onClick={event => event.stopPropagation()}
      >
        <header className="border-border-light flex items-start justify-between gap-3 border-b p-4">
          <div className="min-w-0">
            <h2 className="text-typography-primary text-lg">New opportunity, guided</h2>
            <p className="text-typography-700 text-xs">
              A few questions, then a draft you can edit. Nothing is filed until you say so.
            </p>
          </div>
          <button
            type="button"
            onClick={closeSafely}
            aria-label="Close"
            className="text-typography-secondary hover:text-typography-900 cursor-pointer"
          >
            <Close />
          </button>
        </header>

        {/*
          The checklist is PINNED, not buried at the end of the scroll. It is the only thing on
          screen that says how much is left, and an interview whose end you cannot see is one
          people abandon halfway. Labels come from the readiness endpoint so this surface and the
          blank form cannot drift apart on wording.
        */}
        <section className="border-border-light bg-background-secondary border-b px-4 py-3">
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-typography-primary text-sm">What this needs</h3>
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
                      {/* The agent's own note, not the static hint: mid-interview, "you named
                          supervisors" is worth more than a restatement of the rule. */}
                      {!!gate?.note && (
                        <span className="text-typography-secondary block text-xs">{gate.note}</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div ref={feedRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          {messages.map((message, index) => (
            <div
              // Index is a safe key here: the transcript is append-only and never reordered.
              key={index}
              className={message.role === "admin" ? "flex justify-end" : "flex justify-start"}
            >
              <p
                className={
                  message.role === "admin"
                    ? "bg-primary-50 text-typography-900 max-w-[85%] rounded-2xl rounded-br-sm px-3 py-2 text-sm whitespace-pre-wrap"
                    : "text-typography-900 max-w-[90%] text-sm whitespace-pre-wrap"
                }
              >
                {message.content}
              </p>
            </div>
          ))}

          {isThinking && <p className="text-typography-secondary text-xs">Thinking…</p>}

          {turnFailed && (
            <div className="border-border-light flex items-center justify-between gap-2 border p-2">
              <p className="text-typography-700 text-xs">
                That answer did not go through. Your words are still here.
              </p>
              <Button variant={ButtonVariant.TEXT} onClick={retry}>
                Try again
              </Button>
            </div>
          )}

          {/*
            The draft, read-only and in place of the composer once it lands. Read-only on purpose:
            the readiness token is signed over this exact text, so an edit here would either
            invalidate it or have to be silently dropped. Editing belongs in the opportunity
            drawer that opens next, which autosaves.
          */}
          {!!draft && (
            <section className="border-primary-500 flex flex-col gap-2 border p-3">
              <h3 className="text-typography-primary text-sm">The draft</h3>
              <p className="text-typography-900 text-sm whitespace-pre-wrap">{draft.description}</p>
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
            </section>
          )}
        </div>

        <footer className="border-border-light border-t p-4">
          {draft ? (
            <div className="flex items-center justify-end gap-2">
              <Button variant={ButtonVariant.SECONDARY} onClick={retry} disabled={isFiling}>
                Keep talking
              </Button>
              <Button onClick={file} disabled={isFiling}>
                {isFiling ? "Filing…" : "File and review"}
              </Button>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <TextArea
                  id="roadmap-interview-composer"
                  labelText="Your answer"
                  hideLabel
                  rows={2}
                  placeholder="Type your answer…"
                  value={input}
                  onChange={event => setInput(event.target.value)}
                  onKeyDown={event => {
                    // Enter sends, Shift+Enter newlines — the same contract as the character
                    // interview composer, so the two do not behave differently under one keyboard.
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      send();
                    }
                  }}
                />
              </div>
              <Button onClick={send} disabled={!input.trim() || isThinking}>
                Send
              </Button>
            </div>
          )}
        </footer>

        {confirmingClose && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 p-6">
            <div className="bg-white flex max-w-sm flex-col gap-3 p-4">
              <h3 className="text-typography-primary text-sm">Leave this interview?</h3>
              <p className="text-typography-700 text-xs">
                Nothing has been filed yet, and the conversation is not saved anywhere — closing
                loses your answers.
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
