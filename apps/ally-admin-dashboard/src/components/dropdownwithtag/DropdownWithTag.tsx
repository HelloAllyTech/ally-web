import { useState } from "react";

import { ArrowSolid, Close } from "@assets";
import { dropdownWithTagProps, Option, UserRoles } from "@types";
import { formatCapitalizedEnum } from "@utils";

export const DropdownwithTag: React.FC<dropdownWithTagProps> = ({
  label,
  options,
  value = [],
  onChange,
}) => {
  const [open, setOpen] = useState(false);

  const toggleRole = (role: UserRoles | Option) => {
    if (!onChange) return;
    const roleName = "name" in role ? role.name : role.value;
    if (value.includes(roleName)) {
      onChange(value.filter(val => val !== roleName));
    } else {
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
    <div className="w-full" onClick={() => setOpen(!open)}>
      <label className="block text-gray-800 mb-2 font-['Replay_Pro'] text-sm">{label}</label>
      <div className="relative">
        <div
          className="border border-gray-200 rounded-md flex flex-wrap items-center gap-2 px-2 py-1 min-h-[40px] cursor-pointer"
          onClick={() => setOpen(!open)}
        >
          {value.map(roleName => (
            <span
              key={roleName}
              className="flex items-center bg-gray-100 text-gray-700 pl-3 rounded-full text-sm"
            >
              {formatCapitalizedEnum(roleName)}
              <button className="px-2" onClick={e => handleClose(e, roleName)}>
                <Close />
              </button>
            </span>
          ))}
          <div className="ml-auto text-gray-500">
            <ArrowSolid />
          </div>
        </div>

        {open && (
          <div className="absolute left-0 top-full mt-1 w-full bg-white border rounded-md shadow-lg max-h-[180px] overflow-auto">
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
  );
};
