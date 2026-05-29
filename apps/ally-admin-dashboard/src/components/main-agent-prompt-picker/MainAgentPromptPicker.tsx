import React, { useMemo } from "react";

import { UseFormReturn } from "react-hook-form";

import { useGetPromptsByTypeQuery } from "@api";

import { DropdownField } from "../dropdown-field";

interface MainAgentPromptPickerProps {
  /** Field id in the simulation form (e.g. "selectedMainPromptCode"). */
  id: string;
  /** Display label shown above the dropdown. */
  label: string;
  /** Shared RHF form methods from the parent simulation form. */

  formMethods: UseFormReturn<any>;
  /** Whether the field is required to save (warning) / run (block). */
  isMandatory?: boolean;
}

/**
 * Picks the main-agent prompt variant for the simulation. Pulls the list
 * from `GET /prompts/by-type/main_agent` and renders a deselectable
 * dropdown wired to RHF via DropdownField.
 *
 * The selected value is the prompt's `promptCode` (string), which the
 * scenario service persists into `metadata.selectedMainPromptCode`. The
 * ai-learn runtime resolves the matching prompt at session start; when
 * unset, it falls back to the default main_agent prompt.
 *
 * Variants share the same branching + multilingual prompts — those are
 * not selectable here.
 */
export const MainAgentPromptPicker: React.FC<MainAgentPromptPickerProps> = ({
  id,
  label,
  formMethods,
  isMandatory = false,
}) => {
  const { data: prompts, isFetching } = useGetPromptsByTypeQuery("main_agent");

  const options = useMemo(
    () =>
      (prompts ?? []).map(prompt => ({
        label: prompt.name,
        value: prompt.promptCode,
      })),
    [prompts],
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between">
        <label className="text-typography-900 text-base cursor-pointer flex items-center gap-1">
          {label} {isMandatory && <span className="text-destructive-500">*</span>}
        </label>
        {isFetching && <span className="text-sm text-typography-600">Loading variants…</span>}
      </div>
      <DropdownField
        id={id}
        label={label}
        formMethods={formMethods}
        options={options}
        placeholder="Default main agent prompt"
        allowDeselect
        isMandatory={isMandatory}
      />
    </div>
  );
};
