import { FC, ReactNode } from "react";

import { Controller, useFormContext } from "react-hook-form";

import { TextArea } from "@ally-ui-mono/ui-shared";
import { Trash } from "@assets";
import { TRACK_ITEM_TYPE_LABELS } from "@constants";
import { TrackFormValues, TrackItemType } from "@types";

import { CompletionRuleFields } from "../CompletionRuleFields";

interface ItemEditorFrameProps {
  sectionIndex: number;
  itemIndex: number;
  type: TrackItemType;
  onDelete: () => void;
  /** The type-specific content editor. */
  children: ReactNode;
  disabled?: boolean;
}

const labelClass = "text-sm font-medium text-typography-800";
const inputClass =
  "w-full border border-border-light rounded-md px-3 py-2 text-sm outline-none focus:border-primary-400 disabled:opacity-60";

/**
 * Shared chrome for every item editor: type badge, title + description, the
 * type-specific body (`children`), completion rule and a delete action.
 */
export const ItemEditorFrame: FC<ItemEditorFrameProps> = ({
  sectionIndex,
  itemIndex,
  type,
  onDelete,
  children,
  disabled = false,
}) => {
  const { control } = useFormContext<TrackFormValues>();
  const base = `sections.${sectionIndex}.items.${itemIndex}` as const;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <span className="inline-flex items-center rounded-full bg-primary-50 text-primary-600 text-xs font-medium px-3 py-1">
          {TRACK_ITEM_TYPE_LABELS[type]}
        </span>
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          className="inline-flex items-center gap-1 text-sm text-destructive-500 hover:text-destructive-600 disabled:opacity-50"
        >
          <Trash className="w-4 h-4" />
          Delete
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Title</label>
        <Controller
          control={control}
          name={`${base}.title`}
          render={({ field }) => (
            <input
              {...field}
              disabled={disabled}
              placeholder={`${TRACK_ITEM_TYPE_LABELS[type]} title`}
              className={inputClass}
            />
          )}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Description</label>
        <Controller
          control={control}
          name={`${base}.description`}
          render={({ field }) => (
            <TextArea
              id={`${base}.description`}
              labelText="Description"
              hideLabel
              {...field}
              disabled={disabled}
              rows={2}
              placeholder="Optional description shown to the learner"
              className="w-full"
            />
          )}
        />
      </div>

      {children}

      <CompletionRuleFields
        sectionIndex={sectionIndex}
        itemIndex={itemIndex}
        type={type}
        disabled={disabled}
      />
    </div>
  );
};
