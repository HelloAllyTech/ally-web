import { FC, useCallback, useEffect, useMemo, useState } from "react";

import { AutoExpandableTextarea, Tooltip } from "@ally-ui-mono/ui-shared";
import type { EventBuilderField } from "@api";
import { CheckCircle, DoubleArrowRight, FailIcon, Refresh, TooltipIcon } from "@assets";
// Imported by path rather than through the `@components` / `@constants`
// barrels, the same way AgentBuilderCopilotWizard does it. `@constants` reads
// `cellTypes` from `@components` at module load, so a component that reaches
// both through their barrels sits inside that cycle: rendered from a test that
// enters through this file, `cellTypes` is still undefined and the suite fails
// to collect.
import { isEventDraftSubmittable, type EventDraft } from "@utils/eventBuilderApply";

import { Button } from "../button";
import { EmojiPickerComponent } from "../emoji-picker";
import { NumberInput } from "../notion-table/NumberInput";
import { TextareaWithTriggerDropdown } from "../notion-table/TextAreaWithDropdown";
import { SimpleTagSelector } from "../tag-selector/SimpleTagSelector";
import { ButtonVariant } from "../types";
import { ClassifierExamplesEditor } from "./ClassifierExamplesEditor";
import {
  MAX_EXAMPLES_PER_POLARITY,
  useEventBuilderGeneration,
  type GenerationTask,
  type GenerationTaskStatus,
} from "./useEventBuilderGeneration";

/**
 * Draft panel for authoring a binary-classification event from a written
 * description of the behaviour.
 *
 * The draft is LOCAL until "Add event". That is the one place this deliberately
 * departs from the Event Management page, which writes a "New Event" row the
 * moment the type dialog is dismissed: `session_events` has no tenant column,
 * so every row is visible in every tenant's picker, and an abandoned generation
 * would leave permanent litter in a shared catalogue.
 *
 * Generated values land in ordinary editable inputs the moment they arrive —
 * there is no read-only "preview" step to accept. The author is reviewing, not
 * approving, and anything they can see they can immediately fix.
 */

const BRIEF_PLACEHOLDER =
  "The counsellor asks an open-ended question that invites the caller to say more, " +
  "rather than a yes/no question.";

const Spinner = () => (
  <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-dashed border-primary-300 border-t-transparent" />
);

const TaskStatusIcon: FC<{ status: GenerationTaskStatus }> = ({ status }) => {
  if (status === "active") return <Spinner />;
  if (status === "done") return <CheckCircle size={16} className="shrink-0 text-[#43A047]" />;
  if (status === "error") return <FailIcon size={16} className="shrink-0 text-[#FE6F64]" />;
  // waiting / empty / aborted — a muted dash, so a row that has not started is
  // not showing a spinner for work that is not running.
  return <span className="inline-block h-4 w-4 shrink-0 text-center text-typography-400">–</span>;
};

const taskNote = (task: GenerationTask): string | null => {
  if (task.status === "error") return task.error || "generation failed";
  if (task.status === "empty") return "nothing generated — write this one yourself";
  if (task.status === "aborted") return "cancelled";
  if (task.status === "waiting") return "waiting for the classification";
  return null;
};

interface FieldProps {
  label: string;
  tooltip?: string;
  multiline?: boolean;
  /** Renders a per-field regenerate button when set. */
  onRegenerate?: () => void;
  regenerating?: boolean;
  children: React.ReactNode;
}

const Field: FC<FieldProps> = ({
  label,
  tooltip,
  multiline = false,
  onRegenerate,
  regenerating = false,
  children,
}) => (
  <div
    className={`flex min-h-[40px] flex-row text-base justify-between ${
      multiline ? "items-start" : "items-center"
    }`}
  >
    <div className={`flex w-[40%] items-center gap-2 ${multiline ? "mt-[8px]" : ""}`}>
      <span className="text-base font-regular text-typography-800">{label}</span>
      {tooltip && (
        <Tooltip label={tooltip} align="top">
          <button type="button" className="cursor-pointer inline-flex items-center">
            <TooltipIcon />
          </button>
        </Tooltip>
      )}
      {onRegenerate && (
        <Tooltip label={`Regenerate ${label.toLowerCase()}`} align="top">
          <button
            type="button"
            aria-label={`Regenerate ${label.toLowerCase()}`}
            onClick={onRegenerate}
            disabled={regenerating}
            className="cursor-pointer inline-flex items-center text-typography-500 hover:text-primary-600 disabled:opacity-40"
          >
            <Refresh width={14} height={14} />
          </button>
        </Tooltip>
      )}
    </div>
    <div className="flex w-[60%] justify-start text-left text-neutral-800">{children}</div>
  </div>
);

