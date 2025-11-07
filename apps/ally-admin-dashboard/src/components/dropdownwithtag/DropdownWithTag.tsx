import { useEffect, useRef, useState } from "react";

import { ArrowSolid, Close } from "@assets";
import { en } from "@constants";
import { dropdownWithTagProps, Option, UserRoles } from "@types";
import { formatCapitalizedEnum } from "@utils";

export const DropdownwithTag: React.FC<dropdownWithTagProps> = ({
  label,
  options,
  initialValue,
  onChange,
  placeholder,
  required = false,
}) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initialValue);
  const dropdownRef = useRef<HTMLDivElement>(null);

  //close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleRole = (role: UserRoles | Option) => {
    if (!onChange) return;
    const roleName = "name" in role ? role.name : role.value;
    if (value.includes(roleName)) {
      setValue(value.filter(val => val !== roleName));
      onChange(value.filter(val => val !== roleName));
    } else {
      setValue([...value, roleName]);
      onChange([...value, roleName]);
    }
  };

  const handleClose = (e: React.MouseEvent, roleName: string) => {
    e.stopPropagation();

    const role = options.find(roles =>
      "name" in roles ? roles.name === roleName : roles.value === roleName,
    );
    if (role) toggleRole(role);
  };

  return (
    <>
      {initialValue.length > 0 && (
        <div className="flex gap-1 text-base text-neutral-800">
          {en.userManagement.currentRoles}
          {initialValue.map((roleName, index) => (
            <span key={roleName} className="text-typography-500">
              {formatCapitalizedEnum(roleName)}
              {index < initialValue.length - 1 ? ", " : ""}
            </span>
          ))}
        </div>
      )}

      <div className="w-full" ref={dropdownRef}>
        <label className="block text-neutral-800 mb-2 font-primary text-base">
          {label} {required && <span className="text-destructive-500">*</span>}
        </label>
        <div className="relative">
          <div
            className="border border-border-light rounded-md flex flex-wrap items-center gap-2 px-2 py-1 min-h-[40px] cursor-pointer"
            onClick={() => setOpen(!open)}
          >
            {value.length > 0 ? (
              value.map(roleName => (
                <span
                  key={roleName}
                  className="flex items-center bg-neutral-100 text-typography-700 pl-3 rounded-full text-base font-primary"
                >
                  {formatCapitalizedEnum(roleName)}
                  <button className="px-2" onClick={e => handleClose(e, roleName)}>
                    <Close />
                  </button>
                </span>
              ))
            ) : (
              <span className="text-typography-400 text-sm font-primary">{placeholder}</span>
            )}

            <div className="ml-auto text-typography-500">
              <ArrowSolid />
            </div>
          </div>

          {open && (
            <div className="absolute left-0 top-full mt-1 w-full bg-white border rounded-md shadow-lg max-h-[180px] overflow-auto z-50">
              {options.map(role => {
                const roleName = role.name || role.value;
                const isSelected = value.includes(roleName);

                return (
                  <div
                    key={role.id || role.value}
                    className={`px-3 py-2 text-sm cursor-pointer ${isSelected ? "bg-neutral-100" : ""}`}
                    onClick={() => toggleRole(role)}
                  >
                    {formatCapitalizedEnum(roleName)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
