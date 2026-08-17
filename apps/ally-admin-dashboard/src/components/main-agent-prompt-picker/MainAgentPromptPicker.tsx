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
  /** Extra classes for the root wrapper (e.g. width when rendered inline). */
  className?: string;
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
 *
 * Variants an admin has switched off in Prompt Management (`visibleInStudio:
 * false`) are dropped from the list, with one exception: the variant this
 * simulation is ALREADY on stays, marked "(hidden)". Hiding is a
 * future-visibility switch, not a kill switch — an existing simulation must
 * keep running on its chosen skill, and dropping the option outright would
 * silently reassign it to a different skill the next time an author saved.
 */
export const MainAgentPromptPicker: React.FC<MainAgentPromptPickerProps> = ({
  id,
  label,
  formMethods,
  isMandatory = false,
  className,
}) => {
  const { data: prompts, isFetching } = useGetPromptsByTypeQuery("main_agent");

  // Subscribe to the field value so this re-runs whenever it changes —
  // crucially after the parent form's reset() (when editing a scenario that
  // loaded without a saved selectedMainPromptCode). Keying the effect only
  // on `options` left a race: on a warm cache the list is already populated
  // at mount, the effect ran once, and the subsequent reset() wiped the
  // value with no dependency change to re-trigger the default — so the field
  // showed "Select" until a hard refresh happened to fetch the list *after*
  // the reset. Watching the value closes that race in both orderings.
  const currentValue = formMethods.watch(id);

  // `visibleInStudio === false` is the only hiding signal — undefined means
  // visible, so a cached response from before the flag existed still lists
  // everything rather than emptying the dropdown.
  const options = useMemo(
    () =>
      (prompts ?? [])
        .filter(prompt => prompt.visibleInStudio !== false || prompt.promptCode === currentValue)
        .map(prompt => ({
          label: prompt.visibleInStudio === false ? `${prompt.name} (hidden)` : prompt.name,
          value: prompt.promptCode,
        })),
    [prompts, currentValue],
  );

  // True when this simulation sits on a variant that has since been switched
  // off — worth saying out loud, because the author needs to know the skill
  // still runs but is no longer on offer for anything new.
  const isOnHiddenVariant = useMemo(
    () =>
      Boolean(
        currentValue &&
          (prompts ?? []).some(
            prompt => prompt.promptCode === currentValue && prompt.visibleInStudio === false,
          ),
      ),
    [prompts, currentValue],
  );

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
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
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
      {isOnHiddenVariant && (
        <p className="text-sm text-typography-600">
          This simulation runs on a skill version that’s been switched off for new simulations. It
          keeps working exactly as before — switch away only if you want to move it.
        </p>
      )}
      {!isFetching && options.length === 0 && (
        <p className="text-sm text-typography-600">
          No skill versions are switched on. New simulations will run on the default main agent
          prompt until one is turned back on in Prompt Management.
        </p>
      )}
    </div>
  );
};
