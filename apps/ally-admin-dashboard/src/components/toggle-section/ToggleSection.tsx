import { UseFormReturn, useController } from "react-hook-form";

import { en } from "@constants";

import { ToggleSwitch } from "../toggle-switch";

interface ToggleSectionProps {
  label: string;
  name: string;
  formMethods: UseFormReturn<any>;
}

export const ToggleSection = ({ label, name, formMethods }: ToggleSectionProps) => {
  const {
    field: { value, onChange },
  } = useController({
    name,
    control: formMethods.control,
  });

  return (
    <div className="flex justify-between items-center py-2 w-full">
      <span className="font-regular text-base text-typography-900">{label}</span>
      <span className="flex gap-3 text-base">
        <ToggleSwitch enabled={!!value} onChange={onChange} label={label} />
        {value ? en.common.enabled : en.common.disabled}
      </span>
    </div>
  );
};
