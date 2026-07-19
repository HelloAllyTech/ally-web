import { FC } from "react";

import { Select, SelectItem, SelectItemGroup } from "@ally-ui-mono/ui-shared";
import { useGetAutofillModelsQuery } from "@api";
import { DEFAULT_AUTOFILL_MODEL, FALLBACK_AUTOFILL_MODEL_OPTIONS } from "@constants";
import { AutofillModelOption } from "@types";

interface AutofillModelSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Extra classes forwarded to the Select (e.g. width constraints). */
  className?: string;
}

export const AutofillModelSelect: FC<AutofillModelSelectProps> = ({
  value,
  onChange,
  disabled = false,
  className = "",
}) => {
  const { data: models, isLoading } = useGetAutofillModelsQuery();
  const options: AutofillModelOption[] =
    models?.length > 0 ? models : [...FALLBACK_AUTOFILL_MODEL_OPTIONS];
  const effectiveValue = options.some(opt => opt.value === value) ? value : DEFAULT_AUTOFILL_MODEL;

  const openaiOptions = options.filter(opt => opt.provider === "openai");
  const anthropicOptions = options.filter(opt => opt.provider === "anthropic");

  return (
    <Select
      id="autofill-model-select"
      labelText="Autofill model"
      hideLabel
      value={effectiveValue}
      onChange={e => onChange(e.target.value)}
      disabled={disabled || isLoading}
      className={className}
      title={isLoading ? "Loading models..." : undefined}
    >
      {openaiOptions.length > 0 && (
        <SelectItemGroup label="OpenAI">
          {openaiOptions.map(opt => (
            <SelectItem key={opt.value} value={opt.value} text={opt.label} />
          ))}
        </SelectItemGroup>
      )}
      {anthropicOptions.length > 0 && (
        <SelectItemGroup label="Anthropic">
          {anthropicOptions.map(opt => (
            <SelectItem key={opt.value} value={opt.value} text={opt.label} />
          ))}
        </SelectItemGroup>
      )}
    </Select>
  );
};
