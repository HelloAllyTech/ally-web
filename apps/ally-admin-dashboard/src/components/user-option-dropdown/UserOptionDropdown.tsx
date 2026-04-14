import { useEffect, useRef, useState, useMemo } from "react";

import { createPortal } from "react-dom";

import { UserMenuOptions, UserRole, userEditMenu, userStatus } from "@constants";
import { UserListUser } from "@types";

interface UserOptionDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onOptionSelect: (option: string) => void;
  anchorElement?: HTMLElement | null;
  user: UserListUser;
}

export const UserOptionDropdown: React.FC<UserOptionDropdownProps> = ({
  isOpen,
  onClose,
  onOptionSelect,
  user,
  anchorElement,
}) => {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !anchorElement) {
      setPosition(null);
      return undefined;
    }

    const updatePosition = () => {
      const rect = anchorElement.getBoundingClientRect();
      const dropdownWidth = 220;
      const dropdownHeight = dropdownRef.current?.offsetHeight || 200;

      // Calculate position
      let top = rect.bottom + 8; // 8px gap below the button
      let left = rect.right - dropdownWidth; // Align right edge with button
      // Adjust if dropdown goes off-screen (bottom)
      if (top + dropdownHeight > window.innerHeight) {
        top = rect.top - dropdownHeight - 8; // Show above the button
      }
      // Adjust if dropdown goes off-screen (left)
      if (left < 8) {
        left = 8;
      }
      // Adjust if dropdown goes off-screen (right)
      if (left + dropdownWidth > window.innerWidth - 8) {
        left = window.innerWidth - dropdownWidth - 8;
      }

      setPosition({ top, left });
    };

    // Use requestAnimationFrame to ensure position is calculated before render
    requestAnimationFrame(() => {
      updatePosition();
    });

    // Update position on scroll or resize
    const handleScroll = () => updatePosition();
    const handleResize = () => updatePosition();

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen, anchorElement]);

  const filteredOptionList = useMemo(() => {
    return userEditMenu.filter(item => {
      switch (item) {
        case UserMenuOptions.MANAGE_CREDITS:
          return (
            user?.roles?.some(role => role === UserRole.LEARNER) &&
            user?.status === userStatus.ACTIVE
          );
        case UserMenuOptions.IMPERSONATE_USER:
          return (
            user?.roles?.some(role => role !== UserRole.MULTI_TENANT_ADMIN) &&
            user?.status === userStatus.ACTIVE
          );
        case UserMenuOptions.GRANT_ACCESS:
          return user?.status !== userStatus.ACTIVE;
        case UserMenuOptions.SUSPEND_USER:
          return user?.status === userStatus.ACTIVE;
        case UserMenuOptions.CHANGE_ROLE:
          return user?.status === userStatus.ACTIVE;
      }
      return true;
    });
  }, [user?.status, user?.roles]);

  if (!isOpen) return null;

  const handleOptionClick = (option: string) => {
    onClose();
    onOptionSelect(option);
  };

  // Don't render until position is calculated to prevent flashing
  if (!position) return null;

  const dropdown = (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div
        ref={dropdownRef}
        className="fixed font-primary w-[220px] bg-white border border-border-light shadow-[0_4px_12px_rgba(0,0,0,0.08)] rounded-xl py-2 z-50 text-sm"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        {filteredOptionList?.map((filteredOption, index) => (
          <div
            key={filteredOption}
            className={`px-4 py-2 cursor-pointer hover:bg-background-secondary transition-colors ${
              index !== filteredOptionList.length - 1 ? "border-b border-neutral-100" : ""
            } ${filteredOption === UserMenuOptions.SUSPEND_USER ? "text-destructive-500" : "text-black"}`}
            onClick={() => handleOptionClick(filteredOption)}
          >
            {filteredOption}
          </div>
        ))}
      </div>
    </>
  );

  return createPortal(dropdown, document.body);
};
