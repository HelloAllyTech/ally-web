import { FC } from "react";

import { en } from "@constants";
import { AccessFilterValue } from "@types";

interface AccessFilterProps {
  value: AccessFilterValue;
  onChange: (value: AccessFilterValue) => void;
}

export const AccessFilter: FC<AccessFilterProps> = ({ value, onChange }) => {
  const options: { value: AccessFilterValue; label: string }[] = [
    { value: AccessFilterValue.ALL, label: en.userManagement.all },
    { value: AccessFilterValue.ENABLED, label: en.userManagement.enabled },
    { value: AccessFilterValue.DISABLED, label: en.userManagement.disabled },
  ];

  return (
    <div
      role="group"
      aria-label={en.userManagement.filterByAccess}
      className="flex items-center flex-shrink-0 rounded-md border border-border overflow-hidden"
    >
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`px-3 py-2 text-sm transition-colors ${
            value === option.value
              ? "bg-background-secondary text-typography-900 font-medium"
              : "text-typography-600 hover:text-typography-900"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};
