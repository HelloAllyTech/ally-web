import { UseFormReturn, useController } from "react-hook-form";

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
      <span className="text-lg font-medium text-typography-900">{label}</span>
      <ToggleSwitch enabled={!!value} onChange={onChange} label={label} />
    </div>
  );
};
