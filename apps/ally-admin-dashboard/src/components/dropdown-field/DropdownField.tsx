import { useCallback, useRef, useState } from "react";

import { Controller } from "react-hook-form";

import { ArrowSolid } from "@assets";
import { DropdownFieldProps } from "@components/types";
import { en } from "@constants";
import { useClickOutside } from "@hooks";

export const DropdownField: React.FC<DropdownFieldProps> = ({
  label,
  id,
  formMethods,
  options,
  placeholder = en.common.selectOption,
  isMandatory = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => setIsOpen(false), []);
  useClickOutside(dropdownRef, handleClose);

  const { control, getValues } = formMethods;

  const handleSelect = (field: any, value: string) => {
    field.onChange(value);
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col gap-2" ref={dropdownRef}>
      <div className="relative">
        <Controller
          name={id}
          control={control}
          defaultValue={getValues?.(id) ?? ""}
          rules={{ required: isMandatory ? `${label} is required` : false }}
          render={({ field }) => {
            const selected = options.find(o => o.value === field.value);
            return (
              <>
                <div
                  className="w-full rounded border border-border-light px-3 py-2 bg-white text-sm cursor-pointer flex items-center justify-between focus-within:ring-1 focus-within:ring-primary"
                  onClick={() => setIsOpen(prev => !prev)}
                >
                  <span className={selected ? "text-typography-700" : "text-typography-400"}>
                    {selected ? selected.label : placeholder}
                  </span>
                  <span
                    className={`text-typography-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  >
                    <ArrowSolid />
                  </span>
                </div>

                {isOpen && (
                  <div className="absolute left-0 top-full mt-1 w-full bg-white border rounded-md shadow-lg max-h-[240px] overflow-auto z-10">
                    {options.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-typography-400">
                        {en.common.noOptionsAvailable}
                      </div>
                    ) : (
                      options.map(opt => (
                        <div
                          key={opt.value}
                          className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                            opt.value === field.value
                              ? "bg-primary-50 text-primary font-medium"
                              : "text-typography-700 hover:bg-background-secondary"
                          }`}
                          onClick={() => handleSelect(field, opt.value)}
                        >
                          <div className="flex items-center justify-between text-base">
                            <span>{opt.label}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            );
          }}
        />
      </div>
    </div>
  );
};
