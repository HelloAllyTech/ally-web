import { FC } from "react";

import { Controller, useFormContext } from "react-hook-form";

import { Select, SelectItem } from "@ally-ui-mono/ui-shared";
import { ToggleSwitch } from "@components";
import { QUIZ_SHOW_EXPLANATIONS_OPTIONS } from "@constants";
import { QuizShowExplanations, TrackFormValues } from "@types";

interface QuizSettingsFieldsProps {
  sectionIndex: number;
  itemIndex: number;
}

const rowClass = "flex items-center justify-between gap-4 py-2";
const labelClass = "text-sm text-typography-800";
const numberInput =
  "w-24 border border-border-light rounded-md px-2 py-1 text-sm outline-none focus:border-primary-400";

/** Quiz-level settings. `passScore` is authoritative here; the server mirrors it. */
export const QuizSettingsFields: FC<QuizSettingsFieldsProps> = ({ sectionIndex, itemIndex }) => {
  const { control } = useFormContext<TrackFormValues>();
  const base = `sections.${sectionIndex}.items.${itemIndex}.quiz.settings` as const;

  return (
    <div className="flex flex-col divide-y divide-border-light">
      <div className={rowClass}>
        <span className={labelClass}>Pass score (%)</span>
        <Controller
          control={control}
          name={`${base}.passScore`}
          render={({ field }) => (
            <input
              type="number"
              min={0}
              max={100}
              className={numberInput}
              value={field.value ?? ""}
              onChange={event =>
                field.onChange(event.target.value === "" ? undefined : Number(event.target.value))
              }
              onWheel={event => event.currentTarget.blur()}
            />
          )}
        />
      </div>

      <div className={rowClass}>
        <span className={labelClass}>Max attempts</span>
        <Controller
          control={control}
          name={`${base}.maxAttempts`}
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-xs text-typography-600">
                <input
                  type="checkbox"
                  checked={field.value == null}
                  onChange={event => field.onChange(event.target.checked ? null : 1)}
                />
                Unlimited
              </label>
              <input
                type="number"
                min={1}
                disabled={field.value == null}
                className={`${numberInput} disabled:opacity-50`}
                value={field.value ?? ""}
                onChange={event =>
                  field.onChange(event.target.value === "" ? null : Number(event.target.value))
                }
                onWheel={event => event.currentTarget.blur()}
              />
            </div>
          )}
        />
      </div>

      <div className={rowClass}>
        <span className={labelClass}>Shuffle questions</span>
        <Controller
          control={control}
          name={`${base}.shuffleQuestions`}
          render={({ field }) => (
            <ToggleSwitch enabled={field.value ?? false} onChange={field.onChange} />
          )}
        />
      </div>

      <div className={rowClass}>
        <span className={labelClass}>Shuffle options</span>
        <Controller
          control={control}
          name={`${base}.shuffleOptions`}
          render={({ field }) => (
            <ToggleSwitch enabled={field.value ?? false} onChange={field.onChange} />
          )}
        />
      </div>

      <div className={rowClass}>
        <span className={labelClass}>Show explanations</span>
        <Controller
          control={control}
          name={`${base}.showExplanations`}
          render={({ field }) => (
            <Select
              id={`${base}.showExplanations`}
              labelText="Show explanations"
              hideLabel
              value={field.value ?? "after_submit"}
              onChange={event => field.onChange(event.target.value as QuizShowExplanations)}
            >
              {QUIZ_SHOW_EXPLANATIONS_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value} text={option.label} />
              ))}
            </Select>
          )}
        />
      </div>
    </div>
  );
};
