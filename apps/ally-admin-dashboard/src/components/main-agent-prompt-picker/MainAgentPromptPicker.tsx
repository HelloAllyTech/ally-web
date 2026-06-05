import React, { useEffect, useMemo } from "react";

import { UseFormReturn } from "react-hook-form";

import { useGetPromptsByTypeQuery } from "@api";
import { DEFAULT_MAIN_AGENT_PROMPT_CODE } from "@constants";

import { DropdownField } from "../dropdown-field";
import { FormLabel } from "../form-label";

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

  // Subscribe to the field value so this re-runs whenever it changes —
  // crucially after the parent form's reset() (when editing a scenario that
  // loaded without a saved selectedMainPromptCode). Keying the effect only
  // on `options` left a race: on a warm cache the list is already populated
  // at mount, the effect ran once, and the subsequent reset() wiped the
  // value with no dependency change to re-trigger the default — so the field
  // showed "Select" until a hard refresh happened to fetch the list *after*
  // the reset. Watching the value closes that race in both orderings.
  const currentValue = formMethods.watch(id);

  // Auto-select the default prompt by its stable promptCode whenever none is chosen yet.
  useEffect(() => {
    if (options.length === 0) return;
    if (!currentValue) {
      const defaultOption =
        options.find(o => o.value === DEFAULT_MAIN_AGENT_PROMPT_CODE) ?? options[0];
      formMethods.setValue(id, defaultOption.value, { shouldDirty: false });
    }
  }, [options, id, formMethods, currentValue]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between">
        <FormLabel isMandatory={isMandatory}>{label}</FormLabel>
        {isFetching && <span className="text-sm text-typography-600">Loading variants…</span>}
      </div>
      <DropdownField
        id={id}
        label={label}
        formMethods={formMethods}
        options={options}
        isMandatory={isMandatory}
      />
    </div>
  );
};
