import { FC } from "react";

import { ARTIFACT_SWATCH_ORDER, ARTIFACT_SWATCHES } from "@ally-ui-mono/ui-shared";
import { Plus, Trash } from "@assets";
import { MAX_ANNOTATION_LABELS, MIN_ANNOTATION_LABELS } from "@constants";
import { AnnotationLabelDef } from "@types";

interface AnnotationLabelsEditorProps {
  labels: AnnotationLabelDef[];
  onChange: (labels: AnnotationLabelDef[]) => void;
  /** Removing a label must also drop its answer marks. */
  onRemoveLabel: (labelId: string) => void;
  disabled?: boolean;
}

const inputClass =
  "w-full border border-border-light rounded-md px-3 py-2 text-sm outline-none focus:border-primary-400 disabled:opacity-60";

/**
 * The "what to look for" list. Capped at eight because each label owns one of
 * the eight swatches — beyond that they stop being distinguishable at a glance,
 * which is the whole point of marking by colour.
 */
export const AnnotationLabelsEditor: FC<AnnotationLabelsEditorProps> = ({
  labels,
  onChange,
  onRemoveLabel,
  disabled = false,
}) => {
  const canAdd = labels.length < MAX_ANNOTATION_LABELS;
  const canRemove = labels.length > MIN_ANNOTATION_LABELS;

  const update = (index: number, patch: Partial<AnnotationLabelDef>) => {
    onChange(labels.map((label, i) => (i === index ? { ...label, ...patch } : label)));
  };

  const addLabel = () => {
    const used = new Set(labels.map(label => label.color));
    const color = ARTIFACT_SWATCH_ORDER.find(swatch => !used.has(swatch)) ?? "amber";
    onChange([...labels, { id: crypto.randomUUID(), text: "", description: "", color }]);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-typography-800">
          What to look for ({labels.length}/{MAX_ANNOTATION_LABELS})
        </label>
      </div>
      <p className="text-xs text-typography-500 -mt-2">
        Learners pick one of these, then tap the lines where they see it.
      </p>

      {labels.map((label, index) => (
        <div
          key={label.id}
          className="border border-border-light rounded-md p-3 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-typography-600">Label {index + 1}</span>
            {canRemove && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRemoveLabel(label.id)}
                className="text-destructive-500 hover:text-destructive-600 disabled:opacity-50"
                aria-label={`Remove label ${label.text || index + 1}`}
              >
                <Trash className="w-4 h-4" />
              </button>
            )}
          </div>

          <input
            value={label.text}
            disabled={disabled}
            onChange={event => update(index, { text: event.target.value })}
            placeholder="e.g. Missed risk cue"
            className={inputClass}
          />

          <input
            value={label.description ?? ""}
            disabled={disabled}
            onChange={event => update(index, { description: event.target.value })}
            placeholder="Optional hint shown to the learner on hover"
            className={inputClass}
          />

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-typography-700">Colour</span>
            <div className="flex flex-wrap gap-1.5">
              {ARTIFACT_SWATCH_ORDER.map(swatch => {
                const taken = labels.some((other, i) => i !== index && other.color === swatch);
                const selected = label.color === swatch;
                return (
                  <button
                    key={swatch}
                    type="button"
                    disabled={disabled || taken}
                    onClick={() => update(index, { color: swatch })}
                    aria-label={swatch}
                    aria-pressed={selected}
                    title={taken ? `${swatch} — already used` : swatch}
                    className="h-6 w-6 rounded-md border-2 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-25"
                    style={{
                      background: ARTIFACT_SWATCHES[swatch].solid,
                      borderColor: selected ? "#111827" : "transparent",
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addLabel}
        disabled={disabled || !canAdd}
        className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 disabled:opacity-40 w-fit"
      >
        <Plus className="w-4 h-4" />
        Add label
      </button>
    </div>
  );
};
