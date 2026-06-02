import { FC, Fragment, useEffect, useRef } from "react";

import { UseFormReturn } from "react-hook-form";

import { FORM_FIELD_IDS, SESSION_TIMER_CONFIG } from "@constants";
import { useCanUseSelectablePrompts } from "@hooks";
import { FormFieldConfig } from "@types";

import { FormField } from "./FormField";

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
  // Allowlist gate for the main-agent variant picker. The field config
  // always declares the picker; here we drop it from the rendered list
  // for users who aren't on the testing allowlist so they keep the
  // legacy default-Prompt-#1 experience without a blank w-full slot.
  const canUseSelectablePrompts = useCanUseSelectablePrompts();

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

  // Filter fields based on conditions
  const shouldRenderField = (field: FormFieldConfig) => {
    // Drop the selectable-main-agent-prompt picker for users not on the
    // allowlist. Done at this layer (rather than self-hide inside the
    // picker component) so the wrapping w-full <div> in the form
    // doesn't leave a blank row.
    if (field.id === FORM_FIELD_IDS.SELECTED_MAIN_PROMPT_CODE && !canUseSelectablePrompts) {
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
    <div className="flex flex-row flex-wrap gap-5 w-[60%] min-w-[930px]">
      {items?.map(item => {
        if (!shouldRenderField(item)) {
          return null;
        }
        return (
          <Fragment key={item.id}>
            {item.isDashedLineAbove && (
              <div className="border-t border-dashed border-border-light w-full" />
            )}
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
