import { FC } from "react";

import { Controller, useFieldArray, useFormContext } from "react-hook-form";

import { Plus, Trash } from "@assets";
import { TrackFormValues } from "@types";

interface OrderingEditorProps {
  questionPath: `sections.${number}.items.${number}.quiz.questions.${number}`;
}

const newItemId = () => crypto.randomUUID();

/**
 * Ordering question editor. The authored row order IS the correct order;
 * `serializeTrackForm` derives `correctOrder` from `items` on save, so no
 * separate answer key is edited here.
 */
export const OrderingEditor: FC<OrderingEditorProps> = ({ questionPath }) => {
  const { control } = useFormContext<TrackFormValues>();

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: `${questionPath}.items` as `sections.0.items.0.quiz.questions.0.items`,
    keyName: "fieldId",
  });

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-typography-800">
        Items (drag order = correct order)
      </label>
      {fields.map((field, itemIndex) => (
        <div key={field.fieldId} className="flex items-center gap-2">
          <span className="w-6 text-center text-sm text-typography-500">{itemIndex + 1}</span>
          <Controller
            control={control}
            name={
              `${questionPath}.items.${itemIndex}.text` as `sections.0.items.0.quiz.questions.0.items.0.text`
            }
            render={({ field: textField }) => (
              <input
                {...textField}
                placeholder={`Item ${itemIndex + 1}`}
                className="flex-1 border border-border-light rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary-400"
              />
            )}
          />
          <button
            type="button"
            onClick={() => move(itemIndex, itemIndex - 1)}
            disabled={itemIndex === 0}
            className="text-xs text-typography-600 disabled:opacity-30"
          >
            Up
          </button>
          <button
            type="button"
            onClick={() => move(itemIndex, itemIndex + 1)}
            disabled={itemIndex === fields.length - 1}
            className="text-xs text-typography-600 disabled:opacity-30"
          >
            Down
          </button>
          {fields.length > 2 && (
            <button
              type="button"
              onClick={() => remove(itemIndex)}
              className="text-destructive-500 hover:text-destructive-600"
            >
              <Trash className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => append({ id: newItemId(), text: "" })}
        className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 w-fit"
      >
        <Plus className="w-4 h-4" />
        Add item
      </button>
    </div>
  );
};
