import React, { useState } from "react";

import { toast } from "sonner";

import { AutoExpandableTextarea, Button } from "@ally-ui-mono/ui-shared";
import { useGetBuilderSteersQuery, useSteerBuilderSessionMutation } from "@api";
import { en } from "@constants";
import { BuilderSteer } from "@types";

const strings = en.builder.steer;

/** Mirrors BUILDER_STEER_MAX_LENGTH in ally-be. */
const MAX_LENGTH = 2000;

/**
 * Redirect a build instead of cancelling it.
 *
 * Cancel was the only lever over a running build, and it discarded the working
 * tree along with every dollar that produced it. So "this is going the wrong
 * way" and "stop everything" had one button between them, and the cost of
 * choosing wrong was an hour.
 *
 * (Cancelling is less destructive than it was: the coder pushes after every
 * attempt now, so the branch survives. It still throws away the rest of the
 * pipeline — gate, reviewer, pull request — which is what this exists to
 * avoid.)
 *
 * The delivery promise is stated on the control rather than implied by it.
 * Notes land at a phase boundary, because a coding agent is one long
 * invocation with no point during it at which text can be inserted — and
 * `delivered` means a run put the note in a prompt, never that the agent
 * complied. A control that quietly promises more than it does is worse than
 * one that promises nothing, and this is a control someone reaches for when a
 * build is already going wrong.
 */
export const SteerComposer: React.FC<{ sessionId: string; live: boolean }> = ({
  sessionId,
  live,
}) => {
  const [note, setNote] = useState("");
  const { data: steers } = useGetBuilderSteersQuery(sessionId);
  const [steer, { isLoading }] = useSteerBuilderSessionMutation();

  const trimmed = note.trim();
  const tooLong = trimmed.length > MAX_LENGTH;

  const send = async () => {
    if (!trimmed || tooLong) return;
    try {
      const result = await steer({ id: sessionId, note: trimmed }).unwrap();
      setNote("");
      // The server says when it will arrive, and that sentence differs by
      // whether anything is running — echoing it beats guessing here.
      toast.success(result.delivery);
    } catch {
      toast.error(strings.failed);
    }
  };

  return (
    <div className="flex flex-col gap-2 border-t border-border-light p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-medium">{strings.title}</h3>
        <span className="text-xs text-typography-500">
          {live ? strings.hintLive : strings.hintIdle}
        </span>
      </div>

      {/* Bordered and short on purpose. The bare auto-expanding textarea read
          as body copy with a Send button beneath it — people did not recognise
          it as somewhere to type. Two lines is enough for the one sentence
          this control is for; it grows to four if the note runs long. */}
      <AutoExpandableTextarea
        id="builder-steer-note"
        value={note}
        onChange={setNote}
        placeholder={strings.placeholder}
        disabled={isLoading}
        maxLines={4}
        // No `minLines` prop exists; the height floor is set in CSS instead.
        className="min-h-[2.5rem] rounded border border-border-light bg-white px-2 py-1.5 focus:border-primary-500"
        onKeyDown={(event: React.KeyboardEvent<HTMLTextAreaElement>) => {
          // Enter sends, Shift+Enter breaks a line — the same contract as the
          // interview composer above it, so one text box on the page does not
          // behave differently from the other.
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void send();
          }
        }}
      />

      <div className="flex items-center justify-end gap-3">
        {tooLong && <span className="text-xs text-support-error">{strings.tooLong}</span>}
        <Button size="sm" disabled={!trimmed || tooLong || isLoading} onClick={send}>
          {strings.send}
        </Button>
      </div>

      {Boolean(steers?.length) && (
        <ul className="flex flex-col gap-2 pt-1">
          {(steers as BuilderSteer[]).map(item => (
            <li key={item.id} className="text-xs text-typography-600">
              <span className="pr-2 font-medium">
                {item.status === "delivered"
                  ? item.deliveredAtPhase
                    ? strings.deliveredAtPhase(item.deliveredAtPhase)
                    : strings.delivered
                  : item.status === "superseded"
                    ? strings.superseded
                    : strings.pending}
              </span>
              {item.note}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
