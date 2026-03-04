import { FC } from "react";

import { AUTOFILL_MODEL_OPTIONS } from "@constants";

interface AutofillModelSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const AutofillModelSelect: FC<AutofillModelSelectProps> = ({
  value,
  onChange,
  disabled = false,
}) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    disabled={disabled}
    className="text-sm border rounded-md px-2 py-1 text-typography-800 bg-white border-border-light cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {AUTOFILL_MODEL_OPTIONS.map(opt => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
);
