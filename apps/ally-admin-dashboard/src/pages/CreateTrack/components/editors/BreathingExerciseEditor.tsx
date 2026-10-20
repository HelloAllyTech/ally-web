import { FC } from "react";

import { Controller, useFormContext } from "react-hook-form";

import { NumberInput, Stack, TextInput, Tooltip } from "@ally-ui-mono/ui-shared";
import { TooltipIcon } from "@assets";
import { TrackFormValues, TrackItemType } from "@types";

import { ItemEditorFrame } from "./ItemEditorFrame";

interface BreathingExerciseEditorProps {
  sectionIndex: number;
  itemIndex: number;
  onDelete: () => void;
}

/**
 * Editor for the Breathing Exercise game.
 * Authors can configure durations for each phase, total cycles, and instructional texts.
 */
export const BreathingExerciseEditor: FC<BreathingExerciseEditorProps> = ({
  sectionIndex,
  itemIndex,
  onDelete,
}) => {
  const { control } = useFormContext<TrackFormValues>();
  const base = `sections.${sectionIndex}.items.${itemIndex}.game.breathingExercise` as const;

  return (
    <ItemEditorFrame
      sectionIndex={sectionIndex}
      itemIndex={itemIndex}
      type={TrackItemType.GAME}
      onDelete={onDelete}
    >
      <Stack gap={6}>
        <div className="flex flex-col gap-4">
          <span className="inline-flex items-center gap-1">
            <h3 className="text-sm font-semibold text-typography-900">Timing & Cycles</h3>
            <Tooltip
              label="Configure how long each part of the breath lasts, and how many times to repeat the whole box."
              align="top"
            >
              <button type="button" className="cursor-pointer inline-flex items-center">
                <TooltipIcon />
              </button>
            </Tooltip>
          </span>

          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={control}
              name={`${base}.inhale`}
              render={({ field, fieldState }) => (
                <NumberInput
                  id={`${base}.inhale`}
                  label="Inhale (seconds)"
                  min={1}
                  step={1}
                  value={field.value}
                  onChange={(_, { value }) => field.onChange(value)}
                  invalid={!!fieldState.error}
                  invalidText={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={control}
              name={`${base}.holdIn`}
              render={({ field, fieldState }) => (
                <NumberInput
                  id={`${base}.holdIn`}
                  label="Hold after inhale (seconds)"
                  min={0}
                  step={1}
                  value={field.value}
                  onChange={(_, { value }) => field.onChange(value)}
                  invalid={!!fieldState.error}
                  invalidText={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={control}
              name={`${base}.exhale`}
              render={({ field, fieldState }) => (
                <NumberInput
                  id={`${base}.exhale`}
                  label="Exhale (seconds)"
                  min={1}
                  step={1}
                  value={field.value}
                  onChange={(_, { value }) => field.onChange(value)}
                  invalid={!!fieldState.error}
                  invalidText={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={control}
              name={`${base}.holdOut`}
              render={({ field, fieldState }) => (
                <NumberInput
                  id={`${base}.holdOut`}
                  label="Hold after exhale (seconds)"
                  min={0}
                  step={1}
                  value={field.value}
                  onChange={(_, { value }) => field.onChange(value)}
                  invalid={!!fieldState.error}
                  invalidText={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={control}
              name={`${base}.cycles`}
              render={({ field, fieldState }) => (
                <NumberInput
                  id={`${base}.cycles`}
                  label="Total cycles"
                  min={1}
                  step={1}
                  value={field.value}
                  onChange={(_, { value }) => field.onChange(value)}
                  invalid={!!fieldState.error}
                  invalidText={fieldState.error?.message}
                />
              )}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-border-light pt-6">
          <span className="inline-flex items-center gap-1">
            <h3 className="text-sm font-semibold text-typography-900">Instructional Text</h3>
            <Tooltip
              label="These prompts are shown to the learner during each phase of the exercise."
              align="top"
            >
              <button type="button" className="cursor-pointer inline-flex items-center">
                <TooltipIcon />
              </button>
            </Tooltip>
          </span>

          <div className="grid grid-cols-1 gap-4">
            <Controller
              control={control}
              name={`${base}.inhaleText`}
              render={({ field, fieldState }) => (
                <TextInput
                  id={`${base}.inhaleText`}
                  labelText="Inhale prompt"
                  value={field.value}
                  onChange={field.onChange}
                  invalid={!!fieldState.error}
                  invalidText={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={control}
              name={`${base}.holdInText`}
              render={({ field, fieldState }) => (
                <TextInput
                  id={`${base}.holdInText`}
                  labelText="Hold (in) prompt"
                  value={field.value}
                  onChange={field.onChange}
                  invalid={!!fieldState.error}
                  invalidText={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={control}
              name={`${base}.exhaleText`}
              render={({ field, fieldState }) => (
                <TextInput
                  id={`${base}.exhaleText`}
                  labelText="Exhale prompt"
                  value={field.value}
                  onChange={field.onChange}
                  invalid={!!fieldState.error}
                  invalidText={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={control}
              name={`${base}.holdOutText`}
              render={({ field, fieldState }) => (
                <TextInput
                  id={`${base}.holdOutText`}
                  labelText="Hold (out) prompt"
                  value={field.value}
                  onChange={field.onChange}
                  invalid={!!fieldState.error}
                  invalidText={fieldState.error?.message}
                />
              )}
            />
          </div>
        </div>

        <p className="rounded-md bg-secondary-50 px-3 py-2 text-xs text-typography-600">
          The breathing exercise helps learners regulate their emotional state. It completes as soon
          as it is opened, so they can practice at their own pace or exit at any time.
        </p>
      </Stack>
    </ItemEditorFrame>
  );
};
