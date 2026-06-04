import { FC, Fragment, useEffect, useMemo, useRef } from "react";

import { UseFormReturn } from "react-hook-form";

import { useGetPromptsByTypeQuery } from "@api";
import { FORM_FIELD_IDS, SESSION_TIMER_CONFIG } from "@constants";
import { FormFieldConfig } from "@types";

import { FormField } from "./FormField";
import { getAvailableVariableName } from "../../utils/availableVariables";

export interface CreateSimulationSubSectionProps {
  items: FormFieldConfig[];
  formMethods: UseFormReturn<any>;
}

export const CreateSimulationSubSection: FC<CreateSimulationSubSectionProps> = ({
  items,
  formMethods,
}) => {
  const timerMode = formMethods.watch(FORM_FIELD_IDS.TIMER_MODE);
  const checklistTypeRef = useRef<HTMLDivElement>(null);

  // Auto-set default maxTimeValue when timerMode is enabled
  useEffect(() => {
    if (timerMode) {
      // Get current maxTimeValue
      const currentMaxTime = formMethods.getValues(FORM_FIELD_IDS.MAX_TIME_VALUE);
      // Only set if not already set
      if (!currentMaxTime) {
        formMethods.setValue(FORM_FIELD_IDS.MAX_TIME_VALUE, SESSION_TIMER_CONFIG.DEFAULT_MAX_TIME);
      }
    }
  }, [timerMode, formMethods]);

  // Resolve the placeholder set referenced by the picked main-agent
  // variant ONCE per render. We use this at the parent layer (rather
  // than letting FormField self-hide via return-null) so the wrapping
  // <div className="w-[48%]"> AND any `isDashedLineAbove` divider are
  // skipped together with the field. Self-hiding inside FormField left
  // ghost gaps and orphan dashed lines because the parent had already
  // committed to rendering the wrappers.
  //
  // FormField keeps its own `hideWhenUnused` guard as defense-in-depth
  // for callsites that render it directly (without this wrapper), but
  // in this layout we want the gate enforced one level up.
  const selectedMainPromptCode = formMethods.watch(FORM_FIELD_IDS.SELECTED_MAIN_PROMPT_CODE) as
    | string
    | undefined;
  const { data: mainAgentPrompts } = useGetPromptsByTypeQuery("main_agent", {
    // Only worth the query when at least one field could be gated.
    skip: !items?.some(i => i.hideWhenUnused && i.promptVariable),
  });
  const usedPlaceholders = useMemo<Set<string> | null>(() => {
    if (!mainAgentPrompts) return null; // not loaded yet → no hiding
    if (!selectedMainPromptCode) return null; // no variant → default → no hiding
    const match = mainAgentPrompts.find(p => p.promptCode === selectedMainPromptCode);
    if (!match) return null; // variant missing (deleted / sync race) → no hiding
    return new Set((match.availableVariables ?? []).map(getAvailableVariableName));
  }, [mainAgentPrompts, selectedMainPromptCode]);

  // Filter fields based on conditions. The order matters: mandatory
  // override beats hideWhenUnused (mirrors the safety guard inside
  // FormField), and the visibleWhen predicate is checked last.
  const shouldRenderField = (field: FormFieldConfig) => {
    // Variant-driven hiding: skip the whole render (wrapper + dashed
    // line + content) when the picked variant's body doesn't reference
    // the field's placeholder. Mandatory fields are never hidden — the
    // form can't save without them.
    if (
      field.hideWhenUnused &&
      field.promptVariable &&
      !field.isMandatory &&
      usedPlaceholders !== null &&
      !usedPlaceholders.has(field.promptVariable)
    ) {
      return false;
    }
    // Check custom visibility condition
    if (field.visibleWhen) {
      const formValues = formMethods.getValues();
      return field.visibleWhen(formValues);
    }
    return true;
  };

  return (
    <div className="flex flex-row flex-wrap gap-6 w-full">
      {items?.map(item => {
        if (!shouldRenderField(item)) {
          return null;
        }
        return (
          <Fragment key={item.id}>
            <div
              ref={item.id === "checklistType" ? checklistTypeRef : null}
              className={item.fullWidth ? "w-full" : "w-[48%]"}
            >
              <FormField config={item} formMethods={formMethods} />
            </div>
          </Fragment>
        );
      })}
    </div>
  );
};
