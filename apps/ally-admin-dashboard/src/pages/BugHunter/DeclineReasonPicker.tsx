import { FC } from "react";

import { TextArea } from "@ally-ui-mono/ui-shared";
import { en } from "@constants";
import { BUG_FINDING_DECISION_NOTE_MAX_LENGTH, BugFindingDecisionReason } from "@types";

import {
  BUG_FINDING_DECISION_REASON_HINTS,
  BUG_FINDING_DECISION_REASON_LABELS,
  BUG_FINDING_DECISION_REASON_ORDER,
} from "./bugFindingLabels";

export interface DeclineReasonPickerProps {
  reason: BugFindingDecisionReason | null;
  onReasonChange: (reason: BugFindingDecisionReason) => void;
  note: string;
  onNoteChange: (note: string) => void;
  /** Distinguishes the radio group when two pickers are mounted at once (a drawer over a queue card). */
  idPrefix: string;
  /** Set for a bulk decline, so the copy says the reason applies to all of them. */
  count?: number;
}

/**
 * The reason a bug is being turned down.
 *
 * ## Why this is required, and why it is still cheap
 *
 * Declining is the commonest action on this page — a night's sweep in Manual
 * mode lands every finding at "waiting on you", and the honest shape of that
 * morning is "these fourteen are noise, this one matters". Adding a mandatory
 * field to the commonest action is a real cost, so the design pays it in one
 * keystroke: a radio list with the likeliest answer first, no dropdown to
 * open, no free text needed, and for a bulk decline ONE reason for the whole
 * batch rather than one each.
 *
 * What it buys is the two things the tab could not do before. The sweep re-read
 * the same code every night and re-filed the same rejected finding, so a
 * reviewer's decision lasted one night; and nothing anywhere could state how
 * often Bug Hunter was right, which is the question that decides whether it
 * may fix things unattended.
 *
 * ## Why the reasons are split the way they are
 *
 * The two groups mean opposite things and only one is a mark against the
 * agent. "It isn't a bug" says the finder misread the code. "Real, but not
 * worth fixing" says the finder read it correctly and the answer is still no —
 * a priority call. Collapsing them would make a team that triages well look
 * like it owns a broken agent, and would teach the next sweep to stop
 * reporting real bugs. The hint under each option says which is which in
 * plain words, because nobody should have to know the taxonomy to use it.
 */
export const DeclineReasonPicker: FC<DeclineReasonPickerProps> = ({
  reason,
  onReasonChange,
  note,
  onNoteChange,
  idPrefix,
  count,
}) => {
  const noteTooLong = note.length > BUG_FINDING_DECISION_NOTE_MAX_LENGTH;

  return (
    <div className="flex flex-col gap-3">
      <fieldset>
        <legend className="text-sm font-medium text-typography-900">
          {en.bugHunter.declineReasonLabel}
        </legend>
        {/* Says what the answer is FOR. Without this the field reads as
            bookkeeping, and a field that reads as bookkeeping gets whichever
            option is nearest the cursor. */}
        <p className="text-xs text-typography-600 mt-1">
          {count && count > 1
            ? `${en.bugHunter.declineReasonHelp} ${en.bugHunter.bulkDeclineOneReason.replace(
                "{count}",
                String(count),
              )}`
            : en.bugHunter.declineReasonHelp}
        </p>

        <div className="mt-2 flex flex-col gap-1.5">
          {BUG_FINDING_DECISION_REASON_ORDER.map(value => {
            const id = `${idPrefix}-decline-${value}`;
            const isSelected = reason === value;
            return (
              <label
                key={value}
                htmlFor={id}
                className={`flex items-start gap-2 rounded-md border px-3 py-2 cursor-pointer transition-colors ${
                  isSelected
                    ? "border-primary-500 bg-primary-50"
                    : "border-border-light bg-white hover:bg-neutral-50"
                }`}
              >
                <input
                  id={id}
                  type="radio"
                  name={`${idPrefix}-decline-reason`}
                  value={value}
                  checked={isSelected}
                  onChange={() => onReasonChange(value)}
                  // Named explicitly rather than left to the wrapping label.
                  // The label holds the option AND its one-line explanation,
                  // so the derived accessible name would be both sentences run
                  // together — the hint belongs in the reading order, not in
                  // the control's name.
                  aria-label={BUG_FINDING_DECISION_REASON_LABELS[value]}
                  aria-describedby={`${id}-hint`}
                  className="mt-0.5 cursor-pointer"
                />
                <span className="min-w-0">
                  <span className="block text-sm text-typography-900">
                    {BUG_FINDING_DECISION_REASON_LABELS[value]}
                  </span>
                  <span id={`${id}-hint`} className="block text-xs text-typography-600 mt-0.5">
                    {BUG_FINDING_DECISION_REASON_HINTS[value]}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div>
        <TextArea
          id={`${idPrefix}-decline-note`}
          labelText={en.bugHunter.declineNoteLabel}
          placeholder={en.bugHunter.declineNotePlaceholder}
          rows={2}
          value={note}
          invalid={noteTooLong}
          invalidText={en.bugHunter.declineNoteTooLong.replace(
            "{max}",
            String(BUG_FINDING_DECISION_NOTE_MAX_LENGTH),
          )}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onNoteChange(e.target.value)}
        />
      </div>
    </div>
  );
};

/**
 * Whether a decline is ready to submit.
 *
 * Exported so every caller gates its confirm button on the same rule rather
 * than each re-deriving it — the drawer, the needs-you card and the bulk bar
 * all offer this decision, and one of them disagreeing about whether a note
 * that is too long blocks submission would be a bug nobody would look for.
 */
export const canSubmitDecline = (reason: BugFindingDecisionReason | null, note: string): boolean =>
  reason != null && note.length <= BUG_FINDING_DECISION_NOTE_MAX_LENGTH;
