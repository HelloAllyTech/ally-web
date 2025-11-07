import { useEffect, useRef, useState } from "react";

import { SelectComponentProps } from "./types";
import { keyCodes } from "./utils";

export const SelectComponent = ({
  value,
  options,
  onChange,
  onAddOption,
  placeholder = "Select an option",
  className = "",
  disabled = false,
}: SelectComponentProps) => {
  const [showSelect, setShowSelect] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const addSelectRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showAdd) {
      addSelectRef.current?.focus();
    }
  }, [showAdd]);

  const handleOptionKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === keyCodes.enter) {
      if (event.currentTarget.value !== "") {
        onAddOption?.(event.currentTarget.value, "");
      }
      setShowAdd(false);
    }
  };

  const handleAddOption = () => {
    setShowAdd(true);
  };

  const handleOptionBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    if (event.target.value !== "") {
      onAddOption?.(event.target.value, "");
    }
    setShowAdd(false);
  };

  const handleOptionSelect = (optionLabel: string) => {
    onChange(optionLabel);
    setShowSelect(false);
  };

  return (
    <div className={className}>
      <div
        className={`p-2 flex items-center flex-1 min-h-[40px] ${
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        }`}
        onClick={() => !disabled && setShowSelect(true)}
      >
        {value || placeholder}
      </div>
      {showSelect && !disabled && (
        <div className="fixed inset-0 z-10" onClick={() => setShowSelect(false)} />
      )}
      {showSelect && !disabled && (
        <div className="bg-white shadow-lg rounded-md z-4 min-w-[200px] max-w-[320px] p-2">
          <div className="flex flex-wrap -mt-2">
            {options.map((option, index) => (
              <div
                key={index}
                className="cursor-pointer mr-2 mt-2"
                onClick={() => handleOptionSelect(option.label)}
              >
                {option.label}
              </div>
            ))}
            {showAdd && (
              <div className="mr-2 mt-2 w-30 p-1 bg-neutral-200 rounded">
                <input
                  type="text"
                  className="w-full px-2 py-1 text-sm border-none outline-none bg-transparent"
                  onBlur={handleOptionBlur}
                  ref={addSelectRef}
                  onKeyDown={handleOptionKeyDown}
                />
              </div>
            )}
            <div className="cursor-pointer mr-2 mt-2" onClick={handleAddOption}>
              <span className="text-sm text-typography-500">
                <div>+</div>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
