import React, { useState } from "react";

import { UserOptionDropdown } from "@components";
import { en, userStatus } from "@constants";
import { UserListProps, UserListUser } from "@types";
import { formatCapitalizedEnum } from "@utils";

const StatusBadge: React.FC<{ status: userStatus | string }> = ({ status }) => {
  const STATUS_STYLES: Record<string, { dot: string; bg: string; text: string }> = {
    ACTIVE: { dot: "bg-[#66BB6A]", bg: "bg-[#E8F5E9]", text: "text-black-700" },
    INACTIVE: { dot: "bg-gray-400", bg: "bg-gray-100", text: "text-black-700" },
    SUSPENDED: { dot: "bg-[#FE6F64]", bg: "bg-[#FBE9E7]", text: "text-black-700" },
    BLOCKED: { dot: "bg-red-500", bg: "bg-red-100", text: "text-black-700" },
  };

  const key = String(status).toUpperCase();
  const { dot, bg, text } = STATUS_STYLES[key] ?? STATUS_STYLES.INACTIVE;

  return (
    <span className={`inline-flex items-center px-[8px] py-[2px] rounded-full ${bg} ${text}`}>
      <span className={`w-2 h-2 rounded-full mr-1 ${dot}`} />
      {formatCapitalizedEnum(status)}
    </span>
  );
};

const Avatar: React.FC<{ name: string }> = ({ name }) => {
  const initial = name?.[0]?.toUpperCase() ?? "?";
  return (
    <div className="w-[40px] h-[40px] rounded-full border border-gray-200 text-gray-500 flex items-center justify-center mr-3">
      {initial}
    </div>
  );
};

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
    <div className="grid [grid-template-columns:repeat(48,minmax(0,0.8fr))] px-4 py-2 text-[14px] text-gray-500 border-b border-gray-200">
      <div className="col-span-11 pr-1">{en.userManagement.user}</div>
      <div className="col-span-6 pr-1">{en.userManagement.telephonyId}</div>
      <div className="col-span-8 pr-1">{en.userManagement.role}</div>
      <div className="col-span-8 pr-1">{en.userManagement.organization}</div>
      <div className="col-span-4 pr-1">{en.userManagement.credits}</div>
      <div className="col-span-6 pr-1">{en.userManagement.addedOn}</div>
      <div className="col-span-5 pr-1">{en.userManagement.status}</div>
    </div>
  );

  return (
    <div className="w-full overflow-x-auto text-[13px] text-gray-600">
      <div className="min-w-[900px]">
        {tableHeader}

        <div className="h-[calc(100vh-270px)] overflow-y-auto">
          {users.map(user => (
            <div
              key={user.id}
              className="grid [grid-template-columns:repeat(48,minmax(0,1fr))] items-center px-4 py-3 text-gray-700 border-b border-gray-200 hover:bg-gray-50 relative"
            >
              <div className="col-span-11 justify-start flex items-center min-w-0 overflow-hidden ">
                <Avatar name={user.name} />
                <div className="min-w-0">
                  <div className="truncate  max-w-[250px]">{formatCapitalizedEnum(user.name)}</div>
                  <div className="text-gray-500 truncate">{user.email}</div>
                </div>
              </div>
              <div className="col-span-6 pr-1">{user.externalId}</div>
              <div className="col-span-8 pr-[15px]">
                {user.roles?.length
                  ? user.roles.map(role => formatCapitalizedEnum(role)).join(", ")
                  : user.role
                    ? formatCapitalizedEnum(user.role)
                    : "--"}
              </div>
              <div className="col-span-8 pr-1">{user.organization ?? "--"}</div>
              <div className="col-span-4 pr-1">
                {typeof user.consumedCredits === "number" && typeof user.creditLimit === "number"
                  ? `${user.consumedCredits}/${user.creditLimit} min`
                  : "-"}
              </div>

              <div className="col-span-6 pr-1">{formatDate(user.createdAt)}</div>
              <div className="col-span-5 pr-1 ml-auto flex items-center justify-between gap-3 w-full min-w-[100px]">
                <StatusBadge status={user.status} />
                <button
                  className="text-gray-500 hover:text-gray-700"
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

export default UserList;
