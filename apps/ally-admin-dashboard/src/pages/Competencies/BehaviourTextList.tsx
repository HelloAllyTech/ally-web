import { FC } from "react";

import { Close } from "@assets";
import { FormLabel } from "@components";

interface BehaviourTextListProps {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
}

/**
 * Free-text behaviour editor: a label with a "+" to append rows, each row a
 * plain text input the superadmin can type anything into. No dropdown / no
 * fixed option list. Blank rows are allowed while editing and filtered out on
 * save by the parent.
 */
export const BehaviourTextList: FC<BehaviourTextListProps> = ({ label, values, onChange }) => {
  const update = (index: number, text: string) =>
    onChange(values.map((v, i) => (i === index ? text : v)));

  const add = () => onChange([...values, ""]);

  const remove = (index: number) => onChange(values.filter((_, i) => i !== index));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <FormLabel>{label}</FormLabel>
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 text-primary-500 hover:text-primary-700 text-sm"
          aria-label={`Add ${label}`}
        >
          <span className="text-lg leading-none">+</span>
          <span>Add</span>
        </button>
      </div>

      {values.length === 0 ? (
        <p className="text-sm text-typography-600">No behaviours yet. Click “Add” to add one.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {values.map((value, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={value}
                onChange={e => update(index, e.target.value)}
                placeholder="Type a behaviour…"
                className="flex-1 rounded border border-border-light px-3 py-2 bg-white text-base focus-within:ring-1 focus-within:ring-primary"
              />
              <button
                type="button"
                onClick={() => remove(index)}
                className="text-typography-600 hover:text-destructive-500 shrink-0"
                aria-label="Remove behaviour"
              >
                <Close />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
