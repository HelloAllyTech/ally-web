import React, { useMemo } from "react";

import { useGetPromptsByTypeQuery } from "@api";

import { CustomDropdownField } from "../custom-dropdown-field";
import { FormLabel } from "../form-label";

interface EvaluatorPromptPickerProps {
  /** Currently selected evaluator variant promptCode (or undefined). */
  value?: string;
  /** Called with the chosen variant's promptCode when the user picks one. */
  onChange: (promptCode: string) => void;
  /** Display label shown above the dropdown. */
  label?: string;
}

/**
 * Picks the transcript-evaluator prompt variant a report is scored with. Pulls
 * the list from `GET /prompts/by-type/transcript_evaluator` (the base evaluator
 * prompt + any variants duplicated in prompt management) and renders a dropdown.
 *
 * The evaluator is the LLM-as-judge that scores the simulated transcript and
 * writes the report markdown — distinct from the counselor/report-generation
 * prompt that drives the conversation. The selected value is the prompt's
 * `promptCode`, persisted into `metadata.selectedEvaluatorPromptCode` via the
 * normal save-simulation flow and snapshotted into the report config at
 * generation time. ai-learn resolves the matching variant's (dashboard-edited)
 * text; when unset, it falls back to the default evaluator template.
 *
 * Renders nothing until at least one transcript_evaluator prompt exists, so the
 * report page stays unchanged in environments where the prompt hasn't synced.
 *
 * Variants switched off in Prompt Management (`visibleInStudio: false`) are
 * dropped, except the one this report is already configured with — it stays,
 * marked "(hidden)", so an existing configuration is never silently reassigned.
 * Hiding governs future selections only; a report already pointing at a hidden
 * evaluator keeps being scored by it.
 */
export const EvaluatorPromptPicker: React.FC<EvaluatorPromptPickerProps> = ({
  value,
  onChange,
  label = "Transcript evaluator",
}) => {
  const { data: prompts } = useGetPromptsByTypeQuery("transcript_evaluator");

  // `visibleInStudio === false` is the only hiding signal — undefined means
  // visible, so rows predating the flag still appear.
  const options = useMemo(
    () =>
      (prompts ?? [])
        .filter(prompt => prompt.visibleInStudio !== false || prompt.promptCode === value)
        .map(prompt => ({
          label: prompt.visibleInStudio === false ? `${prompt.name} (hidden)` : prompt.name,
          value: prompt.promptCode,
        })),
    [prompts, value],
  );

  if (options.length === 0) return null;

  const selected = value ? (options.find(o => o.value === value) ?? null) : null;

  return (
    <div className="flex flex-col gap-2">
      <FormLabel>{label}</FormLabel>
      <CustomDropdownField
        options={options}
        placeholder="Default evaluator"
        defaultOption={selected}
        onHandleSelect={option => onChange(option.value)}
      />
    </div>
  );
};
