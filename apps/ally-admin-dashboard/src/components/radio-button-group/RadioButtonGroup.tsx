import { FC, useEffect } from "react";

import { UseFormReturn } from "react-hook-form";

export interface RadioButtonGroupProps {
  label: string;
  id: string;
  options: Array<{ value: string; label: string }>;
  formMethods: UseFormReturn<any>;
  isMandatory?: boolean;
  /** Auto-selected when the field is unset. Falls back to `options[0]`. */
  defaultValue?: string;
  /**
   * Fires only from a real user click (see `handleChange`) — never from the
   * unset-value default below, and never from a `formMethods.reset(...)`
   * hydration, since neither of those goes through this handler.
   */
  onChange?: (value: string) => void;
}

export const RadioButtonGroup: FC<RadioButtonGroupProps> = ({
  label,
  id,
  options,
  formMethods,
  isMandatory,
  defaultValue,
  onChange,
}) => {
  const { watch, setValue } = formMethods;
  const selectedValue = watch(id);

  const handleChange = (value: string) => {
    setValue(id, value);
    onChange?.(value);
  };

  useEffect(() => {
    if (options.length > 0 && (selectedValue === undefined || selectedValue === "")) {
      setValue(id, defaultValue ?? options[0].value);
    }
  }, [id, options, selectedValue, setValue, defaultValue]);

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
