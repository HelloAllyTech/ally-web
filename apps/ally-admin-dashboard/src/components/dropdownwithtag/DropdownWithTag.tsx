import { useEffect, useRef, useState } from "react";

import { createPortal } from "react-dom";

import { ArrowSolid, Close } from "@assets";
import { en } from "@constants";
import { useCreatePortal } from "@hooks";
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
  const triggerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  const dropdownPosition = useCreatePortal(triggerRef, open, {
    matchTriggerWidth: true,
    dropdownHeight: 180,
  });

  //close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current?.contains(target) || portalRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
        <div className="flex flex-wrap gap-x-1 text-base text-neutral-800">
          {en.userManagement.currentRoles}
          {initialValue.map((roleName, index) => (
            <span key={roleName} className="text-typography-800">
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
        <div className="relative" ref={triggerRef}>
          <div
            className="border border-border-light rounded-md flex items-center gap-2 px-2 py-1 min-h-[40px] cursor-pointer"
            onClick={() => setOpen(!open)}
          >
            <div className="flex flex-1 min-w-0 flex-wrap items-center gap-1.5 py-0.5">
              {value.length > 0 ? (
                value.map(roleName => (
                  <span
                    key={roleName}
                    className="flex max-w-full items-center bg-neutral-100 text-typography-900 pl-3 rounded-full text-base font-primary"
                  >
                    <span className="truncate">{formatCapitalizedEnum(roleName)}</span>
                    <button
                      className="px-2 flex-shrink-0"
                      onClick={e => handleClose(e, roleName)}
                      aria-label={en.userManagement.removeRole(formatCapitalizedEnum(roleName))}
                    >
                      <Close />
                    </button>
                  </span>
                ))
              ) : (
                <span className="text-typography-600 text-base font-primary">{placeholder}</span>
              )}
            </div>

            <div className="flex-shrink-0 text-typography-800">
              <ArrowSolid />
            </div>
          </div>
        </div>
      </div>

      {open &&
        dropdownPosition &&
        createPortal(
          <div
            ref={portalRef}
            className="fixed bg-white border rounded-md shadow-lg max-h-[180px] overflow-auto z-[9999] custom-scrollbar"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
            }}
          >
            {options?.map(role => {
              const roleName = role.name || role.value;
              const isSelected = value.includes(roleName);

              return (
                <div
                  key={role.id || role.value}
                  className={`px-3 py-2 text-sm cursor-pointer font-primary ${isSelected ? "bg-neutral-100" : ""}`}
                  onClick={() => toggleRole(role)}
                >
                  {formatCapitalizedEnum(roleName)}
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
};
