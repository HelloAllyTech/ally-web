import React, { useState } from "react";

import { CustomImage } from "@ally-ui-mono/ui-shared";
import { StatusBadge, UserOptionDropdown } from "@components";
import { UserRole, en } from "@constants";
import { UserListProps, UserListUser } from "@types";
import { formatCapitalizedEnum, isNumber } from "@utils";

export const UserList: React.FC<UserListProps> = ({
  users,
  formatDate,
  onOptionSelect,
  renderFooter,
}) => {
  const [openDropdownUserId, setOpenDropdownUserId] = useState<number | null>(null);
  const [anchorElement, setAnchorElement] = useState<HTMLButtonElement | null>(null);

  const toggleDropdown = (userId: number, event: React.MouseEvent<HTMLButtonElement>) => {
    if (openDropdownUserId === userId) {
      setOpenDropdownUserId(null);
      setAnchorElement(null);
    } else {
      setOpenDropdownUserId(userId);
      setAnchorElement(event.currentTarget);
    }
  };

  const handleOptionSelect = (option: string, user: UserListUser) => {
    onOptionSelect?.(option, user);
    setOpenDropdownUserId(null);
    setAnchorElement(null);
  };

  const onCloseUserDropdown = () => {
    setOpenDropdownUserId(null);
    setAnchorElement(null);
  };

  const tableHeader = (
    <div className="grid [grid-template-columns:repeat(48,minmax(0,1fr))] px-4 py-2 mr-[12px]  text-base text-typography-800 border-b border-border-light ">
      <div className="col-span-11">{en.userManagement.user}</div>
      <div className="col-span-6 pr-1">{en.userManagement.telephonyId}</div>
      <div className="col-span-8 pr-5">{en.userManagement.role}</div>
      <div className="col-span-8 pr-5">{en.userManagement.organization}</div>
      <div className="col-span-4 pr-1">{en.userManagement.credits}</div>
      <div className="col-span-6 pr-1">{en.userManagement.addedOn}</div>
      <div className="col-span-5 pr-1">{en.userManagement.status}</div>
    </div>
  );

  return (
    <div className="w-full overflow-x-auto text-sm text-typography-800 custom-scrollbar">
      <div className="min-w-[900px]">
        {tableHeader}

        <div className="h-[calc(100vh-270px)] overflow-y-auto custom-scrollbar">
          {users.map(user => (
            <div
              key={user.id}
              className="grid [grid-template-columns:repeat(48,minmax(0,1fr))] items-center px-4 py-3 text-typography-900 border-b border-border-light hover:bg-background-secondary relative"
            >
              <div className="col-span-11 justify-start flex items-center min-w-0 overflow-hidden ">
                <div className="w-10 h-10 rounded-full mr-3">
                  <CustomImage
                    src={user.profileImageUrl}
                    alt="user"
                    className="rounded-full mr-3"
                    fallbackClassName="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-typography-600"
                    fallbackText={user.name?.slice(0, 1)?.toUpperCase() ?? "NA"}
                  />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-typography-900 pr-5">{user.name}</div>
                  <div className="text-typography-800 truncate pr-5 ">{user.email}</div>
                </div>
              </div>
              <div className="col-span-6 px-1">{user.externalId}</div>
              <div className="col-span-8 pr-5 whitespace-nowrap truncate">
                {user.roles?.length
                  ? user.roles.map(role => formatCapitalizedEnum(role)).join(", ")
                  : user.role
                    ? formatCapitalizedEnum(user.role)
                    : "--"}
              </div>
              <div className="col-span-8 pr-5 whitespace-nowrap truncate">
                {user.organization ?? "--"}
              </div>
              <div className="col-span-4 pr-1">
                {isNumber(user.consumedCredits) &&
                isNumber(user.creditLimit) &&
                user.roles.includes(UserRole.LEARNER)
                  ? `${user.consumedCredits}/${user.creditLimit} min`
                  : "--"}
              </div>

              <div className="col-span-6 pr-1">{formatDate(user.createdAt)}</div>
              <div className="col-span-5 pr-1  flex items-center justify-between w-full min-w-[100px]">
                <StatusBadge status={user.status} />
                <button
                  className="text-typography-800 hover:text-typography-900"
                  onClick={e => toggleDropdown(user.id, e)}
                >
                  ⋮
                </button>
                {openDropdownUserId === user.id && (
                  <UserOptionDropdown
                    isOpen
                    onClose={onCloseUserDropdown}
                    user={user}
                    onOptionSelect={option => handleOptionSelect(option, user)}
                    anchorElement={anchorElement}
                  />
                )}
              </div>
            </div>
          ))}
          {renderFooter?.()}
        </div>
      </div>
    </div>
  );
};
