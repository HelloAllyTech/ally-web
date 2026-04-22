import { FC } from "react";

import { useGetAutofillModelsQuery } from "@api";
import { DEFAULT_AUTOFILL_MODEL, FALLBACK_AUTOFILL_MODEL_OPTIONS } from "@constants";
import { AutofillModelOption } from "@types";

interface AutofillModelSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const AutofillModelSelect: FC<AutofillModelSelectProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const { data: models, isLoading } = useGetAutofillModelsQuery();
  const options: AutofillModelOption[] =
    models?.length > 0 ? models : [...FALLBACK_AUTOFILL_MODEL_OPTIONS];
  const effectiveValue = options.some(opt => opt.value === value) ? value : DEFAULT_AUTOFILL_MODEL;

  const openaiOptions = options.filter(opt => opt.provider === "openai");
  const anthropicOptions = options.filter(opt => opt.provider === "anthropic");

  return (
    <select
      value={effectiveValue}
      onChange={e => onChange(e.target.value)}
      disabled={disabled || isLoading}
      className="text-sm border rounded-md px-2 py-1 text-typography-800 bg-white border-border-light cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      title={isLoading ? "Loading models..." : undefined}
    >
      {openaiOptions.length > 0 && (
        <optgroup label="OpenAI">
          {openaiOptions.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </optgroup>
      )}
      {anthropicOptions.length > 0 && (
        <optgroup label="Anthropic">
          {anthropicOptions.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
};
