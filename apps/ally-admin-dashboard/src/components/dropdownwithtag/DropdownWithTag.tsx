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
        <div className="flex gap-1 text-[14px] text-gray-800">
          {en.userManagement.currentRoles}
          {initialValue.map((roleName, index) => (
            <span key={roleName} className="text-gray-600">
              {formatCapitalizedEnum(roleName)}
              {index < initialValue.length - 1 ? ", " : ""}
            </span>
          ))}
        </div>
      )}

      <div className="w-full" ref={dropdownRef}>
        <label className="block text-gray-800 mb-2  font-['IBM_Plex_Serif'] text-[14px]">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <div
            className="border border-gray-200 rounded-md flex flex-wrap items-center gap-2 px-2 py-1 min-h-[40px] cursor-pointer"
            onClick={() => setOpen(!open)}
          >
            {value.length > 0 ? (
              value.map(roleName => (
                <span
                  key={roleName}
                  className="flex items-center bg-gray-100 text-gray-700 pl-3 rounded-full text-[14px]  font-['IBM_Plex_Serif']"
                >
                  {formatCapitalizedEnum(roleName)}
                  <button className="px-2" onClick={e => handleClose(e, roleName)}>
                    <Close />
                  </button>
                </span>
              ))
            ) : (
              <span className="text-gray-400 text-sm  font-['IBM_Plex_Serif']">{placeholder}</span>
            )}

            <div className="ml-auto text-gray-500">
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
                    className={`px-3 py-2 text-sm cursor-pointer ${isSelected ? "bg-gray-100" : ""}`}
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
