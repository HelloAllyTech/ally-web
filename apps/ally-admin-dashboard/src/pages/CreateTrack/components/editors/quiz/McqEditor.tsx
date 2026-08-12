import { FC } from "react";

import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { Plus, TooltipIcon, Trash } from "@assets";
import { MAX_MCQ_OPTIONS, MIN_MCQ_OPTIONS } from "@constants";
import { TrackFormValues } from "@types";

interface McqEditorProps {
  /** Absolute RHF path to the question node. */
  questionPath: `sections.${number}.items.${number}.quiz.questions.${number}`;
  multi: boolean;
}

const newOptionId = () => crypto.randomUUID();

export const McqEditor: FC<McqEditorProps> = ({ questionPath, multi }) => {
  const { control, setValue } = useFormContext<TrackFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: `${questionPath}.options` as `sections.0.items.0.quiz.questions.0.options`,
    keyName: "fieldId",
  });

  const options = useWatch({
    control,
    name: `${questionPath}.options` as `sections.0.items.0.quiz.questions.0.options`,
  });
  const correctOptionIds = (useWatch({
    control,
    name: `${questionPath}.correctOptionIds` as `sections.0.items.0.quiz.questions.0.correctOptionIds`,
  }) ?? []) as string[];

  const correctName =
    `${questionPath}.correctOptionIds` as `sections.0.items.0.quiz.questions.0.correctOptionIds`;

  const toggleCorrect = (optionId: string) => {
    if (multi) {
      const next = correctOptionIds.includes(optionId)
        ? correctOptionIds.filter(id => id !== optionId)
        : [...correctOptionIds, optionId];
      setValue(correctName, next, { shouldDirty: true });
    } else {
      setValue(correctName, [optionId], { shouldDirty: true });
    }
  };

  const canAdd = fields.length < MAX_MCQ_OPTIONS;
  const canRemove = fields.length > MIN_MCQ_OPTIONS;

  return (
    <div className="flex flex-col gap-2">
      <span className="inline-flex items-center gap-1">
        <label className="text-sm font-medium text-typography-800">
          Options ({fields.length}/{MAX_MCQ_OPTIONS}) —{" "}
          {multi ? "check all correct answers" : "select the one correct answer"}
        </label>
        <Tooltip
          label="Whether learners can pick one answer or several is set when you add the question and can't be changed afterward — delete and re-add it to switch."
          align="top"
        >
          <button type="button" className="cursor-pointer inline-flex items-center">
            <TooltipIcon />
          </button>
        </Tooltip>
      </span>
      {fields.map((field, optionIndex) => {
        const optionId = options?.[optionIndex]?.id;
        const isCorrect = optionId ? correctOptionIds.includes(optionId) : false;
        return (
          <div key={field.fieldId} className="flex items-center gap-2">
            <input
              type={multi ? "checkbox" : "radio"}
              checked={isCorrect}
              onChange={() => optionId && toggleCorrect(optionId)}
              className="cursor-pointer accent-primary-500"
              aria-label="Mark correct"
            />
            <Controller
              control={control}
              name={
                `${questionPath}.options.${optionIndex}.text` as `sections.0.items.0.quiz.questions.0.options.0.text`
              }
              render={({ field: textField }) => (
                <input
                  {...textField}
                  placeholder={`Option ${optionIndex + 1}`}
                  className="flex-1 border border-border-light rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary-400"
                />
              )}
            />
            {canRemove && (
              <button
                type="button"
                onClick={() => remove(optionIndex)}
                className="text-destructive-500 hover:text-destructive-600"
              >
                <Trash className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => append({ id: newOptionId(), text: "" })}
        disabled={!canAdd}
        className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 disabled:opacity-40 w-fit"
      >
        <Plus className="w-4 h-4" />
        Add option
      </button>
    </div>
  );
};
