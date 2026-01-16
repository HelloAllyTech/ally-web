import { FC, Fragment, useEffect, useRef } from "react";

import { UseFormReturn } from "react-hook-form";

import { ExperienceMode, ChecklistType, FORM_FIELD_IDS } from "@constants";
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
  const experienceMode = formMethods.watch(FORM_FIELD_IDS.EXPERIENCE_MODE);
  const checklistType = formMethods.watch(FORM_FIELD_IDS.CHECKLIST_TYPE);
  const checklistTypeRef = useRef<HTMLDivElement>(null);

  // Auto-scroll and set default checklistType when experienceMode changes to CHECKLIST
  useEffect(() => {
    if (experienceMode === ExperienceMode.CHECKLIST) {
      // Set default value to GUIDED if checklistType is not already set
      if (!checklistType) {
        formMethods.setValue(FORM_FIELD_IDS.CHECKLIST_TYPE, ChecklistType.GUIDED);
      }
      // Scroll to checklistType field
      if (checklistTypeRef.current) {
        setTimeout(() => {
          checklistTypeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 0);
      }
    }
  }, [experienceMode, checklistType, formMethods]);

  // Filter fields based on conditions
  const shouldRenderField = (field: FormFieldConfig) => {
    // Only render checklistType when experienceMode is "CHECKLIST"
    if (field.id === FORM_FIELD_IDS.CHECKLIST_TYPE && experienceMode !== ExperienceMode.CHECKLIST) {
      return false;
    }
    return true;
  };

  return (
    <div className="flex flex-row flex-wrap gap-5 w-[60%] min-w-[500px]">
      {items?.map(item => {
        if (!shouldRenderField(item)) {
          return null;
        }
        return (
          <Fragment key={item.id}>
            {item.isDashedLineAbove && (
              <div className="border-t border-dashed border-border-light w-full mb-6" />
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
