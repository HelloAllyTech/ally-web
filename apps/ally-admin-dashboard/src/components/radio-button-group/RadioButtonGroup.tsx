import { FC, useEffect } from "react";

import { UseFormReturn } from "react-hook-form";

export interface RadioButtonGroupProps {
  label: string;
  id: string;
  options: Array<{ value: string; label: string }>;
  formMethods: UseFormReturn<any>;
  isMandatory?: boolean;
}

export const RadioButtonGroup: FC<RadioButtonGroupProps> = ({
  label,
  id,
  options,
  formMethods,
  isMandatory,
}) => {
  const { watch, setValue } = formMethods;
  const selectedValue = watch(id);

  const handleChange = (value: string) => {
    setValue(id, value);
  };

  useEffect(() => {
    if (options.length > 0 && (selectedValue === undefined || selectedValue === "")) {
      setValue(id, options[0].value);
    }
  }, [id, options, selectedValue, setValue]);

  return (
    <div className="flex flex-col gap-3 w-full">
      <label className="text-typography-900 text-base cursor-pointer flex items-center gap-1">
        {label}
        {isMandatory && <span className="text-destructive-500">*</span>}
      </label>
      <div className="flex flex-col gap-2">
        {options.map(option => (
          <div key={option.value} className="flex items-center gap-2">
            <input
              type="radio"
              id={`${id}-${option.value}`}
              name={id}
              value={option.value}
              checked={selectedValue === option.value}
              onChange={() => handleChange(option.value)}
              className="w-4 h-4 cursor-pointer"
            />
            <label
              htmlFor={`${id}-${option.value}`}
              className="cursor-pointer text-typography-700 text-base"
            >
              {option.label}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};
