import { FC, Fragment } from "react";

import { UseFormReturn } from "react-hook-form";

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
  return (
    <div className="flex flex-row flex-wrap gap-5 w-[60%] min-w-[500px]">
      {items?.map(item => (
        <Fragment key={item.id}>
          {item.isDashedLineAbove && (
            <div className="border-t border-dashed border-border-light w-full mb-6" />
          )}
          <div className={item.fullWidth ? "w-full" : "w-[48%]"}>
            <FormField config={item} formMethods={formMethods} />
          </div>
        </Fragment>
      ))}
    </div>
  );
};
