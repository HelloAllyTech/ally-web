import { FC } from "react";

import { Controller, useFieldArray, useFormContext } from "react-hook-form";

import { TextArea, Tooltip } from "@ally-ui-mono/ui-shared";
import { Plus, TooltipIcon, Trash } from "@assets";
import { TrackFormValues } from "@types";

interface OpenEndedEditorProps {
  questionPath: `sections.${number}.items.${number}.quiz.questions.${number}`;
}

export const OpenEndedEditor: FC<OpenEndedEditorProps> = ({ questionPath }) => {
  const { control } = useFormContext<TrackFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: `${questionPath}.rubric.criteria` as `sections.0.items.0.quiz.questions.0.rubric.criteria`,
    keyName: "fieldId",
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-typography-800">Grading guidance</label>
        <Controller
          control={control}
          name={
            `${questionPath}.rubric.guidance` as `sections.0.items.0.quiz.questions.0.rubric.guidance`
          }
          render={({ field }) => (
            <TextArea
              id="open-ended-grading-guidance"
              labelText="Grading guidance"
              hideLabel
              {...field}
              value={field.value ?? ""}
              rows={3}
              placeholder="How should this answer be graded?"
              className="w-full"
            />
          )}
        />
      </div>

      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1">
          <label className="text-sm font-medium text-typography-800">Max score</label>
          <Tooltip
            label="The highest score a grader (or AI grading) can award for this question."
            align="top"
          >
            <button type="button" className="cursor-pointer inline-flex items-center">
              <TooltipIcon />
            </button>
          </Tooltip>
        </span>
        <Controller
          control={control}
          name={
            `${questionPath}.rubric.maxScore` as `sections.0.items.0.quiz.questions.0.rubric.maxScore`
          }
          render={({ field }) => (
            <input
              type="number"
              min={1}
              className="w-24 border border-border-light rounded-md px-2 py-1 text-sm outline-none focus:border-primary-400"
              value={field.value ?? ""}
              onChange={event =>
                field.onChange(event.target.value === "" ? undefined : Number(event.target.value))
              }
              onWheel={event => event.currentTarget.blur()}
            />
          )}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="inline-flex items-center gap-1">
          <label className="text-sm font-medium text-typography-800">
            Rubric criteria (optional)
          </label>
          <Tooltip
            label="Each criterion's weight indicates its relative importance when scoring against the max score above."
            align="top"
          >
            <button type="button" className="cursor-pointer inline-flex items-center">
              <TooltipIcon />
            </button>
          </Tooltip>
        </span>
        {fields.map((field, index) => (
          <div key={field.fieldId} className="flex items-center gap-2">
            <Controller
              control={control}
              name={
                `${questionPath}.rubric.criteria.${index}.name` as `sections.0.items.0.quiz.questions.0.rubric.criteria.0.name`
              }
              render={({ field: nameField }) => (
                <input
                  {...nameField}
                  value={nameField.value ?? ""}
                  placeholder="Criterion name"
                  className="flex-1 border border-border-light rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary-400"
                />
              )}
            />
            <Controller
              control={control}
              name={
                `${questionPath}.rubric.criteria.${index}.weight` as `sections.0.items.0.quiz.questions.0.rubric.criteria.0.weight`
              }
              render={({ field: weightField }) => (
                <input
                  type="number"
                  min={0}
                  placeholder="Weight"
                  className="w-24 border border-border-light rounded-md px-2 py-1.5 text-sm outline-none focus:border-primary-400"
                  value={weightField.value ?? ""}
                  onChange={event =>
                    weightField.onChange(
                      event.target.value === "" ? undefined : Number(event.target.value),
                    )
                  }
                  onWheel={event => event.currentTarget.blur()}
                />
              )}
            />
            <button
              type="button"
              onClick={() => remove(index)}
              className="text-destructive-500 hover:text-destructive-600"
            >
              <Trash className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => append({ name: "", weight: undefined })}
          className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 w-fit"
        >
          <Plus className="w-4 h-4" />
          Add criterion
        </button>
      </div>
    </div>
  );
};
