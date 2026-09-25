import { FC } from "react";

import { Controller, useFieldArray, useFormContext } from "react-hook-form";

import { Select, SelectItem, Tooltip } from "@ally-ui-mono/ui-shared";
import { Plus, TooltipIcon, Trash } from "@assets";
import {
  LIKERT_SCALE_PRESETS,
  MAX_LIKERT_SCALE_POINTS,
  MAX_LIKERT_STATEMENTS,
  MIN_LIKERT_SCALE_POINTS,
  MIN_LIKERT_STATEMENTS,
} from "@constants";
import { TrackFormValues } from "@types";

import { QuestionPath } from "../../../trackFormUtils";

interface LikertScaleEditorProps {
  questionPath: QuestionPath;
}

const newOptionId = () => crypto.randomUUID();

/**
 * Likert scale editor: one shared scale (lowest first) applied to a list of
 * statements. There is no answer key to author here — a rating-scale
 * question is never graded, which is why `QuizItemEditor` hides the Graded /
 * Show-correct-answer toggles and the Points field whenever this type is
 * active, rather than this component taking a `graded` prop like its
 * siblings.
 */
export const LikertScaleEditor: FC<LikertScaleEditorProps> = ({ questionPath }) => {
  const { control, setValue } = useFormContext<TrackFormValues>();

  const scaleName = `${questionPath}.scale` as `sections.0.items.0.quiz.questions.0.scale`;
  const statementsName =
    `${questionPath}.statements` as `sections.0.items.0.quiz.questions.0.statements`;

  const {
    fields: scaleFields,
    append: appendScale,
    remove: removeScale,
  } = useFieldArray({ control, name: scaleName, keyName: "fieldId" });
  const {
    fields: statementFields,
    append: appendStatement,
    remove: removeStatement,
  } = useFieldArray({ control, name: statementsName, keyName: "fieldId" });

  const canAddScale = scaleFields.length < MAX_LIKERT_SCALE_POINTS;
  const canRemoveScale = scaleFields.length > MIN_LIKERT_SCALE_POINTS;
  const canAddStatement = statementFields.length < MAX_LIKERT_STATEMENTS;
  const canRemoveStatement = statementFields.length > MIN_LIKERT_STATEMENTS;

  const applyPreset = (presetKey: string) => {
    const preset = LIKERT_SCALE_PRESETS.find(entry => entry.key === presetKey);
    if (!preset) return;
    setValue(
      scaleName,
      preset.scale.map(text => ({ id: newOptionId(), text })),
      { shouldDirty: true },
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1">
            <label className="text-sm font-medium text-typography-800">
              Scale points ({scaleFields.length}/{MAX_LIKERT_SCALE_POINTS})
            </label>
            <Tooltip
              label="The rating options shown for every statement below, lowest first — e.g. Strongly disagree … Strongly agree."
              align="top"
            >
              <button type="button" className="cursor-pointer inline-flex items-center">
                <TooltipIcon />
              </button>
            </Tooltip>
          </span>
          <Select
            id={`${questionPath}-likert-preset`}
            labelText="Use preset"
            hideLabel
            className="max-w-[180px]"
            value=""
            onChange={event => event.target.value && applyPreset(event.target.value)}
          >
            <SelectItem value="" text="Use preset…" />
            {LIKERT_SCALE_PRESETS.map(preset => (
              <SelectItem key={preset.key} value={preset.key} text={preset.label} />
            ))}
          </Select>
        </div>
        {scaleFields.map((field, index) => (
          <div key={field.fieldId} className="flex items-center gap-2">
            <span className="w-6 text-center text-xs text-typography-500">{index + 1}</span>
            <Controller
              control={control}
              name={
                `${scaleName}.${index}.text` as `sections.0.items.0.quiz.questions.0.scale.0.text`
              }
              render={({ field: textField }) => (
                <input
                  {...textField}
                  placeholder={`Scale point ${index + 1}`}
                  className="flex-1 border border-border-light rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary-400"
                />
              )}
            />
            {canRemoveScale && (
              <button
                type="button"
                onClick={() => removeScale(index)}
                className="text-destructive-500 hover:text-destructive-600"
              >
                <Trash className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => appendScale({ id: newOptionId(), text: "" })}
          disabled={!canAddScale}
          className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 disabled:opacity-40 w-fit"
        >
          <Plus className="w-4 h-4" />
          Add scale point
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <span className="inline-flex items-center gap-1">
          <label className="text-sm font-medium text-typography-800">
            Statements ({statementFields.length}/{MAX_LIKERT_STATEMENTS})
          </label>
          <Tooltip
            label="Each statement is rated by the learner against the scale above — e.g. “I feel confident having this conversation.”"
            align="top"
          >
            <button type="button" className="cursor-pointer inline-flex items-center">
              <TooltipIcon />
            </button>
          </Tooltip>
        </span>
        {statementFields.map((field, index) => (
          <div key={field.fieldId} className="flex items-center gap-2">
            <span className="w-6 text-center text-sm text-typography-500">{index + 1}</span>
            <Controller
              control={control}
              name={
                `${statementsName}.${index}.text` as `sections.0.items.0.quiz.questions.0.statements.0.text`
              }
              render={({ field: textField }) => (
                <input
                  {...textField}
                  placeholder={`Statement ${index + 1}`}
                  className="flex-1 border border-border-light rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary-400"
                />
              )}
            />
            {canRemoveStatement && (
              <button
                type="button"
                onClick={() => removeStatement(index)}
                className="text-destructive-500 hover:text-destructive-600"
              >
                <Trash className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => appendStatement({ id: newOptionId(), text: "" })}
          disabled={!canAddStatement}
          className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 disabled:opacity-40 w-fit"
        >
          <Plus className="w-4 h-4" />
          Add statement
        </button>
      </div>
    </div>
  );
};