export interface GenerateEventPanelProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Persist the draft. Returns true when it stuck, so the panel only closes on
   * a real success — a failed create leaves the author's work on screen rather
   * than discarding a brief they would have to write again.
   */
  onCreate: (draft: EventDraft) => Promise<boolean>;
  /** Whether a create is in flight, so the button can show it. */
  isCreating?: boolean;
  /** Title (and optionally challenge) of the simulation this is written for. */
  simulationContext?: string;
  competency?: string;
  /**
   * Already-formatted warning to show above the actions, or undefined for none.
   *
   * The caller owns the threshold: this panel should not have to know how many
   * advanced events a simulation can carry, and reaching for that constant
   * would pull the `@constants` barrel back into this module's import graph.
   * It is surfaced here rather than only on the step because generation makes
   * adding events nearly free, which is exactly what pushes a scenario through
   * the ceiling.
   */
  latencyWarning?: string;
}

export const GenerateEventPanel: FC<GenerateEventPanelProps> = ({
  isOpen,
  onClose,
  onCreate,
  isCreating = false,
  simulationContext,
  competency,
  latencyWarning,
}) => {
  const [brief, setBrief] = useState("");
  const {
    phase,
    tasks,
    draft,
    patchDraft,
    start,
    regenerateField,
    abort,
    reset,
    settledCount,
    appliedCount,
  } = useEventBuilderGeneration();

  // A reopened panel is a new event, never a continuation of the last one.
  useEffect(() => {
    if (!isOpen) return;
    setBrief("");
    reset();
  }, [isOpen, reset]);

  const inputs = useMemo(
    () => ({ eventDescription: brief, simulationContext, competency }),
    [brief, simulationContext, competency],
  );
  const isRunning = phase === "running";
  const canSubmit = isEventDraftSubmittable(draft) && !isCreating && !isRunning;

  const handleGenerate = useCallback(() => start(inputs), [start, inputs]);

  const handleRegenerate = useCallback(
    (field: EventBuilderField) => regenerateField(field, inputs),
    [regenerateField, inputs],
  );

  const handleCreate = useCallback(async () => {
    const created = await onCreate(draft);
    if (created) onClose();
  }, [onCreate, draft, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black bg-opacity-50" onClick={onClose} />

      <div className="flex w-[50%] min-w-[700px] flex-col border-l-[1px] border-border-light bg-white shadow-xl">
        <div className="flex items-center justify-between p-6">
          <button
            onClick={onClose}
            className="flex flex-row items-center justify-center gap-2 text-typography-600 hover:text-neutral-800"
          >
            <DoubleArrowRight width={14} height={14} />
            <span className="font-tertiary text-base font-[500]">New event</span>
          </button>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto px-10 pl-[46px]">
          {/* Brief — the one thing the author has to write. */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-medium text-typography-900">Describe what to detect</h3>
              <Tooltip
                label="Describe one thing the counsellor does, as it would look in a single sentence they say. The classifier sees one utterance at a time with no history."
                align="top"
              >
                <button type="button" className="cursor-pointer inline-flex items-center">
                  <TooltipIcon />
                </button>
              </Tooltip>
            </div>
            <AutoExpandableTextarea
              value={brief}
              onChange={setBrief}
              placeholder={BRIEF_PLACEHOLDER}
              minHeight={72}
              maxLines={10}
              className="w-full rounded border border-border-light bg-white px-3 py-2 text-base"
            />
            <div className="flex justify-end">
              {isRunning ? (
                <Button variant={ButtonVariant.SECONDARY} onClick={abort} className="h-[40px] px-6">
                  Stop generating
                </Button>
              ) : (
                <Button
                  variant={ButtonVariant.PRIMARY}
                  onClick={handleGenerate}
                  disabled={!brief.trim()}
                  className="h-[40px] px-6"
                >
                  {phase === "idle" ? "Generate" : "Generate again"}
                </Button>
              )}
            </div>
          </div>

          {/* Per-task feed — every row says what stage it is in. */}
          {phase !== "idle" && tasks.length > 0 && (
            <div className="mt-4 flex flex-col gap-3">
              <div className="rounded-md border border-border-light bg-neutral-50 p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-typography-800">
                  {isRunning ? <Spinner /> : <CheckCircle size={16} className="text-[#43A047]" />}
                  Writing the event ({settledCount}/{tasks.length})
                </div>
                <div className="mt-2 flex flex-col gap-0.5 pl-1">
                  {tasks.map(task => {
                    const note = taskNote(task);
                    return (
                      <div key={task.key} className="flex items-center gap-2 py-1 text-sm">
                        <TaskStatusIcon status={task.status} />
                        <span
                          className={
                            task.status === "error"
                              ? "text-[#FE6F64]"
                              : task.status === "done"
                                ? "text-typography-800"
                                : "text-typography-500"
                          }
                        >
                          {task.label}
                        </span>
                        {note && <span className="text-xs text-typography-500">· {note}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {phase === "done" && (
                <div className="rounded-md border border-success-200 bg-success-50 p-3 text-sm text-typography-900">
                  Filled {appliedCount} of {tasks.length}. Check the examples below before adding —
                  that is where a wrong classification shows up.
                </div>
              )}
              {phase === "aborted" && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-typography-900">
                  Generation stopped. Whatever finished was kept — review it below, or generate
                  again.
                </div>
              )}
            </div>
          )}

          <div className="my-5 h-[1px] w-full bg-border-light" />

          {/* The draft. Editable from the first render, generated or not. */}
          <div className="space-y-3 pb-8">
            <input
              type="text"
              value={draft.name}
              onChange={event => patchDraft({ name: event.target.value })}
              placeholder="Event name"
              className="w-full border-none text-2xl font-light focus:outline-none"
            />

            <Field
              label="Classification"
              tooltip="The only definition the runtime classifier gets. Write it as a noun phrase naming the behaviour, not as a question."
              multiline
              onRegenerate={() => handleRegenerate("classifier")}
              regenerating={isRunning}
            >
              <AutoExpandableTextarea
                value={draft.className}
                onChange={(value: string) => patchDraft({ className: value })}
                placeholder="Add classification"
                minHeight={20}
                maxLines={8}
                className="custom-scrollbar w-full resize-none border-none px-0 py-2 text-base focus:outline-none"
              />
            </Field>

            <div className="flex flex-col gap-2 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-base font-regular text-typography-800">Examples</span>
                <Tooltip label="Regenerate examples" align="top">
                  <button
                    type="button"
                    aria-label="Regenerate examples"
                    onClick={() => handleRegenerate("examples")}
                    disabled={isRunning}
                    className="cursor-pointer inline-flex items-center text-typography-500 hover:text-primary-600 disabled:opacity-40"
                  >
                    <Refresh width={14} height={14} />
                  </button>
                </Tooltip>
              </div>
              <ClassifierExamplesEditor
                positiveExamples={draft.positiveExamples}
                negativeExamples={draft.negativeExamples}
                onChange={patchDraft}
                max={MAX_EXAMPLES_PER_POLARITY}
                disabled={isRunning}
              />
            </div>

            <div className="my-2 h-[1px] w-full bg-border-light" />

            <Field
              label="Branch description"
              tooltip='Injected into the AI client’s prompt when this fires — direction for the actor, not feedback for the learner. Use "<" for dynamic content.'
              multiline
              onRegenerate={() => handleRegenerate("branch_instruction")}
              regenerating={isRunning}
            >
              <TextareaWithTriggerDropdown
                value={draft.branchInstruction}
                onChange={(value: string) => patchDraft({ branchInstruction: value })}
                placeholder="Add instruction"
                alwaysOpen
              />
            </Field>

            <Field
              label="Default session quality score"
              tooltip="Signed: positive for a behaviour to encourage, negative for one to discourage, 0 for one worth noticing but not scoring."
              onRegenerate={() => handleRegenerate("feedback")}
              regenerating={isRunning}
            >
              <NumberInput
                value={draft.score}
                onChange={(value: number) => patchDraft({ score: value })}
              />
            </Field>

            <Field label="Default real time feedback message" multiline>
              <AutoExpandableTextarea
                value={draft.message}
                onChange={(value: string) => patchDraft({ message: value })}
                placeholder="Add message"
                minHeight={20}
                maxLines={20}
                className="custom-scrollbar w-full resize-none overflow-y-auto border-none px-0 py-2 pt-[16px] text-base focus:outline-none"
              />
            </Field>

            <Field label="Default real time feedback emoji">
              <EmojiPickerComponent
                className="max-w-[60px] pr-[25px]"
                onEmojiClick={(emoji: string) => patchDraft({ emoji })}
                buttonText={draft.emoji}
              />
            </Field>

            <Field
              label="Tags"
              onRegenerate={() => handleRegenerate("tags")}
              regenerating={isRunning}
            >
              <div className="w-full">
                <SimpleTagSelector
                  tags={draft.tags}
                  updateTags={(tags: string[]) => patchDraft({ tags })}
                  label=""
                />
              </div>
            </Field>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border-light p-6">
          {latencyWarning && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-typography-900">
              {latencyWarning}
            </div>
          )}
          <div className="flex items-center justify-end gap-3">
            {/*
              An inline hint rather than a tooltip on the disabled button: a
              disabled element does not receive pointer events, so a tooltip
              explaining why it is disabled is exactly the one that never opens.
            */}
            {!isEventDraftSubmittable(draft) && (
              <span className="mr-auto text-xs text-typography-600">
                Add a classification — without one the event can never fire.
              </span>
            )}
            <Button variant={ButtonVariant.SECONDARY} onClick={onClose} className="h-[40px] px-6">
              Cancel
            </Button>
            <Button
              variant={ButtonVariant.PRIMARY}
              onClick={handleCreate}
              disabled={!canSubmit}
              className="h-[40px] px-6"
            >
              {isCreating ? "Adding…" : "Add event"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
