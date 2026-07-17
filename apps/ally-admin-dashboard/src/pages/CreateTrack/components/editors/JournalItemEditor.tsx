import { FC } from "react";

import { Controller, useFieldArray, useFormContext } from "react-hook-form";

import { Plus, Trash } from "@assets";
import { ToggleSwitch } from "@components";
import { MAX_JOURNAL_PROMPTS, MIN_JOURNAL_PROMPTS } from "@constants";
import { TrackFormValues, TrackItemType } from "@types";

import { ItemEditorFrame } from "./ItemEditorFrame";

interface JournalItemEditorProps {
  sectionIndex: number;
  itemIndex: number;
  onDelete: () => void;
}

const newPromptId = () => crypto.randomUUID();

export const JournalItemEditor: FC<JournalItemEditorProps> = ({
  sectionIndex,
  itemIndex,
  onDelete,
}) => {
  const { control } = useFormContext<TrackFormValues>();
  const base = `sections.${sectionIndex}.items.${itemIndex}` as const;

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: `${base}.journal.prompts`,
    keyName: "fieldId",
  });

  const canAdd = fields.length < MAX_JOURNAL_PROMPTS;
  const canRemove = fields.length > MIN_JOURNAL_PROMPTS;

  return (
    <ItemEditorFrame
      sectionIndex={sectionIndex}
      itemIndex={itemIndex}
      type={TrackItemType.JOURNAL}
      onDelete={onDelete}
    >
      <div className="flex flex-col gap-4">
        <label className="text-sm font-medium text-typography-800">
          Reflection prompts ({fields.length}/{MAX_JOURNAL_PROMPTS})
        </label>

        {fields.map((field, promptIndex) => {
          const promptBase = `${base}.journal.prompts.${promptIndex}` as const;
          return (
            <div
              key={field.fieldId}
              className="border border-border-light rounded-md p-3 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-typography-600">
                  Prompt {promptIndex + 1}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => move(promptIndex, promptIndex - 1)}
                    disabled={promptIndex === 0}
                    className="text-xs text-typography-600 disabled:opacity-30 hover:text-typography-900"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    onClick={() => move(promptIndex, promptIndex + 1)}
                    disabled={promptIndex === fields.length - 1}
                    className="text-xs text-typography-600 disabled:opacity-30 hover:text-typography-900"
                  >
                    Down
                  </button>
                  {canRemove && (
                    <button
                      type="button"
                      onClick={() => remove(promptIndex)}
                      className="text-destructive-500 hover:text-destructive-600"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <Controller
                control={control}
                name={`${promptBase}.prompt`}
                render={({ field: promptField }) => (
                  <textarea
                    {...promptField}
                    rows={2}
                    placeholder="What should the learner reflect on?"
                    className="w-full border border-border-light rounded-md px-3 py-2 text-sm outline-none focus:border-primary-400 resize-y"
                  />
                )}
              />

              <Controller
                control={control}
                name={`${promptBase}.placeholder`}
                render={({ field: placeholderField }) => (
                  <input
                    {...placeholderField}
                    value={placeholderField.value ?? ""}
                    placeholder="Placeholder text (optional)"
                    className="w-full border border-border-light rounded-md px-3 py-2 text-sm outline-none focus:border-primary-400"
                  />
                )}
              />

              <Controller
                control={control}
                name={`${promptBase}.required`}
                render={({ field: requiredField }) => (
                  <label className="flex items-center gap-2 text-sm text-typography-700">
                    <ToggleSwitch
                      enabled={requiredField.value ?? false}
                      onChange={requiredField.onChange}
                    />
                    Required
                  </label>
                )}
              />
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => append({ id: newPromptId(), prompt: "", required: true, placeholder: "" })}
          disabled={!canAdd}
          className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 disabled:opacity-40 w-fit"
        >
          <Plus className="w-4 h-4" />
          Add prompt
        </button>
      </div>
    </ItemEditorFrame>
  );
};
